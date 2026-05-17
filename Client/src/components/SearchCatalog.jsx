import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Grid2X2,
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
    className="group flex min-h-28 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[#1e7098]/50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-bold text-gray-900 group-hover:text-[#1e7098] dark:text-white">
          {category.name}
        </p>
        {category.productCount !== undefined && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {category.productCount} products
          </p>
        )}
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#1e7098]/10 text-sm font-black text-[#1e7098]">
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
    <span className="mt-4 text-xs font-bold text-[#1e7098]">Browse</span>
  </Link>
);

export default function SearchCatalog({ mode = "browse" }) {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:text-[#1e7098]">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900 dark:text-white">
              {mode === "search" ? "Search Results" : "Products"}
            </span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
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
                  className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#1e7098] hover:text-[#185a78]"
                >
                  <Search className="h-4 w-4" />
                  Search instead for "{result.didYouMean}"
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:border-[#1e7098]/50 hover:text-[#1e7098] dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sort
                <select
                  value={sortValue}
                  onChange={(event) => updateSort(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                  className="inline-flex items-center gap-1 rounded-md border border-[#1e7098]/20 bg-[#1e7098]/5 px-3 py-1.5 text-xs font-bold text-[#1e7098] hover:bg-[#1e7098]/10"
                >
                  {filter.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => clearFilters()}
                className="rounded-md px-2 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showCategoryBrowse && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Grid2X2 className="h-5 w-5 text-[#1e7098]" />
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Shop by Category
                </h2>
              </div>
              <Link
                to="/categories"
                className="text-sm font-bold text-[#1e7098] hover:text-[#185a78]"
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
          <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-24 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-[#1e7098]" />
                  <h2 className="font-black text-gray-900 dark:text-white">
                    Filters
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => clearFilters()}
                  className="text-xs font-bold text-[#1e7098] hover:text-[#185a78]"
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
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      value={searchParams.get("maxPrice") || ""}
                      onChange={(event) => updateParam("maxPrice", event.target.value)}
                      placeholder="Max"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <input
                    type="range"
                    min={Number(priceRange.min || 0)}
                    max={maxBound}
                    value={sliderValue}
                    onChange={(event) => updateParam("maxPrice", event.target.value)}
                    className="mt-4 h-2 w-full cursor-pointer accent-[#1e7098]"
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
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand.value)}
                            onChange={() => toggleBrand(brand.value)}
                            className="h-4 w-4 rounded border-gray-300 text-[#1e7098] focus:ring-[#1e7098]"
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
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    {DISCOUNT_OPTIONS.map((option) => (
                      <option key={option.value || "any"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                  In stock only
                  <input
                    type="checkbox"
                    checked={searchParams.get("inStock") === "true"}
                    onChange={(event) => updateParam("inStock", event.target.checked ? "true" : "")}
                    className="h-4 w-4 rounded border-gray-300 text-[#1e7098] focus:ring-[#1e7098]"
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
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1e7098] focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
            </div>
          </aside>

          <main>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading ? "Loading..." : `${totalCount} ${totalCount === 1 ? "result" : "results"}`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e7098]/10 text-[#1e7098]">
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
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:border-[#1e7098]/40 hover:text-[#1e7098] dark:border-gray-700 dark:text-gray-200"
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
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:border-[#1e7098]/50 hover:text-[#1e7098] dark:border-gray-600 dark:text-gray-200"
                  >
                    Clear filters
                  </button>
                  <button
                    type="button"
                    onClick={() => clearFilters({ keepQuery: false })}
                    className="rounded-md bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#185a78]"
                  >
                    Browse all products
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePage(page - 1)}
                      disabled={page <= 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:border-[#1e7098]/50 hover:text-[#1e7098] disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                          className={`h-10 min-w-[2.5rem] rounded-md border px-3 text-sm font-bold ${
                            pageNumber === page
                              ? "border-[#1e7098] bg-[#1e7098] text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:border-[#1e7098]/50 hover:text-[#1e7098] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:border-[#1e7098]/50 hover:text-[#1e7098] disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
