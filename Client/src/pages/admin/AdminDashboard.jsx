import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  Box,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileCheck2,
  Filter,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import { getAdminDashboardOverview } from "../../services/api";

const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "custom", label: "Custom" },
];

const emptyDashboard = {
  updatedAt: null,
  kpis: {
    todayGmv: 0,
    todayOrders: 0,
    totalOrders: 0,
    newUsers: 0,
    newVendors: 0,
    pendingPayouts: 0,
    activeDisputes: 0,
    cancellationRate: 0,
  },
  revenueTotals: { gmv: 0, commission: 0, refunds: 0 },
  revenueSeries: [],
  orderFunnel: [],
  activityFeed: [],
  healthAlerts: [],
  topVendors: [],
  topProductsToday: [],
  pendingActions: {
    vendorApprovals: 0,
    productModeration: 0,
    payoutRequests: 0,
    returnDisputes: 0,
    kycReviews: 0,
  },
};

const pendingActionLinks = [
  {
    key: "vendorApprovals",
    label: "Vendor approvals",
    path: "/admin/vendor-requests",
    icon: Store,
  },
  {
    key: "productModeration",
    label: "Product moderation",
    path: "/admin/vendor-activity",
    icon: PackageSearch,
  },
  {
    key: "payoutRequests",
    label: "Payout requests",
    path: "/admin/payout-requests",
    icon: CreditCard,
  },
  {
    key: "returnDisputes",
    label: "Return disputes",
    path: "/admin/returns",
    icon: RefreshCcw,
  },
  {
    key: "kycReviews",
    label: "KYC reviews",
    path: "/admin/vendor-requests",
    icon: FileCheck2,
  },
];

const activityStyles = {
  order: "bg-sky-50 text-sky-700",
  vendor: "bg-emerald-50 text-emerald-700",
  product: "bg-amber-50 text-amber-700",
  payment: "bg-rose-50 text-rose-700",
};

const compactNumber = (value) => {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000000) return `${(number / 10000000).toFixed(1)}Cr`;
  if (Math.abs(number) >= 100000) return `${(number / 100000).toFixed(1)}L`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}k`;
  return `${Math.round(number)}`;
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-US");

const formatDateTime = (value) => {
  if (!value) return "Not updated";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getHealthTone = (severity) => {
  if (severity === "high") return "border-rose-200 bg-rose-50 text-rose-800";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
};

const getActivityIcon = (type) => {
  if (type === "vendor") return Store;
  if (type === "product") return Box;
  if (type === "payment") return ShieldAlert;
  return ShoppingCart;
};

function KpiCard({ label, value, detail, icon, tone = "sky", loading }) {
  const IconComponent = icon;
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-950">
            {loading ? "..." : value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tones[tone]}`}>
          <IconComponent className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PendingAction({ item, count }) {
  const Icon = item.icon;
  const hasCount = Number(count || 0) > 0;

  return (
    <Link
      to={item.path}
      className="flex min-w-[190px] items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`rounded-lg p-2 ${hasCount ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
      </div>
      <span className={`ml-3 rounded-full px-2 py-0.5 text-xs font-bold ${hasCount ? "bg-rose-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>
        {hasCount ? formatCount(count) : "0"}
      </span>
    </Link>
  );
}

function ChartTooltip({ active, payload, label, formatPrice }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-bold text-slate-900">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span style={{ color: entry.color }} className="font-semibold capitalize">
              {entry.name}
            </span>
            <span className="font-bold text-slate-900">{formatPrice(entry.value || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SortButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [vendorSort, setVendorSort] = useState("gmv");
  const [vendorFilter, setVendorFilter] = useState("");

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) return;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = { range };
        if (range === "custom") {
          if (customStart) params.start = customStart;
          if (customEnd) params.end = customEnd;
        }

        const response = await getAdminDashboardOverview(params);
        setDashboard(response.data.data || emptyDashboard);
        setError("");
      } catch (fetchError) {
        console.error("Failed to load admin dashboard:", fetchError);
        setError(fetchError?.response?.data?.error || "Failed to load admin dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [customEnd, customStart, range, user],
  );

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const kpis = dashboard.kpis || emptyDashboard.kpis;
  const pendingActions = dashboard.pendingActions || emptyDashboard.pendingActions;
  const totalPendingActions = Object.values(pendingActions).reduce((sum, value) => sum + Number(value || 0), 0);

  const sortedVendors = useMemo(() => {
    const query = vendorFilter.trim().toLowerCase();
    return [...(dashboard.topVendors || [])]
      .filter((vendor) => !query || vendor.vendorName?.toLowerCase().includes(query))
      .sort((a, b) => Number(b[vendorSort] || 0) - Number(a[vendorSort] || 0));
  }, [dashboard.topVendors, vendorFilter, vendorSort]);

  const funnelMax = Math.max(...(dashboard.orderFunnel || []).map((item) => item.count), 1);
  const activeAlerts = dashboard.healthAlerts || [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Updated {formatDateTime(dashboard.updatedAt)}
                </span>
                {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-950 lg:text-3xl">Admin Dashboard</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Platform health, revenue, order flow, vendor performance, and pending action queues in one view.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[440px]">
              <div className="flex flex-wrap gap-2">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      range === option.value
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => loadDashboard({ silent: true })}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              {range === "custom" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="Today's GMV"
            value={formatPrice(kpis.todayGmv)}
            detail={`${formatCount(kpis.todayOrders)} order${Number(kpis.todayOrders) === 1 ? "" : "s"} today`}
            icon={CircleDollarSign}
            tone="emerald"
            loading={loading}
          />
          <KpiCard
            label="Total orders"
            value={formatCount(kpis.totalOrders)}
            detail="All-time marketplace orders"
            icon={ShoppingCart}
            tone="sky"
            loading={loading}
          />
          <KpiCard
            label="New users"
            value={formatCount(kpis.newUsers)}
            detail="Joined today"
            icon={Users}
            tone="indigo"
            loading={loading}
          />
          <KpiCard
            label="New vendors"
            value={formatCount(kpis.newVendors)}
            detail="Applied today"
            icon={Store}
            tone="amber"
            loading={loading}
          />
          <KpiCard
            label="Pending payouts"
            value={formatCount(kpis.pendingPayouts)}
            detail="Awaiting finance action"
            icon={Banknote}
            tone="rose"
            loading={loading}
          />
          <KpiCard
            label="Active disputes"
            value={formatCount(kpis.activeDisputes)}
            detail={`${formatCount(totalPendingActions)} pending actions`}
            icon={ShieldAlert}
            tone="slate"
            loading={loading}
          />
        </section>

        <section className="flex gap-3 overflow-x-auto pb-1">
          {pendingActionLinks.map((item) => (
            <PendingAction key={item.key} item={item} count={pendingActions[item.key]} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Revenue Breakdown</h2>
                <p className="text-sm text-slate-500">
                  Commission {formatPrice(dashboard.revenueTotals?.commission)} · GMV {formatPrice(dashboard.revenueTotals?.gmv)} · Refunds {formatPrice(dashboard.revenueTotals?.refunds)}
                </p>
              </div>
              <div className="inline-flex w-max items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                <TrendingUp className="h-3.5 w-3.5" />
                {rangeOptions.find((item) => item.value === range)?.label || "Range"}
              </div>
            </div>

            <div className="mt-5 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.revenueSeries || []} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="refundFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tickFormatter={compactNumber} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={48} />
                  <Tooltip content={<ChartTooltip formatPrice={formatPrice} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="gmv" name="Vendor GMV" stroke="#0ea5e9" fill="url(#gmvFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="commission" name="Commission" stroke="#10b981" fill="url(#commissionFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="refunds" name="Refunds" stroke="#f43f5e" fill="url(#refundFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Order Funnel</h2>
                <p className="text-sm text-slate-500">Pending to returned drop-off.</p>
              </div>
              <TrendingDown className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 space-y-4">
              {(dashboard.orderFunnel || []).map((item) => (
                <div key={item.key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <span className="font-bold text-slate-950">{formatCount(item.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${item.key === "returned" ? "bg-rose-500" : "bg-sky-500"}`}
                      style={{ width: `${Math.max(6, (item.count / funnelMax) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.dropOff > 0 ? `${formatCount(item.dropOff)} drop-off from previous step` : "No drop-off from previous step"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Real-Time Activity Feed</h2>
                <p className="text-sm text-slate-500">Orders, vendor applications, product flags, and failed payments.</p>
              </div>
              <BellRing className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {(dashboard.activityFeed || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No recent activity found.
                </div>
              )}
              {(dashboard.activityFeed || []).map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${activityStyles[activity.type] || activityStyles.order}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{activity.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {activity.meta?.label || activity.type}
                        {activity.meta?.amount ? ` · ${formatPrice(activity.meta.amount)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-400">{formatDateTime(activity.at)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Platform Health Alerts</h2>
                <p className="text-sm text-slate-500">Automatic warnings from cancellation, payment, SLA, and fraud signals.</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 grid gap-3">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className={`rounded-lg border p-4 ${getHealthTone(alert.severity)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {alert.id === "healthy" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <h3 className="text-sm font-bold">{alert.title}</h3>
                      </div>
                      <p className="mt-1 text-sm opacity-85">{alert.detail}</p>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{formatCount(alert.count)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Cancellation rate</span>
                <span className="font-bold text-slate-950">{Number(kpis.cancellationRate || 0).toFixed(1)}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${Number(kpis.cancellationRate || 0) >= 15 ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, Number(kpis.cancellationRate || 0))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Top Vendors</h2>
                <p className="text-sm text-slate-500">Ranked by GMV, orders, and commission generated.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={vendorFilter}
                    onChange={(event) => setVendorFilter(event.target.value)}
                    placeholder="Filter vendors"
                    className="w-44 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <SortButton active={vendorSort === "gmv"} onClick={() => setVendorSort("gmv")}>GMV</SortButton>
                <SortButton active={vendorSort === "orders"} onClick={() => setVendorSort("orders")}>Orders</SortButton>
                <SortButton active={vendorSort === "commission"} onClick={() => setVendorSort("commission")}>Commission</SortButton>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Vendor</th>
                    <th className="px-4 py-3 text-right font-bold">GMV</th>
                    <th className="px-4 py-3 text-right font-bold">Orders</th>
                    <th className="px-4 py-3 text-right font-bold">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {sortedVendors.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-slate-500">
                        No vendor sales found for this range.
                      </td>
                    </tr>
                  )}
                  {sortedVendors.map((vendor, index) => (
                    <tr key={vendor.vendorId}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-slate-900">{vendor.vendorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPrice(vendor.gmv)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCount(vendor.orders)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatPrice(vendor.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Top Products Today</h2>
                <p className="text-sm text-slate-500">Best-selling SKUs by revenue and units.</p>
              </div>
              <Filter className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(dashboard.topProductsToday || []).slice(0, 6)} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="sku" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tickFormatter={compactNumber} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={40} />
                  <Tooltip content={<ChartTooltip formatPrice={formatPrice} />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {(dashboard.topProductsToday || []).slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {index + 1}. {product.productName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {product.vendorName} · {formatCount(product.units)} units
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-950">{formatPrice(product.revenue)}</span>
                </div>
              ))}
              {(dashboard.topProductsToday || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No product sales today.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Link to="/admin/orders" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Order Operations</h3>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-1 text-sm text-slate-500">Review order queues, shipment states, and payment issues.</p>
          </Link>
          <Link to="/admin/vendor-requests" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Approval Center</h3>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-1 text-sm text-slate-500">Clear vendor, KYC, product, and category approval queues.</p>
          </Link>
          <Link to="/admin/payouts" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950">Finance Desk</h3>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-1 text-sm text-slate-500">Handle pending payouts, payout requests, and refund impact.</p>
          </Link>
        </section>

        {loading && (
          <div className="fixed inset-x-0 bottom-5 z-30 mx-auto flex w-max items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
            Loading admin dashboard
          </div>
        )}
      </div>
    </div>
  );
}
