import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";

const tabs = [
  { id: "payments", label: "💳 Payments", path: "/vendor/finance/payments" },
  { id: "transactions", label: "📋 Transactions", path: "/vendor/finance/transactions" },
  { id: "statements", label: "📄 Statements", path: "/vendor/finance/statements" },
];

const mockTransactions = [
  { id: "TXN001", date: "2026-03-01", type: "Order Payment", orderId: "ORD8A2F1B", amount: 1850, commission: 185, net: 1665, status: "completed" },
  { id: "TXN002", date: "2026-02-28", type: "Order Payment", orderId: "ORD9C3D2E", amount: 3200, commission: 320, net: 2880, status: "completed" },
  { id: "TXN003", date: "2026-02-26", type: "Payout", orderId: "—", amount: 4545, commission: 0, net: 4545, status: "paid" },
  { id: "TXN004", date: "2026-02-24", type: "Order Payment", orderId: "ORD7B1A5C", amount: 950, commission: 95, net: 855, status: "completed" },
  { id: "TXN005", date: "2026-02-22", type: "Order Payment", orderId: "ORD6D4E8F", amount: 2400, commission: 240, net: 2160, status: "completed" },
  { id: "TXN006", date: "2026-02-18", type: "Payout", orderId: "—", amount: 3015, commission: 0, net: 3015, status: "paid" },
  { id: "TXN007", date: "2026-02-15", type: "Fee Deduction", orderId: "—", amount: 150, commission: 0, net: -150, status: "deducted" },
  { id: "TXN008", date: "2026-02-12", type: "Order Payment", orderId: "ORD5A3F2B", amount: 1200, commission: 120, net: 1080, status: "completed" },
];

const mockStatements = [
  { period: "February 2026", totalOrders: 18, grossSales: 28500, commission: 2850, netEarnings: 25650, paid: true },
  { period: "January 2026", totalOrders: 22, grossSales: 34200, commission: 3420, netEarnings: 30780, paid: true },
  { period: "December 2025", totalOrders: 31, grossSales: 52000, commission: 5200, netEarnings: 46800, paid: true },
  { period: "November 2025", totalOrders: 15, grossSales: 21000, commission: 2100, netEarnings: 18900, paid: true },
];

const statusBadge = (status) => {
  const map = {
    completed: "bg-green-100 text-green-700",
    paid: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    deducted: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
};

export default function VendorFinance() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const location = useLocation();

  const activeTab = tabs.find((t) => location.pathname.includes(t.id))?.id || "payments";

  const [stats, setStats] = useState({
    availableBalance: 8325,
    pendingBalance: 3660,
    lifetimeEarnings: 128450,
    nextPayoutDate: "2026-03-08",
    nextPayoutAmount: 8325,
    commissionRate: 10,
  });

  return (
    <div className="min-h-screen bg-gray-100">
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
              <h1 className="text-2xl font-bold text-gray-900">Finance Center</h1>
              <p className="text-sm text-gray-500">Track your earnings, payouts and financial statements</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Available Balance */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-orange-100 text-sm font-medium">Available Balance</span>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">💰</div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatPrice(stats.availableBalance)}</div>
            <div className="text-orange-100 text-sm">Next payout: {new Date(stats.nextPayoutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <button className="mt-4 w-full bg-white text-orange-600 font-semibold py-2 rounded-xl text-sm hover:bg-orange-50 transition">
              Withdraw Now
            </button>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Pending Release</span>
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-xl">⏳</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(stats.pendingBalance)}</div>
            <div className="text-sm text-gray-400">From delivered orders not yet released</div>
            <div className="mt-4 h-1.5 bg-gray-100 rounded-full">
              <div className="h-full bg-yellow-400 rounded-full" style={{ width: "30%" }} />
            </div>
          </div>

          {/* Lifetime */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Lifetime Earnings</span>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">📈</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(stats.lifetimeEarnings)}</div>
            <div className="text-sm text-green-600 font-medium">Commission rate: {stats.commissionRate}%</div>
            <div className="mt-3 text-xs text-gray-400">Total since account creation</div>
          </div>
        </div>

        {/* Payout Schedule Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">📅</div>
          <div className="flex-1">
            <p className="font-medium text-blue-900">Next Automatic Payout</p>
            <p className="text-sm text-blue-600">
              {formatPrice(stats.nextPayoutAmount)} will be transferred on <strong>{new Date(stats.nextPayoutDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Scheduled</span>
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
            {/* Payments Tab */}
            {activeTab === "payments" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Payout History</h3>
                {[
                  { date: "2026-02-26", amount: 4545, method: "Bank Transfer", ref: "PAY-20260226-001", status: "completed" },
                  { date: "2026-02-18", amount: 3015, method: "Bank Transfer", ref: "PAY-20260218-001", status: "completed" },
                  { date: "2026-02-08", amount: 5200, method: "Bank Transfer", ref: "PAY-20260208-001", status: "completed" },
                  { date: "2026-01-26", amount: 7800, method: "Bank Transfer", ref: "PAY-20260126-001", status: "completed" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.method}</p>
                        <p className="text-xs text-gray-500">{p.ref} · {new Date(p.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{formatPrice(p.amount)}</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">All Transactions</h3>
                  <button className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Date</th>
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Type</th>
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Order ID</th>
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Gross</th>
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Commission</th>
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Net</th>
                        <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mockTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 text-gray-600">{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                          <td className="py-3 font-medium text-gray-900">{t.type}</td>
                          <td className="py-3 font-mono text-xs text-gray-500">{t.orderId}</td>
                          <td className="py-3 text-right text-gray-700">{t.amount > 0 ? formatPrice(t.amount) : "—"}</td>
                          <td className="py-3 text-right text-red-600">{t.commission > 0 ? `-${formatPrice(t.commission)}` : "—"}</td>
                          <td className={`py-3 text-right font-semibold ${t.net < 0 ? "text-red-600" : "text-green-600"}`}>
                            {t.net < 0 ? `-${formatPrice(Math.abs(t.net))}` : `+${formatPrice(t.net)}`}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(t.status)}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Statements Tab */}
            {activeTab === "statements" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Monthly Statements</h3>
                {mockStatements.map((s, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-5 hover:shadow-sm transition">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{s.period}</h4>
                        <p className="text-sm text-gray-500">{s.totalOrders} orders processed</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.paid && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Paid Out</span>
                        )}
                        <button className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Gross Sales</p>
                        <p className="font-semibold text-gray-900">{formatPrice(s.grossSales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Commission (10%)</p>
                        <p className="font-semibold text-red-500">-{formatPrice(s.commission)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Net Earnings</p>
                        <p className="font-semibold text-green-600">{formatPrice(s.netEarnings)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
