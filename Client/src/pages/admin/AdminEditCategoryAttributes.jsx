import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

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

  useEffect(() => {
    fetchCategory();
  }, [categoryId]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dynamic-categories/${categoryId}`
      );
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

      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/dynamic-categories/${categoryId}`,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Category not found</p>
          <button
            onClick={() => navigate("/admin/categories")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Category Attributes
              </h1>
              <p className="text-gray-600 mt-1">
                Category: <span className="font-semibold">{category.name}</span>
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/categories")}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              messageType === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Attribute */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Add New Attribute</h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Attribute Name *
                  </label>
                  <input
                    type="text"
                    value={newAttribute.name}
                    onChange={(e) =>
                      setNewAttribute({ ...newAttribute, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., RAM"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type *
                  </label>
                  <select
                    value={newAttribute.type}
                    onChange={(e) =>
                      setNewAttribute({ ...newAttribute, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select (Dropdown)</option>
                    <option value="multiselect">Multi-Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                {/* Required */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newAttribute.required}
                      onChange={(e) =>
                        setNewAttribute({
                          ...newAttribute,
                          required: e.target.checked,
                        })
                      }
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-sm font-medium">Required</span>
                  </label>
                </div>

                {/* Options */}
                {(newAttribute.type === "select" ||
                  newAttribute.type === "multiselect") && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Options
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAddOption()
                        }
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add option"
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {newAttribute.options.map((option, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full"
                        >
                          <span className="text-sm">{option}</span>
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
                  onClick={handleAddAttribute}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  + Add Attribute
                </button>
              </div>
            </div>
          </div>

          {/* Existing Attributes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">
                Existing Attributes ({attributes.length})
              </h2>

              {attributes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No attributes yet. Add one from the left panel.
                </p>
              ) : (
                <div className="space-y-4">
                  {attributes.map((attr, idx) => (
                    <div
                      key={attr._id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {idx + 1}. {attr.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Type: {attr.type} {attr.required && "• Required"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAttribute(idx)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Edit Name */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={attr.name}
                          onChange={(e) =>
                            handleUpdateAttribute(idx, "name", e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Edit Type */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">
                          Type
                        </label>
                        <select
                          value={attr.type}
                          onChange={(e) =>
                            handleUpdateAttribute(idx, "type", e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="select">Select (Dropdown)</option>
                          <option value="multiselect">Multi-Select</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="date">Date</option>
                        </select>
                      </div>

                      {/* Edit Required */}
                      <div className="mb-3">
                        <label className="flex items-center">
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
                            className="mr-2 w-4 h-4"
                          />
                          <span className="text-sm font-medium">Required</span>
                        </label>
                      </div>

                      {/* Edit Options */}
                      {(attr.type === "select" ||
                        attr.type === "multiselect") && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Options
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {attr.options.map((option, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full"
                              >
                                <span className="text-sm">{option}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...attributes];
                                    updated[idx].options = updated[
                                      idx
                                    ].options.filter((_, i) => i !== optIdx);
                                    setAttributes(updated);
                                  }}
                                  className="text-red-500 hover:text-red-700 font-bold"
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
        <div className="mt-8 flex gap-3 justify-end">
          <button
            onClick={() => navigate("/admin/categories")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAttributes}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? "Saving..." : "Save All Attributes"}
          </button>
        </div>
      </div>
    </div>
  );
}
