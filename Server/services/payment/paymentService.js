const bkashService = require("./bkashService");
const nagadService = require("./nagadService");
const sslcommerzService = require("./sslcommerzService");
const stripeService = require("./stripeService");
const { asAmount, buildMockTransaction, hasValue, signHmac } = require("./paymentUtils");

const normalizeMethod = (method = "") => String(method || "").trim().toLowerCase();

async function processPayment(method, orderData = {}) {
  const gateway = normalizeMethod(method || orderData.paymentMethod);
  const amount = asAmount(orderData.amount || orderData.total || orderData.finalTotal);
  const currency = orderData.currency || "BDT";

  switch (gateway) {
    case "bkash":
      return bkashService.createPayment(amount, orderData.orderId || orderData._id, orderData.callbackUrl);
    case "nagad":
      return nagadService.createPayment(amount, orderData.orderId || orderData._id, orderData.callbackUrl);
    case "sslcommerz":
    case "ssl_commerz":
      return sslcommerzService.initPayment({ ...orderData, amount });
    case "stripe":
      return stripeService.createPaymentIntent(amount, currency, {
        orderId: String(orderData.orderId || orderData._id || ""),
        userId: String(orderData.userId || ""),
      });
    case "cod":
    case "cash_on_delivery":
      return buildMockTransaction("cod", amount, currency, "COD will be collected on delivery");
    default:
      return {
        success: false,
        gateway,
        amount,
        currency,
        status: "failed",
        raw: null,
        mock: true,
        error: "Unsupported payment gateway",
      };
  }
}

async function processRefund(method, refundData = {}) {
  const gateway = normalizeMethod(method || refundData.paymentMethod);
  const amount = asAmount(refundData.amount || refundData.refundAmount);

  switch (gateway) {
    case "bkash":
      return bkashService.refundPayment(refundData.paymentID, amount, refundData.trxID, refundData.reason);
    case "sslcommerz":
    case "ssl_commerz":
      return sslcommerzService.refundPayment(refundData.bankTxnId, amount, refundData.reason);
    case "stripe":
      return stripeService.createRefund(refundData.paymentIntentId || refundData.transactionId, amount);
    case "nagad":
      return buildMockTransaction("nagad", amount, "BDT", "Nagad refund adapter is in mock mode");
    default:
      return buildMockTransaction(gateway || "unknown", amount, refundData.currency || "BDT", "Refund gateway not configured");
  }
}

function verifyWebhook(method, payload, signature) {
  const gateway = normalizeMethod(method);
  if (gateway === "stripe") {
    if (!hasValue(process.env.STRIPE_WEBHOOK_SECRET)) {
      return { valid: true, mock: true, reason: "Stripe webhook secret not configured" };
    }

    try {
      const stripe = stripeService.getStripe();
      const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
      return { valid: true, mock: false, event };
    } catch (error) {
      return { valid: false, mock: false, error: error.message };
    }
  }

  const secretMap = {
    bkash: process.env.BKASH_WEBHOOK_SECRET,
    nagad: process.env.NAGAD_WEBHOOK_SECRET,
    sslcommerz: process.env.SSLCOMMERZ_WEBHOOK_SECRET,
  };
  const secret = secretMap[gateway];
  if (!hasValue(secret)) {
    return { valid: true, mock: true, reason: `${gateway} webhook secret not configured` };
  }

  const expected = signHmac(typeof payload === "string" ? payload : JSON.stringify(payload || {}), secret);
  return {
    valid: expected && signature && expected === signature,
    mock: false,
  };
}

function getAvailableGateways() {
  return [
    { gateway: "bkash", configured: bkashService.isConfigured() },
    { gateway: "nagad", configured: nagadService.isConfigured() },
    { gateway: "sslcommerz", configured: sslcommerzService.isConfigured() },
    { gateway: "stripe", configured: stripeService.isConfigured() },
    { gateway: "cod", configured: true },
  ];
}

module.exports = {
  getAvailableGateways,
  processPayment,
  processRefund,
  verifyWebhook,
};
