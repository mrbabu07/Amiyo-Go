import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CreditCard,
  FileCheck2,
  Headphones,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UploadCloud,
  X,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  buildVendorActionItems,
  getVendorActionCount,
} from "../utils/vendorSellerCenter";
import {
  canAccessVendorPath,
  filterVendorNavigation,
  getVendorAccessSummary,
} from "../utils/vendorStaffPermissions";

const navGroups = [
  {
    name: "Products",
    icon: Package,
    children: [
      { name: "All products", path: "/vendor/products", icon: Package, permission: "products:view" },
      { name: "Add product", path: "/vendor/products/add", icon: PackagePlus, permission: "products:manage" },
      { name: "Bulk upload", path: "/vendor/products/bulk", icon: UploadCloud, permission: "products:manage" },
      { name: "Category requests", path: "/vendor/category-requests", icon: FileCheck2, permission: "products:manage" },
    ],
  },
  {
    name: "Orders",
    icon: ShoppingBag,
    children: [
      { name: "All orders", path: "/vendor/orders", icon: ShoppingBag, permission: "orders:view" },
      { name: "Returns", path: "/vendor/returns", icon: RefreshCcw, permission: "returns:view" },
    ],
  },
  {
    name: "Finance",
    icon: CreditCard,
    children: [
      { name: "Overview", path: "/vendor/finance", icon: CreditCard, permission: "finance:view" },
      { name: "Reconciliation", path: "/vendor/finance/reconciliation", icon: FileCheck2, permission: "finance:view" },
      { name: "Payouts", path: "/vendor/finance/payouts", icon: CreditCard, permission: "finance:view" },
      { name: "Transactions", path: "/vendor/finance/transactions", icon: BarChart3, permission: "finance:view" },
      { name: "Statements", path: "/vendor/finance/statements", icon: FileCheck2, permission: "finance:view" },
    ],
  },
  {
    name: "Reports",
    icon: BarChart3,
    children: [
      { name: "Sales report", path: "/vendor/reports/sales", icon: BarChart3, permission: "reports:view" },
      { name: "Product report", path: "/vendor/reports/products", icon: Package, permission: "reports:view" },
      { name: "Traffic report", path: "/vendor/reports/traffic", icon: Store, permission: "reports:view" },
      { name: "Inventory forecast", path: "/vendor/reports/inventory", icon: Package, permission: "reports:view" },
    ],
  },
  {
    name: "Shop",
    icon: Store,
    children: [
      { name: "Shop info", path: "/vendor/shop/settings", icon: Store, permission: "shop:manage" },
      { name: "Media", path: "/vendor/shop/media", icon: Store, permission: "shop:manage" },
      { name: "Location", path: "/vendor/shop/location", icon: MapPin, permission: "shop:manage" },
      { name: "Shop profile", path: "/vendor/shop/profile", icon: Store, permission: "shop:manage" },
      { name: "Decoration", path: "/vendor/shop/decoration", icon: Store, permission: "shop:manage" },
      { name: "Categories", path: "/vendor/shop/categories", icon: FileCheck2, permission: "shop:manage" },
      { name: "KYC verification", path: "/vendor/kyc", icon: ShieldCheck, permission: "settings:manage" },
    ],
  },
  {
    name: "Marketing",
    icon: Megaphone,
    children: [
      { name: "Promotions", path: "/vendor/marketing/promotions", icon: Megaphone, permission: "marketing:manage" },
      { name: "Vouchers", path: "/vendor/marketing/vouchers", icon: Megaphone, permission: "marketing:manage" },
      { name: "Campaigns", path: "/vendor/marketing/campaigns", icon: Megaphone, permission: "marketing:manage" },
    ],
  },
  {
    name: "Support",
    icon: Headphones,
    children: [
      { name: "Messages", path: "/vendor/messages", icon: MessageSquare, permission: "support:view" },
      { name: "Support chat", path: "/vendor/support-chat", icon: Headphones, permission: "support:view" },
      { name: "Reviews", path: "/vendor/reviews", icon: FileCheck2, permission: "reviews:view" },
      { name: "Q&A", path: "/vendor/qa", icon: MessageSquare, permission: "support:view" },
    ],
  },
];

const singleLinks = [
  { name: "Dashboard", path: "/vendor/dashboard", icon: LayoutDashboard },
  { name: "Settings", path: "/vendor/settings", icon: Settings, permission: "settings:manage" },
];

const SIDEBAR_COLLAPSE_KEY = "amiyo:vendor-sidebar-collapsed";

const actionIconMap = {
  kyc: ShieldCheck,
  orders: ShoppingBag,
  products: Package,
  returns: RefreshCcw,
  finance: CreditCard,
  marketing: Megaphone,
  support: Headphones,
};

function isDesktop() {
  return typeof window !== "undefined" && window.innerWidth >= 1024;
}

function getStoredSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

function isPathActive(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SellerNavLink({ item, onClick, collapsed = false }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.name : undefined}
      className={({ isActive }) =>
        `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
          collapsed ? "lg:justify-center lg:px-0" : ""
        } ${
          isActive
            ? "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{item.name}</span>
    </NavLink>
  );
}

export default function VendorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, dbUser, role, permissions, isAdmin, logout, vendorProfile } = useAuth();
  const actionCenterRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktop());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getStoredSidebarCollapsed);
  const [expandedSections, setExpandedSections] = useState({});
  const [actionCenterOpen, setActionCenterOpen] = useState(false);

  const shopName =
    vendorProfile?.shopName || vendorProfile?.businessName || user?.displayName || "Seller Center";
  const userInitial = (shopName || user?.email || "A").charAt(0).toUpperCase();
  const accessSource = useMemo(
    () => ({ dbUser, isAdmin, permissions, role }),
    [dbUser, isAdmin, permissions, role],
  );
  const accessSummary = useMemo(() => getVendorAccessSummary(accessSource), [accessSource]);
  const visibleSingleLinks = useMemo(
    () => filterVendorNavigation(singleLinks, accessSource),
    [accessSource],
  );
  const visibleNavGroups = useMemo(
    () => filterVendorNavigation(navGroups, accessSource),
    [accessSource],
  );

  const hydratedGroups = useMemo(
    () =>
      visibleNavGroups.map((group) => ({
        ...group,
        active: group.children.some((child) => isPathActive(location.pathname, child.path)),
      })),
    [location.pathname, visibleNavGroups],
  );
  const actionItems = useMemo(
    () =>
      buildVendorActionItems(vendorProfile || {}).filter((item) =>
        canAccessVendorPath(item.path, accessSource),
      ),
    [accessSource, vendorProfile],
  );
  const actionCount = getVendorActionCount(actionItems);

  useClickOutside(actionCenterRef, () => setActionCenterOpen(false));

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, sidebarCollapsed ? "true" : "false");
    } catch {
      // Local storage is optional; the sidebar still works without persistence.
    }
  }, [sidebarCollapsed]);

  const closeSidebarOnMobile = () => {
    if (!isDesktop()) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleSection = (name) => {
    if (sidebarCollapsed && isDesktop()) {
      setSidebarCollapsed(false);
      setExpandedSections((current) => ({
        ...current,
        [name]: true,
      }));
      return;
    }

    setExpandedSections((current) => ({
      ...current,
      [name]: !current[name],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
              aria-label={sidebarOpen ? "Close seller menu" : "Open seller menu"}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-slate-200 dark:hover:bg-slate-800 lg:inline-flex"
              aria-label={sidebarCollapsed ? "Expand seller sidebar" : "Collapse seller sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <Link to="/vendor/dashboard" className="flex min-w-0 items-center gap-3" onClick={closeSidebarOnMobile}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-extrabold text-white shadow-sm">
                AG
              </span>
              <span className="truncate text-lg font-extrabold text-slate-950 dark:text-white sm:text-xl">
                Seller Center
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-primary-50 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-primary-950/30 dark:hover:text-primary-200 sm:inline-flex"
            >
              <Home className="h-4 w-4" />
              Storefront
            </Link>
            <div className="relative" ref={actionCenterRef}>
              <button
                type="button"
                onClick={() => setActionCenterOpen((open) => !open)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Seller action center"
                aria-expanded={actionCenterOpen}
              >
                <Bell className="h-5 w-5" />
                {actionCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white">
                    {actionCount > 9 ? "9+" : actionCount}
                  </span>
                ) : (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>

              {actionCenterOpen ? (
                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:w-96">
                  <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                      Seller action center
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Operational shortcuts for products, orders, KYC, finance, and support.
                    </p>
                  </div>

                  <div className="max-h-[28rem] overflow-y-auto p-3">
                    {actionItems.length === 0 ? (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        No staff shortcuts are available for your current permissions.
                      </div>
                    ) : (
                    <div className="space-y-2">
                      {actionItems.map((item) => {
                        const Icon = actionIconMap[item.icon] || Bell;

                        return (
                          <Link
                            key={item.id}
                            to={item.path}
                            onClick={() => setActionCenterOpen(false)}
                            className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/50 dark:border-slate-800 dark:hover:border-primary-900 dark:hover:bg-primary-950/30"
                          >
                            <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                                  {item.label}
                                </span>
                                {["danger", "warning"].includes(item.severity) ? (
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${item.tone}`}>
                                    Action
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                    <Link
                      to="/vendor/dashboard"
                      onClick={() => setActionCenterOpen(false)}
                      className="block rounded-lg bg-slate-950 px-3 py-2 text-center text-sm font-extrabold text-white transition hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500"
                    >
                      Open dashboard
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 dark:border-slate-800 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {userInitial}
              </span>
              <div className="max-w-44 text-right">
                <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{shopName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{accessSummary.label}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-10 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close seller menu"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 left-0 top-16 z-20 flex w-72 flex-col border-r border-slate-200 bg-white transition-[transform,width] duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-72"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Vendor navigation"
      >
        <div className={`border-b border-slate-100 py-4 dark:border-slate-800 ${sidebarCollapsed ? "px-3 lg:px-4" : "px-4"}`}>
          <div
            className={`rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-900 ${
              sidebarCollapsed ? "lg:flex lg:h-11 lg:items-center lg:justify-center lg:p-0" : ""
            }`}
          >
            {sidebarCollapsed ? (
              <span className="hidden text-sm font-extrabold text-primary-700 dark:text-primary-200 lg:inline-flex">
                {userInitial}
              </span>
            ) : null}
            <div className={sidebarCollapsed ? "lg:hidden" : ""}>
              <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{shopName}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {accessSummary.description}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleSingleLinks.map((item) => (
            <SellerNavLink key={item.path} item={item} collapsed={sidebarCollapsed} onClick={closeSidebarOnMobile} />
          ))}

          {hydratedGroups.map((group) => {
            const Icon = group.icon;
            const expanded = expandedSections[group.name] || group.active;

            return (
              <div key={group.name}>
                <button
                  type="button"
                  onClick={() => toggleSection(group.name)}
                  title={sidebarCollapsed ? group.name : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
                    sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
                  } ${
                    group.active
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  aria-expanded={expanded}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className={`min-w-0 flex-1 truncate text-left ${sidebarCollapsed ? "lg:hidden" : ""}`}>{group.name}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${sidebarCollapsed ? "lg:hidden" : ""} ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded ? (
                  <div className={`mt-1 space-y-1 border-l border-slate-200 py-1 pl-4 dark:border-slate-800 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                    {group.children.map((child) => (
                      <SellerNavLink key={child.path} item={child} collapsed={sidebarCollapsed} onClick={closeSidebarOnMobile} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className={`min-h-screen pt-16 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"}`}>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
