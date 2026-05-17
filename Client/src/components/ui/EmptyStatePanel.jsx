import { createElement } from "react";
import { Inbox } from "lucide-react";
import { cx, uiTokens } from "./designTokens";

export default function EmptyStatePanel({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description,
  action,
  className = "",
}) {
  return (
    <div className={cx(uiTokens.card, "flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {createElement(Icon, { className: "h-6 w-6" })}
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
