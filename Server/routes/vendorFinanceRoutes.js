const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/auth");
const vendorFinanceController = require("../controllers/vendor/vendorFinanceController");

// Vendor finance routes (self-service)
router.get("/summary", verifyToken, requireRole("vendor"), vendorFinanceController.getFinanceSummary);
router.get("/transactions", verifyToken, requireRole("vendor"), vendorFinanceController.getTransactions);
router.get("/payouts", verifyToken, requireRole("vendor"), vendorFinanceController.getPayouts);

module.exports = router;
