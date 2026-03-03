import { Link } from "react-router-dom";
import { useComparison } from "../context/ComparisonContext";
import useCart from "../hooks/useCart";
import { useContext } from "react";
import { WishlistContext } from "../context/WishlistContext";
import { useCurrency } from "../hooks/useCurrency";
import StarRating from "../components/StarRating";
import CompareButton from "../components/CompareButton";

export default function Compare() {
  const { compareList, removeFromCompare, clearComparison } = useComparison();
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useContext(WishlistContext);
  const { formatPrice } = useCurrency();

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No products to compare
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add products to comparison to see them here
            </p>
            <Link to="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = (product) => {
    addToCart(product, 1);
  };

  const handleAddToWishlist = (product) => {
    addToWishlist(product);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Compare Products
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Compare {compareList.length} product
              {compareList.length > 1 ? "s" : ""} side by side
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearComparison}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear All
            </button>
            <Link to="/products" className="btn-primary">
              Add More Products
            </Link>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-white w-48">
                    Product
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center min-w-64">
                      <div className="relative">
                        <button
                          onClick={() => removeFromCompare(product._id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10"
                        >
                          ×
                        </button>
                        <Link to={`/product/${product._id}`} className="block">
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-32 h-32 object-cover rounded-lg mx-auto mb-3"
                          />
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                            {product.title}
                          </h3>
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price */}
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    Price
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center">
                      <div className="space-y-1">
                        <span className="text-2xl font-bold text-primary-600">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice &&
                          product.originalPrice > product.price && (
                            <div className="text-sm">
                              <span className="text-gray-500 line-through">
                                ${product.originalPrice}
                              </span>
                              <span className="text-green-600 ml-2">
                                {Math.round(
                                  ((product.originalPrice - product.price) /
                                    product.originalPrice) *
                                    100,
                                )}
                                % OFF
                              </span>
                            </div>
                          )}
                        {/* Price comparison indicator */}
                        {compareList.length > 1 && (
                          <div className="text-xs">
                            {Math.min(...compareList.map((p) => p.price)) ===
                              product.price && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                💰 Best Price
                              </span>
                            )}
                            {Math.max(...compareList.map((p) => p.price)) ===
                              product.price &&
                              compareList.length > 1 &&
                              Math.min(...compareList.map((p) => p.price)) !==
                                product.price && (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                                  Most Expensive
                                </span>
                              )}
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    Rating
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StarRating
                          rating={product.averageRating || product.rating || 0}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ({product.totalReviews || 0})
                        </span>
                      </div>
                      {/* Best rated indicator */}
                      {compareList.length > 1 && (
                        <div className="text-xs mt-1">
                          {Math.max(
                            ...compareList.map(
                              (p) => p.averageRating || p.rating || 0,
                            ),
                          ) ===
                            (product.averageRating || product.rating || 0) &&
                            (product.averageRating || product.rating || 0) >
                              0 && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                ⭐ Highest Rated
                              </span>
                            )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Value Score */}
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>Value Score</span>
                      <div className="group relative">
                        <svg
                          className="w-4 h-4 text-gray-400 cursor-help"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Rating ÷ Price × 100
                        </div>
                      </div>
                    </div>
                  </td>
                  {compareList.map((product) => {
                    const rating = product.averageRating || product.rating || 0;
                    const valueScore =
                      rating > 0
                        ? Math.round((rating / product.price) * 100)
                        : 0;
                    const maxValueScore = Math.max(
                      ...compareList.map((p) => {
                        const r = p.averageRating || p.rating || 0;
                        return r > 0 ? Math.round((r / p.price) * 100) : 0;
                      }),
                    );

                    return (
                      <td key={product._id} className="p-4 text-center">
                        <div className="space-y-1">
                          <span className="text-xl font-bold text-blue-600">
                            {valueScore}
                          </span>
                          {valueScore === maxValueScore &&
                            valueScore > 0 &&
                            compareList.length > 1 && (
                              <div className="text-xs">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                  🏆 Best Value
                                </span>
                              </div>
                            )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Stock */}
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    Availability
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          product.stock > 0
                            ? product.stock <= 5
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {product.stock > 0
                          ? product.stock <= 5
                            ? `Only ${product.stock} left`
                            : "In Stock"
                          : "Out of Stock"}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Description */}
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    Description
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {product.description}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* Category */}
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    Category
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {product.category?.name || "Uncategorized"}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Sizes (if available) */}
                {compareList.some(
                  (product) => product.sizes && product.sizes.length > 0,
                ) && (
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                      Available Sizes
                    </td>
                    {compareList.map((product) => (
                      <td key={product._id} className="p-4 text-center">
                        {product.sizes && product.sizes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {product.sizes.map((size, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                              >
                                {size}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Colors (if available) */}
                {compareList.some(
                  (product) => product.colors && product.colors.length > 0,
                ) && (
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                      Available Colors
                    </td>
                    {compareList.map((product) => (
                      <td key={product._id} className="p-4 text-center">
                        {product.colors && product.colors.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {product.colors.map((color, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                              >
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{
                                    backgroundColor:
                                      color.hex || color.name?.toLowerCase(),
                                  }}
                                />
                                {color.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Actions */}
                <tr>
                  <td className="p-4 font-medium text-gray-900 dark:text-white">
                    Actions
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-4 text-center">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                          className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                        </button>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleAddToWishlist(product)}
                            className={`p-2 rounded-lg border transition-colors ${
                              isInWishlist(product._id)
                                ? "bg-red-50 border-red-200 text-red-600"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            }`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill={
                                isInWishlist(product._id)
                                  ? "currentColor"
                                  : "none"
                              }
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                          </button>
                          <Link
                            to={`/product/${product._id}`}
                            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
