import { useState } from "react";
import useWishlist from "../hooks/useWishlist";

export default function WishlistButton({
  product,
  className = "",
  size = "md",
}) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(false);

  const inWishlist = isInWishlist(product._id);

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);

    if (inWishlist) {
      await removeFromWishlist(product._id);
    } else {
      await addToWishlist(product);
    }

    setIsLoading(false);
  };

  const sizeClasses = {
    sm: "w-8 h-8 p-1.5",
    md: "w-10 h-10 p-2",
    lg: "w-12 h-12 p-2.5",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        ${
          inWishlist
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white text-gray-600 hover:bg-gray-50 hover:text-red-500"
        }
        rounded-full border border-gray-200 transition-all duration-200 
        flex items-center justify-center shadow-sm hover:shadow-md
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      {isLoading ? (
        <div className={`${iconSizes[size]} animate-spin`}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      ) : (
        <svg
          className={iconSizes[size]}
          fill={inWishlist ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}
