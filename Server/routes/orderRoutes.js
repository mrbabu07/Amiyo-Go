const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { idempotencyMiddleware } = require("../middleware/idempotency");
const {
  getAllOrders,
  getAdminOrders,
  getAdminOrderById,
  getAdminOrderStats,
  exportOrdersCsv,
  bulkUpdateOrderStatus,
  getAdminCodReconciliation,
  getAdminSlaBreaches,
  getAdminFraudOrders,
  addOrderNote,
  regenerateInvoice,
  getUserOrders,
  getOrderTimelineEvents,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
  adminCancelOrder,
  adminResolveDispute,
  adminApproveRefund,
  adminOverrideStatus,
  adminReassignCourier,
  adminChangeDeliveryAddress,
  adminExtendReturnWindow,
  adminForceRefundOrder,
} = require("../controllers/orderController");

const createOrderIdempotency = idempotencyMiddleware({
  scope: "orders:create",
  required: true,
});
const refundOrderIdempotency = idempotencyMiddleware({
  scope: "orders:refund",
  required: true,
});

// ── Admin routes ───────────────────────────────────────────────
router.get("/admin/stats",       verifyToken, verifyAdmin, getAdminOrderStats);
router.get("/admin/export/csv",  verifyToken, verifyAdmin, exportOrdersCsv);
router.get("/admin/cod-reconciliation", verifyToken, verifyAdmin, getAdminCodReconciliation);
router.get("/admin/sla-breaches", verifyToken, verifyAdmin, getAdminSlaBreaches);
router.get("/admin/fraud-queue", verifyToken, verifyAdmin, getAdminFraudOrders);
router.get("/admin",             verifyToken, verifyAdmin, getAdminOrders);
router.patch("/admin/bulk-status",             verifyToken, verifyAdmin, bulkUpdateOrderStatus);

// ── Admin order action routes (Daraz-style control) ────────────
router.get("/admin/:id/detail",             verifyToken, verifyAdmin, getAdminOrderById);
router.patch("/admin/:id/force-cancel",     verifyToken, verifyAdmin, adminCancelOrder);
router.patch("/admin/:id/force-refund",     verifyToken, verifyAdmin, refundOrderIdempotency, adminForceRefundOrder);
router.patch("/admin/:id/reassign-courier", verifyToken, verifyAdmin, adminReassignCourier);
router.patch("/admin/:id/delivery-address", verifyToken, verifyAdmin, adminChangeDeliveryAddress);
router.patch("/admin/:id/return-window",    verifyToken, verifyAdmin, adminExtendReturnWindow);
router.patch("/admin/:id/cancel",          verifyToken, verifyAdmin, adminCancelOrder);
router.patch("/admin/:id/resolve-dispute", verifyToken, verifyAdmin, adminResolveDispute);
router.patch("/admin/:id/approve-refund",  verifyToken, verifyAdmin, refundOrderIdempotency, adminApproveRefund);
router.patch("/admin/:id/override-status", verifyToken, verifyAdmin, adminOverrideStatus);

// ── Shared detail (admin + owner) ─────────────────────────────
router.get("/:id/detail", verifyToken, getAdminOrderById);
router.get("/:id/timeline", verifyToken, getOrderTimelineEvents);

// ── Admin order-specific actions ──────────────────────────────
router.post("/:id/notes",            verifyToken, verifyAdmin, addOrderNote);
router.post("/:id/invoice/regenerate", verifyToken, verifyAdmin, regenerateInvoice);

// ── Existing routes (unchanged) ───────────────────────────────
router.get("/",             verifyToken, verifyAdmin, getAllOrders);
router.get("/my-orders",    verifyToken, getUserOrders);
router.post("/",            verifyToken, createOrderIdempotency, createOrder);
router.post("/guest",       createOrderIdempotency, createOrder); // Guest checkout - no auth required
router.patch("/:id/status", verifyToken, verifyAdmin, updateOrderStatus);
router.post("/:id/cancel",  verifyToken, cancelOrder);
router.get("/:id/invoice",  downloadInvoice);

module.exports = router;
