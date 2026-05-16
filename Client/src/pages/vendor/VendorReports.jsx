import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  LineChart,
  PackageSearch,
  Repeat2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";
import { getVendorReports } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

const tabs = [
  { id: "sales", label: "Sales", path: "/vendor/reports/sales", icon: LineChart },
  { id: "products", label: "Products", path: "/vendor/reports/products", icon: PackageSearch },
  { id: "traffic", label: "Traffic", path: "/vendor/reports/traffic", icon: Users },
  { id: "inventory", label: "Inventory", path: "/vendor/reports/inventory", icon: Warehouse },
];

const periods = [
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
];

const numberFormat = new Intl.NumberFormat("en-US");

export default function VendorReports() {
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const [period, setPeriod] = useState("30");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeTab = tabs.find((tab) => location.pathname.includes(`/reports/${tab.id}`))?.id || "sales";

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
        setError(err.response?.data?.error || "Failed to load analytics reports");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReport();
    return () => {
      active = false;
    };
  }, [period]);

  const summary = report?.summary || {};
  const topProduct = useMemo(() => report?.topProducts?.[0], [report]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/vendor/dashboard"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                aria-label="Back to vendor dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Analytics & Reports</h1>
                <p className="text-sm text-slate-500">Seller traffic, conversion, operations, and stock health</p>
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
              {periods.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    period === option.value
                      ? "bg-white text-orange-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Revenue"
                value={formatPrice(summary.totalSales || 0)}
                detail={`${formatDelta(summary.revenueChangePercent)} vs previous period`}
                trend={summary.revenueChangePercent}
                icon={TrendingUp}
                tone="emerald"
              />
              <MetricCard
                label="Orders"
                value={numberFormat.format(summary.totalOrders || 0)}
                detail={`${formatDelta(summary.orderChangePercent)} order change`}
                trend={summary.orderChangePercent}
                icon={BarChart3}
                tone="blue"
              />
              <MetricCard
                label="Repeat Buyers"
                value={`${summary.customerRepeatRate || 0}%`}
                detail={`${report?.customerRepeat?.returningOrders || 0} returning orders`}
                icon={Repeat2}
                tone="violet"
              />
              <MetricCard
                label="Cancel + Return"
                value={`${summary.cancellationReturnRate || 0}%`}
                detail={`${summary.cancelledOrders || 0} cancelled, ${summary.returnedOrders || 0} returned`}
                icon={TrendingDown}
                tone="rose"
              />
            </section>

            {activeTab === "sales" && (
              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Panel
                  title={`Sales Trend - ${report?.period?.label || "Selected period"}`}
                  caption="Current period revenue and order count compared with the previous period"
                >
                  <SalesTrendChart data={report?.salesTrend || []} formatPrice={formatPrice} />
                </Panel>

                <div className="space-y-6">
                  <Panel title="Period Health" caption="Delivered revenue, average order value, and benchmarked risk">
                    <div className="space-y-4">
                      <SideMetric label="Delivered orders" value={summary.deliveredOrders || 0} />
                      <SideMetric label="Average order value" value={formatPrice(summary.averageOrderValue || 0)} />
                      <SideMetric
                        label="Platform cancel/return avg"
                        value={`${report?.benchmark?.platformCancellationReturnRate || 0}%`}
                      />
                      <SideMetric
                        label="Top product"
                        value={topProduct?.name || "No product sales yet"}
                        compact
                      />
                    </div>
                  </Panel>

                  <Panel title="Customer Repeat Rate" caption="Returning buyers in the selected period">
                    <div className="flex items-end gap-4">
                      <span className="text-4xl font-bold text-slate-950">
                        {report?.customerRepeat?.repeatRate || 0}%
                      </span>
                      <span className="pb-1 text-sm text-slate-500">
                        {report?.customerRepeat?.returningCustomers || 0} returning customers from{" "}
                        {report?.customerRepeat?.uniqueCustomers || 0} unique buyers
                      </span>
                    </div>
                  </Panel>
                </div>
              </section>
            )}

            {activeTab === "products" && (
              <section className="space-y-6">
                <Panel title="Top-Performing Products" caption="Ranked by revenue, units sold, views, and conversion">
                  <TopProductsTable products={report?.topProducts || []} formatPrice={formatPrice} />
                </Panel>

                <Panel title="Product Funnel" caption="Views to cart to purchase conversion by SKU">
                  <ProductFunnelTable products={report?.productFunnel || []} />
                </Panel>
              </section>
            )}

            {activeTab === "traffic" && (
              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <Panel title="Traffic Sources" caption={report?.trafficMessage || "Traffic source mix"}>
                  <TrafficSources sources={report?.trafficSources || []} />
                </Panel>

                <Panel title="Cancellation & Return Rate" caption="Daily vendor trend with platform average benchmark">
                  <RiskTrendChart data={report?.cancellationReturnTrend || []} />
                </Panel>

                <Panel title="Visibility Summary" caption="Product view coverage across your catalog">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SideMetric label="Total views" value={numberFormat.format(report?.visibilityStats?.totalViews || 0)} />
                    <SideMetric label="Average views/product" value={report?.visibilityStats?.averageViewsPerProduct || 0} />
                    <SideMetric label="Viewed products" value={report?.visibilityStats?.productsWithViews || 0} />
                    <SideMetric label="Zero-view products" value={report?.visibilityStats?.zeroViewProducts || 0} />
                  </div>
                </Panel>

                <Panel title="Top Viewed Products" caption="Products attracting the most marketplace attention">
                  <TopViewedProducts products={report?.visibilityStats?.topViewedProducts || []} />
                </Panel>
              </section>
            )}

            {activeTab === "inventory" && (
              <Panel title="Inventory Forecast" caption="Stockout estimate from recent sales velocity">
                <InventoryForecastTable products={report?.inventoryForecast || []} />
              </Panel>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      <p className="text-sm font-medium text-slate-600">Loading analytics...</p>
    </div>
  );
}

function Panel({ title, caption, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {caption && <p className="mt-1 text-sm text-slate-500">{caption}</p>}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, trend, icon, tone }) {
  const CardIcon = icon;
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-sky-50 text-sky-700 border-sky-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${tones[tone]}`}>
          <CardIcon className="h-5 w-5" />
        </span>
      </div>
      <p className={`mt-4 text-xs font-semibold ${Number(trend) < 0 ? "text-rose-600" : "text-slate-500"}`}>
        {detail}
      </p>
    </div>
  );
}

function SideMetric({ label, value, compact = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-right font-bold text-slate-950 ${compact ? "max-w-[180px] truncate text-sm" : "text-base"}`}>
        {value}
      </span>
    </div>
  );
}

function SalesTrendChart({ data, formatPrice }) {
  if (data.length === 0) {
    return <EmptyState title="No sales yet" text="Delivered orders will appear here after fulfillment." />;
  }

  const maxValue = Math.max(...data.flatMap((row) => [row.revenue || 0, row.previousRevenue || 0]), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex h-72 min-w-[720px] items-end gap-2">
        {data.map((row) => {
          const currentHeight = Math.max(((row.revenue || 0) / maxValue) * 210, row.revenue ? 10 : 3);
          const previousHeight = Math.max(((row.previousRevenue || 0) / maxValue) * 210, row.previousRevenue ? 10 : 3);
          return (
            <div key={row.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-56 w-full items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-slate-300"
                  style={{ height: `${previousHeight}px` }}
                  title={`Previous: ${formatPrice(row.previousRevenue || 0)}`}
                />
                <div
                  className="w-4 rounded-t bg-orange-500"
                  style={{ height: `${currentHeight}px` }}
                  title={`Current: ${formatPrice(row.revenue || 0)}`}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{row.label}</span>
              <span className="text-[11px] text-slate-400">{row.orders || 0} orders</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-orange-500" />
          Current
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-slate-300" />
          Previous
        </span>
      </div>
    </div>
  );
}

function TopProductsTable({ products, formatPrice }) {
  if (products.length === 0) {
    return <EmptyState title="No product performance yet" text="Products will rank after sales or views are recorded." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-3">Product</th>
            <th className="py-3 text-right">Revenue</th>
            <th className="py-3 text-right">Units</th>
            <th className="py-3 text-right">Views</th>
            <th className="py-3 text-right">Conversion</th>
            <th className="py-3 text-right">Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.productId}>
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <ProductThumb image={product.image} name={product.name} />
                  <div>
                    <p className="font-semibold text-slate-950">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sku || "SKU not set"}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 text-right font-semibold text-slate-900">{formatPrice(product.revenue || 0)}</td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.unitsSold || product.sold || 0)}</td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.views || 0)}</td>
              <td className="py-4 text-right text-slate-600">{product.conversionRate || 0}%</td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.stock || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductFunnelTable({ products }) {
  if (products.length === 0) {
    return <EmptyState title="No funnel activity yet" text="Views, cart adds, and purchases will appear as shoppers interact." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-3">SKU</th>
            <th className="py-3 text-right">Views</th>
            <th className="py-3 text-right">Add to Cart</th>
            <th className="py-3 text-right">Purchased</th>
            <th className="py-3 text-right">Cart Rate</th>
            <th className="py-3 text-right">Purchase Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.productId}>
              <td className="py-4">
                <p className="font-semibold text-slate-950">{product.name}</p>
                <p className="text-xs text-slate-500">{product.sku || "SKU not set"}</p>
              </td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.views || 0)}</td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.addToCart || 0)}</td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.purchases || 0)}</td>
              <td className="py-4 text-right text-slate-600">{product.addToCartRate || 0}%</td>
              <td className="py-4 text-right text-slate-600">{product.purchaseConversionRate || 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrafficSources({ sources }) {
  if (sources.length === 0) {
    return <EmptyState title="No traffic yet" text="Organic, campaign, and external visits will appear here." />;
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <div key={source.id || source.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">{source.label}</p>
              <p className="text-xs text-slate-500">{source.unit}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-950">{numberFormat.format(source.value || 0)}</p>
              <p className="text-xs text-slate-500">{source.share || 0}% share</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-teal-500"
              style={{ width: `${Math.min(source.share || 0, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskTrendChart({ data }) {
  if (data.length === 0) {
    return <EmptyState title="No risk trend yet" text="Cancellation and return data will appear after orders are placed." />;
  }

  const maxValue = Math.max(...data.flatMap((row) => [row.rate || 0, row.platformAverageRate || 0]), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex h-64 min-w-[720px] items-end gap-2">
        {data.map((row) => {
          const rateHeight = Math.max(((row.rate || 0) / maxValue) * 190, row.rate ? 8 : 3);
          const benchmarkHeight = Math.max(((row.platformAverageRate || 0) / maxValue) * 190, 3);
          return (
            <div key={row.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-52 w-full items-end justify-center">
                <div
                  className="absolute left-1/2 w-8 -translate-x-1/2 border-t-2 border-dashed border-slate-400"
                  style={{ bottom: `${benchmarkHeight}px` }}
                />
                <div
                  className="w-5 rounded-t bg-rose-500"
                  style={{ height: `${rateHeight}px` }}
                  title={`${row.rate || 0}% cancel/return rate`}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{row.label}</span>
              <span className="text-[11px] text-slate-400">{row.cancelled + row.returned}/{row.totalOrders}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopViewedProducts({ products }) {
  if (products.length === 0) {
    return <EmptyState title="No viewed products yet" text="Product views will appear after buyers visit your listings." />;
  }

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <div key={product.productId} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="font-semibold text-slate-950">{product.name}</p>
            <p className="text-xs text-slate-500">Stock {numberFormat.format(product.stock || 0)}</p>
          </div>
          <span className="font-bold text-orange-700">{numberFormat.format(product.views || 0)} views</span>
        </div>
      ))}
    </div>
  );
}

function InventoryForecastTable({ products }) {
  if (products.length === 0) {
    return <EmptyState title="No inventory forecast yet" text="Add products and sales history to estimate stockout timing." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-3">Product</th>
            <th className="py-3 text-right">Stock</th>
            <th className="py-3 text-right">Units Sold</th>
            <th className="py-3 text-right">Daily Velocity</th>
            <th className="py-3 text-right">Stockout</th>
            <th className="py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.productId}>
              <td className="py-4">
                <p className="font-semibold text-slate-950">{product.name}</p>
                <p className="text-xs text-slate-500">{product.sku || "SKU not set"}</p>
              </td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.stock || 0)}</td>
              <td className="py-4 text-right text-slate-600">{numberFormat.format(product.unitsSold || 0)}</td>
              <td className="py-4 text-right text-slate-600">{product.dailyVelocity || 0}/day</td>
              <td className="py-4 text-right text-slate-600">{formatStockout(product.daysUntilStockout)}</td>
              <td className="py-4 text-right">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(product.status)}`}>
                  {statusLabel(product.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductThumb({ image, name }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500">
      <Boxes className="h-5 w-5" />
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <ShoppingCart className="h-5 w-5" />
      </div>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function formatDelta(value = 0) {
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? "+" : ""}${numeric}%`;
}

function formatStockout(days) {
  if (days === null || days === undefined) return "No recent sales";
  if (days <= 0) return "Now";
  return `${days} days`;
}

function statusLabel(status) {
  const labels = {
    out_of_stock: "Out of stock",
    critical: "Critical",
    restock_soon: "Restock soon",
    watch: "Watch",
    no_recent_sales: "No recent sales",
    healthy: "Healthy",
  };
  return labels[status] || "Healthy";
}

function statusTone(status) {
  const tones = {
    out_of_stock: "bg-slate-900 text-white",
    critical: "bg-rose-100 text-rose-700",
    restock_soon: "bg-orange-100 text-orange-700",
    watch: "bg-amber-100 text-amber-700",
    no_recent_sales: "bg-slate-100 text-slate-600",
    healthy: "bg-emerald-100 text-emerald-700",
  };
  return tones[status] || tones.healthy;
}
