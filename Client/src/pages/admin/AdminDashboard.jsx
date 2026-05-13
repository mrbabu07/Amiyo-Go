import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  Boxes,
  Building2,
  CheckCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  Headphones,
  Layers3,
  Megaphone,
  MessageSquare,
  Package,
  Percent,
  RefreshCcw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Ticket,
  Truck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  getAllOrders,
  getAdminAlertSummary,
  getCategories,
  getPayoutStats,
  getProducts,
  getTicketStats,
  getUserStats,
} from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";

const apiBase = import.meta.env.VITE_API_URL;

const alertKeyByPath = {
  "/admin": "dashboard",
  "/admin/vendor-activity": "vendorActivity",
  "/admin/vendors": "vendors",
  "/admin/vendor-requests": "vendors",
  "/admin/chats": "vendorChats",
  "/admin/products": "products",
  "/admin/inventory": "products",
  "/admin/orders": "orders",
  "/admin/returns": "returns",
  "/admin/payouts": "payouts",
  "/admin/payout-requests": "payoutRequests",
  "/admin/categories": "categories",
  "/admin/category-requests": "categories",
  "/admin/support": "support",
  "/admin/users": "users",
};

const controlSections = [
  {
    title: "Marketplace Control",
    description: "Products, categories, inventory, orders, and delivery.",
    items: [
      { label: "Categories", path: "/admin/categories", icon: Layers3, text: "Create category trees, icons, attributes, and commissions." },
      { label: "Products", path: "/admin/products", icon: Package, text: "Review, edit, approve, disable, or add products." },
      { label: "Inventory", path: "/admin/inventory", icon: Boxes, text: "Track stock, low-stock alerts, and stock movement." },
      { label: "Orders", path: "/admin/orders", icon: ShoppingCart, text: "Manage order status, shipping, and fulfillment." },
      { label: "Returns", path: "/admin/returns", icon: RefreshCcw, text: "Approve returns, inspect issues, and process refunds." },
      { label: "Delivery Settings", path: "/admin/delivery-settings", icon: Truck, text: "Control delivery fees, zones, and availability." },
    ],
  },
  {
    title: "Vendor Control",
    description: "Vendor approval, activity, reports, messaging, and payouts.",
    items: [
      { label: "Vendor Requests", path: "/admin/vendor-requests", icon: ClipboardList, text: "Approve vendor signup, category access, marketing, payouts, and related request queues." },
      { label: "All Vendors", path: "/admin/vendors", icon: Store, text: "Approve, suspend, reactivate, and inspect vendor shops." },
      { label: "Vendor Reports", path: "/admin/vendor-activity", icon: BarChart3, text: "Monitor sales, products, orders, and vendor activity." },
      { label: "Vendor Messages", path: "/admin/chats", icon: MessageSquare, text: "Chat with vendors and handle operational issues." },
      { label: "Vendor Payouts", path: "/admin/payouts", icon: CreditCard, text: "Create, review, mark paid, or cancel payouts." },
      { label: "Payout Requests", path: "/admin/payout-requests", icon: CircleDollarSign, text: "Approve or reject vendor withdrawal requests." },
      { label: "Category Requests", path: "/admin/category-requests", icon: ClipboardList, text: "Grant vendors access to new selling categories." },
    ],
  },
  {
    title: "Users & Support",
    description: "Customer accounts, staff roles, support tickets, and reports.",
    items: [
      { label: "Users", path: "/admin/users", icon: Users, text: "Manage customers, staff, roles, and account status." },
      { label: "User Reports", path: "/admin/insights", icon: UserCog, text: "View customer segments, behavior, and purchase patterns." },
      { label: "Support Tickets", path: "/admin/support", icon: Headphones, text: "Assign support tickets and respond to customers." },
      { label: "Reviews", path: "/admin/reviews", icon: Star, text: "Moderate product reviews and vendor feedback." },
      { label: "Q&A", path: "/admin/qa", icon: MessageSquare, text: "Answer product questions and manage responses." },
    ],
  },
  {
    title: "Promotion & Owner Settings",
    description: "Campaigns, coupons, owner products, and platform settings.",
    items: [
      { label: "Coupons", path: "/admin/coupons", icon: Ticket, text: "Create discount codes and coupon rules." },
      { label: "Flash Sales", path: "/admin/flash-sales", icon: Percent, text: "Run limited-time campaign pricing." },
      { label: "Offers", path: "/admin/offers", icon: Megaphone, text: "Control banners, popups, and promotional placements." },
      { label: "Add Owner Product", path: "/admin/products/add", icon: Building2, text: "Add products owned directly by the platform/admin." },
      { label: "Admin Settings", path: "/admin/users", icon: ShieldCheck, text: "Manage admin and staff permissions." },
      { label: "Storefront", path: "/", icon: Settings, text: "Open the public store to verify changes." },
    ],
  },
];

function StatCard({ label, value, subtext, icon: Icon, tone = "blue", loading }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-green-50 text-green-700 ring-green-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
            {loading ? "..." : value}
          </p>
          {subtext && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtext}</p>}
        </div>
        <div className={`rounded-lg p-3 ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TinyAlertBadge({ count, className = "" }) {
  if (!count) return null;
  return (
    <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ControlCard({ item, alertCount = 0 }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[#1e7098]/40 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-[#1e7098]/10 p-2 text-[#1e7098]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate font-bold text-gray-900 group-hover:text-[#1e7098] dark:text-white">
            {item.label}
          </h3>
          <TinyAlertBadge count={alertCount} />
        </div>
      </div>
      <p className="text-sm leading-5 text-gray-500 dark:text-gray-400">{item.text}</p>
    </Link>
  );
}

function FocusCard({ title, description, items, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20",
    orange: "border-orange-200 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/20",
    emerald: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
  };

  return (
    <div className={`rounded-xl border p-5 ${tones[tone]}`}>
      <h3 className="text-base font-black text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center justify-between rounded-lg border border-white/70 bg-white/80 px-3 py-3 text-sm transition hover:border-[#1e7098]/30 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">{item.label}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.helper}</p>
            </div>
            <div className="ml-3 flex items-center gap-2">
              <TinyAlertBadge count={item.count} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PriorityCard({ item }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-[#1e7098]/30 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-2 ${item.count > 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"} dark:bg-gray-800`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{item.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.helper}</p>
        </div>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.count > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
          {item.count > 0 ? `${item.count} open` : "clear"}
        </span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </Link>
  );
}

function WorkflowStep({ step, title, description, path, cta }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#1e7098]/10 px-2.5 py-1 text-[11px] font-black uppercase text-[#1e7098]">
          Step {step}
        </span>
        <Clock3 className="h-4 w-4 text-gray-400" />
      </div>
      <h3 className="mt-3 text-sm font-black text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400">{description}</p>
      <Link
        to={path}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1e7098] hover:text-[#15536f]"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    revenue: 0,
    users: 0,
    vendors: 0,
    pendingPayouts: 0,
    supportTickets: 0,
  });
  const [alertCounts, setAlertCounts] = useState({});

  const getAlertCount = (path) => alertCounts[alertKeyByPath[path]] || 0;
  const totalAlerts = Object.values(alertCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const priorityQueues = useMemo(
    () => [
      {
        label: "Vendor requests",
        helper: "Signup approvals, category access, marketing, and payouts.",
        path: "/admin/vendor-requests",
        count: getAlertCount("/admin/vendor-requests"),
        icon: ClipboardList,
      },
      {
        label: "Product moderation",
        helper: "Pending product approvals and edited product review.",
        path: "/admin/vendor-activity",
        count: getAlertCount("/admin/products"),
        icon: Package,
      },
      {
        label: "Order operations",
        helper: "Shipping, status changes, cancellations, and escalations.",
        path: "/admin/orders",
        count: getAlertCount("/admin/orders"),
        icon: ShoppingCart,
      },
      {
        label: "Returns and refunds",
        helper: "Inspect customer issues and move refunds forward.",
        path: "/admin/returns",
        count: getAlertCount("/admin/returns"),
        icon: RefreshCcw,
      },
      {
        label: "Vendor payouts",
        helper: "Approve requests and release scheduled payments.",
        path: "/admin/payouts",
        count: getAlertCount("/admin/payouts") + getAlertCount("/admin/payout-requests"),
        icon: WalletCards,
      },
      {
        label: "Support and chats",
        helper: "Vendor messages and support tickets that need responses.",
        path: "/admin/chats",
        count: getAlertCount("/admin/chats") + getAlertCount("/admin/support"),
        icon: BellRing,
      },
    ],
    [alertCounts]
  );

  const focusBoards = useMemo(
    () => [
      {
        title: "Approvals First",
        description: "Start here when you need to clear the marketplace queue fast.",
        tone: "orange",
        items: [
          { label: "Vendor requests", helper: "All seller approval queues in one place.", path: "/admin/vendor-requests", count: getAlertCount("/admin/vendor-requests") },
          { label: "Product review board", helper: "Approve or reject vendor product changes.", path: "/admin/vendor-activity", count: getAlertCount("/admin/products") },
          { label: "Category requests", helper: "Grant new selling permissions to vendors.", path: "/admin/category-requests", count: getAlertCount("/admin/category-requests") },
        ],
      },
      {
        title: "Operations Desk",
        description: "Handle day-to-day order, finance, and support movement.",
        tone: "blue",
        items: [
          { label: "Orders", helper: "Manage order flow and delivery updates.", path: "/admin/orders", count: getAlertCount("/admin/orders") },
          { label: "Returns", helper: "Resolve return and refund workload.", path: "/admin/returns", count: getAlertCount("/admin/returns") },
          { label: "Payouts", helper: "Track due payouts and vendor withdrawals.", path: "/admin/payouts", count: getAlertCount("/admin/payouts") + getAlertCount("/admin/payout-requests") },
        ],
      },
      {
        title: "Store Health",
        description: "Keep the storefront accurate, sellable, and easy to maintain.",
        tone: "emerald",
        items: [
          { label: "Categories", helper: "Refine hierarchy, icons, and commission rules.", path: "/admin/categories", count: getAlertCount("/admin/categories") },
          { label: "Inventory", helper: "Watch stock gaps and update supply issues.", path: "/admin/inventory", count: getAlertCount("/admin/inventory") },
          { label: "Support", helper: "Stay on top of customer and vendor needs.", path: "/admin/support", count: getAlertCount("/admin/support") },
        ],
      },
    ],
    [alertCounts]
  );

  useEffect(() => {
    let mounted = true;

    const fetchAdminOverview = async () => {
      setLoading(true);
      try {
        const token = user ? await user.getIdToken() : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [productsRes, categoriesRes, ordersRes, usersRes, vendorsRes, payoutRes, ticketRes] = await Promise.allSettled([
          getProducts({ limit: 200 }),
          getCategories(),
          getAllOrders(),
          getUserStats(),
          fetch(`${apiBase}/vendors/stats`, { headers }).then((res) => res.json()),
          getPayoutStats(),
          getTicketStats(),
        ]);

        const products = productsRes.status === "fulfilled" ? productsRes.value.data.data || [] : [];
        const categories = categoriesRes.status === "fulfilled" ? categoriesRes.value.data.data || [] : [];
        const orders = ordersRes.status === "fulfilled" ? ordersRes.value.data.data || [] : [];
        const userStats = usersRes.status === "fulfilled" ? usersRes.value.data.data || usersRes.value.data.stats || {} : {};
        const vendorStats = vendorsRes.status === "fulfilled" ? vendorsRes.value.stats || {} : {};
        const payoutStats = payoutRes.status === "fulfilled" ? payoutRes.value.data.data || payoutRes.value.data.stats || {} : {};
        const ticketStats = ticketRes.status === "fulfilled" ? ticketRes.value.data.data || ticketRes.value.data.stats || {} : {};

        const revenue = orders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);

        if (mounted) {
          setStats({
            products: products.length,
            categories: categories.length,
            orders: orders.length,
            revenue,
            users: userStats.totalUsers || userStats.total || userStats.users || 0,
            vendors: vendorStats.total || vendorStats.totalVendors || 0,
            pendingPayouts: payoutStats.pending || payoutStats.pendingCount || 0,
            supportTickets: ticketStats.open || ticketStats.totalOpen || ticketStats.total || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load admin overview:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAdminOverview();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const fetchAlerts = async () => {
      try {
        const response = await getAdminAlertSummary();
        if (mounted) {
          setAlertCounts(response.data.data?.sectionCounts || {});
        }
      } catch (error) {
        console.error("Failed to load admin alerts:", error);
        if (mounted) setAlertCounts({});
      }
    };

    if (user) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 30000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#1e7098]">{greeting}, Admin</p>
              <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">
                Marketplace Control Center
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Run approvals, catalog, orders, finance, support, and vendor operations from one calm workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/admin/vendor-requests" className="inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f]">
                  Open Request Center
                  <TinyAlertBadge count={getAlertCount("/admin/vendor-requests")} />
                </Link>
                <Link to="/admin/orders" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                  Manage Orders
                  <TinyAlertBadge count={getAlertCount("/admin/orders")} />
                </Link>
                <Link to="/admin/payouts" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                  Review Payouts
                  <TinyAlertBadge count={getAlertCount("/admin/payouts") + getAlertCount("/admin/payout-requests")} />
                </Link>
                <Link to="/admin/chats" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                  Open Messages
                  <TinyAlertBadge count={getAlertCount("/admin/chats")} />
                </Link>
              </div>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[360px] xl:max-w-[420px]">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">Needs attention</p>
                </div>
                <p className="mt-3 text-3xl font-black text-red-700">{totalAlerts}</p>
                <p className="mt-1 text-xs text-red-700/80">Open alerts across approvals, operations, and support.</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Seller base</p>
                </div>
                <p className="mt-3 text-3xl font-black text-emerald-700">{loading ? "..." : stats.vendors}</p>
                <p className="mt-1 text-xs text-emerald-700/80">Current marketplace vendors under admin control.</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">Finance queue</p>
                </div>
                <p className="mt-3 text-3xl font-black text-blue-700">{loading ? "..." : stats.pendingPayouts}</p>
                <p className="mt-1 text-xs text-blue-700/80">Payout items waiting for finance action.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Revenue" value={formatPrice(stats.revenue)} subtext="All loaded orders" icon={CircleDollarSign} tone="green" loading={loading} />
          <StatCard label="Orders" value={stats.orders} subtext="All order records" icon={ShoppingCart} tone="blue" loading={loading} />
          <StatCard label="Products" value={stats.products} subtext="Visible product sample" icon={Package} tone="purple" loading={loading} />
          <StatCard label="Categories" value={stats.categories} subtext="Storefront hierarchy" icon={Layers3} tone="orange" loading={loading} />
          <StatCard label="Users" value={stats.users} subtext="Customers and staff" icon={Users} tone="cyan" loading={loading} />
          <StatCard label="Vendors" value={stats.vendors} subtext="Seller accounts" icon={Store} tone="purple" loading={loading} />
          <StatCard label="Pending Payouts" value={stats.pendingPayouts} subtext="Need finance action" icon={CreditCard} tone="rose" loading={loading} />
          <StatCard label="Support Tickets" value={stats.supportTickets} subtext="Open/support queue" icon={Headphones} tone="blue" loading={loading} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <BellRing className="h-5 w-5 text-[#1e7098]" />
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Priority Queue</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">The fastest way to see what needs attention right now.</p>
              </div>
            </div>
            <div className="space-y-3">
              {priorityQueues.map((item) => (
                <PriorityCard key={item.path} item={item} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <Tags className="h-5 w-5 text-[#1e7098]" />
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Daily Workflow</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">A clean routine so admin work feels predictable and fast.</p>
              </div>
            </div>
            <div className="grid gap-3">
              <WorkflowStep
                step="1"
                title="Clear requests and approvals"
                description="Start with vendor requests, product moderation, and category access so the marketplace keeps moving."
                path="/admin/vendor-requests"
                cta="Open approvals"
              />
              <WorkflowStep
                step="2"
                title="Move orders and refunds"
                description="Review order updates, delivery issues, cancellations, and return/refund items in one pass."
                path="/admin/orders"
                cta="Open operations"
              />
              <WorkflowStep
                step="3"
                title="Close finance and support"
                description="Release payouts, check support tickets, and answer vendor chats before the next cycle starts."
                path="/admin/payouts"
                cta="Open finance desk"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {focusBoards.map((board) => (
            <FocusCard
              key={board.title}
              title={board.title}
              description={board.description}
              items={board.items}
              tone={board.tone}
            />
          ))}
        </div>

        <div className="grid gap-6">
          {controlSections.map((section) => (
            <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{section.title}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <ControlCard
                    key={`${section.title}-${item.label}`}
                    item={item}
                    alertCount={getAlertCount(item.path)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
