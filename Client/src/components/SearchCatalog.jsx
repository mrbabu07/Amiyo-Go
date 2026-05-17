import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  LayoutGrid,
  List,
  MapPin,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Star,
  Tags,
  Truck,
  X,
} from "lucide-react";
import { getSearchResults } from "../services/api";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "./Skeleton";
import { useCurrency } from "../hooks/useCurrency";

const SORT_OPTIONS = [
  { value: "best_match", label: "Best Match" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price Low-High" },
  { value: "price_desc", label: "Price High-Low" },
  { value: "most_reviews", label: "Most Reviews" },
  { value: "top_rated", label: "Top Rated" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4", label: "4 stars and up" },
  { value: "3", label: "3 stars and up" },
  { value: "2", label: "2 stars and up" },
];

const DISCOUNT_OPTIONS = [
  { value: "", label: "Any discount" },
  { value: "10", label: "10% off or more" },
  { value: "20", label: "20% off or more" },
  { value: "30", label: "30% off or more" },
  { value: "50", label: "50% off or more" },
];

const LIMIT = 24;

const parseList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const hasMarketplaceFilters = (searchParams) =>
  [
    "category",
    "minPrice",
    "maxPrice",
    "brands",
    "minRating",
    "deliverySpeed",
    "discountMin",
    "inStock",
    "location",
  ].some((key) => Boolean(searchParams.get(key)));

const CategoryTile = ({ category }) => (
  <Link
    to={`/products?category=${category._id}`}
    className="group flex min-h-28 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-gray-900 transition group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
          {category.name}
        </p>
        {category.productCount !== undefined && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {category.productCount} products
          </p>
        )}
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-50 text-sm font-black text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
        {category.image ? (
          <img
            src={category.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          category.name?.charAt(0) || "C"
        )}
      </div>
    </div>
    <span className="mt-4 text-xs font-bold text-primary-600 dark:text-primary-300">
      Browse
    </span>
  </Link>
);

const getProductImage = (product) =>
  product.image || product.images?.[0] || "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop";

const getVendorName = (product) =>
  product.vendorName ||
  product.vendorShopName ||
  product.shopName ||
  product.vendor?.shopName ||
  product.brand ||
  "Marketplace seller";

function ProductListRow({ product, formatPrice }) {
  const originalPrice = Number(product.originalPrice || 0);
  const price = Number(product.price || 0);
  const discount =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const rating = Number(product.averageRating || product.rating || 0);
  const reviewCount = product.reviewCount || product.totalReviews || 0;

  return (
    <Link
      to={`/product/${product._id}`}
      className="group grid gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[148px_1fr_auto]"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 sm:h-36 sm:w-36">
        <img
          src={getProductImage(product)}
          alt={product.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {discount > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-extrabold text-white">
            -{discount}%
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-base font-extrabold leading-6 text-gray-950 transition group-hover:text-primary-600 dark:text-white">
          {product.title}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-gray-500 dark:text-gray-400">
          {getVendorName(product)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {rating > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <Star className="h-3.5 w-3.5 fill-current" />
              {rating.toFixed(1)} {reviewCount ? `(${reviewCount})` : ""}
            </span>
          ) : null}
          {product.freeShipping !== false ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              Free shipping
            </span>
          ) : null}
          {(product.stock ?? 1) > 0 ? (
            <span className="rounded-full bg-green-50 px-2 py-1 text-green-700 dark:bg-green-950/40 dark:text-green-200">
              In stock
            </span>
          ) : (
            <span className="rounded-full bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950/40 dark:text-red-200">
              Out of stock
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 sm:min-w-44 sm:flex-col sm:items-end">
        <div className="text-left sm:text-right">
          <p className="text-xl font-extrabold text-orange-600 dark:text-orange-300">
            {formatPrice(price)}
          </p>
          {originalPrice > price ? (
            <p className="mt-1 text-sm font-semibold text-gray-400 line-through">
              {formatPrice(originalPrice)}
            </p>
          ) : null}
        </div>
        <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-500 px-4 text-sm font-bold text-white transition group-hover:bg-primary-600">
          View details
        </span>
      </div>
    </Link>
  );
}

export default function SearchCatalog({ mode = "browse" }) {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid3");

  const paramsKey = searchParams.toString();
  const query = searchParams.get("q") || "";
  const selectedBrands = parseList(searchParams.get("brands") || "");
  const hasFilters = hasMarketplaceFilters(searchParams);
  const sortValue = searchParams.get("sort") || "best_match";

  const apiParams = useMemo(() => {
    const params = {
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      brands: searchParams.get("brands") || "",
      minRating: searchParams.get("minRating") || "",
      deliverySpeed: searchParams.get("deliverySpeed") || "",
      discountMin: searchParams.get("discountMin") || "",
      inStock: searchParams.get("inStock") === "true" ? "true" : "",
      location: searchParams.get("location") || "",
      sort: sortValue,
      page: searchParams.get("page") || "1",
      limit: LIMIT,
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === "") delete params[key];
    });

    return params;
  }, [paramsKey, searchParams, sortValue]);

  useEffect(() => {
    let active = true;

    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getSearchResults(apiParams);
        if (active) setResult(response.data.data || {});
      } catch (requestError) {
        console.error("Failed to load marketplace search:", requestError);
        if (active) {
          setError("Search is unavailable right now.");
          setResult(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchResults();
    return () => {
      active = false;
    };
  }, [apiParams]);

  const facets = result?.facets || {};
  const products = result?.products || [];
  const appliedFilters = result?.appliedFilters || [];
  const totalCount = result?.totalCount || 0;
  const page = Number(result?.page || searchParams.get("page") || 1);
  const totalPages = Number(result?.totalPages || 1);
  const priceRange = facets.priceRange || { min: 0, max: 100000 };
  const maxBound = Math.max(Number(priceRange.max || 100000), 1);
  const minBound = Number(priceRange.min || 0);
  const maxPrice = Number(searchParams.get("maxPrice") || maxBound);
  const sliderValue = Math.max(minBound, Math.min(maxPrice, maxBound));

  const rootCategories = useMemo(() => {
    const categories = facets.categories || [];
    const roots = categories.filter((category) => !category.parentId);
    return (roots.length ? roots : categories).slice(0, 12);
  }, [facets.categories]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue || normalizedValue === "false") next.delete(key);
    else next.set(key, normalizedValue);

    next.delete("page");
    setSearchParams(next);
  };

  const updateSort = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", value);
    next.delete("page");
    setSearchParams(next);
  };

  const updatePage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleBrand = (brand) => {
    const nextBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((item) => item !== brand)
      : [...selectedBrands, brand];
    updateParam("brands", nextBrands.join(","));
  };

  const removeFilter = (filter) => {
    if (filter.key === "brands") {
      const nextBrands = selectedBrands.filter((brand) => brand !== filter.value);
      updateParam("brands", nextBrands.join(","));
      return;
    }
    updateParam(filter.key, "");
  };

  const clearFilters = ({ keepQuery = true } = {}) => {
    const next = new URLSearchParams();
    if (keepQuery && query) next.set("q", query);
    setSearchParams(next);
  };

  const showCategoryBrowse = !query && !hasFilters && rootCategories.length > 0;
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortValue)?.label || "Best Match";
  const activeFiltersCount = appliedFilters.length;
  const productGridClass =
    viewMode === "grid2"
      ? "grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2"
      : "grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-3";
  const viewOptions = [
    { value: "grid3", label: "Compact grid", icon: LayoutGrid },
    { value: "grid2", label: "Large grid", icon: Grid2X2 },
    { value: "list", label: "List view", icon: List },
  ];

  const filterContent = (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary-600" />
          <h2 className="font-black text-gray-900 dark:text-white">Filters</h2>
        </div>
        <button
          type="button"
          onClick={() => clearFilters()}
          className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-300"
        >
          Clear
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Tags className="h-4 w-4" />
            Price
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              value={searchParams.get("minPrice") || ""}
              onChange={(event) => updateParam("minPrice", event.target.value)}
              placeholder="Min"
              className="input-control"
            />
            <input
              type="number"
              min="0"
              value={searchParams.get("maxPrice") || ""}
              onChange={(event) => updateParam("maxPrice", event.target.value)}
              placeholder="Max"
              className="input-control"
            />
          </div>
          <input
            type="range"
            min={Number(priceRange.min || 0)}
            max={maxBound}
            value={sliderValue}
            onChange={(event) => updateParam("maxPrice", event.target.value)}
            className="mt-4 h-2 w-full cursor-pointer accent-primary-600"
          />
          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatPrice(priceRange.min || 0)}</span>
            <span>{formatPrice(priceRange.max || 0)}</span>
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
            Brand
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {(facets.brands || []).slice(0, 16).map((brand) => (
              <label
                key={brand.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.value)}
                    onChange={() => toggleBrand(brand.value)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="truncate">{brand.value}</span>
                </span>
                <span className="text-xs text-gray-400">{brand.count}</span>
              </label>
            ))}
            {(facets.brands || []).length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No brand filters yet
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Star className="h-4 w-4" />
            Rating
          </div>
          <select
            value={searchParams.get("minRating") || ""}
            onChange={(event) => updateParam("minRating", event.target.value)}
            className="input-control"
          >
            {RATING_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Truck className="h-4 w-4" />
            Delivery
          </div>
          <select
            value={searchParams.get("deliverySpeed") || ""}
            onChange={(event) => updateParam("deliverySpeed", event.target.value)}
            className="input-control"
          >
            <option value="">Any speed</option>
            {(facets.deliverySpeeds || []).map((speed) => (
              <option key={speed.value} value={speed.value}>
                {speed.value} ({speed.count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
            Discount
          </div>
          <select
            value={searchParams.get("discountMin") || ""}
            onChange={(event) => updateParam("discountMin", event.target.value)}
            className="input-control"
          >
            {DISCOUNT_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
          In stock only
          <input
            type="checkbox"
            checked={searchParams.get("inStock") === "true"}
            onChange={(event) => updateParam("inStock", event.target.checked ? "true" : "")}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </label>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <MapPin className="h-4 w-4" />
            Location
          </div>
          <select
            value={searchParams.get("location") || ""}
            onChange={(event) => updateParam("location", event.target.value)}
            className="input-control"
          >
            <option value="">Any location</option>
            {(facets.locations || []).map((location) => (
              <option key={location.value} value={location.value}>
                {location.value} ({location.count})
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 dark:bg-gray-950 dark:text-white">
      <div className="border-b border-gray-200 bg-white/95 dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="font-semibold hover:text-primary-600 dark:hover:text-primary-300">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900 dark:text-white">
              {mode === "search" ? "Search Results" : "Products"}
            </span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 text-xs font-extrabold uppercase text-primary-600 dark:text-primary-300">
                Marketplace catalog
              </p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                {query ? `Results for "${query}"` : "Browse Products"}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {loading ? "Loading results..." : result?.summary || `${totalCount} results`}
              </p>
              {result?.didYouMean && result.didYouMean !== query && (
                <button
                  type="button"
                  onClick={() => updateParam("q", result.didYouMean)}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 text-sm font-bold text-primary-700 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-200"
                >
                  <Search className="h-4 w-4" />
                  Search instead for "{result.didYouMean}"
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-extrabold leading-none text-white">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </button>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <span className="hidden text-gray-500 dark:text-gray-400 sm:inline">Sort</span>
                <select
                  value={sortValue}
                  onChange={(event) => updateSort(event.target.value)}
                  className="h-9 rounded-md border-0 bg-transparent px-1 text-sm font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-white"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {appliedFilters.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                Applied
              </span>
              {appliedFilters.map((filter) => (
                <button
                  key={`${filter.key}-${filter.value}`}
                  type="button"
                  onClick={() => removeFilter(filter)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 text-xs font-bold text-primary-700 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-200"
                >
                  {filter.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => clearFilters()}
                className="min-h-9 rounded-full px-3 text-xs font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div
          className="fixed inset-0 z-[480] bg-gray-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl dark:bg-gray-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase text-primary-600 dark:text-primary-300">
                  Refine results
                </p>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterContent}
            <div className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <button
                type="button"
                onClick={() => clearFilters()}
                className="min-h-11 flex-1 rounded-lg border border-gray-300 px-4 text-sm font-bold text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="min-h-11 flex-1 rounded-lg bg-primary-500 px-4 text-sm font-bold text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showCategoryBrowse && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Grid2X2 className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Shop by Category
                </h2>
              </div>
              <Link
                to="/categories"
                className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-bold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/40"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {rootCategories.map((category) => (
                <CategoryTile key={category._id} category={category} />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {filterContent}
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mb-5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {loading
                      ? "Loading products..."
                      : `${totalCount} ${totalCount === 1 ? "result" : "results"}`}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages} - Sorted by {activeSortLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
                    {viewOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = viewMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setViewMode(option.value)}
                          className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            isActive
                              ? "bg-primary-500 text-white shadow-sm"
                              : "text-gray-600 hover:bg-white hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-primary-300"
                          }`}
                          aria-label={option.label}
                          title={option.label}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            ) : loading ? (
              <div className={viewMode === "list" ? "space-y-3" : productGridClass}>
                {Array.from({ length: viewMode === "list" ? 5 : 9 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-200">
                  <PackageSearch className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  Nothing found{query ? ` for "${query}"` : ""}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
                  Try one of these searches or jump into a category.
                </p>

                {(result?.suggestions || []).length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {result.suggestions.map((suggestion) => (
                      <Link
                        key={`${suggestion.type}-${suggestion.label}`}
                        to={
                          suggestion.type === "category"
                            ? `/products?category=${suggestion.categoryId}`
                            : `/search?q=${encodeURIComponent(suggestion.query)}`
                        }
                        className="inline-flex min-h-11 items-center rounded-lg border border-gray-200 px-3 text-sm font-bold text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-200"
                      >
                        {suggestion.label}
                      </Link>
                    ))}
                  </div>
                )}

                {rootCategories.length > 0 && (
                  <div className="mt-8 grid grid-cols-2 gap-3 text-left md:grid-cols-4">
                    {rootCategories.slice(0, 4).map((category) => (
                      <CategoryTile key={category._id} category={category} />
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => clearFilters({ keepQuery: true })}
                    className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-bold text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-200"
                  >
                    Clear filters
                  </button>
                  <button
                    type="button"
                    onClick={() => clearFilters({ keepQuery: false })}
                    className="min-h-11 rounded-lg bg-primary-500 px-4 text-sm font-bold text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
                  >
                    Browse all products
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={viewMode === "list" ? "space-y-3" : productGridClass}>
                  {products.map((product) => (
                    viewMode === "list" ? (
                      <ProductListRow
                        key={product._id}
                        product={product}
                        formatPrice={formatPrice}
                      />
                    ) : (
                      <ProductCard key={product._id} product={product} />
                    )
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePage(page - 1)}
                      disabled={page <= 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const pageNumber = start + index;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => updatePage(pageNumber)}
                          className={`h-11 min-w-11 rounded-lg border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            pageNumber === page
                              ? "border-primary-500 bg-primary-500 text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => updatePage(page + 1)}
                      disabled={page >= totalPages}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
