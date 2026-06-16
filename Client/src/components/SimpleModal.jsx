// Simple modal component without framer-motion dependency
import { useEffect } from "react";
import { X } from "lucide-react";

export default function SimpleModal({
  isOpen,
  onClose,
  title,
  children,
  size = "default",
  showCloseButton = true,
  closeOnBackdrop = true,
  className = "",
}) {
  const sizes = {
    sm: "sm:max-w-md",
    default: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-[min(96vw,1180px)]",
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex min-h-[calc(var(--vh,1vh)*100)] items-end justify-center px-2 pb-0 pt-6 sm:items-center sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm transition-opacity"
          onClick={closeOnBackdrop ? onClose : undefined}
        />

        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title || "Dialog"}
          className={`modal-content relative flex max-h-[calc(var(--vh,1vh)*100-0.75rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/80 bg-white shadow-[0_-18px_55px_rgba(15,23,42,0.22)] ring-1 ring-gray-950/5 transition-all dark:border-gray-800 dark:bg-gray-900 dark:ring-white/10 sm:max-h-[min(88vh,900px)] sm:rounded-2xl sm:shadow-2xl ${sizes[size]} ${className}`}
        >
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-700 sm:hidden" aria-hidden="true" />
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="modal-header sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:px-6 sm:py-4">
              {title && (
                <h2 className="min-w-0 truncate text-lg font-bold text-gray-950 dark:text-white sm:text-xl">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="modal-body min-h-0 flex-1 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
