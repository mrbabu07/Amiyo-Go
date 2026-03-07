const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/auth");
const vendorFinanceController = require("../controllers/vendor/vendorFinanceController");

// Vendor finance routes (self-service)
router.get("/summary", verifyToken, requireRole("vendor"), vendorFinanceController.getFinanceSummary);
router.get("/transactions", verifyToken, requireRole("vendor"), vendorFinanceController.getTransactions);
router.get("/payouts", verifyToken, requireRole("vendor"), vendorFinanceController.getPayouts);

// Payout request routes
router.get("/available-balance", verifyToken, requireRole("vendor"), vendorFinanceController.getAvailableBalance);
router.post("/request-payout", verifyToken, requireRole("vendor"), vendorFinanceController.requestPayout);
router.get("/payout-requests", verifyToken, requireRole("vendor"), vendorFinanceController.getPayoutRequests);
router.delete("/payout-requests/:id", verifyToken, requireRole("vendor"), vendorFinanceController.cancelPayoutRequest);

module.exports = router;
