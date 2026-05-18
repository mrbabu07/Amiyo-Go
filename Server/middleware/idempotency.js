const crypto = require("crypto");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function getIdempotencyKey(req) {
  return req.get("Idempotency-Key") || req.get("X-Idempotency-Key") || "";
}

function actorScope(req) {
  return String(
    req.user?.uid ||
      req.user?._id ||
      req.headers["x-guest-session-id"] ||
      req.ip ||
      "anonymous",
  );
}

async function ensureIdempotencyIndexes(collection) {
  if (collection.__idempotencyIndexesReady) return;
  await collection.createIndex(
    { scope: 1, actorId: 1, key: 1 },
    { unique: true, name: "idempotency_scope_actor_key" },
  );
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "idempotency_expiry" });
  collection.__idempotencyIndexesReady = true;
}

function idempotencyMiddleware(options = {}) {
  const {
    scope = "global",
    ttlHours = 24,
    required = false,
  } = options;

  return async (req, res, next) => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const key = getIdempotencyKey(req).trim();
    const missingAllowedForTests = process.env.NODE_ENV === "test";

    if (!key) {
      if (required && !missingAllowedForTests) {
        return res.status(400).json({
          success: false,
          error: "Idempotency-Key header is required for this operation",
        });
      }
      next();
      return;
    }

    if (key.length < 8 || key.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Idempotency-Key must be between 8 and 200 characters",
      });
    }

    const db = req.app.locals.db;
    if (!db) {
      if (required) {
        return res.status(503).json({
          success: false,
          error: "Idempotency store is not ready",
        });
      }
      next();
      return;
    }

    const collection = db.collection("idempotency_keys");
    await ensureIdempotencyIndexes(collection);

    const now = new Date();
    const actorId = actorScope(req);
    const fingerprint = hashPayload({
      method: req.method,
      path: req.originalUrl || req.url,
      body: req.body || {},
      actorId,
    });
    const query = { scope, actorId, key };
    const existing = await collection.findOne(query);

    if (existing && existing.expiresAt && new Date(existing.expiresAt) < now) {
      await collection.deleteOne(query);
    } else if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return res.status(409).json({
          success: false,
          error: "Idempotency-Key was already used for a different request",
        });
      }

      if (existing.status === "completed") {
        res.set("Idempotency-Replayed", "true");
        return res.status(existing.statusCode || 200).json(existing.responseBody);
      }

      return res.status(409).json({
        success: false,
        error: "A request with this Idempotency-Key is still processing",
      });
    }

    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    try {
      await collection.insertOne({
        scope,
        actorId,
        key,
        fingerprint,
        status: "processing",
        createdAt: now,
        updatedAt: now,
        expiresAt,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: "A request with this Idempotency-Key is already registered",
        });
      }
      throw error;
    }

    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on("finish", async () => {
      try {
        if (res.statusCode >= 500) {
          await collection.deleteOne(query);
          return;
        }

        await collection.updateOne(query, {
          $set: {
            status: "completed",
            statusCode: res.statusCode,
            responseBody,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error("Failed to persist idempotency result:", error.message);
      }
    });

    res.set("Idempotency-Key", key);
    next();
  };
}

module.exports = {
  actorScope,
  hashPayload,
  idempotencyMiddleware,
  stableStringify,
};
