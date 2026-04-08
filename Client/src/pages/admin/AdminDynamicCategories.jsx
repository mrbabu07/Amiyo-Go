import { useState, useEffect } from "react";
import axios from "axios";
import DynamicCategoryForm from "@/components/admin/DynamicCategoryForm";
import CategoryList from "@/components/admin/CategoryList";
import { Plus, Search, AlertCircle, Trash2, ChevronDown, ChevronUp, Settings, Edit2, Eye, Check } from "lucide-react";

export default function AdminDynamicCategories() {
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [regularCategories, setRegularCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingCommission, setEditingCommission] = useState({});
  const [savingCommission, setSavingCommission] = useState({});
  const [editingAttributes, setEditingAttributes] = useState({});
  const [newAttribute, setNewAttribute] = useState({});
  const [optionInput, setOptionInput] = useState({});
  const [editingAttrIndex, setEditingAttrIndex] = useState({});
  const [attrTypeFilter, setAttrTypeFilter] = useState({});

  useEffect(() => {
    fetchAllCategories();
  }, []);

  const fetchAllCategories = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch dynamic categories
      const dynamicRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/dynamic-categories`
      );
      setDynamicCategories(dynamicRes.data.data || []);
      
      // Fetch regular categories
      const regularRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/categories`
      );
      setRegularCategories(regularRes.data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleFormSuccess = () => {
    fetchAllCategories();
    handleFormClose();
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await axios.delete(
          `${import.meta.env.VITE_API_URL}/dynamic-categories/${categoryId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        fetchAllCategories();
      } catch (error) {
        console.error("Error deleting category:", error);
        alert("Error deleting category");
      }
    }
  };

  const handleCommissionChange = (id, value) => {
    setEditingCommission((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveCommission = async (category) => {
    const raw = editingCommission[category._id];
    const rate = parseFloat(raw);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert("Commission must be 0–100");
      return;
    }
    setSavingCommission((prev) => ({ ...prev, [category._id]: true }));
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/categories/${category._id}`,
        { commissionRate: rate },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setRegularCategories((prev) =>
        prev.map((c) => (c._id === category._id ? { ...c, commissionRate: rate } : c))
      );
      setEditingCommission((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
      alert(`Commission set to ${rate}%`);
    } catch (error) {
      console.error("Error updating commission:", error);
      alert("Failed to update commission");
    } finally {
      setSavingCommission((prev) => ({ ...prev, [category._id]: false }));
    }
  };

  const handleAddAttribute = (categoryId) => {
    const attr = newAttribute[categoryId];
    if (!attr || !attr.name.trim()) {
      alert("Attribute name is required");
      return;
    }

    const newAttr = {
      _id: Date.now().toString(),
      name: attr.name,
      type: attr.type || "text",
      options: attr.options || [],
      required: attr.required || false,
    };

    setEditingAttributes((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), newAttr],
    }));

    setNewAttribute((prev) => ({
      ...prev,
      [categoryId]: { name: "", type: "text", options: [], required: false },
    }));
  };

  const handleUpdateAttribute = (categoryId, attrIndex, field, value) => {
    setEditingAttributes((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].map((attr, idx) =>
        idx === attrIndex ? { ...attr, [field]: value } : attr
      ),
    }));
  };

  const handleAddOption = (categoryId, attrIndex) => {
    const input = optionInput[`${categoryId}-${attrIndex}`] || "";
    if (!input.trim()) return;

    setEditingAttributes((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].map((attr, idx) =>
        idx === attrIndex
          ? { ...attr, options: [...(attr.options || []), input.trim()] }
          : attr
      ),
    }));
    setOptionInput((prev) => ({ ...prev, [`${categoryId}-${attrIndex}`]: "" }));
  };

  const handleRemoveOption = (categoryId, attrIndex, optionIndex) => {
    setEditingAttributes((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].map((attr, idx) =>
        idx === attrIndex
          ? {
              ...attr,
              options: attr.options.filter((_, i) => i !== optionIndex),
            }
          : attr
      ),
    }));
  };

  const handleDeleteAttribute = (categoryId, attrIndex) => {
    setEditingAttributes((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].filter((_, i) => i !== attrIndex),
    }));
  };

  const handleSaveAttributes = async (category) => {
    try {
      const attributes = editingAttributes[category._id] || [];
      await axios.put(
        `${import.meta.env.VITE_API_URL}/categories/${category._id}`,
        { attributes },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setRegularCategories((prev) =>
        prev.map((c) => (c._id === category._id ? { ...c, attributes } : c))
      );
      setEditingAttributes((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
      alert("Attributes saved successfully!");
    } catch (error) {
      console.error("Error saving attributes:", error);
      alert("Failed to save attributes");
    }
  };

  const filteredDynamic = dynamicCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRegular = regularCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header - Daraz Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b-4 border-blue-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white">
                    Category Management
                  </h1>
                  <p className="text-blue-100 mt-1 font-medium">
                    Manage categories, attributes & commission rates
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = "/admin/categories/manage"}
                className="px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold transition-all shadow-lg hover:shadow-2xl flex items-center gap-2 transform hover:scale-105"
              >
                <Settings className="w-5 h-5" />
                <span>Manage All</span>
              </button>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowForm(true);
                }}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold transition-all shadow-lg hover:shadow-2xl flex items-center gap-2 transform hover:scale-105"
              >
                <Plus className="w-6 h-6" />
                <span>New Category</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-blue-200">
              <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-8 flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-900">
                  {editingCategory ? "✏️ Edit Category" : "➕ Create New Category"}
                </h2>
                <button
                  onClick={handleFormClose}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-8">
                <DynamicCategoryForm
                  category={editingCategory}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormClose}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-4 shadow-lg">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-bold">{error}</p>
            </div>
            <button
              onClick={fetchAllCategories}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Bar - Daraz Style */}
        <div className="mb-10">
          <div className="relative">
            <Search className="absolute left-5 top-4 w-6 h-6 text-blue-400" />
            <input
              type="text"
              placeholder="🔍 Search categories by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-4 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-lg font-medium shadow-md"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-20 w-20 border-4 border-blue-300 border-t-blue-600 mb-6"></div>
            <p className="mt-6 text-white font-bold text-xl">Loading categories...</p>
          </div>
        ) : (
          <>
            {/* Dynamic Categories Section */}
            <div className="mb-16">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                  <h2 className="text-3xl font-black text-white">
                    Dynamic Categories
                  </h2>
                  <span className="px-4 py-2 bg-blue-500 text-white rounded-full font-bold text-sm">
                    {filteredDynamic.length}
                  </span>
                </div>
                <p className="text-blue-200 ml-5 font-medium">Categories with custom attributes for products</p>
              </div>

              {filteredDynamic.length === 0 ? (
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl border-2 border-blue-700 p-16 text-center">
                  <div className="w-20 h-20 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-10 h-10 text-blue-300" />
                  </div>
                  <p className="text-blue-100 text-lg mb-2 font-bold">No dynamic categories</p>
                  <p className="text-blue-300 mb-8">Create your first dynamic category to get started</p>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setShowForm(true);
                    }}
                    className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition-all shadow-lg"
                  >
                    Create Category
                  </button>
                </div>
              ) : (
                <CategoryList
                  categories={filteredDynamic}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>

            {/* Regular Categories Section */}
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-10 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
                  <h2 className="text-3xl font-black text-white">
                    All Categories
                  </h2>
                  <span className="px-4 py-2 bg-green-500 text-white rounded-full font-bold text-sm">
                    {filteredRegular.length}
                  </span>
                </div>
                <p className="text-green-200 ml-5 font-medium">Manage commission rates and add attributes</p>
              </div>

              {filteredRegular.length === 0 ? (
                <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-2xl border-2 border-green-700 p-16 text-center">
                  <p className="text-green-100 text-lg font-bold">No categories found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRegular.map((category) => {
                    const attributes = editingAttributes[category._id] || category.attributes || [];
                    const editVal = editingCommission[category._id];
                    const displayVal = editVal !== undefined ? editVal : (category.commissionRate ?? 0).toString();
                    const isDirty = editVal !== undefined;
                    const isSaving = savingCommission[category._id];

                    return (
                      <div
                        key={category._id}
                        className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-xl border-2 border-slate-600 hover:border-green-400 hover:shadow-2xl transition-all overflow-hidden group"
                      >
                        {/* Card Header */}
                        <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">📦</span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-black text-white">{category.name}</h3>
                                  <p className="text-slate-400 text-xs">/{category.slug}</p>
                                </div>
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                category.isActive !== false
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-500 text-white"
                              }`}
                            >
                              {category.isActive !== false ? "✓ Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6 space-y-4">
                          {/* Attributes Count */}
                          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs font-bold text-slate-400 mb-1">ATTRIBUTES</p>
                            <p className="text-2xl font-black text-purple-400">{attributes.length}</p>
                          </div>

                          {/* Commission Rate */}
                          <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs font-bold text-slate-400 mb-2">COMMISSION RATE</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={displayVal}
                                onChange={(e) => handleCommissionChange(category._id, e.target.value)}
                                className="flex-1 border-2 border-slate-600 bg-slate-800 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-bold text-lg"
                              />
                              <span className="text-slate-300 font-bold">%</span>
                              {isDirty && (
                                <button
                                  onClick={() => handleSaveCommission(category)}
                                  disabled={isSaving}
                                  className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 font-bold transition-all"
                                >
                                  {isSaving ? "..." : "✓"}
                                </button>
                              )}
                            </div>
                            {parseFloat(displayVal) > 0 && (
                              <div className="mt-2 text-xs text-slate-400">
                                <p>On ৳1000: Platform ৳{(1000 * parseFloat(displayVal) / 100).toFixed(0)}</p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={() => {
                                setExpandedCategory(expandedCategory === category._id ? null : category._id);
                              }}
                              className="px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold transition-all text-sm flex items-center justify-center gap-1"
                              title="Manage attributes"
                            >
                              <Settings className="w-4 h-4" />
                              <span>Attrs</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategory(category);
                                setShowForm(true);
                              }}
                              className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all text-sm flex items-center justify-center gap-1"
                              title="Edit category"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setExpandedCategory(expandedCategory === category._id ? null : category._id);
                              }}
                              className="px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-all text-sm flex items-center justify-center gap-1"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this category?")) {
                                  handleDelete(category._id);
                                }
                              }}
                              className="px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-all text-sm flex items-center justify-center gap-1"
                              title="Delete category"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedCategory === category._id && (
                          <div className="border-t-2 border-slate-600 p-6 bg-slate-900 space-y-6">
                            {/* Current Attributes Section */}
                            <div>
                              <h4 className="text-sm font-bold text-purple-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                📋 Manage Attributes ({(editingAttributes[category._id] || category.attributes || []).length})
                              </h4>

                              {(editingAttributes[category._id] || category.attributes || []).length === 0 ? (
                                <div className="text-center py-8 bg-slate-800 rounded-lg border border-dashed border-slate-600">
                                  <p className="text-slate-400 text-sm">No attributes yet. Add one below.</p>
                                </div>
                              ) : (
                                <div className="space-y-3 mb-6">
                                  {(editingAttributes[category._id] || category.attributes || []).map((attr, attrIdx) => (
                                    <div
                                      key={attr._id}
                                      className="border border-purple-600 rounded-lg p-4 bg-slate-800 space-y-3"
                                    >
                                      {/* Attribute Header */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                          {/* Name */}
                                          <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1 block">NAME</label>
                                            <input
                                              type="text"
                                              value={attr.name}
                                              onChange={(e) =>
                                                handleUpdateAttribute(category._id, attrIdx, "name", e.target.value)
                                              }
                                              className="w-full border-2 border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium text-sm"
                                              placeholder="e.g., RAM, Color"
                                            />
                                          </div>

                                          {/* Type */}
                                          <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1 block">TYPE</label>
                                            <select
                                              value={attr.type}
                                              onChange={(e) =>
                                                handleUpdateAttribute(category._id, attrIdx, "type", e.target.value)
                                              }
                                              className="w-full border-2 border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium text-sm"
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

                                        {/* Delete Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAttribute(category._id, attrIdx)}
                                          className="p-2 text-red-400 hover:bg-red-900 rounded transition-colors ml-3"
                                          title="Delete attribute"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {/* Required Checkbox */}
                                      <div className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                                        <input
                                          type="checkbox"
                                          checked={attr.required || false}
                                          onChange={(e) =>
                                            handleUpdateAttribute(category._id, attrIdx, "required", e.target.checked)
                                          }
                                          className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                        />
                                        <label className="text-sm font-medium text-slate-300">Required Field</label>
                                      </div>

                                      {/* Options Section (for select/multiselect) */}
                                      {(attr.type === "select" || attr.type === "multiselect") && (
                                        <div className="border-t border-slate-600 pt-3">
                                          <label className="text-xs font-bold text-slate-400 mb-2 block">OPTIONS</label>
                                          
                                          {/* Existing Options */}
                                          {attr.options && attr.options.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                              {attr.options.map((opt, optIdx) => (
                                                <div
                                                  key={optIdx}
                                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 text-purple-100 text-xs rounded-full"
                                                >
                                                  <span>{opt}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleRemoveOption(category._id, attrIdx, optIdx)
                                                    }
                                                    className="text-purple-300 hover:text-purple-100 font-bold"
                                                  >
                                                    ×
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Add Option Input */}
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              value={optionInput[`${category._id}-${attrIdx}`] || ""}
                                              onChange={(e) =>
                                                setOptionInput((prev) => ({
                                                  ...prev,
                                                  [`${category._id}-${attrIdx}`]: e.target.value,
                                                }))
                                              }
                                              onKeyPress={(e) => {
                                                if (e.key === "Enter") {
                                                  handleAddOption(category._id, attrIdx);
                                                }
                                              }}
                                              className="flex-1 border-2 border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium text-sm"
                                              placeholder="Add option..."
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleAddOption(category._id, attrIdx)}
                                              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold transition-all text-sm"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Add New Attribute Form */}
                            <div className="border-t border-slate-600 pt-6">
                              <h4 className="text-sm font-bold text-green-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                ➕ Add New Attribute
                              </h4>
                              <div className="space-y-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                {/* Name Input */}
                                <div>
                                  <label className="text-xs font-bold text-slate-400 mb-1 block">ATTRIBUTE NAME</label>
                                  <input
                                    type="text"
                                    placeholder="e.g., RAM, Color, Size"
                                    value={newAttribute[category._id]?.name || ""}
                                    onChange={(e) =>
                                      setNewAttribute((prev) => ({
                                        ...prev,
                                        [category._id]: {
                                          ...prev[category._id],
                                          name: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full border-2 border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium text-sm"
                                  />
                                </div>

                                {/* Type Select */}
                                <div>
                                  <label className="text-xs font-bold text-slate-400 mb-1 block">TYPE</label>
                                  <select
                                    value={newAttribute[category._id]?.type || "text"}
                                    onChange={(e) =>
                                      setNewAttribute((prev) => ({
                                        ...prev,
                                        [category._id]: {
                                          ...prev[category._id],
                                          type: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full border-2 border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium text-sm"
                                  >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="select">Dropdown</option>
                                    <option value="multiselect">Multi-Select</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="date">Date</option>
                                  </select>
                                </div>

                                {/* Required Checkbox */}
                                <div className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                                  <input
                                    type="checkbox"
                                    checked={newAttribute[category._id]?.required || false}
                                    onChange={(e) =>
                                      setNewAttribute((prev) => ({
                                        ...prev,
                                        [category._id]: {
                                          ...prev[category._id],
                                          required: e.target.checked,
                                        },
                                      }))
                                    }
                                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <label className="text-sm font-medium text-slate-300">Required Field</label>
                                </div>

                                {/* Add Attribute Button */}
                                <button
                                  type="button"
                                  onClick={() => handleAddAttribute(category._id)}
                                  className="w-full px-3 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-bold transition-all text-sm flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Attribute
                                </button>
                              </div>
                            </div>

                            {/* Save Attributes Button */}
                            <button
                              onClick={() => handleSaveAttributes(category)}
                              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-bold transition-all text-sm flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Save All Attributes
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
