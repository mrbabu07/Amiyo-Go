import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  Copy,
  ExternalLink,
  Facebook,
  Gift,
  Globe,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Store,
  Truck,
  Users,
  Youtube,
} from "lucide-react";
import toast from "react-hot-toast";
import ProductCard from "../components/ProductCard";
import { ShopLocationMap } from "../components/shops/ShopMaps";
import { usePlatformConfig } from "../context/PlatformConfigContext";
import useAuth from "../hooks/useAuth";
import {
  followShop,
  getShopBySlug,
  getShopFollowStatus,
  getShopProducts,
  getShopReviews,
  getPublicVendorMarketingItems,
  unfollowShop,
} from "../services/api";
import { isCampaignDecorationActive, themeFor } from "../utils/shopDecoration";

const numberFormat = new Intl.NumberFormat("en-BD");

const tabs = ["products", "about", "location", "reviews"];

const shortDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
};

const cropPosition = (crop = {}) => `${crop.x ?? 50}% ${crop.y ?? 50}%`;

const cropScale = (crop = {}) => Math.max(1, Number(crop.zoom || 100) / 100);

const idOf = (value) => value?._id?.toString?.() || value?.toString?.() || String(value || "");

const productId = (product) => idOf(product?._id);

function Stars({ rating = 0, size = "h-4 w-4" }) {
  const score = Number(rating || 0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${size} ${index + 1 <= Math.round(score) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
        />
      ))}
    </span>
  );
}

function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="aspect-square animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2 p-3">
            <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PolicyBlock({ icon: Icon, title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {Icon ? createElement(Icon, { className: "h-5 w-5" }) : null}
        </span>
        <h3 className="text-base font-extrabold text-slate-950 dark:text-white">{title}</h3>
      </div>
      <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

export default function ShopDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isShopDirectoryVisible, loading: platformConfigLoading } = usePlatformConfig();
  const reviewsRef = useRef(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [productState, setProductState] = useState({
    items: [],
    loading: true,
    pagination: { currentPage: 1, totalPages: 1, hasNext: false },
  });
  const [productFilters, setProductFilters] = useState({
    search: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    sort: "newest",
    page: 1,
  });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviews, setReviews] = useState({
    loading: true,
    averageRating: 0,
    reviewCount: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    rows: [],
    pagination: { currentPage: 1, totalPages: 1, hasNext: false },
  });
  const [marketingItems, setMarketingItems] = useState([]);
  const [decorationProducts, setDecorationProducts] = useState([]);

  const decoration = shop?.shopDecoration || {};
  const rawFeaturedProductIds = decoration.featuredCarousel?.productIds;
  const categoryOptions = useMemo(() => shop?.categories || [], [shop?.categories]);
  const hasLocation = Number.isFinite(Number(shop?.location?.lat)) && Number.isFinite(Number(shop?.location?.lng));
  const activeCampaign = useMemo(
    () => (isCampaignDecorationActive(decoration.campaignMode) ? decoration.campaignMode : null),
    [decoration.campaignMode],
  );
  const liveTheme = themeFor(activeCampaign?.theme || decoration.bannerColor);
  const approvedVouchers = useMemo(
    () => marketingItems.filter((item) => item.type === "voucher" && item.status === "approved"),
    [marketingItems],
  );
  const highlightedVoucher = decoration.couponBanner?.enabled
    ? approvedVouchers.find((voucher) => idOf(voucher._id) === decoration.couponBanner?.voucherId) || approvedVouchers[0]
    : null;
  const featuredProductKey = useMemo(() => (rawFeaturedProductIds || []).map(String).filter(Boolean).join("|"), [rawFeaturedProductIds]);
  const featuredProductIds = useMemo(() => (featuredProductKey ? featuredProductKey.split("|") : []), [featuredProductKey]);
  const featuredProducts = useMemo(() => {
    if (!featuredProductIds.length) return [];
    const byId = new Map([...decorationProducts, ...productState.items].map((product) => [productId(product), product]));
    return featuredProductIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 8);
  }, [decorationProducts, featuredProductIds, productState.items]);

  useEffect(() => {
    if (platformConfigLoading || !isShopDirectoryVisible) {
      if (!platformConfigLoading && !isShopDirectoryVisible) setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const loadShop = async () => {
      setLoading(true);
      try {
        const response = await getShopBySlug(slug);
        if (!cancelled) setShop(response.data?.data || null);
      } catch (error) {
        console.error("Failed to load shop:", error);
        if (!cancelled) toast.error("Shop not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadShop();
    return () => {
      cancelled = true;
    };
  }, [slug, isShopDirectoryVisible, platformConfigLoading]);

  useEffect(() => {
    if (!isShopDirectoryVisible) return undefined;
    if (!user || !slug) {
      setFollowing(false);
      return;
    }

    getShopFollowStatus(slug)
      .then((response) => setFollowing(Boolean(response.data?.data?.following)))
      .catch(() => setFollowing(false));
  }, [slug, user, isShopDirectoryVisible]);

  useEffect(() => {
    if (!shop?._id) {
      setMarketingItems([]);
      return undefined;
    }

    let cancelled = false;
    getPublicVendorMarketingItems(shop._id)
      .then((response) => {
        if (!cancelled) setMarketingItems(response.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setMarketingItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [shop?._id]);

  useEffect(() => {
    if (!featuredProductIds.length || platformConfigLoading || !isShopDirectoryVisible || !slug) {
      setDecorationProducts([]);
      return undefined;
    }

    let cancelled = false;
    getShopProducts(slug, { limit: 60, sort: "newest" })
      .then((response) => {
        if (!cancelled) setDecorationProducts(response.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setDecorationProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [featuredProductIds, isShopDirectoryVisible, platformConfigLoading, slug]);

  useEffect(() => {
    if (platformConfigLoading || !isShopDirectoryVisible) {
      setProductState((current) => ({ ...current, items: [], loading: false }));
      return undefined;
    }

    let cancelled = false;
    const loadProducts = async () => {
      setProductState((current) => ({ ...current, loading: true }));
      try {
        const response = await getShopProducts(slug, { ...productFilters, limit: 16 });
        if (!cancelled) {
          setProductState({
            items: response.data?.data || [],
            loading: false,
            pagination: response.data?.pagination || { currentPage: 1, totalPages: 1, hasNext: false },
          });
        }
      } catch (error) {
        console.error("Failed to load shop products:", error);
        if (!cancelled) {
          setProductState((current) => ({ ...current, items: [], loading: false }));
        }
      }
    };

    if (slug) loadProducts();
    return () => {
      cancelled = true;
    };
  }, [slug, productFilters, isShopDirectoryVisible, platformConfigLoading]);

  useEffect(() => {
    if (platformConfigLoading || !isShopDirectoryVisible) {
      setReviews((current) => ({ ...current, rows: [], loading: false }));
      return undefined;
    }

    let cancelled = false;
    const loadReviews = async () => {
      setReviews((current) => ({ ...current, loading: true }));
      try {
        const response = await getShopReviews(slug, { page: reviewPage, limit: 10 });
        const data = response.data?.data || {};
        if (!cancelled) {
          setReviews({
            loading: false,
            averageRating: data.averageRating || 0,
            reviewCount: data.reviewCount || 0,
            ratingBreakdown: data.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            rows: data.reviews || [],
            pagination: response.data?.pagination || { currentPage: 1, totalPages: 1, hasNext: false },
          });
        }
      } catch (error) {
        console.error("Failed to load shop reviews:", error);
        if (!cancelled) setReviews((current) => ({ ...current, loading: false }));
      }
    };

    if (slug) loadReviews();
    return () => {
      cancelled = true;
    };
  }, [slug, reviewPage, isShopDirectoryVisible, platformConfigLoading]);

  const handleFollow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setFollowBusy(true);
    try {
      const response = following ? await unfollowShop(slug) : await followShop(slug);
      const data = response.data?.data || {};
      setFollowing(Boolean(data.following));
      setShop((current) => current ? { ...current, followerCount: data.followerCount ?? current.followerCount } : current);
    } catch (error) {
      console.error("Failed to update follow state:", error);
      toast.error("Could not update follow state");
    } finally {
      setFollowBusy(false);
    }
  };

  const updateProductFilter = (key, value) => {
    setProductFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const scrollToReviews = () => {
    setActiveTab("reviews");
    window.setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const copyVoucherCode = async (voucher) => {
    if (!voucher?.code) return;
    try {
      await navigator.clipboard.writeText(voucher.code);
      toast.success("Voucher code copied");
    } catch {
      toast.error("Could not copy voucher code");
    }
  };

  if (platformConfigLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-6 h-24 rounded-lg bg-white dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!isShopDirectoryVisible) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 text-center dark:bg-slate-950">
        <Store className="mx-auto h-14 w-14 text-slate-400" />
        <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">Shop pages are currently hidden</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          The marketplace shop directory is not visible right now.
        </p>
        <Link to="/products" className="mt-6 inline-flex rounded-lg bg-primary-600 px-5 py-3 text-sm font-extrabold text-white">
          Browse products
        </Link>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 text-center dark:bg-slate-950">
        <Store className="mx-auto h-14 w-14 text-slate-400" />
        <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">Shop not found</h1>
        <Link to="/shops" className="mt-6 inline-flex rounded-lg bg-orange-600 px-5 py-3 text-sm font-extrabold text-white">
          Browse shops
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <Link to="/shops" className="hover:text-primary-600">Shops</Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200">{shop.shopName}</span>
        </nav>

        {decoration.showBanner ? (
          <div className={`mb-4 rounded-lg bg-gradient-to-r ${themeFor(decoration.bannerColor).gradient} px-4 py-3 text-center text-sm font-extrabold text-white shadow-sm`}>
            {decoration.bannerMessage || "Welcome to our shop."}
          </div>
        ) : null}

        {activeCampaign ? (
          <section className={`relative mb-5 overflow-hidden rounded-lg bg-gradient-to-r ${liveTheme.gradient} px-5 py-6 text-white shadow-sm`}>
            {activeCampaign.banner ? (
              <img src={activeCampaign.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" loading="lazy" decoding="async" />
            ) : null}
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase">Store Campaign</p>
                <h2 className="mt-3 text-2xl font-black">{activeCampaign.title || "Campaign Sale"}</h2>
                {activeCampaign.message ? <p className="mt-1 max-w-3xl text-sm font-semibold text-white/85">{activeCampaign.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className="h-11 rounded-lg bg-white px-5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-slate-100"
              >
                Shop campaign
              </button>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative aspect-[4/1] min-h-32 max-h-72 overflow-hidden bg-gradient-to-r from-primary-800 via-primary-600 to-slate-900">
            {shop.banner ? (
              <img
                src={shop.banner}
                alt={shop.shopName}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: cropPosition(shop.shopDecoration?.bannerCrop),
                  transform: `scale(${cropScale(shop.shopDecoration?.bannerCrop)})`,
                  transformOrigin: cropPosition(shop.shopDecoration?.bannerCrop),
                }}
                loading="eager"
                decoding="async"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </div>

          <div className="px-4 pb-6 sm:px-6 lg:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl sm:h-28 sm:w-28 lg:h-32 lg:w-32 dark:border-slate-900 dark:bg-slate-800">
                  {shop.logo ? (
                    <img
                      src={shop.logo}
                      alt={shop.shopName}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: cropPosition(shop.shopDecoration?.logoCrop),
                        transform: `scale(${cropScale(shop.shopDecoration?.logoCrop)})`,
                        transformOrigin: cropPosition(shop.shopDecoration?.logoCrop),
                      }}
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <Store className="h-10 w-10 text-slate-400" />
                  )}
                </div>
                <div className="pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black text-slate-950 dark:text-white">{shop.shopName}</h1>
                    {shop.isVerified ? <BadgeCheck className="h-6 w-6 text-blue-600" /> : null}
                    {shop.isOfficialStore ? (
                      <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-extrabold uppercase text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
                        Official Store
                      </span>
                    ) : null}
                  </div>
                  {shop.tagline ? <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{shop.tagline}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    <button type="button" onClick={scrollToReviews} className="inline-flex items-center gap-1 hover:text-orange-600">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {shop.rating ? Number(shop.rating).toFixed(1) : "New"} ({numberFormat.format(shop.reviewCount || 0)} reviews)
                    </button>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {numberFormat.format(shop.followerCount || 0)} followers
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Member since {shortDate(shop.joinedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      Response {shop.responseRate || 95}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:w-auto">
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followBusy}
                  className={`h-11 rounded-lg px-5 text-sm font-extrabold transition disabled:opacity-60 ${
                    following
                      ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {followBusy ? "Saving..." : following ? "Following" : "Follow"}
                </button>
                <button
                  type="button"
                  onClick={() => toast("Seller chat will open here when chat is enabled")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with Seller
                </button>
              </div>
            </div>
          </div>
        </section>

        {highlightedVoucher ? (
          <section className={`mt-5 rounded-lg border p-4 shadow-sm ${themeFor(decoration.bannerColor).soft}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/80">
                  <Gift className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase">{decoration.couponBanner?.customText || "Shop coupon"}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    Use <span className="font-mono">{highlightedVoucher.code}</span> on this seller&apos;s products
                  </h2>
                  {highlightedVoucher.description ? <p className="mt-1 text-sm font-semibold opacity-80">{highlightedVoucher.description}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyVoucherCode(highlightedVoucher)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold shadow-sm transition ${themeFor(decoration.bannerColor).button}`}
              >
                <Copy className="h-4 w-4" />
                Copy code
              </button>
            </div>
          </section>
        ) : null}

        {featuredProducts.length > 0 ? (
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`text-xs font-black uppercase ${themeFor(decoration.bannerColor).text}`}>Seller picks</p>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  {decoration.featuredCarousel?.title || "Featured products"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className="h-10 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View all
              </button>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {featuredProducts.map((product) => (
                <div key={productId(product)} className="min-w-[170px] max-w-[220px] snap-start sm:min-w-[210px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="sticky top-[5rem] z-20 mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-10 min-w-28 rounded-md px-4 text-sm font-extrabold capitalize transition ${
                  activeTab === tab
                    ? "bg-primary-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {activeTab === "products" ? (
            <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-4">
                  <input
                    value={productFilters.search}
                    onChange={(event) => updateProductFilter("search", event.target.value)}
                    placeholder="Search this shop"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateProductFilter("category", "")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${!productFilters.category ? "border-primary-300 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                    >
                      All
                    </button>
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => updateProductFilter("category", category)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${productFilters.category === category ? "border-primary-300 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={productFilters.minPrice}
                      onChange={(event) => updateProductFilter("minPrice", event.target.value)}
                      placeholder="Min price"
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      value={productFilters.maxPrice}
                      onChange={(event) => updateProductFilter("maxPrice", event.target.value)}
                      placeholder="Max price"
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <select
                    value={productFilters.sort}
                    onChange={(event) => updateProductFilter("sort", event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Popular</option>
                    <option value="top-rated">Top Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <select
                    value={productFilters.rating}
                    onChange={(event) => updateProductFilter("rating", event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Any rating</option>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>{rating}+ stars</option>
                    ))}
                  </select>
                </div>
              </aside>

              <div>
                {productState.loading ? (
                  <ProductSkeletonGrid />
                ) : productState.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                    <Store className="mx-auto h-12 w-12 text-slate-400" />
                    <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">No products found in this shop</h2>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {productState.items.map((product) => <ProductCard key={product._id} product={product} />)}
                  </div>
                )}
                {!productState.loading && productState.pagination.totalPages > 1 ? (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={!productState.pagination.hasPrev}
                      onClick={() => setProductFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
                      className="h-10 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-bold text-slate-500">
                      Page {productState.pagination.currentPage} of {productState.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={!productState.pagination.hasNext}
                      onClick={() => setProductFilters((current) => ({ ...current, page: current.page + 1 }))}
                      className="h-10 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeTab === "about" ? (
            <section className="grid gap-4 lg:grid-cols-2">
              <PolicyBlock icon={Store} title="About this shop">
                {shop.description || "This seller has not added a full shop description yet."}
              </PolicyBlock>
              <PolicyBlock icon={Truck} title="Shipping policy">
                {shop.shippingPolicy || "Shipping policy has not been provided by the seller."}
              </PolicyBlock>
              <PolicyBlock icon={BadgeCheck} title="Return policy">
                {shop.returnPolicy || "Return policy has not been provided by the seller."}
              </PolicyBlock>
              <PolicyBlock icon={Clock} title="Working hours">
                {shop.workingHours || "Working hours not provided."}
              </PolicyBlock>
              <PolicyBlock icon={Phone} title="Contact">
                <div className="space-y-2">
                  {shop.phone ? <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {shop.phone}</p> : null}
                  {shop.email ? <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {shop.email}</p> : null}
                  {shop.website ? <a href={shop.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-orange-600"><Globe className="h-4 w-4" /> {shop.website}</a> : null}
                  {!shop.phone && !shop.email && !shop.website ? "No public contact details yet." : null}
                </div>
              </PolicyBlock>
              <PolicyBlock icon={Globe} title="Social links">
                <div className="flex flex-wrap gap-3">
                  {shop.socialLinks?.facebook ? <a href={shop.socialLinks.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600"><Facebook className="h-4 w-4" /> Facebook</a> : null}
                  {shop.socialLinks?.instagram ? <a href={shop.socialLinks.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-pink-600"><Instagram className="h-4 w-4" /> Instagram</a> : null}
                  {shop.socialLinks?.youtube ? <a href={shop.socialLinks.youtube} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-red-600"><Youtube className="h-4 w-4" /> YouTube</a> : null}
                  {!shop.socialLinks?.facebook && !shop.socialLinks?.instagram && !shop.socialLinks?.youtube ? "No social links yet." : null}
                </div>
              </PolicyBlock>
            </section>
          ) : null}

          {activeTab === "location" ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              {hasLocation ? (
                <>
                  <ShopLocationMap
                    lat={shop.location.lat}
                    lng={shop.location.lng}
                    shopName={shop.shopName}
                    address={shop.location.formattedAddress}
                  />
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="flex items-start gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      {shop.location.formattedAddress}
                    </p>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${shop.location.lat}&mlon=${shop.location.lng}&zoom=15`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-extrabold text-white dark:bg-orange-600"
                    >
                      Get Directions
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="px-4 py-16 text-center">
                  <MapPin className="mx-auto h-12 w-12 text-slate-400" />
                  <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Location not provided by seller</h2>
                </div>
              )}
            </section>
          ) : null}

          {activeTab === "reviews" ? (
            <section ref={reviewsRef} className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-5xl font-black text-slate-950 dark:text-white">
                  {reviews.averageRating ? Number(reviews.averageRating).toFixed(1) : "New"}
                </p>
                <div className="mt-2"><Stars rating={reviews.averageRating} size="h-5 w-5" /></div>
                <p className="mt-2 text-sm font-semibold text-slate-500">{numberFormat.format(reviews.reviewCount || 0)} reviews</p>
                <div className="mt-5 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.ratingBreakdown?.[rating] || 0;
                    const width = reviews.reviewCount ? Math.round((count / reviews.reviewCount) * 100) : 0;
                    return (
                      <div key={rating} className="grid grid-cols-[42px_1fr_34px] items-center gap-2 text-xs font-bold text-slate-500">
                        <span>{rating} star</span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="block h-full rounded-full bg-yellow-400" style={{ width: `${width}%` }} />
                        </span>
                        <span className="text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-3">
                {reviews.loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 animate-pulse rounded-lg bg-white dark:bg-slate-900" />
                  ))
                ) : reviews.rows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                    No reviews yet.
                  </div>
                ) : (
                  reviews.rows.map((review) => (
                    <article key={review._id} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-slate-950 dark:text-white">{review.reviewerName}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {review.product?.title || "Product"} - {shortDate(review.createdAt)}
                          </p>
                        </div>
                        <Stars rating={review.rating} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{review.comment || "No comment provided."}</p>
                    </article>
                  ))
                )}
                {!reviews.loading && reviews.pagination.totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
                    <button
                      type="button"
                      disabled={!reviews.pagination.hasPrev}
                      onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                      className="h-10 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-bold text-slate-500">
                      Page {reviews.pagination.currentPage} of {reviews.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={!reviews.pagination.hasNext}
                      onClick={() => setReviewPage((page) => page + 1)}
                      className="h-10 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
