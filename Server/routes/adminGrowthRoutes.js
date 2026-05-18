const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  aggregateGrowthEvents,
  createExperiment,
  createPromotion,
  detectAbandonedCarts,
  duplicatePromotion,
  getGrowthAnalytics,
  getPromotion,
  listExperiments,
  listNotificationLogs,
  listNotificationTemplates,
  listPromotions,
  previewNotificationTemplate,
  publishGrowthEvent,
  setPromotionStatus,
  snapshotPromotionForOrder,
  updatePromotion,
  upsertNotificationTemplate,
} = require("../controllers/growthController");

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/analytics", getGrowthAnalytics);
router.post("/events/publish", publishGrowthEvent);
router.post("/events/aggregate", aggregateGrowthEvents);

router.get("/promotions", listPromotions);
router.post("/promotions", createPromotion);
router.get("/promotions/:id", getPromotion);
router.patch("/promotions/:id", updatePromotion);
router.post("/promotions/:id/pause", setPromotionStatus("paused"));
router.post("/promotions/:id/resume", setPromotionStatus("active"));
router.post("/promotions/:id/expire", setPromotionStatus("expired"));
router.post("/promotions/:id/duplicate", duplicatePromotion);
router.post("/orders/:orderId/promotion-snapshot", snapshotPromotionForOrder);

router.get("/notifications/templates", listNotificationTemplates);
router.put("/notifications/templates", upsertNotificationTemplate);
router.post("/notifications/templates/preview", previewNotificationTemplate);
router.get("/notifications/logs", listNotificationLogs);

router.post("/abandoned-carts/detect", detectAbandonedCarts);

router.get("/experiments", listExperiments);
router.post("/experiments", createExperiment);

module.exports = router;
