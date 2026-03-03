// Simple button component without framer-motion dependency
export default function SimpleButton({
  children,
  variant = "primary",
  size = "default",
  loading = false,
  disabled = false,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
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
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    default: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
    xl: "px-10 py-5 text-xl",
  };

  const LoadingSpinner = () => (
    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
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
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
}
