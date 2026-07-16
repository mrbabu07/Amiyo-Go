const PLACEHOLDER_PATTERNS = [
  /your[_-]?project/i,
  /xxxxx/i,
  /change[_-]?me/i,
  /replace[_-]?me/i,
  /example/i,
];

const hasValue = (value) => String(value || "").trim().length > 0;

const DEFAULT_CLIENT_ORIGINS = [
  "https://amiyo-go.vercel.app",
];

function normalizeCorsOrigin(value) {
  const origin = String(value || "").trim();
  if (!origin || origin === "*") return origin;
  return origin.replace(/\/+$/, "");
}

const isPlaceholderValue = (value) => {
  const text = String(value || "").trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
};

const requiredCoreEnv = [
  {
    key: "MONGO_URI",
    aliases: ["MONGODB_URI"],
    service: "mongodb",
    message: "MongoDB connection string is required.",
  },
  {
    key: "FIREBASE_PROJECT_ID",
    service: "firebase",
    message: "Firebase project id is required for token verification.",
  },
  {
    key: "FIREBASE_CLIENT_EMAIL",
    service: "firebase",
    message: "Firebase client email is required for token verification.",
  },
  {
    key: "FIREBASE_PRIVATE_KEY",
    service: "firebase",
    message: "Firebase private key is required for token verification.",
  },
];

function serviceStatus(name, configured, required = false, details = {}) {
  return {
    name,
    configured,
    required,
    status: configured ? "configured" : required ? "missing" : "optional",
    ...details,
  };
}

function getServiceConfigStatus(env = process.env) {
  const redisConfigured = env.REDIS_ENABLED === "false" || hasValue(env.REDIS_URL) || hasValue(env.REDIS_HOST);
  const imgbbConfigured = hasValue(env.IMGBB_API_KEY || env.IMAGE_UPLOAD_IMGBB_API_KEY);
  const supabaseConfigured = hasValue(env.SUPABASE_URL) && hasValue(env.SUPABASE_SERVICE_ROLE_KEY);
  const cloudinaryConfigured = hasValue(env.CLOUDINARY_CLOUD_NAME) && hasValue(env.CLOUDINARY_API_KEY) && hasValue(env.CLOUDINARY_API_SECRET);
  const emailConfigured =
    (hasValue(env.BREVO_SMTP_USER) && hasValue(env.BREVO_SMTP_KEY)) ||
    (hasValue(env.SMTP_USER) && hasValue(env.SMTP_PASS));
  const pushConfigured = hasValue(env.VAPID_PUBLIC_KEY) && hasValue(env.VAPID_PRIVATE_KEY);
  const sessionConfigured = hasValue(env.JWT_SECRET) || hasValue(env.SESSION_SECRET);
  const redxConfigured = hasValue(env.REDX_API_TOKEN) || hasValue(env.REDX_API_KEY);
  const steadfastConfigured =
    hasValue(env.STEADFAST_API_KEY) && (hasValue(env.STEADFAST_SECRET_KEY) || hasValue(env.STEADFAST_API_SECRET));
  const courierConfigured = redxConfigured || steadfastConfigured || hasValue(env.COURIER_API_KEY);
  const amiyoDeliveryConfigured =
    hasValue(env.AMIYO_DELIVERY_API_URL) &&
    hasValue(env.AMIYO_DELIVERY_INTEGRATION_TOKEN) &&
    hasValue(env.AMIYO_DELIVERY_CALLBACK_API_SECRET);
  const deliveryDispatchUsesRedis =
    env.DELIVERY_DISPATCH_USE_REDIS !== "false" &&
    (hasValue(env.REDIS_URL) || hasValue(env.REDIS_HOST));
  const deliveryDispatchInlineFallback = env.DELIVERY_DISPATCH_INLINE_FALLBACK !== "false";
  const deliveryDispatchApiInline =
    env.DELIVERY_DISPATCH_API_INLINE === "true" ||
    (env.DELIVERY_DISPATCH_API_INLINE !== "false" &&
      ["1", "true"].includes(String(env.VERCEL || "").toLowerCase()));
  const deliveryDispatchConfigured = deliveryDispatchUsesRedis || deliveryDispatchInlineFallback || deliveryDispatchApiInline;

  return {
    mongodb: serviceStatus("mongodb", hasValue(env.MONGO_URI || env.MONGODB_URI), true, {
      database: env.DB_NAME || "BazarBD",
    }),
    firebase: serviceStatus(
      "firebase",
      hasValue(env.FIREBASE_PROJECT_ID) &&
        hasValue(env.FIREBASE_CLIENT_EMAIL) &&
        hasValue(env.FIREBASE_PRIVATE_KEY),
      true,
    ),
    redis: serviceStatus("redis", redisConfigured, env.REDIS_REQUIRED === "true", {
      disabled: env.REDIS_ENABLED === "false",
    }),
    storage: serviceStatus("storage", imgbbConfigured || cloudinaryConfigured || supabaseConfigured, env.STORAGE_REQUIRED === "true", {
      mode: imgbbConfigured ? "imgbb" : cloudinaryConfigured ? "cloudinary" : supabaseConfigured ? "supabase" : "local_uploads",
      bucket: env.SUPABASE_STORAGE_BUCKET || "amiyo-go",
      fallback: imgbbConfigured || cloudinaryConfigured || supabaseConfigured ? null : "local_uploads",
    }),
    supabase: serviceStatus("supabase", supabaseConfigured, env.SUPABASE_REQUIRED === "true", {
      bucket: env.SUPABASE_STORAGE_BUCKET || "amiyo-go",
      fallback: supabaseConfigured ? null : imgbbConfigured || cloudinaryConfigured ? "alternate_storage" : "local_uploads",
    }),
    email: serviceStatus("email", emailConfigured, env.EMAIL_REQUIRED === "true", {
      mode: emailConfigured ? "smtp" : "mock",
    }),
    push: serviceStatus("push", pushConfigured, env.PUSH_REQUIRED === "true", {
      mode: pushConfigured ? "vapid" : "limited",
    }),
    session: serviceStatus("session", sessionConfigured, env.SESSION_REQUIRED === "true", {
      mode: sessionConfigured ? "configured" : "firebase_only",
    }),
    courier: serviceStatus("courier", courierConfigured, env.COURIER_REQUIRED === "true", {
      mode: courierConfigured ? env.COURIER_API_MODE || "live" : "manual",
      providers: {
        redx: redxConfigured,
        steadfast: steadfastConfigured,
        generic: hasValue(env.COURIER_API_KEY),
      },
    }),
    amiyoDelivery: serviceStatus("amiyoDelivery", amiyoDeliveryConfigured, env.AMIYO_DELIVERY_REQUIRED === "true", {
      mode: amiyoDeliveryConfigured ? "integration" : "skipped",
      apiUrl: env.AMIYO_DELIVERY_API_URL || "",
    }),
    deliveryDispatch: serviceStatus(
      "deliveryDispatch",
      deliveryDispatchConfigured,
      env.AMIYO_DELIVERY_REQUIRED === "true",
      {
        mode: deliveryDispatchUsesRedis
          ? (deliveryDispatchApiInline ? "bullmq_api_inline" : "bullmq")
          : deliveryDispatchInlineFallback
            ? "inline_fallback"
            : deliveryDispatchApiInline
              ? "api_inline"
              : "missing_redis",
        apiInline: deliveryDispatchApiInline,
      },
    ),
  };
}

function validateStartupEnv(env = process.env, options = {}) {
  const errors = [];
  const warnings = [];
  const isTest = env.NODE_ENV === "test";
  const strict = options.strict ?? env.NODE_ENV === "production";

  requiredCoreEnv.forEach(({ key, aliases = [], service, message }) => {
    const keys = [key, ...aliases];
    const value = keys.map((item) => env[item]).find(hasValue);
    const label = keys.join(" or ");

    if (!hasValue(value)) {
      errors.push({ key, service, message });
      return;
    }

    if (isPlaceholderValue(value)) {
      errors.push({
        key: label,
        service,
        message: `${label} appears to contain a placeholder value.`,
      });
    }
  });

  const services = getServiceConfigStatus(env);
  Object.values(services).forEach((service) => {
    if (service.required && !service.configured) {
      errors.push({
        key: service.name,
        service: service.name,
        message: `${service.name} is marked required but is not configured.`,
      });
      return;
    }

    if (!service.configured) {
      warnings.push({
        service: service.name,
        message: `${service.name} is not configured; running in ${service.mode || service.fallback || "optional"} mode.`,
      });
    }
  });

  if (!hasValue(env.CORS_ORIGINS) && !hasValue(env.CLIENT_URL) && !hasValue(env.FRONTEND_URL) && !hasValue(env.APP_URL)) {
    warnings.push({
      service: "cors",
      message: "CORS_ORIGINS, CLIENT_URL, FRONTEND_URL, or APP_URL is not set; default client and localhost origins will be allowed.",
    });
  }

  return {
    ok: isTest ? true : errors.length === 0,
    strict,
    errors: isTest ? [] : errors,
    warnings: [...warnings, ...(isTest ? errors.map((error) => ({ ...error, testOnly: true })) : [])],
    services,
  };
}

function getAllowedCorsOrigins(env = process.env) {
  const configured = [
    env.CLIENT_URL,
    env.FRONTEND_URL,
    env.APP_URL,
    env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(normalizeCorsOrigin)
    .filter(Boolean);

  return [
    ...new Set([
      ...configured,
      ...DEFAULT_CLIENT_ORIGINS,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]),
  ];
}

function buildCorsOptions(env = process.env) {
  const allowedOrigins = getAllowedCorsOrigins(env);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
  };
}

module.exports = {
  buildCorsOptions,
  getAllowedCorsOrigins,
  getServiceConfigStatus,
  validateStartupEnv,
};
