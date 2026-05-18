import { describe, expect, test } from "@jest/globals";
import {
  findOrderByRouteId,
  getCustomerOrderSummary,
  getOrderItemLineTotal,
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
});
