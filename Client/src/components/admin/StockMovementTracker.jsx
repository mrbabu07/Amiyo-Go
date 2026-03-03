import { useState, useEffect } from "react";
import { getAllOrders } from "../../services/api";

export default function StockMovementTracker({ productId, className = "" }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("7d"); // 7d, 30d, 90d

  useEffect(() => {
    fetchStockMovements();
  }, [productId, timeframe]);

  const fetchStockMovements = async () => {
    try {
      const ordersRes = await getAllOrders();
      const orders = ordersRes.data.data || [];

      const daysBack = parseInt(timeframe.replace("d", ""));
      const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Extract stock movements from orders
      const stockMovements = [];

      orders
        .filter((order) => new Date(order.createdAt) >= cutoffDate)
        .forEach((order) => {
          order.products.forEach((item) => {
            if (
              !productId ||
              item.productId === productId ||
              item._id === productId
            ) {
              stockMovements.push({
                id: `${order._id}-${item.productId || item._id}`,
                type: "sale",
                quantity: -(item.quantity || 1),
                reason: "Customer Purchase",
                date: new Date(order.createdAt),
                orderId: order._id,
                productTitle: item.title,
                productId: item.productId || item._id,
                customerInfo: order.shippingInfo?.name || "Customer",
                status: order.status,
              });
            }
          });
        });

      // Sort by date (newest first)
      stockMovements.sort((a, b) => b.date - a.date);

      setMovements(stockMovements);
    } catch (error) {
      console.error("Failed to fetch stock movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type, quantity) => {
    if (type === "sale" || quantity < 0) {
      return (
        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </div>
      );
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending:
        "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
      processing:
        "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
      shipped:
        "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
      delivered:
        "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
      cancelled: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
    };
    return (
      colors[status] ||
      "text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
    );
  };

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Stock Movement History
        </h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {movements.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            No stock movements in this period
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              {getMovementIcon(movement.type, movement.quantity)}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {movement.reason}
                    </p>
                    {!productId && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {movement.productTitle}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{movement.date.toLocaleDateString()}</span>
                      <span>{movement.date.toLocaleTimeString()}</span>
                      <span>
                        Order #{movement.orderId.slice(-8).toUpperCase()}
                      </span>
                      <span>{movement.customerInfo}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(movement.status)}`}
                    >
                      {movement.status}
                    </span>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          movement.quantity < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        units
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {movements.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Total movements: {movements.length}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-red-600 dark:text-red-400">
                Sold:{" "}
                {Math.abs(
                  movements.reduce(
                    (sum, m) => sum + (m.quantity < 0 ? m.quantity : 0),
                    0,
                  ),
                )}{" "}
                units
              </span>
              <span className="text-green-600 dark:text-green-400">
                Added:{" "}
                {movements.reduce(
                  (sum, m) => sum + (m.quantity > 0 ? m.quantity : 0),
                  0,
                )}{" "}
                units
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
