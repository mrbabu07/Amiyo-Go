const numberFromEnv = (key, fallback) => {
  const parsed = Number.parseInt(process.env[key], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const appUrl = process.env.APP_URL || process.env.CLIENT_URL || "";

const deliveryConfig = {
  otpExpireMinutes: numberFromEnv("DELIVERY_OTP_EXPIRE_MINUTES", 10),
  maxAttempts: numberFromEnv("DELIVERY_MAX_ATTEMPTS", 3),
  autoAssign: process.env.DELIVERY_AUTO_ASSIGN === "true",
  trackingBaseUrl: appUrl ? `${appUrl.replace(/\/$/, "")}/track-delivery` : "",
  supportPhone: process.env.SUPPORT_PHONE || "",
  codEnabled: process.env.DELIVERY_COD_ENABLED !== "false",
  otpEnabled: process.env.DELIVERY_OTP_ENABLED !== "false",
};

module.exports = deliveryConfig;
