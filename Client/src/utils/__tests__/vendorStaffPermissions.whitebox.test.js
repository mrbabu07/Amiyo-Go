import { describe, expect, test } from "@jest/globals";
import {
  getVendorPathPermission,
  hasVendorPermission,
  normalizeVendorPermissions,
} from "../vendorStaffPermissions";

describe("vendor staff permissions white-box behavior", () => {
  test("normalizes vendor staff permissions from supported auth shapes", () => {
    expect(
      normalizeVendorPermissions({
        dbUser: { permissions: { vendor: ["Orders:View", "products-manage"] } },
      }),
    ).toEqual(["orders:view", "products_manage"]);

    expect(
      normalizeVendorPermissions({
        permissions: {
          orders: ["read", "update"],
          finance: { read: true },
        },
      }),
    ).toEqual(["orders:view", "orders:manage", "finance:view"]);
  });

  test("uses the longest route match for nested vendor paths", () => {
    expect(getVendorPathPermission("/vendor/products")).toBe("products:view");
    expect(getVendorPathPermission("/vendor/products/add")).toBe("products:manage");
    expect(getVendorPathPermission("/vendor/settings/bank")).toBe("finance:manage");
  });

  test("supports exact, wildcard, and resource wildcard permissions", () => {
    expect(hasVendorPermission({ role: "vendor_staff", permissions: { vendor: ["*"] } }, "finance:view")).toBe(true);
    expect(hasVendorPermission({ role: "vendor_staff", permissions: { vendor: ["orders:*"] } }, "orders:manage")).toBe(true);
    expect(hasVendorPermission({ role: "vendor_staff", permissions: { vendor: ["orders:view"] } }, "orders:manage")).toBe(false);
  });
});
