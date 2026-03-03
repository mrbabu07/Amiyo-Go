import { useState, useEffect } from "react";
import StarRating from "./StarRating";

const ProductRating = ({
  productId,
  size = "sm",
  showCount = true,
  className = "",
}) => {
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRating();
  }, [productId]);

  const fetchRating = async () => {
    try {
      const response = await fetch(`/api/reviews/product/${productId}/stats`);

      // Check if response is ok
      if (!response.ok) {
        console.warn(`Failed to fetch rating stats: ${response.status}`);
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Rating stats endpoint returned non-JSON response");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setRating(data.data.averageRating || 0);
        setReviewCount(data.data.totalReviews || 0);
      }
    } catch (error) {
      console.error("Error fetching product rating:", error);
      // Silently fail - just show no rating
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse flex space-x-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-4 h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
        {showCount && (
          <div className="animate-pulse">
            <div className="h-4 w-12 bg-gray-300 rounded"></div>
          </div>
        )}
      </div>
    );
  }

  if (reviewCount === 0) {
    return (
      <div
        className={`flex items-center space-x-2 text-gray-500 dark:text-gray-400 ${className}`}
      >
        <StarRating rating={0} readonly size={size} />
        <span className="text-sm">No reviews</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <StarRating rating={Math.round(rating)} readonly size={size} />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {rating.toFixed(1)} {showCount && `(${reviewCount})`}
      </span>
    </div>
  );
};

export default ProductRating;
