import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdvancedFilters({
  categories = [],
  onFilterChange,
  initialFilters = {},
}) {
  const [filters, setFilters] = useState({
    category: initialFilters.category || "",
    priceRange: initialFilters.priceRange || [0, 10000],
    rating: initialFilters.rating || 0,
    brands: initialFilters.brands || [],
    sizes: initialFilters.sizes || [],
    colors: initialFilters.colors || [],
    inStock:
      initialFilters.inStock !== undefined ? initialFilters.inStock : true,
    onSale: initialFilters.onSale || false,
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    rating: false,
    brand: false,
    size: false,
    color: false,
    availability: false,
  });

  // Available options (can be fetched from API)
  const brands = [
    "Nike",
    "Adidas",
    "Puma",
    "Reebok",
    "New Balance",
    "Under Armour",
  ];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const colors = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Red", hex: "#EF4444" },
    { name: "Blue", hex: "#3B82F6" },
    { name: "Green", hex: "#10B981" },
    { name: "Yellow", hex: "#F59E0B" },
    { name: "Purple", hex: "#8B5CF6" },
    { name: "Pink", hex: "#EC4899" },
  ];

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const handlePriceChange = (index, value) => {
    const newRange = [...filters.priceRange];
    newRange[index] = parseInt(value);
    setFilters({ ...filters, priceRange: newRange });
  };

  const handleBrandToggle = (brand) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand];
    setFilters({ ...filters, brands: newBrands });
  };

  const handleSizeToggle = (size) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    setFilters({ ...filters, sizes: newSizes });
  };

  const handleColorToggle = (color) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter((c) => c !== color)
      : [...filters.colors, color];
    setFilters({ ...filters, colors: newColors });
  };

  const clearFilters = () => {
    const clearedFilters = {
      category: "",
      priceRange: [0, 10000],
      rating: 0,
      brands: [],
      sizes: [],
      colors: [],
      inStock: true,
      onSale: false,
    };
    setFilters(clearedFilters);
  };

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) count++;
    if (filters.rating > 0) count++;
    if (filters.brands.length > 0) count++;
    if (filters.sizes.length > 0) count++;
    if (filters.colors.length > 0) count++;
    if (filters.onSale) count++;
    return count;
  };

  const FilterSection = ({ title, section, children }) => (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            expandedSections[section] ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <AnimatePresence>
        {expandedSections[section] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const FiltersContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Filters
          </h2>
          {activeFiltersCount() > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeFiltersCount()} active filter
              {activeFiltersCount() > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={clearFilters}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Categories */}
      <FilterSection title="Categories" section="category">
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer group">
            <input
              type="radio"
              name="category"
              checked={filters.category === ""}
              onChange={() => setFilters({ ...filters, category: "" })}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              All Categories
            </span>
          </label>
          {categories.map((category) => (
            <label
              key={category._id}
              className="flex items-center cursor-pointer group"
            >
              <input
                type="radio"
                name="category"
                checked={filters.category === category._id}
                onChange={() =>
                  setFilters({ ...filters, category: category._id })
                }
                className="w-4 h-4 text-primary-500 focus:ring-primary-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {category.name}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range" section="price">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                Min
              </label>
              <input
                type="number"
                value={filters.priceRange[0]}
                onChange={(e) => handlePriceChange(0, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
            <span className="text-gray-400 mt-6">-</span>
            <div className="flex-1">
              <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                Max
              </label>
              <input
                type="number"
                value={filters.priceRange[1]}
                onChange={(e) => handlePriceChange(1, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="10000"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={filters.priceRange[1]}
            onChange={(e) => handlePriceChange(1, e.target.value)}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>৳{filters.priceRange[0]}</span>
            <span>৳{filters.priceRange[1]}</span>
          </div>
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Customer Rating" section="rating">
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <label
              key={rating}
              className="flex items-center cursor-pointer group"
            >
              <input
                type="radio"
                name="rating"
                checked={filters.rating === rating}
                onChange={() => setFilters({ ...filters, rating })}
                className="w-4 h-4 text-primary-500 focus:ring-primary-500"
              />
              <div className="ml-3 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < rating
                        ? "text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                  & Up
                </span>
              </div>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Brands */}
      <FilterSection title="Brands" section="brand">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {brands.map((brand) => (
            <label
              key={brand}
              className="flex items-center cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.brands.includes(brand)}
                onChange={() => handleBrandToggle(brand)}
                className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Sizes */}
      <FilterSection title="Sizes" section="size">
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeToggle(size)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                filters.sizes.includes(size)
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Colors */}
      <FilterSection title="Colors" section="color">
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorToggle(color.name)}
              className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                filters.colors.includes(color.name)
                  ? "border-primary-500 scale-110"
                  : "border-gray-300 dark:border-gray-600 hover:scale-105"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {filters.colors.includes(color.name) && (
                <svg
                  className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability" section="availability">
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) =>
                setFilters({ ...filters, inStock: e.target.checked })
              }
              className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
            />
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              In Stock Only
            </span>
          </label>
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.onSale}
              onChange={(e) =>
                setFilters({ ...filters, onSale: e.target.checked })
              }
              className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
            />
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              On Sale
            </span>
          </label>
        </div>
      </FilterSection>
    </>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
          <FiltersContent />
        </div>
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {activeFiltersCount() > 0 && (
            <span className="bg-white text-primary-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {activeFiltersCount()}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-800 z-50 overflow-y-auto lg:hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Filters
                  </h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <FiltersContent />
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full btn-primary"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
