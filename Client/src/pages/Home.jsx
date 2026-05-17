import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Flame,
  Gift,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
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

function CouponStrip({ coupons, formatPrice, t }) {
  if (!coupons?.length) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {coupons.map((coupon) => (
          <Link
            key={coupon._id || coupon.code}
            to="/products"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:border-amber-300 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-100"
          >
            <Tag className="h-4 w-4" />
            <span>{coupon.code}</span>
            <span className="text-amber-700 dark:text-amber-300">
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

function CategoryQuickAccess({ categories }) {
  if (!categories?.length) return null;

  return (
    <div className="sticky top-16 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center gap-3 py-2">
          {categories.map((category) => (
            <Link
              key={category._id}
              to={category.slug ? `/products?category=${category.slug}` : `/products?category=${category._id}`}
              className="group flex w-24 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
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
              <span className="line-clamp-2 text-xs font-medium leading-tight text-gray-700 group-hover:text-primary-600 dark:text-gray-200">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
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
    <div className="relative min-h-[320px] overflow-hidden rounded-lg bg-gray-900 md:min-h-[380px]">
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
          <div className="absolute inset-0 bg-gray-950/45" />
        </div>
      ))}

      <div className="relative flex min-h-[320px] flex-col justify-end p-5 md:min-h-[380px] md:p-8">
        <div className="max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-900">
            <Sparkles className="h-3.5 w-3.5" />
            {currentSlide.badge || t("home.featured")}
          </span>
          <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
            {currentSlide.title}
          </h1>
          {currentSlide.subtitle ? (
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 md:text-base">
              {currentSlide.subtitle}
            </p>
          ) : null}
          <Link
            to={currentSlide.link || "/products"}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-950 shadow-sm transition hover:bg-gray-100"
          >
            {currentSlide.ctaText || t("home.shopNow")}
            <ChevronRight className="h-4 w-4" />
          </Link>
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
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
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950"
        >
          <Gift className="h-4 w-4" />
          {t("home.signInToCollect")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClaim}
          disabled={!dailyCheckIn.canClaim || claiming}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
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

  return (
    <Link
      to={firstDeal.productId ? `/product/${firstDeal.productId}` : "/products"}
      className="block overflow-hidden rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm transition hover:border-red-300 dark:border-red-900/70 dark:bg-red-950/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
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
      <div className="mt-3 flex items-center justify-between text-xs font-medium text-red-700 dark:text-red-300">
        <span>{firstDeal.remainingStock} {t("home.left")}</span>
        <span>{formatDuration(firstDeal.endTime, now, t)}</span>
      </div>
    </Link>
  );
}

function ProductGridSection({ title, subtitle, icon: Icon, products, loading, actionTo = "/products", actionLabel = "View all" }) {
  if (!loading && !products?.length) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {subtitle}
            </p>
            <h2 className="text-2xl font-bold text-gray-950 dark:text-white md:text-3xl">
              {title}
            </h2>
          </div>
          <Link
            to={actionTo}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-300"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sectionProducts(products).map((product) => (
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

  return (
    <section className="border-y border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 dark:bg-red-900/40 dark:text-red-200">
              <Clock className="h-3.5 w-3.5" />
              {t("home.liveCountdown")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
              {t("home.flashSale")}
            </h2>
          </div>
          <Link to="/products?deal=flash" className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
            {t("common.seeAll")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-1">
          {flashSales.map((deal) => {
            const stockPercent = deal.totalStock
              ? Math.max(0, Math.min(100, (deal.remainingStock / deal.totalStock) * 100))
              : 0;

            return (
              <Link
                key={deal._id || deal.productId}
                to={deal.productId ? `/product/${deal.productId}` : "/products"}
                className="w-64 shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-3 transition hover:border-red-300 hover:bg-red-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-red-900 dark:hover:bg-red-950/20"
              >
                <div className="flex gap-3">
                  <img
                    src={deal.image || deal.product?.image || fallbackHeroImage}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-950 dark:text-white">
                      {deal.title}
                    </p>
                    <p className="mt-1 text-sm font-bold text-red-600">
                      {formatPrice(deal.flashPrice || deal.product?.price || 0)}
                    </p>
                    {deal.originalPrice > deal.flashPrice ? (
                      <p className="text-xs text-gray-500 line-through">
                        {formatPrice(deal.originalPrice)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
                  <span>{formatDuration(deal.endTime, now, t)}</span>
                  <span>{deal.remainingStock} {t("home.left")}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${stockPercent}%` }} />
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <CouponStrip coupons={discovery.promotionStrip} formatPrice={formatPrice} t={t} />
      <CategoryQuickAccess categories={discovery.categories} />

      <section className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="lg:col-span-2">
            <HeroCarousel
              banners={discovery.heroBanners}
              activeHero={activeHero}
              setActiveHero={setActiveHero}
              t={t}
            />
          </div>
          <div className="space-y-4">
            <DailyCheckInCard
              dailyCheckIn={discovery.dailyCheckIn}
              user={user}
              claiming={claimingReward}
              onClaim={handleClaimReward}
              t={t}
            />
            <FlashSummary flashSales={discovery.flashSales} now={now} formatPrice={formatPrice} t={t} />
            {discovery.trendingNow?.[0] ? (
              <Link
                to={`/product/${discovery.trendingNow[0]._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary-300 dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <TrendingUp className="h-4 w-4" />
                  {t("home.trendingNow")}
                </p>
                <div className="mt-3 flex gap-3">
                  <img
                    src={discovery.trendingNow[0].image || fallbackHeroImage}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-950 dark:text-white">
                      {discovery.trendingNow[0].title}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary-600 dark:text-primary-300">
                      {formatPrice(discovery.trendingNow[0].price)}
                    </p>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <FlashSaleStrip flashSales={discovery.flashSales} now={now} formatPrice={formatPrice} t={t} />

      <ProductGridSection
        title={t("home.justForYou")}
        subtitle={discovery.meta?.personalized ? t("home.basedOnActivity") : t("home.marketplacePicks")}
        icon={Sparkles}
        products={discovery.justForYou}
        loading={loading}
        actionLabel={t("common.viewAll")}
      />

      <ProductGridSection
        title={t("home.trendingNow")}
        subtitle={t("home.trendingSubtitle")}
        icon={TrendingUp}
        products={discovery.trendingNow}
        loading={loading}
        actionLabel={t("common.viewAll")}
      />

      <section className="bg-white py-8 dark:bg-gray-900 md:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.newArrivalsSubtitle")}
              </p>
              <h2 className="text-2xl font-bold text-gray-950 dark:text-white md:text-3xl">
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : discovery.newArrivals.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {sectionProducts(discovery.newArrivals).map((product) => (
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
      />
    </div>
  );
}
