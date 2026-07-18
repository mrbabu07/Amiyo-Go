import {
  Bell,
  BookOpen,
  ChevronRight,
  Coins,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

function MenuLink({ icon: Icon, label, to, onClose, tone = "default" }) {
  const toneClasses =
    tone === "workspace"
      ? "text-[#176a91] dark:text-sky-300"
      : "text-gray-700 dark:text-gray-200";

  return (
    <Link
      to={to}
      onClick={onClose}
      role="menuitem"
      className={`group flex min-h-10 items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e7098]/40 dark:hover:bg-gray-800 ${toneClasses}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 transition-colors group-hover:bg-white group-hover:text-[#1e7098] dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700 dark:group-hover:text-sky-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function AccountDropdown({
  user,
  dbUser,
  role,
  isAdmin,
  vendorProfile,
  coinRewardsEnabled,
  universityLabel,
  t,
  onClose,
  onLogout,
}) {
  const isSeller = Boolean(vendorProfile) || ["vendor", "vendor_staff"].includes(role);
  const displayName =
    user?.displayName || dbUser?.name || dbUser?.displayName || user?.email?.split("@")[0];
  const initial = displayName?.charAt(0)?.toUpperCase() || "A";
  const roleLabel = isAdmin
    ? "Administrator"
    : isSeller
      ? vendorProfile?.shopName || "Seller account"
      : "Customer account";

  const accountLinks = [
    { label: t("navbar.my_profile"), to: "/profile", icon: UserRound },
    { label: t("navbar.my_orders"), to: "/orders", icon: Package },
    { label: universityLabel, to: "/university", icon: BookOpen },
    { label: t("navbar.my_alerts"), to: "/my-alerts", icon: Bell },
    ...(coinRewardsEnabled
      ? [{ label: t("navbar.loyalty_rewards"), to: "/loyalty", icon: Coins }]
      : []),
  ];

  const workspaceLink = isAdmin
    ? {
        label: t("navbar.admin_dashboard"),
        to: "/admin",
        icon: LayoutDashboard,
      }
    : isSeller
      ? {
          label: t("navbar.seller_dashboard"),
          to: "/vendor/dashboard",
          icon: Store,
        }
      : {
          label: t("navbar.become_seller"),
          to: "/vendor/register",
          icon: Store,
        };

  return (
    <div
      role="menu"
      aria-label="Account menu"
      className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e7098] text-sm font-bold text-white shadow-sm">
            {initial}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#1e7098]/15 bg-[#1e7098]/5 px-2 py-1 text-[11px] font-semibold text-[#176a91] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
          {isAdmin ? (
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {roleLabel}
        </div>
      </div>

      <div className="max-h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain px-2 py-2">
        <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase text-gray-400 dark:text-gray-500">
          Account
        </p>
        {accountLinks.map((item) => (
          <MenuLink key={item.to} {...item} onClose={onClose} />
        ))}

        <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
        <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase text-gray-400 dark:text-gray-500">
          {isAdmin || isSeller ? "Workspace" : "Selling"}
        </p>
        <MenuLink {...workspaceLink} onClose={onClose} tone="workspace" />
      </div>

      <div className="border-t border-gray-100 p-2 dark:border-gray-800">
        <button
          type="button"
          role="menuitem"
          onClick={onLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </span>
          {t("navbar.sign_out")}
        </button>
      </div>
    </div>
  );
}
