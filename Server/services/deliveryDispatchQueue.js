const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const { createAmiyoDeliveryForReadyOrder } = require("./amiyoDeliveryIntegrationService");

const QUEUE_NAME = "amiyo-delivery-dispatch";
const JOB_NAME = "ORDER_READY_TO_SHIP";

let queue = null;
let worker = null;
let connection = null;
let appRef = null;

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const redisConfigured = () => Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
const inlineFallbackEnabled = () => process.env.DELIVERY_DISPATCH_INLINE_FALLBACK !== "false";
const isServerlessRuntime = () =>
  ["1", "true"].includes(String(process.env.VERCEL || "").toLowerCase()) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const apiInlineDispatchEnabled = () => {
  const value = String(process.env.DELIVERY_DISPATCH_API_INLINE || "").trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return isServerlessRuntime();
};
const staleProcessingMs = () => Math.max(30000, Number(process.env.DELIVERY_DISPATCH_STALE_PROCESSING_MS || 300000));
const isStaleProcessingJob = (job = {}) => {
  if (job.status !== "processing") return false;
  const updatedAt = job.updatedAt || job.startedAt || job.createdAt;
  if (!updatedAt) return true;
  const timestamp = new Date(updatedAt).getTime();
  return !Number.isFinite(timestamp) || Date.now() - timestamp > staleProcessingMs();
};
const shouldRunApiInlineForExisting = (job = {}) =>
  apiInlineDispatchEnabled() && (
    ["queued", "retrying", "failed"].includes(job.status) ||
    isStaleProcessingJob(job)
  );

const getConnection = () => {
  if (connection) return connection;

  connection = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
      });

  connection.on("error", (error) => {
    console.error("Amiyo delivery dispatch Redis error:", error.message);
  });

  return connection;
};

const verifyRedisConnection = async () => {
  const timeoutMs = Number(process.env.DELIVERY_DISPATCH_REDIS_PING_TIMEOUT_MS || 750);
  const redis = getConnection();

  try {
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timeout")), timeoutMs)),
    ]);
    return true;
  } catch (error) {
    console.warn(
      inlineFallbackEnabled()
        ? `Amiyo delivery dispatch Redis unavailable (${error.message}); inline dispatch fallback is enabled`
        : `Amiyo delivery dispatch Redis unavailable (${error.message})`,
    );
    redis.disconnect();
    connection = null;
    return false;
  }
};

const ensureIndexes = async (db) => {
  if (!db?.collection) return;
  await Promise.all([
    db.collection("delivery_dispatch_jobs").createIndex({ idempotencyKey: 1 }, { unique: true }),
    db.collection("delivery_dispatch_jobs").createIndex({ status: 1, updatedAt: 1 }),
  ]);
};

const updateDispatchJob = (db, idempotencyKey, update) =>
  db.collection("delivery_dispatch_jobs").updateOne({ idempotencyKey }, update);

const upsertQueuedDispatchJob = (db, { orderId, idempotencyKey, source }) =>
  db.collection("delivery_dispatch_jobs").updateOne(
    { idempotencyKey },
    {
      $setOnInsert: {
        orderId,
        idempotencyKey,
        eventName: JOB_NAME,
        attempts: 0,
        createdAt: new Date(),
      },
      $set: {
        source,
        status: "queued",
        error: null,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

const runInlineDispatch = async ({ orderId, source, idempotencyKey }) => {
  try {
    const result = await processDeliveryDispatch({ orderId, source, idempotencyKey });
    return { queued: false, inline: true, idempotencyKey, result };
  } catch (error) {
    console.error("Amiyo delivery inline dispatch failed:", error.message);
    return {
      queued: false,
      inline: true,
      failed: true,
      idempotencyKey,
      error: {
        message: error.message,
        statusCode: error.statusCode || null,
        providerStatus: error.providerStatus || null,
        retryable: error.retryable !== false,
      },
    };
  }
};

const processDeliveryDispatch = async (data = {}) => {
  const app = appRef;
  const db = app?.locals?.db;
  const Order = app?.locals?.models?.Order;
  const VendorOrder = app?.locals?.models?.VendorOrder;
  const orderId = normalizeId(data.orderId);
  const idempotencyKey = data.idempotencyKey || `delivery-create:${orderId}`;

  if (!db || !Order || !orderId) throw new Error("Delivery dispatch is missing application context");

  const existing = await db.collection("delivery_dispatch_jobs").findOne({ idempotencyKey });
  if (existing?.status === "succeeded") return existing.result;

  await updateDispatchJob(db, idempotencyKey, {
    $set: { status: "processing", startedAt: new Date(), updatedAt: new Date() },
    $inc: { attempts: 1 },
  });

  console.info("DELIVERY_DISPATCH_CALLED", { orderId, idempotencyKey, source: data.source || "system" });

  try {
    const result = await createAmiyoDeliveryForReadyOrder(orderId, {
      db,
      Order,
      VendorOrder,
      checkoutSource: data.source || "ready_to_ship",
    });

    if (result?.skipped && result.reason === "not_configured") {
      const error = new Error("Amiyo Delivery integration is not configured");
      error.statusCode = 503;
      throw error;
    }

    const terminalStatus = result?.skipped && result.reason === "order_not_ready_to_ship"
      ? "cancelled"
      : "succeeded";

    await updateDispatchJob(db, idempotencyKey, {
      $set: {
        status: terminalStatus,
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
        error: null,
      },
    });

    return result;
  } catch (error) {
    await updateDispatchJob(db, idempotencyKey, {
      $set: {
        status: "retrying",
        error: { message: error.message, statusCode: error.statusCode || null },
        updatedAt: new Date(),
      },
    });
    throw error;
  }
};

const initDeliveryDispatchQueue = async (app, options = {}) => {
  appRef = app;
  await ensureIndexes(app?.locals?.db);

  if (!redisConfigured() || process.env.DELIVERY_DISPATCH_USE_REDIS === "false") {
    console.warn(
      inlineFallbackEnabled()
        ? "Amiyo delivery dispatch queue is unavailable: Redis is not configured; inline dispatch fallback is enabled"
        : "Amiyo delivery dispatch queue is unavailable: Redis is not configured",
    );
    return null;
  }

  const redisReady = await verifyRedisConnection();
  if (!redisReady) {
    queue = null;
    return null;
  }

  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getConnection() });

  if (options.startWorker && !worker) {
    worker = new Worker(QUEUE_NAME, (job) => processDeliveryDispatch(job.data), {
      connection: getConnection(),
      concurrency: Number(process.env.DELIVERY_DISPATCH_CONCURRENCY || 4),
    });

    worker.on("failed", async (job, error) => {
      if (!job?.data?.idempotencyKey || !appRef?.locals?.db) return;
      await updateDispatchJob(appRef.locals.db, job.data.idempotencyKey, {
        $set: {
          status: job.attemptsMade >= Number(process.env.DELIVERY_DISPATCH_ATTEMPTS || 8) ? "failed" : "retrying",
          error: { message: error.message, statusCode: error.statusCode || null },
          updatedAt: new Date(),
        },
      });
    });
  }

  return queue;
};

const enqueueReadyToShipDelivery = async ({ app, orderId, source = "ready_to_ship" }) => {
  if (app && appRef !== app) appRef = app;
  const db = app?.locals?.db;
  const normalizedOrderId = normalizeId(orderId);
  const idempotencyKey = `delivery-create:${normalizedOrderId}`;

  if (!db || !normalizedOrderId) throw new Error("Order id and database are required for delivery dispatch");
  if (!queue) await initDeliveryDispatchQueue(app, { startWorker: false });

  const existing = await db.collection("delivery_dispatch_jobs").findOne({ idempotencyKey });
  if (existing?.status === "succeeded") {
    return { queued: false, deduped: true, idempotencyKey };
  }

  if (queue && existing && ["queued", "processing", "retrying"].includes(existing.status)) {
    if (shouldRunApiInlineForExisting(existing)) {
      console.info("READY_TO_SHIP_TRIGGER_FIRED", {
        orderId: normalizedOrderId,
        idempotencyKey,
        source,
        dispatchMode: "api_inline_existing",
        previousStatus: existing.status,
      });
      return runInlineDispatch({ orderId: normalizedOrderId, source, idempotencyKey });
    }
    return { queued: false, deduped: true, idempotencyKey };
  }

  await upsertQueuedDispatchJob(db, { orderId: normalizedOrderId, idempotencyKey, source });

  if (!queue) {
    if (inlineFallbackEnabled()) {
      console.info("READY_TO_SHIP_TRIGGER_FIRED", {
        orderId: normalizedOrderId,
        idempotencyKey,
        source,
        dispatchMode: "inline",
      });
      return runInlineDispatch({ orderId: normalizedOrderId, source, idempotencyKey });
    }

    const error = new Error("Amiyo delivery dispatch queue is unavailable");
    error.statusCode = 503;
    throw error;
  }

  const jobId = `delivery-create-${normalizedOrderId}`;
  try {
    const existingQueueJob = await queue.getJob?.(jobId);
    if (existingQueueJob) await existingQueueJob.remove();

    await queue.add(JOB_NAME, { orderId: normalizedOrderId, source, idempotencyKey }, {
      jobId,
      attempts: Number(process.env.DELIVERY_DISPATCH_ATTEMPTS || 8),
      backoff: { type: "exponential", delay: Number(process.env.DELIVERY_DISPATCH_BACKOFF_MS || 1000) },
      removeOnComplete: true,
      removeOnFail: false,
    });
  } catch (error) {
    if (!inlineFallbackEnabled()) throw error;
    console.error("Amiyo delivery dispatch queue add failed; using inline dispatch fallback:", error.message);
    queue = null;
    console.info("READY_TO_SHIP_TRIGGER_FIRED", {
      orderId: normalizedOrderId,
      idempotencyKey,
      source,
      dispatchMode: "inline_fallback",
    });
    return runInlineDispatch({ orderId: normalizedOrderId, source, idempotencyKey });
  }

  console.info("READY_TO_SHIP_TRIGGER_FIRED", { orderId: normalizedOrderId, idempotencyKey, source });
  if (apiInlineDispatchEnabled() && !worker) {
    console.info("READY_TO_SHIP_TRIGGER_FIRED", {
      orderId: normalizedOrderId,
      idempotencyKey,
      source,
      dispatchMode: "api_inline",
    });
    return runInlineDispatch({ orderId: normalizedOrderId, source, idempotencyKey });
  }

  return { queued: true, idempotencyKey };
};

module.exports = {
  initDeliveryDispatchQueue,
  enqueueReadyToShipDelivery,
  __test__: {
    apiInlineDispatchEnabled,
    processDeliveryDispatch,
    setQueue: (value) => { queue = value; },
    setApp: (value) => { appRef = value; },
    reset: () => {
      queue = null;
      worker = null;
      connection = null;
      appRef = null;
    },
  },
};
