import { createElement, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  CalendarClock,
  Download,
  FileSpreadsheet,
  Landmark,
  ListChecks,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import useCurrency from "../../hooks/useCurrency";
import {
  createVendorPayout,
  downloadFinanceRevenueReport,
  getAllPayouts,
  getFinanceAuditLog,
  getFinanceCommissionRules,
  getFinanceEscrowRules,
  getFinanceLedger,
  getFinanceOperationsOverview,
  getFinancePayoutQueue,
  getFinancePayoutSchedule,
  getFinanceRefundWorkflow,
  getFinanceRevenueReports,
  markPayoutPaid,
  reviewFinanceRefund,
  saveFinanceCommissionRule,
  updateFinanceEscrowRules,
  updateFinancePayoutSchedule,
} from "../../services/api";

const tabs = [
  { key: "queue", label: "Payout Queue", icon: Wallet },
  { key: "ledger", label: "Ledger", icon: ReceiptText },
  { key: "rules", label: "Commission Rules", icon: Scale },
  { key: "refunds", label: "Refunds", icon: ListChecks },
  { key: "reports", label: "Reports", icon: FileSpreadsheet },
  { key: "settings", label: "Cycle & Escrow", icon: CalendarClock },
  { key: "audit", label: "Audit Log", icon: ShieldCheck },
];

const dayOptions = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ruleDefaults = {
  name: "",
  categoryId: "",
  vendorTier: "all",
  campaignType: "all",
  commissionRate: "",
  effectiveFrom: "",
  effectiveTo: "",
  priority: 0,
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
};

const shortId = (value = "") => value.toString().slice(-8).toUpperCase();
const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const orderRef = (order = {}) =>
  order.orderNumber || order.orderNo || `#${shortId(order.orderId || order._id || "")}`;

const productSummary = (order = {}) => {
  const names = Array.isArray(order.productNames) ? order.productNames.filter(Boolean) : [];
  if (names.length === 0) return "Order items";
  const remaining = Math.max(0, toNumber(order.itemsCount) - names.length);
  return `${names.join(", ")}${remaining > 0 ? ` +${remaining} more` : ""}`;
};

const statusClass = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
  approved: "border-blue-200 bg-blue-50 text-blue-800",
  paid: "border-green-200 bg-green-50 text-green-800",
  completed: "border-green-200 bg-green-50 text-green-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  active: "border-green-200 bg-green-50 text-green-800",
};

function Badge({ value }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass[value] || "border-gray-200 bg-gray-50 text-gray-700"}`}>
      {String(value || "unknown").replace(/_/g, " ")}
    </span>
  );
}

function Metric({ icon, label, value, tone = "text-gray-900" }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {createElement(icon, { className: "h-4 w-4 text-gray-400" })}
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminPayouts() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("queue");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [queue, setQueue] = useState({ vendors: [], summary: {}, schedule: {} });
  const [payouts, setPayouts] = useState([]);
  const [ledger, setLedger] = useState({ data: [], summary: {} });
  const [rules, setRules] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [reports, setReports] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    frequency: "weekly",
    cutoffDay: 0,
    processingDay: 1,
    minimumPayout: 1000,
    timezone: "Asia/Dhaka",
  });
  const [escrowForm, setEscrowForm] = useState({
    holdPercentage: 15,
    holdDaysAfterDelivery: 7,
    disputeHoldPercentage: 100,
    releaseAfterReturnWindow: true,
  });
  const [ruleForm, setRuleForm] = useState(ruleDefaults);
  const [payModal, setPayModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ transactionId: "", note: "" });
  const [refundForm, setRefundForm] = useState({ refundMethod: "manual_transfer", amount: "", note: "" });

  const topMetrics = useMemo(() => {
    const revenue = overview?.revenueSummary || reports?.summary || {};
    const payoutSummary = queue.summary || {};
    return {
      commission: revenue.commission || 0,
      payable: payoutSummary.totalPayable || overview?.payoutQueue?.totalPayable || 0,
      withheld: payoutSummary.totalWithheld || 0,
      refunds: overview?.pendingRefunds || refunds.length || 0,
    };
  }, [overview, queue, reports, refunds]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        queueRes,
        payoutRes,
        scheduleRes,
        escrowRes,
        rulesRes,
        ledgerRes,
        refundRes,
        reportRes,
        auditRes,
      ] = await Promise.all([
        getFinanceOperationsOverview(),
        getFinancePayoutQueue(),
        getAllPayouts({ limit: 12 }),
        getFinancePayoutSchedule(),
        getFinanceEscrowRules(),
        getFinanceCommissionRules(),
        getFinanceLedger({ limit: 100 }),
        getFinanceRefundWorkflow(),
        getFinanceRevenueReports({ groupBy: "day" }),
        getFinanceAuditLog(),
      ]);

      setOverview(overviewRes.data.data);
      setQueue(queueRes.data.data || { vendors: [], summary: {}, schedule: {} });
      setPayouts(payoutRes.data.payouts || []);
      setRules(rulesRes.data.data || []);
      setLedger({ data: ledgerRes.data.data || [], summary: ledgerRes.data.summary || {} });
      setRefunds(refundRes.data.data || []);
      setReports(reportRes.data.data);
      setAuditLog(auditRes.data.data || []);

      const schedule = scheduleRes.data.data || {};
      setScheduleForm({
        frequency: schedule.frequency || "weekly",
        cutoffDay: Number(schedule.cutoffDay ?? 0),
        processingDay: Number(schedule.processingDay ?? 1),
        minimumPayout: Number(schedule.minimumPayout ?? 1000),
        timezone: schedule.timezone || "Asia/Dhaka",
      });
      setEscrowForm((current) => ({ ...current, ...(escrowRes.data.data || {}) }));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveSchedule = async (event) => {
    event.preventDefault();
    try {
      await updateFinancePayoutSchedule(scheduleForm);
      toast.success("Payout cycle updated");
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update payout cycle");
    }
  };

  const saveEscrow = async (event) => {
    event.preventDefault();
    try {
      await updateFinanceEscrowRules(escrowForm);
      toast.success("Escrow rules updated");
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update escrow rules");
    }
  };

  const saveRule = async (event) => {
    event.preventDefault();
    try {
      await saveFinanceCommissionRule({
        ...ruleForm,
        commissionRate: Number(ruleForm.commissionRate),
        priority: Number(ruleForm.priority || 0),
      });
      toast.success("Commission rule saved");
      setRuleForm(ruleDefaults);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save commission rule");
    }
  };

  const payQueuedVendor = async () => {
    if (!payModal) return;
    if (!paymentForm.transactionId.trim()) {
      toast.error("Transaction reference is required");
      return;
    }
    try {
      const created = await createVendorPayout(payModal.vendorId, {
        amount: payModal.payableBalance,
        note: paymentForm.note || "Admin payout queue payment",
        periodStart: queue.schedule?.currentPeriodStart,
        periodEnd: queue.schedule?.currentPeriodEnd,
      });
      const payoutId = created.data.data?._id;
      if (payoutId) {
        await markPayoutPaid(payoutId, {
          transactionId: paymentForm.transactionId,
          note: paymentForm.note,
        });
      }
      toast.success("Vendor payout marked paid");
      setPayModal(null);
      setPaymentForm({ transactionId: "", note: "" });
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to pay vendor");
    }
  };

  const submitRefundDecision = async (returnId, decision) => {
    try {
      await reviewFinanceRefund(returnId, {
        decision,
        refundMethod: refundForm.refundMethod,
        amount: refundForm.amount ? Number(refundForm.amount) : undefined,
        note: refundForm.note,
      });
      toast.success(decision === "approve" ? "Refund approved" : "Refund rejected");
      setRefundForm({ refundMethod: "manual_transfer", amount: "", note: "" });
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to review refund");
    }
  };

  const exportReport = async (format) => {
    try {
      const response = await downloadFinanceRevenueReport({ format, groupBy: "day" });
      const type = format === "pdf" ? "application/pdf" : "text/csv";
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `revenue-report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to export report");
    }
  };

  const payModalOrders = payModal?.payoutOrders || payModal?.eligibleOrders || [];
  const payModalOrderCount = payModal?.payoutOrdersCount || payModal?.eligibleOrdersCount || payModalOrders.length;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance & Payouts</h1>
            <p className="text-sm text-gray-500">Real payout cycles, ledger, commission rules, refunds, escrow, and audit controls.</p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Landmark} label="Platform Commission" value={formatPrice(topMetrics.commission)} tone="text-blue-700" />
          <Metric icon={Wallet} label="Payable Queue" value={formatPrice(topMetrics.payable)} tone="text-green-700" />
          <Metric icon={LockKeyhole} label="Withheld / Escrow" value={formatPrice(topMetrics.withheld)} tone="text-indigo-700" />
          <Metric icon={ListChecks} label="Refund Reviews" value={topMetrics.refunds} tone="text-red-700" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                activeTab === key ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {createElement(icon, { className: "h-4 w-4" })}
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500">Loading finance data...</div>
        ) : (
          <div className="mt-6">
            {activeTab === "queue" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h2 className="font-semibold text-gray-900">Payout Queue</h2>
                    <p className="text-xs text-gray-500">
                      {queue.summary?.payableVendors || 0} vendors meet the current payable rules. Next processing: {formatDate(queue.schedule?.nextProcessingDate)}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3 text-right">Net sale</th>
                          <th className="px-4 py-3 text-right">Seller discount</th>
                          <th className="px-4 py-3 text-right">Payable</th>
                          <th className="px-4 py-3 text-right">Withheld</th>
                          <th className="px-4 py-3 text-right">Pending</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(queue.vendors || []).map((vendor) => (
                          <tr key={vendor.vendorId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link to={`/admin/vendors/${vendor.vendorId}`} className="font-semibold text-blue-700 hover:text-blue-900">
                                {vendor.vendorName}
                              </Link>
                              <div className="text-xs text-gray-500">{vendor.vendorTier} tier, {vendor.ordersCount} orders</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(vendor.netOrderSales || 0)}</td>
                            <td className="px-4 py-3 text-right text-blue-700">-{formatPrice(vendor.sellerFundedDiscount || 0)}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-700">{formatPrice(vendor.payableBalance || 0)}</td>
                            <td className="px-4 py-3 text-right text-indigo-700">{formatPrice(vendor.withheldAmount || 0)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatPrice(vendor.pendingClearance || 0)}</td>
                            <td className="px-4 py-3 text-gray-600">{vendor.payoutMethodLabel || "Not configured"}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={!vendor.meetsMinimum}
                                onClick={() => setPayModal(vendor)}
                                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Review & Pay
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="rounded-lg border border-gray-200 bg-white lg:col-span-4">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h2 className="font-semibold text-gray-900">Recent Payouts</h2>
                  </div>
                  {(payouts || []).slice(0, 10).map((payout) => (
                    <div key={payout._id} className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{payout.vendorName || "Vendor"}</p>
                          <p className="text-xs text-gray-500">{formatDate(payout.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatPrice(payout.amount || 0)}</p>
                          <Badge value={payout.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </aside>
              </div>
            )}

            {activeTab === "ledger" && (
              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">Transaction Ledger</h2>
                    <p className="text-xs text-gray-500">{ledger.summary?.events || ledger.data.length} events with running vendor balance</p>
                  </div>
                  <ReceiptText className="h-5 w-5 text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ledger.data.map((row) => (
                        <tr key={row.eventKey} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{formatDate(row.occurredAt)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{row.vendorName}</td>
                          <td className="px-4 py-3"><Badge value={row.type} /></td>
                          <td className="px-4 py-3 text-gray-600">{row.orderId ? `Order #${shortId(row.orderId)}` : row.payoutId ? `Payout #${shortId(row.payoutId)}` : row.returnId ? `Return #${shortId(row.returnId)}` : "N/A"}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.amount < 0 ? "text-red-700" : "text-green-700"}`}>{formatPrice(row.amount || 0)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(row.balanceAfter || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "rules" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <form onSubmit={saveRule} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-4">
                  <h2 className="font-semibold text-gray-900">Commission Rule</h2>
                  <div className="mt-4 space-y-3">
                    <input value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Rule name" />
                    <input value={ruleForm.categoryId} onChange={(e) => setRuleForm({ ...ruleForm, categoryId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Category ID, blank for all" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={ruleForm.vendorTier} onChange={(e) => setRuleForm({ ...ruleForm, vendorTier: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Tier" />
                      <input value={ruleForm.campaignType} onChange={(e) => setRuleForm({ ...ruleForm, campaignType: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Campaign" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={ruleForm.commissionRate} onChange={(e) => setRuleForm({ ...ruleForm, commissionRate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Rate %" />
                      <input type="number" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Priority" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={ruleForm.effectiveFrom} onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      <input type="date" value={ruleForm.effectiveTo} onChange={(e) => setRuleForm({ ...ruleForm, effectiveTo: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Save Rule</button>
                  </div>
                </form>

                <section className="rounded-lg border border-gray-200 bg-white lg:col-span-8">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h2 className="font-semibold text-gray-900">Rules Engine</h2>
                    <p className="text-xs text-gray-500">Priority resolves category, tier, and campaign overlaps.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Rule</th>
                          <th className="px-4 py-3">Scope</th>
                          <th className="px-4 py-3 text-right">Rate</th>
                          <th className="px-4 py-3">Effective</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rules.map((rule) => (
                          <tr key={rule._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                            <td className="px-4 py-3 text-gray-600">Category {rule.categoryId || "all"}, tier {rule.vendorTier || "all"}, campaign {rule.campaignType || "all"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{rule.commissionRate}%</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(rule.effectiveFrom)} - {formatDate(rule.effectiveTo)}</td>
                            <td className="px-4 py-3"><Badge value={rule.status || "active"} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "refunds" && (
              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="font-semibold text-gray-900">Refund Approval Workflow</h2>
                  <p className="text-xs text-gray-500">Approve return-triggered refunds and choose how the buyer gets paid.</p>
                </div>
                <div className="border-b border-gray-100 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <select value={refundForm.refundMethod} onChange={(e) => setRefundForm({ ...refundForm, refundMethod: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      <option value="original_payment">Original payment</option>
                      <option value="store_credit">Store credit</option>
                      <option value="manual_transfer">Manual transfer</option>
                    </select>
                    <input value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Override amount" />
                    <input value={refundForm.note} onChange={(e) => setRefundForm({ ...refundForm, note: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Finance note" />
                  </div>
                </div>
                {(refunds || []).map((item) => (
                  <div key={item._id} className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{item.productTitle || item.productName || "Return request"}</p>
                      <p className="text-sm text-gray-500">Order #{shortId(item.orderId)} - {item.vendorName || "Vendor"} - {formatPrice(item.refundAmount || item.totalAmount || item.amount || 0)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => submitRefundDecision(item._id, "approve")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                      <button type="button" onClick={() => submitRefundDecision(item._id, "reject")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Reject</button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {activeTab === "reports" && reports && (
              <div className="space-y-6">
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => exportReport("csv")} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4" /> CSV</button>
                  <button type="button" onClick={() => exportReport("pdf")} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"><Download className="h-4 w-4" /> PDF</button>
                </div>
                <section className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h2 className="font-semibold text-gray-900">Revenue By Day</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">GMV</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-right">Vendor Earnings</th><th className="px-4 py-3 text-right">Refunds</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reports.byDate?.map((row) => (
                          <tr key={row.key} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{row.key}</td>
                            <td className="px-4 py-3 text-right">{formatPrice(row.gmv)}</td>
                            <td className="px-4 py-3 text-right">{formatPrice(row.commission)}</td>
                            <td className="px-4 py-3 text-right">{formatPrice(row.vendorEarnings)}</td>
                            <td className="px-4 py-3 text-right text-red-700">{formatPrice(row.refunds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <div className="grid gap-6 lg:grid-cols-3">
                  {[
                    ["By Category", reports.byCategory, "categoryName"],
                    ["By Vendor", reports.byVendor, "vendorName"],
                    ["By Payment Method", reports.byPaymentMethod, "key"],
                  ].map(([title, rows, labelKey]) => (
                    <section key={title} className="rounded-lg border border-gray-200 bg-white">
                      <div className="border-b border-gray-200 px-4 py-3"><h2 className="font-semibold text-gray-900">{title}</h2></div>
                      {(rows || []).slice(0, 6).map((row) => (
                        <div key={`${title}-${row.key}`} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0">
                          <p className="font-medium text-gray-900">{row[labelKey] || row.key}</p>
                          <p className="text-sm font-semibold text-gray-700">{formatPrice(row.commission)}</p>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={saveSchedule} className="rounded-lg border border-gray-200 bg-white p-4">
                  <h2 className="font-semibold text-gray-900">Payout Cycle Management</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <select value={scheduleForm.frequency} onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                    </select>
                    <input type="number" value={scheduleForm.minimumPayout} onChange={(e) => setScheduleForm({ ...scheduleForm, minimumPayout: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Minimum payout" />
                    <select value={scheduleForm.cutoffDay} onChange={(e) => setScheduleForm({ ...scheduleForm, cutoffDay: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      {dayOptions.map((day, index) => <option key={day} value={index}>Cutoff: {day}</option>)}
                    </select>
                    <select value={scheduleForm.processingDay} onChange={(e) => setScheduleForm({ ...scheduleForm, processingDay: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      {dayOptions.map((day, index) => <option key={day} value={index}>Processing: {day}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="mt-4 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Save Cycle</button>
                </form>

                <form onSubmit={saveEscrow} className="rounded-lg border border-gray-200 bg-white p-4">
                  <h2 className="font-semibold text-gray-900">Withholding / Escrow Rules</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="number" value={escrowForm.holdPercentage} onChange={(e) => setEscrowForm({ ...escrowForm, holdPercentage: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Hold %" />
                    <input type="number" value={escrowForm.holdDaysAfterDelivery} onChange={(e) => setEscrowForm({ ...escrowForm, holdDaysAfterDelivery: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Hold days" />
                    <input type="number" value={escrowForm.disputeHoldPercentage} onChange={(e) => setEscrowForm({ ...escrowForm, disputeHoldPercentage: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Dispute hold %" />
                    <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      <input type="checkbox" checked={escrowForm.releaseAfterReturnWindow} onChange={(e) => setEscrowForm({ ...escrowForm, releaseAfterReturnWindow: e.target.checked })} />
                      Release after return window
                    </label>
                  </div>
                  <button type="submit" className="mt-4 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Save Escrow</button>
                </form>
              </div>
            )}

            {activeTab === "audit" && (
              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="font-semibold text-gray-900">Finance Audit Log</h2>
                  <p className="text-xs text-gray-500">Payout actions, refund overrides, commission changes, and settings updates.</p>
                </div>
                {(auditLog || []).map((log) => (
                  <div key={log._id || `${log.action}-${log.createdAt}`} className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <p className="font-semibold text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500">{formatDate(log.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-600">Actor: {log.actor?.email || log.actor?.userId || "admin"} - Target: {log.target?.type || "finance"} {log.target?.id || ""}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </main>

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-green-700" />
                <div>
                  <h2 className="font-semibold text-gray-900">Review Vendor Payout</h2>
                  <p className="text-sm text-gray-500">{payModal.vendorName} - final payable {formatPrice(payModal.payableBalance)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 px-4 py-2 text-right">
                <p className="text-xs font-semibold uppercase text-green-700">Payable now</p>
                <p className="text-xl font-bold text-green-800">{formatPrice(payModal.payableBalance || 0)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Original product sales</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(payModal.grossOrderSales || 0)}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-semibold uppercase text-blue-700">Vendor discounts</p>
                <p className="mt-1 text-lg font-bold text-blue-800">-{formatPrice(payModal.sellerFundedDiscount || 0)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Net seller sale</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(payModal.netOrderSales || 0)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Commission deducted</p>
                <p className="mt-1 text-lg font-bold text-gray-900">-{formatPrice(payModal.commissionDeducted || 0)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Order earnings</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(payModal.orderEarnings || 0)}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-xs font-semibold uppercase text-indigo-700">Escrow withheld</p>
                <p className="mt-1 text-lg font-bold text-indigo-800">{formatPrice(payModal.withheldAmount || 0)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Returns deducted</p>
                <p className="mt-1 text-lg font-bold text-gray-900">-{formatPrice(payModal.refundDeductions || 0)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Paid or pending payouts</p>
                <p className="mt-1 text-lg font-bold text-gray-900">-{formatPrice(payModal.paidOrPendingPayouts || 0)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Orders included in this payable</h3>
                  <p className="text-xs text-gray-500">
                    Showing {Math.min(payModalOrders.length, 12)} of {payModalOrderCount} linked order(s).
                  </p>
                </div>
                <ReceiptText className="h-5 w-5 text-gray-400" />
              </div>
              {payModalOrders.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Products</th>
                        <th className="px-4 py-3 text-right">Original</th>
                        <th className="px-4 py-3 text-right">Discount</th>
                        <th className="px-4 py-3 text-right">Net sale</th>
                        <th className="px-4 py-3 text-right">Commission</th>
                        <th className="px-4 py-3 text-right">Withheld</th>
                        <th className="px-4 py-3 text-right">Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payModalOrders.slice(0, 12).map((order) => (
                        <tr key={order.orderId || order.orderNumber} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-bold text-gray-700">{orderRef(order)}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.deliveredAt || order.orderDate)}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <p className="max-w-56 truncate">{productSummary(order)}</p>
                            <p className="text-xs text-gray-500">{order.itemsCount || 0} item(s)</p>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatPrice(order.grossSaleAmount || 0)}</td>
                          <td className="px-4 py-3 text-right text-blue-700">-{formatPrice(order.sellerFundedDiscount || 0)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(order.netSaleAmount || 0)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">-{formatPrice(order.commissionAmount || 0)}</td>
                          <td className="px-4 py-3 text-right text-indigo-700">{formatPrice(order.withheldAmount || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-700">{formatPrice(order.payableAmount ?? order.earnings ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">
                  No linked order breakdown is available for this payout row.
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input value={paymentForm.transactionId} onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Transaction reference" />
              <textarea value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} placeholder="Payment note" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPayModal(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="button" onClick={payQueuedVendor} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white">Confirm Payable Paid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
