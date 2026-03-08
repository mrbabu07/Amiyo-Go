import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getAdminPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  markPayoutRequestPaid,
} from '../../services/api';
import Modal from '../../components/Modal';

export default function AdminPayoutRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approve', 'reject', 'mark-paid'
  const [formData, setFormData] = useState({
    note: '',
    reason: '',
    transactionId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getAdminPayoutRequests({ status: statusFilter });
      if (res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request, action) => {
    setSelectedRequest(request);
    setModalAction(action);
    setFormData({ note: '', reason: '', transactionId: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalAction === 'reject' && !formData.reason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setSubmitting(true);

      if (modalAction === 'approve') {
        await approvePayoutRequest(selectedRequest._id, { note: formData.note });
        toast.success('Payout request approved');
      } else if (modalAction === 'reject') {
        await rejectPayoutRequest(selectedRequest._id, { reason: formData.reason });
        toast.success('Payout request rejected');
      } else if (modalAction === 'mark-paid') {
        await markPayoutRequestPaid(selectedRequest._id, {
          transactionId: formData.transactionId,
          note: formData.note,
        });
        toast.success('Payout marked as paid');
      }

      setShowModal(false);
      loadRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error(error.response?.data?.error || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
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
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/admin/payouts"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Vendor Payout Requests
              </h1>
              <p className="text-gray-600 mt-1">Review and approve vendor-initiated payout requests</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Vendor-Initiated Payout Requests
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Vendors can request payouts when they have sufficient balance. Review each request, verify vendor details, 
                  and approve or reject based on available balance and vendor standing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {['pending', 'approved', 'paid', 'rejected', 'cancelled', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No payout requests have been submitted yet'
                  : `No ${statusFilter} requests found`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{request._id.slice(-8)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            to={`/admin/vendors/${request.vendorId}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {request.vendorName || 'Unknown Vendor'}
                          </Link>
                          <div className="text-xs text-gray-500">{request.vendorEmail}</div>
                          <div className="text-xs text-gray-500">{request.vendorPhone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ৳{request.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {request.payoutMethod || 'Bank'}
                        </div>
                        {request.bankAccountNumber && (
                          <div className="text-xs text-gray-500 font-mono">
                            {request.bankAccountNumber}
                          </div>
                        )}
                        {request.mobileBankingNumber && (
                          <div className="text-xs text-gray-500 font-mono">
                            {request.mobileBankingNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                        {request.status === 'rejected' && request.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs">
                            {request.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.requestedAt || request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(request, 'approve')}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openModal(request, 'reject')}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {request.status === 'approved' && (
                          <button
                            onClick={() => openModal(request, 'mark-paid')}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        {request.status === 'paid' && request.paidAt && (
                          <div className="text-xs text-green-600">
                            Paid: {new Date(request.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalAction === 'approve' ? 'Approve Payout Request' :
          modalAction === 'reject' ? 'Reject Payout Request' :
          'Mark Payout as Paid'
        }
      >
        {selectedRequest && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Request Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-medium">{selectedRequest.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-orange-600">৳{selectedRequest.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium capitalize">{selectedRequest.payoutMethod || 'Bank'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{selectedRequest.vendorPhone || 'N/A'}</span>
                </div>
                {selectedRequest.note && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-600">Vendor Note:</span>
                    <p className="mt-1 text-gray-900">{selectedRequest.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bank/Payment Details - Prominent Display */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h4 className="font-bold text-blue-900">Payment Information</h4>
              </div>
              
              {selectedRequest.payoutMethod === 'bank' || !selectedRequest.payoutMethod ? (
                <div className="space-y-3">
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Bank Name</div>
                    <div className="font-semibold text-gray-900">{selectedRequest.bankName || 'Not provided'}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Account Name</div>
                    <div className="font-semibold text-gray-900">{selectedRequest.bankAccountName || 'Not provided'}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Account Number</div>
                    <div className="font-bold text-lg text-blue-600 font-mono tracking-wider">
                      {selectedRequest.bankAccountNumber || 'Not provided'}
                    </div>
                    {selectedRequest.bankAccountNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedRequest.bankAccountNumber);
                          toast.success('Account number copied!');
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Account Number
                      </button>
                    )}
                  </div>
                  {selectedRequest.bankBranch && (
                    <div className="bg-white rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">Branch</div>
                      <div className="font-medium text-gray-900">{selectedRequest.bankBranch}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Mobile Banking Provider</div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {selectedRequest.mobileBankingProvider || selectedRequest.payoutMethod}
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Mobile Number</div>
                    <div className="font-bold text-lg text-blue-600 font-mono tracking-wider">
                      {selectedRequest.mobileBankingNumber || 'Not provided'}
                    </div>
                    {selectedRequest.mobileBankingNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedRequest.mobileBankingNumber);
                          toast.success('Mobile number copied!');
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Mobile Number
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            {modalAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason * <span className="text-red-500">Required</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows="3"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Explain why this request is being rejected..."
                />
              </div>
            )}

            {modalAction === 'mark-paid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Enter transaction/reference ID"
                />
              </div>
            )}

            {(modalAction === 'approve' || modalAction === 'mark-paid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Note (Optional)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Add any additional notes..."
                />
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (modalAction === 'reject' && !formData.reason)}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  modalAction === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                  modalAction === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {submitting ? 'Processing...' : 
                 modalAction === 'approve' ? 'Approve Request' :
                 modalAction === 'reject' ? 'Reject Request' :
                 'Mark as Paid'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
