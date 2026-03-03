import { useState } from "react";
import { Link } from "react-router-dom";
import useCart from "../hooks/useCart";
import useProductView from "../hooks/useProductView";
import WishlistButton from "./WishlistButton";
import ProductBadge from "./ProductBadge";
import QuickViewModal from "./QuickViewModal";
import CompareButton from "./CompareButton";
import ProductRatingDisplay from "./ProductRatingDisplay";
import { formatViewCount } from "../utils/formatters";
import { useCurrency } from "../hooks/useCurrency";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [isAdding, setIsAdding] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Track product view
  useProductView(product._id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    const imageToUse =
      product.image || (product.images && product.images[0]) || fallbackImage;
    addToCart(product, 1, imageToUse);
    setTimeout(() => setIsAdding(false), 1200);
  };

  const fallbackImage =
    "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400&h=400&fit=crop";

  const displayImage =
    product.image || (product.images && product.images[0]) || fallbackImage;

  const getStockStatus = () => {
    if (product.stock === 0)
      return {
        text: "Out of Stock",
        color: "text-red-600",
        bgColor: "bg-red-100",
        available: false,
      };
    if (product.stock <= 3)
      return {
        text: `Only ${product.stock} left`,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        available: true,
      };
    if (product.stock <= 10)
      return {
        text: "Low Stock",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        available: true,
      };
    return {
      text: "In Stock",
      color: "text-green-600",
      bgColor: "bg-green-100",
      available: true,
    };
  };

  const stockStatus = getStockStatus();

  // Calculate discount percentage
  const discountPercentage =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : 0;

  return (
    <>
      <Link to={`/product/${product._id}`} className="block">
        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden cursor-pointer">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
            {/* Product Badges */}
            <ProductBadge product={product} />

            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <div className="absolute top-3 left-3 z-20">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  -{discountPercentage}%
                </span>
              </div>
            )}

            {/* Image with loading state */}
            <div className="relative w-full h-full">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-600 animate-pulse flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <img
                src={displayImage}
                alt={product.title}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </div>

            {/* Action Buttons - Only show on hover */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <div onClick={(e) => e.preventDefault()}>
                <WishlistButton product={product} size="sm" />
              </div>
              <div onClick={(e) => e.preventDefault()}>
                <CompareButton product={product} size="sm" />
              </div>
            </div>

            {/* Stock Overlay for Out of Stock */}
            {!stockStatus.available && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-gray-900 font-semibold text-sm">
                    Out of Stock
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowQuickView(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg font-medium text-sm hover:bg-white transition-colors"
                >
                  Quick View
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={!stockStatus.available || isAdding}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                    isAdding
                      ? "bg-green-500 text-white"
                      : !stockStatus.available
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {isAdding ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                    </span>
                  ) : !stockStatus.available ? (
                    "Out of Stock"
                  ) : (
                    "Add to Cart"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-tight">
              {product.title}
            </h3>

            {/* Brand */}
            {product.brand && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
                {product.brand}
              </p>
            )}

            {/* Rating with colored stars */}
            <div className="mb-3">
              <ProductRatingDisplay
                productId={product._id}
                size="sm"
                showCount={true}
                className="mb-1"
              />

              {/* View Count */}
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span>{formatViewCount(product.views)}</span>
              </div>
            </div>

            {/* Price and Stock Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}
              >
                {stockStatus.text}
              </div>
            </div>

            {/* Size and Color Indicators */}
            {(product.sizes?.length > 0 || product.colors?.length > 0) && (
              <div className="flex items-center gap-4 mb-3 text-xs">
                {product.sizes?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Sizes:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {product.sizes.length} options
                    </span>
                  </div>
                )}
                {product.colors?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Colors:
                    </span>
                    <div className="flex gap-1">
                      {product.colors.slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      {product.colors.length > 4 && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          +{product.colors.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Category */}
            {product.category && (
              <div className="mb-3">
                <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {product.category}
                </span>
              </div>
            )}

            {/* Free Shipping Badge */}
            {product.freeShipping !== false && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Free Shipping
                </span>
              </div>
            )}

            {/* Action Buttons - Always visible on mobile */}
            <div className="flex gap-2 md:hidden">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowQuickView(true);
                }}
                className="flex-1 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Quick View
              </button>
              <button
                onClick={handleAddToCart}
                disabled={!stockStatus.available || isAdding}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                  isAdding
                    ? "bg-green-500 text-white"
                    : !stockStatus.available
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                }`}
              >
                {isAdding
                  ? "Added!"
                  : !stockStatus.available
                    ? "Out of Stock"
                    : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      </Link>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </>
  );
}
