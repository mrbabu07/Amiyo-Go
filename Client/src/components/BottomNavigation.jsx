import { createElement } from "react";
import { Home, LayoutGrid, Package, ShoppingCart, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import useCart from "../hooks/useCart";

const baseItemClass =
  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10.5px] font-extrabold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function BottomNavigation() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cartCount } = useCart();

  const accountPath = user ? "/profile" : "/login";
  const items = [
    { label: t("mobileNav.home"), to: "/", icon: Home, end: true },
    { label: t("mobileNav.categories"), to: "/categories", icon: LayoutGrid },
    { label: t("mobileNav.cart"), to: "/cart", icon: ShoppingCart, badge: cartCount },
    { label: t("mobileNav.orders"), to: "/orders", icon: Package },
    { label: t("mobileNav.account"), to: accountPath, icon: UserRound },
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-auto z-[210] px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] lg:hidden"
      aria-label="Mobile primary navigation"
      role="navigation"
      style={{ bottom: 0, left: 0, position: "fixed", right: 0, top: "auto" }}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 rounded-2xl border border-white/80 bg-white/95 px-1.5 shadow-[0_-10px_34px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/95">
        {items.map(({ label, to, icon: Icon, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${baseItemClass} ${
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-950/60 dark:text-primary-200"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <span className="relative grid h-6 w-8 place-items-center">
              {createElement(Icon, {
                className: "h-5 w-5",
                strokeWidth: 2.2,
                "aria-hidden": true,
              })}
              {badge > 0 ? (
                <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-extrabold leading-none text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </span>
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
