import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { cancelPayoutRequest, getPayoutRequests } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

export default function PayoutRequestsList({ refreshTrigger, canManage = true }) {
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
      console.error("Error loading requests:", error);
      toast.error("Failed to load payout requests");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!canManage) {
      toast.error("Your staff access does not allow payout changes");
      return;
    }

    if (!confirm("Are you sure you want to cancel this payout request?")) {
      return;
    }

    try {
      await cancelPayoutRequest(id);
      toast.success("Payout request cancelled");
      loadRequests();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error(error.response?.data?.error || "Failed to cancel request");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">No Payout Requests</h3>
        <p className="text-gray-600">You haven't submitted any payout requests yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Payout Requests</h3>
        <p className="mt-1 text-sm text-gray-600">Track the status of your payout requests</p>
      </div>

      <div className="divide-y divide-gray-200 md:hidden">
        {requests.map((request) => (
          <article key={request._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">#{request._id.slice(-8)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Requested {new Date(request.requestedAt || request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(request.status)}`}>
                {request.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Amount</p>
                <p className="mt-1 font-bold text-gray-900">{formatPrice(request.amount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Method</p>
                <p className="mt-1 font-bold capitalize text-gray-900">{request.payoutMethod || "Bank"}</p>
              </div>
            </div>

            {request.status === "rejected" && request.rejectionReason && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {request.rejectionReason}
              </p>
            )}

            {request.status === "pending" && (
              <button
                type="button"
                onClick={() => handleCancel(request._id)}
                disabled={!canManage}
                className="mt-4 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
              >
                Cancel request
              </button>
            )}

            {request.status === "paid" && request.paidAt && (
              <div className="mt-3 text-xs font-semibold text-green-600">
                Paid: {new Date(request.paidAt).toLocaleDateString()}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Request ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Requested
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {requests.map((request) => (
              <tr key={request._id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">#{request._id.slice(-8)}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-semibold text-gray-900">{formatPrice(request.amount)}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm capitalize text-gray-900">{request.payoutMethod || "Bank"}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getStatusBadge(request.status)}`}>
                    {request.status}
                  </span>
                  {request.status === "rejected" && request.rejectionReason && (
                    <div className="mt-1 max-w-xs text-xs text-red-600">{request.rejectionReason}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(request.requestedAt || request.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {request.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(request._id)}
                      disabled={!canManage}
                      className="font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      Cancel
                    </button>
                  )}
                  {request.status === "paid" && request.paidAt && (
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
