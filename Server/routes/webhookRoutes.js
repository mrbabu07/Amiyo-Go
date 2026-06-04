const express = require("express");
const {
  handleBkashWebhook,
  handleNagadWebhook,
  handleSslcommerzWebhook,
  handleStripeWebhook,
} = require("../controllers/webhookController");

const router = express.Router();

router.post("/bkash", handleBkashWebhook);
router.post("/nagad", handleNagadWebhook);
router.post("/sslcommerz", handleSslcommerzWebhook);
router.post("/stripe", handleStripeWebhook);

module.exports = router;
