const { _private } = require("../../controllers/adminDashboardController");

describe("adminDashboardController operations overview helpers", () => {
  test("summarizes a healthy operations window", () => {
    const health = _private.summarizeOperationsHealth({
      webhookFailures: 0,
      auditServerErrors: 0,
      failedBulkJobs: 0,
      failedNotifications: 0,
      failedNewsletterRecipients: 0,
      openSupportTickets: 1,
      returnDisputes: 0,
    });

    expect(health).toEqual(expect.objectContaining({
      status: "healthy",
      score: 97,
      critical: 0,
      warnings: 1,
    }));
  });

  test("marks operations critical when hard failures stack up", () => {
    const health = _private.summarizeOperationsHealth({
      webhookFailures: 2,
      auditServerErrors: 1,
      failedBulkJobs: 1,
      failedNotifications: 4,
      failedNewsletterRecipients: 2,
      openSupportTickets: 3,
      returnDisputes: 2,
    });

    expect(health.status).toBe("critical");
    expect(health.critical).toBe(4);
    expect(health.warnings).toBe(11);
    expect(health.score).toBe(19);
  });

  test("builds job monitor cards from live queue signals", () => {
    const freshAnalytics = new Date();
    const jobs = _private.buildOperationsJobCards({
      analyticsSummary: { updatedAt: freshAnalytics },
      scheduledNewsletterCount: 2,
      sendingNewsletterCount: 1,
      failedNewsletterCount: 0,
      failedBulkJobs: 3,
      processingBulkJobs: 1,
      failedNotifications: 0,
      failedPayments: 2,
    });

    expect(jobs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "analytics_summary",
        status: "running",
        lastSignalAt: freshAnalytics,
      }),
      expect.objectContaining({
        key: "bulk_upload_queue",
        status: "critical",
        failures: 3,
      }),
      expect.objectContaining({
        key: "payment_webhooks",
        status: "critical",
        failures: 2,
      }),
    ]));
  });

  test("normalizes operation issue cards for admin queues", () => {
    const at = new Date("2026-05-18T10:00:00.000Z");
    const issue = _private.toOperationIssue({
      type: "support",
      title: "Return dispute",
      detail: "Customer uploaded evidence",
      status: "open",
      severity: "medium",
      at,
      owner: "Support",
      path: "/admin/support",
      meta: { id: "ticket-1" },
    });

    expect(issue).toEqual(expect.objectContaining({
      type: "support",
      title: "Return dispute",
      status: "open",
      severity: "medium",
      at,
      owner: "Support",
      path: "/admin/support",
    }));
    expect(issue.id).toContain("support-ticket-1");
  });
});
