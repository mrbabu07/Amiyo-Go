const auditService = require("../services/audit/auditService");

function auditMiddleware(action, resource) {
  return (req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const actor = req.dbUser || req.user || {};
      auditService
        .log({
          app: req.app,
          actorId: actor._id || actor.uid || null,
          actorType: actor.role || "customer",
          actorEmail: actor.email || "",
          action,
          resource,
          resourceId:
            req.params?.id ||
            req.params?.orderId ||
            req.params?.vendorId ||
            req.params?.productId ||
            null,
          changes: {
            params: req.params || {},
            query: req.query || {},
            body: req.body || {},
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
          },
          ip: req.ip,
          userAgent: req.headers["user-agent"] || "",
        })
        .catch((error) => console.error("Audit middleware failed:", error.message));
    });
    next();
  };
}

module.exports = auditMiddleware;
