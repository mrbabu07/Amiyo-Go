const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { idempotencyMiddleware } = require("../middleware/idempotency");
const {
  getAllPayments,
  getUserPayments,
  getPaymentById,
  processPayment,
  updatePaymentStatus,
  processRefund,
  getPaymentStats,
  getManualPaymentQueue,
  approveManualPayment,
  rejectManualPayment,
  getOrderPayment,
  handleStripeWebhook,
  handleBkashWebhook,
  handleNagadWebhook,
} = require("../controllers/paymentController");

const paymentIdempotency = idempotencyMiddleware({
  scope: "payments:process",
  required: true,
});
const paymentReviewIdempotency = idempotencyMiddleware({
  scope: "payments:manual-review",
  required: true,
});
const paymentRefundIdempotency = idempotencyMiddleware({
  scope: "payments:refund",
  required: true,
});

// Webhook routes (no authentication required)
router.post("/webhooks/stripe", handleStripeWebhook);
router.post("/webhooks/bkash", handleBkashWebhook);
router.post("/webhooks/nagad", handleNagadWebhook);

// All other payment routes require authentication
router.use(verifyToken);

// User routes
router.get("/my-payments", getUserPayments);
router.get("/order/:orderId", getOrderPayment);
router.post("/process", paymentIdempotency, processPayment);

// Admin routes
router.get("/", verifyAdmin, getAllPayments);
router.get("/stats", verifyAdmin, getPaymentStats);
router.get("/manual-verifications", verifyAdmin, getManualPaymentQueue);
router.patch("/manual-verifications/:orderId/approve", verifyAdmin, paymentReviewIdempotency, approveManualPayment);
router.patch("/manual-verifications/:orderId/reject", verifyAdmin, paymentReviewIdempotency, rejectManualPayment);
router.patch("/:id/status", verifyAdmin, updatePaymentStatus);
router.post("/:id/refund", verifyAdmin, paymentRefundIdempotency, processRefund);

// Dynamic route must stay after static routes like /stats.
router.get("/:id", getPaymentById);

module.exports = router;
