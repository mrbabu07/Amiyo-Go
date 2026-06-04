const {
  asAmount,
  buildMockTransaction,
  fetchJson,
  hasValue,
  joinUrl,
} = require("./paymentUtils");

const isConfigured = () =>
  hasValue(process.env.BKASH_APP_KEY) &&
  hasValue(process.env.BKASH_APP_SECRET) &&
  hasValue(process.env.BKASH_USERNAME) &&
  hasValue(process.env.BKASH_PASSWORD) &&
  hasValue(process.env.BKASH_BASE_URL);

const bkashHeaders = (token = "") => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  username: process.env.BKASH_USERNAME,
  password: process.env.BKASH_PASSWORD,
  ...(token ? { authorization: token, "x-app-key": process.env.BKASH_APP_KEY } : {}),
});

async function grantToken() {
  if (!isConfigured()) {
    return {
      success: true,
      mock: true,
      token: "",
      status: "completed",
      note: "bKash not configured",
    };
  }

  const url = joinUrl(process.env.BKASH_BASE_URL, process.env.BKASH_GRANT_TOKEN_PATH || "/tokenized/checkout/token/grant");
  const raw = await fetchJson(url, {
    method: "POST",
    headers: bkashHeaders(),
    body: JSON.stringify({
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
  });

  return {
    success: true,
    token: raw.id_token || raw.token || raw.accessToken || "",
    raw,
  };
}

async function createPayment(amount, orderId, callbackUrl) {
  if (!isConfigured()) {
    return buildMockTransaction("bkash", amount, "BDT", "bKash not configured");
  }

  const token = await grantToken();
  const url = joinUrl(process.env.BKASH_BASE_URL, process.env.BKASH_CREATE_PAYMENT_PATH || "/tokenized/checkout/create");
  const raw = await fetchJson(url, {
    method: "POST",
    headers: bkashHeaders(token.token),
    body: JSON.stringify({
      mode: "0011",
      payerReference: orderId,
      callbackURL: callbackUrl,
      amount: String(asAmount(amount)),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: String(orderId),
    }),
  });

  return {
    success: true,
    gateway: "bkash",
    transactionId: raw.paymentID || raw.transactionId || raw.trxID || null,
    status: raw.statusCode === "0000" ? "pending" : "processing",
    amount: asAmount(amount),
    currency: "BDT",
    raw,
    mock: false,
  };
}

async function executePayment(paymentID) {
  if (!isConfigured()) {
    return buildMockTransaction("bkash", 0, "BDT", "bKash not configured");
  }

  const token = await grantToken();
  const url = joinUrl(process.env.BKASH_BASE_URL, process.env.BKASH_EXECUTE_PAYMENT_PATH || "/tokenized/checkout/execute");
  const raw = await fetchJson(url, {
    method: "POST",
    headers: bkashHeaders(token.token),
    body: JSON.stringify({ paymentID }),
  });

  return {
    success: true,
    gateway: "bkash",
    transactionId: raw.trxID || raw.paymentID || paymentID,
    status: raw.transactionStatus === "Completed" ? "completed" : "processing",
    amount: asAmount(raw.amount),
    currency: raw.currency || "BDT",
    raw,
    mock: false,
  };
}

async function queryPayment(paymentID) {
  if (!isConfigured()) {
    return buildMockTransaction("bkash", 0, "BDT", "bKash not configured");
  }

  const token = await grantToken();
  const url = joinUrl(process.env.BKASH_BASE_URL, process.env.BKASH_QUERY_PAYMENT_PATH || "/tokenized/checkout/payment/status");
  const raw = await fetchJson(url, {
    method: "POST",
    headers: bkashHeaders(token.token),
    body: JSON.stringify({ paymentID }),
  });

  return {
    success: true,
    gateway: "bkash",
    transactionId: raw.trxID || raw.paymentID || paymentID,
    status: raw.transactionStatus || raw.status || "unknown",
    amount: asAmount(raw.amount),
    currency: raw.currency || "BDT",
    raw,
    mock: false,
  };
}

async function refundPayment(paymentID, amount, trxID, reason = "") {
  if (!isConfigured()) {
    return buildMockTransaction("bkash", amount, "BDT", "bKash not configured");
  }

  const token = await grantToken();
  const url = joinUrl(process.env.BKASH_BASE_URL, process.env.BKASH_REFUND_PAYMENT_PATH || "/tokenized/checkout/payment/refund");
  const raw = await fetchJson(url, {
    method: "POST",
    headers: bkashHeaders(token.token),
    body: JSON.stringify({
      paymentID,
      trxID,
      amount: String(asAmount(amount)),
      sku: String(paymentID),
      reason,
    }),
  });

  return {
    success: true,
    gateway: "bkash",
    transactionId: raw.refundTrxID || raw.trxID || trxID,
    status: raw.transactionStatus || "refunded",
    amount: asAmount(amount),
    currency: "BDT",
    raw,
    mock: false,
  };
}

module.exports = {
  createPayment,
  executePayment,
  grantToken,
  queryPayment,
  refundPayment,
  isConfigured,
};
