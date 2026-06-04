const { asAmount, buildMockTransaction, hasValue } = require("./paymentUtils");

const isConfigured = () => hasValue(process.env.STRIPE_SECRET_KEY);

const getStripe = () => {
  if (!isConfigured()) return null;
  try {
    const stripe = require("stripe");
    return stripe(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    throw new Error("Stripe package is not installed. Run npm install stripe in Server/.");
  }
};

async function createPaymentIntent(amount, currency = "bdt", metadata = {}) {
  if (!isConfigured()) {
    return buildMockTransaction("stripe", amount, currency.toUpperCase(), "Stripe not configured");
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(asAmount(amount) * 100),
    currency: String(currency || "bdt").toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return {
    success: true,
    gateway: "stripe",
    transactionId: paymentIntent.id,
    status: paymentIntent.status,
    amount: asAmount(amount),
    currency: String(currency || "bdt").toUpperCase(),
    raw: paymentIntent,
    mock: false,
  };
}

async function confirmPayment(paymentIntentId) {
  if (!isConfigured()) {
    return buildMockTransaction("stripe", 0, "BDT", "Stripe not configured");
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    success: true,
    gateway: "stripe",
    transactionId: paymentIntent.id,
    status: paymentIntent.status === "succeeded" ? "completed" : paymentIntent.status,
    amount: asAmount((paymentIntent.amount_received || paymentIntent.amount || 0) / 100),
    currency: String(paymentIntent.currency || "bdt").toUpperCase(),
    raw: paymentIntent,
    mock: false,
  };
}

async function createRefund(paymentIntentId, amount) {
  if (!isConfigured()) {
    return buildMockTransaction("stripe", amount, "BDT", "Stripe not configured");
  }

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount: Math.round(asAmount(amount) * 100) } : {}),
  });

  return {
    success: true,
    gateway: "stripe",
    transactionId: refund.id,
    status: refund.status || "refunded",
    amount: asAmount((refund.amount || 0) / 100),
    currency: String(refund.currency || "bdt").toUpperCase(),
    raw: refund,
    mock: false,
  };
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createRefund,
  isConfigured,
  getStripe,
};
