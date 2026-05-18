import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { getProductById } from "../services/api";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";
import useProductView from "../hooks/useProductView";
import { ProductDetailSkeleton } from "../components/Skeleton";
import ReviewsSection from "../components/reviews/ReviewsSection";
import ProductRecommendations from "../components/ProductRecommendations";
import SizeGuide from "../components/SizeGuide";
import BackButton from "../components/BackButton";
import ProductVariantSelector from "../components/ProductVariantSelector";
import ProductQA from "../components/ProductQA";
import VendorInfo from "../components/VendorInfo";
import ProductMediaGallery from "../components/ProductMediaGallery";
import ProductTrustAndDelivery from "../components/ProductTrustAndDelivery";
import SellerInfoStrip from "../components/SellerInfoStrip";
import PriceHistorySparkline from "../components/PriceHistorySparkline";
import ProductShareReportActions from "../components/ProductShareReportActions";
import FrequentlyBoughtTogether from "../components/FrequentlyBoughtTogether";
import SocialProofIndicators from "../components/SocialProofIndicators";

const normalizeSpecRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return { label: "Feature", value: item };
        return {
          label: item.label || item.name || item.key || item.title,
          value: item.value || item.text || item.description,
        };
      })
      .filter((item) => item?.label && item?.value);
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([label, rowValue]) => ({
        label,
        value: Array.isArray(rowValue) ? rowValue.join(", ") : rowValue,
      }))
      .filter((item) => item.value !== undefined && item.value !== null && item.value !== "");
  }

  return [];
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [categoryPath, setCategoryPath] = useState([]);
  const [selectionError, setSelectionError] = useState("");
  const [activeTab, setActiveTab] = useState("description");

  useProductView(id);

  const fetchCategoryPath = useCallback(async (categoryId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/categories/${categoryId}/path`);
      if (response.ok) {
        const data = await response.json();
        setCategoryPath(data.path || []);
      }
    } catch (error) {
      console.error("Failed to fetch category path:", error);
    }
  }, []);

  const fetchProduct = useCallback(async () => {
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

      // Fetch category hierarchy if product has categoryId
      if (data.categoryId) {
        fetchCategoryPath(data.categoryId);
      }

      // Set initial selected image
      const initialImage =
        data.detail?.media?.images?.[0] ||
        data.image ||
        (data.images && data.images[0]) ||
        "";
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
  }, [fetchCategoryPath, id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setSelectionError("");
    if (variant.size) setSelectedSize(variant.size);
    if (variant.color) setSelectedColor(variant.color);
    const variantImage = variant.image || variant.images?.[0];
    if (variantImage) {
      setSelectedImage(variantImage);
    }
  };

  const validateSelections = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      setSelectionError("Please select a size before continuing.");
      return false;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      setSelectionError("Please select a color before continuing.");
      return false;
    }
    setSelectionError("");
    return true;
  };

  const updateQuantity = (nextQuantity) => {
    setQuantity(Math.min(maxPurchasable, Math.max(1, nextQuantity)));
  };

  const handleAddToCart = () => {
    if (!validateSelections()) return;
    setIsAdding(true);
    const cartProduct = selectedVariant
      ? {
          ...product,
          price: selectedVariant.price || product.price,
          selectedVariantId: selectedVariant._id || selectedVariant.id || selectedVariant.sku,
          sku: selectedVariant.sku || product.sku,
        }
      : product;
    addToCart(cartProduct, quantity, selectedImage, selectedSize, selectedColor);
    setTimeout(() => setIsAdding(false), 1500);
  };

  const handleBuyNow = () => {
    if (!validateSelections()) return;
    const cartProduct = selectedVariant
      ? {
          ...product,
          price: selectedVariant.price || product.price,
          selectedVariantId: selectedVariant._id || selectedVariant.id || selectedVariant.sku,
          sku: selectedVariant.sku || product.sku,
        }
      : product;
    addToCart(cartProduct, quantity, selectedImage, selectedSize, selectedColor);
    navigate("/cart");
  };

  const getStockStatus = () => {
    const stock = selectedVariant
      ? selectedVariant.stock
      : product?.detail?.stock?.stock ?? product?.stock;
    const allowsBackorder = Boolean(product?.allowBackorder);

    if (stock === 0 && allowsBackorder)
      return {
        text: "Backorder",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        available: true,
        isBackorder: true,
      };
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

  const formatListingDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-BD", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
  const currentStock =
    Number(selectedVariant ? selectedVariant.stock : product.detail?.stock?.stock ?? product.stock) || 0;
  const maxPurchasable = stockStatus.isBackorder ? 99 : Math.max(currentStock, 1);
  const restockDateLabel = formatListingDate(product.restockDate);
  const preorderDateLabel = formatListingDate(product.expectedShipDate);
  const activePrice = Number(selectedVariant?.price || product.price || 0);
  const originalPrice = Number(selectedVariant?.originalPrice || product.originalPrice || 0);
  const discountPercentage =
    originalPrice > activePrice
      ? Math.round(((originalPrice - activePrice) / originalPrice) * 100)
      : 0;
  const rating = Number(
    product.detail?.reviewSummary?.averageRating ??
      product.averageRating ??
      product.rating ??
      0,
  );
  const reviewCount = Number(
    product.detail?.reviewSummary?.totalReviews ??
      product.reviewCount ??
      product.totalReviews ??
      0,
  );
  const soldCount = Number(product.totalSold || product.soldCount || product.sales || 0);
  const currentSku = selectedVariant?.sku || product.sku || product.productCode || "";
  const specificationRows = [
    { label: "Brand", value: product.brand },
    {
      label: "Category",
      value: product.categoryName || product.category?.name || categoryPath.at(-1)?.name,
    },
    { label: "SKU", value: currentSku },
    { label: "Availability", value: stockStatus.text },
    { label: "Stock", value: stockStatus.isBackorder ? "Backorder allowed" : `${currentStock} units` },
    ...normalizeSpecRows(product.specifications || product.specification),
    ...normalizeSpecRows(product.attributes),
    ...normalizeSpecRows(product.detail?.specifications),
  ].filter((item) => item.value !== undefined && item.value !== null && item.value !== "");
  const productTabs = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews${reviewCount ? ` (${reviewCount})` : ""}` },
    { id: "qa", label: "Q&A" },
  ];
  const selectedPurchaseLabel =
    [
      selectedVariant?.sku ? `SKU ${selectedVariant.sku}` : "",
      selectedSize ? `Size ${selectedSize}` : "",
      selectedColor?.name ? selectedColor.name : "",
    ]
      .filter(Boolean)
      .join(" / ") || stockStatus.text;

  return (
    <div className="min-h-screen bg-gray-50 pb-32 text-gray-950 dark:bg-gray-950 dark:text-white lg:pb-12">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <BackButton />
          <nav className="flex min-w-0 items-center gap-2 overflow-x-auto text-sm font-semibold text-gray-500 dark:text-gray-400">
            <Link to="/" className="shrink-0 hover:text-primary-600 dark:hover:text-primary-300">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <Link to="/products" className="shrink-0 hover:text-primary-600 dark:hover:text-primary-300">
              Products
            </Link>
            {categoryPath.map((cat) => (
              <span key={cat._id || cat.name} className="flex shrink-0 items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                <Link
                  to={cat.slug || cat._id ? `/category/${cat.slug || cat._id}` : "#"}
                  className="hover:text-primary-600 dark:hover:text-primary-300"
                >
                  {cat.name}
                </Link>
              </span>
            ))}
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span className="max-w-[38vw] truncate text-gray-900 dark:text-white">
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <ProductMediaGallery
              product={product}
              selectedVariant={selectedVariant}
              selectedImage={selectedImage}
              onImageSelect={setSelectedImage}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-extrabold ${stockStatus.bgColor} ${stockStatus.color}`}>
                  {stockStatus.text}
                </span>
                {discountPercentage > 0 ? (
                  <span className="inline-flex min-h-8 items-center rounded-full bg-red-50 px-3 text-xs font-extrabold text-red-700 dark:bg-red-950/40 dark:text-red-200">
                    {discountPercentage}% off
                  </span>
                ) : null}
                {currentSku ? (
                  <span className="inline-flex min-h-8 items-center rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    SKU {currentSku}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-2xl font-black leading-tight text-gray-950 dark:text-white md:text-3xl">
                {product.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                {rating > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                    <Star className="h-4 w-4 fill-current" />
                    {rating.toFixed(1)}
                    <span className="text-gray-500 dark:text-gray-400">
                      ({reviewCount} reviews)
                    </span>
                  </span>
                ) : (
                  <span>New product</span>
                )}
                {soldCount > 0 ? <span>{soldCount.toLocaleString("en-BD")} sold</span> : null}
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Marketplace protected
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/80 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
                <div className="flex flex-wrap items-end gap-3">
                  <span className="text-3xl font-black text-orange-600 dark:text-orange-300 md:text-4xl">
                    {formatPrice(activePrice)}
                  </span>
                  {originalPrice > activePrice ? (
                    <span className="pb-1 text-base font-semibold text-gray-400 line-through">
                      {formatPrice(originalPrice)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Price includes marketplace buyer protection. Final delivery fee is shown at checkout.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ProductShareReportActions product={product} />
              </div>
              <SocialProofIndicators product={product} className="mt-4" />
            </div>

            <SellerInfoStrip
              seller={product.detail?.seller}
              vendorId={product.vendorId}
            />

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              {product.variants && product.variants.length > 0 && (
                <ProductVariantSelector
                  product={product}
                  onVariantChange={handleVariantChange}
                  selectedVariant={selectedVariant}
                />
              )}

              {(!product.variants || product.variants.length === 0) &&
                product.sizes &&
                product.sizes.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-black text-gray-900 dark:text-white">
                        Select Size
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowSizeGuide(true)}
                        className="min-h-9 rounded-lg px-2 text-sm font-bold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:bg-primary-950/30"
                      >
                        Size Guide
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setSelectedSize(size);
                            setSelectionError("");
                          }}
                          className={`min-h-11 rounded-lg border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            selectedSize === size
                              ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                              : "border-gray-300 text-gray-700 hover:border-primary-300 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {(!product.variants || product.variants.length === 0) &&
                product.colors &&
                product.colors.length > 0 && (
                  <div className="mb-6">
                    <h2 className="mb-3 text-base font-black text-gray-900 dark:text-white">
                      Select Color
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color);
                            setSelectionError("");
                          }}
                          className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            selectedColor?.name === color.name
                              ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                              : "border-gray-300 text-gray-700 hover:border-primary-300 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span
                            className="h-5 w-5 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {selectionError ? (
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{selectionError}</span>
                </div>
              ) : null}

              {stockStatus.isBackorder && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                  Backorder available{restockDateLabel ? `, restock expected ${restockDateLabel}` : ""}.
                </div>
              )}

              {product.preorderEnabled && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  Pre-order{preorderDateLabel ? `, expected ship date ${preorderDateLabel}` : ""}.
                </div>
              )}

              <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Quantity</p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {stockStatus.isBackorder ? "Backorder limit applies" : `${currentStock} available`}
                    </p>
                  </div>
                  <div className="grid h-11 grid-cols-[44px_56px_44px] overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950">
                    <button
                      type="button"
                      onClick={() => updateQuantity(quantity - 1)}
                      className="flex items-center justify-center text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-200 dark:hover:bg-gray-900"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex items-center justify-center border-x border-gray-200 text-sm font-black dark:border-gray-800">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(quantity + 1)}
                      disabled={quantity >= maxPurchasable}
                      className="flex items-center justify-center text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-45 dark:text-gray-200 dark:hover:bg-gray-900"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!stockStatus.available}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary-500 px-5 text-base font-black text-white shadow-sm transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:focus-visible:ring-offset-gray-900"
                  >
                    <Zap className="h-5 w-5" />
                    Buy Now
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!stockStatus.available || isAdding}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 text-base font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isAdding
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-200"
                        : !stockStatus.available
                          ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-800 dark:bg-gray-900"
                          : "border-primary-500 bg-white text-primary-600 hover:bg-primary-50 dark:bg-gray-950 dark:text-primary-300 dark:hover:bg-primary-950/30"
                    }`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {isAdding ? "Added" : "Add to Cart"}
                  </button>
                </div>
              </div>
            </div>

            <ProductTrustAndDelivery product={product} stockStatus={stockStatus} />
            <PriceHistorySparkline history={product.detail?.priceHistory || []} />
          </div>
        </section>

        <FrequentlyBoughtTogether
          product={product}
          selectedVariant={selectedVariant}
          selectedImage={selectedImage}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
        />

        <section className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
            {productTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  activeTab === tab.id
                    ? "bg-primary-500 text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "description" && (
              <div className="prose prose-gray max-w-none dark:prose-invert">
                <h2>Description</h2>
                <p>{product.description || "No detailed description has been added yet."}</p>
                {product.vendorId ? (
                  <div className="not-prose mt-6">
                    <VendorInfo vendorId={product.vendorId} productId={id} />
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "specifications" && (
              <div>
                <h2 className="text-xl font-black text-gray-950 dark:text-white">
                  Product Specifications
                </h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  {specificationRows.length ? (
                    specificationRows.map((row, index) => (
                      <div
                        key={`${row.label}-${index}`}
                        className="grid gap-2 border-b border-gray-200 p-4 last:border-b-0 dark:border-gray-800 sm:grid-cols-[220px_1fr]"
                      >
                        <span className="text-sm font-black text-gray-600 dark:text-gray-400">
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-950 dark:text-white">
                          {String(row.value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                      No specifications are available for this product yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && <ReviewsSection productId={id} />}
            {activeTab === "qa" && <ProductQA productId={id} />}
          </div>
        </section>

        <section className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-800">
          <ProductRecommendations
            productId={id}
            category={product?.categoryId || product?.category}
            title="Similar Products"
            limit={8}
            initialProducts={product.detail?.similarProducts || []}
            layout="carousel"
          />
        </section>

        <section className="mt-8">
          <ProductRecommendations
            productId={id}
            type="trending"
            title="You Might Also Like"
            limit={4}
          />
        </section>
      </main>

      <div
        className="fixed inset-x-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-2xl dark:border-gray-800 dark:bg-gray-950/95 lg:hidden"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_auto] gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-gray-500 dark:text-gray-400">
              {selectedPurchaseLabel}
            </p>
            <p className="truncate text-lg font-black text-orange-600 dark:text-orange-300">
              {formatPrice(activePrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!stockStatus.available || isAdding}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-lg border border-primary-500 bg-white px-3 text-sm font-black text-primary-600 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-950 dark:text-primary-300"
          >
            <ShoppingCart className="h-4 w-4" />
            {isAdding ? "Added" : "Add"}
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!stockStatus.available}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary-500 px-5 text-sm font-black text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            <Zap className="h-4 w-4" />
            Buy Now
          </button>
        </div>
      </div>

      <SizeGuide
        product={product}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </div>
  );
}
