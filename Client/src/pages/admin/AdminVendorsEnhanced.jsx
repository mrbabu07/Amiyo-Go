import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';

const AdminVendorsEnhanced = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [actionData, setActionData] = useState({ reason: '', note: '' });

  useEffect(() => {
    if (user) {
      fetchVendors();
      fetchStats();
    }
  }, [filter, user]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const url = filter === 'all'
        ? `${import.meta.env.VITE_API_URL}/vendors`
        : `${import.meta.env.VITE_API_URL}/vendors?status=${filter}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setVendors(data.vendors || []);
      }
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setStats(data.stats);
    } catch (error) {
      // Stats are optional
    }
  };

  const handleQuickAction = async (vendorId, action) => {
    try {
      const token = await user.getIdToken();
      const endpoint = `${import.meta.env.VITE_API_URL}/vendors/${vendorId}/${action}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(actionData),
      });
      
      if (response.ok) {
        toast.success(`Vendor ${action}d successfully`);
        fetchVendors();
        fetchStats();
        setActionModal(null);
        setActionData({ reason: '', note: '' });
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} vendor`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} vendor`);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedVendors.length === 0) {
      toast.error('Please select vendors first');
      return;
    }

    try {
      const token = await user.getIdToken();
      const promises = selectedVendors.map(vendorId =>
        fetch(`${import.meta.env.VITE_API_URL}/vendors/${vendorId}/${action}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(actionData),
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedVendors.length} vendors ${action}d`);
      setSelectedVendors([]);
      setShowBulkActions(false);
      fetchVendors();
      fetchStats();
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const toggleVendorSelection = (vendorId) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.phone?.includes(searchQuery)
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      approved: '✅',
      suspended: '🚫',
      rejected: '❌',
    };
    return icons[status] || '⏳';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Vendor Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and monitor all marketplace vendors
            </p>
          </div>
          <Link
            to="/admin/chats"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Vendor Messages
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Vendors</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.total || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {stats.approved || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    {stats.pending || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {stats.suspended || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search vendors by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'suspended'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                  filter === status
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedVendors.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                {selectedVendors.length} vendor(s) selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkActions(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                >
                  Bulk Actions
                </button>
                <button
                  onClick={() => setSelectedVendors([])}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vendors Grid/List */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No vendors found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search' : 'No vendors match the selected filter'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor._id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition group"
            >
              {/* Card Header */}
              <div className="relative h-32 bg-gradient-to-br from-orange-500 to-orange-600">
                <div className="absolute top-4 right-4 flex gap-2">
                  <input
                    type="checkbox"
                    checked={selectedVendors.includes(vendor._id)}
                    onChange={() => toggleVendorSelection(vendor._id)}
                    className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(vendor.status)}`}>
                    {getStatusIcon(vendor.status)} {vendor.status}
                  </span>
                </div>
                <div className="absolute -bottom-12 left-6">
                  <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-xl border-4 border-white dark:border-gray-800 flex items-center justify-center text-3xl font-bold text-orange-600 shadow-lg">
                    {vendor.shopName?.charAt(0).toUpperCase() || 'V'}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="pt-16 px-6 pb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {vendor.shopName || 'Unnamed Shop'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {vendor.email}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{vendor.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">
                      Joined {new Date(vendor.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/admin/vendors/${vendor._id}`}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-center text-sm font-medium"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/admin/chat/${vendor._id}`}
                    className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition"
                    title="Chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </Link>
                </div>

                {/* Status Actions */}
                {vendor.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleQuickAction(vendor._id, 'approve')}
                      className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition text-sm font-medium"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        setActionModal({ vendorId: vendor._id, action: 'suspend' });
                      }}
                      className="flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition text-sm font-medium"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
                {vendor.status === 'suspended' && (
                  <button
                    onClick={() => handleQuickAction(vendor._id, 'reactivate')}
                    className="mt-3 w-full px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition text-sm font-medium"
                  >
                    ↻ Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVendors(filteredVendors.map(v => v._id));
                      } else {
                        setSelectedVendors([]);
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor._id)}
                      onChange={() => toggleVendorSelection(vendor._id)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                        {vendor.shopName?.charAt(0).toUpperCase() || 'V'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {vendor.shopName || 'Unnamed Shop'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {vendor.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {vendor.phone || 'No phone'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(vendor.status)}`}>
                      {getStatusIcon(vendor.status)} {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/vendors/${vendor._id}`}
                        className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition text-sm font-medium"
                      >
                        View
                      </Link>
                      <Link
                        to={`/admin/chat/${vendor._id}`}
                        className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition text-sm font-medium"
                      >
                        Chat
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {actionModal.action === 'suspend' ? 'Suspend Vendor' : 'Confirm Action'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for this action:
            </p>
            <textarea
              value={actionData.reason}
              onChange={(e) => setActionData({ ...actionData, reason: e.target.value })}
              placeholder="Enter reason..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-4"
              rows="4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleQuickAction(actionModal.vendorId, actionModal.action);
                  setActionModal(null);
                }}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionData({ reason: '', note: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Bulk Actions
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Select an action to apply to {selectedVendors.length} vendor(s):
            </p>
            <div className="space-y-3 mb-4">
              <button
                onClick={() => {
                  handleBulkAction('approve');
                  setShowBulkActions(false);
                }}
                className="w-full px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition font-medium text-left"
              >
                ✓ Approve All Selected
              </button>
              <button
                onClick={() => {
                  handleBulkAction('suspend');
                  setShowBulkActions(false);
                }}
                className="w-full px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition font-medium text-left"
              >
                🚫 Suspend All Selected
              </button>
              <button
                onClick={() => {
                  handleBulkAction('reactivate');
                  setShowBulkActions(false);
                }}
                className="w-full px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition font-medium text-left"
              >
                ↻ Reactivate All Selected
              </button>
            </div>
            <button
              onClick={() => setShowBulkActions(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorsEnhanced;
