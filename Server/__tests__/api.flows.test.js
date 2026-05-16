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
      role: req.headers["x-test-role"] || "user",
      vendorId: req.headers["x-test-vendor-id"] || "vendor-1",
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

jest.mock("../controllers/couponController", () => ({
  getAllCoupons: (req, res) => res.json({ route: "coupons:list" }),
  getCouponById: (req, res) => res.json({ route: "coupons:id", id: req.params.id }),
  getActiveCoupons: (req, res) => res.json({ route: "coupons:active" }),
  validateCoupon: (req, res) =>
    res.json({
      route: "coupons:validate",
      code: req.body.code,
      orderTotal: req.body.orderTotal,
      itemsCount: Array.isArray(req.body.items) ? req.body.items.length : 0,
    }),
  createCoupon: (req, res) => res.status(201).json({ route: "coupons:create" }),
  updateCoupon: (req, res) => res.json({ route: "coupons:update", id: req.params.id }),
  deleteCoupon: (req, res) => res.json({ route: "coupons:delete", id: req.params.id }),
  applyCoupon: (req, res) =>
    res.json({
      route: "coupons:apply",
      code: req.body.code,
      user: req.user.uid,
    }),
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
      couponCode: req.body.couponCode || null,
      itemsCount: Array.isArray(req.body.items) ? req.body.items.length : 0,
      shippingAddressType: req.body.shippingAddress ? "provided" : "default",
    }),
  updateOrderStatus: (req, res) => res.json({ route: "orders:update-status", id: req.params.id }),
  cancelOrder: (req, res) => res.json({ route: "orders:cancel", id: req.params.id }),
  downloadInvoice: (req, res) => res.json({ route: "orders:invoice", id: req.params.id }),
  adminCancelOrder: (req, res) => res.json({ route: "orders:admin-cancel", id: req.params.id }),
  adminResolveDispute: (req, res) => res.json({ route: "orders:resolve-dispute", id: req.params.id }),
  adminApproveRefund: (req, res) => res.json({ route: "orders:approve-refund", id: req.params.id }),
  adminOverrideStatus: (req, res) => res.json({ route: "orders:override-status", id: req.params.id }),
}));

jest.mock("../controllers/vendor/vendorFinanceController", () => ({
  getFinanceSummary: (req, res) => res.json({ route: "vendor-finance:summary" }),
  getTransactions: (req, res) => res.json({ route: "vendor-finance:transactions" }),
  getCommissionRates: (req, res) => res.json({ route: "vendor-finance:commission-rates" }),
  downloadStatement: (req, res) =>
    res.json({
      route: "vendor-finance:statement",
      format: req.params.format,
      month: req.query.month || "",
    }),
  downloadTaxInvoice: (req, res) =>
    res.json({
      route: "vendor-finance:tax-invoice",
      month: req.query.month || "",
    }),
  getPayouts: (req, res) => res.json({ route: "vendor-finance:payouts" }),
  getAvailableBalance: (req, res) => res.json({ route: "vendor-finance:available-balance" }),
  requestPayout: (req, res) =>
    res.status(201).json({
      route: "vendor-finance:request-payout",
      amount: req.body.amount,
      payoutMethod: req.body.payoutMethod,
    }),
  getPayoutRequests: (req, res) => res.json({ route: "vendor-finance:payout-requests" }),
  cancelPayoutRequest: (req, res) =>
    res.json({ route: "vendor-finance:cancel-payout-request", id: req.params.id }),
}));

jest.mock("../controllers/adminPayoutController", () => ({
  calculateEligiblePayout: (req, res) =>
    res.json({ route: "admin-payouts:eligible", vendorId: req.params.vendorId }),
  createPayout: (req, res) => res.status(201).json({ route: "admin-payouts:create" }),
  getAllPayouts: (req, res) => res.json({ route: "admin-payouts:list" }),
  getPayoutById: (req, res) => res.json({ route: "admin-payouts:id", payoutId: req.params.payoutId }),
  markPayoutPaid: (req, res) => res.json({ route: "admin-payouts:paid", payoutId: req.params.payoutId }),
  cancelPayout: (req, res) => res.json({ route: "admin-payouts:cancel", payoutId: req.params.payoutId }),
  getPayoutStats: (req, res) => res.json({ route: "admin-payouts:stats" }),
  getVendorPayouts: (req, res) => res.json({ route: "admin-payouts:my-payouts" }),
  getWeeklyPayoutList: (req, res) => res.json({ route: "admin-payouts:weekly-list" }),
  createBulkPayouts: (req, res) => res.status(201).json({ route: "admin-payouts:bulk" }),
  getPayoutRequests: (req, res) => res.json({ route: "admin-payouts:requests" }),
  approvePayoutRequest: (req, res) =>
    res.json({
      route: "admin-payouts:approve-request",
      payoutId: req.params.payoutId,
      note: req.body.note || "",
    }),
  rejectPayoutRequest: (req, res) =>
    res.json({
      route: "admin-payouts:reject-request",
      payoutId: req.params.payoutId,
      reason: req.body.reason,
    }),
  markRequestPaid: (req, res) =>
    res.json({
      route: "admin-payouts:mark-request-paid",
      payoutId: req.params.payoutId,
      transactionId: req.body.transactionId || "",
    }),
}));

jest.mock("../controllers/vendorMarketingController", () => ({
  listPublicVendorMarketingItems: (req, res) => res.json({ route: "vendor-marketing:public" }),
  recordPublicVendorMarketingEvent: (req, res) =>
    res.json({ route: "vendor-marketing:public-event", id: req.params.id, itemId: req.params.itemId }),
  listVendorMarketingItems: (req, res) => res.json({ route: "vendor-marketing:list" }),
  createVendorMarketingItem: (req, res) =>
    res.status(201).json({
      route: "vendor-marketing:create",
      type: req.body.type,
      title: req.body.title,
    }),
  updateVendorMarketingItem: (req, res) =>
    res.json({ route: "vendor-marketing:update", id: req.params.id }),
  deleteVendorMarketingItem: (req, res) =>
    res.json({ route: "vendor-marketing:delete", id: req.params.id }),
  getCampaignVoucherAnalytics: (req, res) => res.json({ route: "vendor-marketing:analytics" }),
  listAdminMarketingItems: (req, res) => res.json({ route: "admin-vendor-marketing:list" }),
  reviewAdminMarketingItem: (req, res) =>
    res.json({
      route: "admin-vendor-marketing:review",
      id: req.params.id,
      status: req.body.status,
      reviewNote: req.body.reviewNote || "",
    }),
}));

jest.mock("../controllers/returnController", () => ({
  getAllReturns: (req, res) => res.json({ route: "returns:admin-all" }),
  getUserReturns: (req, res) => res.json({ route: "returns:my-returns" }),
  getReturnById: (req, res) => res.json({ route: "returns:id", id: req.params.id }),
  createReturnRequest: (req, res) =>
    res.status(201).json({
      route: "returns:create",
      orderId: req.body.orderId,
      reason: req.body.reason,
    }),
  updateReturnStatus: (req, res) =>
    res.json({
      route: "returns:update-status",
      id: req.params.id,
      status: req.body.status,
    }),
  processRefund: (req, res) =>
    res.json({
      route: "returns:refund",
      id: req.params.id,
      refundAmount: req.body.refundAmount,
    }),
  getReturnStats: (req, res) => res.json({ route: "returns:admin-stats" }),
  getOrderReturns: (req, res) => res.json({ route: "returns:order", orderId: req.params.orderId }),
  getVendorReturns: (req, res) => res.json({ route: "returns:vendor-list" }),
  getVendorReturnStats: (req, res) => res.json({ route: "returns:vendor-stats" }),
  vendorRespondToReturn: (req, res) =>
    res.json({
      route: "returns:vendor-respond",
      id: req.params.id,
      decision: req.body.decision,
    }),
  getPendingVendorResponse: (req, res) => res.json({ route: "returns:vendor-pending-response" }),
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/coupons", require("../routes/couponRoutes"));
  app.use("/api/orders", require("../routes/orderRoutes"));
  app.use("/api/vendors/finance", require("../routes/vendorFinanceRoutes"));
  app.use("/api/admin/payouts", require("../routes/adminPayoutRoutes"));
  app.use("/api/vendors", require("../routes/vendorRoutes"));
  app.use("/api/admin/vendor-marketing", require("../routes/adminVendorMarketingRoutes"));
  app.use("/api/returns", require("../routes/returnRoutes"));
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  return app;
};

describe("Black-box workflow API tests", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  describe("checkout + coupon flow", () => {
    test("POST /api/coupons/validate validates a coupon before checkout without auth", async () => {
      const response = await request(app).post("/api/coupons/validate").send({
        code: "SAVE10",
        orderTotal: 1200,
        items: [{ productId: "p1" }, { productId: "p2" }],
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "coupons:validate",
        code: "SAVE10",
        orderTotal: 1200,
        itemsCount: 2,
      });
    });

    test("POST /api/coupons/apply requires login", async () => {
      const response = await request(app).post("/api/coupons/apply").send({ code: "SAVE10" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "No token provided" });
    });

    test("POST /api/orders/guest creates a guest checkout order with coupon data", async () => {
      const response = await request(app).post("/api/orders/guest").send({
        items: [{ productId: "p1", quantity: 1 }],
        couponCode: "SAVE10",
        shippingAddress: { district: "Cox's Bazar" },
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "orders:guest-create",
        couponCode: "SAVE10",
        itemsCount: 1,
        shippingAddressType: "provided",
      });
    });

    test("POST /api/orders creates an authenticated checkout order", async () => {
      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "user")
        .send({
          items: [{ productId: "p1", quantity: 1 }, { productId: "p2", quantity: 2 }],
          couponCode: "STORE5",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "orders:create",
        couponCode: "STORE5",
        itemsCount: 2,
        shippingAddressType: "default",
      });
    });
  });

  describe("payout request approve/reject flow", () => {
    test("POST /api/vendors/finance/request-payout accepts vendor payout requests", async () => {
      const response = await request(app)
        .post("/api/vendors/finance/request-payout")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor")
        .send({
          amount: 2500,
          payoutMethod: "bkash",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "vendor-finance:request-payout",
        amount: 2500,
        payoutMethod: "bkash",
      });
    });

    test("GET /api/vendors/finance/commission-rates returns the vendor rate card route", async () => {
      const response = await request(app)
        .get("/api/vendors/finance/commission-rates")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendor-finance:commission-rates" });
    });

    test("GET /api/vendors/finance/statement/:format reaches statement export", async () => {
      const response = await request(app)
        .get("/api/vendors/finance/statement/csv?month=2026-05")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "vendor-finance:statement",
        format: "csv",
        month: "2026-05",
      });
    });

    test("GET /api/vendors/finance/tax-invoice reaches tax invoice export", async () => {
      const response = await request(app)
        .get("/api/vendors/finance/tax-invoice?month=2026-05")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "vendor-finance:tax-invoice",
        month: "2026-05",
      });
    });

    test("PATCH /api/admin/payouts/requests/:id/approve approves a payout request for admin", async () => {
      const response = await request(app)
        .patch("/api/admin/payouts/requests/payout-101/approve")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ note: "Approved after balance review" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-payouts:approve-request",
        payoutId: "payout-101",
        note: "Approved after balance review",
      });
    });

    test("PATCH /api/admin/payouts/requests/:id/reject rejects a payout request for admin", async () => {
      const response = await request(app)
        .patch("/api/admin/payouts/requests/payout-102/reject")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ reason: "Bank details missing" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-payouts:reject-request",
        payoutId: "payout-102",
        reason: "Bank details missing",
      });
    });
  });

  describe("vendor marketing request flow", () => {
    test("POST /api/vendors/marketing/items lets a vendor submit a voucher request", async () => {
      const response = await request(app)
        .post("/api/vendors/marketing/items")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor")
        .send({
          type: "voucher",
          title: "Eid Voucher",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "vendor-marketing:create",
        type: "voucher",
        title: "Eid Voucher",
      });
    });

    test("GET /api/admin/vendor-marketing lists vendor marketing requests for admin", async () => {
      const response = await request(app)
        .get("/api/admin/vendor-marketing")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-vendor-marketing:list" });
    });

    test("PATCH /api/admin/vendor-marketing/:id/review lets admin approve or reject a request", async () => {
      const response = await request(app)
        .patch("/api/admin/vendor-marketing/marketing-55/review")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({
          status: "approved",
          reviewNote: "Looks good",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-vendor-marketing:review",
        id: "marketing-55",
        status: "approved",
        reviewNote: "Looks good",
      });
    });
  });

  describe("return/refund route flow", () => {
    test("POST /api/returns lets a signed-in user create a return request", async () => {
      const response = await request(app)
        .post("/api/returns")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "user")
        .send({
          orderId: "order-500",
          reason: "Damaged item",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "returns:create",
        orderId: "order-500",
        reason: "Damaged item",
      });
    });

    test("POST /api/returns/vendor/:id/respond lets a vendor respond to a return", async () => {
      const response = await request(app)
        .post("/api/returns/vendor/return-20/respond")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor")
        .send({
          decision: "approve",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "returns:vendor-respond",
        id: "return-20",
        decision: "approve",
      });
    });

    test("PATCH /api/returns/:id/status lets admin update return status", async () => {
      const response = await request(app)
        .patch("/api/returns/return-20/status")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({
          status: "approved",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "returns:update-status",
        id: "return-20",
        status: "approved",
      });
    });

    test("POST /api/returns/:id/refund lets admin process a refund", async () => {
      const response = await request(app)
        .post("/api/returns/return-20/refund")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({
          refundAmount: 450,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "returns:refund",
        id: "return-20",
        refundAmount: 450,
      });
    });
  });
});
