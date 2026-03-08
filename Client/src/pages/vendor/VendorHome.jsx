import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useCurrency } from '../../hooks/useCurrency';
import { getShopStatus } from '../../services/api';

const VendorHome = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [shopStatus, setShopStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = await user.getIdToken();
      
      // Fetch stats
      const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      // Fetch recent orders
      const ordersRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/orders?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.orders || []);
      }

      // Fetch shop status
      try {
        const statusRes = await getShopStatus();
        if (statusRes.data) {
          setShopStatus(statusRes.data.data);
        }
      } catch (error) {
        console.error('Error fetching shop status:', error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Seller Center!</h1>
        <p className="text-orange-100">Manage your shop, track sales, and grow your business</p>
      </div>

      {/* Shop Status Alert */}
      {shopStatus && (
        <div className={`rounded-lg p-4 border-2 ${
          shopStatus.isShopOpen && !shopStatus.isCurrentlyOnVacation
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                shopStatus.isShopOpen && !shopStatus.isCurrentlyOnVacation
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
              }`}>
                <span className="text-2xl">
                  {shopStatus.isShopOpen && !shopStatus.isCurrentlyOnVacation ? '🏪' : '🔒'}
                </span>
              </div>
              <div>
                <div className="font-bold text-gray-900">
                  {shopStatus.isShopOpen && !shopStatus.isCurrentlyOnVacation
                    ? 'Your shop is open'
                    : shopStatus.isCurrentlyOnVacation
                    ? 'Your shop is on vacation'
                    : 'Your shop is closed'}
                </div>
                <div className="text-sm text-gray-600">
                  {shopStatus.isCurrentlyOnVacation && shopStatus.vacationMode?.endDate
                    ? `Vacation ends on ${new Date(shopStatus.vacationMode.endDate).toLocaleDateString()}`
                    : shopStatus.isShopOpen
                    ? 'Your products are visible to customers'
                    : 'Your products are hidden from homepage'}
                </div>
              </div>
            </div>
            <Link
              to="/vendor/settings"
              className="bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-lg font-medium transition border border-gray-300"
            >
              Manage Shop Status
            </Link>
          </div>
        </div>
      )}

      {/* Commission Info Banner */}
      {stats?.totalRevenue > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
              💡
            </div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-1">Commission System Active</p>
              <p className="text-sm text-blue-700">
                Platform commission is calculated per category. Your actual earnings = Product Price - Commission. 
                View detailed breakdown in <Link to="/vendor/finance" className="underline font-medium">Finance Center</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Revenue</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatPrice(stats?.totalRevenue || 0)}</div>
          <div className="text-sm text-green-600 mt-1">
            +{stats?.revenueGrowth || 0}% from last month
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Orders</span>
            <span className="text-2xl">📦</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</div>
          <div className="text-sm text-orange-600 mt-1">
            {stats?.pendingOrders || 0} pending
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Products</span>
            <span className="text-2xl">🏷️</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</div>
          <div className="text-sm text-yellow-600 mt-1">
            {stats?.lowStockProducts || 0} low stock
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Shop Rating</span>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.avgRating || 0}</div>
          <div className="text-sm text-gray-600 mt-1">
            {stats?.totalReviews || 0} reviews
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/vendor/products/add"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-3">➕</div>
          <div className="font-semibold text-gray-900">Add Product</div>
          <div className="text-sm text-gray-600 mt-1">List new items</div>
        </Link>

        <Link
          to="/vendor/orders?status=pending"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-3">📋</div>
          <div className="font-semibold text-gray-900">Process Orders</div>
          <div className="text-sm text-gray-600 mt-1">{stats?.pendingOrders || 0} pending</div>
        </Link>

        <Link
          to="/vendor/settings/bank"
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition text-center transform hover:scale-105"
        >
          <div className="text-4xl mb-3">💳</div>
          <div className="font-semibold text-white">Bank Settings</div>
          <div className="text-sm text-blue-100 mt-1">Setup payouts</div>
        </Link>

        <Link
          to="/vendor/marketing/promotions"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-3">🎯</div>
          <div className="font-semibold text-gray-900">Promotions</div>
          <div className="text-sm text-gray-600 mt-1">Boost sales</div>
        </Link>
      </div>

      {/* Additional Quick Action for Reports */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/vendor/reports/sales"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-4xl mb-3">📊</div>
          <div className="font-semibold text-gray-900">View Reports</div>
          <div className="text-sm text-gray-600 mt-1">Analytics</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
              <Link to="/vendor/orders" className="text-sm text-orange-600 hover:text-orange-700">
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📦</div>
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Order #{order._id.slice(-8)}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatPrice(order.totalAmount)}</div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Tips */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Performance Tips</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600">💡</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Complete your shop profile</div>
                <div className="text-sm text-gray-600">Add shop description and banner to attract more customers</div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">📸</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Use high-quality images</div>
                <div className="text-sm text-gray-600">Products with clear images get 3x more views</div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600">⚡</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Respond quickly to orders</div>
                <div className="text-sm text-gray-600">Fast response time improves your shop rating</div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600">🎯</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Run promotions</div>
                <div className="text-sm text-gray-600">Discounts and vouchers can boost your sales by 50%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Sales Overview (Last 7 Days)</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {stats?.salesChart?.data?.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-orange-500 rounded-t hover:bg-orange-600 transition"
                style={{ height: `${(value / Math.max(...stats.salesChart.data, 1)) * 100}%` }}
              ></div>
              <div className="text-xs text-gray-600 mt-2">{stats.salesChart.labels[index]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorHome;
