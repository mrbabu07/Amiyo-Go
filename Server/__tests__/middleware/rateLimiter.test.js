const { isAnalyticsViewRequest } = require("../../middleware/rateLimiter");

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
});
