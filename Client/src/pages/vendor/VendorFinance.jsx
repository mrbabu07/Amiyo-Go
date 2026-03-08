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
import PayoutRequestButton from "../../components/vendor/PayoutRequestButton";
import PayoutRequestsList from "../../components/vendor/PayoutRequestsList";

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch finance data
  const fetchFinanceData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch finance summary
      const summaryRes = await getVendorFinanceSummary();
      console.log('📊 Finance Summary Response:', summaryRes.data);
      if (summaryRes.data.success) {
        console.log('💰 Setting stats:', summaryRes.data.data);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Available Balance */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-orange-100 text-sm font-medium">Available Balance</span>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">💰</div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatPrice(stats?.pendingBalance || 0)}</div>
            <div className="text-orange-100 text-sm">Ready for payout request</div>
          </div>

          {/* Paid Balance */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-green-100 text-sm font-medium">Paid Balance</span>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">✅</div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatPrice(stats?.paidBalance || 0)}</div>
            <div className="text-green-100 text-sm">Already received</div>
          </div>

          {/* Gross Sales */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Gross Sales</span>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">�</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(stats?.grossSales || 0)}</div>
            <div className="text-sm text-gray-400">Before commission</div>
          </div>

          {/* Commission */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Total Commission</span>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl">📉</div>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-1">-{formatPrice(stats?.totalCommission || 0)}</div>
            <div className="text-sm text-gray-400">Platform fee</div>
          </div>
        </div>

        {/* Return Deductions Alert */}
        {stats?.returnDeductions && stats.returnDeductions > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Return Deductions Applied
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    {stats.returnCount || 0} approved return(s) have been deducted from your earnings.
                    Total deduction: <strong>{formatPrice(stats.returnDeductions)}</strong>
                  </p>
                </div>
                <div className="mt-4">
                  <Link to="/vendor/returns" className="text-sm font-medium text-yellow-800 hover:text-yellow-600 underline">
                    View Returns →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payout Schedule Info & Request Button */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">📅</span>
              Payout Schedule
            </h3>
            <PayoutRequestButton onRequestSuccess={() => {
              fetchFinanceData();
              setRefreshTrigger(prev => prev + 1);
            }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Weekly Payouts</p>
                <p className="text-sm text-gray-600">Processed every Monday for delivered orders from previous week</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Next Payout</p>
                <p className="text-sm text-gray-600">
                  {(() => {
                    const today = new Date();
                    const nextMonday = new Date(today);
                    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
                    return nextMonday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  })()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Minimum Payout</p>
                <p className="text-sm text-gray-600">
                  {formatPrice(100)} (you have {formatPrice(stats?.pendingBalance || 0)})
                  {stats?.pendingBalance >= 100 ? (
                    <span className="text-green-600 font-medium ml-1">✓ Eligible</span>
                  ) : (
                    <span className="text-gray-400 ml-1">Not yet</span>
                  )}
                </p>
              </div>
            </div>
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
                {/* Earnings Breakdown */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">💵</span>
                    Earnings Breakdown
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gross Sales (All Orders)</span>
                      <span className="text-xl font-bold text-gray-900">{formatPrice(stats?.grossSales || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Platform Commission</span>
                      <span className="text-xl font-bold text-red-600">-{formatPrice(stats?.totalCommission || 0)}</span>
                    </div>
                    <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
                      <span className="text-green-700 font-semibold">Net Earnings</span>
                      <span className="text-2xl font-bold text-green-700">{formatPrice(stats?.netEarnings || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Balance Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 border border-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">⏳</span>
                      <p className="text-sm text-orange-700 font-medium">Available Balance</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-900">{formatPrice(stats?.pendingBalance || 0)}</p>
                    <p className="text-xs text-orange-600 mt-1">Available for payout request</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🕐</span>
                      <p className="text-sm text-blue-700 font-medium">Pending Payouts</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{formatPrice(stats?.pendingPayouts || 0)}</p>
                    <p className="text-xs text-blue-600 mt-1">Requested, awaiting admin approval</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">✅</span>
                      <p className="text-sm text-green-700 font-medium">Paid Balance</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{formatPrice(stats?.paidBalance || 0)}</p>
                    <p className="text-xs text-green-600 mt-1">Total amount received via payouts</p>
                  </div>
                </div>

                {/* Bank Settings Card */}
                <Link 
                  to="/vendor/settings/bank"
                  className="block bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Payment Settings</h3>
                        <p className="text-blue-100 text-sm">Set up your bank account or mobile banking for payouts</p>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">ℹ️</span>
                    How Earnings Work
                  </h4>
                  <div className="space-y-3 text-sm text-blue-800">
                    <p>• <strong>Gross Sales:</strong> Total amount from all your delivered orders (what customers paid)</p>
                    <p>• <strong>Commission:</strong> Platform fee based on product category - deducted automatically</p>
                    <p>• <strong>Net Earnings:</strong> Your actual earnings after commission (Gross Sales - Commission)</p>
                    <p>• <strong>Available Balance:</strong> Net earnings from delivered orders, ready for payout request</p>
                    <p>• <strong>Pending Payouts:</strong> Amount you've requested but admin hasn't paid yet</p>
                    <p>• <strong>Paid Balance:</strong> Amount already transferred to you by admin</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === "payouts" && (
              <div className="space-y-6">
                {/* Payout Requests Section */}
                <PayoutRequestsList refreshTrigger={refreshTrigger} />

                {/* Payout History Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Payout History</h3>
                    <span className="text-sm text-gray-500">{payouts.length} total payouts</span>
                  </div>

                  {payouts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                      <div className="text-4xl mb-2">💰</div>
                      <p>No payouts yet</p>
                      <p className="text-sm mt-1">Payouts will appear here when admin processes them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {payouts.map((payout) => (
                        <div
                          key={payout._id}
                          className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition bg-white"
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
                      ))}
                    </div>
                  )}
                </div>
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
