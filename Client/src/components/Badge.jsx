import { motion } from "framer-motion";

export default function Badge({
  children,
  variant = "default",
  size = "default",
  className = "",
  animate = false,
  ...props
}) {
  const variants = {
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    primary: "bg-primary-600 text-white dark:bg-primary-500 dark:text-white",
    secondary: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    dark: "bg-gray-800 text-white dark:bg-gray-700 dark:text-white",
    light:
      "bg-white text-gray-800 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    default: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const baseClasses = `
    inline-flex items-center font-medium rounded-full
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `.trim();

  const BadgeComponent = animate ? motion.span : "span";

  const animationProps = animate
    ? {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
        transition: { type: "spring", stiffness: 500, damping: 30 },
      }
    : {};

  return (
    <BadgeComponent className={baseClasses} {...animationProps} {...props}>
      {children}
    </BadgeComponent>
  );
}

// Status Badge for Orders
export function StatusBadge({ status, ...props }) {
  const statusConfig = {
    pending: { variant: "warning", text: "Pending", icon: "⏳" },
    processing: { variant: "info", text: "Processing", icon: "🔄" },
    shipped: { variant: "primary", text: "Shipped", icon: "📦" },
    delivered: { variant: "success", text: "Delivered", icon: "✅" },
    cancelled: { variant: "danger", text: "Cancelled", icon: "❌" },
    returned: { variant: "warning", text: "Returned", icon: "↩️" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} {...props}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </Badge>
  );
}

// Stock Badge
export function StockBadge({ stock, lowStockThreshold = 5, ...props }) {
  if (stock === 0) {
    return (
      <Badge variant="danger" {...props}>
        Out of Stock
      </Badge>
    );
  }

  if (stock <= lowStockThreshold) {
    return (
      <Badge variant="warning" {...props}>
        Low Stock ({stock})
      </Badge>
    );
  }

  return (
    <Badge variant="success" {...props}>
      In Stock ({stock})
    </Badge>
  );
}

// Discount Badge
export function DiscountBadge({ discount, ...props }) {
  return (
    <Badge variant="danger" className="absolute top-2 left-2 z-10" {...props}>
      -{discount}%
    </Badge>
  );
}

// New Badge
export function NewBadge({ ...props }) {
  return (
    <Badge
      variant="primary"
      className="absolute top-2 left-2 z-10"
      animate
      {...props}
    >
      ✨ New
    </Badge>
  );
}

// Featured Badge
export function FeaturedBadge({ ...props }) {
  return (
    <Badge
      variant="warning"
      className="absolute top-2 left-2 z-10"
      animate
      {...props}
    >
      ⭐ Featured
    </Badge>
  );
}

// Sale Badge
export function SaleBadge({ ...props }) {
  return (
    <Badge
      variant="danger"
      className="absolute top-2 left-2 z-10 animate-pulse"
      {...props}
    >
      🔥 Sale
    </Badge>
  );
}

// Notification Badge (for cart count, etc.)
export function NotificationBadge({ count, max = 99, ...props }) {
  if (!count || count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge
      variant="danger"
      size="sm"
      className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold"
      animate
      {...props}
    >
      {displayCount}
    </Badge>
  );
}

// Payment Method Badge
export function PaymentBadge({ method, ...props }) {
  const paymentConfig = {
    cod: { variant: "success", text: "Cash on Delivery", icon: "💵" },
    bkash: { variant: "primary", text: "bKash", icon: "📱" },
    nagad: { variant: "warning", text: "Nagad", icon: "💳" },
    card: { variant: "info", text: "Card Payment", icon: "💳" },
    bank: { variant: "secondary", text: "Bank Transfer", icon: "🏦" },
  };

  const config = paymentConfig[method] || paymentConfig.cod;

  return (
    <Badge variant={config.variant} {...props}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </Badge>
  );
}

// Size Badge
export function SizeBadge({ size, selected = false, onClick, ...props }) {
  return (
    <Badge
      variant={selected ? "primary" : "light"}
      className={`cursor-pointer hover:scale-105 transition-transform ${selected ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-primary-400 dark:ring-offset-gray-950" : ""}`}
      onClick={onClick}
      {...props}
    >
      {size}
    </Badge>
  );
}

// Color Badge
export function ColorBadge({ color, selected = false, onClick, ...props }) {
  return (
    <div
      className={`w-8 h-8 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform ${
        selected
          ? "border-primary-500 ring-2 ring-primary-500 ring-offset-2 dark:border-primary-400 dark:ring-primary-400 dark:ring-offset-gray-950"
          : "border-gray-300 dark:border-gray-600"
      }`}
      style={{ backgroundColor: color.value }}
      onClick={onClick}
      title={color.name}
      {...props}
    />
  );
}
