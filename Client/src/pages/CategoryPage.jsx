import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { getProducts, getCategories } from "../services/api";
import ProductCard from "../components/ProductCard";
import {
  CategoryPageSkeleton,
  ProductCardSkeleton,
} from "../components/Skeleton";
import SortDropdown from "../components/SortDropdown";
import { useSorting } from "../hooks/useSorting";
import { useCurrency } from "../hooks/useCurrency";

export default function CategoryPage() {
  const { category } = useParams();
  const location = useLocation();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  // Use sorting hook
  const {
    sortedItems: sortedProducts,
    sortBy,
    setSortBy,
  } = useSorting(products, "default");

  // Determine if this is "all categories" or "all products" page
  const isAllCategories = location.pathname === "/categories";
  const isAllProducts =
    location.pathname === "/products" || (!category && !isAllCategories);

  // Extract category from legacy routes
  const getCurrentCategory = () => {
    if (category) return category; // Dynamic route like /category/mens

    // Legacy routes
    const path = location.pathname.slice(1); // Remove leading slash
    if (
      path === "mens" ||
      path === "womens" ||
      path === "electronics" ||
      path === "baby"
    ) {
      return path;
    }

    return null;
  };

  const currentCategorySlug = getCurrentCategory();

  // Define category info first
  const categoryInfo = {
    mens: {
      name: "Men's Collection",
      description: "Discover the latest trends in men's fashion",
      image:
        "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1200&h=400&fit=crop",
    },
    womens: {
      name: "Women's Collection",
      description: "Elegant styles for the modern woman",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=400&fit=crop",
    },
    electronics: {
      name: "Electronics",
      description: "Latest gadgets and tech essentials",
      image:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=400&fit=crop",
    },
    baby: {
      name: "Baby & Kids",
      description: "Everything for your little ones",
      image:
        "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1200&h=400&fit=crop",
    },
  };

  // Get current page info
  const getCurrentPageInfo = () => {
    if (isAllCategories) {
      return {
        name: "All Categories",
        description: "Browse all available categories",
        image:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      };
    }

    if (isAllProducts) {
      return {
        name: "All Products",
        description: "Discover our complete collection",
        image:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      };
    }

    return (
      categoryInfo[currentCategorySlug] || {
        name: "Products",
        description: "Browse our collection",
        image:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      }
    );
  };

  const currentCategory = getCurrentPageInfo();

  useEffect(() => {
    console.log("Category changed:", {
      category,
      currentCategorySlug,
      isAllCategories,
    });
    if (isAllCategories) {
      fetchCategories();
    } else {
      fetchProducts();
    }
  }, [category, currentCategorySlug, isAllCategories, location.pathname]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      console.log("Current category slug:", currentCategorySlug);

      let categoryId = null;

      // If we have a category slug, fetch the category to get its ID
      if (currentCategorySlug && !isAllProducts) {
        try {
          const categoriesResponse = await getCategories();
          const allCategories = categoriesResponse.data.data || [];
          console.log("All categories:", allCategories);

          // Find the category by slug
          const matchedCategory = allCategories.find(
            (cat) => cat.slug === currentCategorySlug,
          );

          console.log("Matched category:", matchedCategory);

          if (matchedCategory) {
            categoryId = matchedCategory._id;
            console.log("Using category ID:", categoryId);
          } else {
            console.warn("No category found for slug:", currentCategorySlug);
          }
        } catch (catError) {
          console.error("Failed to fetch categories:", catError);
        }
      }

      // Fetch products with category filter
      const queryParams = categoryId ? { category: categoryId } : {};
      console.log("Fetching products with params:", queryParams);

      const response = await getProducts(queryParams);
      const fetchedProducts = response.data.data || [];
      console.log("Products fetched:", fetchedProducts.length);

      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Category Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={currentCategory.image}
          alt={currentCategory.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <nav className="flex items-center space-x-2 text-sm text-gray-300 mb-4">
              <Link to="/" className="hover:text-white transition">
                Home
              </Link>
              <svg
                className="w-4 h-4"
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
              <span className="text-white">{currentCategory.name}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {currentCategory.name}
            </h1>
            <p className="text-lg text-gray-200">
              {currentCategory.description}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Info - Remove after testing */}
        {process.env.NODE_ENV === "development" && !isAllCategories && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
            <p className="font-bold mb-2">Debug Info:</p>
            <p>Category Slug: {currentCategorySlug || "None"}</p>
            <p>Is All Products: {isAllProducts ? "Yes" : "No"}</p>
            <p>Products Count: {products.length}</p>
            <p>Loading: {loading ? "Yes" : "No"}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <p className="text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">
              {products.length}
            </span>{" "}
            products found
          </p>

          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <SortDropdown
              value={sortBy}
              onChange={setSortBy}
              className="min-w-[200px]"
            />

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${
                  viewMode === "grid"
                    ? "bg-primary-500 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${
                  viewMode === "list"
                    ? "bg-primary-500 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Products/Categories Content */}
        {loading ? (
          <CategoryPageSkeleton />
        ) : isAllCategories ? (
          // Show categories grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/category/${cat.slug}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group"
              >
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Browse {cat.name.toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
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
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No products found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't find any products in this category.
            </p>
            <Link to="/" className="btn-primary inline-block">
              Continue Shopping
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedProducts.map((product) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group"
              >
                <div className="w-48 h-48 flex-shrink-0 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition mb-2">
                      {product.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-bold text-primary-500">
                      {formatPrice(product.price)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        product.stock > 0
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : "Out of stock"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
