import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getPayoutRequests, cancelPayoutRequest } from '../../services/api';
import { useCurrency } from '../../hooks/useCurrency';

export default function PayoutRequestsList({ refreshTrigger }) {
  const { formatPrice } = useCurrency();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [refreshTrigger]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getPayoutRequests();
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

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this payout request?')) {
      return;
    }

    try {
      await cancelPayoutRequest(id);
      toast.success('Payout request cancelled');
      loadRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel request');
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payout Requests</h3>
        <p className="text-gray-600">You haven't submitted any payout requests yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Your Payout Requests</h3>
        <p className="text-sm text-gray-600 mt-1">Track the status of your payout requests</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request ID
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPrice(request.amount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">
                    {request.payoutMethod || 'Bank'}
                  </div>
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
                    <button
                      onClick={() => handleCancel(request._id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Cancel
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
    </div>
  );
}
