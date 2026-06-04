const crypto = require("crypto");

const hasValue = (value) => String(value || "").trim().length > 0;

const joinUrl = (baseUrl, routePath = "") => {
  if (!hasValue(baseUrl)) return "";
  const base = String(baseUrl).replace(/\/+$/, "");
  const path = String(routePath || "").replace(/^\/+/, "");
  return path ? `${base}/${path}` : base;
};

const asAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
};

const buildMockTransaction = (gateway, amount, currency = "BDT", note = "") => ({
  success: true,
  mock: true,
  transactionId: `MOCK-${gateway.toUpperCase()}-${Date.now()}`,
  status: "completed",
  gateway,
  amount: asAmount(amount),
  currency,
  raw: null,
  note: note || `${gateway} not configured`,
});

const fetchJson = async (url, options = {}) => {
  if (!hasValue(url)) {
    throw new Error("Gateway URL is not configured");
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Gateway request failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.response = data;
    throw error;
  }

  return data;
};

const signHmac = (payload, secret) => {
  if (!hasValue(secret)) return "";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

module.exports = {
  asAmount,
  buildMockTransaction,
  fetchJson,
  hasValue,
  joinUrl,
  signHmac,
};
