import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import toast, { Toaster } from "react-hot-toast";

const tabs = [
  { id: "profile", label: "🏪 Shop Profile", path: "/vendor/shop/profile" },
  { id: "decoration", label: "🎨 Shop Decoration", path: "/vendor/shop/decoration" },
  { id: "categories", label: "📂 Categories", path: "/vendor/shop/categories" },
];

const bannerColors = [
  { label: "Sunrise Orange", value: "from-orange-400 to-red-400" },
  { label: "Ocean Blue", value: "from-blue-400 to-cyan-400" },
  { label: "Forest Green", value: "from-green-400 to-emerald-400" },
  { label: "Royal Purple", value: "from-purple-400 to-pink-400" },
  { label: "Golden Sunset", value: "from-yellow-400 to-orange-400" },
  { label: "Midnight Dark", value: "from-gray-700 to-gray-900" },
];

export default function VendorShop() {
  const { user } = useAuth();
  const location = useLocation();
  const activeTab = tabs.find((t) => location.pathname.includes(t.id))?.id || "profile";

  const [profile, setProfile] = useState({
    shopName: "My BazarBD Shop",
    description: "Quality products at the best prices.",
    phone: "+880 1700-000000",
    whatsapp: "",
    email: user?.email || "",
    address: "Dhaka, Bangladesh",
    returnPolicy: "7 days return policy",
    processingTime: "1-2 business days",
  });

  const [decoration, setDecoration] = useState({
    bannerColor: "from-orange-400 to-red-400",
    bannerMessage: "🎉 Welcome to our shop! Best deals every day.",
    showBanner: true,
  });

  const [saved, setSaved] = useState(false);

  const saveProfile = () => {
    toast.success("Shop profile saved!");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
              <p className="text-sm text-gray-500">Customize your shop profile and appearance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Preview Banner */}
      <div className={`bg-gradient-to-r ${decoration.bannerColor} py-4 px-8 text-white text-center font-medium`}>
        {decoration.showBanner ? decoration.bannerMessage : ""}
        <span className="ml-3 text-xs opacity-70">(Live Preview)</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex-1 py-4 text-sm font-medium text-center transition border-b-2 ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-600 bg-orange-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="p-6">
            {/* ── Profile Tab ─────────────────────────────────────── */}
            {activeTab === "profile" && (
              <div className="max-w-2xl">
                {/* Logo Upload */}
                <div className="flex items-center gap-6 mb-8 p-5 bg-gray-50 rounded-xl">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg flex-shrink-0">
                    {profile.shopName?.[0] || "S"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{profile.shopName}</h3>
                    <p className="text-sm text-gray-500 mb-3">Upload your shop logo (recommended: 200×200px)</p>
                    <label className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                      <input type="file" className="hidden" accept="image/*" onChange={() => toast.success("Logo ready to upload!")} />
                      Upload Logo
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {[
                    { label: "Shop Name *", key: "shopName", placeholder: "Your shop name" },
                    { label: "Phone Number", key: "phone", placeholder: "+880 1XXX-XXXXXX" },
                    { label: "WhatsApp", key: "whatsapp", placeholder: "+880 1XXX-XXXXXX (optional)" },
                    { label: "Email Address", key: "email", placeholder: "shop@example.com" },
                    { label: "Shop Address", key: "address", placeholder: "City, District" },
                    { label: "Processing Time", key: "processingTime", placeholder: "e.g. 1-2 business days" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
                      <input
                        value={profile[f.key]}
                        onChange={(e) => setProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shop Description</label>
                    <textarea
                      rows={3}
                      value={profile.description}
                      onChange={(e) => setProfile(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      placeholder="Describe your shop..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Return Policy</label>
                    <textarea
                      rows={2}
                      value={profile.returnPolicy}
                      onChange={(e) => setProfile(prev => ({ ...prev, returnPolicy: e.target.value }))}
                      className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      placeholder="e.g. 7 days return policy..."
                    />
                  </div>

                  <button
                    onClick={saveProfile}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition"
                  >
                    {saved ? "✓ Saved!" : "Save Profile"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Decoration Tab ────────────────────────────────────── */}
            {activeTab === "decoration" && (
              <div className="max-w-2xl">
                <h3 className="font-semibold text-gray-900 mb-6">Shop Appearance</h3>

                <div className="space-y-6">
                  {/* Banner Color */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Banner Color</label>
                    <div className="grid grid-cols-3 gap-3">
                      {bannerColors.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setDecoration(prev => ({ ...prev, bannerColor: c.value }))}
                          className={`h-14 rounded-xl bg-gradient-to-r ${c.value} transition relative overflow-hidden ${decoration.bannerColor === c.value ? "ring-2 ring-orange-500 ring-offset-2" : ""}`}
                        >
                          {decoration.bannerColor === c.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                          <span className="sr-only">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Selected: {bannerColors.find(c => c.value === decoration.bannerColor)?.label}</p>
                  </div>

                  {/* Banner Message */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Banner Message</label>
                    <input
                      value={decoration.bannerMessage}
                      onChange={(e) => setDecoration(prev => ({ ...prev, bannerMessage: e.target.value }))}
                      className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="e.g. 🎉 Welcome! Free delivery on orders above ৳500"
                    />
                  </div>

                  {/* Toggle Banner */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Show Banner</p>
                      <p className="text-sm text-gray-500">Display announcement banner on your shop</p>
                    </div>
                    <button
                      onClick={() => setDecoration(prev => ({ ...prev, showBanner: !prev.showBanner }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${decoration.showBanner ? "bg-orange-500" : "bg-gray-300"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${decoration.showBanner ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  <button
                    onClick={() => toast.success("Shop decoration saved!")}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition"
                  >
                    Save Appearance
                  </button>
                </div>
              </div>
            )}

            {/* ── Categories Tab ─────────────────────────────────────── */}
            {activeTab === "categories" && (
              <div>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900">Your Approved Categories</h3>
                  <p className="text-sm text-gray-500 mt-1">These are the product categories you are permitted to sell in. Contact admin to add more.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Men's Fashion", icon: "👔", products: 12, status: "approved" },
                    { name: "Women's Fashion", icon: "👗", products: 18, status: "approved" },
                    { name: "Kids & Baby", icon: "🧒", products: 7, status: "approved" },
                    { name: "Electronics", icon: "📱", products: 0, status: "pending" },
                  ].map((cat, i) => (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${cat.status === "approved" ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${cat.status === "approved" ? "bg-green-100" : "bg-yellow-100"}`}>
                        {cat.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        <p className="text-sm text-gray-500">{cat.products} products listed</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cat.status === "approved" ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"}`}>
                        {cat.status === "approved" ? "✓ Approved" : "⏳ Pending"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">Need more categories?</p>
                  <p className="text-xs text-blue-600 mt-1">Submit a request to the admin from your Settings page, and we'll review it within 2 business days.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
