const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken, verifyAdmin, requireRole, requireApprovedVendor } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");
const vendorDashboardController = require("../controllers/vendorDashboardController");
const vendorPerformanceController = require("../controllers/adminVendorPerformanceController");
const adminFinanceController = require("../controllers/adminFinanceController");
const vendorsFinanceController = require("../controllers/vendorsFinanceController");
const vendorMarketingController = require("../controllers/vendorMarketingController");

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 3,
  },
  fileFilter: (req, file, cb) => {
    const allowed = file.mimetype?.startsWith("image/") || file.mimetype === "application/pdf";
    if (!allowed) return cb(new Error("Only images and PDF files are allowed"));
    cb(null, true);
  },
});

// Public vendor registration
router.post("/register", verifyToken, vendorController.registerVendor);

// Vendor KYC upload/review
router.get("/kyc/me", verifyToken, vendorController.getMyKyc);
router.post(
  "/kyc",
  verifyToken,
  memoryUpload.fields([
    { name: "nidFront", maxCount: 1 },
    { name: "nidBack", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
  ]),
  vendorController.submitVendorKyc,
);
router.get("/kyc/admin/pending", verifyToken, verifyAdmin, vendorController.getKycQueue);
router.patch("/kyc/admin/:vendorId/review", verifyToken, verifyAdmin, vendorController.reviewVendorKyc);

// Public vendor info (for product pages)
router.get("/followed/feed", verifyToken, vendorController.getFollowedVendorFeed);
router.get("/slug/:slug/public", vendorController.getVendorPublicInfoBySlug);
router.get("/:id/public", vendorController.getVendorPublicInfo);
router.get("/:id/public-marketing", vendorMarketingController.listPublicVendorMarketingItems);
router.post("/:id/public-marketing/:itemId/event", vendorMarketingController.recordPublicVendorMarketingEvent);

// Vendor follow/unfollow
router.get("/:id/follow-status", verifyToken, vendorController.getFollowStatus);
router.post("/:id/follow", verifyToken, vendorController.followVendor);
router.delete("/:id/unfollow", verifyToken, vendorController.unfollowVendor);

// Vendor profile management
router.get("/me", verifyToken, vendorController.getMyVendorProfile);
router.patch("/me", verifyToken, vendorController.updateVendorProfile);
router.post("/upload-logo", verifyToken, memoryUpload.single("image"), vendorController.uploadLogo);
router.post("/upload-banner", verifyToken, memoryUpload.single("image"), vendorController.uploadBanner);

// Vendor allowed categories
router.get("/my-categories", verifyToken, requireRole("vendor"), vendorController.getVendorAllowedCategories);

// Vendor marketing workflow
router.get("/marketing/items", verifyToken, requireRole("vendor"), vendorMarketingController.listVendorMarketingItems);
router.post("/marketing/items", verifyToken, requireRole("vendor"), vendorMarketingController.createVendorMarketingItem);
router.patch("/marketing/items/:id", verifyToken, requireRole("vendor"), vendorMarketingController.updateVendorMarketingItem);
router.delete("/marketing/items/:id", verifyToken, requireRole("vendor"), vendorMarketingController.deleteVendorMarketingItem);
router.get("/marketing/analytics", verifyToken, requireRole("vendor"), vendorMarketingController.getCampaignVoucherAnalytics);

// Vendor shop status management
router.get("/shop/status", verifyToken, requireRole("vendor"), vendorController.getShopStatus);
router.patch("/shop/toggle", verifyToken, requireRole("vendor"), vendorController.toggleShopStatus);
router.post("/shop/vacation", verifyToken, requireRole("vendor"), vendorController.setVacationMode);
router.delete("/shop/vacation", verifyToken, requireRole("vendor"), vendorController.cancelVacationMode);

// Vendor dashboard
router.get("/dashboard/stats", verifyToken, vendorDashboardController.getDashboardStats);
router.get("/reports", verifyToken, requireRole("vendor"), vendorDashboardController.getVendorReports);
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
