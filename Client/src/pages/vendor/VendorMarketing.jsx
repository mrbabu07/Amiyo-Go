import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { getActiveCoupons, getActivePopupOffer } from "../../services/api";

const tabs = [
  { id: "promotions", label: "Promotions", path: "/vendor/marketing/promotions" },
  { id: "vouchers", label: "Vouchers", path: "/vendor/marketing/vouchers" },
  { id: "campaigns", label: "Campaigns", path: "/vendor/marketing/campaigns" },
];

const statusBadge = (status) => {
  const map = {
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

export default function VendorMarketing() {
  const { user } = useAuth();
  const location = useLocation();
  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [popupOffer, setPopupOffer] = useState(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [enrolledCampaignIds, setEnrolledCampaignIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vendorCampaignEnrollments") || "[]");
    } catch {
      return [];
    }
  });

  const activeTab = tabs.find((tab) => location.pathname.includes(tab.id))?.id || "promotions";

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

  useEffect(() => {
    fetchCampaigns();
    fetchPromotions();
  }, [fetchCampaigns, fetchPromotions]);

  const campaignStats = useMemo(
    () => ({
      active: campaigns.filter((campaign) => campaign.status === "Active").length,
      scheduled: campaigns.filter((campaign) => campaign.status === "Scheduled").length,
      enrolled: enrolledCampaignIds.length,
      coupons: coupons.length,
      popupOffers: popupOffer ? 1 : 0,
    }),
    [campaigns, coupons.length, enrolledCampaignIds, popupOffer],
  );

  const toggleCampaign = (campaignId) => {
    setEnrolledCampaignIds((prev) => {
      const exists = prev.includes(campaignId);
      const next = exists ? prev.filter((id) => id !== campaignId) : [...prev, campaignId];
      localStorage.setItem("vendorCampaignEnrollments", JSON.stringify(next));
      toast.success(exists ? "Campaign removed from your shortlist" : "Campaign added to your shortlist");
      return next;
    });
  };

  const copyCouponCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Unable to copy code");
    }
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
              <p className="text-sm text-gray-500">Review live platform campaigns, checkout vouchers, and current storefront promotions.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Active Campaigns", value: campaignStats.active, color: "text-green-600" },
            { label: "Active Coupons", value: campaignStats.coupons, color: "text-blue-600" },
            { label: "Shortlisted", value: campaignStats.enrolled, color: "text-orange-600" },
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
                  activeTab === tab.id
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "promotions" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Storefront Promotions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Use these active platform promotions when you plan product launches, banners, and customer messaging.
                  </p>
                </div>

                {loadingPromotions ? (
                  <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading promotions...</div>
                ) : !popupOffer ? (
                  <EmptyState
                    title="No popup promotion is active right now"
                    text="When admin publishes a popup offer, its headline, discount, and target products will appear here for vendors."
                  />
                ) : (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Live popup offer</p>
                        <h4 className="mt-2 text-2xl font-bold text-gray-900">{popupOffer.title}</h4>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">{popupOffer.description}</p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                        <p className="text-xs uppercase text-gray-400">Discount</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {popupOffer.discountType === "percentage"
                            ? `${popupOffer.discountValue}%`
                            : `BDT ${popupOffer.discountValue}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase text-gray-400">Start</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {new Date(popupOffer.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase text-gray-400">End</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {new Date(popupOffer.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase text-gray-400">Targeting</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {popupOffer.targetProducts?.length ? `${popupOffer.targetProducts.length} products` : "All products"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase text-gray-400">CTA</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {popupOffer.buttonText || "Shop Now"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                        Link: {popupOffer.buttonLink || "/products"}
                      </span>
                      {popupOffer.couponCode && (
                        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                          Coupon: {popupOffer.couponCode}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "vouchers" && (
              <div>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900">Checkout Vouchers</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    These are the active coupon codes customers can use during checkout. Share them in livestreams, chat, and store banners.
                  </p>
                </div>

                {loadingPromotions ? (
                  <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading vouchers...</div>
                ) : coupons.length === 0 ? (
                  <EmptyState
                    title="No active coupons available"
                    text="Admin coupons will show up here automatically as soon as they are active and not expired."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {coupons.map((coupon) => (
                      <div key={coupon._id} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Coupon</p>
                            <h4 className="mt-1 text-lg font-semibold text-gray-900">{coupon.name}</h4>
                            <p className="mt-1 text-sm text-gray-500">{coupon.description || "No description provided."}</p>
                          </div>
                          <div className="rounded-xl bg-primary-50 px-3 py-2 text-right">
                            <p className="text-xs uppercase text-primary-500">Discount</p>
                            <p className="font-bold text-primary-700">
                              {coupon.discountType === "percentage"
                                ? `${coupon.discountValue}%`
                                : `BDT ${coupon.discountValue}`}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <p className="text-xs uppercase text-gray-400">Code</p>
                            <p className="font-semibold text-gray-900">{coupon.code}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Expires</p>
                            <p className="font-semibold text-gray-900">
                              {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Min order</p>
                            <p>{coupon.minOrderAmount ? `BDT ${coupon.minOrderAmount}` : "No minimum"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400">Usage</p>
                            <p>
                              {coupon.usageLimit
                                ? `${coupon.usedCount || 0}/${coupon.usageLimit}`
                                : `${coupon.usedCount || 0} used`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => copyCouponCode(coupon.code)}
                          className="w-full rounded-lg border border-primary-200 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50"
                        >
                          Copy Coupon Code
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "campaigns" && (
              <div>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900">Platform Campaigns</h3>
                  <p className="mt-1 text-sm text-gray-500">These campaigns come from the admin campaign system.</p>
                </div>

                {loadingCampaigns ? (
                  <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Loading campaigns...</div>
                ) : campaigns.length === 0 ? (
                  <EmptyState title="No active or scheduled campaigns" text="Admin campaigns will appear here after they are published." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {campaigns.map((campaign) => {
                      const campaignId = campaign._id || campaign.id;
                      const shortlisted = enrolledCampaignIds.includes(campaignId);
                      return (
                        <div key={campaignId} className={`rounded-xl border p-5 transition ${shortlisted ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white hover:shadow-sm"}`}>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{campaign.description || "No description provided."}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusBadge(campaign.status)}`}>{campaign.status}</span>
                          </div>
                          <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                            <div>
                              <p className="text-xs uppercase text-gray-400">Discount</p>
                              <p className="font-semibold">{campaign.discountPercentage}%</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-gray-400">Max Products</p>
                              <p className="font-semibold">{campaign.maxProductsPerVendor || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-gray-400">Start</p>
                              <p>{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-gray-400">End</p>
                              <p>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : "N/A"}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleCampaign(campaignId)}
                            className={`w-full rounded-lg py-2 text-sm font-medium transition ${
                              shortlisted
                                ? "border border-red-200 text-red-600 hover:bg-red-50"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }`}
                          >
                            {shortlisted ? "Remove From Shortlist" : "Shortlist Campaign"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
