import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createOffer,
  updateOffer,
  getOfferById,
  getProducts,
} from "../../services/api";
import toast from "react-hot-toast";
import { toAssetUrl } from "../../utils/url";

export default function OfferForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    image: null,
    startDate: "",
    endDate: "",
    isActive: true,
    showAsPopup: true,
    priority: 0,
    couponCode: "",
    targetProducts: [],
    buttonText: "Shop Now",
    buttonLink: "/products",
  });

  useEffect(() => {
    fetchProducts();
    if (isEditMode) {
      fetchOffer();
    }
  }, [id]);

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const response = await getOfferById(id);
      const offer = response.data.data;

      // Format dates for datetime-local input
      const formatDateForInput = (date) => {
        const d = new Date(date);
        return d.toISOString().slice(0, 16);
      };

      setFormData({
        title: offer.title,
        description: offer.description,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        image: null,
        startDate: formatDateForInput(offer.startDate),
        endDate: formatDateForInput(offer.endDate),
        isActive: offer.isActive,
        showAsPopup: offer.showAsPopup,
        priority: offer.priority,
        couponCode: offer.couponCode || "",
        targetProducts: offer.targetProducts.map((p) => p._id || p),
        buttonText: offer.buttonText,
        buttonLink: offer.buttonLink,
      });

      // Set image preview
      setImagePreview(toAssetUrl(offer.image));
    } catch (error) {
      console.error("Failed to fetch offer:", error);
      toast.error("Failed to load offer");
      navigate("/admin/offers");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "couponCode"
            ? value.toUpperCase()
            : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductToggle = (productId) => {
    setFormData((prev) => ({
      ...prev,
      targetProducts: prev.targetProducts.includes(productId)
        ? prev.targetProducts.filter((id) => id !== productId)
        : [...prev.targetProducts, productId],
    }));
  };

  const validationError = (() => {
    const title = formData.title.trim();
    const description = formData.description.trim();
    const discountValue = Number(formData.discountValue);
    const priority = Number(formData.priority);

    if (!title || !description || !formData.discountValue || !formData.startDate || !formData.endDate) {
      return "";
    }
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      return "Discount value must be greater than zero.";
    }
    if (formData.discountType === "percentage" && discountValue > 100) {
      return "Percentage discount cannot be more than 100%.";
    }
    if (!isEditMode && !formData.image) {
      return "Please upload an image before saving the offer.";
    }
    if (Number.isNaN(priority) || priority < 0) {
      return "Priority must be zero or more.";
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      return "End date must be after start date.";
    }
    if (formData.couponCode && !/^[A-Z0-9_-]{3,30}$/.test(formData.couponCode.trim())) {
      return "Coupon code must be 3-30 characters and use only letters, numbers, dash, or underscore.";
    }
    if (!formData.buttonLink.startsWith("/")) {
      return "Button link must start with /.";
    }
    return "";
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);

      // Create FormData for file upload
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "targetProducts") {
          data.append(key, JSON.stringify(formData[key]));
        } else if (key === "image" && formData[key]) {
          data.append(key, formData[key]);
        } else if (key !== "image") {
          data.append(key, formData[key]);
        }
      });

      if (isEditMode) {
        await updateOffer(id, data);
        toast.success("Offer updated successfully");
      } else {
        await createOffer(data);
        toast.success("Offer created successfully");
      }

      navigate("/admin/offers");
    } catch (error) {
      console.error("Failed to save offer:", error);
      toast.error(error.response?.data?.error || "Failed to save offer");
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/admin/offers")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Offers
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? "Edit Offer" : "Create New Offer"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode
              ? "Update promotional offer details"
              : "Create a new promotional offer for your customers"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Summer Sale 2024"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your offer..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (BDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder={
                      formData.discountType === "percentage"
                        ? "e.g., 20"
                        : "e.g., 50"
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coupon Code (Optional)
                </label>
                <input
                  type="text"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleChange}
                  placeholder="e.g., SUMMER2024"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty if no coupon code is needed
                </p>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Offer Image
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Image <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Max file size: 5MB. Supported formats: JPEG, PNG, GIF, WebP
              </p>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview:
                  </p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Validity Period
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Settings
            </h2>

            <div className="space-y-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority Level
                </label>
                <input
                  type="number"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Higher priority offers will be shown first when multiple are
                  active
                </p>
              </div>

              {/* Button Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    name="buttonText"
                    value={formData.buttonText}
                    onChange={handleChange}
                    placeholder="Shop Now"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Button Link
                  </label>
                  <input
                    type="text"
                    name="buttonLink"
                    value={formData.buttonLink}
                    onChange={handleChange}
                    placeholder="/products"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active (Offer is currently active)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="showAsPopup"
                    checked={formData.showAsPopup}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show as Popup (Display this offer as a popup modal)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Target Products (Optional) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Target Products (Optional)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select specific products for this offer. Leave empty to apply to
              all products.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {products.map((product) => (
                <label
                  key={product._id}
                  className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.targetProducts.includes(product._id)}
                    onChange={() => handleProductToggle(product._id)}
                    className="w-4 h-4 text-primary-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {product.title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {validationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {validationError}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/offers")}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(validationError)}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>{isEditMode ? "Update Offer" : "Create Offer"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
