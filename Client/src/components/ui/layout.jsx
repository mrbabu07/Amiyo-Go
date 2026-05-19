import { Link, Navigate, useLocation } from "react-router-dom";
import { AlertCircle, Ban, Clock3, Store } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { getVendorGateStatus } from "../../utils/vendorSellerCenter";
import { Badge, Spinner } from "./foundation";
import { cn } from "./utils";

export function PageShell({
  sidebar,
  topbar,
  children,
  className = "",
  contentClassName = "",
}) {
  return (
    <div className={cn("min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100", className)}>
      {topbar ? <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">{topbar}</div> : null}
      <div className="flex min-h-[calc(100vh-1px)]">
        {sidebar ? <aside className="hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">{sidebar}</aside> : null}
        <main className={cn("min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb = [],
  actions,
  badge,
  className = "",
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumb.length ? (
          <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            {breadcrumb.map((item, index) => (
              <span key={item.href || item.label} className="inline-flex items-center gap-2">
                {item.href ? <Link to={item.href} className="hover:text-primary-700">{item.label}</Link> : <span>{item.label}</span>}
                {index < breadcrumb.length - 1 ? <span>/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
          {badge ? <Badge status={badge.status} variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
      {(title || subtitle || action) ? (
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-extrabold text-slate-950 dark:text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SplitLayout({ main, aside, className = "" }) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start", className)}>
      <div className="min-w-0">{main}</div>
      <aside className="min-w-0 lg:sticky lg:top-24">{aside}</aside>
    </div>
  );
}

export function FullscreenLoader({ label = "Loading Amiyo-Go" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary-600 text-xl font-extrabold text-white shadow-lg">
          AG
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
          <Spinner />
          {label}
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children, roles, fallback = "/login" }) {
  const location = useLocation();
  const { user, loading, role, isAdminStaff } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) {
    return <Navigate to={fallback} state={{ intendedUrl: `${location.pathname}${location.search}` }} replace />;
  }

  if (roles?.length && !roles.includes(role) && !isAdminStaff) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const vendorStatusCopy = {
  missing: {
    icon: Store,
    title: "Vendor profile required",
    message: "Create or complete your vendor profile before opening the seller center.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    primaryLabel: "Register as vendor",
    primaryPath: "/vendor/register",
  },
  pending: {
    icon: Clock3,
    title: "Vendor application pending",
    message: "Your shop application is under review. You will get dashboard access after approval.",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  rejected: {
    icon: AlertCircle,
    title: "Vendor application rejected",
    message: "Review the rejection reason and contact support before submitting updated documents.",
    tone: "border-red-200 bg-red-50 text-red-700",
  },
  role_pending: {
    icon: Clock3,
    title: "Vendor role is syncing",
    message: "Your shop is approved, but your user role has not finished syncing yet. Try refreshing or contact support.",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  suspended: {
    icon: Ban,
    title: "Vendor account suspended",
    message: "Your vendor tools are paused. Contact support to resolve the account status.",
    tone: "border-red-200 bg-red-50 text-red-700",
  },
  missing_kyc: {
    icon: AlertCircle,
    title: "KYC documents required",
    message: "Upload or resubmit your NID, trade license, and payout ownership documents to unlock seller operations.",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    primaryLabel: "Open KYC page",
    primaryPath: "/vendor/kyc",
  },
  kyc_pending: {
    icon: Clock3,
    title: "KYC review pending",
    message: "Your documents are under review. You can track status or add updated documents from the KYC page.",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    primaryLabel: "Track KYC",
    primaryPath: "/vendor/kyc",
  },
};

export function VendorStatusScreen({ status = "pending" }) {
  const config = vendorStatusCopy[status] || {
    icon: Store,
    title: "Vendor profile required",
    message: "Create or complete your vendor profile to continue.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    primaryLabel: "Go to Store",
    primaryPath: "/",
  };
  const Icon = config.icon;
  const primaryLabel = config.primaryLabel || "Go to Store";
  const primaryPath = config.primaryPath || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className={cn("mb-5 inline-flex rounded-full border p-3", config.tone)}>
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">{config.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{config.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={primaryPath}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary-600 bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            {primaryLabel}
          </Link>
          <Link
            to="/support"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
}

export function VendorStatusGuard({ children }) {
  const location = useLocation();
  const { user, loading, role, isAdmin, vendorProfile, vendorStatus } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const gateStatus = getVendorGateStatus({
    vendorProfile,
    role,
    isAdmin,
    vendorStatus,
  });
  const selfServiceAllowed = ["/vendor/kyc", "/vendor/settings", "/vendor/support-chat"].some((path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  if (gateStatus === "active") return children;
  if (["missing_kyc", "kyc_pending"].includes(gateStatus) && selfServiceAllowed) return children;

  return <VendorStatusScreen status={gateStatus} />;
}

function hasPermission(permissions = {}, resource, action) {
  if (!resource || !action) return true;
  if (action === "delete") return false;
  if (resource === "system" && action !== "read") return false;
  if (permissions.all === true || permissions["*"] === true) return true;
  const resourcePermission = permissions[resource];
  if (resourcePermission === true) return true;
  if (Array.isArray(resourcePermission)) return resourcePermission.includes(action) || resourcePermission.includes("*");
  if (typeof resourcePermission === "object") return Boolean(resourcePermission[action] || resourcePermission["*"]);
  return false;
}

export function RBACGuard({ children, resource, action, fallback }) {
  const { loading, isAdmin, isAdminStaff, permissions } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (isAdmin || (isAdminStaff && hasPermission(permissions, resource, action))) return children;

  return (
    fallback || (
      <SectionCard title="Access restricted" subtitle="Your staff role does not have permission for this action.">
        <Link
          to="/admin"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
        >
          Back to admin dashboard
        </Link>
      </SectionCard>
    )
  );
}
