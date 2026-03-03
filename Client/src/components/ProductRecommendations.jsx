import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "./Skeleton";
import { getProducts } from "../services/api";

const ProductRecommendations = ({
  productId,
  category,
  type = "similar",
  title = "Similar Products",
  limit = 4,
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [productId, type, category]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      let recommendedProducts = [];

      // Try to fetch from recommendations API first
      try {
        let url = "";
        switch (type) {
          case "similar":
            url = `${import.meta.env.VITE_API_URL}/recommendations/similar/${productId}?limit=${limit}`;
            break;
          case "also-viewed":
            url = `${import.meta.env.VITE_API_URL}/recommendations/also-viewed/${productId}?limit=${limit}`;
            break;
          case "bought-together":
            url = `${import.meta.env.VITE_API_URL}/recommendations/bought-together/${productId}?limit=${limit}`;
            break;
          case "trending":
            url = `${import.meta.env.VITE_API_URL}/recommendations/trending?limit=${limit}`;
            break;
          default:
            url = `${import.meta.env.VITE_API_URL}/recommendations/similar/${productId}?limit=${limit}`;
        }

        console.log("Fetching recommendations from:", url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log("Recommendations API response:", data);
          recommendedProducts = data.data || [];
        } else {
          console.log(
            "Recommendations API failed with status:",
            response.status,
          );
        }
      } catch (apiError) {
        console.log(
          "Recommendations API not available, using fallback:",
          apiError.message,
        );
      }

      // Fallback: If no recommendations from API, get products from same category
      if (recommendedProducts.length === 0 && category) {
        try {
          console.log("Using category fallback for category:", category);
          // Try both categoryId and category filters
          const fallbackResponse = await getProducts({
            categoryId: category, // Try categoryId first since that's what products have
            limit: limit + 5, // Get more to filter out current product
          });

          if (fallbackResponse.data && fallbackResponse.data.data) {
            // Filter out the current product and limit results
            recommendedProducts = fallbackResponse.data.data
              .filter((product) => product._id !== productId)
              .slice(0, limit);
            console.log(
              "Category fallback products:",
              recommendedProducts.length,
            );
          }

          // If still no results, try with category field
          if (recommendedProducts.length === 0) {
            const fallbackResponse2 = await getProducts({
              category: category,
              limit: limit + 5,
            });

            if (fallbackResponse2.data && fallbackResponse2.data.data) {
              recommendedProducts = fallbackResponse2.data.data
                .filter((product) => product._id !== productId)
                .slice(0, limit);
              console.log(
                "Category fallback (category field) products:",
                recommendedProducts.length,
              );
            }
          }
        } catch (fallbackError) {
          console.error("Fallback recommendations failed:", fallbackError);
        }
      }

      // Final fallback: Get any products if still no results
      if (recommendedProducts.length === 0) {
        try {
          console.log("Using final fallback - any products");
          const anyProductsResponse = await getProducts({ limit: limit + 5 });
          if (anyProductsResponse.data && anyProductsResponse.data.data) {
            recommendedProducts = anyProductsResponse.data.data
              .filter((product) => product._id !== productId)
              .slice(0, limit);
            console.log("Final fallback products:", recommendedProducts.length);
          }
        } catch (finalError) {
          console.error("Final fallback failed:", finalError);
        }
      }

      console.log(
        "Final recommended products count:",
        recommendedProducts.length,
      );
      setProducts(recommendedProducts);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {title}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        {products.length >= limit && (
          <Link
            to="/products"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
          >
            View All
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
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductRecommendations;
