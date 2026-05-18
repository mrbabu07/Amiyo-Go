import { describe, expect, test } from "@jest/globals";
import {
  buildAdminWorkflow,
  buildCustomerWorkflow,
  buildVendorWorkflow,
  getWorkflowTone,
} from "../roleWorkflowCenter";

describe("roleWorkflowCenter white-box helpers", () => {
  test("maps workflow scores to stable tones", () => {
    expect(getWorkflowTone(95)).toBe("healthy");
    expect(getWorkflowTone(70)).toBe("watch");
    expect(getWorkflowTone(35)).toBe("risk");
  });

  test("prioritizes missing customer checkout blockers", () => {
    const workflow = buildCustomerWorkflow({
      account: {
        profile: { displayName: "Ami", email: "ami@example.com" },
        verificationBadges: { emailVerified: true, phoneVerified: false },
        savedPaymentMethods: [],
        notificationPreferences: { orderUpdates: { email: true } },
      },
      addresses: [],
    });

    expect(workflow.score).toBe(20);
    expect(workflow.openItems.map((item) => item.key).slice(0, 2)).toEqual(["profile", "address"]);
  });

  test("flags vendor SLA and listing issues before low-priority growth tasks", () => {
    const workflow = buildVendorWorkflow({
      onboardingProgress: 100,
      healthScore: 75,
      actionRequiredOrders: 5,
      breachedShipments: 2,
      listingIssues: 3,
      pendingModeration: 1,
      marketingItems: 0,
    });

    expect(workflow.openItems.map((item) => item.key).slice(0, 3)).toEqual([
      "shipments",
      "listings",
      "moderation",
    ]);
  });

  test("combines admin queue, support, notification, and job health", () => {
    const workflow = buildAdminWorkflow({
      queueSummary: { totalOpen: 12, slaBreached: 2, criticalQueues: 1 },
      metrics: { openSupportTickets: 4, failedNotifications: 1, failedNewsletterRecipients: 2 },
      notificationHealth: { failedDeliveries: 3 },
      jobMonitors: [{ failures: 2 }, { failures: 0 }],
    });

    expect(workflow.openItems.map((item) => item.key)).toEqual([
      "sla",
      "critical",
      "support",
      "notifications",
      "jobs",
    ]);
    expect(workflow.tone).toBe("risk");
  });
});
