const Redis = require("ioredis");

let redisClient = null;
let redisAvailable = false;

const initRedis = () => {
  // Skip Redis if explicitly disabled
  if (process.env.REDIS_ENABLED === "false") {
    return null;
  }

  if (redisClient) return redisClient;

  const redisConfig = {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts
      if (times > 3) {
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect immediately
  };

  redisClient = new Redis(redisConfig);

  redisClient.on("connect", () => {
    redisAvailable = true;
    console.log("✅ Redis connected successfully");
  });

  redisClient.on("error", (err) => {
    redisAvailable = false;
    // Only show error once in development
    if (process.env.NODE_ENV !== "production" && !redisClient._errorShown) {
      console.log("ℹ️  Redis not available (optional) - app will work without caching");
      redisClient._errorShown = true;
    }
  });

  redisClient.on("close", () => {
    redisAvailable = false;
  });

  // Try to connect
  redisClient.connect().catch(() => {
    // Silently fail - Redis is optional
    redisAvailable = false;
  });

  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};

// Cache helper functions
const cacheGet = async (key) => {
  if (!redisAvailable) return null;
  
  try {
    const client = getRedisClient();
    if (!client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  if (!redisAvailable) return false;
  
  try {
    const client = getRedisClient();
    if (!client) return false;
    await client.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

const cacheDel = async (key) => {
  if (!redisAvailable) return false;
  
  try {
    const client = getRedisClient();
    if (!client) return false;
    await client.del(key);
    return true;
  } catch (error) {
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  if (!redisAvailable) return false;
  
  try {
    const client = getRedisClient();
    if (!client) return false;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  isRedisAvailable: () => redisAvailable,
};
