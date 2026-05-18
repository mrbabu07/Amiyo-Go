import { forwardRef } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from "lucide-react";
import { uiTokens } from "./tokens";
import { cn, getInitials, getStatusTone } from "./utils";

export function Spinner({ size = "sm", className = "", label = "Loading" }) {
  const sizeClass = uiTokens.iconSize[size] || uiTokens.iconSize.sm;

  return (
    <Loader2
      aria-label={label}
      className={cn(sizeClass, "animate-spin", className)}
    />
  );
}

const buttonVariants = {
  primary:
    "border border-primary-600 bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800",
  secondary:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  danger:
    "border border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  link:
    "border border-transparent bg-transparent px-0 text-primary-700 underline-offset-4 hover:text-primary-800 hover:underline dark:text-primary-300 dark:hover:text-primary-200",
};

const buttonSizes = {
  sm: "min-h-9 gap-1.5 rounded-md px-3 py-1.5 text-xs",
  md: "min-h-11 gap-2 rounded-lg px-4 py-2.5 text-sm",
  lg: "min-h-12 gap-2.5 rounded-lg px-5 py-3 text-base",
  icon: "h-10 w-10 rounded-lg p-0",
};

export const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
        buttonVariants[variant] || buttonVariants.primary,
        buttonSizes[size] || buttonSizes.md,
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children ? <span className="truncate">{children}</span> : null}
      {!loading ? rightIcon : null}
    </button>
  ),
);

Button.displayName = "Button";

export const IconButton = forwardRef(
  ({ label, icon, children, size = "icon", variant = "ghost", className = "", ...props }, ref) => (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {icon || children}
    </Button>
  ),
);

IconButton.displayName = "IconButton";

const badgeVariants = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  primary:
    "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  danger:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  info:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
};

const badgeSizes = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function Badge({
  children,
  variant = "neutral",
  status,
  size = "md",
  dot = false,
  className = "",
  ...props
}) {
  const statusTone = status ? getStatusTone(status) : null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-bold leading-none",
        statusTone?.className || badgeVariants[variant] || badgeVariants.neutral,
        badgeSizes[size] || badgeSizes.md,
        className,
      )}
      {...props}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      <span className="truncate">{children || statusTone?.label}</span>
    </span>
  );
}

export function StatusBadge({ status, children, ...props }) {
  return (
    <Badge status={status} {...props}>
      {children}
    </Badge>
  );
}

export function Card({ children, className = "", as: Component = "section", ...props }) {
  return (
    <Component
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div
      className={cn("border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }) {
  return (
    <div className={cn("px-4 py-4 sm:px-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div
      className={cn("border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export function StatCard({
  label,
  value,
  change,
  trend = "neutral",
  icon,
  sparkline,
  className = "",
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendClass =
    trend === "up"
      ? "text-emerald-700 bg-emerald-50"
      : trend === "down"
        ? "text-red-700 bg-red-50"
        : "text-slate-600 bg-slate-100";

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-extrabold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        {icon ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {change ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold", trendClass)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {change}
          </span>
        ) : (
          <span />
        )}
        {sparkline ? <div className="h-8 min-w-20">{sparkline}</div> : null}
      </div>
    </Card>
  );
}

export function Divider({ orientation = "horizontal", label, className = "" }) {
  if (orientation === "vertical") {
    return <div aria-hidden="true" className={cn("h-full w-px bg-slate-200 dark:bg-slate-800", className)} />;
  }

  return (
    <div className={cn("flex items-center gap-3", className)} role="separator">
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      {label ? <span className="text-xs font-semibold uppercase text-slate-400">{label}</span> : null}
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

const avatarSizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  online = false,
  className = "",
}) {
  const label = alt || name || "Avatar";

  return (
    <span className={cn("relative inline-flex shrink-0", avatarSizes[size] || avatarSizes.md, className)}>
      {src ? (
        <img
          src={src}
          alt={label}
          className="h-full w-full rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-primary-50 font-extrabold text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/50 dark:text-primary-200 dark:ring-primary-900">
          {getInitials(name)}
        </span>
      )}
      {online ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
      ) : null}
    </span>
  );
}

export function Icon({ as: IconComponent, label, size = "md", className = "", ...props }) {
  if (!IconComponent) return null;

  return (
    <IconComponent
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(uiTokens.iconSize[size] || uiTokens.iconSize.md, className)}
      {...props}
    />
  );
}
