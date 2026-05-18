import { describe, expect, test } from "@jest/globals";
import { filterSupportTickets, getSupportStats, getTicketSlaState } from "../supportQueue";

describe("support queue black-box behavior", () => {
  test("surfaces the tickets an admin must act on first", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const tickets = [
      {
        ticketId: "SUP-100",
        subject: "Payment failed",
        status: "open",
        priority: "urgent",
        updatedAt: "2026-05-18T07:00:00.000Z",
      },
      {
        ticketId: "SUP-101",
        subject: "Address change",
        status: "in_progress",
        priority: "medium",
        assignedTo: "agent-1",
        updatedAt: "2026-05-18T11:30:00.000Z",
      },
    ];

    const visible = filterSupportTickets(tickets, { search: "payment" });
    const stats = getSupportStats(tickets, now);
    const sla = getTicketSlaState(visible[0], now);

    expect(visible).toHaveLength(1);
    expect(visible[0].ticketId).toBe("SUP-100");
    expect(stats.urgent).toBe(1);
    expect(stats.slaRisk).toBe(1);
    expect(sla.state).toBe("breached");
  });
});
