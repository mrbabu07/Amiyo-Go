const redis = require("redis");

class CampaignCacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
      });

      this.client.on("error", (err) => {
        console.error("Redis error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("Redis connected");
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      this.isConnected = false;
    }
  }

  /**
   * Cache campaign object
   */
  async cacheCampaign(campaignId, campaign, ttl = 300) {
    try {
      if (!this.isConnected) return;

      const key = `campaign:${campaignId}`;
      await this.client.setEx(key, ttl, JSON.stringify(campaign));
    } catch (error) {
      console.error("Failed to cache campaign:", error);
    }
  }

  /**
   * Get cached campaign
   */
  async getCachedCampaign(campaignId) {
    try {
      if (!this.isConnected) return null;

      const key = `campaign:${campaignId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get cached campaign:", error);
      return null;
    }
  }

  /**
   * Cache campaign by slug
   */
  async cacheCampaignSlug(slug, campaignId, ttl = 300) {
    try {
      if (!this.isConnected) return;

      const key = `campaign:slug:${slug}`;
      await this.client.setEx(key, ttl, campaignId);
    } catch (error) {
      console.error("Failed to cache campaign slug:", error);
    }
  }

  /**
   * Get cached campaign ID by slug
   */
  async getCachedCampaignSlug(slug) {
    try {
      if (!this.isConnected) return null;

      const key = `campaign:slug:${slug}`;
      return await this.client.get(key);
    } catch (error) {
      console.error("Failed to get cached campaign slug:", error);
      return null;
    }
  }

  /**
   * Cache campaign products
   */
  async cacheCampaignProducts(campaignId, products, ttl = 600) {
    try {
      if (!this.isConnected) return;

      const key = `campaign:${campaignId}:products`;
      await this.client.setEx(key, ttl, JSON.stringify(products));
    } catch (error) {
      console.error("Failed to cache campaign products:", error);
    }
  }

  /**
   * Get cached campaign products
   */
  async getCachedCampaignProducts(campaignId) {
    try {
      if (!this.isConnected) return null;

      const key = `campaign:${campaignId}:products`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get cached campaign products:", error);
      return null;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(campaignId) {
    try {
      if (!this.isConnected) return;

      const key = `campaign:${campaignId}:views:count`;
      await this.client.incr(key);
      // Set expiry to 5 minutes
      await this.client.expire(key, 300);
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }
  }

  /**
   * Get view count
   */
  async getViewCount(campaignId) {
    try {
      if (!this.isConnected) return 0;

      const key = `campaign:${campaignId}:views:count`;
      const count = await this.client.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error("Failed to get view count:", error);
      return 0;
    }
  }

  /**
   * Cache active campaigns list
   */
  async cacheActiveCampaigns(campaigns, ttl = 300) {
    try {
      if (!this.isConnected) return;

      const key = "campaign:active";
      await this.client.setEx(key, ttl, JSON.stringify(campaigns));
    } catch (error) {
      console.error("Failed to cache active campaigns:", error);
    }
  }

  /**
   * Get cached active campaigns
   */
  async getCachedActiveCampaigns() {
    try {
      if (!this.isConnected) return null;

      const key = "campaign:active";
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get cached active campaigns:", error);
      return null;
    }
  }

  /**
   * Cache scheduled campaigns list
   */
  async cacheScheduledCampaigns(campaigns, ttl = 300) {
    try {
      if (!this.isConnected) return;

      const key = "campaign:scheduled";
      await this.client.setEx(key, ttl, JSON.stringify(campaigns));
    } catch (error) {
      console.error("Failed to cache scheduled campaigns:", error);
    }
  }

  /**
   * Get cached scheduled campaigns
   */
  async getCachedScheduledCampaigns() {
    try {
      if (!this.isConnected) return null;

      const key = "campaign:scheduled";
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get cached scheduled campaigns:", error);
      return null;
    }
  }

  /**
   * Invalidate campaign cache
   */
  async invalidateCampaignCache(campaignId) {
    try {
      if (!this.isConnected) return;

      const keys = [
        `campaign:${campaignId}`,
        `campaign:${campaignId}:products`,
        `campaign:${campaignId}:analytics:daily`,
        `campaign:${campaignId}:views:count`,
      ];

      for (const key of keys) {
        await this.client.del(key);
      }
    } catch (error) {
      console.error("Failed to invalidate campaign cache:", error);
    }
  }

  /**
   * Invalidate all campaign lists
   */
  async invalidateCampaignLists() {
    try {
      if (!this.isConnected) return;

      await this.client.del("campaign:active");
      await this.client.del("campaign:scheduled");
    } catch (error) {
      console.error("Failed to invalidate campaign lists:", error);
    }
  }

  /**
   * Clear all campaign cache
   */
  async clearAllCache() {
    try {
      if (!this.isConnected) return;

      const pattern = "campaign:*";
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      console.log(`Cleared ${keys.length} cache keys`);
    } catch (error) {
      console.error("Failed to clear all cache:", error);
    }
  }

  /**
   * Disconnect Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        console.log("Redis disconnected");
      }
    } catch (error) {
      console.error("Failed to disconnect Redis:", error);
    }
  }
}

module.exports = new CampaignCacheService();
