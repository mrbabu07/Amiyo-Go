import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import AutoSlideshow from "./AutoSlideshow";
import StarRating from "./StarRating";
import StockIndicator from "./StockIndicator";
import ProductBadge from "./ProductBadge";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";

export default function QuickViewModal({ product, isOpen, onClose }) {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const fallbackImage =
    "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=600&h=600&fit=crop";

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [fallbackImage];

  const handleAddToCart = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      alert("Please select a size");
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      alert("Please select a color");
      return;
    }

    setIsAdding(true);
    const imageToUse = productImages[0];
    addToCart(product, quantity, imageToUse, selectedSize, selectedColor);
    setTimeout(() => {
      setIsAdding(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick View" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="relative">
          <ProductBadge product={product} />
          <AutoSlideshow
            images={productImages}
            autoPlay={productImages.length > 1}
            interval={4000}
            showDots={productImages.length > 1}
            showArrows={productImages.length > 1}
            className="rounded-xl"
            aspectRatio="aspect-square"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {product.title}
          </h2>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold text-primary-500">
              {formatPrice(product.price)}
            </span>
            <StockIndicator stock={product.stock} />
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                {product.description}
              </p>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Size
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1 rounded-lg border font-medium transition ${
                      selectedSize === size
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Color
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-medium transition ${
                      selectedColor?.name === color.name
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Quantity:
            </span>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg"
              >
                −
              </button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(product.stock, quantity + 1))
                }
                disabled={quantity >= product.stock}
                className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-auto">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isAdding}
              className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                isAdding
                  ? "bg-green-500 text-white"
                  : product.stock === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-primary-500 hover:bg-primary-600 text-white"
              }`}
            >
              {isAdding ? "✓ Added!" : "Add to Cart"}
            </button>
            <Link
              to={`/product/${product._id}`}
              className="px-6 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
              onClick={onClose}
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
