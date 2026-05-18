import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
} from "lucide-react";

const toneStyles = {
  healthy: {
    panel: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    bar: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100",
  },
  watch: {
    panel: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
    bar: "bg-amber-500",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100",
  },
  risk: {
    panel: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100",
    bar: "bg-rose-500",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-100",
  },
};

const priorityStyles = {
  high: "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20",
  medium: "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20",
  normal: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  low: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
};

export default function RoleWorkflowPanel({ workflow, className = "" }) {
  if (!workflow) return null;

  const tone = toneStyles[workflow.tone] || toneStyles.healthy;
  const visibleItems = workflow.openItems?.length ? workflow.openItems : workflow.items || [];

  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className={`rounded-lg border p-4 ${tone.panel}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${tone.icon}`}>
              <Gauge className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase dark:bg-slate-950/40">
              {workflow.role}
            </span>
          </div>
          <p className="mt-5 text-4xl font-black">{workflow.score}</p>
          <p className="mt-1 text-xs font-bold uppercase opacity-75">workflow score</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-950/40">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${workflow.score}%` }} />
          </div>
          <p className="mt-3 text-sm font-semibold">
            {workflow.completed} of {workflow.total} checkpoints ready
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">{workflow.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{workflow.description}</p>
            </div>
            {workflow.openItems?.length ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/30 dark:text-orange-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {workflow.openItems.length} action needed
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All clear
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.slice(0, 6).map((item) => {
              const content = (
                <>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      item.done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100"
                        : "bg-white text-orange-700 shadow-sm dark:bg-slate-950 dark:text-orange-200"
                    }`}>
                      {item.done ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-950 dark:text-white">{item.label}</span>
                      <span className="mt-1 line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </span>
                    </span>
                  </div>
                </>
              );

              const className = `block min-h-[104px] rounded-lg border p-3 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-sm ${
                priorityStyles[item.done ? "normal" : item.priority] || priorityStyles.normal
              }`;

              return item.to ? (
                <Link key={item.key} to={item.to} className={className}>
                  {content}
                </Link>
              ) : (
                <div key={item.key} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
