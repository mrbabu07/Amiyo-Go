import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  createVendorMarketingItem,
  deleteVendorMarketingItem,
  getActiveCoupons,
  getActivePopupOffer,
  getVendorMarketingItems,
  updateVendorMarketingItem,
} from "../../services/api";
import useAuth from "../../hooks/useAuth";

const tabs = [
  { id: "promotions", label: "Promotions", path: "/vendor/marketing/promotions", type: "promotion" },
  { id: "vouchers", label: "Vouchers", path: "/vendor/marketing/vouchers", type: "voucher" },
  { id: "campaigns", label: "Campaigns", path: "/vendor/marketing/campaigns", type: "campaign" },
];

const initialFormByType = {
  promotion: {
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    startDate: "",
    endDate: "",
    placement: "Homepage banner",
  },
  voucher: {
    title: "",
    description: "",
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    usageLimit: "",
    startDate: "",
    endDate: "",
  },
  campaign: {
    campaignId: "",
    title: "",
    description: "",
    requestedDiscountPercentage: "",
    expectedProducts: "",
    startDate: "",
    endDate: "",
  },
};

const statusBadge = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    Active: "bg-green-100 text-green-700",
    Scheduled: "bg-blue-100 text-blue-700",
    Ended: "bg-gray-100 text-gray-500",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

const EmptyState = ({ title, text }) => (
  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{text}</p>
  </div>
);

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

export default function VendorMarketing() {
  const { user } = useAuth();
  const location = useLocation();
  const activeTab = tabs.find((tab) => location.pathname.includes(tab.id)) || tabs[0];

  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [popupOffer, setPopupOffer] = useState(null);
  const [marketingItems, setMarketingItems] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formState, setFormState] = useState(initialFormByType);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingCampaigns(true);
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/campaigns/vendor/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Failed to load campaigns");
      setCampaigns(data.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load campaigns");
    } finally {
      setLoadingCampaigns(false);
    }
  }, [user]);

  const fetchPromotions = useCallback(async () => {
    try {
      setLoadingPromotions(true);
      const [couponResponse, popupResponse] = await Promise.all([
        getActiveCoupons(),
        getActivePopupOffer(),
      ]);
      setCoupons(couponResponse.data.data || []);
      setPopupOffer(popupResponse.data.data || null);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Failed to load marketing data");
    } finally {
      setLoadingPromotions(false);
    }
  }, []);

  const fetchVendorItems = useCallback(async () => {
    try {
      setLoadingItems(true);
      const response = await getVendorMarketingItems();
      setMarketingItems(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load your marketing submissions");
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchPromotions();
    fetchVendorItems();
  }, [fetchCampaigns, fetchPromotions, fetchVendorItems]);

  useEffect(() => {
    setEditingItemId(null);
  }, [activeTab.id]);

  const filteredVendorItems = useMemo(
    () => marketingItems.filter((item) => item.type === activeTab.type),
    [activeTab.type, marketingItems],
  );

  const campaignStats = useMemo(
    () => ({
      active: campaigns.filter((campaign) => campaign.status === "Active").length,
      coupons: coupons.length,
      vendorSubmissions: marketingItems.filter((item) => item.status === "pending").length,
      popupOffers: popupOffer ? 1 : 0,
    }),
    [campaigns, coupons.length, marketingItems, popupOffer],
  );

  const currentForm = formState[activeTab.type];

  const setCurrentForm = (updater) => {
    setFormState((prev) => ({
      ...prev,
      [activeTab.type]:
        typeof updater === "function" ? updater(prev[activeTab.type]) : updater,
    }));
  };

  const resetCurrentForm = () => {
    setCurrentForm(initialFormByType[activeTab.type]);
    setEditingItemId(null);
  };

  const handleFieldChange = (field, value) => {
    setCurrentForm((prev) => ({
      ...prev,
      [field]: field === "code" ? String(value).toUpperCase() : value,
    }));
  };

  const submitForm = async () => {
    const payload = {
      ...currentForm,
      type: activeTab.type,
    };

    try {
      setSavingItem(true);
      const response = editingItemId
        ? await updateVendorMarketingItem(editingItemId, payload)
        : await createVendorMarketingItem(payload);

      const updatedItem = response.data.data;
      setMarketingItems((prev) => {
        if (editingItemId) {
          return prev.map((item) => (item._id === editingItemId ? updatedItem : item));
        }
        return [updatedItem, ...prev];
      });

      toast.success(response.data.message || "Marketing submission saved");
      resetCurrentForm();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save marketing submission");
    } finally {
      setSavingItem(false);
    }
  };

  const editItem = (item) => {
    setEditingItemId(item._id);
    setFormState((prev) => ({
      ...prev,
      [item.type]: {
        title: item.title || "",
        description: item.description || "",
        discountType: item.discountType || "percentage",
        discountValue: item.discountValue ?? "",
        startDate: toDateInput(item.startDate),
        endDate: toDateInput(item.endDate),
        placement: item.placement || "Homepage banner",
        code: item.code || "",
        minOrderAmount: item.minOrderAmount ?? "",
        usageLimit: item.usageLimit ?? "",
        campaignId: item.campaignId || "",
        requestedDiscountPercentage: item.requestedDiscountPercentage ?? "",
        expectedProducts: item.expectedProducts ?? "",
      },
    }));
  };

  const removeItem = async (itemId) => {
    try {
      await deleteVendorMarketingItem(itemId);
      setMarketingItems((prev) => prev.filter((item) => item._id !== itemId));
      if (editingItemId === itemId) {
        resetCurrentForm();
      }
      toast.success("Marketing submission deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete marketing submission");
    }
  };

  const copyCouponCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Unable to copy code");
    }
  };

  const renderComposer = () => {
    if (activeTab.type === "promotion") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input value={currentForm.title} onChange={(e) => handleFieldChange("title", e.target.value)} placeholder="Promotion title" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <select value={currentForm.discountType} onChange={(e) => handleFieldChange("discountType", e.target.value)} className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400">
            <option value="percentage">Percentage discount</option>
            <option value="fixed">Fixed discount</option>
          </select>
          <input value={currentForm.discountValue} onChange={(e) => handleFieldChange("discountValue", e.target.value)} placeholder="Discount value" type="number" min="0" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.placement} onChange={(e) => handleFieldChange("placement", e.target.value)} placeholder="Placement, e.g. Homepage banner" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.startDate} onChange={(e) => handleFieldChange("startDate", e.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.endDate} onChange={(e) => handleFieldChange("endDate", e.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <textarea value={currentForm.description} onChange={(e) => handleFieldChange("description", e.target.value)} placeholder="Promotion details for admin review" rows={4} className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        </div>
      );
    }

    if (activeTab.type === "voucher") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input value={currentForm.title} onChange={(e) => handleFieldChange("title", e.target.value)} placeholder="Voucher title" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.code} onChange={(e) => handleFieldChange("code", e.target.value)} placeholder="Voucher code" className="rounded-lg border border-gray-300 px-4 py-3 text-sm uppercase focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <select value={currentForm.discountType} onChange={(e) => handleFieldChange("discountType", e.target.value)} className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400">
            <option value="percentage">Percentage discount</option>
            <option value="fixed">Fixed discount</option>
          </select>
          <input value={currentForm.discountValue} onChange={(e) => handleFieldChange("discountValue", e.target.value)} placeholder="Discount value" type="number" min="0" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.minOrderAmount} onChange={(e) => handleFieldChange("minOrderAmount", e.target.value)} placeholder="Minimum order amount" type="number" min="0" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.usageLimit} onChange={(e) => handleFieldChange("usageLimit", e.target.value)} placeholder="Usage limit" type="number" min="1" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.startDate} onChange={(e) => handleFieldChange("startDate", e.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <input value={currentForm.endDate} onChange={(e) => handleFieldChange("endDate", e.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
          <textarea value={currentForm.description} onChange={(e) => handleFieldChange("description", e.target.value)} placeholder="Voucher details for admin review" rows={4} className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <select value={currentForm.campaignId} onChange={(e) => handleFieldChange("campaignId", e.target.value)} className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400">
          <option value="">Custom campaign request</option>
          {campaigns.map((campaign) => (
            <option key={campaign._id} value={campaign._id}>{campaign.name}</option>
          ))}
        </select>
        <input value={currentForm.title} onChange={(e) => handleFieldChange("title", e.target.value)} placeholder="Campaign request title" disabled={Boolean(currentForm.campaignId)} className="rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-100 focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        <input value={currentForm.requestedDiscountPercentage} onChange={(e) => handleFieldChange("requestedDiscountPercentage", e.target.value)} placeholder="Requested discount %" type="number" min="1" max="100" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        <input value={currentForm.expectedProducts} onChange={(e) => handleFieldChange("expectedProducts", e.target.value)} placeholder="Expected product count" type="number" min="1" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        <input value={currentForm.startDate} onChange={(e) => handleFieldChange("startDate", e.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        <input value={currentForm.endDate} onChange={(e) => handleFieldChange("endDate", e.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
        <textarea value={currentForm.description} onChange={(e) => handleFieldChange("description", e.target.value)} placeholder="Explain why this campaign should run and how it helps your store" rows={4} className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing Tools</h1>
              <p className="text-sm text-gray-500">Create vendor marketing submissions, review platform opportunities, and track approval status.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Active Campaigns", value: campaignStats.active, color: "text-green-600" },
            { label: "Active Coupons", value: campaignStats.coupons, color: "text-blue-600" },
            { label: "Pending Reviews", value: campaignStats.vendorSubmissions, color: "text-orange-600" },
            { label: "Popup Offers", value: campaignStats.popupOffers, color: "text-gray-900" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex-1 border-b-2 py-4 text-center text-sm font-medium transition ${
                  activeTab.id === tab.id
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="space-y-6 p-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {editingItemId ? "Edit Submission" : `Create ${activeTab.label.slice(0, -1) || activeTab.label}`}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Vendor submissions stay pending until admin reviews and approves them.
                  </p>
                </div>
                {editingItemId && (
                  <button onClick={resetCurrentForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white">
                    Cancel Edit
                  </button>
                )}
              </div>

              {renderComposer()}

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={resetCurrentForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white">
                  Reset
                </button>
                <button onClick={submitForm} disabled={savingItem} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60">
                  {savingItem ? "Saving..." : editingItemId ? "Update Submission" : "Submit For Review"}
                </button>
              </div>
            </div>

            {activeTab.type === "promotion" && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Live popup offer</p>
                    <h4 className="mt-2 text-2xl font-bold text-gray-900">{popupOffer?.title || "No active popup promotion"}</h4>
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                      {popupOffer?.description || "When admin publishes a popup offer, it appears here so vendors can align their product launches and pricing."}
                    </p>
                  </div>
                  {popupOffer && (
                    <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                      <p className="text-xs uppercase text-gray-400">Discount</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {popupOffer.discountType === "percentage" ? `${popupOffer.discountValue}%` : `BDT ${popupOffer.discountValue}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab.type === "voucher" && (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">Platform Vouchers</h3>
                  <p className="mt-1 text-sm text-gray-500">These are admin-controlled checkout coupons your customers can already use.</p>
                </div>
                {loadingPromotions ? (
                  <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading vouchers...</div>
                ) : coupons.length === 0 ? (
                  <EmptyState title="No active coupons available" text="Admin coupons will show here automatically." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {coupons.map((coupon) => (
                      <div key={coupon._id} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{coupon.name}</h4>
                            <p className="mt-1 text-sm text-gray-500">{coupon.description || "No description provided."}</p>
                          </div>
                          <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700">
                            {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `BDT ${coupon.discountValue}`}
                          </span>
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <p className="text-xs uppercase text-gray-400">Code</p>
                            <p className="font-semibold text-gray-900">{coupon.code}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Expires</p>
                            <p>{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "N/A"}</p>
                          </div>
                        </div>
                        <button onClick={() => copyCouponCode(coupon.code)} className="w-full rounded-lg border border-primary-200 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50">
                          Copy Coupon Code
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab.type === "campaign" && (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">Platform Campaigns</h3>
                  <p className="mt-1 text-sm text-gray-500">Join existing platform campaigns or submit your own campaign request for admin review.</p>
                </div>
                {loadingCampaigns ? (
                  <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading campaigns...</div>
                ) : campaigns.length === 0 ? (
                  <EmptyState title="No active or scheduled campaigns" text="Admin campaigns will appear here after they are published." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {campaigns.map((campaign) => (
                      <div key={campaign._id} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{campaign.description || "No description provided."}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusBadge(campaign.status)}`}>{campaign.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <p className="text-xs uppercase text-gray-400">Discount</p>
                            <p className="font-semibold">{campaign.discountPercentage}%</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Max Products</p>
                            <p className="font-semibold">{campaign.maxProductsPerVendor || 0}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Your Submissions</h3>
                  <p className="mt-1 text-sm text-gray-500">Track which items are still pending review and which ones were approved or rejected.</p>
                </div>
              </div>

              {loadingItems ? (
                <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading your submissions...</div>
              ) : filteredVendorItems.length === 0 ? (
                <EmptyState
                  title={`No ${activeTab.label.toLowerCase()} submitted yet`}
                  text="Create your first submission above. It will appear here immediately with a review status."
                />
              ) : (
                <div className="space-y-4">
                  {filteredVendorItems.map((item) => (
                    <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusBadge(item.status)}`}>{item.status}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-4">
                        {item.discountValue ? (
                          <div>
                            <p className="text-xs uppercase text-gray-400">Discount</p>
                            <p>{item.discountType === "percentage" ? `${item.discountValue}%` : `BDT ${item.discountValue}`}</p>
                          </div>
                        ) : null}
                        {item.code ? (
                          <div>
                            <p className="text-xs uppercase text-gray-400">Code</p>
                            <p>{item.code}</p>
                          </div>
                        ) : null}
                        {item.campaignName ? (
                          <div>
                            <p className="text-xs uppercase text-gray-400">Linked Campaign</p>
                            <p>{item.campaignName}</p>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs uppercase text-gray-400">Schedule</p>
                          <p>
                            {item.startDate ? new Date(item.startDate).toLocaleDateString() : "N/A"} - {item.endDate ? new Date(item.endDate).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </div>

                      {item.adminNotes ? (
                        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          <span className="font-medium text-gray-800">Admin note:</span> {item.adminNotes}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => editItem(item)} disabled={item.status === "approved"} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                          Edit
                        </button>
                        <button onClick={() => removeItem(item._id)} disabled={item.status === "approved"} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
