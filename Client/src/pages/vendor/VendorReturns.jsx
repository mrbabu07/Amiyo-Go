import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getVendorReturns, getVendorReturnStats, vendorRespondToReturn } from '../../services/api';
import { useCurrency } from '../../hooks/useCurrency';
import Modal from '../../components/Modal';

export default function VendorReturns() {
  const { formatPrice } = useCurrency();
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Response modal state
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [responseAction, setResponseAction] = useState('approved');
  const [responseNotes, setResponseNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [evidencePreview, setEvidencePreview] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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

  const openResponseModal = (returnItem) => {
    setSelectedReturn(returnItem);
    setResponseAction('approved');
    setResponseNotes('');
    setDisputeReason('');
    setEvidenceImages([]);
    setEvidencePreview([]);
    setShowResponseModal(true);
  };

  const handleEvidenceUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + evidenceImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setEvidencePreview([...evidencePreview, ...newPreviews]);
    setEvidenceImages([...evidenceImages, ...files]);
  };

  const removeEvidence = (index) => {
    setEvidenceImages(evidenceImages.filter((_, i) => i !== index));
    setEvidencePreview(evidencePreview.filter((_, i) => i !== index));
  };

  const handleSubmitResponse = async () => {
    if (responseAction === 'disputed' && !disputeReason) {
      toast.error('Please provide a reason for disputing this return');
      return;
    }

    setSubmitting(true);
    try {
      // Upload evidence images if any
      let uploadedUrls = [];
      if (evidenceImages.length > 0) {
        const formData = new FormData();
        evidenceImages.forEach(file => {
          formData.append('images', file);
        });

        // You'll need to implement image upload endpoint
        // For now, we'll use placeholder URLs
        uploadedUrls = evidenceImages.map((_, i) => `evidence_${Date.now()}_${i}.jpg`);
      }

      await vendorRespondToReturn(selectedReturn._id, {
        action: responseAction,
        notes: responseNotes || null,
        evidenceImages: uploadedUrls,
        disputeReason: responseAction === 'disputed' ? disputeReason : null,
      });

      toast.success(
        responseAction === 'approved' 
          ? 'Return approved successfully' 
          : 'Return disputed. Admin will review your evidence.'
      );

      setShowResponseModal(false);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error responding to return:', error);
      toast.error(error.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                        {returnItem.vendorResponse && (
                          <div className="mt-1">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              returnItem.vendorResponse === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {returnItem.vendorResponse === 'approved' ? '✓ You Approved' : '⚠ You Disputed'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(returnItem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {returnItem.status === 'pending' && !returnItem.vendorResponse ? (
                          <button
                            onClick={() => openResponseModal(returnItem)}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium"
                          >
                            Respond
                          </button>
                        ) : returnItem.vendorResponse ? (
                          <span className="text-gray-400 text-xs">Responded</span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
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

        {/* Response Modal */}
        <Modal
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          title={`Respond to Return #${selectedReturn?._id.slice(-8)}`}
        >
          {selectedReturn && (
            <div className="space-y-6">
              {/* Return Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Return Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">{selectedReturn.productTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedReturn.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reason:</span>
                    <span className="font-medium">{getReasonLabel(selectedReturn.reason)}</span>
                  </div>
                  {selectedReturn.description && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-600">Description:</span>
                      <p className="mt-1 text-gray-900">{selectedReturn.description}</p>
                    </div>
                  )}
                  {selectedReturn.images && selectedReturn.images.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-600 block mb-2">Customer Evidence:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedReturn.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(img, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Response *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setResponseAction('approved')}
                    className={`p-4 border-2 rounded-lg transition ${
                      responseAction === 'approved'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">✓</div>
                    <div className="font-medium text-gray-900">Approve Return</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Accept the return and refund customer
                    </div>
                  </button>
                  <button
                    onClick={() => setResponseAction('disputed')}
                    className={`p-4 border-2 rounded-lg transition ${
                      responseAction === 'disputed'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">⚠</div>
                    <div className="font-medium text-gray-900">Dispute Return</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Provide evidence for admin review
                    </div>
                  </button>
                </div>
              </div>

              {/* Dispute Reason (only if disputed) */}
              {responseAction === 'disputed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispute Reason * <span className="text-red-500">Required</span>
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="Explain why you're disputing this return..."
                    required
                  />
                </div>
              )}

              {/* Response Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Add any additional information..."
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Evidence (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEvidenceUpload}
                    className="hidden"
                    id="evidence-upload"
                  />
                  <label
                    htmlFor="evidence-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-600">Click to upload photos/documents</span>
                    <span className="text-xs text-gray-500 mt-1">Max 5 images</span>
                  </label>
                </div>

                {/* Evidence Preview */}
                {evidencePreview.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {evidencePreview.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          onClick={() => removeEvidence(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={submitting || (responseAction === 'disputed' && !disputeReason)}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
