import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Apple,
  Beef,
  Carrot,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Home,
  LayoutGrid,
  List,
  MapPin,
  Milk,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Star,
  Tags,
  Truck,
  Wheat,
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

const DAILY_NEED_MAIN_CATEGORY_SLUGS = [
  "groceries",
  "fresh-vegetables",
  "fresh-fish-seafood",
];

const DAILY_NEED_SHORTCUTS = [
  {
    label: "Grocery",
    query: "grocery",
    preferredSlugs: ["groceries", "food-cupboard"],
    keywords: ["grocery", "groceries", "daily needs", "daily essentials", "food"],
    Icon: ShoppingBasket,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50",
  },
  {
    label: "Vegetables",
    query: "vegetable",
    preferredSlugs: ["fresh-vegetables", "daily-vegetables", "vegetables"],
    keywords: ["vegetable", "vegetables", "veg"],
    Icon: Carrot,
    tone: "bg-lime-50 text-lime-700 ring-lime-100 dark:bg-lime-950/40 dark:text-lime-200 dark:ring-lime-900/50",
  },
  {
    label: "Fruits",
    query: "fruits",
    preferredSlugs: ["fresh-fruits", "fruits", "seasonal-fruits"],
    keywords: ["fruit", "fruits", "fresh fruit"],
    Icon: Apple,
    tone: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50",
  },
  {
    label: "Dairy",
    query: "milk dairy",
    preferredSlugs: ["dairy-eggs"],
    keywords: ["dairy", "milk", "cheese", "yogurt"],
    Icon: Milk,
    tone: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/50",
  },
  {
    label: "Meat & Fish",
    query: "meat fish",
    preferredSlugs: ["meat-chicken", "fresh-fish-seafood", "grocery-fish-seafood"],
    keywords: ["meat", "fish", "chicken", "beef", "mutton"],
    Icon: Beef,
    tone: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50",
  },
  {
    label: "Rice & Grains",
    query: "rice grains",
    preferredSlugs: ["rice-grains", "food-cupboard", "groceries"],
    keywords: ["rice", "grain", "grains", "wheat", "flour"],
    Icon: Wheat,
    tone: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50",
  },
  {
    label: "Household",
    query: "cleaning laundry",
    preferredSlugs: ["baby-household-grocery", "cleaning-supplies", "laundry"],
    keywords: ["household", "cleaning", "dishwashing", "laundry"],
    Icon: Home,
    tone: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900/50",
  },
];

const parseList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeLookupText = (value = "") =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const getMainCategoryPriority = (category = {}) => {
  const slug = String(category.slug || "").toLowerCase();
  const index = DAILY_NEED_MAIN_CATEGORY_SLUGS.indexOf(slug);
  return index === -1 ? DAILY_NEED_MAIN_CATEGORY_SLUGS.length : index;
};

const findShortcutCategory = (categories = [], shortcut = {}) => {
  const preferredSlugs = (shortcut.preferredSlugs || []).map((slug) =>
    String(slug).toLowerCase(),
  );
  const preferredMatch = categories.find((category) =>
    preferredSlugs.includes(String(category.slug || "").toLowerCase()),
  );

  if (preferredMatch) return preferredMatch;

  return categories.find((category) => {
    const haystack = normalizeLookupText(`${category.name || ""} ${category.slug || ""}`);
    return shortcut.keywords.some((keyword) =>
      haystack.includes(normalizeLookupText(keyword)),
    );
  });
};

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
    className="group grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-50 text-sm font-black text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50">
      {category.image ? (
        <img
          src={category.image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        category.name?.charAt(0) || "C"
      )}
    </div>
    <div className="min-w-0">
      <p className="truncate text-sm font-extrabold text-gray-900 transition group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
        {category.name}
      </p>
      {category.productCount !== undefined && (
        <p className="mt-0.5 truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
          {Number(category.productCount || 0).toLocaleString()} products
        </p>
      )}
    </div>
    <span className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-primary-950/40 dark:group-hover:text-primary-300">
      <ChevronRight className="h-4 w-4" />
    </span>
  </Link>
);

const DailyNeedTile = ({ item }) => {
  const Icon = item.Icon;

  return (
    <Link
      to={item.href}
      className="group grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-md ring-1 ${item.tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold text-gray-900 transition group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
          {item.label}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
          {item.productCount !== null
            ? `${Number(item.productCount || 0).toLocaleString()} products`
            : "Browse now"}
        </span>
      </span>
    </Link>
  );
};

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
          decoding="async"
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
  const [searchDraft, setSearchDraft] = useState("");
  const [searchDraftTouched, setSearchDraftTouched] = useState(false);

  const query = searchParams.get("q") || "";
  const searchInputValue = searchDraftTouched ? searchDraft : query;
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
  }, [searchParams, sortValue]);

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
  const categoryFacets = useMemo(() => facets.categories || [], [facets.categories]);

  const rootCategories = useMemo(() => {
    const roots = categoryFacets.filter((category) => !category.parentId);
    return (roots.length ? roots : categoryFacets)
      .map((category, index) => ({ category, index }))
      .sort((a, b) => {
        const priorityDelta =
          getMainCategoryPriority(a.category) - getMainCategoryPriority(b.category);
        if (priorityDelta !== 0) return priorityDelta;

        const orderDelta =
          Number(a.category.displayOrder ?? a.index) - Number(b.category.displayOrder ?? b.index);
        if (orderDelta !== 0) return orderDelta;

        return String(a.category.name || "").localeCompare(String(b.category.name || ""));
      })
      .slice(0, 12)
      .map(({ category }) => category);
  }, [categoryFacets]);
  const dailyNeedShortcuts = useMemo(
    () =>
      DAILY_NEED_SHORTCUTS.map((shortcut) => {
        const match = findShortcutCategory(categoryFacets, shortcut);

        return {
          ...shortcut,
          href: match
            ? `/products?category=${match._id}`
            : `/products?q=${encodeURIComponent(shortcut.query)}`,
          productCount: match?.productCount ?? null,
        };
      }),
    [categoryFacets],
  );
  const selectedCategoryId = searchParams.get("category") || "";
  const selectedCategory = categoryFacets.find(
    (category) => String(category._id) === selectedCategoryId || category.slug === selectedCategoryId,
  );

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue || normalizedValue === "false") next.delete(key);
    else next.set(key, normalizedValue);

    next.delete("page");
    setSearchParams(next);
  };

  const submitCatalogSearch = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const normalizedQuery = String(searchInputValue || "").trim();

    if (normalizedQuery) next.set("q", normalizedQuery);
    else next.delete("q");

    next.delete("page");
    setSearchDraft(normalizedQuery);
    setSearchDraftTouched(false);
    setSearchParams(next);
  };

  const clearCatalogSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("page");
    setSearchDraft("");
    setSearchDraftTouched(false);
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

  const quickFilters = [
    {
      label: "In stock",
      active: searchParams.get("inStock") === "true",
      onClick: () =>
        updateParam("inStock", searchParams.get("inStock") === "true" ? "" : "true"),
    },
    {
      label: "Top rated",
      active: searchParams.get("minRating") === "4",
      onClick: () =>
        updateParam("minRating", searchParams.get("minRating") === "4" ? "" : "4"),
    },
    {
      label: "20% off",
      active: searchParams.get("discountMin") === "20",
      onClick: () =>
        updateParam("discountMin", searchParams.get("discountMin") === "20" ? "" : "20"),
    },
  ];

  const summaryMetrics = [
    {
      label: "Results",
      value: loading ? "..." : totalCount.toLocaleString(),
      tone: "bg-primary-50 text-primary-700 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50",
    },
    {
      label: "Category",
      value: selectedCategory?.name || "All products",
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50",
    },
    {
      label: "Sorted by",
      value: SORT_OPTIONS.find((option) => option.value === sortValue)?.label || "Best Match",
      tone: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50",
    },
  ];

  const showDailyNeeds = !query && dailyNeedShortcuts.length > 0;
  const showCategoryBrowse = !query && !hasFilters && rootCategories.length > 0;
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortValue)?.label || "Best Match";
  const activeFiltersCount = appliedFilters.length;
  const firstResult = totalCount === 0 ? 0 : (page - 1) * LIMIT + 1;
  const lastResult = Math.min(page * LIMIT, totalCount);
  const productGridClass =
    viewMode === "grid2"
      ? "grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2"
      : "grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3";
  const viewOptions = [
    { value: "grid3", label: "Compact grid", icon: LayoutGrid },
    { value: "grid2", label: "Large grid", icon: Grid2X2 },
    { value: "list", label: "List view", icon: List },
  ];

  const filterContent = (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-black text-gray-900 dark:text-white">Refine</h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => clearFilters()}
          disabled={activeFiltersCount === 0}
          className="min-h-9 rounded-lg px-2 text-xs font-bold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-primary-300 dark:hover:bg-primary-950/40 dark:disabled:text-gray-600"
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
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to="/"
              className="font-semibold hover:text-primary-600 dark:hover:text-primary-300"
            >
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900 dark:text-white">
              {mode === "search" ? "Search Results" : "Products"}
            </span>
          </nav>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary-50 px-3 text-xs font-extrabold uppercase text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified marketplace catalog
                </span>
                {selectedCategory ? (
                  <span className="inline-flex min-h-8 items-center rounded-full bg-emerald-50 px-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50">
                    {selectedCategory.name}
                  </span>
                ) : null}
              </div>

              <h1 className="max-w-3xl text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">
                {query ? `Results for "${query}"` : "Browse Products"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-gray-600 dark:text-gray-400">
                {loading ? "Loading results..." : result?.summary || `${totalCount} results`}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {summaryMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`rounded-lg px-3 py-2 ring-1 ${metric.tone}`}
                  >
                    <p className="text-[11px] font-extrabold uppercase leading-4 opacity-75">
                      {metric.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-black">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>

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

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <form onSubmit={submitCatalogSearch} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={searchInputValue}
                    onChange={(event) => {
                      setSearchDraft(event.target.value);
                      setSearchDraftTouched(true);
                    }}
                    placeholder="Search products, brands, categories"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-primary-900/40"
                  />
                  {query || searchInputValue ? (
                    <button
                      type="button"
                      onClick={clearCatalogSearch}
                      className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-500 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                >
                  Search
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400">
                  Quick filters
                </span>
                {quickFilters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={filter.onClick}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      filter.active
                        ? "border-primary-500 bg-primary-500 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-primary-700 dark:hover:text-primary-300"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="relative inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 transition hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-extrabold leading-none text-white">
                      {activeFiltersCount}
                    </span>
                  ) : null}
                </button>
                <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 sm:flex-none">
                  <span className="text-gray-500 dark:text-gray-400">Sort</span>
                  <select
                    value={sortValue}
                    onChange={(event) => updateSort(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-md border-0 bg-transparent px-1 text-sm font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-white sm:min-w-44"
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
          className="fixed inset-0 z-[480] bg-gray-950/45 lg:hidden"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl ring-1 ring-gray-200 dark:bg-gray-950 dark:ring-gray-800"
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
        {showDailyNeeds && (
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50">
                  <ShoppingBasket className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">
                    Daily Needs
                  </h2>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Grocery, vegetables, fruits, dairy, staples, and household care
                  </p>
                </div>
              </div>
              <Link
                to="/products?q=grocery"
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/40"
              >
                Shop essentials
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {dailyNeedShortcuts.map((item) => (
                <DailyNeedTile key={item.label} item={item} />
              ))}
            </div>
          </section>
        )}

        {showCategoryBrowse && (
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50">
                  <Grid2X2 className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">
                    Shop by Category
                  </h2>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {rootCategories.length} departments
                  </p>
                </div>
              </div>
              <Link
                to="/categories"
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/40"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {loading
                      ? "Loading products..."
                      : totalCount > 0
                        ? `Showing ${firstResult}-${lastResult} of ${totalCount.toLocaleString()}`
                        : "No products found"}
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
