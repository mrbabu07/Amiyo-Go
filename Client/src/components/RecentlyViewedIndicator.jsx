import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { Link } from "react-router-dom";

export default function RecentlyViewedIndicator() {
  const { recentlyViewed } = useRecentlyViewed();

  if (recentlyViewed.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Recently Viewed
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {recentlyViewed.length} items
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {recentlyViewed.slice(0, 3).map((product) => (
            <Link
              key={product._id}
              to={`/product/${product._id}`}
              className="flex-shrink-0 group"
            >
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={product.image || product.images?.[0]}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              </div>
            </Link>
          ))}

          {recentlyViewed.length > 3 && (
            <Link
              to="/products"
              className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-xs font-medium">
                +{recentlyViewed.length - 3}
              </span>
            </Link>
          )}
        </div>

        <Link
          to="/products"
          className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
        >
          View All
        </Link>
      </div>
    </div>
  );
}
