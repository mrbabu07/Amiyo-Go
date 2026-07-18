const crypto = require("crypto");

const VERSION = "AGP2";
const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;

const signingSecret = (env = process.env) =>
  String(env.PARCEL_QR_SIGNING_SECRET || env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "").trim();

const encode = (value) => encodeURIComponent(String(value ?? ""));
const decode = (value) => decodeURIComponent(String(value ?? ""));

const normalizePaymentType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["cod", "cash_on_delivery", "cash on delivery"].includes(normalized)) return "C";
  if (["prepaid", "paid", "online"].includes(normalized)) return "P";
  return "U";
};

const normalizeStatus = (value, fallback = "UNKNOWN") =>
  String(value || fallback).trim().replace(/[\s-]+/g, "_").toUpperCase();

const signatureFor = (unsignedPayload, secret) =>
  crypto.createHmac("sha256", secret).update(unsignedPayload, "utf8").digest("base64url").slice(0, 22);

const buildParcelQrPayload = (parcel = {}, options = {}) => {
  const secret = String(options.secret || signingSecret(options.env)).trim();
  if (!secret) throw new Error("Parcel QR signing secret is not configured");

  const nowSeconds = Math.floor(Number(options.nowMs || Date.now()) / 1000);
  const ttlSeconds = Math.max(
    60,
    Number(options.ttlSeconds || options.env?.PARCEL_QR_TTL_SECONDS || process.env.PARCEL_QR_TTL_SECONDS || DEFAULT_TTL_SECONDS),
  );
  const expiresAt = nowSeconds + ttlSeconds;
  const fields = [
    VERSION,
    `O=${encode(parcel.orderId)}`,
    `V=${encode(parcel.vendorId)}`,
    `T=${encode(parcel.trackingNumber || "PENDING")}`,
    `M=${normalizePaymentType(parcel.paymentType || parcel.paymentMethod)}`,
    `S=${normalizeStatus(parcel.paymentStatus)}`,
    `F=${normalizeStatus(parcel.orderStatus)}`,
    `A=${Number(parcel.payableAmount || 0).toFixed(2)}`,
    `I=${Math.max(0, Number(parcel.itemCount || 0))}`,
    `Q=${Math.max(0, Number(parcel.quantity || 0))}`,
    `X=${expiresAt}`,
  ];
  const unsignedPayload = fields.join("|");
  return `${unsignedPayload}|H=${signatureFor(unsignedPayload, secret)}`;
};

const parseParcelQrPayload = (payload) => {
  const text = String(payload || "").trim();
  const parts = text.split("|");
  if (parts[0] !== VERSION || parts.length !== 12) throw new Error("Invalid Amiyo parcel QR payload");

  const values = Object.fromEntries(parts.slice(1).map((part) => {
    const separator = part.indexOf("=");
    if (separator <= 0) throw new Error("Invalid Amiyo parcel QR field");
    return [part.slice(0, separator), part.slice(separator + 1)];
  }));

  return {
    version: VERSION,
    orderId: decode(values.O),
    vendorId: decode(values.V),
    trackingNumber: decode(values.T),
    paymentType: values.M,
    paymentStatus: values.S,
    orderStatus: values.F,
    payableAmount: Number(values.A),
    itemCount: Number(values.I),
    quantity: Number(values.Q),
    expiresAt: Number(values.X),
    signature: values.H,
    unsignedPayload: parts.slice(0, -1).join("|"),
  };
};

const verifyParcelQrPayload = (payload, options = {}) => {
  const secret = String(options.secret || signingSecret(options.env)).trim();
  if (!secret) throw new Error("Parcel QR signing secret is not configured");
  const parsed = parseParcelQrPayload(payload);
  const expected = signatureFor(parsed.unsignedPayload, secret);
  const actualBuffer = Buffer.from(parsed.signature || "", "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Parcel QR signature is invalid");
  }

  const nowSeconds = Math.floor(Number(options.nowMs || Date.now()) / 1000);
  if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt < nowSeconds) {
    throw new Error("Parcel QR has expired");
  }
  if (!parsed.orderId || !parsed.vendorId || !Number.isFinite(parsed.payableAmount)) {
    throw new Error("Parcel QR is missing required fields");
  }
  return parsed;
};

module.exports = {
  VERSION,
  buildParcelQrPayload,
  parseParcelQrPayload,
  verifyParcelQrPayload,
};
