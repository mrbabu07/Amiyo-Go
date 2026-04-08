import { useState, useEffect } from "react";
import axios from "axios";
import DynamicProductCard from "./DynamicProductCard";

export default function DynamicProductBrowser() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 12;

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when category or page changes
  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory._id, page);
    }
  }, [selectedCategory, page]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dynamic-categories?isActive=true`
      );
      setCategories(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedCategory(response.data.data[0]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async (categoryId, pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dynamic-products/category/${categoryId}?page=${pageNum}&limit=${LIMIT}`
      );
      setProducts(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Products</h1>
          <p className="text-gray-600">
            Explore our dynamic product catalog with category-specific attributes
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={() => handleCategoryChange(category)}
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory?._id === category._id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-blue-600"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Info */}
        {selectedCategory && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-2">{selectedCategory.name}</h2>
            {selectedCategory.description && (
              <p className="text-gray-600 mb-4">{selectedCategory.description}</p>
            )}

            {/* Attributes Info */}
            {selectedCategory.attributes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Product Specifications:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory.attributes.map((attr) => (
                    <span
                      key={attr._id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {attr.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">No products found in this category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <DynamicProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-4 py-2 rounded-lg ${
                      page === p
                        ? "bg-blue-600 text-white"
                        : "border hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
