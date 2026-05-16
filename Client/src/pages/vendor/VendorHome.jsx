import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Megaphone,
  Package,
  PackageCheck,
  PackagePlus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import {
  getMyVendorProfile,
  getShopStatus,
  getVendorMarketingItems,
} from "../../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SHIP_SLA_HOURS = 48;
const LOW_VIEW_THRESHOLD = 5;
const LOW_STOCK_THRESHOLD = 10;

const actionableShipmentStatuses = new Set([
  "pending",
  "accepted",
  "processing",
  "packed",
  "ready_to_ship",
  "pickup_ready",
]);

const announcements = [
  {
    type: "Campaign",
    title: "Weekend deal campaign opens Friday",
    text: "Prepare 5 to 10 strong products with clean images and a clear discount before submission.",
    action: "Join campaign",
    to: "/vendor/marketing/campaigns",
  },
  {
    type: "Policy",
    title: "Ship within 48 hours to protect your account health",
    text: "Late shipments affect seller score, search visibility, and campaign eligibility.",
    action: "View orders",
    to: "/vendor/orders",
  },
  {
    type: "Payout",
    title: "Next payout review runs every Thursday",
    text: "Keep bank details updated and resolve return deductions before requesting payout.",
    action: "Finance center",
    to: "/vendor/finance",
  },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const isToday = (date, now = new Date()) =>
  date &&
  date.getFullYear() === now.getFullYear() &&
  date.getMonth() === now.getMonth() &&
  date.getDate() === now.getDate();

const getOrderStatus = (order = {}) =>
  String(order.status || order.vendorOrderStatus || order.overallOrderStatus || "pending").toLowerCase();

const getProductTitle = (product = {}) =>
  product.title || product.name || product.productName || "Untitled product";

const hasMissingAttributes = (product = {}) => {
  const attributes = product.attributes || product.specifications || {};
  const images = product.images || [];
  return Object.keys(attributes).length === 0 || images.length === 0 || !product.description;
};

const getProductApprovalStatus = (product = {}) =>
  String(product.approvalStatus || product.moderationStatus || product.status || "").toLowerCase();

const getHealthTone = (score) => {
  if (score >= 85) return {
    label: "Healthy",
    panel: "border-green-200 bg-green-50 text-green-800",
    bar: "bg-green-500",
    text: "text-green-700",
  };
  if (score >= 70) return {
    label: "Watch",
    panel: "border-yellow-200 bg-yellow-50 text-yellow-800",
    bar: "bg-yellow-500",
    text: "text-yellow-700",
  };
  return {
    label: "Risk",
    panel: "border-red-200 bg-red-50 text-red-800",
    bar: "bg-red-500",
    text: "text-red-700",
  };
};

const formatDuration = (milliseconds) => {
  const absolute = Math.abs(milliseconds);
  const totalMinutes = Math.floor(absolute / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
};

const EmptyInline = ({ text }) => (
  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
    {text}
  </div>
);

const MetricCard = ({ label, value, detail, icon, tone = "gray" }) => {
  const toneClasses = {
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
    </div>
  );
};

const HealthMetric = ({ label, value, detail, tone }) => (
  <div className={`rounded-lg border p-3 ${tone.panel}`}>
    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
    <p className="mt-1 text-xl font-bold">{value}</p>
    <p className="mt-1 text-xs opacity-80">{detail}</p>
  </div>
);

const ChecklistRow = ({ done, title, text, to }) => (
  <Link
    to={to}
    className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-orange-200 hover:bg-orange-50"
  >
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
      done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
    }`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-gray-950">{title}</span>
      <span className="mt-0.5 block text-xs text-gray-500">{text}</span>
    </span>
  </Link>
);

const VendorHome = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [marketingItems, setMarketingItems] = useState([]);
  const [shopStatus, setShopStatus] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      const [
        statsResult,
        ordersResult,
        productsResult,
        statusResult,
        profileResult,
        marketingResult,
      ] = await Promise.allSettled([
        fetch(`${API_URL}/vendors/dashboard/stats`, { headers: authHeaders }),
        fetch(`${API_URL}/vendors/orders?limit=50`, { headers: authHeaders }),
        fetch(`${API_URL}/vendor/products?limit=100`, { headers: authHeaders }),
        getShopStatus(),
        getMyVendorProfile(),
        getVendorMarketingItems(),
      ]);

      if (statsResult.status === "fulfilled" && statsResult.value.ok) {
        const data = await statsResult.value.json();
        setStats(data.stats || null);
      }

      if (ordersResult.status === "fulfilled" && ordersResult.value.ok) {
        const data = await ordersResult.value.json();
        setRecentOrders(data.orders || []);
      }

      if (productsResult.status === "fulfilled" && productsResult.value.ok) {
        const data = await productsResult.value.json();
        setProducts(data.products || data.data || []);
      }

      if (statusResult.status === "fulfilled") {
        setShopStatus(statusResult.value.data?.data || null);
      }

      if (profileResult.status === "fulfilled") {
        setVendorProfile(profileResult.value.data?.data || profileResult.value.data?.vendor || null);
      }

      if (marketingResult.status === "fulfilled") {
        setMarketingItems(marketingResult.value.data?.data || []);
      }
    } catch (fetchError) {
      console.error("Error fetching vendor dashboard data:", fetchError);
      setError("Dashboard data could not be loaded. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % announcements.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const dashboard = useMemo(() => {
    const orders = recentOrders || [];
    const todayOrders = orders.filter((order) => isToday(getDate(order.createdAt), now));
    const actionableOrders = orders.filter((order) => actionableShipmentStatuses.has(getOrderStatus(order)));
    const cancelledOrders = orders.filter((order) => getOrderStatus(order) === "cancelled");
    const shippedOrDoneOrders = orders.filter((order) =>
      ["shipped", "delivered", "cancelled"].includes(getOrderStatus(order)),
    );
    const weekRevenue = (stats?.salesChart?.data || []).reduce((sum, value) => sum + Number(value || 0), 0);
    const cancellationRate = orders.length ? Math.round((cancelledOrders.length / orders.length) * 100) : 0;

    const slaOrders = actionableOrders
      .map((order) => {
        const createdAt = getDate(order.createdAt) || now;
        const deadline = new Date(createdAt.getTime() + SHIP_SLA_HOURS * 60 * 60 * 1000);
        const remainingMs = deadline.getTime() - now.getTime();
        return {
          ...order,
          createdAt,
          deadline,
          remainingMs,
          breached: remainingMs < 0,
        };
      })
      .sort((a, b) => a.remainingMs - b.remainingMs);

    const lateShipmentRate = actionableOrders.length
      ? Math.round((slaOrders.filter((order) => order.breached).length / actionableOrders.length) * 100)
      : 0;

    const policyViolations = products.filter((product) => {
      const approvalStatus = getProductApprovalStatus(product);
      return approvalStatus === "rejected" || Number(product.policyViolations || 0) > 0;
    });
    const responseRate = Number(stats?.responseRate ?? stats?.chatResponseRate ?? 100);
    const healthScore = clamp(
      Math.round(
        100 -
          policyViolations.length * 12 -
          lateShipmentRate * 0.35 -
          Math.max(0, 95 - responseRate) * 0.6 -
          cancellationRate * 0.3,
      ),
      0,
      100,
    );

    const productIssues = [
      {
        id: "out-of-stock",
        title: "No stock",
        count: products.filter((product) => Number(product.stock || 0) <= 0).length,
        tone: "red",
        text: "Restock or hide unavailable listings.",
      },
      {
        id: "low-views",
        title: "Low views",
        count: products.filter((product) => Number(product.views || 0) <= LOW_VIEW_THRESHOLD).length,
        tone: "yellow",
        text: "Improve title, image, price, or campaign exposure.",
      },
      {
        id: "missing-attributes",
        title: "Missing attributes",
        count: products.filter(hasMissingAttributes).length,
        tone: "blue",
        text: "Add images, description, and key specifications.",
      },
      {
        id: "pending-moderation",
        title: "Pending moderation",
        count: products.filter((product) => getProductApprovalStatus(product) === "pending").length,
        tone: "orange",
        text: "Track approval before planning promotion.",
      },
    ];

    const advisorProducts = products
      .map((product) => {
        const issues = [];
        if (Number(product.stock || 0) <= 0) issues.push("No stock");
        else if (Number(product.stock || 0) < LOW_STOCK_THRESHOLD) issues.push("Low stock");
        if (Number(product.views || 0) <= LOW_VIEW_THRESHOLD) issues.push("Low views");
        if (hasMissingAttributes(product)) issues.push("Missing attributes");
        if (getProductApprovalStatus(product) === "pending") issues.push("Pending moderation");
        if (getProductApprovalStatus(product) === "rejected") issues.push("Policy review");

        return {
          ...product,
          issues,
        };
      })
      .filter((product) => product.issues.length > 0)
      .slice(0, 5);

    const profile = vendorProfile || {};
    const profileComplete = Boolean(
      (profile.shopName || profile.businessName || profile.name) &&
      (profile.phone || profile.contactPhone || profile.mobile) &&
      (profile.address || profile.district || profile.upazila) &&
      (profile.logo || profile.logoUrl || profile.banner || profile.bannerUrl),
    );
    const checklist = [
      {
        title: "Complete your profile",
        text: "Add logo, shop details, contact, and pickup address.",
        done: profileComplete,
        to: "/vendor/shop/profile",
      },
      {
        title: "Add first product",
        text: "Publish at least one listing with stock and photos.",
        done: products.length > 0,
        to: "/vendor/products/add",
      },
      {
        title: "Process first order",
        text: "Pack and ship the first customer order on time.",
        done: orders.some((order) => shippedOrDoneOrders.includes(order)),
        to: "/vendor/orders",
      },
      {
        title: "Join first campaign",
        text: "Submit a promotion, voucher, or campaign request.",
        done: marketingItems.length > 0,
        to: "/vendor/marketing/campaigns",
      },
    ];
    const completedChecklist = checklist.filter((item) => item.done).length;

    return {
      todayOrders,
      actionableOrders,
      weekRevenue,
      cancellationRate,
      slaOrders,
      policyViolations,
      lateShipmentRate,
      responseRate,
      healthScore,
      productIssues,
      advisorProducts,
      checklist,
      onboardingProgress: Math.round((completedChecklist / checklist.length) * 100),
    };
  }, [marketingItems.length, now, products, recentOrders, stats, vendorProfile]);

  const healthTone = getHealthTone(dashboard.healthScore);
  const currentAnnouncement = announcements[announcementIndex];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600" />
          <p className="mt-4 text-sm font-medium text-gray-600">Loading seller dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Seller Center</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">
              Business command center
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              See sales health, fulfillment risk, listing quality, and next actions in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/vendor/products/add"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <PackagePlus className="h-4 w-4" />
              Add product
            </Link>
            <Link
              to="/vendor/orders"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            >
              <Truck className="h-4 w-4" />
              Process orders
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Today's orders"
            value={dashboard.todayOrders.length}
            detail={`${stats?.pendingOrders || 0} total pending orders`}
            icon={ShoppingBag}
            tone="orange"
          />
          <MetricCard
            label="Pending shipments"
            value={dashboard.actionableOrders.length}
            detail={`${dashboard.slaOrders.filter((order) => order.breached).length} already over SLA`}
            icon={Truck}
            tone={dashboard.slaOrders.some((order) => order.breached) ? "red" : "blue"}
          />
          <MetricCard
            label="Revenue this week"
            value={formatPrice(dashboard.weekRevenue)}
            detail={`${stats?.revenueGrowth || 0}% vs previous period`}
            icon={Wallet}
            tone="green"
          />
          <MetricCard
            label="Cancellation rate"
            value={`${dashboard.cancellationRate}%`}
            detail={`${recentOrders.length || 0} recent orders measured`}
            icon={XCircle}
            tone={dashboard.cancellationRate > 8 ? "red" : "gray"}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-5 w-5 ${healthTone.text}`} />
                  <h2 className="text-lg font-bold text-gray-950">Account health scorecard</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Score is based on policy risk, shipment SLA, response rate, and cancellations.
                </p>
              </div>
              <div className={`rounded-lg border px-4 py-3 text-center ${healthTone.panel}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{healthTone.label}</p>
                <p className="text-3xl font-bold">{dashboard.healthScore}</p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${healthTone.bar}`}
                style={{ width: `${dashboard.healthScore}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <HealthMetric
                label="Policy violations"
                value={dashboard.policyViolations.length}
                detail="Rejected or flagged listings"
                tone={getHealthTone(100 - dashboard.policyViolations.length * 25)}
              />
              <HealthMetric
                label="Late shipment"
                value={`${dashboard.lateShipmentRate}%`}
                detail="Active orders over 48h SLA"
                tone={getHealthTone(100 - dashboard.lateShipmentRate)}
              />
              <HealthMetric
                label="Response rate"
                value={`${dashboard.responseRate}%`}
                detail="Customer response signal"
                tone={getHealthTone(dashboard.responseRate)}
              />
              <HealthMetric
                label="Cancellation"
                value={`${dashboard.cancellationRate}%`}
                detail="Recent vendor orders"
                tone={getHealthTone(100 - dashboard.cancellationRate * 4)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-bold text-gray-950">SLA countdown</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">Ship within {SHIP_SLA_HOURS}h.</p>
              </div>
              <Link to="/vendor/orders" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {dashboard.slaOrders.length === 0 ? (
                <EmptyInline text="No shipment deadlines at risk right now." />
              ) : (
                dashboard.slaOrders.slice(0, 4).map((order) => {
                  const breached = order.remainingMs < 0;
                  return (
                    <Link
                      key={order._id}
                      to={`/vendor/orders/${order._id}`}
                      className={`block rounded-lg border p-3 transition hover:bg-gray-50 ${
                        breached ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-950">
                            Order #{String(order._id || "").slice(-8)}
                          </p>
                          <p className="text-xs capitalize text-gray-500">{getOrderStatus(order)}</p>
                        </div>
                        <div className={`text-right text-sm font-bold ${breached ? "text-red-700" : "text-orange-700"}`}>
                          {breached ? "Late " : ""}
                          {formatDuration(order.remainingMs)}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-950">Product Advisor</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Fix listings that block sales, moderation, or search visibility.
                </p>
              </div>
              <Link to="/vendor/products" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                Manage products
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.productIssues.map((issue) => {
                const issueTone = {
                  red: "border-red-200 bg-red-50 text-red-800",
                  yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
                  blue: "border-blue-200 bg-blue-50 text-blue-800",
                  orange: "border-orange-200 bg-orange-50 text-orange-800",
                }[issue.tone];
                return (
                  <div key={issue.id} className={`rounded-lg border p-3 ${issueTone}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{issue.title}</p>
                    <p className="mt-1 text-2xl font-bold">{issue.count}</p>
                    <p className="mt-1 text-xs opacity-80">{issue.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {dashboard.advisorProducts.length === 0 ? (
                <EmptyInline text="No product problems detected. Keep listings fresh and in stock." />
              ) : (
                dashboard.advisorProducts.map((product) => (
                  <Link
                    key={product._id}
                    to={`/vendor/products/edit/${product._id}`}
                    className="flex flex-col gap-3 p-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={getProductTitle(product)}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                          <Package className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-950">{getProductTitle(product)}</p>
                        <p className="text-xs text-gray-500">
                          Stock {Number(product.stock || 0)} | Views {Number(product.views || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.issues.slice(0, 3).map((issue) => (
                        <span key={issue} className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-bold text-gray-950">Admin announcements</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">Campaigns, policy, and payout notices.</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setAnnouncementIndex((current) => (
                    current === 0 ? announcements.length - 1 : current - 1
                  ))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                  aria-label="Previous announcement"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAnnouncementIndex((current) => (current + 1) % announcements.length)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100"
                  aria-label="Next announcement"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 p-4">
              <span className="inline-flex rounded-full bg-white px-2 py-1 text-xs font-semibold text-orange-700">
                {currentAnnouncement.type}
              </span>
              <h3 className="mt-3 text-base font-bold text-gray-950">{currentAnnouncement.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{currentAnnouncement.text}</p>
              <Link
                to={currentAnnouncement.to}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
              >
                {currentAnnouncement.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-3 flex gap-2">
              {announcements.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setAnnouncementIndex(index)}
                  className={`h-2 flex-1 rounded-full ${index === announcementIndex ? "bg-orange-600" : "bg-gray-200"}`}
                  aria-label={`Announcement ${index + 1}`}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-bold text-gray-950">Seller education</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">Your onboarding path.</p>
              </div>
              <span className="text-lg font-bold text-gray-950">{dashboard.onboardingProgress}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${dashboard.onboardingProgress}%` }}
              />
            </div>
            <div className="mt-4 space-y-2">
              {dashboard.checklist.map((item) => (
                <ChecklistRow key={item.title} {...item} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-950">Shop status</h2>
            </div>
            <div className={`mt-4 rounded-lg border p-4 ${
              shopStatus?.isShopOpen && !shopStatus?.isCurrentlyOnVacation
                ? "border-green-200 bg-green-50"
                : "border-yellow-200 bg-yellow-50"
            }`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  shopStatus?.isShopOpen && !shopStatus?.isCurrentlyOnVacation
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {shopStatus?.isShopOpen && !shopStatus?.isCurrentlyOnVacation
                    ? <CheckCircle2 className="h-5 w-5" />
                    : <AlertTriangle className="h-5 w-5" />}
                </span>
                <div>
                  <p className="font-semibold text-gray-950">
                    {shopStatus?.isCurrentlyOnVacation
                      ? "Shop is on vacation"
                      : shopStatus?.isShopOpen
                        ? "Shop is open"
                        : "Shop is closed"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {shopStatus?.isShopOpen
                      ? "Products are visible to customers."
                      : "Open the shop to restore visibility."}
                  </p>
                </div>
              </div>
              <Link
                to="/vendor/settings"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                Manage shop status
              </Link>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-950">Sales overview</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Last 7 days of delivered earnings.</p>
            <div className="mt-5 flex h-44 items-end gap-2">
              {(stats?.salesChart?.data || []).length === 0 ? (
                <EmptyInline text="Sales data appears after delivered orders." />
              ) : (
                stats.salesChart.data.map((value, index) => {
                  const maxValue = Math.max(...stats.salesChart.data, 1);
                  const height = Math.max(8, (Number(value || 0) / maxValue) * 100);
                  return (
                    <div key={`${stats.salesChart.labels[index]}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-32 w-full items-end">
                        <div
                          className="w-full rounded-t bg-orange-500 transition hover:bg-orange-600"
                          style={{ height: `${height}%` }}
                          title={formatPrice(value)}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{stats.salesChart.labels[index]}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Link to="/vendor/products" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:bg-orange-50">
            <PackageCheck className="h-5 w-5 text-orange-600" />
            <p className="mt-3 font-semibold text-gray-950">Manage listings</p>
            <p className="text-sm text-gray-500">{stats?.totalProducts || 0} products</p>
          </Link>
          <Link to="/vendor/finance" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:bg-orange-50">
            <Wallet className="h-5 w-5 text-green-600" />
            <p className="mt-3 font-semibold text-gray-950">Finance</p>
            <p className="text-sm text-gray-500">Payouts and earnings</p>
          </Link>
          <Link to="/vendor/reviews" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:bg-orange-50">
            <Star className="h-5 w-5 text-yellow-600" />
            <p className="mt-3 font-semibold text-gray-950">Reviews</p>
            <p className="text-sm text-gray-500">{stats?.totalReviews || 0} customer reviews</p>
          </Link>
          <Link to="/vendor/marketing/promotions" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:bg-orange-50">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <p className="mt-3 font-semibold text-gray-950">Marketing</p>
            <p className="text-sm text-gray-500">Campaigns and vouchers</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorHome;
