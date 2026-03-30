const rateLimit = require("express-rate-limit");
const { getRedisClient } = require("../config/redis");

// Redis store for rate limiting (optional, falls back to memory)
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || "rl:";
    this.client = getRedisClient();
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  async increment(key) {
    const redisKey = this.prefix + key;
    try {
      const current = await this.client.incr(redisKey);
      if (current === 1) {
        await this.client.expire(redisKey, 60); // 60 seconds default
      }
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + 60000),
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

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis store if available
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:api:" }) : undefined,
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
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:auth:" }) : undefined,
});

// Payment endpoint limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment attempts per hour
  message: {
    success: false,
    error: "Too many payment attempts, please try again later.",
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:payment:" }) : undefined,
});

// Upload limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per 15 minutes
  message: {
    success: false,
    error: "Too many upload requests, please try again later.",
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:upload:" }) : undefined,
});

// Search limiter (prevent scraping)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    success: false,
    error: "Too many search requests, please slow down.",
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: "rl:search:" }) : undefined,
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  uploadLimiter,
  searchLimiter,
};
