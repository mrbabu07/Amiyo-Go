import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Plus, Trash2, Edit2, Check, X } from "lucide-react";

export default function AdminEditCategoryAttributes() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [newAttribute, setNewAttribute] = useState({
    name: "",
    type: "text",
    options: [],
    required: false,
  });
  const [optionInput, setOptionInput] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    fetchCategory();
  }, [categoryId]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      let response;
      
      // Try dynamic categories first
      try {
        response = await axios.get(
          `${import.meta.env.VITE_API_URL}/dynamic-categories/${categoryId}`
        );
      } catch (err) {
        // If not found in dynamic, try regular categories
        if (err.response?.status === 404) {
          response = await axios.get(
            `${import.meta.env.VITE_API_URL}/categories/${categoryId}`
          );
        } else {
          throw err;
        }
      }
      
      setCategory(response.data.data);
      setAttributes(response.data.data.attributes || []);
    } catch (error) {
      console.error("Error fetching category:", error);
      setMessage("Error loading category");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) {
      setMessage("Attribute name is required");
      setMessageType("error");
      return;
    }

    // Check for duplicate
    if (attributes.some((attr) => attr.name.toLowerCase() === newAttribute.name.toLowerCase())) {
      setMessage("Attribute already exists");
      setMessageType("error");
      return;
    }

    const attribute = {
      _id: Date.now().toString(), // Temporary ID for new attributes
      name: newAttribute.name,
      type: newAttribute.type,
      options: newAttribute.options,
      required: newAttribute.required,
      order: attributes.length,
    };

    setAttributes([...attributes, attribute]);
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
    setAttributes(attributes.filter((_, i) => i !== index));
    setMessage("Attribute removed");
    setMessageType("success");
  };

  const handleUpdateAttribute = (index, field, value) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], [field]: value };
    setAttributes(updated);
  };

  const handleSaveAttributes = async () => {
    try {
      setSaving(true);
      setMessage("");

      // Determine if it's a dynamic or regular category
      const isDynamic = category.attributes && Array.isArray(category.attributes);
      const endpoint = isDynamic 
        ? `${import.meta.env.VITE_API_URL}/dynamic-categories/${categoryId}`
        : `${import.meta.env.VITE_API_URL}/categories/${categoryId}`;

      await axios.put(
        endpoint,
        { attributes },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setMessage("Attributes saved successfully!");
      setMessageType("success");
      setTimeout(() => {
        navigate("/admin/categories");
      }, 1500);
    } catch (error) {
      console.error("Error saving attributes:", error);
      setMessage(error.response?.data?.message || "Error saving attributes");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading category...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8">
          <p className="text-gray-600 text-lg mb-6">Category not found</p>
          <button
            onClick={() => navigate("/admin/categories")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Back to Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/categories")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Manage Attributes
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Category: <span className="font-semibold text-gray-700">{category.name}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Total Attributes: <span className="font-bold text-blue-600">{attributes.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Alert Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in fade-in ${
              messageType === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {messageType === "success" ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Attribute Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <Plus className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Add Attribute</h2>
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Attribute Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAttribute.name}
                    onChange={(e) =>
                      setNewAttribute({ ...newAttribute, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., RAM, Color, Size"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newAttribute.type}
                    onChange={(e) =>
                      setNewAttribute({ ...newAttribute, type: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown</option>
                    <option value="multiselect">Multi-Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                {/* Required */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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

                {/* Options */}
                {(newAttribute.type === "select" ||
                  newAttribute.type === "multiselect") && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                          className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200"
                        >
                          <span className="text-sm font-medium text-blue-900">
                            {option}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddAttribute}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-6"
                >
                  <Plus className="w-5 h-5" />
                  Add Attribute
                </button>
              </div>
            </div>
          </div>

          {/* Existing Attributes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Attributes ({attributes.length})
              </h2>

              {attributes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Edit2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    No attributes yet
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Add your first attribute from the left panel
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attributes.map((attr, idx) => (
                    <div
                      key={attr._id}
                      className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                              {idx + 1}
                            </span>
                            <h3 className="text-lg font-bold text-gray-900">
                              {attr.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 ml-11">
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                              {attr.type}
                            </span>
                            {attr.required && (
                              <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAttribute(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete attribute"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Edit Name */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                            Name
                          </label>
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) =>
                              handleUpdateAttribute(idx, "name", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                          />
                        </div>

                        {/* Edit Type */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                            Type
                          </label>
                          <select
                            value={attr.type}
                            onChange={(e) =>
                              handleUpdateAttribute(idx, "type", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown</option>
                            <option value="multiselect">Multi-Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                      </div>

                      {/* Edit Required */}
                      <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={attr.required}
                          onChange={(e) =>
                            handleUpdateAttribute(
                              idx,
                              "required",
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Required Field
                        </label>
                      </div>

                      {/* Edit Options */}
                      {(attr.type === "select" ||
                        attr.type === "multiselect") && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                            Options
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {attr.options.map((option, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200"
                              >
                                <span className="text-sm font-medium text-blue-900">
                                  {option}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...attributes];
                                    updated[idx].options = updated[
                                      idx
                                    ].options.filter((_, i) => i !== optIdx);
                                    setAttributes(updated);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex gap-3 justify-end sticky bottom-0 bg-gradient-to-t from-white to-transparent pt-6">
          <button
            onClick={() => navigate("/admin/categories")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAttributes}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {saving ? "Saving..." : "Save All Attributes"}
          </button>
        </div>
      </div>
    </div>
  );
}
