import { useState, useEffect } from "react";

export default function ProductRatingDisplay({
  productId,
  showCount = true,
  size = "sm",
  className = "",
}) {
  const [rating, setRating] = useState({
    averageRating: 0,
    totalReviews: 0,
    loading: true,
  });

  useEffect(() => {
    if (!productId) return;
    fetchProductRating();
  }, [productId]);

  const fetchProductRating = async () => {
    try {
      const response = await fetch(`/api/reviews/product/${productId}/stats`);
      const data = await response.json();

      if (data.success) {
        setRating({
          averageRating: data.data.averageRating || 0,
          totalReviews: data.data.totalReviews || 0,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching product rating:", error);
      setRating((prev) => ({ ...prev, loading: false }));
    }
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating.averageRating);
    const hasHalfStar = rating.averageRating % 1 >= 0.5;

    const starSize =
      size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3 h-3";

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg
          key={`full-${i}`}
          className={`${starSize} text-yellow-400 fill-current`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>,
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <div key="half" className={`${starSize} relative`}>
          <svg
            className={`${starSize} text-gray-300 fill-current absolute`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <svg
            className={`${starSize} text-yellow-400 fill-current absolute`}
            viewBox="0 0 20 20"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>,
      );
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg
          key={`empty-${i}`}
          className={`${starSize} text-gray-300 fill-current`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>,
      );
    }

    return stars;
  };

  if (rating.loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`${size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3 h-3"} bg-gray-200 rounded animate-pulse`}
            />
          ))}
        </div>
        {showCount && (
          <span
            className={`text-gray-400 ${size === "lg" ? "text-sm" : "text-xs"}`}
          >
            ...
          </span>
        )}
      </div>
    );
  }

  if (rating.totalReviews === 0) {
    return (
      <div className={`flex items-center gap-1 text-gray-400 ${className}`}>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`${size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3 h-3"} text-gray-300 fill-current`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          ))}
        </div>
        {showCount && (
          <span
            className={`text-gray-400 ${size === "lg" ? "text-sm" : "text-xs"}`}
          >
            No reviews
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex gap-1">{renderStars()}</div>
      <span
        className={`text-gray-600 ${size === "lg" ? "text-sm" : "text-xs"}`}
      >
        {rating.averageRating.toFixed(1)}
      </span>
      {showCount && (
        <span
          className={`text-gray-500 ${size === "lg" ? "text-sm" : "text-xs"}`}
        >
          ({rating.totalReviews.toLocaleString()})
        </span>
      )}
    </div>
  );
}
