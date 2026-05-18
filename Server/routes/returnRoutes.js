const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireRole } = require("../middleware/auth");
const { idempotencyMiddleware } = require("../middleware/idempotency");
const {
  getAllReturns,
  getUserReturns,
  getReturnById,
  createReturnRequest,
  updateReturnStatus,
  processRefund,
  getReturnStats,
  getOrderReturns,
  getVendorReturns,
  getVendorReturnById,
  getVendorReturnStats,
  vendorRespondToReturn,
  getPendingVendorResponse,
} = require("../controllers/returnController");

const createReturnIdempotency = idempotencyMiddleware({
  scope: "returns:create",
  required: true,
});
const returnRefundIdempotency = idempotencyMiddleware({
  scope: "returns:refund",
  required: true,
});

// All return routes require authentication.
router.use(verifyToken);

// User routes
router.get("/my-returns", getUserReturns);
router.get("/order/:orderId", getOrderReturns);
router.post("/", createReturnIdempotency, createReturnRequest);

// Vendor routes
router.get("/vendor/my-returns", requireRole("vendor"), getVendorReturns);
router.get("/vendor/stats", requireRole("vendor"), getVendorReturnStats);
router.get("/vendor/pending-response", requireRole("vendor"), getPendingVendorResponse);
router.get("/vendor/:id", requireRole("vendor"), getVendorReturnById);
router.post("/vendor/:id/respond", requireRole("vendor"), vendorRespondToReturn);

// Admin routes
router.get("/admin/all", verifyAdmin, getAllReturns);
router.get("/admin/stats", verifyAdmin, getReturnStats);
router.patch("/:id/status", verifyAdmin, updateReturnStatus);
router.post("/:id/refund", verifyAdmin, returnRefundIdempotency, processRefund);

// This route must come last to avoid conflicts.
router.get("/:id", getReturnById);

module.exports = router;
