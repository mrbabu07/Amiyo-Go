import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  FileClock,
  Gift,
  Image,
  Layers3,
  Megaphone,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Tag,
  TicketPercent,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";
import useCurrency from "../../hooks/useCurrency";
import {
  applyClearanceSale,
  createPlatformVoucher,
  createPromotionCampaign,
  createPromotionFlashDeal,
  getCampaignNominationQueue,
  getCategories,
  getClearanceRules,
  getHomepageSlots,
  getLoyaltyRules,
  getPlatformVouchers,
  getProducts,
  getPromotionCampaigns,
  getPromotionFlashDeals,
  getPromotionOverview,
  reviewCampaignNomination,
  saveHomepageSlot,
  selectDealOfDay,
  updateLoyaltyRules,
} from "../../services/api";

const tabs = [
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "nominations", label: "Nominations", icon: PackageSearch },
  { key: "flash", label: "Flash Deals", icon: Timer },
  { key: "vouchers", label: "Vouchers", icon: TicketPercent },
  { key: "slots", label: "Homepage Slots", icon: Image },
  { key: "clearance", label: "Clearance", icon: Tag },
  { key: "loyalty", label: "Loyalty Rules", icon: Gift },
];

const nowLocalInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const inDaysLocalInput = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const campaignDefaults = {
  name: "",
  slug: "",
  campaignType: "sale_event",
  bannerImageUrl: "",
  description: "",
  startDate: nowLocalInput(),
  endDate: inDaysLocalInput(7),
  discountPercentage: 10,
  minDiscountPercentage: 5,
  maxProductsPerVendor: 100,
  status: "Draft",
  eligibleCategories: [],
};

const flashDefaults = {
  title: "",
  productId: "",
  flashPrice: "",
  startTime: nowLocalInput(),
  endTime: inDaysLocalInput(1),
  totalStock: 20,
  maxPerUser: 2,
  minDiscountPercentage: 5,
  campaignId: "",
};

const voucherDefaults = {
  code: "",
  name: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  maxDiscountAmount: "",
  minOrderAmount: "",
  usageLimit: "",
  userUsageLimit: "",
  expiresAt: inDaysLocalInput(14),
  firstOrderOnly: false,
  campaignId: "",
};

const slotDefaults = {
  slotType: "hero_banner",
  title: "",
  imageUrl: "",
  linkUrl: "",
  campaignId: "",
  vendorId: "",
  categoryId: "",
  productId: "",
  specialPrice: "",
  position: 0,
  status: "active",
};

const clearanceDefaults = {
  title: "Clearance sale",
  discountPercentage: 15,
  productIds: "",
  vendorIds: "",
  categoryIds: [],
  startDate: nowLocalInput(),
  endDate: inDaysLocalInput(10),
  onlySlowMoving: true,
  maxViews: 50,
  reason: "",
};

const loyaltyDefaults = {
  earnRate: 1,
  redemptionValue: 0.01,
  minRedeemPoints: 100,
  pointsExpiryDays: 365,
  tierMultipliers: {
    bronze: 1,
    silver: 1.5,
    gold: 2,
    platinum: 3,
  },
};

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-BD", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

function Badge({ value }) {
  const status = String(value || "pending").toLowerCase();
  const classes = {
    active: "border-green-200 bg-green-50 text-green-700",
    approved: "border-green-200 bg-green-50 text-green-700",
    scheduled: "border-blue-200 bg-blue-50 text-blue-700",
    upcoming: "border-blue-200 bg-blue-50 text-blue-700",
    draft: "border-gray-200 bg-gray-50 text-gray-700",
    pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
    rejected: "border-red-200 bg-red-50 text-red-700",
    expired: "border-gray-200 bg-gray-50 text-gray-500",
    inactive: "border-gray-200 bg-gray-50 text-gray-500",
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${classes[status] || classes.pending}`}>
      {String(value || "pending").replace(/_/g, " ")}
    </span>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";

export default function AdminPromotions() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [flashDeals, setFlashDeals] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [clearanceRules, setClearanceRules] = useState([]);
  const [loyaltyRules, setLoyaltyRules] = useState(loyaltyDefaults);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nominationNotes, setNominationNotes] = useState({});

  const [campaignForm, setCampaignForm] = useState(campaignDefaults);
  const [flashForm, setFlashForm] = useState(flashDefaults);
  const [voucherForm, setVoucherForm] = useState(voucherDefaults);
  const [slotForm, setSlotForm] = useState(slotDefaults);
  const [clearanceForm, setClearanceForm] = useState(clearanceDefaults);

  const productMap = useMemo(() => new Map(products.map((product) => [product._id, product])), [products]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        campaignRes,
        nominationRes,
        flashRes,
        voucherRes,
        slotRes,
        clearanceRes,
        loyaltyRes,
        productRes,
        categoryRes,
      ] = await Promise.all([
        getPromotionOverview(),
        getPromotionCampaigns(),
        getCampaignNominationQueue({ status: "all" }),
        getPromotionFlashDeals(),
        getPlatformVouchers(),
        getHomepageSlots(),
        getClearanceRules(),
        getLoyaltyRules(),
        getProducts({ limit: 100 }),
        getCategories(),
      ]);

      setOverview(overviewRes.data.data?.overview || null);
      setCampaigns(campaignRes.data.data || []);
      setNominations(nominationRes.data.data || []);
      setFlashDeals(flashRes.data.data || []);
      setVouchers(voucherRes.data.data || []);
      setSlots(slotRes.data.data || []);
      setClearanceRules(clearanceRes.data.data || []);
      setLoyaltyRules({ ...loyaltyDefaults, ...(loyaltyRes.data.data || {}) });
      setProducts(productRes.data.products || productRes.data.data || []);
      setCategories(categoryRes.data.data || categoryRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveCampaign = async (event) => {
    event.preventDefault();
    try {
      await createPromotionCampaign({
        ...campaignForm,
        discountPercentage: Number(campaignForm.discountPercentage),
        minDiscountPercentage: Number(campaignForm.minDiscountPercentage),
        maxProductsPerVendor: Number(campaignForm.maxProductsPerVendor),
      });
      toast.success("Campaign created");
      setCampaignForm(campaignDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save campaign");
    }
  };

  const reviewNomination = async (row, status) => {
    try {
      await reviewCampaignNomination(row.nominationId, {
        productId: row.productId,
        variantSku: row.sku,
        status,
        reason: nominationNotes[row.rowKey] || "",
      });
      toast.success(status === "approved" ? "SKU approved" : "SKU rejected");
      setNominationNotes((current) => ({ ...current, [row.rowKey]: "" }));
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to review nomination");
    }
  };

  const saveFlashDeal = async (event) => {
    event.preventDefault();
    try {
      await createPromotionFlashDeal({
        ...flashForm,
        productId: flashForm.productId,
        flashPrice: Number(flashForm.flashPrice),
        totalStock: Number(flashForm.totalStock),
        maxPerUser: Number(flashForm.maxPerUser),
        minDiscountPercentage: Number(flashForm.minDiscountPercentage),
      });
      toast.success("Flash deal scheduled");
      setFlashForm(flashDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to schedule flash deal");
    }
  };

  const saveVoucher = async (event) => {
    event.preventDefault();
    try {
      await createPlatformVoucher({
        ...voucherForm,
        discountValue: Number(voucherForm.discountValue || 0),
        maxDiscountAmount: voucherForm.maxDiscountAmount === "" ? "" : Number(voucherForm.maxDiscountAmount),
        minOrderAmount: voucherForm.minOrderAmount === "" ? "" : Number(voucherForm.minOrderAmount),
        usageLimit: voucherForm.usageLimit === "" ? "" : Number(voucherForm.usageLimit),
        userUsageLimit: voucherForm.userUsageLimit === "" ? "" : Number(voucherForm.userUsageLimit),
      });
      toast.success("Platform voucher created");
      setVoucherForm(voucherDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create voucher");
    }
  };

  const saveSlot = async (event) => {
    event.preventDefault();
    try {
      await saveHomepageSlot({
        ...slotForm,
        position: Number(slotForm.position || 0),
        specialPrice: slotForm.specialPrice === "" ? "" : Number(slotForm.specialPrice),
      });
      toast.success("Homepage slot saved");
      setSlotForm(slotDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save homepage slot");
    }
  };

  const saveDealOfDay = async () => {
    if (!slotForm.productId) {
      toast.error("Select a product first");
      return;
    }
    try {
      await selectDealOfDay({
        ...slotForm,
        productId: slotForm.productId,
        dealPrice: slotForm.specialPrice === "" ? productMap.get(slotForm.productId)?.price : Number(slotForm.specialPrice),
      });
      toast.success("Deal of the day selected");
      setSlotForm(slotDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to select deal");
    }
  };

  const saveClearance = async (event) => {
    event.preventDefault();
    try {
      await applyClearanceSale({
        ...clearanceForm,
        discountPercentage: Number(clearanceForm.discountPercentage),
        productIds: parseList(clearanceForm.productIds),
        vendorIds: parseList(clearanceForm.vendorIds),
        maxViews: Number(clearanceForm.maxViews || 0),
      });
      toast.success("Clearance sale applied");
      setClearanceForm(clearanceDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to apply clearance");
    }
  };

  const saveLoyalty = async (event) => {
    event.preventDefault();
    try {
      await updateLoyaltyRules({
        ...loyaltyRules,
        earnRate: Number(loyaltyRules.earnRate),
        redemptionValue: Number(loyaltyRules.redemptionValue),
        minRedeemPoints: Number(loyaltyRules.minRedeemPoints),
        pointsExpiryDays: Number(loyaltyRules.pointsExpiryDays),
      });
      toast.success("Loyalty rules updated");
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update loyalty rules");
    }
  };

  const summary = overview || {};

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Campaigns & Promotions</h1>
            <p className="text-sm text-gray-500">Campaign builder, nomination review, flash deals, vouchers, slots, clearance, and loyalty controls.</p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={CalendarDays} label="Active Campaigns" value={summary.campaigns?.active || 0} />
          <Metric icon={PackageSearch} label="Pending SKUs" value={summary.nominations?.pending || 0} />
          <Metric icon={Timer} label="Active Flash Deals" value={summary.flashDeals?.active || 0} />
          <Metric icon={BadgePercent} label="Active Vouchers" value={summary.vouchers?.active || 0} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                activeTab === key ? "bg-gray-950 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500">Loading promotions...</div>
        ) : (
          <div className="mt-6">
            {activeTab === "campaigns" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={saveCampaign} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-4">
                  <h2 className="font-semibold text-gray-950">Campaign Builder</h2>
                  <div className="mt-4 space-y-3">
                    <Field label="Name"><input className={inputClass} value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Eid Sale" /></Field>
                    <Field label="Slug"><input className={inputClass} value={campaignForm.slug} onChange={(e) => setCampaignForm({ ...campaignForm, slug: e.target.value })} placeholder="eid-sale" /></Field>
                    <Field label="Banner Image URL"><input className={inputClass} value={campaignForm.bannerImageUrl} onChange={(e) => setCampaignForm({ ...campaignForm, bannerImageUrl: e.target.value })} placeholder="https://..." /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start"><input type="datetime-local" className={inputClass} value={campaignForm.startDate} onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })} /></Field>
                      <Field label="End"><input type="datetime-local" className={inputClass} value={campaignForm.endDate} onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Discount %"><input type="number" className={inputClass} value={campaignForm.discountPercentage} onChange={(e) => setCampaignForm({ ...campaignForm, discountPercentage: e.target.value })} /></Field>
                      <Field label="Min SKU Discount %"><input type="number" className={inputClass} value={campaignForm.minDiscountPercentage} onChange={(e) => setCampaignForm({ ...campaignForm, minDiscountPercentage: e.target.value })} /></Field>
                    </div>
                    <Field label="Eligible Categories">
                      <select
                        multiple
                        className={`${inputClass} h-28`}
                        value={campaignForm.eligibleCategories}
                        onChange={(e) => setCampaignForm({ ...campaignForm, eligibleCategories: Array.from(e.target.selectedOptions).map((option) => option.value) })}
                      >
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>{category.name}</option>
                        ))}
                      </select>
                    </Field>
                    <button type="submit" className="w-full rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Create Campaign</button>
                  </div>
                </form>

                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h2 className="font-semibold text-gray-950">Sale Events</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3 text-right">Discount</th><th className="px-4 py-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {campaigns.map((campaign) => (
                          <tr key={campaign._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-950">{campaign.name}</p>
                              <p className="text-xs text-gray-500">{campaign.slug}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{campaign.discountPercentage}%</td>
                            <td className="px-4 py-3"><Badge value={campaign.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "nominations" && (
              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="font-semibold text-gray-950">Campaign Product Nomination Review</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                      <tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Decision</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {nominations.map((row) => (
                        <tr key={row.rowKey} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-950">{row.title}</p>
                            <p className="text-xs text-gray-500">{row.campaignName} - {row.sku || row.productId}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{row.vendorName}</td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-gray-950">{formatPrice(row.campaignPrice)}</p>
                            <p className="text-xs text-gray-500">{row.discountPercentage}% off {formatPrice(row.regularPrice)}</p>
                          </td>
                          <td className="px-4 py-3"><Badge value={row.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-72 gap-2">
                              <input className={inputClass} value={nominationNotes[row.rowKey] || ""} onChange={(e) => setNominationNotes({ ...nominationNotes, [row.rowKey]: e.target.value })} placeholder="Reason for rejection" />
                              <button type="button" onClick={() => reviewNomination(row, "approved")} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white">Approve</button>
                              <button type="button" onClick={() => reviewNomination(row, "rejected")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "flash" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={saveFlashDeal} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-4">
                  <h2 className="font-semibold text-gray-950">Flash Sale Scheduler</h2>
                  <div className="mt-4 space-y-3">
                    <Field label="Product">
                      <select className={inputClass} value={flashForm.productId} onChange={(e) => setFlashForm({ ...flashForm, productId: e.target.value })}>
                        <option value="">Select product</option>
                        {products.map((product) => <option key={product._id} value={product._id}>{product.title || product.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Title"><input className={inputClass} value={flashForm.title} onChange={(e) => setFlashForm({ ...flashForm, title: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Flash Price"><input type="number" className={inputClass} value={flashForm.flashPrice} onChange={(e) => setFlashForm({ ...flashForm, flashPrice: e.target.value })} /></Field>
                      <Field label="Min Discount %"><input type="number" className={inputClass} value={flashForm.minDiscountPercentage} onChange={(e) => setFlashForm({ ...flashForm, minDiscountPercentage: e.target.value })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Stock"><input type="number" className={inputClass} value={flashForm.totalStock} onChange={(e) => setFlashForm({ ...flashForm, totalStock: e.target.value })} /></Field>
                      <Field label="Max Per Buyer"><input type="number" className={inputClass} value={flashForm.maxPerUser} onChange={(e) => setFlashForm({ ...flashForm, maxPerUser: e.target.value })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start"><input type="datetime-local" className={inputClass} value={flashForm.startTime} onChange={(e) => setFlashForm({ ...flashForm, startTime: e.target.value })} /></Field>
                      <Field label="End"><input type="datetime-local" className={inputClass} value={flashForm.endTime} onChange={(e) => setFlashForm({ ...flashForm, endTime: e.target.value })} /></Field>
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Schedule Deal</button>
                  </div>
                </form>
                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3"><h2 className="font-semibold text-gray-950">Flash Deals</h2></div>
                  <div className="divide-y divide-gray-100">
                    {flashDeals.map((deal) => (
                      <div key={deal._id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div><p className="font-semibold text-gray-950">{deal.title}</p><p className="text-xs text-gray-500">{formatDate(deal.startTime)} - {formatDate(deal.endTime)}</p></div>
                        <div className="text-right"><p className="font-semibold">{formatPrice(deal.flashPrice)}</p><Badge value={deal.status} /></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "vouchers" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={saveVoucher} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-4">
                  <h2 className="font-semibold text-gray-950">Platform Voucher Generator</h2>
                  <div className="mt-4 space-y-3">
                    <Field label="Code"><input className={inputClass} value={voucherForm.code} onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} /></Field>
                    <Field label="Name"><input className={inputClass} value={voucherForm.name} onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Type">
                        <select className={inputClass} value={voucherForm.discountType} onChange={(e) => setVoucherForm({ ...voucherForm, discountType: e.target.value })}>
                          <option value="percentage">% off</option>
                          <option value="fixed">Fixed</option>
                          <option value="free_shipping">Free shipping</option>
                        </select>
                      </Field>
                      <Field label="Value"><input type="number" className={inputClass} value={voucherForm.discountValue} onChange={(e) => setVoucherForm({ ...voucherForm, discountValue: e.target.value })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Usage Limit"><input type="number" className={inputClass} value={voucherForm.usageLimit} onChange={(e) => setVoucherForm({ ...voucherForm, usageLimit: e.target.value })} /></Field>
                      <Field label="Min Order"><input type="number" className={inputClass} value={voucherForm.minOrderAmount} onChange={(e) => setVoucherForm({ ...voucherForm, minOrderAmount: e.target.value })} /></Field>
                    </div>
                    <Field label="Expiry"><input type="datetime-local" className={inputClass} value={voucherForm.expiresAt} onChange={(e) => setVoucherForm({ ...voucherForm, expiresAt: e.target.value })} /></Field>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={voucherForm.firstOrderOnly} onChange={(e) => setVoucherForm({ ...voucherForm, firstOrderOnly: e.target.checked })} /> First order only</label>
                    <button type="submit" className="w-full rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Create Voucher</button>
                  </div>
                </form>
                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3"><h2 className="font-semibold text-gray-950">Platform Vouchers</h2></div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    {vouchers.map((voucher) => (
                      <div key={voucher._id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between"><p className="font-mono font-bold text-gray-950">{voucher.code}</p><Badge value={voucher.isActive ? "active" : "inactive"} /></div>
                        <p className="mt-1 text-sm text-gray-600">{voucher.name}</p>
                        <p className="mt-2 text-xs text-gray-500">{voucher.discountType} - expires {formatDate(voucher.expiresAt)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "slots" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={saveSlot} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-4">
                  <h2 className="font-semibold text-gray-950">Banner & Slot Management</h2>
                  <div className="mt-4 space-y-3">
                    <Field label="Slot Type">
                      <select className={inputClass} value={slotForm.slotType} onChange={(e) => setSlotForm({ ...slotForm, slotType: e.target.value })}>
                        <option value="hero_banner">Hero banner</option>
                        <option value="category_banner">Category banner</option>
                        <option value="ad_slot">Ad slot</option>
                        <option value="deal_of_day">Deal of the day</option>
                      </select>
                    </Field>
                    <Field label="Title"><input className={inputClass} value={slotForm.title} onChange={(e) => setSlotForm({ ...slotForm, title: e.target.value })} /></Field>
                    <Field label="Image URL"><input className={inputClass} value={slotForm.imageUrl} onChange={(e) => setSlotForm({ ...slotForm, imageUrl: e.target.value })} /></Field>
                    <Field label="Link URL"><input className={inputClass} value={slotForm.linkUrl} onChange={(e) => setSlotForm({ ...slotForm, linkUrl: e.target.value })} /></Field>
                    <Field label="Product">
                      <select className={inputClass} value={slotForm.productId} onChange={(e) => setSlotForm({ ...slotForm, productId: e.target.value })}>
                        <option value="">No product</option>
                        {products.map((product) => <option key={product._id} value={product._id}>{product.title || product.name}</option>)}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Special Price"><input type="number" className={inputClass} value={slotForm.specialPrice} onChange={(e) => setSlotForm({ ...slotForm, specialPrice: e.target.value })} /></Field>
                      <Field label="Position"><input type="number" className={inputClass} value={slotForm.position} onChange={(e) => setSlotForm({ ...slotForm, position: e.target.value })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="submit" className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Save Slot</button>
                      <button type="button" onClick={saveDealOfDay} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">Set Deal</button>
                    </div>
                  </div>
                </form>
                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3"><h2 className="font-semibold text-gray-950">Homepage Slots</h2></div>
                  <div className="divide-y divide-gray-100">
                    {slots.map((slot) => (
                      <div key={slot._id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div><p className="font-semibold text-gray-950">{slot.position}. {slot.title}</p><p className="text-xs text-gray-500">{slot.slotType} - {slot.linkUrl || "No link"}</p></div>
                        <Badge value={slot.status} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "clearance" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={saveClearance} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-4">
                  <h2 className="font-semibold text-gray-950">Clearance Sale Tool</h2>
                  <div className="mt-4 space-y-3">
                    <Field label="Title"><input className={inputClass} value={clearanceForm.title} onChange={(e) => setClearanceForm({ ...clearanceForm, title: e.target.value })} /></Field>
                    <Field label="Discount %"><input type="number" className={inputClass} value={clearanceForm.discountPercentage} onChange={(e) => setClearanceForm({ ...clearanceForm, discountPercentage: e.target.value })} /></Field>
                    <Field label="Product IDs"><input className={inputClass} value={clearanceForm.productIds} onChange={(e) => setClearanceForm({ ...clearanceForm, productIds: e.target.value })} placeholder="comma separated" /></Field>
                    <Field label="Vendor IDs"><input className={inputClass} value={clearanceForm.vendorIds} onChange={(e) => setClearanceForm({ ...clearanceForm, vendorIds: e.target.value })} placeholder="comma separated" /></Field>
                    <Field label="Categories">
                      <select multiple className={`${inputClass} h-28`} value={clearanceForm.categoryIds} onChange={(e) => setClearanceForm({ ...clearanceForm, categoryIds: Array.from(e.target.selectedOptions).map((option) => option.value) })}>
                        {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start"><input type="datetime-local" className={inputClass} value={clearanceForm.startDate} onChange={(e) => setClearanceForm({ ...clearanceForm, startDate: e.target.value })} /></Field>
                      <Field label="End"><input type="datetime-local" className={inputClass} value={clearanceForm.endDate} onChange={(e) => setClearanceForm({ ...clearanceForm, endDate: e.target.value })} /></Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={clearanceForm.onlySlowMoving} onChange={(e) => setClearanceForm({ ...clearanceForm, onlySlowMoving: e.target.checked })} /> Slow moving only</label>
                    <button type="submit" className="w-full rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Apply Clearance</button>
                  </div>
                </form>
                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3"><h2 className="font-semibold text-gray-950">Clearance Rules</h2></div>
                  <div className="divide-y divide-gray-100">
                    {clearanceRules.map((rule) => (
                      <div key={rule._id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div><p className="font-semibold text-gray-950">{rule.title}</p><p className="text-xs text-gray-500">{rule.productsAffected || 0} products - {formatDate(rule.endDate)}</p></div>
                        <p className="font-semibold text-red-700">{rule.discountPercentage}%</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "loyalty" && (
              <form onSubmit={saveLoyalty} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gray-500" /><h2 className="font-semibold text-gray-950">Loyalty Points Rules</h2></div>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <Field label="Earn Rate"><input type="number" step="0.01" className={inputClass} value={loyaltyRules.earnRate} onChange={(e) => setLoyaltyRules({ ...loyaltyRules, earnRate: e.target.value })} /></Field>
                  <Field label="Redemption Value"><input type="number" step="0.001" className={inputClass} value={loyaltyRules.redemptionValue} onChange={(e) => setLoyaltyRules({ ...loyaltyRules, redemptionValue: e.target.value })} /></Field>
                  <Field label="Min Redeem Points"><input type="number" className={inputClass} value={loyaltyRules.minRedeemPoints} onChange={(e) => setLoyaltyRules({ ...loyaltyRules, minRedeemPoints: e.target.value })} /></Field>
                  <Field label="Expiry Days"><input type="number" className={inputClass} value={loyaltyRules.pointsExpiryDays} onChange={(e) => setLoyaltyRules({ ...loyaltyRules, pointsExpiryDays: e.target.value })} /></Field>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  {["bronze", "silver", "gold", "platinum"].map((tier) => (
                    <Field key={tier} label={`${tier} multiplier`}>
                      <input
                        type="number"
                        step="0.1"
                        className={inputClass}
                        value={loyaltyRules.tierMultipliers?.[tier] || 0}
                        onChange={(e) => setLoyaltyRules({
                          ...loyaltyRules,
                          tierMultipliers: { ...loyaltyRules.tierMultipliers, [tier]: e.target.value },
                        })}
                      />
                    </Field>
                  ))}
                </div>
                <button type="submit" className="mt-4 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white">Save Loyalty Rules</button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
