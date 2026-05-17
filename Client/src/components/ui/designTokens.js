export const uiTokens = {
  page: "min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100",
  pageInner: "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
  card:
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
  cardHeader:
    "border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5",
  cardBody: "p-4 sm:p-5",
  input:
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-900/40",
  textarea:
    "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-900/40",
  label: "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
  helper: "mt-1 text-xs text-slate-500 dark:text-slate-400",
  error: "mt-1 text-xs font-medium text-error-600 dark:text-error-300",
  buttonPrimary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
  buttonSecondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  buttonDanger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-semibold text-error-700 transition hover:bg-error-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-900/60 dark:bg-error-900/30 dark:text-error-200",
  table:
    "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800",
  tableHead:
    "bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400",
  tableRow:
    "transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
};

export const cx = (...classes) => classes.filter(Boolean).join(" ");
