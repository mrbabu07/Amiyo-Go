import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Modal from "../../components/Modal";
import {
  approveManualPayment,
  getManualPaymentQueue,
  rejectManualPayment,
} from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

const METHOD_LABELS = {
  all: "All Methods",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  cod: "COD",
};

const STATUS_TONE = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  pending_verification: "border-amber-200 bg-amber-50 text-amber-700",
  manual_review: "border-primary-200 bg-primary-50 text-primary-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  payment_rejected: "border-red-200 bg-red-50 text-red-700",
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {String(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function Metric({ icon, label, value, tone = "text-slate-950" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {createElement(icon, { className: "h-4 w-4 text-slate-400" })}
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminPaymentVerifications() {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [method, setMethod] = useState("all");
  const [search, setSearch] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionForm, setActionForm] = useState({ note: "", reason: "" });

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [
        item.orderNumber,
        item.customerName,
        item.customerPhone,
        item.customerEmail,
        item.transactionId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [items, search]);

  const summary = useMemo(
    () => ({
      total: filteredItems.length,
      value: filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      duplicates: filteredItems.filter((item) => item.duplicate).length,
      risky: filteredItems.filter((item) => item.riskFlags?.length).length,
    }),
    [filteredItems],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getManualPaymentQueue({ status, method });
      setItems(response.data.data || []);
    } catch (error) {
      console.error("Failed to load manual payments:", error);
      toast.error(error.response?.data?.error || "Failed to load manual payments");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [method, status]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const openApprove = (item, duplicateWarning = false) => {
    setActionDialog({ type: "approve", item, duplicateWarning });
    setActionForm({ note: "", reason: "" });
  };

  const openReject = (item) => {
    setActionDialog({ type: "reject", item });
    setActionForm({ note: "", reason: "" });
  };

  const closeDialog = () => {
    setActionDialog(null);
    setActionForm({ note: "", reason: "" });
  };

  const confirmApprove = async (allowDuplicate = false) => {
    const item = actionDialog?.item;
    if (!item) return;
    setBusyOrderId(item.orderId);
    try {
      await approveManualPayment(item.orderId, {
        note: actionForm.note,
        allowDuplicate,
      });
      toast.success("Payment approved");
      closeDialog();
      await loadQueue();
    } catch (error) {
      if (error.response?.status === 409) {
        setActionDialog({ type: "approve", item, duplicateWarning: true });
        toast.error("Duplicate transaction found. Review before approving.");
        return;
      }
      toast.error(error.response?.data?.error || "Failed to approve payment");
    } finally {
      setBusyOrderId(null);
    }
  };

  const confirmReject = async () => {
    const item = actionDialog?.item;
    if (!item) return;
    if (!actionForm.reason.trim()) {
      toast.error("Add a rejection reason");
      return;
    }
    setBusyOrderId(item.orderId);
    try {
      await rejectManualPayment(item.orderId, { reason: actionForm.reason });
      toast.success("Payment rejected");
      closeDialog();
      await loadQueue();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reject payment");
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
              Manual Payment Verification
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review submitted bKash, Nagad, Rocket, and collected COD payments before releasing orders.
            </p>
          </div>
          <button
            type="button"
            onClick={loadQueue}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Clock3} label="Visible Reviews" value={summary.total} />
          <Metric icon={WalletCards} label="Payment Value" value={formatPrice(summary.value)} />
          <Metric icon={AlertTriangle} label="Duplicate TXNs" value={summary.duplicates} tone="text-red-700" />
          <Metric icon={ShieldCheck} label="Risk Flags" value={summary.risky} tone="text-primary-700" />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Search order, customer, phone, transaction"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">All Methods</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="cod">Collected COD</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  {["Order", "Customer", "Method", "Transaction", "Amount", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Loading payment reviews...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No manual payments match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.orderId} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">
                        #{item.orderNumber}
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {formatDate(item.paymentSubmittedAt || item.createdAt)}
                        </div>
                        {item.isGuest && (
                          <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            Guest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{item.customerName}</div>
                        <div className="text-xs text-slate-400">{item.customerPhone || item.customerEmail || "No contact"}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {METHOD_LABELS[item.paymentMethod] || item.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="font-mono text-xs">{item.transactionId || "COD collection"}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.duplicate && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Duplicate x{item.duplicateCount}
                            </span>
                          )}
                          {(item.riskFlags || []).map((flag) => (
                            <span key={flag} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                              {flag.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-950 dark:text-white">
                        {formatPrice(item.amount || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.paymentStatus} />
                        {item.reviewNote && (
                          <div className="mt-2 max-w-44 text-xs text-slate-500">
                            {item.reviewNote}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {status === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyOrderId === item.orderId}
                              onClick={() => openApprove(item)}
                              className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyOrderId === item.orderId}
                              onClick={() => openReject(item)}
                              className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:bg-slate-950"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Reviewed {formatDate(item.reviewedAt)}
                          </span>
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

      <Modal
        isOpen={Boolean(actionDialog)}
        onClose={closeDialog}
        title={actionDialog?.type === "reject" ? "Reject Payment" : "Approve Payment"}
        size="default"
      >
        {actionDialog?.item && (
          <div className="space-y-4 p-6">
            <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">#{actionDialog.item.orderNumber}</p>
                  <p className="text-slate-500">{METHOD_LABELS[actionDialog.item.paymentMethod] || actionDialog.item.paymentMethod}</p>
                </div>
                <p className="text-lg font-bold text-slate-950 dark:text-white">
                  {formatPrice(actionDialog.item.amount || 0)}
                </p>
              </div>
              <p className="mt-3 font-mono text-xs text-slate-500">
                Transaction: {actionDialog.item.transactionId || "COD collection"}
              </p>
            </div>

            {actionDialog.duplicateWarning && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                This transaction ID appears on another order. Approve only if you verified the reference manually.
              </div>
            )}

            {actionDialog.type === "reject" ? (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Rejection reason</span>
                <textarea
                  value={actionForm.reason}
                  onChange={(event) => setActionForm((current) => ({ ...current, reason: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Example: Transaction ID not found in statement"
                />
              </label>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Reviewer note</span>
                <textarea
                  value={actionForm.note}
                  onChange={(event) => setActionForm((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Optional note for audit trail"
                />
              </label>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              {actionDialog.type === "reject" ? (
                <button
                  type="button"
                  disabled={busyOrderId === actionDialog.item.orderId}
                  onClick={confirmReject}
                  className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Reject Payment
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyOrderId === actionDialog.item.orderId}
                  onClick={() => confirmApprove(Boolean(actionDialog.duplicateWarning))}
                  className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {actionDialog.duplicateWarning ? "Approve Duplicate" : "Approve Payment"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
