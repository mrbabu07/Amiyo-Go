const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

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
    if (!["percentage", "fixed"].includes(discountType)) {
      errors.push('Discount type must be either "percentage" or "fixed".');
    }
  }

  if (!partial || normalized.discountValue !== undefined) {
    if (Number.isNaN(discountValue) || discountValue <= 0) {
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
    const { code, orderTotal } = req.body;
    const userId = req.user?.uid;

    console.log("📋 Validating coupon/offer code:", {
      code,
      orderTotal,
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
        return res.json({
          success: true,
          data: {
            coupon: couponValidation.coupon,
            discountAmount: couponValidation.discountAmount,
            finalTotal: orderTotal - couponValidation.discountAmount,
          },
        });
      }
    } catch (couponError) {
      console.log(
        "⚠️ Coupon validation failed, trying offer code:",
        couponError.message,
      );
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
        discountAmount = (orderTotal * offer.discountValue) / 100;
      } else if (offer.discountType === "fixed") {
        discountAmount = Math.min(offer.discountValue, orderTotal);
      }

      // Ensure discount doesn't exceed order total
      discountAmount = Math.min(discountAmount, orderTotal);

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
          finalTotal: orderTotal - discountAmount,
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

    const result = await Coupon.delete(id);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Coupon not found",
      });
    }

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
