import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccountDropdown from "../AccountDropdown";

const labels = {
  "navbar.my_profile": "My Profile",
  "navbar.my_orders": "My Orders",
  "navbar.my_alerts": "My Alerts",
  "navbar.loyalty_rewards": "Loyalty Rewards",
  "navbar.become_seller": "Become a Seller",
  "navbar.seller_dashboard": "Seller Dashboard",
  "navbar.admin_dashboard": "Admin Dashboard",
  "navbar.sign_out": "Sign Out",
};

const renderMenu = (overrides = {}) =>
  render(
    <MemoryRouter>
      <AccountDropdown
        user={{ email: "admin@example.com", displayName: "Admin User" }}
        dbUser={{ name: "Admin User" }}
        role="customer"
        isAdmin={false}
        vendorProfile={null}
        coinRewardsEnabled
        universityLabel="University"
        t={(key) => labels[key] || key}
        onClose={() => {}}
        onLogout={() => {}}
        {...overrides}
      />
    </MemoryRouter>,
  );

describe("AccountDropdown role-aware navigation", () => {
  test("keeps the admin menu focused on one admin workspace entry", () => {
    renderMenu({ isAdmin: true, role: "admin" });

    expect(screen.getByRole("menuitem", { name: /Admin Dashboard/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByText("Seller Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Become a Seller")).not.toBeInTheDocument();
  });

  test("shows the correct workspace entry for vendors and customers", () => {
    const { rerender } = renderMenu({ role: "vendor", vendorProfile: { shopName: "Amiyo Shop" } });

    expect(screen.getByRole("menuitem", { name: /Seller Dashboard/i })).toHaveAttribute(
      "href",
      "/vendor/dashboard",
    );
    expect(screen.queryByText("Become a Seller")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AccountDropdown
          user={{ email: "customer@example.com", displayName: "Customer User" }}
          role="customer"
          isAdmin={false}
          vendorProfile={null}
          coinRewardsEnabled={false}
          universityLabel="University"
          t={(key) => labels[key] || key}
          onClose={() => {}}
          onLogout={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("menuitem", { name: /Become a Seller/i })).toHaveAttribute(
      "href",
      "/vendor/register",
    );
    expect(screen.queryByText("Seller Dashboard")).not.toBeInTheDocument();
  });
});
