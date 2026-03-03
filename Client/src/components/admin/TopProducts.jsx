import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts, getAllOrders } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

export default function TopProducts() {
  const { formatPrice } = useCurrency();
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("week"); // week, month, all

  useEffect(() => {
    fetchTopProducts();
  }, [timeframe]);

  const fetchTopProducts = async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        getProducts(),
        getAllOrders(),
      ]);

      const products = productsRes.data.data || [];
      const orders = ordersRes.data.data || [];

      // Filter orders by timeframe
      const now = new Date();
      const filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        if (timeframe === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        } else if (timeframe === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthAgo;
        }
        return true; // all time
      });

      // Calculate product sales
      const productSales = {};
      filteredOrders.forEach((order) => {
        order.products.forEach((item) => {
          const productId = item.productId || item._id;
          if (!productSales[productId]) {
            productSales[productId] = {
              quantity: 0,
              revenue: 0,
              orders: 0,
            };
          }
          productSales[productId].quantity += item.quantity || 1;
          productSales[productId].revenue +=
            (item.price || 0) * (item.quantity || 1);
          productSales[productId].orders += 1;
        });
      });

      // Combine with product details and sort by revenue
      const productsWithSales = products
        .map((product) => ({
          ...product,
          sales: productSales[product._id] || {
            quantity: 0,
            revenue: 0,
            orders: 0,
          },
        }))
        .filter((product) => product.sales.revenue > 0)
        .sort((a, b) => b.sales.revenue - a.sales.revenue)
        .slice(0, 10);

      setTopProducts(productsWithSales);
    } catch (error) {
      console.error("Failed to fetch top products:", error);
    } finally {
      setLoading(false);
    }
  };

  const timeframeOptions = [
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Selling Products
        </h2>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {timeframeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-4 p-3 rounded-lg"
            >
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      ) : topProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p>No sales data available for this period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={product._id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    index === 0
                      ? "bg-yellow-500"
                      : index === 1
                        ? "bg-gray-400"
                        : index === 2
                          ? "bg-orange-600"
                          : "bg-gray-300"
                  }`}
                >
                  {index + 1}
                </div>
                <img
                  src={product.image || "/placeholder-product.jpg"}
                  alt={product.title}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${product._id}`}
                  className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate block"
                >
                  {product.title}
                </Link>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>{product.sales.quantity} sold</span>
                  <span>•</span>
                  <span>{product.sales.orders} orders</span>
                  <span>•</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {formatPrice(product.sales.revenue)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(product.sales.revenue)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatPrice(product.sales.revenue / product.sales.quantity)}{" "}
                  avg
                </div>
              </div>

              {/* Progress bar showing relative performance */}
              <div className="w-20">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${(product.sales.revenue / topProducts[0].sales.revenue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/admin/products"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center gap-1"
          >
            View All Products
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
