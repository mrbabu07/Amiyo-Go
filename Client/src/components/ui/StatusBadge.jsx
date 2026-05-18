import { cx } from "./designTokens";
import { formatStatusLabel, getStatusTone } from "./status";

const sizeClasses = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export { formatStatusLabel };

export default function StatusBadge({
  status,
  children,
  size = "md",
  showDot = true,
  className = "",
}) {
  const tone = getStatusTone(status);

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none",
        sizeClasses[size] || sizeClasses.md,
        tone.className,
        className,
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children || tone.label || formatStatusLabel(status)}
    </span>
  );
}
