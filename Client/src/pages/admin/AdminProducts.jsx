import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import {
  AdminQueueBadge,
  AdminQueueDetailSection,
  AdminQueueDrawer,
  AdminQueueKeyValue,
} from "../../components/admin/AdminQueuePrimitives";
import { Pagination } from "../../components/ui/data";
import useCurrency from "../../hooks/useCurrency";
import {
  formatQueueDate,
  getQueueStatusTone,
  normalizeProductQueueItem,
} from "../../utils/adminQueuePattern";
import {
  getAdminProducts,
  approveAdminProduct,
  rejectAdminProduct,
  disableAdminProduct,
  adminEditProduct,
  bulkModerateAdminProducts,
  getProductModerationConfig,
  scanProductModeration,
  getProductDuplicateGroups,
  getProductIpReports,
  submitProductIpReport,
  reviewProductIpReport,
  getBrandRegistry,
  saveBrandRegistryItem,
  reviewBrandRegistryItem,
} from "../../services/api";

const STATUS_TABS = [
  { key: "queue", label: "Queue" },
  { key: "pending", label: "Pending" },
  { key: "flagged", label: "Flagged" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Rejected" },
  { key: "delisted", label: "Delisted" },
  { key: "all", label: "All" },
];

const statusClass = {
  approved: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  flagged: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-gray-100 text-gray-700 border-gray-200",
  delisted: "bg-black text-white border-black",
  changes_requested: "bg-primary-100 text-primary-800 border-primary-200",
};

const guidanceOptions = [
  "Add a clean white background image and resubmit.",
  "Remove prohibited or misleading keywords from the title.",
  "Select the correct category and fill all required attributes.",
  "Upload authentic brand proof or remove official brand claims.",
];

const getProductImage = (product) =>
  product.image ||
  product.images?.[0] ||
  "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=160&h=160&fit=crop";

const getFlagTone = (severity) => {
  if (severity === "high") return "bg-red-50 text-red-700 border-red-100";
  if (severity === "medium") return "bg-yellow-50 text-yellow-800 border-yellow-100";
  return "bg-blue-50 text-blue-700 border-blue-100";
};

export default function AdminProducts() {
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("queue");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [total, setTotal] = useState(0);
  const [config, setConfig] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [ipReports, setIpReports] = useState([]);
  const [brands, setBrands] = useState([]);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", sku: "", categoryId: "", brand: "", note: "", approveAfterEdit: true });
  const [brandForm, setBrandForm] = useState({ name: "", ownerVendorId: "", trademarkNumber: "" });
  const [ipForm, setIpForm] = useState({ productId: "", brandName: "", reason: "" });
  const [selectedQueueProduct, setSelectedQueueProduct] = useState(null);

  const metrics = useMemo(() => {
    const flags = products.reduce((sum, product) => sum + (product.moderationFlags?.length || 0), 0);
    return {
      total,
      pending: products.filter((product) => product.approvalStatus === "pending").length,
      flagged: products.filter((product) => (product.moderationFlags || []).length > 0 || product.approvalStatus === "flagged").length,
      trusted: products.filter((product) => product.trustedVendor).length,
      flags,
    };
  }, [products, total]);

  const selectedQueueItem = useMemo(
    () => (selectedQueueProduct ? normalizeProductQueueItem(selectedQueueProduct) : null),
    [selectedQueueProduct],
  );

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        sort: "submitted",
      };
      if (activeStatus === "queue") params.status = "queue";
      else if (activeStatus !== "all") params.approvalStatus = activeStatus;
      if (appliedSearch.trim()) params.search = appliedSearch.trim();

      const response = await getAdminProducts(params);
      setProducts(response.data.data || []);
      setTotal(response.data.total || 0);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load moderation products");
    } finally {
      setLoading(false);
    }
  };

  const fetchSidePanels = async () => {
    try {
      const [configRes, duplicateRes, reportsRes, brandsRes] = await Promise.all([
        getProductModerationConfig(),
        getProductDuplicateGroups(),
        getProductIpReports({ status: "pending" }),
        getBrandRegistry(),
      ]);
      setConfig(configRes.data.data);
      setDuplicates(duplicateRes.data.data || []);
      setIpReports(reportsRes.data.data || []);
      setBrands(brandsRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load moderation side panels");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeStatus, page, pageSize, appliedSearch]);

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (!urlSearch) return;
    setSearchTerm(urlSearch);
    setAppliedSearch(urlSearch);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    fetchSidePanels();
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedSearch(searchTerm.trim());
    setPage(1);
  };

  const toggleProduct = (productId) => {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const handleApprove = async (productId) => {
    setActionLoading(true);
    try {
      await approveAdminProduct(productId);
      toast.success("Product approved");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to approve product");
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (product = null, mode = "single") => {
    setSelectedQueueProduct(null);
    setRejectModal({ product, mode });
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Reject reason is required");
      return;
    }

    setActionLoading(true);
    try {
      if (rejectModal.mode === "bulk") {
        await bulkModerateAdminProducts({
          action: "reject",
          productIds: selectedIds,
          reason: rejectReason,
        });
      } else {
        await rejectAdminProduct(rejectModal.product._id, rejectReason);
      }
      toast.success("Product rejected with vendor guidance");
      setRejectModal(null);
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reject product");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulk = async (action) => {
    if (selectedIds.length === 0) {
      toast.error("Select products first");
      return;
    }
    if (action === "reject") {
      openReject(null, "bulk");
      return;
    }

    setActionLoading(true);
    try {
      await bulkModerateAdminProducts({ action, productIds: selectedIds });
      toast.success(`${selectedIds.length} products processed`);
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || "Bulk action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelist = async (productId, reason = "Policy or IP violation") => {
    setActionLoading(true);
    try {
      await disableAdminProduct(productId, { reason });
      toast.success("Product delisted");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delist product");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (product) => {
    setSelectedQueueProduct(null);
    setEditModal(product);
    setEditForm({
      title: product.title || "",
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      brand: product.brand || product.attributes?.brand || "",
      note: "",
      approveAfterEdit: true,
    });
  };

  const submitEdit = async () => {
    if (!editModal) return;
    setActionLoading(true);
    try {
      await adminEditProduct(editModal._id, editForm);
      toast.success(editForm.approveAfterEdit ? "Edited and approved" : "Product updated");
      setEditModal(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to edit product");
    } finally {
      setActionLoading(false);
    }
  };

  const runScan = async () => {
    setActionLoading(true);
    try {
      const response = await scanProductModeration({ scope: activeStatus === "all" ? "all" : "queue" });
      toast.success(response.data.message || "Moderation scan complete");
      await Promise.all([fetchProducts(), fetchSidePanels()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Scan failed");
    } finally {
      setActionLoading(false);
    }
  };

  const submitBrand = async (event) => {
    event.preventDefault();
    if (!brandForm.name.trim()) return;
    try {
      await saveBrandRegistryItem({ ...brandForm, status: "pending" });
      toast.success("Brand added to registry");
      setBrandForm({ name: "", ownerVendorId: "", trademarkNumber: "" });
      fetchSidePanels();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save brand");
    }
  };

  const approveBrand = async (brandId) => {
    try {
      await reviewBrandRegistryItem(brandId, { status: "approved", officialStoreEligible: true });
      toast.success("Brand approved");
      fetchSidePanels();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to approve brand");
    }
  };

  const submitIpReport = async (event) => {
    event.preventDefault();
    if (!ipForm.productId.trim()) {
      toast.error("Product ID is required");
      return;
    }
    try {
      await submitProductIpReport(ipForm);
      toast.success("IP report added");
      setIpForm({ productId: "", brandName: "", reason: "" });
      fetchSidePanels();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit report");
    }
  };

  const resolveIpReport = async (report, delistProduct) => {
    try {
      await reviewProductIpReport(report._id, {
        status: delistProduct ? "actioned" : "resolved",
        delistProduct,
        adminNote: delistProduct ? "Delisted after counterfeit review" : "Reviewed without delisting",
      });
      toast.success(delistProduct ? "Report actioned and product delisted" : "Report resolved");
      await Promise.all([fetchProducts(), fetchSidePanels()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to review report");
    }
  };

  if (loading && products.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />

      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Link to="/admin" className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Back
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Product Moderation</h1>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Review vendor submissions, fix minor issues, catch policy risk, and keep the catalog clean.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={runScan}
                disabled={actionLoading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                Run Filter Scan
              </button>
              <Link to="/admin/categories" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Category Attributes
              </Link>
              <Link to="/admin/products/add" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                Add Product
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Products", metrics.total],
              ["Pending Here", metrics.pending],
              ["Flagged Here", metrics.flagged],
              ["Trusted Vendors", metrics.trusted],
              ["Open Reports", ipReports.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 xl:grid-cols-[1fr_360px]">
        <main className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveStatus(tab.key);
                      setPage(1);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      activeStatus === tab.key ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSearch} className="flex min-w-0 gap-2 lg:w-96">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search SKU, title, vendor, category, status"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                  Search
                </button>
              </form>
            </div>

            {selectedIds.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm font-semibold text-primary-900">{selectedIds.length} selected</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleBulk("approve")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                    Bulk Approve
                  </button>
                  <button onClick={() => handleBulk("reject")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    Bulk Reject
                  </button>
                  <button onClick={() => handleBulk("delist")} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
                    Bulk Delist
                  </button>
                  <button onClick={() => setSelectedIds([])} className="rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100">
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={products.length > 0 && selectedIds.length === products.length}
                        onChange={(event) => setSelectedIds(event.target.checked ? products.map((product) => product._id) : [])}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Risk</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-sm text-gray-500">
                        No products match this moderation view.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product._id} className="align-top hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product._id)}
                            onChange={() => toggleProduct(product._id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-3">
                            <img src={getProductImage(product)} alt={product.title} className="h-16 w-16 rounded-lg object-cover" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900">{product.title}</p>
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass[product.approvalStatus] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                  {product.approvalStatus || "approved"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">SKU {product.sku || "missing"} - {product.categoryName || "No category"}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{product.description || "No description"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {product.vendorId ? (
                            <Link to={`/admin/vendors/${product.vendorId}`} className="font-semibold text-blue-700 hover:underline">
                              {product.vendorShopName || "Vendor"}
                            </Link>
                          ) : (
                            <span className="text-gray-500">Admin product</span>
                          )}
                          {product.trustedVendor && <p className="mt-1 text-xs font-semibold text-green-700">Trusted vendor</p>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {(product.moderationFlags || []).length === 0 ? (
                              <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">No flags</span>
                            ) : (
                              product.moderationFlags.slice(0, 3).map((flag) => (
                                <span key={`${product._id}-${flag.type}-${flag.message}`} className={`rounded-full border px-2 py-1 text-xs font-semibold ${getFlagTone(flag.severity)}`}>
                                  {flag.message}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900">{formatPrice(product.price || 0)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button onClick={() => handleApprove(product._id)} disabled={actionLoading} className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100">
                              Approve
                            </button>
                            <button onClick={() => openReject(product)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                              Reject
                            </button>
                            <button onClick={() => openEdit(product)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                              Quick Edit
                            </button>
                            <button onClick={() => setSelectedQueueProduct(product)} className="rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-100">
                              Details
                            </button>
                            <Link to={`/admin/products/edit/${product._id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                              Full Edit
                            </Link>
                            <button onClick={() => handleDelist(product._id)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black">
                              Delist
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {total > 0 && (
            <div className="border-t border-gray-200 bg-white px-4 py-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                pageSizeOptions={[10, 20, 50]}
                onPageChange={setPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }}
              />
            </div>
          )}
        </main>

        <aside className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Policy Filter</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(config?.prohibitedKeywords || []).slice(0, 10).map((keyword) => (
                <span key={keyword} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {(config?.categories || []).filter((category) => category.requiredAttributes?.length > 0).slice(0, 4).map((category) => (
                <div key={category._id} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                  <p className="mt-1 text-xs text-gray-500">Required: {category.requiredAttributes.join(", ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Brand Registry</h2>
            <form onSubmit={submitBrand} className="mt-3 space-y-2">
              <input
                value={brandForm.name}
                onChange={(event) => setBrandForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Brand name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <input
                value={brandForm.ownerVendorId}
                onChange={(event) => setBrandForm((prev) => ({ ...prev, ownerVendorId: event.target.value }))}
                placeholder="Owner vendor ID"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <button className="w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                Add Brand
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {brands.slice(0, 4).map((brand) => (
                <div key={brand._id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{brand.name}</p>
                      <p className="text-xs capitalize text-gray-500">{brand.status || "pending"}</p>
                    </div>
                    {brand.status !== "approved" && (
                      <button onClick={() => approveBrand(brand._id)} className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100">
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">IP Reports</h2>
            <form onSubmit={submitIpReport} className="mt-3 space-y-2">
              <input
                value={ipForm.productId}
                onChange={(event) => setIpForm((prev) => ({ ...prev, productId: event.target.value }))}
                placeholder="Product ID"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <input
                value={ipForm.brandName}
                onChange={(event) => setIpForm((prev) => ({ ...prev, brandName: event.target.value }))}
                placeholder="Brand"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <input
                value={ipForm.reason}
                onChange={(event) => setIpForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="Reason"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <button className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
                Add Report
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {ipReports.length === 0 ? (
                <p className="text-sm text-gray-500">No pending IP reports.</p>
              ) : (
                ipReports.slice(0, 4).map((report) => (
                  <div key={report._id} className="rounded-lg border border-red-100 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-900">{report.brandName || "Brand report"}</p>
                    <p className="mt-1 text-xs text-red-700">{report.reason}</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => resolveIpReport(report, true)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                        Delist
                      </button>
                      <button onClick={() => resolveIpReport(report, false)} className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-red-700">
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Clone Detection</h2>
            <div className="mt-3 space-y-2">
              {duplicates.length === 0 ? (
                <p className="text-sm text-gray-500">No cross-vendor duplicate groups detected.</p>
              ) : (
                duplicates.slice(0, 5).map((group) => (
                  <div key={group.key} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-gray-900">{group.title}</p>
                    <p className="text-xs text-gray-500">{group.count} similar listings from different vendors</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {rejectModal.mode === "bulk" ? `Reject ${selectedIds.length} Products` : "Reject Product"}
            </h3>
            <div className="mt-4 space-y-2">
              {guidanceOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setRejectReason(option)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {option}
                </button>
              ))}
            </div>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              placeholder="Specific guidance sent to vendor"
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <div className="mt-5 flex gap-3">
              <button onClick={submitReject} disabled={actionLoading} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                Reject
              </button>
              <button onClick={() => setRejectModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Edit on Behalf of Vendor</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={editForm.title}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Title"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={editForm.sku}
                onChange={(event) => setEditForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder="SKU"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={editForm.categoryId}
                onChange={(event) => setEditForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {(config?.categories || []).map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
              <input
                value={editForm.brand}
                onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))}
                placeholder="Brand"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              value={editForm.note}
              onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
              rows={3}
              placeholder="Internal note"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editForm.approveAfterEdit}
                onChange={(event) => setEditForm((prev) => ({ ...prev, approveAfterEdit: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Approve after saving
            </label>
            <div className="mt-5 flex gap-3">
              <button onClick={submitEdit} disabled={actionLoading} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                Save
              </button>
              <button onClick={() => setEditModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminQueueDrawer
        open={Boolean(selectedQueueProduct)}
        title={selectedQueueItem?.title}
        subtitle={selectedQueueItem?.subtitle}
        onClose={() => setSelectedQueueProduct(null)}
        badges={[
          {
            label: selectedQueueProduct?.approvalStatus || selectedQueueProduct?.status || "approved",
            tone: getQueueStatusTone(selectedQueueProduct?.approvalStatus || selectedQueueProduct?.status),
          },
          {
            label: selectedQueueItem?.riskLabel || "No moderation flags",
            tone: selectedQueueItem?.riskCount ? "danger" : "success",
          },
        ]}
        footer={selectedQueueProduct ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSelectedQueueProduct(null);
                handleApprove(selectedQueueProduct._id);
              }}
              disabled={actionLoading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => openReject(selectedQueueProduct)}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => openEdit(selectedQueueProduct)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              Quick Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedQueueProduct(null);
                handleDelist(selectedQueueProduct._id);
              }}
              className="rounded-lg border border-slate-900 bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-black"
            >
              Delist
            </button>
          </div>
        ) : null}
      >
        {selectedQueueProduct && selectedQueueItem ? (
          <div className="space-y-4">
            <AdminQueueDetailSection title="Listing Snapshot">
              <div className="flex gap-3">
                <img
                  src={getProductImage(selectedQueueProduct)}
                  alt={selectedQueueProduct.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950 dark:text-white">{selectedQueueProduct.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedQueueProduct.description || "No description provided"}
                  </p>
                </div>
              </div>
            </AdminQueueDetailSection>

            <AdminQueueDetailSection title="Operational Detail">
              <AdminQueueKeyValue label="Product ID" value={selectedQueueProduct._id} />
              <AdminQueueKeyValue label="Vendor" value={selectedQueueItem.owner} />
              <AdminQueueKeyValue label="Category" value={selectedQueueProduct.categoryName || selectedQueueProduct.categoryId} />
              <AdminQueueKeyValue label="Price" value={formatPrice(selectedQueueProduct.price || 0)} />
              <AdminQueueKeyValue label="Submitted" value={formatQueueDate(selectedQueueItem.createdAt)} />
            </AdminQueueDetailSection>

            <AdminQueueDetailSection title="Moderation Evidence">
              {(selectedQueueProduct.moderationFlags || []).length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedQueueProduct.moderationFlags.map((flag) => (
                    <AdminQueueBadge key={`${flag.type}-${flag.message}`} tone={flag.severity === "high" ? "danger" : "warning"}>
                      {flag.message || flag.type}
                    </AdminQueueBadge>
                  ))}
                </div>
              ) : (
                <p>No automated policy flags on this listing.</p>
              )}
              {selectedQueueProduct.rejectionReason ? (
                <p className="rounded-lg bg-rose-50 p-3 text-rose-700">
                  Previous rejection: {selectedQueueProduct.rejectionReason}
                </p>
              ) : null}
            </AdminQueueDetailSection>
          </div>
        ) : null}
      </AdminQueueDrawer>
    </div>
  );
}
