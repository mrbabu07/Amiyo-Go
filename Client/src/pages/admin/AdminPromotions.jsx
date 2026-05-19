import { createElement, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  CalendarDays,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  FileClock,
  Gift,
  Image,
  Layers3,
  Megaphone,
  PackageSearch,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TicketPercent,
  Timer,
  UploadCloud,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  FormField,
  MetricCard,
  PageHeader,
  SectionCard,
  SkeletonBlock,
  StatusBadge,
  formInputClass,
} from "../../components/ui";
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
  getPromotionRules,
  reviewCampaignNomination,
  reorderHomepageSlots,
  saveHomepageSlot,
  selectDealOfDay,
  uploadHomepageSlotImage,
  updateLoyaltyRules,
  updatePromotionRules,
} from "../../services/api";

const tabs = [
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "nominations", label: "Nominations", icon: PackageSearch },
  { key: "flash", label: "Flash Deals", icon: Timer },
  { key: "vouchers", label: "Vouchers", icon: TicketPercent },
  { key: "slots", label: "Homepage Slots", icon: Image },
  { key: "clearance", label: "Clearance", icon: Tag },
  { key: "loyalty", label: "Loyalty Rules", icon: Gift },
  { key: "rules", label: "Stacking Rules", icon: SlidersHorizontal },
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
  slotId: "",
  slotType: "hero_banner",
  title: "",
  subtitle: "",
  badge: "",
  ctaText: "Shop now",
  imageUrl: "",
  linkUrl: "",
  campaignId: "",
  vendorId: "",
  categoryId: "",
  productId: "",
  specialPrice: "",
  position: 0,
  status: "active",
  startsAt: "",
  endsAt: "",
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

const promotionRuleDefaults = {
  allowMultipleVoucherCodes: false,
  allowPlatformVoucherWithVendorVoucher: false,
  allowVoucherWithFlashSale: false,
  allowLoyaltyWithPlatformVoucher: true,
  allowLoyaltyWithVendorVoucher: true,
  allowLoyaltyWithFreeShipping: true,
  allowLoyaltyWithFlashSale: true,
  allowFreeShippingWithVoucher: false,
  maxStackedDiscountPercent: 100,
};

const promotionRuleFields = [
  {
    key: "allowMultipleVoucherCodes",
    label: "Multiple voucher codes",
    helper: "Allows more than one voucher line on the same order.",
  },
  {
    key: "allowPlatformVoucherWithVendorVoucher",
    label: "Platform + seller voucher",
    helper: "Lets a platform voucher stack with a seller-funded voucher.",
  },
  {
    key: "allowVoucherWithFlashSale",
    label: "Voucher with flash sale",
    helper: "Controls whether vouchers can discount already time-boxed flash deals.",
  },
  {
    key: "allowLoyaltyWithPlatformVoucher",
    label: "Coins with platform voucher",
    helper: "Lets loyalty coins reduce the payable total after platform voucher discount.",
  },
  {
    key: "allowLoyaltyWithVendorVoucher",
    label: "Coins with seller voucher",
    helper: "Lets loyalty coins combine with seller vouchers.",
  },
  {
    key: "allowLoyaltyWithFreeShipping",
    label: "Coins with free shipping",
    helper: "Lets loyalty coins combine with free-shipping offers.",
  },
  {
    key: "allowLoyaltyWithFlashSale",
    label: "Coins with flash sale",
    helper: "Lets loyalty coins combine with flash sale pricing.",
  },
  {
    key: "allowFreeShippingWithVoucher",
    label: "Free shipping + another voucher",
    helper: "Allows shipping promos to stack with another voucher type.",
  },
];

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

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const inputClass = formInputClass;
const Field = FormField;
const Metric = MetricCard;
const Badge = ({ value }) => <StatusBadge status={value} />;

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
  const [promotionRules, setPromotionRules] = useState(promotionRuleDefaults);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nominationNotes, setNominationNotes] = useState({});
  const [slotImageUploading, setSlotImageUploading] = useState(false);

  const [campaignForm, setCampaignForm] = useState(campaignDefaults);
  const [flashForm, setFlashForm] = useState(flashDefaults);
  const [voucherForm, setVoucherForm] = useState(voucherDefaults);
  const [slotForm, setSlotForm] = useState(slotDefaults);
  const [clearanceForm, setClearanceForm] = useState(clearanceDefaults);

  const productMap = useMemo(() => new Map(products.map((product) => [product._id, product])), [products]);
  const heroSlots = useMemo(
    () => slots.filter((slot) => slot.slotType === "hero_banner").sort((a, b) => Number(a.position || 0) - Number(b.position || 0)),
    [slots],
  );

  const resetSlotForm = () => setSlotForm(slotDefaults);

  const editSlot = (slot) => {
    setSlotForm({
      ...slotDefaults,
      slotId: slot._id,
      slotType: slot.slotType || "hero_banner",
      title: slot.title || "",
      subtitle: slot.subtitle || slot.description || "",
      badge: slot.badge || "",
      ctaText: slot.ctaText || "Shop now",
      imageUrl: slot.imageUrl || slot.bannerImageUrl || "",
      linkUrl: slot.linkUrl || "",
      campaignId: slot.campaignId || "",
      vendorId: slot.vendorId || "",
      categoryId: slot.categoryId || "",
      productId: slot.productId || "",
      specialPrice: slot.specialPrice ?? "",
      position: slot.position ?? 0,
      status: slot.status || "active",
      startsAt: toLocalInput(slot.startsAt),
      endsAt: toLocalInput(slot.endsAt),
    });
    setActiveTab("slots");
  };

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
        promotionRulesRes,
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
        getPromotionRules(),
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
      setPromotionRules({ ...promotionRuleDefaults, ...(promotionRulesRes.data.data || {}) });
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
      resetSlotForm();
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save homepage slot");
    }
  };

  const handleSlotImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }

    setSlotImageUploading(true);
    try {
      const response = await uploadHomepageSlotImage(file);
      const url = response.data?.url || response.data?.data?.url;
      if (!url) throw new Error("Upload completed without an image URL");
      setSlotForm((current) => ({ ...current, imageUrl: url }));
      toast.success("Carousel image uploaded");
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Failed to upload image");
    } finally {
      setSlotImageUploading(false);
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
      resetSlotForm();
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to select deal");
    }
  };

  const toggleSlotStatus = async (slot) => {
    try {
      await saveHomepageSlot({
        ...slot,
        slotId: slot._id,
        status: slot.status === "inactive" ? "active" : "inactive",
      });
      toast.success(slot.status === "inactive" ? "Carousel slide is visible" : "Carousel slide hidden");
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update slot");
    }
  };

  const moveHeroSlot = async (slot, direction) => {
    const currentIndex = heroSlots.findIndex((item) => item._id === slot._id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= heroSlots.length) return;

    const reordered = [...heroSlots];
    const [selected] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, selected);

    try {
      const response = await reorderHomepageSlots(
        reordered.map((item, index) => ({
          slotId: item._id,
          position: index + 1,
        })),
      );
      setSlots(response.data.data || []);
      toast.success("Carousel order updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reorder carousel");
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

  const savePromotionRules = async (event) => {
    event.preventDefault();
    try {
      await updatePromotionRules({
        ...promotionRules,
        maxStackedDiscountPercent: Number(promotionRules.maxStackedDiscountPercent),
      });
      toast.success("Promotion stacking rules updated");
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update promotion rules");
    }
  };

  const summary = overview || {};

  return (
    <div className="ds-page">
      <PageHeader
        title="Campaigns & Promotions"
        subtitle="Campaign builder, nomination review, flash deals, vouchers, slots, clearance, loyalty, and discount stacking controls."
        actions={(
          <button type="button" onClick={loadAll} className="ds-button-secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        )}
      />

      <main className="ds-shell">
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
              className={`ds-tab ${activeTab === key ? "ds-tab-active" : ""}`}
            >
              {createElement(Icon, { className: "h-4 w-4" })}
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-80" />
          </div>
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
                <form onSubmit={saveSlot} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Home carousel</p>
                      <h2 className="text-lg font-bold text-gray-950">{slotForm.slotId ? "Edit slide" : "Create slide"}</h2>
                      <p className="mt-1 text-sm text-gray-500">Control the hero carousel shown on the customer homepage.</p>
                    </div>
                    {slotForm.slotId ? (
                      <button type="button" onClick={resetSlotForm} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">
                        New slide
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Slot Type">
                        <select className={inputClass} value={slotForm.slotType} onChange={(e) => setSlotForm({ ...slotForm, slotType: e.target.value })}>
                          <option value="hero_banner">Hero banner</option>
                          <option value="category_banner">Category banner</option>
                          <option value="ad_slot">Ad slot</option>
                          <option value="deal_of_day">Deal of the day</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select className={inputClass} value={slotForm.status} onChange={(e) => setSlotForm({ ...slotForm, status: e.target.value })}>
                          <option value="active">Visible</option>
                          <option value="inactive">Hidden</option>
                          <option value="scheduled">Scheduled</option>
                        </select>
                      </Field>
                    </div>

                    <Field label="Title">
                      <input className={inputClass} value={slotForm.title} onChange={(e) => setSlotForm({ ...slotForm, title: e.target.value })} placeholder="Mega sale starts now" />
                    </Field>
                    <Field label="Subtitle">
                      <textarea className={`${inputClass} min-h-24 resize-y`} value={slotForm.subtitle} onChange={(e) => setSlotForm({ ...slotForm, subtitle: e.target.value })} placeholder="Short customer-facing message for the carousel slide." />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Badge"><input className={inputClass} value={slotForm.badge} onChange={(e) => setSlotForm({ ...slotForm, badge: e.target.value })} placeholder="Today only" /></Field>
                      <Field label="CTA Text"><input className={inputClass} value={slotForm.ctaText} onChange={(e) => setSlotForm({ ...slotForm, ctaText: e.target.value })} placeholder="Shop now" /></Field>
                    </div>

                    <Field label="Carousel Image">
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="h-24 w-full overflow-hidden rounded-lg bg-white ring-1 ring-gray-200 sm:w-36">
                            {slotForm.imageUrl ? (
                              <img src={slotForm.imageUrl} alt="Carousel preview" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <Image className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-950">Upload a wide homepage banner</p>
                            <p className="mt-1 text-xs text-gray-500">Recommended ratio: 16:9 or wider. The file is optimized and stored by the platform.</p>
                            <label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white ${slotImageUploading ? "bg-gray-500" : "bg-orange-600 hover:bg-orange-700"}`}>
                              <UploadCloud className="h-4 w-4" />
                              {slotImageUploading ? "Uploading..." : "Choose image"}
                              <input type="file" accept="image/*" className="hidden" disabled={slotImageUploading} onChange={handleSlotImageUpload} />
                            </label>
                          </div>
                        </div>
                      </div>
                    </Field>
                    <Field label="Link URL">
                      <input className={inputClass} value={slotForm.linkUrl} onChange={(e) => setSlotForm({ ...slotForm, linkUrl: e.target.value })} placeholder="/products?campaign=eid" />
                    </Field>

                    <Field label="Product">
                      <select className={inputClass} value={slotForm.productId} onChange={(e) => setSlotForm({ ...slotForm, productId: e.target.value })}>
                        <option value="">No product</option>
                        {products.map((product) => <option key={product._id} value={product._id}>{product.title || product.name}</option>)}
                      </select>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Special Price"><input type="number" className={inputClass} value={slotForm.specialPrice} onChange={(e) => setSlotForm({ ...slotForm, specialPrice: e.target.value })} /></Field>
                      <Field label="Position"><input type="number" className={inputClass} value={slotForm.position} onChange={(e) => setSlotForm({ ...slotForm, position: e.target.value })} /></Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Start"><input type="datetime-local" className={inputClass} value={slotForm.startsAt} onChange={(e) => setSlotForm({ ...slotForm, startsAt: e.target.value })} /></Field>
                      <Field label="End"><input type="datetime-local" className={inputClass} value={slotForm.endsAt} onChange={(e) => setSlotForm({ ...slotForm, endsAt: e.target.value })} /></Field>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-950 text-white">
                      <div className="relative min-h-48">
                        {slotForm.imageUrl ? <img src={slotForm.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" /> : null}
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-gray-950/10" />
                        <div className="relative flex min-h-48 flex-col justify-end p-4">
                          <p className="mb-2 inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                            {slotForm.badge || "Featured"}
                          </p>
                          <h3 className="max-w-md text-xl font-black">{slotForm.title || "Slide preview"}</h3>
                          <p className="mt-2 line-clamp-2 max-w-md text-sm text-white/75">{slotForm.subtitle || "Add a subtitle to preview how this slide will read on the storefront."}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button type="submit" className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">{slotForm.slotId ? "Update Slide" : "Save Slide"}</button>
                      <button type="button" onClick={saveDealOfDay} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">Set Deal</button>
                    </div>
                  </div>
                </form>

                <section className="rounded-lg border border-gray-200 bg-white shadow-sm lg:col-span-7">
                  <div className="border-b border-gray-200 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-gray-950">Homepage Carousel Slides</h2>
                        <p className="mt-1 text-sm text-gray-500">{heroSlots.length} hero slides. Active slides appear in position order.</p>
                      </div>
                      <div className="flex gap-2">
                        <Metric icon={Image} label="Hero slides" value={heroSlots.length} />
                        <Metric icon={Eye} label="Visible" value={heroSlots.filter((slot) => slot.status !== "inactive").length} />
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {heroSlots.length ? heroSlots.map((slot, index) => (
                      <div key={slot._id} className="grid gap-4 px-4 py-4 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-center">
                        <div className="relative h-24 overflow-hidden rounded-xl bg-gray-100">
                          {slot.imageUrl ? (
                            <img src={slot.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400"><Image className="h-8 w-8" /></div>
                          )}
                          <span className="absolute left-2 top-2 rounded bg-gray-950/80 px-2 py-1 text-xs font-bold text-white">#{slot.position || index + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-bold text-gray-950">{slot.title}</p>
                            <Badge value={slot.status} />
                            {slot.badge ? <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">{slot.badge}</span> : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{slot.subtitle || slot.description || "No subtitle set."}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-gray-500">
                            <span>{slot.slotType}</span>
                            <span>{formatDate(slot.startsAt)} - {formatDate(slot.endsAt)}</span>
                            {slot.linkUrl ? (
                              <a href={slot.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-700 hover:text-orange-800">
                                Link <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : <span>No link</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => moveHeroSlot(slot, -1)} disabled={index === 0} className="rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-40" title="Move up">
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => moveHeroSlot(slot, 1)} disabled={index === heroSlots.length - 1} className="rounded-lg border border-gray-200 p-2 text-gray-600 disabled:opacity-40" title="Move down">
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => editSlot(slot)} className="rounded-lg border border-gray-200 p-2 text-gray-600" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => toggleSlotStatus(slot)} className="rounded-lg border border-gray-200 p-2 text-gray-600" title={slot.status === "inactive" ? "Show" : "Hide"}>
                            {slot.status === "inactive" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-10 text-center">
                        <Image className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-3 font-semibold text-gray-950">No hero slides yet</p>
                        <p className="mt-1 text-sm text-gray-500">Create the first visible hero banner for the customer homepage.</p>
                      </div>
                    )}
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

            {activeTab === "rules" && (
              <SectionCard
                title="Promotion Stacking Rules"
                subtitle="Control which discounts can combine before checkout writes an immutable order discount snapshot."
                actions={(
                  <StatusBadge status={promotionRules.allowVoucherWithFlashSale ? "active" : "draft"}>
                    {promotionRules.allowVoucherWithFlashSale ? "Flash stacking enabled" : "Flash stacking locked"}
                  </StatusBadge>
                )}
              >
                <form onSubmit={savePromotionRules} className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    {promotionRuleFields.map((rule) => (
                      <label
                        key={rule.key}
                        className="flex min-h-24 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(promotionRules[rule.key])}
                          onChange={(event) =>
                            setPromotionRules({
                              ...promotionRules,
                              [rule.key]: event.target.checked,
                            })
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                            {rule.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {rule.helper}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                        Maximum stacked discount
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Caps total discount as a percentage of item subtotal plus delivery charge.
                      </p>
                    </div>
                    <Field label="Max discount %">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className={inputClass}
                        value={promotionRules.maxStackedDiscountPercent}
                        onChange={(event) =>
                          setPromotionRules({
                            ...promotionRules,
                            maxStackedDiscountPercent: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPromotionRules(promotionRuleDefaults)}
                      className="ds-button-secondary"
                    >
                      Reset Defaults
                    </button>
                    <button type="submit" className="ds-button-primary">
                      Save Stacking Rules
                    </button>
                  </div>
                </form>
              </SectionCard>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
