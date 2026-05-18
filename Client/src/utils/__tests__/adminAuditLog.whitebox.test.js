import {
  formatAuditTime,
  getAuditModule,
  getAuditSeverity,
  normalizeAuditLog,
} from "../adminAuditLog";

describe("adminAuditLog white-box helpers", () => {
  test("derives stable module and severity values from mixed audit shapes", () => {
    expect(getAuditModule({ action: "payout.requested" })).toBe("finance");
    expect(getAuditModule({ action: "vendors.approved" })).toBe("vendors");
    expect(getAuditSeverity({ action: "orders.webhook.failed" })).toBe("critical");
    expect(getAuditSeverity({ statusCode: 404 })).toBe("warning");
    expect(getAuditSeverity({ action: "support.ticket.assigned" })).toBe("ok");
  });

  test("normalizes nested actor, target, and request fields for table rendering", () => {
    const row = normalizeAuditLog({
      _id: "audit-1",
      action: "returns.refund.approved",
      actor: { userId: "admin-1", displayName: "Ops Lead" },
      target: { type: "return", id: "ret-1", title: "Return case" },
      path: "/api/returns/ret-1/refund",
      ip: "127.0.0.1",
    });

    expect(row).toEqual(expect.objectContaining({
      id: "audit-1",
      module: "returns",
      severity: "warning",
      actor: expect.objectContaining({ id: "admin-1", name: "Ops Lead" }),
      target: expect.objectContaining({ id: "ret-1", name: "Return case" }),
      request: expect.objectContaining({ path: "/api/returns/ret-1/refund", ip: "127.0.0.1" }),
    }));
  });

  test("formats invalid audit timestamps safely", () => {
    expect(formatAuditTime()).toBe("No timestamp");
    expect(formatAuditTime("not-a-date")).toBe("No timestamp");
  });
});
