import { createContext, useState, useEffect } from "react";
import {
  getWishlist,
  addToWishlist as addToWishlistApi,
  removeFromWishlist as removeFromWishlistApi,
} from "../services/wishlistApi";
import useAuth from "../hooks/useAuth";
import { useToast } from "./ToastContext";

export const WishlistContext = createContext();

export default function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { success, error } = useToast();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await getWishlist();
      setWishlist(response.data.data.productDetails || []);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (product) => {
    if (!user) {
      error("Please login to add items to wishlist");
      return false;
    }

    try {
      console.log("Adding to wishlist:", product._id);
      await addToWishlistApi(product._id);
      setWishlist((prev) => [...prev, product]);

      // Show toast after state update
      setTimeout(() => {
        success(`${product.title} added to wishlist`);
      }, 0);

      return true;
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
      console.error("Error response:", err.response?.data);

      // Show error toast after state update
      setTimeout(() => {
        if (err.response?.status === 401) {
          error("Please login to add items to wishlist");
        } else if (err.response?.data?.error) {
          error(err.response.data.error);
        } else {
          error("Failed to add item to wishlist");
        }
      }, 0);

      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const productToRemove = wishlist.find((item) => item._id === productId);
      await removeFromWishlistApi(productId);
      setWishlist((prev) => prev.filter((item) => item._id !== productId));

      // Show toast after state update
      if (productToRemove) {
        setTimeout(() => {
          success(`${productToRemove.title} removed from wishlist`);
        }, 0);
      }

      return true;
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);

      // Show error toast after state update
      setTimeout(() => {
        error("Failed to remove item from wishlist");
      }, 0);

      return false;
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item._id === productId);
  };

  const wishlistCount = wishlist.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        wishlistCount,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
