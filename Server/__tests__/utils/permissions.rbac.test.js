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
});
