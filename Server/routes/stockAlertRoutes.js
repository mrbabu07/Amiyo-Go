const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  subscribeToAlert,
  unsubscribeFromAlert,
  getUserAlerts,
  checkAndSendAlerts,
  getAlertStats,
} = require("../controllers/stockAlertController");

// Protected routes (require authentication)
router.post("/subscribe", verifyToken, subscribeToAlert);
router.delete("/:id", verifyToken, unsubscribeFromAlert);
router.get("/my-alerts", verifyToken, getUserAlerts);

// Admin routes
router.post("/check-and-send", verifyToken, verifyAdmin, checkAndSendAlerts);
router.get("/stats", verifyToken, verifyAdmin, getAlertStats);

module.exports = router;
