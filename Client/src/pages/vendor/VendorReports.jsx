import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCurrency } from "../../hooks/useCurrency";

const tabs = [
  { id: "sales", label: "💰 Sales Report", path: "/vendor/reports/sales" },
  { id: "products", label: "📦 Product Report", path: "/vendor/reports/products" },
  { id: "traffic", label: "📊 Traffic Report", path: "/vendor/reports/traffic" },
];

// Mock data for charts
const salesData = [
  { day: "Mon", amount: 3200, orders: 5 },
  { day: "Tue", amount: 1800, orders: 3 },
  { day: "Wed", amount: 5400, orders: 8 },
  { day: "Thu", amount: 2100, orders: 4 },
  { day: "Fri", amount: 6800, orders: 11 },
  { day: "Sat", amount: 9200, orders: 15 },
  { day: "Sun", amount: 7400, orders: 12 },
];

const monthlyData = [
  { month: "Sep", amount: 28000 },
  { month: "Oct", amount: 35000 },
  { month: "Nov", amount: 42000 },
  { month: "Dec", amount: 68000 },
  { month: "Jan", amount: 31000 },
  { month: "Feb", amount: 38000 },
  { month: "Mar", amount: 28500 },
];

const topProducts = [
  { name: "Men's Casual Shirt", sold: 47, revenue: 28200, views: 1234, rating: 4.8, trend: "up" },
  { name: "Women's Kurti Set", sold: 38, revenue: 41800, views: 980, rating: 4.6, trend: "up" },
  { name: "Kids Sneakers", sold: 29, revenue: 17400, views: 756, rating: 4.5, trend: "stable" },
  { name: "Leather Handbag", sold: 21, revenue: 52500, views: 645, rating: 4.9, trend: "up" },
  { name: "Sports Cap", sold: 18, revenue: 6300, views: 432, rating: 4.2, trend: "down" },
];

const trafficSources = [
  { source: "Search", visits: 3241, percentage: 42, color: "bg-orange-400" },
  { source: "Homepage Banner", visits: 1876, percentage: 24, color: "bg-blue-400" },
  { source: "Category Page", visits: 1234, percentage: 16, color: "bg-purple-400" },
  { source: "Flash Sale", visits: 876, percentage: 11, color: "bg-green-400" },
  { source: "Direct Link", visits: 543, percentage: 7, color: "bg-yellow-400" },
];

export default function VendorReports() {
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const [period, setPeriod] = useState("week");

  const activeTab = tabs.find((t) => location.pathname.includes(t.id))?.id || "sales";
  const chartData = period === "week" ? salesData : monthlyData;
  const maxVal = Math.max(...(period === "week" ? salesData.map(d => d.amount) : monthlyData.map(d => d.amount)));

  const totalSales = salesData.reduce((s, d) => s + d.amount, 0);
  const totalOrders = salesData.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500">Track your sales performance and growth</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "This Week Sales", value: formatPrice(totalSales), sub: "+12.4% vs last week", color: "text-orange-600", icon: "💰" },
            { label: "Total Orders", value: totalOrders, sub: "+3 vs last week", color: "text-blue-600", icon: "📦" },
            { label: "Avg. Order Value", value: formatPrice(Math.round(totalSales / totalOrders)), sub: "Per order this week", color: "text-green-600", icon: "📊" },
            { label: "Conversion Rate", value: "3.2%", sub: "+0.4% vs last week", color: "text-purple-600", icon: "🎯" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">{s.label}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-green-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
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
            {/* ── Sales Report ─────────────────────────────────────── */}
            {activeTab === "sales" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Sales Overview</h3>
                  <div className="flex gap-2">
                    {["week", "month"].map((p) => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${period === p ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {p === "week" ? "Weekly" : "Monthly"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="mb-8">
                  <div className="flex items-end gap-3 h-48 mb-2">
                    {chartData.map((d, i) => {
                      const h = Math.max((d.amount / maxVal) * 100, 4);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group">
                          <div className="relative w-full flex items-end justify-center" style={{ height: "180px" }}>
                            <div
                              className="w-full bg-orange-400 hover:bg-orange-500 rounded-t-lg transition-all cursor-pointer group-hover:shadow-lg"
                              style={{ height: `${h}%` }}
                            >
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition">
                                {formatPrice(d.amount)}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 mt-2">{d.day || d.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly breakdown table */}
                {period === "week" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Day</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Orders</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Revenue</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Avg. Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {salesData.map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 font-medium text-gray-900">{d.day}</td>
                            <td className="py-3 text-right text-gray-600">{d.orders}</td>
                            <td className="py-3 text-right font-semibold text-gray-900">{formatPrice(d.amount)}</td>
                            <td className="py-3 text-right text-gray-600">{formatPrice(Math.round(d.amount / d.orders))}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-orange-200 bg-orange-50">
                          <td className="py-3 font-bold text-gray-900">Total</td>
                          <td className="py-3 text-right font-bold text-gray-900">{totalOrders}</td>
                          <td className="py-3 text-right font-bold text-orange-600">{formatPrice(totalSales)}</td>
                          <td className="py-3 text-right font-bold text-gray-900">{formatPrice(Math.round(totalSales / totalOrders))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Product Report ────────────────────────────────────── */}
            {activeTab === "products" && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-6">Top Selling Products</h3>
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                        i === 1 ? "bg-gray-200 text-gray-600" :
                        i === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {i + 1}
                      </div>
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>⭐ {p.rating}</span>
                          <span>👁️ {p.views} views</span>
                        </div>
                      </div>
                      {/* Stats */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{p.sold} sold</p>
                        <p className="text-sm text-green-600 font-medium">{formatPrice(p.revenue)}</p>
                      </div>
                      {/* Trend */}
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                        p.trend === "up" ? "bg-green-100 text-green-700" :
                        p.trend === "down" ? "bg-red-100 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {p.trend === "up" ? "↑" : p.trend === "down" ? "↓" : "→"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Traffic Report ────────────────────────────────────── */}
            {activeTab === "traffic" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Traffic Sources</h3>
                  <div className="text-sm text-gray-500">Total: <span className="font-bold text-gray-900">7,770 visits</span> this week</div>
                </div>

                <div className="space-y-4 mb-8">
                  {trafficSources.map((t, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                          <span className="text-sm font-medium text-gray-700">{t.source}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">{t.visits.toLocaleString()}</span>
                          <span className="text-sm font-semibold text-gray-900 w-10 text-right">{t.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${t.color} transition-all`} style={{ width: `${t.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visitor metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Page Views", value: "24,850", icon: "👁️" },
                    { label: "Unique Visitors", value: "7,770", icon: "👥" },
                    { label: "Avg. Session Time", value: "2m 34s", icon: "⏱️" },
                    { label: "Bounce Rate", value: "38%", icon: "↩️" },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-50 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">{m.icon}</div>
                      <p className="text-xl font-bold text-gray-900">{m.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
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
