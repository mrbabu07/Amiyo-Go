import { useState } from "react";
import useCart from "../hooks/useCart";

export default function QuickAddButton({ product, className = "" }) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock === 0) return;

    setIsAdding(true);
    const imageToUse =
      product.image || (product.images && product.images[0]) || "";
    addToCart(product, 1, imageToUse);

    setTimeout(() => setIsAdding(false), 1000);
  };

  if (product.stock === 0) {
    return (
      <button
        disabled
        className={`px-3 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed ${className}`}
      >
        Out of Stock
      </button>
    );
  }

  return (
    <button
      onClick={handleQuickAdd}
      disabled={isAdding}
      className={`px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
        isAdding ? "bg-green-500" : ""
      } ${className}`}
    >
      {isAdding ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Added!
        </>
      ) : (
        <>
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add to Cart
        </>
      )}
    </button>
  );
}
