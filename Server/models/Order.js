const { ObjectId } = require("mongodb");

class Order {
  constructor(db) {
    this.collection = db.collection("orders");
  }

  async findAll() {
    return await this.collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async create(orderData) {
    // ALWAYS calculate subtotal from products (don't trust frontend)
    let calculatedSubtotal = 0;
    if (orderData.products && Array.isArray(orderData.products)) {
      calculatedSubtotal = orderData.products.reduce((sum, product) => {
        return sum + product.price * product.quantity;
      }, 0);
    }

    // Use calculated subtotal (secure)
    const subtotal = calculatedSubtotal;
    const totalDiscount = orderData.totalDiscount || 0;

    // Get delivery settings from database
    const deliverySettingsCollection =
      this.collection.db.collection("deliverysettings");
    const deliverySettings = await deliverySettingsCollection.findOne({});

    // Default delivery settings if not found
    const freeDeliveryThreshold = deliverySettings?.freeDeliveryThreshold || 50; // $50 USD (৳5500)
    const standardDeliveryCharge =
      deliverySettings?.standardDeliveryCharge || 100 / 110; // ৳100
    const freeDeliveryEnabled = deliverySettings?.freeDeliveryEnabled !== false;

    // Apply coupon discount if provided
    let couponDiscountAmount = 0;
    let couponApplied = null;

    if (orderData.couponCode) {
      try {
        const couponsCollection = this.collection.db.collection("coupons");
        const coupon = await couponsCollection.findOne({
          code: orderData.couponCode.toUpperCase(),
          isActive: true,
          expiresAt: { $gt: new Date() },
        });

        if (coupon) {
          // Calculate discount
          if (coupon.discountType === "percentage") {
            couponDiscountAmount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount) {
              couponDiscountAmount = Math.min(
                couponDiscountAmount,
                coupon.maxDiscountAmount,
              );
            }
          } else {
            couponDiscountAmount = coupon.discountValue;
          }

          // Apply coupon usage
          await couponsCollection.updateOne(
            { _id: coupon._id },
            {
              $inc: { usedCount: 1 },
              $push: {
                usedBy: { userId: orderData.userId, usedAt: new Date() },
              },
            },
          );

          couponApplied = {
            couponId: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: Math.round(couponDiscountAmount * 100) / 100,
          };
        }
      } catch (couponError) {
        console.error("Error processing coupon:", couponError);
        // Continue without coupon if there's an error
      }
    }

    // Handle points redemption
    const pointsDiscountAmount = orderData.pointsDiscount || 0;
    const redeemedPoints = orderData.redeemedPoints || 0;

    // Calculate total discount
    const totalDiscountAmount = couponDiscountAmount + pointsDiscountAmount;

    // Calculate order amount after discounts (before delivery)
    const orderAmountAfterDiscount = subtotal - totalDiscountAmount;

    // Determine delivery charge based on order amount and settings
    let deliveryCharge = standardDeliveryCharge;

    if (
      freeDeliveryEnabled &&
      orderAmountAfterDiscount >= freeDeliveryThreshold
    ) {
      deliveryCharge = 0; // Free delivery
      console.log(
        `✅ Free delivery applied (order: $${orderAmountAfterDiscount.toFixed(2)}, threshold: $${freeDeliveryThreshold})`,
      );
    } else {
      console.log(
        `💰 Delivery charge: $${deliveryCharge.toFixed(2)} (order: $${orderAmountAfterDiscount.toFixed(2)}, threshold: $${freeDeliveryThreshold})`,
      );
    }

    // Calculate final total (secure calculation)
    const finalTotal = subtotal - totalDiscountAmount + deliveryCharge;

    // Determine payment status based on payment method
    const paymentStatus =
      orderData.paymentMethod === "cod" ? "pending" : "pending_verification";

    const result = await this.collection.insertOne({
      ...orderData,
      subtotal: Math.round(subtotal * 100) / 100,
      couponDiscount: Math.round(couponDiscountAmount * 100) / 100,
      pointsDiscount: Math.round(pointsDiscountAmount * 100) / 100,
      totalDiscount: Math.round(totalDiscountAmount * 100) / 100,
      deliveryCharge: Math.round(deliveryCharge * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      couponApplied,
      redeemedPoints,
      transactionId: orderData.transactionId || null,
      paymentStatus,
      status: "pending",
      createdAt: new Date(),
      canCancelUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    });
    return result.insertedId;
  }

  async updateStatus(id, status) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
    );
  }

  async cancelOrder(id, userId) {
    const order = await this.findById(id);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== userId) {
      throw new Error("Unauthorized to cancel this order");
    }

    if (order.status !== "pending") {
      throw new Error("Only pending orders can be cancelled");
    }

    // Check if within 30 minutes
    const now = new Date();
    const canCancelUntil = order.canCancelUntil || order.createdAt;

    if (now > canCancelUntil) {
      throw new Error("Cancellation period has expired (30 minutes)");
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
  }
}

module.exports = Order;
