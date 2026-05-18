import { describe, expect, test } from "@jest/globals";
import {
  buildAdminWorkflow,
  buildCustomerWorkflow,
  buildVendorWorkflow,
} from "../roleWorkflowCenter";

describe("roleWorkflowCenter black-box role workflows", () => {
  test("a ready customer shows no checkout-prep actions", () => {
    const workflow = buildCustomerWorkflow({
      account: {
        profile: { displayName: "Ready Buyer", email: "buyer@example.com", phone: "01700000000" },
        verificationBadges: { emailVerified: true, phoneVerified: true },
        savedPaymentMethods: [{ id: "pay-1", type: "bkash" }],
        notificationPreferences: { orderUpdates: { push: true } },
      },
      addresses: [{ id: "addr-1", isDefault: true }],
    });

    expect(workflow.score).toBe(100);
    expect(workflow.openItems).toHaveLength(0);
  });

  test("vendor workflow keeps urgent operations ahead of marketing", () => {
    const workflow = buildVendorWorkflow({
      onboardingProgress: 80,
      healthScore: 65,
      breachedShipments: 1,
      listingIssues: 1,
      marketingItems: 0,
    });

    expect(workflow.openItems[0]).toMatchObject({ key: "onboarding", priority: "high" });
    expect(workflow.openItems.some((item) => item.key === "marketing")).toBe(true);
  });

  test("admin workflow clears when operations are healthy", () => {
    const workflow = buildAdminWorkflow({
      queueSummary: { totalOpen: 0, slaBreached: 0, criticalQueues: 0 },
      metrics: { openSupportTickets: 0, failedNotifications: 0, failedNewsletterRecipients: 0 },
      notificationHealth: { failedDeliveries: 0 },
      jobMonitors: [{ failures: 0 }],
      health: { score: 100 },
    });

    expect(workflow.score).toBe(100);
    expect(workflow.tone).toBe("healthy");
    expect(workflow.openItems).toHaveLength(0);
  });
});
