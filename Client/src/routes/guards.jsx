import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  FullscreenLoader,
  RBACGuard,
  VendorStatusGuard,
} from "../components/ui/layout";

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

export function GuestCheckoutRoute({ children }) {
  return children;
}

export { RBACGuard, VendorStatusGuard };
