import {
  filterAuditLogs,
  summarizeAuditLogs,
} from "../adminAuditLog";

describe("adminAuditLog black-box behavior", () => {
  test("filters visible audit rows by search, module, and severity", () => {
    const logs = [
      {
        id: "1",
        module: "finance",
        action: "payout.approved",
        actor: { email: "finance@example.com" },
        target: { type: "payout", id: "pay-1" },
      },
      {
        id: "2",
        action: "products.rejected",
        metadata: { severity: "warning" },
        target: { type: "product", id: "product-1" },
      },
      {
        id: "3",
        module: "support",
        action: "support.ticket.assigned",
        actor: { email: "support@example.com" },
      },
    ];

    expect(filterAuditLogs(logs, { search: "pay", module: "finance", severity: "ok" })).toHaveLength(1);
    expect(filterAuditLogs(logs, { severity: "warning" })[0].action).toBe("products.rejected");
    expect(filterAuditLogs(logs, { targetType: "ticket" })).toEqual([]);
  });

  test("summarizes risk and module distribution for admin cards", () => {
    const summary = summarizeAuditLogs([
      { module: "finance", action: "payout.approved" },
      { module: "finance", action: "payout.failed" },
      { module: "vendors", action: "vendors.suspended" },
      { module: "support", action: "support.ticket.assigned" },
    ]);

    expect(summary).toEqual({
      total: 4,
      critical: 2,
      warning: 0,
      ok: 2,
      sensitive: 3,
      modules: {
        finance: 2,
        vendors: 1,
        support: 1,
      },
    });
  });
});
