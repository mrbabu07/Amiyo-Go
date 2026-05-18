const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  createBanListEntry,
  createDispute,
  createFraudFlag,
  createSellerPenalty,
  createTermsVersion,
  getBanList,
  getContentPolicyViolations,
  getDisputeCenter,
  getFraudDashboard,
  getReviewModerationQueue,
  getSellerPenaltyLog,
  getTermsVersions,
  getTrustSafetyAuditLog,
  getTrustSafetyOverview,
  moderateReview,
  publishTermsVersion,
  resolveDispute,
  reviewContentPolicyViolation,
  updateBanListEntry,
  updateFraudFlag,
  updateSellerPenaltyAppeal,
} = require("../controllers/adminTrustSafetyController");
const {
  addTrustEvidence,
  createEnforcement,
  createTrustDispute,
  evaluatePolicyViolation,
  getRiskProfile,
  getTrustDashboard,
  getTrustPolicies,
  getTrustQueues,
  recordReportAction,
  recordRiskEvent,
  reviewAppeal,
  scoreAccountRisk,
  scoreChatRisk,
  scorePayoutRisk,
  scoreProductRisk,
  scorePromoRisk,
  scoreReturnRisk,
  scoreReviewRisk,
  transitionTrustDispute,
  updateVerification,
  upsertTrustPolicy,
} = require("../controllers/trustSafetyController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, getTrustSafetyOverview);
router.get("/dashboard-v2", verifyToken, verifyAdmin, getTrustDashboard);

router.get("/policies", verifyToken, verifyAdmin, getTrustPolicies);
router.put("/policies/:violationType", verifyToken, verifyAdmin, upsertTrustPolicy);
router.post("/policies/evaluate", verifyToken, verifyAdmin, evaluatePolicyViolation);

router.put("/verifications/:subjectType/:subjectId", verifyToken, verifyAdmin, updateVerification);

router.post("/risk-events", verifyToken, verifyAdmin, recordRiskEvent);
router.get("/risk/:subjectType/:subjectId", verifyToken, verifyAdmin, getRiskProfile);
router.get("/queues", verifyToken, verifyAdmin, getTrustQueues);

router.post("/reports/:reportId/actions", verifyToken, verifyAdmin, recordReportAction);

router.post("/cases/disputes", verifyToken, verifyAdmin, createTrustDispute);
router.patch("/cases/disputes/:disputeId/transition", verifyToken, verifyAdmin, transitionTrustDispute);
router.post("/cases/:caseType/:caseId/evidence", verifyToken, verifyAdmin, addTrustEvidence);

router.post("/enforcements", verifyToken, verifyAdmin, createEnforcement);
router.patch("/appeals/:appealId/review", verifyToken, verifyAdmin, reviewAppeal);

router.post("/score/review", verifyToken, verifyAdmin, scoreReviewRisk);
router.post("/score/return", verifyToken, verifyAdmin, scoreReturnRisk);
router.post("/score/product", verifyToken, verifyAdmin, scoreProductRisk);
router.post("/score/promo", verifyToken, verifyAdmin, scorePromoRisk);
router.post("/score/payout", verifyToken, verifyAdmin, scorePayoutRisk);
router.post("/score/account", verifyToken, verifyAdmin, scoreAccountRisk);
router.post("/score/chat", verifyToken, verifyAdmin, scoreChatRisk);

router.get("/fraud", verifyToken, verifyAdmin, getFraudDashboard);
router.post("/fraud-flags", verifyToken, verifyAdmin, createFraudFlag);
router.patch("/fraud-flags/:flagId", verifyToken, verifyAdmin, updateFraudFlag);

router.get("/reviews", verifyToken, verifyAdmin, getReviewModerationQueue);
router.patch("/reviews/:reviewId/moderate", verifyToken, verifyAdmin, moderateReview);

router.get("/disputes", verifyToken, verifyAdmin, getDisputeCenter);
router.post("/disputes", verifyToken, verifyAdmin, createDispute);
router.patch("/disputes/:disputeId/resolve", verifyToken, verifyAdmin, resolveDispute);

router.get("/seller-penalties", verifyToken, verifyAdmin, getSellerPenaltyLog);
router.post("/seller-penalties", verifyToken, verifyAdmin, createSellerPenalty);
router.patch("/seller-penalties/:penaltyId/appeal", verifyToken, verifyAdmin, updateSellerPenaltyAppeal);

router.get("/content-violations", verifyToken, verifyAdmin, getContentPolicyViolations);
router.patch("/content-violations/:violationId/review", verifyToken, verifyAdmin, reviewContentPolicyViolation);

router.get("/bans", verifyToken, verifyAdmin, getBanList);
router.post("/bans", verifyToken, verifyAdmin, createBanListEntry);
router.patch("/bans/:banId", verifyToken, verifyAdmin, updateBanListEntry);

router.get("/terms", verifyToken, verifyAdmin, getTermsVersions);
router.post("/terms", verifyToken, verifyAdmin, createTermsVersion);
router.patch("/terms/:versionId/publish", verifyToken, verifyAdmin, publishTermsVersion);

router.get("/audit-log", verifyToken, verifyAdmin, getTrustSafetyAuditLog);

module.exports = router;
