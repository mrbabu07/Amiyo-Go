import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  Facebook,
  Image,
  Instagram,
  Loader2,
  MapPin,
  Save,
  Store,
  Youtube,
} from "lucide-react";
import toast from "react-hot-toast";
import { LocationPicker } from "../../components/shops/ShopMaps";
import {
  getCategories,
  getVendorShop,
  updateVendorShop,
  updateVendorShopLocation,
  updateVendorShopMedia,
} from "../../services/api";

const tabs = [
  { id: "settings", label: "Shop Info", path: "/vendor/shop/settings" },
  { id: "media", label: "Media", path: "/vendor/shop/media" },
  { id: "location", label: "Location", path: "/vendor/shop/location" },
];

const emptyForm = {
  shopName: "",
  tagline: "",
  description: "",
  categories: [],
  returnPolicy: "",
  shippingPolicy: "",
  workingHours: "",
  phone: "",
  email: "",
  website: "",
  socialLinks: {
    facebook: "",
    instagram: "",
    youtube: "",
  },
};

const emptyAddress = {
  line1: "",
  area: "",
  city: "",
  district: "",
  country: "Bangladesh",
};

const normalizeCategoryRows = (payload) => {
  const rows = payload?.data?.data || payload?.data || [];
  return Array.isArray(rows) ? rows : [];
};

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-xl font-black text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-800 dark:text-white">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const textareaClass =
  "min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export default function VendorShopSettings() {
  const location = useLocation();
  const activeTab = location.pathname.includes("/media")
    ? "media"
    : location.pathname.includes("/location")
      ? "location"
      : "settings";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [address, setAddress] = useState(emptyAddress);
  const [position, setPosition] = useState({ lat: 23.8103, lng: 90.4125 });
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [mediaFiles, setMediaFiles] = useState({ logo: null, banner: null });

  const previewLogo = useMemo(
    () => (mediaFiles.logo ? URL.createObjectURL(mediaFiles.logo) : shop?.logo || ""),
    [mediaFiles.logo, shop?.logo],
  );
  const previewBanner = useMemo(
    () => (mediaFiles.banner ? URL.createObjectURL(mediaFiles.banner) : shop?.banner || ""),
    [mediaFiles.banner, shop?.banner],
  );

  useEffect(() => {
    return () => {
      if (previewLogo?.startsWith("blob:")) URL.revokeObjectURL(previewLogo);
      if (previewBanner?.startsWith("blob:")) URL.revokeObjectURL(previewBanner);
    };
  }, [previewLogo, previewBanner]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [shopResponse, categoryResponse] = await Promise.all([
          getVendorShop(),
          getCategories().catch(() => ({ data: { data: [] } })),
        ]);
        const data = shopResponse.data?.data || {};
        const nextAddress = {
          ...emptyAddress,
          ...(data.address || {}),
        };
        if (!cancelled) {
          setShop(data);
          setForm({
            ...emptyForm,
            ...data,
            categories: Array.isArray(data.categories) ? data.categories : [],
            socialLinks: {
              ...emptyForm.socialLinks,
              ...(data.socialLinks || {}),
            },
          });
          setAddress(nextAddress);
          setResolvedAddress(data.location?.formattedAddress || "");
          setPosition({
            lat: Number(data.location?.lat) || 23.8103,
            lng: Number(data.location?.lng) || 90.4125,
          });
          setCategoryOptions(
            normalizeCategoryRows(categoryResponse)
              .filter((category) => category?.isActive !== false)
              .map((category) => category.name || category.title)
              .filter(Boolean),
          );
        }
      } catch (error) {
        console.error("Failed to load vendor shop:", error);
        if (!cancelled) toast.error("Failed to load shop settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateSocial = (key, value) => {
    setForm((current) => ({
      ...current,
      socialLinks: { ...current.socialLinks, [key]: value },
    }));
  };

  const toggleCategory = (category) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };

  const saveInfo = async () => {
    setSaving(true);
    try {
      const response = await updateVendorShop(form);
      const data = response.data?.data || {};
      setShop(data);
      setForm((current) => ({ ...current, ...data, categories: data.categories || current.categories }));
      toast.success("Shop information saved");
    } catch (error) {
      console.error("Failed to save shop info:", error);
      toast.error(error.response?.data?.error || "Failed to save shop information");
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async () => {
    if (!mediaFiles.logo && !mediaFiles.banner) {
      toast.error("Choose a logo or banner first");
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      if (mediaFiles.logo) body.append("logo", mediaFiles.logo);
      if (mediaFiles.banner) body.append("banner", mediaFiles.banner);
      const response = await updateVendorShopMedia(body);
      const data = response.data?.data || {};
      setShop((current) => ({ ...current, ...data }));
      setMediaFiles({ logo: null, banner: null });
      toast.success("Shop media saved");
    } catch (error) {
      console.error("Failed to save shop media:", error);
      toast.error(error.response?.data?.error || "Failed to upload media");
    } finally {
      setSaving(false);
    }
  };

  const findOnMap = async () => {
    const addressString = [address.line1, address.area, address.city, address.district, address.country]
      .filter(Boolean)
      .join(", ");
    if (!addressString) {
      toast.error("Add address details first");
      return;
    }
    setSaving(true);
    try {
      const response = await updateVendorShopLocation({ addressString, address });
      const data = response.data?.data || {};
      if (data.location) {
        setPosition({ lat: Number(data.location.lat), lng: Number(data.location.lng) });
        setResolvedAddress(data.location.formattedAddress || "");
      }
      if (data.address) setAddress((current) => ({ ...current, ...data.address }));
      toast.success("Map pin found and saved");
    } catch (error) {
      console.error("Failed to find location:", error);
      toast.error(error.response?.data?.error || "Could not find that address");
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    setSaving(true);
    try {
      const response = await updateVendorShopLocation({ ...position, address });
      const data = response.data?.data || {};
      if (data.location) {
        setResolvedAddress(data.location.formattedAddress || "");
        setPosition({ lat: Number(data.location.lat), lng: Number(data.location.lng) });
      }
      if (data.address) setAddress((current) => ({ ...current, ...data.address }));
      toast.success("Shop location saved");
    } catch (error) {
      console.error("Failed to save location:", error);
      toast.error(error.response?.data?.error || "Failed to save shop location");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-lg bg-white dark:bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            icon={Store}
            title="Manage Shop"
            description="Keep your public storefront accurate, polished, and ready for customers."
          />
          {shop?.slug ? (
            <Link
              to={`/shops/${shop.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-primary-200 px-4 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50 dark:border-primary-900 dark:text-primary-200 dark:hover:bg-primary-950/30"
            >
              View public shop
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`rounded-md px-4 py-2 text-sm font-extrabold transition ${
                activeTab === tab.id
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {activeTab === "settings" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SectionHeader
            icon={CheckCircle2}
            title="Shop Information"
            description="These details appear on your shop page and product seller links."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Shop name">
              <input className={inputClass} value={form.shopName} onChange={(event) => updateForm("shopName", event.target.value)} />
            </Field>
            <Field label="Tagline">
              <input className={inputClass} value={form.tagline} onChange={(event) => updateForm("tagline", event.target.value)} placeholder="A short one-line promise" />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Description">
                <textarea className={textareaClass} value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
              </Field>
            </div>
            <Field label="Working hours">
              <input className={inputClass} value={form.workingHours} onChange={(event) => updateForm("workingHours", event.target.value)} placeholder="Mon-Sat 9am-6pm" />
            </Field>
            <Field label="Phone">
              <input className={inputClass} value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
            </Field>
            <Field label="Email">
              <input className={inputClass} type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
            </Field>
            <Field label="Website">
              <input className={inputClass} value={form.website} onChange={(event) => updateForm("website", event.target.value)} placeholder="https://example.com" />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Business categories">
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  {categoryOptions.length ? (
                    categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                          form.categories.includes(category)
                            ? "border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {category}
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No category list available.</span>
                  )}
                </div>
              </Field>
            </div>
            <Field label="Return policy">
              <textarea className={textareaClass} value={form.returnPolicy} onChange={(event) => updateForm("returnPolicy", event.target.value)} />
            </Field>
            <Field label="Shipping policy">
              <textarea className={textareaClass} value={form.shippingPolicy} onChange={(event) => updateForm("shippingPolicy", event.target.value)} />
            </Field>
            <Field label="Facebook URL">
              <div className="relative">
                <Facebook className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-blue-600" />
                <input className={`${inputClass} pl-10`} value={form.socialLinks.facebook} onChange={(event) => updateSocial("facebook", event.target.value)} />
              </div>
            </Field>
            <Field label="Instagram URL">
              <div className="relative">
                <Instagram className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-pink-600" />
                <input className={`${inputClass} pl-10`} value={form.socialLinks.instagram} onChange={(event) => updateSocial("instagram", event.target.value)} />
              </div>
            </Field>
            <Field label="YouTube URL">
              <div className="relative">
                <Youtube className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-red-600" />
                <input className={`${inputClass} pl-10`} value={form.socialLinks.youtube} onChange={(event) => updateSocial("youtube", event.target.value)} />
              </div>
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={saveInfo}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save shop info
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "media" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SectionHeader
            icon={Image}
            title="Shop Media"
            description="Upload a clear logo and wide banner for your public storefront."
          />
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <p className="mb-2 text-sm font-extrabold text-slate-800 dark:text-white">Logo</p>
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200 dark:border-slate-900 dark:bg-slate-800 dark:ring-slate-700">
                {previewLogo ? <img src={previewLogo} alt="Shop logo preview" className="h-full w-full object-cover" /> : <Store className="h-12 w-12 text-slate-400" />}
              </div>
              <label className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <Camera className="h-4 w-4" />
                Choose logo
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setMediaFiles((current) => ({ ...current, logo: event.target.files?.[0] || null }))} />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-extrabold text-slate-800 dark:text-white">Banner</p>
              <div className="flex aspect-[5/2] min-h-48 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-primary-700 to-orange-500 ring-1 ring-slate-200 dark:ring-slate-700">
                {previewBanner ? <img src={previewBanner} alt="Shop banner preview" className="h-full w-full object-cover" /> : <Image className="h-12 w-12 text-white/75" />}
              </div>
              <label className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <Camera className="h-4 w-4" />
                Choose banner
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setMediaFiles((current) => ({ ...current, banner: event.target.files?.[0] || null }))} />
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={saveMedia}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save media
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "location" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SectionHeader
            icon={MapPin}
            title="Shop Location"
            description="Let buyers understand your service area and find your physical shop if you expose it publicly."
          />
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              {["line1", "area", "city", "district"].map((field) => (
                <Field key={field} label={field === "line1" ? "Address line" : field.charAt(0).toUpperCase() + field.slice(1)}>
                  <input
                    className={inputClass}
                    value={address[field] || ""}
                    onChange={(event) => setAddress((current) => ({ ...current, [field]: event.target.value }))}
                  />
                </Field>
              ))}
              <Field label="Country">
                <input
                  className={inputClass}
                  value={address.country || "Bangladesh"}
                  onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))}
                />
              </Field>
              <button
                type="button"
                onClick={findOnMap}
                disabled={saving}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-extrabold text-primary-700 transition hover:bg-primary-100 disabled:opacity-60 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Find on map
              </button>
              {resolvedAddress ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <span className="font-extrabold text-slate-900 dark:text-white">Resolved address:</span> {resolvedAddress}
                </div>
              ) : null}
            </div>

            <div>
              <LocationPicker
                defaultLat={position.lat}
                defaultLng={position.lng}
                onLocationChange={(next) => setPosition({ lat: next.lat, lng: next.lng })}
              />
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Selected pin: {Number(position.lat).toFixed(5)}, {Number(position.lng).toFixed(5)}
                </p>
                <button
                  type="button"
                  onClick={saveLocation}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save location
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
