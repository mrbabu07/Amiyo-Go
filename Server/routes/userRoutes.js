const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  getOrCreateUser,
  getUserStatus,
} = require("../controllers/userController");
const {
  getPreferences,
  updatePreferences,
} = require("../controllers/notificationController");

router.get("/me", verifyToken, getOrCreateUser);
router.get("/status", verifyToken, getUserStatus);
router.get("/notification-preferences", verifyToken, getPreferences);
router.post("/notification-preferences", verifyToken, updatePreferences);

module.exports = router;
