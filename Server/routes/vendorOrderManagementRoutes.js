const express = require("express");
const router = express.Router();
const {
  acceptOrder,
  rejectOrder,
  markReadyToShip,
  markPickupReady,
  schedulePickup,
  recordDeliveryException,
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

// Order management actions
router.post("/orders/:orderId/accept", requireVendorPermission("orders:manage"), acceptOrder);
router.post("/orders/:orderId/reject", requireVendorPermission("orders:manage"), rejectOrder);
router.post("/orders/:orderId/ready-to-ship", requireVendorPermission("orders:manage"), markReadyToShip);
router.post("/orders/:orderId/pickup-ready", requireVendorPermission("orders:manage"), markPickupReady);
router.post("/orders/:orderId/schedule-pickup", requireVendorPermission("orders:manage"), schedulePickup);
router.post("/orders/:orderId/delivery-exception", requireVendorPermission("orders:manage"), recordDeliveryException);
router.post("/orders/:orderId/ship", requireVendorPermission("orders:manage"), shipOrder);
router.post("/orders/:orderId/deliver", requireVendorPermission("orders:manage"), markDelivered);
router.post("/orders/:orderId/cod-collected", requireVendorPermission("orders:manage"), markCodCollected);
router.post("/orders/:orderId/message-buyer", requireVendorPermission("orders:manage"), sendBuyerMessage);
router.get("/orders/:orderId/packing-slip", requireVendorPermission("orders:view"), downloadPackingSlip);
router.get("/orders/:orderId/barcode-label", requireVendorPermission("orders:view"), downloadBarcodeLabel);

// Order timeline
router.get("/orders/:orderId/timeline", requireVendorPermission("orders:view"), getOrderTimeline);

module.exports = router;
