import BackButton from "../BackButton";
import { cx } from "./designTokens";

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  showBack = false,
  className = "",
}) {
  return (
    <header
      className={cx(
        "border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          {showBack && (
            <div className="mb-3">
              <BackButton />
            </div>
          )}
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {title && (
              <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
                {title}
              </h1>
            )}
            {meta}
          </div>
          {subtitle && (
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
