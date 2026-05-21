import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  Box,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  FileCheck2,
  Filter,
  Headphones,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Store,
  Tags,
  TrendingDown,
  TrendingUp,
  Users,
  X,
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
import {
  bulkUpdateAdminCases,
  deleteAdminSavedView,
  getAdminCaseAssignment,
  getAdminDashboardOverview,
  getAdminSavedViews,
  saveAdminSavedView,
  updateAdminCaseAssignment,
} from "../../services/api";

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
    payoutExposure: 0,
    activeDisputes: 0,
    activeVendors: 0,
    supportOpen: 0,
    supportSlaBreaches: 0,
    reviewModeration: 0,
    failedNotifications: 0,
    failedBulkJobs: 0,
    refundAmount: 0,
    refundRate: 0,
    cancellationRate: 0,
  },
  revenueTotals: { gmv: 0, commission: 0, refunds: 0 },
  comparison: {
    gmvChange: 0,
    ordersChange: 0,
    commissionChange: 0,
    refundsChange: 0,
    refundRateChange: 0,
  },
  opsSummary: {
    supportOpen: 0,
    supportSlaBreaches: 0,
    failedNotifications: 0,
    failedBulkJobs: 0,
    failedPayments: 0,
    analyticsCronStatus: "watch",
    analyticsUpdatedAt: null,
  },
  revenueSeries: [],
  orderFunnel: [],
  activityFeed: [],
  healthAlerts: [],
  exceptionInbox: {
    summary: {
      total: 0,
      critical: 0,
      breached: 0,
      financeExposure: 0,
      owners: [],
    },
    items: [],
  },
  adminHardening: {
    staffWorkload: {
      totalOpen: 0,
      assigned: 0,
      unassigned: 0,
      overdue: 0,
      critical: 0,
      staff: [],
    },
    financeReconciliation: {
      codOutstanding: 0,
      codOrders: 0,
      refundExposure: 0,
      payoutHolds: 0,
      pendingPayoutExposure: 0,
      vendorDeductions: 0,
      unresolvedBuckets: 0,
      status: "clear",
    },
    integrationReadiness: {
      ready: 0,
      watch: 0,
      manual: 0,
      integrations: [],
    },
  },
  topVendors: [],
  topCategories: [],
  topProductsToday: [],
  pendingActions: {
    vendorApprovals: 0,
    productModeration: 0,
    payoutRequests: 0,
    returnDisputes: 0,
    kycReviews: 0,
    supportTickets: 0,
    reviewModeration: 0,
    failedNotifications: 0,
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
    path: "/admin/products",
    icon: PackageSearch,
  },
  {
    key: "reviewModeration",
    label: "Review moderation",
    path: "/admin/reviews",
    icon: ShieldAlert,
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
    key: "supportTickets",
    label: "Support tickets",
    path: "/admin/support",
    icon: Headphones,
  },
  {
    key: "kycReviews",
    label: "KYC reviews",
    path: "/admin/vendor-requests",
    icon: FileCheck2,
  },
  {
    key: "failedNotifications",
    label: "Failed messages",
    path: "/admin/operations",
    icon: BellRing,
  },
];

const adminControlSections = [
  {
    key: "system",
    title: "System Command",
    description: "Health, audits, analytics, platform settings, and delivery rules.",
    icon: ShieldAlert,
    controls: [
      { label: "Operations", path: "/admin/operations", metricKey: "operations", detail: "Jobs, delivery, queue health" },
      { label: "Audit Logs", path: "/admin/audit-logs", metricKey: "audit", detail: "Admin evidence trail" },
      { label: "Analytics & Reports", path: "/admin/analytics", metricKey: "analytics", detail: "GMV and marketplace reports" },
      { label: "Platform Control", path: "/admin/platform", metricKey: "platform", detail: "Global platform switches" },
      { label: "Delivery Settings", path: "/admin/delivery-settings", metricKey: "delivery", detail: "Shipping zones and delivery rules" },
    ],
  },
  {
    key: "vendors",
    title: "Vendor Control",
    description: "Seller approvals, KYC, activity, shop review, and vendor chat.",
    icon: Store,
    controls: [
      { label: "Vendor Requests", path: "/admin/vendor-requests", metricKey: "vendorApprovals", detail: "New seller applications" },
      { label: "KYC Review", path: "/admin/vendor-kyc", metricKey: "kycReviews", detail: "Identity and shop checks" },
      { label: "All Vendors", path: "/admin/vendors", metricKey: "activeVendors", detail: "Vendor directory" },
      { label: "Shop by brand", path: "/admin/vendors", metricKey: "shopByBrand", detail: "Featured brands homepage visibility" },
      { label: "Vendor Activity", path: "/admin/vendor-activity", metricKey: "vendorActivity", detail: "Seller behavior and health" },
      { label: "Vendor Chats", path: "/admin/chats", metricKey: "vendorChats", detail: "Admin to seller messages" },
    ],
  },
  {
    key: "catalog",
    title: "Catalog Control",
    description: "Products, inventory, category structure, and seller category requests.",
    icon: PackageSearch,
    controls: [
      { label: "Products", path: "/admin/products", metricKey: "productModeration", detail: "Listings and moderation" },
      { label: "Add Product", path: "/admin/products/add", metricKey: "addProduct", detail: "Create admin product" },
      { label: "Inventory", path: "/admin/inventory", metricKey: "inventory", detail: "Stock and SKU health" },
      { label: "Categories", path: "/admin/categories", metricKey: "categories", detail: "Dynamic category tree" },
      { label: "Manage Categories", path: "/admin/categories/manage", metricKey: "manageCategories", detail: "Category admin tools" },
      { label: "Category Requests", path: "/admin/category-requests", metricKey: "categoryRequests", detail: "Seller category requests" },
    ],
  },
  {
    key: "orders",
    title: "Order & Service Control",
    description: "Global orders, returns, logistics, parcel assignment, and support.",
    icon: ShoppingCart,
    controls: [
      { label: "All Orders", path: "/admin/orders", metricKey: "orders", detail: "Global order queue" },
      { label: "COD Delivery", path: "/admin/cod-delivery", metricKey: "codDelivery", detail: "Confirm COD payments" },
      { label: "Returns", path: "/admin/returns", metricKey: "returnDisputes", detail: "Return and dispute workflow" },
      { label: "Logistics", path: "/admin/logistics", metricKey: "logistics", detail: "Courier and parcel flow" },
      { label: "Ready Pickup", path: "/admin/logistics?tab=ready", metricKey: "readyPickup", detail: "Collect packages from vendors" },
      { label: "Parcel Assignment", path: "/admin/logistics?tab=parcels", metricKey: "parcels", detail: "Assign delivery parcels" },
      { label: "Support Tickets", path: "/admin/support", metricKey: "supportTickets", detail: "Customer service desk" },
    ],
  },
  {
    key: "marketing",
    title: "Marketing Control",
    description: "Promotions, coupons, flash sales, offers, and newsletter broadcasts.",
    icon: Tags,
    controls: [
      { label: "Promotions", path: "/admin/promotions", metricKey: "promotions", detail: "Campaign controls" },
      { label: "Coupons", path: "/admin/coupons", metricKey: "coupons", detail: "Coupon rules" },
      { label: "Flash Sales", path: "/admin/flash-sales", metricKey: "flashSales", detail: "Countdown sale events" },
      { label: "Offers", path: "/admin/offers", metricKey: "offers", detail: "Marketplace offers" },
      { label: "Add Offer", path: "/admin/offers/add", metricKey: "addOffer", detail: "Create offer" },
      { label: "Newsletter", path: "/admin/newsletter", metricKey: "newsletter", detail: "Email campaigns" },
    ],
  },
  {
    key: "finance",
    title: "Finance Control",
    description: "Vendor payouts, payout requests, manual payments, refunds, and exposure.",
    icon: Banknote,
    controls: [
      { label: "Vendor Payouts", path: "/admin/payouts", metricKey: "pendingPayouts", detail: "Payout ledger" },
      { label: "Payout Requests", path: "/admin/payout-requests", metricKey: "payoutRequests", detail: "Seller withdrawal queue" },
      { label: "Manual Payments", path: "/admin/payment-verifications", metricKey: "manualPayments", detail: "Payment verification" },
    ],
  },
  {
    key: "customers",
    title: "Customer Trust Control",
    description: "Customers, roles, trust checks, reviews, Q&A, and customer insights.",
    icon: Users,
    controls: [
      { label: "Customers", path: "/admin/customers", metricKey: "customers", detail: "Customer directory" },
      { label: "Trust & Safety", path: "/admin/trust-safety", metricKey: "trustSafety", detail: "Fraud and risk controls" },
      { label: "User Roles", path: "/admin/users", metricKey: "userRoles", detail: "Admin and user permissions" },
      { label: "Insights", path: "/admin/insights", metricKey: "insights", detail: "Customer analytics" },
      { label: "Reviews", path: "/admin/reviews", metricKey: "reviewModeration", detail: "Review moderation" },
      { label: "Q&A", path: "/admin/qa", metricKey: "qa", detail: "Product questions" },
    ],
  },
];

const exceptionFilters = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "breached", label: "SLA breach" },
  { value: "vendor", label: "Vendor" },
  { value: "catalog", label: "Catalog" },
  { value: "finance", label: "Finance" },
  { value: "support", label: "Support" },
  { value: "trust", label: "Trust" },
  { value: "ops", label: "Ops" },
];

const activityStyles = {
  order: "bg-[#eef8fb] text-[#1a6387]",
  vendor: "bg-[#E9FFF3] text-[#008A3D]",
  product: "bg-amber-50 text-amber-700",
  payment: "bg-rose-50 text-rose-700",
};

const adminSurface =
  "rounded-lg border border-[#DDE3EA] bg-white shadow-sm shadow-[#1A1A2E]/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";

const adminInteractiveSurface =
  "rounded-lg border border-[#DDE3EA] bg-white shadow-sm shadow-[#1A1A2E]/5 transition hover:border-[#1e7098]/50 hover:bg-[#f4fbfd] hover:shadow-md hover:shadow-primary-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-[#1e7098]/60 dark:hover:bg-[#1e7098]/10";

const adminInput =
  "rounded-lg border border-[#DDE3EA] bg-white text-sm text-slate-900 outline-none transition focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const compactNumber = (value) => {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000000) return `${(number / 10000000).toFixed(1)}Cr`;
  if (Math.abs(number) >= 100000) return `${(number / 100000).toFixed(1)}L`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}k`;
  return `${Math.round(number)}`;
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-US");

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatChange = (value) => {
  const number = Number(value || 0);
  if (Object.is(number, -0)) return "0.0%";
  return `${number > 0 ? "+" : ""}${number.toFixed(1)}%`;
};

const formatDateTime = (value) => {
  if (!value) return "Not updated";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toDateTimeInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
};

const formatAgeHours = (value) => {
  const hours = Number(value || 0);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h open`;
  return `${(hours / 24).toFixed(hours >= 48 ? 0 : 1)}d open`;
};

const formatCaseStatus = (value) =>
  String(value || "open")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const caseStatusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
];

const casePriorityOptions = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const emptyBulkCaseForm = {
  assignedTo: "",
  status: "",
  priority: "",
  dueAt: "",
  note: "",
};

const getExceptionIcon = (type) => {
  if (type === "vendor_approval" || type === "kyc_review") return Store;
  if (type === "product_moderation" || type === "bulk_upload") return PackageSearch;
  if (type === "review_moderation" || type === "return_dispute") return ShieldAlert;
  if (type === "payment" || type === "payout") return CreditCard;
  if (type === "support") return Headphones;
  if (type === "notification" || type === "newsletter") return BellRing;
  return AlertTriangle;
};

const getExceptionTone = (issue = {}) => {
  if (issue.priority === "critical" || issue.breached) return "rose";
  if (issue.priority === "high") return "amber";
  return "sky";
};

const exceptionToneClasses = {
  amber: {
    card: "border-amber-200 bg-amber-50/60 dark:border-amber-900/70 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
    pill: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
  rose: {
    card: "border-rose-200 bg-rose-50/70 dark:border-rose-900/70 dark:bg-rose-950/20",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
    pill: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  },
  sky: {
    card: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    icon: "bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200",
    pill: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
};

const priorityBadgeTone = {
  critical: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  high: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  normal: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const filterCountFor = (items = [], filter = "all") =>
  items.filter((issue) => matchesExceptionFilter(issue, filter)).length;

const matchesExceptionFilter = (issue = {}, filter = "all") => {
  if (filter === "all") return true;
  if (filter === "critical") return issue.priority === "critical";
  if (filter === "breached") return Boolean(issue.breached);
  if (filter === "vendor") return issue.owner === "Vendor Ops";
  if (filter === "catalog") return issue.owner === "Catalog";
  if (filter === "finance") return issue.owner === "Finance";
  if (filter === "support") return issue.owner === "Support";
  if (filter === "trust") return issue.owner === "Trust & Safety";
  if (filter === "ops") return ["Engineering", "Comms", "Marketing"].includes(issue.owner);
  return true;
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
    sky: {
      icon: "bg-[#eef8fb] text-[#1a6387] ring-[#1e7098]/15 dark:bg-primary-900/40 dark:text-primary-200 dark:ring-primary-900/50",
      accent: "bg-[#1e7098]",
    },
    emerald: {
      icon: "bg-[#E9FFF3] text-[#008A3D] ring-[#00B14F]/15 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50",
      accent: "bg-[#00B14F]",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50",
      accent: "bg-amber-500",
    },
    rose: {
      icon: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50",
      accent: "bg-rose-500",
    },
    indigo: {
      icon: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/50",
      accent: "bg-indigo-500",
    },
    slate: {
      icon: "bg-[#EEEEEE] text-[#1A1A2E] ring-[#E0E0E0] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
      accent: "bg-[#1A1A2E]",
    },
  };
  const toneClasses = tones[tone] || tones.sky;

  return (
    <div className={`${adminSurface} relative overflow-hidden p-4`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${toneClasses.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-950 dark:text-white">
            {loading ? "..." : value}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className={`rounded-lg p-2.5 ring-1 ${toneClasses.icon}`}>
          <IconComponent className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChangePill({ label, value }) {
  const number = Number(value || 0);
  const tone =
    number > 0
      ? "bg-[#E9FFF3] text-[#008A3D]"
      : number < 0
        ? "bg-rose-50 text-rose-700"
        : "bg-[#EEEEEE] text-slate-600";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {label} {formatChange(number)}
    </span>
  );
}

function PendingAction({ item, count }) {
  const Icon = item.icon;
  const hasCount = Number(count || 0) > 0;

  return (
    <Link
      to={item.path}
      className={`${adminInteractiveSurface} flex min-w-[190px] items-center justify-between px-4 py-3`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`rounded-lg p-2 ${hasCount ? "bg-rose-50 text-rose-700" : "bg-[#E9FFF3] text-[#008A3D]"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
      </div>
      <span className={`ml-3 rounded-full px-2 py-0.5 text-xs font-bold ${hasCount ? "bg-rose-600 text-white" : "bg-[#E9FFF3] text-[#008A3D]"}`}>
        {hasCount ? formatCount(count) : "0"}
      </span>
    </Link>
  );
}

const workflowToneStyles = {
  healthy: {
    panel: "border-[#00B14F]/25 bg-[#E9FFF3] text-[#007A38]",
    icon: "bg-[#E9FFF3] text-[#008A3D]",
    bar: "bg-[#00B14F]",
    label: "Ready",
  },
  watch: {
    panel: "border-[#1e7098]/25 bg-[#eef8fb] text-[#1a6387]",
    icon: "bg-[#eef8fb] text-[#1a6387]",
    bar: "bg-[#1e7098]",
    label: "Needs work",
  },
  risk: {
    panel: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    label: "Urgent",
  },
};

const getWorkflowTone = (count, priority = "normal") => {
  if (Number(count || 0) <= 0) return "healthy";
  return priority === "high" ? "risk" : "watch";
};

const buildAdminDashboardWorkflow = ({ pendingActions, exceptionInbox, opsSummary, adminHardening, kpis }) => {
  const summary = exceptionInbox?.summary || emptyDashboard.exceptionInbox.summary;
  const staffWorkload = adminHardening?.staffWorkload || emptyDashboard.adminHardening.staffWorkload;
  const finance = adminHardening?.financeReconciliation || emptyDashboard.adminHardening.financeReconciliation;

  const moderationCount =
    Number(pendingActions.vendorApprovals || 0) +
    Number(pendingActions.productModeration || 0) +
    Number(pendingActions.kycReviews || 0) +
    Number(pendingActions.reviewModeration || 0);
  const supportCount =
    Number(pendingActions.supportTickets || 0) +
    Number(kpis.supportOpen || 0) +
    Number(kpis.supportSlaBreaches || 0) +
    Number(pendingActions.returnDisputes || 0) +
    Number(kpis.activeDisputes || 0);
  const financeCount =
    Number(pendingActions.payoutRequests || 0) +
    Number(kpis.pendingPayouts || 0) +
    Number(finance.unresolvedBuckets || 0) +
    Number(finance.payoutHolds || 0);
  const opsCount =
    Number(opsSummary.failedNotifications || 0) +
    Number(pendingActions.failedNotifications || 0) +
    Number(opsSummary.failedBulkJobs || 0) +
    Number(opsSummary.failedPayments || 0) +
    (opsSummary.analyticsCronStatus && opsSummary.analyticsCronStatus !== "running" ? 1 : 0);

  const steps = [
    {
      key: "triage",
      number: 1,
      label: "Triage risk queue",
      description: "Start with critical exceptions, breached SLA, and high-exposure cases.",
      detail: `${formatCount(summary.critical)} critical / ${formatCount(summary.breached)} SLA breached`,
      count: Number(summary.critical || 0) + Number(summary.breached || 0),
      priority: "high",
      icon: ShieldAlert,
      filter: Number(summary.critical || 0) > 0 ? "critical" : "breached",
      actionLabel: "Review exceptions",
    },
    {
      key: "assignment",
      number: 2,
      label: "Assign ownership",
      description: "Move unassigned and overdue admin cases to a named owner before queue work begins.",
      detail: `${formatCount(staffWorkload.unassigned)} unassigned / ${formatCount(staffWorkload.overdue)} overdue`,
      count: Number(staffWorkload.unassigned || 0) + Number(staffWorkload.overdue || 0),
      priority: "high",
      icon: Users,
      filter: "all",
      actionLabel: "Assign cases",
    },
    {
      key: "service",
      number: 3,
      label: "Protect customer service",
      description: "Clear support SLA, return disputes, and customer-facing escalations.",
      detail: `${formatCount(kpis.supportOpen)} support / ${formatCount(kpis.activeDisputes)} disputes`,
      count: supportCount,
      priority: "medium",
      icon: Headphones,
      to: "/admin/support",
      actionLabel: "Open support desk",
    },
    {
      key: "finance",
      number: 4,
      label: "Reconcile money flow",
      description: "Review payout requests, COD exposure, refund buckets, and held balances.",
      detail: `${formatCount(kpis.pendingPayouts)} payouts / ${formatCount(finance.unresolvedBuckets)} buckets`,
      count: financeCount,
      priority: finance.status === "critical" ? "high" : "medium",
      icon: Banknote,
      to: "/admin/payouts",
      actionLabel: "Open finance desk",
    },
    {
      key: "moderation",
      number: 5,
      label: "Clear marketplace approvals",
      description: "Approve sellers, KYC, product moderation, and review queues.",
      detail: `${formatCount(moderationCount)} approval items`,
      count: moderationCount,
      priority: "medium",
      icon: FileCheck2,
      to: "/admin/vendor-requests",
      actionLabel: "Open approval center",
    },
    {
      key: "ops",
      number: 6,
      label: "Verify system health",
      description: "Close notification failures, failed jobs, payment failures, and stale cron signals.",
      detail: `${formatCount(opsCount)} technical signals`,
      count: opsCount,
      priority: "medium",
      icon: BellRing,
      to: "/admin/operations",
      actionLabel: "Open ops monitor",
    },
  ].map((step) => ({
    ...step,
    done: Number(step.count || 0) <= 0,
    tone: getWorkflowTone(step.count, step.priority),
  }));

  const completed = steps.filter((step) => step.done).length;
  const score = Math.round((completed / steps.length) * 100);
  const openSteps = steps.filter((step) => !step.done);

  return {
    steps,
    openSteps,
    completed,
    total: steps.length,
    score,
    nextStep: openSteps[0] || null,
    totalSignals: steps.reduce((sum, step) => sum + Number(step.count || 0), 0),
    tone: score >= 85 ? "healthy" : score >= 50 ? "watch" : "risk",
  };
};

const buildAdminControlSections = ({ pendingActions, exceptionInbox, opsSummary, adminHardening, kpis }) => {
  const summary = exceptionInbox?.summary || emptyDashboard.exceptionInbox.summary;
  const finance = adminHardening?.financeReconciliation || emptyDashboard.adminHardening.financeReconciliation;
  const staffWorkload = adminHardening?.staffWorkload || emptyDashboard.adminHardening.staffWorkload;
  const readiness = adminHardening?.integrationReadiness || emptyDashboard.adminHardening.integrationReadiness;

  const metric = (value, label, tone = Number(value || 0) > 0 ? "attention" : "ready") => ({
    value: Number(value || 0),
    label,
    tone,
  });

  const metrics = {
    operations: metric(
      Number(summary.total || 0) +
        Number(opsSummary.failedNotifications || 0) +
        Number(opsSummary.failedBulkJobs || 0) +
        Number(opsSummary.failedPayments || 0),
      `${formatCount(summary.total)} exceptions`,
      Number(summary.critical || 0) > 0 ? "critical" : Number(summary.total || 0) > 0 ? "attention" : "ready",
    ),
    audit: { value: 0, label: "Trail", tone: "neutral" },
    analytics: {
      value: opsSummary.analyticsCronStatus === "running" ? 0 : 1,
      label: opsSummary.analyticsCronStatus === "running" ? "Running" : "Watch",
      tone: opsSummary.analyticsCronStatus === "running" ? "ready" : "attention",
    },
    platform: metric(opsSummary.failedNotifications, `${formatCount(opsSummary.failedNotifications)} failed`),
    delivery: { value: 0, label: "Rules", tone: "neutral" },
    vendorApprovals: metric(pendingActions.vendorApprovals, `${formatCount(pendingActions.vendorApprovals)} pending`),
    kycReviews: metric(pendingActions.kycReviews, `${formatCount(pendingActions.kycReviews)} review`),
    activeVendors: { value: Number(kpis.activeVendors || 0), label: `${formatCount(kpis.activeVendors)} active`, tone: "neutral" },
    shopByBrand: { value: 0, label: "Homepage", tone: "neutral" },
    vendorActivity: { value: 0, label: "Monitor", tone: "neutral" },
    vendorChats: { value: 0, label: "Inbox", tone: "neutral" },
    productModeration: metric(pendingActions.productModeration, `${formatCount(pendingActions.productModeration)} pending`),
    addProduct: { value: 0, label: "Create", tone: "neutral" },
    inventory: metric(kpis.failedBulkJobs, `${formatCount(kpis.failedBulkJobs)} jobs`),
    categories: { value: 0, label: "Tree", tone: "neutral" },
    manageCategories: { value: 0, label: "Manage", tone: "neutral" },
    categoryRequests: { value: 0, label: "Requests", tone: "neutral" },
    orders: { value: Number(kpis.todayOrders || 0), label: `${formatCount(kpis.todayOrders)} today`, tone: "neutral" },
    codDelivery: metric(finance.codOrders, `${formatCount(finance.codOrders)} COD`, Number(finance.codOutstanding || 0) > 0 ? "attention" : "neutral"),
    returnDisputes: metric(pendingActions.returnDisputes || kpis.activeDisputes, `${formatCount(pendingActions.returnDisputes || kpis.activeDisputes)} open`),
    logistics: { value: 0, label: "Flow", tone: "neutral" },
    readyPickup: { value: 0, label: "Collect", tone: "neutral" },
    parcels: { value: 0, label: "Assign", tone: "neutral" },
    supportTickets: metric(
      Number(pendingActions.supportTickets || 0) + Number(kpis.supportSlaBreaches || 0),
      `${formatCount(kpis.supportOpen)} open`,
      Number(kpis.supportSlaBreaches || 0) > 0 ? "critical" : Number(pendingActions.supportTickets || 0) > 0 ? "attention" : "ready",
    ),
    promotions: { value: 0, label: "Campaigns", tone: "neutral" },
    coupons: { value: 0, label: "Rules", tone: "neutral" },
    flashSales: { value: 0, label: "Events", tone: "neutral" },
    offers: { value: 0, label: "Offers", tone: "neutral" },
    addOffer: { value: 0, label: "Create", tone: "neutral" },
    newsletter: metric(opsSummary.failedNotifications, `${formatCount(opsSummary.failedNotifications)} failed`),
    pendingPayouts: metric(kpis.pendingPayouts, `${formatCount(kpis.pendingPayouts)} pending`),
    payoutRequests: metric(pendingActions.payoutRequests, `${formatCount(pendingActions.payoutRequests)} requests`),
    manualPayments: metric(opsSummary.failedPayments, `${formatCount(opsSummary.failedPayments)} failed`),
    customers: { value: Number(kpis.newUsers || 0), label: `${formatCount(kpis.newUsers)} new`, tone: "neutral" },
    trustSafety: metric(summary.critical, `${formatCount(summary.critical)} critical`, Number(summary.critical || 0) > 0 ? "critical" : "ready"),
    userRoles: { value: 0, label: "Roles", tone: "neutral" },
    insights: { value: 0, label: "Reports", tone: "neutral" },
    reviewModeration: metric(pendingActions.reviewModeration, `${formatCount(pendingActions.reviewModeration)} pending`),
    qa: { value: 0, label: "Questions", tone: "neutral" },
  };

  return adminControlSections.map((section) => ({
    ...section,
    controls: section.controls.map((control) => ({
      ...control,
      metric: metrics[control.metricKey] || { value: 0, label: "Open", tone: "neutral" },
    })),
    attentionCount: section.controls.reduce((sum, control) => {
      const controlMetric = metrics[control.metricKey];
      return sum + (["critical", "attention"].includes(controlMetric?.tone) ? 1 : 0);
    }, 0),
    signalCount:
      section.key === "finance"
        ? Number(finance.unresolvedBuckets || 0) + Number(finance.payoutHolds || 0)
        : section.key === "system"
          ? Number(readiness.watch || 0) + Number(readiness.manual || 0)
          : section.key === "vendors"
            ? Number(pendingActions.vendorApprovals || 0) + Number(pendingActions.kycReviews || 0)
            : section.key === "orders"
              ? Number(staffWorkload.overdue || 0) + Number(kpis.supportSlaBreaches || 0)
              : 0,
  }));
};

function WorkflowActionButton({ step, onFilterChange, children, variant = "primary" }) {
  const baseClass =
    variant === "primary"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1e7098] px-4 text-sm font-bold text-white transition hover:bg-[#17516f] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25"
      : "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-[#1e7098]/40 hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

  if (step.filter) {
    return (
      <button
        type="button"
        onClick={() => {
          onFilterChange(step.filter);
          window.setTimeout(() => {
            document.getElementById("admin-exception-inbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 0);
        }}
        className={baseClass}
      >
        {children}
        <ArrowRight className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Link to={step.to || "/admin"} className={baseClass}>
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function AdminWorkflowCenter({ workflow, pendingActions, onFilterChange, loading }) {
  const tone = workflowToneStyles[workflow.tone] || workflowToneStyles.healthy;
  const nextStep = workflow.nextStep;
  const visibleQueues = pendingActionLinks
    .map((item) => ({ ...item, count: Number(pendingActions[item.key] || 0) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <section data-testid="admin-workflow-center" className={`${adminSurface} overflow-hidden`}>
      <div className="grid gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b border-[#E0E0E0] bg-[#1A1A2E] p-5 text-white dark:border-slate-800 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-200">Admin workflow</p>
              <h2 className="mt-2 text-2xl font-black">Today&apos;s control flow</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone.panel}`}>
              {tone.label}
            </span>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Workflow score</p>
                <p className="mt-2 text-5xl font-black leading-none">{loading ? "..." : workflow.score}</p>
              </div>
              <p className="pb-1 text-sm font-bold text-slate-300">
                {workflow.completed}/{workflow.total} ready
              </p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/20">
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${workflow.score}%` }} />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-200">
              {formatCount(workflow.totalSignals)} open signal{Number(workflow.totalSignals) === 1 ? "" : "s"} across admin queues.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-white p-4 text-slate-950">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next best action</p>
            {nextStep ? (
              <>
                <div className="mt-3 flex gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${workflowToneStyles[nextStep.tone].icon}`}>
                    <nextStep.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-[#1A1A2E]">{nextStep.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{nextStep.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <WorkflowActionButton step={nextStep} onFilterChange={onFilterChange}>
                    {nextStep.actionLabel}
                  </WorkflowActionButton>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-lg border border-[#00B14F]/20 bg-[#E9FFF3] p-3 text-sm font-semibold text-[#007A38]">
                Core admin workflow is clear for this range.
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#1e7098]">Operating sequence</p>
              <h2 className="mt-1 text-xl font-black text-[#1A1A2E] dark:text-white">Run queues in priority order</h2>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Triage, assign, resolve, then verify.
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {workflow.steps.map((step) => {
              const Icon = step.icon;
              const stepTone = workflowToneStyles[step.tone] || workflowToneStyles.healthy;

              return (
                <article
                  key={step.key}
                  className={`rounded-lg border p-4 transition hover:border-[#1e7098]/40 hover:shadow-sm ${step.done ? "border-[#E0E0E0] bg-white dark:border-slate-800 dark:bg-slate-900" : stepTone.panel}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stepTone.icon}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#EEEEEE] px-2 py-0.5 text-[11px] font-black text-slate-600">
                          Step {step.number}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${step.done ? "bg-[#E9FFF3] text-[#008A3D]" : "bg-white/70 text-current"}`}>
                          {step.done ? "Clear" : `${formatCount(step.count)} open`}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-[#1A1A2E] dark:text-white">{step.label}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{step.detail}</p>
                      {!step.done ? (
                        <div className="mt-3">
                          <WorkflowActionButton step={step} onFilterChange={onFilterChange} variant="secondary">
                            {step.actionLabel}
                          </WorkflowActionButton>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[#E0E0E0] pt-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[#1A1A2E] dark:text-white">Fast action queues</h3>
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                {formatCount(visibleQueues.length || pendingActionLinks.length)} visible
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {(visibleQueues.length ? visibleQueues : pendingActionLinks.slice(0, 6).map((item) => ({ ...item, count: 0 }))).map((item) => (
                <PendingAction key={item.key} item={item} count={item.count} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const controlMetricClasses = {
  critical: "bg-rose-600 text-white",
  attention: "bg-[#eef8fb] text-[#1a6387] ring-1 ring-[#1e7098]/20",
  ready: "bg-[#E9FFF3] text-[#008A3D] ring-1 ring-[#00B14F]/20",
  neutral: "bg-[#EEEEEE] text-slate-600 ring-1 ring-[#E0E0E0]",
};

function AdminControlHub({ sections }) {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const [viewMode, setViewMode] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();

  const totalControls = sections.reduce((sum, section) => sum + section.controls.length, 0);
  const attentionControls = sections.reduce((sum, section) => sum + Number(section.attentionCount || 0), 0);

  const visibleSections = sections
    .filter((section) => activeSection === "all" || section.key === activeSection)
    .map((section) => ({
      ...section,
      controls: section.controls.filter((control) => {
        if (viewMode === "focus" && !["critical", "attention"].includes(control.metric?.tone)) return false;
        if (!normalizedQuery) return true;
        return [section.title, control.label, control.detail, control.metric?.label]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      }),
    }))
    .filter((section) => section.controls.length > 0);

  return (
    <section data-testid="admin-control-hub" className={`${adminSurface} overflow-hidden`}>
      <div className="border-b border-[#E0E0E0] p-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#1e7098]">Overall admin control system</p>
            <h2 className="mt-1 text-xl font-black text-[#1A1A2E] dark:text-white">All Control Hub</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Every admin workspace is visible here first, grouped by system, vendors, catalog, orders, marketing, finance, and customer trust.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
            <div className="rounded-lg border border-[#E0E0E0] bg-[#F5F5F5] px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Controls</p>
              <p className="text-xl font-black text-[#1A1A2E] dark:text-white">{formatCount(totalControls)}</p>
            </div>
            <div className="rounded-lg border border-[#1e7098]/20 bg-[#eef8fb] px-3 py-2 dark:border-[#1e7098]/40 dark:bg-[#1e7098]/10">
              <p className="text-xs font-bold uppercase text-[#1a6387] dark:text-primary-200">Needs attention</p>
              <p className="text-xl font-black text-[#1a6387] dark:text-primary-200">{formatCount(attentionControls)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_280px] xl:items-center">
          <div className="inline-flex w-max rounded-lg border border-[#E0E0E0] bg-[#F5F5F5] p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`min-h-9 rounded-md px-3 text-xs font-black transition ${
                viewMode === "all"
                  ? "bg-[#1A1A2E] text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-white hover:text-[#1A1A2E] dark:text-slate-300 dark:hover:bg-slate-900"
              }`}
            >
              All controls
            </button>
            <button
              type="button"
              onClick={() => setViewMode("focus")}
              className={`min-h-9 rounded-md px-3 text-xs font-black transition ${
                viewMode === "focus"
                  ? "bg-[#1e7098] text-white"
                  : "text-slate-600 hover:bg-white hover:text-[#1a6387] dark:text-slate-300 dark:hover:bg-slate-900"
              }`}
            >
              Needs action {attentionControls ? `(${formatCount(attentionControls)})` : ""}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveSection("all")}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold transition ${
                activeSection === "all"
                  ? "border-[#1e7098] bg-[#1e7098] text-white"
                  : "border-[#E0E0E0] bg-white text-slate-600 hover:bg-[#eef8fb] hover:text-[#1a6387] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              }`}
            >
              All
            </button>
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                  activeSection === section.key
                    ? "border-[#1e7098] bg-[#1e7098] text-white"
                    : "border-[#E0E0E0] bg-white text-slate-600 hover:bg-[#eef8fb] hover:text-[#1a6387] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                }`}
              >
                {section.title}
                {section.attentionCount ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${activeSection === section.key ? "bg-white/20 text-white" : "bg-rose-600 text-white"}`}>
                    {formatCount(section.attentionCount)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search admin controls"
              className={`${adminInput} min-h-10 w-full py-2 pl-9 pr-3`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-0 divide-y divide-[#E0E0E0] dark:divide-slate-800">
        {visibleSections.map((section) => {
          const SectionIcon = section.icon;

          return (
            <div key={section.key} className="grid gap-4 p-4 xl:grid-cols-[220px_minmax(0,1fr)] xl:p-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef8fb] text-[#1e7098] dark:bg-[#1e7098]/10">
                    <SectionIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#1A1A2E] dark:text-white">{section.title}</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {formatCount(section.controls.length)} control{section.controls.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {section.controls.map((control) => (
                  <Link
                    key={`${section.key}-${control.path}-${control.label}`}
                    to={control.path}
                    className="group flex min-h-[86px] flex-col justify-between rounded-lg border border-[#E0E0E0] bg-white p-3 transition hover:border-[#1e7098]/50 hover:bg-[#eef8fb]/50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#1e7098]/50 dark:hover:bg-[#1e7098]/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-[#1A1A2E] transition group-hover:text-[#1a6387] dark:text-white dark:group-hover:text-primary-200">
                          {control.label}
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{control.detail}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1e7098]" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${controlMetricClasses[control.metric?.tone] || controlMetricClasses.neutral}`}>
                        {control.metric?.label || "Open"}
                      </span>
                      {control.metric?.value > 0 && ["critical", "attention"].includes(control.metric?.tone) ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                          {formatCount(control.metric.value)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {!visibleSections.length ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-4 py-8 text-center">
            <Search className="h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              {viewMode === "focus" ? "No urgent controls found" : "No admin controls found"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {viewMode === "focus" ? "Switch to All controls to browse every admin workspace." : "Try another control name, section, or workflow term."}
            </p>
            {viewMode === "focus" ? (
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1e7098] px-4 text-sm font-bold text-white transition hover:bg-[#17516f]"
              >
                Show all controls
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DashboardGroup({ title, description, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`${adminSurface} flex w-full items-center justify-between gap-4 p-4 text-left transition hover:border-[#1e7098]/40 hover:bg-[#eef8fb]/40 dark:hover:border-[#1e7098]/50 dark:hover:bg-[#1e7098]/10`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-[#1A1A2E] dark:text-white">{title}</h2>
            {badge ? (
              <span className="rounded-full bg-[#eef8fb] px-2 py-0.5 text-[11px] font-black text-[#1a6387] ring-1 ring-[#1e7098]/20">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E0E0E0] bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <ArrowRight className={`h-4 w-4 transition ${open ? "rotate-90 text-[#1e7098]" : ""}`} />
        </span>
      </button>
      {open ? <div className="space-y-5">{children}</div> : null}
    </section>
  );
}

function ChartTooltip({ active, payload, label, formatPrice }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span style={{ color: entry.color }} className="font-semibold capitalize">
              {entry.name}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(entry.value || 0)}</span>
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
        active ? "bg-[#1e7098] text-white" : "bg-[#EEEEEE] text-slate-600 hover:bg-[#eef8fb] hover:text-[#1a6387]"
      }`}
    >
      {children}
    </button>
  );
}

function PriorityControlCard({
  eyebrow,
  title,
  description,
  to,
  icon: Icon,
  actionLabel,
  tone = "primary",
  metric,
}) {
  const tones = {
    primary: {
      icon: "bg-[#eef8fb] text-[#1a6387] ring-[#1e7098]/20",
      action: "bg-[#1e7098] text-white hover:bg-[#1a6387]",
      metric: "bg-[#eef8fb] text-[#1a6387] ring-[#1e7098]/20",
      eyebrow: "text-[#1e7098]",
    },
    green: {
      icon: "bg-[#E9FFF3] text-[#008A3D] ring-[#00B14F]/20",
      action: "bg-[#00B14F] text-white hover:bg-[#008A3D]",
      metric: "bg-[#E9FFF3] text-[#008A3D] ring-[#00B14F]/20",
      eyebrow: "text-[#008A3D]",
    },
    navy: {
      icon: "bg-[#1A1A2E] text-white ring-[#1A1A2E]/20",
      action: "bg-[#1A1A2E] text-white hover:bg-black",
      metric: "bg-[#EEEEEE] text-[#1A1A2E] ring-[#DDE3EA]",
      eyebrow: "text-[#1A1A2E] dark:text-slate-200",
    },
  };
  const toneClasses = tones[tone] || tones.primary;

  return (
    <Link to={to} className={`${adminInteractiveSurface} group flex min-h-[170px] flex-col justify-between p-4`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses.icon}`}>
            <Icon className="h-5 w-5" />
          </span>
          {metric ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${toneClasses.metric}`}>
              {metric}
            </span>
          ) : null}
        </div>
        <p className={`mt-4 text-xs font-black uppercase tracking-wide ${toneClasses.eyebrow}`}>{eyebrow}</p>
        <h3 className="mt-1 text-base font-black text-[#1A1A2E] dark:text-white">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <span className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-black transition ${toneClasses.action}`}>
        {actionLabel}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function ExceptionInbox({
  inbox,
  filter,
  onFilterChange,
  onOpenCase,
  formatPrice,
  loading,
  selectedCaseKeys,
  onToggleCase,
  onToggleAll,
  bulkForm,
  onBulkFormChange,
  onBulkApply,
  bulkSaving,
}) {
  const summary = inbox?.summary || emptyDashboard.exceptionInbox.summary;
  const items = inbox?.items || [];
  const visibleItems = items.filter((issue) => matchesExceptionFilter(issue, filter));
  const nextIssue = visibleItems[0] || items[0];
  const nextAction = nextIssue?.actions?.[0];
  const ownerCounts = summary.owners || [];
  const selectedCount = selectedCaseKeys.length;
  const visibleCaseKeys = visibleItems.map((issue) => issue.caseKey).filter(Boolean);
  const allVisibleSelected = visibleCaseKeys.length > 0 && visibleCaseKeys.every((caseKey) => selectedCaseKeys.includes(caseKey));

  return (
    <section
      id="admin-exception-inbox"
      data-testid="admin-exception-inbox"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#1e7098] dark:text-primary-300">
              <ShieldAlert className="h-4 w-4" />
              Admin command center
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">Unified Exception Inbox</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Critical work from vendor ops, catalog, finance, support, trust, and system delivery. Start with breached SLA and high-exposure items.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[540px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Open</p>
              <p className="text-xl font-black text-slate-950 dark:text-white">{formatCount(summary.total)}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/30">
              <p className="text-xs font-bold uppercase text-rose-600 dark:text-rose-300">Critical</p>
              <p className="text-xl font-black text-rose-700 dark:text-rose-200">{formatCount(summary.critical)}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-300">SLA</p>
              <p className="text-xl font-black text-amber-700 dark:text-amber-200">{formatCount(summary.breached)}</p>
            </div>
            <div className="rounded-lg border border-[#00B14F]/20 bg-[#E9FFF3] px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase text-[#008A3D] dark:text-emerald-300">Exposure</p>
              <p className="truncate text-xl font-black text-[#008A3D] dark:text-emerald-200">{formatPrice(summary.financeExposure)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {exceptionFilters.map((item) => {
              const count = filterCountFor(items, item.value);
              const active = filter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onFilterChange(item.value)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
                    active
                      ? "border-[#1e7098] bg-[#1e7098] text-white"
                      : "border-slate-200 text-slate-600 hover:border-[#1e7098]/40 hover:bg-[#eef8fb] hover:text-[#1a6387] dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-800 dark:hover:bg-primary-900/30 dark:hover:text-primary-200"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {formatCount(count)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {visibleCaseKeys.length ? (
              <button
                type="button"
                onClick={() => onToggleAll(visibleCaseKeys, !allVisibleSelected)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {allVisibleSelected ? "Clear visible" : "Select visible"}
              </button>
            ) : null}
            {nextAction ? (
              <Link
                to={nextAction.path}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1e7098] px-4 text-sm font-bold text-white transition hover:bg-[#17516f] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/30"
              >
                Work next issue
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            <Link
              to="/admin/operations"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Operations center
            </Link>
          </div>
        </div>

        {ownerCounts.length ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            {ownerCounts.slice(0, 6).map((owner) => (
              <span
                key={owner.owner}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                {owner.owner}: {formatCount(owner.count)}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {selectedCount ? (
        <div
          data-testid="admin-bulk-case-actions"
          className="border-b border-[#1e7098]/15 bg-[#eef8fb] p-4 dark:border-primary-900 dark:bg-primary-900/20"
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">
                {formatCount(selectedCount)} selected case{selectedCount === 1 ? "" : "s"}
              </p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Apply assignment, priority, due date, and notes across the selected queue items.
              </p>
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:max-w-5xl xl:grid-cols-[minmax(140px,1fr)_150px_140px_180px_minmax(180px,1.2fr)_auto]">
              <input
                type="text"
                value={bulkForm.assignedTo}
                onChange={(event) => onBulkFormChange("assignedTo", event.target.value)}
                placeholder="Assign to"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <select
                value={bulkForm.status}
                onChange={(event) => onBulkFormChange("status", event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Status</option>
                {caseStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={bulkForm.priority}
                onChange={(event) => onBulkFormChange("priority", event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Priority</option>
                {casePriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={bulkForm.dueAt}
                onChange={(event) => onBulkFormChange("dueAt", event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                value={bulkForm.note}
                onChange={(event) => onBulkFormChange("note", event.target.value)}
                placeholder="Bulk note"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={onBulkApply}
                disabled={bulkSaving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 p-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))
        ) : visibleItems.length ? (
          visibleItems.map((issue) => {
            const Icon = getExceptionIcon(issue.type);
            const tone = exceptionToneClasses[getExceptionTone(issue)] || exceptionToneClasses.sky;
            const primaryAction = (issue.actions || [])[0];
            const secondaryActions = (issue.actions || []).slice(1, 2);

            return (
              <article
                key={issue.id}
                className={`grid gap-3 rounded-lg border p-4 transition hover:border-primary-300 hover:shadow-sm dark:hover:border-primary-800 ${tone.card} xl:grid-cols-[auto_minmax(0,1fr)_260px_190px] xl:items-center`}
              >
                <label className="flex items-start pt-2 xl:pt-0" aria-label={`Select ${issue.title}`}>
                  <input
                    type="checkbox"
                    checked={selectedCaseKeys.includes(issue.caseKey)}
                    onChange={(event) => onToggleCase(issue.caseKey, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <div className="flex min-w-0 gap-3">
                  <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 text-sm font-black text-slate-950 dark:text-white">{issue.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${priorityBadgeTone[issue.priority] || priorityBadgeTone.normal}`}>
                        {issue.priority || "normal"}
                      </span>
                      {issue.breached ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-rose-500">
                          SLA breached
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{issue.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>{issue.workflow}</span>
                      <span className="text-slate-300 dark:text-slate-700">/</span>
                      <span>{issue.owner}</span>
                      <span className="text-slate-300 dark:text-slate-700">/</span>
                      <span className="capitalize">{String(issue.status || "needs attention").replaceAll("_", " ")}</span>
                      {issue.case?.assignedTo ? (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">/</span>
                          <span>Assigned to {issue.case.assignedTo}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <p className="font-bold text-slate-950 dark:text-white">{issue.nextAction}</p>
                  <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                    <span>{formatAgeHours(issue.ageHours)}</span>
                    <span className="sm:text-right">SLA {formatDateTime(issue.dueAt)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Case: {formatCaseStatus(issue.case?.status)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:text-right">
                      Due: {issue.case?.dueAt ? formatDateTime(issue.case.dueAt) : "Not set"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenCase(issue)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:flex-none"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Case
                  </button>
                  {primaryAction ? (
                    <Link
                      to={primaryAction.path}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-bold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 sm:flex-none"
                    >
                      {issue.actionLabel || primaryAction.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {secondaryActions.map((action) => (
                    <Link
                      key={`${issue.id}-${action.label}`}
                      to={action.path}
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 sm:flex-none"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-300" />
            <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No exceptions in this filter</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The selected admin queue group is clear.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminCaseDrawer({
  open,
  issue,
  caseRecord,
  form,
  onChange,
  onClose,
  onSave,
  saving,
  loading,
  error,
}) {
  if (!open || !issue) return null;

  const primaryAction = issue.actions?.[0];
  const history = caseRecord?.history || [];
  const notes = caseRecord?.notes || [];

  return (
    <div data-testid="admin-case-drawer" className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <button
        type="button"
        className="hidden flex-1 cursor-default lg:block"
        onClick={onClose}
        aria-label="Close admin case"
      />
      <aside className="flex h-full w-full flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-2xl" aria-label="Admin case drawer">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                Admin Case
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{issue.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {issue.workflow} / {issue.owner} / {issue.caseKey}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="Close admin case"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${priorityBadgeTone[issue.priority] || priorityBadgeTone.normal}`}>
              Queue {issue.priority}
            </span>
            {issue.breached ? (
              <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">SLA breached</span>
            ) : null}
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {formatCaseStatus(caseRecord?.status || form.status)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-black text-slate-950 dark:text-white">Issue Snapshot</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{issue.detail}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Opened</p>
                    <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{formatAgeHours(issue.ageHours)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">SLA due</p>
                    <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{formatDateTime(issue.dueAt)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Source status</p>
                    <p className="mt-1 text-sm font-bold capitalize text-slate-950 dark:text-white">
                      {String(issue.status || "needs attention").replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Next action</p>
                    <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{issue.nextAction}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-black text-slate-950 dark:text-white">Assignment Workflow</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Assigned to
                    </span>
                    <input
                      type="text"
                      value={form.assignedTo}
                      onChange={(event) => onChange("assignedTo", event.target.value)}
                      placeholder="Staff name or email"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Status
                    </span>
                    <select
                      value={form.status}
                      onChange={(event) => onChange("status", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {caseStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Priority
                    </span>
                    <select
                      value={form.priority}
                      onChange={(event) => onChange("priority", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {casePriorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Case due date
                    </span>
                    <input
                      type="datetime-local"
                      value={form.dueAt}
                      onChange={(event) => onChange("dueAt", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Add note
                  </span>
                  <textarea
                    value={form.note}
                    onChange={(event) => onChange("note", event.target.value)}
                    rows={4}
                    placeholder="Decision, follow-up, or handoff context"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                    <CalendarClock className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                    Recent Notes
                  </h3>
                  <div className="mt-3 space-y-3">
                    {notes.length ? notes.slice().reverse().map((note) => (
                      <div key={`${note.at}-${note.text}`} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{note.text}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {note.actor?.name || note.actor?.email || "Admin"} / {formatDateTime(note.at)}
                        </p>
                      </div>
                    )) : (
                      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No case notes yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                    <ClipboardList className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                    Case History
                  </h3>
                  <div className="mt-3 space-y-3">
                    {history.length ? history.slice().reverse().map((event) => (
                      <div key={`${event.at}-${event.action}-${event.field}`} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-sm font-bold capitalize text-slate-900 dark:text-white">
                          {String(event.action || "updated").replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {event.from || "empty"} to {event.to || "empty"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {event.actor?.name || event.actor?.email || "Admin"} / {formatDateTime(event.at)}
                        </p>
                      </div>
                    )) : (
                      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No assignment history yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {primaryAction ? (
              <Link
                to={primaryAction.path}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Save case
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function AdminHardeningPanels({ hardening, formatPrice }) {
  const staffWorkload = hardening?.staffWorkload || emptyDashboard.adminHardening.staffWorkload;
  const finance = hardening?.financeReconciliation || emptyDashboard.adminHardening.financeReconciliation;
  const readiness = hardening?.integrationReadiness || emptyDashboard.adminHardening.integrationReadiness;
  const financeTone = finance.status === "critical"
    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
    : finance.status === "watch"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <section data-testid="admin-hardening-panels" className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Staff workload</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Queue ownership</h2>
          </div>
          <Users className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Open</p>
            <p className="text-xl font-black text-slate-950 dark:text-white">{formatCount(staffWorkload.totalOpen)}</p>
          </div>
          <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/30">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-300">Overdue</p>
            <p className="text-xl font-black text-rose-700 dark:text-rose-200">{formatCount(staffWorkload.overdue)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-300">Unassigned</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-200">{formatCount(staffWorkload.unassigned)}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(staffWorkload.staff || []).length ? (staffWorkload.staff || []).slice(0, 5).map((staff) => (
            <div key={staff.assignee} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950 dark:text-white">{staff.assignee}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{staff.topWorkflow}</p>
              </div>
              <div className="text-right text-xs font-bold text-slate-600 dark:text-slate-300">
                <p>{formatCount(staff.open)} open</p>
                <p>{formatCount(staff.critical)} critical</p>
              </div>
            </div>
          )) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No active assigned admin cases.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Finance reconciliation</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">COD, refunds, holds</h2>
          </div>
          <Banknote className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-bold capitalize ${financeTone}`}>
          {finance.status} / {formatCount(finance.unresolvedBuckets)} unresolved bucket{Number(finance.unresolvedBuckets) === 1 ? "" : "s"}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">COD outstanding</p>
            <p className="text-base font-black text-slate-950 dark:text-white">{formatPrice(finance.codOutstanding)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatCount(finance.codOrders)} COD orders</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Refund exposure</p>
            <p className="text-base font-black text-slate-950 dark:text-white">{formatPrice(finance.refundExposure)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Payout holds</p>
            <p className="text-base font-black text-slate-950 dark:text-white">{formatPrice(finance.payoutHolds)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Vendor deductions</p>
            <p className="text-base font-black text-slate-950 dark:text-white">{formatPrice(finance.vendorDeductions)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Integration readiness</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Adapters and retries</h2>
          </div>
          <BellRing className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Ready</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-200">{formatCount(readiness.ready)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-300">Watch</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-200">{formatCount(readiness.watch)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Manual</p>
            <p className="text-xl font-black text-slate-950 dark:text-white">{formatCount(readiness.manual)}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(readiness.integrations || []).map((item) => (
            <div key={item.key} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-950 dark:text-white">{item.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                  item.status === "ready"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                    : item.status === "watch"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const buildCaseForm = (issue = {}, record = null) => ({
  assignedTo: record?.assignedTo || issue.case?.assignedTo || "",
  status: record?.status || issue.case?.status || "open",
  priority: record?.priority || issue.case?.priority || issue.priority || "medium",
  dueAt: toDateTimeInputValue(record?.dueAt || issue.case?.dueAt || issue.dueAt),
  note: "",
});

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
  const [exceptionFilter, setExceptionFilter] = useState("all");
  const [caseDrawerIssue, setCaseDrawerIssue] = useState(null);
  const [caseRecord, setCaseRecord] = useState(null);
  const [caseForm, setCaseForm] = useState(buildCaseForm());
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseSaving, setCaseSaving] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [savedViews, setSavedViews] = useState([]);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewsLoading, setSavedViewsLoading] = useState(false);
  const [selectedCaseKeys, setSelectedCaseKeys] = useState([]);
  const [bulkCaseForm, setBulkCaseForm] = useState(emptyBulkCaseForm);
  const [bulkSaving, setBulkSaving] = useState(false);

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

  const loadSavedViews = useCallback(async () => {
    if (!user) return;
    setSavedViewsLoading(true);
    try {
      const response = await getAdminSavedViews({ page: "admin_dashboard" });
      setSavedViews(response.data.data || []);
    } catch (fetchError) {
      console.error("Failed to load admin saved views:", fetchError);
    } finally {
      setSavedViewsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
    loadSavedViews();
    const interval = setInterval(() => loadDashboard({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard, loadSavedViews]);

  const saveCurrentView = useCallback(async () => {
    const name = savedViewName.trim();
    if (!name) return;
    setSavedViewsLoading(true);
    try {
      await saveAdminSavedView({
        page: "admin_dashboard",
        name,
        filters: {
          range,
          customStart,
          customEnd,
          vendorSort,
          vendorFilter,
          exceptionFilter,
        },
      });
      setSavedViewName("");
      await loadSavedViews();
    } catch (saveError) {
      console.error("Failed to save admin view:", saveError);
    } finally {
      setSavedViewsLoading(false);
    }
  }, [customEnd, customStart, exceptionFilter, loadSavedViews, range, savedViewName, vendorFilter, vendorSort]);

  const applySavedView = useCallback((view) => {
    const filters = view?.filters || {};
    if (filters.range) setRange(filters.range);
    setCustomStart(filters.customStart || "");
    setCustomEnd(filters.customEnd || "");
    if (filters.vendorSort) setVendorSort(filters.vendorSort);
    setVendorFilter(filters.vendorFilter || "");
    setExceptionFilter(filters.exceptionFilter || "all");
  }, []);

  const removeSavedView = useCallback(async (view) => {
    if (!view?.key) return;
    setSavedViewsLoading(true);
    try {
      await deleteAdminSavedView(view.key);
      await loadSavedViews();
    } catch (deleteError) {
      console.error("Failed to delete admin view:", deleteError);
    } finally {
      setSavedViewsLoading(false);
    }
  }, [loadSavedViews]);

  const syncCaseRecordIntoDashboard = useCallback((record) => {
    if (!record?.caseKey) return;
    setDashboard((current) => ({
      ...current,
      exceptionInbox: {
        ...(current.exceptionInbox || emptyDashboard.exceptionInbox),
        items: (current.exceptionInbox?.items || []).map((item) =>
          item.caseKey === record.caseKey ? { ...item, case: record } : item,
        ),
      },
    }));
  }, []);

  const openAdminCase = useCallback(async (issue) => {
    if (!issue?.caseKey) return;
    setCaseDrawerIssue(issue);
    setCaseRecord(null);
    setCaseForm(buildCaseForm(issue));
    setCaseError("");
    setCaseLoading(true);

    try {
      const response = await getAdminCaseAssignment(issue.caseKey);
      const record = response.data.data || null;
      setCaseRecord(record);
      setCaseForm(buildCaseForm(issue, record));
      if (record) syncCaseRecordIntoDashboard(record);
    } catch (fetchError) {
      console.error("Failed to load admin case:", fetchError);
      setCaseError(fetchError?.response?.data?.error || "Failed to load admin case");
    } finally {
      setCaseLoading(false);
    }
  }, [syncCaseRecordIntoDashboard]);

  const closeAdminCase = useCallback(() => {
    setCaseDrawerIssue(null);
    setCaseRecord(null);
    setCaseForm(buildCaseForm());
    setCaseError("");
  }, []);

  const updateCaseForm = useCallback((field, value) => {
    setCaseForm((current) => ({ ...current, [field]: value }));
  }, []);

  const saveAdminCase = useCallback(async () => {
    if (!caseDrawerIssue?.caseKey) return;
    setCaseSaving(true);
    setCaseError("");

    try {
      const response = await updateAdminCaseAssignment(caseDrawerIssue.caseKey, {
        assignedTo: caseForm.assignedTo,
        status: caseForm.status,
        priority: caseForm.priority,
        dueAt: caseForm.dueAt || null,
        note: caseForm.note,
        issue: {
          type: caseDrawerIssue.type,
          title: caseDrawerIssue.title,
          workflow: caseDrawerIssue.workflow,
          owner: caseDrawerIssue.owner,
          meta: caseDrawerIssue.meta,
        },
      });
      const saved = response.data.data;
      setCaseRecord(saved);
      setCaseForm(buildCaseForm(caseDrawerIssue, saved));
      syncCaseRecordIntoDashboard(saved);
    } catch (saveError) {
      console.error("Failed to save admin case:", saveError);
      setCaseError(saveError?.response?.data?.error || "Failed to save admin case");
    } finally {
      setCaseSaving(false);
    }
  }, [caseDrawerIssue, caseForm, syncCaseRecordIntoDashboard]);

  const toggleCaseSelection = useCallback((caseKey, checked) => {
    if (!caseKey) return;
    setSelectedCaseKeys((current) => {
      const set = new Set(current);
      if (checked) {
        set.add(caseKey);
      } else {
        set.delete(caseKey);
      }
      return [...set];
    });
  }, []);

  const toggleVisibleCases = useCallback((caseKeys, checked) => {
    setSelectedCaseKeys((current) => {
      const set = new Set(current);
      caseKeys.forEach((caseKey) => {
        if (!caseKey) return;
        if (checked) {
          set.add(caseKey);
        } else {
          set.delete(caseKey);
        }
      });
      return [...set];
    });
  }, []);

  const updateBulkCaseForm = useCallback((field, value) => {
    setBulkCaseForm((current) => ({ ...current, [field]: value }));
  }, []);

  const applyBulkCaseUpdate = useCallback(async () => {
    if (!selectedCaseKeys.length) return;
    const payload = { caseKeys: selectedCaseKeys };
    if (bulkCaseForm.assignedTo.trim()) payload.assignedTo = bulkCaseForm.assignedTo.trim();
    if (bulkCaseForm.status) payload.status = bulkCaseForm.status;
    if (bulkCaseForm.priority) payload.priority = bulkCaseForm.priority;
    if (bulkCaseForm.dueAt) payload.dueAt = bulkCaseForm.dueAt;
    if (bulkCaseForm.note.trim()) payload.note = bulkCaseForm.note.trim();

    setBulkSaving(true);
    try {
      await bulkUpdateAdminCases(payload);
      setSelectedCaseKeys([]);
      setBulkCaseForm(emptyBulkCaseForm);
      await loadDashboard({ silent: true });
    } catch (bulkError) {
      console.error("Failed to bulk update admin cases:", bulkError);
    } finally {
      setBulkSaving(false);
    }
  }, [bulkCaseForm, loadDashboard, selectedCaseKeys]);

  const kpis = dashboard.kpis || emptyDashboard.kpis;
  const pendingActions = dashboard.pendingActions || emptyDashboard.pendingActions;
  const comparison = dashboard.comparison || emptyDashboard.comparison;
  const opsSummary = dashboard.opsSummary || emptyDashboard.opsSummary;
  const exceptionInbox = dashboard.exceptionInbox || emptyDashboard.exceptionInbox;
  const adminHardening = dashboard.adminHardening || emptyDashboard.adminHardening;
  const totalPendingActions = Object.values(pendingActions).reduce((sum, value) => sum + Number(value || 0), 0);
  const adminWorkflow = useMemo(
    () => buildAdminDashboardWorkflow({ pendingActions, exceptionInbox, opsSummary, adminHardening, kpis }),
    [adminHardening, exceptionInbox, kpis, opsSummary, pendingActions],
  );
  const controlSections = useMemo(
    () => buildAdminControlSections({ pendingActions, exceptionInbox, opsSummary, adminHardening, kpis }),
    [adminHardening, exceptionInbox, kpis, opsSummary, pendingActions],
  );

  const sortedVendors = useMemo(() => {
    const query = vendorFilter.trim().toLowerCase();
    return [...(dashboard.topVendors || [])]
      .filter((vendor) => !query || vendor.vendorName?.toLowerCase().includes(query))
      .sort((a, b) => Number(b[vendorSort] || 0) - Number(a[vendorSort] || 0));
  }, [dashboard.topVendors, vendorFilter, vendorSort]);

  const funnelMax = Math.max(...(dashboard.orderFunnel || []).map((item) => item.count), 1);
  const activeAlerts = dashboard.healthAlerts || [];

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-3 py-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-lg border border-[#101325] border-t-4 border-t-[#1e7098] bg-[#1A1A2E] p-5 text-white shadow-sm shadow-[#1A1A2E]/20 dark:border-slate-800 dark:border-t-[#1e7098] dark:bg-slate-900 dark:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#E9FFF3] px-3 py-1 text-xs font-bold text-[#008A3D] ring-1 ring-[#00B14F]/15">
                  <span className="h-2 w-2 rounded-full bg-[#00B14F]" />
                  Live
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Updated {formatDateTime(dashboard.updatedAt)}
                </span>
                {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e7098]" />}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e7098] text-sm font-black text-white shadow-sm shadow-primary-900/20">
                  AG
                </span>
                <div>
                  <h1 className="text-2xl font-black text-white lg:text-3xl">Amiyo-Go Control Center</h1>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1e7098]">
                    Marketplace operations
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-medium text-slate-200">
                Platform health, revenue, order flow, vendor performance, and pending action queues in one view.
              </p>
              <div className="mt-4 grid max-w-2xl gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-[#1e7098]/30 bg-[#1e7098]/15 px-3 py-2">
                  <p className="text-xs font-semibold text-primary-100">Pending actions</p>
                  <p className="text-xl font-black text-white">{formatCount(totalPendingActions)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-300">Open exceptions</p>
                  <p className="text-xl font-black text-white">{formatCount(exceptionInbox.summary?.total)}</p>
                </div>
                <div className="rounded-lg border border-[#00B14F]/30 bg-[#00B14F]/15 px-3 py-2">
                  <p className="text-xs font-semibold text-emerald-100">Today GMV</p>
                  <p className="text-xl font-black text-white">{formatPrice(kpis.todayGmv)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[440px]">
              <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/10 p-2">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      range === option.value
                        ? "bg-[#1e7098] text-white shadow-sm"
                        : "bg-white text-[#1A1A2E] ring-1 ring-white/20 hover:bg-[#eef8fb] hover:text-[#1a6387] dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => loadDashboard({ silent: true })}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white px-3 py-2 text-sm font-semibold text-[#1A1A2E] transition hover:bg-[#eef8fb] hover:text-[#1a6387] dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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
                    className={`${adminInput} px-3 py-2`}
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className={`${adminInput} px-3 py-2`}
                  />
                </div>
              )}
              <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={savedViewName}
                    onChange={(event) => setSavedViewName(event.target.value)}
                    placeholder="Save this admin view"
                    className="min-h-10 flex-1 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#1e7098] focus:ring-2 focus:ring-[#1e7098]/20"
                  />
                  <button
                    type="button"
                    onClick={saveCurrentView}
                    disabled={!savedViewName.trim() || savedViewsLoading}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1e7098] px-3 text-sm font-bold text-white transition hover:bg-[#17516f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savedViewsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                    Save view
                  </button>
                </div>
                {savedViews.length ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {savedViews.map((view) => (
                      <span
                        key={view.key}
                        className="inline-flex min-h-9 shrink-0 items-center overflow-hidden rounded-lg border border-[#E0E0E0] bg-white text-xs font-bold text-slate-700"
                      >
                        <button
                          type="button"
                          onClick={() => applySavedView(view)}
                          className="min-h-9 px-3 hover:bg-primary-50 hover:text-primary-700"
                        >
                          {view.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSavedView(view)}
                          className="inline-flex min-h-9 w-9 items-center justify-center border-l border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete saved view ${view.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100">
              {error}
            </div>
          )}
        </section>

        <AdminWorkflowCenter
          workflow={adminWorkflow}
          pendingActions={pendingActions}
          onFilterChange={setExceptionFilter}
          loading={loading}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PriorityControlCard
            eyebrow="Homepage control"
            title="Shop by brand visibility"
            description="Choose approved shops that appear in the Featured brands area on the homepage."
            to="/admin/vendors"
            icon={Store}
            actionLabel="Manage brands"
            tone="primary"
            metric="Homepage"
          />
          <PriorityControlCard
            eyebrow="Payment control"
            title="COD delivery confirmation"
            description="Mark COD orders delivered first, then confirm cash after admin receives payment."
            to="/admin/cod-delivery"
            icon={Banknote}
            actionLabel="Manage COD"
            tone="green"
            metric={`${formatCount(adminHardening.financeReconciliation?.codOrders || 0)} COD`}
          />
          <PriorityControlCard
            eyebrow="Order control"
            title="Global order queue"
            description="Open the live order workspace for shipment status, notes, returns, and customer service."
            to="/admin/orders"
            icon={ShoppingCart}
            actionLabel="Open orders"
            tone="navy"
            metric={`${formatCount(kpis.todayOrders)} today`}
          />
          <PriorityControlCard
            eyebrow="Finance control"
            title="Payout and payment desk"
            description="Handle vendor payouts, payout requests, manual payment verification, and finance exposure."
            to="/admin/payouts"
            icon={CreditCard}
            actionLabel="Open finance"
            tone="primary"
            metric={`${formatCount(kpis.pendingPayouts)} pending`}
          />
        </section>

        <AdminControlHub sections={controlSections} />

        <DashboardGroup
          title="Marketplace Snapshot"
          description="Daily health numbers kept compact for quick scanning."
          badge={`${formatCount(totalPendingActions)} pending`}
        >
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
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
              detail={`${formatChange(comparison.ordersChange)} vs previous period`}
              icon={ShoppingCart}
              tone="sky"
              loading={loading}
            />
            <KpiCard
              label="Active vendors"
              value={formatCount(kpis.activeVendors)}
              detail={`${formatCount(kpis.newVendors)} new today`}
              icon={Store}
              tone="amber"
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
              label="Payout exposure"
              value={formatPrice(kpis.payoutExposure)}
              detail={`${formatCount(kpis.pendingPayouts)} pending payouts`}
              icon={Banknote}
              tone="rose"
              loading={loading}
            />
            <KpiCard
              label="Refund rate"
              value={formatPercent(kpis.refundRate)}
              detail={`${formatPrice(kpis.refundAmount)} in refunds`}
              icon={TrendingDown}
              tone="slate"
              loading={loading}
            />
            <KpiCard
              label="Support SLA"
              value={formatCount(kpis.supportSlaBreaches)}
              detail={`${formatCount(kpis.supportOpen)} open tickets`}
              icon={Headphones}
              tone={Number(kpis.supportSlaBreaches || 0) > 0 ? "rose" : "emerald"}
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
        </DashboardGroup>

        <DashboardGroup
          title="Exception Handling"
          description="Open only the queues that need assignment, SLA work, or escalation."
          badge={`${formatCount(exceptionInbox.summary?.total)} open`}
        >
          <ExceptionInbox
            inbox={exceptionInbox}
            filter={exceptionFilter}
            onFilterChange={setExceptionFilter}
            onOpenCase={openAdminCase}
            formatPrice={formatPrice}
            loading={loading}
            selectedCaseKeys={selectedCaseKeys}
            onToggleCase={toggleCaseSelection}
            onToggleAll={toggleVisibleCases}
            bulkForm={bulkCaseForm}
            onBulkFormChange={updateBulkCaseForm}
            onBulkApply={applyBulkCaseUpdate}
            bulkSaving={bulkSaving}
          />

          <AdminHardeningPanels hardening={adminHardening} formatPrice={formatPrice} />
        </DashboardGroup>

        <DashboardGroup
          title="Reports And Activity"
          description="Charts, activity, vendors, and product performance are available when you need deeper review."
          defaultOpen={false}
        >
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <div className={`${adminSurface} p-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Revenue Breakdown</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Commission {formatPrice(dashboard.revenueTotals?.commission)} - GMV {formatPrice(dashboard.revenueTotals?.gmv)} - Refunds {formatPrice(dashboard.revenueTotals?.refunds)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ChangePill label="GMV" value={comparison.gmvChange} />
                  <ChangePill label="Orders" value={comparison.ordersChange} />
                  <ChangePill label="Commission" value={comparison.commissionChange} />
                  <ChangePill label="Refunds" value={comparison.refundsChange} />
                </div>
              </div>
              <div className="inline-flex w-max items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 ring-1 ring-primary-100 dark:bg-primary-900/30 dark:text-primary-200 dark:ring-primary-900/50">
                <TrendingUp className="h-3.5 w-3.5" />
                {rangeOptions.find((item) => item.value === range)?.label || "Range"}
              </div>
            </div>

            <div className="mt-5 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.revenueSeries || []} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e7098" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#1e7098" stopOpacity={0.02} />
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
                  <Area type="monotone" dataKey="gmv" name="Vendor GMV" stroke="#1e7098" fill="url(#gmvFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="commission" name="Commission" stroke="#10b981" fill="url(#commissionFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="refunds" name="Refunds" stroke="#f43f5e" fill="url(#refundFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${adminSurface} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Top Categories</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Highest GMV categories in the selected period.</p>
              </div>
              <Tags className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {(dashboard.topCategories || []).slice(0, 6).map((category, index) => (
                <Link
                  key={category.categoryId || category.categoryName}
                  to={`/admin/categories?search=${encodeURIComponent(category.categoryName || "")}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-800 dark:hover:border-primary-800 dark:hover:bg-primary-900/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {index + 1}. {category.categoryName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {formatCount(category.orders)} orders - {formatCount(category.units)} units
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-950 dark:text-white">{formatPrice(category.gmv)}</span>
                </Link>
              ))}
              {(dashboard.topCategories || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No category sales found for this range.
                </div>
              )}
            </div>
          </div>

          <div className={`${adminSurface} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Order Funnel</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending to returned drop-off.</p>
              </div>
              <TrendingDown className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 space-y-4">
              {(dashboard.orderFunnel || []).map((item) => (
                <div key={item.key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                    <span className="font-bold text-slate-950 dark:text-white">{formatCount(item.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${item.key === "returned" ? "bg-rose-500" : "bg-primary-500"}`}
                      style={{ width: `${Math.max(6, (item.count / funnelMax) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.dropOff > 0 ? `${formatCount(item.dropOff)} drop-off from previous step` : "No drop-off from previous step"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className={`${adminSurface} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Real-Time Activity Feed</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Orders, vendor applications, product flags, and failed payments.</p>
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
                  <div key={activity.id} className="flex gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-slate-800 dark:hover:border-primary-900 dark:hover:bg-primary-900/10">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${activityStyles[activity.type] || activityStyles.order}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{activity.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {activity.meta?.label || activity.type}
                        {activity.meta?.amount ? ` - ${formatPrice(activity.meta.amount)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-400">{formatDateTime(activity.at)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${adminSurface} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Platform Health Alerts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Automatic warnings from cancellation, payment, SLA, and fraud signals.</p>
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
            <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Cancellation rate</span>
                <span className="font-bold text-slate-950 dark:text-white">{Number(kpis.cancellationRate || 0).toFixed(1)}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-2 rounded-full ${Number(kpis.cancellationRate || 0) >= 15 ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, Number(kpis.cancellationRate || 0))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className={`${adminSurface} p-5`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Top Vendors</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ranked by GMV, orders, and commission generated.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={vendorFilter}
                    onChange={(event) => setVendorFilter(event.target.value)}
                    placeholder="Filter vendors"
                    className={`${adminInput} w-44 py-2 pl-9 pr-3`}
                  />
                </div>
                <SortButton active={vendorSort === "gmv"} onClick={() => setVendorSort("gmv")}>GMV</SortButton>
                <SortButton active={vendorSort === "orders"} onClick={() => setVendorSort("orders")}>Orders</SortButton>
                <SortButton active={vendorSort === "commission"} onClick={() => setVendorSort("commission")}>Commission</SortButton>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Vendor</th>
                    <th className="px-4 py-3 text-right font-bold">GMV</th>
                    <th className="px-4 py-3 text-right font-bold">Orders</th>
                    <th className="px-4 py-3 text-right font-bold">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
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
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">{vendor.vendorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatPrice(vendor.gmv)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatCount(vendor.orders)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatPrice(vendor.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${adminSurface} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Top Products Today</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Best-selling SKUs by revenue and units.</p>
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
                  <Bar dataKey="revenue" name="Revenue" fill="#1e7098" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {(dashboard.topProductsToday || []).slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-800 dark:hover:border-primary-800 dark:hover:bg-primary-900/20">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {index + 1}. {product.productName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {product.vendorName} - {formatCount(product.units)} units
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-950 dark:text-white">{formatPrice(product.revenue)}</span>
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
        </DashboardGroup>

        <DashboardGroup
          title="Common Workspaces"
          description="Frequently used areas, kept separate from the full control hub."
          defaultOpen={false}
        >
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Link to="/admin/orders" className={`${adminInteractiveSurface} group p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white">Order Operations</h3>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-primary-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review order queues, shipment states, and payment issues.</p>
            </Link>
            <Link to="/admin/vendor-requests" className={`${adminInteractiveSurface} group p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white">Approval Center</h3>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-primary-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Clear vendor, KYC, product, and category approval queues.</p>
            </Link>
            <Link to="/admin/support" className={`${adminInteractiveSurface} group p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white">Support Desk</h3>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-primary-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Resolve customer tickets, SLA risks, and linked order issues.</p>
            </Link>
            <Link to="/admin/payouts" className={`${adminInteractiveSurface} group p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white">Finance Desk</h3>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-primary-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Handle pending payouts, payout requests, and refund impact.</p>
            </Link>
            <Link to="/admin/operations" className={`${adminInteractiveSurface} group p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white">Ops Monitor</h3>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-primary-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Watch failed jobs, notification health, cron status, and queue load.</p>
            </Link>
            <Link to="/admin/analytics" className={`${adminInteractiveSurface} group p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white">Analytics</h3>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-primary-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Open GMV, category, vendor, refund, and performance reports.</p>
            </Link>
          </section>
        </DashboardGroup>

        {loading && (
          <div className="fixed inset-x-0 bottom-5 z-30 mx-auto flex w-max items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            Loading admin dashboard
          </div>
        )}
        <AdminCaseDrawer
          open={Boolean(caseDrawerIssue)}
          issue={caseDrawerIssue}
          caseRecord={caseRecord}
          form={caseForm}
          onChange={updateCaseForm}
          onClose={closeAdminCase}
          onSave={saveAdminCase}
          saving={caseSaving}
          loading={caseLoading}
          error={caseError}
        />
      </div>
    </div>
  );
}
