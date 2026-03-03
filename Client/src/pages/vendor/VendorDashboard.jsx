import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const VendorDashboard = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      const token = await user.getIdToken();
      
      // Fetch vendor profile
      const vendorResponse = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const vendorData = await vendorResponse.json();
      
      if (vendorResponse.ok) {
        setVendor(vendorData.vendor);
        
        // Only fetch products if vendor is approved
        if (vendorData.vendor.status === 'approved') {
          const productsResponse = await fetch(`${import.meta.env.VITE_API_URL}/vendor/products`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          const productsData = await productsResponse.json();
          if (productsResponse.ok) {
            setProducts(productsData.products);
          }
        }
      } else {
        setError(vendorData.error || 'Failed to fetch vendor data');
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/vendor/register" className="text-blue-600 hover:underline">
            Register as Vendor
          </Link>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You don't have a vendor account yet.</p>
          <Link 
            to="/vendor/register" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Register as Vendor
          </Link>
        </div>
      </div>
    );
  }

  if (vendor.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pending Approval
            </h2>
            <p className="text-gray-600 mb-4">
              Your vendor registration is under review. You'll be notified once approved.
            </p>
            <div className="bg-white rounded-lg p-4 mt-6">
              <h3 className="font-semibold mb-2">Shop Details:</h3>
              <p className="text-sm text-gray-600">Shop Name: {vendor.shopName}</p>
              <p className="text-sm text-gray-600">Phone: {vendor.phone}</p>
              <p className="text-sm text-gray-600">Status: {vendor.status}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (vendor.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Suspended
            </h2>
            <p className="text-gray-600">
              Your vendor account has been suspended. Please contact support for more information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{vendor.shopName}</h1>
              <p className="text-gray-600 mt-1">Vendor Dashboard</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/vendor/products/add"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Product
              </Link>
              <Link
                to="/vendor/profile"
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Total Products</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{products.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Active Products</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {products.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Out of Stock</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {products.filter(p => p.stock === 0).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium">Categories</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {vendor.allowedCategoryIds.length}
            </p>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Products</h2>
            <Link
              to="/vendor/products"
              className="text-blue-600 hover:underline text-sm"
            >
              View All
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You haven't added any products yet.</p>
              <Link
                to="/vendor/products/add"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Add Your First Product
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.slice(0, 5).map(product => (
                    <tr key={product._id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {product.images && product.images[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded mr-3"
                            />
                          )}
                          <span className="font-medium text-gray-900">{product.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">৳{product.price}</td>
                      <td className="px-4 py-4">
                        <span className={`${product.stock === 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/vendor/products/edit/${product._id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
