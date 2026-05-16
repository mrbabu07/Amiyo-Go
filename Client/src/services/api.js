import axios from "axios";
import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
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
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getLowStockProducts = (threshold = 10) =>
  api.get(`/products/admin/low-stock?threshold=${threshold}`);
export const getOutOfStockProducts = () =>
  api.get("/products/admin/out-of-stock");
export const updateStockBulk = (updates) =>
  api.patch("/products/bulk-stock-update", { updates });

// Categories
export const getCategories = () => api.get("/categories");
export const createCategory = (data) => api.post("/categories", data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Orders
export const getUserOrders = () => api.get("/orders/my-orders");
export const getAllOrders = () => api.get("/orders");
export const createOrder = (data) => api.post("/orders", data);
export const createGuestOrder = (data) => api.post("/orders/guest", data);
export const updateOrderStatus = (id, status, trackingNumber) =>
  api.patch(`/orders/${id}/status`, { status, trackingNumber });
export const cancelOrder = (id) => api.post(`/orders/${id}/cancel`);
export const getOrderTimeline = (id) => api.get(`/orders/${id}/timeline`);

// User
export const getCurrentUser = () => api.get("/user/me");

// Vendor profile
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

export const getAdminAlertSummary = () => api.get("/admin/alerts/summary");
export const getAdminDashboardOverview = (params = {}) =>
  api.get("/admin/dashboard/overview", { params });
export const getAdminAnalyticsSummary = (params = {}) =>
  api.get("/admin/analytics/summary", { params });
export const rebuildAdminAnalyticsSummary = (data = {}) =>
  api.post("/admin/analytics/rebuild", data);
export const getDispatchAssignments = (params = {}) =>
  api.get("/admin/dispatch/assignments", { params });
export const createDispatchAssignment = (data) =>
  api.post("/admin/dispatch/assignments", data);
export const updateDispatchStatus = (id, data) =>
  api.patch(`/admin/dispatch/assignments/${id}/status`, data);
export const getVendorStaff = () => api.get("/vendors/staff");
export const inviteVendorStaff = (data) => api.post("/vendors/staff", data);
export const updateVendorStaff = (id, data) => api.patch(`/vendors/staff/${id}`, data);
export const removeVendorStaff = (id) => api.delete(`/vendors/staff/${id}`);
export const exportAccountData = () => api.get("/account/export", { responseType: "blob" });
export const scheduleAccountDeletion = (data = {}) => api.post("/account/delete", data);
export const cancelAccountDeletion = () => api.post("/account/delete/cancel");

// ── Admin: Vendor orders ──────────────────────────────────────
export const getAdminVendorOrders = (vendorId, params = {}) =>
  api.get("/vendors/orders", { params: { ...params, vendorId } });

export const getVendorOrders = (params = {}) =>
  api.get("/vendors/orders", { params });

export const updateVendorOrderStatus = (orderId, status, data = {}) =>
  api.patch(`/vendors/orders/${orderId}/status`, { ...data, status });

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

export const getPublicVendorMarketingItems = (vendorId, params = {}) =>
  api.get(`/vendors/${vendorId}/public-marketing`, { params });
export const recordVendorMarketingEvent = (vendorId, itemId, data) =>
  api.post(`/vendors/${vendorId}/public-marketing/${itemId}/event`, data);
export const getFollowedVendorFeed = (params = {}) =>
  api.get("/vendors/followed/feed", { params });
export const getYouMayAlsoLike = (params = {}) =>
  api.get("/recommendations/you-may-also-like", { params });

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
export const sendVendorBuyerMessage = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/message-buyer`, data);
export const downloadVendorPackingSlip = (orderId) =>
  api.get(`/vendors/orders/${orderId}/packing-slip`, { responseType: "blob" });
export const downloadVendorBarcodeLabel = (orderId) =>
  api.get(`/vendors/orders/${orderId}/barcode-label`, { responseType: "blob" });

export const shipVendorOrder = (orderId, data) =>
  api.post(`/vendors/orders/${orderId}/ship`, data);

export const markVendorOrderDelivered = (orderId, data = {}) =>
  api.post(`/vendors/orders/${orderId}/deliver`, data);

export const getVendorOrderTimeline = (orderId) =>
  api.get(`/vendors/orders/${orderId}/timeline`);
