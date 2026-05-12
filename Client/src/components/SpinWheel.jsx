import { useRef, useState } from "react";
import { spinRewardWheel } from "../services/api";

const colors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-gray-500",
  "bg-indigo-500",
];

export default function SpinWheel({ segments = [], onWin, onClose }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const wheelRef = useRef(null);

  const displaySegments = segments.length > 0
    ? segments
    : [{ id: "empty", label: "NO REWARD", type: "none" }];

  const spinWheel = async () => {
    if (isSpinning || result) return;

    setIsSpinning(true);
    setError("");

    try {
      const response = await spinRewardWheel();
      const prize = response.data.data.prize;
      const serverSegments = response.data.data.segments || displaySegments;
      const winningIndex = Math.max(
        0,
        serverSegments.findIndex((segment) => segment.id === prize.id),
      );
      const segmentAngle = 360 / serverSegments.length;
      const targetAngle = winningIndex * segmentAngle + segmentAngle / 2;
      const rotation = 1440 + (360 - targetAngle);

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${rotation}deg)`;
      }

      setTimeout(() => {
        setIsSpinning(false);
        setResult(prize);
        onWin?.(prize);
      }, 3000);
    } catch (err) {
      setIsSpinning(false);
      setError(err.response?.data?.error || "Unable to spin right now");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Spin to Win
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative mx-auto mb-6 w-72 h-72">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-gray-900" />

          <div
            ref={wheelRef}
            className="w-full h-full rounded-full border-8 border-gray-200 overflow-hidden transition-transform duration-[3000ms] ease-out relative"
          >
            {displaySegments.map((segment, index) => {
              const angle = 360 / displaySegments.length;
              return (
                <div
                  key={segment.id || segment.label}
                  className={`absolute inset-0 ${colors[index % colors.length]} text-white`}
                  style={{
                    clipPath: "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%)",
                    transform: `rotate(${index * angle}deg)`,
                    transformOrigin: "50% 50%",
                  }}
                >
                  <span
                    className="absolute top-9 left-1/2 text-xs font-bold text-center w-24 -ml-12"
                    style={{ transform: `rotate(${angle / 2}deg)` }}
                  >
                    {segment.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {result ? (
          <div className="text-center">
            <div className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
              {result.type === "coupon" ? `You won ${result.label}` : "Try again next time"}
            </div>
            {result.couponCode && (
              <div className="mb-4 rounded-lg border border-dashed border-green-400 bg-green-50 px-4 py-3 text-green-800">
                Coupon code: <span className="font-mono font-bold">{result.couponCode}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={spinWheel}
            disabled={isSpinning || displaySegments[0]?.id === "empty"}
            className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSpinning ? "Spinning..." : "Spin Now"}
          </button>
        )}
      </div>
    </div>
  );
}
