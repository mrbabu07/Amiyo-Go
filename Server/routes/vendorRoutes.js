const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireRole, requireApprovedVendor } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");
const vendorDashboardController = require("../controllers/vendorDashboardController");
const vendorPerformanceController = require("../controllers/adminVendorPerformanceController");
const adminFinanceController = require("../controllers/adminFinanceController");
const vendorsFinanceController = require("../controllers/vendorsFinanceController");

// Public vendor registration
router.post("/register", verifyToken, vendorController.registerVendor);

// Public vendor info (for product pages)
router.get("/:id/public", vendorController.getVendorPublicInfo);

// Vendor follow/unfollow
router.get("/:id/follow-status", verifyToken, vendorController.getFollowStatus);
router.post("/:id/follow", verifyToken, vendorController.followVendor);
router.delete("/:id/unfollow", verifyToken, vendorController.unfollowVendor);

// Vendor profile management
router.get("/me", verifyToken, vendorController.getMyVendorProfile);
router.patch("/me", verifyToken, vendorController.updateVendorProfile);
router.post("/upload-logo", verifyToken, vendorController.uploadLogo);
router.post("/upload-banner", verifyToken, vendorController.uploadBanner);

// Vendor allowed categories
router.get("/my-categories", verifyToken, requireRole("vendor"), vendorController.getVendorAllowedCategories);

// Vendor shop status management
router.get("/shop/status", verifyToken, requireRole("vendor"), vendorController.getShopStatus);
router.patch("/shop/toggle", verifyToken, requireRole("vendor"), vendorController.toggleShopStatus);
router.post("/shop/vacation", verifyToken, requireRole("vendor"), vendorController.setVacationMode);
router.delete("/shop/vacation", verifyToken, requireRole("vendor"), vendorController.cancelVacationMode);

// Vendor dashboard
router.get("/dashboard/stats", verifyToken, vendorDashboardController.getDashboardStats);
router.get("/orders/stats",    verifyToken, vendorDashboardController.getVendorOrderStats);
router.get("/orders",          verifyToken, vendorDashboardController.getVendorOrders);
router.get("/orders/:orderId", verifyToken, vendorDashboardController.getVendorOrderDetail);
router.patch("/orders/:orderId/status",  verifyToken, vendorDashboardController.updateOrderStatus);

// ── Vendor shipping actions ──────────────────────────────────
router.patch("/orders/:orderId/pack",    verifyToken, requireApprovedVendor, vendorDashboardController.packVendorItems);
router.patch("/orders/:orderId/ship",    verifyToken, requireApprovedVendor, vendorDashboardController.shipVendorItems);
router.patch("/orders/:orderId/deliver", verifyToken, requireApprovedVendor, vendorDashboardController.deliverVendorItems);

router.get("/products/top", verifyToken, vendorDashboardController.getTopProducts);

// Vendor finance (self-service)
router.get("/finance/transactions", verifyToken, requireRole("vendor"), vendorsFinanceController.getTransactions);
router.get("/finance/statements",   verifyToken, requireRole("vendor"), vendorsFinanceController.getStatements);
router.get("/finance/payments",     verifyToken, requireRole("vendor"), vendorsFinanceController.getPayments);

// ── Admin: Vendor management ─────────────────────────────────
router.get("/",      verifyToken, verifyAdmin, vendorController.getAllVendors);
router.get("/stats", verifyToken, verifyAdmin, vendorController.getVendorStats);
router.get("/:id",   verifyToken, verifyAdmin, vendorController.getVendorById);
router.patch("/:id",            verifyToken, verifyAdmin, vendorController.updateVendor);
router.patch("/:id/approve",    verifyToken, verifyAdmin, vendorController.approveVendor);
router.patch("/:id/suspend",    verifyToken, verifyAdmin, vendorController.suspendVendor);
router.patch("/:id/reject",     verifyToken, verifyAdmin, vendorController.rejectVendor);
router.patch("/:id/reactivate", verifyToken, verifyAdmin, vendorController.reactivateVendor);
router.get("/:id/performance",  verifyToken, verifyAdmin, vendorPerformanceController.getVendorPerformance);

// ── Admin: Vendor-scoped finance ─────────────────────────────
router.get("/:vendorId/finance/summary",      verifyToken, verifyAdmin, adminFinanceController.getVendorFinanceSummary);
router.get("/:vendorId/finance/transactions", verifyToken, verifyAdmin, adminFinanceController.getVendorFinanceTransactions);

module.exports = router;
