import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";

export default function Modal({
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

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.98,
      y: 28,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      y: 20,
      transition: {
        duration: 0.16,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="flex min-h-[calc(var(--vh,1vh)*100)] items-end justify-center px-2 pb-0 pt-6 sm:items-center sm:p-4">
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm"
              onClick={(e) => {
                if (closeOnBackdrop && e.target === e.currentTarget) {
                  onClose();
                }
              }}
            />

            {/* Modal */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label={title || "Dialog"}
              className={`modal-content relative flex max-h-[calc(var(--vh,1vh)*100-0.75rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/80 bg-white shadow-[0_-18px_55px_rgba(15,23,42,0.22)] ring-1 ring-gray-950/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/10 sm:max-h-[min(88vh,900px)] sm:rounded-2xl sm:shadow-2xl ${sizes[size]} ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-700 sm:hidden" aria-hidden="true" />
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="modal-header sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:px-6 sm:py-4">
                  {title && (
                    <h2 className="min-w-0 truncate text-lg font-bold text-gray-950 dark:text-white sm:text-xl">
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      aria-label="Close dialog"
                      className="h-10 w-10 shrink-0 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                      icon={<X className="h-5 w-5" aria-hidden="true" />}
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="modal-body min-h-0 flex-1 overflow-y-auto px-4 py-4 overscroll-contain sm:px-6 sm:py-6">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Confirmation Modal
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">{message}</p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Image Modal
export function ImageModal({ isOpen, onClose, src, alt = "Image", title }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      className="bg-transparent shadow-none"
    >
      <div className="relative">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
        />
      </div>
    </Modal>
  );
}

// Quick View Modal for Products
export function QuickViewModal({ isOpen, onClose, product }) {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick View" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden dark:bg-gray-900">
          <img
            src={product.image || product.images?.[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{product.title}</h3>

          <div className="text-3xl font-bold text-primary-600 dark:text-primary-300">
            ৳{product.price?.toFixed(2)}
          </div>

          {product.description && (
            <p className="text-gray-600 dark:text-gray-300">{product.description}</p>
          )}

          {product.sizes?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Available Sizes:</h4>
              <div className="flex gap-2">
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.colors?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Available Colors:</h4>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <div
                    key={color.name}
                    className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                // Add to cart logic
                onClose();
              }}
            >
              Add to Cart
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                // View full product logic
                onClose();
              }}
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
