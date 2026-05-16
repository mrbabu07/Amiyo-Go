import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import {
  approveManualPayment,
  getManualPaymentQueue,
  rejectManualPayment,
} from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

export default function AdminPaymentVerifications() {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [method, setMethod] = useState("all");
  const [busyOrderId, setBusyOrderId] = useState(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await getManualPaymentQueue({ status, method });
      setItems(response.data.data || []);
    } catch (error) {
      console.error("Failed to load manual payments:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [status, method]);

  const handleApprove = async (item, allowDuplicate = false) => {
    setBusyOrderId(item.orderId);
    try {
      await approveManualPayment(item.orderId, { allowDuplicate });
      await loadQueue();
    } catch (error) {
      if (error.response?.status === 409) {
        const confirmed = window.confirm(
          "This transaction ID appears on another order. Approve anyway?",
        );
        if (confirmed) {
          await handleApprove(item, true);
        }
        return;
      }
      alert(error.response?.data?.error || "Failed to approve payment");
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleReject = async (item) => {
    const reason = window.prompt("Reason for rejecting this payment?");
    if (reason === null) return;

    setBusyOrderId(item.orderId);
    try {
      await rejectManualPayment(item.orderId, { reason });
      await loadQueue();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to reject payment");
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manual Payment Verification
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reconcile bKash, Nagad, and COD orders without external gateway APIs.
          </p>
        </div>
        <button
          onClick={loadQueue}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Methods</option>
          <option value="bkash">bKash</option>
          <option value="nagad">Nagad</option>
          <option value="cod">COD</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {["Order", "Customer", "Method", "Transaction", "Amount", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.orderId} className="align-top">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      #{item.orderNumber}
                      {item.isGuest && (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          Guest
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      <div>{item.customerName}</div>
                      <div className="text-xs text-gray-400">{item.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold uppercase text-gray-700 dark:text-gray-200">
                      {item.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      <div>{item.transactionId || "COD collection"}</div>
                      {item.duplicate && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Duplicate x{item.duplicateCount}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {formatPrice(item.amount || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {status === "pending" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={busyOrderId === item.orderId}
                            onClick={() => handleApprove(item)}
                            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            disabled={busyOrderId === item.orderId}
                            onClick={() => handleReject(item)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
