import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";

const ATTRIBUTE_TYPES = ["text", "number", "select", "multiselect", "checkbox", "date"];

export default function DynamicCategoryForm({ category, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    isActive: true,
    attributes: [],
  });
  const [newAttribute, setNewAttribute] = useState({
    name: "",
    type: "text",
    options: [],
    required: false,
  });
  const [optionInput, setOptionInput] = useState("");

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        isActive: category.isActive,
        attributes: category.attributes || [],
      });
    }
  }, [category]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) {
      setMessage("Attribute name is required");
      setMessageType("error");
      return;
    }

    const attribute = {
      _id: Date.now().toString(),
      name: newAttribute.name,
      type: newAttribute.type,
      options: newAttribute.options,
      required: newAttribute.required,
      order: formData.attributes.length,
    };

    setFormData({
      ...formData,
      attributes: [...formData.attributes, attribute],
    });

    setNewAttribute({
      name: "",
      type: "text",
      options: [],
      required: false,
    });
    setMessage("Attribute added");
    setMessageType("success");
  };

  const handleAddOption = () => {
    if (!optionInput.trim()) return;

    setNewAttribute({
      ...newAttribute,
      options: [...newAttribute.options, optionInput.trim()],
    });
    setOptionInput("");
  };

  const handleRemoveOption = (index) => {
    setNewAttribute({
      ...newAttribute,
      options: newAttribute.options.filter((_, i) => i !== index),
    });
  };

  const handleDeleteAttribute = (index) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, i) => i !== index),
    });
    setMessage("Attribute removed");
    setMessageType("success");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const url = category
        ? `${import.meta.env.VITE_API_URL}/dynamic-categories/${category._id}`
        : `${import.meta.env.VITE_API_URL}/dynamic-categories`;

      const method = category ? "put" : "post";

      await axios[method](url, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMessageType("success");
      setMessage(
        category
          ? "Category updated successfully!"
          : "Category created successfully!"
      );

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.response?.data?.message || "Error saving category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in fade-in ${
            messageType === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Electronics"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Slug
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., electronics"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows="3"
              placeholder="Category description"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="mt-6 flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Active Category
            </label>
          </div>
        </div>

        {/* Attributes Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            Attributes
          </h2>

          {/* Add New Attribute Form */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add New Attribute
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAttribute.name}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  placeholder="e.g., RAM"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAttribute.type}
                  onChange={(e) =>
                    setNewAttribute({ ...newAttribute, type: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  {ATTRIBUTE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={newAttribute.required}
                onChange={(e) =>
                  setNewAttribute({
                    ...newAttribute,
                    required: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Required Field
              </label>
            </div>

            {(newAttribute.type === "select" ||
              newAttribute.type === "multiselect") && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Options
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleAddOption()
                    }
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    placeholder="Add option"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {newAttribute.options.map((option, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-blue-300"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {option}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddAttribute}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Attribute
            </button>
          </div>

          {/* Existing Attributes */}
          {formData.attributes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No attributes added yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Add attributes from the form above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.attributes.map((attr, idx) => (
                <div
                  key={attr._id}
                  className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-gray-900">{attr.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 ml-10">
                        <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                          {attr.type}
                        </span>
                        {attr.required && (
                          <span className="inline-block px-2.5 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      {attr.options.length > 0 && (
                        <div className="mt-3 ml-10 flex flex-wrap gap-1">
                          {attr.options.map((opt, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttribute(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {category ? "Update Category" : "Create Category"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
