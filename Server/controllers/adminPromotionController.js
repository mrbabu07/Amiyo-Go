const { ObjectId } = require("mongodb");
const {
  DEFAULT_PROMOTION_RULES,
  PROMOTION_RULES_SETTING_ID,
  normalizePromotionRules,
} = require("../utils/promotionRulesEngine");

const DEFAULT_LOYALTY_RULES = {
  earnRate: 1,
  redemptionValue: 0.01,
  minRedeemPoints: 100,
  pointsExpiryDays: 365,
  tierMultipliers: {
    bronze: 1,
    silver: 1.5,
    gold: 2,
    platinum: 3,
  },
};

const SLOT_TYPES = ["hero_banner", "category_banner", "ad_slot", "deal_of_day"];
const CAMPAIGN_STATUSES = ["Draft", "Scheduled", "Active", "Ended", "Archived"];
const VOUCHER_TYPES = ["percentage", "fixed", "free_shipping"];

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const safeObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const idFilter = (value) => {
  const objectId = safeObjectId(value);
  return objectId ? { $or: [{ _id: objectId }, { _id: normalizeId(value) }] } : { _id: normalizeId(value) };
};

const idInValues = (ids = []) => {
  const values = [...new Set(ids.map(normalizeId).filter(Boolean))];
  return values.flatMap((id) => {
    const objectId = safeObjectId(id);
    return objectId ? [id, objectId] : [id];
  });
};

const collectionToArray = async (db, name, query = {}, sort = {}) => {
  const cursor = db.collection(name).find(query);
  if (Object.keys(sort).length > 0) cursor.sort(sort);
  return cursor.toArray();
};

const serializeDoc = (doc) => ({
  ...doc,
  _id: normalizeId(doc?._id),
});

const appendPromotionAudit = async (req, { action, target, changes = {}, metadata = {} }) => {
  const db = req.app.locals.db;
  if (!db?.collection) return null;

  const payload = {
    action,
    module: "promotions",
    actor: getActor(req),
    target,
    changes,
    metadata,
    createdAt: new Date(),
  };

  const AuditLog = req.app.locals.models?.AuditLog;
  if (AuditLog?.append) return AuditLog.append(payload);
  return db.collection("audit_logs").insertOne(payload);
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const calculateDiscountPercentage = (regularPrice, salePrice) => {
  const regular = Number(regularPrice || 0);
  const sale = Number(salePrice || 0);
  if (regular <= 0 || sale <= 0 || sale >= regular) return 0;
  return Math.round(((regular - sale) / regular) * 10000) / 100;
};

const computeFlashStatus = ({ startTime, endTime, soldCount = 0, totalStock = 0 }) => {
  const now = new Date();
  if (Number(soldCount || 0) >= Number(totalStock || 0)) return "sold_out";
  if (now < startTime) return "upcoming";
  if (now > endTime) return "expired";
  return "active";
};

const normalizeCampaignPayload = (body = {}, existing = {}) => {
  const name = String(body.name ?? existing.name ?? "").trim();
  const slug = slugify(body.slug || existing.slug || name);
  const startDate = asDate(body.startDate ?? existing.startDate);
  const endDate = asDate(body.endDate ?? existing.endDate);
  const eligibleCategories = normalizeStringArray(body.eligibleCategories ?? existing.eligibleCategories ?? []);
  const discountPercentage = Number(body.discountPercentage ?? existing.discountPercentage ?? 0);
  const minDiscountPercentage = Number(body.minDiscountPercentage ?? existing.minDiscountPercentage ?? discountPercentage);
  const maxProductsPerVendor = Number(body.maxProductsPerVendor ?? existing.maxProductsPerVendor ?? 100);
  const status = body.status || existing.status || "Draft";
  const errors = [];

  if (!name) errors.push("Campaign name is required.");
  if (!slug) errors.push("Campaign slug is required.");
  if (!body.bannerImageUrl && !existing.bannerImageUrl) errors.push("Campaign banner image is required.");
  if (!startDate) errors.push("Start date is required.");
  if (!endDate) errors.push("End date is required.");
  if (startDate && endDate && startDate >= endDate) errors.push("End date must be after start date.");
  if (eligibleCategories.length === 0) errors.push("Select at least one eligible category.");
  if (!Number.isFinite(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
    errors.push("Discount percentage must be between 1 and 100.");
  }
  if (!Number.isFinite(minDiscountPercentage) || minDiscountPercentage < 1 || minDiscountPercentage > 100) {
    errors.push("Minimum discount percentage must be between 1 and 100.");
  }
  if (!Number.isFinite(maxProductsPerVendor) || maxProductsPerVendor < 1 || maxProductsPerVendor > 1000) {
    errors.push("Max products per vendor must be between 1 and 1000.");
  }
  if (!CAMPAIGN_STATUSES.includes(status)) errors.push("Invalid campaign status.");

  return {
    errors,
    payload: {
      name,
      slug,
      description: String(body.description ?? existing.description ?? "").trim(),
      campaignType: String(body.campaignType ?? existing.campaignType ?? "sale_event").trim(),
      bannerImageUrl: String(body.bannerImageUrl ?? existing.bannerImageUrl ?? "").trim(),
      startDate,
      endDate,
      discountPercentage,
      minDiscountPercentage,
      eligibleCategories,
      maxProductsPerVendor,
      status,
    },
  };
};

const buildNominationRows = (items = []) =>
  items.flatMap((item) =>
    (item.productNominations || []).map((product) => ({
      rowKey: `${normalizeId(item._id)}:${product.productId}:${product.variantSku || product.sku || ""}`,
      nominationId: normalizeId(item._id),
      vendorId: normalizeId(item.vendorId),
      vendorName: item.vendorName || "Vendor",
      campaignId: normalizeId(item.campaignId),
      campaignName: item.campaignName || item.title || "Campaign",
      submittedAt: item.createdAt || item.updatedAt,
      productId: normalizeId(product.productId),
      title: product.title || "Product",
      sku: product.variantSku || product.sku || "",
      regularPrice: Number(product.regularPrice || 0),
      campaignPrice: Number(product.campaignPrice || 0),
      discountPercentage: Number(product.discountPercentage || 0),
      stock: Number(product.stock || 0),
      image: product.image || "",
      status: product.moderationStatus || product.status || item.status || "pending",
      reason: product.moderationReason || "",
    })),
  );

const buildPromotionOverview = ({
  campaigns = [],
  nominationItems = [],
  flashDeals = [],
  vouchers = [],
  homepageSlots = [],
  clearanceRules = [],
  loyaltyRules = DEFAULT_LOYALTY_RULES,
  promotionRules = DEFAULT_PROMOTION_RULES,
}) => {
  const now = new Date();
  const nominationRows = buildNominationRows(nominationItems);

  return {
    campaigns: {
      total: campaigns.length,
      active: campaigns.filter((campaign) => campaign.status === "Active").length,
      scheduled: campaigns.filter((campaign) => campaign.status === "Scheduled").length,
      draft: campaigns.filter((campaign) => campaign.status === "Draft").length,
    },
    nominations: {
      total: nominationRows.length,
      pending: nominationRows.filter((row) => row.status === "pending").length,
      approved: nominationRows.filter((row) => row.status === "approved").length,
      rejected: nominationRows.filter((row) => row.status === "rejected").length,
    },
    flashDeals: {
      total: flashDeals.length,
      active: flashDeals.filter((deal) => deal.status === "active" || (deal.startTime <= now && deal.endTime >= now)).length,
      upcoming: flashDeals.filter((deal) => deal.status === "upcoming" || deal.startTime > now).length,
    },
    vouchers: {
      total: vouchers.length,
      active: vouchers.filter((voucher) => voucher.isActive !== false && asDate(voucher.expiresAt) > now).length,
      firstOrderOnly: vouchers.filter((voucher) => voucher.firstOrderOnly).length,
    },
    homepageSlots: {
      total: homepageSlots.length,
      active: homepageSlots.filter((slot) => slot.status !== "inactive").length,
      hero: homepageSlots.filter((slot) => slot.slotType === "hero_banner").length,
    },
    clearance: {
      active: clearanceRules.filter((rule) => rule.status === "active").length,
      productsDiscounted: clearanceRules.reduce((sum, rule) => sum + Number(rule.productsAffected || 0), 0),
    },
    loyaltyRules,
    promotionRules: normalizePromotionRules(promotionRules),
  };
};

const loadPromotionSource = async (db) => {
  const [
    campaigns,
    nominationItems,
    flashDeals,
    vouchers,
    homepageSlots,
    clearanceRules,
    savedLoyaltyRules,
    savedPromotionRules,
  ] =
    await Promise.all([
      collectionToArray(db, "campaigns", {}, { createdAt: -1 }),
      collectionToArray(db, "vendorMarketingItems", { type: "campaign_nomination" }, { createdAt: -1 }),
      collectionToArray(db, "flashsales", {}, { startTime: -1 }),
      collectionToArray(db, "coupons", { isPlatformVoucher: true }, { createdAt: -1 }),
      collectionToArray(db, "homepage_slots", {}, { position: 1, createdAt: -1 }),
      collectionToArray(db, "clearance_rules", {}, { createdAt: -1 }),
      db.collection("promotion_settings").findOne({ _id: "loyalty_rules" }),
      db.collection("promotion_settings").findOne({ _id: PROMOTION_RULES_SETTING_ID }),
    ]);

  return {
    campaigns,
    nominationItems,
    flashDeals,
    vouchers,
    homepageSlots,
    clearanceRules,
    loyaltyRules: { ...DEFAULT_LOYALTY_RULES, ...(savedLoyaltyRules || {}) },
    promotionRules: normalizePromotionRules(savedPromotionRules || {}),
  };
};

exports.getPromotionOverview = async (req, res) => {
  try {
    const source = await loadPromotionSource(req.app.locals.db);
    res.json({
      success: true,
      data: {
        overview: buildPromotionOverview(source),
        campaigns: source.campaigns.slice(0, 8).map(serializeDoc),
        nominations: buildNominationRows(source.nominationItems).slice(0, 20),
        flashDeals: source.flashDeals.slice(0, 8).map(serializeDoc),
        vouchers: source.vouchers.slice(0, 8).map(serializeDoc),
        homepageSlots: source.homepageSlots.slice(0, 12).map(serializeDoc),
        clearanceRules: source.clearanceRules.slice(0, 8).map(serializeDoc),
        loyaltyRules: source.loyaltyRules,
        promotionRules: source.promotionRules,
      },
    });
  } catch (error) {
    console.error("Error loading promotion overview:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listPromotionCampaigns = async (req, res) => {
  try {
    const campaigns = await collectionToArray(req.app.locals.db, "campaigns", {}, { createdAt: -1 });
    res.json({ success: true, data: campaigns.map(serializeDoc) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createPromotionCampaign = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { errors, payload } = normalizeCampaignPayload(req.body);
    if (errors.length > 0) return res.status(400).json({ success: false, error: errors[0] });

    const duplicate = await db.collection("campaigns").findOne({ slug: payload.slug });
    if (duplicate) return res.status(400).json({ success: false, error: "Campaign slug already exists." });

    const now = new Date();
    const doc = {
      ...payload,
      createdBy: getActor(req).userId,
      updatedBy: getActor(req).userId,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("campaigns").insertOne(doc);
    const campaign = await db.collection("campaigns").findOne({ _id: result.insertedId });
    await appendPromotionAudit(req, {
      action: "promotions.campaign.created",
      target: { type: "campaign", id: normalizeId(result.insertedId) },
      changes: payload,
    });

    res.status(201).json({ success: true, data: serializeDoc(campaign) });
  } catch (error) {
    console.error("Error creating promotion campaign:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePromotionCampaign = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaign = await db.collection("campaigns").findOne(idFilter(req.params.campaignId));
    if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found." });

    const { errors, payload } = normalizeCampaignPayload(req.body, campaign);
    if (errors.length > 0) return res.status(400).json({ success: false, error: errors[0] });

    const duplicate = await db.collection("campaigns").findOne({ slug: payload.slug });
    if (duplicate && normalizeId(duplicate._id) !== normalizeId(campaign._id)) {
      return res.status(400).json({ success: false, error: "Campaign slug already exists." });
    }

    await db.collection("campaigns").updateOne(idFilter(campaign._id), {
      $set: { ...payload, updatedAt: new Date(), updatedBy: getActor(req).userId },
    });
    const updated = await db.collection("campaigns").findOne(idFilter(campaign._id));
    await appendPromotionAudit(req, {
      action: "promotions.campaign.updated",
      target: { type: "campaign", id: normalizeId(campaign._id) },
      changes: payload,
    });

    res.json({ success: true, data: serializeDoc(updated) });
  } catch (error) {
    console.error("Error updating promotion campaign:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCampaignNominationQueue = async (req, res) => {
  try {
    const status = String(req.query.status || "all").toLowerCase();
    const query = { type: "campaign_nomination" };
    if (status !== "all") query.status = status;

    const items = await collectionToArray(req.app.locals.db, "vendorMarketingItems", query, { createdAt: -1 });
    const rows = buildNominationRows(items).filter((row) => (status === "all" ? true : row.status === status));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error loading nomination queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reviewCampaignNomination = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { nominationId } = req.params;
    const { productId, variantSku = "", status, reason = "" } = req.body;
    const normalizedStatus = String(status || "").toLowerCase();

    if (!["approved", "rejected", "pending"].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, error: 'Status must be "approved", "rejected", or "pending".' });
    }
    if (normalizedStatus === "rejected" && !String(reason).trim()) {
      return res.status(400).json({ success: false, error: "Rejection reason is required." });
    }

    const collection = db.collection("vendorMarketingItems");
    const item = await collection.findOne(idFilter(nominationId));
    if (!item || item.type !== "campaign_nomination") {
      return res.status(404).json({ success: false, error: "Campaign nomination not found." });
    }

    let matched = false;
    const reviewedAt = new Date();
    const productNominations = (item.productNominations || []).map((product) => {
      const sameProduct = normalizeId(product.productId) === normalizeId(productId);
      const sameSku = !variantSku || normalizeId(product.variantSku || product.sku) === normalizeId(variantSku);
      if (!sameProduct || !sameSku) return product;
      matched = true;
      return {
        ...product,
        moderationStatus: normalizedStatus,
        moderationReason: String(reason || "").trim(),
        reviewedAt,
        reviewedBy: getActor(req).userId,
      };
    });

    if (!matched) return res.status(404).json({ success: false, error: "Nominated SKU not found." });

    const statuses = productNominations.map((product) => product.moderationStatus || "pending");
    const parentStatus = statuses.every((value) => value === "approved")
      ? "approved"
      : statuses.every((value) => value === "rejected")
        ? "rejected"
        : "pending";

    await collection.updateOne(idFilter(item._id), {
      $set: {
        productNominations,
        status: parentStatus,
        adminNotes: String(reason || item.adminNotes || "").trim(),
        reviewedAt,
        reviewedBy: getActor(req).userId,
        updatedAt: reviewedAt,
      },
    });

    const updated = await collection.findOne(idFilter(item._id));
    await appendPromotionAudit(req, {
      action: "promotions.nomination.reviewed",
      target: { type: "campaign_nomination", id: normalizeId(item._id), productId: normalizeId(productId) },
      changes: { status: normalizedStatus, reason },
    });

    res.json({ success: true, data: buildNominationRows([updated]) });
  } catch (error) {
    console.error("Error reviewing campaign nomination:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listFlashDeals = async (req, res) => {
  try {
    const deals = await collectionToArray(req.app.locals.db, "flashsales", {}, { startTime: -1 });
    res.json({ success: true, data: deals.map(serializeDoc) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createFlashDeal = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const productId = req.body.product || req.body.productId;
    const product = await db.collection("products").findOne(idFilter(productId));
    if (!product) return res.status(404).json({ success: false, error: "Product not found." });

    const flashPrice = Number(req.body.flashPrice);
    const originalPrice = Number(req.body.originalPrice || product.price || 0);
    const startTime = asDate(req.body.startTime);
    const endTime = asDate(req.body.endTime);
    const totalStock = Number(req.body.totalStock || 0);
    const maxPerUser = Number(req.body.maxPerUser || 1);
    const minDiscountPercentage = Number(req.body.minDiscountPercentage || 5);
    const discountPercentage = calculateDiscountPercentage(originalPrice, flashPrice);

    if (!startTime || !endTime || startTime >= endTime) {
      return res.status(400).json({ success: false, error: "Flash deal needs a valid start and end time." });
    }
    if (!Number.isFinite(flashPrice) || flashPrice <= 0 || flashPrice >= originalPrice) {
      return res.status(400).json({ success: false, error: "Flash price must be lower than regular price." });
    }
    if (discountPercentage < minDiscountPercentage) {
      return res.status(400).json({ success: false, error: `Discount must be at least ${minDiscountPercentage}%.` });
    }
    if (!Number.isFinite(totalStock) || totalStock < 1) {
      return res.status(400).json({ success: false, error: "Total stock must be at least 1." });
    }
    if (!Number.isFinite(maxPerUser) || maxPerUser < 1) {
      return res.status(400).json({ success: false, error: "Max quantity per buyer must be at least 1." });
    }

    const doc = {
      title: String(req.body.title || product.title || "Flash Deal").trim(),
      description: String(req.body.description || "").trim(),
      product: safeObjectId(productId) || normalizeId(productId),
      productId: normalizeId(productId),
      productTitle: product.title || product.name || "Product",
      vendorId: normalizeId(product.vendorId),
      originalPrice,
      flashPrice,
      discountPercentage,
      minDiscountPercentage,
      startTime,
      endTime,
      totalStock,
      soldCount: 0,
      maxPerUser,
      isActive: req.body.isActive !== false,
      status: computeFlashStatus({ startTime, endTime, totalStock, soldCount: 0 }),
      campaignId: normalizeId(req.body.campaignId),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: getActor(req).userId,
    };

    const result = await db.collection("flashsales").insertOne(doc);
    const saved = await db.collection("flashsales").findOne({ _id: result.insertedId });
    await appendPromotionAudit(req, {
      action: "promotions.flash_deal.created",
      target: { type: "flash_deal", id: normalizeId(result.insertedId) },
      changes: doc,
    });

    res.status(201).json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error creating flash deal:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listPlatformVouchers = async (req, res) => {
  try {
    const vouchers = await collectionToArray(req.app.locals.db, "coupons", { isPlatformVoucher: true }, { createdAt: -1 });
    res.json({ success: true, data: vouchers.map(serializeDoc) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createPlatformVoucher = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const code = String(req.body.code || "").trim().toUpperCase();
    const discountType = String(req.body.discountType || "percentage").trim().toLowerCase();
    const discountValue = discountType === "free_shipping" ? Number(req.body.discountValue || 0) : Number(req.body.discountValue);
    const expiresAt = asDate(req.body.expiresAt);

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      return res.status(400).json({ success: false, error: "Voucher code must be 3-30 letters, numbers, dash, or underscore." });
    }
    if (!VOUCHER_TYPES.includes(discountType)) {
      return res.status(400).json({ success: false, error: "Invalid voucher discount type." });
    }
    if (discountType !== "free_shipping" && (!Number.isFinite(discountValue) || discountValue <= 0)) {
      return res.status(400).json({ success: false, error: "Discount value must be greater than zero." });
    }
    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({ success: false, error: "Percentage discount cannot be more than 100." });
    }
    if (!expiresAt || expiresAt <= new Date()) {
      return res.status(400).json({ success: false, error: "Voucher expiry must be in the future." });
    }

    const duplicate = await db.collection("coupons").findOne({ code });
    if (duplicate) return res.status(400).json({ success: false, error: "Voucher code already exists." });

    const doc = {
      code,
      name: String(req.body.name || code).trim(),
      description: String(req.body.description || "").trim(),
      discountType,
      discountValue,
      maxDiscountAmount: req.body.maxDiscountAmount === "" ? null : Number(req.body.maxDiscountAmount || 0),
      minOrderAmount: req.body.minOrderAmount === "" ? null : Number(req.body.minOrderAmount || 0),
      usageLimit: req.body.usageLimit === "" ? null : Number.parseInt(req.body.usageLimit || 0, 10) || null,
      userUsageLimit: req.body.userUsageLimit === "" ? null : Number.parseInt(req.body.userUsageLimit || 0, 10) || null,
      firstOrderOnly: req.body.firstOrderOnly === true,
      isPlatformVoucher: true,
      scope: "platform",
      isActive: req.body.isActive !== false,
      usedCount: 0,
      usedBy: [],
      expiresAt,
      campaignId: normalizeId(req.body.campaignId),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: getActor(req).userId,
    };

    const result = await db.collection("coupons").insertOne(doc);
    const saved = await db.collection("coupons").findOne({ _id: result.insertedId });
    await appendPromotionAudit(req, {
      action: "promotions.platform_voucher.created",
      target: { type: "coupon", id: normalizeId(result.insertedId) },
      changes: doc,
    });

    res.status(201).json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error creating platform voucher:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listHomepageSlots = async (req, res) => {
  try {
    const slots = await collectionToArray(req.app.locals.db, "homepage_slots", {}, { position: 1, createdAt: -1 });
    res.json({ success: true, data: slots.map(serializeDoc) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.upsertHomepageSlot = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const slotType = String(req.body.slotType || "hero_banner").trim();
    if (!SLOT_TYPES.includes(slotType)) return res.status(400).json({ success: false, error: "Invalid homepage slot type." });
    if (!String(req.body.title || "").trim()) return res.status(400).json({ success: false, error: "Slot title is required." });

    const payload = {
      slotType,
      title: String(req.body.title || "").trim(),
      imageUrl: String(req.body.imageUrl || "").trim(),
      linkUrl: String(req.body.linkUrl || "").trim(),
      campaignId: normalizeId(req.body.campaignId),
      vendorId: normalizeId(req.body.vendorId),
      categoryId: normalizeId(req.body.categoryId),
      productId: normalizeId(req.body.productId),
      specialPrice: req.body.specialPrice === "" ? null : Number(req.body.specialPrice || 0),
      position: Number(req.body.position || 0),
      status: req.body.status || "active",
      startsAt: asDate(req.body.startsAt),
      endsAt: asDate(req.body.endsAt),
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };

    let slotId = req.params.slotId;
    if (slotId) {
      await db.collection("homepage_slots").updateOne(idFilter(slotId), { $set: payload });
    } else {
      payload.createdAt = new Date();
      payload.createdBy = getActor(req).userId;
      const result = await db.collection("homepage_slots").insertOne(payload);
      slotId = normalizeId(result.insertedId);
    }

    const saved = await db.collection("homepage_slots").findOne(idFilter(slotId));
    await appendPromotionAudit(req, {
      action: "promotions.homepage_slot.saved",
      target: { type: "homepage_slot", id: slotId },
      changes: payload,
    });

    res.status(req.params.slotId ? 200 : 201).json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error saving homepage slot:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reorderHomepageSlots = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const slots = Array.isArray(req.body.slots) ? req.body.slots : [];
    await Promise.all(
      slots.map((slot, index) =>
        db.collection("homepage_slots").updateOne(idFilter(slot.slotId || slot._id), {
          $set: { position: Number(slot.position ?? index), updatedAt: new Date(), updatedBy: getActor(req).userId },
        }),
      ),
    );
    await appendPromotionAudit(req, {
      action: "promotions.homepage_slots.reordered",
      target: { type: "homepage_slots", id: "bulk" },
      changes: { slots },
    });
    const updated = await collectionToArray(db, "homepage_slots", {}, { position: 1, createdAt: -1 });
    res.json({ success: true, data: updated.map(serializeDoc) });
  } catch (error) {
    console.error("Error reordering homepage slots:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.selectDealOfDay = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const product = await db.collection("products").findOne(idFilter(req.body.productId));
    if (!product) return res.status(404).json({ success: false, error: "Product not found." });

    await db.collection("homepage_slots").updateMany(
      { slotType: "deal_of_day", status: "active" },
      { $set: { status: "inactive", updatedAt: new Date() } },
    );

    req.body.slotType = "deal_of_day";
    req.body.title = req.body.title || product.title || product.name || "Deal of the day";
    req.body.imageUrl = req.body.imageUrl || product.images?.[0] || product.image || "";
    req.body.linkUrl = req.body.linkUrl || `/product/${normalizeId(product._id)}`;
    req.body.specialPrice = req.body.specialPrice || req.body.dealPrice || product.price;
    return exports.upsertHomepageSlot(req, res);
  } catch (error) {
    console.error("Error selecting deal of the day:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listClearanceRules = async (req, res) => {
  try {
    const rules = await collectionToArray(req.app.locals.db, "clearance_rules", {}, { createdAt: -1 });
    res.json({ success: true, data: rules.map(serializeDoc) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.applyClearanceSale = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const discountPercentage = Number(req.body.discountPercentage);
    const productIds = normalizeStringArray(req.body.productIds);
    const vendorIds = normalizeStringArray(req.body.vendorIds);
    const categoryIds = normalizeStringArray(req.body.categoryIds);
    const startDate = asDate(req.body.startDate) || new Date();
    const endDate = asDate(req.body.endDate);

    if (!Number.isFinite(discountPercentage) || discountPercentage < 1 || discountPercentage > 90) {
      return res.status(400).json({ success: false, error: "Clearance discount must be between 1 and 90." });
    }
    if (!endDate || startDate >= endDate) {
      return res.status(400).json({ success: false, error: "Clearance sale needs a valid date range." });
    }
    if (productIds.length === 0 && vendorIds.length === 0 && categoryIds.length === 0) {
      return res.status(400).json({ success: false, error: "Select products, vendors, or categories for clearance." });
    }

    const products = await collectionToArray(db, "products");
    const selected = products.filter((product) => {
      if (productIds.length > 0 && !productIds.includes(normalizeId(product._id))) return false;
      if (vendorIds.length > 0 && !vendorIds.includes(normalizeId(product.vendorId))) return false;
      if (categoryIds.length > 0 && !categoryIds.includes(normalizeId(product.categoryId))) return false;
      if (req.body.onlySlowMoving && Number(product.views || product.viewCount || 0) > Number(req.body.maxViews || 50)) return false;
      return true;
    });

    const ruleId = new ObjectId();
    const rule = {
      _id: ruleId,
      title: String(req.body.title || "Clearance sale").trim(),
      discountPercentage,
      productIds,
      vendorIds,
      categoryIds,
      startDate,
      endDate,
      status: "active",
      productsAffected: selected.length,
      reason: String(req.body.reason || "").trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: getActor(req).userId,
    };
    await db.collection("clearance_rules").insertOne(rule);

    const selectedIds = selected.map((product) => product._id);
    if (selectedIds.length > 0) {
      await db.collection("products").updateMany(
        { _id: { $in: selectedIds } },
        {
          $set: {
            clearanceSale: {
              ruleId: normalizeId(ruleId),
              discountPercentage,
              startDate,
              endDate,
              status: "active",
            },
            updatedAt: new Date(),
          },
        },
      );
    }

    await appendPromotionAudit(req, {
      action: "promotions.clearance_sale.applied",
      target: { type: "clearance_rule", id: normalizeId(ruleId) },
      changes: { discountPercentage, productsAffected: selected.length },
    });

    res.status(201).json({ success: true, data: serializeDoc(rule) });
  } catch (error) {
    console.error("Error applying clearance sale:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLoyaltyRules = async (req, res) => {
  try {
    const saved = await req.app.locals.db.collection("promotion_settings").findOne({ _id: "loyalty_rules" });
    res.json({ success: true, data: { ...DEFAULT_LOYALTY_RULES, ...(saved || {}) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.upsertLoyaltyRules = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tierMultipliers = {
      ...DEFAULT_LOYALTY_RULES.tierMultipliers,
      ...(req.body.tierMultipliers || {}),
    };
    const payload = {
      ...DEFAULT_LOYALTY_RULES,
      earnRate: Math.max(0, Number(req.body.earnRate ?? DEFAULT_LOYALTY_RULES.earnRate)),
      redemptionValue: Math.max(0, Number(req.body.redemptionValue ?? DEFAULT_LOYALTY_RULES.redemptionValue)),
      minRedeemPoints: Math.max(1, Number(req.body.minRedeemPoints ?? DEFAULT_LOYALTY_RULES.minRedeemPoints)),
      pointsExpiryDays: Math.max(0, Number(req.body.pointsExpiryDays ?? DEFAULT_LOYALTY_RULES.pointsExpiryDays)),
      tierMultipliers: {
        bronze: Math.max(0, Number(tierMultipliers.bronze)),
        silver: Math.max(0, Number(tierMultipliers.silver)),
        gold: Math.max(0, Number(tierMultipliers.gold)),
        platinum: Math.max(0, Number(tierMultipliers.platinum)),
      },
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };

    await db.collection("promotion_settings").updateOne(
      { _id: "loyalty_rules" },
      { $set: payload, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    await appendPromotionAudit(req, {
      action: "promotions.loyalty_rules.updated",
      target: { type: "promotion_setting", id: "loyalty_rules" },
      changes: payload,
    });

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error("Error updating loyalty rules:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPromotionRules = async (req, res) => {
  try {
    const saved = await req.app.locals.db
      .collection("promotion_settings")
      .findOne({ _id: PROMOTION_RULES_SETTING_ID });
    res.json({
      success: true,
      data: {
        _id: PROMOTION_RULES_SETTING_ID,
        ...normalizePromotionRules(saved || {}),
        updatedAt: saved?.updatedAt || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.upsertPromotionRules = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const actor = getActor(req);
    const rules = normalizePromotionRules(req.body || {});
    const payload = {
      ...rules,
      updatedAt: new Date(),
      updatedBy: actor.userId,
    };

    await db.collection("promotion_settings").updateOne(
      { _id: PROMOTION_RULES_SETTING_ID },
      { $set: payload, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );

    await appendPromotionAudit(req, {
      action: "promotions.rules.updated",
      target: { type: "promotion_setting", id: PROMOTION_RULES_SETTING_ID },
      changes: rules,
    });

    res.json({
      success: true,
      data: {
        _id: PROMOTION_RULES_SETTING_ID,
        ...payload,
      },
    });
  } catch (error) {
    console.error("Error updating promotion rules:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPromotionAuditLog = async (req, res) => {
  try {
    const logs = await req.app.locals.db
      .collection("audit_logs")
      .find({ module: "promotions" })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    res.json({ success: true, data: logs.map(serializeDoc) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports._promotionTestUtils = {
  DEFAULT_LOYALTY_RULES,
  buildNominationRows,
  buildPromotionOverview,
  calculateDiscountPercentage,
  DEFAULT_PROMOTION_RULES,
  normalizeCampaignPayload,
  normalizePromotionRules,
};
