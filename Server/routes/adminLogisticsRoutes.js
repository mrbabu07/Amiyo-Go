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

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, getLogisticsOverview);

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
