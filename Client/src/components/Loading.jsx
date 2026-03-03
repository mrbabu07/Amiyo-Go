import { motion } from "framer-motion";

export default function Loading({
  text = "Loading...",
  size = "default",
  fullScreen = false,
  variant = "spinner",
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const LoadingSpinner = () => (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} border-4 border-primary-200 rounded-full`}
      ></div>
      <div
        className={`${sizeClasses[size]} border-4 border-primary-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0`}
      ></div>
    </div>
  );

  const LoadingDots = () => (
    <div className="flex space-x-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 bg-primary rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );

  const LoadingPulse = () => (
    <motion.div
      className={`${sizeClasses[size]} bg-primary rounded-full`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
      }}
    />
  );

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case "dots":
        return <LoadingDots />;
      case "pulse":
        return <LoadingPulse />;
      case "skeleton":
        return <LoadingSkeleton />;
      default:
        return <LoadingSpinner />;
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center space-y-4"
    >
      {renderVariant()}
      {text && variant !== "skeleton" && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 font-medium text-center"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">{content}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      {content}
    </div>
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-square bg-gray-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

// Order Card Skeleton
export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}
