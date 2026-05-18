import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { Badge, Button } from "./foundation";
import { Skeleton } from "./feedback";
import { cn, getDiscountPercent, getPriceLabel } from "./utils";

export function PriceBlock({
  price,
  originalPrice,
  currency = "BDT",
  formatPrice,
  size = "md",
  className = "",
}) {
  const discount = getDiscountPercent(price, originalPrice);
  const priceLabel = formatPrice ? formatPrice(price) : getPriceLabel(price, currency);
  const originalLabel = formatPrice ? formatPrice(originalPrice) : getPriceLabel(originalPrice, currency);
  const sizeClass = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  }[size] || "text-xl";

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-extrabold text-primary-700 dark:text-primary-300", sizeClass)}>{priceLabel}</span>
      {discount > 0 ? (
        <>
          <span className="text-sm font-semibold text-slate-400 line-through">{originalLabel}</span>
          <Badge variant="danger" size="sm">
            {discount}% off
          </Badge>
        </>
      ) : null}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Skeleton variant="image" className="rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Skeleton variant="text" lines={2} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="45%" />
        <div className="mt-auto flex items-center justify-between gap-3">
          <Skeleton variant="text" width="36%" />
          <Skeleton variant="text" width="28%" />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products, children, renderProduct, loading = false, skeletonCount = 8, className = "" }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4", className)}>
      {loading
        ? Array.from({ length: skeletonCount }).map((_, index) => <ProductCardSkeleton key={index} />)
        : products?.map((product, index) => (
            <div key={product._id || product.id || index}>
              {renderProduct ? renderProduct(product, index) : <ProductCard product={product} />}
            </div>
          ))}
      {children}
    </div>
  );
}

export function ProductCard({
  product,
  href,
  onAddToCart,
  onWishlistToggle,
  wishlisted = false,
  formatPrice,
  imageFallback = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop",
  className = "",
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const image = product?.image || product?.images?.[0] || imageFallback;
  const title = product?.title || product?.name || "Product";
  const vendorName = product?.vendorName || product?.vendor?.shopName || product?.shopName || "Amiyo-Go vendor";
  const rating = Number(product?.rating || product?.averageRating || 0);
  const reviewCount = product?.reviewCount || product?.totalReviews || 0;
  const cardHref = href || `/product/${product?._id || product?.id || ""}`;

  const handleAdd = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAdding(true);
    await onAddToCart?.(product);
    window.setTimeout(() => setAdding(false), 700);
  };

  const handleWishlist = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onWishlistToggle?.(product);
  };

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
        <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
          <Link to={cardHref} className="block h-full">
            {!imageLoaded ? <Skeleton variant="image" className="absolute inset-0 rounded-none" /> : null}
            <img
              src={image}
              alt={title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "h-full w-full object-cover transition duration-500 group-hover:scale-105",
                imageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm",
              )}
            />
            {getDiscountPercent(product?.price, product?.originalPrice) > 0 ? (
              <div className="absolute left-2 top-2">
                <Badge variant="danger" size="sm">
                  Sale
                </Badge>
              </div>
            ) : null}
          </Link>
          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-sm transition hover:text-red-600 dark:bg-slate-950/95 dark:text-slate-200"
            onClick={handleWishlist}
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-red-500 text-red-500")} />
          </button>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <Link to={cardHref} className="block">
            <h3 className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-slate-950 hover:text-primary-700 dark:text-white dark:hover:text-primary-300">
              {title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{vendorName}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{rating ? rating.toFixed(1) : "New"}</span>
            {reviewCount ? <span>({reviewCount})</span> : null}
          </div>
          <div className="mt-auto pt-3">
            <PriceBlock
              price={product?.price}
              originalPrice={product?.originalPrice}
              formatPrice={formatPrice}
              size="sm"
            />
            <Button
              className="mt-3"
              size="sm"
              fullWidth
              loading={adding}
              leftIcon={adding ? null : <ShoppingCart className="h-4 w-4" />}
              onClick={handleAdd}
            >
              {adding ? "Added" : "Add"}
            </Button>
          </div>
        </div>
    </article>
  );
}

export function VariantSelector({
  label,
  options = [],
  value,
  onChange,
  type = "pill",
  className = "",
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{label}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          const unavailable = option.available === false || option.disabled;

          if (type === "color") {
            return (
              <button
                key={option.value}
                type="button"
                disabled={unavailable}
                aria-label={option.label}
                className={cn(
                  "relative h-9 w-9 rounded-full border-2 shadow-sm transition",
                  selected ? "border-primary-600 ring-2 ring-primary-100" : "border-white ring-1 ring-slate-300",
                  unavailable && "cursor-not-allowed opacity-45",
                )}
                style={{ backgroundColor: option.color || option.value }}
                onClick={() => onChange?.(option.value, option)}
              >
                {unavailable ? <span className="absolute left-1/2 top-0 h-full w-px -rotate-45 bg-slate-900/60" /> : null}
              </button>
            );
          }

          return (
            <button
              key={option.value}
              type="button"
              disabled={unavailable}
              className={cn(
                "relative min-h-10 rounded-lg border px-3 text-sm font-extrabold transition",
                selected
                  ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
                unavailable && "cursor-not-allowed overflow-hidden opacity-45",
              )}
              onClick={() => onChange?.(option.value, option)}
            >
              {option.label}
              {unavailable ? <span className="absolute left-0 top-1/2 h-px w-full -rotate-12 bg-current" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function QuantityStepper({
  value = 1,
  min = 1,
  max = 99,
  onChange,
  className = "",
}) {
  const numericValue = Number(value || min);
  const update = (nextValue) => {
    const clamped = Math.min(Math.max(nextValue, min), max);
    onChange?.(clamped);
  };

  return (
    <div className={cn("inline-grid h-10 grid-cols-[2.5rem_3rem_2.5rem] overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950", className)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        className="flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-900"
        disabled={numericValue <= min}
        onClick={() => update(numericValue - 1)}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        aria-label="Quantity"
        type="number"
        min={min}
        max={max}
        value={numericValue}
        onChange={(event) => update(Number(event.target.value))}
        className="border-x border-slate-300 bg-transparent text-center text-sm font-extrabold outline-none dark:border-slate-700"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        className="flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-900"
        disabled={numericValue >= max}
        onClick={() => update(numericValue + 1)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StickyPurchaseBar({ price, variant, ctaLabel = "Add to cart", onCta, formatPrice }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <PriceBlock price={price} formatPrice={formatPrice} size="sm" />
          {variant ? <p className="truncate text-xs font-semibold text-slate-500">{variant}</p> : null}
        </div>
        <Button onClick={onCta} leftIcon={<ShoppingCart className="h-4 w-4" />}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
