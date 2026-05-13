const { ObjectId } = require("mongodb");
const Campaign = require("../models/Campaign");
const { normalizeId } = require("../utils/vendorMarketingVoucher");

const MARKETING_TYPES = ["promotion", "voucher", "campaign"];
const DISCOUNT_TYPES = ["percentage", "fixed"];

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

const normalizeItem = (item) => ({
  ...item,
  _id: item._id?.toString?.() || item._id,
  vendorId: normalizeId(item.vendorId),
  reviewedBy: normalizeId(item.reviewedBy),
});

const serializeItems = (items = []) => items.map(normalizeItem);

const validateMarketingPayload = async (payload) => {
  const type = String(payload.type || "").trim().toLowerCase();
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const code = payload.code ? String(payload.code).trim().toUpperCase() : "";
  const discountType = payload.discountType ? String(payload.discountType).trim().toLowerCase() : "";
  const discountValue = parseOptionalNumber(payload.discountValue);
  const minOrderAmount = parseOptionalNumber(payload.minOrderAmount);
  const usageLimit = parseOptionalInteger(payload.usageLimit);
  const expectedProducts = parseOptionalInteger(payload.expectedProducts);
  const requestedDiscountPercentage = parseOptionalNumber(payload.requestedDiscountPercentage);
  const startDate = payload.startDate ? new Date(payload.startDate) : null;
  const endDate = payload.endDate ? new Date(payload.endDate) : null;
  const campaignId = payload.campaignId ? String(payload.campaignId).trim() : "";
  const placement = String(payload.placement || "").trim();
  const errors = [];
  let linkedCampaign = null;

  if (!MARKETING_TYPES.includes(type)) {
    errors.push("Invalid marketing type.");
  }

  if (type !== "campaign" && !title) {
    errors.push("Title is required.");
  }

  if (!description) {
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

  if (type === "promotion" || type === "voucher") {
    if (!DISCOUNT_TYPES.includes(discountType)) {
      errors.push('Discount type must be either "percentage" or "fixed".');
    }

    if (Number.isNaN(discountValue) || discountValue <= 0) {
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
  }

  if (type === "campaign") {
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
      minOrderAmount,
      usageLimit,
      startDate,
      endDate,
      placement,
      campaignId: linkedCampaign?._id?.toString?.() || campaignId || null,
      campaignName: linkedCampaign?.name || "",
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
    const { errors, normalized } = await validateMarketingPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors[0] });
    }

    if (normalized.type === "voucher") {
      const duplicate = await db.collection("vendorMarketingItems").findOne({
        vendorId: identity.vendorId,
        type: "voucher",
        code: normalized.code,
        status: { $in: ["pending", "approved"] },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: "This voucher code is already in use for your store.",
        });
      }
    }

    const payload = {
      ...normalized,
      ...identity,
      adminNotes: "",
      usedCount: normalized.type === "voucher" ? 0 : null,
      usedBy: normalized.type === "voucher" ? [] : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("vendorMarketingItems").insertOne(payload);
    const created = await db.collection("vendorMarketingItems").findOne({ _id: result.insertedId });

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
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors[0] });
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
