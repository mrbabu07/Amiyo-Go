import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button, IconButton } from "./foundation";
import { Input } from "./forms";
import { cn } from "./utils";

function useOverlayLifecycle(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);
}

const modalSizes = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  className = "",
}) {
  useOverlayLifecycle(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[100dvh] w-full flex-col rounded-t-xl bg-white shadow-2xl dark:bg-slate-950 sm:max-h-[88vh] sm:rounded-xl",
          modalSizes[size] || modalSizes.md,
          className,
        )}
      >
        {(title || description || onClose) ? (
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
            <div className="min-w-0">
              {title ? <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
            </div>
            {onClose ? <IconButton label="Close modal" icon={<X className="h-4 w-4" />} onClick={onClose} /> : null}
          </header>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  className = "",
}) {
  useOverlayLifecycle(open, onClose);
  if (!open) return null;

  const sideClass = side === "left" ? "sm:left-0" : "sm:right-0";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55">
      <button
        type="button"
        aria-label="Close drawer backdrop"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-0 flex w-full flex-col bg-white shadow-2xl dark:bg-slate-950 sm:inset-y-0 sm:max-w-md",
          sideClass,
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <IconButton label="Close drawer" icon={<X className="h-4 w-4" />} onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
}) {
  useOverlayLifecycle(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 md:hidden">
      <button type="button" aria-label="Close bottom sheet backdrop" className="absolute inset-0" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl bg-white shadow-2xl dark:bg-slate-950", className)}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          {title ? <h2 className="font-extrabold text-slate-950 dark:text-white">{title}</h2> : <span />}
          <IconButton label="Close bottom sheet" icon={<X className="h-4 w-4" />} onClick={onClose} />
        </header>
        <div className="max-h-[62dvh] overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <footer className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function Tooltip({ label, children, className = "" }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}

export function Popover({ trigger, children, align = "left", className = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <span onClick={() => setOpen((current) => !current)}>{trigger}</span>
      {open ? (
        <div
          className={cn(
            "absolute top-full z-40 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm action",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    />
  );
}

export function CommandMenu({
  open,
  onClose,
  groups = [],
  onSelect,
  placeholder = "Search orders, users, vendors, products...",
}) {
  const [query, setQuery] = useState("");
  useOverlayLifecycle(open, onClose);

  const filteredGroups = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        items: loweredQuery
          ? group.items.filter((item) => `${item.label} ${item.description || ""} ${item.id || ""}`.toLowerCase().includes(loweredQuery))
          : group.items,
      }))
      .filter((group) => group.items.length);
  }, [groups, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-4">
      <button type="button" aria-label="Close command menu backdrop" className="absolute inset-0" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="relative mx-auto mt-[10vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            prefix={<Search className="h-4 w-4" />}
            autoFocus
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredGroups.length ? (
            filteredGroups.map((group) => (
              <div key={group.label} className="py-2">
                <p className="px-3 py-1 text-xs font-extrabold uppercase text-slate-400">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id || item.label}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
                    onClick={() => {
                      onSelect?.(item);
                      onClose?.();
                    }}
                  >
                    {item.icon ? <span className="text-slate-500">{item.icon}</span> : null}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
                      {item.description ? <span className="block truncate text-xs text-slate-500">{item.description}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-slate-500">No results found</div>
          )}
        </div>
      </section>
    </div>
  );
}
