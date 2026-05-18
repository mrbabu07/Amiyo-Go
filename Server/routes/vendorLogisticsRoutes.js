const express = require("express");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
const {
  confirmRtoReceived,
  createVendorManifest,
  downloadLabel,
  downloadPackingSlip,
  downloadWaybill,
  generateLabel,
  listReverseLogistics,
  listVendorManifests,
  listVendorShipments,
  markOrderPacked,
  markPickupReady,
  submitVendorManifest,
  updateReverseState,
} = require("../controllers/shipmentController");

const router = express.Router();

router.use(verifyToken);
router.use(requireApprovedVendor);

router.get("/shipments", requireVendorPermission("orders:view"), listVendorShipments);
router.post("/orders/:orderId/pack", requireVendorPermission("orders:manage"), markOrderPacked);
router.post("/orders/:orderId/pickup-ready", requireVendorPermission("orders:manage"), markPickupReady);
router.post("/shipments/:id/generate-label", requireVendorPermission("orders:manage"), generateLabel);
router.get("/shipments/:id/label", requireVendorPermission("orders:view"), downloadLabel);
router.get("/shipments/:id/packing-slip", requireVendorPermission("orders:view"), downloadPackingSlip);
router.post("/shipments/:id/confirm-rto-received", requireVendorPermission("returns:manage"), confirmRtoReceived);

router.get("/manifests", requireVendorPermission("orders:view"), listVendorManifests);
router.post("/manifests", requireVendorPermission("orders:manage"), createVendorManifest);
router.post("/manifests/:id/submit", requireVendorPermission("orders:manage"), submitVendorManifest);
router.get("/manifests/:id/waybill", requireVendorPermission("orders:view"), downloadWaybill);

router.get("/returns/reverse-logistics", requireVendorPermission("returns:view"), listReverseLogistics);
router.post("/returns/:returnId/mark-received", requireVendorPermission("returns:manage"), updateReverseState("return_received"));
router.post("/returns/:returnId/inspection-result", requireVendorPermission("returns:manage"), updateReverseState("inspected"));
router.post("/returns/:returnId/restock", requireVendorPermission("returns:manage"), updateReverseState("restocked"));
router.post("/returns/:returnId/dispose", requireVendorPermission("returns:manage"), updateReverseState("disposed"));
router.post("/returns/:returnId/refurbish", requireVendorPermission("returns:manage"), updateReverseState("refurbished"));

module.exports = router;
