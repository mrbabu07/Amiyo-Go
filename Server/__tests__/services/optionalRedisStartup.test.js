describe("optional Redis startup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_ENABLED;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock("redis");
    jest.dontMock("ioredis");
  });

  test("campaign cache does not probe localhost when Redis is not configured", async () => {
    const createClient = jest.fn();
    jest.doMock("redis", () => ({ createClient }));

    const campaignCache = require("../../services/CampaignCacheService");
    const result = await campaignCache.initialize();

    expect(result).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
    expect(campaignCache.isConnected).toBe(false);
  });

  test("general cache does not create an ioredis client when Redis is not configured", () => {
    const Redis = jest.fn();
    jest.doMock("ioredis", () => Redis);

    const cache = require("../../config/redis");

    expect(cache.initRedis()).toBeNull();
    expect(Redis).not.toHaveBeenCalled();
    expect(cache.isRedisAvailable()).toBe(false);
  });
});
