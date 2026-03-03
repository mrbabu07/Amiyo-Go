import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts, getCategories, getAllOrders } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";
import MetricCard from "../../components/admin/MetricCard";
import AnalyticsChart from "../../components/admin/AnalyticsChart";
import RealtimeStats from "../../components/admin/RealtimeStats";
import TopProducts from "../../components/admin/TopProducts";
import LowStockAlert from "../../components/admin/LowStockAlert";
import BasicAnalytics from "../../components/admin/BasicAnalytics";

export default function AdminDashboard() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    revenue: 0,
    previousRevenue: 0,
    customers: 0,
    avgOrderValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState({
    revenue: [],
    orders: [],
    customers: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("7d"); // 7d, 30d, 90d

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, [timeframe]);

  const fetchStats = async () => {
    try {
      const [productsRes, categoriesRes, ordersRes] = await Promise.all([
        getProducts(),
        getCategories(),
        getAllOrders(),
      ]);

      const orders = ordersRes.data.data || [];
      const products = productsRes.data.data || [];

      // Calculate current period revenue
      const now = new Date();
      const daysBack = parseInt(timeframe.replace("d", ""));
      const currentPeriodStart = new Date(
        now.getTime() - daysBack * 24 * 60 * 60 * 1000,
      );
      const previousPeriodStart = new Date(
        now.getTime() - daysBack * 2 * 24 * 60 * 60 * 1000,
      );

      const currentPeriodOrders = orders.filter(
        (order) => new Date(order.createdAt) >= currentPeriodStart,
      );
      const previousPeriodOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return (
          orderDate >= previousPeriodStart && orderDate < currentPeriodStart
        );
      });

      const revenue = currentPeriodOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );
      const previousRevenue = previousPeriodOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );

      // Get unique customers
      const uniqueCustomers = new Set(
        currentPeriodOrders.map((order) => order.userId),
      ).size;
      const avgOrderValue =
        currentPeriodOrders.length > 0
          ? revenue / currentPeriodOrders.length
          : 0;

      setStats({
        products: products.length,
        categories: categoriesRes.data.data?.length || 0,
        orders: currentPeriodOrders.length,
        revenue,
        previousRevenue,
        customers: uniqueCustomers,
        avgOrderValue,
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const ordersRes = await getAllOrders();
      const orders = ordersRes.data.data || [];

      const daysBack = parseInt(timeframe.replace("d", ""));
      const now = new Date();

      // Generate data for the last N days
      const chartData = {
        revenue: [],
        orders: [],
        customers: [],
      };

      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayOrders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= dayStart && orderDate <= dayEnd;
        });

        const dayRevenue = dayOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0,
        );
        const dayCustomers = new Set(dayOrders.map((order) => order.userId))
          .size;

        const label = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        chartData.revenue.push({ label, value: dayRevenue });
        chartData.orders.push({ label, value: dayOrders.length });
        chartData.customers.push({ label, value: dayCustomers });
      }

      setChartData(chartData);
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    }
  };

  const timeframeOptions = [
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
  ];

  const statusColors = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    processing:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    shipped:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    delivered:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Home"
              >
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time insights and business metrics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Link
                to="/admin/products/add"
                className="btn-primary flex items-center gap-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Product
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Low Stock Alert */}
        <LowStockAlert threshold={5} />

        {/* Basic Analytics Dashboard */}
        <div className="mb-8">
          <BasicAnalytics />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Revenue"
            value={stats.revenue}
            previousValue={stats.previousRevenue}
            format="currency"
            color="green"
            loading={loading}
            icon={
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <MetricCard
            title="Orders"
            value={stats.orders}
            color="blue"
            loading={loading}
            icon={
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
          <MetricCard
            title="Customers"
            value={stats.customers}
            color="purple"
            loading={loading}
            icon={
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            }
          />
          <MetricCard
            title="Avg Order Value"
            value={stats.avgOrderValue}
            format="currency"
            color="orange"
            loading={loading}
            icon={
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
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Real-time Stats */}
        <div className="mb-8">
          <RealtimeStats />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <AnalyticsChart
              data={chartData.revenue}
              type="area"
              title="Revenue Trend"
              color="#10B981"
              height={300}
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <AnalyticsChart
              data={chartData.orders}
              type="bar"
              title="Orders Trend"
              color="#3B82F6"
              height={300}
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Products */}
          <div className="lg:col-span-2">
            <TopProducts />
          </div>

          {/* Quick Actions & Recent Orders */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  to="/admin/products"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
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
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Manage Products
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add, edit, or remove products
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/inventory"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Inventory Management
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Monitor stock levels and alerts
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/orders"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      View Orders
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Track and update orders
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/returns"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
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
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Manage Returns
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Handle return requests and refunds
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/coupons"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-yellow-600 dark:text-yellow-400">
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
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Manage Coupons
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create discount codes
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/flash-sales"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Flash Sales
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Limited time deals
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/delivery-settings"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
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
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Delivery Settings
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure delivery charges
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/offers"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center text-cyan-600 dark:text-cyan-400">
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
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Promotional Offers
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage promotional banners
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/reviews"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
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
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Manage Reviews
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reply to customer feedback
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/qa"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
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
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Q&A Management
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Answer customer questions
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      User Management
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage users and permissions
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/insights"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center text-pink-600 dark:text-pink-400">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Customer Insights
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Analyze customer behavior
                    </p>
                  </div>
                </Link>
                <Link
                  to="/admin/support"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400">
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Support Management
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Handle customer support
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Orders
                </h2>
                <Link
                  to="/admin/orders"
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center gap-3 p-3"
                    >
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No orders yet
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                            #{order._id.slice(-4).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatPrice(order.total)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
