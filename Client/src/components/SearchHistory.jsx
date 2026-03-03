import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchHistory({ onSearchSelect }) {
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Load search history from localStorage
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const addToHistory = (searchTerm) => {
    if (!searchTerm.trim()) return;

    const newHistory = [
      searchTerm,
      ...history.filter((term) => term !== searchTerm),
    ].slice(0, 10); // Keep only last 10 searches

    setHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  const removeFromHistory = (searchTerm) => {
    const newHistory = history.filter((term) => term !== searchTerm);
    setHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("searchHistory");
  };

  const handleSearchSelect = (term) => {
    onSearchSelect(term);
    setShowHistory(false);
  };

  // Expose addToHistory method
  useEffect(() => {
    window.addToSearchHistory = addToHistory;
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Recent Searches
      </button>

      <AnimatePresence>
        {showHistory && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Searches
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {history.map((term, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 group"
                  >
                    <button
                      onClick={() => handleSearchSelect(term)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {term}
                      </span>
                    </button>
                    <button
                      onClick={() => removeFromHistory(term)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
