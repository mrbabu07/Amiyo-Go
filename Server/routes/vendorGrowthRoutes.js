const express = require("express");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
const {
  createVendorVoucher,
  getVendorGrowthInsights,
  listVendorGrowthPromotions,
  setVendorPromotionStatus,
  updateVendorPromotion,
} = require("../controllers/growthController");

const router = express.Router();

router.use(verifyToken, requireApprovedVendor, requireVendorPermission("marketing:manage"));

router.get("/promotions", listVendorGrowthPromotions);
router.post("/vouchers", createVendorVoucher);
router.patch("/promotions/:id", updateVendorPromotion);
router.post("/promotions/:id/pause", setVendorPromotionStatus("paused"));
router.post("/promotions/:id/resume", setVendorPromotionStatus("active"));
router.get("/insights", getVendorGrowthInsights);

module.exports = router;
