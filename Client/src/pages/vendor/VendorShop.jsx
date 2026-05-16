import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  getMyVendorCategories,
  getMyVendorProfile,
  updateMyVendorProfile,
  uploadImages,
} from "../../services/api";

const tabs = [
  { id: "profile", label: "Shop Profile", path: "/vendor/shop/profile" },
  { id: "decoration", label: "Shop Decoration", path: "/vendor/shop/decoration" },
  { id: "categories", label: "Categories", path: "/vendor/shop/categories" },
];

const bannerColors = [
  { label: "Sunrise Orange", value: "from-orange-400 to-red-400" },
  { label: "Ocean Blue", value: "from-blue-500 to-cyan-400" },
  { label: "Forest Green", value: "from-green-500 to-emerald-400" },
  { label: "Rose", value: "from-rose-500 to-pink-400" },
  { label: "Slate", value: "from-slate-700 to-slate-900" },
  { label: "Gold", value: "from-yellow-400 to-orange-500" },
];

const defaultProfile = {
  shopName: "",
  slug: "",
  description: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  returnPolicy: "",
  processingTime: "",
  logo: "",
  banner: "",
};

const defaultDecoration = {
  bannerColor: "from-orange-400 to-red-400",
  bannerMessage: "Welcome to our shop.",
  showBanner: true,
};

export default function VendorShop() {
  const location = useLocation();
  const activeTab = tabs.find((tab) => location.pathname.includes(tab.id))?.id || "profile";
  const [vendorId, setVendorId] = useState(null);
  const [profile, setProfile] = useState(defaultProfile);
  const [decoration, setDecoration] = useState(defaultDecoration);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    const loadShop = async () => {
      setLoading(true);
      try {
        const [profileResponse, categoryResponse] = await Promise.all([
          getMyVendorProfile(),
          getMyVendorCategories().catch(() => ({ data: { data: [] } })),
        ]);

        const vendor = profileResponse.data?.vendor || {};
        setVendorId(vendor._id);
        setProfile({
          ...defaultProfile,
          shopName: vendor.shopName || "",
          slug: vendor.slug || "",
          description: vendor.description || "",
          phone: vendor.phone || "",
          whatsapp: vendor.whatsapp || "",
          email: vendor.email || "",
          address: vendor.address || "",
          returnPolicy: vendor.returnPolicy || "",
          processingTime: vendor.processingTime || "",
          logo: vendor.logo || "",
          banner: vendor.banner || "",
        });
        setDecoration({
          ...defaultDecoration,
          ...(vendor.shopDecoration || {}),
        });
        setCategories(categoryResponse.data?.data || []);
      } catch (error) {
        console.error("Failed to load shop profile:", error);
        toast.error("Failed to load shop profile");
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, []);

  const updateProfileField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
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

      await updateMyVendorProfile({ [field]: url });
      updateProfileField(field, url);
      toast.success(`${field === "logo" ? "Logo" : "Banner"} uploaded`);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="rounded-md p-2 hover:bg-gray-100">
              <span className="sr-only">Back</span>
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
              <p className="text-sm text-gray-500">Profile, decoration, and approved categories</p>
            </div>
          </div>
        </div>
      </div>

      {decoration.showBanner && (
        <div className={`bg-gradient-to-r ${decoration.bannerColor} px-8 py-4 text-center font-medium text-white`}>
          {decoration.bannerMessage}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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
            {activeTab === "profile" && (
              <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-gray-700">Logo</p>
                    <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-orange-100 text-3xl font-bold text-orange-700">
                      {profile.logo ? (
                        <img src={profile.logo} alt="Shop logo" className="h-full w-full object-cover" />
                      ) : (
                        profile.shopName?.[0] || "S"
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                      {uploadingField === "logo" ? "Uploading..." : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleImageUpload("logo", event.target.files?.[0])}
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-gray-700">Banner</p>
                    <div className="mb-3 aspect-[3/1] overflow-hidden rounded-md bg-gray-100">
                      {profile.banner ? (
                        <img src={profile.banner} alt="Shop banner" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <label className="inline-flex cursor-pointer rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                      {uploadingField === "banner" ? "Uploading..." : "Upload Banner"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleImageUpload("banner", event.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {[
                    ["shopName", "Shop Name"],
                    ["slug", "Shop Slug"],
                    ["phone", "Phone Number"],
                    ["whatsapp", "WhatsApp"],
                    ["email", "Email Address"],
                    ["address", "Shop Address"],
                    ["processingTime", "Processing Time"],
                  ].map(([key, label]) => (
                    <label key={key} className="block text-sm">
                      <span className="font-semibold text-gray-600">{label}</span>
                      <input
                        value={profile[key] || ""}
                        onChange={(event) => updateProfileField(key, event.target.value)}
                        className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                    </label>
                  ))}

                  <label className="block text-sm md:col-span-2">
                    <span className="font-semibold text-gray-600">Shop Description</span>
                    <textarea
                      rows={3}
                      value={profile.description || ""}
                      onChange={(event) => updateProfileField("description", event.target.value)}
                      className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <label className="block text-sm md:col-span-2">
                    <span className="font-semibold text-gray-600">Return Policy</span>
                    <textarea
                      rows={2}
                      value={profile.returnPolicy || ""}
                      onChange={(event) => updateProfileField("returnPolicy", event.target.value)}
                      className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-md bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 md:col-span-2"
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "decoration" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-600">Banner Color</label>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {bannerColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setDecoration((prev) => ({ ...prev, bannerColor: color.value }))}
                        className={`h-14 rounded-md bg-gradient-to-r ${color.value} ${
                          decoration.bannerColor === color.value ? "ring-2 ring-orange-500 ring-offset-2" : ""
                        }`}
                      >
                        <span className="sr-only">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-sm">
                  <span className="font-semibold text-gray-600">Banner Message</span>
                  <input
                    value={decoration.bannerMessage || ""}
                    onChange={(event) =>
                      setDecoration((prev) => ({ ...prev, bannerMessage: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </label>

                <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <span>
                    <span className="block font-semibold text-gray-900">Show Banner</span>
                    <span className="text-sm text-gray-500">Display the announcement strip on your shop.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={decoration.showBanner}
                    onChange={(event) =>
                      setDecoration((prev) => ({ ...prev, showBanner: event.target.checked }))
                    }
                    className="h-5 w-5"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveDecoration}
                  disabled={saving}
                  className="rounded-md bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Appearance"}
                </button>
              </div>
            )}

            {activeTab === "categories" && (
              <div>
                <div className="mb-6">
                  <h2 className="font-semibold text-gray-900">Approved Categories</h2>
                  <p className="text-sm text-gray-500">
                    These categories come from the vendor profile stored in the database.
                  </p>
                </div>

                {categories.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    No approved categories assigned yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {categories.map((category) => (
                      <div
                        key={category._id}
                        className="rounded-lg border border-green-200 bg-green-50 p-4"
                      >
                        <p className="font-semibold text-gray-900">{category.name}</p>
                        <p className="mt-1 text-sm text-gray-500">
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
