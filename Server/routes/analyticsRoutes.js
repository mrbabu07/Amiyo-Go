const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  downloadAdminAnalyticsReport,
  getAdminAnalyticsReports,
  getAdminAnalyticsSummary,
  rebuildAdminAnalyticsSummary,
} = require("../controllers/adminAnalyticsController");

const router = express.Router();

router.get("/reports", verifyToken, verifyAdmin, getAdminAnalyticsReports);
router.get("/reports/export", verifyToken, verifyAdmin, downloadAdminAnalyticsReport);
router.get("/summary", verifyToken, verifyAdmin, getAdminAnalyticsSummary);
router.post("/rebuild", verifyToken, verifyAdmin, rebuildAdminAnalyticsSummary);

module.exports = router;
