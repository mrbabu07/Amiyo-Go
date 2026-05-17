const { _analyticsTestUtils } = require("../../controllers/adminAnalyticsController");

const start = new Date("2026-05-01T00:00:00.000Z");
const end = new Date("2026-05-08T00:00:00.000Z");

const sampleData = {
  start,
  end,
  granularity: "day",
  range: "7d",
  orders: [
    {
      _id: "order-1",
      userId: "customer-1",
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "bkash",
      totalAmount: 1200,
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      products: [
        { productId: "prod-1", vendorId: "vendor-1", vendorName: "Tech Shop", categoryId: "cat-phone", categoryName: "Phones", quantity: 2, price: 500 },
        { productId: "prod-2", vendorId: "vendor-2", vendorName: "Home Shop", categoryId: "cat-home", categoryName: "Home", quantity: 1, price: 200 },
      ],
    },
    {
      _id: "order-2",
      userId: "customer-1",
      status: "processing",
      paymentStatus: "paid",
      paymentMethod: "cod",
      totalAmount: 600,
      createdAt: new Date("2026-05-04T10:00:00.000Z"),
      products: [
        { productId: "prod-1", vendorId: "vendor-1", vendorName: "Tech Shop", categoryId: "cat-phone", categoryName: "Phones", quantity: 1, price: 600 },
      ],
    },
    {
      _id: "order-3",
      userId: "customer-2",
      status: "cancelled",
      paymentStatus: "pending",
      paymentMethod: "nagad",
      totalAmount: 700,
      createdAt: new Date("2026-05-05T10:00:00.000Z"),
    },
    {
      _id: "order-last-year",
      userId: "customer-9",
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "bkash",
      totalAmount: 800,
      createdAt: new Date("2025-05-01T10:00:00.000Z"),
      products: [{ productId: "prod-1", vendorId: "vendor-1", quantity: 1, price: 800 }],
    },
    {
      _id: "order-before-range",
      userId: "customer-1",
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "bkash",
      totalAmount: 300,
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      products: [{ productId: "prod-3", vendorId: "vendor-1", quantity: 1, price: 300 }],
    },
  ],
  returns: [
    {
      _id: "return-1",
      orderId: "order-1",
      vendorId: "vendor-1",
      vendorName: "Tech Shop",
      categoryId: "cat-phone",
      categoryName: "Phones",
      reasonCode: "damaged",
      refundAmount: 500,
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      products: [{ productId: "prod-1", vendorId: "vendor-1", vendorName: "Tech Shop", categoryId: "cat-phone", categoryName: "Phones", refundAmount: 500 }],
    },
  ],
  users: [
    { _id: "customer-1", createdAt: new Date("2026-01-01T10:00:00.000Z") },
    { _id: "customer-2", createdAt: new Date("2026-05-02T10:00:00.000Z") },
  ],
  vendors: [
    { _id: "vendor-1", shopName: "Tech Shop", healthScore: 92 },
    { _id: "vendor-2", shopName: "Home Shop", healthScore: 87 },
  ],
  products: [
    { _id: "prod-1", title: "Phone", vendorId: "vendor-1", categoryId: "cat-phone", categoryName: "Phones" },
    { _id: "prod-2", title: "Lamp", vendorId: "vendor-2", categoryId: "cat-home", categoryName: "Home" },
  ],
  reviews: [
    { _id: "review-1", vendorId: "vendor-1", productId: "prod-1", rating: 5 },
    { _id: "review-2", vendorId: "vendor-1", productId: "prod-1", rating: 4 },
    { _id: "review-3", vendorId: "vendor-2", productId: "prod-2", rating: 3 },
  ],
  sessions: [
    { _id: "session-1", sessionId: "s1", createdAt: new Date("2026-05-01T09:00:00.000Z") },
    { _id: "session-2", sessionId: "s2", createdAt: new Date("2026-05-01T09:10:00.000Z") },
  ],
  pageViews: [
    { _id: "pv-1", sessionId: "s1", path: "/product/prod-1", createdAt: new Date("2026-05-01T09:11:00.000Z") },
  ],
  events: [
    { _id: "event-1", sessionId: "s1", type: "add_to_cart", createdAt: new Date("2026-05-01T09:12:00.000Z") },
    { _id: "event-2", sessionId: "s1", type: "checkout_started", createdAt: new Date("2026-05-01T09:15:00.000Z") },
    { _id: "event-3", sessionId: "s2", type: "search", query: "iphone", resultCount: 0, createdAt: new Date("2026-05-02T09:00:00.000Z") },
    { _id: "event-4", sessionId: "s2", type: "search", query: "rice cooker", resultCount: 5, conversions: 0, createdAt: new Date("2026-05-03T09:00:00.000Z") },
  ],
  searchLogs: [
    { _id: "search-1", term: "eid dress", resultCount: 0, createdAt: new Date("2026-05-04T09:00:00.000Z") },
    { _id: "search-2", term: "phone case", resultCount: 10, conversions: 0, createdAt: new Date("2026-05-04T09:05:00.000Z") },
  ],
  marketingSpend: [
    { _id: "spend-1", amount: 1000, date: new Date("2026-05-02T00:00:00.000Z") },
  ],
};

describe("adminAnalyticsController report builders", () => {
  test("builds GMV trend with YoY comparison and conversion funnel", () => {
    const report = _analyticsTestUtils.buildAdminAnalyticsReport(sampleData);

    expect(report.summary).toEqual(expect.objectContaining({
      totalGmv: 1800,
      totalOrders: 2,
      deliveredOrders: 1,
    }));
    expect(report.gmvTrend.find((row) => row.key === "2026-05-01")).toEqual(expect.objectContaining({
      gmv: 1200,
      previousYearGmv: 800,
      yoyChangePct: 50,
    }));
    expect(report.conversionFunnel.map((step) => step.key)).toEqual([
      "sessions",
      "productViews",
      "addToCart",
      "checkout",
      "paid",
      "delivered",
    ]);
    expect(report.conversionFunnel.find((step) => step.key === "paid").count).toBe(2);
  });

  test("builds acquisition, category, vendor, payment, search, return, and forecast sections", () => {
    const report = _analyticsTestUtils.buildAdminAnalyticsReport(sampleData);

    expect(report.acquisition.summary).toEqual(expect.objectContaining({
      newUsers: 1,
      returningBuyers: 1,
      marketingSpend: 1000,
    }));
    expect(report.categoryPerformance[0]).toEqual(expect.objectContaining({
      categoryName: "Phones",
      revenue: 1600,
      returnCount: 1,
    }));
    expect(report.vendorLeague[0]).toEqual(expect.objectContaining({
      vendorName: "Tech Shop",
      gmv: 1600,
      customerRating: 4.5,
      healthScore: 92,
    }));
    expect(report.paymentBreakdown.map((row) => row.method)).toEqual(expect.arrayContaining(["bkash", "cod"]));
    expect(report.searchAnalytics.topNoResults.map((row) => row.term)).toEqual(expect.arrayContaining(["iphone", "eid dress"]));
    expect(report.searchAnalytics.topZeroConversion.map((row) => row.term)).toEqual(expect.arrayContaining(["rice cooker", "phone case"]));
    expect(report.refundReturnAnalytics.byReason[0]).toEqual(expect.objectContaining({ reason: "damaged", returns: 1 }));
    expect(report.revenueForecast.projection).toHaveLength(30);
    expect(report.revenueForecast.projected30DayGmv).toBeGreaterThan(0);
  });

  test("exports report rows as CSV and simple PDF buffers", () => {
    const report = _analyticsTestUtils.buildAdminAnalyticsReport(sampleData);
    const rows = _analyticsTestUtils.getReportRows(report, "vendorLeague");
    const csv = _analyticsTestUtils.rowsToCsv(rows);
    const pdf = _analyticsTestUtils.rowsToPdf("vendorLeague", rows);

    expect(csv).toContain("vendorName");
    expect(csv).toContain("Tech Shop");
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString("utf8", 0, 8)).toContain("%PDF-1.");
  });
});
