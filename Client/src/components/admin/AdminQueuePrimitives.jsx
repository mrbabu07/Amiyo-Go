import { X } from "lucide-react";

const toneClasses = {
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  neutral: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
};

const helperToneClasses = {
  danger: "text-rose-600 dark:text-rose-300",
  info: "text-blue-600 dark:text-blue-300",
  neutral: "text-slate-500 dark:text-slate-400",
  success: "text-emerald-600 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-300",
};

export function AdminQueueBadge({ children, tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${toneClasses[tone] || toneClasses.neutral}`}>
      {children}
    </span>
  );
}

export function AdminQueueMetric({ label, value, helper, tone = "neutral" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
      {helper ? (
        <p className={`mt-1 text-xs font-semibold ${helperToneClasses[tone] || helperToneClasses.neutral}`}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function AdminQueueDrawer({ open, title, subtitle, badges = [], onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <button
        type="button"
        className="hidden flex-1 cursor-default lg:block"
        onClick={onClose}
        aria-label="Close queue details"
      />
      <aside className="flex h-full w-full flex-col bg-white shadow-2xl dark:bg-slate-950 sm:max-w-xl" aria-label="Queue detail drawer">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                Queue Detail
              </p>
              <h2 className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="Close queue detail"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {badges.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <AdminQueueBadge key={`${badge.label}-${badge.tone}`} tone={badge.tone}>
                  {badge.label}
                </AdminQueueBadge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function AdminQueueDetailSection({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

export function AdminQueueKeyValue({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 dark:border-slate-800">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-900 dark:text-slate-100">{value || "N/A"}</span>
    </div>
  );
}
