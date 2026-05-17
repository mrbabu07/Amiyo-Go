import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  ShoppingBag,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getAdminAlertSummary } from '../services/api';

const navigation = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
    exact: true,
    alertKey: 'dashboard',
  },
  {
    name: 'Analytics & Reports',
    icon: BarChart3,
    path: '/admin/analytics',
    exact: true,
  },
  {
    name: 'Vendors',
    icon: Store,
    children: [
      { name: 'Requests', path: '/admin/vendor-requests', exact: true, alertKey: 'vendors' },
      { name: 'KYC Review', path: '/admin/vendor-kyc', exact: true },
      { name: 'All Vendors', path: '/admin/vendors' },
      { name: 'Activity', path: '/admin/vendor-activity', exact: true, alertKey: 'vendorActivity' },
      { name: 'Vendor Chats', path: '/admin/chats', exact: true, alertKey: 'vendorChats' },
    ],
  },
  {
    name: 'Catalog',
    icon: Package,
    children: [
      { name: 'Products', path: '/admin/products', exact: true, activePaths: ['/admin/products/edit'] },
      { name: 'Add Product', path: '/admin/products/add', exact: true },
      { name: 'Inventory', path: '/admin/inventory', exact: true, alertKey: 'products' },
      { name: 'Categories', path: '/admin/categories' },
      { name: 'Category Requests', path: '/admin/category-requests', exact: true, alertKey: 'categories' },
    ],
  },
  {
    name: 'Orders',
    icon: ShoppingBag,
    children: [
      { name: 'All Orders', path: '/admin/orders', exact: true, alertKey: 'orders' },
      { name: 'Returns', path: '/admin/returns', exact: true, alertKey: 'returns' },
      { name: 'Logistics', path: '/admin/logistics', exact: true },
      { name: 'Support Tickets', path: '/admin/support', exact: true, alertKey: 'support' },
    ],
  },
  {
    name: 'Marketing',
    icon: Megaphone,
    children: [
      { name: 'Promotions', path: '/admin/promotions', exact: true },
      { name: 'Coupons', path: '/admin/coupons', exact: true },
      { name: 'Flash Sales', path: '/admin/flash-sales', exact: true },
      { name: 'Offers', path: '/admin/offers' },
      { name: 'Newsletter', path: '/admin/newsletter', exact: true },
    ],
  },
  {
    name: 'Finance',
    icon: DollarSign,
    children: [
      { name: 'Vendor Payouts', path: '/admin/payouts', exact: true, alertKey: 'payouts' },
      { name: 'Payout Requests', path: '/admin/payout-requests', exact: true, alertKey: 'payoutRequests' },
      { name: 'Manual Payments', path: '/admin/payment-verifications', exact: true, alertKey: 'payments' },
    ],
  },
  {
    name: 'Customers',
    icon: Users,
    children: [
      { name: 'Customers', path: '/admin/customers', exact: true, alertKey: 'users' },
      { name: 'Trust & Safety', path: '/admin/trust-safety', exact: true },
      { name: 'User Roles', path: '/admin/users', exact: true },
      { name: 'Insights', path: '/admin/insights', exact: true },
      { name: 'Reviews', path: '/admin/reviews', exact: true },
      { name: 'Q&A', path: '/admin/qa', exact: true },
    ],
  },
  {
    name: 'Delivery Settings',
    icon: Truck,
    path: '/admin/delivery-settings',
    exact: true,
  },
];

const quickLinks = [
  { name: 'Store', path: '/', icon: Home },
  { name: 'Orders', path: '/admin/orders', icon: ClipboardList },
  { name: 'Vendors', path: '/admin/vendor-requests', icon: FileCheck },
  { name: 'Payments', path: '/admin/payment-verifications', icon: CreditCard },
];

const matchesRoute = (pathname, item) => {
  if (!item.path && !item.activePaths) return false;

  const paths = [item.path, ...(item.activePaths || [])].filter(Boolean);

  return paths.some((path) => {
    if (item.exact && path === item.path) {
      return pathname === path;
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  });
};

const AlertBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? false : window.innerWidth >= 1024
  ));
  const [alertCounts, setAlertCounts] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const response = await getAdminAlertSummary();
        if (!cancelled) {
          setAlertCounts(response.data.data?.sectionCounts || {});
        }
      } catch {
        if (!cancelled) setAlertCounts({});
      }
    };

    if (user) {
      loadAlerts();
      const interval = setInterval(loadAlerts, 30000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const getAlertCount = (item) => {
    if (!item?.alertKey) return 0;
    return alertCounts[item.alertKey] || 0;
  };

  const getSectionAlertCount = (item) => {
    if (!item.children) return getAlertCount(item);

    const seenKeys = new Set();
    return item.children.reduce((sum, child) => {
      if (!child.alertKey || seenKeys.has(child.alertKey)) return sum;
      seenKeys.add(child.alertKey);
      return sum + getAlertCount(child);
    }, 0);
  };

  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const isActive = (item) => matchesRoute(location.pathname, item);

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:text-gray-200 dark:hover:bg-gray-800 lg:hidden"
              aria-label={sidebarOpen ? 'Close admin menu' : 'Open admin menu'}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/admin" className="flex min-w-0 items-center gap-3" onClick={closeSidebarOnMobile}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-sm font-bold text-white shadow-sm">
                AG
              </span>
              <span className="truncate text-lg font-bold text-gray-950 dark:text-white sm:text-xl">
                Amiyo-Go Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:text-gray-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-300 sm:inline-flex"
                  title={item.name}
                  aria-label={item.name}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
            <div className="hidden items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-800 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
              </span>
              <div className="max-w-40 text-right">
                <p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
                  {user?.displayName || 'Admin'}
                </p>
                <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">
                  {role || 'staff'}
                </p>
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

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-10 bg-gray-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close admin menu"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-16 z-20 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 dark:border-gray-800 dark:bg-gray-900 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        aria-label="Admin navigation"
      >
        <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/80">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
                Admin workspace
              </p>
              <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">
                {role || 'staff'} access
              </p>
            </div>
            <Bell className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const sectionActive = item.children
              ? item.children.some((child) => isActive(child))
              : isActive(item);
            const sectionAlerts = getSectionAlertCount(item);

            if (item.children) {
              const expanded = expandedSections[item.name] || sectionActive;

              return (
                <div key={item.name}>
                  <button
                    type="button"
                    onClick={() => toggleSection(item.name)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
                      sectionActive
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                    aria-expanded={expanded}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
                    <AlertBadge count={sectionAlerts} />
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-1 space-y-1 border-l border-gray-200 py-1 pl-4 dark:border-gray-800">
                      {item.children.map((child) => {
                        const childActive = isActive(child);

                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={closeSidebarOnMobile}
                            aria-current={childActive ? 'page' : undefined}
                            className={`flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
                              childActive
                                ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                childActive ? 'bg-orange-600 dark:bg-orange-300' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate">{child.name}</span>
                            <AlertBadge count={getAlertCount(child)} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={closeSidebarOnMobile}
                aria-current={sectionActive ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
                  sectionActive
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <AlertBadge count={getAlertCount(item)} />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <Link
            to="/"
            onClick={closeSidebarOnMobile}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:text-gray-300 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">View storefront</span>
          </Link>
        </div>
      </aside>

      <main className="min-h-screen pt-16 transition-all duration-300 lg:ml-72">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
