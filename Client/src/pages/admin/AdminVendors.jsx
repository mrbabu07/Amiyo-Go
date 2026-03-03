import { useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log('User:', user?.email);
    console.log('Is Admin:', isAdmin);
    if (user && isAdmin) {
      fetchVendors();
      fetchStats();
      fetchCategories();
    }
  }, [filter, user, isAdmin]);

  const fetchCategories = async () => {
    try {
      // Use shared API client so we always hit the correct backend URL
      const response = await getCategories();
      const allCategories = response.data?.data || [];
      const activeCategories = allCategories.filter((cat) => cat.isActive !== false);
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const token = await user.getIdToken();
      const url = filter === 'all' 
        ? `${import.meta.env.VITE_API_URL}/vendors`
        : `${import.meta.env.VITE_API_URL}/vendors?status=${filter}`;
      
      console.log('Fetching vendors from:', url);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);
      console.log('Data structure:', {
        hasVendors: !!data.vendors,
        vendorsLength: data.vendors?.length,
        hasTotal: !!data.total,
        dataKeys: Object.keys(data)
      });
      
      if (response.ok) {
        setVendors(data.vendors || []);
        console.log('Vendors set:', data.vendors?.length || 0);
        console.log('First vendor:', data.vendors?.[0]);
      } else {
        console.error('API error:', data.error);
        setError(data.error || 'Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      console.error('Error details:', error.message, error.stack);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (vendorId) => {
    if (!confirm('Are you sure you want to approve this vendor?')) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/vendors/${vendorId}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert('Vendor approved successfully');
        fetchVendors();
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve vendor');
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      alert('Failed to approve vendor');
    }
  };

  const handleSuspend = async (vendorId) => {
    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/vendors/${vendorId}/suspend`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        alert('Vendor suspended successfully');
        fetchVendors();
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to suspend vendor');
      }
    } catch (error) {
      console.error('Error suspending vendor:', error);
      alert('Failed to suspend vendor');
    }
  };

  const handleEditCategories = (vendor) => {
    setEditingVendor(vendor);
    setSelectedCategories(vendor.allowedCategoryIds.map(id => id.toString()));
  };

  const handleCategoryToggle = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleSaveCategories = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/vendors/${editingVendor._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ allowedCategoryIds: selectedCategories }),
        }
      );

      if (response.ok) {
        alert('Categories updated successfully');
        setEditingVendor(null);
        setSelectedCategories([]);
        fetchVendors();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update categories');
      }
    } catch (error) {
      console.error('Error updating categories:', error);
      alert('Failed to update categories');
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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium">Total Vendors</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium">Approved</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium">Suspended</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.suspended}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'approved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('suspended')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'suspended'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Suspended
            </button>
          </div>
        </div>

        {/* Vendors List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {vendors.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No vendors found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Categories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
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
                      <td className="px-6 py-4 text-gray-600">
                        {vendor.allowedCategoryIds.length} categories
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            vendor.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : vendor.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(vendor.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
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
                                onClick={() => handleSuspend(vendor._id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleEditCategories(vendor)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2"
                              >
                                Edit Categories
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
                  onClick={() => {
                    setEditingVendor(null);
                    setSelectedCategories([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select the categories this vendor is allowed to sell in:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {categories.map(category => (
                  <label key={category._id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category._id)}
                      onChange={() => handleCategoryToggle(category._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                  </label>
                ))}
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selected: {selectedCategories.length} categories
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveCategories}
                  disabled={selectedCategories.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditingVendor(null);
                    setSelectedCategories([]);
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
