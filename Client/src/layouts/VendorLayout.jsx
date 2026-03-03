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
      title: 'Dashboard',
      icon: '📊',
      path: '/vendor/dashboard',
    },
    {
      title: 'Products',
      icon: '📦',
      children: [
        { title: 'All Products', path: '/vendor/products' },
        { title: 'Add Product', path: '/vendor/products/add' },
        { title: 'Bulk Upload', path: '/vendor/products/bulk' },
      ],
    },
    {
      title: 'Orders',
      icon: '🛍️',
      children: [
        { title: 'All Orders', path: '/vendor/orders' },
        { title: 'Pending', path: '/vendor/orders?status=pending' },
        { title: 'Processing', path: '/vendor/orders?status=processing' },
        { title: 'Shipped', path: '/vendor/orders?status=shipped' },
      ],
    },
    {
      title: 'Finance',
      icon: '💰',
      children: [
        { title: 'Payments', path: '/vendor/finance/payments' },
        { title: 'Transactions', path: '/vendor/finance/transactions' },
        { title: 'Statements', path: '/vendor/finance/statements' },
      ],
    },
    {
      title: 'Marketing',
      icon: '📢',
      children: [
        { title: 'Promotions', path: '/vendor/marketing/promotions' },
        { title: 'Vouchers', path: '/vendor/marketing/vouchers' },
        { title: 'Campaigns', path: '/vendor/marketing/campaigns' },
      ],
    },
    {
      title: 'Reports',
      icon: '📈',
      children: [
        { title: 'Sales Report', path: '/vendor/reports/sales' },
        { title: 'Product Report', path: '/vendor/reports/products' },
        { title: 'Traffic Report', path: '/vendor/reports/traffic' },
      ],
    },
    {
      title: 'Shop',
      icon: '🏪',
      children: [
        { title: 'Shop Profile', path: '/vendor/shop/profile' },
        { title: 'Shop Decoration', path: '/vendor/shop/decoration' },
        { title: 'Categories', path: '/vendor/shop/categories' },
      ],
    },
    {
      title: 'Customer Service',
      icon: '💬',
      children: [
        { title: 'Messages', path: '/vendor/messages' },
        { title: 'Reviews', path: '/vendor/reviews' },
        { title: 'Q&A', path: '/vendor/qa' },
      ],
    },
    {
      title: 'Settings',
      icon: '⚙️',
      path: '/vendor/settings',
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
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Help */}
            <button className="p-2 hover:bg-gray-100 rounded-lg">
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
                      className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
                            className={`block px-3 py-2 text-sm rounded-lg ${
                              isActive(child.path)
                                ? 'bg-orange-50 text-orange-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      isActive(item.path)
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.title}</span>
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
