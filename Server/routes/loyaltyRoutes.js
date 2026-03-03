const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  getMyPoints,
  getPointsHistory,
  redeemPoints,
  applyReferralCode,
  getLeaderboard,
  getStatistics,
  awardBirthdayBonus,
} = require("../controllers/loyaltyController");

// Protected routes (require authentication)
router.get("/my-points", verifyToken, getMyPoints);
router.get("/history", verifyToken, getPointsHistory);
router.post("/redeem", verifyToken, redeemPoints);
router.post("/apply-referral", verifyToken, applyReferralCode);
router.get("/leaderboard", getLeaderboard); // Public

// Admin routes
router.get("/stats", verifyToken, verifyAdmin, getStatistics);
router.post("/birthday-bonus", verifyToken, verifyAdmin, awardBirthdayBonus);

module.exports = router;
