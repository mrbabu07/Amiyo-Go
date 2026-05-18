const crypto = require("crypto");
const {
  EVENT_SCHEMA_VERSION,
  EVENT_TAXONOMY,
  normalizeEventName,
} = require("./analyticsKpiFramework");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const asDate = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const dateKey = (value = new Date()) => asDate(value).toISOString().slice(0, 10);

const compactObject = (value = {}) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));

const hashPayload = (payload) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify(payload))
    .digest("hex");

const actorFromContext = (context = {}) => {
  const user = context.user || {};
  return {
    actorId: normalizeId(user._id || user.id || user.uid || context.actorId),
    role: user.role || context.role || "guest",
    email: user.email || null,
  };
};

class AnalyticsEventService {
  static normalizeEvent(event = {}, context = {}) {
    const eventName = normalizeEventName(event.eventName || event.name || event.type);
    const actor = actorFromContext({
      ...context,
      actorId: event.actorId || event.userId || event.customerId || event.vendorId || context.actorId,
      role: event.role || context.role,
    });
    const timestamp = asDate(event.timestamp || event.createdAt);
    const resource = compactObject({
      productId: normalizeId(event.productId || event.resource?.productId),
      vendorId: normalizeId(event.vendorId || event.resource?.vendorId),
      categoryId: normalizeId(event.categoryId || event.resource?.categoryId),
      orderId: normalizeId(event.orderId || event.resource?.orderId),
      returnId: normalizeId(event.returnId || event.resource?.returnId),
      campaignId: normalizeId(event.campaignId || event.resource?.campaignId),
      notificationId: normalizeId(event.notificationId || event.resource?.notificationId),
      experimentKey: normalizeId(event.experimentKey || event.resource?.experimentKey),
      resourceType: event.resourceType || event.resource?.resourceType || null,
      resourceId: normalizeId(event.resourceId || event.resource?.resourceId),
    });
    const normalized = {
      schemaVersion: event.schemaVersion || EVENT_SCHEMA_VERSION,
      eventName,
      actor,
      userId: normalizeId(event.userId || actor.actorId),
      role: actor.role,
      sessionId: event.sessionId || event.anonymousSessionId || context.sessionId || null,
      anonymousId: event.anonymousId || event.anonymousSessionId || event.sessionId || context.anonymousId || null,
      sourcePage: event.sourcePage || event.page || event.path || context.sourcePage || "unknown",
      source: event.source || context.source || "web",
      device: event.device || context.device || "unknown",
      timestamp,
      dateKey: dateKey(timestamp),
      resource,
      metadata: event.metadata || {},
      experiment: event.experiment || null,
      orderValue: Number(event.orderValue || event.revenue || event.total || 0),
      resultCount: event.resultCount === undefined ? null : Number(event.resultCount || 0),
      query: event.query || event.searchTerm || null,
    };
    normalized.dedupeKey =
      event.eventId ||
      event.dedupeKey ||
      hashPayload({
        eventName: normalized.eventName,
        actorId: normalized.actor.actorId,
        sessionId: normalized.sessionId,
        timestamp: normalized.timestamp.toISOString(),
        resource,
        query: normalized.query,
      });
    return normalized;
  }

  static validateEvent(event = {}) {
    const errors = [];
    if (!event.eventName) errors.push("eventName is required");
    if (event.eventName && !EVENT_TAXONOMY.includes(event.eventName)) {
      errors.push(`Unsupported analytics event: ${event.eventName}`);
    }
    if (!event.timestamp || Number.isNaN(new Date(event.timestamp).getTime())) {
      errors.push("timestamp must be a valid date");
    }
    return {
      ok: errors.length === 0,
      errors,
    };
  }

  static async trackEvent(db, event = {}, context = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const normalized = AnalyticsEventService.normalizeEvent(event, context);
    const validation = AnalyticsEventService.validateEvent(normalized);

    if (!validation.ok) {
      const rejected = {
        rawEvent: event,
        normalizedEvent: normalized,
        errors: validation.errors,
        status: "rejected",
        createdAt: new Date(),
      };
      await db.collection("event_dead_letter_queue").insertOne(rejected);
      return { accepted: false, duplicate: false, errors: validation.errors, event: rejected };
    }

    const existing = await db.collection("event_stream").findOne({ dedupeKey: normalized.dedupeKey });
    if (existing) {
      return { accepted: true, duplicate: true, event: existing };
    }

    const saved = {
      ...normalized,
      status: "accepted",
      ingestedAt: new Date(),
      createdAt: new Date(),
    };
    const result = await db.collection("event_stream").insertOne(saved);

    const legacyEvent = {
      ...saved,
      _id: undefined,
      type: saved.eventName,
      name: saved.eventName,
      createdAt: saved.createdAt,
    };
    delete legacyEvent._id;
    await db.collection("analytics_events").insertOne(legacyEvent);
    await db.collection("growth_events").insertOne({
      eventName: saved.eventName,
      userId: saved.userId || null,
      anonymousSessionId: saved.anonymousId || saved.sessionId || null,
      productId: saved.resource.productId || null,
      vendorId: saved.resource.vendorId || null,
      categoryId: saved.resource.categoryId || null,
      source: saved.source,
      device: saved.device,
      metadata: {
        ...saved.metadata,
        sourcePage: saved.sourcePage,
        query: saved.query,
        orderValue: saved.orderValue,
      },
      timestamp: saved.timestamp,
      dateKey: saved.dateKey,
      createdAt: saved.createdAt,
    });

    return { accepted: true, duplicate: false, event: { ...saved, _id: result.insertedId } };
  }

  static async trackBatch(db, events = [], context = {}) {
    const rows = Array.isArray(events) ? events : [events];
    const results = [];
    for (const event of rows) {
      results.push(await AnalyticsEventService.trackEvent(db, event, context));
    }
    return {
      accepted: results.filter((item) => item.accepted && !item.duplicate).length,
      duplicates: results.filter((item) => item.duplicate).length,
      rejected: results.filter((item) => !item.accepted).length,
      results,
    };
  }
}

module.exports = AnalyticsEventService;
module.exports._test = {
  actorFromContext,
  dateKey,
  hashPayload,
};
