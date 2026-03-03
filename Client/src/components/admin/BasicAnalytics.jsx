import { useState, useEffect } from "react";
import { getAllOrders, getProducts } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

export default function BasicAnalytics() {
  const { formatPrice } = useCurrency();
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    recentOrders: [],
    topProducts: [],
    ordersByStatus: {},
    revenueGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7"); // days

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch orders and products
      const [ordersResponse, productsResponse] = await Promise.all([
        getAllOrders(),
        getProducts(),
      ]);

      const orders = ordersResponse.data.data || [];
      const products = productsResponse.data.data || [];

      // Calculate analytics
      const now = new Date();
      const daysAgo = new Date(
        now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000,
      );

      const recentOrders = orders.filter(
        (order) => new Date(order.createdAt) >= daysAgo,
      );

      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );
      const recentRevenue = recentOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );

      // Get unique customers
      const uniqueCustomers = new Set(orders.map((order) => order.userId)).size;

      // Orders by status
      const ordersByStatus = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Top products (by order frequency)
      const productOrderCount = {};
      orders.forEach((order) => {
        order.products?.forEach((product) => {
          productOrderCount[product.title] =
            (productOrderCount[product.title] || 0) + product.quantity;
        });
      });

      const topProducts = Object.entries(productOrderCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Calculate growth (mock calculation)
      const previousPeriodRevenue = totalRevenue * 0.85; // Mock previous period
      const revenueGrowth =
        previousPeriodRevenue > 0
          ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) *
            100
          : 0;

      setAnalytics({
        totalOrders: orders.length,
        totalRevenue,
        totalProducts: products.length,
        totalCustomers: uniqueCustomers,
        recentOrders: recentOrders.slice(0, 5),
        topProducts,
        ordersByStatus,
        revenueGrowth,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(analytics.totalRevenue)}
              </p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                +{analytics.revenueGrowth.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.totalOrders}
              </p>
              <p className="text-sm text-gray-500 mt-1">All time</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
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
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Products
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.totalProducts}
              </p>
              <p className="text-sm text-gray-500 mt-1">In catalog</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
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
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Customers
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.totalCustomers}
              </p>
              <p className="text-sm text-gray-500 mt-1">Unique users</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
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
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Orders by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status === "delivered"
                        ? "bg-green-500"
                        : status === "processing"
                          ? "bg-blue-500"
                          : status === "shipped"
                            ? "bg-purple-500"
                            : status === "pending"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {status}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {analytics.topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">
                      #{index + 1}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                    {product.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {product.count} sold
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Orders
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Order ID
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Customer
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Amount
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentOrders.map((order) => (
                <tr
                  key={order._id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm font-mono">
                    #{order._id.slice(-8).toUpperCase()}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {order.shippingInfo?.name || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium">
                    {formatPrice(order.total || 0)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : order.status === "processing"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "shipped"
                              ? "bg-purple-100 text-purple-800"
                              : order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
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
