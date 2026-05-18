const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  downloadDispatchManifestCsv,
  getCodFloatTracker,
  getDispatchManifest,
  getLogisticsAuditLog,
  getLogisticsOverview,
  listCourierPartners,
  listDeliveryFeeRules,
  listDeliveryZones,
  listFailedDeliveries,
  listPickupStaff,
  recordCodRemittance,
  returnFailedDeliveryToSeller,
  scheduleFailedDeliveryReattempt,
  upsertCourierPartner,
  upsertDeliveryFeeRule,
  upsertDeliveryZone,
  upsertPickupStaff,
} = require("../controllers/adminLogisticsController");
const {
  assignCourier,
  confirmManifestPickup,
  confirmRtoReceived,
  downloadLabel,
  downloadWaybill,
  generateLabel,
  generateReturnLabel,
  getLogisticsDashboard,
  getStateMachine,
  listVendorShipments,
  markRto,
  recordDeliveryAttempt,
  updateCodState,
  updateReverseState,
} = require("../controllers/shipmentController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, getLogisticsOverview);
router.get("/dashboard", verifyToken, verifyAdmin, getLogisticsDashboard);
router.get("/state-machine", verifyToken, verifyAdmin, getStateMachine);

router.get("/shipments", verifyToken, verifyAdmin, listVendorShipments);
router.post("/shipments/:id/assign-courier", verifyToken, verifyAdmin, assignCourier);
router.post("/shipments/:id/delivery-attempt", verifyToken, verifyAdmin, recordDeliveryAttempt);
router.post("/shipments/:id/mark-rto", verifyToken, verifyAdmin, markRto);
router.post("/shipments/:id/confirm-rto-received", verifyToken, verifyAdmin, confirmRtoReceived);
router.post("/shipments/:id/generate-label", verifyToken, verifyAdmin, generateLabel);
router.get("/shipments/:id/label", verifyToken, verifyAdmin, downloadLabel);

router.post("/manifests/:id/confirm-pickup", verifyToken, verifyAdmin, confirmManifestPickup);
router.get("/manifests/:id/waybill", verifyToken, verifyAdmin, downloadWaybill);

router.post("/cod/:id/mark-collected", verifyToken, verifyAdmin, updateCodState("cod_collected"));
router.post("/cod/:id/mark-remitted", verifyToken, verifyAdmin, updateCodState("cod_remitted"));
router.post("/cod/:id/mark-failed", verifyToken, verifyAdmin, updateCodState("cod_failed"));
router.post("/cod/:id/mark-disputed", verifyToken, verifyAdmin, updateCodState("cod_disputed"));

router.post("/returns/:returnId/generate-return-label", verifyToken, verifyAdmin, generateReturnLabel);
router.post("/returns/:returnId/schedule-pickup", verifyToken, verifyAdmin, updateReverseState("return_pickup_scheduled"));
router.post("/returns/:returnId/mark-picked-up", verifyToken, verifyAdmin, updateReverseState("return_picked_up"));
router.post("/returns/:returnId/mark-in-transit", verifyToken, verifyAdmin, updateReverseState("return_in_transit"));
router.post("/returns/:returnId/mark-received", verifyToken, verifyAdmin, updateReverseState("return_received"));
router.post("/returns/:returnId/inspection-result", verifyToken, verifyAdmin, updateReverseState("inspected"));
router.post("/returns/:returnId/restock", verifyToken, verifyAdmin, updateReverseState("restocked"));
router.post("/returns/:returnId/dispose", verifyToken, verifyAdmin, updateReverseState("disposed"));
router.post("/returns/:returnId/refurbish", verifyToken, verifyAdmin, updateReverseState("refurbished"));

router.get("/delivery-zones", verifyToken, verifyAdmin, listDeliveryZones);
router.post("/delivery-zones", verifyToken, verifyAdmin, upsertDeliveryZone);
router.patch("/delivery-zones/:zoneId", verifyToken, verifyAdmin, upsertDeliveryZone);

router.get("/courier-partners", verifyToken, verifyAdmin, listCourierPartners);
router.post("/courier-partners", verifyToken, verifyAdmin, upsertCourierPartner);
router.patch("/courier-partners/:courierId", verifyToken, verifyAdmin, upsertCourierPartner);

router.get("/dispatch-manifest", verifyToken, verifyAdmin, getDispatchManifest);
router.get("/dispatch-manifest/export", verifyToken, verifyAdmin, downloadDispatchManifestCsv);

router.get("/pickup-staff", verifyToken, verifyAdmin, listPickupStaff);
router.post("/pickup-staff", verifyToken, verifyAdmin, upsertPickupStaff);
router.patch("/pickup-staff/:staffId", verifyToken, verifyAdmin, upsertPickupStaff);

router.get("/fee-rules", verifyToken, verifyAdmin, listDeliveryFeeRules);
router.post("/fee-rules", verifyToken, verifyAdmin, upsertDeliveryFeeRule);
router.patch("/fee-rules/:ruleId", verifyToken, verifyAdmin, upsertDeliveryFeeRule);

router.get("/cod-float", verifyToken, verifyAdmin, getCodFloatTracker);
router.post("/cod-remittances", verifyToken, verifyAdmin, recordCodRemittance);

router.get("/failed-deliveries", verifyToken, verifyAdmin, listFailedDeliveries);
router.post("/failed-deliveries/:orderId/reattempt", verifyToken, verifyAdmin, scheduleFailedDeliveryReattempt);
router.post("/failed-deliveries/:orderId/return-to-seller", verifyToken, verifyAdmin, returnFailedDeliveryToSeller);

router.get("/audit-log", verifyToken, verifyAdmin, getLogisticsAuditLog);

module.exports = router;
