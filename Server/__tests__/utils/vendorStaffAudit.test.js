const {
  buildVendorStaffAuditEntry,
  normalizePermissions,
  permissionDiff,
  summarizeStaffAuditEntry,
} = require("../../utils/vendorStaffAudit");

describe("vendor staff audit helpers", () => {
  test("normalizes permissions before diffing access changes", () => {
    expect(normalizePermissions(["orders:view", "", "orders:view", " finance:view "])).toEqual([
      "finance:view",
      "orders:view",
    ]);

    expect(permissionDiff(["orders:view", "products:view"], ["orders:view", "finance:view"])).toEqual({
      added: ["finance:view"],
      removed: ["products:view"],
    });
  });

  test("builds owner audit entries with permission and status changes", () => {
    const entry = buildVendorStaffAuditEntry({
      vendorId: "vendor-1",
      actorId: "owner-1",
      action: "staff.updated",
      before: {
        _id: "staff-1",
        email: "ops@example.com",
        name: "Ops",
        status: "active",
        permissions: ["orders:view", "products:view"],
      },
      after: {
        _id: "staff-1",
        email: "ops@example.com",
        name: "Ops Team",
        status: "paused",
        permissions: ["orders:view", "finance:view"],
      },
    });

    expect(entry).toEqual(
      expect.objectContaining({
        vendorId: "vendor-1",
        staffId: "staff-1",
        staffEmail: "ops@example.com",
        action: "staff.updated",
        actorId: "owner-1",
        actorRole: "vendor_owner",
      }),
    );
    expect(entry.changes).toEqual({
      name: { from: "Ops", to: "Ops Team" },
      status: { from: "active", to: "paused" },
      permissions: {
        added: ["finance:view"],
        removed: ["products:view"],
      },
    });
    expect(summarizeStaffAuditEntry(entry)).toContain("Status active to paused");
  });
});
