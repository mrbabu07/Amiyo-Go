import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdvancedSort({ onSortChange, currentSort = "newest" }) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: "newest", label: "Newest First", icon: "🆕" },
    { value: "popularity", label: "Most Popular", icon: "🔥" },
    { value: "price-low", label: "Price: Low to High", icon: "💰" },
    { value: "price-high", label: "Price: High to Low", icon: "💎" },
    { value: "rating", label: "Highest Rated", icon: "⭐" },
    { value: "name-asc", label: "Name: A to Z", icon: "🔤" },
    { value: "name-desc", label: "Name: Z to A", icon: "🔡" },
    { value: "discount", label: "Biggest Discount", icon: "🏷️" },
  ];

  const currentOption = sortOptions.find((opt) => opt.value === currentSort);

  const handleSortChange = (value) => {
    onSortChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Sort Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sort: {currentOption?.label}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden"
            >
              <div className="p-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      currentSort === option.value
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-sm font-medium flex-1">
                      {option.label}
                    </span>
                    {currentSort === option.value && (
                      <svg
                        className="w-5 h-5 text-primary-600 dark:text-primary-400"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
