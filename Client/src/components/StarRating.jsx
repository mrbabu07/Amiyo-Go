export default function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  showNumber = true,
  interactive = false,
  onRatingChange = null,
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const handleStarClick = (starRating) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[...Array(maxRating)].map((_, index) => {
          const starRating = index + 1;
          const isFilled = starRating <= rating;
          const isHalfFilled = rating > index && rating < starRating;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleStarClick(starRating)}
              disabled={!interactive}
              className={`
                ${sizeClasses[size]}
                ${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"}
                transition-transform duration-150
                ${interactive ? "disabled:cursor-not-allowed" : ""}
              `}
            >
              <svg
                fill={
                  isFilled
                    ? "#fbbf24"
                    : isHalfFilled
                      ? "url(#half-fill)"
                      : "none"
                }
                stroke="#fbbf24"
                strokeWidth={1}
                viewBox="0 0 24 24"
                className="drop-shadow-sm"
              >
                <defs>
                  <linearGradient id="half-fill">
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          );
        })}
      </div>

      {showNumber && (
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
