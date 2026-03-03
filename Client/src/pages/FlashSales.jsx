import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../hooks/useCurrency";
import Loading from "../components/Loading";
import useCart from "../hooks/useCart";
import { useToast } from "../context/ToastContext";
import BackButton from "../components/BackButton";

const FlashSales = () => {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { success, error } = useToast();
  const [activeFlashSales, setActiveFlashSales] = useState([]);
  const [upcomingFlashSales, setUpcomingFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({});

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const fetchFlashSales = async () => {
    try {
      const [activeRes, upcomingRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/flash-sales/active`),
        fetch(`${import.meta.env.VITE_API_URL}/flash-sales/upcoming`),
      ]);

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveFlashSales(Array.isArray(activeData) ? activeData : []);
      }

      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcomingFlashSales(Array.isArray(upcomingData) ? upcomingData : []);
      }
    } catch (err) {
      console.error("Error fetching flash sales:", err);
      error("Failed to load flash sales");
      setActiveFlashSales([]);
      setUpcomingFlashSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers = {};

      [...activeFlashSales, ...upcomingFlashSales].forEach((sale) => {
        const now = new Date().getTime();
        const targetTime =
          sale.status === "upcoming"
            ? new Date(sale.startTime).getTime()
            : new Date(sale.endTime).getTime();
        const distance = targetTime - now;

        if (distance < 0) {
          fetchFlashSales();
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        newTimers[sale._id] = { days, hours, minutes, seconds };
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFlashSales, upcomingFlashSales]);

  const handleAddToCart = async (sale) => {
    try {
      await addToCart(sale.product, 1);
      success("Added to cart!");
    } catch (err) {
      console.error("Error adding to cart:", err);
      error("Failed to add to cart");
    }
  };

  const FlashSaleCard = ({ sale, isUpcoming = false }) => {
    const timer = timers[sale._id] || {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
    const stockPercentage =
      ((sale.totalStock - sale.soldCount) / sale.totalStock) * 100;

    return (
      <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1">
        {/* Status Badge */}
        {!isUpcoming && (
          <div className="absolute top-3 left-3 z-20">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-error-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              LIVE NOW
            </div>
          </div>
        )}

        {/* Discount Badge */}
        <div className="absolute top-3 right-3 z-20">
          <div className="bg-accent-400 text-gray-900 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
            {sale.discountPercentage}% OFF
          </div>
        </div>

        {/* Product Image */}
        <Link
          to={`/product/${sale.product._id}`}
          className="block relative overflow-hidden aspect-square"
        >
          <img
            src={
              sale.product.images?.[0] ||
              sale.product.image ||
              "/placeholder.jpg"
            }
            alt={sale.product.title || sale.product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Link>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <Link to={`/product/${sale.product._id}`}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors line-clamp-2 mb-2">
              {sale.title}
            </h3>
          </Link>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
            {sale.description || sale.product.description}
          </p>

          {/* Price Section */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-primary-500 dark:text-primary-400">
              {formatPrice(sale.flashPrice)}
            </span>
            <span className="text-lg text-gray-400 dark:text-gray-500 line-through">
              {formatPrice(sale.originalPrice)}
            </span>
            <span className="ml-auto text-sm font-semibold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 px-2 py-1 rounded-full">
              Save {formatPrice(sale.originalPrice - sale.flashPrice)}
            </span>
          </div>

          {/* Countdown Timer */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-medium">
                {isUpcoming
                  ? t("flashSale.startsIn", "Starts in")
                  : t("flashSale.endsIn", "Ends in")}
                :
              </span>
              <div className="flex items-center gap-1 font-mono font-bold text-error-600 dark:text-error-400">
                {timer.days > 0 && (
                  <>
                    <span className="bg-error-100 dark:bg-error-900/30 px-2 py-1 rounded">
                      {timer.days}d
                    </span>
                    <span>:</span>
                  </>
                )}
                <span className="bg-error-100 dark:bg-error-900/30 px-2 py-1 rounded">
                  {String(timer.hours).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-error-100 dark:bg-error-900/30 px-2 py-1 rounded">
                  {String(timer.minutes).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-error-100 dark:bg-error-900/30 px-2 py-1 rounded">
                  {String(timer.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Stock Progress */}
            {!isUpcoming && (
              <>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">
                    {t("flashSale.sold", "Sold")}:{" "}
                    <span className="text-error-600 dark:text-error-400 font-bold">
                      {sale.soldCount}
                    </span>
                  </span>
                  <span className="font-medium">
                    <span className="text-success-600 dark:text-success-400 font-bold">
                      {sale.remainingStock}
                    </span>{" "}
                    {t("flashSale.left", "left")}
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-error-500 to-orange-500 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${100 - stockPercentage}%` }}
                  />
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleAddToCart(sale)}
            disabled={isUpcoming || sale.remainingStock === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 ${
              isUpcoming || sale.remainingStock === 0
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
            }`}
          >
            {isUpcoming
              ? t("flashSale.comingSoon", "Coming Soon")
              : sale.remainingStock === 0
                ? t("flashSale.soldOut", "Sold Out")
                : t("flashSale.buyNow", "🛒 Buy Now")}
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/20 to-accent-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-error-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg animate-pulse">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              FLASH SALES
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t("flashSale.title", "Lightning Deals")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t(
              "flashSale.subtitle",
              "Limited time offers with massive discounts. Grab them before they're gone!",
            )}
          </p>
        </div>

        {/* Active Flash Sales */}
        {activeFlashSales.length > 0 && (
          <div className="mb-16 animate-slide-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-error-500 rounded-full animate-pulse shadow-lg shadow-error-500/50"></span>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t("flashSale.activeNow", "Active Now")}
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-error-500/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeFlashSales.map((sale) => (
                <FlashSaleCard key={sale._id} sale={sale} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Flash Sales */}
        {upcomingFlashSales.length > 0 && (
          <div className="animate-slide-up delay-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-secondary-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t("flashSale.upcoming", "Coming Soon")}
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-secondary-500/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingFlashSales.map((sale) => (
                <FlashSaleCard key={sale._id} sale={sale} isUpcoming />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeFlashSales.length === 0 && upcomingFlashSales.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-primary-500 dark:text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {t("flashSale.noSales", "No Flash Sales Available")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Check back soon for amazing deals! In the meantime, explore our
              full product catalog.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
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
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {t("flashSale.browseProducts", "Browse All Products")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSales;
