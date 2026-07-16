const { ObjectId } = require("mongodb");
const {
  normalizeId,
  round2,
  getApprovedVendorVoucher,
  calculateVendorVoucherDiscount,
} = require("../utils/vendorMarketingVoucher");
const { sanitizeCancellationReason } = require("../utils/customerOrderExperience");
const campaignVoucherAnalyticsService = require("../services/campaignVoucherAnalyticsService");
const {
  buildDiscountBreakdown,
  loadPromotionRules,
} = require("../utils/promotionRulesEngine");

const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeAdminOrderSearch = (search = "") =>
  String(search || "")
    .trim()
    .replace(/^(?:order|ord)[\s:#-]+/i, "")
    .replace(/^#+/, "")
    .trim();

const ADMIN_ORDER_STATUS_KEYS = [
  "pending",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const buildAdminOrderQuery = (filter = {}, options = {}) => {
  const {
    status,
    vendorId,
    from,
    to,
    dateFrom,
    dateTo,
    search,
    paymentMethod,
    deliveryZone,
  } = filter;
  const { includeStatus = true } = options;
  const query = {};
  const andBranches = [];

  if (includeStatus && status && status !== "all") query.status = status;

  const fromDateValue = from || dateFrom;
  const toDateValue = to || dateTo;
  if (fromDateValue || toDateValue) {
    query.createdAt = {};
    if (fromDateValue) query.createdAt.$gte = new Date(fromDateValue);
    if (toDateValue) {
      const toDate = new Date(toDateValue);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }

  if (vendorId && vendorId !== "all") {
    const vendorValues = [vendorId.toString()];
    if (ObjectId.isValid(vendorId)) vendorValues.push(new ObjectId(vendorId));
    query["products.vendorId"] = { $in: vendorValues };
  }

  if (paymentMethod && paymentMethod !== "all") {
    const normalizedMethod = paymentMethod.toString().toLowerCase();
    const aliases =
      normalizedMethod === "cod"
        ? ["cod", "cash_on_delivery", "cash on delivery"]
        : [paymentMethod, normalizedMethod];
    query.paymentMethod = { $in: aliases };
  }

  if (search) {
    const rawSearch = String(search || "").trim();
    if (rawSearch) {
      const normalizedSearch = normalizeAdminOrderSearch(rawSearch);
      const searchRegex = new RegExp(escapeRegExp(rawSearch), "i");
      const normalizedRegex = normalizedSearch && normalizedSearch !== rawSearch
        ? new RegExp(escapeRegExp(normalizedSearch), "i")
        : searchRegex;
      const searchBranches = [
        { "shippingInfo.name": searchRegex },
        { "shippingInfo.email": searchRegex },
        { "shippingInfo.phone": searchRegex },
        { orderNumber: normalizedRegex },
        { invoiceNumber: normalizedRegex },
        { trackingNumber: normalizedRegex },
        { "courierAssignment.trackingNumber": normalizedRegex },
        { "products.title": searchRegex },
        { "products.name": searchRegex },
        { "products.sku": normalizedRegex },
        { "products.trackingNumber": normalizedRegex },
      ];
      if (ObjectId.isValid(normalizedSearch)) searchBranches.push({ _id: new ObjectId(normalizedSearch) });
      if (/^[a-f0-9]{6,24}$/i.test(normalizedSearch)) {
        searchBranches.push({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: escapeRegExp(normalizedSearch),
              options: "i",
            },
          },
        });
      }
      andBranches.push({ $or: searchBranches });
    }
  }

  if (deliveryZone && deliveryZone !== "all") {
    const zoneRegex = new RegExp(deliveryZone, "i");
    andBranches.push({
      $or: [
        { deliveryZone: zoneRegex },
        { "shippingInfo.deliveryZone": zoneRegex },
        { "shippingInfo.zone": zoneRegex },
        { "shippingInfo.district": zoneRegex },
        { "shippingInfo.city": zoneRegex },
        { "shippingInfo.upazila": zoneRegex },
        { "shippingInfo.area": zoneRegex },
        { "shippingInfo.division": zoneRegex },
      ],
    });
  }

  if (andBranches.length > 0) query.$and = andBranches;

  return query;
};

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
    const {
      page = 1,
      limit = 20,
    } = filter;
    const query = buildAdminOrderQuery(filter);

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

  async getAdminStatusCounts(filter = {}) {
    const baseQuery = buildAdminOrderQuery(filter, { includeStatus: false });
    const statusRows = await this.collection
      .aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    const counts = ADMIN_ORDER_STATUS_KEYS.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, { all: 0 });

    statusRows.forEach((row) => {
      if (!row._id) return;
      const key = String(row._id);
      counts[key] = (counts[key] || 0) + row.count;
      counts.all += row.count;
    });

    return counts;
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
    // Fetch categories to get commission rates
    const categoriesCollection = this.collection.db.collection("categories");
    const categoryDocs = await categoriesCollection.find({}).toArray();
    const categoryMap = new Map(
      categoryDocs.map((category) => [category._id.toString(), category]),
    );
    const getEffectiveCommissionRate = (categoryId) => {
      if (!categoryId) return 0;

      const categoryKey = categoryId.toString();
      const category = categoryMap.get(categoryKey);

      if (!category) return 0;

      let effectiveRate = Math.max(
        Number(category.commissionRate || 0),
        Number(category.minimumCommissionRate || 0),
      );
      let parentId = category.parentId ? category.parentId.toString() : null;
      const seen = new Set();

      while (parentId && categoryMap.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);
        const parent = categoryMap.get(parentId);
        effectiveRate = Math.max(effectiveRate, Number(parent.minimumCommissionRate || 0));
        parentId = parent.parentId ? parent.parentId.toString() : null;
      }

      return round2(effectiveRate);
    };
    
    // ALWAYS calculate subtotal from products (don't trust frontend)
    let calculatedSubtotal = 0;
    if (orderData.products && Array.isArray(orderData.products)) {
      for (const product of orderData.products) {
        // Find category commission rate
        let commissionRate = 0;
        if (product.categoryId) {
          try {
            commissionRate = getEffectiveCommissionRate(product.categoryId);
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
    const deliveryCharge = Number(orderData.deliveryCharge || 0);
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
          } else if (coupon.discountType === "free_shipping") {
            const shippingCap = Number(coupon.maxDiscountAmount || deliveryCharge || coupon.discountValue || 0);
            couponDiscountAmount = Math.min(deliveryCharge, shippingCap);
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
            discountAmount: round2(couponDiscountAmount),
            source: "admin_coupon",
          };
        }
      } catch (couponError) {
        console.error("Error processing coupon:", couponError);
        // Continue without coupon if there's an error
      }

      if (!couponApplied) {
        try {
          const vendorVoucher = await getApprovedVendorVoucher(this.collection.db, orderData.couponCode);
          if (vendorVoucher) {
            const voucherValidation = calculateVendorVoucherDiscount({
              voucher: vendorVoucher,
              items: orderData.products || [],
              deliveryCharge,
              deliveryBreakdown: orderData.deliveryBreakdown || [],
            });

            if (voucherValidation.valid) {
              couponDiscountAmount = voucherValidation.discountAmount;

              await this.collection.db.collection("vendorMarketingItems").updateOne(
                { _id: vendorVoucher._id },
                {
                  $inc: {
                    usedCount: 1,
                    revenueGenerated: voucherValidation.vendorSubtotal || 0,
                    discountGiven: couponDiscountAmount || 0,
                  },
                  $push: {
                    usedBy: {
                      userId: orderData.userId || null,
                      usedAt: new Date(),
                      orderValue: voucherValidation.vendorSubtotal || 0,
                      discountAmount: couponDiscountAmount || 0,
                    },
                  },
                  $set: { updatedAt: new Date() },
                },
              );
              campaignVoucherAnalyticsService
                .rebuildVoucherAnalytics(this.collection.db, vendorVoucher._id)
                .catch((error) => console.error("Failed to refresh voucher analytics:", error.message));

              couponApplied = {
                couponId: vendorVoucher._id,
                code: vendorVoucher.code,
                name: vendorVoucher.title,
                discountType: vendorVoucher.discountType,
                discountValue: vendorVoucher.discountValue,
                discountAmount: round2(couponDiscountAmount),
                source: "vendor_voucher",
                scopeVendorId: normalizeId(vendorVoucher.vendorId),
                scopeVendorName: vendorVoucher.vendorName || "",
                minOrderAmount: Number(vendorVoucher.minOrderAmount || 0),
                vendorSubtotal: voucherValidation.vendorSubtotal,
                vendorDeliveryCharge: voucherValidation.vendorDeliveryCharge,
              };
            }
          }
        } catch (voucherError) {
          console.error("Error processing vendor voucher:", voucherError);
        }
      }

      if (!couponApplied) {
        try {
          const offersCollection = this.collection.db.collection("offers");
          const now = new Date();
          const offer = await offersCollection.findOne({
            couponCode: orderData.couponCode.toUpperCase(),
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
          });

          if (offer) {
            if (offer.discountType === "percentage") {
              couponDiscountAmount = (subtotal * Number(offer.discountValue || 0)) / 100;
            } else if (offer.discountType === "fixed") {
              couponDiscountAmount = Number(offer.discountValue || 0);
            }

            couponDiscountAmount = Math.min(Math.max(0, couponDiscountAmount), subtotal);

            await offersCollection.updateOne(
              { _id: offer._id },
              {
                $inc: { usedCount: 1 },
                $set: { updatedAt: new Date() },
                $push: {
                  usedBy: { userId: orderData.userId, usedAt: new Date() },
                },
              },
            );

            couponApplied = {
              couponId: offer._id,
              code: offer.couponCode,
              name: offer.title,
              discountType: offer.discountType,
              discountValue: offer.discountValue,
              discountAmount: round2(couponDiscountAmount),
              source: "offer",
              type: "offer",
            };
          }
        } catch (offerError) {
          console.error("Error processing offer promo code:", offerError);
        }
      }
    }

    // Handle points redemption
    const pointsDiscountAmount = orderData.pointsDiscount || 0;
    const redeemedPoints = orderData.redeemedPoints || 0;
    const flashDiscountAmount = orderData.flashDiscount || orderData.flashSaleDiscount || 0;
    const promotionRules = await loadPromotionRules(this.collection.db);
    const discountBreakdown = buildDiscountBreakdown({
      subtotal,
      deliveryCharge,
      couponApplied,
      couponDiscountAmount,
      pointsDiscountAmount,
      redeemedPoints,
      flashDiscountAmount,
      rules: promotionRules,
    });

    if (!discountBreakdown.validation.valid) {
      const reason = discountBreakdown.validation.violations
        .map((violation) => violation.message)
        .join(" ");
      throw new Error(`Promotion rules conflict: ${reason}`);
    }

    // Calculate total discount
    const totalDiscountAmount = discountBreakdown.totals.discountTotal;

    // Calculate final total (secure calculation)
    const finalTotal = discountBreakdown.totals.payableTotal;

    // Determine payment status based on payment method
    const paymentStatus =
      orderData.paymentMethod === "cod" ? "pending" : "pending_verification";

    const orderDocument = {
      ...orderData,
      subtotal: Math.round(subtotal * 100) / 100,
      couponDiscount: round2(couponDiscountAmount),
      pointsDiscount: round2(pointsDiscountAmount),
      flashDiscount: round2(flashDiscountAmount),
      discount: round2(totalDiscountAmount),
      discountAmount: round2(totalDiscountAmount),
      totalDiscount: round2(totalDiscountAmount),
      deliveryCharge: round2(deliveryCharge),
      deliveryMethod: orderData.deliveryMethod || "standard",
      deliveryBreakdown: orderData.deliveryBreakdown || [],
      total: round2(finalTotal),
      totalAmount: round2(finalTotal),
      finalTotal: round2(finalTotal),
      grandTotal: round2(finalTotal),
      payableTotal: round2(finalTotal),
      originalTotal: round2(subtotal + deliveryCharge),
      couponApplied,
      discountBreakdown,
      redeemedPoints,
      transactionId: orderData.transactionId || null,
      paymentStatus,
      status: "pending",
      createdAt: new Date(),
      canCancelUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    };
    const result = await this.collection.insertOne(orderDocument);
    try {
      await this.collection.db.collection("promotion_snapshots").insertOne({
        orderId: result.insertedId.toString(),
        userId: orderData.userId || null,
        source: "order.create",
        version: orderData.growthPromotionResult?.version || discountBreakdown.version || 1,
        appliedPromotions: orderData.growthPromotionResult?.appliedPromotions || discountBreakdown.lines || [],
        rejectedPromotions: orderData.growthPromotionResult?.rejectedPromotions || [],
        totals: orderData.growthPromotionResult?.totals || discountBreakdown.totals || {},
        rules: orderData.growthPromotionResult?.rules || promotionRules,
        legacyDiscountBreakdown: discountBreakdown,
        createdAt: new Date(),
      });
    } catch (snapshotError) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to save promotion snapshot:", snapshotError.message);
      }
    }
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

  async cancelOrder(id, userId, cancellationReason = "") {
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
    const canCancelUntil = order.canCancelUntil
      ? new Date(order.canCancelUntil)
      : new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000);

    if (now > canCancelUntil) {
      throw new Error("Cancellation period has expired (30 minutes)");
    }

    const cancelledProducts = (order.products || []).map((product) => ({
      ...product,
      itemStatus: "cancelled",
      statusUpdatedAt: now,
      cancelledAt: now,
    }));
    const cancellation = sanitizeCancellationReason(cancellationReason);

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "cancelled",
          products: cancelledProducts,
          paymentStatus: order.paymentStatus === "paid" ? "refund_pending" : "cancelled",
          cancelledBy: userId,
          cancelledByRole: "user",
          cancellationSource: "customer",
          cancellationReason: cancellation.value || null,
          cancellationReasonLabel: cancellation.label || null,
          cancellationMessage: cancellation.message,
          cancelledAt: now,
          updatedAt: now,
        },
        $push: {
          statusHistory: {
            status: "cancelled",
            changedAt: now,
            changedBy: userId,
            note: cancellation.label
              ? `Customer cancelled within the 30-minute cancellation window: ${cancellation.label}`
              : "Customer cancelled within the 30-minute cancellation window",
          },
        },
      },
    );

    return {
      ...order,
      status: "cancelled",
      products: cancelledProducts,
      paymentStatus: order.paymentStatus === "paid" ? "refund_pending" : "cancelled",
      cancelledBy: userId,
      cancelledByRole: "user",
      cancellationSource: "customer",
      cancellationReason: cancellation.value || null,
      cancellationReasonLabel: cancellation.label || null,
      cancellationMessage: cancellation.message,
      cancelledAt: now,
      updatedAt: now,
    };
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
   * 
   * Status Priority (Daraz-style split order):
   * 1. returned - all items returned
   * 2. partially_returned - any items returned
   * 3. delivered - all items delivered
   * 4. partially_delivered - some delivered, some not
   * 5. shipped - all items shipped (not yet delivered)
   * 6. partially_shipped - some shipped, some not
   * 7. processing - all items processing/packed
   * 8. partially_processing - some processing, some pending
   * 9. pending - all items pending
   * 10. cancelled - all items cancelled
   */
  async syncOrderStatus(orderId) {
    const order = await this.findById(orderId);
    if (!order || !Array.isArray(order.products) || order.products.length === 0) return;

    const statuses = order.products.map((p) => p.itemStatus || "pending");
    const total = statuses.length;

    // Count each status
    const counts = {
      pending: statuses.filter(s => s === "pending").length,
      accepted: statuses.filter(s => s === "accepted").length,
      processing: statuses.filter(s => s === "processing").length,
      packed: statuses.filter(s => s === "packed").length,
      ready_to_ship: statuses.filter(s => s === "ready_to_ship").length,
      pickup_ready: statuses.filter(s => s === "pickup_ready").length,
      pickup_scheduled: statuses.filter(s => s === "pickup_scheduled").length,
      picked_up: statuses.filter(s => s === "picked_up").length,
      shipped: statuses.filter(s => s === "shipped").length,
      in_transit: statuses.filter(s => s === "in_transit").length,
      out_for_delivery: statuses.filter(s => s === "out_for_delivery").length,
      delivered: statuses.filter(s => s === "delivered").length,
      delivery_failed: statuses.filter(s => s === "delivery_failed").length,
      cancelled: statuses.filter(s => s === "cancelled").length,
      returned: statuses.filter(s => s === "returned").length,
    };
    const movingCount = counts.picked_up + counts.shipped + counts.in_transit + counts.out_for_delivery;
    const processingCount = counts.processing + counts.packed + counts.accepted + counts.ready_to_ship + counts.pickup_ready + counts.pickup_scheduled;

    const nonCancelled = total - counts.cancelled;
    let derivedStatus;

    // Priority 1: Handle returns
    if (counts.returned === total) {
      derivedStatus = "returned";
    } else if (counts.returned > 0) {
      derivedStatus = "partially_returned";
    }
    // Priority 2: All cancelled
    else if (counts.cancelled === total) {
      derivedStatus = "cancelled";
    }
    // Priority 3: All delivered
    else if (counts.delivered === nonCancelled) {
      derivedStatus = "delivered";
    }
    // Priority 4: Some delivered
    else if (counts.delivered > 0) {
      derivedStatus = "partially_delivered";
    }
    // Priority 5: All shipped (but not delivered)
    else if (counts.out_for_delivery === nonCancelled) {
      derivedStatus = "out_for_delivery";
    } else if (counts.in_transit === nonCancelled) {
      derivedStatus = "in_transit";
    } else if (movingCount === nonCancelled) {
      derivedStatus = "shipped";
    }
    // Priority 6: Some shipped
    else if (counts.delivery_failed === nonCancelled) {
      derivedStatus = "failed_delivery";
    } else if (movingCount > 0 || counts.delivery_failed > 0) {
      derivedStatus = "partially_shipped";
    }
    // Priority 7: Fully prepared orders retain their dispatchable state.
    else if (counts.pickup_ready === nonCancelled) {
      derivedStatus = "pickup_ready";
    } else if (counts.ready_to_ship === nonCancelled) {
      derivedStatus = "ready_to_ship";
    } else if (counts.packed === nonCancelled) {
      derivedStatus = "packed";
    } else if (processingCount === nonCancelled) {
      derivedStatus = "processing";
    }
    // Priority 8: Some processing/packed
    else if (processingCount > 0) {
      derivedStatus = "partially_processing";
    }
    // Priority 9: All pending
    else {
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
              note: `Auto-synced: ${counts.delivered}/${nonCancelled} delivered, ${movingCount}/${nonCancelled} moving, ${processingCount}/${nonCancelled} processing`,
            },
          },
        }
      );
    }
    return derivedStatus;
  }

  /**
   * Get vendor-specific items from an order
   */
  async getVendorItems(orderId, vendorId) {
    const order = await this.findById(orderId);
    if (!order) return null;

    const vendorProducts = (order.products || []).filter(
      p => p.vendorId && p.vendorId.toString() === vendorId.toString()
    );

    if (vendorProducts.length === 0) return null;

    // Calculate vendor-specific totals
    const vendorSubtotal = vendorProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const vendorCommission = vendorProducts.reduce((sum, p) => sum + (p.adminCommissionAmount || 0), 0);
    const vendorEarnings = vendorProducts.reduce((sum, p) => sum + (p.vendorEarningAmount || 0), 0);

    return {
      ...order,
      products: vendorProducts,
      vendorSubtotal,
      vendorCommission,
      vendorEarnings,
      isPartialOrder: vendorProducts.length < (order.products || []).length,
    };
  }
}

module.exports = Order;
