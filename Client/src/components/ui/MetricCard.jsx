import { createElement } from "react";
import { cx, uiTokens } from "./designTokens";

export default function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
  className = "",
}) {
  const tones = {
    default: "text-slate-950 dark:text-white",
    primary: "text-primary-700 dark:text-primary-200",
    success: "text-success-700 dark:text-success-200",
    warning: "text-accent-700 dark:text-accent-200",
    danger: "text-error-700 dark:text-error-200",
  };

  return (
    <div className={cx(uiTokens.card, "p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {Icon && (
          <span className="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {createElement(Icon, { className: "h-4 w-4" })}
          </span>
        )}
      </div>
      <p className={cx("mt-3 text-2xl font-bold leading-none", tones[tone] || tones.default)}>
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}
