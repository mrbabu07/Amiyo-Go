const { ObjectId } = require("mongodb");

class Coupon {
  constructor(db) {
    this.collection = db.collection("coupons");
  }

  async findAll() {
    return await this.collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByCode(code) {
    return await this.collection.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
  }

  async create(couponData) {
    const coupon = {
      ...couponData,
      code: couponData.code.toUpperCase(),
      usedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(coupon);
    return result.insertedId;
  }

  async update(id, couponData) {
    // Exclude immutable fields
    const { _id, __v, createdAt, ...safeData } = couponData;
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...safeData,
          updatedAt: new Date(),
        },
      },
    );
  }

  async delete(id) {
    return await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  async validateCoupon(code, orderTotal, userId = null) {
    console.log("Coupon.validateCoupon called with:", {
      code,
      orderTotal,
      userId,
    });

    const coupon = await this.findByCode(code);
    console.log(
      "Found coupon:",
      coupon
        ? {
            code: coupon.code,
            isActive: coupon.isActive,
            expiresAt: coupon.expiresAt,
          }
        : null,
    );

    if (!coupon) {
      return { valid: false, error: "Coupon not found or expired" };
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return { valid: false, error: "Coupon is not active" };
    }

    // Check expiry date
    if (new Date() > new Date(coupon.expiresAt)) {
      return { valid: false, error: "Coupon has expired" };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, error: "Coupon usage limit reached" };
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return {
        valid: false,
        error: `Minimum order amount is ৳${coupon.minOrderAmount}`,
      };
    }

    // Check user-specific usage (if userId provided)
    if (userId && coupon.userUsageLimit) {
      const userUsage = await this.getUserUsageCount(coupon._id, userId);
      if (userUsage >= coupon.userUsageLimit) {
        return {
          valid: false,
          error: "You have already used this coupon",
        };
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    console.log("Coupon validation successful:", { discountAmount });

    return {
      valid: true,
      coupon,
      discountAmount: Math.round(discountAmount * 100) / 100,
    };
  }

  async applyCoupon(couponId, userId = null) {
    const updateData = {
      $inc: { usedCount: 1 },
      $set: { updatedAt: new Date() },
    };

    // Track user usage if userId provided
    if (userId) {
      updateData.$push = {
        usedBy: {
          userId,
          usedAt: new Date(),
        },
      };
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(couponId) },
      updateData,
    );
  }

  async getUserUsageCount(couponId, userId) {
    const coupon = await this.collection.findOne(
      { _id: new ObjectId(couponId) },
      { projection: { usedBy: 1 } },
    );

    if (!coupon || !coupon.usedBy) return 0;

    return coupon.usedBy.filter((usage) => usage.userId === userId).length;
  }

  async getActiveCoupons() {
    return await this.collection
      .find({
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .toArray();
  }
}

module.exports = Coupon;
