import { describe, expect, test } from "@jest/globals";
import {
  formatOrderStatus,
  getOrderDiscount,
  getOrderEtaLabel,
  getOrderItems,
  getOrderItemImage,
  getOrderItemProductId,
  getOrderItemTitle,
  getOrderSubtotal,
  getOrderTotal,
  getPaymentLabel,
  getShortOrderId,
} from "../customerOrders";

describe("customer order helpers white-box behavior", () => {
  test("normalizes order status, short ids, and payment labels", () => {
    expect(formatOrderStatus("partially_returned")).toBe("Partially Returned");
    expect(getShortOrderId({ _id: "6620fd2f45d3ad8bbec0a777" })).toBe("#BEC0A777");
    expect(getPaymentLabel("bkash")).toBe("bKash");
    expect(getPaymentLabel("manual_review")).toBe("Manual Review");
  });

  test("falls back across known product item shapes", () => {
    expect(getOrderItemProductId({ product: { _id: "p1" } })).toBe("p1");
    expect(getOrderItemTitle({ product: { title: "Nested product" } })).toBe("Nested product");
    expect(getOrderItemImage({ product: { images: ["image-1.jpg"] } })).toBe("image-1.jpg");
  });

  test("calculates fallback discounts and totals without leaking NaN", () => {
    expect(getOrderDiscount({ couponDiscount: 30, pointsDiscount: 20 })).toBe(50);
    expect(getOrderDiscount({ couponDiscount: undefined, pointsDiscount: undefined })).toBe(0);
    expect(
      getOrderTotal({
        products: [{ price: 100, quantity: 2 }],
        deliveryFee: 40,
        couponDiscount: 10,
      }),
    ).toBe(230);
  });

  test("treats null order data as an empty loading state", () => {
    expect(getOrderItems(null)).toEqual([]);
    expect(getShortOrderId(null)).toBe("Order");
    expect(getOrderSubtotal(null)).toBe(0);
    expect(getOrderDiscount(null)).toBe(0);
    expect(getOrderTotal(null)).toBe(0);
    expect(getOrderEtaLabel(null)).toBe("ETA will be updated after seller confirmation");
  });

  test("uses tracking ETA label before date fallback", () => {
    expect(
      getOrderEtaLabel({
        customerExperience: { tracking: { eta: { label: "Today by 8 PM" } } },
        estimatedDelivery: "2026-05-21T00:00:00.000Z",
      }),
    ).toBe("Today by 8 PM");

    expect(getOrderEtaLabel({ deliveryEta: "2-4 business days" })).toBe("2-4 business days");
    expect(getOrderEtaLabel({})).toBe("ETA will be updated after seller confirmation");
  });
});
