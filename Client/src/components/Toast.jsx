import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useToast } from "../context/ToastContext";

const Toast = ({ toast }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const getToastStyles = () => {
    const baseStyles =
      "flex items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm transition-all duration-300 transform";

    const typeStyles = {
      success:
        "bg-green-50/95 border-green-200 text-green-800 dark:bg-green-900/95 dark:border-green-800 dark:text-green-200",
      error:
        "bg-red-50/95 border-red-200 text-red-800 dark:bg-red-900/95 dark:border-red-800 dark:text-red-200",
      warning:
        "bg-yellow-50/95 border-yellow-200 text-yellow-800 dark:bg-yellow-900/95 dark:border-yellow-800 dark:text-yellow-200",
      info: "bg-blue-50/95 border-blue-200 text-blue-800 dark:bg-blue-900/95 dark:border-blue-800 dark:text-blue-200",
    };

    const animationStyles = isVisible
      ? "translate-y-0 opacity-100 scale-100"
      : "translate-y-3 opacity-0 scale-95";

    return `${baseStyles} ${typeStyles[toast.type]} ${animationStyles}`;
  };

  const getIcon = () => {
    const icons = {
      success: <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />,
      error: <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />,
      warning: <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />,
      info: <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />,
    };
    return icons[toast.type];
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm mb-1">{toast.title}</p>
        )}
        <p className="text-sm leading-relaxed">{toast.message}</p>
      </div>
    </div>
  );
};

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 mx-auto w-auto max-w-sm space-y-3 lg:bottom-6">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
