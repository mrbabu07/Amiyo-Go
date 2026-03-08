const express = require("express");
const router = express.Router();
const {
  acceptOrder,
  rejectOrder,
  markReadyToShip,
  shipOrder,
  markDelivered,
  getOrderTimeline,
} = require("../controllers/vendor/vendorOrderManagementController");
const { verifyToken, requireApprovedVendor } = require("../middleware/auth");

// All routes require vendor authentication
router.use(verifyToken);
router.use(requireApprovedVendor);

// Order management actions
router.post("/orders/:orderId/accept", acceptOrder);
router.post("/orders/:orderId/reject", rejectOrder);
router.post("/orders/:orderId/ready-to-ship", markReadyToShip);
router.post("/orders/:orderId/ship", shipOrder);
router.post("/orders/:orderId/deliver", markDelivered);

// Order timeline
router.get("/orders/:orderId/timeline", getOrderTimeline);

module.exports = router;
