import { describe, expect, test } from "@jest/globals";
import {
  canAccessVendorPath,
  filterVendorNavigation,
  getVendorAccessSummary,
  hasVendorPermission,
} from "../vendorStaffPermissions";

describe("vendor staff permissions black-box behavior", () => {
  test("lets vendor owners use every seller-center route", () => {
    const owner = { role: "vendor", permissions: {} };

    expect(canAccessVendorPath("/vendor/products/add", owner)).toBe(true);
    expect(canAccessVendorPath("/vendor/settings", owner)).toBe(true);
    expect(getVendorAccessSummary(owner)).toMatchObject({
      label: "Owner workspace",
      permissions: ["*"],
    });
  });

  test("limits order operators to order and return workspaces", () => {
    const staff = {
      role: "vendor_staff",
      permissions: {
        vendor: ["orders:view", "orders:manage", "returns:view", "returns:manage"],
      },
    };

    expect(canAccessVendorPath("/vendor/orders/ORD-100", staff)).toBe(true);
    expect(canAccessVendorPath("/vendor/returns/RET-200", staff)).toBe(true);
    expect(canAccessVendorPath("/vendor/finance", staff)).toBe(false);
    expect(canAccessVendorPath("/vendor/settings", staff)).toBe(false);
  });

  test("filters nested navigation without leaving empty groups behind", () => {
    const navigation = [
      {
        name: "Products",
        children: [
          { name: "All products", path: "/vendor/products" },
          { name: "Add product", path: "/vendor/products/add" },
        ],
      },
      {
        name: "Finance",
        children: [{ name: "Overview", path: "/vendor/finance" }],
      },
    ];
    const staff = {
      role: "vendor_staff",
      permissions: { vendor: ["products:view"] },
    };

    expect(filterVendorNavigation(navigation, staff)).toEqual([
      {
        name: "Products",
        children: [{ name: "All products", path: "/vendor/products" }],
      },
    ]);
  });

  test("treats manage permission as enough for read-only route visibility", () => {
    const staff = {
      role: "vendor_staff",
      permissions: { vendor: ["products:manage"] },
    };

    expect(hasVendorPermission(staff, "products:view")).toBe(true);
    expect(canAccessVendorPath("/vendor/products", staff)).toBe(true);
  });
});
