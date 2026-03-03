import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";
import Loading from "../components/Loading";
import WishlistButton from "../components/WishlistButton";

export default function SharedWishlist() {
  const { shareId } = useParams();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSharedWishlist();
  }, [shareId]);

  const fetchSharedWishlist = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/wishlist/shared/${shareId}`,
      );

      if (response.data.success) {
        setWishlist(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch shared wishlist:", error);
      setError(error.response?.data?.error || "Failed to load shared wishlist");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    const imageToUse = product.image || (product.images && product.images[0]);
    addToCart(product, 1, imageToUse);
  };

  if (loading) {
    return <Loading text="Loading shared wishlist..." />;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{error}</h2>
          <p className="text-gray-600 mb-6">
            This wishlist might be private or the link is invalid.
          </p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const products = wishlist?.productDetails || [];
  const userName = wishlist?.userDetails?.[0]?.name || "Someone";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Back to Home"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {userName}'s Wishlist
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {products.length} {products.length === 1 ? "item" : "items"} shared
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
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
          <div>
            <p className="text-blue-800 dark:text-blue-300 font-medium">
              You're viewing a shared wishlist
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
              {userName} has shared their favorite items with you. You can add
              any of these items to your own cart.
            </p>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            This wishlist is empty
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {userName} hasn't added any items yet
          </p>
          <Link to="/" className="btn-primary">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="card overflow-hidden group bg-white dark:bg-gray-800"
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                <Link to={`/product/${product._id}`}>
                  <img
                    src={product.image || (product.images && product.images[0])}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Wishlist Button */}
                <div className="absolute top-3 right-3">
                  <WishlistButton product={product} size="md" />
                </div>

                {/* Stock Badge */}
                {product.stock <= 5 && product.stock > 0 && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    Only {product.stock} left
                  </span>
                )}
                {product.stock === 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <Link to={`/product/${product._id}`}>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                    {product.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-primary-500 dark:text-primary-400">
                    {formatPrice(product.price)}
                  </span>
                  {product.stock > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      In Stock
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                  >
                    {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                  </button>
                  <Link
                    to={`/product/${product._id}`}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Continue Shopping */}
      {products.length > 0 && (
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Browse More Products
          </Link>
        </div>
      )}
    </div>
  );
}
