import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { searchProducts, getCategories } from "../services/api";
import useDebounce from "../hooks/useDebounce";

export default function SearchAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder,
  className = "",
  showSuggestions = true,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches] = useState([
    "smartphone",
    "laptop",
    "headphones",
    "watch",
    "shoes",
    "clothing",
    "electronics",
    "books",
    "home decor",
    "fitness",
  ]);

  const debouncedValue = useDebounce(value, 300);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Load categories
    fetchCategories();
  }, []);

  useEffect(() => {
    if (debouncedValue && debouncedValue.length >= 2) {
      fetchSuggestions(debouncedValue);
    } else {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [debouncedValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSuggestions = async (query) => {
    if (!showSuggestions) return;

    setIsLoading(true);
    try {
      const [productsRes] = await Promise.all([searchProducts(query)]);

      const products = productsRes.data.data || [];

      // Create suggestions array
      const productSuggestions = products.slice(0, 5).map((product) => ({
        type: "product",
        id: product._id,
        title: product.title,
        price: product.price,
        image: product.images?.[0],
        category: product.category,
      }));

      // Category suggestions
      const categorySuggestions = categories
        .filter((cat) => cat.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((category) => ({
          type: "category",
          id: category._id,
          title: category.name,
          slug: category.slug,
        }));

      // Search term suggestions
      const searchSuggestions = popularSearches
        .filter((term) => term.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((term) => ({
          type: "search",
          title: term,
        }));

      setSuggestions([
        ...productSuggestions,
        ...categorySuggestions,
        ...searchSuggestions,
      ]);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowDropdown(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    const totalSuggestions =
      suggestions.length + (value ? 0 : recentSearches.length);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalSuggestions - 1 ? prev + 1 : -1,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > -1 ? prev - 1 : totalSuggestions - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          const allItems = value
            ? suggestions
            : [
                ...recentSearches.map((term) => ({
                  type: "search",
                  title: term,
                })),
                ...suggestions,
              ];
          const selectedItem = allItems[selectedIndex];
          handleSuggestionClick(selectedItem);
        } else if (value.trim()) {
          handleSubmit();
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    switch (suggestion.type) {
      case "product":
        navigate(`/products/${suggestion.id}`);
        addToRecentSearches(suggestion.title);
        break;
      case "category":
        navigate(`/category/${suggestion.slug}`);
        addToRecentSearches(suggestion.title);
        break;
      case "search":
        onChange(suggestion.title);
        navigate(`/search?q=${encodeURIComponent(suggestion.title)}`);
        addToRecentSearches(suggestion.title);
        break;
    }
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit();
      addToRecentSearches(value.trim());
      setShowDropdown(false);
    }
  };

  const addToRecentSearches = (term) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(
      0,
      5,
    );
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  const renderSuggestionIcon = (type) => {
    switch (type) {
      case "product":
        return (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        );
      case "category":
        return (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        );
      case "search":
        return (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pr-12 ${className}`}
          autoComplete="off"
        />

        {/* Search Icon */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={handleSubmit}
            className="h-10 w-10 bg-[#1e7098] text-white rounded-md hover:bg-[#1a5f7f] transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches (when input is empty) */}
          {!value && recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Recent Searches
                </h4>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((term, index) => (
                  <button
                    key={term}
                    onClick={() =>
                      handleSuggestionClick({ type: "search", title: term })
                    }
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      selectedIndex === index
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {term}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((suggestion, index) => {
                const adjustedIndex = !value
                  ? index + recentSearches.length
                  : index;
                return (
                  <button
                    key={`${suggestion.type}-${suggestion.id || suggestion.title}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      selectedIndex === adjustedIndex
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {suggestion.type === "product" && suggestion.image ? (
                      <img
                        src={suggestion.image}
                        alt={suggestion.title}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      renderSuggestionIcon(suggestion.type)
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.title}
                      </p>
                      {suggestion.type === "product" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${suggestion.price} • {suggestion.category}
                        </p>
                      )}
                      {suggestion.type === "category" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Category
                        </p>
                      )}
                    </div>

                    {suggestion.type === "search" && (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7l3.5 3.5L17 4"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {value && suggestions.length === 0 && !isLoading && (
            <div className="p-4 text-center">
              <svg
                className="w-8 h-8 text-gray-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No suggestions found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Press Enter to search for "{value}"
              </p>
            </div>
          )}

          {/* Popular Searches (when no input and no recent searches) */}
          {!value && recentSearches.length === 0 && (
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Popular Searches
              </h4>
              <div className="flex flex-wrap gap-2">
                {popularSearches.slice(0, 6).map((term) => (
                  <button
                    key={term}
                    onClick={() =>
                      handleSuggestionClick({ type: "search", title: term })
                    }
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
