import axios from "axios";
import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const reviewApi = axios.create({
  baseURL: `${API_URL}/reviews`,
});

// Add auth token to requests for authenticated routes
reviewApi.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (
    user &&
    !config.url.includes("/product/") &&
    !config.url.includes("/helpful")
  ) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Review API functions
export const getProductReviews = (productId, page = 1, limit = 10) =>
  reviewApi.get(`/product/${productId}?page=${page}&limit=${limit}`);

export const createReview = (reviewData) => reviewApi.post("/", reviewData);
export const getUserReviews = () => reviewApi.get("/my-reviews");
export const updateReview = (reviewId, reviewData) =>
  reviewApi.put(`/${reviewId}`, reviewData);
export const deleteReview = (reviewId) => reviewApi.delete(`/${reviewId}`);
export const markReviewHelpful = (reviewId) =>
  reviewApi.post(`/${reviewId}/helpful`);

// Admin functions
export const getAllReviews = (page = 1, limit = 50) =>
  reviewApi.get(`/admin/all?page=${page}&limit=${limit}`);
export const getUnrepliedReviews = () => reviewApi.get("/admin/unreplied");
export const addAdminReply = (reviewId, reply) =>
  reviewApi.post(`/${reviewId}/admin-reply`, { reply });
export const deleteReviewAdmin = (reviewId) =>
  reviewApi.delete(`/${reviewId}/admin`);
