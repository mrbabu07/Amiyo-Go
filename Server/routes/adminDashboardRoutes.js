const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const adminDashboardController = require("../controllers/adminDashboardController");
const {
  listNotificationDeliveries,
  retryNotificationDelivery,
} = require("../controllers/adminNotificationDeliveryController");

const router = express.Router();

router.get("/overview", verifyToken, verifyAdmin, adminDashboardController.getAdminDashboardOverview);
router.get("/operations", verifyToken, verifyAdmin, adminDashboardController.getAdminOperationsOverview);
router.get("/notification-deliveries", verifyToken, verifyAdmin, listNotificationDeliveries);
router.post("/notification-deliveries/:id/retry", verifyToken, verifyAdmin, retryNotificationDelivery);
router.get("/views", verifyToken, verifyAdmin, adminDashboardController.getAdminSavedViews);
router.post("/views", verifyToken, verifyAdmin, adminDashboardController.saveAdminSavedView);
router.delete("/views/:key", verifyToken, verifyAdmin, adminDashboardController.deleteAdminSavedView);
router.patch("/cases/bulk", verifyToken, verifyAdmin, adminDashboardController.bulkUpdateAdminCaseAssignments);
router.get("/cases/:caseKey", verifyToken, verifyAdmin, adminDashboardController.getAdminCaseAssignment);
router.patch("/cases/:caseKey", verifyToken, verifyAdmin, adminDashboardController.updateAdminCaseAssignment);

module.exports = router;
