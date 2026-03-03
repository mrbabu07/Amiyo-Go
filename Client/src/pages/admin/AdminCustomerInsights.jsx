import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  RefreshCw,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import { getCurrentUserToken } from "../../utils/auth";
import Loading from "../../components/Loading";

const AdminCustomerInsights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [segmentStats, setSegmentStats] = useState([]);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [filters, setFilters] = useState({
    segment: "",
    sortBy: "lastUpdated",
    page: 1,
    limit: 20,
  });
  const [totalPages, setTotalPages] = useState(1);

  const segments = [
    {
      value: "new",
      label: "New Customers",
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "regular",
      label: "Regular Customers",
      color: "bg-green-100 text-green-800",
    },
    {
      value: "vip",
      label: "VIP Customers",
      color: "bg-purple-100 text-purple-800",
    },
  ];

  useEffect(() => {
    fetchInsights();
    fetchSegmentStats();
  }, [filters]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/insights?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      toast.error("Failed to fetch customer insights");
    } finally {
      setLoading(false);
    }
  };

  const fetchSegmentStats = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/insights/segments`,
        {
          headers: {
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSegmentStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching segment stats:", error);
    }
  };

  const generateInsight = async (userId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/insights/${userId}/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
        },
      );

      if (response.ok) {
        toast.success("Customer insight generated successfully");
        fetchInsights();
      } else {
        toast.error("Failed to generate insight");
      }
    } catch (error) {
      console.error("Error generating insight:", error);
      toast.error("Failed to generate insight");
    }
  };

  const getSegmentColor = (segment) => {
    const segmentObj = segments.find((s) => s.value === segment);
    return segmentObj?.color || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && insights.length === 0) {
    return <Loading />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Customer Insights
        </h1>
        <p className="text-gray-600">
          Analyze customer behavior and preferences
        </p>
      </div>

      {/* Segment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {segmentStats.map((stat) => (
          <div key={stat._id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 capitalize">
                  {stat._id} Customers
                </p>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                <p className="text-sm text-gray-500">
                  Avg: {formatCurrency(stat.avgOrderValue || 0)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${getSegmentColor(stat._id)}`}>
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  segmentStats.reduce(
                    (sum, stat) => sum + (stat.totalSpent || 0),
                    0,
                  ),
                )}
              </p>
              <p className="text-sm text-gray-500">All segments</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filters.segment}
              onChange={(e) =>
                setFilters({ ...filters, segment: e.target.value, page: 1 })
              }
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Segments</option>
              {segments.map((segment) => (
                <option key={segment.value} value={segment.value}>
                  {segment.label}
                </option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value, page: 1 })
              }
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="lastUpdated">Last Updated</option>
              <option value="analytics.totalSpent">Total Spent</option>
              <option value="analytics.averageOrderValue">
                Average Order Value
              </option>
              <option value="analytics.orderFrequency">Order Frequency</option>
            </select>

            <Button
              onClick={() =>
                setFilters({
                  segment: "",
                  sortBy: "lastUpdated",
                  page: 1,
                  limit: 20,
                })
              }
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Insights Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {insights.map((insight) => (
                <tr key={insight._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Customer ID: {insight.userId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(insight.analytics?.customerSegment)}`}
                    >
                      {insight.analytics?.customerSegment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(insight.analytics?.totalSpent || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {insight.orderHistory?.totalOrders || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(insight.analytics?.averageOrderValue || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(insight.lastUpdated)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedInsight(insight);
                          setShowInsightModal(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => generateInsight(insight.userId)}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              onClick={() =>
                setFilters({ ...filters, page: Math.max(1, filters.page - 1) })
              }
              disabled={filters.page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setFilters({
                  ...filters,
                  page: Math.min(totalPages, filters.page + 1),
                })
              }
              disabled={filters.page === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{filters.page}</span>{" "}
                of <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      page: Math.max(1, filters.page - 1),
                    })
                  }
                  disabled={filters.page === 1}
                  variant="outline"
                  className="rounded-l-md"
                >
                  Previous
                </Button>
                <Button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      page: Math.min(totalPages, filters.page + 1),
                    })
                  }
                  disabled={filters.page === totalPages}
                  variant="outline"
                  className="rounded-r-md"
                >
                  Next
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Insight Details Modal */}
      <Modal
        isOpen={showInsightModal}
        onClose={() => setShowInsightModal(false)}
        title="Customer Insight Details"
        size="lg"
      >
        {selectedInsight && (
          <div className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Total Spent</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(selectedInsight.analytics?.totalSpent || 0)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-600">
                  Total Orders
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {selectedInsight.orderHistory?.totalOrders || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-600">
                  Avg Order Value
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(
                    selectedInsight.analytics?.averageOrderValue || 0,
                  )}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-orange-600">
                  Order Frequency
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {selectedInsight.analytics?.orderFrequency?.toFixed(2) || 0}
                  /month
                </p>
              </div>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Favorite Categories
                </h3>
                <div className="space-y-2">
                  {selectedInsight.preferences?.favoriteCategories
                    ?.slice(0, 5)
                    .map((category, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm font-medium">
                          {category.category}
                        </span>
                        <span className="text-sm text-gray-600">
                          {category.purchaseCount} purchases
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Favorite Brands
                </h3>
                <div className="space-y-2">
                  {selectedInsight.preferences?.favoriteBrands
                    ?.slice(0, 3)
                    .map((brand, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm font-medium">
                          {brand.brand}
                        </span>
                        <span className="text-sm text-gray-600">
                          {brand.purchaseCount} purchases
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recent Orders
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Order ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Items
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInsight.orderHistory?.orders
                      ?.slice(0, 5)
                      .map((order, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {order.orderId}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {order.items}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatDate(order.createdAt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Support History */}
            {selectedInsight.supportHistory?.totalTickets > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Support History
                </h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">
                      {selectedInsight.supportHistory.totalTickets}
                    </span>{" "}
                    total tickets,{" "}
                    <span className="font-medium">
                      {selectedInsight.supportHistory.openTickets}
                    </span>{" "}
                    currently open
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCustomerInsights;
