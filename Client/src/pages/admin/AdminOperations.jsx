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
  Loader2,
  Mail,
  RefreshCcw,
  Server,
  ShieldAlert,
  Ticket,
  UploadCloud,
} from "lucide-react";
import { getAdminOperationsOverview } from "../../services/api";

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
  },
  jobMonitors: [],
  notificationHealth: {
    deliveriesInWindow: 0,
    failedDeliveries: 0,
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

const issueFilters = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "payment", label: "Payments" },
  { value: "webhook", label: "Webhooks" },
  { value: "notification", label: "Notifications" },
  { value: "newsletter", label: "Newsletter" },
  { value: "bulk_upload", label: "Bulk uploads" },
  { value: "support", label: "Support" },
  { value: "return_dispute", label: "Returns" },
];

const statusStyles = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  running: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  idle: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  low: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  watch: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  medium: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  queued: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  failed: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
};

const typeIcons = {
  payment: CreditCard,
  webhook: Server,
  notification: Bell,
  newsletter: Mail,
  bulk_upload: UploadCloud,
  support: Ticket,
  return_dispute: RefreshCcw,
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-900">
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
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
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

  const metrics = operations.metrics || emptyOperations.metrics;
  const health = operations.health || emptyOperations.health;
  const notificationHealth = operations.notificationHealth || emptyOperations.notificationHealth;

  const metricCards = [
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
    const issues = operations.issueQueues || [];
    if (issueFilter === "all") return issues;
    if (issueFilter === "critical") {
      return issues.filter((issue) => issue.severity === "critical");
    }
    return issues.filter((issue) => issue.type === issueFilter);
  }, [issueFilter, operations.issueQueues]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-orange-600 dark:text-orange-300">
              <Activity className="h-4 w-4" />
              Operational visibility
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Operations Command Center</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Last updated {formatDateTime(operations.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {windowOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setWindowHours(option.value)}
                  className={`min-h-10 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
                    windowHours === option.value
                      ? "bg-orange-600 text-white"
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
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
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

        <section className={`rounded-xl border p-5 shadow-sm ${getStatusClass(health.status)}`}>
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white shadow-inner dark:bg-slate-950">
                <span className="text-3xl font-black text-slate-950 dark:text-white">{loading ? "..." : health.score}</span>
                <span className="absolute bottom-5 text-[10px] font-bold uppercase text-slate-500">score</span>
              </div>
              <div className="lg:hidden">
                <StatusPill status={health.status} />
              </div>
            </div>
            <div>
              <div className="hidden lg:block">
                <StatusPill status={health.status} />
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{health.message}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {formatCount(health.critical)} critical signals and {formatCount(health.warnings)} warning signals in the selected window.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/70 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
              <Clock3 className="h-4 w-4" />
              Window: {operations.windowHours || windowHours}h
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((card) => (
            <MetricCard key={card.label} {...card} loading={loading} />
          ))}
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
                    {issueFilters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setIssueFilter(filter.value)}
                        className={`min-h-10 shrink-0 rounded-full border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
                          issueFilter === filter.value
                            ? "border-orange-600 bg-orange-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
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
                <Bell className="h-5 w-5 text-orange-600 dark:text-orange-300" />
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
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Recent Audit Trail</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest sensitive admin actions</p>
                </div>
                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-300" />
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
