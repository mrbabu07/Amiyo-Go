const {
  asAmount,
  buildMockTransaction,
  fetchJson,
  hasValue,
  joinUrl,
} = require("./paymentUtils");

const isConfigured = () =>
  hasValue(process.env.NAGAD_MERCHANT_ID) &&
  hasValue(process.env.NAGAD_MERCHANT_NUMBER) &&
  hasValue(process.env.NAGAD_BASE_URL);

async function createPayment(amount, orderId, callbackUrl) {
  if (!isConfigured() || !hasValue(process.env.NAGAD_CREATE_PAYMENT_PATH)) {
    return buildMockTransaction("nagad", amount, "BDT", "Nagad not configured");
  }

  const url = joinUrl(process.env.NAGAD_BASE_URL, process.env.NAGAD_CREATE_PAYMENT_PATH);
  const raw = await fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      merchantId: process.env.NAGAD_MERCHANT_ID,
      merchantNumber: process.env.NAGAD_MERCHANT_NUMBER,
      orderId,
      amount: asAmount(amount),
      callbackUrl,
    }),
  });

  return {
    success: true,
    gateway: "nagad",
    transactionId: raw.paymentRefId || raw.transactionId || raw.orderId || orderId,
    status: raw.status || "pending",
    amount: asAmount(amount),
    currency: "BDT",
    raw,
    mock: false,
  };
}

async function verifyPayment(paymentRefId) {
  if (!isConfigured() || !hasValue(process.env.NAGAD_VERIFY_PAYMENT_PATH)) {
    return buildMockTransaction("nagad", 0, "BDT", "Nagad not configured");
  }

  const url = joinUrl(process.env.NAGAD_BASE_URL, process.env.NAGAD_VERIFY_PAYMENT_PATH);
  const raw = await fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      merchantId: process.env.NAGAD_MERCHANT_ID,
      paymentRefId,
    }),
  });

  return {
    success: true,
    gateway: "nagad",
    transactionId: raw.issuerPaymentRefNo || raw.paymentRefId || paymentRefId,
    status: raw.status || raw.paymentStatus || "unknown",
    amount: asAmount(raw.amount),
    currency: "BDT",
    raw,
    mock: false,
  };
}

module.exports = {
  createPayment,
  verifyPayment,
  isConfigured,
};
