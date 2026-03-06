const { ObjectId } = require("mongodb");

class Order {
  constructor(db) {
    this.collection = db.collection("orders");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ userId: 1 });
      await this.collection.createIndex({ "products.vendorId": 1 });
      await this.collection.createIndex({ "products.itemStatus": 1 });
      await this.collection.createIndex({ "shippingInfo.email": 1 });
    } catch (error) {
      console.error("Error creating Order indexes:", error);
    }
  }

  async findAll() {
    return await this.collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Paginated + filtered order list (Admin use)
   */
  async findAllPaginated(filter = {}) {
    const { status, from, to, search, page = 1, limit = 20 } = filter;
    const query = {};

    if (status && status !== "all") query.status = status;

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { "shippingInfo.name": searchRegex },
        { "shippingInfo.email": searchRegex },
        { "shippingInfo.phone": searchRegex },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return {
      orders,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Admin dashboard stats
   */
  async getOrderStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [statusCounts, todayCount, monthCount, revenueData] = await Promise.all([
      this.collection.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]).toArray(),
      this.collection.countDocuments({ createdAt: { $gte: todayStart } }),
      this.collection.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      this.collection.aggregate([
        { $match: { status: { $nin: ["cancelled"] } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" }, totalOrders: { $sum: 1 } } }
      ]).toArray(),
    ]);

    const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    statusCounts.forEach(s => { if (s._id) counts[s._id] = s.count; });

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const totalOrders = revenueData[0]?.totalOrders || 0;

    return { ...counts, totalRevenue, totalOrders, todayCount, monthCount };
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
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    // Fetch categories to get commission rates
    const categoriesCollection = this.collection.db.collection("categories");
    
    // ALWAYS calculate subtotal from products (don't trust frontend)
    let calculatedSubtotal = 0;
    if (orderData.products && Array.isArray(orderData.products)) {
      for (const product of orderData.products) {
        // Find category commission rate
        let commissionRate = 0;
        if (product.categoryId) {
          try {
            const category = await categoriesCollection.findOne({ _id: new ObjectId(product.categoryId) });
            if (category && category.commissionRate !== undefined) {
              commissionRate = category.commissionRate;
            }
          } catch (err) {
            console.error("Error fetching category for commission:", err);
          }
        }

        const itemSubtotal = product.price * product.quantity;
        const adminCommissionAmount = round2((itemSubtotal * commissionRate) / 100);
        const vendorEarningAmount = round2(itemSubtotal - adminCommissionAmount);

        // Mutate product object
        product.commissionRateSnapshot = commissionRate;
        product.adminCommissionAmount = adminCommissionAmount;
        product.vendorEarningAmount = vendorEarningAmount;

        // Item-level shipping status fields
        product.itemStatus = "pending";
        product.trackingNumber = null;
        product.shippedAt = null;
        product.deliveredAt = null;

        calculatedSubtotal += itemSubtotal;
      }
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

  async updateStatus(id, status, changedBy = null, note = "") {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { status, updatedAt: new Date() },
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            changedBy: changedBy || null,
            note: note || "",
          },
        },
      },
    );
  }

  async addNote(id, note, addedBy) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          notes: {
            text: note,
            addedBy: addedBy || null,
            addedAt: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      },
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

  /**
   * Update itemStatus (and optional tracking fields) for all products
   * belonging to a specific vendor inside an order.
   * Possible newStatus values: pending | processing | packed | shipped | delivered | cancelled | returned
   */
  async updateItemStatus(orderId, vendorId, newStatus, trackingNumber = null) {
    const now = new Date();
    const order = await this.findById(orderId);
    if (!order) throw new Error("Order not found");

    const updatedProducts = (order.products || []).map((p) => {
      if (p.vendorId && p.vendorId.toString() === vendorId.toString()) {
        const updated = { ...p, itemStatus: newStatus };
        if (newStatus === "shipped") {
          updated.shippedAt = now;
          if (trackingNumber) updated.trackingNumber = trackingNumber;
        }
        if (newStatus === "delivered") {
          updated.deliveredAt = now;
        }
        return updated;
      }
      return p;
    });

    return await this.collection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { products: updatedProducts, updatedAt: now } }
    );
  }

  /**
   * Derive and persist order.status from all products[].itemStatus.
   * Called after any vendor shipping action.
   */
  async syncOrderStatus(orderId) {
    const order = await this.findById(orderId);
    if (!order || !Array.isArray(order.products) || order.products.length === 0) return;

    const statuses = order.products.map((p) => p.itemStatus || "pending");
    const nonCancelled = statuses.filter((s) => s !== "cancelled");

    let derivedStatus;
    if (nonCancelled.length === 0) {
      // All items cancelled
      derivedStatus = "cancelled";
    } else if (nonCancelled.every((s) => s === "delivered")) {
      derivedStatus = "delivered";
    } else if (nonCancelled.some((s) => s === "shipped")) {
      derivedStatus = "shipped";
    } else if (nonCancelled.some((s) => s === "packed" || s === "processing")) {
      derivedStatus = "processing";
    } else {
      derivedStatus = "pending";
    }

    // Only write if status actually changed
    if (derivedStatus !== order.status) {
      await this.collection.updateOne(
        { _id: new ObjectId(orderId) },
        {
          $set: { status: derivedStatus, updatedAt: new Date() },
          $push: {
            statusHistory: {
              status: derivedStatus,
              changedAt: new Date(),
              changedBy: "system",
              note: "Auto-synced from item statuses",
            },
          },
        }
      );
    }
    return derivedStatus;
  }
}

module.exports = Order;
