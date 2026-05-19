const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    req.user = {
      uid: "test-user",
      role: req.headers["x-test-role"] || "admin",
    };
    return next();
  },
  verifyOptionalToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      req.user = {
        uid: "test-user",
        role: req.headers["x-test-role"] || "customer",
      };
    }
    return next();
  },
  verifyAdmin: (req, res, next) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  },
  requireRole: (role) => (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `${role} access required` });
    }
    return next();
  },
  requireApprovedVendor: (req, res, next) => {
    if (req.user?.role !== "vendor") {
      return res.status(403).json({ error: "Approved vendor access required" });
    }
    return next();
  },
  requireVendorPermission: () => (req, res, next) => next(),
}));

jest.mock("../controllers/productController", () => ({
  getAllProducts: (req, res) => res.json({ route: "products:list" }),
  getProductById: (req, res) => res.json({ route: "products:id", id: req.params.id }),
  searchProducts: (req, res) => res.json({ route: "products:search", q: req.query.q || "" }),
  createProduct: (req, res) => res.status(201).json({ route: "products:create" }),
  updateProduct: (req, res) => res.json({ route: "products:update", id: req.params.id }),
  deleteProduct: (req, res) => res.json({ route: "products:delete", id: req.params.id }),
  getFilterOptions: (req, res) => res.json({ route: "products:filter-options" }),
  getLowStockProducts: (req, res) => res.json({ route: "products:low-stock" }),
  getOutOfStockProducts: (req, res) => res.json({ route: "products:out-of-stock" }),
  updateStockBulk: (req, res) => res.json({ route: "products:bulk-stock-update" }),
  incrementProductView: (req, res) => res.json({ route: "products:view", id: req.params.id }),
  reportProduct: (req, res) =>
    res.status(201).json({ route: "products:report", id: req.params.id, reason: req.body.reason }),
  updateProductVariants: (req, res) => res.json({ route: "products:update-variants", id: req.params.id }),
  getProductVariants: (req, res) => res.json({ route: "products:variants", id: req.params.id }),
}));

jest.mock("../controllers/discoveryController", () => ({
  getHomepageDiscovery: (req, res) =>
    res.json({
      route: "discovery:homepage",
      personalized: Boolean(req.user?.uid),
      recentProductIds: req.query.recentProductIds || "",
    }),
  getDailyCheckInStatus: (req, res) => res.json({ route: "discovery:check-in-status" }),
  claimDailyCheckInReward: (req, res) => res.json({ route: "discovery:check-in-claim" }),
  recordRecentlyViewed: (req, res) =>
    res.json({ route: "discovery:recently-viewed", productId: req.body.productId }),
}));

jest.mock("../controllers/searchController", () => ({
  getAutocomplete: (req, res) =>
    res.json({
      route: "search:autocomplete",
      q: req.query.q || "",
      personalized: Boolean(req.user?.uid),
    }),
  getSearchResults: (req, res) =>
    res.json({
      route: "search:results",
      q: req.query.q || "",
      sort: req.query.sort || "best_match",
    }),
  getSearchNavigation: (req, res) =>
    res.json({ route: "search:navigation" }),
  saveSearchHistory: (req, res) =>
    res.json({ route: "search:history", query: req.body.query }),
}));

jest.mock("../controllers/orderController", () => ({
  getAllOrders: (req, res) => res.json({ route: "orders:list" }),
  getAdminOrders: (req, res) => res.json({ route: "orders:admin-list" }),
  getAdminOrderById: (req, res) => res.json({ route: "orders:detail", id: req.params.id }),
  getAdminOrderStats: (req, res) => res.json({ route: "orders:admin-stats" }),
  exportOrdersCsv: (req, res) => res.json({ route: "orders:export-csv" }),
  bulkUpdateOrderStatus: (req, res) => res.json({ route: "orders:bulk-status" }),
  getAdminCodReconciliation: (req, res) => res.json({ route: "orders:cod-reconciliation" }),
  getAdminSlaBreaches: (req, res) => res.json({ route: "orders:sla-breaches" }),
  getAdminFraudOrders: (req, res) => res.json({ route: "orders:fraud-queue" }),
  addOrderNote: (req, res) => res.json({ route: "orders:add-note", id: req.params.id }),
  regenerateInvoice: (req, res) => res.json({ route: "orders:regenerate-invoice", id: req.params.id }),
  getOrderTimelineEvents: (req, res) => res.json({ route: "orders:timeline", id: req.params.id }),
  getUserOrders: (req, res) => res.json({ route: "orders:my-orders" }),
  getUserOrderById: (req, res) => res.json({ route: "orders:customer-detail", id: req.params.id }),
  createOrder: (req, res) =>
    res.status(201).json({
      route: req.path === "/guest" ? "orders:guest-create" : "orders:create",
    }),
  updateOrderStatus: (req, res) => res.json({ route: "orders:update-status", id: req.params.id }),
  cancelOrder: (req, res) => res.json({ route: "orders:cancel", id: req.params.id }),
  downloadInvoice: (req, res) => res.json({ route: "orders:invoice", id: req.params.id }),
  adminCancelOrder: (req, res) => res.json({ route: "orders:admin-cancel", id: req.params.id }),
  adminResolveDispute: (req, res) => res.json({ route: "orders:resolve-dispute", id: req.params.id }),
  adminApproveRefund: (req, res) => res.json({ route: "orders:approve-refund", id: req.params.id }),
  adminOverrideStatus: (req, res) => res.json({ route: "orders:override-status", id: req.params.id }),
  adminReassignCourier: (req, res) => res.json({ route: "orders:reassign-courier", id: req.params.id }),
  adminChangeDeliveryAddress: (req, res) => res.json({ route: "orders:delivery-address", id: req.params.id }),
  adminExtendReturnWindow: (req, res) => res.json({ route: "orders:return-window", id: req.params.id }),
  adminForceRefundOrder: (req, res) => res.json({ route: "orders:force-refund", id: req.params.id }),
}));

jest.mock("../controllers/vendorController", () => ({
  registerVendor: (req, res) => res.status(201).json({ route: "vendors:register" }),
  getFollowedVendorFeed: (req, res) => res.json({ route: "vendors:followed-feed" }),
  getVendorPublicInfo: (req, res) => res.json({ route: "vendors:public", id: req.params.id }),
  getVendorPublicInfoBySlug: (req, res) => res.json({ route: "vendors:public-slug", slug: req.params.slug }),
  getFollowStatus: (req, res) => res.json({ route: "vendors:follow-status", id: req.params.id }),
  followVendor: (req, res) => res.json({ route: "vendors:follow", id: req.params.id }),
  unfollowVendor: (req, res) => res.json({ route: "vendors:unfollow", id: req.params.id }),
  getMyVendorProfile: (req, res) => res.json({ route: "vendors:me" }),
  updateVendorProfile: (req, res) => res.json({ route: "vendors:update-me" }),
  getMyKyc: (req, res) => res.json({ route: "vendors:kyc-me" }),
  submitVendorKyc: (req, res) => res.json({ route: "vendors:kyc-submit" }),
  getKycQueue: (req, res) => res.json({ route: "vendors:kyc-queue" }),
  reviewVendorKyc: (req, res) => res.json({ route: "vendors:kyc-review", id: req.params.vendorId }),
  uploadLogo: (req, res) => res.json({ route: "vendors:upload-logo" }),
  uploadBanner: (req, res) => res.json({ route: "vendors:upload-banner" }),
  getVendorAllowedCategories: (req, res) => res.json({ route: "vendors:my-categories" }),
  getShopStatus: (req, res) => res.json({ route: "vendors:shop-status" }),
  toggleShopStatus: (req, res) => res.json({ route: "vendors:shop-toggle" }),
  setVacationMode: (req, res) => res.json({ route: "vendors:vacation-set" }),
  cancelVacationMode: (req, res) => res.json({ route: "vendors:vacation-cancel" }),
  setupVendorTwoFactor: (req, res) => res.json({ route: "vendors:2fa-setup" }),
  verifyVendorTwoFactor: (req, res) => res.json({ route: "vendors:2fa-verify" }),
  disableVendorTwoFactor: (req, res) => res.json({ route: "vendors:2fa-disable" }),
  getAllVendors: (req, res) => res.json({ route: "vendors:admin-list" }),
  getVendorStats: (req, res) => res.json({ route: "vendors:stats" }),
  getVendorById: (req, res) => res.json({ route: "vendors:admin-id", id: req.params.id }),
  updateVendor: (req, res) => res.json({ route: "vendors:admin-update", id: req.params.id }),
  approveVendor: (req, res) => res.json({ route: "vendors:approve", id: req.params.id }),
  suspendVendor: (req, res) => res.json({ route: "vendors:suspend", id: req.params.id }),
  rejectVendor: (req, res) => res.json({ route: "vendors:reject", id: req.params.id }),
  reactivateVendor: (req, res) => res.json({ route: "vendors:reactivate", id: req.params.id }),
}));

jest.mock("../controllers/vendorDashboardController", () => ({
  getDashboardStats: (req, res) => res.json({ route: "vendor-dashboard:stats" }),
  getVendorReports: (req, res) => res.json({ route: "vendor-dashboard:reports" }),
  getVendorOrderStats: (req, res) => res.json({ route: "vendor-dashboard:order-stats" }),
  getVendorOrders: (req, res) => res.json({ route: "vendor-dashboard:orders" }),
  getVendorOrderDetail: (req, res) => res.json({ route: "vendor-dashboard:order-detail", id: req.params.orderId }),
  updateOrderStatus: (req, res) => res.json({ route: "vendor-dashboard:update-order-status", id: req.params.orderId }),
  bulkUpdateVendorOrders: (req, res) =>
    res.json({
      route: "vendor-dashboard:bulk-update-order-status",
      orderIds: req.body.orderIds || [],
      status: req.body.status,
    }),
  packVendorItems: (req, res) => res.json({ route: "vendor-dashboard:pack", id: req.params.orderId }),
  shipVendorItems: (req, res) => res.json({ route: "vendor-dashboard:ship", id: req.params.orderId }),
  deliverVendorItems: (req, res) => res.json({ route: "vendor-dashboard:deliver", id: req.params.orderId }),
  getTopProducts: (req, res) => res.json({ route: "vendor-dashboard:top-products" }),
}));

jest.mock("../controllers/adminDashboardController", () => ({
  getAdminDashboardOverview: (req, res) =>
    res.json({ route: "admin-dashboard:overview", range: req.query.range || "7d" }),
  getAdminOperationsOverview: (req, res) =>
    res.json({ route: "admin-dashboard:operations" }),
  getAdminCaseAssignment: (req, res) =>
    res.json({ route: "admin-dashboard:case", caseKey: req.params.caseKey }),
  updateAdminCaseAssignment: (req, res) =>
    res.json({ route: "admin-dashboard:update-case", caseKey: req.params.caseKey }),
  bulkUpdateAdminCaseAssignments: (req, res) =>
    res.json({ route: "admin-dashboard:bulk-cases" }),
  getAdminSavedViews: (req, res) =>
    res.json({ route: "admin-dashboard:saved-views" }),
  saveAdminSavedView: (req, res) =>
    res.json({ route: "admin-dashboard:save-view" }),
  deleteAdminSavedView: (req, res) =>
    res.json({ route: "admin-dashboard:delete-view", key: req.params.key }),
}));

jest.mock("../controllers/adminAnalyticsController", () => ({
  getAdminAnalyticsReports: (req, res) =>
    res.json({
      route: "admin-analytics:reports",
      range: req.query.range || "30d",
      granularity: req.query.granularity || "day",
    }),
  downloadAdminAnalyticsReport: (req, res) => {
    if (req.query.format === "pdf") {
      res.set("Content-Type", "application/pdf");
      return res.send("%PDF-1.3 analytics");
    }
    res.set("Content-Type", "text/csv");
    return res.send("Report,Value\nGMV,1000");
  },
  getAdminAnalyticsSummary: (req, res) =>
    res.json({ route: "admin-analytics:summary", granularity: req.query.granularity || "daily" }),
  rebuildAdminAnalyticsSummary: (req, res) =>
    res.json({ route: "admin-analytics:rebuild", start: req.body.start || null }),
}));

jest.mock("../controllers/adminProductController", () => ({
  getAllAdminProducts: (req, res) =>
    res.json({ route: "admin-products:list", status: req.query.status || req.query.approvalStatus || "all" }),
  getPendingProducts: (req, res) => res.json({ route: "admin-products:pending" }),
  getModerationQueue: (req, res) => res.json({ route: "admin-products:queue" }),
  approveProduct: (req, res) => res.json({ route: "admin-products:approve", id: req.params.id }),
  rejectProduct: (req, res) => res.json({ route: "admin-products:reject", id: req.params.id }),
  disableProduct: (req, res) => res.json({ route: "admin-products:disable", id: req.params.id }),
  adminEditProduct: (req, res) => res.json({ route: "admin-products:admin-edit", id: req.params.id }),
  bulkModerateProducts: (req, res) => res.json({ route: "admin-products:bulk", action: req.body.action }),
  getModerationConfig: (req, res) => res.json({ route: "admin-products:config" }),
  scanProductsForModeration: (req, res) => res.json({ route: "admin-products:scan", scope: req.body.scope }),
  getDuplicateProductGroups: (req, res) => res.json({ route: "admin-products:duplicates" }),
  getIpViolationReports: (req, res) => res.json({ route: "admin-products:ip-reports" }),
  submitIpViolationReport: (req, res) => res.status(201).json({ route: "admin-products:submit-ip-report" }),
  reviewIpViolationReport: (req, res) =>
    res.json({ route: "admin-products:review-ip-report", id: req.params.reportId }),
  getBrandRegistry: (req, res) => res.json({ route: "admin-products:brands" }),
  upsertBrandRegistryItem: (req, res) => res.status(201).json({ route: "admin-products:brand-save" }),
  reviewBrandRegistryItem: (req, res) =>
    res.json({ route: "admin-products:brand-review", id: req.params.brandId }),
  getVendorProductsAdmin: (req, res) =>
    res.json({ route: "admin-products:vendor-products", vendorId: req.params.vendorId }),
}));

jest.mock("../controllers/adminVendorPerformanceController", () => ({
  getVendorPerformance: (req, res) => res.json({ route: "vendors:performance", id: req.params.id }),
}));

jest.mock("../controllers/adminFinanceController", () => ({
  getFinanceOverview: (req, res) => res.json({ route: "admin-finance:overview" }),
  getCommissionSummary: (req, res) => res.json({ route: "admin-finance:commission-summary" }),
  getFinanceOperationsOverview: (req, res) => res.json({ route: "admin-finance:operations" }),
  getPayoutSchedule: (req, res) =>
    res.json({ route: "admin-finance:payout-schedule", frequency: req.body?.frequency || "weekly" }),
  upsertPayoutSchedule: (req, res) =>
    res.json({ route: "admin-finance:update-payout-schedule", frequency: req.body.frequency }),
  getPayoutQueue: (req, res) => res.json({ route: "admin-finance:payout-queue" }),
  getCommissionRules: (req, res) => res.json({ route: "admin-finance:commission-rules" }),
  saveCommissionRule: (req, res) =>
    res.status(req.params.ruleId ? 200 : 201).json({
      route: "admin-finance:save-commission-rule",
      ruleId: req.params.ruleId || null,
      commissionRate: req.body.commissionRate,
    }),
  getFinanceLedger: (req, res) => res.json({ route: "admin-finance:ledger", type: req.query.type || "all" }),
  getRefundWorkflow: (req, res) => res.json({ route: "admin-finance:refunds", status: req.query.status || "pending" }),
  reviewFinanceRefund: (req, res) =>
    res.json({ route: "admin-finance:review-refund", id: req.params.returnId, decision: req.body.decision }),
  getRevenueReports: (req, res) => res.json({ route: "admin-finance:revenue-reports" }),
  downloadRevenueReport: (req, res) => {
    res.set("Content-Type", req.query.format === "pdf" ? "application/pdf" : "text/csv");
    res.send(req.query.format === "pdf" ? "%PDF-1.3" : "Bucket,GMV\n2026-05-01,2000");
  },
  getEscrowRules: (req, res) => res.json({ route: "admin-finance:escrow-rules" }),
  upsertEscrowRules: (req, res) =>
    res.json({ route: "admin-finance:update-escrow-rules", holdPercentage: req.body.holdPercentage }),
  getFinanceAuditLog: (req, res) => res.json({ route: "admin-finance:audit-log" }),
  getVendorFinanceSummary: (req, res) => res.json({ route: "vendors:finance-summary", id: req.params.vendorId }),
  getVendorFinanceTransactions: (req, res) => res.json({ route: "vendors:finance-transactions", id: req.params.vendorId }),
}));

jest.mock("../controllers/adminPromotionController", () => ({
  getPromotionOverview: (req, res) => res.json({ route: "admin-promotions:overview" }),
  listPromotionCampaigns: (req, res) => res.json({ route: "admin-promotions:campaigns" }),
  createPromotionCampaign: (req, res) =>
    res.status(201).json({ route: "admin-promotions:create-campaign", name: req.body.name }),
  updatePromotionCampaign: (req, res) =>
    res.json({ route: "admin-promotions:update-campaign", id: req.params.campaignId }),
  getCampaignNominationQueue: (req, res) =>
    res.json({ route: "admin-promotions:nominations", status: req.query.status || "all" }),
  reviewCampaignNomination: (req, res) =>
    res.json({ route: "admin-promotions:review-nomination", id: req.params.nominationId, status: req.body.status }),
  listFlashDeals: (req, res) => res.json({ route: "admin-promotions:flash-deals" }),
  createFlashDeal: (req, res) =>
    res.status(201).json({ route: "admin-promotions:create-flash-deal", productId: req.body.productId }),
  listPlatformVouchers: (req, res) => res.json({ route: "admin-promotions:vouchers" }),
  createPlatformVoucher: (req, res) =>
    res.status(201).json({ route: "admin-promotions:create-voucher", code: req.body.code }),
  listHomepageSlots: (req, res) => res.json({ route: "admin-promotions:homepage-slots" }),
  upsertHomepageSlot: (req, res) => res.status(req.params.slotId ? 200 : 201).json({
    route: "admin-promotions:save-slot",
    slotId: req.params.slotId || null,
  }),
  reorderHomepageSlots: (req, res) => res.json({ route: "admin-promotions:reorder-slots" }),
  selectDealOfDay: (req, res) =>
    res.status(201).json({ route: "admin-promotions:deal-of-day", productId: req.body.productId }),
  listClearanceRules: (req, res) => res.json({ route: "admin-promotions:clearance" }),
  applyClearanceSale: (req, res) =>
    res.status(201).json({ route: "admin-promotions:apply-clearance", discount: req.body.discountPercentage }),
  getLoyaltyRules: (req, res) => res.json({ route: "admin-promotions:loyalty-rules" }),
  upsertLoyaltyRules: (req, res) =>
    res.json({ route: "admin-promotions:update-loyalty-rules", earnRate: req.body.earnRate }),
  getPromotionRules: (req, res) => res.json({ route: "admin-promotions:rules" }),
  upsertPromotionRules: (req, res) =>
    res.json({ route: "admin-promotions:update-rules", allowVoucherWithFlashSale: req.body.allowVoucherWithFlashSale }),
  getPromotionAuditLog: (req, res) => res.json({ route: "admin-promotions:audit-log" }),
}));

jest.mock("../controllers/adminLogisticsController", () => ({
  getLogisticsOverview: (req, res) => res.json({ route: "admin-logistics:overview" }),
  listDeliveryZones: (req, res) => res.json({ route: "admin-logistics:zones" }),
  upsertDeliveryZone: (req, res) =>
    res.status(req.params.zoneId ? 200 : 201).json({
      route: "admin-logistics:save-zone",
      zoneId: req.params.zoneId || null,
      name: req.body.name,
    }),
  listCourierPartners: (req, res) => res.json({ route: "admin-logistics:couriers" }),
  getCourierProviderReadiness: (req, res) => res.json({ route: "admin-logistics:courier-provider-status" }),
  upsertCourierPartner: (req, res) =>
    res.status(req.params.courierId ? 200 : 201).json({
      route: "admin-logistics:save-courier",
      courierId: req.params.courierId || null,
      name: req.body.name,
    }),
  getDispatchManifest: (req, res) =>
    res.json({ route: "admin-logistics:manifest", date: req.query.date || null }),
  downloadDispatchManifestCsv: (req, res) => {
    res.set("Content-Type", "text/csv");
    res.send("Courier,Order ID\nPathao,order-1");
  },
  listPickupStaff: (req, res) => res.json({ route: "admin-logistics:pickup-staff" }),
  upsertPickupStaff: (req, res) =>
    res.status(req.params.staffId ? 200 : 201).json({
      route: "admin-logistics:save-pickup-staff",
      staffId: req.params.staffId || null,
      name: req.body.name,
    }),
  listDeliveryFeeRules: (req, res) => res.json({ route: "admin-logistics:fee-rules" }),
  upsertDeliveryFeeRule: (req, res) =>
    res.status(req.params.ruleId ? 200 : 201).json({
      route: "admin-logistics:save-fee-rule",
      ruleId: req.params.ruleId || null,
      ruleType: req.body.ruleType,
    }),
  getCodFloatTracker: (req, res) => res.json({ route: "admin-logistics:cod-float" }),
  recordCodRemittance: (req, res) =>
    res.status(201).json({ route: "admin-logistics:record-cod-remittance", courierName: req.body.courierName }),
  listFailedDeliveries: (req, res) =>
    res.json({ route: "admin-logistics:failed-deliveries", status: req.query.status || "all" }),
  scheduleFailedDeliveryReattempt: (req, res) =>
    res.json({ route: "admin-logistics:schedule-reattempt", orderId: req.params.orderId }),
  returnFailedDeliveryToSeller: (req, res) =>
    res.json({ route: "admin-logistics:return-to-seller", orderId: req.params.orderId }),
  getLogisticsAuditLog: (req, res) => res.json({ route: "admin-logistics:audit-log" }),
}));

jest.mock("../controllers/adminCustomerController", () => ({
  getCustomerList: (req, res) =>
    res.json({ route: "admin-customers:list", search: req.query.search || "" }),
  getCustomerDetail: (req, res) =>
    res.json({ route: "admin-customers:detail", customerId: req.params.customerId }),
  updateCustomerStatus: (req, res) =>
    res.json({ route: "admin-customers:status", customerId: req.params.customerId, status: req.body.status }),
  mergeDuplicateCustomers: (req, res) =>
    res.json({
      route: "admin-customers:merge",
      sourceCustomerId: req.body.sourceCustomerId,
      targetCustomerId: req.body.targetCustomerId,
    }),
  getCustomerLoyaltyLedger: (req, res) =>
    res.json({ route: "admin-customers:loyalty-ledger", customerId: req.params.customerId }),
  adjustCustomerLoyalty: (req, res) =>
    res.json({
      route: "admin-customers:loyalty-adjust",
      customerId: req.params.customerId,
      action: req.body.action,
    }),
  getLoyaltyProgram: (req, res) => res.json({ route: "admin-customers:loyalty-program" }),
  updateLoyaltyProgram: (req, res) =>
    res.json({ route: "admin-customers:update-loyalty-program", silver: req.body.tierThresholds?.silver }),
  getReferralDashboard: (req, res) => res.json({ route: "admin-customers:referrals" }),
  getCustomerAuditLog: (req, res) => res.json({ route: "admin-customers:audit-log" }),
}));

jest.mock("../controllers/adminTrustSafetyController", () => ({
  getTrustSafetyOverview: (req, res) => res.json({ route: "admin-trust-safety:overview" }),
  getFraudDashboard: (req, res) => res.json({ route: "admin-trust-safety:fraud", status: req.query.status || "all" }),
  createFraudFlag: (req, res) =>
    res.status(201).json({ route: "admin-trust-safety:create-fraud-flag", subjectId: req.body.subjectId }),
  updateFraudFlag: (req, res) =>
    res.json({ route: "admin-trust-safety:update-fraud-flag", flagId: req.params.flagId, status: req.body.status }),
  getReviewModerationQueue: (req, res) =>
    res.json({ route: "admin-trust-safety:reviews", status: req.query.status || "all" }),
  moderateReview: (req, res) =>
    res.json({ route: "admin-trust-safety:moderate-review", reviewId: req.params.reviewId, action: req.body.action }),
  getDisputeCenter: (req, res) =>
    res.json({ route: "admin-trust-safety:disputes", type: req.query.type || "all" }),
  createDispute: (req, res) =>
    res.status(201).json({ route: "admin-trust-safety:create-dispute", type: req.body.type }),
  resolveDispute: (req, res) =>
    res.json({ route: "admin-trust-safety:resolve-dispute", disputeId: req.params.disputeId, decision: req.body.decision }),
  getSellerPenaltyLog: (req, res) =>
    res.json({ route: "admin-trust-safety:seller-penalties", status: req.query.status || "all" }),
  createSellerPenalty: (req, res) =>
    res.status(201).json({ route: "admin-trust-safety:create-penalty", vendorId: req.body.vendorId, type: req.body.type }),
  updateSellerPenaltyAppeal: (req, res) =>
    res.json({ route: "admin-trust-safety:update-appeal", penaltyId: req.params.penaltyId, status: req.body.status }),
  getContentPolicyViolations: (req, res) =>
    res.json({ route: "admin-trust-safety:content-violations", source: req.query.source || "all" }),
  reviewContentPolicyViolation: (req, res) =>
    res.json({ route: "admin-trust-safety:review-content", violationId: req.params.violationId, action: req.body.action }),
  getBanList: (req, res) =>
    res.json({ route: "admin-trust-safety:bans", type: req.query.type || "all" }),
  createBanListEntry: (req, res) =>
    res.status(201).json({ route: "admin-trust-safety:create-ban", type: req.body.type, value: req.body.value }),
  updateBanListEntry: (req, res) =>
    res.json({ route: "admin-trust-safety:update-ban", banId: req.params.banId, status: req.body.status }),
  getTermsVersions: (req, res) => res.json({ route: "admin-trust-safety:terms" }),
  createTermsVersion: (req, res) =>
    res.status(201).json({ route: "admin-trust-safety:create-terms", type: req.body.type, version: req.body.version }),
  publishTermsVersion: (req, res) =>
    res.json({ route: "admin-trust-safety:publish-terms", versionId: req.params.versionId }),
  getTrustSafetyAuditLog: (req, res) => res.json({ route: "admin-trust-safety:audit-log" }),
}));

jest.mock("../controllers/adminPlatformController", () => ({
  getPlatformControlOverview: (req, res) => res.json({ route: "admin-platform:overview" }),
  listNotificationBroadcasts: (req, res) => res.json({ route: "admin-platform:broadcasts" }),
  sendNotificationBroadcast: (req, res) =>
    res.status(201).json({
      route: "admin-platform:send-broadcast",
      target: req.body.target,
      channels: req.body.channels,
    }),
  listMessageTemplates: (req, res) => res.json({ route: "admin-platform:templates" }),
  upsertMessageTemplate: (req, res) =>
    res.json({ route: "admin-platform:save-template", key: req.params.templateKey, subject: req.body.subject }),
  listEmailCampaigns: (req, res) => res.json({ route: "admin-platform:email-campaigns" }),
  createEmailCampaign: (req, res) =>
    res.status(201).json({ route: "admin-platform:create-email-campaign", subject: req.body.subject }),
  listAnnouncements: (req, res) => res.json({ route: "admin-platform:announcements" }),
  upsertAnnouncement: (req, res) =>
    res.status(req.params.announcementId ? 200 : 201).json({
      route: "admin-platform:save-announcement",
      announcementId: req.params.announcementId || null,
      title: req.body.title,
    }),
  getPublicPlatformConfig: (req, res) =>
    res.json({
      route: "platform:public-config",
      featureFlags: { shopDirectory: true },
      storefront: { shopsVisible: true },
    }),
  getPlatformConfig: (req, res) => res.json({ route: "admin-platform:config" }),
  updatePlatformConfig: (req, res) =>
    res.json({ route: "admin-platform:update-config", guestCheckout: req.body.featureFlags?.guestCheckout }),
  upsertCategoryNode: (req, res) =>
    res.status(req.params.categoryId ? 200 : 201).json({
      route: "admin-platform:save-category",
      categoryId: req.params.categoryId || null,
      name: req.body.name,
    }),
  upsertCategoryAttributes: (req, res) =>
    res.json({
      route: "admin-platform:save-attributes",
      categoryId: req.params.categoryId,
      count: req.body.attributes?.length || 0,
    }),
  updateCommissionRuleTable: (req, res) =>
    res.json({ route: "admin-platform:commission-rules", count: req.body.rules?.length || 0 }),
  listStaffAccess: (req, res) => res.json({ route: "admin-platform:staff" }),
  inviteStaffAccount: (req, res) =>
    res.status(201).json({ route: "admin-platform:invite-staff", email: req.body.email, role: req.body.role }),
  updateStaffRole: (req, res) =>
    res.json({ route: "admin-platform:update-staff-role", staffId: req.params.staffId, role: req.body.role }),
  getStaffActivityLog: (req, res) => res.json({ route: "admin-platform:activity-log" }),
  setupAdminTwoFactor: (req, res) =>
    res.json({ route: "admin-platform:2fa-setup", staffId: req.params.staffId }),
  verifyAdminTwoFactor: (req, res) =>
    res.json({ route: "admin-platform:2fa-verify", staffId: req.params.staffId }),
  updateRoleSessionPolicy: (req, res) =>
    res.json({
      route: "admin-platform:session-policy",
      role: req.params.role,
      sessionTimeoutMinutes: req.body.sessionTimeoutMinutes,
    }),
}));

jest.mock("../controllers/adminVendorManagementController", () => ({
  getVendorManagementProfile: (req, res) =>
    res.json({ route: "admin-vendors:management", id: req.params.vendorId }),
  updateVendorStatus: (req, res) =>
    res.json({ route: "admin-vendors:status", id: req.params.vendorId, status: req.body.status }),
  updateVendorTier: (req, res) =>
    res.json({ route: "admin-vendors:tier", id: req.params.vendorId, tier: req.body.tier }),
  autoCalculateVendorTier: (req, res) =>
    res.json({ route: "admin-vendors:auto-tier", id: req.params.vendorId }),
  updateVendorCommission: (req, res) =>
    res.json({ route: "admin-vendors:commission", id: req.params.vendorId }),
  sendVendorNotice: (req, res) =>
    res.status(201).json({ route: "admin-vendors:notice", id: req.params.vendorId }),
  issueVendorViolation: (req, res) =>
    res.status(201).json({ route: "admin-vendors:violation", id: req.params.vendorId }),
  bulkVendorAction: (req, res) =>
    res.json({ route: "admin-vendors:bulk", action: req.body.action }),
}));

jest.mock("../controllers/vendorsFinanceController", () => ({
  getTransactions: (req, res) => res.json({ route: "vendors:self-finance-transactions" }),
  getStatements: (req, res) => res.json({ route: "vendors:self-finance-statements" }),
  getPayments: (req, res) => res.json({ route: "vendors:self-finance-payments" }),
}));

jest.mock("../controllers/vendorMarketingController", () => ({
  listPublicVendorMarketingItems: (req, res) =>
    res.json({ route: "vendors:public-marketing", id: req.params.id }),
  recordPublicVendorMarketingEvent: (req, res) =>
    res.json({ route: "vendors:public-marketing-event", id: req.params.id, itemId: req.params.itemId }),
  listVendorMarketingItems: (req, res) => res.json({ route: "vendors:marketing-list" }),
  getCampaignVoucherAnalytics: (req, res) => res.json({ route: "vendors:marketing-analytics" }),
  createVendorMarketingItem: (req, res) => res.status(201).json({ route: "vendors:marketing-create" }),
  updateVendorMarketingItem: (req, res) =>
    res.json({ route: "vendors:marketing-update", id: req.params.id }),
  deleteVendorMarketingItem: (req, res) =>
    res.json({ route: "vendors:marketing-delete", id: req.params.id }),
}));

jest.mock("../controllers/vendorChatController", () => ({
  startConversation: (req, res) => res.json({ route: "vendor-chat:start" }),
  sendMessage: (req, res) => res.json({ route: "vendor-chat:send", id: req.params.conversationId }),
  getUserConversations: (req, res) => res.json({ route: "vendor-chat:user" }),
  getVendorConversations: (req, res) => res.json({ route: "vendor-chat:vendor" }),
  getConversation: (req, res) => res.json({ route: "vendor-chat:conversation", id: req.params.conversationId }),
  getConversationMessages: (req, res) =>
    res.json({ route: "vendor-chat:messages", id: req.params.conversationId }),
  markConversationAsRead: (req, res) =>
    res.json({ route: "vendor-chat:mark-read", id: req.params.conversationId }),
  closeConversation: (req, res) => res.json({ route: "vendor-chat:close", id: req.params.conversationId }),
  getVendorSupportTools: (req, res) => res.json({ route: "vendor-chat:support-tools" }),
  createVendorQuickReply: (req, res) => res.status(201).json({ route: "vendor-chat:quick-reply-create" }),
  updateVendorQuickReply: (req, res) =>
    res.json({ route: "vendor-chat:quick-reply-update", id: req.params.replyId }),
  deleteVendorQuickReply: (req, res) =>
    res.json({ route: "vendor-chat:quick-reply-delete", id: req.params.replyId }),
  createVendorMessageTemplate: (req, res) => res.status(201).json({ route: "vendor-chat:template-create" }),
  updateVendorMessageTemplate: (req, res) =>
    res.json({ route: "vendor-chat:template-update", id: req.params.templateId }),
  deleteVendorMessageTemplate: (req, res) =>
    res.json({ route: "vendor-chat:template-delete", id: req.params.templateId }),
}));

jest.mock("../controllers/adminPayoutController", () => ({
  calculateEligiblePayout: (req, res) =>
    res.json({ route: "payouts:eligible", vendorId: req.params.vendorId }),
  createPayout: (req, res) => res.status(201).json({ route: "payouts:create", vendorId: req.params.vendorId }),
  getAllPayouts: (req, res) => res.json({ route: "payouts:list" }),
  getPayoutById: (req, res) => res.json({ route: "payouts:id", payoutId: req.params.payoutId }),
  markPayoutPaid: (req, res) => res.json({ route: "payouts:paid", payoutId: req.params.payoutId }),
  cancelPayout: (req, res) => res.json({ route: "payouts:cancel", payoutId: req.params.payoutId }),
  getPayoutStats: (req, res) => res.json({ route: "payouts:stats" }),
  getVendorPayouts: (req, res) => res.json({ route: "payouts:my-payouts" }),
  getWeeklyPayoutList: (req, res) => res.json({ route: "payouts:weekly-list" }),
  createBulkPayouts: (req, res) => res.status(201).json({ route: "payouts:bulk-create" }),
  getPayoutRequests: (req, res) => res.json({ route: "payouts:requests" }),
  approvePayoutRequest: (req, res) => res.json({ route: "payouts:approve-request", payoutId: req.params.payoutId }),
  rejectPayoutRequest: (req, res) => res.json({ route: "payouts:reject-request", payoutId: req.params.payoutId }),
  markRequestPaid: (req, res) => res.json({ route: "payouts:mark-request-paid", payoutId: req.params.payoutId }),
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/products", require("../routes/productRoutes"));
  app.use("/api/search", require("../routes/searchRoutes"));
  app.use("/api/discovery", require("../routes/discoveryRoutes"));
  app.use("/api/platform", require("../routes/platformRoutes"));
  app.use("/api/orders", require("../routes/orderRoutes"));
  app.use("/api/vendors", require("../routes/vendorRoutes"));
  app.use("/api/vendor-chat", require("../routes/vendorChatRoutes"));
  app.use("/api/admin/dashboard", require("../routes/adminDashboardRoutes"));
  app.use("/api/admin/analytics", require("../routes/analyticsRoutes"));
  app.use("/api/admin/products", require("../routes/adminProductRoutes"));
  app.use("/api/admin/payouts", require("../routes/adminPayoutRoutes"));
  app.use("/api/admin/finance", require("../routes/adminFinanceRoutes"));
  app.use("/api/admin/promotions", require("../routes/adminPromotionRoutes"));
  app.use("/api/admin/logistics", require("../routes/adminLogisticsRoutes"));
  app.use("/api/admin/customers", require("../routes/adminCustomerRoutes"));
  app.use("/api/admin/trust-safety", require("../routes/adminTrustSafetyRoutes"));
  app.use("/api/admin/platform", require("../routes/adminPlatformRoutes"));
  app.use("/api/admin/vendors", require("../routes/adminVendorRoutes"));
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  return app;
};

describe("Black-box API tests", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  describe("public product routes", () => {
    test("GET /api/products/search uses the search route, not the id route", async () => {
      const response = await request(app).get("/api/products/search?q=rice");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "products:search", q: "rice" });
    });

    test("GET /api/products/filter-options uses the static filter route", async () => {
      const response = await request(app).get("/api/products/filter-options");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "products:filter-options" });
    });

    test("GET /api/products/abc123 falls through to the product detail route", async () => {
      const response = await request(app).get("/api/products/abc123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "products:id", id: "abc123" });
    });

    test("POST /api/products/:id/report accepts buyer listing reports", async () => {
      const response = await request(app)
        .post("/api/products/abc123/report")
        .send({ reason: "counterfeit" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "products:report",
        id: "abc123",
        reason: "counterfeit",
      });
    });
  });

  describe("homepage discovery API behavior", () => {
    test("GET /api/discovery/homepage works for guests with recent product hints", async () => {
      const response = await request(app).get("/api/discovery/homepage?recentProductIds=p1,p2");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "discovery:homepage",
        personalized: false,
        recentProductIds: "p1,p2",
      });
    });

    test("GET /api/discovery/homepage accepts optional auth for personalization", async () => {
      const response = await request(app)
        .get("/api/discovery/homepage")
        .set("Authorization", "Bearer test");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "discovery:homepage",
        personalized: true,
        recentProductIds: "",
      });
    });

    test("POST /api/discovery/recently-viewed requires a token and records product views", async () => {
      const rejected = await request(app)
        .post("/api/discovery/recently-viewed")
        .send({ productId: "p1" });
      const accepted = await request(app)
        .post("/api/discovery/recently-viewed")
        .set("Authorization", "Bearer test")
        .send({ productId: "p1" });

      expect(rejected.status).toBe(401);
      expect(accepted.status).toBe(200);
      expect(accepted.body).toEqual({ route: "discovery:recently-viewed", productId: "p1" });
    });

    test("daily check-in endpoints are protected", async () => {
      const status = await request(app)
        .get("/api/discovery/check-in/status")
        .set("Authorization", "Bearer test");
      const claim = await request(app)
        .post("/api/discovery/check-in")
        .set("Authorization", "Bearer test");

      expect(status.body).toEqual({ route: "discovery:check-in-status" });
      expect(claim.body).toEqual({ route: "discovery:check-in-claim" });
    });
  });

  describe("public platform config API behavior", () => {
    test("GET /api/platform/config exposes public storefront feature flags", async () => {
      const response = await request(app).get("/api/platform/config");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "platform:public-config",
        featureFlags: { shopDirectory: true },
        storefront: { shopsVisible: true },
      });
    });
  });

  describe("search navigation API behavior", () => {
    test("GET /api/search/autocomplete works for guests", async () => {
      const response = await request(app).get("/api/search/autocomplete?q=samsng%20phon");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "search:autocomplete",
        q: "samsng phon",
        personalized: false,
      });
    });

    test("GET /api/search/autocomplete accepts optional auth for search history", async () => {
      const response = await request(app)
        .get("/api/search/autocomplete")
        .set("Authorization", "Bearer test");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "search:autocomplete",
        q: "",
        personalized: true,
      });
    });

    test("GET /api/search/results supports sort and query parameters", async () => {
      const response = await request(app).get("/api/search/results?q=headphones&sort=top_rated");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "search:results",
        q: "headphones",
        sort: "top_rated",
      });
    });

    test("GET /api/search/navigation exposes the marketplace navigation source", async () => {
      const response = await request(app).get("/api/search/navigation");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "search:navigation" });
    });

    test("POST /api/search/history requires auth and records a search", async () => {
      const rejected = await request(app)
        .post("/api/search/history")
        .send({ query: "phone" });
      const accepted = await request(app)
        .post("/api/search/history")
        .set("Authorization", "Bearer test")
        .send({ query: "phone" });

      expect(rejected.status).toBe(401);
      expect(accepted.status).toBe(200);
      expect(accepted.body).toEqual({ route: "search:history", query: "phone" });
    });
  });

  describe("protected route behavior", () => {
    test("GET /api/products/admin/low-stock rejects requests without a token", async () => {
      const response = await request(app).get("/api/products/admin/low-stock");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "No token provided" });
    });

    test("GET /api/vendors/marketing/items rejects admin access when vendor role is required", async () => {
      const response = await request(app)
        .get("/api/vendors/marketing/items")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Approved vendor access required" });
    });
  });

  describe("order API behavior", () => {
    test("GET /api/orders/admin/stats uses the admin stats route", async () => {
      const response = await request(app)
        .get("/api/orders/admin/stats")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:admin-stats" });
    });

    test("GET /api/orders/admin/cod-reconciliation uses the COD reconciliation route", async () => {
      const response = await request(app)
        .get("/api/orders/admin/cod-reconciliation")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:cod-reconciliation" });
    });

    test("GET /api/orders/admin/sla-breaches uses the SLA monitor route", async () => {
      const response = await request(app)
        .get("/api/orders/admin/sla-breaches")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:sla-breaches" });
    });

    test("GET /api/orders/admin/fraud-queue uses the fraud queue route", async () => {
      const response = await request(app)
        .get("/api/orders/admin/fraud-queue")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:fraud-queue" });
    });

    test("GET /api/orders/:id/detail uses the customer-safe detail route", async () => {
      const response = await request(app)
        .get("/api/orders/6a0b2a08063b3d7fdd3556fe/detail")
        .set("Authorization", "Bearer test");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "orders:customer-detail",
        id: "6a0b2a08063b3d7fdd3556fe",
      });
    });

    test("PATCH /api/orders/admin/:id/reassign-courier uses the admin courier override route", async () => {
      const response = await request(app)
        .patch("/api/orders/admin/order-1/reassign-courier")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ courierName: "Pathao" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:reassign-courier", id: "order-1" });
    });

    test("PATCH /api/orders/admin/:id/force-refund uses the admin refund override route", async () => {
      const response = await request(app)
        .patch("/api/orders/admin/order-1/force-refund")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "orders:force-refund", id: "order-1" });
    });

    test("POST /api/orders/guest allows guest checkout without auth", async () => {
      const response = await request(app).post("/api/orders/guest").send({
        items: [{ productId: "p1", quantity: 1 }],
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ route: "orders:guest-create" });
    });
  });

  describe("vendor API behavior", () => {
    test("GET /api/vendors/stats uses the admin stats route, not vendor id route", async () => {
      const response = await request(app)
        .get("/api/vendors/stats")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:stats" });
    });

    test("GET /api/vendors/marketing/items uses the vendor marketing list route", async () => {
      const response = await request(app)
        .get("/api/vendors/marketing/items")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:marketing-list" });
    });

    test("GET /api/vendors/reports uses the vendor reports route", async () => {
      const response = await request(app)
        .get("/api/vendors/reports?period=90")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendor-dashboard:reports" });
    });

    test("POST /api/vendors/security/2fa/setup uses the vendor security route", async () => {
      const response = await request(app)
        .post("/api/vendors/security/2fa/setup")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:2fa-setup" });
    });

    test("POST /api/vendors/security/2fa/verify uses the vendor security route", async () => {
      const response = await request(app)
        .post("/api/vendors/security/2fa/verify")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor")
        .send({ code: "123456" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:2fa-verify" });
    });

    test("DELETE /api/vendors/security/2fa uses the vendor security route", async () => {
      const response = await request(app)
        .delete("/api/vendors/security/2fa")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor")
        .send({ code: "123456" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:2fa-disable" });
    });

    test("GET /api/vendors/slug/:slug/public uses the public slug route", async () => {
      const response = await request(app).get("/api/vendors/slug/my-brand/public");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendors:public-slug", slug: "my-brand" });
    });
  });

  describe("vendor chat API behavior", () => {
    test("GET /api/vendor-chat/vendor/support-tools uses the vendor support tools route", async () => {
      const response = await request(app)
        .get("/api/vendor-chat/vendor/support-tools")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "vendor-chat:support-tools" });
    });

    test("POST /api/vendor-chat/vendor/quick-replies uses the quick reply route", async () => {
      const response = await request(app)
        .post("/api/vendor-chat/vendor/quick-replies")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor")
        .send({ title: "Ship today", message: "We will ship today." });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ route: "vendor-chat:quick-reply-create" });
    });
  });

  describe("admin dashboard API behavior", () => {
    test("GET /api/admin/dashboard/overview uses the command center route", async () => {
      const response = await request(app)
        .get("/api/admin/dashboard/overview?range=30d")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-dashboard:overview", range: "30d" });
    });

    test("GET /api/admin/dashboard/overview rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/dashboard/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin analytics API behavior", () => {
    test("GET /api/admin/analytics/reports returns the real reports route", async () => {
      const response = await request(app)
        .get("/api/admin/analytics/reports?range=90d&granularity=week")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-analytics:reports",
        range: "90d",
        granularity: "week",
      });
    });

    test("GET /api/admin/analytics/reports/export downloads CSV reports", async () => {
      const response = await request(app)
        .get("/api/admin/analytics/reports/export?report=vendorLeague&format=csv")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text).toContain("GMV");
    });

    test("GET /api/admin/analytics/reports/export downloads PDF reports", async () => {
      const response = await request(app)
        .get("/api/admin/analytics/reports/export?report=gmvTrend&format=pdf")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.text || response.body.toString()).toContain("%PDF-1.3");
    });

    test("legacy analytics summary and rebuild routes stay available", async () => {
      const summary = await request(app)
        .get("/api/admin/analytics/summary?granularity=daily")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const rebuild = await request(app)
        .post("/api/admin/analytics/rebuild")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ start: "2026-05-01" });

      expect(summary.body).toEqual({ route: "admin-analytics:summary", granularity: "daily" });
      expect(rebuild.body).toEqual({ route: "admin-analytics:rebuild", start: "2026-05-01" });
    });

    test("GET /api/admin/analytics/reports rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/analytics/reports")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin product moderation API behavior", () => {
    test("GET /api/admin/products/queue uses the moderation queue route", async () => {
      const response = await request(app)
        .get("/api/admin/products/queue")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-products:queue" });
    });

    test("POST /api/admin/products/bulk uses the bulk moderation route", async () => {
      const response = await request(app)
        .post("/api/admin/products/bulk")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ action: "approve", productIds: ["p1"] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-products:bulk", action: "approve" });
    });

    test("PATCH /api/admin/products/:id/admin-edit reaches edit-on-behalf route", async () => {
      const response = await request(app)
        .patch("/api/admin/products/product-1/admin-edit")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ title: "Fixed title" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-products:admin-edit", id: "product-1" });
    });

    test("GET /api/admin/products/brands is not captured by product action routes", async () => {
      const response = await request(app)
        .get("/api/admin/products/brands")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-products:brands" });
    });

    test("GET /api/admin/products/queue rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/products/queue")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin vendor management API behavior", () => {
    test("GET /api/admin/vendors/:vendorId/management uses the management route", async () => {
      const response = await request(app)
        .get("/api/admin/vendors/vendor-1/management")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-vendors:management", id: "vendor-1" });
    });

    test("PATCH /api/admin/vendors/:vendorId/status uses the status control route", async () => {
      const response = await request(app)
        .patch("/api/admin/vendors/vendor-1/status")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ status: "suspended" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-vendors:status", id: "vendor-1", status: "suspended" });
    });

    test("POST /api/admin/vendors/bulk uses the bulk action route before vendorId routes", async () => {
      const response = await request(app)
        .post("/api/admin/vendors/bulk")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ vendorIds: ["vendor-1"], action: "export" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-vendors:bulk", action: "export" });
    });

    test("GET /api/admin/vendors/:vendorId/management rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/vendors/vendor-1/management")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin finance API behavior", () => {
    test("GET /api/admin/finance/payout-queue uses the payout queue route", async () => {
      const response = await request(app)
        .get("/api/admin/finance/payout-queue")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-finance:payout-queue" });
    });

    test("PUT /api/admin/finance/payout-schedule updates the payout cycle", async () => {
      const response = await request(app)
        .put("/api/admin/finance/payout-schedule")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ frequency: "biweekly", cutoffDay: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-finance:update-payout-schedule",
        frequency: "biweekly",
      });
    });

    test("POST /api/admin/finance/commission-rules creates a commission rule", async () => {
      const response = await request(app)
        .post("/api/admin/finance/commission-rules")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "Fashion preferred", commissionRate: 8.5 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-finance:save-commission-rule",
        ruleId: null,
        commissionRate: 8.5,
      });
    });

    test("PATCH /api/admin/finance/refunds/:returnId/review uses the finance refund workflow", async () => {
      const response = await request(app)
        .patch("/api/admin/finance/refunds/return-1/review")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ decision: "approve", refundMethod: "store_credit" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-finance:review-refund",
        id: "return-1",
        decision: "approve",
      });
    });

    test("GET /api/admin/finance/revenue-reports/export downloads a CSV report", async () => {
      const response = await request(app)
        .get("/api/admin/finance/revenue-reports/export?format=csv")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text).toContain("Bucket,GMV");
    });

    test("GET /api/admin/finance/payout-queue rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/finance/payout-queue")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin promotions API behavior", () => {
    test("GET /api/admin/promotions/overview uses the promotions command route", async () => {
      const response = await request(app)
        .get("/api/admin/promotions/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-promotions:overview" });
    });

    test("POST /api/admin/promotions/campaigns creates a campaign", async () => {
      const response = await request(app)
        .post("/api/admin/promotions/campaigns")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "11.11 Sale" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ route: "admin-promotions:create-campaign", name: "11.11 Sale" });
    });

    test("PATCH /api/admin/promotions/nominations/:id/review reviews a nominated SKU", async () => {
      const response = await request(app)
        .patch("/api/admin/promotions/nominations/nom-1/review")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ productId: "product-1", status: "approved" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-promotions:review-nomination",
        id: "nom-1",
        status: "approved",
      });
    });

    test("POST /api/admin/promotions/flash-deals schedules a flash deal", async () => {
      const response = await request(app)
        .post("/api/admin/promotions/flash-deals")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ productId: "product-1", flashPrice: 700 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ route: "admin-promotions:create-flash-deal", productId: "product-1" });
    });

    test("POST /api/admin/promotions/vouchers creates a platform voucher", async () => {
      const response = await request(app)
        .post("/api/admin/promotions/vouchers")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ code: "EID10", discountType: "percentage" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ route: "admin-promotions:create-voucher", code: "EID10" });
    });

    test("PUT /api/admin/promotions/loyalty-rules updates loyalty rules", async () => {
      const response = await request(app)
        .put("/api/admin/promotions/loyalty-rules")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ earnRate: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-promotions:update-loyalty-rules", earnRate: 2 });
    });

    test("GET and PUT /api/admin/promotions/rules manage promotion stacking rules", async () => {
      const getResponse = await request(app)
        .get("/api/admin/promotions/rules")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toEqual({ route: "admin-promotions:rules" });

      const updateResponse = await request(app)
        .put("/api/admin/promotions/rules")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ allowVoucherWithFlashSale: true });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toEqual({
        route: "admin-promotions:update-rules",
        allowVoucherWithFlashSale: true,
      });
    });

    test("GET /api/admin/promotions/overview rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/promotions/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin logistics API behavior", () => {
    test("GET /api/admin/logistics/overview uses the logistics command route", async () => {
      const response = await request(app)
        .get("/api/admin/logistics/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-logistics:overview" });
    });

    test("POST /api/admin/logistics/delivery-zones creates a delivery zone", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/delivery-zones")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "Dhaka", codAvailable: true });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-logistics:save-zone",
        zoneId: null,
        name: "Dhaka",
      });
    });

    test("POST /api/admin/logistics/courier-partners creates a courier partner", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/courier-partners")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "Pathao", baseDeliveryCost: 80 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-logistics:save-courier",
        courierId: null,
        name: "Pathao",
      });
    });

    test("GET /api/admin/logistics/courier-provider-status returns provider readiness", async () => {
      const response = await request(app)
        .get("/api/admin/logistics/courier-provider-status")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-logistics:courier-provider-status" });
    });

    test("GET /api/admin/logistics/dispatch-manifest returns daily manifest route", async () => {
      const response = await request(app)
        .get("/api/admin/logistics/dispatch-manifest?date=2026-05-17")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-logistics:manifest", date: "2026-05-17" });
    });

    test("GET /api/admin/logistics/dispatch-manifest/export downloads manifest CSV", async () => {
      const response = await request(app)
        .get("/api/admin/logistics/dispatch-manifest/export?date=2026-05-17")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text).toContain("Courier,Order ID");
    });

    test("POST /api/admin/logistics/pickup-staff creates pickup staff", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/pickup-staff")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "Jamal", phone: "01700000000" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-logistics:save-pickup-staff",
        staffId: null,
        name: "Jamal",
      });
    });

    test("POST /api/admin/logistics/fee-rules creates a delivery fee rule", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/fee-rules")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "Dhaka zone", ruleType: "zone_rate" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-logistics:save-fee-rule",
        ruleId: null,
        ruleType: "zone_rate",
      });
    });

    test("GET /api/admin/logistics/cod-float uses COD float tracker", async () => {
      const response = await request(app)
        .get("/api/admin/logistics/cod-float")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-logistics:cod-float" });
    });

    test("POST /api/admin/logistics/cod-remittances records courier remittance", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/cod-remittances")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ courierName: "Paperfly", remittedAmount: 1000 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-logistics:record-cod-remittance",
        courierName: "Paperfly",
      });
    });

    test("POST /api/admin/logistics/failed-deliveries/:orderId/reattempt schedules re-attempt", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/failed-deliveries/order-1/reattempt")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ nextAttemptAt: "2026-05-18T10:00:00.000Z" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-logistics:schedule-reattempt", orderId: "order-1" });
    });

    test("POST /api/admin/logistics/failed-deliveries/:orderId/return-to-seller starts RTS", async () => {
      const response = await request(app)
        .post("/api/admin/logistics/failed-deliveries/order-1/return-to-seller")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ returnReason: "Customer refused" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-logistics:return-to-seller", orderId: "order-1" });
    });

    test("GET /api/admin/logistics/overview rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/logistics/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin customer API behavior", () => {
    test("GET /api/admin/customers searches customers", async () => {
      const response = await request(app)
        .get("/api/admin/customers?search=017")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-customers:list", search: "017" });
    });

    test("GET /api/admin/customers/:customerId returns customer detail", async () => {
      const response = await request(app)
        .get("/api/admin/customers/customer-1")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-customers:detail", customerId: "customer-1" });
    });

    test("PATCH /api/admin/customers/:customerId/status suspends or bans customers", async () => {
      const response = await request(app)
        .patch("/api/admin/customers/customer-1/status")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ status: "suspended", reason: "COD abuse" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-customers:status",
        customerId: "customer-1",
        status: "suspended",
      });
    });

    test("POST /api/admin/customers/merge merges duplicate customer accounts", async () => {
      const response = await request(app)
        .post("/api/admin/customers/merge")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ sourceCustomerId: "old-1", targetCustomerId: "new-1" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-customers:merge",
        sourceCustomerId: "old-1",
        targetCustomerId: "new-1",
      });
    });

    test("POST /api/admin/customers/:customerId/loyalty/adjust adjusts loyalty points", async () => {
      const response = await request(app)
        .post("/api/admin/customers/customer-1/loyalty/adjust")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ action: "award", points: 100, reason: "Service recovery" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-customers:loyalty-adjust",
        customerId: "customer-1",
        action: "award",
      });
    });

    test("PUT /api/admin/customers/loyalty-program updates tier thresholds", async () => {
      const response = await request(app)
        .put("/api/admin/customers/loyalty-program")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ tierThresholds: { silver: 1500 } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-customers:update-loyalty-program",
        silver: 1500,
      });
    });

    test("GET /api/admin/customers/referrals returns referral dashboard", async () => {
      const response = await request(app)
        .get("/api/admin/customers/referrals")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-customers:referrals" });
    });

    test("GET /api/admin/customers rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/customers")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin trust safety API behavior", () => {
    test("GET /api/admin/trust-safety/overview uses the trust safety command route", async () => {
      const response = await request(app)
        .get("/api/admin/trust-safety/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-trust-safety:overview" });
    });

    test("GET /api/admin/trust-safety/fraud returns the fraud dashboard", async () => {
      const response = await request(app)
        .get("/api/admin/trust-safety/fraud?status=open")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-trust-safety:fraud", status: "open" });
    });

    test("POST /api/admin/trust-safety/fraud-flags creates a manual fraud flag", async () => {
      const response = await request(app)
        .post("/api/admin/trust-safety/fraud-flags")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ subjectId: "customer-1", reason: "COD abuse" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-trust-safety:create-fraud-flag",
        subjectId: "customer-1",
      });
    });

    test("PATCH /api/admin/trust-safety/fraud-flags/:flagId updates a fraud flag", async () => {
      const response = await request(app)
        .patch("/api/admin/trust-safety/fraud-flags/flag-1")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ status: "resolved" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        route: "admin-trust-safety:update-fraud-flag",
        flagId: "flag-1",
        status: "resolved",
      });
    });

    test("GET and PATCH review moderation routes are wired", async () => {
      const listResponse = await request(app)
        .get("/api/admin/trust-safety/reviews?status=flagged")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const actionResponse = await request(app)
        .patch("/api/admin/trust-safety/reviews/review-1/moderate")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ action: "mark_verified" });

      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toEqual({ route: "admin-trust-safety:reviews", status: "flagged" });
      expect(actionResponse.status).toBe(200);
      expect(actionResponse.body).toEqual({
        route: "admin-trust-safety:moderate-review",
        reviewId: "review-1",
        action: "mark_verified",
      });
    });

    test("dispute center supports listing, creating, and resolving disputes", async () => {
      const listResponse = await request(app)
        .get("/api/admin/trust-safety/disputes?type=payment")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const createResponse = await request(app)
        .post("/api/admin/trust-safety/disputes")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ type: "vendor_customer", reason: "Conflict" });
      const resolveResponse = await request(app)
        .patch("/api/admin/trust-safety/disputes/dispute-1/resolve")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ decision: "close", resolutionNote: "Resolved" });

      expect(listResponse.body).toEqual({ route: "admin-trust-safety:disputes", type: "payment" });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toEqual({ route: "admin-trust-safety:create-dispute", type: "vendor_customer" });
      expect(resolveResponse.body).toEqual({
        route: "admin-trust-safety:resolve-dispute",
        disputeId: "dispute-1",
        decision: "close",
      });
    });

    test("seller penalty routes support log, issue, and appeal response", async () => {
      const listResponse = await request(app)
        .get("/api/admin/trust-safety/seller-penalties?status=active")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const createResponse = await request(app)
        .post("/api/admin/trust-safety/seller-penalties")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ vendorId: "vendor-1", type: "strike", reason: "Violation" });
      const appealResponse = await request(app)
        .patch("/api/admin/trust-safety/seller-penalties/penalty-1/appeal")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ status: "upheld" });

      expect(listResponse.body).toEqual({ route: "admin-trust-safety:seller-penalties", status: "active" });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toEqual({
        route: "admin-trust-safety:create-penalty",
        vendorId: "vendor-1",
        type: "strike",
      });
      expect(appealResponse.body).toEqual({
        route: "admin-trust-safety:update-appeal",
        penaltyId: "penalty-1",
        status: "upheld",
      });
    });

    test("content policy routes support listing and review actions", async () => {
      const listResponse = await request(app)
        .get("/api/admin/trust-safety/content-violations?source=products")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const actionResponse = await request(app)
        .patch("/api/admin/trust-safety/content-violations/product:abc:0/review")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ action: "request_changes" });

      expect(listResponse.body).toEqual({ route: "admin-trust-safety:content-violations", source: "products" });
      expect(actionResponse.body).toEqual({
        route: "admin-trust-safety:review-content",
        violationId: "product:abc:0",
        action: "request_changes",
      });
    });

    test("ban list routes support list, create, and update", async () => {
      const listResponse = await request(app)
        .get("/api/admin/trust-safety/bans?type=ip")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const createResponse = await request(app)
        .post("/api/admin/trust-safety/bans")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ type: "ip", value: "103.1.1.1", reason: "Fraud" });
      const updateResponse = await request(app)
        .patch("/api/admin/trust-safety/bans/ban-1")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ status: "inactive" });

      expect(listResponse.body).toEqual({ route: "admin-trust-safety:bans", type: "ip" });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toEqual({
        route: "admin-trust-safety:create-ban",
        type: "ip",
        value: "103.1.1.1",
      });
      expect(updateResponse.body).toEqual({
        route: "admin-trust-safety:update-ban",
        banId: "ban-1",
        status: "inactive",
      });
    });

    test("terms routes support version listing, creation, and publish", async () => {
      const listResponse = await request(app)
        .get("/api/admin/trust-safety/terms")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const createResponse = await request(app)
        .post("/api/admin/trust-safety/terms")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ type: "terms", version: "2026.05", title: "Terms", body: "Rules" });
      const publishResponse = await request(app)
        .patch("/api/admin/trust-safety/terms/version-1/publish")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ forceAccept: true });

      expect(listResponse.body).toEqual({ route: "admin-trust-safety:terms" });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toEqual({
        route: "admin-trust-safety:create-terms",
        type: "terms",
        version: "2026.05",
      });
      expect(publishResponse.body).toEqual({
        route: "admin-trust-safety:publish-terms",
        versionId: "version-1",
      });
    });

    test("GET /api/admin/trust-safety/audit-log uses audit route", async () => {
      const response = await request(app)
        .get("/api/admin/trust-safety/audit-log")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-trust-safety:audit-log" });
    });

    test("GET /api/admin/trust-safety/overview rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/trust-safety/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin platform control API behavior", () => {
    test("GET /api/admin/platform/overview uses the platform control route", async () => {
      const response = await request(app)
        .get("/api/admin/platform/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "admin-platform:overview" });
    });

    test("POST /api/admin/platform/broadcasts sends a segmented broadcast", async () => {
      const response = await request(app)
        .post("/api/admin/platform/broadcasts")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ title: "Sale", body: "Starts now", target: "all_vendors", channels: ["in_app", "email"] });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        route: "admin-platform:send-broadcast",
        target: "all_vendors",
        channels: ["in_app", "email"],
      });
    });

    test("message templates, campaigns, and announcements are wired", async () => {
      const template = await request(app)
        .put("/api/admin/platform/templates/order_confirm")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ subject: "Order {order_id}", body: "Confirmed" });
      const campaign = await request(app)
        .post("/api/admin/platform/email-campaigns")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ subject: "Newsletter", body: "Hello" });
      const announcement = await request(app)
        .post("/api/admin/platform/announcements")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ title: "Maintenance", message: "Tonight" });

      expect(template.body).toEqual({ route: "admin-platform:save-template", key: "order_confirm", subject: "Order {order_id}" });
      expect(campaign.status).toBe(201);
      expect(campaign.body).toEqual({ route: "admin-platform:create-email-campaign", subject: "Newsletter" });
      expect(announcement.status).toBe(201);
      expect(announcement.body).toEqual({
        route: "admin-platform:save-announcement",
        announcementId: null,
        title: "Maintenance",
      });
    });

    test("configuration routes save settings, categories, attributes, and commission rules", async () => {
      const config = await request(app)
        .put("/api/admin/platform/config")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ featureFlags: { guestCheckout: false } });
      const category = await request(app)
        .post("/api/admin/platform/categories")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ name: "Electronics" });
      const attributes = await request(app)
        .put("/api/admin/platform/categories/cat-1/attributes")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ attributes: [{ name: "RAM" }] });
      const commission = await request(app)
        .put("/api/admin/platform/commission-rules")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ rules: [{ name: "Electronics", commissionRate: 5 }] });

      expect(config.body).toEqual({ route: "admin-platform:update-config", guestCheckout: false });
      expect(category.status).toBe(201);
      expect(category.body).toEqual({ route: "admin-platform:save-category", categoryId: null, name: "Electronics" });
      expect(attributes.body).toEqual({ route: "admin-platform:save-attributes", categoryId: "cat-1", count: 1 });
      expect(commission.body).toEqual({ route: "admin-platform:commission-rules", count: 1 });
    });

    test("staff RBAC routes invite, update role, start 2FA, verify 2FA, and update session policy", async () => {
      const invite = await request(app)
        .post("/api/admin/platform/staff")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ email: "finance@example.com", role: "finance_manager" });
      const role = await request(app)
        .patch("/api/admin/platform/staff/staff-1/role")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ role: "logistics_manager" });
      const setup = await request(app)
        .post("/api/admin/platform/staff/staff-1/2fa/setup")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");
      const verify = await request(app)
        .post("/api/admin/platform/staff/staff-1/2fa/verify")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ token: "123456" });
      const session = await request(app)
        .put("/api/admin/platform/roles/finance_manager/session-policy")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin")
        .send({ sessionTimeoutMinutes: 15 });

      expect(invite.status).toBe(201);
      expect(invite.body).toEqual({ route: "admin-platform:invite-staff", email: "finance@example.com", role: "finance_manager" });
      expect(role.body).toEqual({ route: "admin-platform:update-staff-role", staffId: "staff-1", role: "logistics_manager" });
      expect(setup.body).toEqual({ route: "admin-platform:2fa-setup", staffId: "staff-1" });
      expect(verify.body).toEqual({ route: "admin-platform:2fa-verify", staffId: "staff-1" });
      expect(session.body).toEqual({
        route: "admin-platform:session-policy",
        role: "finance_manager",
        sessionTimeoutMinutes: 15,
      });
    });

    test("GET /api/admin/platform/overview rejects vendor access", async () => {
      const response = await request(app)
        .get("/api/admin/platform/overview")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "vendor");

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: "Admin access required" });
    });
  });

  describe("admin payout API behavior", () => {
    test("GET /api/admin/payouts/weekly-list uses the weekly list route", async () => {
      const response = await request(app)
        .get("/api/admin/payouts/weekly-list")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "payouts:weekly-list" });
    });

    test("GET /api/admin/payouts/vendor/vendor-1/eligible uses the vendor eligible route", async () => {
      const response = await request(app)
        .get("/api/admin/payouts/vendor/vendor-1/eligible")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "payouts:eligible", vendorId: "vendor-1" });
    });

    test("GET /api/admin/payouts/requests uses the payout requests route", async () => {
      const response = await request(app)
        .get("/api/admin/payouts/requests")
        .set("Authorization", "Bearer test")
        .set("x-test-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ route: "payouts:requests" });
    });
  });

  describe("fallback behavior", () => {
    test("unknown routes return 404", async () => {
      const response = await request(app).get("/api/does-not-exist");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Not found" });
    });
  });
});
