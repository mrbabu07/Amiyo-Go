const express = require("express");
const router = express.Router();
const {
  acceptOrder,
  rejectOrder,
  markReadyToShip,
  markPickupReady,
  schedulePickup,
  shipOrder,
  markDelivered,
  markCodCollected,
  sendBuyerMessage,
  getOrderTimeline,
  downloadPackingSlip,
  downloadBarcodeLabel,
} = require("../controllers/vendor/vendorOrderManagementController");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");

// All routes require vendor authentication
router.use(verifyToken);
router.use(requireApprovedVendor);
router.use(requireVendorPermission("orders:manage"));

// Order management actions
router.post("/orders/:orderId/accept", acceptOrder);
router.post("/orders/:orderId/reject", rejectOrder);
router.post("/orders/:orderId/ready-to-ship", markReadyToShip);
router.post("/orders/:orderId/pickup-ready", markPickupReady);
router.post("/orders/:orderId/schedule-pickup", schedulePickup);
router.post("/orders/:orderId/ship", shipOrder);
router.post("/orders/:orderId/deliver", markDelivered);
router.post("/orders/:orderId/cod-collected", markCodCollected);
router.post("/orders/:orderId/message-buyer", sendBuyerMessage);
router.get("/orders/:orderId/packing-slip", downloadPackingSlip);
router.get("/orders/:orderId/barcode-label", downloadBarcodeLabel);

// Order timeline
router.get("/orders/:orderId/timeline", getOrderTimeline);

module.exports = router;
