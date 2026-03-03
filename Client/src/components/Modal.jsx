import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
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
    sm: "max-w-md",
    default: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50,
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
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
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
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${sizes[size]} ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  {title && (
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      icon={
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      }
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">{children}</div>
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
        <p className="text-gray-600">{message}</p>

        <div className="flex gap-3 justify-end">
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
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={product.image || product.images?.[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">{product.title}</h3>

          <div className="text-3xl font-bold text-primary">
            ৳{product.price?.toFixed(2)}
          </div>

          {product.description && (
            <p className="text-gray-600">{product.description}</p>
          )}

          {product.sizes?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Available Sizes:</h4>
              <div className="flex gap-2">
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.colors?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Available Colors:</h4>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <div
                    key={color.name}
                    className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md text-sm"
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
