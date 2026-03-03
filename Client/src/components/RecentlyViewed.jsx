import { Link } from "react-router-dom";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useCurrency } from "../hooks/useCurrency";

export default function RecentlyViewed() {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { formatPrice } = useCurrency();

  if (recentlyViewed.length === 0) return null;

  return (
    <section className="py-12 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recently Viewed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Products you've looked at recently
            </p>
          </div>
          <button
            onClick={clearRecentlyViewed}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recentlyViewed.map((product) => (
            <Link
              key={product._id}
              to={`/product/${product._id}`}
              className="group bg-gray-50 dark:bg-gray-800 rounded-xl p-4 hover:shadow-md transition-all"
            >
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-3">
                <img
                  src={product.image || product.images?.[0]}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">
                {product.title}
              </h3>
              <p className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                {formatPrice(product.price)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
