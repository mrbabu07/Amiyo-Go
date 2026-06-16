import { useState, useEffect, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Coins, Menu, Search, X } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useCart from "../hooks/useCart";
import useWishlist from "../hooks/useWishlist";
import { useComparison } from "../context/ComparisonContext";
import { usePlatformConfig } from "../context/PlatformConfigContext";
import { getCategories, getMyLoyalty, getSearchNavigation } from "../services/api";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchBar from "./SearchBar";
import AppLogo from "./AppLogo";
import { LOYALTY_BALANCE_EVENT, getLoyaltyPointsFromPayload } from "../utils/loyaltyBalance";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { compareCount } = useComparison();
  const { isFeatureEnabled, isShopDirectoryVisible } = usePlatformConfig();
  const navigate = useNavigate();
  const loyaltyUserKey = user?.uid || user?.email || "";
  const coinRewardsEnabled = isFeatureEnabled("loyaltyCoins");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState({ userKey: "", points: null });
  const loyaltyPoints =
    coinRewardsEnabled && loyaltyUserKey && loyaltyBalance.userKey === loyaltyUserKey
      ? loyaltyBalance.points
      : null;
  const loyaltyPointsLabel =
    loyaltyPoints === null ? "..." : Number(loyaltyPoints || 0).toLocaleString();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getSearchNavigation();
        setCategories(response.data.data?.categories || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        try {
          const fallback = await getCategories();
          setCategories(fallback.data.data || []);
        } catch (fallbackError) {
          console.error("Failed to fetch fallback categories:", fallbackError);
        }
      }
    };

    fetchCategories();

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!loyaltyUserKey || !coinRewardsEnabled) return;

    let cancelled = false;
    const loadLoyaltyPoints = async ({ silent = true } = {}) => {
      try {
        const response = await getMyLoyalty();
        const nextPoints = getLoyaltyPointsFromPayload(response);
        if (!cancelled) {
          setLoyaltyBalance({ userKey: loyaltyUserKey, points: nextPoints ?? 0 });
        }
      } catch (error) {
        if (!silent) {
          console.error("Failed to fetch loyalty points:", error);
        }
      }
    };

    const handleBalanceChanged = (event) => {
      const nextPoints = getLoyaltyPointsFromPayload(event.detail);
      if (nextPoints !== null) {
        setLoyaltyBalance({ userKey: loyaltyUserKey, points: nextPoints });
        return;
      }
      loadLoyaltyPoints();
    };

    const handleFocus = () => loadLoyaltyPoints();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadLoyaltyPoints();
    };

    loadLoyaltyPoints({ silent: false });
    window.addEventListener(LOYALTY_BALANCE_EVENT, handleBalanceChanged);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const refreshTimer = window.setInterval(loadLoyaltyPoints, 60000);

    return () => {
      cancelled = true;
      window.removeEventListener(LOYALTY_BALANCE_EVENT, handleBalanceChanged);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(refreshTimer);
    };
  }, [loyaltyUserKey, coinRewardsEnabled]);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const universityLabel = i18n.resolvedLanguage?.startsWith("bn")
    ? "ইউনিভার্সিটি"
    : t("navbar.university", "University");

  const navLinks = [
    { name: t("navbar.home"), path: "/" },
    { name: t("navbar.products"), path: "/products" },
    ...(isShopDirectoryVisible ? [{ name: "Shops", path: "/shops" }] : []),
    { name: t("navbar.flashSales"), path: "/flash-sales" },
    { name: universityLabel, path: "/university" },
  ];

  const categoryGroups = useMemo(() => {
    const activeCategories = categories.filter((category) => category.isActive !== false);
    if (activeCategories.some((category) => Array.isArray(category.children))) {
      return activeCategories.map((root) => ({
        ...root,
        children: root.children || [],
        grandchildrenByChild: (root.children || []).reduce(
          (acc, child) => ({
            ...acc,
            [child._id.toString()]: child.children || [],
          }),
          {},
        ),
      }));
    }
    const byParent = activeCategories.reduce((acc, category) => {
      const parentKey = category.parentId ? category.parentId.toString() : "root";
      acc[parentKey] = [...(acc[parentKey] || []), category];
      return acc;
    }, {});

    Object.values(byParent).forEach((items) =>
      items.sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0) ||
          a.name.localeCompare(b.name),
      ),
    );

    return (byParent.root || []).map((root) => ({
      ...root,
      children: byParent[root._id.toString()] || [],
      grandchildrenByChild: (byParent[root._id.toString()] || []).reduce(
        (acc, child) => ({
          ...acc,
          [child._id.toString()]: byParent[child._id.toString()] || [],
        }),
        {},
      ),
    }));
  }, [categories]);

  const activeCategory =
    categoryGroups.find((category) => category._id === activeCategoryId) || categoryGroups[0];

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={`isolate bg-white dark:bg-gray-900 sticky top-0 z-[200] border-b border-gray-200 dark:border-gray-700 transition-shadow duration-300 ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3 lg:h-20">
            {/* Logo */}
            <Link
              to="/"
              className="group min-w-0 shrink-0"
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileMenuOpen(false);
              }}
              aria-label="Amiyo-Go home"
            >
              <AppLogo
                size="md"
                className="transition-transform duration-200 group-hover:scale-[1.02]"
                textClassName="max-[340px]:hidden"
              />
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <SearchBar
                placeholder={t("navbar.search_placeholder")}
                onSearch={handleSearch}
                className="w-full h-12 px-6 pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#1e7098] transition-colors text-sm"
                showSuggestions={true}
              />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 lg:space-x-4">
              {/* Action Icons - Desktop */}
              <div className="hidden lg:flex items-center space-x-2">
                <LanguageSwitcher compact />

                {/* Theme Toggle */}
                <ThemeToggle />

                {user && coinRewardsEnabled && (
                  <Link
                    to="/loyalty"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 text-sm font-semibold text-yellow-800 transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                    title="Coins balance"
                  >
                    <Coins className="h-4 w-4" aria-hidden="true" />
                    <span>{loyaltyPointsLabel}</span>
                  </Link>
                )}

                {/* Notifications */}
                {user && <NotificationBell />}

                {/* Cart */}
                <Link
                  to="/cart"
                  className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Shopping Cart"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
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
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#1e7098] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Link>

                {/* Wishlist */}
                {user && (
                  <Link
                    to="/wishlist"
                    className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Wishlist"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600 dark:text-gray-400"
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
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#1e7098] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {wishlistCount > 9 ? "9+" : wishlistCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User Menu */}
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-[#1e7098] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {user.displayName || user.email?.split("@")[0]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>

                        <div className="py-2">
                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t("navbar.my_profile")}
                            </span>
                          </Link>

                          <Link
                            to="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-gray-400"
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
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t("navbar.my_orders")}
                            </span>
                          </Link>

                          <Link
                            to="/university"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {universityLabel}
                            </span>
                          </Link>

                          <Link
                            to="/my-alerts"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                              />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t("navbar.my_alerts")}
                            </span>
                          </Link>

                          {coinRewardsEnabled && (
                            <Link
                              to="/loyalty"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t("navbar.loyalty_rewards")}
                              </span>
                            </Link>
                          )}

                          <Link
                            to="/vendor/register"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t("navbar.become_seller")}
                            </span>
                          </Link>

                          <Link
                            to="/vendor/dashboard"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            <span className="text-sm text-blue-600 font-medium">
                              {t("navbar.seller_dashboard")}
                            </span>
                          </Link>

                          {isAdmin && (
                            <>
                              <Link
                                to="/admin"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg
                                  className="w-5 h-5 text-[#1e7098]"
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
                                <span className="text-sm text-[#1e7098] font-medium">
                                  {t("navbar.admin_dashboard")}
                                </span>
                              </Link>
                              <Link
                                to="/admin/vendors"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg
                                  className="w-5 h-5 text-[#1e7098]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                  />
                                </svg>
                                <span className="text-sm text-[#1e7098] font-medium">
                                  {t("navbar.manage_vendors")}
                                </span>
                              </Link>
                              <Link
                                to="/admin/payouts"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg
                                  className="w-5 h-5 text-[#1e7098]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                                <span className="text-sm text-[#1e7098] font-medium">
                                  {t("navbar.vendor_payouts")}
                                </span>
                              </Link>
                              <Link
                                to="/admin/chats"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg
                                  className="w-5 h-5 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                <span className="text-sm text-green-600 font-medium">
                                  {t("navbar.vendor_messages")}
                                </span>
                              </Link>
                              <Link
                                to="/admin/category-requests"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <svg
                                  className="w-5 h-5 text-[#1e7098]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                  />
                                </svg>
                                <span className="text-sm text-[#1e7098] font-medium">
                                  {t("navbar.category_requests")}
                                </span>
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                          <button
                            onClick={() => {
                              logout();
                              setUserMenuOpen(false);
                            }}
                            className="flex items-center space-x-3 w-full px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-red-500"
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
                            <span className="text-sm text-red-600 dark:text-red-400">
                              {t("navbar.sign_out")}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-4 py-2 bg-[#1e7098] text-white text-sm font-medium rounded-md hover:bg-[#1a5f7f] transition-colors"
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>{t("navbar.sign_in")}</span>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-1.5 lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen((current) => !current);
                    setMobileMenuOpen(false);
                    setCategoriesOpen(false);
                    setUserMenuOpen(false);
                  }}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                    mobileSearchOpen
                      ? "border-[#1e7098]/35 bg-[#1e7098] text-white shadow-sm"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#1e7098]/30 hover:bg-[#1e7098]/10 hover:text-[#1e7098] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-[#1e7098]/40"
                  }`}
                  aria-expanded={mobileSearchOpen}
                  aria-label={mobileSearchOpen ? "Close search" : "Open search"}
                >
                  {mobileSearchOpen ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Search className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>

                {user && <NotificationBell />}
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen((current) => !current);
                  setMobileSearchOpen(false);
                }}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden ${
                  mobileMenuOpen
                    ? "border-[#1e7098]/35 bg-[#1e7098] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#1e7098]/30 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="lg:hidden pb-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">
                    Search Amiyo-Go
                  </p>
                  <button
                    type="button"
                    onClick={() => setMobileSearchOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <SearchBar
                  placeholder={t("navbar.search_mobile_placeholder")}
                  onSearch={handleSearch}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 pr-24 text-sm font-semibold text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1e7098] focus:bg-white dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#1e7098]"
                  showSuggestions={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Secondary Navigation Bar */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">
              {/* Categories & Navigation Links */}
              <div className="flex items-center space-x-6">
                {/* Categories Dropdown */}
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => setCategoriesOpen(!categoriesOpen)}
                    aria-expanded={categoriesOpen}
                    className={`flex h-9 items-center space-x-2 rounded-lg border px-3 text-sm font-black transition-colors ${
                      categoriesOpen
                        ? "border-[#1e7098]/40 bg-[#1e7098]/10 text-[#1e7098] dark:bg-[#1e7098]/15"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#1e7098]/30 hover:bg-[#1e7098]/5 hover:text-[#1e7098] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-[#1e7098]"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    <span>{t("home.shopByCategory", "Shop by Category")}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        categoriesOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {categoriesOpen && (
                    <>
                    <button
                      type="button"
                      aria-label="Close categories menu"
                      onClick={() => setCategoriesOpen(false)}
                      className="fixed inset-0 z-[250] cursor-default bg-black/15"
                    />
                    <div className="absolute top-full left-0 z-[300] mt-2 w-[min(960px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800">
                      {categoryGroups.length > 0 ? (
                        <div className="grid max-h-[calc(100vh-11rem)] min-h-[420px] grid-cols-[270px_1fr] overflow-hidden">
                          <div className="border-r border-gray-200 bg-gray-50 py-3 dark:border-gray-700 dark:bg-gray-900">
                            <Link
                              to="/categories"
                              onClick={() => setCategoriesOpen(false)}
                              className="mx-3 mb-2 flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold text-[#1e7098] hover:bg-white dark:hover:bg-gray-800"
                            >
                              <span>{t("home.viewAllCategories", "All Categories")}</span>
                              <span>&gt;</span>
                            </Link>
                            <div className="max-h-[calc(100vh-15rem)] overflow-y-auto">
                            {categoryGroups.map((root) => (
                              <button
                                key={root._id}
                                type="button"
                                onMouseEnter={() => setActiveCategoryId(root._id)}
                                onFocus={() => setActiveCategoryId(root._id)}
                                onClick={() => setActiveCategoryId(root._id)}
                                className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold transition ${
                                  activeCategory?._id === root._id
                                    ? "bg-white text-[#1e7098] shadow-sm dark:bg-gray-800"
                                    : "text-gray-700 hover:bg-white hover:text-[#1e7098] dark:text-gray-300 dark:hover:bg-gray-800"
                                }`}
                              >
                                <span className="line-clamp-1">{root.name}</span>
                                <span className="text-lg leading-none">&gt;</span>
                              </button>
                            ))}
                            </div>
                          </div>

                          <div className="overflow-y-auto p-6">
                            {activeCategory && (
                              <>
                                <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
                                  <div>
                                    <Link
                                      to={`/products?category=${activeCategory._id}`}
                                      onClick={() => setCategoriesOpen(false)}
                                      className="text-xl font-black text-gray-900 hover:text-[#1e7098] dark:text-white"
                                    >
                                      {activeCategory.name}
                                    </Link>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                      {activeCategory.description || "Browse sections and product types"}
                                    </p>
                                  </div>
                                  <Link
                                    to={`/products?category=${activeCategory._id}`}
                                    onClick={() => setCategoriesOpen(false)}
                                    className="rounded-md border border-[#1e7098]/30 px-3 py-2 text-xs font-bold text-[#1e7098] hover:bg-[#1e7098] hover:text-white"
                                  >
                                    Shop all
                                  </Link>
                                </div>

                                <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                                  {(activeCategory.children.length > 0 ? activeCategory.children : [activeCategory]).map((section) => (
                                    <div key={section._id} className="min-w-0">
                                      <Link
                                        to={`/products?category=${section._id}`}
                                        onClick={() => setCategoriesOpen(false)}
                                        className="line-clamp-2 text-sm font-bold text-gray-900 hover:text-[#1e7098] dark:text-white"
                                      >
                                        {section.name}
                                      </Link>
                                      <div className="mt-3 space-y-2">
                                        {(activeCategory.grandchildrenByChild[section._id.toString()] || []).slice(0, 8).map((leaf) => (
                                          <Link
                                            key={leaf._id}
                                            to={`/products?category=${leaf._id}`}
                                            onClick={() => setCategoriesOpen(false)}
                                            className="block truncate text-sm text-gray-500 hover:text-[#1e7098] dark:text-gray-400"
                                          >
                                            {leaf.name}
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {(activeCategory.featuredBrands?.length > 0 || activeCategory.banner) && (
                                  <div className="mt-6 grid gap-4 border-t border-gray-100 pt-5 dark:border-gray-700 lg:grid-cols-[1fr_280px]">
                                    <div>
                                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Featured brands
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {(activeCategory.featuredBrands || []).slice(0, 8).map((brand) => (
                                          <Link
                                            key={brand.name}
                                            to={`/products?category=${activeCategory._id}&brands=${encodeURIComponent(brand.name)}`}
                                            onClick={() => setCategoriesOpen(false)}
                                            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-[#1e7098]/40 hover:text-[#1e7098] dark:border-gray-700 dark:text-gray-200"
                                          >
                                            {brand.name}
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                    {activeCategory.banner && (
                                      <Link
                                        to={activeCategory.banner.link || `/products?category=${activeCategory._id}`}
                                        onClick={() => setCategoriesOpen(false)}
                                        className="relative min-h-28 overflow-hidden rounded-lg bg-gray-900"
                                      >
                                        {activeCategory.banner.imageUrl && (
                                          <img
                                            src={activeCategory.banner.imageUrl}
                                            alt=""
                                            className="absolute inset-0 h-full w-full object-cover opacity-75"
                                            loading="lazy"
                                          />
                                        )}
                                        <div className="absolute inset-0 bg-black/35" />
                                        <div className="relative p-4">
                                          <p className="text-sm font-black text-white">
                                            {activeCategory.banner.title}
                                          </p>
                                          <p className="mt-1 line-clamp-2 text-xs text-white/85">
                                            {activeCategory.banner.subtitle || "Explore current marketplace picks"}
                                          </p>
                                        </div>
                                      </Link>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          {t("navbar.no_categories")}
                        </div>
                      )}
                    </div>
                    </>
                  )}
                </div>

                {/* Navigation Links */}
                <div className="hidden lg:flex items-center space-x-6">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        `text-sm font-medium transition-colors ${
                          isActive
                            ? "text-[#1e7098]"
                            : "text-gray-700 dark:text-gray-300 hover:text-[#1e7098] dark:hover:text-[#1e7098]"
                        }`
                      }
                    >
                      {link.name}
                    </NavLink>
                  ))}

                  {/* Compare Link */}
                  <Link
                    to="/compare"
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#1e7098] dark:hover:text-[#1e7098] transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span>Compare</span>
                    {compareCount > 0 && (
                      <span className="bg-[#1e7098] text-white text-xs px-1.5 py-0.5 rounded-full">
                        {compareCount}
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              {/* Contact Info */}
              <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
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
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">
                  +880 1521-721946
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="space-y-1 px-4">
              {/* Mobile Action Icons */}
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <LanguageSwitcher />

                <Link
                  to="/cart"
                  className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
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
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#1e7098] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {user && (
                  <Link
                    to="/wishlist"
                    className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600 dark:text-gray-400"
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
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#1e7098] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                )}

                {user && coinRewardsEnabled && (
                  <Link
                    to="/loyalty"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                  >
                    <Coins className="h-4 w-4" aria-hidden="true" />
                    <span>{loyaltyPointsLabel}</span>
                  </Link>
                )}

                <Link
                  to="/compare"
                  className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  {compareCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#1e7098] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {compareCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Navigation Links */}
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#1e7098]/10 text-[#1e7098]"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}

              {/* Mobile Categories */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  aria-expanded={categoriesOpen}
                  onClick={() => setCategoriesOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-black text-gray-900 transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                >
                  <span>{t("home.shopByCategory", "Shop by Category")}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {categoriesOpen ? (
                  <div className="mt-2 space-y-3">
                    <Link
                      to="/categories"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setCategoriesOpen(false);
                      }}
                      className="block rounded-lg bg-[#1e7098]/10 px-4 py-3 text-sm font-black text-[#1e7098]"
                    >
                      {t("home.viewAllCategories", "All Categories")}
                    </Link>
                    {categoryGroups.map((root) => (
                      <div key={root._id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <Link
                          to={`/products?category=${root._id}`}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setCategoriesOpen(false);
                          }}
                          className="block text-sm font-bold text-gray-900 hover:text-[#1e7098] dark:text-white"
                        >
                          {root.name}
                        </Link>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {root.children.slice(0, 6).map((section) => (
                            <Link
                              key={section._id}
                              to={`/products?category=${section._id}`}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setCategoriesOpen(false);
                              }}
                              className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:text-[#1e7098] dark:bg-gray-900 dark:text-gray-300"
                            >
                              {section.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Mobile User Menu */}
              {user && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t("navbar.my_profile")}
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t("navbar.my_orders")}
                  </Link>
                  <Link
                    to="/university"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {universityLabel}
                  </Link>
                  <Link
                    to="/vendor/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t("navbar.become_seller")}
                  </Link>
                  <Link
                    to="/vendor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t("navbar.seller_dashboard")}
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-[#1e7098] hover:bg-[#1e7098]/10 rounded-lg transition-colors"
                    >
                      {t("navbar.admin_dashboard")}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {t("navbar.sign_out")}
                  </button>
                </div>
              )}

              {!user && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 bg-[#1e7098] text-white text-center text-sm font-medium rounded-lg hover:bg-[#1a5f7f] transition-colors"
                  >
                    {t("navbar.sign_in")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Close dropdowns when clicking outside */}
      {(categoriesOpen || userMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setCategoriesOpen(false);
            setUserMenuOpen(false);
          }}
        />
      )}
    </>
  );
}
