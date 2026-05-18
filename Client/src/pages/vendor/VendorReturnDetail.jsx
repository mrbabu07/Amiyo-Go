import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  MessageSquare,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getVendorReturnById,
  uploadImages,
  vendorRespondToReturn,
} from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";
import {
  buildVendorReturnTimeline,
  canVendorRespond,
  getReasonLabel,
  getVendorReturnEvidence,
  getVendorReturnFinancials,
  getVendorReturnStatusMeta,
} from "../../utils/vendorReturnDispute";

const actionOptions = [
  {
    value: "approved",
    title: "Approve return",
    description: "Accept the case and allow the refund workflow.",
    icon: CheckCircle2,
    tone: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "disputed",
    title: "Dispute with evidence",
    description: "Ask admin to review your proof before a decision.",
    icon: AlertTriangle,
    tone: "border-orange-500 bg-orange-50 text-orange-700",
  },
  {
    value: "rejected",
    title: "Reject request",
    description: "Reject when the request is invalid for this order.",
    icon: XCircle,
    tone: "border-red-500 bg-red-50 text-red-700",
  },
];

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const shortId = (value) => String(value || "").slice(-8).toUpperCase();

function EvidenceGrid({ title, items, emptyText }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{items.length} file{items.length === 1 ? "" : "s"}</p>
        </div>
        <ImageIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>

      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <a
              key={`${item.url}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              {item.isImage ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-28 w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-28 items-center justify-center px-3 text-center text-xs font-medium text-slate-600">
                  {item.name}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-600">
                <span className="truncate">{item.name}</span>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function TimelineList({ events }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Case timeline</h2>
          <p className="text-sm text-slate-500">Customer, vendor, and admin actions in order.</p>
        </div>
        <Clock3 className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>

      {events.length ? (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={`${event.type}-${event.at.toISOString()}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                {index < events.length - 1 && <span className="mt-1 h-full min-h-10 w-px bg-slate-200" />}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{event.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {event.actorRole}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{formatDate(event.at)}</p>
                {event.note && <p className="mt-1 text-sm text-slate-600">{event.note}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No timeline events recorded yet.
        </div>
      )}
    </section>
  );
}

export default function VendorReturnDetail() {
  const { returnId } = useParams();
  const { formatPrice } = useCurrency();
  const [returnItem, setReturnItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("approved");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadReturn = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getVendorReturnById(returnId);
      setReturnItem(response.data?.data || null);
    } catch (err) {
      console.error("Error loading vendor return detail:", err);
      const message = err.response?.data?.error || "Failed to load return detail";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    loadReturn();
  }, [loadReturn]);

  const status = useMemo(() => getVendorReturnStatusMeta(returnItem || {}), [returnItem]);
  const financials = useMemo(() => getVendorReturnFinancials(returnItem || {}), [returnItem]);
  const evidence = useMemo(() => getVendorReturnEvidence(returnItem || {}), [returnItem]);
  const timeline = useMemo(() => buildVendorReturnTimeline(returnItem || {}), [returnItem]);
  const canRespond = canVendorRespond(returnItem || {});
  const selectedAction = actionOptions.find((item) => item.value === action) || actionOptions[0];
  const SelectedActionIcon = selectedAction.icon;
  const needsReason = ["disputed", "rejected"].includes(action);
  const orderSummary = returnItem?.orderSummary || {};

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    if (files.length + selected.length > 5) {
      toast.error("Maximum 5 evidence images allowed");
      return;
    }

    setFiles((current) => [...current, ...selected]);
    setPreviews((current) => [
      ...current,
      ...selected.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
      })),
    ]);
    event.target.value = "";
  };

  const removeFile = (index) => {
    const preview = previews[index];
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitResponse = async () => {
    if (!returnItem) return;
    if (needsReason && !reason.trim()) {
      toast.error("Please add a reason before submitting this response");
      return;
    }

    try {
      setSubmitting(true);
      let uploadedUrls = [];
      if (files.length > 0) {
        const uploadResponse = await uploadImages(files, "returns/vendor-evidence");
        uploadedUrls = uploadResponse.data?.urls || [];
      }

      await vendorRespondToReturn(returnItem._id, {
        action,
        notes: notes.trim() || null,
        evidenceImages: uploadedUrls,
        evidenceFiles: uploadedUrls,
        disputeReason: needsReason ? reason.trim() : null,
      });

      toast.success(
        action === "approved"
          ? "Return approved"
          : action === "rejected"
            ? "Return rejected"
            : "Return disputed for admin review",
      );
      setReason("");
      setNotes("");
      setFiles([]);
      setPreviews([]);
      await loadReturn();
    } catch (err) {
      console.error("Error submitting return response:", err);
      toast.error(err.response?.data?.error || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-white" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-xl bg-white lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !returnItem) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Return detail unavailable</h1>
          <p className="mt-2 text-slate-600">{error || "This return could not be loaded."}</p>
          <Link
            to="/vendor/returns"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to returns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                to="/vendor/returns"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-600"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to returns
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                  Return #{shortId(returnItem._id)}
                </h1>
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.tone}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {status.nextAction}. Review customer evidence, financial impact, order context, and submit your seller response from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadReturn}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </button>
              <Link
                to="/vendor/orders"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <PackageOpen className="h-4 w-4" aria-hidden="true" />
                Orders
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Customer refund</p>
              <Banknote className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{formatPrice(financials.customerRefund)}</p>
            <p className="mt-1 text-sm text-slate-500">Requested amount</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Vendor deduction</p>
              <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{formatPrice(financials.vendorDeduction)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {financials.noDeductionExpected ? "Not applied yet" : "Expected payout impact"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Commission snapshot</p>
              <ShieldCheck className="h-5 w-5 text-blue-500" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{financials.commissionRate}%</p>
            <p className="mt-1 text-sm text-slate-500">{formatPrice(financials.adminCommissionAmount)} commission</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Quantity</p>
              <PackageOpen className="h-5 w-5 text-violet-500" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{financials.quantity}</p>
            <p className="mt-1 text-sm text-slate-500">{formatPrice(financials.unitPrice)} per unit</p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Customer request</h2>
                  <p className="text-sm text-slate-500">Product, reason, description, and order link.</p>
                </div>
                <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{returnItem.productTitle || "Unknown product"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{getReasonLabel(returnItem.reason)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    #{shortId(orderSummary.orderNumber || orderSummary.id || returnItem.orderId)}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{formatDate(returnItem.createdAt)}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer description</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {returnItem.description || "No customer description was provided."}
                </p>
              </div>
            </section>

            <EvidenceGrid
              title="Customer evidence"
              items={evidence.customer}
              emptyText="The customer did not attach evidence."
            />

            <TimelineList events={timeline} />
          </main>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Seller response</h2>
                  <p className="text-sm text-slate-500">
                    {canRespond ? "Submit one clear decision for this case." : "This case already has a response or is closed."}
                  </p>
                </div>
                <MessageSquare className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>

              {canRespond ? (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {actionOptions.map((option) => {
                      const Icon = option.icon;
                      const selected = action === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => setAction(option.value)}
                          className={`rounded-lg border-2 p-4 text-left transition ${
                            selected ? option.tone : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                            <div>
                              <p className="font-semibold">{option.title}</p>
                              <p className="mt-1 text-sm opacity-80">{option.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {needsReason && (
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">
                        {action === "rejected" ? "Rejection reason" : "Dispute reason"} *
                      </span>
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        placeholder="Explain the seller-side reason clearly for admin review."
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Internal notes</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      placeholder="Add packing, QC, or communication context."
                    />
                  </label>

                  <div>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-orange-300 hover:bg-orange-50/40">
                      <Upload className="h-7 w-7 text-slate-400" aria-hidden="true" />
                      <span className="mt-2 text-sm font-semibold text-slate-700">Upload evidence images</span>
                      <span className="mt-1 text-xs text-slate-500">Up to 5 images from packing, QC, or delivery handover.</span>
                      <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                    </label>

                    {previews.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {previews.map((preview, index) => (
                          <div key={preview.url} className="relative overflow-hidden rounded-lg border border-slate-200">
                            <img src={preview.url} alt={preview.name} className="h-20 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-white hover:bg-red-600"
                              aria-label={`Remove ${preview.name}`}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={submitResponse}
                    disabled={submitting || (needsReason && !reason.trim())}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Submitting
                      </>
                    ) : (
                      <>
                        <SelectedActionIcon className="h-4 w-4" aria-hidden="true" />
                        Submit {selectedAction.title.toLowerCase()}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {returnItem.vendorResponse
                      ? `You ${String(returnItem.vendorResponse).replace(/_/g, " ")} this return.`
                      : "No seller action is available for this status."}
                  </p>
                  {returnItem.vendorResponseDate && (
                    <p className="mt-1 text-sm text-slate-500">{formatDate(returnItem.vendorResponseDate)}</p>
                  )}
                  {returnItem.vendorResponseNotes && (
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{returnItem.vendorResponseNotes}</p>
                  )}
                  {returnItem.disputeReason && (
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                      <span className="font-semibold">Reason:</span> {returnItem.disputeReason}
                    </div>
                  )}
                </div>
              )}
            </section>

            <EvidenceGrid
              title="Seller evidence"
              items={evidence.vendor}
              emptyText="No seller evidence has been attached yet."
            />

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Order context</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Order status</dt>
                  <dd className="font-medium text-slate-900">{orderSummary.status || "Not available"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Payment</dt>
                  <dd className="font-medium text-slate-900">{orderSummary.paymentStatus || "Not available"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Method</dt>
                  <dd className="font-medium text-slate-900">{orderSummary.paymentMethod || "Not available"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Tracking</dt>
                  <dd className="font-medium text-slate-900">{orderSummary.trackingNumber || "Not available"}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
