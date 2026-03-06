import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { useCurrency } from "../hooks/useCurrency";
import BackButton from "../components/BackButton";
import useAuth from "../hooks/useAuth";
import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function VendorStore() {
  const { vendorId } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetchVendorInfo();
    fetchVendorProducts();
    checkFollowStatus();
  }, [vendorId]);

  useEffect(() => {
    if (products.length > 0) {
      applyFilters();
    }
  }, [sortBy, selectedCategory, priceRange, products]);

  const fetchVendorInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/vendors/${vendorId}/public`);
      const vendorData = response.data.data;
      console.log('📍 Vendor data received:', {
        shopName: vendorData.shopName,
        hasAddress: !!vendorData.address,
        address: vendorData.address,
        followerCount: vendorData.followerCount
      });
      setVendor(vendorData);
    } catch (error) {
      console.error("Failed to fetch vendor info:", error);
      setError("Vendor not found");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`, {
        params: {
          vendorId,
          limit: 100,
        },
      });

      const productData = response.data.data || [];
      
      console.log('📦 Products received:', productData.length);
      if (productData.length > 0) {
        console.log('🔍 First product:', {
          title: productData[0].title,
          categoryId: productData[0].categoryId,
          categoryName: productData[0].categoryName,
          hasCategoryName: !!productData[0].categoryName
        });
      }
      
      // Products already have categoryName from backend aggregation
      setProducts(productData);
      
      // Extract unique categories from products
      const categoriesMap = new Map();
      productData.forEach(product => {
        if (product.categoryName && product.categoryId) {
          const catId = typeof product.categoryId === 'object' 
            ? product.categoryId.toString() 
            : String(product.categoryId);
          
          if (!categoriesMap.has(catId)) {
            categoriesMap.set(catId, product.categoryName);
          }
        }
      });

      const categoryList = Array.from(categoriesMap.entries()).map(([id, name]) => ({ 
        id, 
        name 
      }));

      console.log('🏷️ Categories extracted:', categoryList);
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

  const checkFollowStatus = async () => {
    if (!user) return;
    
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.get(
        `${API_URL}/vendors/${vendorId}/follow-status`,
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
    if (!user) {
      alert("Please login to follow stores");
      return;
    }

    setFollowLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      
      if (isFollowing) {
        await axios.delete(
          `${API_URL}/vendors/${vendorId}/unfollow`,
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
          `${API_URL}/vendors/${vendorId}/follow`,
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

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => {
        const productCatId = typeof p.categoryId === 'object' 
          ? p.categoryId.toString() 
          : String(p.categoryId);
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
          vendorId,
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
      {/* Banner Image */}
      {vendor.banner && (
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-orange-400 to-orange-600 overflow-hidden">
          <img
            src={vendor.banner}
            alt={`${vendor.shopName} Banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      )}

      {/* Vendor Header - Enhanced Daraz Style */}
      <div className={`${vendor.banner ? 'bg-white dark:bg-gray-800' : 'bg-gradient-to-r from-orange-500 to-orange-600'} ${vendor.banner ? '' : 'text-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!vendor.banner && <BackButton className="text-white hover:text-orange-100 pt-6 mb-4" />}
          
          <div className={`flex flex-col md:flex-row items-start md:items-end gap-6 ${vendor.banner ? '-mt-16 pb-6' : 'py-6'}`}>
            {/* Vendor Logo */}
            <div className="flex-shrink-0">
              {vendor.logo ? (
                <img
                  src={vendor.logo}
                  alt={vendor.shopName}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-white shadow-2xl bg-white"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white flex items-center justify-center shadow-2xl border-4 border-white">
                  <span className="text-5xl md:text-6xl font-bold text-orange-500">
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

                  {/* Location */}
                  {vendor.address && (vendor.address.details || vendor.address.city || vendor.address.state) && (
                    <div className={`flex items-center gap-2 mb-3 ${vendor.banner ? 'text-gray-600 dark:text-gray-400' : 'text-orange-100'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {vendor.address.details || [vendor.address.city, vendor.address.state, vendor.address.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {vendor.description && (
                    <p className={`max-w-3xl text-sm md:text-base mb-4 ${vendor.banner ? 'text-gray-700 dark:text-gray-300' : 'text-orange-50'}`}>
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
      {(vendor.phone || vendor.email || vendor.address?.details) && (
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

              {vendor.address?.details && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">Address:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {vendor.address.details}
                  </span>
                </div>
              )}
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
                        const productCatId = typeof p.categoryId === 'object' 
                          ? p.categoryId.toString() 
                          : String(p.categoryId);
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
