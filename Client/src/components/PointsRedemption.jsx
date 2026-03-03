import { useState } from "react";
import { getCurrentUserToken } from "../utils/auth";

export default function PointsRedemption({
  userLoyalty,
  orderTotal,
  onPointsApplied,
  onPointsRemoved,
  appliedPoints,
}) {
  const [pointsToRedeem, setPointsToRedeem] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState("");

  const maxRedeemablePoints = Math.min(
    userLoyalty?.points || 0,
    Math.floor(orderTotal * 110 * 100), // Can't redeem more than order total (100 points = 1 BDT, orderTotal is in USD)
  );

  const handleRedeemPoints = async () => {
    const points = parseInt(pointsToRedeem);

    if (!points || points < 100) {
      setError("Minimum 100 points required");
      return;
    }

    if (points > maxRedeemablePoints) {
      setError(`Maximum ${maxRedeemablePoints} points can be redeemed`);
      return;
    }

    if (points > (userLoyalty?.points || 0)) {
      setError("Insufficient points");
      return;
    }

    setIsRedeeming(true);
    setError("");

    // Don't actually redeem points yet - just calculate discount
    // Points will be redeemed when order is placed
    // 100 points = 1 BDT = 1/110 USD
    const discountInBDT = points / 100; // 100 points = 1 BDT
    const discountAmount = discountInBDT / 110; // Convert BDT to USD for order calculation

    onPointsApplied({
      points,
      discountAmount,
      remainingPoints: userLoyalty.points - points,
    });

    setPointsToRedeem("");
    setIsRedeeming(false);
  };

  const handleRemovePoints = () => {
    onPointsRemoved();
    setError("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleRedeemPoints();
    }
  };

  if (!userLoyalty || userLoyalty.points < 100) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">
            {userLoyalty
              ? `You need at least 100 points to redeem. You have ${userLoyalty.points} points.`
              : "Loading loyalty points..."}
          </span>
        </div>
      </div>
    );
  }

  if (appliedPoints) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
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
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Points Redeemed: {appliedPoints.points} points
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                You saved ৳{(appliedPoints.points / 100).toFixed(2)}!
              </p>
            </div>
          </div>
          <button
            onClick={handleRemovePoints}
            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Redeem Loyalty Points
        </h4>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Available: {userLoyalty.points} points
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter points to redeem"
            min="100"
            max={maxRedeemablePoints}
            step="100"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            disabled={isRedeeming}
          />
        </div>
        <button
          onClick={handleRedeemPoints}
          disabled={
            isRedeeming || !pointsToRedeem || parseInt(pointsToRedeem) < 100
          }
          className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRedeeming ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Redeeming...
            </>
          ) : (
            "Redeem"
          )}
        </button>
      </div>

      {/* Quick Redeem Options */}
      <div className="flex gap-2">
        {[100, 500, 1000].map((points) => (
          <button
            key={points}
            onClick={() => setPointsToRedeem(points.toString())}
            disabled={points > maxRedeemablePoints}
            className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {points} pts (৳{(points / 100).toFixed(2)})
          </button>
        ))}
        {maxRedeemablePoints > 1000 && (
          <button
            onClick={() => setPointsToRedeem(maxRedeemablePoints.toString())}
            className="px-3 py-1 text-xs border border-primary-500 text-primary-600 dark:text-primary-400 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Max ({maxRedeemablePoints} pts)
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        💡 100 points = ৳1 discount. Minimum 100 points required.
      </div>
    </div>
  );
}
