import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: "success", // success, error, warning, info
      title: "",
      message: "",
      duration: 4000,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message, options = {}) => {
      return addToast({
        type: "success",
        message,
        ...options,
      });
    },
    [addToast],
  );

  const error = useCallback(
    (message, options = {}) => {
      return addToast({
        type: "error",
        message,
        duration: 6000, // Longer for errors
        ...options,
      });
    },
    [addToast],
  );

  const warning = useCallback(
    (message, options = {}) => {
      return addToast({
        type: "warning",
        message,
        ...options,
      });
    },
    [addToast],
  );

  const info = useCallback(
    (message, options = {}) => {
      return addToast({
        type: "info",
        message,
        ...options,
      });
    },
    [addToast],
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};
