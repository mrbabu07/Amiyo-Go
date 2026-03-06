import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { getCategories } from '../../services/api';

const AdminVendors = () => {
  const { user, isAdmin } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [editingVendor, setEditingVendor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    if (user && isAdmin) {
      fetchVendors();
      fetchStats();
      fetchCategories();
    }
  }, [filter, user, isAdmin]);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      const allCategories = response.data?.data || [];
      setCategories(allCategories.filter((cat) => cat.isActive !== false));
    } catch {
      setCategories([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const token = await user.getIdToken();
      const url =
        filter === 'all'
          ? `${import.meta.env.VITE_API_URL}/vendors`
          : `${import.meta.env.VITE_API_URL}/vendors?status=${filter}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setVendors(data.vendors || []);
      } else {
        setError(data.error || 'Failed to fetch vendors');
      }
    } catch {
      setError('Failed to load vendors');
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
    } catch {
      // stats are optional
    }
  };

  const handleApprove = async (vendorId) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/${vendorId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Vendor approved');
        setVendors((prev) => prev.map((v) => v._id === vendorId ? { ...v, status: 'approved' } : v));
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to approve vendor');
      }
    } catch {
      toast.error('Failed to approve vendor');
    }
  };

  const openSuspendModal = (vendorId) => {
    setSuspendModal(vendorId);
    setSuspendReason('');
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) { toast.error('Please enter a reason'); return; }
    const vendorId = suspendModal;
    setSuspendModal(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/${vendorId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: suspendReason }),
      });
      if (response.ok) {
        toast.success('Vendor suspended');
        setVendors((prev) => prev.map((v) => v._id === vendorId ? { ...v, status: 'suspended' } : v));
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to suspend vendor');
      }
    } catch {
      toast.error('Failed to suspend vendor');
    }
  };

  const handleEditCategories = (vendor) => {
    setEditingVendor(vendor);
    setSelectedCategories(vendor.allowedCategoryIds.map((id) => id.toString()));
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleSaveCategories = async () => {
    if (selectedCategories.length === 0) { toast.error('Select at least one category'); return; }
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/${editingVendor._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allowedCategoryIds: selectedCategories }),
      });
      if (response.ok) {
        toast.success('Categories updated');
        setEditingVendor(null);
        setSelectedCategories([]);
        fetchVendors();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update categories');
      }
    } catch {
      toast.error('Failed to update categories');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Vendor Management</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[
              { label: 'Total Vendors', val: stats.total, color: 'text-gray-900' },
              { label: 'Pending', val: stats.pending, color: 'text-yellow-600' },
              { label: 'Approved', val: stats.approved, color: 'text-green-600' },
              { label: 'Suspended', val: stats.suspended, color: 'text-red-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-gray-600 text-sm font-medium">{label}</h3>
                <p className={`text-3xl font-bold mt-2 ${color}`}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'suspended'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {vendors.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No vendors found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Shop Name', 'Phone', 'Categories', 'Status', 'Registered', 'Actions'].map((col) => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vendors.map((vendor) => (
                    <tr key={vendor._id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{vendor.shopName}</div>
                        <div className="text-sm text-gray-500">{vendor.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{vendor.phone}</td>
                      <td className="px-6 py-4 text-gray-600">{vendor.allowedCategoryIds?.length ?? 0} categories</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          vendor.status === 'approved' ? 'bg-green-100 text-green-800' :
                          vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(vendor.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 flex-wrap items-center">
                          <Link
                            to={`/admin/vendors/${vendor._id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </Link>
                          {vendor.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(vendor._id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Approve
                            </button>
                          )}
                          {vendor.status === 'approved' && (
                            <>
                              <button
                                onClick={() => openSuspendModal(vendor._id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleEditCategories(vendor)}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                Categories
                              </button>
                            </>
                          )}
                          {vendor.status === 'suspended' && (
                            <button
                              onClick={() => handleApprove(vendor._id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Suspend Vendor</h2>
            <p className="text-sm text-gray-600 mb-3">Please provide a reason:</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder="e.g. Policy violation..."
            />
            <div className="flex gap-3">
              <button onClick={handleSuspend} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700">
                Suspend
              </button>
              <button onClick={() => setSuspendModal(null)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Categories Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Categories for {editingVendor.shopName}
                </h2>
                <button
                  onClick={() => { setEditingVendor(null); setSelectedCategories([]); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select categories this vendor is allowed to sell in:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {categories.map((category) => (
                  <label key={category._id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category._id)}
                      onChange={() => handleCategoryToggle(category._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                  </label>
                ))}
              </div>
              <div className="text-sm text-gray-600 mb-4">Selected: {selectedCategories.length}</div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveCategories}
                  disabled={selectedCategories.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => { setEditingVendor(null); setSelectedCategories([]); }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendors;
