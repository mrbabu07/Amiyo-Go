import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useCart from "../hooks/useCart";
import useProductView from "../hooks/useProductView";
import WishlistButton from "./WishlistButton";
import QuickViewModal from "./QuickViewModal";
import CompareButton from "./CompareButton";
import ProductRatingDisplay from "./ProductRatingDisplay";
import { formatViewCount } from "../utils/formatters";
import { useCurrency } from "../hooks/useCurrency";

export default function ProductCard({ product }) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
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
  const imageFocus =
    product.imageSettings?.crops?.[displayImage]?.objectPosition || "center";
  const vendorName =
    product.vendorName ||
    product.vendorShopName ||
    product.shopName ||
    product.vendor?.shopName ||
    product.brand ||
    "";
  const vendorPath =
    product.vendorSlug
      ? `/shop/${product.vendorSlug}`
      : product.vendorId
        ? `/vendor/${product.vendorId}/products`
        : "";
  const reviewCount = product.reviewCount || product.totalReviews || 0;

  const getStockStatus = () => {
    if (product.stock === 0 && product.allowBackorder)
      return {
        text: t("productCard.backorder"),
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        available: true,
      };
    if (product.stock === 0)
      return {
        text: t("productCard.outOfStock"),
        color: "text-red-600",
        bgColor: "bg-red-100",
        available: false,
      };
    if (product.stock <= 3)
      return {
        text: t("productCard.onlyLeft", { count: product.stock }),
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        available: true,
      };
    if (product.stock <= 10)
      return {
        text: t("productCard.lowStock"),
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        available: true,
      };
    return {
      text: t("productCard.inStock"),
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
  const cardBadges = [
    product.isFlashSale || product.flashSale || product.flashPrice
      ? { label: t("productCard.flashSale"), className: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200" }
      : null,
    product.freeShipping !== false
      ? { label: t("productCard.freeShipping"), className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200" }
      : null,
    product.officialStore || product.vendorVerified || product._vendorStatus === "approved"
      ? { label: t("productCard.officialStore"), className: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200" }
      : null,
    (product.averageRating || product.rating || 0) >= 4.5
      ? { label: t("productCard.topRated"), className: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200" }
      : null,
  ].filter(Boolean).slice(0, 2);

  const goToVendor = (event) => {
    if (!vendorPath) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(vendorPath);
  };

  return (
    <>
      <Link to={`/product/${product._id}`} className="block h-full">
        <div className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-900/60">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <div className="absolute left-2 top-2 z-20">
                <span className="rounded bg-red-600 px-2 py-1 text-xs font-extrabold text-white shadow-sm">
                  -{discountPercentage}%
                </span>
              </div>
            )}

            {cardBadges.length ? (
              <div className="absolute bottom-2 left-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                {cardBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`rounded px-2 py-1 text-[11px] font-extrabold leading-none shadow-sm ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Image with loading state */}
            <div className="relative h-full w-full">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 blur-sm dark:bg-gray-700">
                  <svg
                    className="h-8 w-8 text-gray-400"
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
                style={{ objectPosition: imageFocus }}
                className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                  imageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
                }`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </div>

            {/* Action Buttons - Only show on hover */}
            <div className="absolute right-2 top-2 z-30 flex flex-col gap-2 opacity-100 transition-all duration-300 md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
              <div onClick={(e) => e.preventDefault()}>
                <WishlistButton product={product} size="sm" />
              </div>
              <div className="hidden md:block" onClick={(e) => e.preventDefault()}>
                <CompareButton product={product} size="sm" />
              </div>
            </div>

            {/* Stock Overlay for Out of Stock */}
            {!stockStatus.available && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-gray-900 font-semibold text-sm">
                    {t("productCard.outOfStock")}
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
                  {t("productCard.quickView")}
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
                      {t("productCard.added")}
                    </span>
                  ) : !stockStatus.available ? (
                    t("productCard.outOfStock")
                  ) : (
                    t("productCard.addToCart")
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-1 flex-col p-3 sm:p-4">
            <h3 className="line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-5 text-gray-900 transition-colors group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-300 sm:text-[15px]">
              {product.title}
            </h3>

            {/* Rating with colored stars */}
            <div className="mt-2">
              <ProductRatingDisplay
                productId={product._id}
                size="sm"
                showCount={true}
                className="mb-1 text-xs"
              />

              {/* View Count */}
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <svg
                  className="h-3 w-3"
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

            {vendorName ? (
              <span
                role={vendorPath ? "link" : undefined}
                tabIndex={vendorPath ? 0 : undefined}
                onClick={goToVendor}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && vendorPath) goToVendor(event);
                }}
                className="mt-2 line-clamp-1 cursor-pointer text-left text-xs font-semibold text-gray-500 transition hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-300"
              >
                {vendorName}
              </span>
            ) : null}

            {/* Price and Stock Status */}
            <div className="mt-auto pt-3">
              <div className="flex min-h-[2rem] items-baseline gap-2">
                <span className="text-lg font-extrabold text-orange-600 dark:text-orange-300 sm:text-xl">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-xs font-semibold text-gray-400 line-through sm:text-sm">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${stockStatus.bgColor} ${stockStatus.color}`}
                >
                  {stockStatus.text}
                </span>
                {reviewCount ? (
                  <span className="text-xs font-medium text-gray-400">
                    {t("productCard.reviews", { count: reviewCount })}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Size and Color Indicators */}
            {(product.sizes?.length > 0 || product.colors?.length > 0) && (
              <div className="flex items-center gap-4 mb-3 text-xs">
                {product.sizes?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("productCard.sizes")}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {t("productCard.options", { count: product.sizes.length })}
                    </span>
                  </div>
                )}
                {product.colors?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("productCard.colors")}
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
                {t("productCard.quickView")}
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
                  ? t("productCard.added")
                  : !stockStatus.available
                    ? t("productCard.outOfStock")
                    : t("productCard.addToCart")}
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
