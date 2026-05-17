const express = require("express");
const router = express.Router();
const { verifyToken, verifyOptionalToken } = require("../middleware/auth");
const discoveryController = require("../controllers/discoveryController");

router.get("/homepage", verifyOptionalToken, discoveryController.getHomepageDiscovery);
router.get("/check-in/status", verifyToken, discoveryController.getDailyCheckInStatus);
router.post("/check-in", verifyToken, discoveryController.claimDailyCheckInReward);
router.post("/recently-viewed", verifyToken, discoveryController.recordRecentlyViewed);

module.exports = router;
