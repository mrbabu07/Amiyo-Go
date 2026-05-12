import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
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

  useEffect(() => {
    let mounted = true;

    const fetchAdminOverview = async () => {
      setLoading(true);
      try {
        const token = user ? await user.getIdToken() : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [
          productsRes,
          categoriesRes,
          ordersRes,
          usersRes,
          vendorsRes,
          payoutRes,
          ticketRes,
        ] = await Promise.allSettled([
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
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1e7098]">{greeting}, Admin</p>
            <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">
              Marketplace Control Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Control categories, vendors, users, owner products, payouts, reports, messaging, support, and promotions from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {totalAlerts > 0 && (
              <Link to="/admin/vendor-activity" className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                Needs Attention
                <TinyAlertBadge count={totalAlerts} />
              </Link>
            )}
            <Link to="/admin/categories" className="inline-flex items-center gap-2 rounded-lg bg-[#1e7098] px-4 py-2 text-sm font-bold text-white hover:bg-[#15536f]">
              Manage Categories
              <TinyAlertBadge count={getAlertCount("/admin/categories")} />
            </Link>
            <Link to="/admin/chats" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
              Open Messages
              <TinyAlertBadge count={getAlertCount("/admin/chats")} />
            </Link>
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-3">
            <Tags className="h-5 w-5 text-[#1e7098]" />
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Recommended Admin Workflow</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              "Create category tree and commission rates",
              "Approve vendors and category access",
              "Review products, inventory, and orders",
              "Handle payouts, reports, support, and messages",
            ].map((step, index) => (
              <div key={step} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-xs font-black uppercase text-[#1e7098]">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
