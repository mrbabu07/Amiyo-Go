import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/api";
import { getActiveCoupons } from "../services/api";
import ProductCard from "../components/ProductCard";
import CategoryCarousel from "../components/CategoryCarousel";
import ProductsByCategory from "../components/ProductsByCategory";
import RecentlyViewed from "../components/RecentlyViewed";
import FlashSaleFinal from "../components/FlashSaleFinal";
import { ProductCardSkeleton } from "../components/Skeleton";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCouponIndex, setCurrentCouponIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchActiveCoupons();
  }, []);

  // Auto-rotate coupons
  useEffect(() => {
    if (activeCoupons.length > 1) {
      const interval = setInterval(() => {
        setCurrentCouponIndex((prev) => (prev + 1) % activeCoupons.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeCoupons]);

  // Auto-rotate hero carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      const allProducts = response.data.data;

      // Featured products (first 8)
      setProducts(allProducts.slice(0, 8));

      // New arrivals (last 4 products - most recently added)
      setNewArrivals(allProducts.slice(-4).reverse());
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCoupons = async () => {
    try {
      const response = await getActiveCoupons();
      setActiveCoupons(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
    }
  };

  // Hero carousel slides
  const heroSlides = [
    {
      title: "Shop Smart, Live Better",
      subtitle: "Quality You Can Trust",
      description:
        "Discover amazing products at unbeatable prices. Fast delivery, easy returns, and 24/7 support.",
      badge: "🎉 New Arrivals - Up to 50% Off",
      primaryCTA: { text: "Start Shopping Now", link: "/products" },
      secondaryCTA: { text: "Browse Categories", link: "/categories" },
      bgGradient: "from-primary-500 via-primary-600 to-secondary-600",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop",
    },
    {
      title: "Electronics Sale",
      subtitle: "Latest Tech at Best Prices",
      description:
        "Upgrade your lifestyle with cutting-edge gadgets and electronics. Limited time offers!",
      badge: "⚡ Flash Sale - Save Big Today",
      primaryCTA: { text: "Shop Electronics", link: "/category/electronics" },
      secondaryCTA: { text: "View Deals", link: "/products" },
      bgGradient: "from-blue-500 via-indigo-600 to-purple-600",
      image:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=600&fit=crop",
    },
    {
      title: "Fashion Forward",
      subtitle: "Style That Speaks",
      description:
        "Explore the latest trends in men's and women's fashion. Express yourself with confidence.",
      badge: "👗 Trending Now - New Collection",
      primaryCTA: { text: "Shop Fashion", link: "/category/womens" },
      secondaryCTA: { text: "Men's Collection", link: "/category/mens" },
      bgGradient: "from-pink-500 via-rose-600 to-red-600",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=600&fit=crop",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      rating: 5,
      comment: "Amazing quality and fast delivery! Will definitely shop again.",
      avatar: "SJ",
    },
    {
      name: "Michael Chen",
      rating: 5,
      comment:
        "Great customer service and authentic products. Highly recommended!",
      avatar: "MC",
    },
    {
      name: "Emily Davis",
      rating: 4,
      comment: "Good prices and easy returns. Very satisfied with my purchase.",
      avatar: "ED",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-fade-in">
        {/* Promotional Coupon Strip */}
        {activeCoupons.length > 0 && (
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-3 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center gap-3 text-sm md:text-base font-medium">
                <span className="animate-pulse">🎉</span>
                <span>
                  Use code{" "}
                  <span className="font-bold bg-white/20 px-2 py-0.5 rounded">
                    {activeCoupons[currentCouponIndex].code}
                  </span>{" "}
                  for{" "}
                  {activeCoupons[currentCouponIndex].discountType ===
                  "percentage"
                    ? `${activeCoupons[currentCouponIndex].discountValue}% OFF`
                    : `৳${Math.round(activeCoupons[currentCouponIndex].discountValue * 110)} OFF`}
                  {activeCoupons[currentCouponIndex].minOrderAmount &&
                    ` on orders over ৳${Math.round(activeCoupons[currentCouponIndex].minOrderAmount * 110)}`}
                </span>
                <span className="animate-pulse">🎉</span>
              </div>
            </div>
          </div>
        )}

        {/* Hero Carousel Section */}
        <section className="relative overflow-hidden">
          {/* Carousel Container */}
          <div className="relative h-[500px] md:h-[600px]">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                  index === currentSlide
                    ? "opacity-100 translate-x-0"
                    : index < currentSlide
                      ? "opacity-0 -translate-x-full"
                      : "opacity-0 translate-x-full"
                }`}
              >
                {/* Background with gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient}`}
                >
                  {/* Background image with overlay */}
                  <div className="absolute inset-0 opacity-20">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Animated background elements */}
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute inset-0">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
                  <div className="text-center w-full">
                    <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full mb-6 animate-fade-in">
                      {slide.badge}
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-slide-up">
                      {slide.title}
                      <span className="block text-white/90 mt-2">
                        {slide.subtitle}
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-slide-up delay-200">
                      {slide.description}
                    </p>

                    {/* Trust Highlights */}
                    <div className="flex flex-wrap items-center justify-center gap-6 mb-8 animate-slide-up delay-300">
                      <div className="flex items-center gap-2 text-white/90">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span className="text-sm font-medium">
                          Fast Delivery
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          Secure Payment
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          Easy Returns
                        </span>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-400">
                      <Link
                        to={slide.primaryCTA.link}
                        className="px-8 py-4 bg-white text-primary-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        {slide.primaryCTA.text}
                      </Link>
                      <Link
                        to={slide.secondaryCTA.link}
                        className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all duration-200"
                      >
                        {slide.secondaryCTA.text}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() =>
              setCurrentSlide(
                (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
              )
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all z-10 group"
          >
            <svg
              className="w-6 h-6 group-hover:-translate-x-1 transition-transform"
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
          </button>
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all z-10 group"
          >
            <svg
              className="w-6 h-6 group-hover:translate-x-1 transition-transform"
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
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all ${
                  index === currentSlide
                    ? "w-8 h-2 bg-white"
                    : "w-2 h-2 bg-white/50 hover:bg-white/75"
                } rounded-full`}
              />
            ))}
          </div>
        </section>

        {/* Flash Sale Scroller - Interactive Product Carousel */}
        <FlashSaleFinal />

        {/* Category Carousel - Shop by Category */}
        <CategoryCarousel />

        {/* Trending / Popular Products - Improved */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-semibold rounded-full mb-3">
                  🔥 Trending Now
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Popular Products
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Handpicked products loved by our customers
                </p>
              </div>
              <Link
                to="/products"
                className="mt-4 md:mt-0 inline-flex items-center text-primary-500 dark:text-primary-400 font-semibold hover:text-primary-600 dark:hover:text-primary-300 transition-colors group"
              >
                View All Products
                <svg
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
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

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
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
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  No products available yet
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Run: cd Server && npm run seed
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* New Arrivals - Lightweight */}
        {loading || newArrivals.length > 0 ? (
          <section className="py-16 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-semibold rounded-full mb-3">
                    ✨ Just Arrived
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    New Arrivals
                  </h2>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {newArrivals.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Products by Category */}
        <ProductsByCategory />

        {/* Recently Viewed Products */}
        <RecentlyViewed />

        {/* Reviews / Trust Section */}
        <section className="py-16 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                What Our Customers Say
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Join thousands of satisfied customers who trust us for quality
                and service
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < testimonial.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    "{testimonial.comment}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Verified Buyer
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  10K+
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  Happy Customers
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  50K+
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  Products Sold
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  4.8★
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  Average Rating
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  99%
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  Satisfaction Rate
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
