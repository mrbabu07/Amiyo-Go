const hasValue = (value) => String(value || "").trim().length > 0;

const firstValue = (env, keys) => {
  for (const key of keys) {
    if (hasValue(env[key])) return env[key];
  }
  return "";
};

const bool = (value) => String(value || "").toLowerCase() === "true";

function status(name, configured, options = {}) {
  const mockMode = options.mockMode || "mock";
  return {
    name,
    configured,
    required: options.required === true,
    mode: configured ? options.realMode || "configured" : mockMode,
    message: configured
      ? `${name}: configured`
      : `${name}: not configured - ${mockMode} mode`,
    details: options.details || {},
  };
}

function getServiceStatus(env = process.env) {
  const mongoUri = firstValue(env, ["MONGODB_URI", "MONGO_URI"]);
  const smtpConfigured = hasValue(env.SMTP_HOST) && hasValue(env.SMTP_USER) && hasValue(env.SMTP_PASS);
  const brevoConfigured = hasValue(env.BREVO_API_KEY) && hasValue(env.BREVO_API_URL);
  const sslWirelessConfigured = hasValue(env.SSL_WIRELESS_API_TOKEN) && hasValue(env.SSL_WIRELESS_SID);
  const twilioConfigured = hasValue(env.TWILIO_ACCOUNT_SID) && hasValue(env.TWILIO_AUTH_TOKEN) && hasValue(env.TWILIO_BASE_URL);
  const cloudinaryConfigured = hasValue(env.CLOUDINARY_CLOUD_NAME) && hasValue(env.CLOUDINARY_API_KEY) && hasValue(env.CLOUDINARY_API_SECRET);
  const supabaseConfigured = hasValue(env.SUPABASE_URL) && hasValue(firstValue(env, ["SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]));

  return {
    mongodb: status("MongoDB", hasValue(mongoUri), {
      required: true,
      mockMode: "missing",
      details: { database: env.DB_NAME || "" },
    }),
    jwt: status("JWT", hasValue(env.JWT_SECRET), {
      required: true,
      mockMode: "firebase/session-only",
    }),
    port: status("PORT", hasValue(env.PORT), {
      required: true,
      mockMode: "default-port",
      details: { value: env.PORT || "5000" },
    }),
    bkash: status("bKash", hasValue(env.BKASH_APP_KEY) && hasValue(env.BKASH_APP_SECRET), {
      mockMode: "mock",
    }),
    nagad: status("Nagad", hasValue(env.NAGAD_MERCHANT_ID) && hasValue(env.NAGAD_BASE_URL), {
      mockMode: "mock",
    }),
    sslcommerz: status("SSLCommerz", hasValue(env.SSLCOMMERZ_STORE_ID) && hasValue(env.SSLCOMMERZ_STORE_PASSWORD), {
      mockMode: "mock",
    }),
    stripe: status("Stripe", hasValue(env.STRIPE_SECRET_KEY), {
      mockMode: "mock",
    }),
    email: status("Email", brevoConfigured || smtpConfigured, {
      realMode: brevoConfigured ? "brevo" : "smtp",
      mockMode: "mock",
    }),
    sms: status("SMS", sslWirelessConfigured || twilioConfigured, {
      realMode: sslWirelessConfigured ? "ssl-wireless" : "twilio",
      mockMode: "mock",
    }),
    storage: status("Storage", cloudinaryConfigured || supabaseConfigured, {
      realMode: cloudinaryConfigured ? "cloudinary" : "supabase",
      mockMode: "local-disk",
    }),
    push: status("Push", hasValue(env.VAPID_PUBLIC_KEY) && hasValue(env.VAPID_PRIVATE_KEY), {
      mockMode: "disabled",
    }),
  };
}

function validateEnv(env = process.env, options = {}) {
  const services = getServiceStatus(env);
  const strict = options.throwOnMissing ?? (env.NODE_ENV === "production" || bool(env.ENV_SERVICE_VALIDATION_STRICT));
  const allowMissingMongo = options.allowMissingMongo === true;
  const required = Object.values(services).filter((item) => item.required && !item.configured);
  const blocking = strict
    ? required
    : required.filter((item) =>
        item.name === "MongoDB" &&
        !allowMissingMongo &&
        !hasValue(firstValue(env, ["MONGODB_URI", "MONGO_URI"])),
      );

  console.log("Environment service status:");
  Object.values(services).forEach((item) => {
    const marker = item.configured ? "[ok]" : item.required ? "[warn]" : "[mock]";
    console.log(`${marker} ${item.message}`);
  });

  if (blocking.length > 0) {
    const message = blocking.map((item) => item.name).join(", ");
    throw new Error(`Missing required environment configuration: ${message}`);
  }

  return {
    ok: required.length === 0,
    strict,
    missingRequired: required.map((item) => item.name),
    services,
  };
}

module.exports = {
  validateEnv,
  getServiceStatus,
};
