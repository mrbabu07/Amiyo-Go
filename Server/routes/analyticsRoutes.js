const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  downloadAdminAnalyticsReport,
  getAdminAnalyticsReports,
  getAdminAnalyticsSummary,
  rebuildAdminAnalyticsSummary,
} = require("../controllers/adminAnalyticsController");
const {
  getDataQuality,
  getEventTaxonomy,
  getExperimentAnalytics,
  getIntelligenceDashboard,
  getKpiFramework,
  getReportCenter,
  getRoleDashboardLayer,
  rebuildWarehouseFacts,
} = require("../controllers/analyticsIntelligenceController");

const router = express.Router();

router.get("/reports", verifyToken, verifyAdmin, getAdminAnalyticsReports);
router.get("/reports/export", verifyToken, verifyAdmin, downloadAdminAnalyticsReport);
router.get("/summary", verifyToken, verifyAdmin, getAdminAnalyticsSummary);
router.post("/rebuild", verifyToken, verifyAdmin, rebuildAdminAnalyticsSummary);
router.get("/kpis", verifyToken, verifyAdmin, getKpiFramework);
router.get("/taxonomy", verifyToken, verifyAdmin, getEventTaxonomy);
router.post("/warehouse/rebuild", verifyToken, verifyAdmin, rebuildWarehouseFacts);
router.get("/intelligence", verifyToken, verifyAdmin, getIntelligenceDashboard);
router.get("/data-quality", verifyToken, verifyAdmin, getDataQuality);
router.get("/report-center", verifyToken, verifyAdmin, getReportCenter);
router.get("/experiments", verifyToken, verifyAdmin, getExperimentAnalytics);
router.get("/role/:role", verifyToken, verifyAdmin, getRoleDashboardLayer);

module.exports = router;
