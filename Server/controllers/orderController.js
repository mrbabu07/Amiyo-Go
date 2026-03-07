const emailService = require("../services/emailService");
const invoiceService = require("../services/invoiceService");

const getAllOrders = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const orders = await Order.findAll();

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    const extendedOrders = orders.map(order => {
      let totalCommission = 0;
      let totalVendorEarnings = 0;
      const vendorMap = {};

      if (order.products && Array.isArray(order.products)) {
        for (const product of order.products) {
          const adminComm = product.adminCommissionAmount || 0;
          const vendorEarn = product.vendorEarningAmount || 0;
          const vId = product.vendorId || 'platform';
          
          totalCommission += adminComm;
          totalVendorEarnings += vendorEarn;
          
          if (!vendorMap[vId]) {
            vendorMap[vId] = {
              vendorId: vId === 'platform' ? null : vId,
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
    const {
      products,
      total,
      shippingInfo,
      paymentMethod,
      transactionId,
      specialInstructions,
      couponCode,
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
      !shippingInfo.city
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

      // Add vendorId and categoryId to product item (categoryId needed for commission calculation)
      productsWithVendor.push({
        ...item,
        vendorId: product.vendorId || null,
        categoryId: product.categoryId || null,
      });
    }

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

      // Calculate proportional delivery charge
      const vendorDeliveryCharge = (vendorSubtotal / createdOrder.subtotal) * createdOrder.deliveryCharge;

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
    const { id } = req.params;
    const userId = req.user.uid;

    // Get order details before cancelling
    const order = await Order.findById(id);

    await Order.cancelOrder(id, userId);

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
      orderIds.map(id => Order.updateStatus(id, status, req.user?.uid, note || ''))
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
