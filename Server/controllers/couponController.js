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
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      userUsageLimit,
      expiresAt,
      isActive = true,
    } = req.body;

    // Validation
    if (!code || !name || !discountType || !discountValue || !expiresAt) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: code, name, discountType, discountValue, expiresAt",
      });
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        error: 'Discount type must be either "percentage" or "fixed"',
      });
    }

    if (
      discountType === "percentage" &&
      (discountValue < 1 || discountValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        error: "Percentage discount must be between 1 and 100",
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findByCode(code);
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        error: "Coupon code already exists",
      });
    }

    const couponId = await Coupon.create({
      code,
      name,
      description,
      discountType,
      discountValue: parseFloat(discountValue),
      maxDiscountAmount: maxDiscountAmount
        ? parseFloat(maxDiscountAmount)
        : null,
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : null,
      expiresAt: new Date(expiresAt),
      isActive,
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
    const updateData = req.body;

    // Validation for discount type and value
    if (
      updateData.discountType &&
      !["percentage", "fixed"].includes(updateData.discountType)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Discount type must be either "percentage" or "fixed"',
      });
    }

    if (updateData.discountType === "percentage" && updateData.discountValue) {
      if (updateData.discountValue < 1 || updateData.discountValue > 100) {
        return res.status(400).json({
          success: false,
          error: "Percentage discount must be between 1 and 100",
        });
      }
    }

    // Convert string numbers to proper types
    if (updateData.discountValue)
      updateData.discountValue = parseFloat(updateData.discountValue);
    if (updateData.maxDiscountAmount)
      updateData.maxDiscountAmount = parseFloat(updateData.maxDiscountAmount);
    if (updateData.minOrderAmount)
      updateData.minOrderAmount = parseFloat(updateData.minOrderAmount);
    if (updateData.usageLimit)
      updateData.usageLimit = parseInt(updateData.usageLimit);
    if (updateData.userUsageLimit)
      updateData.userUsageLimit = parseInt(updateData.userUsageLimit);
    if (updateData.expiresAt)
      updateData.expiresAt = new Date(updateData.expiresAt);

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
