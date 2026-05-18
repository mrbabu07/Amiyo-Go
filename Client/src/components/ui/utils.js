export {
  fallbackStatusTone,
  formatStatusLabel,
  getStatusOptions,
  getStatusTone,
  normalizeStatus,
  standardStatuses,
  statusAliases,
  statusToneMap,
} from "./status";

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
