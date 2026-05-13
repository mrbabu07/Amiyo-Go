import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import DynamicCategoryForm from "@/components/admin/DynamicCategoryForm";
import CategoryList from "@/components/admin/CategoryList";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  Layers3,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { getCurrentUserToken } from "../../utils/auth";
import { getAdminCommissionSummary } from "../../services/api";

const apiBase = import.meta.env.VITE_API_URL;

const iconOptions = [
  ["", "Auto from name"],
  ["fashion", "Fashion"],
  ["electronics", "Electronics"],
  ["laptop", "Computer"],
  ["home", "Home"],
  ["grocery", "Grocery"],
  ["restaurant", "Restaurant & Food"],
  ["homemade", "Homemade"],
  ["resell", "Resell Market"],
  ["fish", "Fish & Seafood"],
  ["vegetable", "Vegetables"],
  ["health", "Health"],
  ["pharmacy", "Pharmacy"],
  ["beauty", "Beauty"],
  ["gaming", "Gaming"],
  ["watch", "Watches & Bags"],
  ["sports", "Sports"],
  ["baby", "Mother & Baby"],
  ["car", "Automotive"],
  ["stationery", "Stationery & Office"],
  ["book", "Books"],
  ["pet", "Pet Supplies"],
];

const attributeTypes = ["text", "number", "select", "multiselect", "checkbox", "date"];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function buildCategoryRows(categories) {
  const activeSorted = [...categories].sort(
    (a, b) =>
      (a.displayOrder || 0) - (b.displayOrder || 0) ||
      a.name.localeCompare(b.name),
  );
  const byParent = activeSorted.reduce((acc, category) => {
    const parentKey = category.parentId ? category.parentId.toString() : "root";
    acc[parentKey] = [...(acc[parentKey] || []), category];
    return acc;
  }, {});

  const rows = [];
  const walk = (parentKey = "root", level = 0) => {
    (byParent[parentKey] || []).forEach((category) => {
      const id = category._id.toString();
      rows.push({
        ...category,
        level,
        childCount: (byParent[id] || []).length,
      });
      walk(id, level + 1);
    });
  };

  walk();
  return rows;
}

function Section({ title, description, count, open, onToggle, action, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 text-left hover:bg-gray-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-[#1e7098]/10 p-2 text-[#1e7098]">
            {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
              {count !== undefined && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                  {count}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </button>
      {open && (
        <div className="p-5">
          {action && <div className="mb-5 flex justify-end">{action}</div>}
          {children}
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, tone = "bg-sky-50 text-sky-700" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-lg px-3 py-1 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminDynamicCategories() {
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [regularCategories, setRegularCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activePanel, setActivePanel] = useState("display");
  const [showDynamicForm, setShowDynamicForm] = useState(false);
  const [editingDynamicCategory, setEditingDynamicCategory] = useState(null);
  const [showRegularForm, setShowRegularForm] = useState(false);
  const [creatingRegular, setCreatingRegular] = useState(false);
  const [editingCommission, setEditingCommission] = useState({});
  const [editingMinimumCommission, setEditingMinimumCommission] = useState({});
  const [savingCommission, setSavingCommission] = useState({});
  const [commissionWindow, setCommissionWindow] = useState(7);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [visualEdits, setVisualEdits] = useState({});
  const [savingVisual, setSavingVisual] = useState({});
  const [editingAttributes, setEditingAttributes] = useState({});
  const [newAttribute, setNewAttribute] = useState({});
  const [optionInput, setOptionInput] = useState({});
  const [sectionsOpen, setSectionsOpen] = useState({
    overview: true,
    create: false,
    storefront: true,
    dynamic: false,
  });
  const [regularForm, setRegularForm] = useState({
    name: "",
    slug: "",
    parentId: "",
    description: "",
    icon: "",
    image: "",
    displayOrder: 0,
    commissionRate: 0,
    minimumCommissionRate: 0,
  });

  useEffect(() => {
    fetchAllCategories();
  }, []);

  useEffect(() => {
    fetchCommissionSummary(commissionWindow);
  }, [commissionWindow]);

  const categoryRows = useMemo(() => buildCategoryRows(regularCategories), [regularCategories]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categoryRows;
    return categoryRows.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query),
    );
  }, [categoryRows, searchTerm]);

  const categoryStats = useMemo(() => {
    const rootCount = regularCategories.filter((category) => !category.parentId).length;
    const inactiveCount = regularCategories.filter((category) => category.isActive === false).length;
    const attributeCount = regularCategories.reduce(
      (sum, category) => sum + (category.attributes?.length || 0),
      0,
    );

    return {
      rootCount,
      inactiveCount,
      attributeCount,
      dynamicCount: dynamicCategories.length,
    };
  }, [dynamicCategories.length, regularCategories]);

  const fetchAllCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const [dynamicRes, regularRes] = await Promise.all([
        axios.get(`${apiBase}/dynamic-categories`),
        axios.get(`${apiBase}/categories`),
      ]);

      setDynamicCategories(dynamicRes.data.data || []);
      setRegularCategories(regularRes.data.data || []);
    } catch (fetchError) {
      console.error("Error fetching categories:", fetchError);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionSummary = async (days = commissionWindow) => {
    try {
      setCommissionLoading(true);
      const response = await getAdminCommissionSummary({ days });
      setCommissionSummary(response.data.data || null);
    } catch (summaryError) {
      console.error("Error fetching commission summary:", summaryError);
      setCommissionSummary(null);
    } finally {
      setCommissionLoading(false);
    }
  };

  const toggleSection = (section) => {
    setSectionsOpen((current) => ({ ...current, [section]: !current[section] }));
  };

  const handleDynamicFormClose = () => {
    setShowDynamicForm(false);
    setEditingDynamicCategory(null);
  };

  const handleDynamicFormSuccess = () => {
    fetchAllCategories();
    handleDynamicFormClose();
  };

  const handleDeleteDynamic = async (categoryId) => {
    if (!window.confirm("Delete this dynamic category?")) return;

    try {
      const token = await getCurrentUserToken();
      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      await axios.delete(`${apiBase}/dynamic-categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAllCategories();
    } catch (deleteError) {
      console.error("Error deleting dynamic category:", deleteError);
      alert("Error deleting category");
    }
  };

  const handleDeleteRegularCategory = async (categoryId) => {
    if (!window.confirm("Deactivate this category for storefront and vendors?")) return;

    try {
      const token = await getCurrentUserToken();
      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      await axios.delete(`${apiBase}/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRegularCategories((prev) =>
        prev.map((category) =>
          category._id === categoryId ? { ...category, isActive: false } : category,
        ),
      );
    } catch (deleteError) {
      console.error("Error deleting category:", deleteError);
      alert("Failed to delete category");
    }
  };

  const handleRegularFormChange = (field, value) => {
    setRegularForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" && !prev.slug ? { slug: slugify(value) } : {}),
    }));
  };

  const handleCreateRegularCategory = async (event) => {
    event.preventDefault();

    if (!regularForm.name.trim() || !regularForm.slug.trim()) {
      alert("Category name and slug are required");
      return;
    }

    setCreatingRegular(true);
    try {
      const token = await getCurrentUserToken();
      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      const payload = {
        ...regularForm,
        parentId: regularForm.parentId || null,
        displayOrder: Number(regularForm.displayOrder) || 0,
        commissionRate: Number(regularForm.commissionRate) || 0,
        minimumCommissionRate: Number(regularForm.minimumCommissionRate) || 0,
        isActive: true,
      };

      await axios.post(`${apiBase}/categories`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRegularForm({
        name: "",
        slug: "",
        parentId: "",
        description: "",
        icon: "",
        image: "",
        displayOrder: 0,
        commissionRate: 0,
        minimumCommissionRate: 0,
      });
      setShowRegularForm(false);
      setSectionsOpen((current) => ({ ...current, create: false, storefront: true }));
      fetchAllCategories();
    } catch (createError) {
      console.error("Error creating category:", createError);
      alert(createError.response?.data?.error || "Failed to create category");
    } finally {
      setCreatingRegular(false);
    }
  };

  const handleCommissionChange = (id, value) => {
    setEditingCommission((prev) => ({ ...prev, [id]: value }));
  };

  const handleMinimumCommissionChange = (id, value) => {
    setEditingMinimumCommission((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveCommission = async (category) => {
    const rate = parseFloat(editingCommission[category._id] ?? category.commissionRate ?? 0);
    const minimumRate = parseFloat(
      editingMinimumCommission[category._id] ?? category.minimumCommissionRate ?? 0,
    );

    if (
      Number.isNaN(rate) ||
      Number.isNaN(minimumRate) ||
      rate < 0 ||
      minimumRate < 0 ||
      rate > 100 ||
      minimumRate > 100
    ) {
      alert("Commission rates must be 0-100");
      return;
    }

    setSavingCommission((prev) => ({ ...prev, [category._id]: true }));
    try {
      const token = await getCurrentUserToken();
      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      await axios.put(
        `${apiBase}/categories/${category._id}`,
        { commissionRate: rate, minimumCommissionRate: minimumRate },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await fetchAllCategories();
      fetchCommissionSummary();
      setEditingCommission((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
      setEditingMinimumCommission((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
    } catch (saveError) {
      console.error("Error updating commission:", saveError);
      alert("Failed to update commission");
    } finally {
      setSavingCommission((prev) => ({ ...prev, [category._id]: false }));
    }
  };

  const handleVisualChange = (categoryId, field, value) => {
    setVisualEdits((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value,
      },
    }));
  };

  const handleSaveVisuals = async (category) => {
    const edit = visualEdits[category._id] || {};
    const payload = {
      name: edit.name ?? category.name ?? "",
      slug: edit.slug ?? category.slug ?? "",
      icon: edit.icon ?? category.icon ?? "",
      image: edit.image ?? category.image ?? "",
      displayOrder: Number(edit.displayOrder ?? category.displayOrder ?? 0),
      description: edit.description ?? category.description ?? "",
      parentId: edit.parentId !== undefined ? edit.parentId || null : category.parentId || null,
      isActive:
        edit.isActive !== undefined
          ? edit.isActive === true || edit.isActive === "true"
          : category.isActive !== false,
    };

    if (!payload.name.trim() || !payload.slug.trim()) {
      alert("Category name and slug are required");
      return;
    }

    setSavingVisual((prev) => ({ ...prev, [category._id]: true }));
    try {
      const token = await getCurrentUserToken();
      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      const response = await axios.put(`${apiBase}/categories/${category._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRegularCategories((prev) =>
        prev.map((current) =>
          current._id === category._id ? response.data.data || { ...current, ...payload } : current,
        ),
      );
      setVisualEdits((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
    } catch (saveError) {
      console.error("Error updating category display:", saveError);
      alert("Failed to update category display");
    } finally {
      setSavingVisual((prev) => ({ ...prev, [category._id]: false }));
    }
  };

  const getAttributesForCategory = (category) =>
    editingAttributes[category._id] || category.attributes || [];

  const updateAttribute = (category, attrIndex, field, value) => {
    setEditingAttributes((prev) => {
      const base = prev[category._id] || category.attributes || [];
      return {
        ...prev,
        [category._id]: base.map((attr, index) =>
          index === attrIndex ? { ...attr, [field]: value } : attr,
        ),
      };
    });
  };

  const addAttribute = (category) => {
    const attr = newAttribute[category._id];
    if (!attr?.name?.trim()) {
      alert("Attribute name is required");
      return;
    }

    setEditingAttributes((prev) => {
      const base = prev[category._id] || category.attributes || [];
      return {
        ...prev,
        [category._id]: [
          ...base,
          {
            _id: Date.now().toString(),
            name: attr.name.trim(),
            type: attr.type || "text",
            options: attr.options || [],
            required: attr.required || false,
          },
        ],
      };
    });
    setNewAttribute((prev) => ({
      ...prev,
      [category._id]: { name: "", type: "text", options: [], required: false },
    }));
  };

  const deleteAttribute = (category, attrIndex) => {
    setEditingAttributes((prev) => {
      const base = prev[category._id] || category.attributes || [];
      return {
        ...prev,
        [category._id]: base.filter((_, index) => index !== attrIndex),
      };
    });
  };

  const addOption = (category, attrIndex) => {
    const key = `${category._id}-${attrIndex}`;
    const input = optionInput[key] || "";
    if (!input.trim()) return;

    setEditingAttributes((prev) => {
      const base = prev[category._id] || category.attributes || [];
      return {
        ...prev,
        [category._id]: base.map((attr, index) =>
          index === attrIndex
            ? { ...attr, options: [...(attr.options || []), input.trim()] }
            : attr,
        ),
      };
    });
    setOptionInput((prev) => ({ ...prev, [key]: "" }));
  };

  const removeOption = (category, attrIndex, optionIndex) => {
    setEditingAttributes((prev) => {
      const base = prev[category._id] || category.attributes || [];
      return {
        ...prev,
        [category._id]: base.map((attr, index) =>
          index === attrIndex
            ? { ...attr, options: (attr.options || []).filter((_, optIndex) => optIndex !== optionIndex) }
            : attr,
        ),
      };
    });
  };

  const handleSaveAttributes = async (category) => {
    const attributes = getAttributesForCategory(category);
    try {
      const token = await getCurrentUserToken();
      if (!token) {
        alert("Authentication required. Please log in again.");
        return;
      }

      await axios.put(
        `${apiBase}/categories/${category._id}`,
        { attributes },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setRegularCategories((prev) =>
        prev.map((current) => (current._id === category._id ? { ...current, attributes } : current)),
      );
      setEditingAttributes((prev) => {
        const next = { ...prev };
        delete next[category._id];
        return next;
      });
    } catch (saveError) {
      console.error("Error saving attributes:", saveError);
      alert("Failed to save attributes");
    }
  };

  const openCategory = (category, panel = "display") => {
    setExpandedCategory(expandedCategory === category._id ? null : category._id);
    setActivePanel(panel);
  };

  const renderCreateForm = () => (
    <form onSubmit={handleCreateRegularCategory} className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-gray-900">Create Storefront Category</h3>
          <p className="mt-1 text-sm text-gray-500">
            Use parent category to build Main category, Section, and Product type.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegularForm(false)}
          className="rounded-lg px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100"
        >
          Close
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Name</span>
          <input
            required
            value={regularForm.name}
            onChange={(event) => handleRegularFormChange("name", event.target.value)}
            className="input-field mt-1 text-sm"
            placeholder="Fresh Fish & Seafood"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Slug</span>
          <input
            required
            value={regularForm.slug}
            onChange={(event) => handleRegularFormChange("slug", slugify(event.target.value))}
            className="input-field mt-1 text-sm"
            placeholder="fresh-fish-seafood"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Parent Category</span>
          <select
            value={regularForm.parentId}
            onChange={(event) => handleRegularFormChange("parentId", event.target.value)}
            className="input-field mt-1 text-sm"
          >
            <option value="">Main category</option>
            {categoryRows.map((category) => (
              <option key={category._id} value={category._id}>
                {"--".repeat(category.level)} {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Icon</span>
          <select
            value={regularForm.icon}
            onChange={(event) => handleRegularFormChange("icon", event.target.value)}
            className="input-field mt-1 text-sm"
          >
            {iconOptions.map(([value, label]) => (
              <option key={value || "auto"} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Order</span>
          <input
            type="number"
            value={regularForm.displayOrder}
            onChange={(event) => handleRegularFormChange("displayOrder", event.target.value)}
            className="input-field mt-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Commission %</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={regularForm.commissionRate}
            onChange={(event) => handleRegularFormChange("commissionRate", event.target.value)}
            className="input-field mt-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Minimum Floor %</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={regularForm.minimumCommissionRate}
            onChange={(event) => handleRegularFormChange("minimumCommissionRate", event.target.value)}
            className="input-field mt-1 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-bold uppercase text-gray-500">Image URL</span>
          <input
            type="url"
            value={regularForm.image}
            onChange={(event) => handleRegularFormChange("image", event.target.value)}
            className="input-field mt-1 text-sm"
            placeholder="Optional image for category page"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-gray-500">Description</span>
          <input
            value={regularForm.description}
            onChange={(event) => handleRegularFormChange("description", event.target.value)}
            className="input-field mt-1 text-sm"
            placeholder="Optional storefront description"
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowRegularForm(false)}
          className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={creatingRegular}
          className="rounded-lg bg-[#1e7098] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#15536f] disabled:opacity-50"
        >
          {creatingRegular ? "Creating..." : "Create Category"}
        </button>
      </div>
    </form>
  );

  const renderCategoryDetails = (category) => {
    const visualEdit = visualEdits[category._id] || {};
    const iconValue = visualEdit.icon ?? category.icon ?? "";
    const imageValue = visualEdit.image ?? category.image ?? "";
    const orderValue = visualEdit.displayOrder ?? category.displayOrder ?? 0;
    const descriptionValue = visualEdit.description ?? category.description ?? "";
    const nameValue = visualEdit.name ?? category.name ?? "";
    const slugValue = visualEdit.slug ?? category.slug ?? "";
    const activeValue =
      visualEdit.isActive !== undefined
        ? visualEdit.isActive === true || visualEdit.isActive === "true"
        : category.isActive !== false;
    const parentValue = visualEdit.parentId ?? (category.parentId ? category.parentId.toString() : "");
    const attributes = getAttributesForCategory(category);
    const newAttr = newAttribute[category._id] || { name: "", type: "text", options: [], required: false };
    const commissionValue = editingCommission[category._id] ?? (category.commissionRate ?? 0);
    const minimumCommissionValue =
      editingMinimumCommission[category._id] ?? (category.minimumCommissionRate ?? 0);
    const effectivePreview = Math.max(
      Number(commissionValue || 0),
      Number(minimumCommissionValue || 0),
      Number(category.effectiveCommissionRate || 0),
    );

    return (
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["display", "Update Category", LayoutGrid],
            ["commission", "Commission", SlidersHorizontal],
            ["attributes", "Attributes", Settings],
          ].map(([panel, label, Icon]) => (
            <button
              key={panel}
              type="button"
              onClick={() => setActivePanel(panel)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
                activePanel === panel
                  ? "bg-[#1e7098] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {activePanel === "display" && (
          <div className="rounded-lg bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-[#1e7098]" />
              <div>
                <h3 className="text-base font-black text-gray-900">Update Category Details</h3>
                <p className="text-sm text-gray-500">Edit name, slug, parent, status, display order, icon, image, and description.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Category Name</span>
                <input
                  value={nameValue}
                  onChange={(event) => handleVisualChange(category._id, "name", event.target.value)}
                  className="input-field mt-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Slug</span>
                <input
                  value={slugValue}
                  onChange={(event) => handleVisualChange(category._id, "slug", slugify(event.target.value))}
                  className="input-field mt-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Status</span>
                <select
                  value={activeValue ? "true" : "false"}
                  onChange={(event) => handleVisualChange(category._id, "isActive", event.target.value)}
                  className="input-field mt-1 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Parent Category</span>
                <select
                  value={parentValue}
                  onChange={(event) => handleVisualChange(category._id, "parentId", event.target.value)}
                  className="input-field mt-1 text-sm"
                >
                  <option value="">Main category</option>
                  {categoryRows
                    .filter((parentOption) => parentOption._id !== category._id)
                    .map((parentOption) => (
                      <option key={parentOption._id} value={parentOption._id}>
                        {"--".repeat(parentOption.level)} {parentOption.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Icon</span>
                <select
                  value={iconValue}
                  onChange={(event) => handleVisualChange(category._id, "icon", event.target.value)}
                  className="input-field mt-1 text-sm"
                >
                  {iconOptions.map(([value, label]) => (
                    <option key={value || "auto"} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Display Order</span>
                <input
                  type="number"
                  value={orderValue}
                  onChange={(event) => handleVisualChange(category._id, "displayOrder", event.target.value)}
                  className="input-field mt-1 text-sm"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase text-gray-500">Image URL</span>
                <input
                  type="url"
                  value={imageValue}
                  onChange={(event) => handleVisualChange(category._id, "image", event.target.value)}
                  className="input-field mt-1 text-sm"
                  placeholder="Optional image"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Description</span>
                <input
                  value={descriptionValue}
                  onChange={(event) => handleVisualChange(category._id, "description", event.target.value)}
                  className="input-field mt-1 text-sm"
                  placeholder="Optional description"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveVisuals(category)}
                disabled={savingVisual[category._id]}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f] disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {savingVisual[category._id] ? "Updating..." : "Update Category"}
              </button>
            </div>
          </div>
        )}

        {activePanel === "commission" && (
          <div className="rounded-lg bg-white p-4">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase text-gray-500">Effective Product Rate</p>
                <p className="mt-1 text-2xl font-black text-[#1e7098]">{effectivePreview}%</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase text-gray-500">Own Rate</p>
                <p className="mt-1 text-lg font-black text-gray-900">{category.commissionRate || 0}%</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase text-gray-500">Minimum Floor</p>
                <p className="mt-1 text-lg font-black text-gray-900">{category.minimumCommissionRate || 0}%</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Commission Rate</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionValue}
                    onChange={(event) => handleCommissionChange(category._id, event.target.value)}
                    className="input-field text-sm"
                  />
                  <span className="font-bold text-gray-500">%</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-gray-500">Minimum Floor</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={minimumCommissionValue}
                    onChange={(event) => handleMinimumCommissionChange(category._id, event.target.value)}
                    className="input-field text-sm"
                  />
                  <span className="font-bold text-gray-500">%</span>
                </div>
              </label>
              <button
                type="button"
                onClick={() => handleSaveCommission(category)}
                disabled={
                  savingCommission[category._id] ||
                  (editingCommission[category._id] === undefined &&
                    editingMinimumCommission[category._id] === undefined)
                }
                className="rounded-lg bg-[#1e7098] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#15536f] disabled:opacity-50"
              >
                {savingCommission[category._id] ? "Saving..." : "Save Commission"}
              </button>
            </div>
            <p className="mt-3 text-xs font-medium text-gray-500">
              Minimum floor applies to products inside this category and its child categories. The order stores the effective rate at checkout.
            </p>
          </div>
        )}

        {activePanel === "attributes" && (
          <div className="space-y-4 rounded-lg bg-white p-4">
            {attributes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No attributes yet. Add one below.
              </div>
            ) : (
              <div className="space-y-3">
                {attributes.map((attr, attrIndex) => (
                  <div key={attr._id || attrIndex} className="rounded-lg border border-gray-200 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                      <input
                        value={attr.name}
                        onChange={(event) => updateAttribute(category, attrIndex, "name", event.target.value)}
                        className="input-field text-sm"
                        placeholder="Attribute name"
                      />
                      <select
                        value={attr.type}
                        onChange={(event) => updateAttribute(category, attrIndex, "type", event.target.value)}
                        className="input-field text-sm"
                      >
                        {attributeTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteAttribute(category, attrIndex)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Delete attribute"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={attr.required || false}
                        onChange={(event) => updateAttribute(category, attrIndex, "required", event.target.checked)}
                        className="h-4 w-4 rounded text-[#1e7098]"
                      />
                      Required field
                    </label>

                    {(attr.type === "select" || attr.type === "multiselect") && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <div className="mb-2 flex flex-wrap gap-2">
                          {(attr.options || []).map((option, optionIndex) => (
                            <button
                              key={`${option}-${optionIndex}`}
                              type="button"
                              onClick={() => removeOption(category, attrIndex, optionIndex)}
                              className="rounded-full bg-[#1e7098]/10 px-3 py-1 text-xs font-bold text-[#1e7098] hover:bg-red-50 hover:text-red-600"
                              title="Remove option"
                            >
                              {option} x
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={optionInput[`${category._id}-${attrIndex}`] || ""}
                            onChange={(event) =>
                              setOptionInput((prev) => ({
                                ...prev,
                                [`${category._id}-${attrIndex}`]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addOption(category, attrIndex);
                              }
                            }}
                            className="input-field text-sm"
                            placeholder="Add option"
                          />
                          <button
                            type="button"
                            onClick={() => addOption(category, attrIndex)}
                            className="rounded-lg bg-gray-100 px-3 text-sm font-bold text-gray-700 hover:bg-gray-200"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-black text-gray-900">Add Attribute</p>
              <div className="grid gap-3 md:grid-cols-[1fr_160px_auto_auto]">
                <input
                  value={newAttr.name || ""}
                  onChange={(event) =>
                    setNewAttribute((prev) => ({
                      ...prev,
                      [category._id]: { ...newAttr, name: event.target.value },
                    }))
                  }
                  className="input-field text-sm"
                  placeholder="e.g., Size, Source, Condition"
                />
                <select
                  value={newAttr.type || "text"}
                  onChange={(event) =>
                    setNewAttribute((prev) => ({
                      ...prev,
                      [category._id]: { ...newAttr, type: event.target.value },
                    }))
                  }
                  className="input-field text-sm"
                >
                  {attributeTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={newAttr.required || false}
                    onChange={(event) =>
                      setNewAttribute((prev) => ({
                        ...prev,
                        [category._id]: { ...newAttr, required: event.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded text-[#1e7098]"
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => addAttribute(category)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveAttributes(category)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f]"
              >
                <Check className="h-4 w-4" />
                Save Attributes
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#1e7098]/10 p-3 text-[#1e7098]">
                <Layers3 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900">Category Control</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage storefront hierarchy, vendor product fields, display settings, and commissions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  fetchAllCategories();
                  fetchCommissionSummary();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRegularForm(true);
                  setSectionsOpen((current) => ({ ...current, create: true }));
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f]"
              >
                <Plus className="h-4 w-4" />
                Add Storefront Category
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="flex-1 text-sm font-bold">{error}</p>
            <button onClick={fetchAllCategories} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
              Retry
            </button>
          </div>
        )}

        <Section
          title="Overview"
          description="Quick health check for the category system."
          open={sectionsOpen.overview}
          onToggle={() => toggleSection("overview")}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Categories" value={regularCategories.length} />
            <StatCard label="Main Categories" value={categoryStats.rootCount} tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Attributes" value={categoryStats.attributeCount} tone="bg-violet-50 text-violet-700" />
            <StatCard label="Inactive" value={categoryStats.inactiveCount} tone="bg-rose-50 text-rose-700" />
          </div>
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Commission Earnings</h3>
                <p className="text-sm text-gray-500">Admin commission captured from product-level order snapshots.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[7, 15, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setCommissionWindow(days)}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${
                      commissionWindow === days
                        ? "bg-[#1e7098] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>
            {commissionLoading ? (
              <div className="rounded-lg bg-gray-50 p-5 text-sm font-bold text-gray-500">
                Loading commission report...
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-5">
                <StatCard label="Commission Earned" value={formatMoney(commissionSummary?.totalCommission)} tone="bg-[#1e7098]/10 text-[#1e7098]" />
                <StatCard label="Gross Sales" value={formatMoney(commissionSummary?.grossSales)} tone="bg-emerald-50 text-emerald-700" />
                <StatCard label="Vendor Earnings" value={formatMoney(commissionSummary?.vendorEarnings)} tone="bg-amber-50 text-amber-700" />
                <StatCard label="Orders" value={commissionSummary?.orders || 0} tone="bg-violet-50 text-violet-700" />
                <StatCard label="Items Sold" value={commissionSummary?.items || 0} tone="bg-gray-100 text-gray-700" />
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Create Category"
          description="Add a main category, child section, or product type."
          open={sectionsOpen.create}
          onToggle={() => toggleSection("create")}
        >
          {showRegularForm ? (
            renderCreateForm()
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm font-semibold text-gray-600">
                Open the create form when you need to add a new category node.
              </p>
              <button
                type="button"
                onClick={() => setShowRegularForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f]"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
          )}
        </Section>

        <Section
          title="Storefront Category Tree"
          description="The hierarchy used by homepage, dropdown menu, category pages, and vendors."
          count={filteredRows.length}
          open={sectionsOpen.storefront}
          onToggle={() => toggleSection("storefront")}
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium focus:border-[#1e7098] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/20"
                placeholder="Search by category name or slug"
              />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              Click a row to expand controls.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl bg-white p-10 text-center text-sm font-bold text-gray-500">
              Loading categories...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm font-bold text-gray-500">
              No categories found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {filteredRows.map((category) => {
                const isExpanded = expandedCategory === category._id;
                const directVal = editingCommission[category._id] ?? (category.commissionRate ?? 0);
                const floorVal =
                  editingMinimumCommission[category._id] ?? (category.minimumCommissionRate ?? 0);
                const displayVal = Math.max(
                  Number(directVal || 0),
                  Number(floorVal || 0),
                  Number(category.effectiveCommissionRate || 0),
                );
                const hasDraft =
                  visualEdits[category._id] !== undefined ||
                  editingCommission[category._id] !== undefined ||
                  editingMinimumCommission[category._id] !== undefined ||
                  editingAttributes[category._id] !== undefined;

                return (
                  <div key={category._id} className="border-b border-gray-100 last:border-b-0">
                    <div
                      className={`grid gap-3 px-4 py-3 transition hover:bg-gray-50 md:grid-cols-[1fr_120px_120px_220px] md:items-center ${
                        isExpanded ? "bg-[#1e7098]/5" : "bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openCategory(category)}
                        className="flex min-w-0 items-center gap-3 text-left"
                        style={{ paddingLeft: `${category.level * 18}px` }}
                      >
                        <span className="rounded-md bg-gray-100 p-1 text-gray-500">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-black text-gray-900">{category.name}</span>
                            {hasDraft && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Draft</span>}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">/{category.slug}</span>
                        </span>
                      </button>

                      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                        category.isActive !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {category.isActive !== false ? "Active" : "Inactive"}
                      </span>
                      <span className="text-sm font-bold text-gray-600">
                        {displayVal}% effective
                        <span className="block text-xs font-semibold text-gray-400">
                          {directVal}% rate / {floorVal}% floor
                        </span>
                      </span>
                      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => openCategory(category, "display")}
                          className="rounded-lg bg-[#1e7098]/10 px-3 py-2 text-xs font-bold text-[#1e7098] hover:bg-[#1e7098]/20"
                        >
                          <Edit2 className="mr-1 inline h-3.5 w-3.5" />
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => openCategory(category, "attributes")}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                        >
                          <Settings className="mr-1 inline h-3.5 w-3.5" />
                          Attrs
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRegularCategory(category._id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          Deactivate
                        </button>
                      </div>
                    </div>
                    {isExpanded && renderCategoryDetails(category)}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="Dynamic Category Templates"
          description="Optional attribute templates used by the dynamic product tools."
          count={dynamicCategories.length}
          open={sectionsOpen.dynamic}
          onToggle={() => toggleSection("dynamic")}
          action={
            <button
              type="button"
              onClick={() => {
                setEditingDynamicCategory(null);
                setShowDynamicForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          }
        >
          {showDynamicForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-5">
                  <h2 className="text-xl font-black text-gray-900">
                    {editingDynamicCategory ? "Edit Template" : "Create Template"}
                  </h2>
                  <button
                    type="button"
                    onClick={handleDynamicFormClose}
                    className="rounded-lg px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
                <div className="p-5">
                  <DynamicCategoryForm
                    category={editingDynamicCategory}
                    onSuccess={handleDynamicFormSuccess}
                    onCancel={handleDynamicFormClose}
                  />
                </div>
              </div>
            </div>
          )}

          {dynamicCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm font-semibold text-gray-600">No dynamic templates yet.</p>
              <button
                type="button"
                onClick={() => setShowDynamicForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f]"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </button>
            </div>
          ) : (
            <CategoryList
              categories={dynamicCategories}
              onEdit={(category) => {
                setEditingDynamicCategory(category);
                setShowDynamicForm(true);
              }}
              onDelete={handleDeleteDynamic}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
