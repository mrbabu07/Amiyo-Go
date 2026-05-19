import axios from "axios";
import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

const idempotentMutations = [
  { method: "post", pattern: /^\/orders$/ },
  { method: "post", pattern: /^\/orders\/guest$/ },
  { method: "patch", pattern: /^\/orders\/admin\/[^/]+\/(force-refund|approve-refund)$/ },
  { method: "post", pattern: /^\/payments\/process$/ },
  { method: "patch", pattern: /^\/payments\/manual-verifications\/[^/]+\/(approve|reject)$/ },
  { method: "post", pattern: /^\/payments\/[^/]+\/refund$/ },
  { method: "post", pattern: /^\/returns$/ },
  { method: "post", pattern: /^\/returns\/[^/]+\/refund$/ },
  { method: "patch", pattern: /^\/admin\/finance\/refunds\/[^/]+\/review$/ },
  { method: "post", pattern: /^\/vendors\/finance\/request-payout$/ },
  { method: "post", pattern: /^\/admin\/payouts\/(bulk|vendor\/[^/]+)$/ },
  { method: "patch", pattern: /^\/admin\/payouts\/(requests\/[^/]+\/(approve|reject|mark-paid)|[^/]+\/(paid|cancel))$/ },
];

const requestPath = (url = "") => {
  try {
    return new URL(url, API_URL).pathname.replace(/^\/api/, "") || "/";
  } catch {
    return String(url).split("?")[0] || "/";
  }
};

const shouldUseIdempotency = (config) => {
  const method = String(config.method || "get").toLowerCase();
  const path = requestPath(config.url);
  return idempotentMutations.some((item) => item.method === method && item.pattern.test(path));
};

const createIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `amiyo-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  config.headers = config.headers || {};
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (shouldUseIdempotency(config) && !config.headers["Idempotency-Key"]) {
    config.headers["Idempotency-Key"] = createIdempotencyKey();
  }

  return config;
});

// Products
export const getProducts = (filters = {}) => {
  return api.get("/products", { params: filters });
};

export const getProductById = (id) => api.get(`/products/${id}`);
export const searchProducts = (query) =>
  api.get(`/products/search?q=${encodeURIComponent(query)}`);
export const getFilterOptions = () => api.get("/products/filter-options");
export const getSearchAutocomplete = (params = {}) =>
  api.get("/search/autocomplete", { params });
export const getSearchResults = (params = {}) =>
  api.get("/search/results", { params });
export const getSearchNavigation = () => api.get("/search/navigation");
export const saveSearchHistory = (data) => api.post("/search/history", data);
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const reportProduct = (id, data) => api.post(`/products/${id}/report`, data);
export const getLowStockProducts = (threshold = 10) =>
  api.get(`/products/admin/low-stock?threshold=${threshold}`);
export const getOutOfStockProducts = () =>
  api.get("/products/admin/out-of-stock");
export const updateStockBulk = (updates) =>
  api.patch("/products/bulk-stock-update", { updates });

// Homepage discovery
export const getHomepageDiscovery = (params = {}) =>
  api.get("/discovery/homepage", { params });
export const getPublicPlatformConfig = () => api.get("/platform/config");
export const getDailyCheckInStatus = () => api.get("/discovery/check-in/status");
export const claimDailyCheckInReward = () => api.post("/discovery/check-in");

// Loyalty and rewards
export const getMyLoyalty = () => api.get("/loyalty/my-points");
export const getLoyaltyHistory = () => api.get("/loyalty/history");
export const getLoyaltyTierBenefits = () => api.get("/loyalty/tier-benefits");
export const getLoyaltyMultiplierEvents = () => api.get("/loyalty/multiplier-events");
export const redeemLoyaltyPoints = (data) => api.post("/loyalty/redeem", data);
export const applyReferralCode = (referralCode) =>
  api.post("/loyalty/apply-referral", { referralCode });

// Support and help
export const getSupportFaqs = (params = {}) => api.get("/support/faqs", { params });
export const askSupportBot = (message) => api.post("/support/bot", { message });
export const getSupportContactOptions = () => api.get("/support/contact-options");

// Categories
export const getCategories = () => api.get("/categories");
export const createCategory = (data) => api.post("/categories", data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Orders
export const getUserOrders = () => api.get("/orders/my-orders");
export const getUserOrderDetail = (id) => api.get(`/orders/${id}/detail`);
export const getAllOrders = () => api.get("/orders");
export const getAdminOrderManagement = (params = {}) =>
  api.get("/orders/admin", { params });
export const getAdminOrderDetail = (id) =>
  api.get(`/orders/admin/${id}/detail`);
export const exportAdminOrdersCsv = (params = {}) =>
  api.get("/orders/admin/export/csv", { params, responseType: "blob" });
export const getAdminCodReconciliation = (params = {}) =>
  api.get("/orders/admin/cod-reconciliation", { params });
export const getAdminSlaBreaches = (params = {}) =>
  api.get("/orders/admin/sla-breaches", { params });
export const getAdminFraudQueue = (params = {}) =>
  api.get("/orders/admin/fraud-queue", { params });
export const adminForceCancelOrder = (id, data = {}) =>
  api.patch(`/orders/admin/${id}/force-cancel`, data);
export const adminForceRefundOrder = (id, data = {}) =>
  api.patch(`/orders/admin/${id}/force-refund`, data);
export const adminReassignOrderCourier = (id, data) =>
  api.patch(`/orders/admin/${id}/reassign-courier`, data);
export const adminChangeOrderDeliveryAddress = (id, data) =>
  api.patch(`/orders/admin/${id}/delivery-address`, data);
export const adminExtendOrderReturnWindow = (id, data) =>
  api.patch(`/orders/admin/${id}/return-window`, data);
export const adminOverrideOrderStatus = (id, data) =>
  api.patch(`/orders/admin/${id}/override-status`, data);
export const createOrder = (data) => api.post("/orders", data);
export const createGuestOrder = (data) => api.post("/orders/guest", data);
export const updateOrderStatus = (id, status, trackingNumber) =>
  api.patch(`/orders/${id}/status`, { status, trackingNumber });
export const cancelOrder = (id, data = {}) => api.post(`/orders/${id}/cancel`, data);
export const getOrderTimeline = (id) => api.get(`/orders/${id}/timeline`);
export const downloadOrderInvoice = (id) =>
  api.get(`/orders/${id}/invoice`, { responseType: "blob" });

// User
export const getCurrentUser = () => api.get("/user/me");
export const getAccountProfile = () => api.get("/user/account");
export const updateAccountProfile = (data) =>
  api.patch("/user/account/profile", data);
export const updateAccountPreferences = (data) =>
  api.patch("/user/account/preferences", data);
export const addSavedPaymentMethod = (data) =>
  api.post("/user/account/payment-methods", data);
export const deleteSavedPaymentMethod = (methodId) =>
  api.delete(`/user/account/payment-methods/${methodId}`);
export const setupAccountTwoFactor = () => api.post("/user/account/2fa/setup");
export const verifyAccountTwoFactor = (data) =>
  api.post("/user/account/2fa/verify", data);
export const disableAccountTwoFactor = (data) =>
  api.post("/user/account/2fa/disable", data);
export const getAccountLoginActivity = () =>
  api.get("/user/account/login-activity");
export const exportAccountData = () =>
  api.get("/user/account/export", { responseType: "blob" });
export const requestAccountDeletion = (data = {}) =>
  api.post("/user/account/delete", data);
export const cancelAccountDeletion = () =>
  api.post("/user/account/delete/cancel");

// Vendor profile
export const getVendorPublicInfo = (vendorId) =>
  api.get(`/vendors/${vendorId}/public`);
export const getVendorFollowStatus = (vendorId) =>
  api.get(`/vendors/${vendorId}/follow-status`);
export const followVendor = (vendorId) => api.post(`/vendors/${vendorId}/follow`);
export const unfollowVendor = (vendorId) =>
  api.delete(`/vendors/${vendorId}/unfollow`);
export const getMyVendorProfile = () => api.get("/vendors/me");
export const updateMyVendorProfile = (data) => api.patch("/vendors/me", data);
export const getMyVendorCategories = () => api.get("/vendors/my-categories");
export const getMyVendorKyc = () => api.get("/vendors/kyc/me");
export const submitVendorKyc = (formData) =>
  api.post("/vendors/kyc", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const uploadImages = (files, folder = "general") => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  formData.append("folder", folder);

  return api.post("/uploads/images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const createVendorBulkUploadJob = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/vendor/products/bulk-jobs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getVendorBulkUploadJob = (jobId) =>
  api.get(`/vendor/products/bulk-jobs/${jobId}`);
export const downloadVendorBulkUploadReport = (jobId) =>
  api.get(`/vendor/products/bulk-jobs/${jobId}/report`, { responseType: "blob" });

// Wishlist
export const getWishlist = () => api.get("/wishlist");
export const addToWishlist = (productId) =>
  api.post("/wishlist", { productId });
export const removeFromWishlist = (productId) =>
  api.delete(`/wishlist/${productId}`);
export const clearWishlist = () => api.delete("/wishlist");
export const createWishlistCollection = (name) =>
  api.post("/wishlist/collections", { name });
export const updateWishlistCollection = (collectionId, data) =>
  api.patch(`/wishlist/collections/${collectionId}`, data);
export const deleteWishlistCollection = (collectionId) =>
  api.delete(`/wishlist/collections/${collectionId}`);
export const addWishlistCollectionItem = (collectionId, productId) =>
  api.post(`/wishlist/collections/${collectionId}/items`, { productId });
export const removeWishlistCollectionItem = (collectionId, productId) =>
  api.delete(`/wishlist/collections/${collectionId}/items/${productId}`);
export const shareWishlistCollection = (collectionId, isPublic = true) =>
  api.post(`/wishlist/collections/${collectionId}/share`, { isPublic });
export const updateWishlistAlert = (productId, data) =>
  api.patch(`/wishlist/alerts/${productId}`, data);

// Reviews
export const getProductReviews = (productId) =>
  api.get(`/reviews/product/${productId}`);
export const createReview = (data) => api.post("/reviews", data);
export const getUserReviews = () => api.get("/reviews/my-reviews");
export const updateReview = (id, data) => api.put(`/reviews/${id}`, data);
export const deleteReview = (id) => api.delete(`/reviews/${id}`);
export const markReviewHelpful = (id) => api.post(`/reviews/${id}/helpful`);
export const getVendorReviews = () => api.get("/reviews/vendor/my-reviews");
export const addVendorReviewReply = (id, reply) =>
  api.post(`/reviews/${id}/vendor-reply`, { reply });

// Newsletter
export const subscribeNewsletter = (email, source = "web") =>
  api.post("/newsletter/subscribe", { email, source });
export const getNewsletterSubscribers = (params = {}) =>
  api.get("/newsletter/subscribers", { params });
export const getNewsletterBroadcasts = (params = {}) =>
  api.get("/newsletter/broadcasts", { params });
export const createNewsletterBroadcast = (data) =>
  api.post("/newsletter/broadcasts", data);
export const sendNewsletterBroadcast = (id) =>
  api.post(`/newsletter/broadcasts/${id}/send`);

// Coupons
export const getActiveCoupons = () => api.get("/coupons/active");
export const validateCoupon = (code, orderTotal, items = []) =>
  api.post("/coupons/validate", { code, orderTotal, items });
export const getAllCoupons = () => api.get("/coupons");
export const createCoupon = (data) => api.post("/coupons", data);
export const updateCoupon = (id, data) => api.put(`/coupons/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/coupons/${id}`);

// Addresses
export const getUserAddresses = () => api.get("/addresses");
export const getDefaultAddress = () => api.get("/addresses/default");
export const createAddress = (data) => api.post("/addresses", data);
export const updateAddress = (id, data) => api.put(`/addresses/${id}`, data);
export const deleteAddress = (id) => api.delete(`/addresses/${id}`);
export const setDefaultAddress = (id) => api.patch(`/addresses/${id}/default`);

// Returns
export const getUserReturns = () => api.get("/returns/my-returns");
export const createReturnRequest = (data) => api.post("/returns", data);
export const getAllReturns = () => api.get("/returns/admin/all");
export const updateReturnStatus = (id, status, adminNotes) =>
  api.patch(`/returns/${id}/status`, { status, adminNotes });
export const processRefund = (id, refundAmount, refundMethod) =>
  api.post(`/returns/${id}/refund`, { refundAmount, refundMethod });

// Vendor Returns
export const getVendorReturns = (params) => 
  api.get("/returns/vendor/my-returns", { params });
export const getVendorReturnById = (id) =>
  api.get(`/returns/vendor/${id}`);
export const getVendorReturnStats = () => 
  api.get("/returns/vendor/stats");
export const getPendingVendorResponse = () =>
  api.get("/returns/vendor/pending-response");
export const vendorRespondToReturn = (id, data) =>
  api.post(`/returns/vendor/${id}/respond`, data);

// Payments
export const processPayment = (data) => api.post("/payments/process", data);
export const getUserPayments = () => api.get("/payments/my-payments");
export const getOrderPayment = (orderId) =>
  api.get(`/payments/order/${orderId}`);
export const getAllPayments = () => api.get("/payments");
export const getPaymentStats = () => api.get("/payments/stats");
export const getManualPaymentQueue = (params = {}) =>
  api.get("/payments/manual-verifications", { params });
export const approveManualPayment = (orderId, data = {}) =>
  api.patch(`/payments/manual-verifications/${orderId}/approve`, data);
export const rejectManualPayment = (orderId, data = {}) =>
  api.patch(`/payments/manual-verifications/${orderId}/reject`, data);

// Offers
export const getActivePopupOffer = () => api.get("/offers/active-popup");
export const getAllOffers = () => api.get("/offers");
export const getOfferById = (id) => api.get(`/offers/${id}`);
export const createOffer = (formData) =>
  api.post("/offers", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateOffer = (id, formData) =>
  api.put(`/offers/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteOffer = (id) => api.delete(`/offers/${id}`);
export const toggleOfferStatus = (id) => api.patch(`/offers/${id}/toggle`);

// Support & User Management
export const createSupportTicket = (data) => api.post("/support/tickets", data);
export const getUserTickets = () => api.get("/support/tickets/my-tickets");
export const getAllTickets = (params) =>
  api.get("/support/tickets", { params });
export const updateTicketStatus = (id, status) =>
  api.patch(`/support/tickets/${id}/status`, { status });
export const assignTicket = (id, assignedTo) =>
  api.patch(`/support/tickets/${id}/assign`, { assignedTo });
export const addTicketMessage = (id, message) =>
  api.post(`/support/tickets/${id}/messages`, { message });
export const getTicketStats = () => api.get("/support/tickets/stats");

// Vendor customer messages
export const getVendorChatConversations = () => api.get("/vendor-chat/vendor");
export const getVendorConversationMessages = (conversationId) =>
  api.get(`/vendor-chat/conversation/${conversationId}/messages`);
export const sendVendorChatMessage = (conversationId, data) =>
  api.post(`/vendor-chat/conversation/${conversationId}/message`, data);
export const markVendorConversationRead = (conversationId) =>
  api.patch(`/vendor-chat/conversation/${conversationId}/mark-read`);
export const getVendorSupportTools = () => api.get("/vendor-chat/vendor/support-tools");
export const createVendorQuickReply = (data) =>
  api.post("/vendor-chat/vendor/quick-replies", data);
export const createVendorMessageTemplate = (data) =>
  api.post("/vendor-chat/vendor/message-templates", data);

// User Management
export const getAllUsers = (params) => api.get("/admin/users", { params });
export const getUserById = (id) => api.get(`/admin/users/${id}`);
export const updateUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });
export const updateUserStatus = (id, status) =>
  api.patch(`/admin/users/${id}/status`, { status });
export const getStaffUsers = () => api.get("/admin/users/staff");
export const getUserStats = () => api.get("/admin/users/stats");

// Customer Insights
export const getAllCustomerInsights = (params) =>
  api.get("/admin/insights", { params });
export const getCustomerInsight = (userId) =>
  api.get(`/admin/insights/${userId}`);
export const generateCustomerInsight = (userId) =>
  api.post(`/admin/insights/${userId}/generate`);
export const getCustomerSegmentStats = () =>
  api.get("/admin/insights/segments");

// ── Admin: Vendor detail + product moderation ──────────────────
export const getAdminVendorById = (vendorId) =>
  api.get(`/vendors/${vendorId}`);

export const getAdminVendorProducts = (vendorId, params = {}) =>
  api.get(`/admin/products/by-vendor/${vendorId}`, { params });

export const getAdminProducts = (params = {}) =>
  api.get("/admin/products", { params });

export const getAdminProductQueue = (params = {}) =>
  api.get("/admin/products/queue", { params });

export const approveAdminProduct = (productId) =>
  api.patch(`/admin/products/${productId}/approve`);

export const rejectAdminProduct = (productId, reason) =>
  api.patch(`/admin/products/${productId}/reject`, { reason });

export const disableAdminProduct = (productId, data = {}) =>
  api.patch(`/admin/products/${productId}/disable`, data);

export const adminEditProduct = (productId, data) =>
  api.patch(`/admin/products/${productId}/admin-edit`, data);

export const bulkModerateAdminProducts = (data) =>
  api.post("/admin/products/bulk", data);

export const getProductModerationConfig = () =>
  api.get("/admin/products/moderation/config");

export const scanProductModeration = (data = {}) =>
  api.post("/admin/products/moderation/scan", data);

export const getProductDuplicateGroups = () =>
  api.get("/admin/products/duplicates");

export const getProductIpReports = (params = {}) =>
  api.get("/admin/products/ip-reports", { params });

export const submitProductIpReport = (data) =>
  api.post("/admin/products/ip-reports", data);

export const reviewProductIpReport = (reportId, data) =>
  api.patch(`/admin/products/ip-reports/${reportId}/review`, data);

export const getBrandRegistry = () =>
  api.get("/admin/products/brands");

export const saveBrandRegistryItem = (data) =>
  api.post("/admin/products/brands", data);

export const reviewBrandRegistryItem = (brandId, data) =>
  api.patch(`/admin/products/brands/${brandId}/review`, data);

// ── Admin: Vendor finance ──────────────────────────────────────
export const getAdminVendorFinanceSummary = (vendorId, params = {}) =>
  api.get(`/admin/vendors/${vendorId}/finance/summary`, { params });

export const getAdminVendorFinanceTransactions = (vendorId, params = {}) =>
  api.get(`/admin/vendors/${vendorId}/finance/transactions`, { params });

export const getAdminVendorManagementProfile = (vendorId) =>
  api.get(`/admin/vendors/${vendorId}/management`);

export const updateAdminVendorStatus = (vendorId, data) =>
  api.patch(`/admin/vendors/${vendorId}/status`, data);

export const updateAdminVendorTier = (vendorId, data) =>
  api.patch(`/admin/vendors/${vendorId}/tier`, data);

export const autoCalculateAdminVendorTier = (vendorId) =>
  api.post(`/admin/vendors/${vendorId}/tier/auto-calculate`);

export const updateAdminVendorCommission = (vendorId, data) =>
  api.patch(`/admin/vendors/${vendorId}/commission`, data);

export const sendAdminVendorNotice = (vendorId, data) =>
  api.post(`/admin/vendors/${vendorId}/notices`, data);

export const issueAdminVendorViolation = (vendorId, data) =>
  api.post(`/admin/vendors/${vendorId}/violations`, data);

export const bulkAdminVendorAction = (data) =>
  api.post("/admin/vendors/bulk", data);

export const getAdminCommissionSummary = (params = {}) =>
  api.get("/admin/finance/commission-summary", { params });
export const getFinanceOperationsOverview = () =>
  api.get("/admin/finance/operations");
export const getFinancePayoutSchedule = () =>
  api.get("/admin/finance/payout-schedule");
export const updateFinancePayoutSchedule = (data) =>
  api.put("/admin/finance/payout-schedule", data);
export const getFinancePayoutQueue = (params = {}) =>
  api.get("/admin/finance/payout-queue", { params });
export const getFinanceCommissionRules = () =>
  api.get("/admin/finance/commission-rules");
export const saveFinanceCommissionRule = (data) =>
  data.ruleId
    ? api.patch(`/admin/finance/commission-rules/${data.ruleId}`, data)
    : api.post("/admin/finance/commission-rules", data);
export const getFinanceLedger = (params = {}) =>
  api.get("/admin/finance/ledger", { params });
export const getFinanceRefundWorkflow = (params = {}) =>
  api.get("/admin/finance/refunds", { params });
export const reviewFinanceRefund = (returnId, data) =>
  api.patch(`/admin/finance/refunds/${returnId}/review`, data);
export const getFinanceRevenueReports = (params = {}) =>
  api.get("/admin/finance/revenue-reports", { params });
export const downloadFinanceRevenueReport = (params = {}) =>
  api.get("/admin/finance/revenue-reports/export", { params, responseType: "blob" });
export const getFinanceEscrowRules = () =>
  api.get("/admin/finance/escrow-rules");
export const updateFinanceEscrowRules = (data) =>
  api.put("/admin/finance/escrow-rules", data);
export const getFinanceAuditLog = () =>
  api.get("/admin/finance/audit-log");

export const getAdminAlertSummary = () => api.get("/admin/alerts/summary");
export const getAdminDashboardOverview = (params = {}) =>
  api.get("/admin/dashboard/overview", { params });
export const getAdminOperationsOverview = (params = {}) =>
  api.get("/admin/dashboard/operations", { params });
export const getAdminCaseAssignment = (caseKey) =>
  api.get(`/admin/dashboard/cases/${encodeURIComponent(caseKey)}`);
export const updateAdminCaseAssignment = (caseKey, data) =>
  api.patch(`/admin/dashboard/cases/${encodeURIComponent(caseKey)}`, data);
export const bulkUpdateAdminCases = (data) =>
  api.patch("/admin/dashboard/cases/bulk", data);
export const getAdminSavedViews = (params = {}) =>
  api.get("/admin/dashboard/views", { params });
export const saveAdminSavedView = (data) =>
  api.post("/admin/dashboard/views", data);
export const deleteAdminSavedView = (key) =>
  api.delete(`/admin/dashboard/views/${encodeURIComponent(key)}`);
export const getAdminAuditLogs = (params = {}) =>
  api.get("/admin/audit-logs", { params });
export const searchAdminResources = (params = {}) =>
  api.get("/admin/search", { params });
export const getAdminSearchResourceDetail = (type, id) =>
  api.get(`/admin/search/${type}/${id}`);
export const getAdminAnalyticsSummary = (params = {}) =>
  api.get("/admin/analytics/summary", { params });
export const rebuildAdminAnalyticsSummary = (data = {}) =>
  api.post("/admin/analytics/rebuild", data);
export const getAdminAnalyticsReports = (params = {}) =>
  api.get("/admin/analytics/reports", { params });
export const downloadAdminAnalyticsReport = (params = {}) =>
  api.get("/admin/analytics/reports/export", { params, responseType: "blob" });

// Admin Promotions
export const getPromotionOverview = () =>
  api.get("/admin/promotions/overview");
export const getPromotionCampaigns = () =>
  api.get("/admin/promotions/campaigns");
export const createPromotionCampaign = (data) =>
  api.post("/admin/promotions/campaigns", data);
export const updatePromotionCampaign = (campaignId, data) =>
  api.patch(`/admin/promotions/campaigns/${campaignId}`, data);
export const getCampaignNominationQueue = (params = {}) =>
  api.get("/admin/promotions/nominations", { params });
export const reviewCampaignNomination = (nominationId, data) =>
  api.patch(`/admin/promotions/nominations/${nominationId}/review`, data);
export const getPromotionFlashDeals = () =>
  api.get("/admin/promotions/flash-deals");
export const createPromotionFlashDeal = (data) =>
  api.post("/admin/promotions/flash-deals", data);
export const getPlatformVouchers = () =>
  api.get("/admin/promotions/vouchers");
export const createPlatformVoucher = (data) =>
  api.post("/admin/promotions/vouchers", data);
export const getHomepageSlots = () =>
  api.get("/admin/promotions/homepage-slots");
export const saveHomepageSlot = (data) =>
  data.slotId
    ? api.patch(`/admin/promotions/homepage-slots/${data.slotId}`, data)
    : api.post("/admin/promotions/homepage-slots", data);
export const uploadHomepageSlotImage = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/admin/promotions/homepage-slots/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const reorderHomepageSlots = (slots) =>
  api.patch("/admin/promotions/homepage-slots/reorder", { slots });
export const selectDealOfDay = (data) =>
  api.post("/admin/promotions/deal-of-day", data);
export const getClearanceRules = () =>
  api.get("/admin/promotions/clearance");
export const applyClearanceSale = (data) =>
  api.post("/admin/promotions/clearance", data);
export const getLoyaltyRules = () =>
  api.get("/admin/promotions/loyalty-rules");
export const updateLoyaltyRules = (data) =>
  api.put("/admin/promotions/loyalty-rules", data);
export const getPromotionRules = () =>
  api.get("/admin/promotions/rules");
export const updatePromotionRules = (data) =>
  api.put("/admin/promotions/rules", data);
export const getPromotionAuditLog = () =>
  api.get("/admin/promotions/audit-log");

// Admin Logistics
export const getLogisticsOverview = () =>
  api.get("/admin/logistics/overview");
export const getDeliveryZones = () =>
  api.get("/admin/logistics/delivery-zones");
export const saveDeliveryZone = (data) =>
  data.zoneId
    ? api.patch(`/admin/logistics/delivery-zones/${data.zoneId}`, data)
    : api.post("/admin/logistics/delivery-zones", data);
export const getCourierPartners = (params = {}) =>
  api.get("/admin/logistics/courier-partners", { params });
export const getCourierProviderStatus = () =>
  api.get("/admin/logistics/courier-provider-status");
export const saveCourierPartner = (data) =>
  data.courierId
    ? api.patch(`/admin/logistics/courier-partners/${data.courierId}`, data)
    : api.post("/admin/logistics/courier-partners", data);
export const getDispatchManifest = (params = {}) =>
  api.get("/admin/logistics/dispatch-manifest", { params });
export const downloadDispatchManifestCsv = (params = {}) =>
  api.get("/admin/logistics/dispatch-manifest/export", { params, responseType: "blob" });
export const getLogisticsShipments = (params = {}) =>
  api.get("/admin/logistics/shipments", { params });
export const assignLogisticsShipmentCourier = (shipmentId, data) =>
  api.post(`/admin/logistics/shipments/${shipmentId}/assign-courier`, data);
export const getPickupStaff = (params = {}) =>
  api.get("/admin/logistics/pickup-staff", { params });
export const savePickupStaff = (data) =>
  data.staffId
    ? api.patch(`/admin/logistics/pickup-staff/${data.staffId}`, data)
    : api.post("/admin/logistics/pickup-staff", data);
export const getDeliveryFeeRules = () =>
  api.get("/admin/logistics/fee-rules");
export const saveDeliveryFeeRule = (data) =>
  data.ruleId
    ? api.patch(`/admin/logistics/fee-rules/${data.ruleId}`, data)
    : api.post("/admin/logistics/fee-rules", data);
export const getCodFloatTracker = () =>
  api.get("/admin/logistics/cod-float");
export const recordCodRemittance = (data) =>
  api.post("/admin/logistics/cod-remittances", data);
export const getFailedDeliveries = (params = {}) =>
  api.get("/admin/logistics/failed-deliveries", { params });
export const scheduleFailedDeliveryReattempt = (orderId, data) =>
  api.post(`/admin/logistics/failed-deliveries/${orderId}/reattempt`, data);
export const returnFailedDeliveryToSeller = (orderId, data) =>
  api.post(`/admin/logistics/failed-deliveries/${orderId}/return-to-seller`, data);
export const getLogisticsAuditLog = () =>
  api.get("/admin/logistics/audit-log");

// Admin Customers
export const getAdminCustomers = (params = {}) =>
  api.get("/admin/customers", { params });
export const getAdminCustomerDetail = (customerId) =>
  api.get(`/admin/customers/${customerId}`);
export const updateAdminCustomerStatus = (customerId, data) =>
  api.patch(`/admin/customers/${customerId}/status`, data);
export const mergeAdminCustomers = (data) =>
  api.post("/admin/customers/merge", data);
export const getAdminCustomerLoyalty = (customerId) =>
  api.get(`/admin/customers/${customerId}/loyalty`);
export const adjustAdminCustomerLoyalty = (customerId, data) =>
  api.post(`/admin/customers/${customerId}/loyalty/adjust`, data);
export const getCustomerLoyaltyProgram = () =>
  api.get("/admin/customers/loyalty-program");
export const updateCustomerLoyaltyProgram = (data) =>
  api.put("/admin/customers/loyalty-program", data);
export const getReferralDashboard = () =>
  api.get("/admin/customers/referrals");
export const getCustomerAuditLog = () =>
  api.get("/admin/customers/audit-log");

// Admin Trust, Safety & Compliance
export const getTrustSafetyOverview = () =>
  api.get("/admin/trust-safety/overview");
export const getFraudDashboard = (params = {}) =>
  api.get("/admin/trust-safety/fraud", { params });
export const createFraudFlag = (data) =>
  api.post("/admin/trust-safety/fraud-flags", data);
export const updateFraudFlag = (flagId, data) =>
  api.patch(`/admin/trust-safety/fraud-flags/${flagId}`, data);
export const getReviewModerationQueue = (params = {}) =>
  api.get("/admin/trust-safety/reviews", { params });
export const moderateTrustSafetyReview = (reviewId, data) =>
  api.patch(`/admin/trust-safety/reviews/${reviewId}/moderate`, data);
export const getDisputeCenter = (params = {}) =>
  api.get("/admin/trust-safety/disputes", { params });
export const createTrustSafetyDispute = (data) =>
  api.post("/admin/trust-safety/disputes", data);
export const resolveTrustSafetyDispute = (disputeId, data) =>
  api.patch(`/admin/trust-safety/disputes/${disputeId}/resolve`, data);
export const getSellerPenaltyLog = (params = {}) =>
  api.get("/admin/trust-safety/seller-penalties", { params });
export const createSellerPenalty = (data) =>
  api.post("/admin/trust-safety/seller-penalties", data);
export const updateSellerPenaltyAppeal = (penaltyId, data) =>
  api.patch(`/admin/trust-safety/seller-penalties/${penaltyId}/appeal`, data);
export const getContentPolicyViolations = (params = {}) =>
  api.get("/admin/trust-safety/content-violations", { params });
export const reviewContentPolicyViolation = (violationId, data) =>
  api.patch(`/admin/trust-safety/content-violations/${violationId}/review`, data);
export const getTrustSafetyBans = (params = {}) =>
  api.get("/admin/trust-safety/bans", { params });
export const createTrustSafetyBan = (data) =>
  api.post("/admin/trust-safety/bans", data);
export const updateTrustSafetyBan = (banId, data) =>
  api.patch(`/admin/trust-safety/bans/${banId}`, data);
export const getTermsVersions = () =>
  api.get("/admin/trust-safety/terms");
export const createTermsVersion = (data) =>
  api.post("/admin/trust-safety/terms", data);
export const publishTermsVersion = (versionId, data = {}) =>
  api.patch(`/admin/trust-safety/terms/${versionId}/publish`, data);
export const getTrustSafetyAuditLog = () =>
  api.get("/admin/trust-safety/audit-log");

// Admin Platform Control
export const getPlatformControlOverview = () =>
  api.get("/admin/platform/overview");
export const getPlatformNotificationBroadcasts = (params = {}) =>
  api.get("/admin/platform/broadcasts", { params });
export const sendPlatformNotificationBroadcast = (data) =>
  api.post("/admin/platform/broadcasts", data);
export const getPlatformMessageTemplates = () =>
  api.get("/admin/platform/templates");
export const savePlatformMessageTemplate = (templateKey, data) =>
  api.put(`/admin/platform/templates/${templateKey}`, data);
export const getPlatformEmailCampaigns = (params = {}) =>
  api.get("/admin/platform/email-campaigns", { params });
export const createPlatformEmailCampaign = (data) =>
  api.post("/admin/platform/email-campaigns", data);
export const getPlatformAnnouncements = (params = {}) =>
  api.get("/admin/platform/announcements", { params });
export const savePlatformAnnouncement = (data) =>
  data.announcementId
    ? api.patch(`/admin/platform/announcements/${data.announcementId}`, data)
    : api.post("/admin/platform/announcements", data);
export const getPlatformConfig = () =>
  api.get("/admin/platform/config");
export const updatePlatformConfig = (data) =>
  api.put("/admin/platform/config", data);
export const savePlatformCategory = (data) =>
  data.categoryId
    ? api.patch(`/admin/platform/categories/${data.categoryId}`, data)
    : api.post("/admin/platform/categories", data);
export const savePlatformCategoryAttributes = (categoryId, attributes) =>
  api.put(`/admin/platform/categories/${categoryId}/attributes`, { attributes });
export const updatePlatformCommissionRules = (rules) =>
  api.put("/admin/platform/commission-rules", { rules });
export const getPlatformStaffAccess = () =>
  api.get("/admin/platform/staff");
export const invitePlatformStaff = (data) =>
  api.post("/admin/platform/staff", data);
export const updatePlatformStaffRole = (staffId, data) =>
  api.patch(`/admin/platform/staff/${staffId}/role`, data);
export const getPlatformStaffActivityLog = (params = {}) =>
  api.get("/admin/platform/staff/activity-log", { params });
export const setupPlatformStaffTwoFactor = (staffId) =>
  api.post(`/admin/platform/staff/${staffId}/2fa/setup`);
export const verifyPlatformStaffTwoFactor = (staffId, data) =>
  api.post(`/admin/platform/staff/${staffId}/2fa/verify`, data);
export const updatePlatformRoleSessionPolicy = (role, data) =>
  api.put(`/admin/platform/roles/${role}/session-policy`, data);

export const getDispatchAssignments = (params = {}) =>
  api.get("/admin/dispatch/assignments", { params });
export const createDispatchAssignment = (data) =>
  api.post("/admin/dispatch/assignments", data);
export const updateDispatchStatus = (id, data) =>
  api.patch(`/admin/dispatch/assignments/${id}/status`, data);
export const getVendorStaff = () => api.get("/vendors/staff");
export const getVendorStaffAudit = (params = {}) => api.get("/vendors/staff/audit", { params });
export const inviteVendorStaff = (data) => api.post("/vendors/staff", data);
export const updateVendorStaff = (id, data) => api.patch(`/vendors/staff/${id}`, data);
export const removeVendorStaff = (id) => api.delete(`/vendors/staff/${id}`);

// ── Admin: Vendor orders ──────────────────────────────────────
export const getAdminVendorOrders = (vendorId, params = {}) =>
  api.get("/vendors/orders", { params: { ...params, vendorId } });

export const getVendorOrders = (params = {}) =>
  api.get("/vendors/orders", { params });

export const getVendorOrderDetail = (orderId) =>
  api.get(`/vendors/orders/${orderId}`);

export const updateVendorOrderStatus = (orderId, status, data = {}) =>
  api.patch(`/vendors/orders/${orderId}/status`, { ...data, status });

export const bulkUpdateVendorOrders = (data) =>
  api.patch("/vendors/orders/bulk-status", data);

// ── Admin: Category commission ────────────────────────────────
export const updateCategoryCommission = (id, rates) =>
  api.patch(
    `/categories/${id}/commission`,
    typeof rates === "object" ? rates : { commissionRate: rates },
  );

// ── Admin: Vendor status actions ─────────────────────────────
export const approveVendor = (vendorId) =>
  api.patch(`/vendors/${vendorId}/approve`);

export const suspendVendor = (vendorId, reason) =>
  api.patch(`/vendors/${vendorId}/suspend`, { reason });

export const reactivateVendor = (vendorId) =>
  api.patch(`/vendors/${vendorId}/reactivate`);

// ── Admin: Vendor payouts ────────────────────────────────────
export const calculateEligiblePayout = (vendorId) =>
  api.get(`/admin/payouts/vendor/${vendorId}/eligible`);

export const createVendorPayout = (vendorId, data) =>
  api.post(`/admin/payouts/vendor/${vendorId}`, data);

export const getAllPayouts = (params = {}) =>
  api.get("/admin/payouts", { params });

export const getPayoutById = (payoutId) =>
  api.get(`/admin/payouts/${payoutId}`);

export const markPayoutPaid = (payoutId, data) =>
  api.patch(`/admin/payouts/${payoutId}/paid`, data);

export const cancelPayout = (payoutId, reason) =>
  api.patch(`/admin/payouts/${payoutId}/cancel`, { reason });

export const getPayoutStats = () =>
  api.get("/admin/payouts/stats");

export const getWeeklyPayoutList = () =>
  api.get("/admin/payouts/weekly-list");

export const createBulkPayouts = (data) =>
  api.post("/admin/payouts/bulk", data);

export const getVendorPayouts = (params = {}) =>
  api.get("/vendors/finance/payouts", { params });

// Vendor Payout Requests
export const getAvailableBalance = () =>
  api.get("/vendors/finance/available-balance");

export const requestPayout = (data) =>
  api.post("/vendors/finance/request-payout", data);

export const getPayoutRequests = () =>
  api.get("/vendors/finance/payout-requests");

export const cancelPayoutRequest = (id) =>
  api.delete(`/vendors/finance/payout-requests/${id}`);

// Admin Payout Requests Management
export const getAdminPayoutRequests = (params = {}) =>
  api.get("/admin/payouts/requests", { params });

export const approvePayoutRequest = (payoutId, data) =>
  api.patch(`/admin/payouts/requests/${payoutId}/approve`, data);

export const rejectPayoutRequest = (payoutId, data) =>
  api.patch(`/admin/payouts/requests/${payoutId}/reject`, data);

export const markPayoutRequestPaid = (payoutId, data) =>
  api.patch(`/admin/payouts/requests/${payoutId}/mark-paid`, data);

// Vendor Shop Status Management
export const getShopStatus = () =>
  api.get("/vendors/shop/status");

export const toggleShopStatus = (isShopOpen) =>
  api.patch("/vendors/shop/toggle", { isShopOpen });

export const setVacationMode = (data) =>
  api.post("/vendors/shop/vacation", data);

export const cancelVacationMode = () =>
  api.delete("/vendors/shop/vacation");

export const getNotificationPreferences = () =>
  api.get("/notifications/preferences");

export const updateNotificationPreferences = (data) =>
  api.post("/notifications/preferences", data);

export const setupVendorTwoFactor = () =>
  api.post("/vendors/security/2fa/setup");

export const verifyVendorTwoFactor = (code) =>
  api.post("/vendors/security/2fa/verify", { code });

export const disableVendorTwoFactor = (code) =>
  api.delete("/vendors/security/2fa", { data: { code } });

// Vendor Reports
export const getVendorReports = (params = {}) =>
  api.get("/vendors/reports", { params });

// Rewards
export const getSpinRewardStatus = () => api.get("/rewards/spin/status");
export const spinRewardWheel = () => api.post("/rewards/spin");

// Vendor Finance
export const getVendorFinanceSummary = () =>
  api.get("/vendors/finance/summary");

export const getVendorFinanceTransactions = (params = {}) =>
  api.get("/vendors/finance/transactions", { params });

export const getVendorFinanceReconciliation = (params = {}) =>
  api.get("/vendors/finance/reconciliation", { params });

export const getVendorCommissionRates = () =>
  api.get("/vendors/finance/commission-rates");

export const downloadVendorFinanceStatement = (format = "csv", params = {}) =>
  api.get(`/vendors/finance/statement/${format}`, { params, responseType: "blob" });

export const downloadVendorTaxInvoice = (params = {}) =>
  api.get("/vendors/finance/tax-invoice", { params, responseType: "blob" });

export const getVendorMarketingItems = (params = {}) =>
  api.get("/vendors/marketing/items", { params });

export const getVendorMarketingAnalytics = (params = {}) =>
  api.get("/vendors/marketing/analytics", { params });

export const createVendorMarketingItem = (data) =>
  api.post("/vendors/marketing/items", data);

export const updateVendorMarketingItem = (id, data) =>
  api.patch(`/vendors/marketing/items/${id}`, data);

export const deleteVendorMarketingItem = (id) =>
  api.delete(`/vendors/marketing/items/${id}`);

export const getAdminVendorMarketingItems = (params = {}) =>
  api.get("/admin/vendor-marketing", { params });

export const reviewAdminVendorMarketingItem = (id, data) =>
  api.patch(`/admin/vendor-marketing/${id}/review`, data);
export const getCampaignVoucherAnalytics = (params = {}) =>
  api.get("/admin/vendor-marketing/analytics", { params });
export const getVendorCampaigns = () =>
  api.get("/campaigns/vendor/available");
export const joinPlatformCampaign = (campaignId) =>
  api.post(`/campaigns/${campaignId}/join`);
export const getMyCampaignJoins = () =>
  api.get("/campaigns/vendor/joins");

export const getVendorCatalogProducts = (params = {}) =>
  api.get("/vendor/products", { params });

export const bulkUpdateVendorProducts = (data) =>
  api.patch("/vendor/products/bulk", data);

export const getPublicVendorMarketingItems = (vendorId, params = {}) =>
  api.get(`/vendors/${vendorId}/public-marketing`, { params });
export const recordVendorMarketingEvent = (vendorId, itemId, data) =>
  api.post(`/vendors/${vendorId}/public-marketing/${itemId}/event`, data);
export const getFollowedVendorFeed = (params = {}) =>
  api.get("/vendors/followed/feed", { params });
export const getYouMayAlsoLike = (params = {}) =>
  api.get("/recommendations/you-may-also-like", { params });

// Public shop storefronts
export const getShops = (params = {}) => api.get("/shops", { params });
export const getShopBySlug = (slug) => api.get(`/shops/${slug}`);
export const getShopProducts = (slug, params = {}) =>
  api.get(`/shops/${slug}/products`, { params });
export const getShopReviews = (slug, params = {}) =>
  api.get(`/shops/${slug}/reviews`, { params });
export const followShop = (slug) => api.post(`/shops/${slug}/follow`);
export const unfollowShop = (slug) => api.delete(`/shops/${slug}/follow`);
export const getShopFollowStatus = (slug) => api.get(`/shops/${slug}/follow/status`);

// Vendor shop editor
export const getVendorShop = () => api.get("/vendor/shop");
export const updateVendorShop = (data) => api.put("/vendor/shop", data);
export const updateVendorShopLocation = (data) => api.put("/vendor/shop/location", data);
export const updateVendorShopMedia = (formData) =>
  api.put("/vendor/shop/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getAdminVendorKycQueue = (params = {}) =>
  api.get("/vendors/kyc/admin/pending", { params });

export const reviewAdminVendorKyc = (vendorId, data) =>
  api.patch(`/vendors/kyc/admin/${vendorId}/review`, data);


// ── Vendor Order Management (Daraz-style) ─────────────────────
export const acceptVendorOrder = (orderId, data = {}) =>
  api.post(`/vendors/orders/${orderId}/accept`, data);

export const rejectVendorOrder = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/reject`, data);

export const markOrderReadyToShip = (orderId) =>
  api.post(`/vendors/orders/${orderId}/ready-to-ship`);
export const markOrderPickupReady = (orderId) =>
  api.post(`/vendors/orders/${orderId}/pickup-ready`);
export const scheduleVendorPickup = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/schedule-pickup`, data);
export const markVendorCodCollected = (orderId, data = {}) =>
  api.post(`/vendors/orders/${orderId}/cod-collected`, data);
export const recordVendorDeliveryException = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/delivery-exception`, data);
export const sendVendorBuyerMessage = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/message-buyer`, data);
export const downloadVendorPackingSlip = (orderId) =>
  api.get(`/vendors/orders/${orderId}/packing-slip`, { responseType: "blob" });
export const downloadVendorBarcodeLabel = (orderId) =>
  api.get(`/vendors/orders/${orderId}/barcode-label`, { responseType: "blob" });

export const getVendorLogisticsShipments = (params = {}) =>
  api.get("/vendor/logistics/shipments", { params });
export const getVendorCourierOptions = () =>
  api.get("/vendor/logistics/courier-options");
export const assignVendorShipmentCourier = (shipmentId, data) =>
  api.post(`/vendor/logistics/shipments/${shipmentId}/assign-courier`, data);

export const shipVendorOrder = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/ship`, data);

export const markVendorOrderDelivered = (orderId, data = {}) =>
  api.post(`/vendors/orders/${orderId}/deliver`, data);

export const getVendorOrderTimeline = (orderId) =>
  api.get(`/vendors/orders/${orderId}/timeline`);
