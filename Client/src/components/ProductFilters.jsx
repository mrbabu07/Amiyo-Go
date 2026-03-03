import { useState, useEffect } from "react";
import { getFilterOptions } from "../services/api";

export default function ProductFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}) {
  const [filterOptions, setFilterOptions] = useState({
    priceRange: { min: 0, max: 1000 },
    sizes: [],
    colors: [],
    categories: [],
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await getFilterOptions();
      setFilterOptions(response.data.data);
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleArrayFilterChange = (key, value, checked) => {
    const currentArray = filters[key] || [];
    let newArray;

    if (checked) {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray.filter((item) => item !== value);
    }

    onFiltersChange({ ...filters, [key]: newArray });
  };

  const activeFiltersCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "" && value !== false;
  }).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Mobile Filter Toggle */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-gray-900">
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
      </div>

      {/* Filter Content */}
      <div className={`${isOpen ? "block" : "hidden"} md:block p-4 space-y-6`}>
        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="text-sm text-gray-600">
              {activeFiltersCount} filter(s) applied
            </span>
            <button
              onClick={onClearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Price Range */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Price Range</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ""}
                onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <span className="text-gray-400 self-center">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ""}
                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div className="text-xs text-gray-500">
              Range: ৳{filterOptions.priceRange.min} - ৳
              {filterOptions.priceRange.max}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Minimum Rating</h3>
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label
                key={rating}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="minRating"
                  value={rating}
                  checked={filters.minRating == rating}
                  onChange={(e) =>
                    handleFilterChange("minRating", e.target.value)
                  }
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm text-gray-600 ml-1">& up</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Sizes */}
        {filterOptions.sizes.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Sizes</h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.sizes.map((size) => (
                <label key={size} className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(filters.sizes || []).includes(size)}
                    onChange={(e) =>
                      handleArrayFilterChange("sizes", size, e.target.checked)
                    }
                    className="sr-only"
                  />
                  <span
                    className={`inline-block px-3 py-1 text-sm border rounded-lg transition-colors ${
                      (filters.sizes || []).includes(size)
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {size}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {filterOptions.colors.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Colors</h3>
            <div className="space-y-2">
              {filterOptions.colors.map((color) => (
                <label
                  key={color}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(filters.colors || []).includes(color)}
                    onChange={(e) =>
                      handleArrayFilterChange("colors", color, e.target.checked)
                    }
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{color}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Availability</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.inStock || false}
              onChange={(e) => handleFilterChange("inStock", e.target.checked)}
              className="text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">In Stock Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
