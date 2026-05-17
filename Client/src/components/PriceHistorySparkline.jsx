import { TrendingDown, TrendingUp } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";

export default function PriceHistorySparkline({ history = [] }) {
  const { formatPrice } = useCurrency();
  const points = history
    .map((item) => ({ date: item.date, price: Number(item.price || 0) }))
    .filter((item) => item.price > 0)
    .slice(-30);

  if (points.length < 2) return null;

  const prices = points.map((item) => item.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const width = 220;
  const height = 64;
  const path = points
    .map((item, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((item.price - min) / range) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const first = points[0].price;
  const last = points[points.length - 1].price;
  const isDown = last <= first;
  const Icon = isDown ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Price history
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last 30 days
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isDown
              ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {isDown ? "Better deal" : "Price up"}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible">
        <path
          d={path}
          fill="none"
          stroke={isDown ? "#16A34A" : "#D97706"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <circle
          cx={width}
          cy={height - ((last - min) / range) * (height - 12) - 6}
          r="4"
          fill={isDown ? "#16A34A" : "#D97706"}
        />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatPrice(min)} low</span>
        <span>Now {formatPrice(last)}</span>
      </div>
    </div>
  );
}
