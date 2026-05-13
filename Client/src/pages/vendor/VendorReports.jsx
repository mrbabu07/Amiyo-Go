import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getVendorReports } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

const tabs = [
  { id: "sales", label: "Sales Report", path: "/vendor/reports/sales" },
  { id: "products", label: "Product Report", path: "/vendor/reports/products" },
  { id: "traffic", label: "Traffic Report", path: "/vendor/reports/traffic" },
];

export default function VendorReports() {
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const [period, setPeriod] = useState("week");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeTab = tabs.find((tab) => location.pathname.includes(tab.id))?.id || "sales";

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getVendorReports({ period });
        if (!active) return;
        setReport(response.data.data);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.error || "Failed to load reports");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReport();
    return () => {
      active = false;
    };
  }, [period]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return period === "week" ? report.salesData || [] : report.monthlyData || [];
  }, [period, report]);
  const maxValue = Math.max(...chartData.map((row) => row.amount || 0), 1);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500">Real sales, product, and traffic data from your store</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl bg-white p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
              <SummaryCard label="Total Sales" value={formatPrice(report?.summary?.totalSales || 0)} tone="green" />
              <SummaryCard label="Total Orders" value={report?.summary?.totalOrders || 0} tone="blue" />
              <SummaryCard label="Delivered Orders" value={report?.summary?.deliveredOrders || 0} tone="orange" />
              <SummaryCard label="Average Order" value={formatPrice(report?.summary?.averageOrderValue || 0)} tone="purple" />
            </div>

            {activeTab === "sales" && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Sales Trend</h2>
                    <p className="text-sm text-gray-500">Delivered order earnings for the selected period</p>
                  </div>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="week">Last 7 days</option>
                    <option value="month">Monthly view</option>
                  </select>
                </div>

                {chartData.length === 0 ? (
                  <EmptyState title="No sales data yet" text="Delivered orders will appear here." />
                ) : (
                  <div className="flex h-72 items-end gap-3">
                    {chartData.map((row) => (
                      <div key={row.key || row.month || row.label} className="flex flex-1 flex-col items-center">
                        <div className="mb-2 text-xs font-medium text-gray-700">
                          {formatPrice(row.amount || 0)}
                        </div>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-300 transition-all"
                          style={{ height: `${Math.max(((row.amount || 0) / maxValue) * 220, row.amount ? 12 : 3)}px` }}
                        />
                        <div className="mt-2 text-xs text-gray-600">{row.label || row.month}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "products" && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Products</h2>
                {(report?.topProducts || []).length === 0 ? (
                  <EmptyState title="No product sales yet" text="Products will rank here after orders are delivered." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-3">Product</th>
                          <th className="py-3">Sold</th>
                          <th className="py-3">Revenue</th>
                          <th className="py-3">Views</th>
                          <th className="py-3">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {report.topProducts.map((product) => (
                          <tr key={product.productId}>
                            <td className="py-3 font-medium text-gray-900">{product.name}</td>
                            <td className="py-3 text-gray-700">{product.sold}</td>
                            <td className="py-3 text-gray-700">{formatPrice(product.revenue || 0)}</td>
                            <td className="py-3 text-gray-700">{product.views || 0}</td>
                            <td className="py-3 text-gray-700">{product.rating || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "traffic" && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">Traffic & Visibility</h2>
                <p className="mb-6 text-sm text-gray-500">{report?.trafficMessage}</p>

                {(report?.trafficSources || []).length === 0 ? (
                  <EmptyState
                    title="Traffic tracking is not configured"
                    text={report?.trafficMessage || "Once source tracking is connected, visits by source will appear here."}
                  />
                ) : (
                  <>
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                      {(report.trafficSources || []).map((metric) => (
                        <div key={metric.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">{metric.label}</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{metric.value}</p>
                          <p className="text-xs uppercase tracking-wide text-gray-400">{metric.unit}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 p-5">
                        <h3 className="mb-4 font-semibold text-gray-900">Visibility Summary</h3>
                        <div className="space-y-3 text-sm text-gray-700">
                          <div className="flex items-center justify-between">
                            <span>Average views per product</span>
                            <span className="font-semibold">{report?.visibilityStats?.averageViewsPerProduct || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Products with at least one view</span>
                            <span className="font-semibold">{report?.visibilityStats?.productsWithViews || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Products still waiting for first view</span>
                            <span className="font-semibold">{report?.visibilityStats?.zeroViewProducts || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Cancelled orders</span>
                            <span className="font-semibold">{report?.summary?.cancelledOrders || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-5">
                        <h3 className="mb-4 font-semibold text-gray-900">Top Viewed Products</h3>
                        {(report?.visibilityStats?.topViewedProducts || []).length === 0 ? (
                          <p className="text-sm text-gray-500">No product views recorded yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {report.visibilityStats.topViewedProducts.map((product) => (
                              <div key={product.productId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3 text-sm">
                                <div>
                                  <p className="font-medium text-gray-900">{product.name}</p>
                                  <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                                </div>
                                <span className="font-semibold text-orange-600">{product.views} views</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </div>
  );
}
