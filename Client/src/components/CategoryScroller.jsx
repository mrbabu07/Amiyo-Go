import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../services/api";

export default function CategoryScroller() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
      handleScroll(); // Initial check
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
  }, [categories]);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (categories.length <= 4) return; // Don't auto-scroll if few categories

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          // Reset to beginning
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Scroll right
          scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
        }
      }
    }, 3000); // Auto-scroll every 3 seconds

    return () => clearInterval(interval);
  }, [categories]);

  if (loading) {
    return (
      <div className="bg-white py-8 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white py-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Shop by Category
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Discover products in your favorite categories
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full border transition-all ${
                canScrollLeft
                  ? "border-gray-300 hover:border-primary-500 hover:bg-primary-50 text-gray-600 hover:text-primary-600"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`p-2 rounded-full border transition-all ${
                canScrollRight
                  ? "border-gray-300 hover:border-primary-500 hover:bg-primary-50 text-gray-600 hover:text-primary-600"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
            >
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Categories Scroll Container */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category, index) => (
              <Link
                key={category._id}
                to={`/category/${category.slug}`}
                className="flex-shrink-0 group"
              >
                <div className="w-32 text-center">
                  {/* Category Icon/Image */}
                  <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-primary-100 via-primary-200 to-secondary-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                      <span className="text-2xl text-white font-bold">
                        {getCategoryIcon(category.name, index)}
                      </span>
                    </div>
                  </div>

                  {/* Category Name */}
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors duration-200 truncate">
                    {category.name}
                  </h3>

                  {/* Hover Effect */}
                  <div className="mt-2 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
              </Link>
            ))}

            {/* View All Categories Card */}
            <Link to="/categories" className="flex-shrink-0 group">
              <div className="w-32 text-center">
                <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-xl border-2 border-dashed border-gray-300 group-hover:border-primary-400">
                  <svg
                    className="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-600 text-sm group-hover:text-primary-600 transition-colors duration-200">
                  View All
                </h3>
                <div className="mt-2 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </div>
            </Link>
          </div>

          {/* Gradient Overlays for scroll indication */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none"></div>
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get category icons
function getCategoryIcon(categoryName, index) {
  const icons = ["👕", "👗", "📱", "👶", "👟", "💄", "🏠", "📚", "🎮", "⚽"];

  // Try to match category name to appropriate icon
  const name = categoryName.toLowerCase();
  if (name.includes("men") || name.includes("man")) return "👕";
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

  // Fallback to index-based icon
  return icons[index % icons.length];
}
