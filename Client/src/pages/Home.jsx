import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Navigation, Pagination } from "swiper/modules";
import {
  ChevronRight,
  CreditCard,
  Flame,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { getHomepageDiscovery, getProducts, getShops } from "../services/api";
import ProductCard from "../components/ProductCard";
import { ProductCardSkeleton } from "../components/Skeleton";
import { usePlatformConfig } from "../context/PlatformConfigContext";
import { useCurrency } from "../hooks/useCurrency";
import { getCategoryIcon, getCategoryImageSource, getCategoryTheme } from "../utils/categoryVisuals";

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1400&h=700&fit=crop";

const fallbackProductImage =
  "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=600&h=600&fit=crop";

const emptyDiscovery = {
  heroBanners: [],
  categories: [],
  adSlots: [],
  promotionStrip: [],
  flashSales: [],
  justForYou: [],
  trendingNow: [],
  newArrivals: [],
  curatedCollections: [],
  followedVendorUpdates: { requiresLogin: true, vendors: [], updates: [] },
  dailyCheckIn: { enabled: true, requiresLogin: true, canClaim: false, points: 5 },
};

const sectionProducts = (products = [], count = 10) => products.slice(0, count);

const productKey = (product) =>
  product?._id || product?.id || product?.slug || product?.title;

const productImage = (product) =>
  product?.image ||
  product?.images?.[0] ||
  product?.thumbnail ||
  product?.coverImage ||
  fallbackProductImage;

const getProductFromDeal = (deal) =>
  deal?.product
    ? {
        ...deal.product,
        price: deal.flashPrice || deal.product.price,
        originalPrice: deal.originalPrice || deal.product.originalPrice,
        isFlashSale: true,
        flashPrice: deal.flashPrice,
      }
    : deal;

const uniqueProducts = (groups = []) => {
  const products = new Map();

  groups.flat().forEach((row) => {
    const item = row?.product ? getProductFromDeal(row) : row;
    const key = productKey(item);
    if (key && !products.has(key)) products.set(key, item);
  });

  return Array.from(products.values());
};

const getCategoryPath = (category) => `/category/${category.slug || category._id}`;

const getDealPath = (deal) => {
  const productId = deal?.productId || deal?.product?._id || deal?._id;
  return productId ? `/product/${productId}` : "/products?deal=flash";
};

const getShopName = (shop) => shop?.shopName || shop?.displayName || shop?.name || "Shop";
const getShopPath = (shop) => (shop?.slug ? `/shops/${shop.slug}` : "/shops");
const getShopLogo = (shop) => shop?.logo || shop?.logoUrl || shop?.avatar || null;
const getShopBanner = (shop) => shop?.banner || shop?.bannerUrl || shop?.coverImage || null;

const formatCompactCount = (value) => {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  return String(number);
};

const getCountdownSegments = (targetDate, now) => {
  const end = targetDate ? new Date(targetDate).getTime() : 0;
  const remaining = Math.max(0, end - now);
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining / (60 * 1000)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return [
    { label: "Hrs", value: String(hours).padStart(2, "0") },
    { label: "Min", value: String(minutes).padStart(2, "0") },
    { label: "Sec", value: String(seconds).padStart(2, "0") },
  ];
};

const buildFeaturedBrands = (discovery, products) => {
  const brands = new Map();

  const addBrand = (brand) => {
    const name = String(brand?.name || brand?.title || "").trim();
    if (!name) return;

    const key = name.toLowerCase();
    const current = brands.get(key);
    brands.set(key, {
      name,
      image: current?.image || brand.image || brand.logo || brand.imageUrl || null,
      to: current?.to || brand.to || `/products?brand=${encodeURIComponent(name)}`,
      count: (current?.count || 0) + (brand.count || 1),
    });
  };

  (discovery.categories || []).forEach((category) => {
    (category.featuredBrands || category.brands || []).forEach((brand) => {
      if (typeof brand === "string") {
        addBrand({ name: brand });
        return;
      }
      addBrand(brand);
    });
  });

  products.forEach((product) => {
    const name =
      product?.brand?.name ||
      product?.brandName ||
      product?.brand ||
      product?.attributes?.brand ||
      product?.vendor?.shopName ||
      product?.vendorName ||
      product?.vendorShopName;

    addBrand({
      name,
      image:
        product?.brand?.logo ||
        product?.brandLogo ||
        product?.vendorLogo ||
        product?.vendor?.logo ||
        productImage(product),
    });
  });

  if (!brands.size) {
    [
      { name: "Amiyo-Go", image: fallbackHeroImage, to: "/products?sort=featured" },
      { name: "Verified Sellers", to: "/shops" },
      { name: "Flash Deals", to: "/products?deal=flash" },
      { name: "New Arrivals", to: "/products?sort=newest" },
    ].forEach(addBrand);
  }

  return Array.from(brands.values()).slice(0, 14);
};

function SectionHeader({ eyebrow, title, actionTo = "/products", actionLabel, dark = false }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className={`text-xs font-black uppercase tracking-wide ${
              dark ? "text-orange-200" : "text-[#F57224]"
            }`}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={`mt-1 text-xl font-black tracking-normal sm:text-2xl ${
            dark ? "text-white" : "text-[#1A1A2E] dark:text-white"
          }`}
        >
          {title}
        </h2>
      </div>
      {actionLabel ? (
        <Link
          to={actionTo}
          className={`inline-flex h-10 shrink-0 items-center gap-1 rounded-md border px-3 text-sm font-extrabold transition ${
            dark
              ? "border-white/20 text-white hover:bg-white/10"
              : "border-[#E0E0E0] bg-white text-[#1A1A2E] hover:border-[#F57224] hover:text-[#F57224] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          }`}
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function HeroBannerSlider({ banners, ads, t }) {
  const slides = banners?.length
    ? banners
    : [
        {
          id: "fallback",
          title: t("home.fallbackHeroTitle", "Shop smarter across Bangladesh"),
          subtitle: t(
            "home.fallbackHeroSubtitle",
            "Find trusted sellers, fresh deals, and everyday essentials on Amiyo-Go.",
          ),
          badge: t("home.fallbackHeroBadge", "Marketplace picks"),
          imageUrl: fallbackHeroImage,
          link: "/products",
          ctaText: t("home.shopNow", "Shop now"),
        },
      ];

  const sideAds = (ads || []).filter((ad) => ad?.imageUrl).slice(0, 2);

  return (
    <section className="bg-[#F5F5F5] py-4 dark:bg-gray-950">
      <div
        className={`mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:px-8 ${
          sideAds.length ? "lg:grid-cols-[minmax(0,1fr)_260px]" : ""
        }`}
      >
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Swiper
            modules={[A11y, Autoplay, Navigation, Pagination]}
            className="home-hero-swiper h-full"
            loop={slides.length > 1}
            navigation={slides.length > 1}
            pagination={{ clickable: true }}
            autoplay={
              slides.length > 1
                ? { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }
                : false
            }
          >
            {slides.map((slide, index) => (
              <SwiperSlide key={slide.id || slide._id || index}>
                <Link
                  to={slide.link || "/products"}
                  className="group relative block min-h-[270px] overflow-hidden bg-[#1A1A2E] sm:min-h-[350px] lg:min-h-[430px]"
                >
                  <img
                    src={slide.imageUrl || slide.image || fallbackHeroImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding={index === 0 ? "sync" : "async"}
                    fetchPriority={index === 0 ? "high" : "low"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A2E]/92 via-[#1A1A2E]/58 to-transparent" />
                  <div className="relative flex min-h-[270px] max-w-2xl flex-col justify-center px-5 py-8 sm:min-h-[350px] sm:px-8 lg:min-h-[430px]">
                    <span className="mb-4 inline-flex w-fit items-center rounded-md bg-[#F57224] px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                      {slide.badge || t("home.featured", "Featured")}
                    </span>
                    <h1 className="max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                      {slide.title || t("home.marketplacePicks", "Marketplace picks")}
                    </h1>
                    {slide.subtitle ? (
                      <p className="mt-4 line-clamp-3 max-w-lg text-sm font-medium leading-6 text-white/85 sm:text-base">
                        {slide.subtitle}
                      </p>
                    ) : null}
                    <span className="mt-6 inline-flex h-11 w-fit items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#1A1A2E] transition group-hover:bg-[#F57224] group-hover:text-white">
                      {slide.ctaText || t("home.shopNow", "Shop now")}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {sideAds.length ? (
          <aside className={`grid gap-4 sm:grid-cols-2 lg:h-full lg:grid-cols-1 ${sideAds.length === 2 ? "lg:grid-rows-2" : ""}`}>
            {sideAds.map((ad, index) => (
              <Link
                key={ad.id || `${ad.title}-${index}`}
                to={ad.link || "/products"}
                className="group relative flex min-h-36 overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#1A1A2E] p-4 shadow-sm dark:border-gray-800 lg:min-h-0"
              >
                <img
                  src={ad.imageUrl || fallbackHeroImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-35 transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#F57224]/88 via-[#1A1A2E]/78 to-[#1A1A2E]/88" />
                <div className="relative flex min-h-28 flex-1 flex-col justify-between lg:min-h-0">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-white/75">
                      {ad.badge || t("home.sponsored", "Sponsored")}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-black text-white">
                      {ad.title}
                    </h3>
                  </div>
                  <span className="mt-3 inline-flex items-center justify-between gap-2 text-sm font-black text-white">
                    <span className="line-clamp-1">{ad.subtitle || ad.ctaText || t("home.shopNow", "Shop now")}</span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </span>
                </div>
              </Link>
            ))}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function CategoryIconStrip({ categories, t }) {
  if (!categories?.length) return null;

  return (
    <section className="bg-white py-4 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.exploreDepartments", "Explore departments")}
          title={t("home.categories", "Categories")}
          actionTo="/categories"
          actionLabel={t("common.viewAll", "View all")}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {categories.slice(0, 20).map((category, index) => {
            const CategoryIcon = getCategoryIcon(category);
            const image = getCategoryImageSource(category);
            const theme = getCategoryTheme(category, index);

            return (
              <Link
                key={category._id || category.slug || category.name}
                to={getCategoryPath(category)}
                className="group flex min-h-[8.75rem] flex-col rounded-lg border border-[#E0E0E0] bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#F57224] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-[#EEEEEE] dark:bg-gray-800">
                  {image ? (
                    <img
                      src={image}
                      alt={category.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className={`flex h-full w-full items-center justify-center ring-1 ring-inset ${theme}`}>
                      <CategoryIcon className="h-9 w-9" />
                    </span>
                  )}
                  {image ? (
                    <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#F57224] shadow-sm ring-1 ring-black/5 dark:bg-gray-950">
                      <CategoryIcon className="h-4.5 w-4.5" />
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 line-clamp-2 min-h-9 text-xs font-black leading-[1.1rem] text-[#1A1A2E] group-hover:text-[#F57224] dark:text-white">
                  {category.name}
                </span>
                {Number(category.productCount) > 0 ? (
                  <span className="mt-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {formatCompactCount(category.productCount)} items
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FlashSaleCard({ deal, formatPrice }) {
  const price = deal.flashPrice || deal.product?.price || deal.price || 0;
  const originalPrice = deal.originalPrice || deal.product?.originalPrice || 0;
  const discount =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const remainingStock = Number(deal.remainingStock ?? deal.stock ?? 0);
  const totalStock = Number(deal.totalStock ?? deal.stockLimit ?? 0);
  const soldStock = Math.max(0, totalStock - remainingStock);
  const stockPercent = totalStock
    ? Math.max(8, Math.min(100, (soldStock / totalStock) * 100))
    : 46;

  return (
    <Link
      to={getDealPath(deal)}
      className="group w-40 shrink-0 snap-start overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#F57224] hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:w-48"
    >
      <div className="relative aspect-square overflow-hidden bg-[#F5F5F5] dark:bg-gray-800">
        <img
          src={deal.image || deal.product?.image || deal.product?.images?.[0] || fallbackProductImage}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {discount ? (
          <span className="absolute left-2 top-2 rounded bg-[#F57224] px-2 py-1 text-xs font-black text-white shadow-sm">
            -{discount}%
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#1A1A2E] dark:text-white">
          {deal.title || deal.product?.title || "Flash deal"}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black text-[#F57224]">{formatPrice(price)}</span>
          {originalPrice > price ? (
            <span className="text-xs font-semibold text-gray-400 line-through">
              {formatPrice(originalPrice)}
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#EEEEEE]">
            <div className="h-full rounded-full bg-[#F57224]" style={{ width: `${stockPercent}%` }} />
          </div>
          <p className="mt-1 text-xs font-bold text-gray-500">
            {totalStock
              ? `${formatCompactCount(soldStock)} sold`
              : "Selling fast"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function FlashSaleSection({ flashSales, now, formatPrice, t }) {
  if (!flashSales?.length) return null;

  const countdownSegments = getCountdownSegments(flashSales[0]?.endTime, now);

  return (
    <section className="bg-[#F5F5F5] py-6 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-orange-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-md bg-[#F57224] text-white shadow-sm">
                <Flame className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#00B14F] ring-2 ring-white dark:ring-gray-900" />
              </span>
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#F57224] dark:bg-orange-950/30 dark:text-orange-200">
                  <span className="h-2 w-2 rounded-full bg-[#00B14F]" />
                  {t("home.liveCountdown", "Live countdown")}
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#1A1A2E] dark:text-white">
                  {t("home.flashSale", "Flash Sale")}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 dark:border-orange-900/50 dark:bg-orange-950/20">
                <span className="hidden text-xs font-black uppercase tracking-wide text-[#1A1A2E] dark:text-orange-100 sm:inline">
                  {t("home.endsIn", "Ends in")}
                </span>
                <div className="flex items-center gap-1.5">
                  {countdownSegments.map((segment, index) => (
                    <span key={segment.label} className="flex items-center gap-1.5">
                      <span className="flex h-10 min-w-11 flex-col items-center justify-center rounded-md bg-[#1A1A2E] px-2 text-white shadow-sm">
                        <span className="text-sm font-black leading-none">{segment.value}</span>
                        <span className="mt-0.5 text-[9px] font-black uppercase leading-none text-white/55">
                          {segment.label}
                        </span>
                      </span>
                      {index < countdownSegments.length - 1 ? (
                        <span className="font-black text-[#F57224]">:</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to="/products?deal=flash"
                className="inline-flex h-10 items-center gap-1 rounded-md bg-[#F57224] px-3 text-sm font-black text-white transition hover:bg-orange-600"
              >
                {t("common.seeAll", "See all")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex snap-x gap-3 overflow-x-auto px-4 py-4 scrollbar-hide">
            {flashSales.map((deal) => (
              <FlashSaleCard
                key={deal._id || deal.productId || deal.product?._id}
                deal={deal}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedBrandsStrip({ brands, t }) {
  if (!brands?.length) return null;

  return (
    <section className="bg-white py-5 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.featuredBrands", "Featured brands")}
          title={t("home.shopByBrand", "Shop by brand")}
          actionTo="/products"
          actionLabel={t("common.viewAll", "View all")}
        />
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {brands.map((brand) => (
            <Link
              key={brand.name}
              to={brand.to}
              className="group flex h-24 w-36 shrink-0 flex-col items-center justify-center rounded-lg border border-[#E0E0E0] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#F57224] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-md bg-[#F5F5F5] dark:bg-gray-800">
                {brand.image ? (
                  <img
                    src={brand.image}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Store className="h-5 w-5 text-gray-400" />
                )}
              </span>
              <span className="mt-2 line-clamp-1 text-xs font-black text-[#1A1A2E] group-hover:text-[#F57224] dark:text-white">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function MainFeed({ products, loading, t }) {
  return (
    <section className="bg-[#F5F5F5] py-6 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <SectionHeader
            eyebrow={t("home.productFeed", "Product feed")}
            title={t("home.marketplacePicks", "Marketplace picks")}
            actionTo="/products"
            actionLabel={t("common.viewAll", "View all")}
          />

          {loading ? (
            <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 15 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : products?.length ? (
            <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {sectionProducts(products, 15).map((product) => (
                <ProductCard key={productKey(product)} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#E0E0E0] bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <ShoppingBag className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-3 text-sm font-black text-[#1A1A2E] dark:text-white">
                {t("home.noProductsReady", "No products are ready in this section yet.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductGridSection({ title, eyebrow, products, loading, t }) {
  return (
    <section className="bg-white py-6 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          actionTo="/products"
          actionLabel={t("common.viewAll", "View all")}
        />
        {loading ? (
          <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products?.length ? (
          <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sectionProducts(products, 10).map((product) => (
              <ProductCard key={productKey(product)} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#E0E0E0] bg-[#F5F5F5] p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-black text-[#1A1A2E] dark:text-white">
              {t("home.noProductsReady", "No products are ready in this section yet.")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function TopShopsStrip({ shops, loading, t }) {
  return (
    <section className="bg-[#F5F5F5] py-6 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("home.topShops", "Top shops")}
          title={t("home.shopTrustedSellers", "Shop trusted sellers")}
          actionTo="/shops"
          actionLabel={t("common.viewAll", "View all")}
        />

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 w-64 shrink-0 animate-pulse rounded-lg bg-[#EEEEEE] dark:bg-gray-800"
              />
            ))}
          </div>
        ) : shops?.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {shops.slice(0, 10).map((shop) => {
              const name = getShopName(shop);
              const logo = getShopLogo(shop);
              const banner = getShopBanner(shop);
              const rating = Number(shop.rating || 0);

              return (
                <Link
                  key={shop._id || shop.slug || name}
                  to={getShopPath(shop)}
                  className="group w-64 shrink-0 overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#F57224] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="relative h-24 overflow-hidden bg-[#1A1A2E]">
                    {banner ? (
                      <img
                        src={banner}
                        alt=""
                        className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/80 to-transparent" />
                    {shop.isVerified ? (
                      <span className="absolute right-3 top-3 rounded bg-white px-2 py-1 text-[10px] font-black uppercase text-[#00B14F]">
                        {t("home.verified", "Verified")}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <div className="-mt-10 mb-3 flex items-end justify-between">
                      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-4 border-white bg-[#EEEEEE] shadow-sm dark:border-gray-900 dark:bg-gray-800">
                        {logo ? (
                          <img src={logo} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <Store className="h-7 w-7 text-gray-400" />
                        )}
                      </span>
                      <span className="flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-black text-[#F57224]">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {rating ? rating.toFixed(1) : t("home.new", "New")}
                      </span>
                    </div>
                    <h3 className="line-clamp-1 text-base font-black text-[#1A1A2E] group-hover:text-[#F57224] dark:text-white">
                      {name}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {shop.productCount || 0} {t("home.products", "products")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TrustSignalsBar({ t }) {
  const signals = [
    {
      title: t("home.fastDelivery", "Fast delivery"),
      text: t("home.fastDeliveryText", "Nationwide shipping"),
      Icon: Truck,
      color: "text-[#F57224] bg-orange-50",
    },
    {
      title: t("home.securePayment", "Secure payment"),
      text: t("home.securePaymentText", "Protected checkout"),
      Icon: CreditCard,
      color: "text-[#00B14F] bg-green-50",
    },
    {
      title: t("home.easyReturn", "Easy return"),
      text: t("home.easyReturnText", "Simple return support"),
      Icon: RotateCcw,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: t("home.genuineProducts", "Genuine products"),
      text: t("home.genuineProductsText", "Trusted marketplace"),
      Icon: ShieldCheck,
      color: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <section className="border-y border-[#E0E0E0] bg-white py-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {signals.map(({ title, text, Icon, color }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-[#1A1A2E] dark:text-white">
                {title}
              </span>
              <span className="line-clamp-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {text}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { isShopDirectoryVisible } = usePlatformConfig();
  const [discovery, setDiscovery] = useState(emptyDiscovery);
  const [mainProducts, setMainProducts] = useState([]);
  const [topShops, setTopShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let ignore = false;

    const loadDiscovery = async () => {
      try {
        setLoading(true);
        const response = await getHomepageDiscovery();
        if (!ignore) setDiscovery({ ...emptyDiscovery, ...(response.data?.data || {}) });
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
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        const response = await getProducts({ limit: 24, sort: "popular" });
        const data = response.data?.data || [];
        const products = Array.isArray(data) ? data : data.products || data.items || [];
        if (!ignore) setMainProducts(products);
      } catch (error) {
        console.error("Failed to load homepage products:", error);
        if (!ignore) setMainProducts([]);
      } finally {
        if (!ignore) setProductsLoading(false);
      }
    };

    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isShopDirectoryVisible) {
      setTopShops([]);
      return undefined;
    }

    let ignore = false;

    const loadTopShops = async () => {
      try {
        setShopsLoading(true);
        const response = await getShops({ limit: 10, sort: "popular" });
        const rows = response.data?.data || [];
        if (!ignore) setTopShops(Array.isArray(rows) ? rows : rows.shops || []);
      } catch (error) {
        console.error("Failed to load top shops:", error);
        if (!ignore) setTopShops([]);
      } finally {
        if (!ignore) setShopsLoading(false);
      }
    };

    loadTopShops();
    return () => {
      ignore = true;
    };
  }, [isShopDirectoryVisible]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allDiscoveryProducts = useMemo(
    () =>
      uniqueProducts([
        discovery.justForYou,
        discovery.trendingNow,
        discovery.newArrivals,
        discovery.flashSales,
      ]),
    [discovery.flashSales, discovery.justForYou, discovery.newArrivals, discovery.trendingNow],
  );

  const feedProducts = useMemo(
    () => uniqueProducts([mainProducts, allDiscoveryProducts]),
    [mainProducts, allDiscoveryProducts],
  );

  const featuredBrands = useMemo(
    () => buildFeaturedBrands(discovery, feedProducts),
    [discovery, feedProducts],
  );

  const recommendedProducts = discovery.justForYou?.length
    ? discovery.justForYou
    : allDiscoveryProducts;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A2E] dark:bg-gray-950">
      <HeroBannerSlider
        banners={discovery.heroBanners}
        ads={discovery.adSlots}
        t={t}
      />

      <CategoryIconStrip categories={discovery.categories} t={t} />

      <FlashSaleSection
        flashSales={discovery.flashSales}
        now={now}
        formatPrice={formatPrice}
        t={t}
      />

      <FeaturedBrandsStrip brands={featuredBrands} t={t} />

      <MainFeed
        products={feedProducts}
        loading={productsLoading && loading}
        t={t}
      />

      <ProductGridSection
        title={t("home.recommendedForYou", "Recommended For You")}
        eyebrow={t("home.basedOnMarketplace", "Based on marketplace activity")}
        products={recommendedProducts}
        loading={loading}
        t={t}
      />

      {isShopDirectoryVisible ? (
        <TopShopsStrip shops={topShops} loading={shopsLoading} t={t} />
      ) : null}

      <TrustSignalsBar t={t} />
    </div>
  );
}
