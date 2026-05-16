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
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");
const { verifyToken, verifyOptionalToken } = require("../middleware/auth");

// Public routes (no auth required)
router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", verifyOptionalToken, subscribe);
router.post("/unsubscribe", verifyOptionalToken, unsubscribe);
router.post("/test", sendTestNotificationPublic); // Public test endpoint

// Protected routes (require authentication)
router.use(verifyToken);

router.get("/preferences", getPreferences);
router.post("/preferences", updatePreferences);
router.get("/", getMyNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.post("/test-auth", sendTestNotification); // Authenticated test endpoint

module.exports = router;
