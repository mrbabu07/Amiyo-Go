import { useState, useEffect } from "react";

const STORAGE_KEY = "recentlyViewed";
const MAX_ITEMS = 10;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (error) {
        console.error("Error loading recently viewed:", error);
      }
    }
  }, []);

  const addToRecentlyViewed = (product) => {
    if (!product || !product._id) return;

    setRecentlyViewed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((item) => item._id !== product._id);

      // Add to beginning
      const updated = [product, ...filtered].slice(0, MAX_ITEMS);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
};
