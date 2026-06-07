const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  verifyToken: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "No token provided" });
    }
    req.user = { uid: "test-user", role: "admin" };
    return next();
  },
  verifyAdmin: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
  requireApprovedVendor: (req, res, next) => next(),
  requireVendorPermission: () => (req, res, next) => next(),
}));

jest.mock("../controllers/paymentController", () => ({
  getAllPayments: (req, res) => res.json({ route: "all-payments" }),
  getUserPayments: (req, res) => res.json({ route: "my-payments" }),
  getPaymentById: (req, res) => res.json({ route: "payment-by-id", id: req.params.id }),
  processPayment: (req, res) => res.json({ route: "process-payment" }),
  updatePaymentStatus: (req, res) => res.json({ route: "update-payment-status" }),
  processRefund: (req, res) => res.json({ route: "process-refund" }),
  getPaymentStats: (req, res) => res.json({ route: "payment-stats" }),
  getManualPaymentQueue: (req, res) => res.json({ route: "manual-payment-queue" }),
  approveManualPayment: (req, res) => res.json({ route: "manual-payment-approve" }),
  rejectManualPayment: (req, res) => res.json({ route: "manual-payment-reject" }),
  getOrderPayment: (req, res) => res.json({ route: "order-payment" }),
}));

jest.mock("../controllers/webhookController", () => ({
  handleStripeWebhook: (req, res) => res.json({ route: "stripe-webhook-hardened" }),
  handleBkashWebhook: (req, res) => res.json({ route: "bkash-webhook-hardened" }),
  handleNagadWebhook: (req, res) => res.json({ route: "nagad-webhook-hardened" }),
}));

jest.mock("../controllers/returnController", () => ({
  getAllReturns: (req, res) => res.json({ route: "all-returns" }),
  getUserReturns: (req, res) => res.json({ route: "my-returns" }),
  getReturnById: (req, res) => res.json({ route: "return-by-id", id: req.params.id }),
  createReturnRequest: (req, res) => res.json({ route: "create-return" }),
  updateReturnStatus: (req, res) => res.json({ route: "update-return-status" }),
  processRefund: (req, res) => res.json({ route: "return-refund" }),
  getReturnStats: (req, res) => res.json({ route: "return-stats" }),
  getOrderReturns: (req, res) => res.json({ route: "order-returns" }),
  getVendorReturns: (req, res) => res.json({ route: "vendor-returns" }),
  getVendorReturnById: (req, res) => res.json({ route: "vendor-return-detail", id: req.params.id }),
  getVendorReturnStats: (req, res) => res.json({ route: "vendor-return-stats" }),
  vendorRespondToReturn: (req, res) => res.json({ route: "vendor-return-response" }),
  confirmVendorReturnReceived: (req, res) => res.json({ route: "vendor-return-confirm-received" }),
  getPendingVendorResponse: (req, res) => res.json({ route: "pending-vendor-response" }),
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/payments", require("../routes/paymentRoutes"));
  app.use("/api/returns", require("../routes/returnRoutes"));
  return app;
};

describe("production route hardening", () => {
  test("payment stats route is not captured by payment id route", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/payments/stats")
      .set("Authorization", "Bearer test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: "payment-stats" });
  });

  test("return debug test route is not publicly exposed", async () => {
    const app = buildApp();

    const response = await request(app).get("/api/returns/test");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "No token provided" });
  });

  test("legacy payment webhook path uses the hardened webhook controller", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/payments/webhooks/bkash")
      .send({ transactionId: "trx-1" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: "bkash-webhook-hardened" });
  });
});
