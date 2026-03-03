import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getFieldsForCategory } from '../../utils/productFieldConfig';

const VendorAddProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    price: '',
    stock: '',
    images: [],
    attributes: {},
    status: 'active',
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchVendorData();
  }, []);

  useEffect(() => {
    if (formData.categoryId && categories.length > 0) {
      const category = categories.find(c => c._id === formData.categoryId);
      if (category) {
        setSelectedCategory(category);
        const fields = getFieldsForCategory(category.slug);
        setDynamicFields(fields);
      }
    }
  }, [formData.categoryId, categories]);

  const fetchVendorData = async () => {
    try {
      const token = await user.getIdToken();
      
      const vendorResponse = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const vendorData = await vendorResponse.json();
      if (vendorResponse.ok) {
        setVendor(vendorData.vendor);
        
        // Fetch categories
        const categoriesResponse = await fetch(`${import.meta.env.VITE_API_URL}/categories?active=true`);
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          // Filter only allowed categories
          const allowedCats = categoriesData.data.filter(cat => 
            vendorData.vendor.allowedCategoryIds.some(id => id === cat._id)
          );
          setCategories(allowedCats);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAttributeChange = (fieldName, value) => {
    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        [fieldName]: value,
      },
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    setImageFiles([...imageFiles, ...files]);

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreview([...imagePreview, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreview(newPreviews);
  };

  const uploadImagesToImgBB = async () => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const data = await response.json();
        if (data.success) {
          uploadedUrls.push(data.data.url);
        } else {
          throw new Error('Failed to upload image');
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Upload images first
      const imageUrls = await uploadImagesToImgBB();

      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          images: imageUrls,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Product created successfully!');
        navigate('/vendor/dashboard');
      } else {
        setError(data.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicField = (field) => {
    const value = formData.attributes[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            required={field.required}
            value={value}
            onChange={(e) => handleAttributeChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'textarea':
        return (
          <textarea
            required={field.required}
            value={value}
            onChange={(e) => handleAttributeChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'select':
        return (
          <select
            required={field.required}
            value={value}
            onChange={(e) => handleAttributeChange(field.name, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select {field.label}</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleAttributeChange(field.name, newValues);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            required={field.required}
            value={value}
            onChange={(e) => handleAttributeChange(field.name, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        );

      default:
        return null;
    }
  };

  if (!vendor) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Product</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Basic Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images (Max 5)
              </label>
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 5 images)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      disabled={imageFiles.length >= 5}
                    />
                  </label>
                </div>

                {/* Image Previews */}
                {imagePreview.length > 0 && (
                  <div className="grid grid-cols-5 gap-4">
                    {imagePreview.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadingImages && (
                  <div className="text-center text-sm text-blue-600">
                    Uploading images...
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Fields Based on Category */}
            {dynamicFields.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Category-Specific Information
                </h3>
                <div className="space-y-4">
                  {dynamicFields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label} {field.required && '*'}
                      </label>
                      {renderDynamicField(field)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || uploadingImages}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : uploadingImages ? 'Uploading Images...' : 'Create Product'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/vendor/dashboard')}
                disabled={loading || uploadingImages}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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

export default VendorAddProduct;
