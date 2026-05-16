const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    req.user = {
      uid: "test-user",
      role: req.headers["x-test-role"] || "admin",
    };
    return next();
  },
  verifyAdmin: (req, res, next) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  },
  requireRole: (role) => (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `${role} access required` });
    }
    return next();
  },
  requireApprovedVendor: (req, res, next) => {
    if (req.user?.role !== "vendor") {
      return res.status(403).json({ error: "Approved vendor access required" });
    }
    return next();
  },
}));

jest.mock("../controllers/productController", () => ({
  getAllProducts: (req, res) => res.json({ route: "products:list" }),
  getProductById: (req, res) => res.json({ route: "products:id", id: req.params.id }),
  searchProducts: (req, res) => res.json({ route: "products:search", q: req.query.q || "" }),
  createProduct: (req, res) => res.status(201).json({ route: "products:create" }),
  updateProduct: (req, res) => res.json({ route: "products:update", id: req.params.id }),
  deleteProduct: (req, res) => res.json({ route: "products:delete", id: req.params.id }),
  getFilterOptions: (req, res) => res.json({ route: "products:filter-options" }),
  getLowStockProducts: (req, res) => res.json({ route: "products:low-stock" }),
  getOutOfStockProducts: (req, res) => res.json({ route: "products:out-of-stock" }),
  updateStockBulk: (req, res) => res.json({ route: "products:bulk-stock-update" }),
  incrementProductView: (req, res) => res.json({ route: "products:view", id: req.params.id }),
  updateProductVariants: (req, res) => res.json({ route: "products:update-variants", id: req.params.id }),
  getProductVariants: (req, res) => res.json({ route: "products:variants", id: req.params.id }),
}));

jest.mock("../controllers/orderController", () => ({
  getAllOrders: (req, res) => res.json({ route: "orders:list" }),
  getAdminOrders: (req, res) => res.json({ route: "orders:admin-list" }),
  getAdminOrderById: (req, res) => res.json({ route: "orders:detail", id: req.params.id }),
  getAdminOrderStats: (req, res) => res.json({ route: "orders:admin-stats" }),
  exportOrdersCsv: (req, res) => res.json({ route: "orders:export-csv" }),
  bulkUpdateOrderStatus: (req, res) => res.json({ route: "orders:bulk-status" }),
  addOrderNote: (req, res) => res.json({ route: "orders:add-note", id: req.params.id }),
  regenerateInvoice: (req, res) => res.json({ route: "orders:regenerate-invoice", id: req.params.id }),
  getOrderTimelineEvents: (req, res) => res.json({ route: "orders:timeline", id: req.params.id }),
  getUserOrders: (req, res) => res.json({ route: "orders:my-orders" }),
  createOrder: (req, res) =>
    res.status(201).json({
      route: req.path === "/guest" ? "orders:guest-create" : "orders:create",
    }),
  updateOrderStatus: (req, res) => res.json({ route: "orders:update-status", id: req.params.id }),
  cancelOrder: (req, res) => res.json({ route: "orders:cancel", id: req.params.id }),
  downloadInvoice: (req, res) => res.json({ route: "orders:invoice", id: req.params.id }),
  adminCancelOrder: (req, res) => res.json({ route: "orders:admin-cancel", id: req.params.id }),
  adminResolveDispute: (req, res) => res.json({ route: "orders:resolve-dispute", id: req.params.id }),
  adminApproveRefund: (req, res) => res.json({ route: "orders:approve-refund", id: req.params.id }),
  adminOverrideStatus: (req, res) => res.json({ route: "orders:override-status", id: req.params.id }),
}));

jest.mock("../controllers/vendorController", () => ({
  registerVendor: (req, res) => res.status(201).json({ route: "vendors:register" }),
  getFollowedVendorFeed: (req, res) => res.json({ route: "vendors:followed-feed" }),
  getVendorPublicInfo: (req, res) => res.json({ route: "vendors:public", id: req.params.id }),
  getVendorPublicInfoBySlug: (req, res) => res.json({ route: "vendors:public-slug", slug: req.params.slug }),
  getFollowStatus: (req, res) => res.json({ route: "vendors:follow-status", id: req.params.id }),
  followVendor: (req, res) => res.json({ route: "vendors:follow", id: req.params.id }),
  unfollowVendor: (req, res) => res.json({ route: "vendors:unfollow", id: req.params.id }),
  getMyVendorProfile: (req, res) => res.json({ route: "vendors:me" }),
  updateVendorProfile: (req, res) => res.json({ route: "vendors:update-me" }),
  getMyKyc: (req, res) => res.json({ route: "vendors:kyc-me" }),
  submitVendorKyc: (req, res) => res.json({ route: "vendors:kyc-submit" }),
  getKycQueue: (req, res) => res.json({ route: "vendors:kyc-queue" }),
  reviewVendorKyc: (req, res) => res.json({ route: "vendors:kyc-review", id: req.params.vendorId }),
  uploadLogo: (req, res) => res.json({ route: "vendors:upload-logo" }),
  uploadBanner: (req, res) => res.json({ route: "vendors:upload-banner" }),
  getVendorAllowedCategories: (req, res) => res.json({ route: "vendors:my-categories" }),
  getShopStatus: (req, res) => res.json({ route: "vendors:shop-status" }),
  toggleShopStatus: (req, res) => res.json({ route: "vendors:shop-toggle" }),
  setVacationMode: (req, res) => res.json({ route: "vendors:vacation-set" }),
  cancelVacationMode: (req, res) => res.json({ route: "vendors:vacation-cancel" }),
  getAllVendors: (req, res) => res.json({ route: "vendors:admin-list" }),
  getVendorStats: (req, res) => res.json({ route: "vendors:stats" }),
  getVendorById: (req, res) => res.json({ route: "vendors:admin-id", id: req.params.id }),
  updateVendor: (req, res) => res.json({ route: "vendors:admin-update", id: req.params.id }),
  approveVendor: (req, res) => res.json({ route: "vendors:approve", id: req.params.id }),
  suspendVendor: (req, res) => res.json({ route: "vendors:suspend", id: req.params.id }),
  rejectVendor: (req, res) => res.json({ route: "vendors:reject", id: req.params.id }),
  reactivateVendor: (req, res) => res.json({ route: "vendors:reactivate", id: req.params.id }),
}));

jest.mock("../controllers/vendorDashboardController", () => ({
  getDashboardStats: (req, res) => res.json({ route: "vendor-dashboard:stats" }),
  getVendorReports: (req, res) => res.json({ route: "vendor-dashboard:reports" }),
  getVendorOrderStats: (req, res) => res.json({ route: "vendor-dashboard:order-stats" }),
  getVendorOrders: (req, res) => res.json({ route: "vendor-dashboard:orders" }),
  getVendorOrderDetail: (req, res) => res.json({ route: "vendor-dashboard:order-detail", id: req.params.orderId }),
  updateOrderStatus: (req, res) => res.json({ route: "vendor-dashboard:update-order-status", id: req.params.orderId }),
  packVendorItems: (req, res) => res.json({ route: "vendor-dashboard:pack", id: req.params.orderId }),
  shipVendorItems: (req, res) => res.json({ route: "vendor-dashboard:ship", id: req.params.orderId }),
  deliverVendorItems: (req, res) => res.json({ route: "vendor-dashboard:deliver", id: req.params.orderId }),
  getTopProducts: (req, res) => res.json({ route: "vendor-dashboard:top-products" }),
}));

jest.mock("../controllers/adminVendorPerformanceController", () => ({
  getVendorPerformance: (req, res) => res.json({ route: "vendors:performance", id: req.params.id }),
}));

jest.mock("../controllers/adminFinanceController", () => ({
  getVendorFinanceSummary: (req, res) => res.json({ route: "vendors:finance-summary", id: req.params.vendorId }),
  getVendorFinanceTransactions: (req, res) => res.json({ route: "vendors:finance-transactions", id: req.params.vendorId }),
}));

jest.mock("../controllers/vendorsFinanceController", () => ({
  getTransactions: (req, res) => res.json({ route: "vendors:self-finance-transactions" }),
  getStatements: (req, res) => res.json({ route: "vendors:self-finance-statements" }),
  getPayments: (req, res) => res.json({ route: "vendors:self-finance-payments" }),
}));

jest.mock("../controllers/vendorMarketingController", () => ({
  listPublicVendorMarketingItems: (req, res) =>
    res.json({ route: "vendors:public-marketing", id: req.params.id }),
  recordPublicVendorMarketingEvent: (req, res) =>
    res.json({ route: "vendors:public-marketing-event", id: req.params.id, itemId: req.params.itemId }),
  listVendorMarketingItems: (req, res) => res.json({ route: "vendors:marketing-list" }),
  getCampaignVoucherAnalytics: (req, res) => res.json({ route: "vendors:marketing-analytics" }),
  createVendorMarketingItem: (req, res) => res.status(201).json({ route: "vendors:marketing-create" }),
  updateVendorMarketingItem: (req, res) =>
    res.json({ route: "vendors:marketing-update", id: req.params.id }),
  deleteVendorMarketingItem: (req, res) =>
    res.json({ route: "vendors:marketing-delete", id: req.params.id }),
}));

jest.mock("../controllers/adminPayoutController", () => ({
  calculateEligiblePayout: (req, res) =>
    res.json({ route: "payouts:eligible", vendorId: req.params.vendorId }),
  createPayout: (req, res) => res.status(201).json({ route: "payouts:create", vendorId: req.params.vendorId }),
  getAllPayouts: (req, res) => res.json({ route: "payouts:list" }),
  getPayoutById: (req, res) => res.json({ route: "payouts:id", payoutId: req.params.payoutId }),
  markPayoutPaid: (req, res) => res.json({ route: "payouts:paid", payoutId: req.params.payoutId }),
  cancelPayout: (req, res) => res.json({ route: "payouts:cancel", payoutId: req.params.payoutId }),
  getPayoutStats: (req, res) => res.json({ route: "payouts:stats" }),
  getVendorPayouts: (req, res) => res.json({ route: "payouts:my-payouts" }),
  getWeeklyPayoutList: (req, res) => res.json({ route: "payouts:weekly-list" }),
  createBulkPayouts: (req, res) => res.status(201).json({ route: "payouts:bulk-create" }),
  getPayoutRequests: (req, res) => res.json({ route: "payouts:requests" }),
  approvePayoutRequest: (req, res) => res.json({ route: "payouts:approve-request", payoutId: req.params.payoutId }),
  rejectPayoutRequest: (req, res) => res.json({ route: "payouts:reject-request", payoutId: req.params.payoutId }),
  markRequestPaid: (req, res) => res.json({ route: "payouts:mark-request-paid", payoutId: req.params.payoutId }),
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/products", require("../routes/productRoutes"));
  app.use("/api/orders", require("../routes/orderRoutes"));
  app.use("/api/vendors", require("../routes/vendorRoutes"));
  app.use("/api/admin/payouts", require("../routes/adminPayoutRoutes"));
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  return app;
};

describe("Black-box API tests", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  describe("public product routes", () => {
    test("GET /api/products/search uses the search route, not the id route", async () => {
      const response = await request(app).get("/api/products/search?q=rice");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "products:search", q: "rice" });
    });

    test("GET /api/products/filter-options uses the static filter route", async () => {
      const response = await request(app).get("/api/products/filter-options");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "products:filter-options" });
    });

    test("GET /api/products/abc123 falls through to the product detail route", async () => {
      const response = await request(app).get("/api/products/abc123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "products:id", id: "abc123" });
    });
  });

  describe("protected route behavior", () => {
    test("GET /api/products/admin/low-stock rejects requests without a token", async () => {
      const response = await request(app).get("/api/products/admin/low-stock");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "No token provided" });
    });

    test("GET /api/vendors/marketing/items rejects admin access when vendor role is required", async () => {
      const response = await request(app)
        .get("/api/vendors/marketing/items")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "vendor access required" });
    });
  });

  describe("order API behavior", () => {
    test("GET /api/orders/admin/stats uses the admin stats route", async () => {
      const response = await request(app)
        .get("/api/orders/admin/stats")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:admin-stats" });
    });

    test("POST /api/orders/guest allows guest checkout without auth", async () => {
      const response = await request(app).post("/api/orders/guest").send({
        items: [{ productId: "p1", quantity: 1 }],
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ route: "orders:guest-create" });
    });
  });

  describe("vendor API behavior", () => {
    test("GET /api/vendors/stats uses the admin stats route, not vendor id route", async () => {
      const response = await request(app)
        .get("/api/vendors/stats")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:stats" });
    });

    test("GET /api/vendors/marketing/items uses the vendor marketing list route", async () => {
      const response = await request(app)
        .get("/api/vendors/marketing/items")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:marketing-list" });
    });

    test("GET /api/vendors/reports uses the vendor reports route", async () => {
      const response = await request(app)
        .get("/api/vendors/reports?period=90")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendor-dashboard:reports" });
    });

    test("GET /api/vendors/slug/:slug/public uses the public slug route", async () => {
      const response = await request(app).get("/api/vendors/slug/my-brand/public");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:public-slug", slug: "my-brand" });
    });
  });

  describe("admin payout API behavior", () => {
    test("GET /api/admin/payouts/weekly-list uses the weekly list route", async () => {
      const response = await request(app)
        .get("/api/admin/payouts/weekly-list")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "payouts:weekly-list" });
    });

    test("GET /api/admin/payouts/vendor/vendor-1/eligible uses the vendor eligible route", async () => {
      const response = await request(app)
        .get("/api/admin/payouts/vendor/vendor-1/eligible")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "payouts:eligible", vendorId: "vendor-1" });
    });

    test("GET /api/admin/payouts/requests uses the payout requests route", async () => {
      const response = await request(app)
        .get("/api/admin/payouts/requests")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "payouts:requests" });
    });
  });

  describe("fallback behavior", () => {
    test("unknown routes return 404", async () => {
      const response = await request(app).get("/api/does-not-exist");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Not found" });
    });
  });
});
