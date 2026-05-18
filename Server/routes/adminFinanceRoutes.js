const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { idempotencyMiddleware } = require("../middleware/idempotency");
const {
  getFinanceOverview,
  getCommissionSummary,
  getFinanceOperationsOverview,
  getPayoutSchedule,
  upsertPayoutSchedule,
  getPayoutQueue,
  getCommissionRules,
  saveCommissionRule,
  getFinanceLedger,
  getRefundWorkflow,
  reviewFinanceRefund,
  getRevenueReports,
  downloadRevenueReport,
  getEscrowRules,
  upsertEscrowRules,
  getFinanceAuditLog,
} = require("../controllers/adminFinanceController");

const financeRefundIdempotency = idempotencyMiddleware({
  scope: "admin:finance-refunds",
  required: true,
});

router.get("/operations", verifyToken, verifyAdmin, getFinanceOperationsOverview);
router.get("/payout-schedule", verifyToken, verifyAdmin, getPayoutSchedule);
router.put("/payout-schedule", verifyToken, verifyAdmin, upsertPayoutSchedule);
router.get("/payout-queue", verifyToken, verifyAdmin, getPayoutQueue);
router.get("/commission-rules", verifyToken, verifyAdmin, getCommissionRules);
router.post("/commission-rules", verifyToken, verifyAdmin, saveCommissionRule);
router.patch("/commission-rules/:ruleId", verifyToken, verifyAdmin, saveCommissionRule);
router.get("/ledger", verifyToken, verifyAdmin, getFinanceLedger);
router.get("/refunds", verifyToken, verifyAdmin, getRefundWorkflow);
router.patch("/refunds/:returnId/review", verifyToken, verifyAdmin, financeRefundIdempotency, reviewFinanceRefund);
router.get("/revenue-reports", verifyToken, verifyAdmin, getRevenueReports);
router.get("/revenue-reports/export", verifyToken, verifyAdmin, downloadRevenueReport);
router.get("/escrow-rules", verifyToken, verifyAdmin, getEscrowRules);
router.put("/escrow-rules", verifyToken, verifyAdmin, upsertEscrowRules);
router.get("/audit-log", verifyToken, verifyAdmin, getFinanceAuditLog);
router.get("/overview", verifyToken, verifyAdmin, getFinanceOverview);
router.get("/commission-summary", verifyToken, verifyAdmin, getCommissionSummary);

module.exports = router;
