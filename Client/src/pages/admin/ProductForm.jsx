import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  createProduct,
  updateProduct,
  getProductById,
  getCategories,
} from "../../services/api";
import { uploadImage } from "../../services/imageUpload";
import Loading from "../../components/Loading";
import ProductVariantManager from "../../components/admin/ProductVariantManager";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    image: "",
    images: [],
    categoryId: "",
    stock: "",
    description: "",
    sizes: [],
    colors: [],
    sizeChart: "",
    variants: [],
  });

  const availableSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

  const availableColors = [
    { name: "Black", value: "#000000" },
    { name: "White", value: "#FFFFFF" },
    { name: "Red", value: "#EF4444" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Yellow", value: "#F59E0B" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Pink", value: "#EC4899" },
    { name: "Gray", value: "#6B7280" },
    { name: "Brown", value: "#92400E" },
    { name: "Navy", value: "#1E3A8A" },
    { name: "Orange", value: "#F97316" },
  ];

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await getProductById(id);
      const product = response.data.data;
      setFormData({
        ...product,
        images: product.images || [],
        sizes: product.sizes || [],
        colors: product.colors || [],
        sizeChart: product.sizeChart || "",
        variants: product.variants || [],
      });
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSizeToggle = (size) => {
    const newSizes = formData.sizes.includes(size)
      ? formData.sizes.filter((s) => s !== size)
      : [...formData.sizes, size];
    setFormData({ ...formData, sizes: newSizes });
  };

  const handleColorToggle = (color) => {
    const newColors = formData.colors.some((c) => c.name === color.name)
      ? formData.colors.filter((c) => c.name !== color.name)
      : [...formData.colors, color];
    setFormData({ ...formData, colors: newColors });
  };

  const handleImageUpload = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files];
    const validFiles = fileArray.filter((file) => {
      if (!file || !file.type.startsWith("image/")) {
        alert(`${file?.name || "File"} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Image size should be less than 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = validFiles.map((file) => uploadImage(file));
      const imageUrls = await Promise.all(uploadPromises);

      // Add to images array
      const newImages = [...formData.images, ...imageUrls];
      // Set first image as main image if no main image exists
      setFormData({
        ...formData,
        images: newImages,
        image: formData.image || newImages[0],
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload one or more images");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleImageUpload(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleImageUpload(files);
    e.target.value = "";
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      images: newImages,
      image: newImages[0] || "",
    });
  };

  const setMainImage = (url) => {
    setFormData({ ...formData, image: url });
  };

  const handleVariantsChange = (variants) => {
    setFormData({ ...formData, variants });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
      };
      if (isEdit) {
        await updateProduct(id, data);
      } else {
        await createProduct(data);
      }
      navigate("/admin/products");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && isEdit) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/admin/products"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Products"
            >
              <svg
                className="w-6 h-6 text-gray-600"
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
            </Link>
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link to="/admin" className="hover:text-gray-700">
                  Dashboard
                </Link>
                <span>→</span>
                <Link to="/admin/products" className="hover:text-gray-700">
                  Products
                </Link>
                <span>→</span>
                <span className="text-gray-900">{isEdit ? "Edit" : "Add"}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEdit ? "Edit Product" : "Add New Product"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Product Images</h2>

            {/* Uploaded Images */}
            {formData.images.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Product Images ({formData.images.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Click on an image to set as main • Drag to reorder
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {formData.images.map((img, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition-all hover:shadow-md"
                      style={{
                        borderColor:
                          formData.image === img ? "#3B82F6" : "#E5E7EB",
                      }}
                    >
                      <img
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setMainImage(img)}
                      />

                      {/* Main Image Badge */}
                      {formData.image === img && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded shadow-sm">
                          Main
                        </div>
                      )}

                      {/* Image Index */}
                      <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white text-xs font-medium rounded-full flex items-center justify-center">
                        {index + 1}
                      </div>

                      {/* Hover Controls */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {formData.image !== img && (
                          <button
                            type="button"
                            onClick={() => setMainImage(img)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Set as main image"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                dragActive
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-300 hover:border-primary-400"
              } ${uploading ? "opacity-50 cursor-wait" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {uploading ? (
                <div className="flex flex-col items-center">
                  <svg
                    className="animate-spin w-10 h-10 text-primary-500 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-primary-600 font-medium">Uploading...</p>
                </div>
              ) : (
                <>
                  <svg
                    className="w-12 h-12 text-gray-400 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium">
                    Drag & drop multiple images or click to upload
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    PNG, JPG up to 5MB each • Multiple files supported
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Enter product title"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Product description..."
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Sizes Section (Optional) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Sizes (Optional)</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select available sizes for this product
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeToggle(size)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                    formData.sizes.includes(size)
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Colors Section (Optional) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Colors (Optional)</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select available colors for this product
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {availableColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorToggle(color)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 font-medium transition hover:shadow-sm ${
                    formData.colors.some((c) => c.name === color.name)
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-sm truncate">{color.name}</span>
                </button>
              ))}
            </div>

            {/* Selected Colors Preview */}
            {formData.colors.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Selected Colors ({formData.colors.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.colors.map((color) => (
                    <div
                      key={color.name}
                      className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border text-sm"
                    >
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: color.value }}
                      />
                      <span>{color.name}</span>
                      <button
                        type="button"
                        onClick={() => handleColorToggle(color)}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Variants Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <ProductVariantManager
              variants={formData.variants}
              onChange={handleVariantsChange}
            />
          </div>

          {/* Size Chart (Optional) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-2">
              Size Chart (Optional)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Add size chart image URL or upload one
            </p>
            <div className="flex gap-4">
              <input
                type="url"
                name="sizeChart"
                value={formData.sizeChart}
                onChange={handleChange}
                placeholder="https://example.com/size-chart.jpg"
                className="input-field flex-1"
              />
            </div>
            {formData.sizeChart && (
              <div className="mt-4">
                <img
                  src={formData.sizeChart}
                  alt="Size Chart"
                  className="max-w-md rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="btn-primary px-8 py-3 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>{isEdit ? "Update Product" : "Create Product"}</>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
