import { cx, uiTokens } from "./designTokens";

export default function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
  bodyClassName = "",
  flush = false,
}) {
  return (
    <section className={cx(uiTokens.card, className)}>
      {(title || subtitle || actions) && (
        <div className={cx(uiTokens.cardHeader, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? bodyClassName : cx(uiTokens.cardBody, bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
