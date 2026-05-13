import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import useCurrency from '../../hooks/useCurrency';

const VendorActivityDashboard = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const [vendors, setVendors] = useState([]);
  const [activities, setActivities] = useState([]);
  const [recentVendorOrders, setRecentVendorOrders] = useState([]);
  const [productFilter, setProductFilter] = useState('pending');
  const [moderationProducts, setModerationProducts] = useState([]);
  const [loadingModerationProducts, setLoadingModerationProducts] = useState(false);
  const [moderatingProductId, setModeratingProductId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeVendors: 0,
    avgOrderValue: 0,
    topPerformers: [],
    recentActivities: [],
    vendorGrowth: 0,
    orderGrowth: 0,
    pendingProductApprovals: 0,
  });

  useEffect(() => {
    if (user) {
      fetchVendorMetrics();
      fetchRecentActivities();
      const interval = setInterval(() => {
        fetchRecentActivities();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, timeframe]);

  useEffect(() => {
    if (!user) return undefined;

    fetchModerationProducts(productFilter);
    const interval = setInterval(() => {
      fetchModerationProducts(productFilter);
    }, 30000);

    return () => clearInterval(interval);
  }, [user, productFilter]);

  const fetchVendorMetrics = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      
      // Fetch vendors
      const vendorsRes = await fetch(`${import.meta.env.VITE_API_URL}/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const vendorsData = await vendorsRes.json();
      const allVendors = vendorsData.vendors || [];
      
      // Fetch orders for each vendor
      const vendorMetrics = await Promise.all(
        allVendors.map(async (vendor) => {
          try {
            const ordersRes = await fetch(
              `${import.meta.env.VITE_API_URL}/vendors/orders?vendorId=${vendor._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const ordersData = await ordersRes.json();
            const orders = ordersData.vendorOrders || ordersData.orders || [];
            
            const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
            const recentOrders = orders.filter(order => {
              const orderDate = new Date(order.createdAt);
              const daysAgo = parseInt(timeframe.replace('d', ''));
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - daysAgo);
              return orderDate >= cutoff;
            });
            
            return {
              ...vendor,
              totalOrders: orders.length,
              recentOrders: recentOrders.length,
              revenue,
              avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
              lastActivity: orders.length > 0 ? new Date(orders[0].createdAt) : new Date(vendor.createdAt),
            };
          } catch {
            return {
              ...vendor,
              totalOrders: 0,
              recentOrders: 0,
              revenue: 0,
              avgOrderValue: 0,
              lastActivity: new Date(vendor.createdAt),
            };
          }
        })
      );

      setVendors(vendorMetrics);
      
      // Calculate metrics
      const totalRevenue = vendorMetrics.reduce((sum, v) => sum + v.revenue, 0);
      const totalOrders = vendorMetrics.reduce((sum, v) => sum + v.totalOrders, 0);
      const activeVendors = vendorMetrics.filter(v => v.status === 'approved').length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const topPerformers = vendorMetrics
        .filter(v => v.status === 'approved')
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setMetrics((prev) => ({
        ...prev,
        totalRevenue,
        totalOrders,
        activeVendors,
        avgOrderValue,
        topPerformers,
        vendorGrowth: 12.5, // Calculate from historical data
        orderGrowth: 8.3,   // Calculate from historical data
      }));
    } catch (error) {
      toast.error('Failed to load vendor metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovalsCount = async (token) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/products/pending?page=1&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    setMetrics((prev) => ({
      ...prev,
      pendingProductApprovals: data.total ?? 0,
    }));
  };

  const fetchModerationProducts = async (filter = productFilter, existingToken = null) => {
    try {
      setLoadingModerationProducts(true);
      const token = existingToken || await user.getIdToken();
      const statusQuery = filter === 'all' ? '' : `approvalStatus=${filter}&`;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/products?${statusQuery}page=1&limit=8`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      const products = Array.isArray(data.data) ? data.data : [];
      setModerationProducts(products);

      if (filter === 'pending') {
        setMetrics((prev) => ({
          ...prev,
          pendingProductApprovals: data.total ?? products.length,
        }));
      } else {
        await fetchPendingApprovalsCount(token);
      }
    } catch (error) {
      console.error('Failed to fetch moderation products:', error);
    } finally {
      setLoadingModerationProducts(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = await user.getIdToken();
      const [ordersRes, vendorsRes, productsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/products?page=1&limit=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const ordersData = await ordersRes.json();
      const vendorsData = await vendorsRes.json();
      const productsData = await productsRes.json();
      const vendorMap = new Map((vendorsData.vendors || []).map((vendor) => [vendor._id?.toString(), vendor]));
      const recentOrders = (ordersData.data || []).slice(0, 20);
      const recentProducts = Array.isArray(productsData.data) ? productsData.data : [];

      const vendorOrders = recentOrders.flatMap((order) => {
        const grouped = new Map();
        (order.products || []).forEach((product) => {
          const vendorId = product.vendorId?.toString?.() || product.vendorId || 'platform';
          if (!grouped.has(vendorId)) {
            grouped.set(vendorId, {
              orderId: order._id,
              vendorId,
              vendorName:
                product.shopName ||
                product.vendorName ||
                vendorMap.get(vendorId)?.shopName ||
                'HnilaBazar',
              customerName: order.shippingInfo?.name || 'Customer',
              status: product.itemStatus || order.status || 'pending',
              overallStatus: order.status || 'pending',
              items: 0,
              amount: 0,
              time: new Date(order.createdAt),
            });
          }
          const entry = grouped.get(vendorId);
          entry.items += product.quantity || 1;
          entry.amount += (product.price || 0) * (product.quantity || 1);
        });
        return [...grouped.values()];
      }).sort((a, b) => b.time - a.time).slice(0, 12);

      setRecentVendorOrders(vendorOrders);

      const orderActivities = vendorOrders.slice(0, 8).map(order => ({
        type: 'order',
        vendor: order.vendorId,
        description: `${order.vendorName}: order #${order.orderId.slice(-6)} is ${order.status}`,
        amount: order.amount,
        time: order.time,
        link: `/admin/vendors/${order.vendorId}`,
      }));

      const productActivities = recentProducts.map((product) => {
        const status = product.approvalStatus || 'pending';
        const statusMessages = {
          pending: 'submitted',
          approved: 'approved',
          rejected: 'rejected',
        };

        return {
          type: 'product',
          vendor: product.vendorId?.toString?.() || product.vendorId || null,
          description: `${product.vendorShopName || 'Vendor'} ${statusMessages[status] || 'updated'} "${product.title}"`,
          amount: product.price || 0,
          time: new Date(
            product.lastModeratedAt ||
              product.approvedAt ||
              product.lastSubmittedAt ||
              product.createdAt ||
              Date.now()
          ),
          link: `/admin/products/edit/${product._id}?returnTo=${encodeURIComponent('/admin/vendor-activity')}`,
        };
      });

      setActivities(
        [...productActivities, ...orderActivities]
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 10)
      );
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      setModeratingProductId(productId);
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/products/${productId}/approve`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve product');
      }
      await Promise.all([
        fetchModerationProducts(productFilter, token),
        fetchPendingApprovalsCount(token),
        fetchRecentActivities(),
      ]);
      toast.success('Product approved');
    } catch (error) {
      toast.error(error.message || 'Failed to approve product');
    } finally {
      setModeratingProductId(null);
    }
  };

  const handleRejectProduct = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }

    try {
      setModeratingProductId(rejectModal);
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/products/${rejectModal}/reject`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject product');
      }
      await Promise.all([
        fetchModerationProducts(productFilter, token),
        fetchPendingApprovalsCount(token),
        fetchRecentActivities(),
      ]);
      setRejectModal(null);
      setRejectReason('');
      toast.success('Product rejected');
    } catch (error) {
      toast.error(error.message || 'Failed to reject product');
    } finally {
      setModeratingProductId(null);
    }
  };

  const openRejectModal = (productId) => {
    setRejectModal(productId);
    setRejectReason('');
  };

  const handleDisableProduct = async (productId) => {
    try {
      setModeratingProductId(productId);
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/products/${productId}/disable`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to disable product');
      }
      await Promise.all([
        fetchModerationProducts(productFilter, token),
        fetchRecentActivities(),
      ]);
      toast.success('Product disabled');
    } catch (error) {
      toast.error(error.message || 'Failed to disable product');
    } finally {
      setModeratingProductId(null);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      packed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return classes[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getApprovalClass = (status) => {
    const classes = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return classes[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const moderationFilters = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All Products' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Vendor Activity Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time vendor performance and activity monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button
              onClick={fetchVendorMetrics}
              className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                +{metrics.orderGrowth}%
              </span>
            </div>
            <p className="text-white/80 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">{formatPrice(metrics.totalRevenue)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                +{metrics.orderGrowth}%
              </span>
            </div>
            <p className="text-white/80 text-sm mb-1">Total Orders</p>
            <p className="text-3xl font-bold">{metrics.totalOrders.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                +{metrics.vendorGrowth}%
              </span>
            </div>
            <p className="text-white/80 text-sm mb-1">Active Vendors</p>
            <p className="text-3xl font-bold">{metrics.activeVendors}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">Avg Order Value</p>
            <p className="text-3xl font-bold">{formatPrice(metrics.avgOrderValue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Performers & Vendor List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Product Moderation Board
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Review vendor products by approval status and manage them without leaving this page
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  {metrics.pendingProductApprovals || 0} pending
                </div>
                <Link
                  to="/admin/products"
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Full moderation →
                </Link>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {moderationFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setProductFilter(filter.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    productFilter === filter.value
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {loadingModerationProducts ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                Loading moderation products...
              </div>
            ) : moderationProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-green-200 bg-green-50 px-6 py-10 text-center dark:border-green-900/40 dark:bg-green-900/10">
                <p className="text-base font-semibold text-green-800 dark:text-green-300">
                  No {productFilter === 'all' ? '' : `${productFilter} `}products found
                </p>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  {productFilter === 'pending'
                    ? 'The queue is clear for now.'
                    : 'Try another filter or check the full moderation page.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {moderationProducts.map((product) => (
                  <div
                    key={product._id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex gap-4 min-w-0">
                        <div className="h-20 w-20 overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {product.title}
                            </h3>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getApprovalClass(product.approvalStatus || 'pending')}`}>
                              {product.approvalStatus || 'pending'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {product.vendorShopName || 'Unknown vendor'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>Price: {formatPrice(product.price || 0)}</span>
                            <span>Stock: {product.stock ?? 0}</span>
                            <span>
                              {product.approvalStatus === 'approved'
                                ? `Approved: ${getTimeAgo(new Date(product.approvedAt || product.lastModeratedAt || product.createdAt || Date.now()))}`
                                : product.approvalStatus === 'rejected'
                                ? `Rejected: ${getTimeAgo(new Date(product.lastModeratedAt || product.createdAt || Date.now()))}`
                                : `Submitted: ${getTimeAgo(new Date(product.lastSubmittedAt || product.createdAt || Date.now()))}`}
                            </span>
                          </div>
                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                              {product.description}
                            </p>
                          )}
                          {product.rejectionReason && (
                            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              Rejection reason: {product.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <Link
                          to={`/admin/products/edit/${product._id}?returnTo=${encodeURIComponent('/admin/vendor-activity')}`}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Review
                        </Link>
                        {product.approvalStatus !== 'rejected' && (
                          <button
                            onClick={() => openRejectModal(product._id)}
                            disabled={moderatingProductId === product._id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:hover:bg-red-900/20"
                          >
                            Reject
                          </button>
                        )}
                        {product.approvalStatus !== 'approved' && (
                          <button
                            onClick={() => handleApproveProduct(product._id)}
                            disabled={moderatingProductId === product._id}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {moderatingProductId === product._id ? 'Saving...' : 'Approve'}
                          </button>
                        )}
                        {product.approvalStatus === 'approved' && product.isActive !== false && (
                          <button
                            onClick={() => handleDisableProduct(product._id)}
                            disabled={moderatingProductId === product._id}
                            className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/20"
                          >
                            {moderatingProductId === product._id ? 'Saving...' : 'Disable'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Vendor Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recent Vendor Orders
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Latest order activity grouped by vendor
                </p>
              </div>
              <Link
                to="/admin/orders"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Manage Orders →
              </Link>
            </div>
            {recentVendorOrders.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No recent vendor orders
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Order</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Vendor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Items</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVendorOrders.map((order) => (
                      <tr key={`${order.orderId}-${order.vendorId}`} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                          #{order.orderId.slice(-8)}
                          <div className="mt-1 font-sans text-xs text-gray-400">{getTimeAgo(order.time)}</div>
                        </td>
                        <td className="py-3 px-4">
                          {order.vendorId === 'platform' ? (
                            <span className="font-medium text-gray-900 dark:text-white">{order.vendorName}</span>
                          ) : (
                            <Link to={`/admin/vendors/${order.vendorId}`} className="font-medium text-gray-900 dark:text-white hover:text-orange-600">
                              {order.vendorName}
                            </Link>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{order.customerName}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-white">{order.items}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-white">{formatPrice(order.amount)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getStatusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={order.vendorId === 'platform' ? '/admin/orders' : `/admin/vendors/${order.vendorId}`}
                            className="text-sm font-medium text-orange-600 hover:text-orange-700"
                          >
                            Check →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Performing Vendors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                🏆 Top Performing Vendors
              </h2>
              <Link
                to="/admin/vendors"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {metrics.topPerformers.map((vendor, index) => (
                <div
                  key={vendor._id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/admin/vendors/${vendor._id}`}
                      className="font-semibold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      {vendor.shopName || 'Unnamed Shop'}
                    </Link>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span>{vendor.totalOrders} orders</span>
                      <span>•</span>
                      <span>{vendor.recentOrders} recent</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatPrice(vendor.revenue)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatPrice(vendor.avgOrderValue)}/order
                    </p>
                  </div>
                  <Link
                    to={`/admin/vendors/${vendor._id}`}
                    className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* All Vendors Activity List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                📊 All Vendors Performance
              </h2>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Vendor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Orders
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Last Activity
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.slice(0, 10).map((vendor) => (
                    <tr
                      key={vendor._id}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/vendors/${vendor._id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400"
                        >
                          {vendor.shopName || 'Unnamed Shop'}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {vendor.email}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.status === 'approved'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : vendor.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {vendor.totalOrders}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {vendor.recentOrders} recent
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatPrice(vendor.revenue)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatPrice(vendor.avgOrderValue)}/order
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600 dark:text-gray-400">
                        {getTimeAgo(vendor.lastActivity)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/vendors/${vendor._id}`}
                          className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 text-sm font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="space-y-6">
          {/* Real-time Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ⚡ Live Activity Feed
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Live</span>
              </div>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p>No recent activities</p>
                </div>
              ) : (
                activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      {activity.type === 'order' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      )}
                      {activity.type === 'product' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                      {activity.type === 'payout' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.amount ? `${formatPrice(activity.amount)} • ` : ''}{getTimeAgo(activity.time)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              📈 Quick Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Vendor Approvals</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {vendors.filter(v => v.status === 'pending').length}
                  </p>
                </div>
                <Link
                  to="/admin/vendors"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Product Approvals</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {metrics.pendingProductApprovals || 0}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProductFilter('pending');
                    fetchModerationProducts('pending');
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Vendors</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {vendors.filter(v => v.status === 'approved').length}
                  </p>
                </div>
                <Link
                  to="/admin/vendors"
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {vendors.filter(v => v.status === 'suspended').length}
                  </p>
                </div>
                <Link
                  to="/admin/vendors"
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reject Product
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Add a short reason. The vendor will see this and can correct the product faster.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="Explain what needs to be fixed before approval"
            />
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectProduct}
                disabled={moderatingProductId === rejectModal}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {moderatingProductId === rejectModal ? 'Rejecting...' : 'Reject Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorActivityDashboard;
