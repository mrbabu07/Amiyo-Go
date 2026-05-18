const express = require("express");
const { verifyOptionalToken } = require("../middleware/auth");
const {
  getEventTaxonomy,
  trackAnalyticsBatch,
  trackAnalyticsEvent,
} = require("../controllers/analyticsIntelligenceController");

const router = express.Router();

router.get("/taxonomy", getEventTaxonomy);
router.post("/events", verifyOptionalToken, trackAnalyticsEvent);
router.post("/events/batch", verifyOptionalToken, trackAnalyticsBatch);

module.exports = router;
