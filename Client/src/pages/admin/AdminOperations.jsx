import { createElement, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  FileCheck2,
  Loader2,
  Mail,
  PackageSearch,
  RefreshCcw,
  Server,
  ShieldAlert,
  Star,
  Store,
  Ticket,
  UploadCloud,
  Wallet,
} from "lucide-react";
import { auth } from "../../firebase/firebase.config";
import RoleWorkflowPanel from "../../components/workflow/RoleWorkflowPanel";
import { getAdminOperationsOverview, retryNotificationDelivery } from "../../services/api";
import { subscribeRealtime } from "../../services/realtime";
import {
  adminIssueFilters,
  filterOperationIssues,
  formatQueueCurrency,
  getQueueSummary,
  getQueueTone,
} from "../../utils/adminOperationsCenter";
import { buildAdminWorkflow } from "../../utils/roleWorkflowCenter";

const emptyOperations = {
  updatedAt: null,
  windowHours: 24,
  health: {
    score: 100,
    status: "healthy",
    critical: 0,
    warnings: 0,
    message: "Core operations are within normal thresholds.",
  },
  metrics: {
    failedPayments: 0,
    webhookFailures: 0,
    failedNotifications: 0,
    failedNewsletterBroadcasts: 0,
    failedNewsletterRecipients: 0,
    failedBulkJobs: 0,
    processingBulkJobs: 0,
    openSupportTickets: 0,
    returnDisputes: 0,
    auditServerErrors: 0,
    openAdminQueueItems: 0,
    queueSlaBreaches: 0,
    queueWarningQueues: 0,
    payoutExposure: 0,
  },
  queueWorkload: [],
  jobMonitors: [],
  notificationHealth: {
    deliveriesInWindow: 0,
    failedDeliveries: 0,
    failedDeliveryItems: [],
    recentNotifications: [],
    broadcasts: { total: 0, queued: 0, sent: 0, failed: 0 },
    newsletter: {
      total: 0,
      scheduled: 0,
      sending: 0,
      failedBroadcasts: 0,
      failedRecipients: 0,
    },
  },
  issueQueues: [],
  recentAuditLogs: [],
};

const windowOptions = [
  { value: 24, label: "24h" },
  { value: 72, label: "72h" },
  { value: 168, label: "7d" },
];

const adminSurface =
  "rounded-lg border border-[#E0E0E0] bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";

const statusStyles = {
  healthy: "border-[#00B14F]/25 bg-[#E9FFF3] text-[#007A38] dark:border-[#00B14F]/40 dark:bg-[#00B14F]/10 dark:text-[#7DFFB9]",
  running: "border-[#00B14F]/25 bg-[#E9FFF3] text-[#007A38] dark:border-[#00B14F]/40 dark:bg-[#00B14F]/10 dark:text-[#7DFFB9]",
  sent: "border-[#00B14F]/25 bg-[#E9FFF3] text-[#007A38] dark:border-[#00B14F]/40 dark:bg-[#00B14F]/10 dark:text-[#7DFFB9]",
  idle: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  low: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  watch: "border-[#1e7098]/25 bg-[#eef8fb] text-[#1a6387] dark:border-[#1e7098]/40 dark:bg-[#1e7098]/10 dark:text-primary-200",
  medium: "border-[#1e7098]/25 bg-[#eef8fb] text-[#1a6387] dark:border-[#1e7098]/40 dark:bg-[#1e7098]/10 dark:text-primary-200",
  queued: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  failed: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
};

const getHealthPresentation = (health) => {
  const status = String(health.status || "healthy").toLowerCase();
  const critical = Number(health.critical || 0);
  const warnings = Number(health.warnings || 0);

  if (status === "critical" || critical > 0) {
    return {
      title: "Marketplace needs attention",
      detail: "Review critical queues first, then clear warning signals for this window.",
      accent: "bg-rose-500",
      scoreText: "text-rose-700 dark:text-rose-200",
      panel: "border-rose-200 bg-rose-50/80 dark:border-rose-900/70 dark:bg-rose-950/20",
    };
  }

  if (status === "watch" || status === "medium" || warnings > 0) {
    return {
      title: "Marketplace is under watch",
      detail: "A few signals need follow-up before they become customer-facing issues.",
      accent: "bg-[#1e7098]",
      scoreText: "text-[#1a6387] dark:text-primary-200",
      panel: "border-[#1e7098]/25 bg-[#eef8fb] dark:border-[#1e7098]/40 dark:bg-[#1e7098]/10",
    };
  }

  return {
    title: "Marketplace is running smoothly",
    detail: "Core operations are inside the expected range for the selected window.",
    accent: "bg-[#00B14F]",
    scoreText: "text-[#007A38] dark:text-[#7DFFB9]",
    panel: "border-[#00B14F]/25 bg-[#E9FFF3] dark:border-[#00B14F]/40 dark:bg-[#00B14F]/10",
  };
};

const typeIcons = {
  vendor_approval: Store,
  kyc_review: FileCheck2,
  product_moderation: PackageSearch,
  review_moderation: Star,
  payment: CreditCard,
  webhook: Server,
  notification: Bell,
  newsletter: Mail,
  bulk_upload: UploadCloud,
  support: Ticket,
  return_dispute: RefreshCcw,
  payout: Wallet,
  server_error: ShieldAlert,
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-US");

const formatDateTime = (value) => {
  if (!value) return "No signal";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatAge = (value) => {
  if (!value) return "No timestamp";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const getStatusClass = (status) =>
  statusStyles[String(status || "").toLowerCase()] || statusStyles.low;

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${getStatusClass(status)}`}>
      {String(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({ label, value, detail, icon, tone = "slate", loading }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {loading ? "..." : formatCount(value)}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
    </div>
  );
}

function JobCard({ job }) {
  const failures = Number(job.failures || 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{job.label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{job.schedule}</p>
        </div>
        <StatusPill status={job.status} />
      </div>
      <p className="mt-4 min-h-10 text-sm text-slate-600 dark:text-slate-300">{job.detail}</p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          Last signal: {formatDateTime(job.lastSignalAt)}
        </span>
        <span className={`font-bold ${failures ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
          {formatCount(failures)} failures
        </span>
      </div>
    </div>
  );
}

function QueueWorkloadCard({ queue }) {
  const tone = getQueueTone(queue);
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
  };

  return (
    <Link
      to={queue.path || "/admin/operations"}
      className={`block rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone] || toneClasses.emerald}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{queue.label}</p>
          <p className="mt-1 text-xs font-semibold opacity-75">{queue.owner}</p>
        </div>
        <StatusPill status={queue.status || "clear"} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/70 px-2 py-2 dark:bg-slate-950/40">
          <p className="text-lg font-black">{formatCount(queue.count)}</p>
          <p className="text-[10px] font-bold uppercase opacity-70">Open</p>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-2 dark:bg-slate-950/40">
          <p className="text-lg font-black">{formatCount(queue.breached)}</p>
          <p className="text-[10px] font-bold uppercase opacity-70">SLA</p>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-2 dark:bg-slate-950/40">
          <p className="text-lg font-black">{formatCount(queue.highRiskCount)}</p>
          <p className="text-[10px] font-bold uppercase opacity-70">Risk</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm opacity-80">{queue.detail}</p>
      {Number(queue.amount || 0) > 0 ? (
        <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs font-bold dark:bg-slate-950/40">
          Exposure: BDT {formatQueueCurrency(queue.amount)}
        </p>
      ) : null}
    </Link>
  );
}

function IssueRow({ issue }) {
  const Icon = typeIcons[issue.type] || AlertTriangle;

  return (
    <div className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-0 dark:border-slate-800 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 gap-3">
        <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${issue.severity === "critical" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{issue.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{issue.detail}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatusPill status={issue.status || issue.severity} />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {issue.owner}
        </span>
        <span className="font-semibold text-slate-500 dark:text-slate-400">{formatAge(issue.at)}</span>
      </div>
      {issue.path ? (
        <Link
          to={issue.path}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-800 dark:hover:bg-primary-900/30 dark:hover:text-primary-200"
        >
          Open
        </Link>
      ) : null}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export default function AdminOperations() {
  const [windowHours, setWindowHours] = useState(24);
  const [operations, setOperations] = useState(emptyOperations);
  const [issueFilter, setIssueFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [error, setError] = useState("");
  const [retryingDeliveryId, setRetryingDeliveryId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOperations = async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        const response = await getAdminOperationsOverview({ windowHours });
        if (!cancelled) {
          setOperations(response.data?.data || emptyOperations);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Failed to load operations overview");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadOperations();
    const interval = window.setInterval(() => loadOperations({ silent: true }), 45000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [windowHours, refreshNonce]);

  useEffect(() => {
    let unsubscribers = [];
    let cancelled = false;

    const connect = async () => {
      const token = await auth.currentUser?.getIdToken?.();
      if (!token || cancelled) return;
      unsubscribers = ["admin:operations", "marketplace:events"].map((channel) =>
        subscribeRealtime({
          token,
          channel,
          onEvent: () => setRefreshNonce((value) => value + 1),
        }),
      );
    };

    connect();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const handleRetryNotification = async (deliveryId) => {
    if (!deliveryId) return;
    try {
      setRetryingDeliveryId(deliveryId);
      await retryNotificationDelivery(deliveryId);
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to retry notification delivery");
    } finally {
      setRetryingDeliveryId("");
    }
  };

  const metrics = operations.metrics || emptyOperations.metrics;
  const health = operations.health || emptyOperations.health;
  const notificationHealth = operations.notificationHealth || emptyOperations.notificationHealth;
  const queueWorkload = operations.queueWorkload || [];
  const queueSummary = useMemo(() => getQueueSummary(queueWorkload), [queueWorkload]);
  const healthPresentation = useMemo(() => getHealthPresentation(health), [health]);
  const adminWorkflow = useMemo(
    () =>
      buildAdminWorkflow({
        queueSummary,
        metrics,
        health,
        notificationHealth,
        jobMonitors: operations.jobMonitors || [],
      }),
    [health, metrics, notificationHealth, operations.jobMonitors, queueSummary],
  );

  const metricCards = [
    {
      label: "Admin Queue Items",
      value: metrics.openAdminQueueItems || queueSummary.totalOpen,
      detail: `${formatCount(metrics.queueSlaBreaches || queueSummary.slaBreached)} SLA breaches`,
      icon: Activity,
      tone: (metrics.queueSlaBreaches || queueSummary.slaBreached) ? "rose" : queueSummary.totalOpen ? "amber" : "emerald",
    },
    {
      label: "Webhook Failures",
      value: metrics.webhookFailures,
      detail: "Payment/API failures in window",
      icon: Server,
      tone: metrics.webhookFailures ? "rose" : "emerald",
    },
    {
      label: "Notification Failures",
      value: metrics.failedNotifications + metrics.failedNewsletterRecipients,
      detail: "Push, in-app, and email issues",
      icon: Bell,
      tone: metrics.failedNotifications || metrics.failedNewsletterRecipients ? "amber" : "emerald",
    },
    {
      label: "Open Support",
      value: metrics.openSupportTickets,
      detail: "Open or in-progress tickets",
      icon: Ticket,
      tone: metrics.openSupportTickets ? "amber" : "emerald",
    },
    {
      label: "Return Disputes",
      value: metrics.returnDisputes,
      detail: "Vendor/customer arbitration queue",
      icon: RefreshCcw,
      tone: metrics.returnDisputes ? "amber" : "emerald",
    },
    {
      label: "Bulk Job Failures",
      value: metrics.failedBulkJobs,
      detail: `${formatCount(metrics.processingBulkJobs)} currently processing`,
      icon: UploadCloud,
      tone: metrics.failedBulkJobs ? "rose" : "emerald",
    },
  ];

  const filteredIssues = useMemo(() => {
    return filterOperationIssues(operations.issueQueues || [], issueFilter);
  }, [issueFilter, operations.issueQueues]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-3 py-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className={`${adminSurface} flex flex-col gap-4 border-t-4 border-t-[#1e7098] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#1a6387] dark:text-primary-200">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef8fb] text-[#1e7098] dark:bg-[#1e7098]/10">
                <Activity className="h-4 w-4" />
              </span>
              Amiyo-Go operations
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white">Operations Command Center</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Last updated {formatDateTime(operations.updatedAt)}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
              <span>{formatAge(operations.updatedAt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#E0E0E0] bg-[#F5F5F5] p-1 dark:border-slate-800 dark:bg-slate-950">
              {windowOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setWindowHours(option.value)}
                  className={`min-h-10 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25 ${
                    windowHours === option.value
                      ? "bg-[#1e7098] text-white shadow-sm shadow-primary-200/70"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRefreshNonce((value) => value + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#1e7098]/50 hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#1e7098]/50 dark:hover:bg-[#1e7098]/10 dark:hover:text-primary-200"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <section className={`${adminSurface} overflow-hidden`}>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className={`border-b p-5 dark:border-slate-800 lg:border-b-0 lg:border-r ${healthPresentation.panel}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <StatusPill status={health.status} />
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-[#1A1A2E] dark:text-white">
                    {loading ? "Checking marketplace operations" : healthPresentation.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {loading ? "Loading the latest admin signals and queue health." : healthPresentation.detail}
                  </p>
                  {health.message ? (
                    <p className="mt-3 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
                      System note: {health.message}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Health score</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className={`text-4xl font-black leading-none ${healthPresentation.scoreText}`}>
                      {loading ? "..." : formatCount(health.score)}
                    </span>
                    <span className="pb-1 text-sm font-bold text-slate-500">/100</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#EEEEEE] dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${healthPresentation.accent}`}
                      style={{ width: `${Math.min(100, Math.max(0, Number(health.score || 0)))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#E0E0E0] bg-white dark:divide-slate-800 dark:bg-slate-900">
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Critical</p>
                <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-300">{loading ? "..." : formatCount(health.critical)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">signals</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Warnings</p>
                <p className="mt-2 text-2xl font-black text-[#1a6387] dark:text-primary-200">{loading ? "..." : formatCount(health.warnings)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">signals</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Window</p>
                <p className="mt-2 flex items-center gap-1 text-2xl font-black text-[#1A1A2E] dark:text-white">
                  <Clock3 className="h-4 w-4 text-[#1e7098]" />
                  {operations.windowHours || windowHours}h
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">selected</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {metricCards.map((card) => (
            <MetricCard key={card.label} {...card} loading={loading} />
          ))}
        </section>

        <RoleWorkflowPanel workflow={adminWorkflow} />

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Marketplace Queue Workload</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {formatCount(queueSummary.totalOpen)} open items, {formatCount(queueSummary.slaBreached)} SLA breaches, BDT {formatQueueCurrency(queueSummary.payoutExposure)} exposure.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                {formatCount(queueSummary.criticalQueues)} critical
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                {formatCount(queueSummary.watchQueues)} watch
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                {formatCount(queueSummary.clearQueues)} clear
              </span>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-48" />
              ))}
            </div>
          ) : queueWorkload.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {queueWorkload.map((queue) => (
                <QueueWorkloadCard key={queue.key} queue={queue} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-3 text-base font-bold text-slate-950 dark:text-white">No queue workload available</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Operations data will appear after the next admin overview sync.</p>
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Cron And Queue Monitors</h2>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{formatCount(operations.jobMonitors?.length)} monitors</span>
              </div>
              {loading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-40" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {(operations.jobMonitors || []).map((job) => (
                    <JobCard key={job.key} job={job} />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white">Issue Queue</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {formatCount(filteredIssues.length)} visible issues
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {adminIssueFilters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setIssueFilter(filter.value)}
                        className={`min-h-10 shrink-0 rounded-full border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
                          issueFilter === filter.value
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-800 dark:hover:bg-primary-900/30 dark:hover:text-primary-200"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-16" />
                  ))}
                </div>
              ) : filteredIssues.length ? (
                <div>
                  {filteredIssues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-300" />
                  <p className="mt-3 text-base font-bold text-slate-950 dark:text-white">No issues in this filter</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The selected operational queue is clear.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Notification Health</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Delivery and broadcast signals</p>
                </div>
                <Bell className="h-5 w-5 text-primary-600 dark:text-primary-300" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Deliveries</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCount(notificationHealth.deliveriesInWindow)}</p>
                  <p className="text-sm text-rose-600 dark:text-rose-300">{formatCount(notificationHealth.failedDeliveries)} failed</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Broadcasts</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCount(notificationHealth.broadcasts?.total)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatCount(notificationHealth.broadcasts?.queued)} queued, {formatCount(notificationHealth.broadcasts?.failed)} failed
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Newsletter</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-950 dark:text-white">{formatCount(notificationHealth.newsletter?.scheduled)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-950 dark:text-white">{formatCount(notificationHealth.newsletter?.sending)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-rose-600 dark:text-rose-300">{formatCount(notificationHealth.newsletter?.failedBroadcasts)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Broadcast fails</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-rose-600 dark:text-rose-300">{formatCount(notificationHealth.newsletter?.failedRecipients)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Recipient fails</p>
                    </div>
                  </div>
                </div>
              </div>
              {(notificationHealth.failedDeliveryItems || []).length ? (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white">Failed Delivery Retry</h3>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {(notificationHealth.failedDeliveryItems || []).length} latest
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(notificationHealth.failedDeliveryItems || []).slice(0, 4).map((delivery) => {
                      const deliveryId = String(delivery._id || delivery.id || "");
                      return (
                        <div key={deliveryId} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                              {delivery.title || delivery.notificationType || "Notification"}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-rose-600 dark:text-rose-300">
                              {delivery.error || delivery.reason || delivery.channel || "Delivery failed"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRetryNotification(deliveryId)}
                            disabled={retryingDeliveryId === deliveryId}
                            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
                          >
                            {retryingDeliveryId === deliveryId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                            Retry
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Recent Audit Trail</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest sensitive admin actions</p>
                </div>
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-300" />
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-14" />
                  ))}
                </div>
              ) : operations.recentAuditLogs?.length ? (
                <div className="space-y-3">
                  {operations.recentAuditLogs.slice(0, 10).map((log) => (
                    <div key={log._id || `${log.action}-${log.createdAt}`} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-bold text-slate-800 dark:text-slate-100">{log.action || "Admin action"}</p>
                        <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{formatAge(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {log.actor?.email || log.actor?.role || "system"} - {log.target?.path || log.target?.type || "platform"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 px-4 py-8 text-center dark:bg-slate-950">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No audit entries available.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
