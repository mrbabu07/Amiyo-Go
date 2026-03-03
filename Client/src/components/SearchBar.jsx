import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { searchProducts } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";
import VoiceSearch from "./VoiceSearch";

export default function SearchBar({
  placeholder = "Search products...",
  className = "",
  showSuggestions = true,
  onSearch,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length >= 2 && showSuggestions) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, showSuggestions]);

  const fetchSuggestions = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await searchProducts(searchQuery);
      const products = response.data.data || [];
      setSuggestions(products.slice(0, 5)); // Limit to 5 suggestions
      setIsOpen(products.length > 0);
    } catch (error) {
      console.error("Search suggestions failed:", error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery = query) => {
    if (searchQuery.trim()) {
      setIsOpen(false);
      setQuery("");
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          navigate(`/product/${suggestions[selectedIndex]._id}`);
          setIsOpen(false);
          setQuery("");
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (product) => {
    navigate(`/product/${product._id}`);
    setIsOpen(false);
    setQuery("");
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={className}
        />

        {/* Search and Voice Buttons */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <VoiceSearch
            onSearch={(searchTerm) => {
              setQuery(searchTerm);
              handleSearch(searchTerm);
            }}
          />

          <button
            type="submit"
            className="h-10 w-10 bg-[#1e7098] text-white rounded-md hover:bg-[#1a5f7f] transition-colors flex items-center justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      </form>

      {/* Search Suggestions */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2">
              {suggestions.map((product, index) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedIndex === index
                      ? "bg-[#1e7098] text-white"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => handleSuggestionClick(product)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Product Image */}
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={product.image || product.images?.[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-medium truncate ${
                        selectedIndex === index
                          ? "text-white"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {product.title}
                    </h4>
                    <p
                      className={`text-sm truncate ${
                        selectedIndex === index
                          ? "text-white/80"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      ৳{product.price?.toFixed(2)}
                    </p>
                  </div>

                  {/* Arrow Icon */}
                  <div
                    className={
                      selectedIndex === index ? "text-white" : "text-gray-400"
                    }
                  >
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* View All Results */}
            <div className="border-t border-gray-100 dark:border-gray-600 p-2">
              <button
                onClick={() => handleSearch()}
                className="w-full p-3 text-center text-[#1e7098] hover:bg-[#1e7098] hover:text-white rounded-lg transition-colors font-medium"
              >
                View all results for "{query}"
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popular Searches (when no query) */}
      <AnimatePresence>
        {isOpen && !query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Popular Searches
              </h4>
              <div className="space-y-2">
                {["T-shirt", "Jeans", "Shoes", "Dress", "Jacket"].map(
                  (term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="block w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <svg
                        className="w-4 h-4 inline mr-2 text-gray-400"
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
                      {term}
                    </button>
                  ),
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
