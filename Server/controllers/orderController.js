const emailService = require("../services/emailService");
const invoiceService = require("../services/invoiceService");
const { ObjectId } = require("mongodb");
const DeliverySettings = require("../models/DeliverySettings");
const { calculateDeliveryBreakdown } = require("../utils/deliveryCalculator");
const {
  getVendorNote,
  sanitizeVendorNotes,
} = require("../utils/checkoutVendorNotes");
const { appendOrderEvent, getTimelineForOrder } = require("../services/orderEventService");
const {
  buildCustomerOrderExperience,
} = require("../utils/customerOrderExperience");

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
    ready_to_ship: "ready_to_ship",
    pickup_ready: "pickup_ready",
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
    const Return = req.app.locals.models.Return;
    const orders = await Order.findByUserId(req.user.uid);
    const userReturns = Return?.findByUserId
      ? await Return.findByUserId(req.user.uid)
      : [];

    const ordersWithExperience = orders.map((order) => ({
      ...order,
      customerExperience: buildCustomerOrderExperience(order, userReturns),
    }));

    res.json({ success: true, data: ordersWithExperience });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getOrderTimelineEvents = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const role = req.dbUser?.role || req.user?.role;
    const isStaff = ["admin", "manager", "support", "moderator"].includes(role);
    const isOwner = order.userId && order.userId === req.user.uid;
    const vendorId = req.user.vendorId?.toString();
    const isVendorOrder = vendorId && (order.products || []).some(
      (product) => product.vendorId?.toString() === vendorId,
    );

    if (!isStaff && !isOwner && !isVendorOrder) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    let events = await getTimelineForOrder(req.app, id);
    if (events.length === 0) {
      events = [
        {
          orderId: id,
          status: order.status || "pending",
          label: "Order placed",
          createdAt: order.createdAt,
          courierName: order.courierName || "",
          trackingNumber: order.trackingNumber || "",
          eta: order.estimatedDelivery || null,
        },
        ...(order.statusHistory || []).map((item) => ({
          orderId: id,
          status: item.status,
          label: `Order ${item.status}`,
          createdAt: item.changedAt,
          actorId: item.changedBy,
          note: item.note || "",
        })),
      ];
    }

    res.json({
      success: true,
      data: events,
      currentStatus: order.status,
      courierName: order.courierName || "",
      trackingNumber: order.trackingNumber || "",
      eta: order.estimatedDelivery || null,
      trackingProfile: buildCustomerOrderExperience(order, [], new Date(), events).tracking,
    });
  } catch (error) {
    console.error("Error loading order timeline:", error);
    res.status(500).json({ success: false, error: "Failed to load order timeline" });
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
      vendorNotes = {},
      couponCode,
      deliveryMethod = "standard",
      isGuest = false,
    } = req.body;
    const sanitizedVendorNotes = sanitizeVendorNotes(vendorNotes);

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

      if (product.stock < item.quantity && !product.allowBackorder) {
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
      const vendorNote = getVendorNote(
        sanitizedVendorNotes,
        vendorSnapshot.vendorId || "platform",
        item.vendorNote || "",
      );

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
        vendorNote,
        categoryId: normalizeId(product.categoryId),
        weight: Number(product.weight || 0),
        isPerishable: Boolean(product.isPerishable),
        deliveryClass: product.deliveryClass || "",
        allowBackorder: Boolean(product.allowBackorder),
        restockDate: product.restockDate || null,
        preorderEnabled: Boolean(product.preorderEnabled),
        expectedShipDate: product.expectedShipDate || null,
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
      vendorNotes: sanitizedVendorNotes,
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

    await appendOrderEvent({
      app: req.app,
      orderId: orderId.toString(),
      status: "pending",
      label: "Order placed",
      actorId: req.user?.uid || null,
      actorRole: req.user?.uid ? "user" : "guest",
      note: "Order received",
    });

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

      const couponScopeVendorId =
        createdOrder.couponApplied?.source === "vendor_voucher"
          ? (createdOrder.couponApplied.scopeVendorId || "platform")
          : null;

      // Calculate coupon discount
      const vendorCouponDiscount = couponScopeVendorId
        ? couponScopeVendorId === vendorId
          ? Number(createdOrder.couponDiscount || 0)
          : 0
        : (vendorSubtotal / createdOrder.subtotal) * (createdOrder.couponDiscount || 0);
      const vendorPointsDiscount = (vendorSubtotal / createdOrder.subtotal) * (createdOrder.pointsDiscount || 0);
      const vendorTotalDiscount = vendorCouponDiscount + vendorPointsDiscount;

      // Calculate vendor order total
      const vendorTotal = vendorSubtotal - vendorTotalDiscount + vendorDeliveryCharge;
      const vendorSpecialInstructions = getVendorNote(
        sanitizedVendorNotes,
        vendorId,
        specialInstructions || "",
      );

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
        specialInstructions: vendorSpecialInstructions,
        vendorNote: vendorSpecialInstructions,
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

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status,
      label: `Order ${status}`,
      actorId: req.user?.uid || "admin",
      actorRole: "admin",
      trackingNumber,
      note: req.body.note || "",
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
      }, req.app.locals.models);

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
    const cancellationReason =
      req.body?.reason || req.body?.cancellationReason || "";

    // Get order details before cancelling
    const order = await Order.findById(id);

    const cancelledOrder = await Order.cancelOrder(id, userId, cancellationReason);

    await Promise.all([
      syncVendorOrdersForCustomerCancellation({ db, order: cancelledOrder }),
      restoreStockForCancelledOrder({ Product, products: order?.products || [] }),
    ]);

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status: "cancelled",
      label: "Order cancelled",
      actorId: userId,
      actorRole: "user",
      note: cancelledOrder.cancellationMessage || "Customer cancelled within the cancellation window",
    });

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
            message: `Order #${id.toString().slice(-8)} was cancelled within 30 minutes.${
              cancelledOrder.cancellationReasonLabel
                ? ` Reason: ${cancelledOrder.cancellationReasonLabel}.`
                : ""
            }`,
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

    // Always regenerate on download so totals, discounts, and address/order edits
    // are reflected even when an older PDF was generated before checkout fixes.
    if (invoiceService.invoiceExists(id)) {
      invoiceService.deleteInvoice(id);
    }
    await invoiceService.generateInvoice(order);

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
const dateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hoursBetween = (start, end = new Date()) => {
  const startDate = dateOrNull(start);
  if (!startDate) return 0;
  return Math.max(0, Math.round(((dateOrNull(end) || new Date()) - startDate) / 36_000) / 100);
};

const isCodPayment = (method) =>
  ["cod", "cash_on_delivery", "cash on delivery"].includes(String(method || "").toLowerCase());

const getDeliveryZone = (order = {}) => {
  const shippingInfo = order.shippingInfo || {};
  return (
    order.deliveryZone ||
    shippingInfo.deliveryZone ||
    shippingInfo.zone ||
    shippingInfo.district ||
    shippingInfo.city ||
    shippingInfo.upazila ||
    shippingInfo.area ||
    shippingInfo.division ||
    ""
  );
};

const getOrderVendorIds = (order = {}) => [
  ...new Set(
    (order.products || [])
      .map((product) => normalizeId(product.vendorId))
      .filter((vendorId) => vendorId && vendorId !== "platform"),
  ),
];

const getOrderVendorNames = (order = {}) => [
  ...new Set(
    [
      ...(order.products || []).map((product) => product.vendorName || product.shopName || product.storeName),
      ...(order.perVendorBreakdown || []).map((vendor) => vendor.shopName || vendor.vendorName),
    ].filter(Boolean),
  ),
];

const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const fetchVendorMap = async (db, orders = []) => {
  if (!db) return new Map();

  const vendorIds = [
    ...new Set(
      orders
        .flatMap((order) => getOrderVendorIds(order))
        .filter((vendorId) => ObjectId.isValid(vendorId)),
    ),
  ];

  if (vendorIds.length === 0) return new Map();

  const vendors = await db
    .collection("vendors")
    .find({ _id: { $in: vendorIds.map((vendorId) => new ObjectId(vendorId)) } })
    .toArray();

  return new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor]));
};

const fetchVendorOrdersByParentId = async (db, orders = []) => {
  if (!db) return new Map();

  const parentOrderIds = orders.map((order) => normalizeId(order._id)).filter(Boolean);
  if (parentOrderIds.length === 0) return new Map();

  const vendorOrders = await db
    .collection("vendorOrders")
    .find({ parentOrderId: { $in: parentOrderIds } })
    .sort({ createdAt: -1 })
    .toArray();

  return vendorOrders.reduce((map, vendorOrder) => {
    const parentId = normalizeId(vendorOrder.parentOrderId);
    if (!parentId) return map;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(vendorOrder);
    return map;
  }, new Map());
};

const enrichAdminOrdersWithVendors = async (db, orders = []) => {
  const [vendorMap, vendorOrdersByParentId] = await Promise.all([
    fetchVendorMap(db, orders),
    fetchVendorOrdersByParentId(db, orders),
  ]);

  return orders.map((order) => {
    const vendorBreakdown = {};
    const vendorOrders = vendorOrdersByParentId.get(normalizeId(order._id)) || [];

    const products = (order.products || []).map((product) => {
      const vendorId = normalizeId(product.vendorId);
      const vendor = vendorId ? vendorMap.get(vendorId) : null;
      const vendorName = product.vendorName || product.shopName || getVendorLabel(vendor);
      const key = vendorId || "platform";

      if (!vendorBreakdown[key]) {
        vendorBreakdown[key] = {
          vendorId: vendorId || null,
          vendorName,
          shopName: vendorName,
          grossSales: 0,
          totalCommission: 0,
          netEarnings: 0,
          itemCount: 0,
        };
      }

      const lineTotal = Number(product.price || 0) * Number(product.quantity || 0);
      vendorBreakdown[key].grossSales += lineTotal;
      vendorBreakdown[key].totalCommission += Number(product.adminCommissionAmount || 0);
      vendorBreakdown[key].netEarnings += Number(product.vendorEarningAmount || 0);
      vendorBreakdown[key].itemCount += Number(product.quantity || 1);

      return {
        ...product,
        vendorId: vendorId || null,
        vendorName,
        shopName: product.shopName || vendorName,
      };
    });

    const perVendorBreakdown = Object.values(vendorBreakdown).map((vendor) => {
      const vendorOrder = vendorOrders.find((item) => normalizeId(item.vendorId) === normalizeId(vendor.vendorId));
      return {
        ...vendor,
        vendorOrderId: normalizeId(vendorOrder?._id),
        vendorOrderStatus: vendorOrder?.status || null,
        vendorOrderTotal: vendorOrder?.totalAmount ?? vendorOrder?.total ?? null,
        vendorOrderUpdatedAt: vendorOrder?.updatedAt || null,
        grossSales: Math.round(vendor.grossSales * 100) / 100,
        totalCommission: Math.round(vendor.totalCommission * 100) / 100,
        netEarnings: Math.round(vendor.netEarnings * 100) / 100,
      };
    });

    const vendorNames = perVendorBreakdown.map((vendor) => vendor.vendorName).filter(Boolean);
    const deliveryZone = getDeliveryZone(order);

    return {
      ...order,
      products,
      deliveryZone,
      vendorNames,
      primaryVendorName: vendorNames[0] || "HnilaBazar",
      vendorOrders,
      perVendorBreakdown: perVendorBreakdown.length > 0 ? perVendorBreakdown : order.perVendorBreakdown || [],
      itemCount: products.reduce((sum, product) => sum + Number(product.quantity || 1), 0),
    };
  });
};

const getEventTime = (event = {}) =>
  dateOrNull(event.createdAt || event.changedAt || event.timestamp || event.at || event.time) || new Date(0);

const buildAdminOrderTimeline = (order = {}, persistedEvents = []) => {
  const events = [];
  const addEvent = (event) => {
    const createdAt = getEventTime(event);
    if (!createdAt || createdAt.getTime() === 0) return;
    events.push({
      type: event.type || "order",
      status: event.status || "",
      label: event.label || event.status || "Order event",
      actorId: event.actorId || event.changedBy || event.addedBy || null,
      actorRole: event.actorRole || event.role || "",
      note: event.note || event.text || "",
      courierName: event.courierName || "",
      trackingNumber: event.trackingNumber || "",
      metadata: event.metadata || {},
      createdAt,
    });
  };

  addEvent({
    type: "order",
    status: "created",
    label: "Order placed",
    actorId: order.userId || null,
    actorRole: "buyer",
    createdAt: order.createdAt,
  });

  persistedEvents.forEach((event) => addEvent({ ...event, type: event.type || "event" }));

  (order.statusHistory || []).forEach((item) =>
    addEvent({
      type: "status",
      status: item.status,
      label: `Order ${String(item.status || "").replace(/_/g, " ")}`,
      actorId: item.changedBy,
      actorRole: item.actorRole || "system",
      note: item.note || "",
      createdAt: item.changedAt,
    }),
  );

  (order.adminActions || []).forEach((item) =>
    addEvent({
      type: "admin",
      status: item.type || item.action || "admin_action",
      label: item.label || item.type || "Admin action",
      actorId: item.actorId || item.adminId,
      actorRole: "admin",
      note: item.note || item.reason || "",
      createdAt: item.createdAt || item.at,
      metadata: item.metadata || {},
    }),
  );

  (order.paymentEvents || []).forEach((item) =>
    addEvent({
      type: "payment",
      status: item.status || order.paymentStatus,
      label: item.label || `Payment ${item.status || order.paymentStatus || "updated"}`,
      actorId: item.actorId,
      actorRole: item.actorRole || "system",
      note: item.note || item.transactionId || "",
      createdAt: item.createdAt || item.at,
      metadata: item.metadata || {},
    }),
  );

  if (order.paymentStatus) {
    addEvent({
      type: "payment",
      status: order.paymentStatus,
      label: `Payment ${String(order.paymentStatus).replace(/_/g, " ")}`,
      createdAt: order.paymentVerifiedAt || order.refundApprovedAt || order.createdAt,
      note: order.transactionId ? `Transaction: ${order.transactionId}` : "",
    });
  }

  (order.courierUpdates || []).forEach((item) =>
    addEvent({
      type: "courier",
      status: item.status || "courier_update",
      label: item.label || item.status || "Courier update",
      actorId: item.actorId,
      actorRole: item.actorRole || "courier",
      note: item.note || "",
      courierName: item.courierName || order.courierName || "",
      trackingNumber: item.trackingNumber || order.trackingNumber || "",
      createdAt: item.createdAt || item.at,
      metadata: item.metadata || {},
    }),
  );

  (order.products || []).forEach((item) => {
    [
      ["vendorAcceptedAt", "accepted", "Vendor accepted item"],
      ["packedAt", "packed", "Item packed"],
      ["readyToShipAt", "ready_to_ship", "Ready to ship"],
      ["shippedAt", "shipped", "Item shipped"],
      ["deliveredAt", "delivered", "Item delivered"],
      ["codCollectedAt", "cod_collected", "COD cash collected"],
      ["returnedAt", "returned", "Item returned"],
    ].forEach(([field, status, label]) => {
      if (item[field]) {
        addEvent({
          type: status === "cod_collected" ? "payment" : "fulfillment",
          status,
          label,
          note: item.title || item.name || item.sku || "",
          courierName: item.courierName || order.courierName || "",
          trackingNumber: item.trackingNumber || order.trackingNumber || "",
          createdAt: item[field],
        });
      }
    });
  });

  const unique = new Map();
  events
    .sort((left, right) => getEventTime(left) - getEventTime(right))
    .forEach((event) => {
      const key = [
        event.type,
        event.status,
        event.label,
        event.note,
        getEventTime(event).toISOString(),
      ].join("|");
      if (!unique.has(key)) unique.set(key, event);
    });

  return [...unique.values()];
};

const buildCodReconciliation = (order = {}) => {
  const products = order.products || [];
  const codItems = products.filter((product) => product.itemStatus !== "cancelled");
  const allItemsCollected =
    codItems.length > 0 && codItems.every((product) => product.codCollected === true);
  const anyItemCollected = products.some((product) => product.codCollected === true);
  const dispatched =
    ["shipped", "partially_shipped", "delivered", "partially_delivered"].includes(order.status) ||
    products.some((product) => ["shipped", "delivered"].includes(product.itemStatus));
  const collected =
    order.codCollectionStatus === "collected" ||
    order.codCollected === true ||
    allItemsCollected ||
    anyItemCollected;
  const remitted =
    order.codRemittanceStatus === "remitted" ||
    order.codRemitted === true ||
    Boolean(order.codRemittedAt || order.vendorRemittedAt);
  const discrepancyAmount = Number(order.codDiscrepancyAmount || 0);
  const hasDiscrepancy =
    discrepancyAmount > 0 ||
    order.codCollectionStatus === "discrepancy" ||
    (collected && !remitted && hoursBetween(order.codCollectedAt || order.updatedAt || order.createdAt) > 72);

  let reconciliationStatus = "pending_dispatch";
  if (dispatched) reconciliationStatus = "dispatched";
  if (collected) reconciliationStatus = "collected";
  if (remitted) reconciliationStatus = "remitted";
  if (hasDiscrepancy) reconciliationStatus = "discrepancy";

  return {
    reconciliationStatus,
    dispatched,
    collected,
    remitted,
    hasDiscrepancy,
    discrepancyAmount,
  };
};

const getAdminActorId = (req) => req.user?.uid || req.dbUser?._id?.toString?.() || "admin";

const updateVendorOrderSnapshots = async (db, orderId, update) => {
  if (!db?.collection) return;
  const vendorOrders = db.collection("vendorOrders");
  if (!vendorOrders?.updateMany) return;
  await vendorOrders.updateMany({ parentOrderId: normalizeId(orderId) }, update);
};

const getAdminOrders = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection?.db;
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
      page = 1,
      limit = 20,
    } = req.query;
    const result = await Order.findAllPaginated({
      status,
      vendorId,
      from: from || dateFrom,
      to: to || dateTo,
      search,
      paymentMethod,
      deliveryZone,
      page,
      limit,
    });

    const orders = await enrichAdminOrdersWithVendors(db, result.orders || []);

    res.json({
      success: true,
      ...result,
      orders,
      data: orders,
      filters: { status, vendorId, from: from || dateFrom, to: to || dateTo, search, paymentMethod, deliveryZone },
    });
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
    const db = req.app.locals.db || Order.collection?.db;
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

    let enrichedOrder = order;
    if (db) {
      const [enriched] = await enrichAdminOrdersWithVendors(db, [order]);
      enrichedOrder = enriched || order;
    }

    const perVendorBreakdown = enrichedOrder.perVendorBreakdown?.length
      ? enrichedOrder.perVendorBreakdown
      : Object.values(vendorMap).map((v) => ({
          ...v,
          shopName: null,
          grossSales: round2(v.grossSales),
          totalCommission: round2(v.totalCommission),
          netEarnings: round2(v.netEarnings),
        }));

    let persistedEvents = [];
    try {
      persistedEvents = await getTimelineForOrder(req.app, id);
    } catch (_) {
      persistedEvents = [];
    }
    const timeline = buildAdminOrderTimeline(enrichedOrder, persistedEvents);

    res.json({
      success: true,
      data: {
        ...enrichedOrder,
        totalCommission: round2(totalCommission),
        totalVendorEarnings: round2(totalVendorEarnings),
        perVendorBreakdown,
        statusHistory: order.statusHistory || [],
        notes: order.notes || [],
        timeline,
        codReconciliation: isCodPayment(order.paymentMethod)
          ? buildCodReconciliation(order)
          : null,
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
    const db = req.app.locals.db || Order.collection?.db;
    const { status, vendorId, from, to, dateFrom, dateTo, search, paymentMethod, deliveryZone } = req.query;
    const result = await Order.findAllPaginated({
      status,
      vendorId,
      from: from || dateFrom,
      to: to || dateTo,
      search,
      paymentMethod,
      deliveryZone,
      page: 1,
      limit: 10000,
    });
    const orders = await enrichAdminOrdersWithVendors(db, result.orders || []);

    const rows = orders.map(o => [
      o._id.toString(),
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
      o.status,
      (o.vendorNames || getOrderVendorNames(o)).join(" | "),
      o.paymentMethod,
      o.paymentStatus,
      getDeliveryZone(o),
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
      isCodPayment(o.paymentMethod) ? buildCodReconciliation(o).reconciliationStatus : '',
    ]);

    const header = 'OrderId,CreatedAt,Status,Vendors,PaymentMethod,PaymentStatus,DeliveryZone,CustomerName,Email,Phone,Address,City,ItemCount,Subtotal,Discount,Delivery,Total,CouponCode,CodReconciliation';
    const csv = [header, ...rows.map(r => r.map(csvValue).join(','))].join('\n');

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
    const db = req.app.locals.db || Order.collection?.db;
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
          adminActions: {
            type: "force_cancel",
            label: "Order force-cancelled",
            actorId: getAdminActorId(req),
            note: reason || "Cancelled by admin",
            createdAt: new Date(),
          },
        },
      }
    );

    await updateVendorOrderSnapshots(db, id, {
      $set: { status: "cancelled", paymentStatus: order.paymentStatus === "paid" ? "refund_pending" : "cancelled", updatedAt: new Date() },
    });

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status: "cancelled",
      label: "Order force-cancelled",
      actorId: getAdminActorId(req),
      actorRole: "admin",
      note: reason || "Cancelled by admin",
    });

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

    const validStatuses = [
      "pending",
      "processing",
      "packed",
      "ready_to_ship",
      "pickup_ready",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
      "return_requested",
    ];
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

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status,
      label: `Order ${status}`,
      actorId: req.user?.uid || "admin",
      actorRole: "admin",
      note: note || "Status overridden by admin",
    });

    res.json({ success: true, message: `Order status overridden to "${status}"` });
  } catch (error) {
    console.error("Error in adminOverrideStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const loadAdminAnalysisOrders = async (req, fallbackLimit = 500) => {
  const Order = req.app.locals.models.Order;
  const db = req.app.locals.db || Order.collection?.db;
  const limit = Math.min(Number(req.query.limit || fallbackLimit) || fallbackLimit, 2000);
  const orders = await Order.collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return enrichAdminOrdersWithVendors(db, orders);
};

const getAdminCodReconciliation = async (req, res) => {
  try {
    const orders = (await loadAdminAnalysisOrders(req)).filter((order) => isCodPayment(order.paymentMethod));
    const rows = orders.map((order) => {
      const reconciliation = buildCodReconciliation(order);
      return {
        orderId: normalizeId(order._id),
        createdAt: order.createdAt,
        status: order.status,
        vendorNames: order.vendorNames || getOrderVendorNames(order),
        customerName: order.shippingInfo?.name || "",
        customerPhone: order.shippingInfo?.phone || "",
        deliveryZone: getDeliveryZone(order),
        total: Number(order.total || 0),
        codCollectedAt: order.codCollectedAt || null,
        codRemittedAt: order.codRemittedAt || order.vendorRemittedAt || null,
        ...reconciliation,
      };
    });

    const summary = rows.reduce(
      (memo, row) => {
        memo.totalCod += 1;
        memo.codValue += row.total;
        if (row.dispatched) memo.dispatched += 1;
        if (row.collected) memo.collected += 1;
        if (row.remitted) memo.remitted += 1;
        if (row.hasDiscrepancy) memo.discrepancies += 1;
        return memo;
      },
      { totalCod: 0, codValue: 0, dispatched: 0, collected: 0, remitted: 0, discrepancies: 0 },
    );

    summary.codValue = Math.round(summary.codValue * 100) / 100;
    res.json({ success: true, data: { summary, orders: rows } });
  } catch (error) {
    console.error("Error in getAdminCodReconciliation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAdminSlaBreaches = async (req, res) => {
  try {
    const processingHours = Number(req.query.processingHours || 48);
    const deliveryHours = Number(req.query.deliveryHours || 120);
    const now = new Date();
    const terminalStatuses = ["delivered", "cancelled", "returned"];
    const shippedStatuses = ["shipped", "partially_shipped", "delivered", "partially_delivered"];
    const orders = await loadAdminAnalysisOrders(req);

    const breaches = orders
      .flatMap((order) => {
        const orderBreaches = [];
        const processingDeadline =
          dateOrNull(order.processingSlaDeadline) ||
          (dateOrNull(order.createdAt)
            ? new Date(dateOrNull(order.createdAt).getTime() + processingHours * 60 * 60 * 1000)
            : null);
        const hasShipped = shippedStatuses.includes(order.status) ||
          (order.products || []).some((product) => dateOrNull(product.shippedAt));

        if (
          processingDeadline &&
          now > processingDeadline &&
          !terminalStatuses.includes(order.status) &&
          !hasShipped
        ) {
          orderBreaches.push({
            breachType: "processing",
            breachHours: hoursBetween(processingDeadline, now),
            deadline: processingDeadline,
          });
        }

        const shippedAt =
          dateOrNull(order.shippedAt) ||
          dateOrNull(order.courierAssignedAt) ||
          (order.products || []).map((product) => dateOrNull(product.shippedAt)).filter(Boolean).sort((a, b) => a - b)[0];
        const deliveryDeadline =
          dateOrNull(order.deliverySlaDeadline) ||
          (shippedAt ? new Date(shippedAt.getTime() + deliveryHours * 60 * 60 * 1000) : null);

        if (
          deliveryDeadline &&
          now > deliveryDeadline &&
          ["shipped", "partially_shipped"].includes(order.status)
        ) {
          orderBreaches.push({
            breachType: "delivery",
            breachHours: hoursBetween(deliveryDeadline, now),
            deadline: deliveryDeadline,
          });
        }

        return orderBreaches.map((breach) => ({
          orderId: normalizeId(order._id),
          createdAt: order.createdAt,
          status: order.status,
          vendorNames: order.vendorNames || getOrderVendorNames(order),
          customerName: order.shippingInfo?.name || "",
          deliveryZone: getDeliveryZone(order),
          total: Number(order.total || 0),
          ...breach,
        }));
      })
      .sort((left, right) => right.breachHours - left.breachHours);

    const summary = breaches.reduce(
      (memo, breach) => {
        memo.total += 1;
        memo[breach.breachType] = (memo[breach.breachType] || 0) + 1;
        return memo;
      },
      { total: 0, processing: 0, delivery: 0 },
    );

    res.json({ success: true, data: { summary, breaches } });
  } catch (error) {
    console.error("Error in getAdminSlaBreaches:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getFraudAddressKey = (order = {}) => {
  const shippingInfo = order.shippingInfo || {};
  return [
    shippingInfo.phone,
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.upazila,
    shippingInfo.district || shippingInfo.city,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
};

const getFraudBuyerKey = (order = {}) => order.userId || order.shippingInfo?.phone || getFraudAddressKey(order);

const getAdminFraudOrders = async (req, res) => {
  try {
    const orders = await loadAdminAnalysisOrders(req);
    const now = new Date();
    const lastSevenDays = orders.filter((order) => hoursBetween(order.createdAt, now) <= 168);
    const orderAverage =
      orders.reduce((sum, order) => sum + Number(order.total || 0), 0) / Math.max(orders.length, 1);
    const abnormalThreshold = Number(req.query.abnormalAmount || Math.max(20000, orderAverage * 4));

    const addressCodCounts = lastSevenDays.reduce((memo, order) => {
      if (!isCodPayment(order.paymentMethod)) return memo;
      const key = getFraudAddressKey(order);
      if (!key) return memo;
      memo[key] = (memo[key] || 0) + 1;
      return memo;
    }, {});

    const buyerVelocityCounts = orders
      .filter((order) => hoursBetween(order.createdAt, now) <= 24)
      .reduce((memo, order) => {
        const key = getFraudBuyerKey(order);
        if (!key) return memo;
        memo[key] = (memo[key] || 0) + 1;
        return memo;
      }, {});

    const flaggedOrders = orders
      .map((order) => {
        const signals = [];
        const addressKey = getFraudAddressKey(order);
        const buyerKey = getFraudBuyerKey(order);

        if (isCodPayment(order.paymentMethod) && addressCodCounts[addressKey] >= 3) {
          signals.push({
            type: "multiple_cod_same_address",
            severity: "high",
            label: `${addressCodCounts[addressKey]} COD orders from same address in 7 days`,
          });
        }

        if (Number(order.total || 0) >= abnormalThreshold) {
          signals.push({
            type: "abnormal_order_size",
            severity: "medium",
            label: `Order value is ${Math.round(Number(order.total || 0) / Math.max(orderAverage, 1))}x average`,
          });
        }

        if (buyerVelocityCounts[buyerKey] >= 3) {
          signals.push({
            type: "velocity_check",
            severity: "medium",
            label: `${buyerVelocityCounts[buyerKey]} orders from buyer/contact in 24 hours`,
          });
        }

        if (signals.length === 0) return null;

        return {
          orderId: normalizeId(order._id),
          createdAt: order.createdAt,
          status: order.status,
          vendorNames: order.vendorNames || getOrderVendorNames(order),
          customerName: order.shippingInfo?.name || "",
          customerPhone: order.shippingInfo?.phone || "",
          deliveryZone: getDeliveryZone(order),
          paymentMethod: order.paymentMethod,
          total: Number(order.total || 0),
          signals,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.signals.length - left.signals.length);

    const summary = flaggedOrders.reduce(
      (memo, order) => {
        memo.totalFlagged += 1;
        order.signals.forEach((signal) => {
          memo.bySignal[signal.type] = (memo.bySignal[signal.type] || 0) + 1;
        });
        return memo;
      },
      { totalFlagged: 0, bySignal: {} },
    );

    res.json({ success: true, data: { summary, orders: flaggedOrders } });
  } catch (error) {
    console.error("Error in getAdminFraudOrders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const adminReassignCourier = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection?.db;
    const { id } = req.params;
    const orderObjectId = safeObjectId(id);
    const { courierName, trackingNumber = "", riderName = "", riderPhone = "", note = "" } = req.body;

    if (!orderObjectId) return res.status(400).json({ success: false, error: "Invalid order id" });
    if (!courierName || !String(courierName).trim()) {
      return res.status(400).json({ success: false, error: "courierName is required" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const now = new Date();
    const assignment = {
      courierName: String(courierName).trim(),
      trackingNumber: String(trackingNumber || "").trim(),
      riderName: String(riderName || "").trim(),
      riderPhone: String(riderPhone || "").trim(),
      assignedAt: now,
      assignedBy: getAdminActorId(req),
    };

    await Order.collection.updateOne(
      { _id: orderObjectId },
      {
        $set: {
          courierName: assignment.courierName,
          trackingNumber: assignment.trackingNumber,
          courierAssignment: assignment,
          courierAssignedAt: now,
          updatedAt: now,
        },
        $push: {
          courierUpdates: {
            status: "courier_reassigned",
            label: "Courier reassigned",
            ...assignment,
            note: String(note || "").trim(),
            createdAt: now,
          },
          adminActions: {
            type: "reassign_courier",
            label: "Courier reassigned",
            actorId: getAdminActorId(req),
            note: String(note || "").trim(),
            metadata: assignment,
            createdAt: now,
          },
        },
      },
    );

    await updateVendorOrderSnapshots(db, id, {
      $set: {
        courierName: assignment.courierName,
        trackingNumber: assignment.trackingNumber,
        courierAssignment: assignment,
        updatedAt: now,
      },
    });

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status: "courier_reassigned",
      label: "Courier reassigned",
      actorId: getAdminActorId(req),
      actorRole: "admin",
      courierName: assignment.courierName,
      trackingNumber: assignment.trackingNumber,
      note,
    });

    res.json({ success: true, message: "Courier reassigned", data: assignment });
  } catch (error) {
    console.error("Error in adminReassignCourier:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const adminChangeDeliveryAddress = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection?.db;
    const { id } = req.params;
    const orderObjectId = safeObjectId(id);
    const { shippingInfo, note = "" } = req.body;

    if (!orderObjectId) return res.status(400).json({ success: false, error: "Invalid order id" });
    if (!shippingInfo || typeof shippingInfo !== "object" || Array.isArray(shippingInfo)) {
      return res.status(400).json({ success: false, error: "shippingInfo object is required" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const now = new Date();
    const updatedShippingInfo = {
      ...(order.shippingInfo || {}),
      ...shippingInfo,
    };

    await Order.collection.updateOne(
      { _id: orderObjectId },
      {
        $set: {
          shippingInfo: updatedShippingInfo,
          deliveryZone: getDeliveryZone({ shippingInfo: updatedShippingInfo }),
          updatedAt: now,
        },
        $push: {
          adminActions: {
            type: "change_delivery_address",
            label: "Delivery address changed",
            actorId: getAdminActorId(req),
            note: String(note || "").trim(),
            metadata: {
              previousShippingInfo: order.shippingInfo || {},
              shippingInfo: updatedShippingInfo,
            },
            createdAt: now,
          },
        },
      },
    );

    await updateVendorOrderSnapshots(db, id, {
      $set: {
        shippingInfo: updatedShippingInfo,
        updatedAt: now,
      },
    });

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status: "delivery_address_changed",
      label: "Delivery address changed",
      actorId: getAdminActorId(req),
      actorRole: "admin",
      note,
      metadata: { deliveryZone: getDeliveryZone({ shippingInfo: updatedShippingInfo }) },
    });

    res.json({ success: true, message: "Delivery address updated", data: updatedShippingInfo });
  } catch (error) {
    console.error("Error in adminChangeDeliveryAddress:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const adminExtendReturnWindow = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { id } = req.params;
    const orderObjectId = safeObjectId(id);
    const { returnWindowUntil, expiresAt, note = "" } = req.body;
    const until = dateOrNull(returnWindowUntil || expiresAt);

    if (!orderObjectId) return res.status(400).json({ success: false, error: "Invalid order id" });
    if (!until) return res.status(400).json({ success: false, error: "A valid return window date is required" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const now = new Date();
    const returnWindow = {
      ...(order.returnWindow || {}),
      expiresAt: until,
      extendedAt: now,
      extendedBy: getAdminActorId(req),
      note: String(note || "").trim(),
    };

    await Order.collection.updateOne(
      { _id: orderObjectId },
      {
        $set: {
          returnWindow,
          returnWindowExpiresAt: until,
          updatedAt: now,
        },
        $push: {
          adminActions: {
            type: "extend_return_window",
            label: "Return window extended",
            actorId: getAdminActorId(req),
            note: String(note || "").trim(),
            metadata: { expiresAt: until },
            createdAt: now,
          },
        },
      },
    );

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status: "return_window_extended",
      label: "Return window extended",
      actorId: getAdminActorId(req),
      actorRole: "admin",
      note,
      metadata: { expiresAt: until },
    });

    res.json({ success: true, message: "Return window extended", data: returnWindow });
  } catch (error) {
    console.error("Error in adminExtendReturnWindow:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const adminForceRefundOrder = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db || Order.collection?.db;
    const { id } = req.params;
    const orderObjectId = safeObjectId(id);
    const { amount, reason = "", method = "manual" } = req.body;

    if (!orderObjectId) return res.status(400).json({ success: false, error: "Invalid order id" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const refundAmount = Number(amount || order.total || 0);
    if (refundAmount <= 0) {
      return res.status(400).json({ success: false, error: "Refund amount must be greater than 0" });
    }

    const now = new Date();
    const refundEvent = {
      status: "refunded",
      label: "Refund forced by admin",
      amount: refundAmount,
      method,
      note: String(reason || "").trim(),
      actorId: getAdminActorId(req),
      actorRole: "admin",
      createdAt: now,
    };

    await Order.collection.updateOne(
      { _id: orderObjectId },
      {
        $set: {
          refundApproved: true,
          refundApprovedAt: now,
          refundApprovedBy: getAdminActorId(req),
          refundStatus: "refunded",
          refundAmount,
          paymentStatus: "refunded",
          updatedAt: now,
        },
        $push: {
          paymentEvents: refundEvent,
          adminActions: {
            type: "force_refund",
            label: "Refund forced by admin",
            actorId: getAdminActorId(req),
            note: String(reason || "").trim(),
            metadata: { amount: refundAmount, method },
            createdAt: now,
          },
        },
      },
    );

    await updateVendorOrderSnapshots(db, id, {
      $set: {
        refundStatus: "refunded",
        refundAmount,
        paymentStatus: "refunded",
        updatedAt: now,
      },
    });

    await appendOrderEvent({
      app: req.app,
      orderId: id,
      status: "refunded",
      label: "Refund forced by admin",
      actorId: getAdminActorId(req),
      actorRole: "admin",
      note: reason,
      metadata: { amount: refundAmount, method },
    });

    res.json({ success: true, message: "Refund forced", data: { refundAmount, method } });
  } catch (error) {
    console.error("Error in adminForceRefundOrder:", error);
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
  getAdminCodReconciliation,
  getAdminSlaBreaches,
  getAdminFraudOrders,
  addOrderNote,
  regenerateInvoice,
  getUserOrders,
  getOrderTimelineEvents,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
  adminCancelOrder,
  adminResolveDispute,
  adminApproveRefund,
  adminOverrideStatus,
  adminReassignCourier,
  adminChangeDeliveryAddress,
  adminExtendReturnWindow,
  adminForceRefundOrder,
};
