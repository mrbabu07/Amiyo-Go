import { createElement, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  Filter,
  ImageIcon,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  XCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import {
  getAllReturns,
  processRefund,
  updateReturnStatus,
} from "../../services/api";

const FILTERS = [
  { key: "all", label: "All cases" },
  { key: "vendor", label: "Wait vendor" },
  { key: "decision", label: "Admin decision" },
  { key: "refund", label: "Refund desk" },
  { key: "closed", label: "Closed" },
  { key: "rejected", label: "Rejected" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const DECISION_OPTIONS = [
  {
    value: "approved",
    title: "Approve return",
    description: "Customer return is accepted. Refund desk becomes the next step.",
    icon: CheckCircle2,
    tone: "success",
  },
  {
    value: "rejected",
    title: "Reject return",
    description: "Close the request with an admin reason for the customer and vendor.",
    icon: XCircle,
    tone: "error",
  },
];

const REFUND_METHODS = [
  { value: "original", label: "Original payment method" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "upay", label: "Upay" },
  { value: "bank", label: "Bank transfer" },
];

const statusStyles = {
  pending: "border-secondary-200 bg-secondary-50 text-secondary-700",
  approved: "border-primary-200 bg-primary-50 text-primary-700",
  processing: "border-secondary-200 bg-secondary-50 text-secondary-700",
  completed: "border-success-200 bg-success-50 text-success-700",
  refunded: "border-success-200 bg-success-50 text-success-700",
  rejected: "border-error-200 bg-error-50 text-error-700",
};

const flowStyles = {
  vendor: {
    badge: "border-secondary-200 bg-secondary-50 text-secondary-700",
    icon: Clock3,
    label: "Waiting for vendor",
    action: "Vendor response needed",
  },
  decision: {
    badge: "border-primary-200 bg-primary-50 text-primary-700",
    icon: ShieldCheck,
    label: "Admin decision",
    action: "Review evidence",
  },
  refund: {
    badge: "border-primary-200 bg-primary-50 text-primary-700",
    icon: Banknote,
    label: "Refund desk",
    action: "Process refund",
  },
  closed: {
    badge: "border-success-200 bg-success-50 text-success-700",
    icon: CheckCircle2,
    label: "Closed",
    action: "Resolved",
  },
  rejected: {
    badge: "border-error-200 bg-error-50 text-error-700",
    icon: XCircle,
    label: "Rejected",
    action: "Closed as rejected",
  },
};

const toneIconStyles = {
  primary: "bg-primary-50 text-primary-700 ring-primary-100",
  secondary: "bg-secondary-50 text-secondary-700 ring-secondary-100",
  success: "bg-success-50 text-success-700 ring-success-100",
  error: "bg-error-50 text-error-700 ring-error-100",
};

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

const softButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60";

const errorButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-error-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60";

const formatStatus = (status = "") =>
  String(status || "pending")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const shortId = (id = "") => String(id || "").slice(-8).toUpperCase() || "RETURN";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatMoney = (value = 0) =>
  `BDT ${toNumber(value).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getReturnAmount = (returnItem = {}) => {
  const quantity = toNumber(returnItem.quantity, 1) || 1;
  const fallback = toNumber(returnItem.productPrice || returnItem.price, 0) * quantity;
  return toNumber(
    returnItem.adminRefund ??
      returnItem.refundAmount ??
      returnItem.totalAmount ??
      returnItem.amount,
    fallback,
  );
};

const getVendorDeduction = (returnItem = {}) =>
  toNumber(
    returnItem.vendorDeduction,
    Math.max(0, getReturnAmount(returnItem) - toNumber(returnItem.adminCommissionAmount)),
  );

const getVendorResponseLabel = (returnItem = {}) => {
  if (!returnItem.vendorId) return "Platform product";
  if (!returnItem.vendorResponse) return "Pending vendor response";
  return `Vendor ${formatStatus(returnItem.vendorResponse).toLowerCase()}`;
};

const getReturnFlow = (returnItem = {}) => {
  const status = String(returnItem.status || "pending").toLowerCase();

  if (status === "rejected") return "rejected";
  if (["completed", "refunded"].includes(status)) return "closed";
  if (["approved", "processing"].includes(status)) return "refund";
  if (status === "pending" && returnItem.vendorId && !returnItem.vendorResponse) {
    return "vendor";
  }
  return "decision";
};

const getEvidenceCount = (returnItem = {}) =>
  (returnItem.images || []).length + (returnItem.vendorEvidenceImages || []).length;

const getSearchText = (returnItem = {}) =>
  [
    returnItem._id,
    returnItem.orderId,
    returnItem.productTitle,
    returnItem.reason,
    returnItem.description,
    returnItem.userId,
    returnItem.userInfo?.name,
    returnItem.userInfo?.email,
    returnItem.userInfo?.phone,
    returnItem.vendorId,
    returnItem.vendorShopName,
    returnItem.vendorResponse,
    returnItem.vendorResponseNotes,
    returnItem.disputeReason,
    returnItem.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getInitialRefundMethod = (returnItem = {}) =>
  returnItem.refundMethod && returnItem.refundMethod !== "manual"
    ? returnItem.refundMethod
    : "original";

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[normalized] || "border-slate-200 bg-slate-100 text-slate-700"}`}
    >
      {formatStatus(normalized)}
    </span>
  );
}

function FlowBadge({ flow }) {
  const config = flowStyles[flow] || flowStyles.decision;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${config.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function MetricTile({ icon, label, value, helper, tone = "primary" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneIconStyles[tone] || toneIconStyles.primary}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
      {helper ? <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </div>
  );
}

function WorkflowStep({ icon, label, count, helper, active, onClick, tone = "primary" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 ${
        active ? "border-primary-300 ring-2 ring-primary-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneIconStyles[tone] || toneIconStyles.primary}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </span>
        <span className="text-2xl font-black text-slate-950">{count}</span>
      </div>
      <p className="mt-3 text-sm font-black text-slate-950">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
    </button>
  );
}

function DetailRow({ label, value, children }) {
  const content = children ?? value ?? "N/A";

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="shrink-0 text-xs font-bold uppercase text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-slate-900">
        {content}
      </span>
    </div>
  );
}

function EvidenceGallery({ images = [], label }) {
  if (!images.length) {
    return <p className="text-sm font-semibold text-slate-500">No {label.toLowerCase()} attached.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((imageUrl, index) => (
        <button
          key={`${imageUrl}-${index}`}
          type="button"
          onClick={() => window.open(imageUrl, "_blank", "noopener,noreferrer")}
          className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
          title={`Open ${label.toLowerCase()} ${index + 1}`}
        >
          <img
            src={imageUrl}
            alt={`${label} ${index + 1}`}
            className="h-full w-full object-cover transition hover:scale-105"
          />
        </button>
      ))}
    </div>
  );
}

function EmptyState({ search }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
        <RotateCcw className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-950">No returns found</h3>
      <p className="mt-2 text-sm font-medium text-slate-500">
        {search ? `No return case matches "${search}".` : "There are no return cases in this queue."}
      </p>
    </div>
  );
}

function ReturnActionButton({ returnItem, onDecision, onRefund, onDetail }) {
  const flow = getReturnFlow(returnItem);

  if (flow === "decision") {
    return (
      <button type="button" onClick={() => onDecision(returnItem)} className={primaryButtonClass}>
        <ShieldCheck className="h-4 w-4" />
        Decide
      </button>
    );
  }

  if (flow === "refund") {
    return (
      <button type="button" onClick={() => onRefund(returnItem)} className={primaryButtonClass}>
        <Banknote className="h-4 w-4" />
        Refund
      </button>
    );
  }

  if (flow === "vendor") {
    return (
      <button type="button" onClick={() => onDetail(returnItem)} className={softButtonClass}>
        <Clock3 className="h-4 w-4" />
        Track
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onDetail(returnItem)} className={softButtonClass}>
      <Eye className="h-4 w-4" />
      View
    </button>
  );
}

function ReturnCard({ returnItem, onDecision, onRefund, onDetail }) {
  const flow = getReturnFlow(returnItem);
  const flowConfig = flowStyles[flow] || flowStyles.decision;
  const evidenceCount = getEvidenceCount(returnItem);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-black text-primary-700">RET-{shortId(returnItem._id)}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-950">
            {returnItem.productTitle || "Return request"}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {returnItem.userInfo?.name || returnItem.userId || "Customer"}
          </p>
        </div>
        <StatusBadge status={returnItem.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Flow</p>
          <p className="mt-1 font-bold text-slate-900">{flowConfig.label}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Refund</p>
          <p className="mt-1 font-bold text-slate-900">{formatMoney(getReturnAmount(returnItem))}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Vendor</p>
          <p className="mt-1 line-clamp-1 font-bold text-slate-900">{getVendorResponseLabel(returnItem)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Evidence</p>
          <p className="mt-1 font-bold text-slate-900">{evidenceCount} file{evidenceCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onDetail(returnItem)} className={softButtonClass}>
          <Eye className="h-4 w-4" />
          Details
        </button>
        <ReturnActionButton
          returnItem={returnItem}
          onDecision={onDecision}
          onRefund={onRefund}
          onDetail={onDetail}
        />
      </div>
    </article>
  );
}

export default function AdminReturns() {
  const [searchParams] = useSearchParams();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailReturn, setDetailReturn] = useState(null);
  const [decisionReturn, setDecisionReturn] = useState(null);
  const [refundReturn, setRefundReturn] = useState(null);
  const [decisionForm, setDecisionForm] = useState({
    status: "approved",
    adminNotes: "",
  });
  const [refundForm, setRefundForm] = useState({
    refundAmount: "",
    refundMethod: "original",
    adminNotes: "",
  });

  const loadReturns = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await getAllReturns();
      setReturns(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
      toast.error("Failed to load return cases");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, search, pageSize]);

  const summary = useMemo(() => {
    return returns.reduce(
      (result, returnItem) => {
        const flow = getReturnFlow(returnItem);
        const amount = getReturnAmount(returnItem);
        const status = String(returnItem.status || "pending").toLowerCase();

        result.total += 1;
        result.amount += amount;
        if (["approved", "processing", "completed", "refunded"].includes(status)) {
          result.vendorDeduction += getVendorDeduction(returnItem);
        }
        result[flow] = (result[flow] || 0) + 1;
        result.statusCounts[status] = (result.statusCounts[status] || 0) + 1;
        if (returnItem.vendorResponse === "disputed") result.disputed += 1;
        if (returnItem.refundMethod && returnItem.refundAccountNumber) result.refundReady += 1;
        return result;
      },
      {
        total: 0,
        amount: 0,
        vendor: 0,
        decision: 0,
        refund: 0,
        closed: 0,
        rejected: 0,
        disputed: 0,
        refundReady: 0,
        vendorDeduction: 0,
        statusCounts: {},
      },
    );
  }, [returns]);

  const filteredReturns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return returns.filter((returnItem) => {
      const flow = getReturnFlow(returnItem);
      if (filter !== "all" && flow !== filter) return false;
      if (!normalizedSearch) return true;
      return getSearchText(returnItem).includes(normalizedSearch);
    });
  }, [filter, returns, search]);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedReturns = filteredReturns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const workflowSteps = [
    {
      key: "vendor",
      label: "Wait for vendor",
      count: summary.vendor,
      helper: "Seller proof or approval pending",
      icon: Clock3,
      tone: "secondary",
    },
    {
      key: "decision",
      label: "Admin decision",
      count: summary.decision,
      helper: "Compare customer and vendor evidence",
      icon: ShieldCheck,
      tone: "primary",
    },
    {
      key: "refund",
      label: "Refund desk",
      count: summary.refund,
      helper: "Approved cases waiting payment",
      icon: Banknote,
      tone: "primary",
    },
    {
      key: "closed",
      label: "Closed ledger",
      count: summary.closed,
      helper: "Completed and refunded returns",
      icon: CheckCircle2,
      tone: "success",
    },
  ];

  const openDecisionModal = (returnItem) => {
    setDetailReturn(null);
    setRefundReturn(null);
    setDecisionReturn(returnItem);
    setDecisionForm({
      status: returnItem.status === "rejected" ? "rejected" : "approved",
      adminNotes: returnItem.adminNotes || "",
    });
  };

  const openRefundModal = (returnItem) => {
    setDetailReturn(null);
    setDecisionReturn(null);
    setRefundReturn(returnItem);
    setRefundForm({
      refundAmount: String(getReturnAmount(returnItem) || ""),
      refundMethod: getInitialRefundMethod(returnItem),
      adminNotes: returnItem.adminNotes || "",
    });
  };

  const closeDecisionModal = () => {
    if (saving) return;
    setDecisionReturn(null);
  };

  const closeRefundModal = () => {
    if (saving) return;
    setRefundReturn(null);
  };

  const handleDecisionSubmit = async (event) => {
    event.preventDefault();
    if (!decisionReturn) return;

    const note = decisionForm.adminNotes.trim();
    if (decisionForm.status === "rejected" && !note) {
      toast.error("Add a rejection reason before closing the return");
      return;
    }

    if (decisionReturn.vendorResponse === "disputed" && !note) {
      toast.error("Add an admin arbitration note for disputed cases");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Saving admin decision...");

    try {
      await updateReturnStatus(decisionReturn._id, decisionForm.status, note);
      await loadReturns({ silent: true });
      setDecisionReturn(null);
      toast.success(
        decisionForm.status === "approved"
          ? "Return approved. Move it to refund desk."
          : "Return rejected and closed.",
        { id: loadingToast },
      );
    } catch (error) {
      console.error("Failed to update return:", error);
      toast.error("Failed to save admin decision", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const handleRefundSubmit = async (event) => {
    event.preventDefault();
    if (!refundReturn) return;

    const amount = Number(refundForm.refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Processing refund...");

    try {
      if (String(refundReturn.status).toLowerCase() === "approved") {
        await processRefund(refundReturn._id, amount, refundForm.refundMethod);
      } else {
        await updateReturnStatus(refundReturn._id, "completed", refundForm.adminNotes.trim());
      }

      await loadReturns({ silent: true });
      setRefundReturn(null);
      toast.success("Refund workflow completed", { id: loadingToast });
    } catch (error) {
      console.error("Failed to process refund:", error);
      toast.error("Failed to complete refund workflow", { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const copyRefundAccount = async (accountNumber) => {
    if (!accountNumber) return;

    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success("Refund account copied");
    } catch {
      toast.error("Could not copy account number");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Link
                to="/admin"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-primary-50 hover:text-primary-700"
                title="Back to admin dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-sm font-black uppercase text-primary-700">Admin returns</p>
                <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Return resolution center</h1>
                <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
                  Triage vendor responses, arbitrate evidence, process refunds, and keep vendor deductions visible.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadReturns({ silent: true })}
              disabled={refreshing}
              className={softButtonClass}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={RotateCcw}
            label="Total returns"
            value={summary.total.toLocaleString("en-BD")}
            helper={`${filteredReturns.length.toLocaleString("en-BD")} visible with current filters`}
          />
          <MetricTile
            icon={ShieldCheck}
            label="Needs admin"
            value={summary.decision.toLocaleString("en-BD")}
            helper={`${summary.disputed.toLocaleString("en-BD")} disputed by vendor`}
            tone="primary"
          />
          <MetricTile
            icon={Banknote}
            label="Refund exposure"
            value={formatMoney(summary.amount)}
            helper={`${summary.refundReady.toLocaleString("en-BD")} have refund details`}
            tone="secondary"
          />
          <MetricTile
            icon={Store}
            label="Vendor deduction"
            value={formatMoney(summary.vendorDeduction)}
            helper="Estimated deduction for approved or closed returns"
            tone="success"
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Return workflow</h2>
              <p className="text-sm font-medium text-slate-500">
                Start from vendor waiting cases, then decide, refund, and close.
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 hover:text-primary-900"
            >
              Open related orders
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <WorkflowStep
                key={step.key}
                icon={step.icon}
                label={step.label}
                count={step.count}
                helper={step.helper}
                active={filter === step.key}
                tone={step.tone}
                onClick={() => setFilter(step.key)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search return, order, customer, vendor, product, or reason"
                className={`${fieldClass} pl-10`}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    filter === item.key
                      ? "border-primary-500 bg-primary-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>

            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className={`${fieldClass} xl:w-32`}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>
        </section>

        {pagedReturns.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <>
            <section className="grid gap-4 xl:hidden">
              {pagedReturns.map((returnItem) => (
                <ReturnCard
                  key={returnItem._id}
                  returnItem={returnItem}
                  onDecision={openDecisionModal}
                  onRefund={openRefundModal}
                  onDetail={setDetailReturn}
                />
              ))}
            </section>

            <section className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm xl:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Case</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Money</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Flow</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Opened</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedReturns.map((returnItem) => {
                      const flow = getReturnFlow(returnItem);
                      const evidenceCount = getEvidenceCount(returnItem);

                      return (
                        <tr key={returnItem._id} className="align-top transition hover:bg-primary-50/30">
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setDetailReturn(returnItem)}
                              className="font-mono text-sm font-black text-primary-700 hover:text-primary-900"
                            >
                              RET-{shortId(returnItem._id)}
                            </button>
                            <p className="mt-1 line-clamp-2 max-w-xs text-sm font-bold text-slate-950">
                              {returnItem.productTitle || "Return request"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Order {returnItem.orderId ? shortId(returnItem.orderId) : "N/A"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-slate-950">
                              {returnItem.userInfo?.name || returnItem.userId || "Customer"}
                            </p>
                            <p className="mt-1 max-w-[180px] truncate text-xs font-semibold text-slate-500">
                              {returnItem.userInfo?.email || "No email"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {returnItem.userInfo?.phone || "No phone"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {returnItem.vendorId ? (
                              <>
                                <Link
                                  to={`/admin/vendors/${returnItem.vendorId}`}
                                  className="text-sm font-bold text-primary-700 hover:text-primary-900"
                                >
                                  {returnItem.vendorShopName || "Vendor profile"}
                                </Link>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {getVendorResponseLabel(returnItem)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm font-bold text-slate-500">Platform product</p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <p className="max-w-xs text-sm font-bold text-slate-950">
                              {returnItem.reason || "No reason"}
                            </p>
                            <p className="mt-1 line-clamp-2 max-w-xs text-xs font-semibold text-slate-500">
                              {returnItem.description || "No description"}
                            </p>
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700">
                              <ImageIcon className="h-3.5 w-3.5" />
                              {evidenceCount} evidence file{evidenceCount === 1 ? "" : "s"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-black text-slate-950">{formatMoney(getReturnAmount(returnItem))}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Deduct {formatMoney(getVendorDeduction(returnItem))}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <FlowBadge flow={flow} />
                              <StatusBadge status={returnItem.status} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-700">{formatDate(returnItem.createdAt)}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailReturn(returnItem)}
                                className={softButtonClass}
                              >
                                <Eye className="h-4 w-4" />
                                Details
                              </button>
                              <ReturnActionButton
                                returnItem={returnItem}
                                onDecision={openDecisionModal}
                                onRefund={openRefundModal}
                                onDetail={setDetailReturn}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredReturns.length)} of{" "}
                {filteredReturns.length.toLocaleString("en-BD")} returns
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className={softButtonClass}
                >
                  Previous
                </button>
                <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage >= totalPages}
                  className={softButtonClass}
                >
                  Next
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <Modal
        isOpen={Boolean(detailReturn)}
        onClose={() => setDetailReturn(null)}
        title={detailReturn ? `Return RET-${shortId(detailReturn._id)}` : "Return detail"}
        size="xl"
      >
        {detailReturn ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Current flow</p>
                <div className="mt-2">
                  <FlowBadge flow={getReturnFlow(detailReturn)} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Refund amount</p>
                <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(getReturnAmount(detailReturn))}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Vendor deduction</p>
                <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(getVendorDeduction(detailReturn))}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-primary-700" />
                  <h3 className="font-black text-slate-950">Customer and product</h3>
                </div>
                <div className="mt-3">
                  <DetailRow label="Customer" value={detailReturn.userInfo?.name || detailReturn.userId} />
                  <DetailRow label="Email" value={detailReturn.userInfo?.email} />
                  <DetailRow label="Phone" value={detailReturn.userInfo?.phone} />
                  <DetailRow label="Product" value={detailReturn.productTitle} />
                  <DetailRow label="Quantity" value={detailReturn.quantity || 1} />
                  <DetailRow label="Opened" value={formatDate(detailReturn.createdAt)} />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary-700" />
                  <h3 className="font-black text-slate-950">Vendor response</h3>
                </div>
                <div className="mt-3">
                  <DetailRow label="Vendor">
                    {detailReturn.vendorId ? (
                      <Link to={`/admin/vendors/${detailReturn.vendorId}`} className="text-primary-700 hover:text-primary-900">
                        {detailReturn.vendorShopName || detailReturn.vendorId}
                      </Link>
                    ) : (
                      "Platform product"
                    )}
                  </DetailRow>
                  <DetailRow label="Response" value={getVendorResponseLabel(detailReturn)} />
                  <DetailRow label="Response date" value={formatDate(detailReturn.vendorResponseDate)} />
                  <DetailRow label="Vendor note" value={detailReturn.vendorResponseNotes || detailReturn.disputeReason} />
                </div>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <PackageOpen className="h-4 w-4 text-primary-700" />
                  <h3 className="font-black text-slate-950">Customer claim</h3>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-950">{detailReturn.reason || "No reason provided"}</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {detailReturn.description || "No customer description submitted."}
                </p>
                <div className="mt-4">
                  <EvidenceGallery images={detailReturn.images || []} label="Customer evidence" />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary-700" />
                  <h3 className="font-black text-slate-950">Seller proof</h3>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  {detailReturn.disputeReason || detailReturn.vendorResponseNotes || "No seller proof or notes yet."}
                </p>
                <div className="mt-4">
                  <EvidenceGallery images={detailReturn.vendorEvidenceImages || []} label="Vendor evidence" />
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary-700" />
                <h3 className="font-black text-slate-950">Refund destination</h3>
              </div>
              <div className="mt-3">
                <DetailRow label="Method" value={detailReturn.refundMethod || "Not provided"} />
                <DetailRow label="Account">
                  {detailReturn.refundAccountNumber ? (
                    <button
                      type="button"
                      onClick={() => copyRefundAccount(detailReturn.refundAccountNumber)}
                      className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-900"
                    >
                      {detailReturn.refundAccountNumber}
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    "Not provided"
                  )}
                </DetailRow>
                <DetailRow label="Admin notes" value={detailReturn.adminNotes} />
                <DetailRow label="Refund processed" value={formatDate(detailReturn.refundProcessedAt || detailReturn.completedAt)} />
              </div>
            </section>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {getReturnFlow(detailReturn) === "decision" ? (
                <button type="button" onClick={() => openDecisionModal(detailReturn)} className={primaryButtonClass}>
                  <ShieldCheck className="h-4 w-4" />
                  Make decision
                </button>
              ) : null}
              {getReturnFlow(detailReturn) === "refund" ? (
                <button type="button" onClick={() => openRefundModal(detailReturn)} className={primaryButtonClass}>
                  <Banknote className="h-4 w-4" />
                  Process refund
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(decisionReturn)}
        onClose={closeDecisionModal}
        title={decisionReturn ? `Admin decision RET-${shortId(decisionReturn._id)}` : "Admin decision"}
        size="lg"
        closeOnBackdrop={!saving}
      >
        {decisionReturn ? (
          <form onSubmit={handleDecisionSubmit} className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">{decisionReturn.productTitle || "Return request"}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{decisionReturn.reason || "No reason provided"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <FlowBadge flow={getReturnFlow(decisionReturn)} />
                <StatusBadge status={decisionReturn.status} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {DECISION_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = decisionForm.status === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDecisionForm((form) => ({ ...form, status: option.value }))}
                    className={`rounded-lg border p-4 text-left transition ${
                      active
                        ? option.tone === "error"
                          ? "border-error-300 bg-error-50 ring-2 ring-error-100"
                          : "border-primary-300 bg-primary-50 ring-2 ring-primary-100"
                        : "border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/40"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        option.tone === "error" ? "bg-error-100 text-error-700" : "bg-primary-100 text-primary-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-black text-slate-950">{option.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{option.description}</p>
                  </button>
                );
              })}
            </div>

            {decisionReturn.vendorResponse === "disputed" ? (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-primary-700" />
                  <div>
                    <p className="text-sm font-black text-primary-900">Vendor disputed this return</p>
                    <p className="mt-1 text-sm font-semibold text-primary-700">
                      Review customer images, vendor evidence, and write the final admin reason.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Admin note {decisionForm.status === "rejected" || decisionReturn.vendorResponse === "disputed" ? "*" : ""}
              </span>
              <textarea
                value={decisionForm.adminNotes}
                onChange={(event) => setDecisionForm((form) => ({ ...form, adminNotes: event.target.value }))}
                rows={4}
                className={`${fieldClass} mt-1 min-h-28`}
                placeholder="Explain the decision clearly for customer, vendor, and support history."
              />
            </label>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeDecisionModal} disabled={saving} className={softButtonClass}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={decisionForm.status === "rejected" ? errorButtonClass : primaryButtonClass}
              >
                {decisionForm.status === "rejected" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {saving ? "Saving..." : decisionForm.status === "rejected" ? "Reject return" : "Approve return"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(refundReturn)}
        onClose={closeRefundModal}
        title={refundReturn ? `Refund RET-${shortId(refundReturn._id)}` : "Process refund"}
        size="lg"
        closeOnBackdrop={!saving}
      >
        {refundReturn ? (
          <form onSubmit={handleRefundSubmit} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Approved refund</p>
                <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(getReturnAmount(refundReturn))}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Vendor deduction</p>
                <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(getVendorDeduction(refundReturn))}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                <div className="mt-2">
                  <StatusBadge status={refundReturn.status} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
              <div className="flex items-start gap-3">
                <Banknote className="mt-0.5 h-5 w-5 text-primary-700" />
                <div>
                  <p className="text-sm font-black text-primary-900">Refund destination</p>
                  <p className="mt-1 text-sm font-semibold text-primary-700">
                    {refundReturn.refundMethod || "No method"}{" "}
                    {refundReturn.refundAccountNumber ? `- ${refundReturn.refundAccountNumber}` : "- account not provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Refund amount *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundForm.refundAmount}
                  onChange={(event) => setRefundForm((form) => ({ ...form, refundAmount: event.target.value }))}
                  className={`${fieldClass} mt-1`}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Refund method</span>
                <select
                  value={refundForm.refundMethod}
                  onChange={(event) => setRefundForm((form) => ({ ...form, refundMethod: event.target.value }))}
                  className={`${fieldClass} mt-1`}
                >
                  {REFUND_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {String(refundReturn.status).toLowerCase() !== "approved" ? (
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Completion note</span>
                <textarea
                  rows={3}
                  value={refundForm.adminNotes}
                  onChange={(event) => setRefundForm((form) => ({ ...form, adminNotes: event.target.value }))}
                  className={`${fieldClass} mt-1`}
                  placeholder="Use this when payment was already completed outside the system."
                />
              </label>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeRefundModal} disabled={saving} className={softButtonClass}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                <Banknote className="h-4 w-4" />
                {saving ? "Processing..." : "Confirm refund"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
