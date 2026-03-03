const express = require("express");
const router = express.Router();
const {
  getDeliverySettings,
  updateDeliverySettings,
  calculateDeliveryCharge,
} = require("../controllers/deliverySettingsController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// Public routes
router.get("/", getDeliverySettings);
router.post("/calculate", calculateDeliveryCharge);

// Admin routes
router.put("/", verifyToken, verifyAdmin, updateDeliverySettings);

module.exports = router;
