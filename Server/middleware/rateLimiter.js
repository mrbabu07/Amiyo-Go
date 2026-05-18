const rateLimit = require("express-rate-limit");
const { getRedisClient } = require("../config/redis");

// Redis store for rate limiting (optional, falls back to memory)
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || "rl:";
    this.client = getRedisClient();
    this.windowMs = options.windowMs || 60000;
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  async increment(key) {
    const redisKey = this.prefix + key;
    try {
      const current = await this.client.incr(redisKey);
      if (current === 1) {
        await this.client.expire(redisKey, Math.ceil(this.windowMs / 1000));
      }
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + this.windowMs),
      };
    } catch (error) {
      console.error("Rate limit increment error:", error);
      return { totalHits: 0, resetTime: new Date() };
    }
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    try {
      await this.client.decr(redisKey);
    } catch (error) {
      console.error("Rate limit decrement error:", error);
    }
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    try {
      await this.client.del(redisKey);
    } catch (error) {
      console.error("Rate limit reset error:", error);
    }
  }
}

const analyticsViewPatterns = [
  /^\/api\/products\/[a-f\d]{24}\/view$/i,
  /^\/products\/[a-f\d]{24}\/view$/i,
  /^\/api\/campaigns\/[^/]+\/view$/i,
  /^\/campaigns\/[^/]+\/view$/i,
];

function getPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDefaultApiLimitMax(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "production" ? 600 : 2000;
}

function isAnalyticsViewRequest(req = {}) {
  if (req.method !== "POST") return false;

  const paths = [req.path, req.url, req.originalUrl]
    .filter(Boolean)
    .map((value) => String(value).split("?")[0]);

  return paths.some((path) => analyticsViewPatterns.some((pattern) => pattern.test(path)));
}

function shouldSkipApiLimiter(req = {}) {
  if (req.method === "OPTIONS") return true;
  return isAnalyticsViewRequest(req);
}

const apiWindowMs = getPositiveInteger(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const apiMax = getPositiveInteger(process.env.API_RATE_LIMIT_MAX, getDefaultApiLimitMax());

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipApiLimiter,
  // Use Redis store if available
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:api:", windowMs: apiWindowMs }) : undefined,
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true,
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:auth:", windowMs: 15 * 60 * 1000 }) : undefined,
});

// Payment endpoint limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment attempts per hour
  message: {
    success: false,
    error: "Too many payment attempts, please try again later.",
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:payment:", windowMs: 60 * 60 * 1000 }) : undefined,
});

// Upload limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per 15 minutes
  message: {
    success: false,
    error: "Too many upload requests, please try again later.",
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:upload:", windowMs: 15 * 60 * 1000 }) : undefined,
});

// Search limiter (prevent scraping)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    success: false,
    error: "Too many search requests, please slow down.",
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:search:", windowMs: 1 * 60 * 1000 }) : undefined,
});

// High-volume analytics view tracking should not consume the general API budget.
const productViewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  message: {
    success: false,
    error: "Too many product view events, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:product-view:", windowMs: 1 * 60 * 1000 }) : undefined,
});

module.exports = {
  apiLimiter,
  authLimiter,
  getDefaultApiLimitMax,
  getPositiveInteger,
  isAnalyticsViewRequest,
  paymentLimiter,
  productViewLimiter,
  shouldSkipApiLimiter,
  uploadLimiter,
  searchLimiter,
};
