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

  test("includes queue SLA breaches in operations health scoring", () => {
    const health = _private.summarizeOperationsHealth({
      webhookFailures: 0,
      auditServerErrors: 0,
      failedBulkJobs: 0,
      failedNotifications: 0,
      failedNewsletterRecipients: 0,
      openSupportTickets: 0,
      returnDisputes: 0,
      queueSlaBreaches: 2,
      queueWarningQueues: 3,
    });

    expect(health).toEqual(expect.objectContaining({
      status: "watch",
      critical: 2,
      warnings: 3,
      score: 67,
    }));
  });

  test("builds normalized marketplace queue workload for Phase 5 admin operations", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const workload = _private.buildAdminQueueWorkload({
      vendorApprovals: [{ _id: "vendor-1", createdAt: new Date("2026-05-15T10:00:00.000Z") }],
      kycReviews: [{ _id: "vendor-2", kyc: { status: "under_review", submittedAt: new Date("2026-05-18T08:00:00.000Z") } }],
      productModeration: [{ _id: "product-1", approvalStatus: "flagged", moderationFlags: [{ type: "policy" }], updatedAt: now }],
      reviewModeration: [{ _id: "review-1", rating: 1, reportCount: 2, createdAt: now }],
      returnDisputes: [{ _id: "return-1", status: "disputed", refundAmount: 500, createdAt: new Date("2026-05-17T12:00:00.000Z") }],
      openSupportTickets: [{ _id: "ticket-1", priority: "urgent", createdAt: now }],
      payoutQueue: [{ _id: "payout-1", status: "pending", amount: 12500, createdAt: now }],
      failedNotifications: [{ _id: "delivery-1", status: "failed", failedAt: now }],
      now,
    });

    expect(workload).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "vendor_approval",
        count: 1,
        status: "breached",
        breached: 1,
      }),
      expect.objectContaining({
        key: "product_moderation",
        count: 1,
        highRiskCount: 1,
      }),
      expect.objectContaining({
        key: "payouts",
        amount: 12500,
        highRiskCount: 1,
      }),
    ]));
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

  test("builds a prioritized dashboard exception inbox with SLA context", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const issues = _private.buildOperationIssues({
      failedPayments: [{
        _id: "payment-1",
        status: "failed",
        amount: 450,
        failedAt: new Date("2026-05-18T11:30:00.000Z"),
      }],
      openSupportTickets: [{
        _id: "ticket-1",
        subject: "Customer waiting",
        status: "open",
        priority: "high",
        createdAt: new Date("2026-05-16T10:00:00.000Z"),
      }],
      payoutQueue: [{
        _id: "payout-1",
        status: "pending",
        amount: 12500,
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
      }],
    });

    const inbox = _private.buildAdminExceptionInbox(issues, { now, limit: 5 });

    expect(inbox.summary).toEqual(expect.objectContaining({
      total: 3,
      critical: 2,
      breached: 1,
      financeExposure: 12950,
    }));
    expect(inbox.items[0]).toEqual(expect.objectContaining({
      priority: "critical",
      actions: expect.arrayContaining([
        expect.objectContaining({ label: expect.any(String), path: expect.any(String) }),
      ]),
    }));
    expect(inbox.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "support",
        breached: true,
        nextAction: "Assign, reply, resolve, or escalate",
      }),
    ]));
  });

  test("merges admin case assignment state into exception inbox items", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const issues = _private.buildOperationIssues({
      openSupportTickets: [{
        _id: "ticket-1",
        subject: "Customer waiting",
        status: "open",
        priority: "high",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
      }],
    });
    const inbox = _private.buildAdminExceptionInbox(issues, { now, limit: 5 });
    const merged = _private.mergeCaseAssignmentsIntoInbox(inbox, [{
      caseKey: inbox.items[0].caseKey,
      assignedTo: "support-lead@amiyo.test",
      status: "in_progress",
      priority: "high",
      dueAt: new Date("2026-05-18T18:00:00.000Z"),
      notes: [{ text: "Checking order evidence" }],
      history: [{ action: "status_changed" }],
    }]);

    expect(merged.items[0]).toEqual(expect.objectContaining({
      caseKey: expect.stringContaining("support:"),
      case: expect.objectContaining({
        assignedTo: "support-lead@amiyo.test",
        status: "in_progress",
        priority: "high",
        noteCount: 1,
      }),
    }));
  });

  test("summarizes staff workload for assigned admin cases", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const workload = _private.buildStaffWorkload([
      {
        caseKey: "support:1",
        assignedTo: "ops@amiyo.test",
        status: "open",
        priority: "critical",
        workflow: "Support",
        dueAt: new Date("2026-05-18T10:00:00.000Z"),
      },
      {
        caseKey: "finance:1",
        assignedTo: "",
        status: "waiting",
        priority: "medium",
        workflow: "Finance",
        dueAt: new Date("2026-05-18T20:00:00.000Z"),
      },
      {
        caseKey: "catalog:1",
        assignedTo: "ops@amiyo.test",
        status: "resolved",
        priority: "high",
        workflow: "Catalog",
      },
    ], now);

    expect(workload).toEqual(expect.objectContaining({
      totalOpen: 2,
      assigned: 1,
      unassigned: 1,
      overdue: 1,
      critical: 1,
    }));
    expect(workload.staff[0]).toEqual(expect.objectContaining({
      assignee: "ops@amiyo.test",
      open: 1,
      overdue: 1,
      topWorkflow: "Support",
    }));
  });

  test("calculates finance reconciliation exposure across COD, returns, and payouts", () => {
    const summary = _private.buildFinanceReconciliation({
      orders: [
        { paymentMethod: "cod", paymentStatus: "pending", total: 1000 },
        { paymentMethod: "cod", codState: "cod_remitted", total: 500 },
        { paymentMethod: "bkash", total: 300 },
      ],
      returns: [
        { status: "pending", refundAmount: 250, vendorDeductionAmount: 200 },
        { status: "completed", refundAmount: 100, vendorDeductionAmount: 100 },
      ],
      payouts: [
        { status: "hold", amount: 400 },
        { status: "processing", amount: 600 },
      ],
    });

    expect(summary).toEqual(expect.objectContaining({
      codOrders: 2,
      codOutstanding: 1000,
      refundExposure: 250,
      payoutHolds: 400,
      pendingPayoutExposure: 1000,
      vendorDeductions: 300,
      unresolvedBuckets: 4,
      status: "critical",
    }));
  });

  test("reports integration readiness from environment and failure signals", () => {
    const originalRedis = process.env.REDIS_URL;
    const originalCourier = process.env.PATHAO_API_KEY;
    process.env.REDIS_URL = "redis://localhost:6379";
    delete process.env.PATHAO_API_KEY;

    const readiness = _private.buildIntegrationReadiness({
      failedNotificationDeliveries: 2,
      failedPayments24h: 1,
      latestAnalyticsSummary: { updatedAt: new Date() },
    });

    expect(readiness.integrations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "courier", status: "manual" }),
      expect.objectContaining({ key: "payments", status: "watch" }),
      expect.objectContaining({ key: "messages", status: "watch" }),
      expect.objectContaining({ key: "event_bus", status: "ready" }),
      expect.objectContaining({ key: "analytics", status: "ready" }),
    ]));

    if (originalRedis === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedis;
    }
    if (originalCourier !== undefined) {
      process.env.PATHAO_API_KEY = originalCourier;
    }
  });
});
