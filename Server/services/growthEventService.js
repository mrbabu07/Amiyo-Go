const EVENT_NAMES = [
  "homepage.viewed",
  "category.viewed",
  "search.performed",
  "search.no_result",
  "product.viewed",
  "product.shared",
  "cart.added",
  "cart.removed",
  "checkout.started",
  "payment_method.selected",
  "order.placed",
  "order.paid",
  "order.delivered",
  "wishlist.added",
  "vendor.followed",
  "voucher.applied",
  "flash_sale.clicked",
  "notification.opened",
  "cart.abandoned",
  "browse.abandoned",
  "wishlist.price_dropped",
  "product.back_in_stock",
];

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const dateKey = (date = new Date()) => {
  const safe = new Date(date);
  return Number.isNaN(safe.getTime()) ? new Date().toISOString().slice(0, 10) : safe.toISOString().slice(0, 10);
};

const normalizeEvent = (event = {}) => ({
  eventName: String(event.eventName || event.name || "").trim(),
  userId: event.userId ? normalizeId(event.userId) : null,
  anonymousSessionId: event.anonymousSessionId || event.sessionId || null,
  productId: event.productId ? normalizeId(event.productId) : null,
  vendorId: event.vendorId ? normalizeId(event.vendorId) : null,
  categoryId: event.categoryId ? normalizeId(event.categoryId) : null,
  source: event.source || "web",
  device: event.device || "unknown",
  metadata: event.metadata || {},
  timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
});

const getEventCount = (events = [], name) => events.filter((event) => event.eventName === name).length;

const deriveCustomerSegments = ({ events = [], orders = [], now = new Date() } = {}) => {
  const deliveredOrders = orders.filter((order) => ["delivered", "completed"].includes(String(order.status || "").toLowerCase()));
  const placedOrders = orders.filter((order) => !["cancelled", "failed"].includes(String(order.status || "").toLowerCase()));
  const totalSpend = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageOrderValue = deliveredOrders.length ? totalSpend / deliveredOrders.length : 0;
  const segments = new Set();

  if (placedOrders.length === 0) segments.add("new_user");
  if (placedOrders.length === 0 && getEventCount(events, "checkout.started") > 0) segments.add("first_order_not_completed");
  if (deliveredOrders.length >= 2) segments.add("repeat_buyer");
  if (averageOrderValue >= 5000) segments.add("high_aov_customer");
  if (events.some((event) => ["voucher.applied", "flash_sale.clicked"].includes(event.eventName))) segments.add("bargain_hunter");
  if (getEventCount(events, "flash_sale.clicked") >= 2) segments.add("flash_sale_shopper");
  if (orders.filter((order) => String(order.paymentMethod || "").toLowerCase().includes("cod")).length >= 2) segments.add("cod_heavy_customer");

  const lastActivity = [...events.map((event) => event.timestamp), ...orders.map((order) => order.createdAt)]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0];
  if (lastActivity && now - lastActivity > 30 * 24 * 60 * 60 * 1000) segments.add("inactive_customer");

  const categoryCounts = new Map();
  events.forEach((event) => {
    if (!event.categoryId) return;
    categoryCounts.set(event.categoryId, (categoryCounts.get(event.categoryId) || 0) + 1);
  });
  if ([...categoryCounts.values()].some((count) => count >= 3)) segments.add("category_loyalist");

  return [...segments];
};

class GrowthEventService {
  static normalizeEvent(event) {
    return normalizeEvent(event);
  }

  static async trackEvent(db, event = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const normalized = normalizeEvent(event);
    if (!normalized.eventName) throw new Error("Event name is required");

    const saved = {
      ...normalized,
      dateKey: dateKey(normalized.timestamp),
      createdAt: new Date(),
    };
    const result = await db.collection("growth_events").insertOne(saved);
    return { ...saved, _id: result.insertedId };
  }

  static deriveCustomerSegments(input) {
    return deriveCustomerSegments(input);
  }

  static async aggregateDaily(db, date = new Date()) {
    if (!db?.collection) throw new Error("Database connection is required");
    const key = dateKey(date);
    const start = new Date(`${key}T00:00:00.000Z`);
    const end = new Date(`${key}T23:59:59.999Z`);
    const events = await db
      .collection("growth_events")
      .find({ timestamp: { $gte: start, $lte: end } })
      .toArray();

    const byEvent = new Map();
    events.forEach((event) => {
      const name = event.eventName || "unknown";
      const current = byEvent.get(name) || {
        dateKey: key,
        eventName: name,
        count: 0,
        users: new Set(),
        sessions: new Set(),
        sources: {},
        devices: {},
      };
      current.count += 1;
      if (event.userId) current.users.add(normalizeId(event.userId));
      if (event.anonymousSessionId) current.sessions.add(String(event.anonymousSessionId));
      current.sources[event.source || "web"] = (current.sources[event.source || "web"] || 0) + 1;
      current.devices[event.device || "unknown"] = (current.devices[event.device || "unknown"] || 0) + 1;
      byEvent.set(name, current);
    });

    const rows = [];
    for (const row of byEvent.values()) {
      const doc = {
        dateKey: row.dateKey,
        eventName: row.eventName,
        count: row.count,
        uniqueUsers: row.users.size,
        uniqueSessions: row.sessions.size,
        sources: row.sources,
        devices: row.devices,
        updatedAt: new Date(),
      };
      await db.collection("growth_daily_aggregates").updateOne(
        { dateKey: doc.dateKey, eventName: doc.eventName },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
      rows.push(doc);
    }

    return rows;
  }
}

module.exports = GrowthEventService;
module.exports.EVENT_NAMES = EVENT_NAMES;
module.exports._test = {
  dateKey,
  deriveCustomerSegments,
  normalizeEvent,
};
