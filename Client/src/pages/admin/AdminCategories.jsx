import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getCategories,
  createCategory,
  deleteCategory,
  updateCategoryCommission,
} from "../../services/api";
import Loading from "../../components/Loading";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", slug: "", commissionRate: 0 });
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // commission editing: { [categoryId]: string }
  const [commissionEdits, setCommissionEdits] = useState({});
  const [savingCommission, setSavingCommission] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCategory(formData);
      setFormData({ name: "", slug: "", commissionRate: 0 });
      setShowForm(false);
      fetchCategories();
      toast.success("Category created");
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
      setDeleteId(null);
      toast.success("Category deleted");
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleCommissionChange = (id, value) => {
    setCommissionEdits((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveCommission = async (category) => {
    const raw = commissionEdits[category._id];
    const rate = parseFloat(raw);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Commission must be 0–100");
      return;
    }
    setSavingCommission((prev) => ({ ...prev, [category._id]: true }));
    try {
      await updateCategoryCommission(category._id, rate);
      // Update local state instantly — no full reload
      setCategories((prev) =>
        prev.map((c) => (c._id === category._id ? { ...c, commissionRate: rate } : c))
      );
      setCommissionEdits((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
      toast.success(`Commission set to ${rate}% for "${category.name}"`);
    } catch (error) {
      console.error("Failed to update commission:", error);
      toast.error("Failed to update commission");
    } finally {
      setSavingCommission((prev) => ({ ...prev, [category._id]: false }));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Categories & Commission</h1>
                <p className="text-gray-600">{categories.length} categories total</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                showForm
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {showForm ? "Cancel" : "+ Add Category"}
            </button>
          </div>
          
          {/* Commission Info Banner */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Commission System</h3>
                <p className="text-sm text-blue-800">
                  Set commission rates for each category. When a product is sold, the platform takes the commission percentage and the vendor receives the remaining amount. 
                  <span className="font-medium"> Example: 10% commission on ৳1000 = ৳100 to platform, ৳900 to vendor.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Category Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Men's Fashion"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  placeholder="e.g., mens"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">URL-friendly identifier</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Platform commission (0-100%)</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Category"}
            </button>
          </form>
        )}

        {/* Categories Table */}
        {categories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">Create your first category to organize products</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Add Category
            </button>
          </div>
        ) : (
          <>
            {/* Commission Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Average Commission</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(categories.reduce((sum, c) => sum + (c.commissionRate || 0), 0) / categories.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Highest Commission</p>
                <p className="text-2xl font-bold text-red-600">
                  {Math.max(...categories.map(c => c.commissionRate || 0))}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">Categories with Commission</p>
                <p className="text-2xl font-bold text-green-600">
                  {categories.filter(c => (c.commissionRate || 0) > 0).length} / {categories.length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-52">Commission (%)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => {
                  const editVal = commissionEdits[category._id];
                  const displayVal = editVal !== undefined ? editVal : (category.commissionRate ?? 0).toString();
                  const isDirty = editVal !== undefined;
                  const isSaving = savingCommission[category._id];

                  return (
                    <tr key={category._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{category.name}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">/{category.slug}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          category.isActive !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {category.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={displayVal}
                            onChange={(e) => handleCommissionChange(category._id, e.target.value)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-gray-400 text-sm">%</span>
                          {isDirty && (
                            <button
                              onClick={() => handleSaveCommission(category)}
                              disabled={isSaving}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </button>
                          )}
                        </div>
                        {/* Commission breakdown example */}
                        {parseFloat(displayVal) > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            On ৳1000: Platform ৳{(1000 * parseFloat(displayVal) / 100).toFixed(0)}, Vendor ৳{(1000 - (1000 * parseFloat(displayVal) / 100)).toFixed(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteId(category._id)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Category?</h3>
            <p className="text-gray-600 text-center mb-6">This may affect products in this category.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
