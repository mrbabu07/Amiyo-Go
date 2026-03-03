import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductVariantManager({ variants = [], onChange }) {
  const [variantList, setVariantList] = useState(variants);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    size: "",
    color: "",
    price: "",
    stock: "",
    sku: "",
    image: "",
  });

  const handleAddVariant = () => {
    if (!formData.size && !formData.color) {
      alert("Please specify at least size or color");
      return;
    }

    const newVariant = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
    };

    const updated = [...variantList, newVariant];
    setVariantList(updated);
    onChange(updated);
    resetForm();
  };

  const handleUpdateVariant = () => {
    const updated = [...variantList];
    updated[editingIndex] = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
    };
    setVariantList(updated);
    onChange(updated);
    resetForm();
  };

  const handleDeleteVariant = (index) => {
    if (confirm("Are you sure you want to delete this variant?")) {
      const updated = variantList.filter((_, i) => i !== index);
      setVariantList(updated);
      onChange(updated);
    }
  };

  const handleEditVariant = (index) => {
    setEditingIndex(index);
    setFormData(variantList[index]);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      size: "",
      color: "",
      price: "",
      stock: "",
      sku: "",
      image: "",
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const colors = [
    "Black",
    "White",
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Purple",
    "Pink",
    "Orange",
    "Gray",
    "Brown",
    "Navy",
    "Beige",
    "Maroon",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Product Variants
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-sm"
        >
          {showAddForm ? "Cancel" : "+ Add Variant"}
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              {editingIndex !== null ? "Edit Variant" : "Add New Variant"}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size
                </label>
                <select
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Select Size</option>
                  {sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <select
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Select Color</option>
                  {colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price (৳)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  className="input-field"
                  placeholder="0"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU (Optional)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="input-field"
                  placeholder="PROD-SIZE-COLOR"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={
                  editingIndex !== null ? handleUpdateVariant : handleAddVariant
                }
                className="btn-primary"
              >
                {editingIndex !== null ? "Update Variant" : "Add Variant"}
              </button>
              <button onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Variants List */}
      {variantList.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No variants added yet. Click "Add Variant" to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {variantList.map((variant, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Variant Image */}
                {variant.image && (
                  <img
                    src={variant.image}
                    alt={`${variant.size} ${variant.color}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}

                {/* Variant Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {variant.size && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded">
                        {variant.size}
                      </span>
                    )}
                    {variant.color && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded">
                        {variant.color}
                      </span>
                    )}
                    {variant.sku && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        SKU: {variant.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-900 dark:text-white font-semibold">
                      ৳{variant.price.toFixed(2)}
                    </span>
                    <span
                      className={`${
                        variant.stock > 10
                          ? "text-green-600 dark:text-green-400"
                          : variant.stock > 0
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      Stock: {variant.stock}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditVariant(index)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteVariant(index)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      {variantList.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              Total Variants: {variantList.length}
            </span>
            <span className="text-blue-700 dark:text-blue-300">
              Total Stock: {variantList.reduce((sum, v) => sum + v.stock, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
