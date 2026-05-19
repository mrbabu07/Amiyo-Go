import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Filter,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { followShop, getShops, unfollowShop } from "../services/api";

const numberFormat = new Intl.NumberFormat("en-BD");

const quickAreas = ["Dhaka", "Chattogram", "Coxsbazar", "Sylhet"];

const shortAddress = (value = "") => {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ") || "Location not provided";
};

function ShopCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-32 animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="p-4">
        <div className="-mt-12 mb-4 h-20 w-20 animate-pulse rounded-full border-4 border-white bg-slate-200 dark:border-slate-900 dark:bg-slate-800" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <Store className="mx-auto h-12 w-12 text-slate-400" />
      <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">No shops found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try a different shop name, area, category, or rating filter.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Clear filters
      </button>
    </div>
  );
}

function ShopCard({ shop, onFollowToggle, busy }) {
  const rating = Number(shop.rating || 0);
  const shopName = shop.shopName || shop.displayName || "Shop";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-900">
      <Link to={`/shops/${shop.slug}`} className="block">
        <div className="relative h-32 overflow-hidden bg-slate-900">
          {shop.banner ? (
            <img
              src={shop.banner}
              alt={shopName}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(30,112,152,0.9),transparent_40%),linear-gradient(135deg,#0f172a,#334155)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
            {shop.isOfficialStore ? (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black uppercase text-primary-700 shadow-sm">
                Official
              </span>
            ) : null}
            {shop.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black uppercase text-blue-700 shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="-mt-14 mb-3 flex items-end justify-between gap-3">
          <Link
            to={`/shops/${shop.slug}`}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200 dark:border-slate-900 dark:bg-slate-800 dark:ring-slate-700"
          >
            {shop.logo ? (
              <img src={shop.logo} alt={shopName} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Store className="h-8 w-8 text-slate-400" />
            )}
          </Link>
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Package className="h-3.5 w-3.5" />
            {numberFormat.format(shop.productCount || 0)} products
          </span>
        </div>

        <div className="min-w-0">
          <Link to={`/shops/${shop.slug}`} className="group/title flex items-center gap-2">
            <h2 className="truncate text-lg font-extrabold text-slate-950 group-hover/title:text-primary-700 dark:text-white dark:group-hover/title:text-primary-200">
              {shopName}
            </h2>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover/title:text-primary-600" />
          </Link>

          {shop.tagline ? (
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {shop.tagline}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950">
            <div className="rounded-md bg-white px-2.5 py-2 dark:bg-slate-900">
              <p className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                Rating
              </p>
              <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">
                {rating ? rating.toFixed(1) : "New"}
                <span className="ml-1 text-xs font-bold text-slate-400">
                  ({numberFormat.format(shop.reviewCount || 0)})
                </span>
              </p>
            </div>
            <div className="rounded-md bg-white px-2.5 py-2 dark:bg-slate-900">
              <p className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Followers
              </p>
              <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">
                {numberFormat.format(shop.followerCount || 0)}
              </p>
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{shortAddress(shop.location?.formattedAddress)}</span>
          </p>

          {shop.categories?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {shop.categories.slice(0, 3).map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
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
            {busy ? "Saving..." : shop.following ? "Following" : "Follow"}
          </button>
          <Link
            to={`/shops/${shop.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-3 text-sm font-extrabold text-white transition hover:bg-primary-700"
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
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, hasNext: false, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const stats = useMemo(() => {
    const verified = shops.filter((shop) => shop.isVerified).length;
    const products = shops.reduce((sum, shop) => sum + Number(shop.productCount || 0), 0);
    return { verified, products };
  }, [shops]);

  const hasActiveFilters =
    Boolean(query.search || query.area || query.rating || selectedCategories.length || query.sort !== "popular");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
    }, 300);
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
          setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1, hasNext: false, totalCount: 0 });
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

  const clearFilters = () => {
    setSearchInput("");
    setSelectedCategories([]);
    setQuery({ search: "", area: "", rating: "", sort: "popular", page: 1 });
  };

  const submitSearch = (event) => {
    event?.preventDefault();
    setQuery((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
  };

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

  const filtersPanel = (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-extrabold text-slate-800 dark:text-white">Sort shops</label>
        <select
          value={query.sort}
          onChange={(event) => setQuery((current) => ({ ...current, sort: event.target.value, page: 1 }))}
          className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="popular">Most followed</option>
          <option value="newest">Newest shops</option>
          <option value="top-rated">Top rated</option>
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
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickAreas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setQuery((current) => ({ ...current, area, page: 1 }))}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:border-primary-200 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300"
            >
              {area}
            </button>
          ))}
        </div>
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
            <span className="text-sm text-slate-500">Categories will appear after shops load.</span>
          ) : (
            categoryOptions.slice(0, 18).map((category) => {
              const active = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                    active
                      ? "border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200"
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

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
          Clear all filters
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 dark:bg-slate-950 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary-700 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Seller discovery
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Search by shop name, area, or category
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Browse verified marketplace shops
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                Find trusted sellers, official stores, local vendors, and category specialists before you buy.
              </p>

              <form onSubmit={submitSearch} className="mt-6 max-w-3xl">
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search shop name, for example Tech World"
                      className="h-12 w-full rounded-md border border-transparent bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:bg-slate-900 dark:text-white dark:focus:ring-primary-950"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700"
                  >
                    Search shops
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-px border-t border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 lg:border-l lg:border-t-0">
              <div className="bg-white p-4 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-500">Shops</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {numberFormat.format(pagination.totalCount || shops.length)}
                </p>
              </div>
              <div className="bg-white p-4 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-500">Verified</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {numberFormat.format(stats.verified)}
                </p>
              </div>
              <div className="bg-white p-4 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-500">Products</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {numberFormat.format(stats.products)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="hidden h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary-700 dark:text-primary-200" />
              <h2 className="text-base font-black text-slate-950 dark:text-white">Refine shops</h2>
            </div>
            {filtersPanel}
          </aside>

          <section>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                  {loading ? "Loading shops..." : `${numberFormat.format(pagination.totalCount || shops.length)} shops found`}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {query.search ? `Showing matches for "${query.search}"` : "Showing marketplace sellers"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>

            {filtersOpen ? (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:hidden">
                {filtersPanel}
              </div>
            ) : null}

            {hasActiveFilters ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {query.search ? (
                  <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-extrabold text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
                    Shop search: {query.search}
                  </span>
                ) : null}
                {query.area ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Area: {query.area}
                  </span>
                ) : null}
                {query.rating ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {query.rating}+ stars
                  </span>
                ) : null}
                {selectedCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => <ShopCardSkeleton key={index} />)}
              </div>
            ) : shops.length === 0 ? (
              <EmptyState onClear={clearFilters} />
            ) : (
              <>
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
