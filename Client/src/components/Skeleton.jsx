export default function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  lines = 1,
  animation = "pulse",
}) {
  const baseClasses = "bg-gray-200 dark:bg-gray-700";

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-pulse", // Can be enhanced with wave animation
    none: "",
  };

  const variantClasses = {
    rectangular: "rounded",
    circular: "rounded-full",
    text: "rounded h-4",
    card: "rounded-xl",
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses.text} ${animationClasses[animation]}`}
            style={{
              width: index === lines - 1 ? "75%" : "100%",
              ...style,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components
export const ProductCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4">
    <Skeleton variant="card" className="aspect-square mb-4" />
    <Skeleton variant="text" lines={2} className="mb-2" />
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width="60px" />
      <Skeleton variant="text" width="80px" />
    </div>
  </div>
);

export const ProductDetailSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Image Skeleton */}
      <div className="space-y-4">
        <Skeleton variant="card" className="aspect-square" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="w-20 h-20" />
          ))}
        </div>
      </div>

      {/* Product Info Skeleton */}
      <div className="space-y-6">
        <Skeleton variant="text" lines={2} className="text-2xl" />
        <div className="flex items-center gap-4">
          <Skeleton variant="text" width="100px" />
          <Skeleton variant="text" width="120px" />
        </div>
        <Skeleton variant="text" lines={4} />

        {/* Size Selection */}
        <div className="space-y-3">
          <Skeleton variant="text" width="80px" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="w-12 h-10" />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <Skeleton variant="rectangular" className="flex-1 h-12" />
          <Skeleton variant="rectangular" className="flex-1 h-12" />
        </div>
      </div>
    </div>
  </div>
);

export const CategoryPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    {/* Hero Banner Skeleton */}
    <Skeleton variant="rectangular" className="h-64 md:h-80 w-full" />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toolbar Skeleton */}
      <div className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl">
        <Skeleton variant="text" width="150px" />
        <div className="flex gap-4">
          <Skeleton variant="rectangular" width="120px" height="40px" />
          <Skeleton variant="rectangular" width="80px" height="40px" />
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const ReviewSkeleton = () => (
  <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
    <div className="flex items-start gap-3 mb-3">
      <Skeleton variant="circular" className="w-10 h-10" />
      <div className="flex-1">
        <Skeleton variant="text" width="120px" className="mb-2" />
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="w-4 h-4" />
            ))}
          </div>
          <Skeleton variant="text" width="80px" />
        </div>
      </div>
    </div>
    <Skeleton variant="text" lines={3} />
  </div>
);
