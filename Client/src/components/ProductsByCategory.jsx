import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ProductCard from "./ProductCard";

export default function ProductsByCategory() {
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoriesWithProducts();
  }, []);

  const fetchCategoriesWithProducts = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;

      // Fetch categories
      const categoriesResponse = await axios.get(`${apiUrl}/categories`);
      const categories = categoriesResponse.data.data || [];

      // Fetch all products
      const productsResponse = await axios.get(`${apiUrl}/products`);
      const allProducts = productsResponse.data.data || [];

      // Group products by category
      const categoriesWithProductsData = categories
        .map((category) => {
          const categoryProducts = allProducts.filter(
            (product) => product.categoryId === category._id,
          );
          return {
            ...category,
            products: categoryProducts.slice(0, 4), // Show only 4 products per category
            totalProducts: categoryProducts.length,
          };
        })
        .filter((category) => category.products.length > 0); // Only show categories with products

      setCategoriesWithProducts(categoriesWithProductsData);
    } catch (error) {
      console.error("Error fetching categories with products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-8"></div>
            {[1, 2].map((i) => (
              <div key={i} className="mb-12">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div
                      key={j}
                      className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categoriesWithProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Shop by Category
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover our curated collections across different categories
          </p>
        </div>

        {/* Categories with Products */}
        <div className="space-y-16">
          {categoriesWithProducts.map((category, index) => (
            <div key={category._id} className="relative">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      index % 4 === 0
                        ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                        : index % 4 === 1
                          ? "bg-gradient-to-br from-pink-500 to-rose-600"
                          : index % 4 === 2
                            ? "bg-gradient-to-br from-green-500 to-emerald-600"
                            : "bg-gradient-to-br from-orange-500 to-red-600"
                    }`}
                  >
                    {getCategoryIcon(category.name)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.totalProducts} products available
                    </p>
                  </div>
                </div>

                <Link
                  to={`/category/${category.slug}`}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-full transition-all duration-200"
                >
                  <span>View All</span>
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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
                </Link>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {category.products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Divider */}
              {index < categoriesWithProducts.length - 1 && (
                <div className="mt-12 border-t border-gray-200 dark:border-gray-700"></div>
              )}
            </div>
          ))}
        </div>

        {/* View All Categories CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <span>Explore All Products</span>
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
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

// Helper function to get category icons
function getCategoryIcon(categoryName) {
  const name = categoryName.toLowerCase();
  if (name.includes("men") || name.includes("man")) return "👔";
  if (
    name.includes("women") ||
    name.includes("woman") ||
    name.includes("ladies")
  )
    return "👗";
  if (
    name.includes("electronic") ||
    name.includes("phone") ||
    name.includes("tech")
  )
    return "📱";
  if (name.includes("baby") || name.includes("kid") || name.includes("child"))
    return "👶";
  if (name.includes("shoe") || name.includes("footwear")) return "👟";
  if (name.includes("beauty") || name.includes("cosmetic")) return "💄";
  if (name.includes("home") || name.includes("furniture")) return "🏠";
  if (name.includes("book") || name.includes("education")) return "📚";
  if (name.includes("game") || name.includes("toy")) return "🎮";
  if (name.includes("sport") || name.includes("fitness")) return "⚽";
  return "🛍️";
}
