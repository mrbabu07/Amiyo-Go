import { Link } from "react-router-dom";
import useWishlist from "../hooks/useWishlist";
import useCart from "../hooks/useCart";
import Loading from "../components/Loading";
import WishlistButton from "../components/WishlistButton";
import WishlistShare from "../components/WishlistShare";
import { useCurrency } from "../hooks/useCurrency";
import { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../firebase/firebase.config";

export default function Wishlist() {
  const { wishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [isPublic, setIsPublic] = useState(false);
  const [shareId, setShareId] = useState("");

  const handleTogglePublic = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please login");
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/wishlist/toggle-public`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setIsPublic(response.data.isPublic);
        if (response.data.shareId) {
          setShareId(response.data.shareId);
        }
      }
    } catch (error) {
      console.error("Failed to toggle wishlist public:", error);
    }
  };

  // Fetch wishlist data to get shareId and isPublic status
  useEffect(() => {
    const fetchWishlistData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const token = await currentUser.getIdToken();
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/wishlist`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.success && response.data.data) {
          setIsPublic(response.data.data.isPublic || false);
          setShareId(response.data.data.shareId || "");
        }
      } catch (error) {
        console.error("Failed to fetch wishlist data:", error);
      }
    };

    if (!loading && auth.currentUser) {
      fetchWishlistData();
    }
  }, [loading]);

  const handleAddToCart = (product) => {
    const imageToUse = product.image || (product.images && product.images[0]);
    addToCart(product, 1, imageToUse);
  };

  if (loading) {
    return <Loading text="Loading your wishlist..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
              My Wishlist
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
              for later
            </p>
          </div>
        </div>

        {/* Share Button */}
        {wishlist.length > 0 && (
          <WishlistShare
            wishlistId={shareId}
            isPublic={isPublic}
            onTogglePublic={handleTogglePublic}
          />
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-gray-600 mb-8">
            Save items you love to your wishlist and shop them later
          </p>
          <Link to="/" className="btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((product) => (
            <div key={product._id} className="card overflow-hidden group">
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100">
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
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-primary-500 transition-colors">
                    {product.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-primary-500">
                    {formatPrice(product.price)}
                  </span>
                  {product.stock > 0 && (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                      In Stock
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                  </button>
                  <Link
                    to={`/product/${product._id}`}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
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
      {wishlist.length > 0 && (
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
            Continue Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
