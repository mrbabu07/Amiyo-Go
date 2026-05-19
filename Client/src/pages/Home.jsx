import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgePercent,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Gift,
  HeartHandshake,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  WalletCards,
} from "lucide-react";
import { getHomepageDiscovery } from "../services/api";
import ProductCard from "../components/ProductCard";
import { ProductCardSkeleton } from "../components/Skeleton";
import { usePlatformConfig } from "../context/PlatformConfigContext";
import { useCurrency } from "../hooks/useCurrency";
import { getCategoryIcon, getCategoryImageSource, getCategoryTheme } from "../utils/categoryVisuals";

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

const getCountdownSegments = (targetDate, now) => {
  const end = targetDate ? new Date(targetDate).getTime() : 0;
  const remaining = Math.max(0, end - now);
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining / (60 * 1000)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return [
    { label: "H", value: String(hours).padStart(2, "0") },
    { label: "M", value: String(minutes).padStart(2, "0") },
    { label: "S", value: String(seconds).padStart(2, "0") },
  ];
};

const formatCompactCount = (value) => {
  const number = Number(value) || 0;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  return String(number);
};

const getDealImage = (deal) =>
  deal?.image || deal?.product?.image || deal?.product?.images?.[0] || fallbackHeroImage;

const getDealTitle = (deal, t) => deal?.title || deal?.product?.title || t("home.flashDealSpotlight");

function HeroActionPanel({ discovery, now, formatPrice, t }) {
  const headlineDeal = discovery.flashSales?.[0];
  const headlineCoupon = discovery.promotionStrip?.[0];
  const quickCategories = (discovery.categories || []).slice(0, 5);
  const dealPrice = headlineDeal?.flashPrice || headlineDeal?.product?.price || headlineDeal?.price || 0;
  const couponLabel = headlineCoupon
    ? headlineCoupon.discountType === "percentage"
      ? t("home.discountPercent", { value: headlineCoupon.discountValue })
      : t("home.discountFixed", { value: formatPrice(headlineCoupon.discountValue) })
    : t("home.activeVoucherFallback");

  return (
    <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <Link
        to={headlineDeal?.productId ? `/product/${headlineDeal.productId}` : "/products?deal=flash"}
        className="group relative min-h-[13rem] overflow-hidden rounded-lg bg-gray-950 p-4 text-white shadow-medium ring-1 ring-black/5"
      >
        <img
          src={getDealImage(headlineDeal)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/70 to-red-950/35" />
        <div className="relative flex min-h-[11rem] flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-black uppercase tracking-wide">
              <Flame className="h-3.5 w-3.5" />
              {t("home.flashDealSpotlight")}
            </span>
            <h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight">
              {getDealTitle(headlineDeal, t)}
            </h2>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/70">
                {formatDuration(headlineDeal?.endTime, now, t)}
              </p>
              {dealPrice ? (
                <p className="text-2xl font-black text-white">{formatPrice(dealPrice)}</p>
              ) : (
                <p className="text-lg font-black text-white">{t("home.shopDeal")}</p>
              )}
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-950 transition group-hover:translate-x-0.5">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </Link>

      <div className="grid gap-3">
        <Link
          to="/cart"
          className="group rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm transition hover:border-emerald-300 hover:bg-white dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:hover:bg-gray-900"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Gift className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                {t("home.activeVoucher")}
              </p>
              <p className="mt-1 text-base font-black text-gray-950 dark:text-white">
                {headlineCoupon?.code || t("home.voucherReady")}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {couponLabel}
              </p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-600 dark:text-primary-300">
                {t("home.exploreFast")}
              </p>
              <p className="mt-1 text-sm font-bold text-gray-950 dark:text-white">
                {t("home.exploreFastText")}
              </p>
            </div>
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickCategories.map((category) => (
              <Link
                key={category._id}
                to={`/category/${category.slug || category._id}`}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-primary-950/30"
              >
                {category.name}
              </Link>
            ))}
            <Link
              to="/products"
              className="rounded-lg bg-gray-950 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 dark:bg-white dark:text-gray-950"
            >
              {t("common.viewAll")}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MarketplacePulse({ discovery, t }) {
  const stats = [
    {
      label: t("home.activeDepartments"),
      value: formatCompactCount(discovery.categories?.length),
      Icon: ShoppingBag,
    },
    {
      label: t("home.liveDeals"),
      value: formatCompactCount(discovery.flashSales?.length),
      Icon: Flame,
    },
    {
      label: t("home.newToday"),
      value: formatCompactCount(discovery.newArrivals?.length),
      Icon: PackageCheck,
    },
    {
      label: t("home.sellerNetwork"),
      value: formatCompactCount(
        discovery.followedVendorUpdates?.vendors?.length ||
          discovery.followedVendorUpdates?.updates?.length ||
          discovery.trendingNow?.length,
      ),
      Icon: Store,
    },
  ];

  return (
    <div className="grid gap-2 rounded-lg bg-gray-950/80 p-2 ring-1 ring-white/10 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const StatIcon = stat.Icon;

        return (
          <div key={stat.label} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3 text-white ring-1 ring-white/10 backdrop-blur">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700">
              <StatIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none">{stat.value}</span>
              <span className="mt-1 block text-xs font-bold text-white/70">{stat.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HomepageHero({ discovery, activeHero, setActiveHero, now, formatPrice, t }) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f2f3e_0%,#123f52_48%,#f8fafc_48%,#f8fafc_100%)] pb-7 pt-4 dark:bg-[linear-gradient(135deg,#07131b_0%,#102a37_52%,#030712_52%,#030712_100%)] md:pb-9 md:pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <HeroCarousel
              banners={discovery.heroBanners}
              activeHero={activeHero}
              setActiveHero={setActiveHero}
              t={t}
            />
            <MarketplacePulse discovery={discovery} t={t} />
          </div>
          <HeroActionPanel discovery={discovery} now={now} formatPrice={formatPrice} t={t} />
        </div>
      </div>
    </section>
  );
}

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

function MarketplacePromiseStrip({ t }) {
  const promises = [
    {
      title: t("home.bestPrices"),
      text: t("home.bestPricesText"),
      Icon: BadgePercent,
    },
    {
      title: t("home.authenticProducts"),
      text: t("home.authenticProductsText"),
      Icon: HeartHandshake,
    },
    {
      title: t("home.securePayment"),
      text: t("home.securePaymentText"),
      Icon: WalletCards,
    },
    {
      title: t("home.fastDelivery"),
      text: t("home.fastDeliveryText"),
      Icon: Truck,
    },
  ];

  return (
    <section className="bg-slate-50 pb-4 pt-4 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((item) => {
            const PromiseIcon = item.Icon;

            return (
              <div
                key={item.title}
                className="group flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-primary-50 dark:hover:bg-gray-800"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100 transition group-hover:scale-105 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/60">
                  <PromiseIcon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-gray-950 dark:text-white">
                    {item.title}
                  </span>
                  <span className="line-clamp-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {item.text}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TopCategorySection({ categories, t }) {
  if (!categories?.length) return null;
  const visibleCategories = categories.slice(0, 14);

  return (
    <section className="sticky top-20 z-[120] border-b border-gray-200 bg-slate-50/95 py-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60">
                <Store className="h-4 w-4" />
              </span>
              <h2 className="truncate text-base font-extrabold text-gray-950 dark:text-white">
                {t("home.topCategories")}
              </h2>
            </div>

            <Link
              to="/categories"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-extrabold text-gray-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-200 dark:hover:border-orange-900 dark:hover:bg-orange-950/30 dark:hover:text-orange-100 dark:focus:ring-offset-gray-900"
            >
              {t("home.viewAllCategories")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex snap-x gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {visibleCategories.map((category, index) => {
              const Icon = getCategoryIcon(category);
              const imageSource = getCategoryImageSource(category);
              const theme = getCategoryTheme(category, index);

              return (
                <Link
                  key={category._id}
                  to={`/category/${category.slug || category._id}`}
                  className="group flex min-h-[6rem] w-24 shrink-0 snap-start flex-col items-center gap-2 rounded-lg border border-gray-100 bg-white p-2 text-center transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-900/70 dark:hover:bg-gray-800 dark:focus:ring-offset-gray-900 lg:w-20 xl:w-[5.75rem]"
                >
                  <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg ring-1 transition group-hover:scale-105 group-hover:bg-white group-hover:text-orange-700 dark:group-hover:bg-gray-900 dark:group-hover:text-orange-200 ${theme}`}>
                    {imageSource ? (
                      <img
                        src={imageSource}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
                    )}
                  </span>
                  <span className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-4 text-gray-700 transition group-hover:text-orange-700 dark:text-gray-200 dark:group-hover:text-orange-200">
                    {category.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
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
  const trustSignals = [
    { label: t("home.heroFastDelivery"), Icon: Truck },
    { label: t("home.heroCod"), Icon: WalletCards },
    { label: t("home.heroVerifiedSeller"), Icon: ShieldCheck },
  ];

  return (
    <div className="relative min-h-[26rem] overflow-hidden rounded-lg border border-white/70 bg-gray-900 shadow-medium dark:border-gray-800 sm:min-h-[25rem] lg:min-h-[30rem]">
      {slides.map((slide, index) => (
        <div
          key={slide.id || index}
          className={`absolute inset-0 transition-all duration-700 ease-out ${
            index === activeHero % slides.length ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"
          }`}
        >
          <img
            src={slide.imageUrl || fallbackHeroImage}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-[7000ms] ${
              index === activeHero % slides.length ? "scale-105" : "scale-100"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-950/40 to-gray-950/5" />
        </div>
      ))}

      <div className="relative flex min-h-[26rem] flex-col justify-end p-5 sm:min-h-[25rem] md:p-8 lg:min-h-[30rem]">
        <div className="max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {currentSlide.badge || t("home.featured")}
          </span>
          <h1 className="max-w-xl text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl">
            {currentSlide.title}
          </h1>
          {currentSlide.subtitle ? (
            <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-white/90 md:text-base">
              {currentSlide.subtitle}
            </p>
          ) : null}
          <Link
            to={currentSlide.link || "/products"}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {currentSlide.ctaText || t("home.shopNow")}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <div className="mt-5 hidden max-w-xl grid-cols-3 gap-2 sm:grid">
            {trustSignals.map((item) => {
              const SignalIcon = item.Icon;

              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur"
                >
                  <SignalIcon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
              );
            })}
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
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div key={activeHero} className="h-full w-full origin-left bg-primary-400 animate-home-hero-progress" />
          </div>
        </>
      ) : null}
    </div>
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
  const toneClasses = {
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  };

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-4">
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
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800 dark:border-gray-800 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products?.length ? (
          <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sectionProducts(products, 10).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              No products are ready in this section yet.
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Browse the full catalog while this collection is refreshed.
            </p>
            <Link
              to={actionTo}
              className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary-500 px-4 text-sm font-bold text-white transition hover:bg-primary-600"
            >
              {actionLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function FlashSaleStrip({ flashSales, now, formatPrice, t }) {
  if (!flashSales?.length) return null;
  const headlineDeal = flashSales[0];
  const countdownSegments = getCountdownSegments(headlineDeal.endTime, now);

  return (
    <section className="border-y border-red-200 bg-red-50 py-8 dark:border-red-900/60 dark:bg-red-950/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-4 rounded-xl border border-red-100 bg-white p-4 shadow-sm dark:border-red-900/60 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
              <Flame className="h-6 w-6 animate-pulse" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white dark:ring-gray-900" />
            </span>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/50 dark:text-red-200">
                <Clock className="h-3.5 w-3.5" />
                {t("home.liveCountdown")}
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-gray-950 dark:text-white md:text-2xl">
                {t("home.flashSale")}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {countdownSegments.map((segment, index) => (
                <span key={segment.label} className="flex items-center gap-1.5">
                  <span className="flex h-11 min-w-11 flex-col items-center justify-center rounded-lg bg-gray-950 px-2 text-white shadow-sm dark:bg-white dark:text-gray-950">
                    <span className="text-sm font-extrabold leading-none">{segment.value}</span>
                    <span className="mt-0.5 text-[10px] font-bold uppercase leading-none text-white/60 dark:text-gray-500">
                      {segment.label}
                    </span>
                  </span>
                  {index < countdownSegments.length - 1 ? (
                    <span className="text-base font-extrabold text-red-500">:</span>
                  ) : null}
                </span>
              ))}
            </div>
            <Link
              to="/products?deal=flash"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-bold text-white transition hover:bg-primary-600"
            >
              {t("common.seeAll")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex snap-x gap-3 overflow-x-auto pb-1 scrollbar-hide">
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
                className="group w-44 shrink-0 snap-start overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-red-300 hover:shadow-md dark:border-red-900/60 dark:bg-gray-900 sm:w-52"
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
                    <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${stockPercent}%` }} />
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
                  <BellRing className="h-4 w-4" />
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
            <BellRing className="h-3.5 w-3.5" />
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
  const [now, setNow] = useState(Date.now());
  const { formatPrice } = useCurrency();
  const { isShopDirectoryVisible } = usePlatformConfig();

  useEffect(() => {
    let ignore = false;

    const loadDiscovery = async () => {
      try {
        setLoading(true);
        const response = await getHomepageDiscovery({
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
  }, [newArrivalCategory]);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <HomepageHero
        discovery={discovery}
        activeHero={activeHero}
        setActiveHero={setActiveHero}
        now={now}
        formatPrice={formatPrice}
        t={t}
      />
      <MarketplacePromiseStrip t={t} />

      <TopCategorySection categories={discovery.categories} t={t} />
      <FlashSaleStrip flashSales={discovery.flashSales} now={now} formatPrice={formatPrice} t={t} />
      <CouponStrip coupons={discovery.promotionStrip} formatPrice={formatPrice} t={t} />

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

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.newArrivalsSubtitle")}
              </p>
              <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white md:text-3xl">
                {t("home.newArrivals")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
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
              <Link
                to="/products?sort=newest"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50 dark:border-gray-800 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
              >
                {t("common.seeAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : discovery.newArrivals.length ? (
            <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
      {isShopDirectoryVisible ? <FollowedVendorUpdates feed={discovery.followedVendorUpdates} t={t} /> : null}
    </div>
  );
}
