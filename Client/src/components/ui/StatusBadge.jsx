import { cx } from "./designTokens";

const statusConfig = {
  active: "border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-900/30 dark:text-success-200",
  approved: "border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-900/30 dark:text-success-200",
  delivered: "border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-900/30 dark:text-success-200",
  paid: "border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-900/30 dark:text-success-200",
  released: "border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-900/30 dark:text-success-200",

  pending: "border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-900/60 dark:bg-accent-900/30 dark:text-accent-200",
  pending_clearance: "border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-900/60 dark:bg-accent-900/30 dark:text-accent-200",
  processing: "border-secondary-200 bg-secondary-50 text-secondary-700 dark:border-secondary-900/60 dark:bg-secondary-900/30 dark:text-secondary-200",
  scheduled: "border-secondary-200 bg-secondary-50 text-secondary-700 dark:border-secondary-900/60 dark:bg-secondary-900/30 dark:text-secondary-200",
  upcoming: "border-secondary-200 bg-secondary-50 text-secondary-700 dark:border-secondary-900/60 dark:bg-secondary-900/30 dark:text-secondary-200",
  shipped: "border-secondary-200 bg-secondary-50 text-secondary-700 dark:border-secondary-900/60 dark:bg-secondary-900/30 dark:text-secondary-200",
  ready_to_ship: "border-secondary-200 bg-secondary-50 text-secondary-700 dark:border-secondary-900/60 dark:bg-secondary-900/30 dark:text-secondary-200",
  packed: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200",

  rejected: "border-error-200 bg-error-50 text-error-700 dark:border-error-900/60 dark:bg-error-900/30 dark:text-error-200",
  cancelled: "border-error-200 bg-error-50 text-error-700 dark:border-error-900/60 dark:bg-error-900/30 dark:text-error-200",
  failed: "border-error-200 bg-error-50 text-error-700 dark:border-error-900/60 dark:bg-error-900/30 dark:text-error-200",
  suspended: "border-error-200 bg-error-50 text-error-700 dark:border-error-900/60 dark:bg-error-900/30 dark:text-error-200",
  blacklisted: "border-error-200 bg-error-50 text-error-700 dark:border-error-900/60 dark:bg-error-900/30 dark:text-error-200",

  draft: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  inactive: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  expired: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  archived: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  returned: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",

  refund_deducted: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  shipping: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
  void: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export const formatStatusLabel = (status = "") =>
  String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function StatusBadge({
  status,
  children,
  size = "md",
  showDot = true,
  className = "",
}) {
  const normalized = String(status || "pending").toLowerCase();
  const tone = statusConfig[normalized] || statusConfig.pending;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none",
        sizeClasses[size] || sizeClasses.md,
        tone,
        className,
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children || formatStatusLabel(status)}
    </span>
  );
}
