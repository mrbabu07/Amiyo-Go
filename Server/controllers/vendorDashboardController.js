const { ObjectId } = require("mongodb");

// Get vendor dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const Product = req.app.locals.models.Product;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

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

    // Get vendor order stats
    const orderStats = await VendorOrder.getVendorStats(vendor._id.toString());
    
    let totalOrders = 0;
    let pendingOrders = 0;
    let totalRevenue = 0;

    orderStats.forEach(stat => {
      totalOrders += stat.count;
      if (stat._id === 'pending') {
        pendingOrders = stat.count;
      }
      if (stat._id === 'delivered') {
        totalRevenue += stat.totalAmount || 0;
      }
    });

    // Calculate revenue growth (mock for now - would need historical data)
    const revenueGrowth = 0;

    // Get average rating (mock data for now)
    const avgRating = 4.5;
    const totalReviews = 0;

    // Sales chart data (last 7 days)
    const salesChart = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [0, 0, 0, 0, 0, 0, 0], // Mock data
    };

    const stats = {
      totalRevenue,
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

// Get vendor orders
exports.getVendorOrders = async (req, res) => {
  try {
    const { limit = 20, page = 1, status } = req.query;
    const Vendor = req.app.locals.models.Vendor;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Fetch vendor orders from vendorOrders collection
    const result = await VendorOrder.findByVendorId(vendor._id.toString(), {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // Populate product details
    const db = req.app.locals.db;
    const productsCollection = db.collection("products");

    for (let order of result.orders) {
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

    res.json({
      success: true,
      orders: result.orders,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
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
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Verify order belongs to vendor
    const order = await VendorOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.vendorId !== vendor._id.toString()) {
      return res.status(403).json({ error: "Unauthorized to update this order" });
    }

    // Update order status
    await VendorOrder.updateStatus(orderId, status);

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

// ─── Vendor: Single order detail ─────────────────────────────
exports.getVendorOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const order = await VendorOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.vendorId !== vendor._id.toString()) {
      return res.status(403).json({ error: "Unauthorized to view this order" });
    }

    // Enrich products with full product details
    const productsCollection = db.collection("products");
    const enrichedProducts = [];
    if (order.products && Array.isArray(order.products)) {
      for (const item of order.products) {
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
    const totalCommission = enrichedProducts.reduce((s, p) => s + (p.adminCommissionAmount || 0), 0);
    const totalVendorEarnings = enrichedProducts.reduce((s, p) => s + (p.vendorEarningAmount || 0), 0);

    res.json({
      success: true,
      data: {
        ...order,
        products: enrichedProducts,
        totalCommission: round2(totalCommission),
        totalVendorEarnings: round2(totalVendorEarnings),
        statusHistory: order.statusHistory || [],
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

module.exports = exports;

