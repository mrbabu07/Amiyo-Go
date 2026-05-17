import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Flame,
  Gift,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import {
  claimDailyCheckInReward,
  getHomepageDiscovery,
} from "../services/api";
import ProductCard from "../components/ProductCard";
import { ProductCardSkeleton } from "../components/Skeleton";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useCurrency } from "../hooks/useCurrency";
import useAuth from "../hooks/useAuth";

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1400&h=700&fit=crop";

const emptyDiscovery = {
  heroBanners: [],
  categories: [],
  promotionStrip: [],
  flashSales: [],
  justForYou: [],
  trendingNow: [],
  newArrivals: [],
  curatedCollections: [],
  followedVendorUpdates: { requiresLogin: true, vendors: [], updates: [] },
  recentlyViewed: [],
  dailyCheckIn: { enabled: true, requiresLogin: true, canClaim: false, points: 5 },
};

const formatDuration = (targetDate, now, t) => {
  const end = targetDate ? new Date(targetDate).getTime() : 0;
  const remaining = Math.max(0, end - now);
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining / (60 * 1000)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  if (!end || remaining <= 0) return t("home.endingSoon");
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const sectionProducts = (products = [], count = 8) => products.slice(0, count);

const categoryTileThemes = [
  {
    tile: "hover:border-orange-200 hover:bg-orange-50 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/20",
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
  },
  {
    tile: "hover:border-emerald-200 hover:bg-emerald-50 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  {
    tile: "hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
  },
  {
    tile: "hover:border-rose-200 hover:bg-rose-50 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/20",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
  },
  {
    tile: "hover:border-amber-200 hover:bg-amber-50 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200",
  },
];

function CouponStrip({ coupons, formatPrice, t }) {
  if (!coupons?.length) return null;

  return (
    <div className="border-b border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {coupons.map((coupon) => (
          <Link
            key={coupon._id || coupon.code}
            to="/products"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-950 transition hover:border-orange-300 hover:bg-orange-100/70 dark:border-orange-800 dark:bg-gray-900 dark:text-orange-100 dark:hover:bg-orange-950/50"
          >
            <Tag className="h-4 w-4" />
            <span>{coupon.code}</span>
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-900/60 dark:text-orange-200">
              {coupon.discountType === "percentage"
                ? t("home.discountPercent", { value: coupon.discountValue })
                : t("home.discountFixed", { value: formatPrice(coupon.discountValue) })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TopCategorySection({ categories, t }) {
  if (!categories?.length) return null;
  const visibleCategories = categories.slice(0, 11);
  const hasMoreCategories = categories.length > visibleCategories.length;

  return (
    <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-extrabold text-gray-950 dark:text-white">
              <Store className="h-5 w-5 text-orange-500" />
              {t("home.topCategories")}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
              {t("home.categorySubtitle")}
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:text-gray-100 dark:hover:border-orange-900 dark:hover:bg-orange-950/30 sm:text-sm"
          >
            {t("home.browseAllCategories")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:gap-3 lg:grid-cols-8 xl:grid-cols-12">
          {visibleCategories.map((category, index) => {
            const theme = categoryTileThemes[index % categoryTileThemes.length];
            return (
              <Link
                key={category._id}
                to={category.slug ? `/products?category=${category.slug}` : `/products?category=${category._id}`}
                className={`group flex min-h-28 flex-col items-center justify-between rounded-lg border border-gray-200 bg-white p-2 text-center shadow-sm transition dark:border-gray-800 dark:bg-gray-950 ${theme.tile}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg text-sm font-extrabold shadow-sm sm:h-14 sm:w-14 ${theme.icon}`}>
                  {category.image || category.icon ? (
                    <img
                      src={category.image || category.icon}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    category.name?.slice(0, 1) || "C"
                  )}
                </span>
                <span className="mt-2 line-clamp-2 min-h-[2rem] text-xs font-bold leading-4 text-gray-800 group-hover:text-orange-600 dark:text-gray-100">
                  {category.name}
                </span>
              </Link>
            );
          })}

          {hasMoreCategories ? (
            <Link
              to="/products"
              className="group flex min-h-28 flex-col items-center justify-between rounded-lg border border-dashed border-orange-300 bg-orange-50 p-2 text-center shadow-sm transition hover:bg-orange-100 dark:border-orange-900/70 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm dark:bg-gray-900 dark:text-orange-200 sm:h-14 sm:w-14">
                <ChevronRight className="h-6 w-6" />
              </span>
              <span className="mt-2 line-clamp-2 min-h-[2rem] text-xs font-extrabold leading-4 text-orange-700 dark:text-orange-200">
                {t("home.viewAllCategories")}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CategoryPanel({ categories, t }) {
  if (!categories?.length) return null;

  return (
    <aside className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:block">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-white">
          <Store className="h-4 w-4 text-orange-500" />
          {t("home.shopByCategory")}
        </p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {categories.slice(0, 10).map((category) => (
          <Link
            key={category._id}
            to={category.slug ? `/products?category=${category.slug}` : `/products?category=${category._id}`}
            className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-orange-50 dark:hover:bg-gray-800"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
              {category.image || category.icon ? (
                <img
                  src={category.image || category.icon}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                category.name?.slice(0, 1) || "C"
              )}
            </span>
            <span className="line-clamp-1 min-w-0 flex-1 text-sm font-semibold text-gray-700 group-hover:text-orange-600 dark:text-gray-200">
              {category.name}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange-500" />
          </Link>
        ))}
      </div>
      <Link
        to="/products"
        className="flex items-center justify-center gap-2 border-t border-gray-100 px-4 py-3 text-sm font-bold text-primary-700 transition hover:bg-primary-50 dark:border-gray-800 dark:text-primary-300 dark:hover:bg-gray-800"
      >
        {t("home.viewAllCategories")}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </aside>
  );
}

function HeroCarousel({ banners, activeHero, setActiveHero, t }) {
  const slides = banners?.length
    ? banners
    : [
        {
          id: "fallback",
          title: t("home.fallbackHeroTitle"),
          subtitle: t("home.fallbackHeroSubtitle"),
          badge: t("home.fallbackHeroBadge"),
          imageUrl: fallbackHeroImage,
          link: "/products",
          ctaText: t("home.fallbackHeroCta"),
        },
      ];

  const currentSlide = slides[activeHero % slides.length];

  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-lg bg-gray-900 shadow-sm md:min-h-[420px]">
      {slides.map((slide, index) => (
        <div
          key={slide.id || index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === activeHero % slides.length ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={slide.imageUrl || fallbackHeroImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-950/35 to-gray-950/10" />
        </div>
      ))}

      <div className="relative flex min-h-[340px] flex-col justify-end p-5 md:min-h-[420px] md:p-8">
        <div className="max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {currentSlide.badge || t("home.featured")}
          </span>
          <h1 className="max-w-xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
            {currentSlide.title}
          </h1>
          {currentSlide.subtitle ? (
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 md:text-base">
              {currentSlide.subtitle}
            </p>
          ) : null}
          <Link
            to={currentSlide.link || "/products"}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-gray-950 shadow-sm transition hover:bg-orange-50"
          >
            {currentSlide.ctaText || t("home.shopNow")}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <div className="mt-5 hidden max-w-xl grid-cols-3 gap-2 sm:grid">
            {[t("home.heroFastDelivery"), t("home.heroCod"), t("home.heroVerifiedSeller")].map((item) => (
              <span
                key={item}
                className="rounded-lg border border-white/20 bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={t("home.previousBanner")}
            onClick={() => setActiveHero((current) => (current - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/85 text-gray-900 shadow-sm transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t("home.nextBanner")}
            onClick={() => setActiveHero((current) => (current + 1) % slides.length)}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/85 text-gray-900 shadow-sm transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 right-4 flex gap-1">
            {slides.map((slide, index) => (
              <button
                key={slide.id || index}
                type="button"
                aria-label={t("home.goToBanner", { number: index + 1 })}
                onClick={() => setActiveHero(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeHero % slides.length ? "w-7 bg-white" : "w-2 bg-white/55"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DailyCheckInCard({ dailyCheckIn, user, claiming, onClaim, t }) {
  if (!dailyCheckIn?.enabled) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">
          <Coins className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {dailyCheckIn.label || `Check in today for ${dailyCheckIn.points || 5} coins`}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            {t("home.dailyUseCoins")}
          </p>
        </div>
      </div>

      {dailyCheckIn.requiresLogin || !user ? (
        <Link
          to="/login"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          <Gift className="h-4 w-4" />
          {t("home.signInToCollect")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClaim}
          disabled={!dailyCheckIn.canClaim || claiming}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
        >
          <Gift className="h-4 w-4" />
          {claiming ? t("home.collecting") : dailyCheckIn.canClaim ? t("home.collectCoins") : t("home.collectedToday")}
        </button>
      )}
    </div>
  );
}

function FlashSummary({ flashSales, now, formatPrice, t }) {
  const firstDeal = flashSales?.[0];
  if (!firstDeal) return null;
  const remainingStock = firstDeal.remainingStock ?? firstDeal.stock ?? 0;

  return (
    <Link
      to={firstDeal.productId ? `/product/${firstDeal.productId}` : "/products"}
      className="block overflow-hidden rounded-lg border border-red-200 bg-white p-4 shadow-sm transition hover:border-red-300 dark:border-red-900/70 dark:bg-gray-900"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
            <Flame className="h-4 w-4" />
            {t("home.flashSaleLive")}
          </p>
          <p className="mt-2 line-clamp-2 text-base font-bold text-gray-950 dark:text-white">
            {firstDeal.title}
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {formatPrice(firstDeal.flashPrice || firstDeal.product?.price || 0)}
          </p>
        </div>
        <img
          src={firstDeal.image || firstDeal.product?.image || fallbackHeroImage}
          alt=""
          className="h-20 w-20 rounded-lg object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
        <span>{remainingStock} {t("home.left")}</span>
        <span>{formatDuration(firstDeal.endTime, now, t)}</span>
      </div>
    </Link>
  );
}

function TrendingMiniCard({ product, formatPrice, t }) {
  if (!product) return null;

  return (
    <Link
      to={`/product/${product._id}`}
      className="block rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm transition hover:border-blue-300 dark:border-blue-900/60 dark:bg-blue-950/30"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200">
        <TrendingUp className="h-4 w-4" />
        {t("home.trendingNow")}
      </p>
      <div className="mt-3 flex gap-3">
        <img
          src={product.image || fallbackHeroImage}
          alt=""
          className="h-20 w-20 rounded-lg object-cover shadow-sm"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold text-gray-950 dark:text-white">
            {product.title}
          </p>
          <p className="mt-1 text-sm font-extrabold text-blue-700 dark:text-blue-200">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function MarketplacePromiseStrip({ t }) {
  const promises = [
    {
      icon: Zap,
      title: t("home.bestPrices"),
      text: t("home.bestPricesText"),
      tone: "text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-200",
    },
    {
      icon: BadgeCheck,
      title: t("home.authenticProducts"),
      text: t("home.authenticProductsText"),
      tone: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200",
    },
    {
      icon: CreditCard,
      title: t("home.securePayment"),
      text: t("home.securePaymentText"),
      tone: "text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200",
    },
    {
      icon: Truck,
      title: t("home.fastDelivery"),
      text: t("home.fastDeliveryText"),
      tone: "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200",
    },
  ];

  return (
    <section className="border-y border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {promises.map(({ icon: Icon, title, text, tone }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-950"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-gray-950 dark:text-white">
                {title}
              </span>
              <span className="line-clamp-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {text}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductGridSection({
  title,
  subtitle,
  icon: Icon,
  products,
  loading,
  actionTo = "/products",
  actionLabel = "View all",
  tone = "gray",
}) {
  if (!loading && !products?.length) return null;

  const toneClasses = {
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  };

  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`mb-2 inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneClasses[tone] || toneClasses.gray}`}>
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {subtitle}
            </p>
            <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white md:text-3xl">
              {title}
            </h2>
          </div>
          <Link
            to={actionTo}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-800 dark:text-primary-300"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sectionProducts(products, 10).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FlashSaleStrip({ flashSales, now, formatPrice, t }) {
  if (!flashSales?.length) return null;
  const headlineDeal = flashSales[0];

  return (
    <section className="border-y border-red-200 bg-red-50 py-6 dark:border-red-900/60 dark:bg-red-950/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 rounded-lg bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              <Clock className="h-3.5 w-3.5" />
              {t("home.liveCountdown")}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              {t("home.flashSale")}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-red-600 shadow-sm">
              {formatDuration(headlineDeal.endTime, now, t)}
            </div>
            <Link
              to="/products?deal=flash"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              {t("common.seeAll")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {flashSales.map((deal) => {
            const remainingStock = deal.remainingStock ?? deal.stock ?? 0;
            const totalStock = deal.totalStock ?? deal.stockLimit ?? 0;
            const stockPercent = totalStock
              ? Math.max(0, Math.min(100, (remainingStock / totalStock) * 100))
              : 0;
            const price = deal.flashPrice || deal.product?.price || 0;
            const originalPrice = deal.originalPrice || deal.product?.originalPrice || 0;
            const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
            const soldCount = deal.soldCount ?? deal.sold ?? deal.unitsSold;

            return (
              <Link
                key={deal._id || deal.productId}
                to={deal.productId ? `/product/${deal.productId}` : "/products"}
                className="group w-44 shrink-0 overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md dark:border-red-900/60 dark:bg-gray-900 sm:w-52"
              >
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-800">
                  <img
                    src={deal.image || deal.product?.image || fallbackHeroImage}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {discount > 0 ? (
                    <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-extrabold text-white">
                      -{discount}%
                    </span>
                  ) : null}
                  {remainingStock <= 0 ? (
                    <span className="absolute inset-x-2 bottom-2 rounded bg-gray-950/80 px-2 py-1 text-center text-xs font-bold text-white">
                      {t("productCard.outOfStock")}
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-[2.7rem] text-sm font-bold leading-5 text-gray-950 dark:text-white">
                    {deal.title}
                  </p>
                  <p className="mt-2 text-base font-extrabold text-red-600">
                    {formatPrice(price)}
                  </p>
                  {originalPrice > price ? (
                    <p className="text-xs font-medium text-gray-500 line-through">
                      {formatPrice(originalPrice)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>{soldCount ? t("home.itemsSold", { count: soldCount }) : formatDuration(deal.endTime, now, t)}</span>
                    <span>{remainingStock} {t("home.left")}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${stockPercent}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CuratedCollections({ collections, t }) {
  if (!collections?.length) return null;

  return (
    <section className="bg-white py-8 dark:bg-gray-900 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            <BadgePercent className="h-3.5 w-3.5" />
            {t("home.collectionsLabel")}
          </p>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white md:text-3xl">
            {t("home.collectionsTitle")}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {collections.slice(0, 6).map((collection) => (
            <Link
              key={collection._id}
              to={collection.link || "/products"}
              className="group relative min-h-56 overflow-hidden rounded-lg bg-gray-900"
            >
              <img
                src={collection.imageUrl || collection.products?.[0]?.image || fallbackHeroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gray-950/50" />
              <div className="relative flex min-h-56 flex-col justify-between p-5">
                <div>
                  <h3 className="text-xl font-bold text-white">{collection.title}</h3>
                  {collection.subtitle ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/85">
                      {collection.subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex -space-x-2">
                    {(collection.products || []).slice(0, 4).map((product) => (
                      <img
                        key={product._id}
                        src={product.image || fallbackHeroImage}
                        alt=""
                        className="h-9 w-9 rounded-lg border-2 border-white object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                    {t("common.browse")}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FollowedVendorUpdates({ feed, t }) {
  if (feed?.requiresLogin) {
    return (
      <section className="py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <Store className="h-4 w-4" />
                  {t("home.followedVendorUpdates")}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("home.followedVendorLoginText")}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-950"
              >
                {t("common.signIn")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!feed?.updates?.length) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
            <Store className="h-3.5 w-3.5" />
            {t("home.shopsYouFollow")}
          </p>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white md:text-3xl">
            {t("home.vendorUpdates")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {feed.updates.slice(0, 8).map((update) => (
            <Link
              key={`${update.vendor?._id}-${update.product?._id}`}
              to={update.product?._id ? `/product/${update.product._id}` : "/products"}
              className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-primary-300 dark:border-gray-800 dark:bg-gray-900"
            >
              <img
                src={update.product?.image || fallbackHeroImage}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                  {update.vendor?.shopName}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-950 dark:text-white">
                  {update.product?.title}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{update.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [discovery, setDiscovery] = useState(emptyDiscovery);
  const [loading, setLoading] = useState(true);
  const [activeHero, setActiveHero] = useState(0);
  const [newArrivalCategory, setNewArrivalCategory] = useState("all");
  const [claimingReward, setClaimingReward] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { recentlyViewed } = useRecentlyViewed();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();

  const recentIdsParam = useMemo(
    () => recentlyViewed.map((product) => product._id).filter(Boolean).join(","),
    [recentlyViewed],
  );

  useEffect(() => {
    let ignore = false;

    const loadDiscovery = async () => {
      try {
        setLoading(true);
        const response = await getHomepageDiscovery({
          recentProductIds: recentIdsParam,
          categoryId: newArrivalCategory === "all" ? undefined : newArrivalCategory,
        });

        if (!ignore) {
          setDiscovery({ ...emptyDiscovery, ...(response.data.data || {}) });
        }
      } catch (error) {
        console.error("Failed to load homepage discovery:", error);
        if (!ignore) setDiscovery(emptyDiscovery);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDiscovery();
    return () => {
      ignore = true;
    };
  }, [newArrivalCategory, recentIdsParam, user?.uid]);

  useEffect(() => {
    if (discovery.heroBanners.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveHero((current) => (current + 1) % discovery.heroBanners.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [discovery.heroBanners.length]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClaimReward = async () => {
    if (!user || !discovery.dailyCheckIn?.canClaim) return;

    try {
      setClaimingReward(true);
      const response = await claimDailyCheckInReward();
      setDiscovery((current) => ({
        ...current,
        dailyCheckIn: response.data.data || current.dailyCheckIn,
      }));
    } catch (error) {
      if (error.response?.data?.data) {
        setDiscovery((current) => ({
          ...current,
          dailyCheckIn: error.response.data.data,
        }));
      } else {
        console.error("Failed to claim daily reward:", error);
      }
    } finally {
      setClaimingReward(false);
    }
  };

  const recentProducts = discovery.recentlyViewed.length ? discovery.recentlyViewed : recentlyViewed;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <CouponStrip coupons={discovery.promotionStrip} formatPrice={formatPrice} t={t} />
      <TopCategorySection categories={discovery.categories} t={t} />

      <section className="border-b border-gray-200 bg-white py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:px-8 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <CategoryPanel categories={discovery.categories} t={t} />
          <div className="min-w-0">
            <HeroCarousel
              banners={discovery.heroBanners}
              activeHero={activeHero}
              setActiveHero={setActiveHero}
              t={t}
            />
          </div>
          <div className="space-y-3">
            <DailyCheckInCard
              dailyCheckIn={discovery.dailyCheckIn}
              user={user}
              claiming={claimingReward}
              onClaim={handleClaimReward}
              t={t}
            />
            <FlashSummary flashSales={discovery.flashSales} now={now} formatPrice={formatPrice} t={t} />
            <TrendingMiniCard product={discovery.trendingNow?.[0]} formatPrice={formatPrice} t={t} />
          </div>
        </div>
      </section>

      <MarketplacePromiseStrip t={t} />
      <FlashSaleStrip flashSales={discovery.flashSales} now={now} formatPrice={formatPrice} t={t} />

      <ProductGridSection
        title={t("home.dealsYouCantMiss")}
        subtitle={discovery.meta?.personalized ? t("home.justForYou") : t("home.marketplacePicks")}
        icon={Sparkles}
        products={discovery.justForYou}
        loading={loading}
        actionLabel={t("common.viewAll")}
        tone="orange"
      />

      <ProductGridSection
        title={t("home.trendingNow")}
        subtitle={t("home.trendingSubtitle")}
        icon={TrendingUp}
        products={discovery.trendingNow}
        loading={loading}
        actionLabel={t("common.viewAll")}
        tone="blue"
      />

      <section className="py-6 md:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.newArrivalsSubtitle")}
              </p>
              <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white md:text-3xl">
                {t("home.newArrivals")}
              </h2>
            </div>
            <select
              value={newArrivalCategory}
              onChange={(event) => setNewArrivalCategory(event.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition focus:border-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              <option value="all">{t("common.allCategories")}</option>
              {discovery.categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : discovery.newArrivals.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {sectionProducts(discovery.newArrivals, 10).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {t("home.noNewArrivals")}
            </div>
          )}
        </div>
      </section>

      <CuratedCollections collections={discovery.curatedCollections} t={t} />
      <FollowedVendorUpdates feed={discovery.followedVendorUpdates} t={t} />

      <ProductGridSection
        title={t("home.recentlyViewed")}
        subtitle={t("home.recentlyViewedSubtitle")}
        icon={Clock}
        products={recentProducts}
        loading={false}
        actionTo="/products"
        actionLabel={t("common.keepBrowsing")}
        tone="emerald"
      />
    </div>
  );
}
