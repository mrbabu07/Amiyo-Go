import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Modal from "../../components/Modal";
import { useCurrency } from "../../hooks/useCurrency";
import {
  confirmAdminCodPayment,
  getAdminCodReconciliation,
  markAdminCodOrderDelivered,
} from "../../services/api";

const FILTERS = [
  { value: "all", label: "All COD" },
  { value: "waiting", label: "Ready to confirm" },
  { value: "delivery", label: "Waiting delivery" },
  { value: "confirmed", label: "Confirmed" },
  { value: "discrepancy", label: "Discrepancy" },
  { value: "remitted", label: "Remitted" },
];

const STATUS_STYLES = {
  pending_dispatch: "border-slate-200 bg-slate-50 text-slate-600",
  dispatched: "border-blue-200 bg-blue-50 text-blue-700",
  delivered: "border-indigo-200 bg-indigo-50 text-indigo-700",
  awaiting_confirmation: "border-amber-200 bg-amber-50 text-amber-700",
  collected: "border-amber-200 bg-amber-50 text-amber-700",
  remitted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  discrepancy: "border-red-200 bg-red-50 text-red-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
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

const formatStatus = (value) =>
  String(value || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const shortId = (value = "") => String(value).slice(-8).toUpperCase();

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {formatStatus(status)}
    </span>
  );
}

function Metric({ icon: Icon, label, value, helper, tone = "text-slate-950" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function AdminCodDelivery() {
  const { formatPrice } = useCurrency();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("waiting");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [dialogRow, setDialogRow] = useState(null);
  const [delivering, setDelivering] = useState(false);
  const [deliveryRow, setDeliveryRow] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    courierName: "",
    note: "",
  });
  const [confirmForm, setConfirmForm] = useState({
    collectedAmount: "",
    reference: "",
    courierName: "",
    note: "",
  });

  const loadCodDelivery = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminCodReconciliation({ limit: 1000 });
      const payload = response.data?.data || {};
      setRows(payload.orders || []);
      setSummary(payload.summary || {});
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load COD delivery data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCodDelivery();
  }, [loadCodDelivery]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (filter === "waiting") return row.awaitingConfirmation;
        if (filter === "delivery") return row.waitingDelivery;
        if (filter === "confirmed") return row.paymentConfirmed || row.paymentStatus === "paid";
        if (filter === "discrepancy") return row.hasDiscrepancy || row.reconciliationStatus === "discrepancy";
        if (filter === "remitted") return row.remitted || row.reconciliationStatus === "remitted";
        return true;
      })
      .filter((row) => {
        if (!normalizedSearch) return true;
        return [
          row.orderId,
          shortId(row.orderId),
          row.customerName,
          row.customerPhone,
          row.deliveryZone,
          row.courierName,
          ...(row.vendorNames || []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      });
  }, [filter, rows, search]);

  const openConfirmDialog = (row) => {
    setDialogRow(row);
    setConfirmForm({
      collectedAmount: String(row.total || ""),
      reference: row.codPaymentReference || "",
      courierName: row.courierName || "",
      note: "",
    });
  };

  const openDeliveryDialog = (row) => {
    setDeliveryRow(row);
    setDeliveryForm({
      courierName: row.courierName || "",
      note: "",
    });
  };

  const submitDelivery = async (event) => {
    event.preventDefault();
    if (!deliveryRow) return;
    setDelivering(true);
    try {
      await markAdminCodOrderDelivered(deliveryRow.orderId, {
        courierName: deliveryForm.courierName,
        note: deliveryForm.note,
      });
      toast.success("Order marked delivered. Confirm payment after admin receives cash.");
      setDeliveryRow(null);
      setFilter("waiting");
      await loadCodDelivery();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to mark order delivered");
    } finally {
      setDelivering(false);
    }
  };

  const submitConfirm = async (event) => {
    event.preventDefault();
    if (!dialogRow) return;
    setConfirming(true);
    try {
      await confirmAdminCodPayment(dialogRow.orderId, {
        collectedAmount: Number(confirmForm.collectedAmount || dialogRow.total || 0),
        reference: confirmForm.reference,
        courierName: confirmForm.courierName,
        note: confirmForm.note,
      });
      toast.success("COD payment confirmed");
      setDialogRow(null);
      await loadCodDelivery();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to confirm COD payment");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#1e7098]">Admin COD delivery</p>
              <h1 className="mt-1 text-2xl font-black text-[#1A1A2E]">COD Delivery Payment Control</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Track cash-on-delivery orders, confirm received payment, and separate COD risk from normal payment verification.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={loadCodDelivery}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link
                to="/admin/orders?paymentMethod=cod"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1e7098] px-4 text-sm font-black text-white transition hover:bg-[#1a6387]"
              >
                Open COD orders
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric icon={Truck} label="COD orders" value={summary.totalCod || 0} helper={`${summary.dispatched || 0} dispatched`} />
          <Metric icon={Banknote} label="COD value" value={formatPrice(summary.codValue || 0)} helper="Order payable value" />
          <Metric icon={Clock3} label="Ready to confirm" value={summary.awaitingConfirmation || 0} helper="Delivered, awaiting admin" tone="text-amber-700" />
          <Metric icon={CheckCircle2} label="Payment confirmed" value={summary.confirmed || 0} helper="Cash received by admin" tone="text-emerald-700" />
          <Metric icon={Truck} label="Waiting delivery" value={summary.waitingDelivery || 0} helper="No admin confirm yet" tone="text-blue-700" />
          <Metric icon={AlertTriangle} label="Discrepancies" value={summary.discrepancies || 0} helper="Amount or remittance issue" tone="text-red-700" />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`inline-flex min-h-9 shrink-0 items-center rounded-lg border px-3 text-sm font-bold transition ${
                      filter === item.value
                        ? "border-[#1e7098] bg-[#1e7098] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-primary-50 hover:text-primary-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label className="relative block w-full xl:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                  placeholder="Search order, customer, courier"
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">COD status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                      Loading COD delivery data...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                      No COD delivery orders found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const confirmed = row.paymentConfirmed || row.paymentStatus === "paid";
                    const canConfirm = row.awaitingConfirmation && !confirmed;
                    const canMarkDelivered = row.waitingDelivery && !confirmed;
                    return (
                      <tr key={row.orderId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link to={`/admin/orders?search=${encodeURIComponent(row.orderId)}`} className="font-black text-[#1A1A2E] hover:text-[#1e7098]">
                            #{shortId(row.orderId)}
                          </Link>
                          <p className="text-xs text-slate-500">{formatDate(row.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{row.customerName || "Customer"}</p>
                          <p className="text-xs text-slate-500">{row.customerPhone || "No phone"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(row.vendorNames || []).join(", ") || "Vendor"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{row.deliveryZone || "Zone not set"}</p>
                          <p className="text-xs text-slate-500">{row.courierName || "Courier not set"}</p>
                          <p className={`mt-1 text-xs font-bold ${row.delivered ? "text-emerald-700" : "text-amber-700"}`}>
                            {row.delivered ? "Order delivered" : "Delivery pending"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusBadge status={row.reconciliationStatus} />
                            <StatusBadge status={confirmed ? "paid" : row.paymentStatus || "pending"} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatPrice(row.total || 0)}
                          {row.hasDiscrepancy ? (
                            <p className="text-xs font-bold text-red-600">Gap {formatPrice(Math.abs(row.discrepancyAmount || 0))}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {confirmed ? (
                            <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                              Confirmed
                            </span>
                          ) : canConfirm ? (
                            <button
                              type="button"
                              onClick={() => openConfirmDialog(row)}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#1e7098] px-3 text-xs font-black text-white transition hover:bg-[#1a6387]"
                            >
                              Confirm payment
                            </button>
                          ) : canMarkDelivered ? (
                            <button
                              type="button"
                              onClick={() => openDeliveryDialog(row)}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                            >
                              Order delivered
                            </button>
                          ) : (
                            <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">
                              Wait delivery
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Modal isOpen={Boolean(deliveryRow)} onClose={() => setDeliveryRow(null)} title="Mark Order Delivered" size="md">
        {deliveryRow ? (
          <form onSubmit={submitDelivery} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Order</p>
                  <p className="font-black text-slate-950">#{shortId(deliveryRow.orderId)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-slate-500">COD amount</p>
                  <p className="font-black text-slate-950">{formatPrice(deliveryRow.total || 0)}</p>
                </div>
              </div>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Courier</span>
              <input
                value={deliveryForm.courierName}
                onChange={(event) => setDeliveryForm((current) => ({ ...current, courierName: event.target.value }))}
                className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                placeholder="Courier or delivery staff"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Delivery note</span>
              <textarea
                value={deliveryForm.note}
                onChange={(event) => setDeliveryForm((current) => ({ ...current, note: event.target.value }))}
                className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                placeholder="Optional admin note"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeliveryRow(null)}
                disabled={delivering}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={delivering}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1D4ED8] px-4 text-sm font-black text-white hover:bg-[#1E40AF] disabled:opacity-60"
              >
                {delivering ? "Marking..." : "Mark delivered"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal isOpen={Boolean(dialogRow)} onClose={() => setDialogRow(null)} title="Confirm COD Cash Received" size="lg">
        {dialogRow ? (
          <form onSubmit={submitConfirm} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Order</p>
                  <p className="font-black text-slate-950">#{shortId(dialogRow.orderId)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-slate-500">Expected COD</p>
                  <p className="font-black text-slate-950">{formatPrice(dialogRow.total || 0)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-bold text-slate-700">Collected amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={confirmForm.collectedAmount}
                  onChange={(event) => setConfirmForm((current) => ({ ...current, collectedAmount: event.target.value }))}
                  className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-bold text-slate-700">Reference</span>
                <input
                  value={confirmForm.reference}
                  onChange={(event) => setConfirmForm((current) => ({ ...current, reference: event.target.value }))}
                  className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                  placeholder="Receipt or handover reference"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-bold text-slate-700">Courier</span>
                <input
                  value={confirmForm.courierName}
                  onChange={(event) => setConfirmForm((current) => ({ ...current, courierName: event.target.value }))}
                  className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                  placeholder="Courier or delivery staff"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-bold text-slate-700">Note</span>
                <textarea
                  value={confirmForm.note}
                  onChange={(event) => setConfirmForm((current) => ({ ...current, note: event.target.value }))}
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                  placeholder="Optional admin note"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDialogRow(null)}
                disabled={confirming}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={confirming}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1e7098] px-4 text-sm font-black text-white hover:bg-[#1a6387] disabled:opacity-60"
              >
                {confirming ? "Confirming..." : "Confirm cash received"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
