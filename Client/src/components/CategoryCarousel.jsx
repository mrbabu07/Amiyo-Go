import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function CategoryCarousel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef(null);

  // Fetch categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${apiUrl}/categories`);
        const categoriesData = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isHovered || categories.length === 0) return;

    const autoScroll = setInterval(() => {
      setCurrentIndex(
        (prev) => (prev + 1) % Math.ceil(categories.length / getVisibleCards()),
      );
    }, 4000);

    return () => clearInterval(autoScroll);
  }, [isHovered, categories.length]);

  const getVisibleCards = () => {
    if (typeof window === "undefined") return 4;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    if (window.innerWidth < 1280) return 3;
    return 4;
  };

  const scroll = (direction) => {
    if (direction === "left") {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentIndex((prev) =>
        Math.min(
          Math.ceil(categories.length / getVisibleCards()) - 1,
          prev + 1,
        ),
      );
    }
  };

  // Helper function to get category image
  const getCategoryImage = (category) => {
    // If category has an image field, use it
    if (category.image) {
      return category.image;
    }

    // Fallback images based on category name
    const name = category.name.toLowerCase();
    if (name.includes("men") || name.includes("man")) {
      return "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600&h=400&fit=crop";
    }
    if (
      name.includes("women") ||
      name.includes("woman") ||
      name.includes("ladies")
    ) {
      return "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=400&fit=crop";
    }
    if (
      name.includes("electronic") ||
      name.includes("phone") ||
      name.includes("tech")
    ) {
      return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop";
    }
    if (
      name.includes("baby") ||
      name.includes("kid") ||
      name.includes("child")
    ) {
      return "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=400&fit=crop";
    }
    if (name.includes("shoe") || name.includes("footwear")) {
      return "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=400&fit=crop";
    }
    if (name.includes("beauty") || name.includes("cosmetic")) {
      return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop";
    }
    if (name.includes("home") || name.includes("furniture")) {
      return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop";
    }
    if (name.includes("book") || name.includes("education")) {
      return "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&h=400&fit=crop";
    }
    if (name.includes("game") || name.includes("toy")) {
      return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop";
    }
    if (name.includes("sport") || name.includes("fitness")) {
      return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=400&fit=crop";
    }

    // Default fallback
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop";
  };

  // Helper function to get category icons (for overlay)
  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes("men") || name.includes("man")) return "👔";
    if (
      name.includes("women") ||
      name.includes("woman") ||
      name.includes("ladies")
    )
      return "👗";
    if (
      name.includes("electronic") ||
      name.includes("phone") ||
      name.includes("tech")
    )
      return "📱";
    if (name.includes("baby") || name.includes("kid") || name.includes("child"))
      return "👶";
    if (name.includes("shoe") || name.includes("footwear")) return "👟";
    if (name.includes("beauty") || name.includes("cosmetic")) return "💄";
    if (name.includes("home") || name.includes("furniture")) return "🏠";
    if (name.includes("book") || name.includes("education")) return "📚";
    if (name.includes("game") || name.includes("toy")) return "🎮";
    if (name.includes("sport") || name.includes("fitness")) return "⚽";
    return "🛍️";
  };

  // Helper function to get gradient colors
  const getGradientColors = (index) => {
    const gradients = [
      "from-blue-500 to-indigo-600",
      "from-pink-500 to-rose-600",
      "from-green-500 to-emerald-600",
      "from-orange-500 to-red-600",
      "from-purple-500 to-violet-600",
      "from-cyan-500 to-blue-600",
      "from-yellow-500 to-orange-600",
      "from-teal-500 to-green-600",
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="min-w-[250px] h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(categories.length / getVisibleCards());

  return (
    <section className="py-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-purple-200/30 to-blue-200/30 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-full">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Shop by Category
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Explore our collections
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/categories"
            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <span>View All</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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

        {/* Carousel */}
        <div
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-200"
            >
              <svg
                className="w-6 h-6 text-gray-700 dark:text-gray-300"
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
          )}

          {currentIndex < totalPages - 1 && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-200"
            >
              <svg
                className="w-6 h-6 text-gray-700 dark:text-gray-300"
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
          )}

          {/* Cards Container */}
          <div className="relative overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="flex gap-4 transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (260 * getVisibleCards())}px)`,
              }}
            >
              {categories.map((category, index) => {
                const gradient = getGradientColors(index);
                const icon = getCategoryIcon(category.name);
                const image = getCategoryImage(category);

                return (
                  <Link
                    key={category._id}
                    to={`/category/${category.slug}`}
                    className="group min-w-[250px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                  >
                    {/* Image Container with Gradient Overlay */}
                    <div className="relative h-40 overflow-hidden">
                      {/* Background Image */}
                      <img
                        src={image}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      {/* Gradient Overlay */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 group-hover:opacity-50 transition-opacity duration-300`}
                      ></div>

                      {/* Decorative circles */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                      {/* Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-6xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {icon}
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Category Name */}
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {category.name}
                      </h3>

                      {/* Description */}
                      {category.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {category.description}
                        </p>
                      )}

                      {/* Product Count */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Explore products
                        </span>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </div>

                      {/* CTA Button */}
                      <button
                        className={`w-full mt-4 bg-gradient-to-r ${gradient} hover:opacity-90 text-white font-bold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg`}
                      >
                        <span>Browse Now</span>
                        <svg
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Pagination Dots */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? "w-8 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"
                      : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
