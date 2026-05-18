const {
  getDefaultApiLimitMax,
  getPositiveInteger,
  isAnalyticsViewRequest,
  shouldSkipApiLimiter,
} = require("../../middleware/rateLimiter");

describe("rate limiter defaults", () => {
  it("uses a higher general API budget outside production for local marketplace browsing", () => {
    expect(getDefaultApiLimitMax("development")).toBe(2000);
    expect(getDefaultApiLimitMax("test")).toBe(2000);
  });

  it("uses a bounded production default and allows explicit positive overrides", () => {
    expect(getDefaultApiLimitMax("production")).toBe(600);
    expect(getPositiveInteger("1200", 600)).toBe(1200);
    expect(getPositiveInteger("0", 600)).toBe(600);
    expect(getPositiveInteger("not-a-number", 600)).toBe(600);
  });
});

describe("rate limiter analytics view detection", () => {
  it("detects product view POST requests mounted under /api", () => {
    expect(
      isAnalyticsViewRequest({
        method: "POST",
        path: "/products/6a0351a48569686b6fb9e821/view",
        originalUrl: "/api/products/6a0351a48569686b6fb9e821/view",
      }),
    ).toBe(true);
  });

  it("does not skip non-view product writes", () => {
    expect(
      isAnalyticsViewRequest({
        method: "POST",
        path: "/products/6a0351a48569686b6fb9e821/report",
        originalUrl: "/api/products/6a0351a48569686b6fb9e821/report",
      }),
    ).toBe(false);
  });

  it("does not skip GET requests for product detail pages", () => {
    expect(
      isAnalyticsViewRequest({
        method: "GET",
        path: "/products/6a0351a48569686b6fb9e821/view",
        originalUrl: "/api/products/6a0351a48569686b6fb9e821/view",
      }),
    ).toBe(false);
  });

  it("skips preflight requests without counting them against the general API limit", () => {
    expect(shouldSkipApiLimiter({ method: "OPTIONS", path: "/user/me" })).toBe(true);
  });

  it("keeps normal app data requests inside the configurable general API limiter", () => {
    expect(shouldSkipApiLimiter({ method: "GET", path: "/user/me", originalUrl: "/api/user/me" })).toBe(false);
  });
});
