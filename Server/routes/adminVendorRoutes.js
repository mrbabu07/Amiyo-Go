const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminFinanceController = require("../controllers/adminFinanceController");
const adminVendorManagementController = require("../controllers/adminVendorManagementController");

// Admin: Vendor management endpoints
router.post(
  "/bulk",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.bulkVendorAction
);

router.get(
  "/:vendorId/management",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.getVendorManagementProfile
);

router.patch(
  "/:vendorId/status",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.updateVendorStatus
);

router.patch(
  "/:vendorId/tier",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.updateVendorTier
);

router.post(
  "/:vendorId/tier/auto-calculate",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.autoCalculateVendorTier
);

router.patch(
  "/:vendorId/commission",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.updateVendorCommission
);

router.patch(
  "/:vendorId/homepage-featured",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.updateVendorHomepageFeature
);

router.post(
  "/:vendorId/notices",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.sendVendorNotice
);

router.post(
  "/:vendorId/violations",
  verifyToken,
  verifyAdmin,
  adminVendorManagementController.issueVendorViolation
);

// Admin: Vendor finance endpoints
router.get(
  "/:vendorId/finance/summary",
  verifyToken,
  verifyAdmin,
  adminFinanceController.getVendorFinanceSummary
);

router.get(
  "/:vendorId/finance/transactions",
  verifyToken,
  verifyAdmin,
  adminFinanceController.getVendorFinanceTransactions
);

module.exports = router;
