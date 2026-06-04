const {
  asAmount,
  buildMockTransaction,
  fetchJson,
  hasValue,
  joinUrl,
} = require("./paymentUtils");

const isConfigured = () =>
  hasValue(process.env.SSLCOMMERZ_STORE_ID) &&
  hasValue(process.env.SSLCOMMERZ_STORE_PASSWORD) &&
  hasValue(process.env.SSLCOMMERZ_BASE_URL);

const toFormBody = (data) => new URLSearchParams(data).toString();

async function initPayment(orderData = {}) {
  if (!isConfigured()) {
    return buildMockTransaction("sslcommerz", orderData.amount || orderData.total, "BDT", "SSLCommerz not configured");
  }

  const amount = asAmount(orderData.amount || orderData.total);
  const url = joinUrl(process.env.SSLCOMMERZ_BASE_URL, process.env.SSLCOMMERZ_INIT_PATH || "/gwprocess/v4/api.php");
  const raw = await fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: toFormBody({
      store_id: process.env.SSLCOMMERZ_STORE_ID,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: amount,
      currency: orderData.currency || "BDT",
      tran_id: orderData.orderId || orderData._id || `ORDER-${Date.now()}`,
      success_url: orderData.successUrl || process.env.PAYMENT_SUCCESS_URL || "",
      fail_url: orderData.failUrl || process.env.PAYMENT_FAIL_URL || "",
      cancel_url: orderData.cancelUrl || process.env.PAYMENT_CANCEL_URL || "",
      cus_name: orderData.customerName || "Customer",
      cus_email: orderData.customerEmail || process.env.SUPPORT_EMAIL || "",
      cus_phone: orderData.customerPhone || "",
      cus_add1: orderData.customerAddress || "",
      product_name: orderData.productName || "Amiyo-Go order",
      product_category: orderData.productCategory || "Marketplace",
      product_profile: orderData.productProfile || "general",
    }),
  });

  return {
    success: true,
    gateway: "sslcommerz",
    transactionId: raw.sessionkey || raw.tran_id || orderData.orderId,
    status: raw.status === "SUCCESS" ? "pending" : "processing",
    amount,
    currency: orderData.currency || "BDT",
    raw,
    mock: false,
  };
}

async function validatePayment(valId) {
  if (!isConfigured()) {
    return buildMockTransaction("sslcommerz", 0, "BDT", "SSLCommerz not configured");
  }

  const url = joinUrl(process.env.SSLCOMMERZ_BASE_URL, process.env.SSLCOMMERZ_VALIDATE_PATH || "/validator/api/validationserverAPI.php");
  const raw = await fetchJson(`${url}?${toFormBody({
    val_id: valId,
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    format: "json",
  })}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  return {
    success: true,
    gateway: "sslcommerz",
    transactionId: raw.bank_tran_id || raw.tran_id || valId,
    status: raw.status === "VALID" || raw.status === "VALIDATED" ? "completed" : "failed",
    amount: asAmount(raw.amount),
    currency: raw.currency || "BDT",
    raw,
    mock: false,
  };
}

async function refundPayment(bankTxnId, amount, reason = "") {
  if (!isConfigured()) {
    return buildMockTransaction("sslcommerz", amount, "BDT", "SSLCommerz not configured");
  }

  const url = joinUrl(process.env.SSLCOMMERZ_BASE_URL, process.env.SSLCOMMERZ_REFUND_PATH || "/validator/api/merchantTransIDvalidationAPI.php");
  const raw = await fetchJson(`${url}?${toFormBody({
    bank_tran_id: bankTxnId,
    refund_amount: asAmount(amount),
    refund_remarks: reason,
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    format: "json",
  })}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  return {
    success: true,
    gateway: "sslcommerz",
    transactionId: raw.refund_ref_id || bankTxnId,
    status: raw.status || "refunded",
    amount: asAmount(amount),
    currency: "BDT",
    raw,
    mock: false,
  };
}

module.exports = {
  initPayment,
  validatePayment,
  refundPayment,
  isConfigured,
};
