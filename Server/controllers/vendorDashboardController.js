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

// Get vendor orders (from parent orders collection, filtered by vendor items)
exports.getVendorOrders = async (req, res) => {
  try {
    const { limit = 100, page = 1, status } = req.query;
    const Vendor = req.app.locals.models.Vendor;
    const Order = req.app.locals.models.Order;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
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
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

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
    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": status,
          "products.$[elem].statusUpdatedAt": new Date(),
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

