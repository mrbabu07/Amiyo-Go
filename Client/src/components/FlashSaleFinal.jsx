import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useCurrency } from "../hooks/useCurrency";

export default function FlashSaleFinal() {
  const { formatPrice } = useCurrency();
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef(null);

  // Fetch flash sales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${apiUrl}/flash-sales/active`);
        const salesData = Array.isArray(response.data) ? response.data : [];
        setFlashSales(salesData);
      } catch (error) {
        console.error("Error fetching flash sales:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate time remaining
  const getTimeRemaining = (endTime) => {
    const total = Date.parse(endTime) - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    return { total, hours, minutes, seconds };
  };

  // Auto-update countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isHovered || flashSales.length === 0) return;

    const autoScroll = setInterval(() => {
      setCurrentIndex(
        (prev) => (prev + 1) % Math.ceil(flashSales.length / getVisibleCards()),
      );
    }, 4000);

    return () => clearInterval(autoScroll);
  }, [isHovered, flashSales.length]);

  const getVisibleCards = () => {
    if (typeof window === "undefined") return 4;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 768) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  };

  const scroll = (direction) => {
    if (direction === "left") {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentIndex((prev) =>
        Math.min(
          Math.ceil(flashSales.length / getVisibleCards()) - 1,
          prev + 1,
        ),
      );
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="min-w-[250px] h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (flashSales.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(flashSales.length / getVisibleCards());

  return (
    <section className="py-12 bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-red-200/30 to-orange-200/30 dark:from-red-900/20 dark:to-orange-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-pink-200/30 to-red-200/30 dark:from-pink-900/20 dark:to-red-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-red-500 to-orange-500 p-3 rounded-full">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Flash Sales
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Limited time offers
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/flash-sales"
            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200"
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
              {flashSales.map((sale) => {
                const timeLeft = getTimeRemaining(sale.endTime);
                const stockPercentage =
                  ((sale.totalStock - sale.soldCount) / sale.totalStock) * 100;

                return (
                  <Link
                    key={sale._id}
                    to="/flash-sales"
                    className="group min-w-[250px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                  >
                    {/* Image Container */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                      <img
                        src={sale.product?.image || sale.product?.images?.[0]}
                        alt={sale.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Discount Badge */}
                      <div className="absolute top-3 left-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg blur opacity-75"></div>
                          <div className="relative bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg">
                            {sale.discountPercentage}% OFF
                          </div>
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-semibold border border-white/20">
                        {sale.totalStock - sale.soldCount} left
                      </div>

                      {/* Countdown Timer */}
                      {timeLeft.total > 0 && (
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20">
                            <div className="flex items-center justify-center gap-2 text-white">
                              <svg
                                className="w-4 h-4 text-red-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="font-mono font-bold text-sm">
                                {timeLeft.hours > 0 &&
                                  `${String(timeLeft.hours).padStart(2, "0")}:`}
                                {String(timeLeft.minutes).padStart(2, "0")}:
                                {String(timeLeft.seconds).padStart(2, "0")}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Title */}
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                        {sale.title}
                      </h3>

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                          {formatPrice(sale.flashPrice)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(sale.originalPrice)}
                        </span>
                        <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">
                          Save{" "}
                          {formatPrice(sale.originalPrice - sale.flashPrice)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                          <span className="font-medium">
                            Sold: {sale.soldCount}/{sale.totalStock}
                          </span>
                          <span className="font-medium">
                            {Math.round(stockPercentage)}% left
                          </span>
                        </div>
                        <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${100 - stockPercentage}%` }}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg">
                        <span>Grab Deal</span>
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
                      ? "w-8 h-2 bg-gradient-to-r from-red-500 to-orange-500"
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
