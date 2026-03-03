import { useState } from "react";

const StarRating = ({
  rating = 0,
  onRatingChange = null,
  size = "md",
  readonly = false,
  showCount = false,
  count = 0,
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  const sizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const handleClick = (value) => {
    if (readonly) return;
    setCurrentRating(value);
    if (onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value) => {
    if (readonly) return;
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const displayRating = hoverRating || currentRating;

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${sizes[size]} transition-colors duration-200 ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
          >
            <svg
              className={`w-full h-full ${
                star <= displayRating
                  ? "text-yellow-400 fill-current"
                  : "text-gray-300 dark:text-gray-600"
              }`}
              fill={star <= displayRating ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={star <= displayRating ? 0 : 1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>

      {showCount && (
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      )}

      {!readonly && (
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
          {displayRating > 0
            ? `${displayRating} star${displayRating !== 1 ? "s" : ""}`
            : "Click to rate"}
        </span>
      )}
    </div>
  );
};

export default StarRating;
