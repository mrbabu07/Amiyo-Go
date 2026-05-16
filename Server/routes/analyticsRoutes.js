const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const analyticsService = require("../services/analyticsService");

const router = express.Router();

router.get("/summary", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const AnalyticsSummary = req.app.locals.models.AnalyticsSummary;
    const { granularity = "daily", start, end, rebuild } = req.query;

    if (rebuild === "true") {
      await analyticsService.rebuildDailySummary({
        db: req.app.locals.db,
        AnalyticsSummary,
        start,
        end,
      });
    }

    const data = await AnalyticsSummary.findRange({ granularity, start, end });
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error loading analytics summary:", error);
    res.status(500).json({ success: false, error: "Failed to load analytics summary" });
  }
});

router.post("/rebuild", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const summaries = await analyticsService.rebuildDailySummary({
      db: req.app.locals.db,
      AnalyticsSummary: req.app.locals.models.AnalyticsSummary,
      start: req.body.start,
      end: req.body.end,
    });

    res.json({
      success: true,
      message: `Rebuilt ${summaries.length} daily analytics summaries`,
      data: summaries,
    });
  } catch (error) {
    console.error("Error rebuilding analytics summary:", error);
    res.status(500).json({ success: false, error: "Failed to rebuild analytics summary" });
  }
});

module.exports = router;
