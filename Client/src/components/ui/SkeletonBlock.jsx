import { cx } from "./designTokens";

export default function SkeletonBlock({
  className = "",
  rounded = "rounded-lg",
}) {
  return (
    <div
      className={cx(
        "skeleton-shimmer skeleton-surface min-h-4",
        rounded,
        className,
      )}
    />
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <SkeletonBlock key={columnIndex} className="h-9" />
          ))}
        </div>
      ))}
    </div>
  );
}
