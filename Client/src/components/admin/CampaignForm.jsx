import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CampaignForm = ({ campaignId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    bannerImageUrl: '',
    startDate: '',
    endDate: '',
    discountPercentage: 5,
    eligibleCategories: [],
    maxProductsPerVendor: 100,
  });

  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchCategories();
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchCampaign = async () => {
    try {
      const response = await axios.get(`/api/campaigns/${campaignId}`);
      const campaign = response.data.data;
      setFormData({
        ...campaign,
        startDate: new Date(campaign.startDate).toISOString().slice(0, 16),
        endDate: new Date(campaign.endDate).toISOString().slice(0, 16),
        eligibleCategories: campaign.eligibleCategories.map(c => c._id),
      });
      setImagePreview(campaign.bannerImageUrl);
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      eligibleCategories: prev.eligibleCategories.includes(categoryId)
        ? prev.eligibleCategories.filter(id => id !== categoryId)
        : [...prev.eligibleCategories, categoryId],
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, bannerImageUrl: 'Image size must be less than 5MB' }));
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, bannerImageUrl: 'Only JPEG, PNG, and WebP formats are allowed' }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, bannerImageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.bannerImageUrl) {
      newErrors.bannerImageUrl = 'Banner image is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }

      const durationDays = (end - start) / (1000 * 60 * 60 * 24);
      if (durationDays < 1 || durationDays > 365) {
        newErrors.duration = 'Campaign duration must be between 1 and 365 days';
      }
    }

    if (formData.discountPercentage < 5 || formData.discountPercentage > 100) {
      newErrors.discountPercentage = 'Discount must be between 5% and 100%';
    }

    if (formData.eligibleCategories.length === 0) {
      newErrors.eligibleCategories = 'At least one category is required';
    }

    if (formData.maxProductsPerVendor < 1 || formData.maxProductsPerVendor > 1000) {
      newErrors.maxProductsPerVendor = 'Max products per vendor must be between 1 and 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const url = campaignId ? `/api/campaigns/${campaignId}` : '/api/campaigns';
      const method = campaignId ? 'put' : 'post';

      const response = await axios[method](url, {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      });

      if (onSuccess) {
        onSuccess(response.data.data);
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error.response?.data?.message || 'Failed to save campaign',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campaign-form">
      <form onSubmit={handleSubmit}>
        {errors.submit && <div className="error-message">{errors.submit}</div>}

        <div className="form-group">
          <label htmlFor="name">Campaign Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Summer Sale 2024"
            maxLength="255"
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="slug">Campaign Slug</label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="Auto-generated if left empty"
            maxLength="100"
          />
          <small>URL-friendly identifier (lowercase, hyphens only)</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Campaign description"
            maxLength="1000"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bannerImage">Banner Image *</label>
          <input
            type="file"
            id="bannerImage"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
          />
          {errors.bannerImageUrl && <span className="error">{errors.bannerImageUrl}</span>}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Banner preview" />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start Date *</label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
            />
            {errors.startDate && <span className="error">{errors.startDate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date *</label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
            />
            {errors.endDate && <span className="error">{errors.endDate}</span>}
          </div>
        </div>

        {errors.duration && <div className="error-message">{errors.duration}</div>}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="discountPercentage">Discount Percentage * (%)</label>
            <input
              type="number"
              id="discountPercentage"
              name="discountPercentage"
              value={formData.discountPercentage}
              onChange={handleInputChange}
              min="5"
              max="100"
            />
            {errors.discountPercentage && <span className="error">{errors.discountPercentage}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="maxProductsPerVendor">Max Products Per Vendor</label>
            <input
              type="number"
              id="maxProductsPerVendor"
              name="maxProductsPerVendor"
              value={formData.maxProductsPerVendor}
              onChange={handleInputChange}
              min="1"
              max="1000"
            />
            {errors.maxProductsPerVendor && <span className="error">{errors.maxProductsPerVendor}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>Eligible Categories *</label>
          <div className="category-list">
            {categories.map(category => (
              <label key={category._id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.eligibleCategories.includes(category._id)}
                  onChange={() => handleCategoryChange(category._id)}
                />
                {category.name}
              </label>
            ))}
          </div>
          {errors.eligibleCategories && <span className="error">{errors.eligibleCategories}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : campaignId ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CampaignForm;
