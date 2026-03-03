import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import NotificationSettings from "../components/NotificationSettings";

export default function Profile() {
  const { user, isAdmin, logout } = useAuth();

  const quickLinks = [
    {
      to: "/orders",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      title: "My Orders",
      description: "View and track your orders",
      color: "bg-blue-500",
    },
    {
      to: "/addresses",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      title: "My Addresses",
      description: "Manage delivery addresses",
      color: "bg-purple-500",
    },
    {
      to: "/returns",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      ),
      title: "Returns & Refunds",
      description: "Track return requests",
      color: "bg-orange-500",
    },
    {
      to: "/cart",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      title: "Shopping Cart",
      description: "View items in your cart",
      color: "bg-green-500",
    },
    {
      to: "/wishlist",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      title: "Wishlist",
      description: "Your saved items",
      color: "bg-pink-500",
    },
    {
      to: "/",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      title: "Continue Shopping",
      description: "Browse our products",
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors"
            title="Back to Home"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-gray-600 font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600" />

          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center text-4xl font-bold text-primary-500 border-4 border-white">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user?.displayName || "User"}
                  </h1>
                  {isAdmin && (
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-semibold rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Admin Dashboard Link */}
        {isAdmin && (
          <Link
            to="/admin"
            className="block mb-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-sm p-6 text-white hover:shadow-lg transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Admin Dashboard</h3>
                  <p className="text-white/80">
                    Manage products, orders, and categories
                  </p>
                </div>
              </div>
              <svg
                className="w-6 h-6 group-hover:translate-x-1 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition group"
            >
              <div
                className={`w-14 h-14 ${link.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition`}
              >
                {link.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{link.title}</h3>
              <p className="text-sm text-gray-600">{link.description}</p>
            </Link>
          ))}
        </div>

        {/* Notification Settings */}
        <div className="mb-8">
          <NotificationSettings />
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="text-sm text-gray-500">Account Type</p>
                <p className="font-medium text-gray-900">
                  {isAdmin ? "Administrator" : "Customer"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium text-gray-900">
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
