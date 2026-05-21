import { useState } from "react";
import { usePlatformConfig } from "../context/PlatformConfigContext";

export default function PointsRedemption({
  userLoyalty,
  orderTotal,
  onPointsApplied,
  onPointsRemoved,
  appliedPoints,
}) {
  const { isFeatureEnabled } = usePlatformConfig();
  const [pointsToRedeem, setPointsToRedeem] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState("");

  const pointsToTaka = (points) =>
    (Number(points) || 0) * Number(userLoyalty?.redemption?.valuePerPoint || 0.01);
  const rawMaxRedeemablePoints = Math.min(
    userLoyalty?.points || 0,
    Math.floor((Number(orderTotal) || 0) * 100),
  );
  const maxRedeemablePoints = Math.floor(rawMaxRedeemablePoints / 100) * 100;
  const quickRedeemPoints =
    maxRedeemablePoints >= 100
      ? Math.min(200, Math.floor(maxRedeemablePoints / 100) * 100)
      : 0;
  const coinRedemptionEnabled =
    isFeatureEnabled("loyaltyCoins") && isFeatureEnabled("coinRedemption");

  const applyPoints = (points) => {
    onPointsApplied({
      points,
      discountAmount: pointsToTaka(points),
      remainingPoints: (userLoyalty?.points || 0) - points,
    });
  };

  const handleRedeemPoints = async () => {
    const points = parseInt(pointsToRedeem, 10);

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

    applyPoints(points);

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

  const handleSliderChange = (event) => {
    const value = Math.floor(Number(event.target.value || 0) / 100) * 100;
    setPointsToRedeem(String(Math.min(Math.max(value, 100), maxRedeemablePoints)));
  };

  if (!coinRedemptionEnabled) {
    return null;
  }

  if (!userLoyalty || userLoyalty.points < 100 || maxRedeemablePoints < 100) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <svg
            className="h-5 w-5"
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
              ? `You need at least 100 redeemable points. You have ${userLoyalty.points} points.`
              : "Loading loyalty points..."}
          </span>
        </div>
      </div>
    );
  }

  if (appliedPoints) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
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
                You saved BDT {pointsToTaka(appliedPoints.points).toFixed(2)}!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemovePoints}
            className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
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

      {quickRedeemPoints > 0 && (
        <button
          type="button"
          onClick={() => applyPoints(quickRedeemPoints)}
          className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100"
        >
          <span>
            <span className="block text-sm font-semibold text-blue-900">
              Use {quickRedeemPoints} coins
            </span>
            <span className="text-xs text-blue-700">
              Save BDT {pointsToTaka(quickRedeemPoints).toFixed(2)} on this order
            </span>
          </span>
          <span className="text-sm font-bold text-blue-700">Apply</span>
        </button>
      )}

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
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            disabled={isRedeeming}
          />
        </div>
        <button
          type="button"
          onClick={handleRedeemPoints}
          disabled={isRedeeming || !pointsToRedeem || parseInt(pointsToRedeem, 10) < 100}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRedeeming ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Use coins</span>
          <span>
            {pointsToRedeem || 0} pts = BDT {pointsToTaka(pointsToRedeem || 0).toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="100"
          max={maxRedeemablePoints}
          step="100"
          value={pointsToRedeem || 100}
          onChange={handleSliderChange}
          className="w-full accent-primary-500"
        />
      </div>

      <div className="flex gap-2">
        {[100, 500, 1000].map((points) => (
          <button
            key={points}
            type="button"
            onClick={() => setPointsToRedeem(points.toString())}
            disabled={points > maxRedeemablePoints}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            {points} pts (BDT {pointsToTaka(points).toFixed(2)})
          </button>
        ))}
        {maxRedeemablePoints > 1000 && (
          <button
            type="button"
            onClick={() => setPointsToRedeem(maxRedeemablePoints.toString())}
            className="rounded-md border border-primary-500 px-3 py-1 text-xs text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            Max ({maxRedeemablePoints} pts)
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <svg
            className="h-4 w-4"
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
        100 points = BDT 1 discount. Minimum 100 points required.
      </div>
    </div>
  );
}
