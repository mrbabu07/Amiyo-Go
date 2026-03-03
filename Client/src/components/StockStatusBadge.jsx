export default function StockStatusBadge({ stock, className = "" }) {
  const getStockStatus = () => {
    if (stock === 0) {
      return {
        text: "Out of Stock",
        color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        icon: "❌",
      };
    } else if (stock <= 5) {
      return {
        text: `Only ${stock} left`,
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
        icon: "⚠️",
      };
    } else if (stock <= 10) {
      return {
        text: "Low Stock",
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        icon: "📦",
      };
    } else {
      return {
        text: "In Stock",
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        icon: "✅",
      };
    }
  };

  const status = getStockStatus();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color} ${className}`}
    >
      <span>{status.icon}</span>
      {status.text}
    </span>
  );
}
