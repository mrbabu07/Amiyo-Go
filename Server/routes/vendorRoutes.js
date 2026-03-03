const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin, requireRole } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");
const vendorDashboardController = require("../controllers/vendorDashboardController");

// Public vendor registration - any authenticated user can apply (except admins)
router.post("/register", verifyToken, vendorController.registerVendor);

// Vendor profile management
router.get("/me", verifyToken, vendorController.getMyVendorProfile);
router.patch("/me", verifyToken, vendorController.updateVendorProfile);

// Vendor dashboard
router.get("/dashboard/stats", verifyToken, vendorDashboardController.getDashboardStats);
router.get("/orders", verifyToken, vendorDashboardController.getVendorOrders);
router.patch("/orders/:orderId/status", verifyToken, vendorDashboardController.updateOrderStatus);
router.get("/products/top", verifyToken, vendorDashboardController.getTopProducts);

// Admin routes
router.get("/", verifyToken, verifyAdmin, vendorController.getAllVendors);
router.get("/stats", verifyToken, verifyAdmin, vendorController.getVendorStats);
router.get("/:id", verifyToken, verifyAdmin, vendorController.getVendorById);
router.patch("/:id", verifyToken, verifyAdmin, vendorController.updateVendor);
router.patch("/:id/approve", verifyToken, verifyAdmin, vendorController.approveVendor);
router.patch("/:id/suspend", verifyToken, verifyAdmin, vendorController.suspendVendor);

module.exports = router;
