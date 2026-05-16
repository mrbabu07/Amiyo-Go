const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (date) => date.toISOString().slice(0, 10);
const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeCustomerId = (order) =>
  order.userId || order.shippingInfo?.email || order.shippingInfo?.phone || "guest";

const calculateRevenue = (order) =>
  (order.products || []).reduce(
    (sum, item) => sum + Number(item.adminCommissionAmount || 0),
    0,
  );

const getOrderAmount = (order) => Number(order.total || order.totalAmount || 0);

const getSessionCount = async (db, start, end) => {
  const sessions = db.collection("analytics_sessions");
  const pageViews = db.collection("pageViews");

  try {
    const sessionCount = await sessions.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
    if (sessionCount > 0) return sessionCount;
  } catch {
    // Optional collection.
  }

  try {
    const visitors = await pageViews.distinct("sessionId", {
      createdAt: { $gte: start, $lt: end },
    });
    return visitors.filter(Boolean).length;
  } catch {
    return 0;
  }
};

const getCohortRetention = async (db, start, end) => {
  const orders = await db
    .collection("orders")
    .aggregate([
      { $match: { createdAt: { $lt: end }, userId: { $ne: null } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$userId",
          firstOrderAt: { $first: "$createdAt" },
          orderDates: { $push: "$createdAt" },
        },
      },
      { $match: { firstOrderAt: { $gte: start, $lt: end } } },
    ])
    .toArray();

  const retained = orders.filter((customer) =>
    (customer.orderDates || []).some((date) => {
      const time = new Date(date).getTime();
      const first = new Date(customer.firstOrderAt).getTime();
      return time > first && time <= first + 30 * DAY_MS;
    }),
  ).length;

  return {
    cohortSize: orders.length,
    retained30d: retained,
    retention30dRate: orders.length ? round2((retained / orders.length) * 100) : 0,
  };
};

const buildDailySummary = async (db, start, end) => {
  const orders = await db
    .collection("orders")
    .find({ createdAt: { $gte: start, $lt: end } })
    .toArray();

  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const uniqueCustomers = new Set(orders.map(normalizeCustomerId).filter(Boolean));
  const returningCustomers = new Set(
    orders
      .filter((order) => order.userId)
      .map((order) => order.userId)
      .filter(Boolean),
  );

  const sessions = await getSessionCount(db, start, end);
  const cohortRetention = await getCohortRetention(db, start, end);

  const gmv = activeOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
  const revenue = activeOrders.reduce((sum, order) => sum + calculateRevenue(order), 0);
  const averageOrderValue = activeOrders.length ? gmv / activeOrders.length : 0;

  return {
    granularity: "daily",
    dateKey: dateKey(start),
    date: start,
    periodStart: start,
    periodEnd: end,
    orders: orders.length,
    deliveredOrders: deliveredOrders.length,
    cancelledOrders: orders.filter((order) => order.status === "cancelled").length,
    gmv: round2(gmv),
    revenue: round2(revenue),
    averageOrderValue: round2(averageOrderValue),
    uniqueCustomers: uniqueCustomers.size,
    returningCustomers: returningCustomers.size,
    sessions,
    conversionRate: sessions ? round2((orders.length / sessions) * 100) : 0,
    cohortRetention,
  };
};

const rebuildDailySummary = async ({ db, AnalyticsSummary, start, end } = {}) => {
  const model = AnalyticsSummary || {
    upsert: (summary) =>
      db.collection("analytics_summaries").updateOne(
        { granularity: summary.granularity, dateKey: summary.dateKey },
        { $set: { ...summary, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      ),
  };

  const startDate = startOfDay(start || addDays(new Date(), -30));
  const endDate = startOfDay(end || addDays(new Date(), 1));
  const summaries = [];

  for (let cursor = startDate; cursor < endDate; cursor = addDays(cursor, 1)) {
    const periodEnd = addDays(cursor, 1);
    const summary = await buildDailySummary(db, cursor, periodEnd);
    await model.upsert(summary);
    summaries.push(summary);
  }

  return summaries;
};

module.exports = {
  rebuildDailySummary,
  buildDailySummary,
};
