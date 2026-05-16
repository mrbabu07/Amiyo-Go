import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  BadgePercent,
  BarChart3,
  Box,
  CalendarClock,
  CheckCircle2,
  Gift,
  Megaphone,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Star,
  TicketPercent,
  Truck,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  createVendorMarketingItem,
  deleteVendorMarketingItem,
  getMyCampaignJoins,
  getVendorCampaigns,
  getVendorCatalogProducts,
  getVendorMarketingAnalytics,
  getVendorMarketingItems,
  joinPlatformCampaign,
} from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useCurrency from "../../hooks/useCurrency";

const toolTabs = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "nominations", label: "Nominations", icon: PackageCheck },
  { id: "vouchers", label: "Vouchers", icon: TicketPercent },
  { id: "bundles", label: "Bundles", icon: Box },
  { id: "shipping", label: "Free Shipping", icon: Truck },
  { id: "picks", label: "Seller Picks", icon: Star },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Ended: "bg-slate-100 text-slate-600 border-slate-200",
};

const typeLabels = {
  campaign_nomination: "Campaign nomination",
  campaign: "Campaign request",
  voucher: "Seller voucher",
  bundle: "Bundle deal",
  free_shipping: "Free shipping",
  seller_pick: "Seller picks",
  promotion: "Promotion",
};

const nowInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const daysFromNowInput = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const dateInputFromValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const dateLabel = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeProductsPayload = (payload) => payload?.products || payload?.data || [];

const productId = (product) => product?._id?.toString?.() || String(product?._id || "");

const getProductSku = (product) => product?.sku || product?.variants?.[0]?.sku || "No SKU";

const getProductImage = (product) => product?.images?.[0] || product?.variants?.find((variant) => variant.image)?.image || "";

const getProductOptionLabel = (product) => `${product?.title || "Product"} - ${getProductSku(product)}`;

const initialVoucherForm = () => ({
  title: "",
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  usageLimit: "",
  startDate: nowInput(),
  endDate: daysFromNowInput(7),
  description: "",
});

const initialBundleForm = () => ({
  title: "",
  bundleType: "quantity_discount",
  productIds: [],
  bundleQuantity: "2",
  discountType: "percentage",
  discountValue: "10",
  bundleFixedPrice: "",
  startDate: nowInput(),
  endDate: daysFromNowInput(14),
  description: "",
});

const initialShippingForm = () => ({
  title: "Free shipping offer",
  minOrderAmount: "",
  startDate: nowInput(),
  endDate: daysFromNowInput(14),
  description: "",
});

const initialPickForm = () => ({
  title: "Seller Picks",
  productIds: [],
  startDate: nowInput(),
  endDate: daysFromNowInput(30),
  description: "",
});

const initialNominationForm = () => ({
  campaignId: "",
  rows: [],
  description: "",
});

const entityTone = (entityType = "") => {
  if (entityType.includes("voucher")) return "text-orange-700 bg-orange-50";
  if (entityType.includes("campaign")) return "text-blue-700 bg-blue-50";
  if (entityType.includes("bundle")) return "text-violet-700 bg-violet-50";
  if (entityType.includes("shipping")) return "text-emerald-700 bg-emerald-50";
  return "text-slate-700 bg-slate-100";
};

export default function VendorMarketing() {
  const { user } = useAuth();
  const location = useLocation();
  const { formatPrice } = useCurrency();

  const initialTool = useMemo(() => {
    if (location.pathname.includes("vouchers")) return "vouchers";
    if (location.pathname.includes("campaigns")) return "campaigns";
    return "campaigns";
  }, [location.pathname]);

  const [activeTool, setActiveTool] = useState(initialTool);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignJoins, setCampaignJoins] = useState([]);
  const [products, setProducts] = useState([]);
  const [marketingItems, setMarketingItems] = useState([]);
  const [analytics, setAnalytics] = useState({ summary: {}, rows: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [joiningCampaignId, setJoiningCampaignId] = useState("");
  const [saving, setSaving] = useState(false);

  const [voucherForm, setVoucherForm] = useState(initialVoucherForm);
  const [bundleForm, setBundleForm] = useState(initialBundleForm);
  const [shippingForm, setShippingForm] = useState(initialShippingForm);
  const [pickForm, setPickForm] = useState(initialPickForm);
  const [nominationForm, setNominationForm] = useState(initialNominationForm);

  useEffect(() => {
    setActiveTool(initialTool);
  }, [initialTool]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [campaignRes, joinsRes, productsRes, itemsRes, analyticsRes] = await Promise.allSettled([
        getVendorCampaigns(),
        getMyCampaignJoins(),
        getVendorCatalogProducts({ limit: 300 }),
        getVendorMarketingItems(),
        getVendorMarketingAnalytics(),
      ]);

      if (campaignRes.status === "fulfilled") {
        setCampaigns(campaignRes.value.data.data || []);
      }
      if (joinsRes.status === "fulfilled") {
        setCampaignJoins(joinsRes.value.data.data || []);
      }
      if (productsRes.status === "fulfilled") {
        setProducts(normalizeProductsPayload(productsRes.value.data));
      }
      if (itemsRes.status === "fulfilled") {
        setMarketingItems(itemsRes.value.data.data || []);
      }
      if (analyticsRes.status === "fulfilled") {
        setAnalytics(analyticsRes.value.data.data || { summary: {}, rows: [] });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load promotions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const joinedCampaignIds = useMemo(
    () => new Set(campaignJoins.map((join) => join.campaignId?.toString?.() || String(join.campaignId || ""))),
    [campaignJoins],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [productId(product), product])),
    [products],
  );

  const filteredCampaigns = useMemo(() => {
    const term = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (!term) return true;
      return [campaign.name, campaign.description, campaign.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [campaigns, query]);

  const submissionsByType = useMemo(() => {
    const groups = {
      campaign_nomination: [],
      voucher: [],
      bundle: [],
      free_shipping: [],
      seller_pick: [],
      promotion: [],
      campaign: [],
    };
    marketingItems.forEach((item) => {
      const group = groups[item.type] ? item.type : "promotion";
      groups[group].push(item);
    });
    return groups;
  }, [marketingItems]);

  const stats = useMemo(() => {
    const pending = marketingItems.filter((item) => item.status === "pending").length;
    const approved = marketingItems.filter((item) => item.status === "approved").length;
    const liveCampaigns = campaigns.filter((campaign) => ["Active", "Scheduled"].includes(campaign.status)).length;
    return {
      liveCampaigns,
      pending,
      approved,
      redemptions: analytics.summary?.usedCount || 0,
      revenue: analytics.summary?.revenueGenerated || 0,
    };
  }, [analytics.summary, campaigns, marketingItems]);

  const submitMarketingItem = async (payload, successMessage) => {
    setSaving(true);
    try {
      await createVendorMarketingItem(payload);
      toast.success(successMessage);
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save promotion");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const joinCampaign = async (campaignId) => {
    setJoiningCampaignId(campaignId);
    try {
      await joinPlatformCampaign(campaignId);
      toast.success("Campaign joined");
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to join campaign");
    } finally {
      setJoiningCampaignId("");
    }
  };

  const startNomination = (campaign) => {
    setNominationForm({
      campaignId: campaign._id,
      rows: [],
      description: "",
    });
    setActiveTool("nominations");
  };

  const addNominationRow = () => {
    const firstProduct = products.find((product) => !nominationForm.rows.some((row) => row.productId === productId(product)));
    if (!firstProduct) {
      toast.error("No more products available");
      return;
    }
    setNominationForm((current) => ({
      ...current,
      rows: [
        ...current.rows,
        {
          productId: productId(firstProduct),
          variantSku: "",
          campaignPrice: String(firstProduct.price || ""),
        },
      ],
    }));
  };

  const updateNominationRow = (index, field, value) => {
    setNominationForm((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "productId") {
          const product = productMap.get(value);
          next.variantSku = "";
          next.campaignPrice = String(product?.price || "");
        }
        return next;
      }),
    }));
  };

  const removeNominationRow = (index) => {
    setNominationForm((current) => ({
      ...current,
      rows: current.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const submitNomination = async (event) => {
    event.preventDefault();
    const campaign = campaigns.find((item) => item._id === nominationForm.campaignId);
    const ok = await submitMarketingItem(
      {
        type: "campaign_nomination",
        campaignId: nominationForm.campaignId,
        title: campaign?.name || "Campaign nomination",
        description: nominationForm.description || `Product nomination for ${campaign?.name || "campaign"}`,
        startDate: dateInputFromValue(campaign?.startDate) || nowInput(),
        endDate: dateInputFromValue(campaign?.endDate) || daysFromNowInput(7),
        productNominations: nominationForm.rows,
      },
      "Products submitted for campaign review",
    );
    if (ok) setNominationForm(initialNominationForm());
  };

  const submitVoucher = async (event) => {
    event.preventDefault();
    const title = voucherForm.title.trim();
    const ok = await submitMarketingItem(
      {
        ...voucherForm,
        type: "voucher",
        title,
        description: voucherForm.description || `${title} seller voucher`,
        discountValue: voucherForm.discountType === "free_shipping" ? 0 : voucherForm.discountValue,
      },
      "Voucher submitted for review",
    );
    if (ok) setVoucherForm(initialVoucherForm());
  };

  const submitBundle = async (event) => {
    event.preventDefault();
    const title = bundleForm.title.trim();
    const ok = await submitMarketingItem(
      {
        ...bundleForm,
        type: "bundle",
        title,
        description: bundleForm.description || `${title} bundle deal`,
      },
      "Bundle submitted for review",
    );
    if (ok) setBundleForm(initialBundleForm());
  };

  const submitShipping = async (event) => {
    event.preventDefault();
    const title = shippingForm.title.trim();
    const ok = await submitMarketingItem(
      {
        ...shippingForm,
        type: "free_shipping",
        title,
        description: shippingForm.description || `${title} above ${formatPrice(shippingForm.minOrderAmount || 0)}`,
      },
      "Free shipping offer submitted",
    );
    if (ok) setShippingForm(initialShippingForm());
  };

  const submitPicks = async (event) => {
    event.preventDefault();
    const ok = await submitMarketingItem(
      {
        ...pickForm,
        type: "seller_pick",
        description: pickForm.description || "Featured products for shop page",
      },
      "Seller picks submitted",
    );
    if (ok) setPickForm(initialPickForm());
  };

  const deleteSubmission = async (item) => {
    try {
      await deleteVendorMarketingItem(item._id);
      toast.success("Submission deleted");
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete submission");
    }
  };

  const toggleProductSelection = (currentIds, product, max = 999) => {
    const id = productId(product);
    if (currentIds.includes(id)) {
      return currentIds.filter((currentId) => currentId !== id);
    }
    if (currentIds.length >= max) {
      toast.error(`Select up to ${max} products`);
      return currentIds;
    }
    return [...currentIds, id];
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Promotions</h1>
              <p className="text-sm text-slate-500">Campaigns, vouchers, bundles, shipping offers, picks, and analytics.</p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Live Campaigns" value={stats.liveCampaigns} icon={Megaphone} />
            <Metric label="Pending Review" value={stats.pending} icon={CalendarClock} />
            <Metric label="Approved" value={stats.approved} icon={CheckCircle2} />
            <Metric label="Redemptions" value={stats.redemptions} icon={TicketPercent} />
            <Metric label="Revenue" value={formatPrice(stats.revenue)} icon={BarChart3} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {toolTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTool(tab.id)}
              className={`inline-flex whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTool === tab.id
                  ? "bg-orange-500 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {createElement(tab.icon, { className: "mr-2 h-4 w-4" })}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTool === "campaigns" && (
          <Panel>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <PanelTitle title="Campaign Browser" subtitle="Upcoming and live platform campaigns" />
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="Search campaigns"
                />
              </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {filteredCampaigns.length === 0 ? (
                <EmptyState text="No campaigns are open right now." />
              ) : (
                filteredCampaigns.map((campaign) => {
                  const campaignId = campaign._id?.toString?.() || campaign._id;
                  const joined = campaign.joined || joinedCampaignIds.has(campaignId);
                  const eligibilityRules = campaign.eligibilityRules || {};
                  const eligibleCategoryCount =
                    eligibilityRules.eligibleCategoryCount ??
                    (campaign.eligibleCategories || []).length;
                  return (
                    <div key={campaignId} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">{campaign.name}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{campaign.description || "Platform campaign"}</p>
                        </div>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <Fact label="Deadline" value={dateLabel(campaign.joinDeadline || campaign.startDate)} />
                        <Fact label="Discount" value={`${campaign.discountPercentage || 0}%`} />
                        <Fact label="Max SKUs" value={campaign.maxProductsPerVendor || "N/A"} />
                      </div>
                      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        Eligibility: {eligibleCategoryCount || "All"} categories, campaign price {"<="} regular price
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={joined || joiningCampaignId === campaignId}
                          onClick={() => joinCampaign(campaignId)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            joined
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                          }`}
                        >
                          {joined ? "Joined" : joiningCampaignId === campaignId ? "Joining..." : "Join"}
                        </button>
                        <button
                          type="button"
                          onClick={() => startNomination(campaign)}
                          className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
                        >
                          Nominate SKUs
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        )}

        {activeTool === "nominations" && (
          <Panel>
            <PanelHeader title="Product Nomination" subtitle="Campaign price must be less than or equal to regular price" />
            <form onSubmit={submitNomination} className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Campaign">
                  <select
                    required
                    value={nominationForm.campaignId}
                    onChange={(event) => setNominationForm((current) => ({ ...current, campaignId: event.target.value }))}
                    className="input-control"
                  >
                    <option value="">Select campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign._id} value={campaign._id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Notes">
                  <input
                    value={nominationForm.description}
                    onChange={(event) => setNominationForm((current) => ({ ...current, description: event.target.value }))}
                    className="input-control"
                    placeholder="Optional admin note"
                  />
                </Field>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">SKU rows</span>
                  <button
                    type="button"
                    onClick={addNominationRow}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add SKU
                  </button>
                </div>
                {nominationForm.rows.length === 0 ? (
                  <EmptyState text="Add products to submit campaign prices." compact />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Variant SKU</th>
                          <th className="px-4 py-3">Regular</th>
                          <th className="px-4 py-3">Campaign Price</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {nominationForm.rows.map((row, index) => {
                          const product = productMap.get(row.productId);
                          const variant = product?.variants?.find((item) => item.sku === row.variantSku);
                          const regularPrice = Number(variant?.price || product?.price || 0);
                          return (
                            <tr key={`${row.productId}-${index}`}>
                              <td className="px-4 py-3">
                                <select
                                  value={row.productId}
                                  onChange={(event) => updateNominationRow(index, "productId", event.target.value)}
                                  className="input-control"
                                >
                                  {products.map((item) => (
                                    <option key={productId(item)} value={productId(item)}>
                                      {getProductOptionLabel(item)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={row.variantSku}
                                  onChange={(event) => updateNominationRow(index, "variantSku", event.target.value)}
                                  className="input-control"
                                >
                                  <option value="">Base SKU</option>
                                  {(product?.variants || []).map((item) => (
                                    <option key={item.sku || `${item.color}-${item.size}`} value={item.sku || ""}>
                                      {item.sku || `${item.color || ""} ${item.size || ""}`.trim()}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatPrice(regularPrice)}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  max={regularPrice || undefined}
                                  step="0.01"
                                  value={row.campaignPrice}
                                  onChange={(event) => updateNominationRow(index, "campaignPrice", event.target.value)}
                                  className="input-control"
                                  required
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button type="button" onClick={() => removeNominationRow(index)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <SubmitBar saving={saving} label="Submit nomination" />
            </form>
            <SubmissionList items={submissionsByType.campaign_nomination} onDelete={deleteSubmission} formatPrice={formatPrice} />
          </Panel>
        )}

        {activeTool === "vouchers" && (
          <Panel>
            <PanelHeader title="Seller Vouchers" subtitle="Percentage, fixed amount, or free shipping codes" />
            <form onSubmit={submitVoucher} className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Title">
                <input required value={voucherForm.title} onChange={(event) => setVoucherForm({ ...voucherForm, title: event.target.value })} className="input-control" />
              </Field>
              <Field label="Code">
                <input required value={voucherForm.code} onChange={(event) => setVoucherForm({ ...voucherForm, code: event.target.value.toUpperCase() })} className="input-control uppercase" />
              </Field>
              <Field label="Discount type">
                <select value={voucherForm.discountType} onChange={(event) => setVoucherForm({ ...voucherForm, discountType: event.target.value })} className="input-control">
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </Field>
              {voucherForm.discountType !== "free_shipping" && (
                <Field label="Discount value">
                  <input required type="number" min="1" value={voucherForm.discountValue} onChange={(event) => setVoucherForm({ ...voucherForm, discountValue: event.target.value })} className="input-control" />
                </Field>
              )}
              <Field label="Minimum order">
                <input type="number" min="0" value={voucherForm.minOrderAmount} onChange={(event) => setVoucherForm({ ...voucherForm, minOrderAmount: event.target.value })} className="input-control" />
              </Field>
              <Field label="Usage limit">
                <input type="number" min="1" value={voucherForm.usageLimit} onChange={(event) => setVoucherForm({ ...voucherForm, usageLimit: event.target.value })} className="input-control" />
              </Field>
              <Field label="Start">
                <input required type="datetime-local" value={voucherForm.startDate} onChange={(event) => setVoucherForm({ ...voucherForm, startDate: event.target.value })} className="input-control" />
              </Field>
              <Field label="End">
                <input required type="datetime-local" value={voucherForm.endDate} onChange={(event) => setVoucherForm({ ...voucherForm, endDate: event.target.value })} className="input-control" />
              </Field>
              <Field label="Description" wide>
                <textarea value={voucherForm.description} onChange={(event) => setVoucherForm({ ...voucherForm, description: event.target.value })} rows={3} className="input-control" />
              </Field>
              <SubmitBar saving={saving} label="Submit voucher" wide />
            </form>
            <SubmissionList items={submissionsByType.voucher} onDelete={deleteSubmission} formatPrice={formatPrice} />
          </Panel>
        )}

        {activeTool === "bundles" && (
          <Panel>
            <PanelHeader title="Bundle Deals" subtitle="Quantity discounts or fixed bundle pricing" />
            <form onSubmit={submitBundle} className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <input required value={bundleForm.title} onChange={(event) => setBundleForm({ ...bundleForm, title: event.target.value })} className="input-control" />
                </Field>
                <Field label="Bundle type">
                  <select value={bundleForm.bundleType} onChange={(event) => setBundleForm({ ...bundleForm, bundleType: event.target.value })} className="input-control">
                    <option value="quantity_discount">Buy quantity, get discount</option>
                    <option value="fixed_bundle">Buy together for fixed price</option>
                  </select>
                </Field>
                {bundleForm.bundleType === "quantity_discount" ? (
                  <>
                    <Field label="Required quantity">
                      <input required type="number" min="2" value={bundleForm.bundleQuantity} onChange={(event) => setBundleForm({ ...bundleForm, bundleQuantity: event.target.value })} className="input-control" />
                    </Field>
                    <Field label="Discount">
                      <div className="grid grid-cols-[1fr_120px] gap-2">
                        <input required type="number" min="1" value={bundleForm.discountValue} onChange={(event) => setBundleForm({ ...bundleForm, discountValue: event.target.value })} className="input-control" />
                        <select value={bundleForm.discountType} onChange={(event) => setBundleForm({ ...bundleForm, discountType: event.target.value })} className="input-control">
                          <option value="percentage">Percent</option>
                          <option value="fixed">BDT</option>
                        </select>
                      </div>
                    </Field>
                  </>
                ) : (
                  <Field label="Bundle price">
                    <input required type="number" min="1" value={bundleForm.bundleFixedPrice} onChange={(event) => setBundleForm({ ...bundleForm, bundleFixedPrice: event.target.value })} className="input-control" />
                  </Field>
                )}
                <Field label="Start">
                  <input required type="datetime-local" value={bundleForm.startDate} onChange={(event) => setBundleForm({ ...bundleForm, startDate: event.target.value })} className="input-control" />
                </Field>
                <Field label="End">
                  <input required type="datetime-local" value={bundleForm.endDate} onChange={(event) => setBundleForm({ ...bundleForm, endDate: event.target.value })} className="input-control" />
                </Field>
              </div>
              <ProductPicker
                products={products}
                selectedIds={bundleForm.productIds}
                onToggle={(product) => setBundleForm((current) => ({ ...current, productIds: toggleProductSelection(current.productIds, product) }))}
              />
              <Field label="Description">
                <textarea value={bundleForm.description} onChange={(event) => setBundleForm({ ...bundleForm, description: event.target.value })} rows={3} className="input-control" />
              </Field>
              <SubmitBar saving={saving} label="Submit bundle" />
            </form>
            <SubmissionList items={submissionsByType.bundle} onDelete={deleteSubmission} formatPrice={formatPrice} />
          </Panel>
        )}

        {activeTool === "shipping" && (
          <Panel>
            <PanelHeader title="Free Shipping Offers" subtitle="Vendor-funded shipping threshold" />
            <form onSubmit={submitShipping} className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Title">
                <input required value={shippingForm.title} onChange={(event) => setShippingForm({ ...shippingForm, title: event.target.value })} className="input-control" />
              </Field>
              <Field label="Minimum order">
                <input required type="number" min="0" value={shippingForm.minOrderAmount} onChange={(event) => setShippingForm({ ...shippingForm, minOrderAmount: event.target.value })} className="input-control" />
              </Field>
              <Field label="Start">
                <input required type="datetime-local" value={shippingForm.startDate} onChange={(event) => setShippingForm({ ...shippingForm, startDate: event.target.value })} className="input-control" />
              </Field>
              <Field label="End">
                <input required type="datetime-local" value={shippingForm.endDate} onChange={(event) => setShippingForm({ ...shippingForm, endDate: event.target.value })} className="input-control" />
              </Field>
              <Field label="Description" wide>
                <textarea value={shippingForm.description} onChange={(event) => setShippingForm({ ...shippingForm, description: event.target.value })} rows={3} className="input-control" />
              </Field>
              <SubmitBar saving={saving} label="Submit free shipping" wide />
            </form>
            <SubmissionList items={submissionsByType.free_shipping} onDelete={deleteSubmission} formatPrice={formatPrice} />
          </Panel>
        )}

        {activeTool === "picks" && (
          <Panel>
            <PanelHeader title="Seller Picks" subtitle="Pin up to 8 products on your shop page" />
            <form onSubmit={submitPicks} className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Title">
                  <input required value={pickForm.title} onChange={(event) => setPickForm({ ...pickForm, title: event.target.value })} className="input-control" />
                </Field>
                <Field label="Start">
                  <input required type="datetime-local" value={pickForm.startDate} onChange={(event) => setPickForm({ ...pickForm, startDate: event.target.value })} className="input-control" />
                </Field>
                <Field label="End">
                  <input required type="datetime-local" value={pickForm.endDate} onChange={(event) => setPickForm({ ...pickForm, endDate: event.target.value })} className="input-control" />
                </Field>
              </div>
              <ProductPicker
                products={products}
                selectedIds={pickForm.productIds}
                max={8}
                onToggle={(product) => setPickForm((current) => ({ ...current, productIds: toggleProductSelection(current.productIds, product, 8) }))}
              />
              <Field label="Description">
                <textarea value={pickForm.description} onChange={(event) => setPickForm({ ...pickForm, description: event.target.value })} rows={3} className="input-control" />
              </Field>
              <SubmitBar saving={saving} label="Submit seller picks" />
            </form>
            <SubmissionList items={submissionsByType.seller_pick} onDelete={deleteSubmission} formatPrice={formatPrice} />
          </Panel>
        )}

        {activeTool === "analytics" && (
          <Panel>
            <PanelHeader title="Voucher Analytics" subtitle="Redemption, revenue, and conversion by promotion" />
            <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-4">
              <Metric label="Views" value={analytics.summary?.viewCount || 0} icon={Search} compact />
              <Metric label="Clicks" value={analytics.summary?.clickCount || 0} icon={BadgePercent} compact />
              <Metric label="Redemptions" value={analytics.summary?.usedCount || 0} icon={Gift} compact />
              <Metric label="Revenue" value={formatPrice(analytics.summary?.revenueGenerated || 0)} icon={BarChart3} compact />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Promotion</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Views</th>
                    <th className="px-4 py-3">Clicks</th>
                    <th className="px-4 py-3">Redeemed</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(analytics.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No analytics yet.</td>
                    </tr>
                  ) : (
                    analytics.rows.map((row) => (
                      <tr key={row._id || row.entityId}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950">{row.title || row.code || "Promotion"}</div>
                          {row.code && <div className="font-mono text-xs text-slate-500">{row.code}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entityTone(row.entityType)}`}>
                            {row.entityType?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.viewCount || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.clickCount || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.usedCount || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-950">{formatPrice(row.revenueGenerated || 0)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.conversionRate || 0}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function Panel({ children }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">{children}</section>;
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="border-b border-slate-200 p-4">
      <PanelTitle title={title} subtitle={subtitle} />
    </div>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function Metric({ label, value, icon, compact = false }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={`${compact ? "text-xl" : "text-2xl"} mt-1 font-semibold text-slate-950`}>{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {createElement(icon, { className: "h-5 w-5" })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SubmitBar({ saving, label, wide = false }) {
  return (
    <div className={`flex justify-end ${wide ? "md:col-span-2" : ""}`}>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? "Saving..." : label}
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || "border-slate-200 bg-slate-100 text-slate-600"}`}>
      {status || "pending"}
    </span>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <div className={`text-center text-sm text-slate-500 ${compact ? "px-4 py-8" : "col-span-full px-4 py-12"}`}>
      {text}
    </div>
  );
}

function ProductPicker({ products, selectedIds, onToggle, max }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Products</span>
        <span className="text-xs text-slate-500">
          {selectedIds.length}{max ? `/${max}` : ""} selected
        </span>
      </div>
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No products available.
        </div>
      ) : (
        <div className="grid max-h-[420px] gap-3 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const id = productId(product);
            const selected = selectedIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggle(product)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  selected ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{product.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{getProductSku(product)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubmissionList({ items, onDelete, formatPrice }) {
  if (!items || items.length === 0) {
    return <EmptyState text="No submissions yet." />;
  }

  return (
    <div className="border-t border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Submissions</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item._id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-slate-950">{item.title || item.campaignName || "Promotion"}</h4>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.description || typeLabels[item.type]}</p>
              </div>
              {item.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="w-fit rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Type" value={typeLabels[item.type] || item.type} />
              {item.code && <Fact label="Code" value={item.code} />}
              {item.minOrderAmount !== null && item.minOrderAmount !== undefined && (
                <Fact label="Minimum" value={formatPrice(item.minOrderAmount || 0)} />
              )}
              <Fact label="End" value={dateLabel(item.endDate)} />
            </div>
            {item.productNominations?.length > 0 && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Nominated SKUs</p>
                <div className="mt-2 space-y-2">
                  {item.productNominations.map((row) => (
                    <div key={`${row.productId}-${row.sku}`} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">{row.title}</span>
                      <span className="font-semibold text-slate-950">{formatPrice(row.campaignPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {item.selectedProducts?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.selectedProducts.slice(0, 8).map((product) => (
                  <span key={product.productId} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {product.title}
                  </span>
                ))}
              </div>
            )}
            {item.adminNotes && (
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Admin note: {item.adminNotes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
