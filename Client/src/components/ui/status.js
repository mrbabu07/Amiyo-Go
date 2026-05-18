export const standardStatuses = {
  pending: {
    label: "Pending",
    tone: "warning",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  },
  approved: {
    label: "Approved",
    tone: "success",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  },
  active: {
    label: "Active",
    tone: "info",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  },
  suspended: {
    label: "Suspended",
    tone: "neutral",
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  paid: {
    label: "Paid",
    tone: "success",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  failed: {
    label: "Failed",
    tone: "danger",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  },
  refunded: {
    label: "Refunded",
    tone: "refund",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200",
  },
  delivered: {
    label: "Delivered",
    tone: "success",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
};

export const statusAliases = {
  awaiting_approval: "pending",
  awaitingapproval: "pending",
  in_review: "pending",
  inreview: "pending",
  review: "pending",
  verified: "approved",
  enabled: "active",
  disabled: "suspended",
  blocked: "suspended",
  complete: "delivered",
  completed: "delivered",
  shipped: "delivered",
  success: "paid",
  succeeded: "paid",
  payment_failed: "failed",
  refund: "refunded",
  refunded_full: "refunded",
  canceled: "cancelled",
};

export const fallbackStatusTone = {
  label: "Unknown",
  tone: "neutral",
  className:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

export function normalizeStatus(status = "pending") {
  const raw = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  return statusAliases[raw] || raw;
}

export function formatStatusLabel(status = "") {
  return String(status || "")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusTone(status = "pending") {
  const key = normalizeStatus(status);
  const tone = standardStatuses[key];

  if (tone) {
    return {
      key,
      ...tone,
    };
  }

  return {
    ...fallbackStatusTone,
    key,
    label: formatStatusLabel(key),
  };
}

export function getStatusOptions(statuses = Object.keys(standardStatuses)) {
  return statuses.map((status) => {
    const tone = getStatusTone(status);
    return {
      value: tone.key,
      label: tone.label,
      tone: tone.tone,
    };
  });
}

export const statusToneMap = standardStatuses;
