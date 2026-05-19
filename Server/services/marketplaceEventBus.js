const { ObjectId } = require("mongodb");

let bullQueue = null;
let bullWorker = null;
let appRef = null;

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toDate = (value) => (value ? new Date(value) : new Date());

const useRedisQueue = () =>
  process.env.MARKETPLACE_EVENT_USE_REDIS === "true" || Boolean(process.env.REDIS_URL);

const resolveDb = (target) => {
  if (target?.collection) return target;
  const locals = target?.locals || target?.app?.locals || {};
  return (
    locals.db ||
    locals.models?.Order?.collection?.db ||
    locals.models?.Notification?.collection?.db ||
    null
  );
};

const resolveApp = (target) => target?.locals ? target : target?.app || appRef;

const eventQuery = (eventId) =>
  ObjectId.isValid(normalizeId(eventId)) ? { _id: new ObjectId(normalizeId(eventId)) } : { _id: eventId };

const createIndexes = async (db) => {
  if (!db?.collection) return;
  try {
    await db.collection("marketplace_events").createIndex?.({ eventName: 1, createdAt: -1 });
    await db.collection("marketplace_events").createIndex?.({ status: 1, createdAt: 1 });
    await db.collection("marketplace_events").createIndex?.({ dedupeKey: 1 }, { sparse: true });
    await db.collection("marketplace_notification_queue").createIndex?.({ eventId: 1 });
    await db.collection("marketplace_notification_queue").createIndex?.({ status: 1, scheduledFor: 1 });
    await db.collection("marketplace_notification_queue").createIndex?.({ recipientId: 1, createdAt: -1 });
  } catch (error) {
    console.error("Error creating marketplace event bus indexes:", error);
  }
};

const buildEventDocument = (eventName, payload = {}, options = {}) => {
  const now = new Date();
  return {
    eventName,
    source: options.source || payload.source || "system",
    actor: {
      id: normalizeId(options.actorId || payload.actorId),
      role: options.actorRole || payload.actorRole || "system",
    },
    subject: {
      type: options.subjectType || payload.subjectType || payload.resourceType || "",
      id: normalizeId(options.subjectId || payload.subjectId || payload.resourceId),
    },
    payload,
    status: "queued",
    dedupeKey: options.dedupeKey || payload.dedupeKey || null,
    scheduledFor: options.scheduledFor ? new Date(options.scheduledFor) : now,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
};

const buildNotificationRows = (eventDoc) => {
  const notifications = Array.isArray(eventDoc.payload?.notifications)
    ? eventDoc.payload.notifications
    : [];

  return notifications
    .filter((notification) => notification?.userId || notification?.email || notification?.phone)
    .map((notification) => {
      const channel = notification.channel || "in_app";
      const recipientId = normalizeId(notification.userId || notification.email || notification.phone);
      return {
        eventId: normalizeId(eventDoc._id),
        eventName: eventDoc.eventName,
        channel,
        recipientId,
        recipient: {
          userId: normalizeId(notification.userId),
          email: notification.email || "",
          phone: notification.phone || "",
        },
        notification: {
          userId: normalizeId(notification.userId),
          type: notification.type || eventDoc.eventName,
          title: notification.title || "Marketplace update",
          message: notification.message || notification.body || "",
          body: notification.body || notification.message || "",
          link: notification.link || notification.url || "/",
          url: notification.url || notification.link || "/",
          orderId: normalizeId(notification.orderId || eventDoc.payload?.orderId),
          vendorId: normalizeId(notification.vendorId),
          data: notification.data || eventDoc.payload || {},
        },
        status: "queued",
        scheduledFor: eventDoc.scheduledFor || new Date(),
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
};

const deliverInAppNotification = async (app, db, row) => {
  const notification = row.notification || {};
  if (!notification.userId) {
    return { skipped: true, reason: "missing_user" };
  }

  const payload = {
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message || notification.body,
    body: notification.body || notification.message,
    link: notification.link || notification.url,
    url: notification.url || notification.link,
    orderId: notification.orderId || undefined,
    vendorId: notification.vendorId || undefined,
    data: notification.data || {},
    eventId: row.eventId,
  };

  const Notification = app?.locals?.models?.Notification;
  if (Notification?.create) {
    return Notification.create(payload);
  }

  const result = await db.collection("notifications").insertOne({
    ...payload,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { ...payload, _id: result.insertedId };
};

const markQueueRow = async (db, row, status, extra = {}) => {
  await db.collection("marketplace_notification_queue").updateOne(
    eventQuery(row._id),
    {
      $set: {
        status,
        ...extra,
        updatedAt: new Date(),
      },
      ...(status === "failed" ? { $inc: { attempts: 1 } } : {}),
    },
  );
};

const processEvent = async (target, eventId) => {
  const app = resolveApp(target);
  const db = resolveDb(target);
  if (!db) throw new Error("Database connection is required for marketplace event processing");

  const event = await db.collection("marketplace_events").findOne(eventQuery(eventId));
  if (!event) throw new Error("Marketplace event not found");

  await db.collection("marketplace_events").updateOne(eventQuery(event._id), {
    $set: { status: "processing", updatedAt: new Date() },
    $inc: { attempts: 1 },
  });

  const rows = await db
    .collection("marketplace_notification_queue")
    .find({ eventId: normalizeId(event._id), status: "queued" })
    .toArray();

  const results = [];
  for (const row of rows) {
    try {
      if (row.channel === "in_app") {
        const delivered = await deliverInAppNotification(app, db, row);
        await markQueueRow(db, row, "sent", {
          sentAt: new Date(),
          deliveredNotificationId: normalizeId(delivered?._id),
        });
        results.push({ channel: row.channel, status: "sent" });
      } else {
        results.push({ channel: row.channel, status: "queued" });
      }
    } catch (error) {
      await markQueueRow(db, row, "failed", { error: error.message });
      results.push({ channel: row.channel, status: "failed", error: error.message });
    }
  }

  const failed = results.some((result) => result.status === "failed");
  const status = failed ? "partial_failure" : "processed";
  await db.collection("marketplace_events").updateOne(eventQuery(event._id), {
    $set: {
      status,
      processedAt: new Date(),
      processingResult: results,
      updatedAt: new Date(),
    },
  });

  app?.locals?.realtime?.broadcast?.("marketplace:events", "marketplace.event.processed", {
    eventId: normalizeId(event._id),
    eventName: event.eventName,
    status,
  });

  return { eventId: normalizeId(event._id), status, results };
};

const getRedisConnection = () => {
  const IORedis = require("ioredis");
  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
};

const initMarketplaceEventBus = (app) => {
  appRef = app;
  const db = resolveDb(app);
  createIndexes(db);

  if (!useRedisQueue() || bullQueue) return;

  try {
    const { Queue, Worker } = require("bullmq");
    const connection = getRedisConnection();
    bullQueue = new Queue("marketplace-events", { connection });
    bullWorker = new Worker(
      "marketplace-events",
      async (job) => processEvent(appRef, job.data.eventId),
      { connection, concurrency: Number(process.env.MARKETPLACE_EVENT_CONCURRENCY || 4) },
    );
    bullWorker.on("failed", async (job, error) => {
      const dbRef = resolveDb(appRef);
      if (!dbRef || !job?.data?.eventId) return;
      await dbRef.collection("marketplace_events").updateOne(eventQuery(job.data.eventId), {
        $set: { status: "failed", error: error.message, updatedAt: new Date() },
        $inc: { attempts: 1 },
      });
    });
  } catch (error) {
    console.error("Failed to initialize marketplace event bus queue:", error);
  }
};

const publish = async (target, eventName, payload = {}, options = {}) => {
  if (!eventName) throw new Error("Event name is required");
  const app = resolveApp(target);
  const db = resolveDb(target);
  if (!db) throw new Error("Database connection is required for marketplace event bus");

  await createIndexes(db);

  if (options.dedupeKey || payload.dedupeKey) {
    const existing = await db.collection("marketplace_events").findOne({
      dedupeKey: options.dedupeKey || payload.dedupeKey,
    });
    if (existing) {
      return {
        event: existing,
        deduped: true,
        notifications: [],
        processing: null,
      };
    }
  }

  const eventDoc = buildEventDocument(eventName, payload, options);
  const result = await db.collection("marketplace_events").insertOne(eventDoc);
  const event = { ...eventDoc, _id: result.insertedId };

  const notificationRows = buildNotificationRows(event);
  if (notificationRows.length) {
    await db.collection("marketplace_notification_queue").insertMany(notificationRows);
  }

  let processing = null;
  if (bullQueue) {
    await bullQueue.add(eventName, { eventId: normalizeId(event._id) }, { removeOnComplete: true, removeOnFail: 100 });
  } else if (options.processInline !== false) {
    processing = await processEvent(app || { locals: { db } }, event._id);
  }

  return {
    event,
    deduped: false,
    notifications: notificationRows,
    processing,
  };
};

module.exports = {
  initMarketplaceEventBus,
  publish,
  processEvent,
  __test__: {
    buildEventDocument,
    buildNotificationRows,
    createIndexes,
    resolveDb,
  },
};
