const SENSITIVE_PREFIXES = [
  "/api/admin",
  "/api/vendors",
  "/api/vendors/finance",
  "/api/vendors/kyc",
  "/api/vendor/products",
  "/api/vendor-chat",
  "/api/orders",
  "/api/payments",
  "/api/returns",
  "/api/support",
  "/api/coupons",
  "/api/categories",
  "/api/dynamic-categories",
  "/api/dynamic-products",
  "/api/offers",
  "/api/flash-sales",
  "/api/campaigns",
  "/api/uploads",
];

const REDACTED_KEYS = new Set([
  "password",
  "pin",
  "bkashpin",
  "nagadpin",
  "token",
  "authorization",
  "privatekey",
  "secret",
]);

const sanitizeValue = (value) => {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return "[buffer]";
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value !== "object") return value;

  return Object.entries(value).reduce((safe, [key, item]) => {
    if (REDACTED_KEYS.has(String(key).toLowerCase())) {
      safe[key] = "[redacted]";
      return safe;
    }
    safe[key] = sanitizeValue(item);
    return safe;
  }, {});
};

const inferTarget = (req) => {
  const params = req.params || {};
  const id =
    params.id ||
    params.orderId ||
    params.vendorId ||
    params.productId ||
    params.payoutId ||
    params.requestId ||
    null;

  const path = req.baseUrl || req.path || "";
  const parts = path
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean);
  const targetType = parts[0] === "admin" && parts[1] ? `admin_${parts[1]}` : parts[0] || "api";

  return {
    type: targetType,
    id: id ? String(id) : null,
    path: req.originalUrl,
  };
};

const shouldAudit = (req) => {
  if (!req.originalUrl?.startsWith("/api/")) return false;

  const isSensitivePath = SENSITIVE_PREFIXES.some((prefix) =>
    req.originalUrl.startsWith(prefix),
  );

  if (!isSensitivePath) return false;
  if (req.method !== "GET") return true;

  return req.originalUrl.startsWith("/api/admin") ||
    req.originalUrl.includes("/finance") ||
    req.originalUrl.includes("/payments");
};

const auditSensitiveOperations = (req, res, next) => {
  if (!shouldAudit(req)) {
    next();
    return;
  }

  const startedAt = Date.now();
  res.on("finish", async () => {
    try {
      const AuditLog = req.app.locals.models?.AuditLog;
      if (!AuditLog) return;

      const actorUser = req.dbUser || {};
      await AuditLog.append({
        actor: {
          userId: actorUser._id?.toString?.() || req.user?._id?.toString?.() || null,
          firebaseUid: actorUser.firebaseUid || req.user?.uid || null,
          email: actorUser.email || req.user?.email || null,
          role: actorUser.role || req.user?.role || "guest",
        },
        action: `${req.method} ${req.originalUrl}`,
        target: inferTarget(req),
        diff: {
          params: sanitizeValue(req.params || {}),
          query: sanitizeValue(req.query || {}),
          body: sanitizeValue(req.body || {}),
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        },
        ip: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
        userAgent: req.headers["user-agent"] || "",
      });
    } catch (error) {
      console.error("Failed to write audit log:", error.message);
    }
  });

  next();
};

module.exports = {
  auditSensitiveOperations,
};
