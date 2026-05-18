import { describe, expect, jest, test, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes as RouterRoutes,
  useLocation,
} from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  AdminRoute,
  CustomerRoute,
  GuestCheckoutRoute,
  PublicRoute,
  VendorPermissionGuard,
} from "../guards";

jest.mock("../../hooks/useAuth", () => ({
  __esModule: true,
  default: jest.fn(),
}));

function LoginProbe() {
  const location = useLocation();
  return <p>Login {location.state?.intendedUrl}</p>;
}

describe("shared route guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("CustomerRoute preserves intended URL when redirecting unauthenticated users", () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={["/orders?status=pending"]}>
        <RouterRoutes>
          <Route
            path="/orders"
            element={
              <CustomerRoute>
                <p>Orders</p>
              </CustomerRoute>
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </RouterRoutes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login /orders?status=pending")).toBeInTheDocument();
  });

  test("GuestCheckoutRoute stays public", () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={["/checkout/guest"]}>
        <GuestCheckoutRoute>
          <p>Guest checkout is open</p>
        </GuestCheckoutRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Guest checkout is open")).toBeInTheDocument();
  });

  test("AdminRoute blocks signed-in users without staff access", () => {
    useAuth.mockReturnValue({ user: { email: "buyer@test.dev" }, loading: false, isAdminStaff: false });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <RouterRoutes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <p>Admin</p>
              </AdminRoute>
            }
          />
          <Route path="/" element={<p>Storefront</p>} />
        </RouterRoutes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Storefront")).toBeInTheDocument();
  });

  test("PublicRoute can send authenticated users back to the intended page", () => {
    useAuth.mockReturnValue({ user: { email: "buyer@test.dev" }, loading: false });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { intendedUrl: "/checkout" } }]}>
        <RouterRoutes>
          <Route
            path="/login"
            element={
              <PublicRoute redirectAuthenticated>
                <p>Login</p>
              </PublicRoute>
            }
          />
          <Route path="/checkout" element={<p>Checkout</p>} />
        </RouterRoutes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });

  test("VendorPermissionGuard blocks staff without the required seller permission", () => {
    useAuth.mockReturnValue({
      user: { email: "staff@test.dev" },
      loading: false,
      role: "vendor_staff",
      permissions: { vendor: ["orders:view"] },
    });

    render(
      <MemoryRouter initialEntries={["/vendor/finance"]}>
        <VendorPermissionGuard permission="finance:view">
          <p>Finance</p>
        </VendorPermissionGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Seller access restricted")).toBeInTheDocument();
  });
});
