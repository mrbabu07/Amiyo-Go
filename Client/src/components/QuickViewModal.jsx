import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import AutoSlideshow from "./AutoSlideshow";
import StarRating from "./StarRating";
import StockIndicator from "./StockIndicator";
import ProductBadge from "./ProductBadge";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";
import { toAssetUrl } from "../utils/url";

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
    (product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [fallbackImage]
    ).map((image) => toAssetUrl(image) || fallbackImage);

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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        {/* Product Images */}
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
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
        <div className="flex min-w-0 flex-col">
          <h2 className="mb-3 text-xl font-bold leading-tight text-gray-950 dark:text-white sm:text-2xl">
            {product.title}
          </h2>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-black text-primary-600 dark:text-primary-300 sm:text-3xl">
              {formatPrice(product.price)}
            </span>
            <StockIndicator stock={product.stock} />
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <p className="line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
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
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Quantity:
            </span>
            <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                −
              </button>
              <span className="w-12 text-center font-semibold text-gray-950 dark:text-white">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(product.stock, quantity + 1))
                }
                disabled={quantity >= product.stock}
                className="flex h-11 w-11 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-footer -mx-4 -mb-4 mt-auto flex flex-col gap-2 border-t border-gray-200 bg-white/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:mx-0 sm:mb-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isAdding}
              className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition ${
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
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary-500 px-5 py-3 font-semibold text-primary-600 transition hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950/30"
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
