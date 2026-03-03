import { useComparison } from "../context/ComparisonContext";

export default function CompareButton({
  product,
  className = "",
  size = "sm",
}) {
  const { addToCompare, removeFromCompare, isInComparison } = useComparison();
  const inComparison = isInComparison(product._id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (inComparison) {
      removeFromCompare(product._id);
    } else {
      addToCompare(product);
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8 p-1.5",
    md: "w-10 h-10 p-2",
    lg: "w-12 h-12 p-2.5",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        ${
          inComparison
            ? "bg-blue-500 text-white border-blue-500"
            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
        }
        border-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center group
        ${className}
      `}
      title={inComparison ? "Remove from comparison" : "Add to comparison"}
    >
      <svg
        className={`${iconSizes[size]} transition-transform group-hover:scale-110`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </button>
  );
}
