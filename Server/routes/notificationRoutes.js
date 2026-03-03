const express = require("express");
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  updatePreferences,
  getPreferences,
  sendTestNotification,
  sendTestNotificationPublic,
  getVapidPublicKey,
} = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/auth");

// Public routes (no auth required)
router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.post("/test", sendTestNotificationPublic); // Public test endpoint

// Protected routes (require authentication)
router.use(verifyToken);

router.get("/preferences", getPreferences);
router.post("/preferences", updatePreferences);
router.post("/test-auth", sendTestNotification); // Authenticated test endpoint

module.exports = router;
