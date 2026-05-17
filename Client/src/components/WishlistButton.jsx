import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
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
            : "bg-white text-gray-600 hover:bg-gray-50 hover:text-red-500 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        }
        rounded-full border border-gray-200 transition-all duration-200 
        flex items-center justify-center shadow-sm hover:shadow-md active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        dark:border-gray-700
        ${className}
      `}
      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Heart
          className={`${iconSizes[size]} transition-transform duration-200 ${inWishlist ? "scale-110" : ""}`}
          fill={inWishlist ? "currentColor" : "none"}
        />
      )}
    </button>
  );
}
