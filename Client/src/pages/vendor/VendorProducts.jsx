import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  Download,
  FileSpreadsheet,
  Eye,
  Image as ImageIcon,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useCurrency from "../../hooks/useCurrency";
import { hasVendorPermission } from "../../utils/vendorStaffPermissions";
import { bulkUpdateVendorProducts } from "../../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const tabs = [
  { id: "listings", label: "Listings", icon: Package, permission: "products:view" },
  { id: "bulk", label: "Bulk Edit", icon: FileSpreadsheet, permission: "products:manage" },
  { id: "media", label: "Media Center", icon: ImageIcon, permission: "products:view" },
  { id: "csv", label: "CSV Upload", icon: Download, permission: "products:manage" },
];

const statusStyles = {
  Draft: "bg-gray-100 text-gray-700",
  "Pending Moderation": "bg-amber-100 text-amber-700",
  Live: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  "Out of Stock": "bg-rose-100 text-rose-700",
  Delisted: "bg-slate-200 text-slate-700",
};

const getProductStatusParam = (value) =>
  value && Object.keys(statusStyles).includes(value) ? value : "all";

const getProductStatus = (product) => {
  if (product.isActive === false || product.status === "inactive" || product.status === "delisted") {
    return "Delisted";
  }
  if (product.approvalStatus === "draft") return "Draft";
  if (product.approvalStatus === "pending") return "Pending Moderation";
  if (product.approvalStatus === "rejected") return "Rejected";
  if (Number(product.stock || 0) <= 0 && !product.allowBackorder) return "Out of Stock";
  if (product.approvalStatus === "approved") return "Live";
  return "Pending Moderation";
};

const getCategoryId = (product) => product.categoryId?.toString?.() || product.categoryId || "";

const normalizeProductsPayload = (payload) => payload?.products || payload?.data || [];

const getSku = (product) => product.sku || product.attributes?.sku || product.variants?.[0]?.sku || "No SKU";

const getLowStockThreshold = (product) => Number(product.lowStockThreshold ?? 5);

const exportProductsCsv = (products, categoryMap, moneyFormatter) => {
  const headers = ["Product ID", "Title", "SKU", "Category", "Status", "Price", "Stock", "Low Stock Alert", "Variants"];
  const rows = products.map((product) => [
    product._id,
    product.title || "",
    getSku(product),
    categoryMap[getCategoryId(product)]?.name || "",
    getProductStatus(product),
    moneyFormatter(product.price || 0),
    Number(product.stock || 0),
    getLowStockThreshold(product),
    product.variants?.length || 0,
  ]);
  const csv = [headers, ...rows]
    .map((line) => line.map((value) => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendor-products-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function VendorProducts() {
  const { user, dbUser, role, permissions, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState({});
  const [activeTab, setActiveTab] = useState("listings");
  const [selectedStatus, setSelectedStatus] = useState(() => getProductStatusParam(searchParams.get("status")));
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRows, setBulkRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingBulk, setSavingBulk] = useState(false);
  const [error, setError] = useState("");
  const vendorAccess = useMemo(
    () => ({ dbUser, role, permissions, isAdmin }),
    [dbUser, role, permissions, isAdmin],
  );
  const canManageProducts = hasVendorPermission(vendorAccess, "products:manage");
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => hasVendorPermission(vendorAccess, tab.permission)),
    [vendorAccess],
  );

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/vendor/products?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/categories`),
      ]);

      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (!productsResponse.ok) {
        throw new Error(productsData.error || "Failed to fetch products");
      }

      const categoryMap = {};
      (categoriesData.data || []).forEach((category) => {
        categoryMap[category._id] = category;
      });

      setCategories(categoryMap);
      setProducts(normalizeProductsPayload(productsData));
    } catch (fetchError) {
      setError(fetchError.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    const nextStatus = getProductStatusParam(searchParams.get("status"));

    setSearchTerm((current) => (current === nextSearch ? current : nextSearch));
    setSelectedStatus((current) => (current === nextStatus ? current : nextStatus));
  }, [searchParams]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "listings");
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    setBulkRows(
      products.map((product) => ({
        id: product._id,
        title: product.title,
        sku: getSku(product),
        price: product.price ?? 0,
        stock: product.stock ?? 0,
        status: product.isActive === false || product.status === "inactive" ? "inactive" : "active",
        lowStockThreshold: product.lowStockThreshold ?? 5,
        dirty: false,
      })),
    );
    setSelectedIds(new Set());
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const status = getProductStatus(product);
      const matchesStatus = selectedStatus === "all" || status === selectedStatus;
      const matchesSearch =
        !term ||
        product.title?.toLowerCase().includes(term) ||
        getSku(product).toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [products, searchTerm, selectedStatus]);

  const stats = useMemo(() => {
    const statusCounts = products.reduce((counts, product) => {
      const status = getProductStatus(product);
      return { ...counts, [status]: (counts[status] || 0) + 1 };
    }, {});
    const lowStock = products.filter((product) => {
      const stock = Number(product.stock || 0);
      return stock > 0 && stock <= getLowStockThreshold(product);
    }).length;
    const variants = products.reduce((sum, product) => sum + (product.variants?.length || 0), 0);

    return {
      total: products.length,
      live: statusCounts.Live || 0,
      pending: statusCounts["Pending Moderation"] || 0,
      lowStock,
      variants,
      statusCounts,
    };
  }, [products]);

  const mediaLibrary = useMemo(() => {
    const entries = [];
    products.forEach((product) => {
      (product.images || []).forEach((url, index) => {
        entries.push({
          id: `${product._id}-${index}`,
          url,
          productId: product._id,
          productTitle: product.title,
          isCover: index === 0,
        });
      });
      (product.variants || []).forEach((variant, index) => {
        if (!variant.image) return;
        entries.push({
          id: `${product._id}-variant-${index}`,
          url: variant.image,
          productId: product._id,
          productTitle: `${product.title} / ${variant.color || ""} ${variant.size || ""}`.trim(),
          isCover: false,
        });
      });
    });

    const seen = new Set();
    return entries.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [products]);

  const toggleSelected = (productId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const updateBulkRow = (productId, field, value) => {
    setBulkRows((current) =>
      current.map((row) =>
        row.id === productId
          ? {
              ...row,
              [field]: value,
              dirty: true,
            }
          : row,
      ),
    );
  };

  const saveBulkRows = async () => {
    if (!canManageProducts) {
      toast.error("Your staff access is view-only for products.");
      return;
    }

    const targetRows = bulkRows.filter((row) =>
      selectedIds.size > 0 ? selectedIds.has(row.id) : row.dirty,
    );

    if (targetRows.length === 0) {
      toast("Select rows or edit a cell first.");
      return;
    }

    setSavingBulk(true);
    try {
      const response = await bulkUpdateVendorProducts({
        action: "update_fields",
        updates: targetRows.map((row) => ({
          productId: row.id,
          price: Number(row.price || 0),
          stock: Number(row.stock || 0),
          status: row.status,
          lowStockThreshold: Number(row.lowStockThreshold || 0),
        })),
      });
      const summary = response.data?.summary || { updated: targetRows.length, failed: 0 };

      toast.success(`${summary.updated} products updated${summary.failed ? `, ${summary.failed} failed` : ""}`);
      await fetchData();
    } catch (bulkError) {
      toast.error(bulkError.message || "Bulk edit failed");
    } finally {
      setSavingBulk(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!canManageProducts) {
      toast.error("Your staff access does not allow product deletion.");
      return;
    }

    if (!confirm("Delete this product permanently?")) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/vendor/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete product");
      toast.success("Product deleted");
      await fetchData();
    } catch (deleteError) {
      toast.error(deleteError.message || "Failed to delete product");
    }
  };

  const submitForApproval = async (productId) => {
    if (!canManageProducts) {
      toast.error("Your staff access does not allow product submission.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/vendor/products/${productId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit product");
      toast.success("Submitted for moderation");
      await fetchData();
    } catch (submitError) {
      toast.error(submitError.message || "Failed to submit product");
    }
  };

  const archiveProduct = async (productId) => {
    if (!canManageProducts) {
      toast.error("Your staff access does not allow delisting products.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/vendor/products/${productId}/archive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delist product");
      toast.success("Product delisted");
      await fetchData();
    } catch (archiveError) {
      toast.error(archiveError.message || "Failed to delist product");
    }
  };

  const visibleSelectedCount = filteredProducts.filter((product) =>
    selectedIds.has(product._id),
  ).length;
  const allVisibleSelected =
    filteredProducts.length > 0 && visibleSelectedCount === filteredProducts.length;

  const toggleVisibleProducts = () => {
    if (!canManageProducts) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredProducts.forEach((product) => next.delete(product._id));
      } else {
        filteredProducts.forEach((product) => next.add(product._id));
      }
      return next;
    });
  };

  const submitSelectedForApproval = async () => {
    if (!canManageProducts) {
      toast.error("Your staff access is view-only for products.");
      return;
    }

    const targetIds = [...selectedIds].filter((id) =>
      products.some((product) => ["Draft", "Rejected"].includes(getProductStatus(product)) && product._id === id),
    );

    if (targetIds.length === 0) {
      toast("Select draft or rejected products first.");
      return;
    }

    try {
      const response = await bulkUpdateVendorProducts({ action: "submit", productIds: targetIds });
      const summary = response.data?.summary || { updated: targetIds.length, failed: 0 };
      toast.success(`${summary.updated} products submitted${summary.failed ? `, ${summary.failed} failed` : ""}`);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Bulk submit failed");
    }
    setSelectedIds(new Set());
  };

  const archiveSelectedProducts = async () => {
    if (!canManageProducts) {
      toast.error("Your staff access is view-only for products.");
      return;
    }

    const targetIds = [...selectedIds].filter((id) =>
      products.some((product) => getProductStatus(product) !== "Delisted" && product._id === id),
    );

    if (targetIds.length === 0) {
      toast("Select active products first.");
      return;
    }

    if (!confirm(`Delist ${targetIds.length} selected product(s)?`)) return;

    try {
      const response = await bulkUpdateVendorProducts({ action: "archive", productIds: targetIds });
      const summary = response.data?.summary || { updated: targetIds.length, failed: 0 };
      toast.success(`${summary.updated} products delisted${summary.failed ? `, ${summary.failed} failed` : ""}`);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Bulk delist failed");
    }
    setSelectedIds(new Set());
  };

  const exportSelectedProducts = () => {
    const targetProducts = selectedIds.size > 0
      ? filteredProducts.filter((product) => selectedIds.has(product._id))
      : filteredProducts;
    if (targetProducts.length === 0) {
      toast.error("No products to export");
      return;
    }
    exportProductsCsv(targetProducts, categories, formatPrice);
    toast.success(`${targetProducts.length} products exported`);
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Image URL copied");
    } catch {
      toast.error("Could not copy image URL");
    }
  };

  const renderStatusBadge = (product) => {
    const status = getProductStatus(product);
    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  const renderProductActions = (product, compact = false) => {
    const status = getProductStatus(product);
    const buttonClass = compact
      ? "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
      : "rounded-md p-2 text-gray-600 hover:bg-gray-100";
    const iconOnlyClass = compact ? buttonClass : "rounded-md p-2";

    return (
      <div className={compact ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
        <Link
          to={`/vendor/products/${product._id}`}
          className={compact ? buttonClass : `${iconOnlyClass} text-slate-600 hover:bg-slate-100`}
          title="Details"
        >
          <Eye className="h-4 w-4" />
          {compact && "Details"}
        </Link>
        {canManageProducts ? (
          <>
            <Link
              to={`/vendor/products/edit/${product._id}`}
              className={compact ? buttonClass : `${iconOnlyClass} text-blue-600 hover:bg-blue-50`}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
              {compact && "Edit"}
            </Link>
            <Link
              to={`/vendor/products/add?clone=${product._id}`}
              className={compact ? buttonClass : `${iconOnlyClass} text-gray-600 hover:bg-gray-100`}
              title="Clone"
            >
              <Copy className="h-4 w-4" />
              {compact && "Clone"}
            </Link>
            {["Draft", "Rejected"].includes(status) && (
              <button
                type="button"
                onClick={() => submitForApproval(product._id)}
                className={compact ? buttonClass : `${iconOnlyClass} text-green-600 hover:bg-green-50`}
                title="Submit"
              >
                <Send className="h-4 w-4" />
                {compact && "Submit"}
              </button>
            )}
            {status !== "Delisted" && (
              <button
                type="button"
                onClick={() => archiveProduct(product._id)}
                className={compact ? buttonClass : `${iconOnlyClass} text-amber-600 hover:bg-amber-50`}
                title="Delist"
              >
                <Package className="h-4 w-4" />
                {compact && "Delist"}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(product._id)}
              className={compact ? "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50" : `${iconOnlyClass} text-red-600 hover:bg-red-50`}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
              {compact && "Delete"}
            </button>
          </>
        ) : (
          <span className={compact ? "col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-500" : "rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
            View-only access
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-500">Listings, variants, images, stock, SEO, and bulk imports</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {canManageProducts ? (
                <>
                  <Link
                    to="/vendor/products/bulk"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV Upload
                  </Link>
                  <Link
                    to="/vendor/products/add"
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Link>
                </>
              ) : (
                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                  Product view-only staff access
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Total", value: stats.total },
              { label: "Live", value: stats.live },
              { label: "Pending", value: stats.pending },
              { label: "Low Stock", value: stats.lowStock },
              { label: "Variant SKUs", value: stats.variants },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!canManageProducts && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            You can review products and media, but your staff role cannot create, edit, submit, delist, or delete listings.
          </div>
        )}

        <div className="mb-5 flex gap-2 overflow-x-auto border-b border-gray-200">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "listings" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {[
                  { label: "All", value: "all", count: stats.total },
                  ...Object.keys(statusStyles).map((status) => ({
                    label: status,
                    value: status,
                    count: stats.statusCounts[status] || 0,
                  })),
                ].map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setSelectedStatus(status.value)}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                      selectedStatus === status.value
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {status.label}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {status.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search product or SKU"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="all">All statuses</option>
                {Object.keys(statusStyles).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportSelectedProducts}
                disabled={filteredProducts.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              </div>
              {canManageProducts && selectedIds.size > 0 && (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-bold text-orange-900">
                    {selectedIds.size} selected for bulk action
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={submitSelectedForApproval}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                      Submit drafts
                    </button>
                    <button
                      type="button"
                      onClick={archiveSelectedProducts}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      <Package className="h-4 w-4" />
                      Delist
                    </button>
                    <button
                      type="button"
                      onClick={exportSelectedProducts}
                      className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-800 hover:bg-orange-100"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-800 hover:bg-orange-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">Create a product or adjust the current filters.</p>
                {canManageProducts && (
                  <Link
                    to="/vendor/products/add"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="divide-y divide-gray-100 md:hidden">
                  {filteredProducts.map((product) => {
                    const category = categories[getCategoryId(product)];
                    const stock = Number(product.stock || 0);
                    const threshold = getLowStockThreshold(product);
                    const lowStock = stock > 0 && stock <= threshold;
                    const seoReady = Boolean(product.seo?.metaTitle && product.seo?.metaDescription);

                    return (
                      <article key={product._id} className="p-4">
                        <div className="flex items-start gap-3">
                          {canManageProducts && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product._id)}
                              onChange={() => toggleSelected(product._id)}
                              className="mt-4 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                              aria-label={`Select ${product.title}`}
                            />
                          )}
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.title} className="h-20 w-20 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                              No image
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {renderStatusBadge(product)}
                              {lowStock && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  Low stock
                                </span>
                              )}
                            </div>
                            <h3 className="mt-2 line-clamp-2 text-sm font-bold text-gray-950">{product.title}</h3>
                            <p className="mt-1 text-xs text-gray-500">{category?.name || "Uncategorized"}</p>
                            <p className="mt-1 font-mono text-xs text-gray-400">{getSku(product)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">Price</p>
                            <p className="mt-1 font-bold text-gray-950">{formatPrice(product.price || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">Stock</p>
                            <p className="mt-1 font-bold text-gray-950">{stock}</p>
                            <p className="text-xs text-gray-400">Alert at {threshold}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">SEO</p>
                            <p className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${seoReady ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              {seoReady ? "Ready" : "Missing"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">Variants</p>
                            <p className="mt-1 font-bold text-gray-950">{product.variants?.length || 0}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          {renderProductActions(product, true)}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-[1020px] w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {canManageProducts && (
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={allVisibleSelected}
                              onChange={toggleVisibleProducts}
                              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                              aria-label="Select all visible products"
                            />
                          </th>
                        )}
                        {["Product", "Status", "Price", "Stock", "SEO", "Variants", "Actions"].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((product) => {
                        const category = categories[getCategoryId(product)];
                        const stock = Number(product.stock || 0);
                        const threshold = getLowStockThreshold(product);
                        const lowStock = stock > 0 && stock <= threshold;
                        const seoReady = Boolean(product.seo?.metaTitle && product.seo?.metaDescription);

                        return (
                          <tr key={product._id} className="hover:bg-gray-50">
                            {canManageProducts && (
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(product._id)}
                                  onChange={() => toggleSelected(product._id)}
                                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                  aria-label={`Select ${product.title}`}
                                />
                              </td>
                            )}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {product.images?.[0] ? (
                                  <img src={product.images[0]} alt={product.title} className="h-14 w-14 rounded-lg object-cover" />
                                ) : (
                                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                                    No image
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-gray-900">{product.title}</p>
                                  <p className="text-xs text-gray-500">{category?.name || "Uncategorized"}</p>
                                  <p className="mt-1 font-mono text-xs text-gray-400">{getSku(product)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">{renderStatusBadge(product)}</td>
                            <td className="px-4 py-4 font-semibold text-gray-900">{formatPrice(product.price || 0)}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{stock}</span>
                                {lowStock && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                    <AlertTriangle className="h-3 w-3" />
                                    Low
                                  </span>
                                )}
                                {product.allowBackorder && (
                                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                                    Backorder
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">Alert at {threshold}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${seoReady ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                {seoReady ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                {seoReady ? "Ready" : "Missing"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-semibold text-gray-900">{product.variants?.length || 0}</span>
                              {product.variants?.length > 0 && (
                                <p className="text-xs text-gray-400">
                                  {product.variants.filter((variant) => Number(variant.stock || 0) <= threshold).length} low
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {renderProductActions(product)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "bulk" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Bulk SKU Editor</h2>
                <p className="text-sm text-gray-500">Edit price, stock, status, and threshold in one table.</p>
              </div>
              <button
                onClick={saveBulkRows}
                disabled={savingBulk}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {savingBulk ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-100 md:hidden">
                {bulkRows.map((row) => (
                  <article key={row.id} className={row.dirty ? "bg-orange-50/50 p-4" : "bg-white p-4"}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950">{row.title}</p>
                        <p className="mt-1 font-mono text-xs text-gray-500">{row.sku}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelected(row.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                        aria-label={`Select ${row.title}`}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Price
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.price}
                          onChange={(event) => updateBulkRow(row.id, "price", event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm normal-case text-gray-900"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Stock
                        <input
                          type="number"
                          min="0"
                          value={row.stock}
                          onChange={(event) => updateBulkRow(row.id, "stock", event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm normal-case text-gray-900"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Low alert
                        <input
                          type="number"
                          min="0"
                          value={row.lowStockThreshold}
                          onChange={(event) => updateBulkRow(row.id, "lowStockThreshold", event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm normal-case text-gray-900"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Status
                        <select
                          value={row.status}
                          onChange={(event) => updateBulkRow(row.id, "status", event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm normal-case text-gray-900"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Delisted</option>
                          <option value="draft">Draft</option>
                        </select>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[880px] w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Select</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Low Alert</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bulkRows.map((row) => (
                      <tr key={row.id} className={row.dirty ? "bg-orange-50/50" : "bg-white"}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelected(row.id)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.sku}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.title}</td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" step="0.01" value={row.price} onChange={(event) => updateBulkRow(row.id, "price", event.target.value)} className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" value={row.stock} onChange={(event) => updateBulkRow(row.id, "stock", event.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" value={row.lowStockThreshold} onChange={(event) => updateBulkRow(row.id, "lowStockThreshold", event.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                        </td>
                        <td className="px-4 py-3">
                          <select value={row.status} onChange={(event) => updateBulkRow(row.id, "status", event.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                            <option value="active">Active</option>
                            <option value="inactive">Delisted</option>
                            <option value="draft">Draft</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "media" && (
          <div className="space-y-4">
            {mediaLibrary.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                <ImageIcon className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">No images uploaded yet</h3>
                {canManageProducts && (
                  <Link
                    to="/vendor/products/add"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {mediaLibrary.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="relative aspect-square bg-gray-100">
                      <img src={item.url} alt={item.productTitle} className="h-full w-full object-cover" />
                      {item.isCover && (
                        <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-gray-900">{item.productTitle}</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => copyUrl(item.url)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          Copy URL
                        </button>
                        {canManageProducts && (
                          <Link to={`/vendor/products/edit/${item.productId}`} className="rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50" title="Manage">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "csv" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">CSV Bulk Upload</h2>
              <p className="mt-1 text-sm text-gray-500">Upload product CSV files and download row-by-row validation reports.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/vendor/products/bulk"
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Open CSV Uploader
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">CSV Columns</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {["title", "price", "stock", "category", "description", "images", "sku", "brand", "variants"].map((field) => (
                  <code key={field} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {field}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
