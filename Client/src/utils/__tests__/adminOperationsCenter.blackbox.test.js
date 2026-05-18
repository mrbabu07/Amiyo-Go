import {
  filterOperationIssues,
  getQueueSummary,
} from "../adminOperationsCenter";

describe("adminOperationsCenter black-box behavior", () => {
  test("summarizes admin marketplace queues for command-center cards", () => {
    const summary = getQueueSummary([
      { key: "vendors", count: 3, breached: 1, amount: 0, severity: "critical" },
      { key: "payouts", count: 2, breached: 0, amount: 15000, severity: "watch" },
      { key: "support", count: 0, breached: 0, amount: 0, severity: "healthy" },
    ]);

    expect(summary).toEqual({
      totalOpen: 5,
      slaBreached: 1,
      payoutExposure: 15000,
      criticalQueues: 1,
      watchQueues: 1,
      clearQueues: 1,
    });
  });

  test("filters visible issue rows by queue type and critical state", () => {
    const issues = [
      { type: "vendor_approval", severity: "low" },
      { type: "payout", severity: "critical" },
      { type: "support", status: "breached" },
    ];

    expect(filterOperationIssues(issues, "payout")).toEqual([issues[1]]);
    expect(filterOperationIssues(issues, "critical")).toEqual([issues[1], issues[2]]);
    expect(filterOperationIssues(issues, "all")).toEqual(issues);
  });
});
