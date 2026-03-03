import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById } from "../services/api";
import useCart from "../hooks/useCart";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useCurrency } from "../hooks/useCurrency";
import { ProductDetailSkeleton } from "../components/Skeleton";
import StockIndicator from "../components/StockIndicator";
import ReviewsSection from "../components/reviews/ReviewsSection";
import ProductRecommendations from "../components/ProductRecommendations";
import SizeGuide from "../components/SizeGuide";
import BackButton from "../components/BackButton";
import Breadcrumb from "../components/Breadcrumb";
import ProductVariantSelector from "../components/ProductVariantSelector";
import ProductQA from "../components/ProductQA";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { formatPrice } = useCurrency();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      // Validate product ID format
      if (!id || id.length !== 24) {
        console.error("Invalid product ID format:", id);
        setError("Invalid product ID");
        setLoading(false);
        return;
      }

      const response = await getProductById(id);
      const data = response.data.data;
      setProduct(data);

      // Add to recently viewed
      addToRecentlyViewed(data);

      // Set initial selected image
      const initialImage = data.image || (data.images && data.images[0]) || "";
      setSelectedImage(initialImage);

      if (data.sizes && data.sizes.length > 0) {
        setSelectedSize(data.sizes[0]);
      }

      if (data.colors && data.colors.length > 0) {
        setSelectedColor(data.colors[0]);
      }
      setError(null);
    } catch (error) {
      console.error("Failed to fetch product:", error);
      if (error.response) {
        if (error.response.status === 404) {
          setError(
            "Product not found. This product may have been removed or the link is invalid.",
          );
        } else if (error.response.status === 400) {
          setError("Invalid product link. Please check the URL and try again.");
        } else {
          setError("Failed to load product. Please try again later.");
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    if (variant.image) {
      setSelectedImage(variant.image);
      setImageLoaded(false);
    }
  };

  const handleAddToCart = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      alert("Please select a size");
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      alert("Please select a color");
      return;
    }
    setIsAdding(true);
    addToCart(product, quantity, selectedImage, selectedSize, selectedColor);
    setTimeout(() => setIsAdding(false), 1500);
  };

  const handleBuyNow = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      alert("Please select a size");
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      alert("Please select a color");
      return;
    }
    addToCart(product, quantity, selectedImage, selectedSize, selectedColor);
    navigate("/cart");
  };

  // Prepare images for display
  const allImages = [];
  if (product?.images?.length > 0) {
    allImages.push(...product.images);
  } else if (product?.image) {
    allImages.push(product.image);
  }

  const fallbackImage =
    "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=600&h=600&fit=crop";

  const displayImages = allImages.length > 0 ? allImages : [fallbackImage];

  const getStockStatus = () => {
    const stock = selectedVariant ? selectedVariant.stock : product?.stock;

    if (stock === 0)
      return {
        text: "Out of Stock",
        color: "text-red-600",
        bgColor: "bg-red-50",
        available: false,
      };
    if (stock <= 3)
      return {
        text: `Only ${stock} left`,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        available: true,
      };
    if (stock <= 10)
      return {
        text: "Low Stock",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        available: true,
      };
    return {
      text: "In Stock",
      color: "text-green-600",
      bgColor: "bg-green-50",
      available: true,
    };
  };

  if (loading) return <ProductDetailSkeleton />;

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
            The product you're looking for might have been removed or the link
            is invalid.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="btn-primary">
              Back to Home
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Product not found
          </h2>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <BackButton />
      </div>

      {/* Breadcrumb */}
      <Breadcrumb
        customItems={[
          { label: "Products", href: "/products" },
          { label: product.title },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 group">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            <img
              src={selectedImage || displayImages[0]}
              alt={product.title}
              className={`w-full h-full object-cover cursor-zoom-in transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onClick={() => setShowImageModal(true)}
            />

            {/* Zoom indicator */}
            <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {displayImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {displayImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedImage(img);
                    setImageLoaded(false);
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${
                    selectedImage === img || (!selectedImage && index === 0)
                      ? "border-primary-500 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={img}
                    alt={`View ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-6">
          {/* Title and Price */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              {product.title}
            </h1>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(selectedVariant?.price || product.price)}
                </span>
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-xl text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
              </div>

              {/* Stock Status Badge */}
              <div className={`px-3 py-1 rounded-full ${stockStatus.bgColor}`}>
                <span className={`text-sm font-medium ${stockStatus.color}`}>
                  {stockStatus.text}
                </span>
              </div>
            </div>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {product.rating.toFixed(1)} ({product.reviewCount || 0}{" "}
                  reviews)
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Product Variants */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <ProductVariantSelector
                product={product}
                onVariantChange={handleVariantChange}
                selectedVariant={selectedVariant}
              />
            </div>
          )}

          {/* Size Selection (Legacy - only show if no variants) */}
          {(!product.variants || product.variants.length === 0) &&
            product.sizes &&
            product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Select Size
                  </h3>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1 text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors"
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
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-3 rounded-xl border-2 font-medium transition-all hover:shadow-sm ${
                        selectedSize === size
                          ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                          : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Color Selection (Legacy - only show if no variants) */}
          {(!product.variants || product.variants.length === 0) &&
            product.colors &&
            product.colors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Select Color
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium transition-all hover:shadow-sm ${
                        selectedColor?.name === color.name
                          ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                          : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <span>{color.name}</span>
                      {selectedColor?.name === color.name && (
                        <svg
                          className="w-4 h-4 text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Stock Alert */}
          {!stockStatus.available && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 font-medium">
                This product is currently out of stock.
              </p>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Quantity:
              </span>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  −
                </button>
                <span className="w-16 text-center font-semibold text-lg">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(
                      Math.min(
                        selectedVariant?.stock || product.stock,
                        quantity + 1,
                      ),
                    )
                  }
                  disabled={
                    quantity >= (selectedVariant?.stock || product.stock)
                  }
                  className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!stockStatus.available || isAdding}
                className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                  isAdding
                    ? "bg-green-500 text-white"
                    : !stockStatus.available
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {isAdding ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Adding to Cart...
                  </>
                ) : (
                  "Add to Cart"
                )}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!stockStatus.available}
                className="flex-1 py-4 rounded-xl font-semibold text-lg border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Free Shipping
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357-2H15"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                30-Day Returns
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Secure Payment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-8 h-8"
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
            <img
              src={selectedImage || displayImages[0]}
              alt={product.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mt-16 border-t pt-12">
        <ReviewsSection productId={id} />
      </div>

      {/* Q&A Section */}
      <div className="mt-16 border-t pt-12">
        <ProductQA productId={id} />
      </div>

      {/* Product Recommendations */}
      <div className="mt-16 border-t pt-12">
        <ProductRecommendations
          productId={id}
          category={product?.categoryId || product?.category}
          title="Similar Products"
          limit={4}
        />
      </div>

      {/* You Might Also Like */}
      <div className="mt-12">
        <ProductRecommendations
          productId={id}
          type="trending"
          title="You Might Also Like"
          limit={4}
        />
      </div>

      {/* Size Guide Modal */}
      <SizeGuide
        product={product}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </div>
  );
}
