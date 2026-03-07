import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const VendorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    {
      title: 'Home',
      icon: '🏠',
      path: '/',
      description: 'Visit main site',
    },
    {
      title: 'Dashboard',
      icon: '📊',
      path: '/vendor/dashboard',
      description: 'Overview & stats',
    },
    {
      title: 'Products',
      icon: '📦',
      children: [
        { title: 'All Products', path: '/vendor/products', icon: '📋' },
        { title: 'Add Product', path: '/vendor/products/add', icon: '➕' },
        { title: 'Bulk Upload', path: '/vendor/products/bulk', icon: '📤' },
      ],
    },
    {
      title: 'Orders',
      icon: '🛍️',
      badge: 'new',
      children: [
        { title: 'All Orders', path: '/vendor/orders', icon: '📋' },
        { title: 'Pending', path: '/vendor/orders?status=pending', icon: '⏳' },
        { title: 'Processing', path: '/vendor/orders?status=processing', icon: '🔄' },
        { title: 'Shipped', path: '/vendor/orders?status=shipped', icon: '📦' },
        { title: 'Delivered', path: '/vendor/orders?status=delivered', icon: '✅' },
      ],
    },
    {
      title: 'Finance',
      icon: '💰',
      children: [
        { title: 'Overview', path: '/vendor/finance', icon: '💵' },
        { title: 'Payouts', path: '/vendor/finance/payouts', icon: '📋' },
        { title: 'Transactions', path: '/vendor/finance/transactions', icon: '📊' },
      ],
    },
    {
      title: 'Marketing',
      icon: '📢',
      children: [
        { title: 'Promotions', path: '/vendor/marketing/promotions', icon: '🎯' },
        { title: 'Vouchers', path: '/vendor/marketing/vouchers', icon: '🎟️' },
        { title: 'Campaigns', path: '/vendor/marketing/campaigns', icon: '📣' },
      ],
    },
    {
      title: 'Reports',
      icon: '📈',
      children: [
        { title: 'Sales Report', path: '/vendor/reports/sales', icon: '💹' },
        { title: 'Product Report', path: '/vendor/reports/products', icon: '📊' },
        { title: 'Traffic Report', path: '/vendor/reports/traffic', icon: '👥' },
      ],
    },
    {
      title: 'Shop',
      icon: '🏪',
      children: [
        { title: 'Shop Profile', path: '/vendor/shop/profile', icon: '🏷️' },
        { title: 'Shop Decoration', path: '/vendor/shop/decoration', icon: '🎨' },
        { title: 'Categories', path: '/vendor/shop/categories', icon: '📂' },
        { title: 'Request Category', path: '/vendor/category-requests', icon: '➕' },
      ],
    },
    {
      title: 'Customer Service',
      icon: '💬',
      children: [
        { title: 'Messages', path: '/vendor/messages', icon: '✉️' },
        { title: 'Reviews', path: '/vendor/reviews', icon: '⭐' },
        { title: 'Returns', path: '/vendor/returns', icon: '↩️' },
        { title: 'Q&A', path: '/vendor/qa', icon: '❓' },
      ],
    },
    {
      title: 'Support Chat',
      icon: '💬',
      path: '/vendor/support-chat',
      description: 'Chat with Admin',
      highlight: true,
    },
    {
      title: 'Settings',
      icon: '⚙️',
      path: '/vendor/settings',
      description: 'Account settings',
    },
  ];

  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (title) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/vendor/dashboard" className="text-xl font-bold text-orange-600">
              BazarBD Seller Center
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Home Button */}
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
              title="Visit Main Site"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden md:inline">Home</span>
            </Link>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Help */}
            <button className="p-2 hover:bg-gray-100 rounded-lg" title="Help Center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-2 pl-4 border-l">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-20 overflow-y-auto ${
            sidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => (
              <div key={item.title}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedMenus[item.title] ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedMenus[item.title] && (
                      <div className="ml-9 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
                              isActive(child.path)
                                ? 'bg-orange-50 text-orange-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {child.icon && <span>{child.icon}</span>}
                            <span>{child.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                      item.highlight
                        ? isActive(item.path)
                          ? 'bg-green-600 text-white font-medium shadow-lg'
                          : 'bg-green-500 text-white hover:bg-green-600 font-medium shadow-md'
                        : isActive(item.path)
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={item.description}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
