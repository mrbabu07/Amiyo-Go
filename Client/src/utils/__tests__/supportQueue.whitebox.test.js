import { describe, expect, test } from "@jest/globals";
import {
  filterSupportTickets,
  formatSupportLabel,
  getSupportPriorityMeta,
  getSupportStats,
  getSupportStatusMeta,
  getTicketLastActivity,
  getTicketSlaState,
} from "../supportQueue";

describe("support queue white-box helpers", () => {
  test("normalizes support labels and metadata", () => {
    expect(formatSupportLabel("in_progress")).toBe("In Progress");
    expect(getSupportStatusMeta("closed")).toMatchObject({
      label: "Closed",
      tone: "neutral",
    });
    expect(getSupportPriorityMeta("urgent")).toMatchObject({
      label: "Urgent",
      slaHours: 4,
      tone: "danger",
    });
  });

  test("uses the latest message timestamp as ticket activity", () => {
    const latest = getTicketLastActivity({
      updatedAt: "2026-05-18T08:00:00.000Z",
      messages: [
        { timestamp: "2026-05-18T07:00:00.000Z" },
        { timestamp: "2026-05-18T09:30:00.000Z" },
      ],
    });

    expect(latest.toISOString()).toBe("2026-05-18T09:30:00.000Z");
  });

  test("calculates SLA state from priority and last activity", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");

    expect(
      getTicketSlaState(
        {
          status: "open",
          priority: "urgent",
          updatedAt: "2026-05-18T07:00:00.000Z",
        },
        now,
      ),
    ).toMatchObject({
      state: "breached",
      overdue: true,
    });

    expect(
      getTicketSlaState(
        {
          status: "resolved",
          priority: "urgent",
          updatedAt: "2026-05-18T07:00:00.000Z",
        },
        now,
      ),
    ).toMatchObject({
      state: "complete",
      overdue: false,
    });
  });

  test("aggregates operational stats for dashboard cards", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const stats = getSupportStats(
      [
        { status: "open", priority: "urgent", updatedAt: "2026-05-18T07:00:00.000Z" },
        { status: "in_progress", priority: "medium", assignedTo: "a1", updatedAt: "2026-05-18T10:30:00.000Z" },
        { status: "closed", priority: "low", assignedTo: "a2", updatedAt: "2026-05-18T06:00:00.000Z" },
      ],
      now,
    );

    expect(stats).toEqual({
      total: 3,
      open: 1,
      inProgress: 1,
      urgent: 1,
      unassigned: 1,
      slaRisk: 1,
    });
  });

  test("filters tickets by status, priority, assignee, and search text", () => {
    const tickets = [
      {
        ticketId: "SUP-1",
        status: "open",
        priority: "urgent",
        assignedTo: "",
        subject: "Order not delivered",
        customerInfo: { email: "customer@example.com" },
        orderId: "ORD-9",
      },
      {
        ticketId: "SUP-2",
        status: "resolved",
        priority: "low",
        assignedTo: "agent-1",
        subject: "Voucher question",
      },
    ];

    expect(
      filterSupportTickets(tickets, {
        status: "open",
        priority: "urgent",
        search: "ord-9",
      }),
    ).toHaveLength(1);
    expect(filterSupportTickets(tickets, { assignedTo: "agent-1" })[0].ticketId).toBe("SUP-2");
  });
});
