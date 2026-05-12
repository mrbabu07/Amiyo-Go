import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";

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
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
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

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const campaignStats = useMemo(
    () => ({
      active: campaigns.filter((campaign) => campaign.status === "Active").length,
      scheduled: campaigns.filter((campaign) => campaign.status === "Scheduled").length,
      enrolled: enrolledCampaignIds.length,
    }),
    [campaigns, enrolledCampaignIds],
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
              <p className="text-sm text-gray-500">Campaigns are live from admin data. Promotion and voucher APIs are pending.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Active Campaigns", value: campaignStats.active, color: "text-green-600" },
            { label: "Scheduled Campaigns", value: campaignStats.scheduled, color: "text-blue-600" },
            { label: "Shortlisted", value: campaignStats.enrolled, color: "text-orange-600" },
            { label: "Total Available", value: campaigns.length, color: "text-gray-900" },
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
              <EmptyState
                title="Vendor promotions API is not implemented yet"
                text="This section no longer shows fake promotions. Build a vendor promotions backend before enabling create/edit controls here."
              />
            )}

            {activeTab === "vouchers" && (
              <EmptyState
                title="Vendor vouchers API is not implemented yet"
                text="This section no longer shows fake vouchers. Add persistent voucher rules, usage limits, and checkout validation before enabling this workflow."
              />
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
