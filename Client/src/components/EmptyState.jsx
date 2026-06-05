import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionLink,
  onAction,
  variant = "default",
}) {
  const variants = {
    default: "bg-gray-100 dark:bg-gray-800",
    cart:
      "bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/60 dark:to-primary-800/40",
    wishlist:
      "bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/50 dark:to-pink-900/40",
    orders:
      "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/40",
    search:
      "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/40",
  };

  const iconColors = {
    default: "text-gray-400 dark:text-gray-300",
    cart: "text-primary-500 dark:text-primary-300",
    wishlist: "text-red-400 dark:text-red-300",
    orders: "text-blue-400 dark:text-blue-300",
    search: "text-amber-400 dark:text-amber-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className={`w-32 h-32 ${variants[variant]} rounded-full flex items-center justify-center mb-6 shadow-lg`}
      >
        <div className={`text-6xl ${iconColors[variant]}`}>{icon}</div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-gray-900 mb-2 dark:text-white"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-8 max-w-md leading-relaxed dark:text-gray-300"
      >
        {description}
      </motion.p>

      {actionText && (actionLink || onAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {actionLink ? (
            <Link
              to={actionLink}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95 inline-flex items-center gap-2 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              {actionText}
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
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95 inline-flex items-center gap-2 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              {actionText}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Predefined empty states
export const EmptyStates = {
  Cart: () => (
    <EmptyState
      variant="cart"
      icon="🛒"
      title="Your cart is empty"
      description="Looks like you haven't added anything to your cart yet. Start shopping to fill it up!"
      actionText="Start Shopping"
      actionLink="/"
    />
  ),

  Wishlist: () => (
    <EmptyState
      variant="wishlist"
      icon="❤️"
      title="Your wishlist is empty"
      description="Save items you love to your wishlist. You can add items by clicking the heart icon."
      actionText="Browse Products"
      actionLink="/"
    />
  ),

  Orders: () => (
    <EmptyState
      variant="orders"
      icon="📦"
      title="No orders yet"
      description="You haven't placed any orders yet. Start shopping to see your order history here."
      actionText="Start Shopping"
      actionLink="/"
    />
  ),

  SearchResults: ({ query }) => (
    <EmptyState
      variant="search"
      icon="🔍"
      title="No results found"
      description={`We couldn't find any products matching "${query}". Try different keywords or browse our categories.`}
      actionText="Browse Categories"
      actionLink="/"
    />
  ),

  Products: () => (
    <EmptyState
      variant="default"
      icon="📦"
      title="No products available"
      description="There are no products in this category yet. Check back later for new arrivals."
      actionText="Browse Other Categories"
      actionLink="/"
    />
  ),

  AdminProducts: ({ onAdd }) => (
    <EmptyState
      variant="default"
      icon="📦"
      title="No products added"
      description="Start building your inventory by adding your first product."
      actionText="Add Product"
      onAction={onAdd}
    />
  ),

  AdminOrders: () => (
    <EmptyState
      variant="orders"
      icon="📋"
      title="No orders received"
      description="When customers place orders, they will appear here for you to manage."
    />
  ),

  NetworkError: ({ onRetry }) => (
    <EmptyState
      variant="default"
      icon="📡"
      title="Connection Error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      actionText="Retry"
      onAction={onRetry}
    />
  ),
};
