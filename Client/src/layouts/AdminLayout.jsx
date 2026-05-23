import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileCheck,
  FileClock,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  Settings,
  Store,
  Sun,
  Truck,
  Users,
  X,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getAdminAlertSummary } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import AdminGlobalSearch from '../components/admin/AdminGlobalSearch';

const navigation = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
    exact: true,
    alertKey: 'dashboard',
  },
  {
    name: 'Operations',
    icon: Activity,
    path: '/admin/operations',
    exact: true,
  },
  {
    name: 'Audit Logs',
    icon: FileClock,
    path: '/admin/audit-logs',
    exact: true,
  },
  {
    name: 'Analytics & Reports',
    icon: BarChart3,
    path: '/admin/analytics',
    exact: true,
  },
  {
    name: 'Platform Control',
    icon: Settings,
    path: '/admin/platform',
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
      { name: 'COD Delivery', path: '/admin/cod-delivery', exact: true, alertKey: 'payments' },
      { name: 'Returns', path: '/admin/returns', exact: true, alertKey: 'returns' },
      { name: 'Logistics', path: '/admin/logistics', exact: true },
      { name: 'My Orders', path: '/admin/logistics?tab=work', exact: true },
      { name: 'Ready Pickup', path: '/admin/logistics?tab=ready', exact: true },
      { name: 'Dispatch Manifest', path: '/admin/logistics?tab=manifest', exact: true },
      { name: 'Parcel Assignment', path: '/admin/logistics?tab=parcels', exact: true },
      { name: 'Pickup Staff', path: '/admin/logistics?tab=staff', exact: true },
      { name: 'COD Float', path: '/admin/logistics?tab=cod', exact: true },
      { name: 'Failed Delivery', path: '/admin/logistics?tab=failed', exact: true, alertKey: 'returns' },
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

const parseNavPath = (path = '') => {
  const [pathname, query = ''] = String(path).split('?');
  return {
    pathname,
    search: query ? `?${query}` : '',
  };
};

const matchesRoute = (location, item) => {
  if (!item.path && !item.activePaths) return false;

  const paths = [item.path, ...(item.activePaths || [])].filter(Boolean);
  const currentPathname = typeof location === 'string' ? location : location.pathname;
  const currentSearch = typeof location === 'string' ? '' : location.search;

  return paths.some((path) => {
    const target = parseNavPath(path);
    const hasQuery = Boolean(target.search);
    const queryMatches = !hasQuery || target.search === currentSearch;

    if (item.exact && path === item.path) {
      return currentPathname === target.pathname && (hasQuery ? queryMatches : !currentSearch);
    }

    return (
      (currentPathname === target.pathname || currentPathname.startsWith(`${target.pathname}/`)) &&
      queryMatches
    );
  });
};

const adminPermissionRules = [
  { pattern: /^\/admin$/, resource: 'system', action: 'read' },
  { pattern: /^\/admin\/operations/, resource: 'system', action: 'read' },
  { pattern: /^\/admin\/audit-logs/, resource: 'audit_logs', action: 'read' },
  { pattern: /^\/admin\/analytics/, resource: 'analytics', action: 'read' },
  { pattern: /^\/admin\/platform/, resource: 'system', action: 'read' },
  { pattern: /^\/admin\/(vendor|vendors|chats|chat)/, resource: 'vendors', action: 'read' },
  { pattern: /^\/admin\/(products|inventory)/, resource: 'products', action: 'read' },
  { pattern: /^\/admin\/categories|^\/admin\/category-requests/, resource: 'categories', action: 'read' },
  { pattern: /^\/admin\/orders/, resource: 'orders', action: 'read' },
  { pattern: /^\/admin\/returns/, resource: 'returns', action: 'read' },
  { pattern: /^\/admin\/logistics/, resource: 'orders', action: 'read' },
  { pattern: /^\/admin\/delivery-settings/, resource: 'system', action: 'read' },
  { pattern: /^\/admin\/support/, resource: 'support', action: 'read' },
  { pattern: /^\/admin\/(promotions|coupons|flash-sales|offers|newsletter)/, resource: 'system', action: 'read' },
  { pattern: /^\/admin\/(payouts|payout-requests|payment-verifications|cod-delivery)/, resource: 'payments', action: 'read' },
  { pattern: /^\/admin\/(customers|insights)/, resource: 'users', action: 'read' },
  { pattern: /^\/admin\/trust-safety/, resource: 'system', action: 'read' },
  { pattern: /^\/admin\/users/, resource: 'users', action: 'read' },
  { pattern: /^\/admin\/reviews/, resource: 'reviews', action: 'read' },
  { pattern: /^\/admin\/qa/, resource: 'products', action: 'read' },
];

const hasPermission = (permissions = {}, resource, action) => {
  if (!resource || !action) return true;
  if (permissions.all === true || permissions['*'] === true) return true;

  const resourcePermission = permissions[resource];
  if (resourcePermission === true) return true;
  if (Array.isArray(resourcePermission)) {
    return resourcePermission.includes(action) || resourcePermission.includes('*');
  }
  if (resourcePermission && typeof resourcePermission === 'object') {
    return Boolean(resourcePermission[action] || resourcePermission['*']);
  }

  return false;
};

const canAccessPath = (path, { isAdmin, permissions }) => {
  if (!path) return true;
  if (isAdmin) return true;

  const rule = adminPermissionRules.find((item) => item.pattern.test(path));
  if (!rule) return false;
  return hasPermission(permissions, rule.resource, rule.action);
};

const filterNavigationByPermissions = (items, access) =>
  items
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => canAccessPath(child.path, access));
        return children.length ? { ...item, children } : null;
      }

      return canAccessPath(item.path, access) ? item : null;
    })
    .filter(Boolean);

const flattenNavigation = (items = []) =>
  items.flatMap((item) => {
    if (item.children) return flattenNavigation(item.children);
    return item.path ? [item] : [];
  });

const isLogisticsPath = (path = '') => {
  const { pathname } = parseNavPath(path);
  return pathname === '/admin/logistics' || pathname.startsWith('/admin/logistics/');
};

const filterLogisticsNavigation = (items = []) =>
  items
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => isLogisticsPath(child.path));
        return children.length
          ? { ...item, name: item.name === 'Orders' ? 'Logistics' : item.name, children }
          : null;
      }

      return isLogisticsPath(item.path) ? item : null;
    })
    .filter(Boolean);

const AlertBadge = ({ count, className = '' }) => {
  if (!count) return null;
  return (
    <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold leading-none text-white ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, permissions, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? false : window.innerWidth >= 1024
  ));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const handleSectionToggle = (sectionName) => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (sidebarCollapsed && isDesktop) {
      setSidebarCollapsed(false);
      setExpandedSections((prev) => ({
        ...prev,
        [sectionName]: true,
      }));
      return;
    }

    toggleSection(sectionName);
  };

  const isActive = (item) => matchesRoute(location, item);

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isLogisticsManager = role === 'logistics_manager';
  const logisticsHomePath = '/admin/logistics?tab=work';
  const access = { isAdmin: isAdmin || role === 'admin', permissions };
  const permittedNavigation = filterNavigationByPermissions(navigation, access);
  const visibleNavigation = isLogisticsManager
    ? filterLogisticsNavigation(permittedNavigation)
    : permittedNavigation;
  const visibleQuickLinks = isLogisticsManager
    ? [
        { name: 'Store', path: '/', icon: Home },
        { name: 'Ready Pickup', path: logisticsHomePath, icon: Truck },
      ]
    : quickLinks.filter((item) => canAccessPath(item.path, access) || item.path === '/');
  const searchTargets = flattenNavigation(visibleNavigation);
  const canAccessAdminPath = (path) => {
    if (isLogisticsManager) return path === '/' || isLogisticsPath(path);
    return canAccessPath(path, access);
  };
  const sidebarWidthClass = sidebarCollapsed ? 'lg:w-20' : 'lg:w-72';
  const mainOffsetClass = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72';
  const desktopCollapsedClass = sidebarCollapsed ? 'lg:hidden' : '';
  const collapsedItemClass = sidebarCollapsed ? 'lg:justify-center lg:px-2' : '';

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1A2E] dark:bg-gray-950 dark:text-white">
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-[#1A1A2E]/10 bg-white/95 shadow-sm shadow-[#1A1A2E]/5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#1A1A2E] transition hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/30 dark:text-gray-200 dark:hover:bg-gray-800 lg:hidden"
              aria-label={sidebarOpen ? 'Close admin menu' : 'Open admin menu'}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-10 w-10 items-center justify-center rounded-lg text-[#1A1A2E] transition hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/30 dark:text-gray-200 dark:hover:bg-gray-800 lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <Link to={isLogisticsManager ? logisticsHomePath : '/admin'} className="flex min-w-0 items-center gap-3" onClick={closeSidebarOnMobile}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1A1A2E] text-sm font-bold text-white shadow-sm ring-2 ring-[#1e7098]/20">
                AG
              </span>
              <span className="truncate text-lg font-bold text-[#1A1A2E] dark:text-white sm:text-xl">
                {isLogisticsManager ? 'Amiyo-Go Logistics' : 'Amiyo-Go Admin'}
              </span>
            </Link>
          </div>

          <AdminGlobalSearch
            searchTargets={searchTargets}
            canAccessPath={canAccessAdminPath}
            closeSidebarOnMobile={closeSidebarOnMobile}
            allowResourceSearch={!isLogisticsManager}
            placeholder={isLogisticsManager ? 'Search logistics pages...' : undefined}
          />

          <div className="flex items-center gap-2 sm:gap-3">
            {visibleQuickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/30 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-300 sm:inline-flex"
                  title={item.name}
                  aria-label={item.name}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
            <Link
              to="/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/30 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-[#eef8fb] hover:text-[#1a6387] focus:outline-none focus:ring-2 focus:ring-[#1e7098]/30 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-800 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef8fb] text-sm font-semibold text-[#1a6387] ring-1 ring-[#1e7098]/15 dark:bg-gray-800 dark:text-gray-200">
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
        className={`fixed bottom-0 left-0 top-16 z-20 flex w-72 flex-col overflow-x-hidden border-r border-[#0F1224] bg-[#1A1A2E] text-white shadow-xl shadow-[#1A1A2E]/20 transition-[transform,width] duration-300 dark:border-gray-950 dark:bg-[#111827] ${sidebarWidthClass} ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        aria-label="Admin navigation"
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className={`flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 ${collapsedItemClass}`}>
            <div className={`min-w-0 ${desktopCollapsedClass}`}>
              <p className="truncate text-sm font-semibold text-white">
                Admin workspace
              </p>
              <p className="truncate text-xs capitalize text-slate-300">
                {role || 'staff'} access
              </p>
            </div>
            <Bell className="h-5 w-5 shrink-0 text-[#1e7098]" />
          </div>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto px-3 py-4 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          {visibleNavigation.map((item) => {
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
                    onClick={() => handleSectionToggle(item.name)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25 ${collapsedItemClass} ${
                      sectionActive
                        ? 'bg-[#1e7098] text-white shadow-sm shadow-primary-900/20'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-expanded={expanded}
                    title={item.name}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={`min-w-0 flex-1 truncate text-left ${desktopCollapsedClass}`}>{item.name}</span>
                    <AlertBadge count={sectionAlerts} className={desktopCollapsedClass} />
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''} ${desktopCollapsedClass}`}
                    />
                  </button>

                  {expanded && (
                    <div className={`mt-1 space-y-1 border-l border-white/10 py-1 pl-4 ${desktopCollapsedClass}`}>
                      {item.children.map((child) => {
                        const childActive = isActive(child);

                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={closeSidebarOnMobile}
                            aria-current={childActive ? 'page' : undefined}
                            className={`flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25 ${
                              childActive
                                ? 'bg-white/10 font-semibold text-primary-100'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                childActive ? 'bg-[#1e7098]' : 'bg-slate-500'
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
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25 ${collapsedItemClass} ${
                  sectionActive
                    ? 'bg-[#1e7098] text-white shadow-sm shadow-primary-900/20'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
                title={item.name}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`min-w-0 flex-1 truncate ${desktopCollapsedClass}`}>{item.name}</span>
                <AlertBadge count={getAlertCount(item)} className={desktopCollapsedClass} />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            to="/"
            onClick={closeSidebarOnMobile}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1e7098]/25 ${collapsedItemClass}`}
            title="View storefront"
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className={`min-w-0 flex-1 truncate ${desktopCollapsedClass}`}>View storefront</span>
          </Link>
        </div>
      </aside>

      <main className={`min-h-screen pt-16 transition-all duration-300 ${mainOffsetClass}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
