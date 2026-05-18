import { useEffect, useMemo, useState } from "react";
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
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  PackagePlus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UploadCloud,
  X,
} from "lucide-react";
import useAuth from "../hooks/useAuth";

const navGroups = [
  {
    name: "Products",
    icon: Package,
    children: [
      { name: "All products", path: "/vendor/products", icon: Package },
      { name: "Add product", path: "/vendor/products/add", icon: PackagePlus },
      { name: "Bulk upload", path: "/vendor/products/bulk", icon: UploadCloud },
      { name: "Category requests", path: "/vendor/category-requests", icon: FileCheck2 },
    ],
  },
  {
    name: "Orders",
    icon: ShoppingBag,
    children: [
      { name: "All orders", path: "/vendor/orders", icon: ShoppingBag },
      { name: "Returns", path: "/vendor/returns", icon: RefreshCcw },
    ],
  },
  {
    name: "Finance",
    icon: CreditCard,
    children: [
      { name: "Overview", path: "/vendor/finance", icon: CreditCard },
      { name: "Payouts", path: "/vendor/finance/payouts", icon: CreditCard },
      { name: "Transactions", path: "/vendor/finance/transactions", icon: BarChart3 },
      { name: "Statements", path: "/vendor/finance/statements", icon: FileCheck2 },
    ],
  },
  {
    name: "Reports",
    icon: BarChart3,
    children: [
      { name: "Sales report", path: "/vendor/reports/sales", icon: BarChart3 },
      { name: "Product report", path: "/vendor/reports/products", icon: Package },
      { name: "Traffic report", path: "/vendor/reports/traffic", icon: Store },
      { name: "Inventory forecast", path: "/vendor/reports/inventory", icon: Package },
    ],
  },
  {
    name: "Shop",
    icon: Store,
    children: [
      { name: "Shop profile", path: "/vendor/shop/profile", icon: Store },
      { name: "Decoration", path: "/vendor/shop/decoration", icon: Store },
      { name: "Categories", path: "/vendor/shop/categories", icon: FileCheck2 },
      { name: "KYC verification", path: "/vendor/kyc", icon: ShieldCheck },
    ],
  },
  {
    name: "Marketing",
    icon: Megaphone,
    children: [
      { name: "Promotions", path: "/vendor/marketing/promotions", icon: Megaphone },
      { name: "Vouchers", path: "/vendor/marketing/vouchers", icon: Megaphone },
      { name: "Campaigns", path: "/vendor/marketing/campaigns", icon: Megaphone },
    ],
  },
  {
    name: "Support",
    icon: Headphones,
    children: [
      { name: "Messages", path: "/vendor/messages", icon: MessageSquare },
      { name: "Support chat", path: "/vendor/support-chat", icon: Headphones },
      { name: "Reviews", path: "/vendor/reviews", icon: FileCheck2 },
      { name: "Q&A", path: "/vendor/qa", icon: MessageSquare },
    ],
  },
];

const singleLinks = [
  { name: "Dashboard", path: "/vendor/dashboard", icon: LayoutDashboard },
  { name: "Settings", path: "/vendor/settings", icon: Settings },
];

function isDesktop() {
  return typeof window !== "undefined" && window.innerWidth >= 1024;
}

function isPathActive(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SellerNavLink({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
          isActive
            ? "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
    </NavLink>
  );
}

export default function VendorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, vendorProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktop());
  const [expandedSections, setExpandedSections] = useState({});

  const shopName =
    vendorProfile?.shopName || vendorProfile?.businessName || user?.displayName || "Seller Center";
  const userInitial = (shopName || user?.email || "A").charAt(0).toUpperCase();

  const hydratedGroups = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        active: group.children.some((child) => isPathActive(location.pathname, child.path)),
      })),
    [location.pathname],
  );

  useEffect(() => {
    setExpandedSections((current) => {
      const next = { ...current };
      hydratedGroups.forEach((group) => {
        if (group.active) next[group.name] = true;
      });
      return next;
    });
  }, [hydratedGroups]);

  const closeSidebarOnMobile = () => {
    if (!isDesktop()) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleSection = (name) => {
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
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Seller notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 dark:border-slate-800 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {userInitial}
              </span>
              <div className="max-w-44 text-right">
                <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{shopName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">Vendor workspace</p>
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
        className={`fixed bottom-0 left-0 top-16 z-20 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Vendor navigation"
      >
        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-900">
            <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{shopName}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Products, orders, finance, and support
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {singleLinks.map((item) => (
            <SellerNavLink key={item.path} item={item} onClick={closeSidebarOnMobile} />
          ))}

          {hydratedGroups.map((group) => {
            const Icon = group.icon;
            const expanded = expandedSections[group.name] || group.active;

            return (
              <div key={group.name}>
                <button
                  type="button"
                  onClick={() => toggleSection(group.name)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
                    group.active
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  aria-expanded={expanded}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded ? (
                  <div className="mt-1 space-y-1 border-l border-slate-200 py-1 pl-4 dark:border-slate-800">
                    {group.children.map((child) => (
                      <SellerNavLink key={child.path} item={child} onClick={closeSidebarOnMobile} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen pt-16 transition-all duration-300 lg:ml-72">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
