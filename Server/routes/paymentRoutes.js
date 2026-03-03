const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllPayments,
  getUserPayments,
  getPaymentById,
  processPayment,
  updatePaymentStatus,
  processRefund,
  getPaymentStats,
  getOrderPayment,
  handleStripeWebhook,
  handleBkashWebhook,
  handleNagadWebhook,
} = require("../controllers/paymentController");

// Webhook routes (no authentication required)
router.post("/webhooks/stripe", handleStripeWebhook);
router.post("/webhooks/bkash", handleBkashWebhook);
router.post("/webhooks/nagad", handleNagadWebhook);

// All other payment routes require authentication
router.use(verifyToken);

// User routes
router.get("/my-payments", getUserPayments);
router.get("/order/:orderId", getOrderPayment);
router.get("/:id", getPaymentById);
router.post("/process", processPayment);

// Admin routes
router.get("/", verifyAdmin, getAllPayments);
router.get("/stats", verifyAdmin, getPaymentStats);
router.patch("/:id/status", verifyAdmin, updatePaymentStatus);
router.post("/:id/refund", verifyAdmin, processRefund);

module.exports = router;
