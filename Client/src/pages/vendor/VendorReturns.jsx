import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Eye,
  ImageIcon,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import {
  getPendingVendorResponse,
  getVendorReturns,
  getVendorReturnStats,
  uploadImages,
  vendorRespondToReturn,
} from "../../services/api";
import {
  canVendorRespond,
  getReasonLabel,
  getVendorReturnEvidence,
  getVendorReturnFinancials,
  getVendorReturnStatusMeta,
} from "../../utils/vendorReturnDispute";
import { hasVendorPermission } from "../../utils/vendorStaffPermissions";

const FILTERS = [
  { key: "all", label: "All cases" },
  { key: "needs_response", label: "Need response" },
  { key: "pending", label: "Admin review" },
  { key: "approved", label: "Approved" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

const getReturnFilterParam = (value) =>
  FILTERS.some((filter) => filter.key === value) ? value : "all";

const RESPONSE_ACTIONS = [
  {
    key: "approved",
    label: "Approve",
    title: "Approve return",
    detail: "Accept the customer claim and allow refund processing.",
    icon: CheckCircle2,
    className: "border-success-500 bg-success-50 text-success-700",
  },
  {
    key: "disputed",
    label: "Dispute",
    title: "Dispute with evidence",
    detail: "Send seller evidence for admin arbitration.",
    icon: AlertTriangle,
    className: "border-primary-500 bg-primary-50 text-primary-700",
  },
  {
    key: "rejected",
    label: "Reject",
    title: "Reject request",
    detail: "Use only when the request is invalid for this order.",
    icon: XCircle,
    className: "border-error-500 bg-error-50 text-error-700",
  },
];

const statusParamForFilter = (filter) => {
  if (filter === "needs_response") return "pending";
  if (filter === "completed") return null;
  if (filter === "all") return null;
  return filter;
};

const shortId = (value) => String(value || "").slice(-8).toUpperCase() || "RETURN";

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toNumber = (value) => Number(value || 0) || 0;

const getStatsValue = (stats, key) => toNumber(stats?.[key]);

const getVendorResponseText = (returnItem) => {
  const response = String(returnItem.vendorResponse || "").toLowerCase();
  if (!response) return "No seller response yet";
  if (response === "approved") return "Seller approved";
  if (response === "disputed") return "Seller disputed";
  if (response === "rejected") return "Seller rejected";
  return `Seller ${response.replace(/_/g, " ")}`;
};

const getReturnNextStep = (returnItem) => {
  const status = getVendorReturnStatusMeta(returnItem);
  if (canVendorRespond(returnItem)) {
    return {
      label: "Vendor response due",
      detail: "Review the customer claim and approve, reject, or dispute with evidence.",
      className: "border-primary-200 bg-primary-50 text-primary-700",
    };
  }
  if (status.key === "disputed" || (status.key === "pending" && returnItem.vendorResponse)) {
    return {
      label: "Admin review",
      detail: "Admin will compare customer and seller evidence.",
      className: "border-secondary-200 bg-secondary-50 text-secondary-700",
    };
  }
  if (["approved", "processing"].includes(status.key)) {
    return {
      label: "Refund workflow",
      detail: "Refund and payout deduction are being processed.",
      className: "border-success-200 bg-success-50 text-success-700",
    };
  }
  if (["completed", "refunded"].includes(status.key)) {
    return {
      label: "Closed",
      detail: "This return case is complete.",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }
  if (status.key === "rejected") {
    return {
      label: "Rejected",
      detail: "No seller deduction is expected for this case.",
      className: "border-error-200 bg-error-50 text-error-700",
    };
  }
  return {
    label: status.label,
    detail: status.nextAction,
    className: status.tone,
  };
};

export default function VendorReturns() {
  const { dbUser, role, permissions, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const canManageReturns = hasVendorPermission({ dbUser, role, permissions, isAdmin }, "returns:manage");
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState(null);
  const [pendingResponses, setPendingResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => getReturnFilterParam(searchParams.get("status")));
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedReturn, setSelectedReturn] = useState(null);
  const [responseAction, setResponseAction] = useState("approved");
  const [responseNotes, setResponseNotes] = useState("");
  const [responseReason, setResponseReason] = useState("");
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [evidencePreview, setEvidencePreview] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = { page, limit: 30 };
      const status = statusParamForFilter(statusFilter);
      if (status) params.status = status;

      const [returnsResult, statsResult, pendingResult] = await Promise.allSettled([
        getVendorReturns(params),
        getVendorReturnStats(),
        getPendingVendorResponse(),
      ]);

      if (returnsResult.status === "fulfilled") {
        setReturns(returnsResult.value.data.returns || []);
        setTotalPages(returnsResult.value.data.pages || 1);
      } else {
        toast.error(returnsResult.reason?.response?.data?.error || "Failed to load returns");
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value.data?.data || {});
      }

      if (pendingResult.status === "fulfilled") {
        setPendingResponses(pendingResult.value.data?.data || []);
      } else {
        setPendingResponses([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    const nextStatus = getReturnFilterParam(searchParams.get("status"));

    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatusFilter((current) => (current === nextStatus ? current : nextStatus));
    setPage(1);
  }, [searchParams]);

  const filterCounts = useMemo(() => ({
    all: getStatsValue(stats, "totalReturns"),
    needs_response: pendingResponses.length,
    pending: Math.max(0, getStatsValue(stats, "pending") - pendingResponses.length),
    approved: getStatsValue(stats, "approved"),
    processing: getStatsValue(stats, "processing"),
    completed: getStatsValue(stats, "completed") + getStatsValue(stats, "refunded"),
    rejected: getStatsValue(stats, "rejected"),
  }), [pendingResponses.length, stats]);

  const visibleReturns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return returns
      .filter((returnItem) => {
        const meta = getVendorReturnStatusMeta(returnItem);
        if (statusFilter === "all") return true;
        if (statusFilter === "needs_response") return canVendorRespond(returnItem);
        if (statusFilter === "pending") return meta.key === "pending" || meta.key === "disputed";
        if (statusFilter === "completed") return ["completed", "refunded"].includes(meta.key);
        return meta.key === statusFilter;
      })
      .filter((returnItem) => {
        if (!query) return true;
        const searchable = [
          returnItem._id,
          returnItem.orderId,
          returnItem.productTitle,
          returnItem.reason,
          returnItem.description,
          returnItem.vendorResponse,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(query);
      });
  }, [returns, search, statusFilter]);

  const workflow = useMemo(() => {
    const approvedDeductions = getStatsValue(stats, "approvedDeductions");
    return [
      {
        key: "needs_response",
        label: "Respond",
        value: pendingResponses.length,
        detail: "Awaiting seller decision",
        icon: RotateCcw,
        tone: "primary",
      },
      {
        key: "pending",
        label: "Admin review",
        value: filterCounts.pending,
        detail: "Waiting arbitration",
        icon: ShieldCheck,
        tone: "secondary",
      },
      {
        key: "approved",
        label: "Payout impact",
        value: formatPrice(approvedDeductions),
        detail: "Approved deductions",
        icon: Banknote,
        tone: "success",
      },
      {
        key: "completed",
        label: "Closed",
        value: filterCounts.completed,
        detail: "Completed or refunded",
        icon: CheckCircle2,
        tone: "neutral",
      },
    ];
  }, [filterCounts.completed, filterCounts.pending, formatPrice, pendingResponses.length, stats]);

  const nextAction = useMemo(() => {
    if (pendingResponses.length > 0) {
      return {
        label: "Review now",
        title: `${pendingResponses.length} return${pendingResponses.length === 1 ? "" : "s"} need your response`,
        detail: "Open each case, check customer evidence, then approve, reject, or dispute with proof.",
        filter: "needs_response",
        tone: "primary",
      };
    }
    if (filterCounts.pending > 0) {
      return {
        label: "Track admin review",
        title: `${filterCounts.pending} case${filterCounts.pending === 1 ? "" : "s"} in admin review`,
        detail: "Admin is reviewing seller/customer evidence. Watch these cases for the final decision.",
        filter: "pending",
        tone: "secondary",
      };
    }
    return {
      label: "View all returns",
      title: "Return queue is clear",
      detail: "No urgent seller return response is waiting right now.",
      filter: "all",
      tone: "success",
    };
  }, [filterCounts.pending, pendingResponses.length]);

  const resetResponseForm = () => {
    evidencePreview.forEach((preview) => {
      if (preview.url) URL.revokeObjectURL(preview.url);
    });
    setSelectedReturn(null);
    setResponseAction("approved");
    setResponseNotes("");
    setResponseReason("");
    setEvidenceImages([]);
    setEvidencePreview([]);
  };

  const openResponseModal = (returnItem) => {
    if (!canManageReturns) {
      toast.error("Your staff access can view returns, but cannot respond.");
      return;
    }

    setSelectedReturn(returnItem);
    setResponseAction("approved");
    setResponseNotes("");
    setResponseReason("");
    setEvidenceImages([]);
    setEvidencePreview([]);
  };

  const handleEvidenceUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (files.length + evidenceImages.length > 5) {
      toast.error("Maximum 5 evidence images allowed");
      return;
    }

    setEvidenceImages((current) => [...current, ...files]);
    setEvidencePreview((current) => [
      ...current,
      ...files.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
      })),
    ]);
    event.target.value = "";
  };

  const removeEvidence = (index) => {
    const preview = evidencePreview[index];
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setEvidenceImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setEvidencePreview((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmitResponse = async () => {
    if (!selectedReturn) return;
    if (!canManageReturns) {
      toast.error("Your staff access can view returns, but cannot respond.");
      return;
    }
    if (["disputed", "rejected"].includes(responseAction) && !responseReason.trim()) {
      toast.error("Please provide a reason for this response");
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrls = [];
      if (evidenceImages.length > 0) {
        const uploadResponse = await uploadImages(evidenceImages, "returns/vendor-evidence");
        uploadedUrls = uploadResponse.data?.urls || [];
      }

      await vendorRespondToReturn(selectedReturn._id, {
        action: responseAction,
        notes: responseNotes.trim() || null,
        evidenceImages: uploadedUrls,
        evidenceFiles: uploadedUrls,
        disputeReason: ["disputed", "rejected"].includes(responseAction) ? responseReason.trim() : null,
        rejectionReason: responseAction === "rejected" ? responseReason.trim() : null,
      });

      toast.success(
        responseAction === "approved"
          ? "Return approved"
          : responseAction === "rejected"
            ? "Return rejected"
            : "Return disputed for admin review",
      );
      resetResponseForm();
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading returns workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/vendor/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-700 transition hover:bg-primary-100"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-slate-950">Returns workflow</h1>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                Review customer evidence, respond, and track payout deductions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {!canManageReturns && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Your staff role can review returns and evidence, but approvals, disputes, and evidence uploads require return management access.
          </div>
        )}

        <section className="rounded-lg border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-700">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return center
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {getStatsValue(stats, "totalReturns")} total
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold leading-tight text-slate-950 sm:text-2xl">Handle returns in the right order</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                First respond to open requests, then track admin review, payout impact, and closed cases.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {workflow.map((item) => (
                  <WorkflowCard
                    key={item.key}
                    item={item}
                    active={statusFilter === item.key}
                    onClick={() => {
                      setStatusFilter(item.key);
                      setPage(1);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className={`flex flex-col justify-between rounded-lg border p-4 ${nextActionTone(nextAction.tone)}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">Next action</p>
                <h3 className="mt-3 text-lg font-black leading-6 text-slate-950">{nextAction.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{nextAction.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter(nextAction.filter);
                  setPage(1);
                }}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700"
              >
                {nextAction.label}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open responses" value={pendingResponses.length} helper="Need seller action" icon={Clock3} tone="primary" />
          <MetricCard label="Admin review" value={filterCounts.pending} helper="Evidence review" icon={ShieldCheck} tone="secondary" />
          <MetricCard label="Approved deductions" value={formatPrice(getStatsValue(stats, "approvedDeductions"))} helper="Payout impact" icon={Banknote} tone="success" />
          <MetricCard label="Rejected" value={filterCounts.rejected} helper="No deduction expected" icon={XCircle} tone="error" />
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full lg:max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search return, order, product, reason"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Showing {visibleReturns.length} return case{visibleReturns.length === 1 ? "" : "s"} in this view.
                </p>
              </div>

              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(filter.key);
                      setPage(1);
                    }}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      statusFilter === filter.key
                        ? "bg-primary-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    }`}
                  >
                    {filter.label}
                    <span className={statusFilter === filter.key ? "ml-2 text-primary-100" : "ml-2 text-slate-400"}>
                      {filterCounts[filter.key] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibleReturns.length === 0 ? (
            <EmptyReturns statusFilter={statusFilter} onViewAll={() => setStatusFilter("all")} />
          ) : (
            <>
              <div className="divide-y divide-slate-200 xl:hidden">
                {visibleReturns.map((returnItem) => (
                  <ReturnCard
                    key={returnItem._id}
                    returnItem={returnItem}
                    formatPrice={formatPrice}
                    canManageReturns={canManageReturns}
                    onRespond={openResponseModal}
                  />
                ))}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-[1120px] divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Return</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Financials</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next step</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {visibleReturns.map((returnItem) => (
                      <ReturnTableRow
                        key={returnItem._id}
                        returnItem={returnItem}
                        formatPrice={formatPrice}
                        canManageReturns={canManageReturns}
                        onRespond={openResponseModal}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <Modal
        isOpen={Boolean(selectedReturn)}
        onClose={resetResponseForm}
        title={`Respond to return #${shortId(selectedReturn?._id)}`}
        size="lg"
      >
        {selectedReturn && (
          <div className="space-y-5">
            <ReturnResponseSummary returnItem={selectedReturn} formatPrice={formatPrice} />

            <div>
              <p className="text-sm font-semibold text-slate-700">Seller decision</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {RESPONSE_ACTIONS.map((option) => {
                  const selected = responseAction === option.key;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setResponseAction(option.key)}
                      className={`rounded-lg border-2 p-3 text-left transition ${
                        selected ? option.className : "border-slate-200 bg-white text-slate-700 hover:border-primary-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <p className="mt-2 text-sm font-bold">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 opacity-80">{option.detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {["disputed", "rejected"].includes(responseAction) && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  {responseAction === "rejected" ? "Rejection reason" : "Dispute reason"} *
                </span>
                <textarea
                  value={responseReason}
                  onChange={(event) => setResponseReason(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="Explain the seller-side reason clearly."
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Notes</span>
              <textarea
                value={responseNotes}
                onChange={(event) => setResponseNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="Add packing, quality check, or customer communication context."
              />
            </label>

            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-primary-300 hover:bg-primary-50">
                <Upload className="h-7 w-7 text-slate-400" />
                <span className="mt-2 text-sm font-semibold text-slate-700">Upload seller evidence</span>
                <span className="mt-1 text-xs text-slate-500">Up to 5 images from QC, packing, or courier handover.</span>
                <input type="file" accept="image/*" multiple onChange={handleEvidenceUpload} className="hidden" />
              </label>

              {evidencePreview.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {evidencePreview.map((preview, index) => (
                    <div key={preview.url} className="relative overflow-hidden rounded-lg border border-slate-200">
                      <img src={preview.url} alt={preview.name} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeEvidence(index)}
                        className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-white hover:bg-error-600"
                        aria-label={`Remove ${preview.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetResponseForm}
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResponse}
                disabled={!canManageReturns || submitting || (["disputed", "rejected"].includes(responseAction) && !responseReason.trim())}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  "Submit response"
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function nextActionTone(tone) {
  const tones = {
    primary: "border-primary-200 bg-primary-50 text-primary-700",
    secondary: "border-secondary-200 bg-secondary-50 text-secondary-700",
    success: "border-success-200 bg-success-50 text-success-700",
  };
  return tones[tone] || tones.primary;
}

function workflowTone(tone, active) {
  const tones = {
    primary: active ? "border-primary-300 bg-primary-50" : "border-slate-200 bg-slate-50 hover:border-primary-200 hover:bg-primary-50",
    secondary: active ? "border-secondary-300 bg-secondary-50" : "border-slate-200 bg-slate-50 hover:border-secondary-200 hover:bg-secondary-50",
    success: active ? "border-success-300 bg-success-50" : "border-slate-200 bg-slate-50 hover:border-success-200 hover:bg-success-50",
    neutral: active ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100",
  };
  return tones[tone] || tones.primary;
}

function WorkflowCard({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-28 min-w-0 rounded-lg border px-4 py-3 text-left transition ${workflowTone(item.tone, active)}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm ring-1 ring-slate-200">
            {createElement(item.icon, { className: "h-4 w-4" })}
          </span>
          <span className="min-w-0 truncate text-sm font-bold text-slate-950">{item.label}</span>
        </span>
      </span>
      <span className="mt-3 block truncate text-2xl font-black leading-none text-primary-700">{item.value}</span>
      <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">{item.detail}</span>
    </button>
  );
}

function MetricCard({ label, value, helper, icon, tone = "primary" }) {
  const toneClasses = {
    primary: "bg-primary-50 text-primary-700 ring-primary-100",
    secondary: "bg-secondary-50 text-secondary-700 ring-secondary-100",
    success: "bg-success-50 text-success-700 ring-success-100",
    error: "bg-error-50 text-error-700 ring-error-100",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses[tone] || toneClasses.primary}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </div>
      </div>
    </div>
  );
}

function ReturnCard({ returnItem, formatPrice, canManageReturns, onRespond }) {
  const status = getVendorReturnStatusMeta(returnItem);
  const financials = getVendorReturnFinancials(returnItem);
  const evidence = getVendorReturnEvidence(returnItem);
  const nextStep = getReturnNextStep(returnItem);
  const canRespond = canManageReturns && canVendorRespond(returnItem);

  return (
    <article className="bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/vendor/returns/${returnItem._id}`} className="font-mono text-sm font-bold text-primary-700 hover:text-primary-800 hover:underline">
            #{shortId(returnItem._id)}
          </Link>
          <p className="mt-1 text-xs text-slate-500">Order #{shortId(returnItem.orderId)}</p>
        </div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{returnItem.productTitle || "Returned product"}</p>
        <p className="mt-1 text-xs text-slate-500">
          Qty {financials.quantity} x {formatPrice(financials.unitPrice)}
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-700">{getReasonLabel(returnItem.reason)}</p>
        {returnItem.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{returnItem.description}</p> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoTile label="Customer refund" value={formatPrice(financials.customerRefund)} />
        <InfoTile label="Vendor deduction" value={formatPrice(financials.vendorDeduction)} danger />
      </div>

      <div className={`mt-3 rounded-lg border px-3 py-2 ${nextStep.className}`}>
        <p className="text-xs font-bold">{nextStep.label}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">{nextStep.detail}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
          <ImageIcon className="h-3.5 w-3.5" />
          {evidence.total} evidence
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
          {getVendorResponseText(returnItem)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/vendor/returns/${returnItem._id}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
        >
          <Eye className="h-4 w-4" />
          Details
        </Link>
        {canRespond && (
          <button
            type="button"
            onClick={() => onRespond(returnItem)}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Respond
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">Submitted {formatDate(returnItem.createdAt)}</p>
    </article>
  );
}

function ReturnTableRow({ returnItem, formatPrice, canManageReturns, onRespond }) {
  const status = getVendorReturnStatusMeta(returnItem);
  const financials = getVendorReturnFinancials(returnItem);
  const evidence = getVendorReturnEvidence(returnItem);
  const nextStep = getReturnNextStep(returnItem);
  const canRespond = canManageReturns && canVendorRespond(returnItem);

  return (
    <tr className="align-top transition hover:bg-slate-50">
      <td className="w-36 px-4 py-4">
        <Link to={`/vendor/returns/${returnItem._id}`} className="font-mono text-sm font-bold text-primary-700 hover:text-primary-800 hover:underline">
          #{shortId(returnItem._id)}
        </Link>
        <div className="mt-1 text-xs text-slate-500">Order #{shortId(returnItem.orderId)}</div>
        <div className="mt-2 text-xs text-slate-500">{formatDate(returnItem.createdAt)}</div>
      </td>
      <td className="w-72 px-4 py-4">
        <div className="line-clamp-2 text-sm font-semibold text-slate-950">{returnItem.productTitle || "Returned product"}</div>
        <div className="mt-1 text-xs text-slate-500">
          Qty {financials.quantity} x {formatPrice(financials.unitPrice)}
        </div>
      </td>
      <td className="w-64 px-4 py-4">
        <div className="text-sm font-semibold text-slate-900">{getReasonLabel(returnItem.reason)}</div>
        {returnItem.description ? <div className="mt-1 line-clamp-2 text-xs text-slate-500">{returnItem.description}</div> : null}
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          <ImageIcon className="h-3.5 w-3.5" />
          {evidence.total} evidence
        </div>
      </td>
      <td className="w-44 px-4 py-4">
        <div className="text-sm font-bold text-slate-950">{formatPrice(financials.customerRefund)}</div>
        <div className="mt-1 text-xs text-slate-500">Customer refund</div>
        <div className="mt-2 text-sm font-bold text-error-700">-{formatPrice(financials.vendorDeduction)}</div>
        <div className="mt-1 text-xs text-slate-500">Vendor deduction</div>
      </td>
      <td className="w-44 px-4 py-4">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}>
          {status.label}
        </span>
        <div className="mt-2 text-xs font-semibold text-slate-500">{getVendorResponseText(returnItem)}</div>
      </td>
      <td className="w-56 px-4 py-4">
        <div className={`rounded-lg border px-3 py-2 ${nextStep.className}`}>
          <p className="text-xs font-bold">{nextStep.label}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">{nextStep.detail}</p>
        </div>
      </td>
      <td className="w-48 px-4 py-4 text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            to={`/vendor/returns/${returnItem._id}`}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            <Eye className="h-3.5 w-3.5" />
            Details
          </Link>
          {canRespond ? (
            <button
              type="button"
              onClick={() => onRespond(returnItem)}
              className="inline-flex min-h-9 items-center rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white transition hover:bg-primary-700"
            >
              Respond
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function InfoTile({ label, value, danger = false }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 font-bold ${danger ? "text-error-700" : "text-slate-950"}`}>{danger ? "-" : ""}{value}</p>
    </div>
  );
}

function ReturnResponseSummary({ returnItem, formatPrice }) {
  const financials = getVendorReturnFinancials(returnItem);
  const evidence = getVendorReturnEvidence(returnItem);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold text-slate-950">{returnItem.productTitle || "Returned product"}</p>
          <p className="mt-1 text-xs text-slate-500">Order #{shortId(returnItem.orderId)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
          {evidence.customer.length} customer files
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoTile label="Reason" value={getReasonLabel(returnItem.reason)} />
        <InfoTile label="Refund" value={formatPrice(financials.customerRefund)} />
        <InfoTile label="Deduction" value={formatPrice(financials.vendorDeduction)} danger />
      </div>
      {returnItem.description && (
        <div className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-100">
          {returnItem.description}
        </div>
      )}
    </div>
  );
}

function EmptyReturns({ statusFilter, onViewAll }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">No returns found</h2>
      <p className="mt-1 text-sm text-slate-500">
        {statusFilter === "all" ? "Your shop has no return cases yet." : "Try another filter or clear your search."}
      </p>
      {statusFilter !== "all" && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          View all returns
        </button>
      )}
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
