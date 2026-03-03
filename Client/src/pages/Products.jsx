import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts, getCategories } from "../services/api";
import { useCurrency } from "../hooks/useCurrency";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";
import Breadcrumb from "../components/Breadcrumb";

export default function Products() {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const productsPerPage = 12;

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, selectedCategory, priceRange, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Build query parameters for server-side filtering
      const queryParams = {};

      if (selectedCategory) {
        queryParams.category = selectedCategory;
      }

      if (priceRange[0] > 0) {
        queryParams.minPrice = priceRange[0];
      }

      if (priceRange[1] < 1000) {
        queryParams.maxPrice = priceRange[1];
      }

      // Add sorting parameters
      if (sortBy === "price-low") {
        queryParams.sortBy = "price";
        queryParams.sortOrder = 1;
      } else if (sortBy === "price-high") {
        queryParams.sortBy = "price";
        queryParams.sortOrder = -1;
      } else if (sortBy === "name") {
        queryParams.sortBy = "title";
        queryParams.sortOrder = 1;
      }

      const response = await getProducts(queryParams);
      const allProducts = response.data.data || [];

      // Pagination (client-side for now, could be moved to server)
      const total = Math.ceil(allProducts.length / productsPerPage);
      setTotalPages(total);
      const startIndex = (currentPage - 1) * productsPerPage;
      const paginatedProducts = allProducts.slice(
        startIndex,
        startIndex + productsPerPage,
      );

      setProducts(paginatedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const handlePriceChange = (e) => {
    const value = parseInt(e.target.value);
    setPriceRange([0, value]);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setPriceRange([0, 1000]);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>,
    );

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          1
        </button>,
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots1" className="px-2 text-gray-500 dark:text-gray-400">
            ...
          </span>,
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            currentPage === i
              ? "bg-primary-500 text-white border-primary-500"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {i}
        </button>,
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots2" className="px-2 text-gray-500 dark:text-gray-400">
            ...
          </span>,
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {totalPages}
        </button>,
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>,
    );

    return pages;
  };

  if (loading && products.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                All Products
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Discover our complete collection
              </p>
            </div>
            <Link
              to="/"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-2"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  Clear All
                </button>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Categories
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === ""}
                      onChange={() => handleCategoryChange("")}
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
                        checked={selectedCategory === category._id}
                        onChange={() => handleCategoryChange(category._id)}
                        className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Price Range
                </h3>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={handlePriceChange}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">৳0</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {formatPrice(priceRange[1])}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      ৳110,000
                    </span>
                  </div>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Sort By
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Right Content - Products Grid */}
          <main className="flex-1">
            {/* Results Info */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {products.length} products
                {selectedCategory && " in selected category"}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400 dark:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try adjusting your filters
                </p>
                <button
                  onClick={clearFilters}
                  className="btn-primary inline-block"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    {renderPagination()}
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
