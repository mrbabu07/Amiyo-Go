import { Component } from "react";
import { toast as hotToast } from "react-hot-toast";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  Info,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { Button, Spinner } from "./foundation";
import { cn } from "./utils";

const feedbackIconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const feedbackToneMap = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
  info:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100",
};

export function Toast({ type = "info", title, message, onDismiss }) {
  const Icon = feedbackIconMap[type] || feedbackIconMap.info;

  return (
    <div
      role="status"
      className="flex w-[min(92vw,24rem)] items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-slate-800 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
    >
      <div className={cn("rounded-full p-1", feedbackToneMap[type] || feedbackToneMap.info)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-extrabold text-slate-950 dark:text-white">{title}</p> : null}
        {message ? <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function showToast({ type = "info", title, message, duration = 4000 } = {}) {
  return hotToast.custom(
    (toast) => (
      <Toast
        type={type}
        title={title}
        message={message}
        onDismiss={() => hotToast.dismiss(toast.id)}
      />
    ),
    { duration },
  );
}

export function Alert({
  type = "info",
  title,
  children,
  onDismiss,
  className = "",
}) {
  const Icon = feedbackIconMap[type] || feedbackIconMap.info;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        feedbackToneMap[type] || feedbackToneMap.info,
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-extrabold">{title}</p> : null}
        <div className="text-sm leading-6">{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss alert"
          className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = "",
}) {
  const Icon = icon || FileQuestion;

  return (
    <div className={cn("flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-200">
        {typeof Icon === "function" ? <Icon className="h-7 w-7" /> : Icon}
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action || actionLabel ? (
        <div className="mt-5">
          {action || <Button onClick={onAction}>{actionLabel}</Button>}
        </div>
      ) : null}
    </div>
  );
}

export function Skeleton({
  variant = "text",
  lines = 1,
  className = "",
  width,
  height,
}) {
  const style = {
    width,
    height,
  };
  const base = "skeleton-surface skeleton-shimmer";
  const variants = {
    text: "h-4 rounded",
    heading: "h-7 rounded",
    image: "aspect-square rounded-lg",
    card: "h-40 rounded-lg",
    "table-row": "h-12 rounded-md",
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(base, variants.text)}
            style={{ width: index === lines - 1 ? "75%" : "100%" }}
          />
        ))}
      </div>
    );
  }

  return <div aria-hidden="true" className={cn(base, variants[variant] || variants.text, className)} style={style} />;
}

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = true,
  className = "",
}) {
  const percent = Math.min(100, Math.max(0, (Number(value) / Number(max || 100)) * 100));

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showValue) ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          {label ? <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span> : <span />}
          {showValue ? <span className="font-semibold text-slate-500">{Math.round(percent)}%</span> : null}
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
    </div>
  );
}

export function StepIndicator({ steps = [], current = 0, className = "" }) {
  return (
    <ol className={cn("flex w-full items-start gap-2 overflow-x-auto", className)}>
      {steps.map((step, index) => {
        const state = index < current ? "complete" : index === current ? "active" : "upcoming";
        const active = state === "active";
        const complete = state === "complete";

        return (
          <li key={step.id || step.label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold",
                complete && "border-primary-600 bg-primary-600 text-white",
                active && "border-primary-600 bg-white text-primary-700 dark:bg-slate-950",
                state === "upcoming" && "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950",
              )}
            >
              {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-bold", active || complete ? "text-slate-950 dark:text-white" : "text-slate-500")}>
                {step.label}
              </p>
              {step.description ? <p className="truncate text-xs text-slate-500">{step.description}</p> : null}
            </div>
            {index < steps.length - 1 ? <div className="hidden h-px flex-1 bg-slate-200 dark:bg-slate-800 sm:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[24rem] items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            The page hit an unexpected error. Try again or refresh the page.
          </p>
          {this.state.error?.message ? (
            <p className="mt-3 rounded-md bg-slate-100 p-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              {this.state.error.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={this.reset}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export { Spinner };
