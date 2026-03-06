const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminFinanceController = require("../controllers/adminFinanceController");

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
