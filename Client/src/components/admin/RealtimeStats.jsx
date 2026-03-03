import { useState, useEffect } from "react";
import { getAllOrders, getProducts } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

export default function RealtimeStats() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    onlineVisitors: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealtimeStats();

    // Update stats every 30 seconds
    const interval = setInterval(fetchRealtimeStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRealtimeStats = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        getAllOrders(),
        getProducts(),
      ]);

      const orders = ordersRes.data.data || [];
      const products = productsRes.data.data || [];

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter(
        (order) => new Date(order.createdAt) >= today,
      );

      const todayRevenue = todayOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );

      // Simulate online visitors (in real app, this would come from analytics)
      const onlineVisitors = Math.floor(Math.random() * 50) + 10;

      // Calculate conversion rate (orders / visitors * 100)
      const conversionRate =
        onlineVisitors > 0 ? (todayOrders.length / onlineVisitors) * 100 : 0;

      // Calculate average order value
      const avgOrderValue =
        todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

      // Get unique customers
      const uniqueCustomers = new Set(orders.map((order) => order.userId)).size;

      setStats({
        todayOrders: todayOrders.length,
        todayRevenue,
        onlineVisitors,
        conversionRate,
        avgOrderValue,
        totalCustomers: uniqueCustomers,
      });
    } catch (error) {
      console.error("Failed to fetch realtime stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statItems = [
    {
      label: "Today's Orders",
      value: stats.todayOrders,
      icon: "📦",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Today's Revenue",
      value: formatPrice(stats.todayRevenue),
      icon: "💰",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Online Visitors",
      value: stats.onlineVisitors,
      icon: "👥",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: "📈",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Avg Order Value",
      value: formatPrice(stats.avgOrderValue),
      icon: "🛒",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      icon: "👤",
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Real-time Statistics
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {item.label}
                </p>
                <p
                  className={`text-lg font-bold ${item.color} dark:text-white`}
                >
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 w-16 rounded"></div>
                  ) : (
                    item.value
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
