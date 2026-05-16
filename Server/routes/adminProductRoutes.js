const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getAllAdminProducts,
  getPendingProducts,
  getModerationQueue,
  approveProduct,
  rejectProduct,
  disableProduct,
  adminEditProduct,
  bulkModerateProducts,
  getModerationConfig,
  scanProductsForModeration,
  getDuplicateProductGroups,
  getIpViolationReports,
  submitIpViolationReport,
  reviewIpViolationReport,
  getBrandRegistry,
  upsertBrandRegistryItem,
  reviewBrandRegistryItem,
  getVendorProductsAdmin,
} = require("../controllers/adminProductController");

// All routes require admin authentication
router.get("/", verifyToken, verifyAdmin, getAllAdminProducts);
router.get("/pending", verifyToken, verifyAdmin, getPendingProducts);
router.get("/queue", verifyToken, verifyAdmin, getModerationQueue);
router.post("/bulk", verifyToken, verifyAdmin, bulkModerateProducts);
router.get("/moderation/config", verifyToken, verifyAdmin, getModerationConfig);
router.post("/moderation/scan", verifyToken, verifyAdmin, scanProductsForModeration);
router.get("/duplicates", verifyToken, verifyAdmin, getDuplicateProductGroups);
router.get("/ip-reports", verifyToken, verifyAdmin, getIpViolationReports);
router.post("/ip-reports", verifyToken, verifyAdmin, submitIpViolationReport);
router.patch("/ip-reports/:reportId/review", verifyToken, verifyAdmin, reviewIpViolationReport);
router.get("/brands", verifyToken, verifyAdmin, getBrandRegistry);
router.post("/brands", verifyToken, verifyAdmin, upsertBrandRegistryItem);
router.patch("/brands/:brandId/review", verifyToken, verifyAdmin, reviewBrandRegistryItem);

// Admin: view a specific vendor's products (used in Manage Vendors detail page)
router.get("/by-vendor/:vendorId", verifyToken, verifyAdmin, getVendorProductsAdmin);

router.patch("/:id/admin-edit", verifyToken, verifyAdmin, adminEditProduct);
router.patch("/:id/approve", verifyToken, verifyAdmin, approveProduct);
router.patch("/:id/reject", verifyToken, verifyAdmin, rejectProduct);
router.patch("/:id/disable", verifyToken, verifyAdmin, disableProduct);

module.exports = router;
