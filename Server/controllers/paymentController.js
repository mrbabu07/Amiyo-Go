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
  getOrderPayment,
  handleStripeWebhook,
  handleBkashWebhook,
  handleNagadWebhook,
};
