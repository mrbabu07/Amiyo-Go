import { describe, expect, test } from "@jest/globals";
import {
  findOrderByRouteId,
  getCustomerOrderSummary,
  getOrderItemLineTotal,
  getOrderItemPricingSummaries,
} from "../customerOrders";

describe("customer order journey black-box behavior", () => {
  test("builds the order detail summary a customer sees after purchase", () => {
    const order = {
      _id: "6620fd2f45d3ad8bbec0a777",
      status: "out_for_delivery",
      paymentMethod: "cod",
      estimatedDelivery: "2026-05-20T10:00:00.000Z",
      products: [
        { title: "Fresh vegetables box", price: 320, quantity: 2 },
        { title: "Rice 5kg", lineTotal: 520, quantity: 1 },
      ],
      deliveryCharge: 60,
      totalDiscount: 80,
    };

    const summary = getCustomerOrderSummary(order);

    expect(summary).toMatchObject({
      id: "6620fd2f45d3ad8bbec0a777",
      shortId: "#BEC0A777",
      statusLabel: "Out For Delivery",
      itemCount: 3,
      subtotal: 1160,
      deliveryFee: 60,
      discount: 80,
      total: 1140,
      paymentLabel: "Cash on Delivery",
      etaLabel: "Wed, May 20",
    });
  });

  test("lets customer routes open an order by full id or short tracking id", () => {
    const orders = [
      { _id: "6620fd2f45d3ad8bbec0a777", products: [] },
      { orderNumber: "AMG-2026-1009", products: [] },
    ];

    expect(findOrderByRouteId(orders, "6620fd2f45d3ad8bbec0a777")).toBe(orders[0]);
    expect(findOrderByRouteId(orders, "bec0a777")).toBe(orders[0]);
    expect(findOrderByRouteId(orders, "AMG-2026-1009")).toBe(orders[1]);
    expect(findOrderByRouteId(orders, "missing")).toBeNull();
  });

  test("keeps customer totals stable when a row only has unit price and quantity", () => {
    expect(getOrderItemLineTotal({ price: 99.5, quantity: 3 })).toBe(298.5);
  });

  test("shows the discounted amount when a legacy order stored the pre-discount total", () => {
    const summary = getCustomerOrderSummary({
      _id: "6620fd2f45d3ad8bbec0a888",
      status: "pending",
      paymentMethod: "cod",
      products: [{ title: "Laptop", price: 10000, quantity: 1 }],
      couponApplied: { code: "PROMO1000", discountAmount: 1000 },
      totalDiscount: 1000,
      total: 10000,
    });

    expect(summary.discount).toBe(1000);
    expect(summary.total).toBe(9000);
  });

  test("allocates the order voucher discount into the item rows customers see", () => {
    const [item] = getOrderItemPricingSummaries({
      _id: "6620fd2f45d3ad8bbec0a999",
      products: [{ title: "Laptop", price: 10000, quantity: 1 }],
      couponApplied: { code: "SUMMER26", discountAmount: 4999 },
      couponDiscount: 4999,
      totalDiscount: 4999,
      deliveryCharge: 30,
      total: 5031,
    });

    expect(item.grossLineTotal).toBe(10000);
    expect(item.discountShare).toBe(4999);
    expect(item.payableLineTotal).toBe(5001);
    expect(item.payableUnitPrice).toBe(5001);
  });
});
