const { ObjectId } = require("mongodb");
const Campaign = require("../models/Campaign");
const { normalizeId } = require("../utils/vendorMarketingVoucher");
const campaignVoucherAnalyticsService = require("../services/campaignVoucherAnalyticsService");

const MARKETING_TYPES = [
  "promotion",
  "voucher",
  "campaign",
  "campaign_nomination",
  "bundle",
  "free_shipping",
  "seller_pick",
];
const DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"];
const BUNDLE_TYPES = ["quantity_discount", "fixed_bundle"];
const MAX_SELLER_PICKS = 8;

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const parseOptionalInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const getVendorIdentity = (req) => {
  const vendor = req.vendor || {};
  return {
    vendorId: req.user.vendorId?.toString?.() || String(req.user.vendorId || ""),
    vendorUserId: req.user._id?.toString?.() || req.user.uid,
    vendorName:
      vendor.storeName ||
      vendor.shopName ||
      vendor.businessName ||
      vendor.name ||
      req.dbUser?.profile?.firstName ||
      req.user.email ||
      "Vendor",
  };
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  )];
};

const toObjectIds = (ids = []) =>
  normalizeStringArray(ids)
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

const activeVoucherQuery = (code, excludeId = "") => {
  const query = {
    type: "voucher",
    code,
    status: { $in: ["pending", "approved"] },
  };

  if (excludeId && ObjectId.isValid(excludeId)) {
    query._id = { $ne: new ObjectId(excludeId) };
  }

  return query;
};

const findVoucherCodeConflict = async (db, code, { excludeId = "" } = {}) => {
  if (!db?.collection || !code) return null;

  const vendorVoucher = await db
    .collection("vendorMarketingItems")
    .findOne(activeVoucherQuery(code, excludeId));

  if (vendorVoucher) {
    return { source: "vendor_voucher", item: vendorVoucher };
  }

  const platformCoupon = await db.collection("coupons").findOne({
    code,
    isActive: { $ne: false },
  });
  if (platformCoupon) {
    return { source: "platform_coupon", item: platformCoupon };
  }

  const platformOffer = await db.collection("offers").findOne({
    couponCode: code,
    isActive: { $ne: false },
  });
  if (platformOffer) {
    return { source: "platform_offer", item: platformOffer };
  }

  return null;
};

const productBelongsToVendor = (product, vendorId) =>
  product?.vendorId && product.vendorId.toString() === vendorId.toString();

const findVendorProducts = async (db, vendorId, productIds = []) => {
  const ids = toObjectIds(productIds);
  if (ids.length === 0) return [];
  const vendorValues = [vendorId.toString()];
  if (ObjectId.isValid(vendorId)) {
    vendorValues.push(new ObjectId(vendorId));
  }

  return db
    .collection("products")
    .find({
      _id: { $in: ids },
      vendorId: { $in: vendorValues },
    })
    .project({
      _id: 1,
      title: 1,
      price: 1,
      images: 1,
      stock: 1,
      sku: 1,
      variants: 1,
      categoryId: 1,
      approvalStatus: 1,
      isActive: 1,
    })
    .toArray();
};

const summarizeProduct = (product) => ({
  productId: product._id.toString(),
  title: product.title || "Product",
  regularPrice: Number(product.price || 0),
  image: product.images?.[0] || "",
  sku: product.sku || product.variants?.[0]?.sku || "",
  stock: Number(product.stock || 0),
});

const normalizeProductNominations = async ({ db, vendorId, campaign, nominations }) => {
  if (!Array.isArray(nominations)) return { errors: ["Select at least one product to nominate."], products: [] };

  const trimmed = nominations
    .map((item) => ({
      productId: String(item.productId || "").trim(),
      variantSku: String(item.variantSku || "").trim(),
      campaignPrice: Number(item.campaignPrice),
    }))
    .filter((item) => item.productId);

  if (trimmed.length === 0) {
    return { errors: ["Select at least one product to nominate."], products: [] };
  }

  const uniqueProductIds = normalizeStringArray(trimmed.map((item) => item.productId));
  const products = await findVendorProducts(db, vendorId, uniqueProductIds);
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const errors = [];

  if (products.length !== uniqueProductIds.length) {
    errors.push("One or more selected products were not found in your catalog.");
  }

  if (campaign?.maxProductsPerVendor && trimmed.length > Number(campaign.maxProductsPerVendor)) {
    errors.push(`This campaign allows up to ${campaign.maxProductsPerVendor} products per vendor.`);
  }

  const eligibleCategories = (campaign?.eligibleCategories || []).map((id) => id?.toString?.() || String(id));
  const normalized = [];
  trimmed.forEach((item) => {
    const product = productMap.get(item.productId);
    if (!product) return;

    if (!productBelongsToVendor(product, vendorId)) {
      errors.push(`${product.title || "Product"} does not belong to this vendor.`);
      return;
    }

    if (eligibleCategories.length > 0) {
      const categoryId = product.categoryId?.toString?.() || String(product.categoryId || "");
      if (!eligibleCategories.includes(categoryId)) {
        errors.push(`${product.title || "Product"} is not in an eligible campaign category.`);
      }
    }

    const variant = item.variantSku
      ? (product.variants || []).find((row) => row.sku === item.variantSku)
      : null;
    const regularPrice = Number(variant?.price || product.price || 0);

    if (!Number.isFinite(item.campaignPrice) || item.campaignPrice <= 0) {
      errors.push(`${product.title || "Product"} needs a valid campaign price.`);
      return;
    }

    if (item.campaignPrice > regularPrice) {
      errors.push(`${product.title || "Product"} campaign price must be less than or equal to regular price.`);
      return;
    }

    normalized.push({
      productId: product._id.toString(),
      title: product.title || "Product",
      sku: item.variantSku || product.sku || product.variants?.[0]?.sku || "",
      variantSku: item.variantSku || "",
      regularPrice,
      campaignPrice: item.campaignPrice,
      stock: Number(variant?.stock ?? product.stock ?? 0),
      image: variant?.image || product.images?.[0] || "",
      discountPercentage: regularPrice > 0
        ? Math.round(((regularPrice - item.campaignPrice) / regularPrice) * 10000) / 100
        : 0,
    });
  });

  return { errors, products: normalized };
};

const normalizeItem = (item) => ({
  ...item,
  _id: item._id?.toString?.() || item._id,
  vendorId: normalizeId(item.vendorId),
  reviewedBy: normalizeId(item.reviewedBy),
});

const serializeItems = (items = []) => items.map(normalizeItem);

const validateMarketingPayload = async (payload, context = {}) => {
  const { db, vendorId } = context;
  const type = String(payload.type || "").trim().toLowerCase();
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const code = payload.code ? String(payload.code).trim().toUpperCase() : "";
  const discountType = payload.discountType ? String(payload.discountType).trim().toLowerCase() : "";
  const discountValue = parseOptionalNumber(payload.discountValue);
  const maxDiscountAmount = parseOptionalNumber(payload.maxDiscountAmount);
  const minOrderAmount = parseOptionalNumber(payload.minOrderAmount);
  const usageLimit = parseOptionalInteger(payload.usageLimit);
  const expectedProducts = parseOptionalInteger(payload.expectedProducts);
  const requestedDiscountPercentage = parseOptionalNumber(payload.requestedDiscountPercentage);
  const startDate = payload.startDate ? new Date(payload.startDate) : null;
  const endDate = payload.endDate ? new Date(payload.endDate) : null;
  const campaignId = payload.campaignId ? String(payload.campaignId).trim() : "";
  const placement = String(payload.placement || "").trim();
  const productIds = normalizeStringArray(payload.productIds);
  const bundleType = String(payload.bundleType || "quantity_discount").trim().toLowerCase();
  const bundleQuantity = parseOptionalInteger(payload.bundleQuantity);
  const bundleFixedPrice = parseOptionalNumber(payload.bundleFixedPrice);
  const errors = [];
  let linkedCampaign = null;
  let selectedProducts = [];
  let nominatedProducts = [];

  if (!MARKETING_TYPES.includes(type)) {
    errors.push("Invalid marketing type.");
  }

  if (!["campaign", "campaign_nomination"].includes(type) && !title) {
    errors.push("Title is required.");
  }

  if (!description && !["seller_pick"].includes(type)) {
    errors.push("Description is required.");
  }

  if (!startDate || Number.isNaN(startDate.getTime())) {
    errors.push("A valid start date is required.");
  }

  if (!endDate || Number.isNaN(endDate.getTime())) {
    errors.push("A valid end date is required.");
  }

  if (startDate && endDate && startDate >= endDate) {
    errors.push("End date must be after start date.");
  }

  if (type === "promotion" || type === "voucher" || type === "bundle") {
    if (!DISCOUNT_TYPES.includes(discountType)) {
      errors.push('Discount type must be "percentage", "fixed", or "free_shipping".');
    }

    if (discountType !== "free_shipping" && (Number.isNaN(discountValue) || discountValue <= 0)) {
      errors.push("Discount value must be greater than zero.");
    }

    if (discountType === "percentage" && !Number.isNaN(discountValue) && discountValue > 100) {
      errors.push("Percentage discount cannot be more than 100.");
    }
  }

  if (type === "voucher") {
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      errors.push("Voucher code must be 3-30 characters and use only letters, numbers, dash, or underscore.");
    }

    if (minOrderAmount !== null && (Number.isNaN(minOrderAmount) || minOrderAmount < 0)) {
      errors.push("Minimum order amount must be zero or more.");
    }

    if (usageLimit !== null && (Number.isNaN(usageLimit) || usageLimit < 1)) {
      errors.push("Usage limit must be at least 1.");
    }

    if (maxDiscountAmount !== null && (Number.isNaN(maxDiscountAmount) || maxDiscountAmount < 0)) {
      errors.push("Maximum discount amount must be zero or more.");
    }
  }

  if (["bundle", "free_shipping", "seller_pick"].includes(type)) {
    if (productIds.length === 0 && type !== "free_shipping") {
      errors.push("Select at least one product.");
    }

    if (productIds.length > 0 && db && vendorId) {
      selectedProducts = await findVendorProducts(db, vendorId, productIds);
      if (selectedProducts.length !== productIds.length) {
        errors.push("One or more selected products were not found in your catalog.");
      }
    }
  }

  if (type === "seller_pick" && productIds.length > MAX_SELLER_PICKS) {
    errors.push(`Seller picks can include up to ${MAX_SELLER_PICKS} products.`);
  }

  if (type === "free_shipping") {
    if (minOrderAmount === null || Number.isNaN(minOrderAmount) || minOrderAmount < 0) {
      errors.push("Free shipping minimum order must be zero or more.");
    }
  }

  if (type === "bundle") {
    if (!BUNDLE_TYPES.includes(bundleType)) {
      errors.push("Invalid bundle type.");
    }
    if (bundleType === "quantity_discount" && (bundleQuantity === null || Number.isNaN(bundleQuantity) || bundleQuantity < 2)) {
      errors.push("Quantity bundle must require at least 2 units.");
    }
    if (bundleType === "fixed_bundle" && (Number.isNaN(bundleFixedPrice) || bundleFixedPrice <= 0)) {
      errors.push("Bundle fixed price must be greater than zero.");
    }
  }

  if (type === "campaign" || type === "campaign_nomination") {
    if (campaignId) {
      if (!ObjectId.isValid(campaignId)) {
        errors.push("Selected campaign is invalid.");
      } else {
        linkedCampaign = await Campaign.findById(campaignId).lean();
        if (!linkedCampaign) {
          errors.push("Selected campaign was not found.");
        }
      }
    }

    if (type === "campaign_nomination" && !campaignId) {
      errors.push("Select a platform campaign.");
    }

    if (!campaignId && !title) {
      errors.push("Campaign request title is required.");
    }

    if (
      expectedProducts !== null &&
      (Number.isNaN(expectedProducts) || expectedProducts < 1)
    ) {
      errors.push("Expected products must be at least 1.");
    }

    if (
      requestedDiscountPercentage !== null &&
      (Number.isNaN(requestedDiscountPercentage) ||
        requestedDiscountPercentage < 1 ||
        requestedDiscountPercentage > 100)
    ) {
      errors.push("Requested discount must be between 1 and 100.");
    }

    if (type === "campaign_nomination" && db && vendorId && linkedCampaign) {
      if (!["Scheduled", "Active"].includes(linkedCampaign.status)) {
        errors.push("Only scheduled or active campaigns can accept product nominations.");
      }

      const nominationResult = await normalizeProductNominations({
        db,
        vendorId,
        campaign: linkedCampaign,
        nominations: payload.productNominations,
      });
      errors.push(...nominationResult.errors);
      nominatedProducts = nominationResult.products;
    }
  }

  return {
    errors,
    normalized: {
      type,
      title: linkedCampaign?.name || title,
      description,
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      startDate,
      endDate,
      placement,
      campaignId: linkedCampaign?._id?.toString?.() || campaignId || null,
      campaignName: linkedCampaign?.name || "",
      productIds,
      selectedProducts: selectedProducts.map(summarizeProduct),
      productNominations: nominatedProducts,
      bundleType,
      bundleQuantity,
      bundleFixedPrice,
      requestedDiscountPercentage,
      expectedProducts,
      status: "pending",
    },
  };
};

exports.listVendorMarketingItems = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = getVendorIdentity(req);
    const type = req.query.type ? String(req.query.type).trim().toLowerCase() : "";
    const query = { vendorId };

    if (type) {
      query.type = type;
    }

    const items = await db
      .collection("vendorMarketingItems")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: serializeItems(items),
    });
  } catch (error) {
    console.error("Error listing vendor marketing items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createVendorMarketingItem = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const identity = getVendorIdentity(req);
    const { errors, normalized } = await validateMarketingPayload(req.body, {
      db,
      vendorId: identity.vendorId,
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors[0] });
    }

    if (normalized.type === "voucher") {
      const duplicate = await findVoucherCodeConflict(db, normalized.code);

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: "This voucher code is already reserved. Use a unique seller voucher code.",
        });
      }
    }

    const payload = {
      ...normalized,
      ...identity,
      adminNotes: "",
      usedCount: ["voucher", "campaign_nomination", "bundle", "free_shipping"].includes(normalized.type) ? 0 : null,
      usedBy: ["voucher", "campaign_nomination", "bundle", "free_shipping"].includes(normalized.type) ? [] : null,
      viewCount: 0,
      clickCount: 0,
      revenueGenerated: 0,
      discountGiven: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("vendorMarketingItems").insertOne(payload);
    const created = await db.collection("vendorMarketingItems").findOne({ _id: result.insertedId });
    await campaignVoucherAnalyticsService.rebuildVoucherAnalytics(db, result.insertedId).catch(() => null);

    res.status(201).json({
      success: true,
      data: normalizeItem(created),
      message: "Marketing submission created and sent for admin review.",
    });
  } catch (error) {
    console.error("Error creating vendor marketing item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateVendorMarketingItem = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = getVendorIdentity(req);
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid marketing item id." });
    }

    const existing = await db.collection("vendorMarketingItems").findOne({
      _id: new ObjectId(id),
      vendorId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Marketing item not found." });
    }

    if (existing.status === "approved") {
      return res.status(400).json({
        success: false,
        error: "Approved items can no longer be edited by the vendor.",
      });
    }

    const { errors, normalized } = await validateMarketingPayload({
      ...existing,
      ...req.body,
      type: existing.type,
    }, {
      db,
      vendorId,
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors[0] });
    }

    if (normalized.type === "voucher") {
      const duplicate = await findVoucherCodeConflict(db, normalized.code, { excludeId: id });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: "This voucher code is already reserved. Use a unique seller voucher code.",
        });
      }
    }

    await db.collection("vendorMarketingItems").updateOne(
      { _id: new ObjectId(id), vendorId },
      {
        $set: {
          ...normalized,
          status: "pending",
          updatedAt: new Date(),
        },
      },
    );

    const updated = await db.collection("vendorMarketingItems").findOne({
      _id: new ObjectId(id),
    });
    await campaignVoucherAnalyticsService.rebuildVoucherAnalytics(db, id).catch(() => null);

    res.json({
      success: true,
      data: normalizeItem(updated),
      message: "Marketing submission updated and sent for review again.",
    });
  } catch (error) {
    console.error("Error updating vendor marketing item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteVendorMarketingItem = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = getVendorIdentity(req);
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid marketing item id." });
    }

    const existing = await db.collection("vendorMarketingItems").findOne({
      _id: new ObjectId(id),
      vendorId,
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Marketing item not found." });
    }

    if (existing.status === "approved") {
      return res.status(400).json({
        success: false,
        error: "Approved items cannot be deleted by the vendor.",
      });
    }

    await db.collection("vendorMarketingItems").deleteOne({
      _id: new ObjectId(id),
      vendorId,
    });

    res.json({
      success: true,
      message: "Marketing submission deleted.",
    });
  } catch (error) {
    console.error("Error deleting vendor marketing item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listAdminMarketingItems = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const {
      status = "pending",
      type = "",
      vendorId = "",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    if (status && status !== "all") query.status = String(status).trim().toLowerCase();
    if (type && type !== "all") query.type = String(type).trim().toLowerCase();
    if (vendorId) query.vendorId = String(vendorId).trim();

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, Number.parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const collection = db.collection("vendorMarketingItems");

    const [items, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: serializeItems(items),
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error listing admin marketing items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reviewAdminMarketingItem = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { status, adminNotes = "" } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid marketing item id." });
    }

    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (!["approved", "rejected", "pending"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be "approved", "rejected", or "pending".',
      });
    }

    if (normalizedStatus === "rejected" && !String(adminNotes || "").trim()) {
      return res.status(400).json({
        success: false,
        error: "Please add a reason when rejecting a vendor submission.",
      });
    }

    const collection = db.collection("vendorMarketingItems");
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Marketing item not found." });
    }

    if (normalizedStatus === "approved" && existing.type === "voucher") {
      const duplicate = await findVoucherCodeConflict(db, existing.code, { excludeId: id });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: "Cannot approve this voucher because the code is already reserved.",
        });
      }
    }

    const now = new Date();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: normalizedStatus,
          adminNotes: String(adminNotes || "").trim(),
          reviewedAt: now,
          reviewedBy: req.user?._id || req.user?.uid || null,
          approvedAt: normalizedStatus === "approved" ? now : null,
          rejectedAt: normalizedStatus === "rejected" ? now : null,
          updatedAt: now,
        },
      },
    );

    const updated = await collection.findOne({ _id: new ObjectId(id) });
    await campaignVoucherAnalyticsService.rebuildVoucherAnalytics(db, id).catch(() => null);
    res.json({
      success: true,
      data: normalizeItem(updated),
      message:
        normalizedStatus === "approved"
          ? "Vendor marketing submission approved."
          : normalizedStatus === "rejected"
          ? "Vendor marketing submission rejected."
          : "Vendor marketing submission moved back to pending.",
    });
  } catch (error) {
    console.error("Error reviewing admin marketing item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listPublicVendorMarketingItems = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const type = req.query.type ? String(req.query.type).trim().toLowerCase() : "";

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid vendor id." });
    }

    const vendor = await req.app.locals.models.Vendor.findById(id);
    if (!vendor || vendor.status !== "approved") {
      return res.status(404).json({ success: false, error: "Vendor not available." });
    }

    const now = new Date();
    const query = {
      vendorId: id,
      status: "approved",
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (type && type !== "all") {
      query.type = type;
    }

    const items = await db.collection("vendorMarketingItems").find(query).sort({ createdAt: -1 }).toArray();

    res.json({
      success: true,
      data: serializeItems(items),
    });
  } catch (error) {
    console.error("Error listing public vendor marketing items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.recordPublicVendorMarketingEvent = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id, itemId } = req.params;
    const event = String(req.body.event || "").trim().toLowerCase();

    if (!ObjectId.isValid(id) || !ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, error: "Invalid vendor or marketing item id." });
    }

    if (!["view", "click"].includes(event)) {
      return res.status(400).json({ success: false, error: "event must be view or click." });
    }

    const item = await db.collection("vendorMarketingItems").findOne({
      _id: new ObjectId(itemId),
      vendorId: id,
      status: "approved",
    });

    if (!item) {
      return res.status(404).json({ success: false, error: "Marketing item not found." });
    }

    const analytics = await campaignVoucherAnalyticsService.recordVendorMarketingEvent({
      db,
      itemId,
      event,
      userId: req.user?.uid || null,
      sessionId: req.body.sessionId || req.headers["x-session-id"] || null,
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error recording vendor marketing event:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCampaignVoucherAnalytics = async (req, res) => {
  try {
    const requestVendorId = req.user?.role === "vendor"
      ? req.user.vendorId?.toString?.() || String(req.user.vendorId || "")
      : req.query.vendorId || "";
    const analytics = await campaignVoucherAnalyticsService.listAnalytics({
      db: req.app.locals.db,
      vendorId: requestVendorId,
      entityType: req.query.entityType || "",
    });

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error loading vendor marketing analytics:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
