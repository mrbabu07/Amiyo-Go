const CampaignService = require("../services/CampaignService");
const CampaignAnalyticsService = require("../services/CampaignAnalyticsService");
const ProductManagerService = require("../services/ProductManagerService");
const DiscountCalculatorService = require("../services/DiscountCalculatorService");
const Campaign = require("../models/Campaign");
const CampaignAuditLog = require("../models/CampaignAuditLog");

// Create campaign
exports.createCampaign = async (req, res) => {
  try {
    const { name, slug, description, bannerImageUrl, startDate, endDate, discountPercentage, eligibleCategories, maxProductsPerVendor } = req.body;
    const adminUserId = req.user._id;

    const campaignData = {
      name,
      slug,
      description,
      bannerImageUrl,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountPercentage,
      eligibleCategories,
      maxProductsPerVendor,
    };

    const campaign = await CampaignService.createCampaign(campaignData, adminUserId);

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get campaign by ID
exports.getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await CampaignService.getCampaign(id);

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Get campaign by slug
exports.getCampaignBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const campaign = await CampaignService.getCampaignBySlug(slug);

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user._id;
    const updates = req.body;

    const campaign = await CampaignService.updateCampaign(id, updates, adminUserId);

    res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// List campaigns
exports.listCampaigns = async (req, res) => {
  try {
    const { status, search, startDateFrom, startDateTo, sortBy, page = 1, limit = 10 } = req.query;

    const filters = {
      status,
      search,
      startDateFrom,
      startDateTo,
      sortBy,
    };

    const result = await CampaignService.listCampaigns(filters, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.campaigns,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Publish campaign
exports.publishCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user._id;

    const campaign = await CampaignService.publishCampaign(id, adminUserId);

    res.status(200).json({
      success: true,
      message: "Campaign published successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// End campaign
exports.endCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user._id;

    const campaign = await CampaignService.endCampaign(id, adminUserId);

    res.status(200).json({
      success: true,
      message: "Campaign ended successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Archive campaign
exports.archiveCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user._id;

    const campaign = await CampaignService.archiveCampaign(id, adminUserId);

    res.status(200).json({
      success: true,
      message: "Campaign archived successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Add products to campaign
exports.addProductsToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds } = req.body;
    const adminUserId = req.user._id;

    const products = await ProductManagerService.addProductsToCampaign(id, productIds, adminUserId);

    res.status(201).json({
      success: true,
      message: "Products added to campaign",
      data: products,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Remove product from campaign
exports.removeProductFromCampaign = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const adminUserId = req.user._id;

    await ProductManagerService.removeProductFromCampaign(id, productId, adminUserId);

    res.status(200).json({
      success: true,
      message: "Product removed from campaign",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get campaign products
exports.getCampaignProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await ProductManagerService.getEligibleProducts(id, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get campaign analytics
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const analytics = await CampaignAnalyticsService.getAnalytics(
      id,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
    );

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get view metrics
exports.getViewMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const metrics = await CampaignAnalyticsService.getViewMetrics(
      id,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
    );

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get order metrics
exports.getOrderMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const metrics = await CampaignAnalyticsService.getOrderMetrics(
      id,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
    );

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get top products
exports.getTopProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { metric = "views", limit = 10 } = req.query;

    const products = await CampaignAnalyticsService.getTopProducts(id, metric, parseInt(limit));

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Record campaign view
exports.recordCampaignView = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, userId } = req.body;
    const ipAddress = req.ip;

    await CampaignAnalyticsService.recordView(id, sessionId, userId, ipAddress);

    res.status(200).json({
      success: true,
      message: "View recorded",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Export analytics
exports.exportAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const csv = await CampaignAnalyticsService.exportAnalytics(
      id,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="campaign-analytics-${id}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Export products
exports.exportProducts = async (req, res) => {
  try {
    const { id } = req.params;

    const csv = await ProductManagerService.exportProducts(id);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="campaign-products-${id}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, action } = req.query;

    const query = { campaign: id };
    if (action) {
      query.action = action;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await CampaignAuditLog.find(query)
      .populate("adminUser", "name email")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CampaignAuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Export audit logs
exports.exportAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await CampaignAuditLog.find({ campaign: id })
      .populate("adminUser", "name email")
      .sort({ timestamp: -1 });

    let csv = "Timestamp,Action,Admin User,Field,Old Value,New Value\n";

    for (const log of logs) {
      csv += `${log.timestamp},${log.action},${log.adminUser.name},${log.fieldName || ""},${log.oldValue || ""},${log.newValue || ""}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="campaign-audit-${id}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
