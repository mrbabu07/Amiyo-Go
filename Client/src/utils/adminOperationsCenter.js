export const adminIssueFilters = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "vendor_approval", label: "Vendors" },
  { value: "kyc_review", label: "KYC" },
  { value: "product_moderation", label: "Products" },
  { value: "review_moderation", label: "Reviews" },
  { value: "payment", label: "Payments" },
  { value: "webhook", label: "Webhooks" },
  { value: "notification", label: "Notifications" },
  { value: "newsletter", label: "Newsletter" },
  { value: "bulk_upload", label: "Bulk uploads" },
  { value: "support", label: "Support" },
  { value: "return_dispute", label: "Returns" },
  { value: "payout", label: "Payouts" },
];

export function filterOperationIssues(issues = [], filter = "all") {
  if (filter === "all") return issues;
  if (filter === "critical") {
    return issues.filter((issue) => issue.severity === "critical" || issue.status === "breached");
  }
  return issues.filter((issue) => issue.type === filter);
}

export function getQueueTone(queue = {}) {
  const severity = String(queue.severity || "").toLowerCase();
  const status = String(queue.status || "").toLowerCase();

  if (severity === "critical" || status === "breached") return "rose";
  if (severity === "watch" || status === "needs_review") return "amber";
  return "emerald";
}

export function getQueueSummary(queueWorkload = []) {
  return queueWorkload.reduce(
    (summary, queue) => {
      const count = Number(queue.count || 0);
      const breached = Number(queue.breached || 0);
      const amount = Number(queue.amount || 0);
      const tone = getQueueTone(queue);

      summary.totalOpen += count;
      summary.slaBreached += breached;
      summary.payoutExposure += amount;
      if (tone === "rose") summary.criticalQueues += 1;
      if (tone === "amber") summary.watchQueues += 1;
      if (count === 0) summary.clearQueues += 1;

      return summary;
    },
    {
      totalOpen: 0,
      slaBreached: 0,
      payoutExposure: 0,
      criticalQueues: 0,
      watchQueues: 0,
      clearQueues: 0,
    },
  );
}

export function formatQueueCurrency(value = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
