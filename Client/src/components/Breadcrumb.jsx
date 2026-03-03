import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Breadcrumb({ customItems = [] }) {
  const { t } = useTranslation();
  const location = useLocation();

  // If custom items are provided, use them
  if (customItems.length > 0) {
    return (
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-gray-700 transition-colors">
          {t("breadcrumb.home", "Home")}
        </Link>
        {customItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
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
                d="M9 5l7 7-7 7"
              />
            </svg>
            {item.href ? (
              <Link
                to={item.href}
                className="hover:text-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-700 font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Auto-generate breadcrumbs from URL path
  const pathnames = location.pathname.split("/").filter((x) => x);

  const breadcrumbMap = {
    products: t("breadcrumb.products", "Products"),
    categories: t("breadcrumb.categories", "Categories"),
    category: t("breadcrumb.category", "Category"),
    cart: t("breadcrumb.cart", "Shopping Cart"),
    checkout: t("breadcrumb.checkout", "Checkout"),
    orders: t("breadcrumb.orders", "My Orders"),
    wishlist: t("breadcrumb.wishlist", "Wishlist"),
    profile: t("breadcrumb.profile", "Profile"),
    support: t("breadcrumb.support", "Support"),
    about: t("breadcrumb.about", "About"),
    contact: t("breadcrumb.contact", "Contact"),
    "flash-sales": t("breadcrumb.flashSales", "Flash Sales"),
    compare: t("breadcrumb.compare", "Compare Products"),
    search: t("breadcrumb.search", "Search Results"),
    admin: t("breadcrumb.admin", "Admin Dashboard"),
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
      <Link
        to="/"
        className="hover:text-gray-700 transition-colors flex items-center gap-1"
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
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        {t("breadcrumb.home", "Home")}
      </Link>

      {pathnames.map((pathname, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label =
          breadcrumbMap[pathname] ||
          pathname.charAt(0).toUpperCase() + pathname.slice(1);

        return (
          <div key={pathname} className="flex items-center space-x-2">
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
                d="M9 5l7 7-7 7"
              />
            </svg>
            {isLast ? (
              <span className="text-gray-700 font-medium">{label}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-gray-700 transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
