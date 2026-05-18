const {
  EVENT_SCHEMA_VERSION,
  EVENT_TAXONOMY,
  getEventDefinition,
  listKpis,
} = require("../services/analyticsKpiFramework");
const AnalyticsEventService = require("../services/analyticsEventService");
const AnalyticsWarehouseService = require("../services/analyticsWarehouseService");
const AnalyticsIntelligenceService = require("../services/analyticsIntelligenceService");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const getDb = (req) => req.app.locals.db || req.app.locals.models?.AnalyticsSummary?.collection?.db;

const getActorContext = (req) => ({
  user: {
    _id: req.user?._id || req.dbUser?._id || req.user?.uid,
    uid: req.user?.uid,
    role: req.user?.role || req.dbUser?.role || "guest",
    email: req.user?.email || req.dbUser?.email,
  },
  sessionId: req.headers["x-session-id"] || req.body?.sessionId,
  anonymousId: req.headers["x-anonymous-id"] || req.body?.anonymousId,
  sourcePage: req.headers.referer || req.body?.sourcePage,
  source: req.headers.origin || "web",
  device: req.headers["user-agent"] || "unknown",
});

const jsonError = (res, error, fallback = "Request failed") =>
  res.status(error.statusCode || 400).json({ success: false, error: error.message || fallback });

exports.getKpiFramework = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        role: req.query.role || "all",
        groups: listKpis(req.query.role || "all"),
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load KPI framework");
  }
};

exports.getEventTaxonomy = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        schemaVersion: EVENT_SCHEMA_VERSION,
        events: EVENT_TAXONOMY.map(getEventDefinition),
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load event taxonomy");
  }
};

exports.trackAnalyticsEvent = async (req, res) => {
  try {
    const result = await AnalyticsEventService.trackEvent(getDb(req), req.body, getActorContext(req));
    res.status(result.accepted ? 202 : 400).json({ success: result.accepted, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to track analytics event");
  }
};

exports.trackAnalyticsBatch = async (req, res) => {
  try {
    const events = req.body.events || req.body.items || req.body;
    const result = await AnalyticsEventService.trackBatch(getDb(req), events, getActorContext(req));
    res.status(result.rejected > 0 && result.accepted === 0 ? 400 : 202).json({ success: result.accepted > 0 || result.duplicates > 0, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to track analytics batch");
  }
};

exports.rebuildWarehouseFacts = async (req, res) => {
  try {
    const result = await AnalyticsWarehouseService.rebuildDailyFacts({
      db: getDb(req),
      start: req.body.start || req.query.start,
      end: req.body.end || req.query.end,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to rebuild analytics warehouse");
  }
};

exports.getIntelligenceDashboard = async (req, res) => {
  try {
    const dashboard = await AnalyticsIntelligenceService.getDashboard(getDb(req), req.query);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    jsonError(res, error, "Failed to load analytics intelligence");
  }
};

exports.getDataQuality = async (req, res) => {
  try {
    const dashboard = await AnalyticsIntelligenceService.getDashboard(getDb(req), req.query);
    res.json({ success: true, data: dashboard.dataQuality });
  } catch (error) {
    jsonError(res, error, "Failed to load data quality checks");
  }
};

exports.getReportCenter = async (req, res) => {
  try {
    res.json({ success: true, data: AnalyticsIntelligenceService.buildReportCenter() });
  } catch (error) {
    jsonError(res, error, "Failed to load report center");
  }
};

exports.getExperimentAnalytics = async (req, res) => {
  try {
    const dashboard = await AnalyticsIntelligenceService.getDashboard(getDb(req), req.query);
    res.json({ success: true, data: dashboard.experiments });
  } catch (error) {
    jsonError(res, error, "Failed to load experiment analytics");
  }
};

exports.getRoleDashboardLayer = async (req, res) => {
  try {
    const role = req.params.role || req.query.role || "admin";
    const dashboard = await AnalyticsIntelligenceService.getDashboard(getDb(req), req.query);
    const roleViews = {
      customer: {
        orderTrends: dashboard.cohorts,
        savingsSummary: dashboard.campaigns,
        loyaltyInsights: dashboard.customers.find((row) => row.customerId === normalizeId(req.query.customerId)) || null,
        recommendedCategories: dashboard.customers.slice(0, 5).map((row) => row.categoryPreference),
      },
      vendor: {
        salesOverview: dashboard.vendors,
        productOverview: dashboard.products,
        fulfilmentOverview: dashboard.logistics,
        promotionOverview: dashboard.campaigns,
        customerQualityOverview: dashboard.customers,
      },
      admin: {
        executiveOverview: dashboard.summary,
        operationsDashboard: dashboard.dataQuality,
        trustDashboard: dashboard.trust,
        logisticsDashboard: dashboard.logistics,
        growthDashboard: dashboard.campaigns,
        financeDashboard: dashboard.finance,
      },
    };
    res.json({ success: true, data: roleViews[role] || roleViews.admin });
  } catch (error) {
    jsonError(res, error, "Failed to load role dashboard layer");
  }
};
