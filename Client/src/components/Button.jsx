import { motion } from "framer-motion";
import { forwardRef } from "react";

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "default",
      loading = false,
      disabled = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      className = "",
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-primary text-white hover:bg-green-600 focus:ring-primary shadow-md hover:shadow-lg",
      secondary:
        "border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
      danger:
        "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-md hover:shadow-lg",
      success:
        "bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-md hover:shadow-lg",
      warning:
        "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 shadow-md hover:shadow-lg",
      ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
      outline:
        "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
      link: "text-primary hover:text-green-600 underline-offset-4 hover:underline focus:ring-primary",
    };

    const sizes = {
      sm: "px-3 py-2 text-sm",
      default: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
      xl: "px-10 py-5 text-xl",
      icon: "p-2",
    };

    const LoadingSpinner = () => (
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    );

    const buttonClasses = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? "w-full" : ""}
    ${className}
  `.trim();

    const content = (
      <>
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === "left" && (
          <span className={children ? "mr-2" : ""}>{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === "right" && (
          <span className={children ? "ml-2" : ""}>{icon}</span>
        )}
      </>
    );

    return (
      <motion.button
        ref={ref}
        type={type}
        className={buttonClasses}
        onClick={onClick}
        disabled={disabled || loading}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        {...props}
      >
        {content}
      </motion.button>
    );
  },
);

Button.displayName = "Button";

// Icon Button Component
export const IconButton = forwardRef(
  (
    { icon, variant = "ghost", size = "default", className = "", ...props },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={`rounded-full ${className}`}
        {...props}
      >
        {icon}
      </Button>
    );
  },
);

IconButton.displayName = "IconButton";

// Floating Action Button
export const FAB = forwardRef(({ icon, className = "", ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={`fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-50 flex items-center justify-center ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      {...props}
    >
      {icon}
    </motion.button>
  );
});

FAB.displayName = "FAB";

// Button Group
export function ButtonGroup({ children, className = "" }) {
  return (
    <div
      className={`inline-flex rounded-lg shadow-sm ${className}`}
      role="group"
    >
      {children}
    </div>
  );
}

export default Button;
