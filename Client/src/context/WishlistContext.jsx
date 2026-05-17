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
  const [wishlistData, setWishlistData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { success, error } = useToast();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
      setWishlistData(null);
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await getWishlist();
      const data = response.data.data || {};
      setWishlistData(data);
      setWishlist(data.productDetails || []);
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      setWishlist([]);
      setWishlistData(null);
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
      setWishlist((prev) =>
        prev.some((item) => item._id === product._id) ? prev : [...prev, product],
      );
      await fetchWishlist();

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
      setWishlistData((prev) =>
        prev
          ? {
              ...prev,
              productDetails: (prev.productDetails || []).filter(
                (item) => item._id !== productId,
              ),
            }
          : prev,
      );

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
        wishlistData,
        collections: wishlistData?.collections || [],
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
