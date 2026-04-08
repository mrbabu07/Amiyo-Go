import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Search, Edit2, Trash2, Settings, ChevronDown, ChevronUp, Save, X, Check, AlertCircle, Package } from "lucide-react";
import { getCurrentUserToken } from "../../utils/auth";

export default function AdminCategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
      setCategories(res.data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 shadow-medium sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-soft">
                <Package className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">
                  Category Management
                </h1>
                <p className="text-primary-100 mt-1 font-semibold">
                  Manage all product categories and attributes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-error-50 border-2 border-error-300 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
            <p className="text-error-700 font-bold flex-1">{error}</p>
            <button
              onClick={fetchCategories}
              className="px-4 py-2 bg-error-600 text-white rounded hover:bg-error-700 font-bold text-sm transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-4 w-5 h-5 text-primary-400 group-focus-within:text-primary-600 transition-colors" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white text-gray-900 font-semibold placeholder-gray-400 shadow-soft transition-all"
            />
          </div>
        </div>

        {/* Stats Bar - Horizontal */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-soft border border-gray-100 hover:shadow-medium transition-all">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Categories</p>
            <p className="text-4xl font-black text-primary-600 mt-2">{categories.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-soft border border-gray-100 hover:shadow-medium transition-all">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">With Attributes</p>
            <p className="text-4xl font-black text-secondary-600 mt-2">
              {categories.filter(c => c.attributes?.length > 0).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-soft border border-gray-100 hover:shadow-medium transition-all">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Active</p>
            <p className="text-4xl font-black text-success-600 mt-2">
              {categories.filter(c => c.isActive !== false).length}
            </p>
          </div>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-400 border-t-primary-600 mb-6"></div>
            <p className="text-gray-600 font-bold text-lg">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 font-bold text-lg">No categories found</p>
            <p className="text-gray-500 mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((category, idx) => (
              <CategoryRow
                key={category._id}
                category={category}
                index={idx}
                isExpanded={expandedCategory === category._id}
                onToggleExpand={() =>
                  setExpandedCategory(
                    expandedCategory === category._id ? null : category._id
                  )
                }
                onRefresh={fetchCategories}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({ category, index, isExpanded, onToggleExpand, onRefresh }) {
  const [attributes, setAttributes] = useState(category.attributes || []);
  const [newAttribute, setNewAttribute] = useState({
    name: "",
    type: "text",
    options: [],
    required: false,
  });
  const [optionInput, setOptionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all overflow-hidden border border-gray-100">
      {/* Horizontal Header */}
      <div
        onClick={onToggleExpand}
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
      >
        <div className="flex items-center justify-between gap-6">
          {/* Left Section - Category Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Index Badge */}
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-black text-lg flex-shrink-0">
              {index + 1}
            </div>

            {/* Category Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-gray-900 truncate hover:text-primary-600 transition-colors">
                {category.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 font-semibold">ID: {category._id.slice(0, 8)}...</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  category.isActive !== false
                    ? "bg-success-100 text-success-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {category.isActive !== false ? "✓ Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Section - Stats */}
          <div className="flex items-center gap-8 px-6 border-l border-r border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 font-bold uppercase">Attributes</p>
              <p className="text-3xl font-black text-primary-600">{attributes.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-bold uppercase">Commission</p>
              <p className="text-3xl font-black text-accent-600">{category.commissionRate || 0}%</p>
            </div>
          </div>

          {/* Right Section - Action Button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-3 bg-gray-100 hover:bg-primary-100 text-gray-600 hover:text-primary-600 rounded-full transition-all"
            >
              {isExpanded ? (
                <ChevronUp className="w-6 h-6" />
              ) : (
                <ChevronDown className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 bg-gray-50 space-y-6 border-t border-gray-100">
          {/* Success Message */}
          {message && (
            <div className="p-4 bg-success-50 border border-success-300 rounded-lg flex items-center gap-3">
              <Check className="w-5 h-5 text-success-600" />
              <p className="text-success-700 font-bold">{message}</p>
            </div>
          )}

          {/* Attributes Section */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
              Attributes ({attributes.length})
            </h4>

            {attributes.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">No attributes yet. Add one below.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {attributes.map((attr, attrIdx) => (
                  <AttributeEditor
                    key={attr._id}
                    attribute={attr}
                    index={attrIdx}
                    onUpdate={(field, value) => {
                      const updated = [...attributes];
                      updated[attrIdx] = { ...updated[attrIdx], [field]: value };
                      setAttributes(updated);
                    }}
                    onDelete={() => {
                      setAttributes(attributes.filter((_, i) => i !== attrIdx));
                    }}
                    onAddOption={(option) => {
                      const updated = [...attributes];
                      updated[attrIdx].options = [
                        ...(updated[attrIdx].options || []),
                        option,
                      ];
                      setAttributes(updated);
                    }}
                    onRemoveOption={(optIdx) => {
                      const updated = [...attributes];
                      updated[attrIdx].options = updated[attrIdx].options.filter(
                        (_, i) => i !== optIdx
                      );
                      setAttributes(updated);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add New Attribute */}
          <AddAttributeForm
            newAttribute={newAttribute}
            setNewAttribute={setNewAttribute}
            optionInput={optionInput}
            setOptionInput={setOptionInput}
            onAdd={() => {
              if (!newAttribute.name.trim()) {
                alert("Attribute name is required");
                return;
              }
              setAttributes([
                ...attributes,
                {
                  _id: Date.now().toString(),
                  ...newAttribute,
                },
              ]);
              setNewAttribute({
                name: "",
                type: "text",
                options: [],
                required: false,
              });
            }}
          />

          {/* Save Button */}
          <button
            onClick={async () => {
              setSaving(true);
              setMessage("");
              try {
                const token = await getCurrentUserToken();
                if (!token) {
                  alert("Authentication required. Please log in again.");
                  setSaving(false);
                  return;
                }
                await axios.put(
                  `${import.meta.env.VITE_API_URL}/categories/${category._id}`,
                  { attributes },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                setMessage("✓ Attributes saved successfully!");
                setTimeout(() => setMessage(""), 3000);
                onRefresh();
              } catch (error) {
                console.error("Error saving attributes:", error);
                alert("Error saving attributes: " + (error.response?.data?.error || error.message));
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-bold transition-all flex items-center justify-center gap-2 shadow-soft"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function AttributeEditor({
  attribute,
  index,
  onUpdate,
  onDelete,
  onAddOption,
  onRemoveOption,
}) {
  const [optionInput, setOptionInput] = useState("");

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-all space-y-4">
      {/* Header with Index */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-7 h-7 bg-primary-100 rounded flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
            {index + 1}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Name</label>
              <input
                type="text"
                value={attribute.name}
                onChange={(e) => onUpdate("name", e.target.value)}
                className="input-field text-sm"
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
              <select
                value={attribute.type}
                onChange={(e) => onUpdate("type", e.target.value)}
                className="input-field text-sm"
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
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="p-2 text-error-600 hover:bg-error-50 rounded transition-all"
          title="Delete attribute"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Required Checkbox */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
        <input
          type="checkbox"
          checked={attribute.required || false}
          onChange={(e) => onUpdate("required", e.target.checked)}
          className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
        />
        <label className="text-sm font-medium text-gray-700 cursor-pointer">
          Mark as Required Field
        </label>
      </div>

      {/* Options Section (for select/multiselect) */}
      {(attribute.type === "select" || attribute.type === "multiselect") && (
        <div className="border-t border-gray-200 pt-4">
          <label className="text-xs font-semibold text-gray-600 mb-3 block">
            Options
          </label>

          {/* Existing Options */}
          {attribute.options && attribute.options.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attribute.options.map((opt, optIdx) => (
                <div
                  key={optIdx}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 text-xs rounded-full border border-primary-300 hover:bg-primary-200 transition-all group"
                >
                  <span className="font-medium">{opt}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveOption(optIdx)}
                    className="text-primary-600 hover:text-error-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
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
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && optionInput.trim()) {
                  onAddOption(optionInput.trim());
                  setOptionInput("");
                }
              }}
              className="input-field text-sm"
              placeholder="Add option..."
            />
            <button
              type="button"
              onClick={() => {
                if (optionInput.trim()) {
                  onAddOption(optionInput.trim());
                  setOptionInput("");
                }
              }}
              className="px-4 py-2 bg-accent-500 text-white rounded hover:bg-accent-600 font-bold transition-all text-sm"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAttributeForm({
  newAttribute,
  setNewAttribute,
  optionInput,
  setOptionInput,
  onAdd,
}) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
        Add New Attribute
      </h4>
      <div className="space-y-4 bg-gray-50 p-5 rounded-lg border border-gray-200">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
            Attribute Name
          </label>
          <input
            type="text"
            placeholder="e.g., RAM, Color, Size, Brand..."
            value={newAttribute.name}
            onChange={(e) =>
              setNewAttribute({ ...newAttribute, name: e.target.value })
            }
            className="input-field text-sm"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
            Attribute Type
          </label>
          <select
            value={newAttribute.type}
            onChange={(e) =>
              setNewAttribute({ ...newAttribute, type: e.target.value })
            }
            className="input-field text-sm"
          >
            <option value="text">Text (Free text input)</option>
            <option value="number">Number (Numeric values)</option>
            <option value="select">Dropdown (Single choice)</option>
            <option value="multiselect">Multi-Select (Multiple choices)</option>
            <option value="checkbox">Checkbox (Yes/No)</option>
            <option value="date">Date (Date picker)</option>
          </select>
        </div>

        {/* Required */}
        <div className="flex items-center gap-3 p-3 bg-white rounded border border-gray-200">
          <input
            type="checkbox"
            checked={newAttribute.required}
            onChange={(e) =>
              setNewAttribute({ ...newAttribute, required: e.target.checked })
            }
            className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
          />
          <label className="text-sm font-medium text-gray-700 cursor-pointer">
            Mark as Required Field
          </label>
        </div>

        {/* Add Button */}
        <button
          onClick={onAdd}
          className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </button>
      </div>
    </div>
  );
}
