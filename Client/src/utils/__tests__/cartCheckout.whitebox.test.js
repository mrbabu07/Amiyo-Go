import { describe, expect, test } from "@jest/globals";
import {
  estimateAddressDelivery,
  getCheckoutCtaLabel,
  getCheckoutStep,
  getCheckoutTarget,
  getCouponDiscountBreakdown,
  groupCartByVendor,
} from "../cartCheckout";

describe("cartCheckout white-box utilities", () => {
  test("routes authenticated users to account checkout and guests to guest checkout", () => {
    expect(getCheckoutTarget({ uid: "user-1" })).toBe("/checkout");
    expect(getCheckoutTarget(null)).toBe("/checkout/guest");
    expect(getCheckoutCtaLabel({ uid: "user-1" })).toBe("Proceed to Checkout");
    expect(getCheckoutCtaLabel(null)).toBe("Checkout as Guest");
  });

  test("groups cart items by vendor and applies exact or estimated delivery fees", () => {
    const groups = groupCartByVendor(
      [
        { _id: "p1", vendorId: "v1", vendorName: "Daily Mart", price: 120, quantity: 2 },
        { _id: "p2", vendorId: "v1", vendorName: "Daily Mart", price: 80, quantity: 1 },
        { _id: "p3", vendorId: "v2", vendorName: "Fresh Shop", price: 300, quantity: 1 },
      ],
      [{ vendorId: "v1", deliveryFee: 60, zoneLabel: "Dhaka city" }],
      { freeDeliveryThreshold: 500, standardDeliveryCharge: 90, estimateDelivery: true },
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      vendorId: "v1",
      vendorName: "Daily Mart",
      itemCount: 3,
      subtotal: 320,
      shippingFee: 60,
      shippingLabel: "Dhaka city",
      hasExactShipping: true,
    });
    expect(groups[1]).toMatchObject({
      vendorId: "v2",
      itemCount: 1,
      subtotal: 300,
      shippingFee: 90,
      shippingLabel: "Estimated shipping",
      hasExactShipping: false,
    });
  });

  test("separates platform coupons from vendor vouchers", () => {
    expect(
      getCouponDiscountBreakdown({
        discountAmount: 75,
        coupon: { type: "vendor_voucher" },
      }),
    ).toEqual({ platformVoucherDiscount: 0, vendorVoucherDiscount: 75 });

    expect(
      getCouponDiscountBreakdown({
        discountAmount: 50,
        coupon: { type: "platform_coupon" },
      }),
    ).toEqual({ platformVoucherDiscount: 50, vendorVoucherDiscount: 0 });
  });

  test("calculates checkout progress and delivery ETA from address state", () => {
    expect(getCheckoutStep({ cartCount: 0, hasAddress: false, paymentMethod: "", loading: false })).toBe(1);
    expect(getCheckoutStep({ cartCount: 2, hasAddress: false, paymentMethod: "cod", loading: false })).toBe(2);
    expect(getCheckoutStep({ cartCount: 2, hasAddress: true, paymentMethod: "", loading: false })).toBe(3);
    expect(getCheckoutStep({ cartCount: 2, hasAddress: true, paymentMethod: "cod", loading: false })).toBe(4);
    expect(getCheckoutStep({ cartCount: 2, hasAddress: true, paymentMethod: "cod", loading: true })).toBe(5);

    expect(estimateAddressDelivery({ district: "Dhaka" })).toBe("Estimated delivery: 1-3 business days");
    expect(estimateAddressDelivery({ district: "Sylhet" })).toBe("Estimated delivery: 2-4 business days");
    expect(estimateAddressDelivery({ district: "Barishal" })).toBe("Estimated delivery: 3-5 business days");
  });
});
