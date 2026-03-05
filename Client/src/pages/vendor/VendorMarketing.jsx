import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCurrency } from "../../hooks/useCurrency";
import toast, { Toaster } from "react-hot-toast";

const tabs = [
  { id: "promotions", label: "🎯 Promotions", path: "/vendor/marketing/promotions" },
  { id: "vouchers", label: "🎟️ Vouchers", path: "/vendor/marketing/vouchers" },
  { id: "campaigns", label: "📣 Campaigns", path: "/vendor/marketing/campaigns" },
];

const mockPromotions = [
  { id: 1, name: "Eid Sale 30% Off", type: "Percentage", discount: 30, minOrder: 500, startDate: "2026-03-20", endDate: "2026-03-25", status: "upcoming", usageCount: 0 },
  { id: 2, name: "Flash Deal — Electronics", type: "Percentage", discount: 20, minOrder: 1000, startDate: "2026-03-01", endDate: "2026-03-10", status: "ended", usageCount: 47 },
  { id: 3, name: "Weekend Special", type: "Fixed", discount: 100, minOrder: 800, startDate: "2026-03-04", endDate: "2026-03-05", status: "active", usageCount: 12 },
];

const mockVouchers = [
  { id: 1, code: "SAVE50", type: "Fixed Amount", discount: 50, minPurchase: 300, usage: 23, maxUsage: 100, expiry: "2026-03-31", status: "active" },
  { id: 2, code: "NEW15", type: "Percentage", discount: 15, minPurchase: 200, usage: 89, maxUsage: 100, expiry: "2026-03-15", status: "active" },
  { id: 3, code: "EID2026", type: "Percentage", discount: 25, minPurchase: 500, usage: 0, maxUsage: 200, expiry: "2026-03-25", status: "upcoming" },
];

const mockCampaigns = [
  { id: 1, name: "Eid 2026", startDate: "2026-03-20", endDate: "2026-03-25", enrolled: true, type: "Festival Sale", icon: "🌙" },
  { id: 2, name: "Flash Sale March", startDate: "2026-03-10", endDate: "2026-03-11", enrolled: false, type: "Flash Sale", icon: "⚡" },
  { id: 3, name: "New Arrivals Boost", startDate: "2026-03-05", endDate: "2026-03-07", enrolled: true, type: "Product Launch", icon: "🆕" },
  { id: 4, name: "Brand Day Sale", startDate: "2026-03-15", endDate: "2026-03-16", enrolled: false, type: "Brand Event", icon: "🏷️" },
];

const statusBadge = (status) => {
  const map = {
    active: "bg-green-100 text-green-700",
    upcoming: "bg-blue-100 text-blue-700",
    ended: "bg-gray-100 text-gray-500",
    paused: "bg-yellow-100 text-yellow-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function VendorMarketing() {
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [showCreateVoucher, setShowCreateVoucher] = useState(false);
  const [promotions, setPromotions] = useState(mockPromotions);
  const [vouchers, setVouchers] = useState(mockVouchers);
  const [campaigns, setCampaigns] = useState(mockCampaigns);

  const activeTab = tabs.find((t) => location.pathname.includes(t.id))?.id || "promotions";

  const [newPromo, setNewPromo] = useState({ name: "", discount: "", type: "Percentage", minOrder: "", startDate: "", endDate: "" });
  const [newVoucher, setNewVoucher] = useState({ code: "", discount: "", type: "Percentage", minPurchase: "", maxUsage: "", expiry: "" });

  const addPromo = () => {
    if (!newPromo.name || !newPromo.discount) { toast.error("Fill in all required fields"); return; }
    setPromotions(prev => [...prev, { id: Date.now(), ...newPromo, status: "upcoming", usageCount: 0 }]);
    toast.success("Promotion created!");
    setShowCreatePromo(false);
    setNewPromo({ name: "", discount: "", type: "Percentage", minOrder: "", startDate: "", endDate: "" });
  };

  const addVoucher = () => {
    if (!newVoucher.code || !newVoucher.discount) { toast.error("Fill in all required fields"); return; }
    setVouchers(prev => [...prev, { id: Date.now(), ...newVoucher, usage: 0, status: "upcoming" }]);
    toast.success("Voucher created!");
    setShowCreateVoucher(false);
    setNewVoucher({ code: "", discount: "", type: "Percentage", minPurchase: "", maxUsage: "", expiry: "" });
  };

  const toggleCampaign = (id) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, enrolled: !c.enrolled } : c));
    const c = campaigns.find(c => c.id === id);
    toast.success(c?.enrolled ? "Unenrolled from campaign" : "Enrolled in campaign! 🎉");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: "#363636", color: "#fff" } }} />

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing Tools</h1>
              <p className="text-sm text-gray-500">Promotions, vouchers and campaign management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: "🎯", label: "Active Promotions", value: promotions.filter(p => p.status === "active").length, color: "text-orange-600" },
            { icon: "🎟️", label: "Active Vouchers", value: vouchers.filter(v => v.status === "active").length, color: "text-purple-600" },
            { icon: "📣", label: "Campaigns Enrolled", value: campaigns.filter(c => c.enrolled).length, color: "text-blue-600" },
            { icon: "📈", label: "Total Voucher Uses", value: vouchers.reduce((s, v) => s + v.usage, 0), color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <span className="text-3xl">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Tab headers */}
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
            {/* ── Promotions ─────────────────────────────────────── */}
            {activeTab === "promotions" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">All Promotions</h3>
                  <button
                    onClick={() => setShowCreatePromo(true)}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Promotion
                  </button>
                </div>

                {/* Create Form */}
                {showCreatePromo && (
                  <div className="mb-6 p-5 bg-orange-50 rounded-xl border border-orange-200">
                    <h4 className="font-semibold text-gray-900 mb-4">New Promotion</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 font-medium uppercase">Promotion Name *</label>
                        <input value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="e.g. Weekend Sale" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Discount Type</label>
                        <select value={newPromo.type} onChange={e => setNewPromo(p => ({ ...p, type: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option>Percentage</option>
                          <option>Fixed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Discount Value *</label>
                        <input type="number" value={newPromo.discount} onChange={e => setNewPromo(p => ({ ...p, discount: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder={newPromo.type === "Percentage" ? "e.g. 20" : "e.g. 100"} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Start Date</label>
                        <input type="date" value={newPromo.startDate} onChange={e => setNewPromo(p => ({ ...p, startDate: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">End Date</label>
                        <input type="date" value={newPromo.endDate} onChange={e => setNewPromo(p => ({ ...p, endDate: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={addPromo} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Create</button>
                      <button onClick={() => setShowCreatePromo(false)} className="bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {promotions.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">🎯</div>
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-sm text-gray-500">
                            {p.type === "Percentage" ? `${p.discount}% off` : `${formatPrice(p.discount)} off`}
                            {p.minOrder ? ` · Min order ${formatPrice(p.minOrder)}` : ""}
                            {p.startDate ? ` · ${new Date(p.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">{p.usageCount} uses</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(p.status)}`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Vouchers ─────────────────────────────────────────── */}
            {activeTab === "vouchers" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Shop Vouchers</h3>
                  <button
                    onClick={() => setShowCreateVoucher(true)}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Voucher
                  </button>
                </div>

                {showCreateVoucher && (
                  <div className="mb-6 p-5 bg-orange-50 rounded-xl border border-orange-200">
                    <h4 className="font-semibold text-gray-900 mb-4">New Voucher</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Voucher Code *</label>
                        <input value={newVoucher.code} onChange={e => setNewVoucher(v => ({ ...v, code: e.target.value.toUpperCase() }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="e.g. SAVE50" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Type</label>
                        <select value={newVoucher.type} onChange={e => setNewVoucher(v => ({ ...v, type: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option>Percentage</option>
                          <option>Fixed Amount</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Discount *</label>
                        <input type="number" value={newVoucher.discount} onChange={e => setNewVoucher(v => ({ ...v, discount: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder={newVoucher.type === "Percentage" ? "%" : "Amount"} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Max Usage</label>
                        <input type="number" value={newVoucher.maxUsage} onChange={e => setNewVoucher(v => ({ ...v, maxUsage: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="e.g. 100" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium uppercase">Expiry Date</label>
                        <input type="date" value={newVoucher.expiry} onChange={e => setNewVoucher(v => ({ ...v, expiry: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={addVoucher} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Create</button>
                      <button onClick={() => setShowCreateVoucher(false)} className="bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vouchers.map((v) => (
                    <div key={v.id} className="border-2 border-dashed rounded-xl p-4 border-orange-200 bg-orange-50/40 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(v.status)}`}>{v.status}</span>
                        <span className="text-xs text-gray-400">Exp: {new Date(v.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <div className="font-mono text-2xl font-bold text-orange-600 mb-1">{v.code}</div>
                      <p className="text-sm text-gray-700 mb-3">
                        {v.type === "Percentage" ? `${v.discount}% off` : `${formatPrice(v.discount)} off`}
                        {v.minPurchase ? ` · Min: ${formatPrice(v.minPurchase)}` : ""}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Used: {v.usage}</span>
                            <span>Max: {v.maxUsage}</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-orange-400 rounded-full transition-all"
                              style={{ width: `${Math.min((v.usage / v.maxUsage) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(v.code); toast.success("Code copied!"); }}
                          className="text-xs text-orange-600 hover:text-orange-800 px-2 py-1 rounded hover:bg-orange-100 transition"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Campaigns ────────────────────────────────────────── */}
            {activeTab === "campaigns" && (
              <div>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900">Platform Campaigns</h3>
                  <p className="text-sm text-gray-500 mt-1">Join platform-wide campaigns to boost your sales during special events</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campaigns.map((c) => (
                    <div key={c.id} className={`border rounded-xl p-5 transition ${c.enrolled ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white hover:shadow-sm"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${c.enrolled ? "bg-orange-100" : "bg-gray-100"}`}>
                            {c.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{c.name}</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.type}</span>
                          </div>
                        </div>
                        {c.enrolled && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">✓ Enrolled</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        <span>📅 {new Date(c.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(c.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <button
                        onClick={() => toggleCampaign(c.id)}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                          c.enrolled
                            ? "border border-red-200 text-red-600 hover:bg-red-50"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {c.enrolled ? "Unenroll" : "Join Campaign"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
