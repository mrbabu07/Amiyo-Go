const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// Campaign Management Routes (Admin only)
router.post("/", verifyToken, verifyAdmin, campaignController.createCampaign);
router.get("/", verifyToken, verifyAdmin, campaignController.listCampaigns);
router.get("/:id", campaignController.getCampaign);
router.put("/:id", verifyToken, verifyAdmin, campaignController.updateCampaign);
router.post("/:id/publish", verifyToken, verifyAdmin, campaignController.publishCampaign);
router.post("/:id/end", verifyToken, verifyAdmin, campaignController.endCampaign);
router.post("/:id/archive", verifyToken, verifyAdmin, campaignController.archiveCampaign);

// Campaign Products Routes
router.post("/:id/products", verifyToken, verifyAdmin, campaignController.addProductsToCampaign);
router.delete("/:id/products/:productId", verifyToken, verifyAdmin, campaignController.removeProductFromCampaign);
router.get("/:id/products", campaignController.getCampaignProducts);

// Campaign Analytics Routes
router.get("/:id/analytics", verifyToken, verifyAdmin, campaignController.getCampaignAnalytics);
router.get("/:id/analytics/views", verifyToken, verifyAdmin, campaignController.getViewMetrics);
router.get("/:id/analytics/orders", verifyToken, verifyAdmin, campaignController.getOrderMetrics);
router.get("/:id/analytics/top-products", verifyToken, verifyAdmin, campaignController.getTopProducts);
router.get("/:id/analytics/export", verifyToken, verifyAdmin, campaignController.exportAnalytics);

// Campaign Landing Page Routes (Public)
router.get("/slug/:slug", campaignController.getCampaignBySlug);
router.post("/:id/view", campaignController.recordCampaignView);

// Campaign Audit Routes
router.get("/:id/audit-logs", verifyToken, verifyAdmin, campaignController.getAuditLogs);
router.get("/:id/audit-logs/export", verifyToken, verifyAdmin, campaignController.exportAuditLogs);

// Export Routes
router.get("/:id/export/products", verifyToken, verifyAdmin, campaignController.exportProducts);

module.exports = router;
