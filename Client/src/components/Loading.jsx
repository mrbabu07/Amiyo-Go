import { motion } from "framer-motion";
import { PackageCheck } from "lucide-react";

const brandGradient =
  "bg-[linear-gradient(135deg,#1e7098_0%,#22c55e_52%,#f59e0b_100%)]";
const MotionDiv = motion.div;

export default function Loading({
  text = "Preparing your marketplace",
  size = "default",
  fullScreen = false,
  variant = "spinner",
}) {
  const sizeClasses = {
    sm: "h-14 w-14",
    default: "h-18 w-18",
    lg: "h-20 w-20",
    xl: "h-24 w-24",
  };

  const ringClasses = {
    sm: "h-14 w-14",
    default: "h-18 w-18",
    lg: "h-20 w-20",
    xl: "h-24 w-24",
  };

  const LoadingSpinner = () => (
    <div className={`relative ${ringClasses[size] || ringClasses.default}`}>
      <MotionDiv
        className="absolute inset-0 rounded-[1.25rem] border border-primary-100 bg-white shadow-lg shadow-primary-900/10 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30"
        animate={{ scale: [0.96, 1, 0.96] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <MotionDiv
        className={`absolute inset-0 rounded-[1.25rem] p-0.5 ${brandGradient}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      >
        <div className="h-full w-full rounded-[1.1rem] bg-white dark:bg-gray-950" />
      </MotionDiv>
      <div className="absolute inset-2 flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
        <img src="/icons/amiyo-go-icon.svg" alt="" className="h-full w-full object-cover" />
      </div>
      <MotionDiv
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500 text-white shadow-md ring-2 ring-white dark:ring-gray-950"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        <PackageCheck className="h-4 w-4" strokeWidth={2.4} />
      </MotionDiv>
    </div>
  );

  const LoadingDots = () => (
    <div className="flex h-8 items-end gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <MotionDiv
          key={i}
          className={`w-2.5 rounded-full ${i === 2 ? "bg-accent-500" : i === 1 ? "bg-success-500" : "bg-primary-600"}`}
          animate={{
            height: ["0.65rem", "1.55rem", "0.65rem"],
            opacity: [0.65, 1, 0.65],
          }}
          transition={{
            duration: 0.85,
            repeat: Infinity,
            delay: i * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );

  const LoadingPulse = () => (
    <div className={`relative ${sizeClasses[size] || sizeClasses.default}`}>
      <MotionDiv
        className="absolute inset-0 rounded-lg bg-primary-100 dark:bg-primary-950/40"
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-2 flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
        <img src="/icons/amiyo-go-icon.svg" alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="w-full max-w-md animate-pulse space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="h-4 w-28 rounded bg-primary-100 dark:bg-primary-950/60" />
      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="h-14 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-14 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-14 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
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
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center"
      role={variant === "skeleton" ? undefined : "status"}
      aria-live={variant === "skeleton" ? undefined : "polite"}
    >
      {renderVariant()}
      {text && variant !== "skeleton" && (
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5"
        >
          <p className="text-base font-black text-gray-950 dark:text-white">Amiyo-Go</p>
          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{text}</p>
          <div className="mt-4 h-1 w-44 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <MotionDiv
              className={`h-full w-1/2 rounded-full ${brandGradient}`}
              animate={{ x: ["-100%", "220%"] }}
              transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </MotionDiv>
      )}
    </MotionDiv>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-gray-950 dark:bg-gray-950 dark:text-white">
        <div className="relative">
          <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent dark:via-primary-900/70" />
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
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
