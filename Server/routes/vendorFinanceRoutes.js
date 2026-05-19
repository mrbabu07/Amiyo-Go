const express = require("express");
const router = express.Router();
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
const { idempotencyMiddleware } = require("../middleware/idempotency");
const vendorFinanceController = require("../controllers/vendor/vendorFinanceController");

const vendorPayoutRequestIdempotency = idempotencyMiddleware({
  scope: "vendor:payout-request",
  required: true,
});

// Vendor finance routes (self-service)
router.use(verifyToken, requireApprovedVendor);

router.get("/summary", requireVendorPermission("finance:view"), vendorFinanceController.getFinanceSummary);
router.get("/transactions", requireVendorPermission("finance:view"), vendorFinanceController.getTransactions);
router.get("/reconciliation", requireVendorPermission("finance:view"), vendorFinanceController.getReconciliation);
router.get("/commission-rates", requireVendorPermission("finance:view"), vendorFinanceController.getCommissionRates);
router.get("/statement/:format", requireVendorPermission("finance:view"), vendorFinanceController.downloadStatement);
router.get("/tax-invoice", requireVendorPermission("finance:view"), vendorFinanceController.downloadTaxInvoice);
router.get("/payouts", requireVendorPermission("finance:view"), vendorFinanceController.getPayouts);

// Payout request routes
router.get("/available-balance", requireVendorPermission("finance:view"), vendorFinanceController.getAvailableBalance);
router.post(
  "/request-payout",
  requireVendorPermission("finance:manage"),
  vendorPayoutRequestIdempotency,
  vendorFinanceController.requestPayout,
);
router.get("/payout-requests", requireVendorPermission("finance:view"), vendorFinanceController.getPayoutRequests);
router.delete("/payout-requests/:id", requireVendorPermission("finance:manage"), vendorFinanceController.cancelPayoutRequest);

module.exports = router;
