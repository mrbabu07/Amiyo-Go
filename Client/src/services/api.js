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

// User
export const getCurrentUser = () => api.get("/user/me");

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

// Coupons
export const getActiveCoupons = () => api.get("/coupons/active");
export const validateCoupon = (code, orderTotal) =>
  api.post("/coupons/validate", { code, orderTotal });
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

// Payments
export const processPayment = (data) => api.post("/payments/process", data);
export const getUserPayments = () => api.get("/payments/my-payments");
export const getOrderPayment = (orderId) =>
  api.get(`/payments/order/${orderId}`);
export const getAllPayments = () => api.get("/payments");
export const getPaymentStats = () => api.get("/payments/stats");

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
