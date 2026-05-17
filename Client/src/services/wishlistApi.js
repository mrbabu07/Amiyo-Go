import axios from "axios";
import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const wishlistApi = axios.create({
  baseURL: `${API_URL}/wishlist`,
});

// Add auth token to requests
wishlistApi.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Wishlist API functions
export const getWishlist = () => wishlistApi.get("/");
export const addToWishlist = (productId) =>
  wishlistApi.post("/", { productId });
export const removeFromWishlist = (productId) =>
  wishlistApi.delete(`/${productId}`);
export const clearWishlist = () => wishlistApi.delete("/");
export const toggleWishlistPublic = () => wishlistApi.post("/toggle-public");
export const createWishlistCollection = (name) =>
  wishlistApi.post("/collections", { name });
export const updateWishlistCollection = (collectionId, data) =>
  wishlistApi.patch(`/collections/${collectionId}`, data);
export const deleteWishlistCollection = (collectionId) =>
  wishlistApi.delete(`/collections/${collectionId}`);
export const addWishlistCollectionItem = (collectionId, productId) =>
  wishlistApi.post(`/collections/${collectionId}/items`, { productId });
export const removeWishlistCollectionItem = (collectionId, productId) =>
  wishlistApi.delete(`/collections/${collectionId}/items/${productId}`);
export const shareWishlistCollection = (collectionId, isPublic = true) =>
  wishlistApi.post(`/collections/${collectionId}/share`, { isPublic });
export const updateWishlistAlert = (productId, data) =>
  wishlistApi.patch(`/alerts/${productId}`, data);
