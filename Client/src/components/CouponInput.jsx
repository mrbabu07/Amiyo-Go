import { useState } from "react";
import { validateCoupon } from "../services/api";

export default function CouponInput({
  orderTotal,
  items = [],
  deliveryCharge = 0,
  deliveryBreakdown = [],
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
  onApplyCode,
  isApplying = false,
}) {
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setError("");

    try {
      if (onApplyCode) {
        await onApplyCode(couponCode.trim());
      } else {
        const response = await validateCoupon(couponCode.trim(), orderTotal, items, {
          deliveryCharge,
          deliveryBreakdown,
        });
        const { coupon, discountAmount, finalTotal, scopeVendorId, vendorSubtotal, vendorDeliveryCharge } =
          response.data.data;

        onCouponApplied({
          code: coupon.code,
          discountAmount,
          finalTotal,
          coupon,
          scopeVendorId: scopeVendorId || coupon.vendorId || null,
          vendorSubtotal: vendorSubtotal || null,
          vendorDeliveryCharge: vendorDeliveryCharge || null,
        });
      }

      setCouponCode("");
    } catch (applyError) {
      setError(applyError.response?.data?.error || "Invalid coupon code");
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
    const isVendorVoucher = appliedCoupon.coupon?.type === "vendor_voucher";

    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-5 w-5 text-green-600"
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
                {isVendorVoucher
                  ? `Store Voucher Applied: ${appliedCoupon.code}`
                  : `Coupon Applied: ${appliedCoupon.code}`}
              </p>
              <p className="text-xs text-green-600">
                You saved BDT {appliedCoupon.discountAmount}!
              </p>
              {isVendorVoucher && (
                <p className="text-xs text-green-700">
                  Store voucher for {appliedCoupon.coupon.vendorName || "this store"}
                </p>
              )}
              <p className="mt-1 text-xs text-green-700">
                Only one coupon or voucher can be used per order.
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveCoupon}
            className="text-sm font-medium text-green-600 hover:text-green-700"
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            disabled={isApplying}
          />
        </div>
        <button
          onClick={handleApplyCoupon}
          disabled={isApplying || !couponCode.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying ? (
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
              Validating...
            </>
          ) : (
            "Apply Code"
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
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

      <div className="text-xs text-gray-500">
        Only one coupon or voucher can be used per order.
      </div>
    </div>
  );
}
