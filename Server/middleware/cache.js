const { cacheGet, cacheSet } = require("../config/redis");

// Cache middleware factory
const cacheMiddleware = (keyPrefix, ttl = 3600) => {
  return async (req, res, next) => {
    // Skip cache for non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    try {
      const cachedData = await cacheGet(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (data && data.success !== false) {
          cacheSet(cacheKey, data, ttl).catch(err => {
            console.error("Cache set error:", err);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
};

module.exports = { cacheMiddleware };
