import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Search,
  Sparkles,
  Tags,
  TrendingUp,
  X,
} from "lucide-react";
import { getSearchAutocomplete } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";
import VoiceSearch from "./VoiceSearch";
import { getCategoryIcon, getCategoryImageSource, getCategoryTheme } from "../utils/categoryVisuals";

const HISTORY_KEY = "amiyoSearchHistory";
const defaultAutocomplete = {
  recentSearches: [],
  trendingSearches: [],
  matchingCategories: [],
  products: [],
  correctedQuery: "",
};

const readLocalHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveLocalHistory = (query) => {
  const clean = String(query || "").trim();
  if (!clean) return [];
  const next = [clean, ...readLocalHistory().filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
};

export default function SearchBar({
  placeholder = "Search products...",
  className = "",
  showSuggestions = true,
  onSearch,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [autocomplete, setAutocomplete] = useState(defaultAutocomplete);
  const [localHistory, setLocalHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    setLocalHistory(readLocalHistory());
  }, []);

  useEffect(() => {
    if (!showSuggestions || !isOpen) return undefined;

    let ignore = false;
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await getSearchAutocomplete({ q: debouncedQuery });
        if (!ignore) setAutocomplete({ ...defaultAutocomplete, ...(response.data.data || {}) });
      } catch (error) {
        console.error("Search autocomplete failed:", error);
        if (!ignore) setAutocomplete(defaultAutocomplete);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchSuggestions();
    return () => {
      ignore = true;
    };
  }, [debouncedQuery, isOpen, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recentSearches = useMemo(() => {
    const serverRecent = (autocomplete.recentSearches || []).map((item) => item.query || item);
    return [...new Set([...localHistory, ...serverRecent].filter(Boolean))].slice(0, 8);
  }, [autocomplete.recentSearches, localHistory]);

  const hasContent =
    recentSearches.length > 0 ||
    autocomplete.trendingSearches?.length > 0 ||
    autocomplete.matchingCategories?.length > 0 ||
    autocomplete.products?.length > 0;

  const runSearch = (searchQuery = query) => {
    const clean = String(searchQuery || "").trim();
    if (!clean) return;
    setLocalHistory(saveLocalHistory(clean));
    setIsOpen(false);
    setQuery("");
    if (onSearch) {
      onSearch(clean);
    } else {
      navigate(`/search?q=${encodeURIComponent(clean)}`);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runSearch();
  };

  const handleProductClick = () => {
    setIsOpen(false);
    setQuery("");
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setLocalHistory([]);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (showSuggestions) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          placeholder={placeholder}
          className={className}
        />

        {query ? (
          <button
            type="button"
            aria-label={t("search.clearSearch")}
            onClick={() => setQuery("")}
            className="absolute right-[5.75rem] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <VoiceSearch
            onPanelChange={(open) => {
              if (open) setIsOpen(false);
            }}
            onSearch={(searchTerm) => {
              setQuery(searchTerm);
              runSearch(searchTerm);
            }}
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1e7098] text-white transition hover:bg-[#1a5f7f]"
            aria-label={t("common.search")}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {isOpen && showSuggestions && hasContent ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-full z-[400] mt-2 max-h-[min(620px,calc(100vh-8rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="max-h-[inherit] overflow-y-auto p-3">
                {query && autocomplete.correctedQuery ? (
                  <button
                    type="button"
                    onClick={() => runSearch(autocomplete.correctedQuery)}
                    className="mb-2 flex w-full items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-left text-sm font-medium text-sky-800 transition hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("search.searchInsteadFor", { query: autocomplete.correctedQuery })}
                  </button>
                ) : null}

                {autocomplete.products?.length ? (
                  <div>
                    <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("search.topProductMatches")}
                    </p>
                    <div className="space-y-1">
                      {autocomplete.products.map((product) => (
                        <Link
                          key={product._id}
                          to={`/product/${product._id}`}
                          onClick={handleProductClick}
                          className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <img
                            src={product.image || product.images?.[0]}
                            alt=""
                            className="h-12 w-12 rounded-md bg-gray-100 object-cover dark:bg-gray-800"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
                              {product.title}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {product.brand || product.categoryName || t("search.productFallback")} - BDT {Number(product.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {autocomplete.matchingCategories?.length ? (
                  <div className="mt-3">
                    <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("search.matchingCategories")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {autocomplete.matchingCategories.slice(0, 6).map((category, index) => {
                        const Icon = getCategoryIcon(category);
                        const imageSource = getCategoryImageSource(category);
                        const theme = getCategoryTheme(category, index);

                        return (
                          <Link
                            key={category._id}
                            to={`/products?category=${category._id}`}
                            onClick={handleProductClick}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 p-2 transition hover:border-[#1e7098]/40 hover:bg-[#1e7098]/5 dark:border-gray-800 dark:hover:border-[#1e7098]/50"
                          >
                            <span className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-md ring-1 ${theme}`}>
                              {imageSource ? (
                                <img src={imageSource} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {category.name}
                              </span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400">
                                {category.productCount || 0} products
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950 lg:border-l lg:border-t-0">
                {recentSearches.length ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {t("search.recentSearches")}
                      </p>
                      <button type="button" onClick={clearHistory} className="text-xs font-semibold text-[#1e7098]">
                        {t("common.clear")}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.slice(0, 6).map((term) => (
                        <button
                          type="button"
                          key={term}
                          onClick={() => runSearch(term)}
                          className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {autocomplete.trendingSearches?.length ? (
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {t("search.trendingSearches")}
                    </p>
                    <div className="space-y-1">
                      {autocomplete.trendingSearches.slice(0, 6).map((item) => (
                        <button
                          type="button"
                          key={item.query || item}
                          onClick={() => runSearch(item.query || item)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-gray-700 transition hover:bg-white dark:text-gray-200 dark:hover:bg-gray-900"
                        >
                          <Tags className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate">{item.query || item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => runSearch(query || recentSearches[0] || autocomplete.trendingSearches?.[0]?.query || "products")}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e7098] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5f7f]"
                >
                  <Search className="h-4 w-4" />
                  View all results
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
