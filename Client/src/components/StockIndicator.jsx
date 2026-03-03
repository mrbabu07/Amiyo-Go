export default function StockIndicator({ stock, className = "" }) {
  const getStockInfo = () => {
    if (stock === 0) {
      return {
        text: "Out of Stock",
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: "❌",
      };
    } else if (stock <= 5) {
      return {
        text: `Only ${stock} left in stock`,
        className:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        icon: "⚡",
      };
    } else if (stock <= 10) {
      return {
        text: `${stock} in stock`,
        className:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: "⚠️",
      };
    } else {
      return {
        text: "In Stock",
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: "✅",
      };
    }
  };

  const stockInfo = getStockInfo();

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${stockInfo.className} ${className}`}
    >
      <span>{stockInfo.icon}</span>
      {stockInfo.text}
    </span>
  );
}
