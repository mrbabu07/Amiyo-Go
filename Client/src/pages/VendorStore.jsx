import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { useCurrency } from "../hooks/useCurrency";
import BackButton from "../components/BackButton";
import useAuth from "../hooks/useAuth";
import { auth } from "../firebase/firebase.config";
import { getPublicVendorMarketingItems, recordVendorMarketingEvent } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CHECKOUT_VOUCHER_KEY = "hnilabazar_selected_voucher";

const getStoreProductId = (product) =>
  product?._id?.toString?.() || String(product?._id || "");

const getMarketingProductIds = (item) => {
  const ids = [];
  if (Array.isArray(item.productIds)) ids.push(...item.productIds);
  if (Array.isArray(item.selectedProducts)) {
    ids.push(...item.selectedProducts.map((product) => product.productId || product._id));
  }
  return ids.map((id) => String(id || "").trim()).filter(Boolean);
};

const shopThemeGradients = {
  orange: "from-primary-700 via-cyan-600 to-emerald-500",
  green: "from-emerald-700 via-teal-600 to-primary-500",
  blue: "from-primary-800 via-primary-600 to-sky-500",
  indigo: "from-indigo-800 via-primary-700 to-sky-500",
  rose: "from-rose-700 via-fuchsia-600 to-primary-500",
  slate: "from-slate-950 via-slate-800 to-primary-700",
};

const getCategoryId = (product) =>
  product?.categoryId && typeof product.categoryId === "object"
    ? String(product.categoryId._id || product.categoryId)
    : String(product?.categoryId || "");

const getAddressText = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.details, address.city, address.state, address.country].filter(Boolean).join(", ");
};

const cropPosition = (crop = {}) => `${crop.x ?? 50}% ${crop.y ?? 50}%`;

const cropScale = (crop = {}) => Math.max(1, Number(crop.zoom || 100) / 100);

export default function VendorStore() {
  const { vendorId, shopSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [resolvedVendorId, setResolvedVendorId] = useState(vendorId || "");
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storeMarketing, setStoreMarketing] = useState([]);
  const [marketingLoading, setMarketingLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [activeShopTab, setActiveShopTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState("");

  const sellerPickProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          storeMarketing
            .filter((item) => item.type === "seller_pick")
            .flatMap(getMarketingProductIds),
        ),
      ).slice(0, 8),
    [storeMarketing],
  );

  const sellerPickRank = useMemo(
    () => new Map(sellerPickProductIds.map((id, index) => [id, index])),
    [sellerPickProductIds],
  );

  const sellerPickProducts = useMemo(() => {
    if (sellerPickProductIds.length === 0 || products.length === 0) return [];
    const productsById = new Map(products.map((product) => [getStoreProductId(product), product]));
    return sellerPickProductIds.map((id) => productsById.get(id)).filter(Boolean);
  }, [products, sellerPickProductIds]);

  const shopDecoration = vendor?.shopDecoration || {};

  const customShopTabs = useMemo(
    () =>
      (shopDecoration.categoryTabs || [])
        .filter((tab) => tab.label && ((tab.categoryIds || []).length > 0 || (tab.productIds || []).length > 0))
        .map((tab, index) => ({
          ...tab,
          id: tab.id || `shop-tab-${index}`,
          categoryIds: (tab.categoryIds || []).map(String),
          productIds: (tab.productIds || []).map(String),
        })),
    [shopDecoration.categoryTabs],
  );

  const featuredProducts = useMemo(() => {
    const featuredIds = shopDecoration.featuredCarousel?.productIds || [];
    if (featuredIds.length === 0 || products.length === 0) return [];
    const productsById = new Map(products.map((product) => [getStoreProductId(product), product]));
    return featuredIds.map((id) => productsById.get(String(id))).filter(Boolean);
  }, [products, shopDecoration.featuredCarousel?.productIds]);

  const activeCampaignDecoration = useMemo(() => {
    const campaign = shopDecoration.campaignMode;
    if (!campaign?.enabled) return null;
    const now = new Date();
    const startsAt = campaign.startDate ? new Date(campaign.startDate) : null;
    const endsAt = campaign.endDate ? new Date(campaign.endDate) : null;
    if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) return null;
    if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) return null;
    return campaign;
  }, [shopDecoration.campaignMode]);

  useEffect(() => {
    setProducts([]);
    setFilteredProducts([]);
    setStoreMarketing([]);
    setResolvedVendorId(vendorId || "");
    setActiveShopTab("all");
    fetchVendorInfo();
  }, [vendorId, shopSlug]);

  useEffect(() => {
    if (products.length > 0) {
      applyFilters();
    }
  }, [sortBy, activeShopTab, selectedCategory, priceRange, products, sellerPickRank, customShopTabs]);

  const fetchVendorInfo = async () => {
    try {
      setLoading(true);
      setProductsLoading(true);
      setMarketingLoading(true);
      const response = await axios.get(
        vendorId
          ? `${API_URL}/vendors/${vendorId}/public`
          : `${API_URL}/vendors/slug/${shopSlug}/public`,
      );
      const vendorData = response.data.data;
      setVendor(vendorData);
      const publicVendorId = vendorData._id?.toString?.() || String(vendorData._id || "");
      setResolvedVendorId(publicVendorId);
      await Promise.all([
        fetchVendorProducts(publicVendorId),
        fetchVendorMarketing(publicVendorId),
        user ? checkFollowStatus(publicVendorId) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error("Failed to fetch vendor info:", error);
      setError("Vendor not found");
      setProductsLoading(false);
      setMarketingLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProducts = async (targetVendorId = resolvedVendorId) => {
    if (!targetVendorId) return;
    try {
      const response = await axios.get(`${API_URL}/products`, {
        params: {
          vendorId: targetVendorId,
          limit: 100,
        },
      });

      const productData = response.data.data || [];
      
      // Products already have categoryName from backend aggregation
      setProducts(productData);
      
      // Extract unique categories from products
      const categoriesMap = new Map();
      productData.forEach(product => {
        if (product.categoryName && product.categoryId) {
          const catId = getCategoryId(product);
          
          if (!categoriesMap.has(catId)) {
            categoriesMap.set(catId, product.categoryName);
          }
        }
      });

      const categoryList = Array.from(categoriesMap.entries()).map(([id, name]) => ({ 
        id, 
        name 
      }));

      setCategories(categoryList);
      
      // Set price range based on products
      if (productData.length > 0) {
        const prices = productData.map(p => p.price);
        setPriceRange({
          min: Math.min(...prices),
          max: Math.max(...prices)
        });
      }
    } catch (error) {
      console.error("Failed to fetch vendor products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchVendorMarketing = async (targetVendorId = resolvedVendorId) => {
    if (!targetVendorId) return;
    try {
      setMarketingLoading(true);
      const response = await getPublicVendorMarketingItems(targetVendorId);
      const items = response.data.data || [];
      setStoreMarketing(items);
      items.forEach((item) => {
        recordVendorMarketingEvent(targetVendorId, item._id, {
          event: "view",
          sessionId: sessionStorage.getItem("amiyo_session_id") || "",
        }).catch(() => null);
      });
    } catch (error) {
      console.error("Failed to fetch vendor marketing:", error);
      setStoreMarketing([]);
    } finally {
      setMarketingLoading(false);
    }
  };

  const checkFollowStatus = async (targetVendorId = resolvedVendorId) => {
    if (!user) return;
    if (!targetVendorId) return;
    
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.get(
        `${API_URL}/vendors/${targetVendorId}/follow-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsFollowing(response.data.isFollowing);
    } catch (error) {
      console.error("Failed to check follow status:", error);
    }
  };

  const handleFollowToggle = async () => {
    const targetVendorId = resolvedVendorId || vendorId;
    if (!user) {
      alert("Please login to follow stores");
      return;
    }
    if (!targetVendorId) return;

    setFollowLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      
      if (isFollowing) {
        await axios.delete(
          `${API_URL}/vendors/${targetVendorId}/unfollow`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setIsFollowing(false);
        // Decrement follower count locally
        setVendor(prev => ({
          ...prev,
          followerCount: Math.max(0, (prev.followerCount || 0) - 1)
        }));
      } else {
        await axios.post(
          `${API_URL}/vendors/${targetVendorId}/follow`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setIsFollowing(true);
        // Increment follower count locally
        setVendor(prev => ({
          ...prev,
          followerCount: (prev.followerCount || 0) + 1
        }));
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      alert("Failed to update follow status. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    if (activeShopTab !== "all") {
      const tab = customShopTabs.find((item) => item.id === activeShopTab);
      if (tab) {
        filtered = filtered.filter((product) => {
          const id = getStoreProductId(product);
          const categoryId = getCategoryId(product);
          return tab.productIds.includes(id) || tab.categoryIds.includes(categoryId);
        });
      }
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => {
        const productCatId = getCategoryId(p);
        return productCatId === selectedCategory;
      });
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    if (sellerPickRank.size > 0) {
      filtered.sort((a, b) => {
        const aRank = sellerPickRank.has(getStoreProductId(a))
          ? sellerPickRank.get(getStoreProductId(a))
          : Number.POSITIVE_INFINITY;
        const bRank = sellerPickRank.has(getStoreProductId(b))
          ? sellerPickRank.get(getStoreProductId(b))
          : Number.POSITIVE_INFINITY;
        if (aRank === bRank) return 0;
        return aRank - bRank;
      });
    }

    setFilteredProducts(filtered);
  };

  const handleStartChat = async () => {
    if (!user) {
      alert("Please login to chat with vendor");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.post(
        `${API_URL}/vendor-chat/start`,
        {
          vendorId: resolvedVendorId || vendorId,
          initialMessage: message,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Message sent! Check your messages to continue the conversation.");
      setShowChatModal(false);
      setMessage("");
    } catch (error) {
      console.error("Failed to start chat:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const copyVoucherCode = async (voucher) => {
    try {
      const code = voucher.code;
      await navigator.clipboard.writeText(code);
      setCopiedVoucherCode(code);
      window.setTimeout(() => setCopiedVoucherCode(""), 1800);
      recordVendorMarketingEvent(resolvedVendorId || vendorId, voucher._id, { event: "click" }).catch(() => null);
    } catch (error) {
      console.error("Failed to copy voucher code:", error);
    }
  };

  const handleUseVoucherNow = (voucher) => {
    const targetVendorId = resolvedVendorId || vendorId;
    recordVendorMarketingEvent(targetVendorId, voucher._id, { event: "click" }).catch(() => null);
    const selectedVoucher = {
      code: voucher.code,
      vendorId: targetVendorId,
      vendorName: vendor?.shopName || voucher.vendorName || "this store",
      title: voucher.title,
      selectedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(
        CHECKOUT_VOUCHER_KEY,
        JSON.stringify(selectedVoucher),
      );
    } catch (error) {
      console.error("Failed to store selected voucher:", error);
    }

    navigate("/checkout", {
      state: {
        preferredVoucherCode: voucher.code,
        preferredVendorId: targetVendorId,
      },
    });
  };

  const voucherItems = storeMarketing.filter((item) => item.type === "voucher");
  const promotionItems = storeMarketing.filter((item) => !["voucher", "seller_pick"].includes(item.type));
  const highlightedVoucher = shopDecoration.couponBanner?.enabled
    ? voucherItems.find((voucher) => String(voucher._id) === shopDecoration.couponBanner?.voucherId) || voucherItems[0]
    : null;
  const vendorAddressText = getAddressText(vendor?.address);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || "Vendor not found"}
          </h2>
          <Link to="/" className="btn-primary mt-4">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {activeCampaignDecoration && (
        <div className={`relative overflow-hidden bg-gradient-to-r ${shopThemeGradients[activeCampaignDecoration.theme] || shopThemeGradients.orange} text-white`}>
          {activeCampaignDecoration.banner && (
            <img
              src={activeCampaignDecoration.banner}
              alt={activeCampaignDecoration.title || "Campaign banner"}
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          )}
          <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase">Campaign Mode</p>
            <h2 className="mt-1 text-2xl font-bold">{activeCampaignDecoration.title || "Campaign Sale"}</h2>
            {activeCampaignDecoration.message && (
              <p className="mt-1 max-w-3xl text-sm text-white/90">{activeCampaignDecoration.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Banner Image */}
      {vendor.banner && (
        <div className="relative aspect-[4/1] min-h-32 max-h-72 overflow-hidden bg-gradient-to-r from-primary-800 via-primary-600 to-slate-900">
          <img
            src={vendor.banner}
            alt={`${vendor.shopName} Banner`}
            className="h-full w-full object-cover"
            style={{
              objectPosition: cropPosition(shopDecoration.bannerCrop),
              transform: `scale(${cropScale(shopDecoration.bannerCrop)})`,
              transformOrigin: cropPosition(shopDecoration.bannerCrop),
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      )}

      {/* Vendor Header - Enhanced Daraz Style */}
      <div className={`${vendor.banner ? 'bg-white dark:bg-gray-800' : 'bg-gradient-to-r from-primary-800 via-primary-600 to-slate-900'} ${vendor.banner ? '' : 'text-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!vendor.banner && <BackButton className="text-white hover:text-primary-100 pt-6 mb-4" />}
          
          <div className={`flex flex-col md:flex-row items-start md:items-end gap-6 ${vendor.banner ? '-mt-14 pb-6 sm:-mt-16' : 'py-6'}`}>
            {/* Vendor Logo */}
            <div className="flex-shrink-0">
              {vendor.logo ? (
                <div className="h-32 w-32 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl md:h-40 md:w-40">
                  <img
                    src={vendor.logo}
                    alt={vendor.shopName}
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: cropPosition(shopDecoration.logoCrop),
                      transform: `scale(${cropScale(shopDecoration.logoCrop)})`,
                      transformOrigin: cropPosition(shopDecoration.logoCrop),
                    }}
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-2xl md:h-40 md:w-40">
                  <span className="text-5xl font-bold text-primary-600 md:text-6xl">
                    {vendor.shopName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Vendor Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className={`text-3xl md:text-4xl font-bold ${vendor.banner ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
                      {vendor.shopName}
                    </h1>
                    {vendor.status === "approved" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified Seller
                      </span>
                    )}
                  </div>

                  {vendor.tagline && (
                    <p className={`mb-3 text-sm font-semibold ${vendor.banner ? 'text-orange-600 dark:text-orange-300' : 'text-orange-50'}`}>
                      {vendor.tagline}
                    </p>
                  )}

                  {/* Location */}
                  {vendorAddressText && (
                    <div className={`flex items-center gap-2 mb-3 ${vendor.banner ? 'text-gray-600 dark:text-gray-400' : 'text-orange-100'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {vendorAddressText}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {vendor.description && (
                    <p className={`max-w-3xl whitespace-pre-line text-sm md:text-base mb-4 ${vendor.banner ? 'text-gray-700 dark:text-gray-300' : 'text-orange-50'}`}>
                      {vendor.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowChatModal(true)}
                    className="px-6 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition flex items-center gap-2 shadow-lg border border-orange-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat Now
                  </button>
                  <button 
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 shadow-lg ${
                      isFollowing 
                        ? 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {followLoading ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : isFollowing ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Following
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Follow Store
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
                {vendor.rating > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${vendor.banner ? 'bg-orange-50 border border-orange-200' : 'bg-white/20'}`}>
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className={`font-bold ${vendor.banner ? 'text-gray-900' : 'text-white'}`}>{vendor.rating.toFixed(1)}</span>
                    <span className={vendor.banner ? 'text-gray-600' : 'text-orange-100'}>({vendor.totalReviews} reviews)</span>
                  </div>
                )}

                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${vendor.banner ? 'bg-blue-50 border border-blue-200' : 'bg-white/20'}`}>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className={`font-bold ${vendor.banner ? 'text-gray-900' : 'text-white'}`}>{vendor.totalProducts || products.length}</span>
                  <span className={vendor.banner ? 'text-gray-600' : 'text-orange-100'}>Products</span>
                </div>

                {vendor.totalSales > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${vendor.banner ? 'bg-green-50 border border-green-200' : 'bg-white/20'}`}>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className={`font-bold ${vendor.banner ? 'text-gray-900' : 'text-white'}`}>{vendor.totalSales}</span>
                    <span className={vendor.banner ? 'text-gray-600' : 'text-orange-100'}>Sales</span>
                  </div>
                )}

                {/* Follower Count */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${vendor.banner ? 'bg-pink-50 border border-pink-200' : 'bg-white/20'}`}>
                  <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className={`font-bold ${vendor.banner ? 'text-gray-900' : 'text-white'}`}>{vendor.followerCount || 0}</span>
                  <span className={vendor.banner ? 'text-gray-600' : 'text-orange-100'}>Followers</span>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${vendor.banner ? 'bg-purple-50 border border-purple-200' : 'bg-white/20'}`}>
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={vendor.banner ? 'text-gray-700' : 'text-orange-100'}>
                    Response: <span className="font-semibold">{vendor.responseTime || 'within hours'}</span>
                  </span>
                </div>

                {vendor.responseRate && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${vendor.banner ? 'bg-indigo-50 border border-indigo-200' : 'bg-white/20'}`}>
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={vendor.banner ? 'text-gray-700' : 'text-orange-100'}>
                      <span className="font-semibold">{vendor.responseRate}%</span> Response Rate
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact & Policies Section */}
      {(vendor.phone || vendor.email || vendorAddressText) && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-6 text-sm">
              {vendor.phone && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-medium">Phone:</span>
                  <a href={`tel:${vendor.phone}`} className="text-orange-600 hover:text-orange-700 font-semibold">
                    {vendor.phone}
                  </a>
                </div>
              )}

              {vendor.email && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Email:</span>
                  <a href={`mailto:${vendor.email}`} className="text-orange-600 hover:text-orange-700 font-semibold">
                    {vendor.email}
                  </a>
                </div>
              )}

              {vendorAddressText && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">Address:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {vendorAddressText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(vendor.returnPolicy || vendor.processingTime || vendor.shippingNotes) && (
        <div className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
            {vendor.processingTime && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="font-semibold text-gray-900 dark:text-white">Processing Time</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{vendor.processingTime}</p>
              </div>
            )}
            {vendor.returnPolicy && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="font-semibold text-gray-900 dark:text-white">Return Policy</p>
                <p className="mt-1 whitespace-pre-line text-gray-600 dark:text-gray-300">{vendor.returnPolicy}</p>
              </div>
            )}
            {vendor.shippingNotes && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="font-semibold text-gray-900 dark:text-white">Shipping Notes</p>
                <p className="mt-1 whitespace-pre-line text-gray-600 dark:text-gray-300">{vendor.shippingNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {highlightedVoucher && (
        <div className="border-b border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase text-orange-700 dark:text-orange-300">
                {shopDecoration.couponBanner?.customText || "Shop coupon"}
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                Use <span className="font-mono">{highlightedVoucher.code}</span> on this seller's items
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyVoucherCode(highlightedVoucher)}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                {copiedVoucherCode === highlightedVoucher.code ? "Copied" : "Copy Code"}
              </button>
              <button
                onClick={() => handleUseVoucherNow(highlightedVoucher)}
                className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                Use Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Vouchers & Promotions */}
      {(marketingLoading || storeMarketing.length > 0) && (
        <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col gap-6 xl:flex-row">
              <div className="xl:w-2/3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Store Vouchers
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Pick one seller voucher for this store. Only one voucher can be used per order.
                    </p>
                  </div>
                </div>

                {marketingLoading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[...Array(2)].map((_, index) => (
                      <div key={index} className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/40" />
                    ))}
                  </div>
                ) : voucherItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                    This store does not have any approved vouchers live right now.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {voucherItems.map((voucher) => (
                      <div
                        key={voucher._id}
                        className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm dark:border-orange-900/40 dark:from-orange-950/20 dark:via-gray-900 dark:to-amber-950/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                              Seller voucher
                            </p>
                            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                              {voucher.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              {voucher.description}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Save</p>
                            <p className="text-lg font-black text-orange-600 dark:text-orange-300">
                              {voucher.discountType === "free_shipping"
                                ? "Free ship"
                                : voucher.discountType === "percentage"
                                ? `${voucher.discountValue}%`
                                : formatPrice(voucher.discountValue || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                          <p>
                            Code: <span className="font-bold text-gray-900 dark:text-white">{voucher.code}</span>
                          </p>
                          <p>
                            Min order: <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(voucher.minOrderAmount || 0)}</span>
                          </p>
                          <p>
                            Valid until: <span className="font-semibold text-gray-900 dark:text-white">{new Date(voucher.endDate).toLocaleDateString()}</span>
                          </p>
                          <p>
                            Scope: <span className="font-semibold text-gray-900 dark:text-white">This store only</span>
                          </p>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={() => copyVoucherCode(voucher)}
                            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                          >
                            {copiedVoucherCode === voucher.code ? "Copied" : "Copy Code"}
                          </button>
                          <button
                            onClick={() => handleUseVoucherNow(voucher)}
                            className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:bg-gray-900 dark:text-orange-300 dark:hover:bg-orange-950/30"
                          >
                            Use Now
                          </button>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Daraz-style rule: one voucher at a time, and only for this seller&apos;s items.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="xl:w-1/3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/30">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Store Promotions
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Current promotional highlights from this seller.
                  </p>
                  <div className="mt-4 space-y-3">
                    {promotionItems.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No active promotions or campaign announcements yet.
                      </p>
                    ) : (
                      promotionItems.map((item) => (
                        <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {item.type}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Until {new Date(item.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="mt-3 font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Section with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - Daraz Style */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                Filters
              </h3>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Categories
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      value="all"
                      checked={selectedCategory === "all"}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600">
                      All Products ({products.length})
                    </span>
                  </label>
                  {categories.length > 0 ? (
                    categories.map((cat) => {
                      const count = products.filter(p => {
                        const productCatId = getCategoryId(p);
                        return productCatId === cat.id;
                      }).length;
                      return (
                        <label key={cat.id} className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            name="category"
                            value={cat.id}
                            checked={selectedCategory === cat.id}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600">
                            {cat.name} ({count})
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No categories available
                    </p>
                  )}
                </div>
              </div>

              {/* Sort Options */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Sort By
                </h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              {/* Store Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Store Performance
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Response Rate</span>
                    <span className="font-semibold text-green-600">{vendor.responseRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Response Time</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{vendor.responseTime}</span>
                  </div>
                  {vendor.totalSales > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Sales</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{vendor.totalSales}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {!productsLoading && featuredProducts.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {shopDecoration.featuredCarousel?.title || "Featured Products"}
                    </h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Curated by {vendor.shopName}
                    </p>
                  </div>
                </div>
                <div className="flex snap-x gap-4 overflow-x-auto pb-2">
                  {featuredProducts.map((product) => (
                    <div key={product._id} className="min-w-[180px] max-w-[220px] snap-start sm:min-w-[210px]">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!productsLoading && sellerPickProducts.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Seller Picks
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Featured by {vendor.shopName}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                    {sellerPickProducts.length} pinned
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {sellerPickProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {customShopTabs.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveShopTab("all")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    activeShopTab === "all"
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  All
                </button>
                {customShopTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveShopTab(tab.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      activeShopTab === tab.id
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Products Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  All Products
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              </div>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden animate-pulse border border-gray-200 dark:border-gray-700"
                  >
                    <div className="aspect-square bg-gray-200 dark:bg-gray-700"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  No Products Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Modal - Enhanced */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {vendor.logo ? (
                  <img
                    src={vendor.logo}
                    alt={vendor.shopName}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {vendor.shopName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {vendor.shopName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Usually replies in {vendor.responseTime}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <svg
                  className="w-6 h-6"
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
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi, I'm interested in your products..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={5}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                The seller will receive your message and respond as soon as possible.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowChatModal(false);
                  setMessage("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStartChat}
                disabled={sending || !message.trim()}
                className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
