import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useCurrency from "../../hooks/useCurrency";
import {
  downloadAdminAnalyticsReport,
  getAdminAnalyticsReports,
} from "../../services/api";

const REPORT_EXPORTS = [
  { key: "gmvTrend", label: "GMV Trend" },
  { key: "conversionFunnel", label: "Funnel" },
  { key: "cohortRetention", label: "Cohorts" },
  { key: "categoryPerformance", label: "Categories" },
  { key: "vendorLeague", label: "Vendors" },
  { key: "paymentBreakdown", label: "Payments" },
  { key: "searchNoResults", label: "No-result Search" },
  { key: "searchZeroConversion", label: "Zero-conversion Search" },
  { key: "refundReasons", label: "Refund Reasons" },
  { key: "returnCategories", label: "Returns by Category" },
  { key: "returnVendors", label: "Returns by Vendor" },
  { key: "revenueForecast", label: "Forecast" },
];

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
};

const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

function Metric({ icon: Icon, label, value, tone = "text-slate-950" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function ExportButtons({ reportKey, onDownload }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onDownload(reportKey, "csv")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        CSV
      </button>
      <button
        type="button"
        onClick={() => onDownload(reportKey, "pdf")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        PDF
      </button>
    </div>
  );
}

function Section({ title, subtitle, reportKey, onDownload, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <ExportButtons reportKey={reportKey} onDownload={onDownload} />
      </div>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      No report rows for the selected range.
    </div>
  );
}

function BarCell({ value, max, tone = "bg-blue-600" }) {
  const width = max ? Math.max(4, Math.round((Number(value || 0) / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function AdminAnalyticsReports() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [filters, setFilters] = useState({ range: "30d", granularity: "day", start: "", end: "" });
  const [report, setReport] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = { range: filters.range, granularity: filters.granularity };
      if (filters.range === "custom") {
        params.start = filters.start;
        params.end = filters.end;
      }
      const response = await getAdminAnalyticsReports(params);
      setReport(response.data.data || null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load analytics reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filters.range, filters.granularity]);

  const downloadReport = async (reportKey, format) => {
    setDownloading(`${reportKey}:${format}`);
    try {
      const params = { report: reportKey, format, range: filters.range, granularity: filters.granularity };
      if (filters.range === "custom") {
        params.start = filters.start;
        params.end = filters.end;
      }
      const response = await downloadAdminAnalyticsReport(params);
      const blob = new Blob([response.data], {
        type: format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-${reportKey}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to download report");
    } finally {
      setDownloading("");
    }
  };

  const summary = report?.summary || {};
  const maxGmv = useMemo(() => Math.max(0, ...(report?.gmvTrend || []).map((row) => row.gmv || 0)), [report]);
  const maxVendorGmv = useMemo(() => Math.max(0, ...(report?.vendorLeague || []).map((row) => row.gmv || 0)), [report]);
  const maxCategoryRevenue = useMemo(() => Math.max(0, ...(report?.categoryPerformance || []).map((row) => row.revenue || 0)), [report]);

  if (loading && !report) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BarChart3 className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Analytics & Reports</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Real marketplace aggregation from orders, returns, events, vendors, reviews, and search logs.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input-control w-auto"
                value={filters.range}
                onChange={(event) => setFilters({ ...filters, range: event.target.value })}
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="12m">12 months</option>
                <option value="custom">Custom</option>
              </select>
              <select
                className="input-control w-auto"
                value={filters.granularity}
                onChange={(event) => setFilters({ ...filters, granularity: event.target.value })}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
              {filters.range === "custom" && (
                <>
                  <input className="input-control w-auto" type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} />
                  <input className="input-control w-auto" type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} />
                </>
              )}
              <button
                type="button"
                onClick={loadReports}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric icon={TrendingUp} label="GMV" value={formatPrice(summary.totalGmv || 0)} tone="text-blue-700" />
          <Metric icon={ShoppingCart} label="Orders" value={summary.totalOrders || 0} />
          <Metric icon={Users} label="New buyers" value={summary.newBuyers || 0} tone="text-emerald-700" />
          <Metric icon={RotateCcw} label="Returns" value={summary.totalReturns || 0} tone="text-orange-700" />
          <Metric icon={CalendarDays} label="30-day forecast" value={formatPrice(summary.projected30DayGmv || 0)} tone="text-indigo-700" />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {REPORT_EXPORTS.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={Boolean(downloading)}
                onClick={() => downloadReport(item.key, "csv")}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Section title="GMV Trend" subtitle="Gross merchandise value with YoY comparison." reportKey="gmvTrend" onDownload={downloadReport}>
            {(report?.gmvTrend || []).length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">GMV</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3">YoY</th>
                      <th className="px-4 py-3">Scale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.gmvTrend.map((row) => (
                      <tr key={row.key}>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                        <td className="px-4 py-3">{formatPrice(row.gmv)}</td>
                        <td className="px-4 py-3">{row.orders}</td>
                        <td className={`px-4 py-3 font-semibold ${Number(row.yoyChangePct || 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {row.yoyChangePct === null ? "N/A" : percent(row.yoyChangePct)}
                        </td>
                        <td className="px-4 py-3 min-w-40"><BarCell value={row.gmv} max={maxGmv} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Conversion Funnel" subtitle="Sessions to delivered orders." reportKey="conversionFunnel" onDownload={downloadReport}>
            <div className="space-y-3">
              {(report?.conversionFunnel || []).map((step) => (
                <div key={step.key} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{step.label}</p>
                      <p className="text-xs text-slate-500">Session conversion {percent(step.sessionConversionRate)}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-950">{step.count}</p>
                  </div>
                  <div className="mt-3"><BarCell value={step.sessionConversionRate} max={100} tone="bg-emerald-600" /></div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Customer Acquisition & Retention" subtitle={`CAC estimate ${formatPrice(report?.acquisition?.summary?.cacEstimate || 0)}`} reportKey="cohortRetention" onDownload={downloadReport}>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["New users", report?.acquisition?.summary?.newUsers],
                ["New buyers", report?.acquisition?.summary?.newBuyers],
                ["Returning", report?.acquisition?.summary?.returningBuyers],
                ["Retention", percent(report?.acquisition?.summary?.retentionRate)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{value || 0}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Cohort</th><th className="px-4 py-3">Customers</th><th className="px-4 py-3">M1</th><th className="px-4 py-3">M2</th><th className="px-4 py-3">M3</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report?.acquisition?.cohortRetention || []).map((row) => (
                    <tr key={row.cohort}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.cohort}</td>
                      <td className="px-4 py-3">{row.customers}</td>
                      <td className="px-4 py-3">{percent(row.month1)}</td>
                      <td className="px-4 py-3">{percent(row.month2)}</td>
                      <td className="px-4 py-3">{percent(row.month3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Payment Method Breakdown" subtitle="Volume and value split." reportKey="paymentBreakdown" onDownload={downloadReport}>
            <div className="space-y-3">
              {(report?.paymentBreakdown || []).map((row) => (
                <div key={row.method} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      <p className="font-semibold uppercase text-slate-950">{row.method}</p>
                    </div>
                    <p className="font-bold text-slate-950">{formatPrice(row.value)}</p>
                  </div>
                  <div className="mt-3"><BarCell value={row.valueShare} max={100} tone="bg-violet-600" /></div>
                  <p className="mt-2 text-xs text-slate-500">{row.volume} orders · {percent(row.valueShare)} value share · {percent(row.paidRate)} paid</p>
                </div>
              ))}
              {(report?.paymentBreakdown || []).length === 0 && <EmptyState />}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Category Performance" subtitle="Revenue, orders, returns, and AOV." reportKey="categoryPerformance" onDownload={downloadReport}>
            <div className="space-y-3">
              {(report?.categoryPerformance || []).slice(0, 10).map((row) => (
                <div key={row.categoryId} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{row.categoryName}</p>
                      <p className="text-xs text-slate-500">{row.orders} orders · AOV {formatPrice(row.averageOrderValue)} · returns {percent(row.returnRate)}</p>
                    </div>
                    <p className="font-bold text-slate-950">{formatPrice(row.revenue)}</p>
                  </div>
                  <div className="mt-3"><BarCell value={row.revenue} max={maxCategoryRevenue} tone="bg-cyan-600" /></div>
                </div>
              ))}
              {(report?.categoryPerformance || []).length === 0 && <EmptyState />}
            </div>
          </Section>

          <Section title="Vendor Performance League" subtitle="Ranked by GMV with health, rating, and return rate." reportKey="vendorLeague" onDownload={downloadReport}>
            <div className="space-y-3">
              {(report?.vendorLeague || []).slice(0, 10).map((row) => (
                <div key={row.vendorId} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">{row.rank}</span>
                      <div>
                        <p className="font-semibold text-slate-950">{row.vendorName}</p>
                        <p className="text-xs text-slate-500">Health {row.healthScore} · rating {row.customerRating || "N/A"} · returns {percent(row.returnRate)}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-950">{formatPrice(row.gmv)}</p>
                  </div>
                  <div className="mt-3"><BarCell value={row.gmv} max={maxVendorGmv} tone="bg-orange-600" /></div>
                </div>
              ))}
              {(report?.vendorLeague || []).length === 0 && <EmptyState />}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Search Analytics" subtitle="Content gaps and UX gaps." reportKey="searchNoResults" onDownload={downloadReport}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Search className="h-4 w-4" /> No results</h3>
                <div className="space-y-2">
                  {(report?.searchAnalytics?.topNoResults || []).slice(0, 8).map((row) => (
                    <div key={row.term} className="rounded-lg bg-slate-50 p-3">
                      <p className="font-semibold text-slate-950">{row.term}</p>
                      <p className="text-xs text-slate-500">{row.noResultSearches} no-result searches · last {formatDate(row.lastSearchedAt)}</p>
                    </div>
                  ))}
                  {(report?.searchAnalytics?.topNoResults || []).length === 0 && <p className="text-sm text-slate-500">No no-result search terms.</p>}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Zero conversion</h3>
                  <ExportButtons reportKey="searchZeroConversion" onDownload={downloadReport} />
                </div>
                <div className="space-y-2">
                  {(report?.searchAnalytics?.topZeroConversion || []).slice(0, 8).map((row) => (
                    <div key={row.term} className="rounded-lg bg-slate-50 p-3">
                      <p className="font-semibold text-slate-950">{row.term}</p>
                      <p className="text-xs text-slate-500">{row.searches} searches · 0 conversions</p>
                    </div>
                  ))}
                  {(report?.searchAnalytics?.topZeroConversion || []).length === 0 && <p className="text-sm text-slate-500">No zero-conversion search terms.</p>}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Refund & Return Analytics" subtitle="By reason, category, vendor, and trend." reportKey="refundReasons" onDownload={downloadReport}>
            <div className="space-y-3">
              {(report?.refundReturnAnalytics?.byReason || []).slice(0, 8).map((row) => (
                <div key={row.reason} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{row.reason}</p>
                      <p className="text-xs text-slate-500">{row.returns} returns</p>
                    </div>
                    <p className="font-bold text-slate-950">{formatPrice(row.refundAmount)}</p>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <ExportButtons reportKey="returnCategories" onDownload={downloadReport} />
                <ExportButtons reportKey="returnVendors" onDownload={downloadReport} />
                <ExportButtons reportKey="refundTrend" onDownload={downloadReport} />
              </div>
              {(report?.refundReturnAnalytics?.byReason || []).length === 0 && <EmptyState />}
            </div>
          </Section>
        </div>

        <Section title="Revenue Forecast" subtitle={`Simple moving-average projection from recent GMV. Base average ${formatPrice(report?.revenueForecast?.baseDailyAverage || 0)} per day.`} reportKey="revenueForecast" onDownload={downloadReport}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {(report?.revenueForecast?.projection || []).slice(0, 10).map((row) => (
              <div key={row.date} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{formatDate(row.date)}</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{formatPrice(row.projectedGmv)}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
