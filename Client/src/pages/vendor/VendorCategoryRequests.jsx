import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  FolderTree,
  Layers3,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  buildCategoryRequestOptions,
  buildRootCategoryGroups,
  findCategoryRequestOption,
  getCategoryPathLabel,
  normalizeCategoryId,
} from "../../utils/vendorCategoryRequests";
import { API_BASE_URL } from "../../utils/url";

const API_URL = API_BASE_URL;

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
      STATUS_STYLES[status] || "bg-slate-50 text-slate-600 ring-slate-200"
    }`}
  >
    {status || "unknown"}
  </span>
);

const getRequestCategoryKey = (request = {}) => {
  const requestedId = normalizeCategoryId(request.requestedCategoryId);
  if (requestedId) return `id:${requestedId}`;
  return `name:${String(request.categoryName || "").trim().toLowerCase()}`;
};

const getOptionCategoryKey = (option = {}) => `id:${option.id}`;

export default function VendorCategoryRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRootId, setSelectedRootId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    categoryId: "",
    description: "",
    reason: "",
  });

  const categoryOptions = useMemo(
    () => buildCategoryRequestOptions(categories),
    [categories],
  );

  const rootGroups = useMemo(
    () => buildRootCategoryGroups(categoryOptions),
    [categoryOptions],
  );

  const selectedCategory = useMemo(
    () => findCategoryRequestOption(categoryOptions, formData.categoryId),
    [categoryOptions, formData.categoryId],
  );

  const requestStatusByCategory = useMemo(() => {
    const statusMap = new Map();
    requests.forEach((request) => {
      if (request.status === "pending" || request.status === "approved") {
        statusMap.set(getRequestCategoryKey(request), request.status);
      }
    });
    return statusMap;
  }, [requests]);

  const activeGroup = rootGroups.find((group) => group.id === selectedRootId) || rootGroups[0];

  const visibleCategories = useMemo(() => {
    const groupId = activeGroup?.id || "";
    const query = searchTerm.trim().toLowerCase();

    return categoryOptions.filter((category) => {
      const matchesGroup = !groupId || category.rootId === groupId;
      const matchesSearch =
        !query ||
        category.name.toLowerCase().includes(query) ||
        category.pathLabel.toLowerCase().includes(query) ||
        category.slug?.toLowerCase().includes(query);

      return matchesGroup && matchesSearch;
    });
  }, [activeGroup?.id, categoryOptions, searchTerm]);

  useEffect(() => {
    fetchRequests();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedRootId && rootGroups.length > 0) {
      setSelectedRootId(rootGroups[0].id);
    }
  }, [rootGroups, selectedRootId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories?active=true`);
      const data = await res.json();
      if (res.ok) {
        setCategories(data.data || []);
      } else {
        toast.error(data.error || "Failed to load categories");
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/category-requests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data.data || []);
      } else {
        toast.error(data.error || "Failed to load category requests");
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("Failed to load category requests");
    } finally {
      setLoading(false);
    }
  };

  const selectRootGroup = (groupId) => {
    setSelectedRootId(groupId);
    setSearchTerm("");
    if (selectedCategory && selectedCategory.rootId !== groupId) {
      setFormData((current) => ({ ...current, categoryId: "" }));
    }
  };

  const selectCategory = (category) => {
    const status = requestStatusByCategory.get(getOptionCategoryKey(category));
    if (status === "pending") {
      toast.error("You already have a pending request for this category");
      return;
    }
    if (status === "approved") {
      toast.error("This category is already approved for your store");
      return;
    }
    setFormData((current) => ({ ...current, categoryId: category.id }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCategory) {
      toast.error("Please select the exact category you need");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please explain why you need this category");
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryPath: selectedCategory.pathLabel,
        rootCategoryId: selectedCategory.rootId,
        rootCategoryName: selectedCategory.rootName,
        parentCategoryId: selectedCategory.parentCategoryId || null,
        parentCategoryName: selectedCategory.parentName || "",
        description: formData.description.trim(),
        reason: formData.reason.trim(),
      };

      const res = await fetch(`${API_URL}/category-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Category request submitted successfully");
        setFormData({ categoryId: "", description: "", reason: "" });
        setSearchTerm("");
        setShowForm(false);
        fetchRequests();
      } else {
        toast.error(data.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Failed to submit request:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!confirm("Delete this category request?")) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/category-requests/${requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Request deleted");
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete request");
      }
    } catch (error) {
      console.error("Failed to delete request:", error);
      toast.error("Failed to delete request");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                to="/vendor/dashboard"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                aria-label="Back to vendor dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                  Seller center
                </p>
                <h1 className="text-2xl font-bold text-slate-950">Category access requests</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a main group, review its subcategories, and request the exact category your products need.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                showForm
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
              }`}
            >
              {showForm ? "Close request form" : "Request category access"}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Available main groups</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{rootGroups.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Selectable categories</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{categoryOptions.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Your requests</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{requests.length}</p>
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <FolderTree className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <h2 className="text-sm font-semibold text-blue-950">How this works</h2>
              <p className="mt-1 text-sm text-blue-800">
                First select the main group, then choose the exact subcategory under that group. Admin approval gives
                your store access to the selected category for product listing.
              </p>
            </div>
          </div>
        </section>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-950">New category request</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pick the group first so the subcategory list stays focused and easy to scan.
              </p>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-orange-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Main/group category</h3>
                </div>

                {rootGroups.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No active categories are available. Please contact admin before requesting access.
                  </div>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {rootGroups.map((group) => {
                      const isActive = activeGroup?.id === group.id;
                      return (
                        <button
                          type="button"
                          key={group.id}
                          onClick={() => selectRootGroup(group.id)}
                          className={`w-full rounded-lg border p-3 text-left transition ${
                            isActive
                              ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100"
                              : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-950">{group.name}</span>
                            {isActive && <CheckCircle2 className="h-4 w-4 text-orange-600" />}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {group.subcategoryCount} subcategories, {group.categoryCount} total options
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Select requested category</h3>
                      <p className="text-xs text-slate-500">
                        {activeGroup
                          ? `Showing categories inside ${activeGroup.name}`
                          : "Choose a main group to see its subcategories"}
                      </p>
                    </div>
                    <div className="relative sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search subcategory"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                    {visibleCategories.length === 0 ? (
                      <div className="p-5 text-sm text-slate-500">
                        No categories found in this group.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {visibleCategories.map((category) => {
                          const isSelected = selectedCategory?.id === category.id;
                          const status = requestStatusByCategory.get(getOptionCategoryKey(category));
                          const disabled = status === "pending" || status === "approved";

                          return (
                            <button
                              type="button"
                              key={category.id}
                              disabled={disabled}
                              onClick={() => selectCategory(category)}
                              className={`flex w-full items-start gap-3 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                isSelected ? "bg-orange-50" : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  isSelected
                                    ? "border-orange-600 bg-orange-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-950">{category.name}</span>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    {category.depth === 0 ? "Main group" : category.depth === 1 ? "Section" : "Subcategory"}
                                  </span>
                                  {status && <StatusBadge status={status} />}
                                </span>
                                <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                                  {category.path.map((item, index) => (
                                    <span key={item._id} className="inline-flex items-center gap-1">
                                      {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                                      {item.name}
                                    </span>
                                  ))}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {selectedCategory && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                      Selected request path
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">{selectedCategory.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedCategory.pathLabel}</p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Product description</span>
                    <textarea
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      rows={4}
                      placeholder="Example: Fresh vegetables, rice, spices, household grocery items"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Reason for request <span className="text-rose-500">*</span>
                    </span>
                    <textarea
                      value={formData.reason}
                      onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                      rows={4}
                      required
                      placeholder="Tell admin what you sell and why this category matches your shop"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Admin will review your category path, seller profile, and product fit before approval.
              </p>
              <button
                type="submit"
                disabled={submitting || !selectedCategory}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>
        )}

        {requests.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
            <FolderTree className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950">No category requests yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Request access by choosing a main group and selecting the exact category that matches your products.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Start request
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Request history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Track pending approvals and rejected category access requests.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Category path</th>
                    <th className="px-5 py-3 text-left">Main group</th>
                    <th className="px-5 py-3 text-left">Reason</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Submitted</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request._id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{request.categoryName}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCategoryPathLabel(request)}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {request.rootCategoryName || "Not captured"}
                      </td>
                      <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                        <span className="line-clamp-2">{request.reason || request.description || "No reason provided"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={request.status} />
                        {request.adminNote && (
                          <p className="mt-1 max-w-xs text-xs text-slate-500">{request.adminNote}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {request.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(request._id)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        ) : request.status === "approved" ? (
                          <span className="text-sm font-semibold text-emerald-700">Access granted</span>
                        ) : (
                          <span className="text-sm text-slate-500">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
