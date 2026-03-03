import { useEffect, useRef } from "react";

const useProductView = (productId) => {
  const hasViewed = useRef(false);

  useEffect(() => {
    if (!productId || hasViewed.current) return;

    const trackView = async () => {
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL}/products/${productId}/view`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        hasViewed.current = true;
      } catch (error) {
        console.error("Failed to track product view:", error);
      }
    };

    // Track view after a short delay to ensure the user actually sees the product
    const timer = setTimeout(trackView, 1000);

    return () => clearTimeout(timer);
  }, [productId]);
};

export default useProductView;
