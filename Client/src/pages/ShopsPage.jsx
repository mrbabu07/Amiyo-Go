import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, MapPin, Search, Star, Store, Users } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { followShop, getShops, unfollowShop } from "../services/api";

const shortAddress = (value = "") => {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ") || "Location not provided";
};

const numberFormat = new Intl.NumberFormat("en-BD");

function ShopCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="h-28 animate-pulse bg-slate-200" />
      <div className="p-4">
        <div className="-mt-12 mb-4 h-20 w-20 animate-pulse rounded-full border-4 border-white bg-slate-200" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function ShopCard({ shop, onFollowToggle, busy }) {
  const banner = shop.banner;
  const logo = shop.logo;
  const rating = Number(shop.rating || 0);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-900">
      <Link to={`/shops/${shop.slug}`} className="block">
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-[#1e7098] to-orange-500">
          {banner ? <img src={banner} alt={shop.shopName} className="h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="-mt-14 mb-3 flex items-end justify-between gap-3">
          <Link
            to={`/shops/${shop.slug}`}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800"
          >
            {logo ? (
              <img src={logo} alt={shop.shopName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-slate-400" />
            )}
          </Link>
          {shop.isOfficialStore ? (
            <span className="mb-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
              Official Store
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <Link to={`/shops/${shop.slug}`} className="group flex items-center gap-2">
            <h2 className="truncate text-lg font-extrabold text-slate-950 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-300">
              {shop.shopName || shop.displayName}
            </h2>
            {shop.isVerified ? <BadgeCheck className="h-5 w-5 shrink-0 text-blue-600" /> : null}
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {rating ? rating.toFixed(1) : "New"} ({numberFormat.format(shop.reviewCount || 0)})
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {numberFormat.format(shop.followerCount || 0)}
            </span>
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{shortAddress(shop.location?.formattedAddress)}</span>
          </p>

          {shop.categories?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {shop.categories.slice(0, 3).map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {category}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <button
            type="button"
            onClick={() => onFollowToggle(shop)}
            disabled={busy}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {busy ? "Saving..." : shop.following ? "Unfollow" : "Follow"}
          </button>
          <Link
            to={`/shops/${shop.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-3 text-sm font-extrabold text-white transition hover:bg-orange-700"
          >
            Visit Shop
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ShopsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    search: "",
    area: "",
    rating: "",
    sort: "popular",
    page: 1,
  });
  const [selectedCategories, setSelectedCategories] = useState([]);

  const categoryOptions = useMemo(() => {
    const values = shops.flatMap((shop) => shop.categories || []);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [shops]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) => ({ ...current, search: searchInput, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const loadShops = async () => {
      setLoading(true);
      try {
        const response = await getShops({
          ...query,
          category: selectedCategories.join(","),
          limit: 12,
        });
        if (!cancelled) {
          const nextRows = response.data?.data || [];
          setShops((current) => (query.page > 1 ? [...current, ...nextRows] : nextRows));
          setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1, hasNext: false });
        }
      } catch (error) {
        console.error("Failed to load shops:", error);
        if (!cancelled) toast.error("Failed to load shops");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadShops();
    return () => {
      cancelled = true;
    };
  }, [query, selectedCategories]);

  const toggleCategory = (category) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
    setQuery((current) => ({ ...current, page: 1 }));
  };

  const handleFollowToggle = async (shop) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setBusySlug(shop.slug);
    try {
      const response = shop.following ? await unfollowShop(shop.slug) : await followShop(shop.slug);
      const next = response.data?.data || {};
      setShops((current) =>
        current.map((item) =>
          item.slug === shop.slug
            ? { ...item, following: next.following, followerCount: next.followerCount ?? item.followerCount }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to update follow state:", error);
      toast.error("Could not update follow state");
    } finally {
      setBusySlug("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-orange-600">Marketplace shops</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Browse Shops</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Discover verified sellers, official stores, local pickup locations, and category specialists.
            </p>
          </div>
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search shop name or area"
              className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-extrabold text-slate-800 dark:text-white">Sort</label>
                <select
                  value={query.sort}
                  onChange={(event) => setQuery((current) => ({ ...current, sort: event.target.value, page: 1 }))}
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="popular">Popular</option>
                  <option value="newest">Newest</option>
                  <option value="top-rated">Top Rated</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-800 dark:text-white">Area or city</label>
                <input
                  value={query.area}
                  onChange={(event) => setQuery((current) => ({ ...current, area: event.target.value, page: 1 }))}
                  placeholder="Dhaka, Coxsbazar..."
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-800 dark:text-white">Minimum rating</label>
                <select
                  value={query.rating}
                  onChange={(event) => setQuery((current) => ({ ...current, rating: event.target.value, page: 1 }))}
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Any rating</option>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating}+ stars</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-extrabold text-slate-800 dark:text-white">Categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryOptions.length === 0 ? (
                    <span className="text-sm text-slate-500">No categories yet</span>
                  ) : (
                    categoryOptions.map((category) => {
                      const active = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                            active
                              ? "border-orange-300 bg-orange-50 text-orange-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>

          <section>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => <ShopCardSkeleton key={index} />)}
              </div>
            ) : shops.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <Store className="mx-auto h-12 w-12 text-slate-400" />
                <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">No shops found</h2>
                <p className="mt-2 text-sm text-slate-500">Try a different search, area, category, or rating filter.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-400">
                  <span>{numberFormat.format(pagination.totalCount || shops.length)} shops found</span>
                  <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {shops.map((shop) => (
                    <ShopCard
                      key={shop.slug}
                      shop={shop}
                      onFollowToggle={handleFollowToggle}
                      busy={busySlug === shop.slug}
                    />
                  ))}
                </div>

                {pagination.hasNext ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                      Load more shops
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
