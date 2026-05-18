import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getAdminAuditLogs } from "../../services/api";
import {
  auditModuleOptions,
  auditSeverityOptions,
  filterAuditLogs,
  formatAuditTime,
  normalizeAuditLog,
  summarizeAuditLogs,
} from "../../utils/adminAuditLog";

const defaultFilters = {
  search: "",
  module: "all",
  severity: "all",
  targetType: "all",
  action: "",
  from: "",
  to: "",
};

const targetTypes = [
  { value: "all", label: "All targets" },
  { value: "vendor", label: "Vendor" },
  { value: "product", label: "Product" },
  { value: "order", label: "Order" },
  { value: "return", label: "Return" },
  { value: "payout", label: "Payout" },
  { value: "ticket", label: "Ticket" },
  { value: "user", label: "User" },
];

const severityStyles = {
  critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
};

const moduleStyles = {
  finance: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  logistics: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200",
  platform: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200",
  products: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200",
  vendors: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-200",
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");

const safeJson = (value) => {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
};

function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${severityStyles[severity] || severityStyles.ok}`}>
      {severity || "ok"}
    </span>
  );
}

function ModuleBadge({ module }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${moduleStyles[module] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
      {String(module || "system").replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatNumber(value)}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone] || tones.slate}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function AuditRow({ log, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(log)}
      className="grid w-full grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr_0.7fr] items-center gap-4 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-orange-50/60 focus:bg-orange-50 focus:outline-none dark:border-slate-800 dark:hover:bg-orange-950/20 dark:focus:bg-orange-950/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{log.action}</p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{log.target.path || log.request.path || "No request path"}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{log.actor.email || log.actor.name || "System"}</p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{log.actor.role || log.actor.id || "No actor role"}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{log.target.type || "resource"}</p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{log.target.id || log.target.name || "No target id"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ModuleBadge module={log.module} />
        <SeverityBadge severity={log.severity} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatAuditTime(log.createdAt)}</span>
        <Eye className="h-4 w-4 shrink-0 text-slate-400" />
      </div>
    </button>
  );
}

function AuditMobileCard({ log, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(log)}
      className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{log.action}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{formatAuditTime(log.createdAt)}</p>
        </div>
        <SeverityBadge severity={log.severity} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ModuleBadge module={log.module} />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {log.target.type || "resource"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-semibold text-slate-500 dark:text-slate-400">Actor</p>
          <p className="mt-1 truncate font-bold text-slate-800 dark:text-slate-100">{log.actor.email || log.actor.name || "System"}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-500 dark:text-slate-400">Target</p>
          <p className="mt-1 truncate font-bold text-slate-800 dark:text-slate-100">{log.target.id || log.target.name || "No target"}</p>
        </div>
      </div>
    </button>
  );
}

function DetailDrawer({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40">
      <button type="button" className="hidden flex-1 cursor-default lg:block" onClick={onClose} aria-label="Close audit detail" />
      <aside className="flex h-full w-full flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-xl" aria-label="Audit log detail">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-300">Audit Evidence</p>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-950 dark:text-white">{log.action}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatAuditTime(log.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close audit detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <ModuleBadge module={log.module} />
            <SeverityBadge severity={log.severity} />
            {log.request.statusCode ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                HTTP {log.request.statusCode}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Actor</p>
              <p className="mt-2 font-semibold text-slate-950 dark:text-white">{log.actor.email || log.actor.name || "System"}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{log.actor.role || log.actor.id || "No role captured"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Target</p>
              <p className="mt-2 font-semibold text-slate-950 dark:text-white">{log.target.type || "Resource"}</p>
              <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">{log.target.id || log.target.name || "No target captured"}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Request</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <p><span className="font-semibold">Method:</span> {log.request.method || "N/A"}</p>
              <p className="break-all"><span className="font-semibold">Path:</span> {log.request.path || log.target.path || "N/A"}</p>
              <p><span className="font-semibold">IP:</span> {log.request.ip || "N/A"}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">Metadata</p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{safeJson(log.metadata)}</pre>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">Diff</p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{safeJson(log.diff)}</pre>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState(defaultFilters);
  const [query, setQuery] = useState({ ...defaultFilters, page: 1 });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadAuditLogs = async () => {
      setLoading(true);
      try {
        const response = await getAdminAuditLogs({ ...query, limit: 25 });
        if (cancelled) return;
        const payload = response.data.data || {};
        const normalized = (payload.logs || []).map(normalizeAuditLog);
        setLogs(normalized);
        setSummary(payload.summary || summarizeAuditLogs(normalized));
        setPagination(payload.pagination || { page: query.page, total: normalized.length, totalPages: 1 });
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.error || "Failed to load audit logs");
          setLogs([]);
          setSummary(summarizeAuditLogs([]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const visibleLogs = useMemo(() => filterAuditLogs(logs, {}), [logs]);
  const cards = summary || summarizeAuditLogs(visibleLogs);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setSelectedLog(null);
    setQuery({ ...filters, page: 1 });
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setQuery({ ...defaultFilters, page: 1 });
    setSelectedLog(null);
  };

  const changePage = (nextPage) => {
    setQuery((current) => ({ ...current, page: Math.max(1, nextPage) }));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-orange-600">
                <FileClock className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Audit Logs</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Unified evidence trail for staff actions, moderation, payouts, platform changes, and high-risk workflows.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQuery((current) => ({ ...current }))}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Events" value={cards.total || pagination.total} detail="Matching current filters" icon={Database} tone="slate" />
          <MetricCard label="Critical Events" value={cards.criticalCount ?? cards.critical} detail="Failed or destructive actions" icon={AlertTriangle} tone="rose" />
          <MetricCard label="Warnings" value={cards.warningCount ?? cards.warning} detail="Overrides, refunds, rejects" icon={Filter} tone="amber" />
          <MetricCard label="Sensitive Actions" value={cards.sensitiveCount ?? cards.sensitive} detail="Finance, access, or control changes" icon={ShieldCheck} tone="blue" />
        </section>

        <form onSubmit={applyFilters} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="relative md:col-span-2 xl:col-span-2">
              <span className="sr-only">Search audit logs</span>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search actor, target, action, IP..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <select
              value={filters.module}
              onChange={(event) => updateFilter("module", event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              aria-label="Filter audit module"
            >
              {auditModuleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filters.severity}
              onChange={(event) => updateFilter("severity", event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              aria-label="Filter audit severity"
            >
              {auditSeverityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={filters.targetType}
              onChange={(event) => updateFilter("targetType", event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              aria-label="Filter audit target type"
            >
              {targetTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              type="search"
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
              placeholder="Action contains"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                aria-label="Audit start date"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                aria-label="Audit end date"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Clear
              </button>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <Filter className="h-4 w-4" />
                Apply Filters
              </button>
            </div>
          </div>
        </form>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Event Stream</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Showing {formatNumber(visibleLogs.length)} of {formatNumber(pagination.total || visibleLogs.length)} events
              </p>
            </div>
            {loading ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Loading
              </span>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr_0.7fr] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <span>Action</span>
              <span>Actor</span>
              <span>Target</span>
              <span>Class</span>
              <span>Time</span>
            </div>
            {visibleLogs.length ? (
              visibleLogs.map((log) => <AuditRow key={log.id || `${log.action}-${log.createdAt}`} log={log} onSelect={setSelectedLog} />)
            ) : (
              <div className="p-10 text-center">
                <FileClock className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-bold text-slate-950 dark:text-white">No audit events found</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try clearing filters or widening the date range.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 p-4 lg:hidden">
            {visibleLogs.length ? (
              visibleLogs.map((log) => <AuditMobileCard key={log.id || `${log.action}-${log.createdAt}`} log={log} onSelect={setSelectedLog} />)
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <FileClock className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-bold text-slate-950 dark:text-white">No audit events found</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try clearing filters or widening the date range.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Page {formatNumber(pagination.page || query.page)} of {formatNumber(pagination.totalPages || 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => changePage((pagination.page || query.page) - 1)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => changePage((pagination.page || query.page) + 1)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <DetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
