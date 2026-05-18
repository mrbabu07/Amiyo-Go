import { describe, expect, test } from "@jest/globals";
import {
  buildVendorPermissionMatrix,
  describeVendorPermission,
  getVendorPathPermission,
  getVendorRolePreset,
  hasVendorPermission,
  normalizeVendorPermissions,
} from "../vendorStaffPermissions";

describe("vendor staff permissions white-box behavior", () => {
  test("normalizes vendor staff permissions from supported auth shapes", () => {
    expect(
      normalizeVendorPermissions({
        dbUser: { permissions: { vendor: ["Orders:View", "products-manage"] } },
      }),
    ).toEqual(["orders:view", "products:manage"]);

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

  test("builds permission labels and role presets for the owner matrix UI", () => {
    expect(getVendorRolePreset("finance-manager")).toMatchObject({
      label: "Finance manager",
      permissions: expect.arrayContaining(["finance:view", "finance:manage"]),
    });

    expect(describeVendorPermission("orders:ship")).toMatchObject({
      label: "Ship and print labels",
      groupLabel: "Orders",
    });

    const matrix = buildVendorPermissionMatrix(["products:view", "finance-manage"]);
    const productGroup = matrix.find((group) => group.id === "products");
    const financeGroup = matrix.find((group) => group.id === "finance");

    expect(productGroup.permissions.find((permission) => permission.value === "products:view").granted).toBe(true);
    expect(productGroup.permissions.find((permission) => permission.value === "products:manage").granted).toBe(false);
    expect(financeGroup.permissions.find((permission) => permission.value === "finance:manage").granted).toBe(true);
  });
});
