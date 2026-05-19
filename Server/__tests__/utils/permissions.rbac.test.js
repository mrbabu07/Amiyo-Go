const {
  DEFAULT_ROLE_PERMISSIONS,
  roleCan,
  resolvePermissionFromRequest,
} = require("../../config/permissions");

describe("RBAC permission resolution", () => {
  test("merges new default permissions with existing role permission documents", () => {
    const legacyPermissionDoc = {
      role: "manager",
      permissions: {
        orders: ["read"],
      },
    };

    expect(roleCan({ role: "manager" }, "system", "read", legacyPermissionDoc)).toBe(true);
    expect(roleCan({ role: "manager" }, "orders", "delete", legacyPermissionDoc)).toBe(false);
  });

  test("maps admin paths to resource and HTTP action permissions", () => {
    expect(
      resolvePermissionFromRequest({
        baseUrl: "/api/admin/payouts",
        route: { path: "/requests/:payoutId/approve" },
        method: "PATCH",
      }),
    ).toEqual({
      resource: "payments",
      action: "update",
    });

    expect(DEFAULT_ROLE_PERMISSIONS.support.system).toEqual(["read"]);
  });

  test("maps communications and promotion tools away from platform settings", () => {
    expect(
      resolvePermissionFromRequest({
        baseUrl: "/api/admin/platform/broadcasts",
        route: { path: "/" },
        method: "POST",
      }),
    ).toEqual({
      resource: "communications",
      action: "create",
    });

    expect(
      resolvePermissionFromRequest({
        baseUrl: "/api/admin/offers",
        route: { path: "/" },
        method: "POST",
      }),
    ).toEqual({
      resource: "promotions",
      action: "create",
    });
  });

  test("keeps destructive actions and platform settings super-admin only", () => {
    const customPermissionDoc = {
      role: "manager",
      permissions: {
        orders: ["read", "update", "delete"],
        system: ["read", "update", "delete"],
      },
    };

    expect(DEFAULT_ROLE_PERMISSIONS.manager.orders).not.toContain("delete");
    expect(DEFAULT_ROLE_PERMISSIONS.campaign_manager.system).toEqual(["read"]);
    expect(roleCan({ role: "manager" }, "orders", "delete", customPermissionDoc)).toBe(false);
    expect(roleCan({ role: "manager" }, "system", "update", customPermissionDoc)).toBe(false);
    expect(roleCan({ role: "admin" }, "system", "update", customPermissionDoc)).toBe(true);
  });
});
