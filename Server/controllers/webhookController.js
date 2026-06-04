const { ObjectId } = require("mongodb");
const paymentService = require("../services/payment/paymentService");
const auditService = require("../services/audit/auditService");
const notificationOrchestrator = require("../services/notification/notificationService");

const getOrderIdFromPayload = (payload = {}) =>
  payload.orderId ||
  payload.order_id ||
  payload.merchantInvoiceNumber ||
  payload.tran_id ||
  payload.metadata?.orderId ||
  payload.data?.object?.metadata?.orderId ||
  payload.data?.object?.metadata?.order_id ||
  null;

const getStatusFromPayload = (payload = {}) => {
  const rawStatus =
    payload.status ||
    payload.paymentStatus ||
    payload.transactionStatus ||
    payload.data?.object?.status ||
    "";
  const status = String(rawStatus).toLowerCase();
  if (["completed", "complete", "success", "succeeded", "valid", "validated"].includes(status)) return "completed";
  if (["failed", "cancelled", "canceled", "invalid"].includes(status)) return "failed";
  return status || "processing";
};

const getTransactionIdFromPayload = (payload = {}) =>
  payload.transactionId ||
  payload.trxID ||
  payload.bank_tran_id ||
  payload.paymentID ||
  payload.paymentRefId ||
  payload.data?.object?.id ||
  null;

const updatePaymentAndOrder = async (req, gateway, payload) => {
  const Payment = req.app.locals.models?.Payment;
  const Order = req.app.locals.models?.Order;
  const orderId = getOrderIdFromPayload(payload);
  const transactionId = getTransactionIdFromPayload(payload);
  const status = getStatusFromPayload(payload);
  const now = new Date();

  if (Payment?.collection) {
    const paymentQuery = transactionId
      ? { $or: [{ transactionId }, { stripePaymentId: transactionId }, { bkashPaymentId: transactionId }] }
      : { orderId };

    await Payment.collection.updateOne(
      paymentQuery,
      {
        $set: {
          orderId,
          paymentMethod: gateway,
          status,
          transactionId,
          gatewayPayload: payload,
          updatedAt: now,
          ...(status === "completed" ? { completedAt: now } : {}),
          ...(status === "failed" ? { failedAt: now } : {}),
        },
        $setOnInsert: {
          createdAt: now,
          amount: Number(payload.amount || payload.total_amount || payload.data?.object?.amount_received || 0),
          currency: payload.currency || "BDT",
        },
      },
      { upsert: true },
    );
  }

  if (Order?.collection && orderId && ObjectId.isValid(orderId)) {
    await Order.collection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          paymentStatus: status === "completed" ? "paid" : status,
          paymentGateway: gateway,
          transactionId,
          updatedAt: now,
        },
      },
    );
  }

  await auditService.log({
    app: req.app,
    actorType: "system",
    action: status === "completed" ? "PAYMENT_PROCESSED" : "PAYMENT_FAILED",
    resource: "payment",
    resourceId: transactionId || orderId,
    changes: { after: { gateway, status, orderId, transactionId } },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    note: `${gateway} webhook received`,
  });

  if (status === "completed" && Order?.collection && orderId && ObjectId.isValid(orderId)) {
    const order = await Order.findById(orderId);
    if (order) {
      notificationOrchestrator.notifyOrderConfirmed(order, req.app).catch((error) => {
        console.error("Webhook notification failed:", error.message);
      });
    }
  }

  return { orderId, transactionId, status };
};

const handleGatewayWebhook = (gateway) => async (req, res) => {
  try {
    const rawPayload = req.rawBody || JSON.stringify(req.body || {});
    const signature =
      req.headers["stripe-signature"] ||
      req.headers["x-signature"] ||
      req.headers["x-webhook-signature"] ||
      req.headers.signature ||
      "";
    const verification = paymentService.verifyWebhook(gateway, gateway === "stripe" ? rawPayload : req.body, signature);
    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.error || "Invalid webhook signature" });
    }

    const payload = verification.event || req.body || {};
    const result = await updatePaymentAndOrder(req, gateway, payload);
    res.json({ success: true, gateway, ...result, mockVerification: verification.mock === true });
  } catch (error) {
    console.error(`${gateway} webhook failed:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  handleBkashWebhook: handleGatewayWebhook("bkash"),
  handleNagadWebhook: handleGatewayWebhook("nagad"),
  handleSslcommerzWebhook: handleGatewayWebhook("sslcommerz"),
  handleStripeWebhook: handleGatewayWebhook("stripe"),
};
