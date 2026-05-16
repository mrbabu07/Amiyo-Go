const { ObjectId } = require("mongodb");

const MANUAL_PAYMENT_METHODS = ["bkash", "nagad", "cod"];

const getAllPayments = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const payments = await Payment.findAll();
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserPayments = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const userId = req.user.uid;

    const payments = await Payment.findByUserId(userId);
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const { id } = req.params;
    const userId = req.user.uid;
    const isAdmin = req.dbUser?.role === "admin";

    const payment = await Payment.findById(id);

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Payment not found" });
    }

    // Users can only view their own payments, admins can view all
    if (!isAdmin && payment.userId !== userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const processPayment = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const userId = req.user.uid;
    const {
      orderId,
      amount,
      paymentMethod,
      currency = "bdt",
      // Stripe specific
      stripeToken,
      // bKash specific
      bkashNumber,
      bkashPin,
      // Nagad specific
      nagadNumber,
      nagadPin,
    } = req.body;

    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: "Order ID, amount, and payment method are required",
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findByOrderId(orderId);
    if (existingPayment && existingPayment.status === "completed") {
      return res.status(400).json({
        success: false,
        error: "Payment already completed for this order",
      });
    }

    const paymentData = {
      userId,
      orderId,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
    };

    let result;

    switch (paymentMethod) {
      case "stripe":
        if (!stripeToken) {
          return res.status(400).json({
            success: false,
            error: "Stripe token is required",
          });
        }
        paymentData.stripeToken = stripeToken;
        result = await Payment.processStripePayment(paymentData);
        break;

      case "bkash":
        if (!bkashNumber) {
          return res.status(400).json({
            success: false,
            error: "bKash number is required",
          });
        }
        paymentData.bkashNumber = bkashNumber;
        paymentData.bkashPin = bkashPin;
        result = await Payment.processBkashPayment(paymentData);
        break;

      case "nagad":
        if (!nagadNumber) {
          return res.status(400).json({
            success: false,
            error: "Nagad number is required",
          });
        }
        paymentData.nagadNumber = nagadNumber;
        paymentData.nagadPin = nagadPin;
        result = await Payment.processNagadPayment(paymentData);
        break;

      case "cod":
        result = await Payment.processCODPayment(paymentData);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid payment method",
        });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Update order status if payment is successful
    if (paymentMethod !== "cod") {
      const Order = req.app.locals.models.Order;
      await Order.updateStatus(orderId, "processing");
    }

    res.json({
      success: true,
      data: {
        paymentId: result.paymentId,
        transactionId: result.transactionId,
      },
      message: "Payment processed successfully",
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const { id } = req.params;
    const { status, transactionData = {} } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const validStatuses = [
      "pending",
      "processing",
      "completed",
      "failed",
      "refunded",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const result = await Payment.updateStatus(id, status, transactionData);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    res.json({
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const processRefund = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const { id } = req.params;
    const { refundAmount, reason = "" } = req.body;

    if (!refundAmount) {
      return res.status(400).json({
        success: false,
        error: "Refund amount is required",
      });
    }

    const result = await Payment.processRefund(
      id,
      parseFloat(refundAmount),
      reason,
    );

    res.json({
      success: true,
      data: { refundId: result.refundId },
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPaymentStats = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const stats = await Payment.getPaymentStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDuplicateTransactionMap = async (ordersCollection) => {
  const duplicates = await ordersCollection
    .aggregate([
      {
        $match: {
          transactionId: { $nin: [null, ""] },
          paymentMethod: { $in: ["bkash", "nagad"] },
        },
      },
      {
        $group: {
          _id: "$transactionId",
          count: { $sum: 1 },
          orderIds: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  return duplicates.reduce((map, item) => {
    map[item._id] = {
      count: item.count,
      orderIds: item.orderIds.map((id) => id.toString()),
    };
    return map;
  }, {});
};

const normalizeManualPayment = (order, duplicateMap) => {
  const duplicate = order.transactionId ? duplicateMap[order.transactionId] : null;

  return {
    orderId: order._id,
    orderNumber: order._id.toString().slice(-8).toUpperCase(),
    customerName: order.shippingInfo?.name || "Guest",
    customerEmail: order.shippingInfo?.email || "",
    customerPhone: order.shippingInfo?.phone || "",
    isGuest: Boolean(order.isGuest),
    amount: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    transactionId: order.transactionId || null,
    duplicate: Boolean(duplicate),
    duplicateCount: duplicate?.count || 0,
    duplicateOrderIds: duplicate?.orderIds || [],
    manualPaymentVerification: order.manualPaymentVerification || null,
    createdAt: order.createdAt,
  };
};

const getManualPaymentQueue = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const { status = "pending", method = "all", page = 1, limit = 50 } = req.query;
    const query = {
      paymentMethod: { $in: MANUAL_PAYMENT_METHODS },
    };

    if (method !== "all" && MANUAL_PAYMENT_METHODS.includes(method)) {
      query.paymentMethod = method;
    }

    if (status === "pending") {
      query.paymentStatus = { $in: ["pending", "pending_verification", "manual_review"] };
    } else if (status === "approved") {
      query.paymentStatus = "paid";
      query["manualPaymentVerification.status"] = "approved";
    } else if (status === "rejected") {
      query.paymentStatus = "payment_rejected";
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const duplicateMap = await getDuplicateTransactionMap(Order.collection);

    const [orders, total] = await Promise.all([
      Order.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      Order.collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders.map((order) => normalizeManualPayment(order, duplicateMap)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching manual payment queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const approveManualPayment = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const Payment = req.app.locals.models.Payment;
    const { orderId } = req.params;
    const { note = "", allowDuplicate = false } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (!MANUAL_PAYMENT_METHODS.includes(order.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: "Only bKash, Nagad, and COD orders can be manually verified",
      });
    }

    const duplicateMap = await getDuplicateTransactionMap(Order.collection);
    const duplicate = order.transactionId ? duplicateMap[order.transactionId] : null;

    if (duplicate && !allowDuplicate) {
      return res.status(409).json({
        success: false,
        error: "Duplicate transaction ID found",
        duplicate,
      });
    }

    const now = new Date();
    const update = {
      paymentStatus: "paid",
      status: order.status === "pending" ? "processing" : order.status,
      updatedAt: now,
      manualPaymentVerification: {
        status: "approved",
        reviewedBy: req.user?.uid || req.dbUser?._id?.toString() || "admin",
        reviewedAt: now,
        note,
        duplicateAcknowledged: Boolean(duplicate && allowDuplicate),
      },
    };

    await Order.collection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: update,
        $push: {
          statusHistory: {
            status: update.status,
            changedAt: now,
            changedBy: req.user?.uid || "admin",
            note: "Manual payment approved",
          },
        },
      },
    );

    await Order.collection.db.collection("vendorOrders").updateMany(
      { parentOrderId: orderId },
      {
        $set: {
          paymentStatus: "paid",
          status: update.status,
          updatedAt: now,
        },
      },
    );

    await Payment.collection.updateOne(
      { orderId },
      {
        $set: {
          userId: order.userId || null,
          orderId,
          amount: Number(order.total || 0),
          currency: "bdt",
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId || null,
          status: "completed",
          manualVerification: update.manualPaymentVerification,
          completedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const updatedOrder = await Order.findById(orderId);
    res.json({
      success: true,
      message: "Manual payment approved",
      data: normalizeManualPayment(updatedOrder, duplicateMap),
    });
  } catch (error) {
    console.error("Error approving manual payment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const rejectManualPayment = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
    const Payment = req.app.locals.models.Payment;
    const { orderId } = req.params;
    const { reason = "" } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (!MANUAL_PAYMENT_METHODS.includes(order.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: "Only bKash, Nagad, and COD orders can be manually verified",
      });
    }

    const now = new Date();
    const manualPaymentVerification = {
      status: "rejected",
      reviewedBy: req.user?.uid || req.dbUser?._id?.toString() || "admin",
      reviewedAt: now,
      reason,
    };

    await Order.collection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          paymentStatus: "payment_rejected",
          manualPaymentVerification,
          updatedAt: now,
        },
        $push: {
          statusHistory: {
            status: order.status,
            changedAt: now,
            changedBy: req.user?.uid || "admin",
            note: `Manual payment rejected${reason ? `: ${reason}` : ""}`,
          },
        },
      },
    );

    await Order.collection.db.collection("vendorOrders").updateMany(
      { parentOrderId: orderId },
      {
        $set: {
          paymentStatus: "payment_rejected",
          updatedAt: now,
        },
      },
    );

    await Payment.collection.updateOne(
      { orderId },
      {
        $set: {
          userId: order.userId || null,
          orderId,
          amount: Number(order.total || 0),
          currency: "bdt",
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId || null,
          status: "failed",
          manualVerification: manualPaymentVerification,
          failedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const duplicateMap = await getDuplicateTransactionMap(Order.collection);
    const updatedOrder = await Order.findById(orderId);
    res.json({
      success: true,
      message: "Manual payment rejected",
      data: normalizeManualPayment(updatedOrder, duplicateMap),
    });
  } catch (error) {
    console.error("Error rejecting manual payment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getOrderPayment = async (req, res) => {
  try {
    const Payment = req.app.locals.models.Payment;
    const { orderId } = req.params;
    const userId = req.user.uid;
    const isAdmin = req.dbUser?.role === "admin";

    // If not admin, verify the order belongs to the user
    if (!isAdmin) {
      const { ObjectId } = require("mongodb");
      const db = req.app.locals.db;
      const order = await db.collection("orders").findOne({
        _id: new ObjectId(orderId),
        userId,
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }
    }

    const payment = await Payment.findByOrderId(orderId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found for this order",
      });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Error fetching order payment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Webhook handlers for payment gateways
const handleStripeWebhook = async (req, res) => {
  try {
    // This would handle Stripe webhook events
    // For now, we'll just acknowledge the webhook
    console.log("Stripe webhook received:", req.body);
    res.json({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    res.status(400).json({ error: "Webhook error" });
  }
};

const handleBkashWebhook = async (req, res) => {
  try {
    // This would handle bKash webhook events
    console.log("bKash webhook received:", req.body);
    res.json({ received: true });
  } catch (error) {
    console.error("Error handling bKash webhook:", error);
    res.status(400).json({ error: "Webhook error" });
  }
};

const handleNagadWebhook = async (req, res) => {
  try {
    // This would handle Nagad webhook events
    console.log("Nagad webhook received:", req.body);
    res.json({ received: true });
  } catch (error) {
    console.error("Error handling Nagad webhook:", error);
    res.status(400).json({ error: "Webhook error" });
  }
};

module.exports = {
  getAllPayments,
  getUserPayments,
  getPaymentById,
  processPayment,
  updatePaymentStatus,
  processRefund,
  getPaymentStats,
  getManualPaymentQueue,
  approveManualPayment,
  rejectManualPayment,
  getOrderPayment,
  handleStripeWebhook,
  handleBkashWebhook,
  handleNagadWebhook,
};
