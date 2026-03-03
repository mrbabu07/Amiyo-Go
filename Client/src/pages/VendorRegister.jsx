import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getCategories } from '../services/api';

const VendorRegister = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Address data
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [unions, setUnions] = useState([]);

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
    allowedCategoryIds: [],
  });

  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredUpazilas, setFilteredUpazilas] = useState([]);
  const [filteredUnions, setFilteredUnions] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchAddressData();
  }, []);

  const fetchAddressData = async () => {
    try {
      const [divisionsRes, districtsRes, upazilasRes, unionsRes] = await Promise.all([
        fetch('/divisions.json'),
        fetch('/districts.json'),
        fetch('/upazilas.json'),
        fetch('/unions.json'),
      ]);

      const [divisionsData, districtsData, upazilasData, unionsData] = await Promise.all([
        divisionsRes.json(),
        districtsRes.json(),
        upazilasRes.json(),
        unionsRes.json(),
      ]);

      // Extract data from PHPMyAdmin export format
      const extractData = (jsonArray) => {
        const dataObj = jsonArray.find(item => item.type === 'table');
        return dataObj ? dataObj.data : [];
      };

      setDivisions(extractData(divisionsData));
      setDistricts(extractData(districtsData));
      setUpazilas(extractData(upazilasData));
      setUnions(extractData(unionsData));
    } catch (error) {
      console.error('Error fetching address data:', error);
      setError('Failed to load address data');
    }
  };

  const fetchCategories = async () => {
    try {
      // Use shared API client so base URL is always correct
      const response = await getCategories();
      const allCategories = response.data?.data || [];
      // Only show active categories for vendor selection
      const activeCategories = allCategories.filter((cat) => cat.isActive !== false);
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleDivisionChange = (e) => {
    const divisionId = e.target.value;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        divisionId,
        districtId: '',
        upazilaId: '',
        unionId: '',
      },
    });
    setFilteredDistricts(districts.filter(d => d.division_id === divisionId));
    setFilteredUpazilas([]);
    setFilteredUnions([]);
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        districtId,
        upazilaId: '',
        unionId: '',
      },
    });
    setFilteredUpazilas(upazilas.filter(u => u.district_id === districtId));
    setFilteredUnions([]);
  };

  const handleUpazilaChange = (e) => {
    const upazilaId = e.target.value;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        upazilaId,
        unionId: '',
      },
    });
    setFilteredUnions(unions.filter(u => u.upazilla_id === upazilaId));
  };

  const handleCategoryToggle = (categoryId) => {
    const currentIds = formData.allowedCategoryIds;
    if (currentIds.includes(categoryId)) {
      setFormData({
        ...formData,
        allowedCategoryIds: currentIds.filter(id => id !== categoryId),
      });
    } else {
      setFormData({
        ...formData,
        allowedCategoryIds: [...currentIds, categoryId],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.allowedCategoryIds.length === 0) {
      setError('Please select at least one category');
      return;
    }

    if (!formData.address.divisionId || !formData.address.districtId || !formData.address.upazilaId) {
      setError('Please complete the address information');
      return;
    }

    setLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Vendor registration submitted successfully! Pending admin approval.');
        setTimeout(() => {
          navigate('/vendor/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error registering vendor:', error);
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Become a Vendor</h1>
          
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your shop name"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="01XXXXXXXXX"
              />
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Shop Address</h3>
              
              {/* Division */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Division *
                </label>
                <select
                  required
                  value={formData.address.divisionId}
                  onChange={handleDivisionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Division</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                <select
                  required
                  value={formData.address.districtId}
                  onChange={handleDistrictChange}
                  disabled={!formData.address.divisionId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select District</option>
                  {filteredDistricts.map(dist => (
                    <option key={dist.id} value={dist.id}>{dist.name}</option>
                  ))}
                </select>
              </div>

              {/* Upazila */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upazila *
                </label>
                <select
                  required
                  value={formData.address.upazilaId}
                  onChange={handleUpazilaChange}
                  disabled={!formData.address.districtId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select Upazila</option>
                  {filteredUpazilas.map(upz => (
                    <option key={upz.id} value={upz.id}>{upz.name}</option>
                  ))}
                </select>
              </div>

              {/* Union */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Union (Optional)
                </label>
                <select
                  value={formData.address.unionId}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, unionId: e.target.value }
                  })}
                  disabled={!formData.address.upazilaId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select Union</option>
                  {filteredUnions.map(union => (
                    <option key={union.id} value={union.id}>{union.name}</option>
                  ))}
                </select>
              </div>

              {/* Address Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Address
                </label>
                <textarea
                  value={formData.address.details}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, details: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="House/Building number, Road, Area"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Select Categories You Will Sell In *
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {categories.map(category => (
                  <label key={category._id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedCategoryIds.includes(category._id)}
                      onChange={() => handleCategoryToggle(category._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Selected: {formData.allowedCategoryIds.length} categories
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Register as Vendor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
