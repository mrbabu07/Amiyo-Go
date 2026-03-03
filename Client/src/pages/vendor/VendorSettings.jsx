import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const VendorSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    shopName: '',
    phone: '',
    address: {
      divisionId: '',
      districtId: '',
      upazilaId: '',
      unionId: '',
      details: '',
    },
    payoutMethod: '',
  });

  useEffect(() => {
    if (user) {
      fetchVendorData();
    }
  }, [user]);

  const fetchVendorData = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setVendor(data.vendor);
        setFormData({
          shopName: data.vendor.shopName || '',
          phone: data.vendor.phone || '',
          address: data.vendor.address || {
            divisionId: '',
            districtId: '',
            upazilaId: '',
            unionId: '',
            details: '',
          },
          payoutMethod: data.vendor.payoutMethod || '',
        });
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => navigate('/vendor/dashboard'), 2000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Shop Settings</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Address Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Address
              </label>
              <textarea
                value={formData.address.details}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, details: e.target.value }
                })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your shop address"
              />
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Method
              </label>
              <select
                value={formData.payoutMethod}
                onChange={(e) => setFormData({ ...formData, payoutMethod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select payout method</option>
                <option value="bank">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
              </select>
            </div>

            {/* Vendor Info (Read-only) */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium text-gray-900 capitalize">{vendor.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Shop Slug</p>
                  <p className="font-medium text-gray-900">{vendor.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium text-gray-900">
                    {new Date(vendor.createdAt).toLocaleDateString('en-BD')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Allowed Categories</p>
                  <p className="font-medium text-gray-900">{vendor.allowedCategoryIds?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/vendor/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorSettings;
