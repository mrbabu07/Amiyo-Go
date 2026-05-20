import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Eye, ShoppingCart, Star, Store } from "lucide-react";
import useCart from "../hooks/useCart";
import WishlistButton from "./WishlistButton";
import QuickViewModal from "./QuickViewModal";
import CompareButton from "./CompareButton";
import ProductRatingDisplay from "./ProductRatingDisplay";
import { formatViewCount } from "../utils/formatters";
import { useCurrency } from "../hooks/useCurrency";
import { usePlatformConfig } from "../context/PlatformConfigContext";

export default function ProductCard({ product }) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const { isShopDirectoryVisible } = usePlatformConfig();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
    isShopDirectoryVisible
      ? product.vendorSlug
        ? `/shops/${product.vendorSlug}`
        : product.vendorId
          ? `/vendor/${product.vendorId}/products`
          : ""
      : "";
  const soldCount =
    product.soldCount ||
    product.sold ||
    product.totalSold ||
    product.orderCount ||
    product.salesCount ||
    0;

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
        color: "text-accent-700",
        bgColor: "bg-accent-100",
        available: true,
      };
    if (product.stock <= 10)
      return {
        text: t("productCard.lowStock"),
        color: "text-accent-700",
        bgColor: "bg-accent-100",
        available: true,
      };
    return {
      text: t("productCard.inStock"),
      color: "text-success-700",
      bgColor: "bg-success-100",
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
        <div className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-900/60">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <div className="absolute left-1.5 top-1.5 z-20 sm:left-2 sm:top-2">
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm sm:px-2 sm:py-1 sm:text-xs">
                  -{discountPercentage}%
                </span>
              </div>
            )}

            {cardBadges.length ? (
              <div
                className={`absolute left-1.5 z-20 flex max-w-[calc(100%-3.25rem)] flex-wrap gap-1 sm:left-2 sm:max-w-[calc(100%-4rem)] ${
                  discountPercentage > 0 ? "top-7 sm:top-10" : "top-1.5 sm:top-2"
                }`}
              >
                {cardBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm sm:px-2 sm:py-1 sm:text-[11px] ${badge.className}`}
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
                decoding="async"
              />
            </div>

            {/* Image action buttons */}
            <div className="absolute right-1.5 top-1.5 z-30 flex flex-col gap-1.5 opacity-100 transition-all duration-300 sm:right-2 sm:top-2 sm:gap-2 md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
              <div onClick={(e) => e.preventDefault()}>
                <WishlistButton product={product} size="sm" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowQuickView(true);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/95 text-gray-900 shadow-sm ring-1 ring-black/5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-gray-900/95 dark:text-gray-100 dark:ring-white/10 sm:h-9 sm:w-9 md:hidden"
                aria-label={t("productCard.quickView")}
                title={t("productCard.quickView")}
              >
                <Eye className="h-4 w-4" />
              </button>
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
            <div className="absolute inset-x-0 bottom-0 z-30 hidden translate-y-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block">
              <div className="grid grid-cols-[2.375rem_minmax(0,1fr)] gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowQuickView(true);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/95 text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  aria-label={t("productCard.quickView")}
                  title={t("productCard.quickView")}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!stockStatus.available || isAdding}
                  className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold shadow-sm transition-all sm:text-sm ${
                    isAdding
                      ? "bg-green-500 text-white"
                      : !stockStatus.available
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {isAdding ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t("productCard.added")}</span>
                    </>
                  ) : !stockStatus.available ? (
                    <span className="truncate">{t("productCard.outOfStock")}</span>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t("productCard.addToCart")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-1 flex-col p-2 sm:p-4">
            <h3 className="line-clamp-2 min-h-8 text-[12px] font-semibold leading-4 text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300 sm:min-h-[2.6rem] sm:text-[15px] sm:leading-5">
              {product.title}
            </h3>

            {/* Rating with colored stars */}
            <div className="mt-1.5 sm:mt-2">
              <div className="flex min-w-0 items-center justify-between gap-1.5 sm:gap-2">
                <ProductRatingDisplay
                  productId={product._id}
                  size="sm"
                  showCount={false}
                  showValue={false}
                  className="min-w-0 text-[11px] sm:text-xs"
                />
                {soldCount ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 sm:gap-1 sm:text-xs">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {formatViewCount(soldCount)} {t("productCard.sold", "sold")}
                  </span>
                ) : null}
              </div>

              {/* View Count */}
              <div className="mt-1 hidden items-center gap-1 text-xs text-gray-500 dark:text-gray-400 min-[390px]:flex">
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
                className={`mt-1.5 flex min-w-0 items-center gap-1 text-left text-[11px] font-semibold text-gray-500 transition dark:text-gray-400 sm:mt-2 sm:gap-1.5 sm:text-xs ${
                  vendorPath
                    ? "cursor-pointer hover:text-primary-600 dark:hover:text-primary-300"
                    : "cursor-default"
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 sm:h-5 sm:w-5">
                  {product.vendorLogo ? (
                    <img src={product.vendorLogo} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  )}
                </span>
                <span className="line-clamp-1 min-w-0">{vendorName}</span>
              </span>
            ) : null}

            {/* Price and Stock Status */}
            <div className="mt-auto pt-2 sm:pt-3">
              <div className="flex min-h-6 items-baseline gap-1.5 sm:min-h-[2rem] sm:gap-2">
                <span className="text-[15px] font-bold leading-5 text-primary-700 dark:text-primary-300 sm:text-xl sm:leading-normal">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-[11px] font-semibold text-gray-400 line-through sm:text-sm">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1.5 sm:mt-2 sm:gap-2">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${stockStatus.bgColor} ${stockStatus.color}`}
                >
                  {stockStatus.text}
                </span>
              </div>
            </div>

            {/* Size and Color Indicators */}
            {(product.sizes?.length > 0 || product.colors?.length > 0) && (
              <div className="mb-3 hidden items-center gap-4 text-xs sm:flex">
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
              <div className="mb-3 hidden sm:block">
                <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {product.category}
                </span>
              </div>
            )}

            {/* Mobile cart action */}
            <div className="mt-2 md:hidden">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!stockStatus.available || isAdding}
                aria-label={t("productCard.addToCart")}
                className={`inline-flex h-9 w-full min-w-0 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold leading-none transition-colors sm:h-10 sm:gap-1.5 sm:text-xs ${
                  isAdding
                    ? "bg-green-500 text-white"
                    : !stockStatus.available
                      ? "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                }`}
              >
                {isAdding ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t("productCard.added")}</span>
                  </>
                ) : !stockStatus.available ? (
                  <span className="truncate">{t("productCard.outOfStock")}</span>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t("mobileNav.cart")}</span>
                  </>
                )}
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
