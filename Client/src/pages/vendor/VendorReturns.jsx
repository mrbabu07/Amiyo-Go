import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getVendorReturns, getVendorReturnStats } from '../../services/api';
import { useCurrency } from '../../hooks/useCurrency';

export default function VendorReturns() {
  const { formatPrice } = useCurrency();
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [statusFilter, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load returns
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const returnsRes = await getVendorReturns(params);
      setReturns(returnsRes.data.returns || []);
      setTotalPages(returnsRes.data.pages || 1);

      // Load stats
      const statsRes = await getVendorReturnStats();
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      refunded: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getReasonLabel = (reason) => {
    const labels = {
      defective: 'Defective Product',
      wrong_item: 'Wrong Item Received',
      not_as_described: 'Not as Described',
      damaged: 'Damaged in Shipping',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
            Product Returns
          </h1>
          <p className="text-gray-600 mt-2">Manage customer return requests and track deductions</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Total Returns</span>
                <span className="text-2xl">📦</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalReturns || 0}</div>
              <div className="text-sm text-gray-600 mt-1">All time</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Pending Review</span>
                <span className="text-2xl">⏳</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Awaiting admin</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Approved</span>
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.approved + stats.completed + stats.refunded || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Refunded to customers</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Total Deductions</span>
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{formatPrice(stats.approvedDeductions || 0)}</div>
              <div className="text-sm text-gray-600 mt-1">From your earnings</div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How Returns Affect Your Payouts:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>When a return is approved, the amount you earned from that item is deducted from your next payout</li>
                <li>The customer receives a full refund (including commission)</li>
                <li>You can view all deductions in your Finance page</li>
                <li>Returns are processed within 7-14 business days</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'processing', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading returns...</p>
            </div>
          ) : returns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Returns Found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'You have no return requests yet'
                  : `No ${statusFilter} returns found`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deduction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((returnItem) => (
                    <tr key={returnItem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{returnItem._id.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Order: #{returnItem.orderId.slice(-8)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {returnItem.productTitle}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty: {returnItem.quantity} × {formatPrice(returnItem.productPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {getReasonLabel(returnItem.reason)}
                        </div>
                        {returnItem.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {returnItem.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatPrice(returnItem.refundAmount || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Customer refund
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-red-600">
                          -{formatPrice(returnItem.vendorDeduction || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Your deduction
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(returnItem.status)}`}>
                          {returnItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(returnItem.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
