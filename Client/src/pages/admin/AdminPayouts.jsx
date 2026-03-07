import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  getAllPayouts, 
  getPayoutStats, 
  markPayoutPaid, 
  cancelPayout,
  getWeeklyPayoutList,
  createBulkPayouts 
} from '../../services/api';

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

export default function AdminPayouts() {
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'weekly'
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  
  // Weekly payout state
  const [weeklyData, setWeeklyData] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [processingBulk, setProcessingBulk] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadData();
    } else if (activeTab === 'weekly') {
      loadWeeklyData();
    }
  }, [statusFilter, page, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;

      const [payoutsRes, statsRes] = await Promise.all([
        getAllPayouts(params),
        getPayoutStats(),
      ]);

      setPayouts(payoutsRes.data.payouts || []);
      setTotal(payoutsRes.data.total || 0);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      const res = await getWeeklyPayoutList();
      setWeeklyData(res.data.data);
      setSelectedVendors([]);
    } catch (error) {
      console.error('Failed to load weekly payout list:', error);
      toast.error('Failed to load weekly payout list');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = (vendorId) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedVendors.length === weeklyData?.vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(weeklyData?.vendors.map(v => v.vendorId) || []);
    }
  };

  const handleCreateBulkPayouts = async () => {
    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor');
      return;
    }

    if (!confirm(`Create payouts for ${selectedVendors.length} vendor(s)?`)) {
      return;
    }

    setProcessingBulk(true);
    try {
      const payoutsToCreate = weeklyData.vendors
        .filter(v => selectedVendors.includes(v.vendorId))
        .map(v => ({
          vendorId: v.vendorId,
          amount: v.eligibleAmount,
          note: `Weekly payout for ${new Date(weeklyData.periodStart).toLocaleDateString()} - ${new Date(weeklyData.periodEnd).toLocaleDateString()}`,
        }));

      const res = await createBulkPayouts({
        payouts: payoutsToCreate,
        periodStart: weeklyData.periodStart,
        periodEnd: weeklyData.periodEnd,
      });

      toast.success(`Created ${res.data.data.created} payout(s) successfully`);
      
      if (res.data.data.failed > 0) {
        toast.error(`${res.data.data.failed} payout(s) failed`);
      }

      // Reload weekly data
      loadWeeklyData();
    } catch (error) {
      console.error('Failed to create bulk payouts:', error);
      toast.error('Failed to create bulk payouts');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!showPaymentModal) return;
    try {
      await markPayoutPaid(showPaymentModal, {
        transactionId,
        note: paymentNote,
      });
      toast.success('Payout marked as paid');
      setShowPaymentModal(null);
      setTransactionId('');
      setPaymentNote('');
      loadData();
    } catch {
      toast.error('Failed to mark payout as paid');
    }
  };

  const handleCancelPayout = async (payoutId) => {
    if (!confirm('Cancel this payout?')) return;
    try {
      await cancelPayout(payoutId, 'Cancelled by admin');
      toast.success('Payout cancelled');
      loadData();
    } catch {
      toast.error('Failed to cancel payout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payouts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vendor payments and payout history</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Payout History
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'weekly'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Weekly Payout (7 Days)
          </button>
        </div>

        {/* Stats Cards */}
        {activeTab === 'history' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">৳{stats.totalPaid?.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.paidCount} payouts</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">৳{stats.totalPending?.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.pendingCount} payouts</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-red-500">৳{stats.totalCancelled?.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.cancelledCount} payouts</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Total Payouts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPayouts}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </div>
          </div>
        )}

        {/* Weekly Payout Tab */}
        {activeTab === 'weekly' && (
          <>
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                Loading weekly payout data...
              </div>
            ) : weeklyData ? (
              <>
                {/* Period Info */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">7-Day Payout Period</h3>
                      <p className="text-blue-100 text-sm">
                        {new Date(weeklyData.periodStart).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} - {new Date(weeklyData.periodEnd).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">৳{weeklyData.totalEligibleAmount.toLocaleString()}</p>
                      <p className="text-blue-100 text-sm">{weeklyData.totalVendors} vendors eligible</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {weeklyData.vendors.length > 0 && (
                  <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedVendors.length === weeklyData.vendors.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Select All ({selectedVendors.length} selected)
                        </span>
                      </label>
                    </div>
                    <button
                      onClick={handleCreateBulkPayouts}
                      disabled={selectedVendors.length === 0 || processingBulk}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {processingBulk ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          💰 Create Payouts ({selectedVendors.length})
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Vendors List */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {weeklyData.vendors.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="font-medium">No vendors eligible for payout</p>
                      <p className="text-sm mt-1">All vendors have been paid or have no delivered orders in the last 7 days</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedVendors.length === weeklyData.vendors.length}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </th>
                            <th className="px-4 py-3 text-left">Vendor</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                            <th className="px-4 py-3 text-right">Items</th>
                            <th className="px-4 py-3 text-right">Total Earnings</th>
                            <th className="px-4 py-3 text-right">Already Paid</th>
                            <th className="px-4 py-3 text-right">Eligible Amount</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {weeklyData.vendors.map((vendor) => (
                            <tr 
                              key={vendor.vendorId} 
                              className={`hover:bg-gray-50 ${selectedVendors.includes(vendor.vendorId) ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedVendors.includes(vendor.vendorId)}
                                  onChange={() => handleSelectVendor(vendor.vendorId)}
                                  disabled={vendor.hasPendingPayout}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  to={`/admin/vendors/${vendor.vendorId}`}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  {vendor.vendorName}
                                </Link>
                                {vendor.vendorPhone && (
                                  <div className="text-xs text-gray-500">{vendor.vendorPhone}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {vendor.ordersCount}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {vendor.itemsCount}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                ৳{vendor.totalEarnings.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-red-600">
                                {vendor.alreadyPaidOrPending > 0 ? `-৳${vendor.alreadyPaidOrPending.toLocaleString()}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">
                                ৳{vendor.eligibleAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {vendor.hasPendingPayout ? (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    Ready
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-semibold">
                          <tr>
                            <td colSpan="4" className="px-4 py-3 text-right">Total:</td>
                            <td className="px-4 py-3 text-right text-gray-900">
                              ৳{weeklyData.vendors.reduce((sum, v) => sum + v.totalEarnings, 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              -৳{weeklyData.vendors.reduce((sum, v) => sum + v.alreadyPaidOrPending, 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600">
                              ৳{weeklyData.totalEligibleAmount.toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                No data available
              </div>
            )}
          </>
        )}

        {/* Filters */}
        {activeTab === 'history' && (
        <div className="flex gap-2">
          {['all', 'pending', 'paid', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-500 self-center">{total} total</span>
        </div>
        )}

        {/* Payouts Table */}
        {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading payouts...</div>
          ) : payouts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No payouts found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vendor</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Note</th>
                    <th className="px-4 py-3 text-left">Transaction ID</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payouts.map((payout) => (
                    <tr key={payout._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/vendors/${payout.vendorId}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {payout.vendorName || 'Unknown'}
                        </Link>
                        {payout.vendorPhone && (
                          <div className="text-xs text-gray-500">{payout.vendorPhone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ৳{payout.amount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payout.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {payout.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {payout.transactionId || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {payout.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setShowPaymentModal(payout._id)}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleCancelPayout(payout._id)}
                                className="text-red-500 hover:text-red-700 font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {payout.status === 'paid' && payout.paidAt && (
                            <span className="text-xs text-gray-500">
                              Paid {new Date(payout.paidAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="px-4 py-3 border-t flex justify-between items-center text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
        )}

      </div>

      {/* Mark Paid Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Mark Payout as Paid</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN123456789"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note (optional)</label>
                <textarea
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Paid via bank transfer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleMarkPaid}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700"
              >
                Confirm Payment
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(null);
                  setTransactionId('');
                  setPaymentNote('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
