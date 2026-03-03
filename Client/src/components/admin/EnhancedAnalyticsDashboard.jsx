import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

export default function EnhancedAnalyticsDashboard({
  orders = [],
  products = [],
}) {
  const [timeRange, setTimeRange] = useState("30d");
  const [analytics, setAnalytics] = useState({
    salesTrend: [],
    categoryPerformance: [],
    topProducts: [],
    revenueByDay: [],
    orderStatusDistribution: [],
    customerMetrics: {},
  });

  useEffect(() => {
    calculateAnalytics();
  }, [orders, products, timeRange]);

  const calculateAnalytics = () => {
    if (!orders.length) return;

    const days = parseInt(timeRange.replace("d", ""));
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Filter orders by time range
    const filteredOrders = orders.filter(
      (order) => new Date(order.createdAt) >= startDate,
    );

    // 1. Sales Trend (Daily Revenue)
    const salesByDay = {};
    filteredOrders.forEach((order) => {
      const date = new Date(order.createdAt).toLocaleDateString();
      salesByDay[date] = (salesByDay[date] || 0) + (order.total || 0);
    });

    const salesTrend = Object.entries(salesByDay)
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue),
        orders: filteredOrders.filter(
          (o) => new Date(o.createdAt).toLocaleDateString() === date,
        ).length,
      }))
      .slice(-30); // Last 30 days

    // 2. Category Performance
    const categoryStats = {};
    filteredOrders.forEach((order) => {
      order.products?.forEach((item) => {
        const category = item.category || "Uncategorized";
        if (!categoryStats[category]) {
          categoryStats[category] = { revenue: 0, quantity: 0 };
        }
        categoryStats[category].revenue += item.price * item.quantity;
        categoryStats[category].quantity += item.quantity;
      });
    });

    const categoryPerformance = Object.entries(categoryStats)
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue),
        quantity: data.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // 3. Top Products
    const productStats = {};
    filteredOrders.forEach((order) => {
      order.products?.forEach((item) => {
        const productId = item.productId || item._id;
        if (!productStats[productId]) {
          productStats[productId] = {
            name: item.title || item.name,
            revenue: 0,
            quantity: 0,
          };
        }
        productStats[productId].revenue += item.price * item.quantity;
        productStats[productId].quantity += item.quantity;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 4. Order Status Distribution
    const statusCount = {};
    filteredOrders.forEach((order) => {
      const status = order.status || "pending";
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const orderStatusDistribution = Object.entries(statusCount).map(
      ([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }),
    );

    // 5. Customer Metrics
    const uniqueCustomers = new Set(filteredOrders.map((o) => o.userId)).size;
    const totalRevenue = filteredOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0,
    );
    const avgOrderValue =
      filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    const repeatCustomers = calculateRepeatCustomers(filteredOrders);

    const customerMetrics = {
      total: uniqueCustomers,
      avgOrderValue: Math.round(avgOrderValue),
      repeatRate: Math.round((repeatCustomers / uniqueCustomers) * 100) || 0,
      totalOrders: filteredOrders.length,
    };

    setAnalytics({
      salesTrend,
      categoryPerformance,
      topProducts,
      revenueByDay: salesTrend,
      orderStatusDistribution,
      customerMetrics,
    });
  };

  const calculateRepeatCustomers = (orders) => {
    const customerOrders = {};
    orders.forEach((order) => {
      customerOrders[order.userId] = (customerOrders[order.userId] || 0) + 1;
    });
    return Object.values(customerOrders).filter((count) => count > 1).length;
  };

  const formatCurrency = (value) => `৳${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Advanced Analytics
        </h2>
        <div className="flex gap-2">
          {["7d", "30d", "90d"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {range === "7d"
                ? "7 Days"
                : range === "30d"
                  ? "30 Days"
                  : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Customers"
          value={analytics.customerMetrics.total}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(analytics.customerMetrics.avgOrderValue)}
          icon="💰"
          color="green"
        />
        <MetricCard
          title="Repeat Rate"
          value={`${analytics.customerMetrics.repeatRate}%`}
          icon="🔄"
          color="purple"
        />
        <MetricCard
          title="Total Orders"
          value={analytics.customerMetrics.totalOrders}
          icon="📦"
          color="orange"
        />
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sales Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.salesTrend}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.1}
            />
            <XAxis dataKey="date" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category Performance & Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryPerformance}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.1}
              />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Order Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.orderStatusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.orderStatusDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top 10 Products by Revenue
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Product
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Quantity Sold
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProducts.map((product, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-semibold">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {product.name}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {product.quantity}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white font-semibold">
                    {formatCurrency(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    purple:
      "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    orange:
      "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
