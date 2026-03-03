import { useState, useRef } from "react";
import useAuth from "../hooks/useAuth";

const wheelSegments = [
  { label: "5% OFF", value: 5, color: "bg-red-500" },
  { label: "10% OFF", value: 10, color: "bg-blue-500" },
  { label: "15% OFF", value: 15, color: "bg-green-500" },
  { label: "20% OFF", value: 20, color: "bg-yellow-500" },
  { label: "FREE SHIPPING", value: "free_shipping", color: "bg-purple-500" },
  { label: "25% OFF", value: 25, color: "bg-pink-500" },
  { label: "TRY AGAIN", value: 0, color: "bg-gray-500" },
  { label: "30% OFF", value: 30, color: "bg-indigo-500" },
];

export default function SpinWheel({ onWin, onClose }) {
  const { user } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [result, setResult] = useState(null);
  const wheelRef = useRef(null);

  const spinWheel = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);

    // Random rotation between 1440 and 2160 degrees (4-6 full rotations)
    const minRotation = 1440;
    const maxRotation = 2160;
    const rotation = Math.random() * (maxRotation - minRotation) + minRotation;

    // Calculate which segment we land on
    const segmentAngle = 360 / wheelSegments.length;
    const normalizedRotation = rotation % 360;
    const segmentIndex =
      Math.floor((360 - normalizedRotation) / segmentAngle) %
      wheelSegments.length;
    const winningSegment = wheelSegments[segmentIndex];

    // Apply rotation
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${rotation}deg)`;
    }

    // Show result after animation
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setResult(winningSegment);

      if (winningSegment.value !== 0) {
        onWin(winningSegment);
      }
    }, 3000);
  };

  const resetWheel = () => {
    setHasSpun(false);
    setResult(null);
    if (wheelRef.current) {
      wheelRef.current.style.transform = "rotate(0deg)";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🎰 Spin to Win!
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Spin the wheel for a chance to win amazing discounts!
          </p>
        </div>

        {/* Wheel Container */}
        <div className="relative mx-auto w-64 h-64 mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-800 dark:border-b-white"></div>
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className={`w-64 h-64 rounded-full border-4 border-gray-800 dark:border-white relative overflow-hidden transition-transform duration-3000 ease-out ${
              isSpinning ? "animate-spin-slow" : ""
            }`}
            style={{
              background: `conic-gradient(${wheelSegments
                .map((segment, index) => {
                  const startAngle = (index * 360) / wheelSegments.length;
                  const endAngle = ((index + 1) * 360) / wheelSegments.length;
                  return `${segment.color.replace("bg-", "")} ${startAngle}deg ${endAngle}deg`;
                })
                .join(", ")})`,
            }}
          >
            {/* Segment Labels */}
            {wheelSegments.map((segment, index) => {
              const angle =
                (index * 360) / wheelSegments.length +
                360 / wheelSegments.length / 2;
              return (
                <div
                  key={index}
                  className="absolute w-full h-full flex items-center justify-center text-white font-bold text-xs"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: "center",
                  }}
                >
                  <span
                    className="absolute"
                    style={{
                      top: "20px",
                      transform: `rotate(${-angle}deg)`,
                    }}
                  >
                    {segment.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center px-4 py-2 rounded-full text-white font-bold ${result.color}`}
            >
              {result.value === 0 ? (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Better luck next time!
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  You won {result.label}!
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!hasSpun ? (
            <button
              onClick={spinWheel}
              disabled={isSpinning}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpinning ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Spinning...
                </div>
              ) : (
                "Spin the Wheel!"
              )}
            </button>
          ) : (
            <>
              {result?.value === 0 && (
                <button onClick={resetWheel} className="flex-1 btn-secondary">
                  Try Again
                </button>
              )}
              <button onClick={onClose} className="flex-1 btn-primary">
                {result?.value === 0 ? "Close" : "Claim Prize"}
              </button>
            </>
          )}
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          * One spin per user per day. Prizes are valid for 24 hours.
        </p>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s ease-out;
        }
        .duration-3000 {
          transition-duration: 3000ms;
        }
      `}</style>
    </div>
  );
}
