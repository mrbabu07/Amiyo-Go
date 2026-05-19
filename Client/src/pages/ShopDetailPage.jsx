import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  ExternalLink,
  Facebook,
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
import useAuth from "../hooks/useAuth";
import {
  followShop,
  getShopBySlug,
  getShopFollowStatus,
  getShopProducts,
  getShopReviews,
  unfollowShop,
} from "../services/api";

const numberFormat = new Intl.NumberFormat("en-BD");

const tabs = ["products", "about", "location", "reviews"];

const shortDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
};

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
          <Icon className="h-5 w-5" />
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

  const categoryOptions = useMemo(() => shop?.categories || [], [shop?.categories]);
  const hasLocation = Number.isFinite(Number(shop?.location?.lat)) && Number.isFinite(Number(shop?.location?.lng));

  useEffect(() => {
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
  }, [slug]);

  useEffect(() => {
    if (!user || !slug) {
      setFollowing(false);
      return;
    }

    getShopFollowStatus(slug)
      .then((response) => setFollowing(Boolean(response.data?.data?.following)))
      .catch(() => setFollowing(false));
  }, [slug, user]);

  useEffect(() => {
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
  }, [slug, productFilters]);

  useEffect(() => {
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
  }, [slug, reviewPage]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-6 h-24 rounded-lg bg-white dark:bg-slate-900" />
        </div>
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
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <span>/</span>
          <Link to="/shops" className="hover:text-orange-600">Shops</Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200">{shop.shopName}</span>
        </nav>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative h-48 bg-gradient-to-r from-[#1e7098] to-orange-500 md:h-64">
            {shop.banner ? <img src={shop.banner} alt={shop.shopName} className="h-full w-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </div>

          <div className="px-4 pb-6 sm:px-6 lg:px-8">
            <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl dark:border-slate-900 dark:bg-slate-800">
                  {shop.logo ? <img src={shop.logo} alt={shop.shopName} className="h-full w-full object-cover" /> : <Store className="h-10 w-10 text-slate-400" />}
                </div>
                <div className="pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black text-slate-950 dark:text-white">{shop.shopName}</h1>
                    {shop.isVerified ? <BadgeCheck className="h-6 w-6 text-blue-600" /> : null}
                    {shop.isOfficialStore ? (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold uppercase text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
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
                      : "bg-orange-600 text-white hover:bg-orange-700"
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

        <div className="sticky top-[5rem] z-20 mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-10 min-w-28 rounded-md px-4 text-sm font-extrabold capitalize transition ${
                  activeTab === tab
                    ? "bg-orange-600 text-white"
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
                      className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${!productFilters.category ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                    >
                      All
                    </button>
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => updateProductFilter("category", category)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${productFilters.category === category ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
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
