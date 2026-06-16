import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Image as ImageIcon,
  Package,
  Pencil,
  RefreshCw,
  Send,
  ShoppingBag,
  Trash2,
  XCircle,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import {
  buildVendorProductTimeline,
  getVendorProductQualityChecks,
  getVendorProductStatusMeta,
  summarizeVendorInventory,
} from "../../utils/vendorProductDetail";
import { hasVendorPermission } from "../../utils/vendorStaffPermissions";
import { API_BASE_URL } from "../../utils/url";

const API_URL = API_BASE_URL;

const asId = (value) => value?._id?.toString?.() || value?.toString?.() || String(value || "");

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getVariantLabel = (variant = {}, index) =>
  [variant.color, variant.size, variant.sku].filter(Boolean).join(" / ") ||
  `Variant ${index + 1}`;

function HeaderAction({ to, onClick, icon: Icon, children, tone = "light", disabled = false }) {
  const className =
    tone === "primary"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      : tone === "danger"
        ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        : "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60";

  if (to) {
    return (
      <Link to={to} className={className}>
        <Icon className="h-4 w-4" />
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Metric({ label, value, note, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          {note ? <p className="mt-1 text-sm text-slate-500">{note}</p> : null}
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, action }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function QualityRow({ check }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          check.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {check.done ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{check.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{check.detail}</p>
      </div>
    </div>
  );
}

export default function VendorProductDetail() {
  const { id } = useParams();
  const { user, dbUser, role, permissions, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const canManageProducts = hasVendorPermission({ dbUser, role, permissions, isAdmin }, "products:manage");
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const loadProduct = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const [productResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/vendor/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/categories`),
      ]);

      const productData = await productResponse.json();
      if (!productResponse.ok) {
        throw new Error(productData.error || "Failed to load product");
      }

      const categoriesData = await categoriesResponse.json().catch(() => ({ data: [] }));
      const categoryMap = {};
      (categoriesData.data || []).forEach((category) => {
        categoryMap[asId(category._id)] = category;
      });

      const nextProduct = productData.product || productData.data;
      setProduct(nextProduct);
      setSelectedImage(nextProduct?.images?.[0] || "");
      setCategories(categoryMap);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const runProductAction = async (action, request) => {
    if (!user || !product?._id) return;
    if (!canManageProducts) {
      toast.error("Your staff access can view products, but cannot change them.");
      return;
    }

    setActionLoading(action);

    try {
      const token = await user.getIdToken();
      const response = await request(token);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || "Action failed");

      if (data.product) setProduct(data.product);
      toast.success(data.message || "Product updated");
      await loadProduct();
    } catch (actionError) {
      toast.error(actionError.message || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const submitForApproval = () =>
    runProductAction("submit", (token) =>
      fetch(`${API_URL}/vendor/products/${product._id}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

  const delistProduct = () =>
    runProductAction("delist", (token) =>
      fetch(`${API_URL}/vendor/products/${product._id}/archive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

  const deleteProduct = async () => {
    if (!product?._id) return;
    if (!canManageProducts) {
      toast.error("Your staff access can view products, but cannot delete them.");
      return;
    }

    if (!window.confirm("Delete this product permanently?")) return;

    setActionLoading("delete");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/vendor/products/${product._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to delete product");
      toast.success(data.message || "Product deleted");
      navigate("/vendor/products");
    } catch (deleteError) {
      toast.error(deleteError.message || "Failed to delete product");
    } finally {
      setActionLoading("");
    }
  };

  const detail = useMemo(() => {
    if (!product) return null;
    return {
      status: getVendorProductStatusMeta(product),
      inventory: summarizeVendorInventory(product),
      quality: getVendorProductQualityChecks(product),
      timeline: buildVendorProductTimeline(product),
    };
  }, [product]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error || !product || !detail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-3 text-xl font-black text-red-950">Product could not be loaded</h1>
        <p className="mt-2 text-sm text-red-700">{error || "The product was not found."}</p>
        <div className="mt-5 flex justify-center gap-3">
          <HeaderAction to="/vendor/products" icon={ArrowLeft}>Back to products</HeaderAction>
          <HeaderAction onClick={loadProduct} icon={RefreshCw}>Retry</HeaderAction>
        </div>
      </div>
    );
  }

  const category = categories[asId(product.categoryId)] || product.category || {};
  const images = product.images || [];
  const attributes = product.attributes || product.specifications || {};
  const canSubmit = ["draft", "rejected", "delisted", "inactive"].includes(
    String(product.approvalStatus || product.status || "").toLowerCase(),
  );

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              to="/vendor/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-orange-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Products
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-950">{product.title || "Untitled product"}</h1>
              <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${detail.status.tone}`}>
                {detail.status.label}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {detail.status.nextAction}. SKU {product.sku || product.variants?.[0]?.sku || "not set"}.
            </p>
          </div>

          {canManageProducts ? (
            <div className="flex flex-wrap gap-2">
              <HeaderAction to={`/vendor/products/edit/${product._id}`} icon={Pencil} tone="primary">
                Edit
              </HeaderAction>
              <HeaderAction to={`/vendor/products/add?clone=${product._id}`} icon={Copy}>
                Clone
              </HeaderAction>
              {canSubmit ? (
                <HeaderAction
                  onClick={submitForApproval}
                  icon={Send}
                  disabled={actionLoading === "submit"}
                >
                  Submit
                </HeaderAction>
              ) : null}
              {product.isActive !== false ? (
                <HeaderAction
                  onClick={delistProduct}
                  icon={Package}
                  disabled={actionLoading === "delist"}
                >
                  Delist
                </HeaderAction>
              ) : null}
              <HeaderAction
                onClick={deleteProduct}
                icon={Trash2}
                tone="danger"
                disabled={actionLoading === "delete"}
              >
                Delete
              </HeaderAction>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Product view-only access
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Price"
          value={formatPrice(product.price || 0)}
          note={product.compareAtPrice ? `Compare at ${formatPrice(product.compareAtPrice)}` : "Current selling price"}
          icon={BarChart3}
          tone="green"
        />
        <Metric
          label="Inventory"
          value={detail.inventory.totalStock}
          note={`${detail.inventory.lowStockVariants} low variants, ${detail.inventory.outOfStockVariants} out`}
          icon={Package}
          tone={detail.inventory.stockState === "healthy" ? "green" : "amber"}
        />
        <Metric
          label="Variants"
          value={detail.inventory.variantCount}
          note={detail.inventory.variantCount ? "SKU-level stock enabled" : "Single SKU listing"}
          icon={ShoppingBag}
          tone="blue"
        />
        <Metric
          label="Quality"
          value={`${detail.quality.score}%`}
          note={`${detail.quality.completed} of ${detail.quality.total} checks complete`}
          icon={CheckCircle2}
          tone={detail.quality.score >= 80 ? "green" : "amber"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Section title="Product Media" subtitle="The first image is treated as the storefront cover.">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_8rem]">
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                {selectedImage ? (
                  <img src={selectedImage} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="grid max-h-[28rem] grid-cols-4 gap-2 overflow-y-auto lg:grid-cols-1">
                {images.length ? (
                  images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className={`aspect-square overflow-hidden rounded-lg border ${
                        selectedImage === image ? "border-orange-500 ring-2 ring-orange-100" : "border-slate-200"
                      }`}
                    >
                      <img src={image} alt={`${product.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    No images
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section
            title="Moderation And Listing Health"
            subtitle="Use this area to understand why a listing is live, pending, or blocked."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-black uppercase text-slate-500">Current moderation</p>
                <p className="mt-2 text-lg font-black text-slate-950">{detail.status.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{detail.status.nextAction}</p>
                {product.rejectionReason ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
                    {product.rejectionReason}
                  </div>
                ) : null}
                {(product.moderationFlags || []).length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.moderationFlags.map((flag) => (
                      <span key={flag} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        {String(flag).replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-black uppercase text-slate-500">Important dates</p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    ["Created", product.createdAt],
                    ["Submitted", product.lastSubmittedAt],
                    ["Approved", product.approvedAt],
                    ["Updated", product.updatedAt],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="text-right font-bold text-slate-800">{formatDate(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Section>

          <Section title="Inventory And Variants" subtitle="Track SKU-level stock and restock risk.">
            {(product.variants || []).length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Variant</th>
                      <th className="px-3 py-3">Price</th>
                      <th className="px-3 py-3">Stock</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.variants.map((variant, index) => {
                      const stock = Number(variant.stock || 0);
                      const low = stock > 0 && stock <= detail.inventory.threshold;
                      const out = stock <= 0;

                      return (
                        <tr key={`${variant.sku || index}`}>
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-950">{getVariantLabel(variant, index)}</p>
                            {variant.image ? <p className="text-xs text-slate-500">Image attached</p> : null}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-800">
                            {formatPrice(variant.price || product.price || 0)}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-800">{stock}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                                out
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : low
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {out ? "Out" : low ? "Low" : "Healthy"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-950">Single SKU stock</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{product.stock || 0}</p>
                <p className="mt-1 text-sm text-slate-500">Low-stock alert at {detail.inventory.threshold}</p>
              </div>
            )}
          </Section>

          <Section title="Description And Attributes" subtitle="Buyer-facing information used in product detail and search.">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Description</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {product.description || "No description added yet."}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Attributes</p>
                {Object.keys(attributes).length ? (
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {Object.entries(attributes).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-slate-200 p-3">
                        <dt className="text-xs font-black uppercase text-slate-500">{key}</dt>
                        <dd className="mt-1 text-sm font-bold text-slate-950">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No attributes added yet.</p>
                )}
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="Listing Quality" subtitle="Fix these before scaling traffic.">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{detail.quality.score}% complete</span>
                <span>{detail.quality.completed}/{detail.quality.total}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${detail.quality.score}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              {detail.quality.checks.map((check) => (
                <QualityRow key={check.id} check={check} />
              ))}
            </div>
          </Section>

          <Section title="Sales Signals" subtitle="Performance fields shown when available.">
            <dl className="space-y-3 text-sm">
              {[
                ["Views", product.views || product.viewCount || 0, Eye],
                ["Sold", product.soldCount || product.totalSold || 0, ShoppingBag],
                ["Revenue", formatPrice(product.revenue || product.totalRevenue || 0), BarChart3],
                ["Category", category.name || product.categoryName || "Uncategorized", FileText],
              ].map(([label, value, Icon]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <Icon className="h-4 w-4" />
                    {label}
                  </dt>
                  <dd className="text-right font-black text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Timeline" subtitle="Latest product activity first.">
            {detail.timeline.length ? (
              <div className="space-y-3">
                {detail.timeline.map((event, index) => (
                  <div key={`${event.type}-${event.at.toISOString()}-${index}`} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    <div>
                      <p className="text-sm font-black capitalize text-slate-950">{event.label}</p>
                      <p className="text-xs text-slate-500">{formatDate(event.at)}</p>
                      {event.note ? <p className="mt-1 text-xs leading-5 text-slate-500">{event.note}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No timeline events yet.</p>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
