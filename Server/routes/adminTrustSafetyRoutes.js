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

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, getTrustSafetyOverview);

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
