const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  applyClearanceSale,
  createFlashDeal,
  createPlatformVoucher,
  createPromotionCampaign,
  getCampaignNominationQueue,
  getLoyaltyRules,
  getPromotionAuditLog,
  getPromotionOverview,
  getPromotionRules,
  listClearanceRules,
  listFlashDeals,
  listHomepageSlots,
  listPlatformVouchers,
  listPromotionCampaigns,
  reorderHomepageSlots,
  reviewCampaignNomination,
  selectDealOfDay,
  updatePromotionCampaign,
  upsertHomepageSlot,
  upsertLoyaltyRules,
  upsertPromotionRules,
} = require("../controllers/adminPromotionController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, getPromotionOverview);

router.get("/campaigns", verifyToken, verifyAdmin, listPromotionCampaigns);
router.post("/campaigns", verifyToken, verifyAdmin, createPromotionCampaign);
router.patch("/campaigns/:campaignId", verifyToken, verifyAdmin, updatePromotionCampaign);

router.get("/nominations", verifyToken, verifyAdmin, getCampaignNominationQueue);
router.patch("/nominations/:nominationId/review", verifyToken, verifyAdmin, reviewCampaignNomination);

router.get("/flash-deals", verifyToken, verifyAdmin, listFlashDeals);
router.post("/flash-deals", verifyToken, verifyAdmin, createFlashDeal);

router.get("/vouchers", verifyToken, verifyAdmin, listPlatformVouchers);
router.post("/vouchers", verifyToken, verifyAdmin, createPlatformVoucher);

router.get("/homepage-slots", verifyToken, verifyAdmin, listHomepageSlots);
router.post("/homepage-slots", verifyToken, verifyAdmin, upsertHomepageSlot);
router.patch("/homepage-slots/reorder", verifyToken, verifyAdmin, reorderHomepageSlots);
router.patch("/homepage-slots/:slotId", verifyToken, verifyAdmin, upsertHomepageSlot);
router.post("/deal-of-day", verifyToken, verifyAdmin, selectDealOfDay);

router.get("/clearance", verifyToken, verifyAdmin, listClearanceRules);
router.post("/clearance", verifyToken, verifyAdmin, applyClearanceSale);

router.get("/loyalty-rules", verifyToken, verifyAdmin, getLoyaltyRules);
router.put("/loyalty-rules", verifyToken, verifyAdmin, upsertLoyaltyRules);

router.get("/rules", verifyToken, verifyAdmin, getPromotionRules);
router.put("/rules", verifyToken, verifyAdmin, upsertPromotionRules);

router.get("/audit-log", verifyToken, verifyAdmin, getPromotionAuditLog);

module.exports = router;
