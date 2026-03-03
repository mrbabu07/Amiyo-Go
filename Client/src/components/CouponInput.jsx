import { useState } from "react";
import { validateCoupon } from "../services/api";

export default function CouponInput({
  orderTotal,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
}) {
  const [couponCode, setCouponCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const response = await validateCoupon(couponCode.trim(), orderTotal);
      const { coupon, discountAmount, finalTotal } = response.data.data;

      onCouponApplied({
        code: coupon.code,
        discountAmount,
        finalTotal,
        coupon,
      });

      setCouponCode("");
    } catch (error) {
      setError(error.response?.data?.error || "Invalid coupon code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    setError("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleApplyCoupon();
    }
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
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
              <p className="text-sm font-medium text-green-800">
                Coupon Applied: {appliedCoupon.code}
              </p>
              <p className="text-xs text-green-600">
                You saved ৳{appliedCoupon.discountAmount}!
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveCoupon}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter coupon code"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            disabled={isValidating}
          />
        </div>
        <button
          onClick={handleApplyCoupon}
          disabled={isValidating || !couponCode.trim()}
          className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isValidating ? (
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
              Validating...
            </>
          ) : (
            "Apply"
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
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

      <div className="text-xs text-gray-500">
        💡 Have a coupon? Enter it above to save on your order!
      </div>
    </div>
  );
}
