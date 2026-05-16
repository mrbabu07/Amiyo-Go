const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const vendorMarketingController = require("../controllers/vendorMarketingController");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, vendorMarketingController.listAdminMarketingItems);
router.get("/analytics", verifyToken, verifyAdmin, vendorMarketingController.getCampaignVoucherAnalytics);
router.patch("/:id/review", verifyToken, verifyAdmin, vendorMarketingController.reviewAdminMarketingItem);

module.exports = router;
