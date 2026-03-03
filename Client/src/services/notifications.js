import toast from "react-hot-toast";

// Custom toast styles following design system
const toastStyles = {
  success: {
    style: {
      background: "#22C55E",
      color: "white",
      fontWeight: "600",
      borderRadius: "12px",
      padding: "16px 20px",
    },
    iconTheme: {
      primary: "white",
      secondary: "#22C55E",
    },
  },
  error: {
    style: {
      background: "#EF4444",
      color: "white",
      fontWeight: "600",
      borderRadius: "12px",
      padding: "16px 20px",
    },
    iconTheme: {
      primary: "white",
      secondary: "#EF4444",
    },
  },
  loading: {
    style: {
      background: "#3B82F6",
      color: "white",
      fontWeight: "600",
      borderRadius: "12px",
      padding: "16px 20px",
    },
    iconTheme: {
      primary: "white",
      secondary: "#3B82F6",
    },
  },
  custom: {
    style: {
      background: "white",
      color: "#374151",
      fontWeight: "600",
      borderRadius: "12px",
      padding: "16px 20px",
      border: "2px solid #10B981",
    },
  },
};

// Notification service
export const notify = {
  // Success notifications
  success: (message, options = {}) => {
    return toast.success(message, {
      ...toastStyles.success,
      duration: 4000,
      position: "top-right",
      ...options,
    });
  },

  // Error notifications
  error: (message, options = {}) => {
    return toast.error(message, {
      ...toastStyles.error,
      duration: 5000,
      position: "top-right",
      ...options,
    });
  },

  // Loading notifications
  loading: (message, options = {}) => {
    return toast.loading(message, {
      ...toastStyles.loading,
      position: "top-right",
      ...options,
    });
  },

  // Custom notifications
  custom: (message, options = {}) => {
    return toast(message, {
      ...toastStyles.custom,
      duration: 4000,
      position: "top-right",
      ...options,
    });
  },

  // Promise-based notifications
  promise: (promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || "Loading...",
        success: messages.success || "Success!",
        error: messages.error || "Something went wrong!",
      },
      {
        success: toastStyles.success,
        error: toastStyles.error,
        loading: toastStyles.loading,
        position: "top-right",
        ...options,
      },
    );
  },

  // Dismiss all toasts
  dismiss: (toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  // E-commerce specific notifications
  cart: {
    added: (productName) => notify.success(`${productName} added to cart! 🛒`),
    removed: (productName) => notify.error(`${productName} removed from cart`),
    updated: () => notify.success("Cart updated successfully"),
    cleared: () => notify.success("Cart cleared"),
  },

  wishlist: {
    added: (productName) =>
      notify.success(`${productName} added to wishlist! ❤️`),
    removed: (productName) =>
      notify.error(`${productName} removed from wishlist`),
  },

  order: {
    placed: (orderId) =>
      notify.success(`Order #${orderId} placed successfully! 🎉`),
    updated: (status) => notify.success(`Order status updated to ${status}`),
    cancelled: () => notify.error("Order cancelled"),
  },

  auth: {
    login: (userName) => notify.success(`Welcome back, ${userName}! 👋`),
    logout: () => notify.success("Logged out successfully"),
    register: () => notify.success("Account created successfully! 🎉"),
    error: (message) => notify.error(message),
  },

  admin: {
    productAdded: () => notify.success("Product added successfully! ✨"),
    productUpdated: () => notify.success("Product updated successfully"),
    productDeleted: () => notify.success("Product deleted"),
    categoryAdded: () => notify.success("Category added successfully"),
    orderUpdated: () => notify.success("Order status updated"),
  },
};

// Bangladesh-specific notifications
export const bdNotify = {
  payment: {
    bkash: () =>
      notify.custom("Redirecting to bKash payment... 📱", {
        icon: "📱",
        style: { ...toastStyles.custom.style, borderColor: "#E91E63" },
      }),
    nagad: () =>
      notify.custom("Redirecting to Nagad payment... 💳", {
        icon: "💳",
        style: { ...toastStyles.custom.style, borderColor: "#FF6B35" },
      }),
    cod: () => notify.success("Cash on Delivery selected 💵"),
  },

  delivery: {
    dhaka: () => notify.success("Free delivery in Dhaka! 🚚"),
    outside: () =>
      notify.custom("৳100 delivery charge for outside Dhaka", {
        icon: "🚛",
      }),
  },
};

export default notify;
