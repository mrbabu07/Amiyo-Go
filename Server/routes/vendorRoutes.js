const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireRole } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");
const vendorDashboardController = require("../controllers/vendorDashboardController");
const vendorPerformanceController = require("../controllers/adminVendorPerformanceController");

const vendorsFinanceController = require("../controllers/vendorsFinanceController");

// Public vendor registration - any authenticated user can apply (except admins)
router.post("/register", verifyToken, vendorController.registerVendor);

// Vendor profile management
router.get("/me", verifyToken, vendorController.getMyVendorProfile);
router.patch("/me", verifyToken, vendorController.updateVendorProfile);

// Vendor dashboard
router.get("/dashboard/stats", verifyToken, vendorDashboardController.getDashboardStats);
router.get("/orders/stats",    verifyToken, vendorDashboardController.getVendorOrderStats);
router.get("/orders",          verifyToken, vendorDashboardController.getVendorOrders);
router.get("/orders/:orderId", verifyToken, vendorDashboardController.getVendorOrderDetail);
router.patch("/orders/:orderId/status", verifyToken, vendorDashboardController.updateOrderStatus);
router.get("/products/top", verifyToken, vendorDashboardController.getTopProducts);

// Vendor finance
router.get("/finance/transactions", verifyToken, requireRole("vendor"), vendorsFinanceController.getTransactions);
router.get("/finance/statements", verifyToken, requireRole("vendor"), vendorsFinanceController.getStatements);
router.get("/finance/payments", verifyToken, requireRole("vendor"), vendorsFinanceController.getPayments);

// Admin routes
router.get("/",      verifyToken, verifyAdmin, vendorController.getAllVendors);
router.get("/stats", verifyToken, verifyAdmin, vendorController.getVendorStats);
router.get("/:id",   verifyToken, verifyAdmin, vendorController.getVendorById);
router.patch("/:id",             verifyToken, verifyAdmin, vendorController.updateVendor);
router.patch("/:id/approve",     verifyToken, verifyAdmin, vendorController.approveVendor);
router.patch("/:id/suspend",     verifyToken, verifyAdmin, vendorController.suspendVendor);
router.patch("/:id/reject",      verifyToken, verifyAdmin, vendorController.rejectVendor);
router.patch("/:id/reactivate",  verifyToken, verifyAdmin, vendorController.reactivateVendor);
router.get("/:id/performance",   verifyToken, verifyAdmin, vendorPerformanceController.getVendorPerformance);

module.exports = router;
