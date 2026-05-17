import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
      className={`flex min-h-11 items-center gap-2 rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95 ${
        isAdding ? "bg-green-500" : ""
      } ${className}`}
    >
      {isAdding ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Added!
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Add to Cart
        </>
      )}
    </button>
  );
}
