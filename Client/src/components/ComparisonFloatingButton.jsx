import { useState } from "react";
import { Link } from "react-router-dom";
import { useComparison } from "../context/ComparisonContext";

export default function ComparisonFloatingButton() {
  const { compareList, compareCount, removeFromCompare } = useComparison();
  const [isExpanded, setIsExpanded] = useState(false);

  if (compareCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Expanded View */}
      {isExpanded && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 animate-slideUp">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Compare Products ({compareCount}/3)
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {compareList.map((product) => (
              <div
                key={product._id}
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-10 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {product.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ${product.price}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCompare(product._id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg
                    className="w-4 h-4"
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
            ))}
          </div>

          <Link
            to="/compare"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors text-center block"
          >
            Compare Now
          </Link>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-all duration-200 hover:scale-105 relative"
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>

        {/* Badge */}
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
          {compareCount}
        </span>
      </button>
    </div>
  );
}
