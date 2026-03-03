import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const VendorDashboardSimple = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiTests, setApiTests] = useState({});

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const tests = {};
    
    try {
      const token = await user.getIdToken();
      console.log('🔑 Token obtained:', token ? 'Yes' : 'No');
      
      // Add cache busting
      const cacheBuster = `?_=${Date.now()}`;
      
      // Test 1: Fetch vendor profile
      console.log('📡 Testing: GET /api/vendors/me');
      const vendorRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me${cacheBuster}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });
      
      tests.vendorProfile = {
        status: vendorRes.status,
        ok: vendorRes.ok,
      };
      
      console.log('📊 Vendor API Response:', vendorRes.status, vendorRes.ok);
      
      const vendorData = await vendorRes.json();
      console.log('📦 Vendor Data:', vendorData);
      
      if (vendorRes.ok && vendorData.vendor) {
        setVendor(vendorData.vendor);
        tests.vendorProfile.data = 'Loaded';
        
        if (vendorData.vendor.status === 'approved') {
          // Test 2: Fetch dashboard stats
          console.log('📡 Testing: GET /api/vendors/dashboard/stats');
          const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          tests.dashboardStats = {
            status: statsRes.status,
            ok: statsRes.ok,
          };
          
          console.log('📊 Stats API Response:', statsRes.status, statsRes.ok);
          
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            console.log('📦 Stats Data:', statsData);
            setStats(statsData.stats);
            tests.dashboardStats.data = 'Loaded';
          } else {
            const errorData = await statsRes.json();
            console.error('❌ Stats Error:', errorData);
            tests.dashboardStats.error = errorData.error || 'Unknown error';
          }
        }
      } else {
        const errorMsg = vendorData.error || 'Vendor not found';
        console.error('❌ Vendor Error:', errorMsg);
        setError(errorMsg);
        tests.vendorProfile.error = errorMsg;
      }
      
      setApiTests(tests);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-800 mb-4">⚠️ Error Loading Dashboard</h2>
          <p className="text-red-700 mb-6">{error}</p>
          
          <div className="bg-white rounded-lg p-4 mb-6">
            <h3 className="font-bold mb-2">API Test Results:</h3>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(apiTests, null, 2)}
            </pre>
          </div>
          
          <div className="space-y-2 text-sm">
            <p className="font-bold">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>Check if backend server is running on port 5000</li>
              <li>Check if you're logged in as a vendor</li>
              <li>Check browser console for detailed errors</li>
              <li>Try restarting backend server</li>
            </ul>
          </div>
          
          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
            <Link 
              to="/vendor/register" 
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Register as Vendor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Vendor Account</h2>
          <p className="text-gray-600 mb-6">You need to register as a vendor first</p>
          <Link to="/vendor/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
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
          <p className="text-gray-600 mb-4">
            {vendor.status === 'pending' 
              ? 'Your vendor registration is under review. An admin will approve it soon.'
              : 'Your account has been suspended. Please contact support.'}
          </p>
          <div className="bg-white rounded-lg p-4 mt-6">
            <p className="text-sm text-gray-600">Vendor Status: <span className="font-bold">{vendor.status}</span></p>
            <p className="text-sm text-gray-600">Shop Name: <span className="font-bold">{vendor.shopName}</span></p>
          </div>
        </div>
      </div>
    );
  }

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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-green-800 mb-2">✅ Dashboard Loaded Successfully!</h2>
          <p className="text-green-700">Your vendor account is active and approved.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">৳{stats?.totalRevenue || 0}</p>
            <p className="text-xs text-green-600 mt-1">+{stats?.revenueGrowth || 0}% from last month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
            <p className="text-xs text-blue-600 mt-1">{stats?.pendingOrders || 0} pending</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Products</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
            <p className="text-xs text-yellow-600 mt-1">{stats?.lowStockProducts || 0} low stock</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Avg. Rating</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.avgRating || 0}</p>
            <p className="text-xs text-gray-600 mt-1">{stats?.totalReviews || 0} reviews</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link to="/vendor/products/add" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <h4 className="font-bold text-gray-900 mb-2">📦 Add Product</h4>
            <p className="text-sm text-gray-600">List a new product for sale</p>
          </Link>

          <Link to="/vendor/products" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <h4 className="font-bold text-gray-900 mb-2">📋 Manage Products</h4>
            <p className="text-sm text-gray-600">View and edit your products</p>
          </Link>

          <Link to="/vendor/orders" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <h4 className="font-bold text-gray-900 mb-2">🛍️ View Orders</h4>
            <p className="text-sm text-gray-600">Process customer orders</p>
          </Link>

          <Link to="/vendor/settings" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <h4 className="font-bold text-gray-900 mb-2">⚙️ Settings</h4>
            <p className="text-sm text-gray-600">Update shop information</p>
          </Link>
        </div>

        {/* API Test Results */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">🔧 API Connection Status</h3>
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(apiTests, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardSimple;
