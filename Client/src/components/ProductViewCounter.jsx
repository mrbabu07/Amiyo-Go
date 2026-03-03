import { useEffect, useState } from "react";

export default function ProductViewCounter({ productId, className = "" }) {
  const [viewCount, setViewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;

    // Track view when component mounts
    trackProductView(productId);

    // Get current view count
    getViewCount(productId);
  }, [productId]);

  const trackProductView = async (id) => {
    try {
      // Store in localStorage for now (can be enhanced with API later)
      const viewKey = `product_views_${id}`;
      const currentViews = parseInt(localStorage.getItem(viewKey) || "0");
      const newViews = currentViews + 1;

      localStorage.setItem(viewKey, newViews.toString());

      // Also track in session to avoid counting multiple views in same session
      const sessionKey = `viewed_${id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        setViewCount(newViews);
      } else {
        setViewCount(currentViews);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error tracking product view:", error);
      setIsLoading(false);
    }
  };

  const getViewCount = async (id) => {
    try {
      const viewKey = `product_views_${id}`;
      const views = parseInt(localStorage.getItem(viewKey) || "0");
      setViewCount(views);
      setIsLoading(false);
    } catch (error) {
      console.error("Error getting view count:", error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 text-gray-500 ${className}`}>
        <svg
          className="w-4 h-4 animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span className="text-sm">...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-gray-500 ${className}`}>
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
      <span className="text-sm">
        {viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}
      </span>
    </div>
  );
}
