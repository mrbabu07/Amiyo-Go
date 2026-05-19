import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Percent,
  ReceiptText,
  RefreshCcw,
  Scale,
  ShieldAlert,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import {
  downloadVendorFinanceStatement,
  downloadVendorTaxInvoice,
  getVendorCommissionRates,
  getVendorFinanceReconciliation,
  getVendorFinanceSummary,
  getVendorFinanceTransactions,
  getVendorPayouts,
} from "../../services/api";
import PayoutRequestButton from "../../components/vendor/PayoutRequestButton";
import PayoutRequestsList from "../../components/vendor/PayoutRequestsList";
import { hasVendorPermission } from "../../utils/vendorStaffPermissions";

const tabs = [
  { id: "overview", label: "Overview", path: "/vendor/finance", icon: WalletCards },
  { id: "reconciliation", label: "Reconciliation", path: "/vendor/finance/reconciliation", icon: Scale },
  { id: "transactions", label: "Transactions", path: "/vendor/finance/transactions", icon: ReceiptText },
  { id: "statements", label: "Statements", path: "/vendor/finance/statements", icon: FileSpreadsheet },
  { id: "commissions", label: "Commissions", path: "/vendor/finance/commissions", icon: Percent },
  { id: "payouts", label: "Payouts", path: "/vendor/finance/payouts", icon: Landmark },
];

const statusStyles = {
  released: "bg-emerald-50 text-emerald-700 border-emerald-200",
  shipping: "bg-sky-50 text-sky-700 border-sky-200",
  pending_clearance: "bg-amber-50 text-amber-700 border-amber-200",
  refund_deducted: "bg-rose-50 text-rose-700 border-rose-200",
  void: "bg-slate-100 text-slate-600 border-slate-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-sky-50 text-sky-700 border-sky-200",
  approved: "bg-sky-50 text-sky-700 border-sky-200",
  hold: "bg-rose-50 text-rose-700 border-rose-200",
  held: "bg-rose-50 text-rose-700 border-rose-200",
  risk_hold: "bg-rose-50 text-rose-700 border-rose-200",
  blocked: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const currentMonthValue = () => new Date().toISOString().slice(0, 7);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normalizeStatus = (status = "") =>
  status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const calculateTotals = (rows = []) =>
  rows.reduce(
    (total, row) => ({
      saleAmount: total.saleAmount + Number(row.saleAmount || 0),
      platformCommissionAmount: total.platformCommissionAmount + Number(row.platformCommissionAmount || 0),
      shippingFeeCredited: total.shippingFeeCredited + Number(row.shippingFeeCredited || 0),
      shippingFeeDebited: total.shippingFeeDebited + Number(row.shippingFeeDebited || 0),
      refundDeducted: total.refundDeducted + Number(row.refundDeducted || 0),
      netPayout: total.netPayout + Number(row.netPayout || 0),
    }),
    {
      saleAmount: 0,
      platformCommissionAmount: 0,
      shippingFeeCredited: 0,
      shippingFeeDebited: 0,
      refundDeducted: 0,
      netPayout: 0,
    },
  );

const downloadBlob = (response, fallbackName) => {
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;
  const blob = new Blob([response.data], {
    type: response.headers?.["content-type"] || "application/octet-stream",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function VendorFinance() {
  const { user, dbUser, role, permissions, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const activeTab = tabs.find((tab) => location.pathname === tab.path)?.id || "overview";
  const vendorAccess = useMemo(
    () => ({ dbUser, role, permissions, isAdmin }),
    [dbUser, role, permissions, isAdmin],
  );
  const canManageFinance = hasVendorPermission(vendorAccess, "finance:manage");

  const [loading, setLoading] = useState(true);
  const [statementLoading, setStatementLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [commissionRates, setCommissionRates] = useState([]);
  const [statementRows, setStatementRows] = useState([]);
  const [statementMonth, setStatementMonth] = useState(currentMonthValue());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchFinanceData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [summaryRes, txRes, payoutsRes, rateRes, reconciliationRes] = await Promise.all([
        getVendorFinanceSummary(),
        getVendorFinanceTransactions({ limit: 50 }),
        getVendorPayouts({ limit: 20 }),
        getVendorCommissionRates(),
        getVendorFinanceReconciliation(),
      ]);

      setStats(summaryRes.data?.data || null);
      setTransactions(txRes.data?.data || []);
      setPayouts(payoutsRes.data?.data || []);
      setCommissionRates(rateRes.data?.data || []);
      setReconciliation(reconciliationRes.data?.data || null);
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchStatementRows = useCallback(async () => {
    if (!user) return;

    setStatementLoading(true);
    try {
      const response = await getVendorFinanceTransactions({
        month: statementMonth,
        limit: 1000,
      });
      setStatementRows(response.data?.data || []);
    } catch (error) {
      console.error("Failed to load statement preview:", error);
      toast.error("Failed to load statement preview");
    } finally {
      setStatementLoading(false);
    }
  }, [statementMonth, user]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  useEffect(() => {
    if (activeTab === "statements") {
      fetchStatementRows();
    }
  }, [activeTab, fetchStatementRows]);

  const statementTotals = useMemo(() => calculateTotals(statementRows), [statementRows]);
  const earnings = stats?.earningsSummary || {};
  const payoutSchedule = stats?.payoutSchedule || {};
  const refundImpact = stats?.refundImpact || {};

  const handleRefresh = async () => {
    await fetchFinanceData();
    if (activeTab === "statements") await fetchStatementRows();
    setRefreshTrigger((value) => value + 1);
  };

  const handleStatementDownload = async (format) => {
    try {
      const response = await downloadVendorFinanceStatement(format, { month: statementMonth });
      downloadBlob(response, `statement-${statementMonth}.${format}`);
    } catch (error) {
      console.error("Failed to download statement:", error);
      toast.error("Failed to download statement");
    }
  };

  const handleTaxInvoiceDownload = async () => {
    try {
      const response = await downloadVendorTaxInvoice({ month: statementMonth });
      downloadBlob(response, `tax-invoice-${statementMonth}.pdf`);
    } catch (error) {
      console.error("Failed to download tax invoice:", error);
      toast.error("Failed to download tax invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/vendor/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Finance Center</h1>
              <p className="text-sm text-slate-500">Earnings, settlements, statements, payouts, and commission rates.</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={WalletCards}
            label="Current cycle balance"
            value={formatPrice(earnings.currentCycleBalance || 0)}
            note={`${formatDate(stats?.currentCycle?.start)} to ${formatDate(stats?.currentCycle?.end)}`}
            tone="emerald"
          />
          <MetricCard
            icon={Clock3}
            label="Pending clearance"
            value={formatPrice(earnings.pendingClearance || 0)}
            note="Orders not yet released for payout"
            tone="amber"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Released amount"
            value={formatPrice(earnings.releasedAmount || 0)}
            note="Paid payout transfers"
            tone="sky"
          />
          <MetricCard
            icon={ShieldAlert}
            label="Withheld for returns"
            value={formatPrice(earnings.withheldForReturns || 0)}
            note={`${refundImpact.returnsCount || 0} approved return deductions`}
            tone="rose"
          />
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MiniStat label="Gross sales" value={formatPrice(stats?.grossSales || 0)} />
              <MiniStat label="Platform commission" value={`-${formatPrice(stats?.totalCommission || 0)}`} danger />
              <MiniStat label="Net earnings" value={formatPrice(stats?.netEarnings || 0)} success />
              <MiniStat label="Available payout" value={formatPrice(stats?.pendingBalance || 0)} strong />
            </div>
          </Panel>
          <Panel>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">Next payout</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{formatDate(payoutSchedule.nextPayoutDate)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Cutoff {formatDate(payoutSchedule.cutoffDate)}. Minimum {formatPrice(payoutSchedule.minimumPayoutThreshold || stats?.minimumPayout || 1000)}.
                </p>
              </div>
            </div>
          </Panel>
        </section>

        <nav className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="flex min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
                    active
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {!canManageFinance && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Finance view-only access is enabled for your staff role. Payout requests and cancellations stay locked to finance managers or owners.
          </div>
        )}

        <section className="mt-5">
          {activeTab === "overview" && (
            <OverviewTab
              stats={stats}
              refundImpact={refundImpact}
              transactions={transactions}
              formatPrice={formatPrice}
            />
          )}

          {activeTab === "reconciliation" && (
            <ReconciliationTab reconciliation={reconciliation} formatPrice={formatPrice} />
          )}

          {activeTab === "transactions" && (
            <TransactionsTab transactions={transactions} formatPrice={formatPrice} />
          )}

          {activeTab === "statements" && (
            <StatementsTab
              statementMonth={statementMonth}
              setStatementMonth={setStatementMonth}
              statementRows={statementRows}
              statementTotals={statementTotals}
              loading={statementLoading}
              formatPrice={formatPrice}
              onDownloadStatement={handleStatementDownload}
              onDownloadTaxInvoice={handleTaxInvoiceDownload}
            />
          )}

          {activeTab === "commissions" && (
            <CommissionTab commissionRates={commissionRates} />
          )}

          {activeTab === "payouts" && (
            <PayoutsTab
              payouts={payouts}
              stats={stats}
              refreshTrigger={refreshTrigger}
              onRequestSuccess={handleRefresh}
              formatPrice={formatPrice}
              canManage={canManageFinance}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function OverviewTab({ stats, refundImpact, transactions, formatPrice }) {
  const latestRows = transactions.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel className="xl:col-span-2">
        <PanelTitle icon={TrendingUp} title="Earnings Summary" />
        <div className="mt-4 space-y-3">
          <BreakdownRow label="Delivered net earnings" value={formatPrice(stats?.deliveredNetEarnings || 0)} />
          <BreakdownRow label="Pending payout holds" value={`-${formatPrice(stats?.pendingPayouts || 0)}`} />
          <BreakdownRow label="Return deductions" value={`-${formatPrice(stats?.returnDeductions || 0)}`} />
          <BreakdownRow label="Paid to date" value={formatPrice(stats?.paidBalance || 0)} />
          <div className="border-t border-slate-200 pt-3">
            <BreakdownRow label="Available payout balance" value={formatPrice(stats?.pendingBalance || 0)} strong />
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelTitle icon={ShieldAlert} title="Refund Impact" />
        <div className="mt-4">
          <p className="text-3xl font-bold text-rose-700">{formatPrice(refundImpact.totalDeducted || 0)}</p>
          <p className="mt-1 text-sm text-slate-500">{refundImpact.returnsCount || 0} approved refund or return deductions.</p>
          <div className="mt-4 space-y-2">
            {(refundImpact.recentReturns || []).slice(0, 3).map((item) => (
              <div key={item.returnId || item.orderId} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-800">{item.productTitle || "Returned item"}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(item.approvedAt)} - {formatPrice(item.deduction || 0)}</p>
              </div>
            ))}
            {(!refundImpact.recentReturns || refundImpact.recentReturns.length === 0) && (
              <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">No refund deductions recorded.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="xl:col-span-3">
        <PanelTitle icon={ReceiptText} title="Latest Order Settlements" />
        <div className="mt-4 overflow-x-auto">
          <TransactionTable rows={latestRows} formatPrice={formatPrice} compact />
        </div>
      </Panel>
    </div>
  );
}

function ReconciliationTab({ reconciliation, formatPrice }) {
  const summary = reconciliation?.summary || {};
  const cod = reconciliation?.cod || {};
  const orderStatus = reconciliation?.orderStatus || {};
  const buckets = reconciliation?.buckets || [];
  const payoutRows = reconciliation?.payoutRows || [];
  const returnRows = reconciliation?.returnRows || [];

  return (
    <div className="space-y-4" data-testid="vendor-finance-reconciliation">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={WalletCards}
          label="Available balance"
          value={formatPrice(summary.availableBalance || 0)}
          note="Released net minus paid, pending, and held payouts"
          tone="emerald"
        />
        <MetricCard
          icon={Scale}
          label="Released net"
          value={formatPrice(summary.releasedNet || 0)}
          note={`${orderStatus.released || 0} released order(s)`}
          tone="sky"
        />
        <MetricCard
          icon={Clock3}
          label="Payout exposure"
          value={formatPrice((summary.pendingPayouts || 0) + (summary.payoutHolds || 0))}
          note={`${formatPrice(summary.pendingPayouts || 0)} pending, ${formatPrice(summary.payoutHolds || 0)} held`}
          tone="amber"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Return deductions"
          value={formatPrice(summary.returnDeduction || 0)}
          note={`${orderStatus.refundDeducted || 0} order(s) affected`}
          tone="rose"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelTitle icon={Scale} title="Reconciliation Buckets" />
          <div className="mt-4 divide-y divide-slate-100">
            {buckets.map((bucket) => (
              <div
                key={bucket.key}
                className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between"
                data-testid={`vendor-reconciliation-bucket-${bucket.key}`}
              >
                <div>
                  <p className="font-semibold text-slate-950">{bucket.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{bucket.description}</p>
                </div>
                <div className="flex items-center gap-3 md:text-right">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${bucketTone(bucket.type)}`}>
                    {normalizeStatus(bucket.type)}
                  </span>
                  <p className={`min-w-28 text-lg font-bold ${bucket.type === "debit" ? "text-rose-700" : bucket.type === "hold" ? "text-amber-700" : "text-slate-950"}`}>
                    {bucket.type === "debit" ? "-" : ""}
                    {formatPrice(bucket.amount || 0)}
                  </p>
                </div>
              </div>
            ))}
            {buckets.length === 0 && (
              <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
                Reconciliation data will appear after orders, returns, or payouts are recorded.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelTitle icon={Banknote} title="COD Exposure" />
          <div className="mt-4 space-y-3">
            <BreakdownRow label="COD orders" value={cod.orders || 0} />
            <BreakdownRow label="Pending COD exposure" value={formatPrice(cod.pendingExposure || 0)} />
            <BreakdownRow label="Released COD exposure" value={formatPrice(cod.releasedExposure || 0)} />
            <div className="border-t border-slate-200 pt-3">
              <BreakdownRow label="Gross sales" value={formatPrice(summary.grossSales || 0)} strong />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PanelTitle icon={ShieldAlert} title="Recent Return Deductions" />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {returnRows.length} rows
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {returnRows.slice(0, 6).map((item) => (
              <div key={item._id || item.returnId || `${item.orderId}-${item.productTitle}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.productTitle || item.productName || "Returned item"}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(item.approvedAt || item.updatedAt)} - {normalizeStatus(item.status || "deducted")}</p>
                </div>
                <p className="font-bold text-rose-700">-{formatPrice(item.vendorDeduction ?? item.deduction ?? 0)}</p>
              </div>
            ))}
            {returnRows.length === 0 && (
              <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
                No return deductions in this view.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PanelTitle icon={Landmark} title="Recent Payout Movement" />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {payoutRows.length} rows
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {payoutRows.slice(0, 6).map((payout) => (
              <div key={payout._id || payout.transactionId || payout.createdAt} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{payout.note || payout.transactionId || "Payout request"}</p>
                  <p className="mt-1 text-xs text-slate-500">Requested {formatDate(payout.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-950">{formatPrice(payout.amount || 0)}</p>
                  <StatusBadge status={payout.status} />
                </div>
              </div>
            ))}
            {payoutRows.length === 0 && (
              <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
                No payout movement yet.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TransactionsTab({ transactions, formatPrice }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle icon={ReceiptText} title="Order-Level Transaction Breakdown" />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {transactions.length} rows
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <TransactionTable rows={transactions} formatPrice={formatPrice} />
      </div>
    </Panel>
  );
}

function StatementsTab({
  statementMonth,
  setStatementMonth,
  statementRows,
  statementTotals,
  loading,
  formatPrice,
  onDownloadStatement,
  onDownloadTaxInvoice,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel className="xl:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PanelTitle icon={FileSpreadsheet} title="Monthly Statement" />
          <label className="text-sm font-semibold text-slate-700">
            Month
            <input
              type="month"
              value={statementMonth}
              onChange={(event) => setStatementMonth(event.target.value)}
              className="ml-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DownloadAction
            icon={FileSpreadsheet}
            label="CSV Statement"
            onClick={() => onDownloadStatement("csv")}
          />
          <DownloadAction
            icon={FileText}
            label="PDF Statement"
            onClick={() => onDownloadStatement("pdf")}
          />
          <DownloadAction
            icon={ReceiptText}
            label="Tax Invoice"
            onClick={onDownloadTaxInvoice}
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">Loading statement preview...</div>
          ) : (
            <TransactionTable rows={statementRows.slice(0, 12)} formatPrice={formatPrice} compact />
          )}
        </div>
      </Panel>

      <Panel>
        <PanelTitle icon={Banknote} title="Statement Totals" />
        <div className="mt-4 space-y-3">
          <BreakdownRow label="Sales" value={formatPrice(statementTotals.saleAmount)} />
          <BreakdownRow label="Commission" value={`-${formatPrice(statementTotals.platformCommissionAmount)}`} />
          <BreakdownRow label="Shipping credited" value={formatPrice(statementTotals.shippingFeeCredited)} />
          <BreakdownRow label="Shipping debited" value={`-${formatPrice(statementTotals.shippingFeeDebited)}`} />
          <BreakdownRow label="Refund deducted" value={`-${formatPrice(statementTotals.refundDeducted)}`} />
          <div className="border-t border-slate-200 pt-3">
            <BreakdownRow label="Net payout" value={formatPrice(statementTotals.netPayout)} strong />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CommissionTab({ commissionRates }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle icon={Percent} title="Commission Rate Card" />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {commissionRates.length} categories
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 text-right">Base commission</th>
              <th className="px-3 py-3 text-right">Minimum rate</th>
              <th className="px-3 py-3 text-right">Effective rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commissionRates.map((category) => (
              <tr key={category.categoryId || category.slug} className="hover:bg-slate-50">
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-900">{category.name}</p>
                  <p className="text-xs text-slate-500">{category.slug || "No slug"}</p>
                </td>
                <td className="px-3 py-3 text-right text-slate-700">{category.commissionRate || 0}%</td>
                <td className="px-3 py-3 text-right text-slate-700">{category.minimumCommissionRate || 0}%</td>
                <td className="px-3 py-3 text-right font-bold text-slate-950">{category.effectiveCommissionRate || 0}%</td>
              </tr>
            ))}
            {commissionRates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  No commission rates available for your approved categories.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PayoutsTab({ payouts, stats, refreshTrigger, onRequestSuccess, formatPrice, canManage }) {
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <PanelTitle icon={Landmark} title="Payout Schedule" />
            <p className="mt-2 text-sm text-slate-500">
              Available balance {formatPrice(stats?.pendingBalance || 0)}. Minimum payout {formatPrice(stats?.minimumPayout || 1000)}.
            </p>
          </div>
          <PayoutRequestButton
            onRequestSuccess={onRequestSuccess}
            disabled={!canManage}
            disabledReason="Your staff access can view finance, but cannot request payouts."
          />
        </div>
      </Panel>

      <PayoutRequestsList refreshTrigger={refreshTrigger} canManage={canManage} />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelTitle icon={Banknote} title="Payout History" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {payouts.length} records
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {payouts.map((payout) => (
            <div key={payout._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-950">{payout.note || "Payout transfer"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Requested {formatDate(payout.createdAt)}
                  {payout.transactionId ? ` - ${payout.transactionId}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-950">{formatPrice(payout.amount || 0)}</p>
                <StatusBadge status={payout.status} />
              </div>
            </div>
          ))}
          {payouts.length === 0 && (
            <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
              Payout history will appear after admin processes a transfer.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function TransactionTable({ rows, formatPrice, compact = false }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
        No finance transactions found.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={row.orderId || row.orderNumber} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-slate-900">#{row.orderNumber}</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{row.productsSummary || "Order items"}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(row.orderDate)} - {row.itemCount || 0} item(s)</p>
              </div>
              {!compact && <StatusBadge status={row.itemStatus} />}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
              <MiniLedger label="Sale" value={formatPrice(row.saleAmount || 0)} />
              <MiniLedger label="Commission" value={`-${formatPrice(row.platformCommissionAmount || 0)}`} danger />
              <MiniLedger label="Ship credit" value={formatPrice(row.shippingFeeCredited || 0)} success />
              <MiniLedger label="Ship debit" value={`-${formatPrice(row.shippingFeeDebited || 0)}`} warning />
              <MiniLedger label="Refund" value={`-${formatPrice(row.refundDeducted || 0)}`} danger />
              <MiniLedger label="Net payout" value={formatPrice(row.netPayout || 0)} strong />
            </div>
          </article>
        ))}
      </div>

      <table className="hidden w-full min-w-[980px] text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
            <th className="px-3 py-3">Order</th>
            <th className="px-3 py-3">Products</th>
            <th className="px-3 py-3 text-right">Sale</th>
            <th className="px-3 py-3 text-right">Commission</th>
            <th className="px-3 py-3 text-right">Ship credit</th>
            <th className="px-3 py-3 text-right">Ship debit</th>
            <th className="px-3 py-3 text-right">Refund</th>
            <th className="px-3 py-3 text-right">Net payout</th>
            {!compact && <th className="px-3 py-3 text-right">Status</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.orderId || row.orderNumber} className="hover:bg-slate-50">
              <td className="px-3 py-3">
                <p className="font-mono text-xs font-semibold text-slate-900">#{row.orderNumber}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(row.orderDate)}</p>
              </td>
              <td className="max-w-xs px-3 py-3">
                <p className="truncate font-semibold text-slate-900">{row.productsSummary || "Order items"}</p>
                <p className="mt-1 text-xs text-slate-500">{row.itemCount || 0} item(s)</p>
              </td>
              <td className="px-3 py-3 text-right text-slate-700">{formatPrice(row.saleAmount || 0)}</td>
              <td className="px-3 py-3 text-right text-rose-700">
                -{formatPrice(row.platformCommissionAmount || 0)}
                <span className="ml-1 text-xs text-slate-400">({row.platformCommissionRate || 0}%)</span>
              </td>
              <td className="px-3 py-3 text-right text-emerald-700">{formatPrice(row.shippingFeeCredited || 0)}</td>
              <td className="px-3 py-3 text-right text-amber-700">-{formatPrice(row.shippingFeeDebited || 0)}</td>
              <td className="px-3 py-3 text-right text-rose-700">-{formatPrice(row.refundDeducted || 0)}</td>
              <td className="px-3 py-3 text-right font-bold text-slate-950">{formatPrice(row.netPayout || 0)}</td>
              {!compact && (
                <td className="px-3 py-3 text-right">
                  <StatusBadge status={row.itemStatus} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function bucketTone(type) {
  const tones = {
    credit: "border-emerald-200 bg-emerald-50 text-emerald-700",
    debit: "border-rose-200 bg-rose-50 text-rose-700",
    hold: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-sky-200 bg-sky-50 text-sky-700",
  };
  return tones[type] || "border-slate-200 bg-slate-100 text-slate-600";
}

function MiniLedger({ label, value, danger = false, success = false, warning = false, strong = false }) {
  const color = danger ? "text-rose-700" : success ? "text-emerald-700" : warning ? "text-amber-700" : strong ? "text-slate-950" : "text-slate-700";

  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MetricCard({ icon, label, value, note, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone] || tones.sky}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function MiniStat({ label, value, danger = false, success = false, strong = false }) {
  const color = danger ? "text-rose-700" : success ? "text-emerald-700" : strong ? "text-orange-700" : "text-slate-950";

  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PanelTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {createElement(icon, { className: "h-4 w-4" })}
      </span>
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function BreakdownRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={strong ? "font-bold text-slate-950" : "text-slate-600"}>{label}</span>
      <span className={strong ? "text-lg font-bold text-slate-950" : "font-semibold text-slate-900"}>{value}</span>
    </div>
  );
}

function DownloadAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
    >
      <span className="inline-flex items-center gap-2">
        {createElement(icon, { className: "h-4 w-4" })}
        {label}
      </span>
      <Download className="h-4 w-4" />
    </button>
  );
}

function StatusBadge({ status }) {
  const value = status || "pending";
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[value] || "border-slate-200 bg-slate-100 text-slate-600"}`}>
      {normalizeStatus(value)}
    </span>
  );
}
