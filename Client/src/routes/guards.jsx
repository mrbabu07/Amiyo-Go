import { Link, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  FullscreenLoader,
  RBACGuard,
  SectionCard,
  VendorStatusGuard,
} from "../components/ui/layout";
import { canAccessVendorPath, hasVendorPermission } from "../utils/vendorStaffPermissions";

function intendedState(location) {
  return {
    intendedUrl: `${location.pathname}${location.search}${location.hash}`,
  };
}

export function PublicRoute({
  children,
  redirectAuthenticated = false,
  authenticatedTo = "/",
}) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (redirectAuthenticated && user) {
    const target = location.state?.intendedUrl || authenticatedTo;
    return <Navigate to={target} replace />;
  }

  return children;
}

export function CustomerRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" state={intendedState(location)} replace />;

  return children;
}

export function AdminRoute({ children }) {
  const location = useLocation();
  const { user, loading, isAdminStaff } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" state={intendedState(location)} replace />;
  if (!isAdminStaff) return <Navigate to="/" replace />;

  return children;
}

export function VendorRoute({ children }) {
  return <VendorStatusGuard>{children}</VendorStatusGuard>;
}

export function VendorPermissionGuard({ children, permission }) {
  const location = useLocation();
  const auth = useAuth();

  if (auth.loading) return <FullscreenLoader />;

  const accessSource = {
    dbUser: auth.dbUser,
    isAdmin: auth.isAdmin,
    permissions: auth.permissions,
    role: auth.role,
  };
  const allowed = permission
    ? hasVendorPermission(accessSource, permission)
    : canAccessVendorPath(location.pathname, accessSource);

  if (allowed) return children;

  return (
    <SectionCard
      title="Seller access restricted"
      subtitle="Your staff account does not have permission for this seller-center area."
    >
      <Link
        to="/vendor/dashboard"
        className="inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
      >
        Back to seller dashboard
      </Link>
    </SectionCard>
  );
}

export function GuestCheckoutRoute({ children }) {
  return children;
}

export { RBACGuard, VendorStatusGuard };
