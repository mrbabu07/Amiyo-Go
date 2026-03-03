import { useState, useEffect } from "react";

export default function MetricCard({
  title,
  value,
  previousValue,
  icon,
  color = "blue",
  format = "number",
  loading = false,
  trend = true,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (loading) return;

    setIsAnimating(true);
    const startValue = displayValue;
    const endValue = typeof value === "number" ? value : 0;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value, loading]);

  const formatValue = (val) => {
    if (format === "currency") {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (format === "percentage") {
      return `${val.toFixed(1)}%`;
    } else {
      return Math.round(val).toLocaleString();
    }
  };

  const calculateChange = () => {
    if (!previousValue || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const change = calculateChange();
  const isPositive = change > 0;
  const isNegative = change < 0;

  const colorClasses = {
    blue: {
      bg: "bg-blue-500",
      light: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    green: {
      bg: "bg-green-500",
      light: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    },
    purple: {
      bg: "bg-purple-500",
      light: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
    orange: {
      bg: "bg-orange-500",
      light: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-800",
    },
    red: {
      bg: "bg-red-500",
      light: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center text-white shadow-lg`}
        >
          {icon}
        </div>
        {trend && change !== null && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isPositive
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : isNegative
                  ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {isPositive ? (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 17l9.2-9.2M17 17V7H7"
                />
              </svg>
            ) : isNegative ? (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 7l-9.2 9.2M7 7v10h10"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <div
            className={`text-2xl font-bold text-gray-900 dark:text-white transition-all duration-300 ${
              isAnimating ? "transform scale-105" : ""
            }`}
          >
            {loading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
            ) : (
              formatValue(displayValue)
            )}
          </div>
          {previousValue && !loading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              from {formatValue(previousValue)}
            </span>
          )}
        </div>
      </div>

      {/* Mini sparkline effect */}
      <div className={`mt-4 h-1 ${colors.light} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${colors.bg} rounded-full transition-all duration-1000 ease-out`}
          style={{
            width: loading
              ? "0%"
              : `${Math.min((value / (value + previousValue || value)) * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
