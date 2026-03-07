const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  calculateEligiblePayout,
  createPayout,
  getAllPayouts,
  getPayoutById,
  markPayoutPaid,
  cancelPayout,
  getPayoutStats,
  getVendorPayouts,
  getWeeklyPayoutList,
  createBulkPayouts,
  getPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  markRequestPaid,
} = require("../controllers/adminPayoutController");

// Vendor route (for vendor dashboard) - MUST be before /:payoutId to avoid route conflict
router.get("/my-payouts", verifyToken, getVendorPayouts);

// Admin routes - Payout Requests
router.get("/requests", verifyToken, verifyAdmin, getPayoutRequests);
router.patch("/requests/:payoutId/approve", verifyToken, verifyAdmin, approvePayoutRequest);
router.patch("/requests/:payoutId/reject", verifyToken, verifyAdmin, rejectPayoutRequest);
router.patch("/requests/:payoutId/mark-paid", verifyToken, verifyAdmin, markRequestPaid);

// Admin routes - Regular Payouts
router.get("/", verifyToken, verifyAdmin, getAllPayouts);
router.get("/stats", verifyToken, verifyAdmin, getPayoutStats);
router.get("/weekly-list", verifyToken, verifyAdmin, getWeeklyPayoutList);
router.post("/bulk", verifyToken, verifyAdmin, createBulkPayouts);
router.get("/:payoutId", verifyToken, verifyAdmin, getPayoutById);
router.get("/vendor/:vendorId/eligible", verifyToken, verifyAdmin, calculateEligiblePayout);
router.post("/vendor/:vendorId", verifyToken, verifyAdmin, createPayout);
router.patch("/:payoutId/paid", verifyToken, verifyAdmin, markPayoutPaid);
router.patch("/:payoutId/cancel", verifyToken, verifyAdmin, cancelPayout);

module.exports = router;
