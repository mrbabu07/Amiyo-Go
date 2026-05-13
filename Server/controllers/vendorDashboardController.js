const { ObjectId } = require("mongodb");

const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const dateKey = (date) => date.toISOString().slice(0, 10);

const getVendorForRequest = async (req) => {
  const Vendor = req.app.locals.models.Vendor;
  const User = req.app.locals.models.User;
  const user = await User.findByFirebaseUid(req.user.uid);
  if (!user) return { error: "User not found" };
  const vendor = await Vendor.findByUserId(user._id);
  if (!vendor) return { error: "Vendor not found" };
  return { user, vendor };
};

const getVendorOrderRows = async (db, vendorId) => {
  const orders = await db.collection("orders")
    .find({
      $or: [
        { "products.vendorId": vendorId },
        { "products.vendorId": new ObjectId(vendorId) },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  return orders.map((order) => {
    const products = (order.products || []).filter(
      (product) => product.vendorId && product.vendorId.toString() === vendorId,
    );
    if (products.length === 0) return null;

    const gross = products.reduce(
      (sum, product) => sum + ((Number(product.price) || 0) * (Number(product.quantity) || 0)),
      0,
    );
    const commission = products.reduce(
      (sum, product) => sum + (Number(product.adminCommissionAmount) || 0),
      0,
    );
    const earnings = products.reduce(
      (sum, product) => sum + (
        Number(product.vendorEarningAmount) ||
        ((Number(product.price) || 0) * (Number(product.quantity) || 0))
      ),
      0,
    );
    const deliveredEarnings = products.reduce((sum, product) => {
      if ((product.itemStatus || order.status) !== "delivered") return sum;
      return sum + (
        Number(product.vendorEarningAmount) ||
        ((Number(product.price) || 0) * (Number(product.quantity) || 0))
      );
    }, 0);
    const statuses = products.map((product) => product.itemStatus || order.status || "pending");
    const status = statuses.every((value) => value === "delivered")
      ? "delivered"
      : statuses.every((value) => value === "cancelled")
        ? "cancelled"
        : statuses.includes("shipped")
          ? "shipped"
          : statuses.some((value) => ["processing", "packed"].includes(value))
            ? "processing"
            : "pending";

    return {
      order,
      products,
      status,
      gross: round2(gross),
      commission: round2(commission),
      earnings: round2(earnings),
      deliveredEarnings: round2(deliveredEarnings),
      createdAt: new Date(order.createdAt || Date.now()),
    };
  }).filter(Boolean);
};

const buildDailySales = (rows, days = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    buckets.push({
      key: dateKey(day),
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      amount: 0,
      orders: 0,
    });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  rows.forEach((row) => {
    if (row.status !== "delivered") return;
    const key = dateKey(row.createdAt);
    const bucket = byKey.get(key);
    if (!bucket) return;
    bucket.amount += row.deliveredEarnings;
    bucket.orders += 1;
  });

  return buckets.map((bucket) => ({
    ...bucket,
    amount: round2(bucket.amount),
  }));
};

const getVendorRatingStats = async (db, vendorId) => {
  const productIds = await db.collection("products")
    .find({ vendorId }, { projection: { _id: 1 } })
    .toArray();
  const ids = productIds.map((product) => product._id);
  if (ids.length === 0) {
    return { avgRating: 0, totalReviews: 0 };
  }

  const [stats] = await db.collection("reviews").aggregate([
    { $match: { productId: { $in: ids } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]).toArray();

  return {
    avgRating: round2(stats?.avgRating || 0),
    totalReviews: stats?.totalReviews || 0,
  };
};

// Get vendor dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const { vendor, error } = await getVendorForRequest(req);
    if (error) return res.status(404).json({ error });

    if (vendor.status !== "approved") {
      return res.status(403).json({ error: "Vendor not approved" });
    }

    const db = req.app.locals.db;
    const productsCollection = db.collection("products");

    // Get total products
    const totalProducts = await productsCollection.countDocuments({
      vendorId: vendor._id.toString(),
    });

    // Get low stock products
    const lowStockProducts = await productsCollection.countDocuments({
      vendorId: vendor._id.toString(),
      stock: { $lt: 10 },
    });

    const vendorId = vendor._id.toString();
    const orderRows = await getVendorOrderRows(db, vendorId);
    
    const totalOrders = orderRows.length;
    const pendingOrders = orderRows.filter((row) => row.status === "pending").length;
    const totalRevenue = orderRows.reduce((sum, row) => sum + row.deliveredEarnings, 0);

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 7);
    const previousStart = new Date(now);
    previousStart.setDate(now.getDate() - 14);
    const currentRevenue = orderRows
      .filter((row) => row.status === "delivered" && row.createdAt >= currentStart)
      .reduce((sum, row) => sum + row.deliveredEarnings, 0);
    const previousRevenue = orderRows
      .filter((row) => row.status === "delivered" && row.createdAt >= previousStart && row.createdAt < currentStart)
      .reduce((sum, row) => sum + row.deliveredEarnings, 0);
    const revenueGrowth = previousRevenue > 0
      ? round2(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : (currentRevenue > 0 ? 100 : 0);

    const { avgRating, totalReviews } = await getVendorRatingStats(db, vendorId);

    const dailySales = buildDailySales(orderRows, 7);
    const salesChart = {
      labels: dailySales.map((day) => day.label),
      data: dailySales.map((day) => day.amount),
      orders: dailySales.map((day) => day.orders),
    };

    const stats = {
      totalRevenue: round2(totalRevenue),
      revenueGrowth,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      avgRating,
      totalReviews,
      salesChart,
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

// Get vendor orders (from parent orders collection, filtered by vendor items)
exports.getVendorOrders = async (req, res) => {
  try {
    const { limit = 100, page = 1, status, vendorId: requestedVendorId } = req.query;
    const Vendor = req.app.locals.models.Vendor;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;

    let vendor = null;
    if (req.user?.role === "admin" && requestedVendorId) {
      vendor = await Vendor.findById(requestedVendorId);
    } else {
      const user = await User.findByFirebaseUid(req.user.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      vendor = await Vendor.findByUserId(user._id);
    }

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorId = vendor._id.toString();
    console.log('\n🔍 VENDOR ORDERS DEBUG');
    console.log('   Vendor ID:', vendorId);
    console.log('   Vendor Shop:', vendor.shopName);
    
    const db = req.app.locals.db;
    const ordersCollection = db.collection("orders");
    const productsCollection = db.collection("products");

    // First, check total orders in database
    const totalOrders = await ordersCollection.countDocuments({});
    console.log('   Total orders in DB:', totalOrders);

    // Build query to find orders containing vendor's items
    // Try both string and ObjectId formats
    const query = {
      $or: [
        { "products.vendorId": vendorId },
        { "products.vendorId": vendor._id }
      ]
    };

    console.log('   Query:', JSON.stringify(query));

    // Get all orders containing vendor's items
    const allOrders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log('   Orders found with vendorId:', allOrders.length);

    // If no orders found, check if there are orders with products from this vendor
    if (allOrders.length === 0) {
      console.log('   ⚠️  No orders found with vendorId in products array');
      
      // Check vendor's products
      const vendorProducts = await productsCollection.find({ vendorId }).limit(5).toArray();
      console.log('   Vendor has', vendorProducts.length, 'products');
      
      if (vendorProducts.length > 0) {
        console.log('   Sample product IDs:', vendorProducts.map(p => p._id.toString()).slice(0, 3));
        
        // Check if any orders contain these products
        const productIds = vendorProducts.map(p => p._id.toString());
        const ordersWithProducts = await ordersCollection.find({
          "products.productId": { $in: productIds }
        }).limit(5).toArray();
        
        console.log('   Orders containing vendor products:', ordersWithProducts.length);
        
        if (ordersWithProducts.length > 0) {
          console.log('   ⚠️  Orders exist but vendorId not set on products!');
          console.log('   Sample order products:', JSON.stringify(ordersWithProducts[0].products[0], null, 2));
        }
      }
    }

    // Filter and transform orders to show only vendor's items
    let vendorOrders = allOrders.map(order => {
      const vendorProducts = (order.products || []).filter(
        p => p.vendorId && p.vendorId.toString() === vendorId
      );

      if (vendorProducts.length === 0) return null;

      // Calculate vendor-specific totals
      const vendorSubtotal = vendorProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const vendorCommission = vendorProducts.reduce((sum, p) => sum + (p.adminCommissionAmount || 0), 0);
      const vendorEarnings = vendorProducts.reduce((sum, p) => sum + (p.vendorEarningAmount || 0), 0);

      // Determine vendor-specific order status from item statuses
      const itemStatuses = vendorProducts.map(p => p.itemStatus || 'pending');
      let vendorOrderStatus = 'pending';
      
      if (itemStatuses.every(s => s === 'delivered')) {
        vendorOrderStatus = 'delivered';
      } else if (itemStatuses.some(s => s === 'shipped')) {
        vendorOrderStatus = 'shipped';
      } else if (itemStatuses.some(s => s === 'processing' || s === 'packed')) {
        vendorOrderStatus = 'processing';
      } else if (itemStatuses.every(s => s === 'cancelled')) {
        vendorOrderStatus = 'cancelled';
      }

      return {
        _id: order._id,
        parentOrderId: order._id,
        vendorId,
        products: vendorProducts,
        shippingInfo: order.shippingInfo,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: vendorOrderStatus, // Vendor-specific status
        overallOrderStatus: order.status, // Full order status
        cancelledAt: order.cancelledAt,
        cancelledBy: order.cancelledBy,
        cancelledByRole: order.cancelledByRole,
        cancellationSource: order.cancellationSource,
        cancellationMessage: order.cancellationMessage,
        statusHistory: order.statusHistory || [],
        vendorSubtotal,
        vendorCommission,
        vendorEarnings,
        totalAmount: vendorSubtotal, // Add totalAmount for display
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        isPartialOrder: vendorProducts.length < (order.products || []).length,
      };
    }).filter(Boolean);

    // Apply status filter if provided
    if (status && status !== 'all') {
      vendorOrders = vendorOrders.filter(o => o.status === status);
    }

    // Populate product details
    for (let order of vendorOrders) {
      if (order.products && Array.isArray(order.products)) {
        for (let item of order.products) {
          if (item.productId) {
            const product = await productsCollection.findOne({ 
              _id: typeof item.productId === 'string' 
                ? new ObjectId(item.productId) 
                : item.productId 
            });
            if (product) {
              item.productDetails = product;
            }
          }
        }
      }
    }

    // Pagination
    const total = vendorOrders.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = vendorOrders.slice(startIndex, endIndex);

    console.log('   ✅ Returning', paginatedOrders.length, 'orders to vendor\n');

    res.json({
      success: true,
      orders: paginatedOrders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching vendor orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const validStatuses = ["pending", "processing", "packed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorId = vendor._id.toString();

    // Get the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if vendor has items in this order
    const vendorItems = (order.products || []).filter(
      p => p.vendorId === vendorId || (p.vendorId && p.vendorId.toString() === vendorId)
    );

    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    // Update item statuses for vendor's products
    const ordersCollection = db.collection("orders");
    const now = new Date();
    const timestampFields = {
      ...(status === "processing" ? { "products.$[elem].processingAt": now } : {}),
      ...(status === "packed" ? { "products.$[elem].packedAt": now } : {}),
      ...(status === "shipped" ? { "products.$[elem].shippedAt": now } : {}),
      ...(status === "delivered" ? { "products.$[elem].deliveredAt": now } : {}),
      ...(status === "cancelled" ? { "products.$[elem].cancelledAt": now } : {}),
    };

    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": status,
          "products.$[elem].statusUpdatedAt": now,
          ...timestampFields,
        }
      },
      {
        arrayFilters: [{ 
          $or: [
            { "elem.vendorId": vendorId },
            { "elem.vendorId": vendor._id }
          ]
        }]
      }
    );

    const updatedOrder = await Order.findById(orderId);
    const updatedVendorProducts = (updatedOrder?.products || []).filter(
      (p) => p.vendorId && p.vendorId.toString() === vendorId,
    );
    const vendorOrder = (await VendorOrder.findByParentOrderId(orderId)).find(
      (vo) => vo.vendorId === vendorId,
    );
    if (vendorOrder) {
      await VendorOrder.updateStatus(vendorOrder._id.toString(), status, {
        products: updatedVendorProducts,
        ...(status === "processing" ? { processingAt: now } : {}),
        ...(status === "packed" ? { packedAt: now } : {}),
        ...(status === "shipped" ? { shippedAt: now } : {}),
        ...(status === "delivered" ? { deliveredAt: now } : {}),
        ...(status === "cancelled" ? { cancelledAt: now } : {}),
      });
    }

    // Sync overall order status
    await Order.syncOrderStatus(orderId);

    res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

// Get top selling products
exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const db = req.app.locals.db;
    const productsCollection = db.collection("products");

    // Get products sorted by views (or sales when implemented)
    const products = await productsCollection
      .find({ vendorId: vendor._id.toString() })
      .sort({ views: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
};

exports.getVendorReports = async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { vendor, error } = await getVendorForRequest(req);
    if (error) return res.status(404).json({ error });

    const db = req.app.locals.db;
    const vendorId = vendor._id.toString();
    const orderRows = await getVendorOrderRows(db, vendorId);
    const salesData = buildDailySales(orderRows, period === "month" ? 30 : 7);
    const productDocs = await db.collection("products")
      .find({ vendorId })
      .project({ _id: 1, title: 1, name: 1, views: 1, stock: 1, isActive: 1, createdAt: 1 })
      .toArray();

    const monthlyMap = new Map();
    orderRows
      .filter((row) => row.status === "delivered")
      .forEach((row) => {
        const key = row.createdAt.toISOString().slice(0, 7);
        const label = row.createdAt.toLocaleDateString("en-US", { month: "short" });
        const item = monthlyMap.get(key) || { key, month: label, amount: 0, orders: 0 };
        item.amount += row.deliveredEarnings;
        item.orders += 1;
        monthlyMap.set(key, item);
      });

    const productStats = new Map();
    orderRows.forEach((row) => {
      row.products.forEach((product) => {
        const key = (product.productId || product._id || product.title || product.name || "").toString();
        if (!key) return;
        const current = productStats.get(key) || {
          productId: key,
          name: product.title || product.name || "Product",
          sold: 0,
          revenue: 0,
          views: 0,
          rating: 0,
        };
        current.sold += Number(product.quantity) || 0;
        current.revenue += (Number(product.vendorEarningAmount) || ((Number(product.price) || 0) * (Number(product.quantity) || 0)));
        productStats.set(key, current);
      });
    });

    const productIds = [...productStats.keys()]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const [products, reviewRows] = await Promise.all([
      productIds.length
        ? db.collection("products").find({ _id: { $in: productIds } }).toArray()
        : [],
      productIds.length
        ? db.collection("reviews").aggregate([
            { $match: { productId: { $in: productIds } } },
            { $group: { _id: "$productId", avgRating: { $avg: "$rating" } } },
          ]).toArray()
        : [],
    ]);
    const productMeta = new Map(products.map((product) => [product._id.toString(), product]));
    const reviewMeta = new Map(reviewRows.map((row) => [row._id.toString(), round2(row.avgRating)]));

    const topProducts = [...productStats.values()]
      .map((product) => {
        const meta = productMeta.get(product.productId);
        return {
          ...product,
          name: meta?.title || product.name,
          views: meta?.views || 0,
          rating: reviewMeta.get(product.productId) || 0,
          revenue: round2(product.revenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const summary = {
      totalSales: round2(orderRows.reduce((sum, row) => sum + row.deliveredEarnings, 0)),
      totalOrders: orderRows.length,
      deliveredOrders: orderRows.filter((row) => row.status === "delivered").length,
      cancelledOrders: orderRows.filter((row) => row.status === "cancelled").length,
      averageOrderValue: round2(
        orderRows.filter((row) => row.status === "delivered").length
          ? orderRows
              .filter((row) => row.status === "delivered")
              .reduce((sum, row) => sum + row.deliveredEarnings, 0) /
            orderRows.filter((row) => row.status === "delivered").length
          : 0,
      ),
    };

    const totalViews = productDocs.reduce((sum, product) => sum + Number(product.views || 0), 0);
    const productsWithViews = productDocs.filter((product) => Number(product.views || 0) > 0);
    const activeProducts = productDocs.filter((product) => product.isActive !== false);
    const zeroViewProducts = productDocs.filter((product) => Number(product.views || 0) === 0);
    const topViewedProducts = [...productDocs]
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, 5)
      .map((product) => ({
        productId: product._id.toString(),
        name: product.title || product.name || "Product",
        views: Number(product.views || 0),
        stock: Number(product.stock || 0),
      }));

    const visibilityStats = {
      totalViews,
      activeListings: activeProducts.length,
      productsWithViews: productsWithViews.length,
      zeroViewProducts: zeroViewProducts.length,
      averageViewsPerProduct: round2(
        productDocs.length ? totalViews / productDocs.length : 0,
      ),
      topViewedProducts,
    };

    res.json({
      success: true,
      data: {
        summary,
        salesData,
        monthlyData: [...monthlyMap.values()].map((row) => ({ ...row, amount: round2(row.amount) })),
        topProducts,
        trafficSources: [
          { label: "Product Views", value: totalViews, unit: "views" },
          { label: "Active Listings", value: activeProducts.length, unit: "products" },
          { label: "Viewed Products", value: productsWithViews.length, unit: "products" },
          { label: "Zero-View Products", value: zeroViewProducts.length, unit: "products" },
        ],
        visibilityStats,
        trafficMessage: productDocs.length
          ? "Visibility metrics are based on real product views and active listings."
          : "Add products to start tracking visibility metrics.",
      },
    });
  } catch (error) {
    console.error("Error fetching vendor reports:", error);
    res.status(500).json({ error: "Failed to fetch vendor reports" });
  }
};

// ─── Vendor: Single order detail ─────────────────────────────
exports.getVendorOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    // Get vendor-specific items from parent order
    const orderData = await Order.getVendorItems(orderId, vendorId);
    if (!orderData) {
      return res.status(404).json({ error: "Order not found or no items for this vendor" });
    }

    // Enrich products with full product details
    const productsCollection = db.collection("products");
    const enrichedProducts = [];
    if (orderData.products && Array.isArray(orderData.products)) {
      for (const item of orderData.products) {
        let productDetails = null;
        if (item.productId) {
          try {
            const { ObjectId } = require("mongodb");
            productDetails = await productsCollection.findOne({
              _id: typeof item.productId === "string" ? new ObjectId(item.productId) : item.productId,
            });
          } catch (_) {}
        }
        enrichedProducts.push({ ...item, productDetails });
      }
    }

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    res.json({
      success: true,
      data: {
        ...orderData,
        products: enrichedProducts,
        vendorSubtotal: round2(orderData.vendorSubtotal),
        vendorCommission: round2(orderData.vendorCommission),
        vendorEarnings: round2(orderData.vendorEarnings),
        statusHistory: orderData.statusHistory || [],
      },
    });
  } catch (error) {
    console.error("Error in getVendorOrderDetail:", error);
    res.status(500).json({ error: "Failed to fetch order detail" });
  }
};

// ─── Vendor: Finance stats ────────────────────────────────────
exports.getVendorOrderStats = async (req, res) => {
  try {
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const stats = await VendorOrder.getVendorOrderStats(vendor._id.toString());
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error in getVendorOrderStats:", error);
    res.status(500).json({ error: "Failed to fetch vendor order stats" });
  }
};

// ─── Vendor: Pack items ────────────────────────────────────────
exports.packVendorItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") return res.status(403).json({ error: "Vendor not approved" });

    const vendorId = vendor._id.toString();

    // Find the VendorOrder for this vendor
    const vendorOrders = await VendorOrder.findByParentOrderId(orderId);
    const myVendorOrder = vendorOrders.find((vo) => vo.vendorId === vendorId);
    if (!myVendorOrder) return res.status(404).json({ error: "Order not found for this vendor" });

    // Check parent order exists
    const parentOrder = await Order.findById(orderId);
    if (!parentOrder) return res.status(404).json({ error: "Parent order not found" });

    // Verify vendor has items in this order
    const hasItems = (parentOrder.products || []).some((p) => p.vendorId === vendorId);
    if (!hasItems) return res.status(403).json({ error: "No items for this vendor in order" });

    // Update item statuses on parent order
    await Order.updateItemStatus(orderId, vendorId, "packed");
    await Order.syncOrderStatus(orderId);

    // Update VendorOrder status
    await VendorOrder.updateStatus(myVendorOrder._id.toString(), "packed");

    res.json({ success: true, message: "Items marked as packed" });
  } catch (error) {
    console.error("Error in packVendorItems:", error);
    res.status(500).json({ error: "Failed to pack items" });
  }
};

// ─── Vendor: Ship items ────────────────────────────────────────
exports.shipVendorItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber } = req.body;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ error: "trackingNumber is required for shipping" });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") return res.status(403).json({ error: "Vendor not approved" });

    const vendorId = vendor._id.toString();

    const vendorOrders = await VendorOrder.findByParentOrderId(orderId);
    const myVendorOrder = vendorOrders.find((vo) => vo.vendorId === vendorId);
    if (!myVendorOrder) return res.status(404).json({ error: "Order not found for this vendor" });

    const parentOrder = await Order.findById(orderId);
    if (!parentOrder) return res.status(404).json({ error: "Parent order not found" });

    const hasItems = (parentOrder.products || []).some((p) => p.vendorId === vendorId);
    if (!hasItems) return res.status(403).json({ error: "No items for this vendor in order" });

    // Update item statuses on parent order (with tracking number)
    await Order.updateItemStatus(orderId, vendorId, "shipped", trackingNumber.trim());
    await Order.syncOrderStatus(orderId);

    // Update VendorOrder with tracking info
    await VendorOrder.updateStatus(myVendorOrder._id.toString(), "shipped", {
      trackingNumber: trackingNumber.trim(),
      shippedAt: new Date(),
    });

    res.json({ success: true, message: "Items marked as shipped", trackingNumber: trackingNumber.trim() });
  } catch (error) {
    console.error("Error in shipVendorItems:", error);
    res.status(500).json({ error: "Failed to ship items" });
  }
};

// ─── Vendor: Deliver items ─────────────────────────────────────
exports.deliverVendorItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") return res.status(403).json({ error: "Vendor not approved" });

    const vendorId = vendor._id.toString();

    const vendorOrders = await VendorOrder.findByParentOrderId(orderId);
    const myVendorOrder = vendorOrders.find((vo) => vo.vendorId === vendorId);
    if (!myVendorOrder) return res.status(404).json({ error: "Order not found for this vendor" });

    const parentOrder = await Order.findById(orderId);
    if (!parentOrder) return res.status(404).json({ error: "Parent order not found" });

    const hasItems = (parentOrder.products || []).some((p) => p.vendorId === vendorId);
    if (!hasItems) return res.status(403).json({ error: "No items for this vendor in order" });

    await Order.updateItemStatus(orderId, vendorId, "delivered");
    await Order.syncOrderStatus(orderId);

    await VendorOrder.updateStatus(myVendorOrder._id.toString(), "delivered", {
      deliveredAt: new Date(),
    });

    res.json({ success: true, message: "Items marked as delivered" });
  } catch (error) {
    console.error("Error in deliverVendorItems:", error);
    res.status(500).json({ error: "Failed to mark items as delivered" });
  }
};

module.exports = exports;

