const express = require("express");
const { verifyOptionalToken, verifyToken } = require("../middleware/auth");
const {
  assignExperimentVariant,
  evaluatePromotions,
  getMySegments,
  getRecommendations,
  trackGrowthEvent,
  validatePromotionCode,
} = require("../controllers/growthController");

const router = express.Router();

router.post("/events", verifyOptionalToken, trackGrowthEvent);
router.post("/promotions/evaluate", verifyOptionalToken, evaluatePromotions);
router.post("/promotions/validate-code", verifyOptionalToken, validatePromotionCode);
router.get("/recommendations/:placement", verifyOptionalToken, getRecommendations);
router.post("/experiments/:key/assign", verifyOptionalToken, assignExperimentVariant);

router.get("/segments/me", verifyToken, getMySegments);

module.exports = router;
