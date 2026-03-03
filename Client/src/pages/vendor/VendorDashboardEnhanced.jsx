import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const VendorDashboardEnhanced = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = await user.getIdToken();
      
      // Add cache busting timestamp
      const cacheBuster = `?_=${Date.now()}`;
      
      // Fetch vendor profile
      const vendorRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me${cacheBuster}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      const vendorData = await vendorRes.json();
      
      if (vendorRes.ok && vendorData.vendor.status === 'approved') {
        setVendor(vendorData.vendor);
        
        // Fetch dashboard stats
        const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/dashboard/stats${cacheBuster}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
        });
        const statsData = await statsRes.json();
        if (statsRes.ok) setStats(statsData.stats);
        
        // Fetch recent orders
        const ordersRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/orders?limit=5${cacheBuster}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
        });
        const ordersData = await ordersRes.json();
        if (ordersRes.ok) setRecentOrders(ordersData.orders || []);
        
        // Fetch top products
        const productsRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/products/top?limit=5${cacheBuster}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
        });
        const productsData = await productsRes.json();
        if (productsRes.ok) setTopProducts(productsData.products || []);
      } else {
        setVendor(vendorData.vendor);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Vendor Account</h2>
          <Link to="/vendor/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Register as Vendor
          </Link>
        </div>
      </div>
    );
  }

  if (vendor.status !== 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">
            {vendor.status === 'pending' ? 'Pending Approval' : 'Account Suspended'}
          </h2>
          <p className="text-gray-600">
            {vendor.status === 'pending' 
              ? 'Your vendor registration is under review.'
              : 'Your account has been suspended. Contact support.'}
          </p>
        </div>
      </div>
    );
  }

  const salesData = {
    labels: stats?.salesChart?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Sales',
      data: stats?.salesChart?.data || [0, 0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    }],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{vendor.shopName}</h1>
              <p className="text-gray-600">Seller Dashboard</p>
            </div>
            <div className="flex gap-3">
              <Link to="/vendor/products/add" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Add Product
              </Link>
              <Link to="/vendor/orders" className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
                Orders
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">৳{stats?.totalRevenue || 0}</p>
                <p className="text-xs text-green-600 mt-1">+{stats?.revenueGrowth || 0}% from last month</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
                <p className="text-xs text-blue-600 mt-1">{stats?.pendingOrders || 0} pending</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
                <p className="text-xs text-yellow-600 mt-1">{stats?.lowStockProducts || 0} low stock</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.avgRating || 0}</p>
                <p className="text-xs text-gray-600 mt-1">{stats?.totalReviews || 0} reviews</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Sales Overview</h3>
            <Line data={salesData} options={{ responsive: true, maintainAspectRatio: true }} />
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Top Selling Products</h3>
            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map((product, index) => (
                <div key={product._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.title} className="w-12 h-12 object-cover rounded" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{product.title}</p>
                      <p className="text-sm text-gray-600">{product.soldCount || 0} sold</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">৳{product.price}</p>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No sales data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Recent Orders</h3>
            <Link to="/vendor/orders" className="text-blue-600 hover:underline text-sm">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.length > 0 ? recentOrders.map(order => (
                  <tr key={order._id}>
                    <td className="px-4 py-4 text-sm font-medium text-blue-600">#{order.orderNumber}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{order.customerName}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{order.itemCount} items</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">৳{order.total}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link to="/vendor/products" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Manage Products</h4>
                <p className="text-sm text-gray-600">Add, edit, or remove products</p>
              </div>
            </div>
          </Link>

          <Link to="/vendor/orders" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Process Orders</h4>
                <p className="text-sm text-gray-600">View and manage orders</p>
              </div>
            </div>
          </Link>

          <Link to="/vendor/analytics" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">View Analytics</h4>
                <p className="text-sm text-gray-600">Sales reports and insights</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardEnhanced;
