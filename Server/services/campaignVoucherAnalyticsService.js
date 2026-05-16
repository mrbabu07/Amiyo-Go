const { ObjectId } = require("mongodb");

const toObjectId = (id) => {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const normalizeId = (value) => value?.toString?.() || String(value || "");

const ensureIndexes = async (db) => {
  await Promise.all([
    db.collection("campaignVendorJoins").createIndex({ campaignId: 1, vendorId: 1 }, { unique: true }),
    db.collection("campaignVendorJoins").createIndex({ vendorId: 1, joinedAt: -1 }),
    db.collection("vendorMarketingEvents").createIndex({ itemId: 1, event: 1, createdAt: -1 }),
    db.collection("campaignVoucherAnalytics").createIndex({ entityType: 1, entityId: 1 }, { unique: true }),
    db.collection("campaignVoucherAnalytics").createIndex({ vendorId: 1, updatedAt: -1 }),
  ]);
};

const percent = (part, total) => {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 10000) / 100;
};

const getVendorEntityType = (type) => {
  const map = {
    campaign: "vendor_campaign",
    campaign_nomination: "vendor_campaign",
    voucher: "vendor_voucher",
    bundle: "vendor_bundle",
    free_shipping: "vendor_free_shipping",
    seller_pick: "vendor_seller_pick",
    promotion: "vendor_promotion",
  };
  return map[type] || "vendor_promotion";
};

const rebuildVoucherAnalytics = async (db, itemId) => {
  await ensureIndexes(db);
  const objectId = toObjectId(itemId);
  if (!objectId) return null;

  const item = await db.collection("vendorMarketingItems").findOne({ _id: objectId });
  if (!item) return null;

  const [views, clicks] = await Promise.all([
    db.collection("vendorMarketingEvents").countDocuments({ itemId: objectId, event: "view" }),
    db.collection("vendorMarketingEvents").countDocuments({ itemId: objectId, event: "click" }),
  ]);

  const usedCount = Number(item.usedCount || 0);
  const conversionBase = clicks || views;
  const analytics = {
    entityType: getVendorEntityType(item.type),
    entityId: objectId,
    vendorId: normalizeId(item.vendorId),
    campaignId: item.campaignId || null,
    title: item.title || item.code || "",
    code: item.code || "",
    status: item.status || "",
    viewCount: Number(item.viewCount || 0) || views,
    clickCount: Number(item.clickCount || 0) || clicks,
    usedCount,
    revenueGenerated: Number(item.revenueGenerated || 0),
    discountGiven: Number(item.discountGiven || 0),
    conversionRate: percent(usedCount, conversionBase),
    updatedAt: new Date(),
  };

  await db.collection("campaignVoucherAnalytics").updateOne(
    { entityType: analytics.entityType, entityId: objectId },
    {
      $set: analytics,
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  return db.collection("campaignVoucherAnalytics").findOne({
    entityType: analytics.entityType,
    entityId: objectId,
  });
};

const rebuildCampaignAnalytics = async (db, campaignId) => {
  await ensureIndexes(db);
  const objectId = toObjectId(campaignId);
  if (!objectId) return null;

  const [campaign, joins, views, orders] = await Promise.all([
    db.collection("campaigns").findOne({ _id: objectId }),
    db.collection("campaignVendorJoins").countDocuments({ campaignId: objectId, status: { $ne: "left" } }),
    db.collection("campaignviews").countDocuments({ campaign: objectId }),
    db.collection("campaignorders").countDocuments({ campaign: objectId }),
  ]);

  if (!campaign) return null;

  const revenue = await db
    .collection("campaignorders")
    .aggregate([
      { $match: { campaign: objectId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalRevenue" },
          totalDiscount: { $sum: "$discountAmount" },
        },
      },
    ])
    .toArray();

  const analytics = {
    entityType: "admin_campaign",
    entityId: objectId,
    campaignId: objectId,
    title: campaign.name,
    status: campaign.status,
    vendorJoinCount: joins,
    viewCount: views,
    orderCount: orders,
    totalRevenue: revenue[0]?.totalRevenue || 0,
    totalDiscount: revenue[0]?.totalDiscount || 0,
    conversionRate: percent(orders, views),
    updatedAt: new Date(),
  };

  await db.collection("campaignVoucherAnalytics").updateOne(
    { entityType: "admin_campaign", entityId: objectId },
    { $set: analytics, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );

  return db.collection("campaignVoucherAnalytics").findOne({
    entityType: "admin_campaign",
    entityId: objectId,
  });
};

const recordVendorMarketingEvent = async ({ db, itemId, event, userId, sessionId, ip, userAgent }) => {
  await ensureIndexes(db);
  const objectId = toObjectId(itemId);
  const normalizedEvent = String(event || "").trim().toLowerCase();
  if (!objectId || !["view", "click"].includes(normalizedEvent)) {
    throw new Error("Invalid marketing event");
  }

  const item = await db.collection("vendorMarketingItems").findOne({ _id: objectId });
  if (!item) {
    throw new Error("Marketing item not found");
  }

  const now = new Date();
  await db.collection("vendorMarketingEvents").insertOne({
    itemId: objectId,
    vendorId: normalizeId(item.vendorId),
    campaignId: item.campaignId || null,
    event: normalizedEvent,
    userId: userId || null,
    sessionId: sessionId || null,
    ip,
    userAgent,
    createdAt: now,
  });

  const incField = normalizedEvent === "view" ? "viewCount" : "clickCount";
  await db.collection("vendorMarketingItems").updateOne(
    { _id: objectId },
    { $inc: { [incField]: 1 }, $set: { updatedAt: now } },
  );

  return rebuildVoucherAnalytics(db, objectId);
};

const listAnalytics = async ({ db, vendorId = "", entityType = "" }) => {
  await ensureIndexes(db);

  const voucherQuery = {
    type: { $in: ["voucher", "campaign", "campaign_nomination", "bundle", "free_shipping", "seller_pick", "promotion"] },
  };
  if (vendorId) voucherQuery.vendorId = normalizeId(vendorId);

  const campaigns = await db
    .collection("campaigns")
    .find({})
    .project({ _id: 1 })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  await Promise.all(campaigns.map((campaign) => rebuildCampaignAnalytics(db, campaign._id)));

  const items = await db
    .collection("vendorMarketingItems")
    .find(voucherQuery)
    .sort({ updatedAt: -1 })
    .limit(300)
    .toArray();
  await Promise.all(items.map((item) => rebuildVoucherAnalytics(db, item._id)));

  const query = {};
  if (vendorId) query.vendorId = normalizeId(vendorId);
  if (entityType) query.entityType = entityType;

  const rows = await db
    .collection("campaignVoucherAnalytics")
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();

  const summary = rows.reduce(
    (acc, row) => {
      acc.viewCount += Number(row.viewCount || 0);
      acc.clickCount += Number(row.clickCount || 0);
      acc.usedCount += Number(row.usedCount || 0);
      acc.orderCount += Number(row.orderCount || 0);
      acc.vendorJoinCount += Number(row.vendorJoinCount || 0);
      acc.revenueGenerated += Number(row.revenueGenerated || 0);
      acc.discountGiven += Number(row.discountGiven || 0);
      return acc;
    },
    {
      viewCount: 0,
      clickCount: 0,
      usedCount: 0,
      orderCount: 0,
      vendorJoinCount: 0,
      revenueGenerated: 0,
      discountGiven: 0,
    },
  );
  summary.conversionRate = percent(summary.usedCount + summary.orderCount, summary.clickCount || summary.viewCount);

  return { summary, rows };
};

module.exports = {
  ensureIndexes,
  rebuildVoucherAnalytics,
  rebuildCampaignAnalytics,
  recordVendorMarketingEvent,
  listAnalytics,
};
