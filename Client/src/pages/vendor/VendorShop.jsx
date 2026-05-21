import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BadgeCheck,
  Eye,
  Image,
  LayoutTemplate,
  Link as LinkIcon,
  Megaphone,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  Trash2,
  Upload,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  getMyVendorCategories,
  getMyVendorProfile,
  getVendorCatalogProducts,
  getVendorMarketingItems,
  updateMyVendorProfile,
  uploadImages,
} from "../../services/api";
import useCurrency from "../../hooks/useCurrency";
import { defaultShopTheme, shopThemeOptions, themeFor } from "../../utils/shopDecoration";

const tabs = [
  { id: "profile", label: "Shop Profile", path: "/vendor/shop/profile" },
  { id: "decoration", label: "Shop Decoration", path: "/vendor/shop/decoration" },
  { id: "categories", label: "Categories", path: "/vendor/shop/categories" },
];

const decorationPresets = [
  {
    id: "signature",
    title: "Signature Store",
    caption: "Clean brand-first layout for everyday selling.",
    icon: ShieldCheck,
    bannerColor: "blue",
    bannerMessage: "Verified seller support, fast dispatch, and fresh weekly picks.",
    featuredTitle: "Signature picks",
    couponText: "Store member deal",
    campaignTheme: "blue",
  },
  {
    id: "launch",
    title: "Launch Spotlight",
    caption: "High energy setup for new arrivals or campaigns.",
    icon: Sparkles,
    bannerColor: "indigo",
    bannerMessage: "New arrivals are live. Explore limited launch picks today.",
    featuredTitle: "Launch highlights",
    couponText: "Launch voucher",
    campaignTheme: "indigo",
  },
  {
    id: "fresh",
    title: "Fresh Deals",
    caption: "Bright and confident for promotions and active offers.",
    icon: BadgeCheck,
    bannerColor: "green",
    bannerMessage: "Fresh deals, reliable service, and quick checkout support.",
    featuredTitle: "Fresh deals",
    couponText: "Fresh savings",
    campaignTheme: "green",
  },
];

const defaultProfile = {
  shopName: "",
  slug: "",
  tagline: "",
  description: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  returnPolicy: "",
  processingTime: "",
  shippingNotes: "",
  logo: "",
  banner: "",
};

const defaultDecoration = {
  bannerColor: defaultShopTheme,
  bannerMessage: "Welcome to our shop.",
  showBanner: true,
  logoCrop: { x: 50, y: 50, zoom: 100 },
  bannerCrop: { x: 50, y: 50, zoom: 100 },
  categoryTabs: [],
  featuredCarousel: {
    title: "Featured products",
    productIds: [],
  },
  couponBanner: {
    enabled: false,
    voucherId: "",
    customText: "",
  },
  campaignMode: {
    enabled: false,
    title: "",
    message: "",
    banner: "",
    theme: defaultShopTheme,
    startDate: "",
    endDate: "",
  },
};

const normalizeProductsPayload = (payload) => payload?.products || payload?.data?.products || payload?.data || [];

const idOf = (value) => value?._id?.toString?.() || value?.toString?.() || String(value || "");

const productId = (product) => idOf(product?._id);

const imageOf = (product) => product?.images?.[0] || product?.variants?.find((variant) => variant.image)?.image || "";

const addressToText = (address) => {
  if (!address || typeof address === "string") return address || "";
  return [address.details, address.city, address.state, address.country].filter(Boolean).join(", ");
};

const cropPosition = (crop = {}) => `${crop.x ?? 50}% ${crop.y ?? 50}%`;

const cropScale = (crop = {}) => Math.max(1, Number(crop.zoom || 100) / 100);

const newTab = () => ({
  id: `tab-${Date.now()}`,
  label: "New Arrivals",
  categoryIds: [],
  productIds: [],
});

export default function VendorShop() {
  const location = useLocation();
  const { formatPrice } = useCurrency();
  const activeTab = tabs.find((tab) => location.pathname.includes(tab.id))?.id || "profile";
  const [vendorId, setVendorId] = useState(null);
  const [profile, setProfile] = useState(defaultProfile);
  const [decoration, setDecoration] = useState(defaultDecoration);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [marketingItems, setMarketingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    const loadShop = async () => {
      setLoading(true);
      try {
        const [profileResponse, categoryResponse, productResponse, marketingResponse] = await Promise.allSettled([
          getMyVendorProfile(),
          getMyVendorCategories(),
          getVendorCatalogProducts({ limit: 300 }),
          getVendorMarketingItems(),
        ]);

        if (profileResponse.status === "fulfilled") {
          const vendor = profileResponse.value.data?.vendor || {};
          setVendorId(vendor._id);
          setProfile({
            ...defaultProfile,
            shopName: vendor.shopName || "",
            slug: vendor.slug || "",
            tagline: vendor.tagline || "",
            description: vendor.description || "",
            phone: vendor.phone || "",
            whatsapp: vendor.whatsapp || "",
            email: vendor.email || "",
            address: addressToText(vendor.address),
            returnPolicy: vendor.returnPolicy || "",
            processingTime: vendor.processingTime || "",
            shippingNotes: vendor.shippingNotes || "",
            logo: vendor.logo || "",
            banner: vendor.banner || "",
          });
          setDecoration({
            ...defaultDecoration,
            ...(vendor.shopDecoration || {}),
            featuredCarousel: {
              ...defaultDecoration.featuredCarousel,
              ...(vendor.shopDecoration?.featuredCarousel || {}),
            },
            couponBanner: {
              ...defaultDecoration.couponBanner,
              ...(vendor.shopDecoration?.couponBanner || {}),
            },
            campaignMode: {
              ...defaultDecoration.campaignMode,
              ...(vendor.shopDecoration?.campaignMode || {}),
            },
          });
        }
        if (categoryResponse.status === "fulfilled") {
          setCategories(categoryResponse.value.data?.data || []);
        }
        if (productResponse.status === "fulfilled") {
          setProducts(normalizeProductsPayload(productResponse.value.data));
        }
        if (marketingResponse.status === "fulfilled") {
          setMarketingItems(marketingResponse.value.data?.data || []);
        }
      } catch (error) {
        console.error("Failed to load shop profile:", error);
        toast.error("Failed to load shop profile");
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, []);

  const approvedVouchers = useMemo(
    () => marketingItems.filter((item) => item.type === "voucher" && item.status === "approved"),
    [marketingItems],
  );

  const selectedVoucher = useMemo(
    () => approvedVouchers.find((voucher) => idOf(voucher._id) === decoration.couponBanner?.voucherId),
    [approvedVouchers, decoration.couponBanner?.voucherId],
  );

  const shopUrl = profile.slug ? `${window.location.origin}/shops/${profile.slug}` : "";

  const updateProfileField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const updateDecoration = (patch) => {
    setDecoration((prev) => ({ ...prev, ...patch }));
  };

  const applyPreset = (preset) => {
    setDecoration((prev) => ({
      ...prev,
      bannerColor: preset.bannerColor,
      bannerMessage: preset.bannerMessage,
      showBanner: true,
      featuredCarousel: {
        ...prev.featuredCarousel,
        title: preset.featuredTitle,
      },
      couponBanner: {
        ...prev.couponBanner,
        customText: preset.couponText,
      },
      campaignMode: {
        ...prev.campaignMode,
        theme: preset.campaignTheme,
      },
    }));
    toast.success(`${preset.title} preset applied`);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await updateMyVendorProfile(profile);
      const vendor = response.data?.vendor || {};
      setProfile((prev) => ({
        ...prev,
        slug: vendor.slug || prev.slug,
        logo: vendor.logo || prev.logo,
        banner: vendor.banner || prev.banner,
      }));
      toast.success("Shop profile saved");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save shop profile");
    } finally {
      setSaving(false);
    }
  };

  const saveDecoration = async () => {
    setSaving(true);
    try {
      await updateMyVendorProfile({ shopDecoration: decoration });
      toast.success("Shop decoration saved");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save decoration");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const folder = `shops/${vendorId || "vendor"}/${field}`;
      const response = await uploadImages([file], folder);
      const url = response.data?.urls?.[0] || response.data?.data?.[0]?.url;
      if (!url) throw new Error("Upload did not return a URL");

      if (field === "campaignBanner") {
        updateDecoration({
          campaignMode: {
            ...decoration.campaignMode,
            banner: url,
          },
        });
        toast.success("Campaign banner added to preview");
        return;
      }

      await updateMyVendorProfile({ [field]: url });
      updateProfileField(field, url);
      toast.success(`${field === "logo" ? "Logo" : "Banner"} uploaded`);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const toggleCategoryOnTab = (tabId, categoryId) => {
    updateDecoration({
      categoryTabs: decoration.categoryTabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const exists = tab.categoryIds?.includes(categoryId);
        return {
          ...tab,
          categoryIds: exists
            ? tab.categoryIds.filter((id) => id !== categoryId)
            : [...(tab.categoryIds || []), categoryId],
        };
      }),
    });
  };

  const updateTabProducts = (tabId, productIds) => {
    updateDecoration({
      categoryTabs: decoration.categoryTabs.map((tab) =>
        tab.id === tabId ? { ...tab, productIds } : tab,
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/vendor/dashboard" className="rounded-md p-2 hover:bg-slate-100">
                <span className="sr-only">Back</span>
                <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Shop Management</h1>
                <p className="text-sm text-slate-500">Profile, decoration, URL, tabs, carousel, coupons, and policies</p>
              </div>
            </div>
            {shopUrl && (
              <a
                href={shopUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LinkIcon className="h-4 w-4" />
                {shopUrl.replace(window.location.origin, "")}
              </a>
            )}
          </div>
        </div>
      </div>

      {decoration.showBanner && (
        <div className={`bg-gradient-to-r ${themeFor(decoration.bannerColor).gradient} px-8 py-3 text-center text-sm font-extrabold text-white shadow-sm`}>
          {decoration.bannerMessage || "Welcome to our shop."}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex-1 border-b-2 py-4 text-center text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "profile" && (
              <div className="grid gap-8 xl:grid-cols-[360px_1fr]">
                <div className="space-y-5">
                  <ImageUploadCard
                    title="Shop Logo"
                    note="Recommended 400 x 400 px"
                    imageUrl={profile.logo}
                    fallback={profile.shopName?.[0] || "S"}
                    field="logo"
                    crop={decoration.logoCrop}
                    uploading={uploadingField === "logo"}
                    onUpload={handleImageUpload}
                    onCropChange={(crop) => updateDecoration({ logoCrop: crop })}
                    square
                  />

                  <ImageUploadCard
                    title="Shop Banner"
                    note="Recommended 1920 x 480 px"
                    imageUrl={profile.banner}
                    field="banner"
                    crop={decoration.bannerCrop}
                    uploading={uploadingField === "banner"}
                    onUpload={handleImageUpload}
                    onCropChange={(crop) => updateDecoration({ bannerCrop: crop })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Shop Name">
                    <input value={profile.shopName} onChange={(event) => updateProfileField("shopName", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Custom URL Slug">
                    <input value={profile.slug} onChange={(event) => updateProfileField("slug", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Tagline" wide>
                    <input value={profile.tagline} onChange={(event) => updateProfileField("tagline", event.target.value)} className="input-control" placeholder="Fresh local products, delivered fast" />
                  </Field>
                  <Field label="Phone">
                    <input value={profile.phone} onChange={(event) => updateProfileField("phone", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="WhatsApp">
                    <input value={profile.whatsapp} onChange={(event) => updateProfileField("whatsapp", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Email">
                    <input value={profile.email} onChange={(event) => updateProfileField("email", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Processing Time">
                    <input value={profile.processingTime} onChange={(event) => updateProfileField("processingTime", event.target.value)} className="input-control" placeholder="Ships within 24 hours" />
                  </Field>
                  <Field label="Shop Address" wide>
                    <input value={profile.address} onChange={(event) => updateProfileField("address", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Shop Description (Markdown supported)" wide>
                    <textarea rows={5} value={profile.description} onChange={(event) => updateProfileField("description", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Return Policy" wide>
                    <textarea rows={3} value={profile.returnPolicy} onChange={(event) => updateProfileField("returnPolicy", event.target.value)} className="input-control" />
                  </Field>
                  <Field label="Shipping Notes" wide>
                    <textarea rows={3} value={profile.shippingNotes} onChange={(event) => updateProfileField("shippingNotes", event.target.value)} className="input-control" />
                  </Field>
                  <div className="md:col-span-2">
                    <SaveButton saving={saving} label="Save Profile" onClick={saveProfile} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "decoration" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                  <DecorationCommandPanel
                    decoration={decoration}
                    profile={profile}
                    selectedVoucher={selectedVoucher || approvedVouchers[0]}
                    products={products}
                    onApplyPreset={applyPreset}
                  />

                  <Section
                    icon={Megaphone}
                    title="Announcement Strip"
                    caption="A slim store-wide message that sits above your storefront and sets the buying mood."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Theme">
                        <ThemePicker value={decoration.bannerColor} onChange={(value) => updateDecoration({ bannerColor: value })} />
                      </Field>
                      <Field label="Message">
                        <input value={decoration.bannerMessage || ""} onChange={(event) => updateDecoration({ bannerMessage: event.target.value })} className="input-control" />
                      </Field>
                    </div>
                    <ToggleRow
                      title="Show announcement strip"
                      checked={decoration.showBanner}
                      onChange={(checked) => updateDecoration({ showBanner: checked })}
                    />
                  </Section>

                  <Section
                    icon={Star}
                    title="Featured Product Carousel"
                    caption="Pin your best products first so buyers do not have to search for your strongest items."
                  >
                    <div className="mb-4 max-w-md">
                      <Field label="Carousel Title">
                        <input
                          value={decoration.featuredCarousel?.title || ""}
                          onChange={(event) =>
                            updateDecoration({
                              featuredCarousel: { ...decoration.featuredCarousel, title: event.target.value },
                            })
                          }
                          className="input-control"
                        />
                      </Field>
                    </div>
                    <ProductPicker
                      products={products}
                      selectedIds={decoration.featuredCarousel?.productIds || []}
                      max={8}
                      onChange={(productIds) =>
                        updateDecoration({
                          featuredCarousel: { ...decoration.featuredCarousel, productIds },
                        })
                      }
                    />
                  </Section>

                  <Section
                    icon={TicketPercent}
                    title="Shop Coupon Banner"
                    caption="Promote one approved seller voucher in the store header with a clear copy action."
                  >
                    <ToggleRow
                      title="Show coupon banner on shop header"
                      checked={decoration.couponBanner?.enabled}
                      onChange={(checked) =>
                        updateDecoration({
                          couponBanner: { ...decoration.couponBanner, enabled: checked },
                        })
                      }
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Active Voucher">
                        <select
                          value={decoration.couponBanner?.voucherId || ""}
                          onChange={(event) =>
                            updateDecoration({
                              couponBanner: { ...decoration.couponBanner, voucherId: event.target.value },
                            })
                          }
                          className="input-control"
                        >
                          <option value="">Auto select first live voucher</option>
                          {approvedVouchers.map((voucher) => (
                            <option key={voucher._id} value={voucher._id}>
                              {voucher.code} - {voucher.title}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Banner Text">
                        <input
                          value={decoration.couponBanner?.customText || ""}
                          onChange={(event) =>
                            updateDecoration({
                              couponBanner: { ...decoration.couponBanner, customText: event.target.value },
                            })
                          }
                          className="input-control"
                          placeholder="Use this code at checkout"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon={Image}
                    title="Campaign Mode Decoration"
                    caption="Use this for Eid, flash campaigns, new collections, or time-limited store events."
                  >
                    <ToggleRow
                      title="Use campaign decoration"
                      checked={decoration.campaignMode?.enabled}
                      onChange={(checked) =>
                        updateDecoration({
                          campaignMode: { ...decoration.campaignMode, enabled: checked },
                        })
                      }
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Campaign Title">
                        <input
                          value={decoration.campaignMode?.title || ""}
                          onChange={(event) =>
                            updateDecoration({
                              campaignMode: { ...decoration.campaignMode, title: event.target.value },
                            })
                          }
                          className="input-control"
                        />
                      </Field>
                      <Field label="Theme">
                        <ThemePicker
                          value={decoration.campaignMode?.theme || defaultShopTheme}
                          onChange={(value) =>
                            updateDecoration({
                              campaignMode: { ...decoration.campaignMode, theme: value },
                            })
                          }
                        />
                      </Field>
                      <Field label="Start">
                        <input
                          type="datetime-local"
                          value={decoration.campaignMode?.startDate || ""}
                          onChange={(event) =>
                            updateDecoration({
                              campaignMode: { ...decoration.campaignMode, startDate: event.target.value },
                            })
                          }
                          className="input-control"
                        />
                      </Field>
                      <Field label="End">
                        <input
                          type="datetime-local"
                          value={decoration.campaignMode?.endDate || ""}
                          onChange={(event) =>
                            updateDecoration({
                              campaignMode: { ...decoration.campaignMode, endDate: event.target.value },
                            })
                          }
                          className="input-control"
                        />
                      </Field>
                      <Field label="Campaign Message" wide>
                        <textarea
                          rows={3}
                          value={decoration.campaignMode?.message || ""}
                          onChange={(event) =>
                            updateDecoration({
                              campaignMode: { ...decoration.campaignMode, message: event.target.value },
                            })
                          }
                          className="input-control"
                        />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <ImageUploadCard
                        title="Campaign Banner"
                        note="Recommended 1920 x 480 px"
                        imageUrl={decoration.campaignMode?.banner}
                        field="campaignBanner"
                        uploading={uploadingField === "campaignBanner"}
                        onUpload={handleImageUpload}
                        simple
                      />
                    </div>
                  </Section>

                  <Section
                    icon={Plus}
                    title="Category Tabs"
                    caption="Create curated shopping paths by category, product selection, or both."
                  >
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => updateDecoration({ categoryTabs: [...(decoration.categoryTabs || []), newTab()] })}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Tab
                      </button>
                    </div>
                    {(decoration.categoryTabs || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                        Add custom tabs like Men's Wear, New Arrivals, or Sale.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {decoration.categoryTabs.map((tab, index) => (
                          <div key={tab.id || index} className="rounded-lg border border-slate-200 p-4">
                            <div className="mb-4 flex items-center gap-3">
                              <input
                                value={tab.label || ""}
                                onChange={(event) =>
                                  updateDecoration({
                                    categoryTabs: decoration.categoryTabs.map((item) =>
                                      item.id === tab.id ? { ...item, label: event.target.value } : item,
                                    ),
                                  })
                                }
                                className="input-control"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateDecoration({
                                    categoryTabs: decoration.categoryTabs.filter((item) => item.id !== tab.id),
                                  })
                                }
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="mb-4">
                              <p className="mb-2 text-sm font-semibold text-slate-700">Categories</p>
                              <div className="flex flex-wrap gap-2">
                                {categories.map((category) => {
                                  const categoryId = idOf(category._id);
                                  const selected = tab.categoryIds?.includes(categoryId);
                                  return (
                                    <button
                                      key={categoryId}
                                      type="button"
                                      onClick={() => toggleCategoryOnTab(tab.id, categoryId)}
                                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                                        selected
                                          ? "border-primary-300 bg-primary-50 text-primary-700"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      {category.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <ProductPicker
                              products={products}
                              selectedIds={tab.productIds || []}
                              onChange={(productIds) => updateTabProducts(tab.id, productIds)}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  <SaveButton saving={saving} label="Save Decoration" onClick={saveDecoration} />
                </div>

                <ShopPreview
                  profile={profile}
                  decoration={decoration}
                  products={products}
                  selectedVoucher={selectedVoucher || approvedVouchers[0]}
                  formatPrice={formatPrice}
                />
              </div>
            )}

            {activeTab === "categories" && (
              <div>
                <div className="mb-6">
                  <h2 className="font-semibold text-slate-950">Approved Categories</h2>
                  <p className="text-sm text-slate-500">
                    These categories come from your approved vendor profile.
                  </p>
                </div>

                {categories.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No approved categories assigned yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {categories.map((category) => (
                      <div key={category._id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <p className="font-semibold text-slate-950">{category.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {category.description || "Approved for product listings"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  to="/vendor/category-requests"
                  className="mt-6 inline-flex rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Request More Categories
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function DecorationCommandPanel({ decoration, profile, selectedVoucher, products, onApplyPreset }) {
  const liveTheme = themeFor(decoration.campaignMode?.enabled ? decoration.campaignMode.theme : decoration.bannerColor);
  const featuredCount = decoration.featuredCarousel?.productIds?.length || 0;
  const tabCount = decoration.categoryTabs?.length || 0;
  const readinessItems = [
    { label: "Banner", ready: Boolean(profile.banner) },
    { label: "Announcement", ready: Boolean(decoration.showBanner && decoration.bannerMessage) },
    { label: "Featured picks", ready: featuredCount > 0 },
    { label: "Voucher", ready: Boolean(decoration.couponBanner?.enabled && selectedVoucher) },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-r ${liveTheme.gradient} px-5 py-5 text-white`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase">
              <Palette className="h-3.5 w-3.5" />
              Storefront Studio
            </div>
            <h2 className="mt-3 text-2xl font-black">Make the first screen sell the store</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-white/85">
              Shape the banner, promotion strip, vouchers, featured picks, and tabs from one polished control room.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[420px]">
            <StudioMetric label="Products" value={products.length} />
            <StudioMetric label="Featured" value={featuredCount} />
            <StudioMetric label="Tabs" value={tabCount} />
            <StudioMetric label="Voucher" value={selectedVoucher ? "Ready" : "Off"} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <LayoutTemplate className="h-4 w-4 text-primary-600" />
            Professional presets
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {decorationPresets.map((preset) => {
              const Icon = preset.icon;
              const presetTheme = themeFor(preset.bannerColor);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className="group rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-white hover:shadow-md"
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r ${presetTheme.gradient} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-black text-slate-950 group-hover:text-primary-700">{preset.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{preset.caption}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Eye className="h-4 w-4 text-primary-600" />
            Store readiness
          </div>
          <div className="space-y-2">
            {readinessItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-slate-600">{item.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${item.ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.ready ? "Ready" : "Add"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StudioMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-white/15 px-3 py-2 text-center backdrop-blur">
      <p className="text-lg font-black">{value}</p>
      <p className="text-[11px] font-bold uppercase text-white/75">{label}</p>
    </div>
  );
}

function Section({ icon, title, caption, children }) {
  const Icon = icon;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {caption ? <p className="mt-1 text-sm leading-6 text-slate-500">{caption}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveButton({ saving, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
    >
      <Save className="h-4 w-4" />
      {saving ? "Saving..." : label}
    </button>
  );
}

function ThemePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {shopThemeOptions.map((theme) => (
        <button
          key={theme.value}
          type="button"
          onClick={() => onChange(theme.value)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
            value === theme.value ? "border-primary-300 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className={`h-4 w-4 rounded-full ${theme.chip}`} />
          {theme.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ title, checked, onChange }) {
  return (
    <label className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="font-semibold text-slate-900">{title}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-primary-600" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
        <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      </span>
    </label>
  );
}

function ImageUploadCard({
  title,
  note,
  imageUrl,
  fallback,
  field,
  crop,
  uploading,
  onUpload,
  onCropChange,
  square = false,
  simple = false,
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{note}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={(event) => onUpload(field, event.target.files?.[0])} />
        </label>
      </div>
      <div className={`overflow-hidden rounded-lg bg-slate-100 ${square ? "h-28 w-28" : "aspect-[4/1] w-full"}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            style={{
              objectPosition: cropPosition(crop),
              transform: `scale(${cropScale(crop)})`,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary-700">
            {fallback || <Image className="h-8 w-8 text-slate-400" />}
          </div>
        )}
      </div>
      {!simple && crop && onCropChange && (
        <div className="mt-4 grid gap-3">
          <CropControl label="Horizontal crop" value={crop.x ?? 50} onChange={(x) => onCropChange({ ...crop, x })} />
          <CropControl label="Vertical crop" value={crop.y ?? 50} onChange={(y) => onCropChange({ ...crop, y })} />
          <CropControl label="Zoom" min={100} max={140} value={crop.zoom ?? 100} onChange={(zoom) => onCropChange({ ...crop, zoom })} />
        </div>
      )}
    </div>
  );
}

function CropControl({ label, value, onChange, min = 0, max = 100 }) {
  return (
    <label className="block text-xs font-semibold text-slate-500">
      <span className="mb-1 flex justify-between">
        {label}
        <span>{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary-600"
      />
    </label>
  );
}

function ProductPicker({ products, selectedIds, onChange, max = 0, compact = false }) {
  const toggle = (id) => {
    const exists = selectedIds.includes(id);
    if (!exists && max && selectedIds.length >= max) {
      toast.error(`Select up to ${max} products`);
      return;
    }
    onChange(exists ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        No products available.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">Products</span>
        <span className="text-slate-500">
          {selectedIds.length}{max ? `/${max}` : ""} selected
        </span>
      </div>
      <div className={`grid gap-3 overflow-y-auto rounded-lg border border-slate-200 p-3 ${compact ? "max-h-64 sm:grid-cols-2" : "max-h-96 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {products.map((product) => {
          const id = productId(product);
          const selected = selectedIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left ${
                selected ? "border-primary-300 bg-primary-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                {imageOf(product) && <img src={imageOf(product)} alt={product.title} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{product.title}</p>
                <p className="mt-1 text-xs text-slate-500">{product.price ? `BDT ${product.price}` : "No price"}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShopPreview({ profile, decoration, products, selectedVoucher, formatPrice }) {
  const featuredIds = decoration.featuredCarousel?.productIds || [];
  const featuredProducts = featuredIds
    .map((id) => products.find((product) => productId(product) === id))
    .filter(Boolean)
    .slice(0, 3);
  const theme = themeFor(decoration.campaignMode?.enabled ? decoration.campaignMode.theme : decoration.bannerColor);

  return (
    <aside className="sticky top-4 h-fit rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-950">Live Preview</h2>
        <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">Shop page</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        {decoration.showBanner && (
          <div className={`bg-gradient-to-r ${themeFor(decoration.bannerColor).gradient} px-4 py-2 text-center text-xs font-extrabold text-white`}>
            {decoration.bannerMessage || "Welcome to our shop."}
          </div>
        )}
        {decoration.campaignMode?.enabled && (
          <div className={`relative overflow-hidden bg-gradient-to-r ${theme.gradient} px-4 py-4 text-white`}>
            {decoration.campaignMode?.banner ? (
              <img src={decoration.campaignMode.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            ) : null}
            <div className="relative">
              <p className="text-sm font-bold">{decoration.campaignMode.title || "Campaign Sale"}</p>
              <p className="text-xs opacity-90">{decoration.campaignMode.message || "Special campaign decoration is active."}</p>
            </div>
          </div>
        )}
        <div className="aspect-[4/1] min-h-24 overflow-hidden bg-slate-100">
          {profile.banner && (
            <img
              src={profile.banner}
              alt="Preview banner"
              className="h-full w-full object-cover"
              style={{
                objectPosition: cropPosition(decoration.bannerCrop),
                transform: `scale(${cropScale(decoration.bannerCrop)})`,
                transformOrigin: cropPosition(decoration.bannerCrop),
              }}
            />
          )}
        </div>
        <div className="p-4">
          <div className="-mt-12 mb-3 h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-primary-50">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt="Preview logo"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: cropPosition(decoration.logoCrop),
                  transform: `scale(${cropScale(decoration.logoCrop)})`,
                  transformOrigin: cropPosition(decoration.logoCrop),
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary-700">
                {profile.shopName?.[0] || "S"}
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-950">{profile.shopName || "Shop name"}</h3>
          <p className="text-sm text-slate-500">{profile.tagline || "Shop tagline"}</p>
          {selectedVoucher && decoration.couponBanner?.enabled && (
            <div className={`mt-4 rounded-lg border p-3 ${themeFor(decoration.bannerColor).soft}`}>
              <p className="text-xs font-semibold">{decoration.couponBanner.customText || "Shop coupon"}</p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-950">{selectedVoucher.code}</p>
            </div>
          )}
          {featuredProducts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-950">{decoration.featuredCarousel?.title || "Featured products"}</p>
              <div className="space-y-2">
                {featuredProducts.map((product) => (
                  <div key={productId(product)} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2">
                    <div className="h-10 w-10 overflow-hidden rounded bg-slate-100">
                      {imageOf(product) && <img src={imageOf(product)} alt={product.title} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-950">{product.title}</p>
                      <p className="text-xs text-slate-500">{formatPrice(product.price || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
