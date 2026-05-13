const emailService = require("../services/emailService");
const invoiceService = require("../services/invoiceService");
const { ObjectId } = require("mongodb");
const DeliverySettings = require("../models/DeliverySettings");
const { calculateDeliveryBreakdown } = require("../utils/deliveryCalculator");

const normalizeId = (id) => {
  if (!id) return null;
  return id.toString ? id.toString() : String(id);
};

const getVendorLabel = (vendor) =>
  vendor?.shopName ||
  vendor?.businessName ||
  vendor?.storeName ||
  vendor?.name ||
  "HnilaBazar";

const buildVendorSnapshot = (vendorId, vendor) => {
  if (!vendorId) {
    return {
      vendorId: null,
      vendorName: "HnilaBazar",
      shopName: "HnilaBazar",
      vendorType: "platform",
    };
  }

  const label = getVendorLabel(vendor);
  return {
    vendorId,
    vendorName: label,
    shopName: label,
    vendorType: "vendor",
    vendorPhone: vendor?.phone || "",
    vendorEmail: vendor?.email || "",
    vendorAddress: vendor?.address || "",
    vendorSlug: vendor?.slug || "",
  };
};

const safeObjectId = (id) => {
  const value = normalizeId(id);
  return value && ObjectId.isValid(value) ? new ObjectId(value) : null;
};

const itemStatusFromOrderStatus = (status) => {
  const map = {
    pending: "pending",
    processing: "processing",
    packed: "packed",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    returned: "returned",
  };
  return map[status] || null;
};

const syncVendorFulfillmentForAdminStatus = async ({
  db,
  Order,
  orderId,
  status,
  changedBy = "admin",
  note = "",
  trackingNumber = null,
}) => {
  const itemStatus = itemStatusFromOrderStatus(status);
  if (!itemStatus) return;

  const orderObjectId = safeObjectId(orderId);
  if (!orderObjectId) return;

  const order = await Order.findById(orderId);
  if (!order) return;

  const now = new Date();
  const updatedProducts = (order.products || []).map((product) => {
    const updated = {
      ...product,
      itemStatus,
      statusUpdatedAt: now,
    };

    if (itemStatus === "processing") updated.processingAt = now;
    if (itemStatus === "packed") updated.packedAt = now;
    if (itemStatus === "shipped") {
      updated.shippedAt = now;
      if (trackingNumber) updated.trackingNumber = trackingNumber;
    }
    if (itemStatus === "delivered") updated.deliveredAt = now;
    if (itemStatus === "cancelled") updated.cancelledAt = now;
    if (itemStatus === "returned") updated.returnedAt = now;

    return updated;
  });

  await Order.collection.updateOne(
    { _id: orderObjectId },
    {
      $set: {
        products: updatedProducts,
        status,
        updatedAt: now,
        ...(status === "delivered" ? { deliveredAt: now } : {}),
        ...(status === "cancelled" ? { cancelledAt: now } : {}),
      },
      $push: {
        statusHistory: {
          status,
          changedAt: now,
          changedBy,
          note: note || `Admin marked order as ${status}`,
        },
      },
    },
  );

  const vendorGroups = updatedProducts.reduce((groups, product) => {
    const vendorId = normalizeId(product.vendorId) || "platform";
    if (!groups[vendorId]) groups[vendorId] = [];
    groups[vendorId].push(product);
    return groups;
  }, {});

  await Promise.all(
    Object.entries(vendorGroups).map(([vendorId, products]) => {
      const vendorSubtotal = products.reduce(
        (sum, product) => sum + (Number(product.price || 0) * Number(product.quantity || 0)),
        0,
      );
      return db.collection("vendorOrders").updateOne(
        {
          parentOrderId: orderId.toString(),
          vendorId: vendorId === "platform" ? null : vendorId,
        },
        {
          $set: {
            products,
            status,
            subtotal: Math.round(vendorSubtotal * 100) / 100,
            updatedAt: now,
            ...(status === "processing" ? { processingAt: now } : {}),
            ...(status === "packed" ? { packedAt: now } : {}),
            ...(status === "shipped" ? { shippedAt: now, ...(trackingNumber ? { trackingNumber } : {}) } : {}),
            ...(status === "delivered" ? { deliveredAt: now } : {}),
            ...(status === "cancelled" ? { cancelledAt: now } : {}),
          },
          $setOnInsert: {
            parentOrderId: orderId.toString(),
            vendorId: vendorId === "platform" ? null : vendorId,
            userId: order.userId || null,
            shippingInfo: order.shippingInfo || {},
            paymentMethod: order.paymentMethod || "",
            paymentStatus: order.paymentStatus || "",
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }),
  );
};

const syncVendorOrdersForCustomerCancellation = async ({ db, order }) => {
  if (!order?._id) return;

  const now = order.cancelledAt ? new Date(order.cancelledAt) : new Date();
  const parentOrderId = order._id.toString();
  const vendorGroups = (order.products || []).reduce((groups, product) => {
    const vendorId = normalizeId(product.vendorId) || "platform";
    if (!groups[vendorId]) groups[vendorId] = [];
    groups[vendorId].push({
      ...product,
      itemStatus: "cancelled",
      statusUpdatedAt: now,
      cancelledAt: product.cancelledAt || now,
    });
    return groups;
  }, {});

  await Promise.all(
    Object.entries(vendorGroups).map(([vendorId, products]) => {
      const subtotal = products.reduce(
        (sum, product) => sum + Number(product.price || 0) * Number(product.quantity || 0),
        0,
      );
      const totalCommission = products.reduce(
        (sum, product) => sum + Number(product.adminCommissionAmount || 0),
        0,
      );
      const vendorEarnings = products.reduce(
        (sum, product) => sum + Number(product.vendorEarningAmount || 0),
        0,
      );

      return db.collection("vendorOrders").updateOne(
        {
          parentOrderId,
          vendorId: vendorId === "platform" ? null : vendorId,
        },
        {
          $set: {
            products,
            status: "cancelled",
            paymentStatus: ["paid", "refund_pending"].includes(order.paymentStatus) ? "refund_pending" : "cancelled",
            cancelledBy: order.cancelledBy || order.userId || null,
            cancelledByRole: order.cancelledByRole || "user",
            cancellationSource: order.cancellationSource || "customer",
            cancellationMessage: order.cancellationMessage || "User cancelled this order within 30 minutes.",
            subtotal: Math.round(subtotal * 100) / 100,
            totalAmount: Math.round(subtotal * 100) / 100,
            totalCommission: Math.round(totalCommission * 100) / 100,
            vendorEarnings: Math.round(vendorEarnings * 100) / 100,
            cancelledAt: now,
            updatedAt: now,
          },
          $setOnInsert: {
            parentOrderId,
            vendorId: vendorId === "platform" ? null : vendorId,
            userId: order.userId || null,
            shippingInfo: order.shippingInfo || {},
            paymentMethod: order.paymentMethod || "",
            specialInstructions: order.specialInstructions || "",
            createdAt: order.createdAt || now,
          },
        },
        { upsert: true },
      );
    }),
  );
};

const restoreStockForCancelledOrder = async ({ Product, products = [] }) => {
  await Promise.all(
    products
      .map((product) => ({
        productId: safeObjectId(product.productId),
        quantity: Number(product.quantity || 0),
      }))
      .filter((product) => product.productId && product.quantity > 0)
      .map((product) =>
        Product.collection.updateOne(
          { _id: safeObjectId(product.productId) },
          { $inc: { stock: product.quantity }, $set: { updatedAt: new Date() } },
        ),
      ),
  );
};

const getAllOrders = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection.db;
    const orders = await Order.findAll();

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const vendorIds = [
      ...new Set(
        orders.flatMap((order) =>
          (order.products || [])
            .map((product) => normalizeId(product.vendorId))
            .filter((id) => id && id !== "platform" && ObjectId.isValid(id)),
        ),
      ),
    ];

    const vendors = vendorIds.length
      ? await db
          .collection("vendors")
          .find({ _id: { $in: vendorIds.map((id) => new ObjectId(id)) } })
          .toArray()
      : [];
    const vendorMapById = new Map(
      vendors.map((vendor) => [vendor._id.toString(), vendor]),
    );
    const parentOrderIds = orders.map((order) => order._id.toString());
    const vendorOrders = parentOrderIds.length
      ? await db
          .collection("vendorOrders")
          .find({ parentOrderId: { $in: parentOrderIds } })
          .sort({ createdAt: -1 })
          .toArray()
      : [];
    const vendorOrdersByParentId = vendorOrders.reduce((map, vendorOrder) => {
      if (!map[vendorOrder.parentOrderId]) {
        map[vendorOrder.parentOrderId] = [];
      }
      map[vendorOrder.parentOrderId].push(vendorOrder);
      return map;
    }, {});

    const extendedOrders = orders.map(order => {
      let totalCommission = 0;
      let totalVendorEarnings = 0;
      const vendorMap = {};

      if (order.products && Array.isArray(order.products)) {
        for (const product of order.products) {
          const adminComm = product.adminCommissionAmount || 0;
          const vendorEarn = product.vendorEarningAmount || 0;
          const vId = normalizeId(product.vendorId) || 'platform';
          const vendorDoc = vId === "platform" ? null : vendorMapById.get(vId);
          const vendorSnapshot = buildVendorSnapshot(
            vId === "platform" ? null : vId,
            vendorDoc,
          );

          product.vendorId = vendorSnapshot.vendorId;
          product.vendorName = product.vendorName || product.shopName || vendorSnapshot.vendorName;
          product.shopName = product.shopName || product.vendorName || vendorSnapshot.shopName;
          product.vendorPhone = product.vendorPhone || vendorSnapshot.vendorPhone || "";
          product.vendorEmail = product.vendorEmail || vendorSnapshot.vendorEmail || "";
          
          totalCommission += adminComm;
          totalVendorEarnings += vendorEarn;
          
          if (!vendorMap[vId]) {
            vendorMap[vId] = {
              vendorId: vId === 'platform' ? null : vId,
              vendorName: product.vendorName,
              shopName: product.shopName,
              grossSales: 0,
              totalCommission: 0,
              netEarnings: 0
            };
          }
          
          vendorMap[vId].grossSales += (product.price * product.quantity);
          vendorMap[vId].totalCommission += adminComm;
          vendorMap[vId].netEarnings += vendorEarn;
        }
      }

      return {
        ...order,
        vendorOrders: vendorOrdersByParentId[order._id.toString()] || [],
        totalCommission: round2(totalCommission),
        totalVendorEarnings: round2(totalVendorEarnings),
        perVendorBreakdown: Object.values(vendorMap).map(v => ({
          ...v,
          grossSales: round2(v.grossSales),
          totalCommission: round2(v.totalCommission),
          netEarnings: round2(v.netEarnings)
        }))
      };
    });

    res.json({ success: true, data: extendedOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const orders = await Order.findByUserId(req.user.uid);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Product = req.app.locals.models.Product;
    const Notification = req.app.locals.models.Notification;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const {
      products,
      total,
      shippingInfo,
      paymentMethod,
      transactionId,
      specialInstructions,
      couponCode,
      deliveryMethod = "standard",
      isGuest = false,
    } = req.body;

    // Log the received data for debugging
    console.log("📦 Creating order with data:", {
      userId: req.user?.uid || "guest",
      productsCount: products?.length,
      total,
      shippingInfo: shippingInfo ? "provided" : "missing",
      paymentMethod,
      transactionId: transactionId || "none",
      specialInstructions: specialInstructions ? "provided" : "none",
      couponCode: couponCode || "none",
      isGuest,
    });

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error("❌ Order creation failed: Invalid products");
      return res
        .status(400)
        .json({ success: false, error: "Invalid products" });
    }

    // Validate required shipping information
    if (
      !shippingInfo ||
      !shippingInfo.name ||
      !shippingInfo.email ||
      !shippingInfo.phone ||
      !shippingInfo.address ||
      !shippingInfo.city ||
      !shippingInfo.district ||
      !shippingInfo.upazila ||
      !shippingInfo.union ||
      !shippingInfo.area
    ) {
      console.error(
        "❌ Order creation failed: Missing shipping info",
        shippingInfo,
      );
      return res.status(400).json({
        success: false,
        error: "Missing required shipping information",
      });
    }

    // Validate product availability and fetch product details with vendorId
    const productsWithVendor = [];
    const vendorCollection = Product.collection.db.collection("vendors");
    const vendorSnapshotCache = new Map();

    const getVendorSnapshotForProduct = async (vendorId) => {
      const normalizedVendorId = normalizeId(vendorId);
      if (!normalizedVendorId) return buildVendorSnapshot(null, null);
      if (vendorSnapshotCache.has(normalizedVendorId)) {
        return vendorSnapshotCache.get(normalizedVendorId);
      }

      const vendorObjectId = safeObjectId(normalizedVendorId);
      const vendor = vendorObjectId
        ? await vendorCollection.findOne({ _id: vendorObjectId })
        : null;
      const snapshot = buildVendorSnapshot(normalizedVendorId, vendor);
      vendorSnapshotCache.set(normalizedVendorId, snapshot);
      return snapshot;
    };

    for (const item of products) {
      if (!item.productId) {
        console.error(
          "❌ Order creation failed: Missing productId in item",
          item,
        );
        return res.status(400).json({
          success: false,
          error: "Missing product ID in order items",
        });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        console.error(
          "❌ Order creation failed: Product not found",
          item.productId,
        );
        return res.status(400).json({
          success: false,
          error: `Product not found: ${item.productId}`,
        });
      }

      if (product.stock < item.quantity) {
        console.error("❌ Order creation failed: Insufficient stock", {
          product: product.title,
          available: product.stock,
          requested: item.quantity,
        });
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      const vendorSnapshot = await getVendorSnapshotForProduct(product.vendorId);

      // Add vendor/store snapshot and categoryId to product item.
      // categoryId is needed for commission calculation and vendor data is needed for invoices/admin order views.
      productsWithVendor.push({
        ...item,
        title: item.title || product.title,
        image: item.image || product.image || product.images?.[0] || "",
        vendorId: vendorSnapshot.vendorId,
        vendorName: vendorSnapshot.vendorName,
        shopName: vendorSnapshot.shopName,
        vendorType: vendorSnapshot.vendorType,
        vendorPhone: vendorSnapshot.vendorPhone || "",
        vendorEmail: vendorSnapshot.vendorEmail || "",
        vendorAddress: vendorSnapshot.vendorAddress || "",
        vendorSlug: vendorSnapshot.vendorSlug || "",
        categoryId: normalizeId(product.categoryId),
        weight: Number(product.weight || 0),
        isPerishable: Boolean(product.isPerishable),
        deliveryClass: product.deliveryClass || "",
      });
    }

    const vendorsById = {};
    for (const vendorId of vendorSnapshotCache.keys()) {
      const vendorObjectId = safeObjectId(vendorId);
      vendorsById[vendorId] = vendorObjectId
        ? await vendorCollection.findOne({ _id: vendorObjectId })
        : null;
    }

    const deliverySettings = await DeliverySettings.getSettings();
    const delivery = calculateDeliveryBreakdown({
      items: productsWithVendor,
      shippingInfo,
      vendorsById,
      settings: deliverySettings,
      deliveryMethod,
    });

    // Create order with coupon support
    const orderData = {
      userId: req.user?.uid || null,
      products: productsWithVendor,
      subtotal: total, // This will be recalculated in the model
      shippingInfo,
      paymentMethod,
      transactionId: transactionId || null,
      specialInstructions,
      couponCode,
      deliveryMethod,
      deliveryCharge: delivery.totalDeliveryFee,
      deliveryBreakdown: delivery.breakdown,
      isGuest: isGuest || false,
    };

    console.log("📦 Creating parent order in database...");
    const orderId = await Order.create(orderData);
    console.log("✅ Parent order created successfully:", orderId);

    // Get the created order to access calculated values
    const createdOrder = await Order.findById(orderId);

    // Group products by vendorId (Daraz-style split)
    const vendorGroups = {};
    for (const item of productsWithVendor) {
      const vendorId = item.vendorId || 'platform'; // 'platform' for products without vendor
      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = [];
      }
      vendorGroups[vendorId].push(item);
    }

    console.log(`📦 Splitting order into ${Object.keys(vendorGroups).length} vendor orders...`);

    // Create vendor orders for each vendor
    const vendorOrderIds = [];
    for (const [vendorId, vendorProducts] of Object.entries(vendorGroups)) {
      // Calculate vendor order subtotal
      const vendorSubtotal = vendorProducts.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const vendorDelivery = (createdOrder.deliveryBreakdown || []).find(
        (item) => (item.vendorId || "platform") === vendorId,
      );
      const vendorDeliveryCharge = vendorDelivery?.deliveryFee || 0;

      // Calculate proportional discounts
      const vendorCouponDiscount = (vendorSubtotal / createdOrder.subtotal) * (createdOrder.couponDiscount || 0);
      const vendorPointsDiscount = (vendorSubtotal / createdOrder.subtotal) * (createdOrder.pointsDiscount || 0);
      const vendorTotalDiscount = vendorCouponDiscount + vendorPointsDiscount;

      // Calculate vendor order total
      const vendorTotal = vendorSubtotal - vendorTotalDiscount + vendorDeliveryCharge;

      const vendorOrderData = {
        vendorId: vendorId === 'platform' ? null : vendorId,
        parentOrderId: orderId.toString(),
        userId: req.user?.uid || null,
        products: vendorProducts,
        subtotal: Math.round(vendorSubtotal * 100) / 100,
        couponDiscount: Math.round(vendorCouponDiscount * 100) / 100,
        pointsDiscount: Math.round(vendorPointsDiscount * 100) / 100,
        totalDiscount: Math.round(vendorTotalDiscount * 100) / 100,
        deliveryCharge: Math.round(vendorDeliveryCharge * 100) / 100,
        deliveryMethod: vendorDelivery?.deliveryMethod || deliveryMethod,
        deliveryBreakdown: vendorDelivery || null,
        totalAmount: Math.round(vendorTotal * 100) / 100,
        shippingInfo,
        paymentMethod,
        transactionId: transactionId || null,
        specialInstructions,
        status: 'pending',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending_verification',
      };

      const vendorOrder = await VendorOrder.create(vendorOrderData);
      vendorOrderIds.push(vendorOrder._id);
      
      console.log(`✅ Vendor order created for vendor ${vendorId}:`, vendorOrder._id);
    }

    console.log(`✅ Created ${vendorOrderIds.length} vendor orders`);
    console.log("📦 Order split completed successfully");

    if (Notification) {
      if (req.user?.uid) {
        await Notification.create({
          userId: req.user.uid,
          type: "order_created",
          title: "Order placed successfully",
          message: `Your order #${orderId.toString().slice(-8)} has been placed.`,
          link: `/orders/${orderId.toString()}`,
          orderId: orderId.toString(),
        }).catch((error) => console.error("Failed to create customer order notification:", error));
      }

      await Promise.all(
        Object.entries(vendorGroups)
          .filter(([vendorId]) => vendorId !== "platform")
          .map(async ([vendorId, vendorProducts]) => {
            try {
              const vendor = await Vendor.findById(vendorId);
              if (!vendor?.ownerUserId) return;
              const owner = await User.findById(vendor.ownerUserId);
              if (!owner?.firebaseUid) return;
              await Notification.create({
                userId: owner.firebaseUid,
                type: "vendor_new_order",
                title: "New vendor order",
                message: `${vendor.shopName} received ${vendorProducts.length} item(s) in order #${orderId.toString().slice(-8)}.`,
                link: "/vendor/orders",
                orderId: orderId.toString(),
                vendorId,
              });
            } catch (error) {
              console.error("Failed to create vendor new order notification:", error);
            }
          }),
      );
    }

    if (vendorOrderIds.length > 0) {
      await Order.collection.updateOne(
        { _id: safeObjectId(orderId) },
        {
          $set: {
            vendorOrderIds: vendorOrderIds.map((id) => normalizeId(id)),
            updatedAt: new Date(),
          },
        },
      );
    }

    // Update product stock
    console.log("📦 Updating product stock...");
    for (const item of products) {
      await Product.updateStock(item.productId, item.quantity);

      // Check for low stock and send alert
      const product = await Product.findById(item.productId);
      if (product && product.stock <= 10) {
        await emailService.sendLowStockAlert({
          productTitle: product.title,
          currentStock: product.stock,
          productId: product._id,
        });
      }
    }
    console.log("✅ Product stock updated successfully");

    // Redeem loyalty points if used
    if (req.body.redeemedPoints && req.body.redeemedPoints > 0) {
      try {
        console.log("🎁 Redeeming loyalty points for order:", {
          orderId: orderId.toString(),
          userId: req.user.uid,
          points: req.body.redeemedPoints,
        });

        const loyaltyService = require("../services/loyaltyService");
        await loyaltyService.redeemPoints(
          req.user.uid,
          req.body.redeemedPoints,
          orderId.toString(),
        );

        console.log("✅ Loyalty points redeemed successfully");
      } catch (loyaltyError) {
        console.error("⚠️ Failed to redeem loyalty points:", loyaltyError);
        // Don't fail the order creation if loyalty redemption fails
        // The order is already created, so we continue
      }
    }

    // Send order confirmation email
    try {
      console.log("📧 Sending order confirmation email...");
      await emailService.sendOrderConfirmation({
        userEmail: shippingInfo.email,
        userName: shippingInfo.name,
        orderId: orderId.toString(),
        orderTotal: total,
        items: products,
        shippingAddress: shippingInfo,
      });
      console.log("✅ Order confirmation email sent");
    } catch (emailError) {
      console.error("⚠️ Failed to send order confirmation email:", emailError);
      // Don't fail the order creation if email fails
    }

    // Generate invoice PDF
    try {
      console.log("📄 Generating invoice PDF...");
      const order = await Order.findById(orderId);
      await invoiceService.generateInvoice(order);
      console.log("✅ Invoice PDF generated successfully");
    } catch (invoiceError) {
      console.error("⚠️ Failed to generate invoice:", invoiceError);
      // Don't fail the order creation if invoice generation fails
    }

    console.log("🎉 Order creation completed successfully");
    res.status(201).json({
      success: true,
      data: { orderId },
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const Notification = req.app.locals.models.Notification;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const loyaltyService = require("../services/loyaltyService");
    const NotificationService = require("../services/notificationService");
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Get order details for email notification and loyalty points
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const result = await Order.updateStatus(id, status, req.user?.uid, req.body.note || "");

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    await syncVendorFulfillmentForAdminStatus({
      db: req.app.locals.db || Order.collection.db,
      Order,
      orderId: id,
      status,
      changedBy: req.user?.uid || "admin",
      note: req.body.note || "",
      trackingNumber,
    });

    if (Notification) {
      await Notification.create({
        userId: order.userId,
        type: "order_status",
        title: "Order status updated",
        message: `Your order #${id.slice(-8)} is now ${status}.`,
        link: `/orders/${id}`,
        orderId: id,
      }).catch((error) => console.error("Failed to create user notification:", error));

      const vendorIds = [
        ...new Set((order.products || []).map((product) => product.vendorId?.toString()).filter(Boolean)),
      ];
      await Promise.all(
        vendorIds.map(async (vendorId) => {
          try {
            const vendor = await Vendor.findById(vendorId);
            if (!vendor?.ownerUserId) return;
            const owner = await User.findById(vendor.ownerUserId);
            if (!owner?.firebaseUid) return;
            await Notification.create({
              userId: owner.firebaseUid,
              type: "vendor_order_status",
              title: "Vendor order updated",
              message: `Order #${id.slice(-8)} for ${vendor.shopName} is now ${status}.`,
              link: "/vendor/orders",
              orderId: id,
              vendorId,
            });
          } catch (error) {
            console.error("Failed to create vendor notification:", error);
          }
        }),
      );
    }

    // Send push notification for order status update
    try {
      console.log("📱 Sending push notification for order status update:", {
        orderId: id,
        userId: order.userId,
        status,
      });

      await NotificationService.sendOrderStatusNotification(order.userId, {
        _id: id,
        status,
        trackingNumber,
        ...order,
      });

      console.log("✅ Push notification sent successfully");
    } catch (notificationError) {
      console.error("⚠️ Failed to send push notification:", notificationError);
      // Don't fail the status update if notification fails
    }

    // Award loyalty points when order is delivered
    if (status === "delivered" && order.userId) {
      try {
        console.log("🎁 Awarding loyalty points for delivered order:", {
          orderId: id,
          userId: order.userId,
          orderTotal: order.total,
        });

        await loyaltyService.awardPointsForOrder(
          order.userId,
          order.shippingInfo?.email || "unknown@email.com",
          order.total,
          id,
        );

        console.log("✅ Loyalty points awarded successfully");
      } catch (loyaltyError) {
        console.error("⚠️ Failed to award loyalty points:", loyaltyError);
        // Don't fail the status update if loyalty points fail
      }
    }

    // Send status update email
    try {
      console.log("📧 Sending order status update email...");
      console.log("   Email to:", order.shippingInfo.email);
      console.log("   User name:", order.shippingInfo.name);
      console.log("   Order ID:", id);
      console.log("   New status:", status);

      const emailResult = await emailService.sendOrderStatusUpdate({
        userEmail: order.shippingInfo.email,
        userName: order.shippingInfo.name,
        orderId: id,
        status,
        trackingNumber,
      });

      if (emailResult.success) {
        console.log("✅ Order status email sent successfully");
        if (emailResult.messageId) {
          console.log("   Message ID:", emailResult.messageId);
        }
      } else {
        console.error("❌ Failed to send order status email");
        console.error("   Error:", emailResult.error);
      }
    } catch (emailError) {
      console.error(
        "❌ Exception sending order status email:",
        emailError.message,
      );
      console.error("   Stack:", emailError.stack);
      // Don't fail the status update if email fails
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const Product = req.app.locals.models.Product;
    const Notification = req.app.locals.models.Notification;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db || Order.collection.db;
    const { id } = req.params;
    const userId = req.user.uid;

    // Get order details before cancelling
    const order = await Order.findById(id);

    const cancelledOrder = await Order.cancelOrder(id, userId);

    await Promise.all([
      syncVendorOrdersForCustomerCancellation({ db, order: cancelledOrder }),
      restoreStockForCancelledOrder({ Product, products: order?.products || [] }),
    ]);

    if (Notification) {
      const vendorIds = [
        ...new Set(
          (cancelledOrder.products || [])
            .map((product) => normalizeId(product.vendorId))
            .filter(Boolean),
        ),
      ];

      await Promise.all(
        vendorIds.map(async (vendorId) => {
          const vendor = await Vendor.findById(vendorId).catch(() => null);
          if (!vendor?.userId) return;
          const vendorUser = await User.findById(vendor.userId.toString()).catch(() => null);
          if (!vendorUser?.firebaseUid) return;

          return Notification.create({
            userId: vendorUser.firebaseUid,
            type: "order_cancelled",
            title: "Order cancelled by customer",
            message: `Order #${id.toString().slice(-8)} was cancelled within 30 minutes.`,
            link: "/vendor/orders",
            orderId: id.toString(),
          }).catch((error) => console.error("Failed to create vendor cancellation notification:", error));
        }),
      );
    }

    // Send cancellation email
    try {
      await emailService.sendOrderStatusUpdate({
        userEmail: order.shippingInfo.email,
        userName: order.shippingInfo.name,
        orderId: id,
        status: "cancelled",
      });
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
        ? 403
        : error.message.includes("expired")
          ? 400
          : error.message.includes("Only pending")
            ? 400
            : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const userId = req.user?.uid;

    // Get order
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Check if user owns this order (unless admin)
    if (userId && order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to access this invoice",
      });
    }

    // Check if invoice exists, if not generate it
    if (!invoiceService.invoiceExists(id)) {
      console.log("📄 Invoice not found, generating...");
      await invoiceService.generateInvoice(order);
    }

    // Get invoice path
    const invoicePath = invoiceService.getInvoicePath(id);

    // Send file
    res.download(invoicePath, `invoice-${id}.pdf`, (err) => {
      if (err) {
        console.error("Error downloading invoice:", err);
        res.status(500).json({
          success: false,
          error: "Failed to download invoice",
        });
      }
    });
  } catch (error) {
    console.error("Error downloading invoice:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Paginated + filtered order list
// ─────────────────────────────────────────
const getAdminOrders = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { status, from, to, search, page = 1, limit = 20 } = req.query;
    const result = await Order.findAllPaginated({ status, from, to, search, page, limit });

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    result.orders = result.orders.map(order => {
      let totalCommission = 0;
      let totalVendorEarnings = 0;
      const vendorMap = {};
      if (order.products && Array.isArray(order.products)) {
        for (const p of order.products) {
          const comm = p.adminCommissionAmount || 0;
          const earn = p.vendorEarningAmount || 0;
          const vId = p.vendorId || 'platform';
          totalCommission += comm;
          totalVendorEarnings += earn;
          if (!vendorMap[vId]) {
            vendorMap[vId] = { vendorId: vId === 'platform' ? null : vId, grossSales: 0, totalCommission: 0, netEarnings: 0 };
          }
          vendorMap[vId].grossSales += (p.price * p.quantity);
          vendorMap[vId].totalCommission += comm;
          vendorMap[vId].netEarnings += earn;
        }
      }
      return {
        ...order,
        totalCommission: round2(totalCommission),
        totalVendorEarnings: round2(totalVendorEarnings),
        perVendorBreakdown: Object.values(vendorMap).map(v => ({
          ...v,
          grossSales: round2(v.grossSales),
          totalCommission: round2(v.totalCommission),
          netEarnings: round2(v.netEarnings),
        })),
      };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getAdminOrders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Single enriched order detail
// ─────────────────────────────────────────
const getAdminOrderById = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db;
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    // Build commission breakdown
    let totalCommission = 0;
    let totalVendorEarnings = 0;
    const vendorMap = {};
    if (order.products && Array.isArray(order.products)) {
      for (const p of order.products) {
        const comm = p.adminCommissionAmount || 0;
        const earn = p.vendorEarningAmount || 0;
        const vId = p.vendorId || 'platform';
        totalCommission += comm;
        totalVendorEarnings += earn;
        if (!vendorMap[vId]) {
          vendorMap[vId] = { vendorId: vId === 'platform' ? null : vId, grossSales: 0, totalCommission: 0, netEarnings: 0 };
        }
        vendorMap[vId].grossSales += (p.price * p.quantity);
        vendorMap[vId].totalCommission += comm;
        vendorMap[vId].netEarnings += earn;
      }
    }

    // Enrich vendor info
    const vendorsCollection = db.collection('vendors');
    const perVendorBreakdown = await Promise.all(
      Object.values(vendorMap).map(async (v) => {
        let shopName = null;
        if (v.vendorId) {
          try {
            const { ObjectId } = require('mongodb');
            const vendor = await vendorsCollection.findOne({ _id: new ObjectId(v.vendorId) });
            shopName = vendor?.shopName || null;
          } catch (_) {}
        }
        return {
          ...v,
          shopName,
          grossSales: round2(v.grossSales),
          totalCommission: round2(v.totalCommission),
          netEarnings: round2(v.netEarnings),
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...order,
        totalCommission: round2(totalCommission),
        totalVendorEarnings: round2(totalVendorEarnings),
        perVendorBreakdown,
        statusHistory: order.statusHistory || [],
        notes: order.notes || [],
      },
    });
  } catch (error) {
    console.error('Error in getAdminOrderById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Order dashboard stats
// ─────────────────────────────────────────
const getAdminOrderStats = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const stats = await Order.getOrderStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in getAdminOrderStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Export orders as CSV
// ─────────────────────────────────────────
const exportOrdersCsv = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { status, from, to, search } = req.query;
    const result = await Order.findAllPaginated({ status, from, to, search, page: 1, limit: 10000 });

    const rows = result.orders.map(o => [
      o._id.toString(),
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
      o.status,
      o.paymentMethod,
      o.paymentStatus,
      o.shippingInfo?.name || '',
      o.shippingInfo?.email || '',
      o.shippingInfo?.phone || '',
      o.shippingInfo?.address || '',
      o.shippingInfo?.city || '',
      o.products?.length || 0,
      o.subtotal || 0,
      o.totalDiscount || 0,
      o.deliveryCharge || 0,
      o.total || 0,
      o.couponApplied?.code || '',
    ]);

    const header = 'OrderId,CreatedAt,Status,PaymentMethod,PaymentStatus,CustomerName,Email,Phone,Address,City,ItemCount,Subtotal,Discount,Delivery,Total,CouponCode';
    const csv = [header, ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error in exportOrdersCsv:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Bulk status update
// ─────────────────────────────────────────
const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { orderIds, status, note } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'orderIds must be a non-empty array' });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const results = await Promise.allSettled(
      orderIds.map(async (id) => {
        await Order.updateStatus(id, status, req.user?.uid, note || '');
        await syncVendorFulfillmentForAdminStatus({
          db: req.app.locals.db || Order.collection.db,
          Order,
          orderId: id,
          status,
          changedBy: req.user?.uid || "admin",
          note: note || "",
        });
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ success: true, message: `Updated ${succeeded} orders. ${failed} failed.`, succeeded, failed });
  } catch (error) {
    console.error('Error in bulkUpdateOrderStatus:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Add internal note to an order
// ─────────────────────────────────────────
const addOrderNote = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, error: 'Note text is required' });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    await Order.addNote(id, note.trim(), req.user?.uid);

    const updated = await Order.findById(id);
    res.json({ success: true, data: { notes: updated.notes || [] } });
  } catch (error) {
    console.error('Error in addOrderNote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Regenerate invoice PDF
// ─────────────────────────────────────────
const regenerateInvoice = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    invoiceService.deleteInvoice(id);
    await invoiceService.generateInvoice(order);

    res.json({ success: true, message: 'Invoice regenerated successfully' });
  } catch (error) {
    console.error('Error in regenerateInvoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Cancel order (overrides customer cancellation rules)
// ─────────────────────────────────────────
const adminCancelOrder = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, error: "Order is already cancelled" });
    }

    // Cancel all item statuses too
    const cancelledProducts = (order.products || []).map((p) => ({
      ...p,
      itemStatus: "cancelled",
    }));

    const { ObjectId } = require("mongodb");
    await Order.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "cancelled",
          products: cancelledProducts,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: "cancelled",
            changedAt: new Date(),
            changedBy: req.user?.uid || "admin",
            note: reason || "Cancelled by admin",
          },
        },
      }
    );

    res.json({ success: true, message: "Order cancelled by admin" });
  } catch (error) {
    console.error("Error in adminCancelOrder:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Resolve dispute
// ─────────────────────────────────────────
const adminResolveDispute = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const { resolution, note, restoreStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const noteText = `Dispute resolved: ${resolution || "No resolution details provided"}${note ? ". " + note : ""}`;
    await Order.addNote(id, noteText, req.user?.uid || "admin");

    // Optionally restore order to processing if it was on hold
    if (restoreStatus) {
      const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
      if (validStatuses.includes(restoreStatus)) {
        await Order.updateStatus(id, restoreStatus, req.user?.uid || "admin", `Status restored after dispute resolution`);
      }
    }

    res.json({ success: true, message: "Dispute resolved", resolution });
  } catch (error) {
    console.error("Error in adminResolveDispute:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Approve refund
// ─────────────────────────────────────────
const adminApproveRefund = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const { note } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    if (order.refundApproved) {
      return res.status(400).json({ success: false, error: "Refund already approved" });
    }

    const { ObjectId } = require("mongodb");
    await Order.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          refundApproved: true,
          refundApprovedAt: new Date(),
          refundApprovedBy: req.user?.uid || "admin",
          updatedAt: new Date(),
        },
      }
    );

    if (note) {
      await Order.addNote(id, `Refund approved: ${note}`, req.user?.uid || "admin");
    } else {
      await Order.addNote(id, "Refund approved by admin", req.user?.uid || "admin");
    }

    res.json({ success: true, message: "Refund approved" });
  } catch (error) {
    console.error("Error in adminApproveRefund:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────
// Admin: Override order status (bypass auto-sync)
// ─────────────────────────────────────────
const adminOverrideStatus = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "status is required" });
    }

    const validStatuses = ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    await Order.updateStatus(id, status, req.user?.uid || "admin", note || "Status overridden by admin");
    await syncVendorFulfillmentForAdminStatus({
      db: req.app.locals.db || Order.collection.db,
      Order,
      orderId: id,
      status,
      changedBy: req.user?.uid || "admin",
      note: note || "Status overridden by admin",
    });

    res.json({ success: true, message: `Order status overridden to "${status}"` });
  } catch (error) {
    console.error("Error in adminOverrideStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllOrders,
  getAdminOrders,
  getAdminOrderById,
  getAdminOrderStats,
  exportOrdersCsv,
  bulkUpdateOrderStatus,
  addOrderNote,
  regenerateInvoice,
  getUserOrders,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
  adminCancelOrder,
  adminResolveDispute,
  adminApproveRefund,
  adminOverrideStatus,
};
