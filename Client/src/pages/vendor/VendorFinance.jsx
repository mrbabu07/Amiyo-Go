import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import toast from "react-hot-toast";
import { 
  getVendorFinanceSummary, 
  getVendorFinanceTransactions, 
  getVendorPayouts 
} from "../../services/api";

const tabs = [
  { id: "overview", label: "💰 Overview", path: "/vendor/finance" },
  { id: "payouts", label: "📋 Payouts", path: "/vendor/finance/payouts" },
  { id: "transactions", label: "📊 Transactions", path: "/vendor/finance/transactions" },
];

const statusBadge = (status) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
};

export default function VendorFinance() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const location = useLocation();

  const activeTab = tabs.find((t) => location.pathname === t.path)?.id || "overview";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Fetch finance data
  const fetchFinanceData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch finance summary
      const summaryRes = await getVendorFinanceSummary();
      if (summaryRes.data.success) {
        setStats(summaryRes.data.data);
      }

      // Fetch transactions
      const txRes = await getVendorFinanceTransactions({ limit: 50 });
      if (txRes.data.success) {
        setTransactions(txRes.data.data || []);
      }

      // Fetch payouts
      const payoutsRes = await getVendorPayouts({ limit: 20 });
      if (payoutsRes.data.success) {
        setPayouts(payoutsRes.data.data || []);
      }

    } catch (error) {
      console.error("Failed to fetch finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

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
              <span className="text-orange-100 text-sm font-medium">Total Earnings</span>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">💰</div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatPrice(stats?.netEarnings || 0)}</div>
            <div className="text-orange-100 text-sm">After commission deduction</div>
          </div>

          {/* Gross Sales */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Gross Sales</span>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">📊</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(stats?.grossSales || 0)}</div>
            <div className="text-sm text-gray-400">Total sales before commission</div>
          </div>

          {/* Commission */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Total Commission</span>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl">📉</div>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-1">{formatPrice(stats?.totalCommission || 0)}</div>
            <div className="text-sm text-gray-400">{stats?.ordersCount || 0} orders processed</div>
          </div>
        </div>

        {/* Commission Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">ℹ️</div>
          <div className="flex-1">
            <p className="font-medium text-blue-900">Commission System</p>
            <p className="text-sm text-blue-600">
              Platform commission is calculated per category. Your earnings = Gross Sales - Commission. 
              Commission rates vary by product category.
            </p>
          </div>
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
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Gross Sales</p>
                    <p className="text-2xl font-bold text-green-900">{formatPrice(stats?.grossSales || 0)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700 mb-1">Commission</p>
                    <p className="text-2xl font-bold text-red-900">-{formatPrice(stats?.totalCommission || 0)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Net Earnings</p>
                    <p className="text-2xl font-bold text-blue-900">{formatPrice(stats?.netEarnings || 0)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">How Earnings Work</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>• <strong>Gross Sales:</strong> Total amount from all your delivered orders</p>
                    <p>• <strong>Commission:</strong> Platform fee based on product category (varies by category)</p>
                    <p>• <strong>Net Earnings:</strong> Your actual earnings after commission deduction</p>
                    <p>• <strong>Payouts:</strong> Processed by admin when orders are delivered</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === "payouts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Payout History</h3>
                  <span className="text-sm text-gray-500">{payouts.length} total payouts</span>
                </div>

                {payouts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">💰</div>
                    <p>No payouts yet</p>
                    <p className="text-sm mt-1">Payouts will appear here when admin processes them</p>
                  </div>
                ) : (
                  payouts.map((payout) => (
                    <div
                      key={payout._id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.status === 'paid' ? 'bg-green-100' :
                          payout.status === 'pending' ? 'bg-yellow-100' :
                          'bg-red-100'
                        }`}>
                          <span className="text-xl">
                            {payout.status === 'paid' ? '✅' :
                             payout.status === 'pending' ? '⏳' : '❌'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {payout.status === 'paid' ? 'Payout Received' :
                             payout.status === 'pending' ? 'Payout Pending' :
                             'Payout Cancelled'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payout.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            {payout.transactionId && ` · ${payout.transactionId}`}
                          </p>
                          {payout.note && (
                            <p className="text-xs text-gray-400 mt-1">{payout.note}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          payout.status === 'paid' ? 'text-green-600' :
                          payout.status === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {payout.status === 'cancelled' ? '-' : '+'}{formatPrice(payout.amount)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(payout.status)}`}>
                          {payout.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Order Transactions</h3>
                  <span className="text-sm text-gray-500">{transactions.length} transactions</span>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p>No transactions yet</p>
                    <p className="text-sm mt-1">Transactions will appear when orders are delivered</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-200">
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Date</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Order</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold">Product</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Qty</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Subtotal</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Commission</th>
                          <th className="pb-3 text-xs text-gray-500 uppercase font-semibold text-right">Your Earning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transactions.map((tx, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition">
                            <td className="py-3 text-gray-600">
                              {new Date(tx.orderDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3 font-mono text-xs text-gray-500">
                              {tx.orderId?.toString().slice(-8)}
                            </td>
                            <td className="py-3 text-gray-900 max-w-xs truncate">{tx.productName}</td>
                            <td className="py-3 text-right text-gray-700">{tx.quantity}</td>
                            <td className="py-3 text-right text-gray-700">
                              {formatPrice(tx.itemTotal)}
                            </td>
                            <td className="py-3 text-right text-red-600">
                              -{formatPrice(tx.commissionAmount || 0)}
                              {tx.commissionRate && (
                                <span className="text-xs text-gray-400 ml-1">
                                  ({tx.commissionRate}%)
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right font-semibold text-green-600">
                              +{formatPrice(tx.vendorEarning || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
