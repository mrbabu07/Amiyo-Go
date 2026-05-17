const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;
const {
  getApprovedVendorVoucher,
  calculateVendorVoucherDiscount,
} = require("../utils/vendorMarketingVoucher");
const { buildDiscountBreakdown } = require("../utils/promotionRulesEngine");

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

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value.toString ? value.toString() : String(value);
};

const getAuditActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const appendCouponAudit = async (req, { action, target, changes = {}, metadata = {} }) => {
  const db = req.app.locals.db || req.app.locals.models?.Coupon?.collection?.db;
  if (!db?.collection) return null;

  const payload = {
    action,
    module: "promotions",
    actor: getAuditActor(req),
    target,
    changes,
    metadata,
    createdAt: new Date(),
  };

  try {
    const AuditLog = req.app.locals.models?.AuditLog;
    if (AuditLog?.append) return await AuditLog.append(payload);
    return await db.collection("audit_logs").insertOne(payload);
  } catch (error) {
    console.error("Failed to append coupon audit log:", error.message);
    return null;
  }
};

const buildValidationBreakdown = ({
  orderTotal,
  deliveryCharge = 0,
  coupon,
  discountAmount,
  source,
  scopeVendorId = null,
  vendorSubtotal = null,
}) =>
  buildDiscountBreakdown({
    subtotal: Number(orderTotal || 0),
    deliveryCharge: Number(deliveryCharge || 0),
    couponApplied: {
      ...coupon,
      couponId: coupon?._id || coupon?.id || null,
      source,
      scopeVendorId,
      vendorSubtotal,
    },
    couponDiscountAmount: Number(discountAmount || 0),
  });

const validateCouponPayload = (payload, { partial = false } = {}) => {
  const normalized = {
    ...payload,
    code: payload.code ? String(payload.code).trim().toUpperCase() : payload.code,
    name: payload.name ? String(payload.name).trim() : payload.name,
    description: payload.description ? String(payload.description).trim() : payload.description,
  };
  const errors = [];

  const discountType = normalized.discountType;
  const discountValue = parseOptionalNumber(normalized.discountValue);
  const maxDiscountAmount = parseOptionalNumber(normalized.maxDiscountAmount);
  const minOrderAmount = parseOptionalNumber(normalized.minOrderAmount);
  const usageLimit = parseOptionalInteger(normalized.usageLimit);
  const userUsageLimit = parseOptionalInteger(normalized.userUsageLimit);
  const expiresAt = normalized.expiresAt ? new Date(normalized.expiresAt) : null;

  if (!partial || normalized.code !== undefined) {
    if (!normalized.code || !COUPON_CODE_PATTERN.test(normalized.code)) {
      errors.push("Coupon code must be 3-30 characters and use only letters, numbers, dash, or underscore.");
    }
  }

  if (!partial || normalized.name !== undefined) {
    if (!normalized.name) {
      errors.push("Coupon name is required.");
    }
  }

  if (!partial || normalized.discountType !== undefined) {
    if (!["percentage", "fixed", "free_shipping"].includes(discountType)) {
      errors.push('Discount type must be "percentage", "fixed", or "free_shipping".');
    }
  }

  if (!partial || normalized.discountValue !== undefined) {
    if (discountType === "free_shipping") {
      if (discountValue !== null && (Number.isNaN(discountValue) || discountValue < 0)) {
        errors.push("Free shipping discount value must be zero or more.");
      }
    } else if (Number.isNaN(discountValue) || discountValue <= 0) {
      errors.push("Discount value must be greater than zero.");
    }
  }

  if (discountType === "percentage" && !Number.isNaN(discountValue) && discountValue > 100) {
    errors.push("Percentage discount cannot be more than 100.");
  }

  if (maxDiscountAmount !== null && (Number.isNaN(maxDiscountAmount) || maxDiscountAmount < 0)) {
    errors.push("Maximum discount amount must be zero or more.");
  }

  if (minOrderAmount !== null && (Number.isNaN(minOrderAmount) || minOrderAmount < 0)) {
    errors.push("Minimum order amount must be zero or more.");
  }

  if (usageLimit !== null && (Number.isNaN(usageLimit) || usageLimit < 1)) {
    errors.push("Usage limit must be at least 1.");
  }

  if (userUsageLimit !== null && (Number.isNaN(userUsageLimit) || userUsageLimit < 1)) {
    errors.push("User usage limit must be at least 1.");
  }

  if (
    usageLimit !== null &&
    userUsageLimit !== null &&
    !Number.isNaN(usageLimit) &&
    !Number.isNaN(userUsageLimit) &&
    userUsageLimit > usageLimit
  ) {
    errors.push("User usage limit cannot be greater than total usage limit.");
  }

  if (!partial || normalized.expiresAt !== undefined) {
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      errors.push("A valid expiry date is required.");
    } else if (expiresAt <= new Date()) {
      errors.push("Expiry date must be in the future.");
    }
  }

  return {
    errors,
    normalized: {
      ...normalized,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      userUsageLimit,
      expiresAt,
    },
  };
};

const getAllCoupons = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const coupons = await Coupon.findAll();
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCouponById = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, error: "Coupon not found" });
    }

    res.json({ success: true, data: coupon });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getActiveCoupons = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const coupons = await Coupon.getActiveCoupons();
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error("Error fetching active coupons:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const Offer = require("../models/Offer"); // Import Mongoose model directly
    const { code, orderTotal, deliveryCharge = 0, items = [] } = req.body;
    const userId = req.user?.uid;
    const normalizedOrderTotal = Number(orderTotal || 0);
    const hasDeliveryCharge = req.body.deliveryCharge !== undefined && req.body.deliveryCharge !== null;

    console.log("📋 Validating coupon/offer code:", {
      code,
      orderTotal,
      itemsCount: Array.isArray(items) ? items.length : 0,
      userId: userId || "guest",
    });

    if (!code || orderTotal === undefined || orderTotal === null) {
      console.log("❌ Missing required fields:", {
        hasCode: !!code,
        hasOrderTotal: orderTotal !== undefined && orderTotal !== null,
        orderTotal,
      });
      return res.status(400).json({
        success: false,
        error: "Coupon code and order total are required",
      });
    }

    // First, try to validate as a regular coupon
    try {
      const couponValidation = await Coupon.validateCoupon(
        code,
        orderTotal,
        userId,
      );
      console.log("✅ Coupon validation result:", couponValidation);

      if (couponValidation.valid) {
        const effectiveDiscountAmount =
          couponValidation.coupon?.discountType === "free_shipping" && hasDeliveryCharge
            ? Math.min(Number(deliveryCharge || 0), Number(couponValidation.discountAmount || 0))
            : couponValidation.discountAmount;
        const discountBreakdown = buildValidationBreakdown({
          orderTotal: normalizedOrderTotal,
          deliveryCharge,
          coupon: couponValidation.coupon,
          discountAmount: effectiveDiscountAmount,
          source: couponValidation.coupon?.isPlatformVoucher ? "platform_voucher" : "admin_coupon",
        });

        return res.json({
          success: true,
          data: {
            coupon: couponValidation.coupon,
            discountAmount: effectiveDiscountAmount,
            finalTotal: Math.max(0, normalizedOrderTotal - effectiveDiscountAmount),
            discountBreakdown,
          },
        });
      }
    } catch (couponError) {
      console.log(
        "⚠️ Coupon validation failed, trying offer code:",
        couponError.message,
      );
    }

    try {
      const vendorVoucher = await getApprovedVendorVoucher(req.app.locals.db, code);
      if (vendorVoucher) {
        const voucherValidation = calculateVendorVoucherDiscount({
          voucher: vendorVoucher,
          items: Array.isArray(items) ? items : [],
        });

        if (!voucherValidation.valid) {
          return res.status(400).json({
            success: false,
            error: voucherValidation.error || "This store voucher cannot be applied.",
          });
        }

        const discountBreakdown = buildValidationBreakdown({
          orderTotal: normalizedOrderTotal,
          deliveryCharge,
          coupon: {
            _id: vendorVoucher._id,
            code: vendorVoucher.code,
            name: vendorVoucher.title,
            discountType: vendorVoucher.discountType,
            discountValue: vendorVoucher.discountValue,
          },
          discountAmount: voucherValidation.discountAmount,
          source: "vendor_voucher",
          scopeVendorId: voucherValidation.scopeVendorId,
          vendorSubtotal: voucherValidation.vendorSubtotal,
        });

        return res.json({
          success: true,
          data: {
            coupon: {
              code: vendorVoucher.code,
              name: vendorVoucher.title,
              description: vendorVoucher.description,
              discountType: vendorVoucher.discountType,
              discountValue: vendorVoucher.discountValue,
              type: "vendor_voucher",
              vendorId: vendorVoucher.vendorId,
              vendorName: vendorVoucher.vendorName,
              minOrderAmount: vendorVoucher.minOrderAmount || 0,
            },
            discountAmount: voucherValidation.discountAmount,
            finalTotal: Math.max(0, normalizedOrderTotal - voucherValidation.discountAmount),
            scopeVendorId: voucherValidation.scopeVendorId,
            vendorSubtotal: voucherValidation.vendorSubtotal,
            discountBreakdown,
          },
        });
      }
    } catch (voucherError) {
      console.log("⚠️ Vendor voucher validation failed:", voucherError.message);
    }

    // If coupon validation fails, try to validate as an offer code
    try {
      const offer = await Offer.findOne({
        couponCode: code.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (!offer) {
        console.log("❌ No valid offer found for code:", code);
        return res.status(400).json({
          success: false,
          error: "Invalid or expired coupon code",
        });
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (offer.discountType === "percentage") {
        discountAmount = (normalizedOrderTotal * offer.discountValue) / 100;
      } else if (offer.discountType === "fixed") {
        discountAmount = Math.min(offer.discountValue, normalizedOrderTotal);
      }

      // Ensure discount doesn't exceed order total
      discountAmount = Math.min(discountAmount, normalizedOrderTotal);
      const discountBreakdown = buildValidationBreakdown({
        orderTotal: normalizedOrderTotal,
        deliveryCharge,
        coupon: {
          code: offer.couponCode,
          name: offer.title,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          type: "offer",
        },
        discountAmount,
        source: "offer",
      });

      console.log("✅ Offer validation successful:", {
        offer: offer.title,
        discountAmount,
      });

      return res.json({
        success: true,
        data: {
          coupon: {
            code: offer.couponCode,
            name: offer.title,
            description: offer.description,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            type: "offer", // Indicate this is from an offer
          },
          discountAmount,
          finalTotal: Math.max(0, normalizedOrderTotal - discountAmount),
          discountBreakdown,
        },
      });
    } catch (offerError) {
      console.log("⚠️ Offer validation failed:", offerError.message);
    }

    // If both coupon and offer validation fail
    console.log("❌ Both coupon and offer validation failed for code:", code);
    return res.status(400).json({
      success: false,
      error: "Invalid or expired coupon code",
    });
  } catch (error) {
    console.error("❌ Error validating coupon/offer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createCoupon = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const { errors, normalized } = validateCouponPayload(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findByCode(normalized.code);
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        error: "Coupon code already exists",
      });
    }

    const couponId = await Coupon.create({
      code: normalized.code,
      name: normalized.name,
      description: normalized.description || "",
      discountType: normalized.discountType,
      discountValue: normalized.discountValue,
      maxDiscountAmount: normalized.maxDiscountAmount,
      minOrderAmount: normalized.minOrderAmount,
      usageLimit: normalized.usageLimit,
      userUsageLimit: normalized.userUsageLimit,
      expiresAt: normalized.expiresAt,
      isActive: normalized.isActive ?? true,
      usedBy: [],
    });

    await appendCouponAudit(req, {
      action: "promotions.coupon.created",
      target: { type: "coupon", id: normalizeId(couponId), code: normalized.code },
      changes: {
        code: normalized.code,
        name: normalized.name,
        discountType: normalized.discountType,
        discountValue: normalized.discountValue,
        minOrderAmount: normalized.minOrderAmount,
        usageLimit: normalized.usageLimit,
        userUsageLimit: normalized.userUsageLimit,
        expiresAt: normalized.expiresAt,
        isActive: normalized.isActive ?? true,
      },
    });

    res.status(201).json({
      success: true,
      data: { id: couponId },
      message: "Coupon created successfully",
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const { id } = req.params;
    const existingCoupon = await Coupon.findById(id);

    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        error: "Coupon not found",
      });
    }

    const mergedPayload = { ...existingCoupon, ...req.body };
    const { errors, normalized } = validateCouponPayload(mergedPayload);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
      });
    }

    if (normalized.code !== existingCoupon.code) {
      const duplicateCoupon = await Coupon.findByCode(normalized.code);
      if (duplicateCoupon && String(duplicateCoupon._id) !== String(existingCoupon._id)) {
        return res.status(400).json({
          success: false,
          error: "Coupon code already exists",
        });
      }
    }

    const updateData = {
      ...req.body,
      code: normalized.code,
      name: normalized.name,
      description: normalized.description || "",
      discountType: normalized.discountType,
      discountValue: normalized.discountValue,
      maxDiscountAmount: normalized.maxDiscountAmount,
      minOrderAmount: normalized.minOrderAmount,
      usageLimit: normalized.usageLimit,
      userUsageLimit: normalized.userUsageLimit,
      expiresAt: normalized.expiresAt,
    };

    const result = await Coupon.update(id, updateData);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Coupon not found",
      });
    }

    await appendCouponAudit(req, {
      action: "promotions.coupon.updated",
      target: { type: "coupon", id: normalizeId(id), code: normalized.code },
      changes: updateData,
      metadata: {
        previousCode: existingCoupon.code,
        previousIsActive: existingCoupon.isActive,
      },
    });

    res.json({
      success: true,
      message: "Coupon updated successfully",
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const { id } = req.params;
    const existingCoupon = await Coupon.findById(id);

    const result = await Coupon.delete(id);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Coupon not found",
      });
    }

    await appendCouponAudit(req, {
      action: "promotions.coupon.deleted",
      target: {
        type: "coupon",
        id: normalizeId(id),
        code: existingCoupon?.code || "",
      },
      changes: {
        deleted: true,
      },
      metadata: {
        previousName: existingCoupon?.name || "",
        previousDiscountType: existingCoupon?.discountType || "",
      },
    });

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const Coupon = req.app.locals.models.Coupon;
    const { couponId } = req.body;
    const userId = req.user?.uid;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        error: "Coupon ID is required",
      });
    }

    const result = await Coupon.applyCoupon(couponId, userId);

    res.json({
      success: true,
      message: "Coupon applied successfully",
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  getActiveCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
};
