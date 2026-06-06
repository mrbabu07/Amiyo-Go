const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
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
  confirmVendorReturnReceived,
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
const vendorReturnReceiptIdempotency = idempotencyMiddleware({
  scope: "returns:vendor-receipt",
  required: true,
});

// All return routes require authentication.
router.use(verifyToken);

// User routes
router.get("/my-returns", getUserReturns);
router.get("/order/:orderId", getOrderReturns);
router.post("/", createReturnIdempotency, createReturnRequest);

// Vendor routes
router.get(
  "/vendor/my-returns",
  requireApprovedVendor,
  requireVendorPermission("returns:view"),
  getVendorReturns,
);
router.get(
  "/vendor/stats",
  requireApprovedVendor,
  requireVendorPermission("returns:view"),
  getVendorReturnStats,
);
router.get(
  "/vendor/pending-response",
  requireApprovedVendor,
  requireVendorPermission("returns:view"),
  getPendingVendorResponse,
);
router.get(
  "/vendor/:id",
  requireApprovedVendor,
  requireVendorPermission("returns:view"),
  getVendorReturnById,
);
router.post(
  "/vendor/:id/respond",
  requireApprovedVendor,
  requireVendorPermission("returns:manage"),
  vendorRespondToReturn,
);
router.post(
  "/vendor/:id/confirm-received",
  requireApprovedVendor,
  requireVendorPermission("returns:manage"),
  vendorReturnReceiptIdempotency,
  confirmVendorReturnReceived,
);

// Admin routes
router.get("/admin/all", verifyAdmin, getAllReturns);
router.get("/admin/stats", verifyAdmin, getReturnStats);
router.patch("/:id/status", verifyAdmin, updateReturnStatus);
router.post("/:id/refund", verifyAdmin, returnRefundIdempotency, processRefund);

// This route must come last to avoid conflicts.
router.get("/:id", getReturnById);

module.exports = router;
