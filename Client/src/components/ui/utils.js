export function cn(...values) {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "object") {
        return Object.entries(value)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([className]) => className);
      }
      return [value];
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export const statusToneMap = {
  pending: {
    label: "Pending",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  },
  approved: {
    label: "Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  },
  active: {
    label: "Active",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  },
  suspended: {
    label: "Suspended",
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  paid: {
    label: "Paid",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  failed: {
    label: "Failed",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  },
  refunded: {
    label: "Refunded",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200",
  },
};

export function getStatusTone(status = "pending") {
  const key = String(status || "pending").toLowerCase();
  return statusToneMap[key] || {
    label: key.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  };
}

export function getInitials(name = "", fallback = "AG") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || fallback;
}

export function clampNumber(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return min;
  return Math.min(Math.max(numericValue, min), max);
}

export function getDiscountPercent(price, originalPrice) {
  const current = Number(price);
  const original = Number(originalPrice);

  if (!original || !current || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

export function getPaginationMeta({ page = 1, pageSize = 10, total = 0 } = {}) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = clampNumber(Number(page) || 1, 1, totalPages);
  const start = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const end = Math.min(currentPage * safePageSize, safeTotal);

  return {
    page: currentPage,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
    start,
    end,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

export function isOptionSelected(optionValue, selectedValue, multiple = false) {
  if (multiple) {
    return Array.isArray(selectedValue) && selectedValue.includes(optionValue);
  }
  return selectedValue === optionValue;
}

export function normalizeSelectOptions(options = []) {
  return options.flatMap((option) => {
    if (option?.options) {
      return option.options.map((child) => ({
        ...child,
        group: child.group || option.label,
      }));
    }

    return option;
  });
}

export function getPriceLabel(value, currency = "BDT") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
