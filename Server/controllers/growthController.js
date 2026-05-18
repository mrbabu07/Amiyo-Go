const { ObjectId } = require("mongodb");
const PromotionService = require("../services/promotionService");
const GrowthEventService = require("../services/growthEventService");
const GrowthEventBus = require("../services/growthEventBus");
const GrowthNotificationService = require("../services/growthNotificationService");
const GrowthRecommendationService = require("../services/growthRecommendationService");
const AbandonedCartService = require("../services/abandonedCartService");
const { PROMOTION_TYPES } = require("../services/promotionService");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);
const idFilter = (id) => {
  const objectId = toObjectId(id);
  return objectId ? { _id: objectId } : { _id: normalizeId(id) };
};

const jsonError = (res, error, fallback = "Request failed") =>
  res.status(error.statusCode || 400).json({ success: false, error: error.message || fallback });

const getDb = (req) => req.app.locals.db || req.app.locals.models?.Promotion?.collection?.db;
const getPromotionModel = (req) => req.app.locals.models.Promotion;

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "system"),
  role: req.user?.role || "system",
  email: req.user?.email || "",
});

const normalizedStringArray = (value) =>
  [...new Set((Array.isArray(value) ? value : [value]).map((item) => normalizeId(item)).filter(Boolean))];

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePromotionPayload = (body = {}, context = {}) => {
  const type = String(body.type || context.type || "platform_voucher").trim();
  const discountType = String(body.discountType || (type === "free_shipping" ? "free_shipping" : "percentage")).trim();
  const startsAt = asDate(body.startsAt || body.startDate) || null;
  const endsAt = asDate(body.endsAt || body.endDate || body.expiresAt) || null;
  const status = body.status || (startsAt && startsAt > new Date() ? "scheduled" : "active");
  const scope = {
    vendorIds: normalizedStringArray(body.scope?.vendorIds || body.vendorIds || body.vendorId || context.vendorId),
    categoryIds: normalizedStringArray(body.scope?.categoryIds || body.categoryIds || body.categoryId),
    productIds: normalizedStringArray(body.scope?.productIds || body.productIds || body.productId),
    customerSegments: normalizedStringArray(body.scope?.customerSegments || body.customerSegments),
  };

  if (!PROMOTION_TYPES.includes(type)) {
    const error = new Error("Unsupported promotion type");
    error.statusCode = 400;
    throw error;
  }
  if (!body.title && !body.name && !body.code) {
    const error = new Error("Promotion title or code is required");
    error.statusCode = 400;
    throw error;
  }
  if (!["percentage", "fixed", "free_shipping", "bundle_fixed"].includes(discountType)) {
    const error = new Error("Unsupported discount type");
    error.statusCode = 400;
    throw error;
  }
  if (startsAt && endsAt && startsAt >= endsAt) {
    const error = new Error("Promotion end date must be after start date");
    error.statusCode = 400;
    throw error;
  }

  return {
    type,
    title: String(body.title || body.name || body.code || type).trim(),
    description: String(body.description || "").trim(),
    code: body.code ? String(body.code).trim().toUpperCase() : null,
    automaticApply: body.automaticApply !== false && !body.code,
    discountType,
    discountValue: Number(body.discountValue || body.amount || 0),
    maxDiscount: Number(body.maxDiscount || body.maxDiscountAmount || 0),
    minOrderValue: Number(body.minOrderValue || body.minOrderAmount || 0),
    priority: Number(body.priority || 100),
    stackable: body.stackable !== false,
    status,
    startsAt,
    endsAt,
    totalUsageCap: body.totalUsageCap ? Number(body.totalUsageCap) : null,
    usageLimitPerUser: body.usageLimitPerUser ? Number(body.usageLimitPerUser) : null,
    vendorId: context.vendorId || body.vendorId || null,
    scope,
    bundleQuantity: body.bundleQuantity ? Number(body.bundleQuantity) : null,
    bundleFixedPrice: body.bundleFixedPrice ? Number(body.bundleFixedPrice) : null,
    metadata: body.metadata || {},
    createdBy: context.actor || null,
  };
};

exports.evaluatePromotions = async (req, res) => {
  try {
    const result = await PromotionService.evaluateCart({
      db: getDb(req),
      cart: req.body.cart || req.body,
      user: {
        id: normalizeId(req.user?.uid || req.user?._id || req.body.userId),
        segments: req.body.customerSegments || req.body.segments || [],
        orderCount: req.body.orderCount || 0,
      },
      context: {
        code: req.body.code || req.body.couponCode,
        redeemPoints: req.body.redeemPoints || req.body.redeemedPoints,
        customerSegments: req.body.customerSegments || [],
      },
    });
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to evaluate promotions");
  }
};

exports.validatePromotionCode = async (req, res) => {
  try {
    const result = await PromotionService.validateCode({
      db: getDb(req),
      code: req.body.code,
      cart: req.body.cart || req.body,
      user: {
        id: normalizeId(req.user?.uid || req.user?._id || req.body.userId),
        segments: req.body.customerSegments || [],
        orderCount: req.body.orderCount || 0,
      },
      context: req.body.context || {},
    });
    res.status(result.valid ? 200 : 400).json({ success: result.valid, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to validate promotion code");
  }
};

exports.listPromotions = async (req, res) => {
  try {
    const promotions = await getPromotionModel(req).list({
      type: req.query.type || "all",
      status: req.query.status || "all",
      vendorId: req.query.vendorId,
      code: req.query.code,
    });
    res.json({ success: true, data: promotions });
  } catch (error) {
    jsonError(res, error, "Failed to load promotions");
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const payload = normalizePromotionPayload(req.body, { actor: getActor(req) });
    const promotion = await getPromotionModel(req).create(payload);
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    jsonError(res, error, "Failed to create promotion");
  }
};

exports.getPromotion = async (req, res) => {
  try {
    const promotion = await getPromotionModel(req).findById(req.params.id);
    if (!promotion) return res.status(404).json({ success: false, error: "Promotion not found" });
    const redemptions = await getPromotionModel(req).redemptionsCollection
      .find({ promotionId: normalizeId(promotion._id) })
      .sort({ redeemedAt: -1 })
      .limit(50)
      .toArray();
    res.json({ success: true, data: { promotion, redemptions } });
  } catch (error) {
    jsonError(res, error, "Failed to load promotion");
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const existing = await getPromotionModel(req).findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: "Promotion not found" });
    const payload = normalizePromotionPayload({ ...existing, ...req.body }, { actor: getActor(req) });
    const updated = await getPromotionModel(req).update(req.params.id, payload);
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to update promotion");
  }
};

exports.setPromotionStatus = (status) => async (req, res) => {
  try {
    const updated = await getPromotionModel(req).setStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ success: false, error: "Promotion not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to update promotion status");
  }
};

exports.duplicatePromotion = async (req, res) => {
  try {
    const copy = await getPromotionModel(req).duplicate(req.params.id, req.body || {});
    res.status(201).json({ success: true, data: copy });
  } catch (error) {
    jsonError(res, error, "Failed to duplicate promotion");
  }
};

exports.snapshotPromotionForOrder = async (req, res) => {
  try {
    const snapshot = await PromotionService.snapshotForOrder({
      db: getDb(req),
      orderId: req.params.orderId,
      userId: req.body.userId || req.user?.uid,
      result: req.body.result || req.body,
    });
    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    jsonError(res, error, "Failed to snapshot promotion result");
  }
};

exports.createVendorVoucher = async (req, res) => {
  try {
    const vendorId = normalizeId(req.user?.vendorId);
    const payload = normalizePromotionPayload(
      {
        ...req.body,
        type: "vendor_voucher",
        code: req.body.code,
        automaticApply: false,
      },
      { vendorId, actor: getActor(req) },
    );
    payload.scope.vendorIds = [vendorId];
    const promotion = await getPromotionModel(req).create(payload);
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    jsonError(res, error, "Failed to create vendor voucher");
  }
};

exports.listVendorGrowthPromotions = async (req, res) => {
  try {
    const promotions = await getPromotionModel(req).list({
      vendorId: req.user.vendorId,
      type: req.query.type || "all",
      status: req.query.status || "all",
    });
    res.json({ success: true, data: promotions });
  } catch (error) {
    jsonError(res, error, "Failed to load vendor promotions");
  }
};

exports.updateVendorPromotion = async (req, res) => {
  try {
    const promotion = await getPromotionModel(req).findById(req.params.id);
    if (!promotion) return res.status(404).json({ success: false, error: "Promotion not found" });
    if (normalizeId(promotion.vendorId) !== normalizeId(req.user.vendorId)) {
      return res.status(403).json({ success: false, error: "Promotion does not belong to this vendor" });
    }
    const payload = normalizePromotionPayload({ ...promotion, ...req.body }, {
      vendorId: req.user.vendorId,
      actor: getActor(req),
    });
    const updated = await getPromotionModel(req).update(req.params.id, payload);
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to update vendor promotion");
  }
};

exports.setVendorPromotionStatus = (status) => async (req, res) => {
  try {
    const promotion = await getPromotionModel(req).findById(req.params.id);
    if (!promotion) return res.status(404).json({ success: false, error: "Promotion not found" });
    if (normalizeId(promotion.vendorId) !== normalizeId(req.user.vendorId)) {
      return res.status(403).json({ success: false, error: "Promotion does not belong to this vendor" });
    }
    const updated = await getPromotionModel(req).setStatus(req.params.id, status);
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to update vendor promotion status");
  }
};

exports.getVendorGrowthInsights = async (req, res) => {
  try {
    const db = getDb(req);
    const vendorId = normalizeId(req.user.vendorId);
    const promotions = await getPromotionModel(req).list({ vendorId });
    const redemptions = await db.collection("promotion_redemptions").find({
      promotionId: { $in: promotions.map((promotion) => normalizeId(promotion._id)) },
    }).toArray();
    const events = await db.collection("growth_events").find({ vendorId }).sort({ timestamp: -1 }).limit(500).toArray();
    const revenueFromPromotions = redemptions.reduce((sum, row) => sum + Number(row.snapshot?.baseAmount || row.orderValue || 0), 0);
    res.json({
      success: true,
      data: {
        promotions: promotions.length,
        activePromotions: promotions.filter((item) => item.status === "active").length,
        redemptions: redemptions.length,
        discountGiven: redemptions.reduce((sum, row) => sum + Number(row.discountAmount || 0), 0),
        revenueFromPromotions,
        eventCount: events.length,
        topEvents: events.slice(0, 10),
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load vendor growth insights");
  }
};

exports.trackGrowthEvent = async (req, res) => {
  try {
    const event = await GrowthEventService.trackEvent(getDb(req), {
      ...req.body,
      userId: req.user?.uid || req.body.userId || null,
      source: req.body.source || "web",
    });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    jsonError(res, error, "Failed to track event");
  }
};

exports.publishGrowthEvent = async (req, res) => {
  try {
    const result = await GrowthEventBus.publish(getDb(req), req.body.eventName, req.body.payload || {}, req.body.options || {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to publish growth event");
  }
};

exports.aggregateGrowthEvents = async (req, res) => {
  try {
    const rows = await GrowthEventService.aggregateDaily(getDb(req), req.body.date || req.query.date || new Date());
    res.json({ success: true, data: rows });
  } catch (error) {
    jsonError(res, error, "Failed to aggregate growth events");
  }
};

exports.getGrowthAnalytics = async (req, res) => {
  try {
    const db = getDb(req);
    const [aggregates, redemptions, promotions, notifications] = await Promise.all([
      db.collection("growth_daily_aggregates").find({}).sort({ dateKey: -1 }).limit(60).toArray(),
      db.collection("promotion_redemptions").find({}).sort({ redeemedAt: -1 }).limit(500).toArray(),
      getPromotionModel(req).list({}),
      db.collection("notification_queue").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    ]);
    const eventTotals = aggregates.reduce((acc, row) => {
      acc[row.eventName] = (acc[row.eventName] || 0) + Number(row.count || 0);
      return acc;
    }, {});
    res.json({
      success: true,
      data: {
        eventTotals,
        promotionCount: promotions.length,
        activePromotionCount: promotions.filter((promotion) => promotion.status === "active").length,
        voucherUsage: redemptions.length,
        discountGiven: redemptions.reduce((sum, row) => sum + Number(row.discountAmount || 0), 0),
        notificationQueued: notifications.length,
        notificationByStatus: notifications.reduce((acc, row) => {
          acc[row.status || "queued"] = (acc[row.status || "queued"] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load growth analytics");
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const data = await GrowthRecommendationService.forPlacement(getDb(req), {
      placement: req.params.placement || req.query.placement || "homepage",
      userId: req.user?.uid || req.query.userId || null,
      limit: Math.min(Number(req.query.limit || 12), 40),
    });
    res.json({ success: true, data });
  } catch (error) {
    jsonError(res, error, "Failed to load recommendations");
  }
};

exports.getMySegments = async (req, res) => {
  try {
    const db = getDb(req);
    const userId = normalizeId(req.user?.uid || req.user?._id);
    const [events, orders] = await Promise.all([
      db.collection("growth_events").find({ userId }).sort({ timestamp: -1 }).limit(500).toArray(),
      db.collection("orders").find({ userId }).sort({ createdAt: -1 }).limit(100).toArray(),
    ]);
    res.json({ success: true, data: GrowthEventService.deriveCustomerSegments({ events, orders }) });
  } catch (error) {
    jsonError(res, error, "Failed to load customer segments");
  }
};

exports.listNotificationTemplates = async (req, res) => {
  try {
    const rows = await getDb(req).collection("notification_templates").find({}).sort({ eventName: 1, channel: 1 }).toArray();
    res.json({ success: true, data: rows });
  } catch (error) {
    jsonError(res, error, "Failed to load notification templates");
  }
};

exports.upsertNotificationTemplate = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.eventName || !body.channel) {
      return res.status(400).json({ success: false, error: "eventName and channel are required" });
    }
    const doc = {
      eventName: String(body.eventName).trim(),
      channel: String(body.channel).trim(),
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
      url: String(body.url || "/").trim(),
      variables: body.variables || [],
      active: body.active !== false,
      updatedAt: new Date(),
      updatedBy: getActor(req),
    };
    await getDb(req).collection("notification_templates").updateOne(
      { eventName: doc.eventName, channel: doc.channel },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    const saved = await getDb(req).collection("notification_templates").findOne({ eventName: doc.eventName, channel: doc.channel });
    res.json({ success: true, data: saved });
  } catch (error) {
    jsonError(res, error, "Failed to save notification template");
  }
};

exports.listNotificationLogs = async (req, res) => {
  try {
    const rows = await getDb(req)
      .collection("notification_queue")
      .find(req.query.status ? { status: req.query.status } : {})
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit || 100), 500))
      .toArray();
    res.json({ success: true, data: rows });
  } catch (error) {
    jsonError(res, error, "Failed to load notification logs");
  }
};

exports.detectAbandonedCarts = async (req, res) => {
  try {
    const candidates = await AbandonedCartService.detectCandidates(getDb(req), {
      olderThanMinutes: req.body.olderThanMinutes || req.query.olderThanMinutes || 60,
      lookbackDays: req.body.lookbackDays || req.query.lookbackDays || 7,
    });
    const reminders = req.body.enqueue === true
      ? await AbandonedCartService.enqueueReminders(getDb(req), candidates, {
          channels: req.body.channels || ["in_app"],
        })
      : [];
    res.json({ success: true, data: { candidates, reminders } });
  } catch (error) {
    jsonError(res, error, "Failed to detect abandoned carts");
  }
};

exports.listExperiments = async (req, res) => {
  try {
    const rows = await getDb(req).collection("experiments").find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, data: rows });
  } catch (error) {
    jsonError(res, error, "Failed to load experiments");
  }
};

exports.createExperiment = async (req, res) => {
  try {
    const key = String(req.body.key || req.body.name || "").trim();
    if (!key) return res.status(400).json({ success: false, error: "Experiment key is required" });
    const doc = {
      key,
      name: req.body.name || key,
      variants: Array.isArray(req.body.variants) && req.body.variants.length ? req.body.variants : ["control", "variant"],
      status: req.body.status || "active",
      goalEvent: req.body.goalEvent || "order.placed",
      createdBy: getActor(req),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await getDb(req).collection("experiments").insertOne(doc);
    res.status(201).json({ success: true, data: { ...doc, _id: result.insertedId } });
  } catch (error) {
    jsonError(res, error, "Failed to create experiment");
  }
};

exports.assignExperimentVariant = async (req, res) => {
  try {
    const subjectId = normalizeId(req.user?.uid || req.body.subjectId || req.body.sessionId);
    const experiment = await getDb(req).collection("experiments").findOne({ key: req.params.key, status: "active" });
    if (!experiment) return res.status(404).json({ success: false, error: "Experiment not found" });
    const existing = await getDb(req).collection("experiment_assignments").findOne({ experimentKey: req.params.key, subjectId });
    if (existing) return res.json({ success: true, data: existing });
    const variants = experiment.variants || ["control", "variant"];
    const index = Math.abs([...subjectId].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % variants.length;
    const assignment = {
      experimentKey: req.params.key,
      subjectId,
      variant: variants[index],
      assignedAt: new Date(),
      metadata: req.body.metadata || {},
    };
    await getDb(req).collection("experiment_assignments").insertOne(assignment);
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    jsonError(res, error, "Failed to assign experiment variant");
  }
};

exports.previewNotificationTemplate = async (req, res) => {
  try {
    const preview = GrowthNotificationService.buildNotificationPayload({
      eventName: req.body.eventName,
      channel: req.body.channel || "in_app",
      template: req.body.template || req.body,
      payload: req.body.payload || {},
    });
    res.json({ success: true, data: preview });
  } catch (error) {
    jsonError(res, error, "Failed to preview notification template");
  }
};
