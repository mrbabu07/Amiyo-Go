import { describe, expect, test } from "@jest/globals";
import {
  buildVendorOrderTimeline,
  getVendorOrderActionPlan,
  getVendorOrderFinancials,
  normalizeVendorOrderStatus,
} from "../vendorOrderDetail";

describe("vendor order detail white-box behavior", () => {
  test("derives the strongest fulfillment status from mixed item statuses", () => {
    expect(normalizeVendorOrderStatus({ products: [{ itemStatus: "pending" }] })).toBe("pending");
    expect(normalizeVendorOrderStatus({ products: [{ itemStatus: "processing" }, { itemStatus: "packed" }] })).toBe("packed");
    expect(normalizeVendorOrderStatus({ products: [{ itemStatus: "delivered" }, { itemStatus: "delivered" }] })).toBe("delivered");
    expect(normalizeVendorOrderStatus({ products: [{ itemStatus: "returned" }, { itemStatus: "delivered" }] })).toBe("returned");
  });

  test("blocks fulfillment actions for terminal orders", () => {
    expect(getVendorOrderActionPlan({ products: [{ itemStatus: "delivered" }] })).toMatchObject({
      terminal: true,
      canPack: false,
      canReady: false,
      canCancel: false,
    });
  });

  test("uses explicit vendor totals before falling back to item math", () => {
    expect(
      getVendorOrderFinancials({
        vendorSubtotal: 900,
        vendorCommission: 120,
        vendorEarnings: 780,
        products: [{ price: 1, quantity: 1 }],
      }),
    ).toMatchObject({
      itemSubtotal: 1,
      vendorSubtotal: 900,
      vendorCommission: 120,
      vendorEarnings: 780,
    });
  });

  test("builds chronological timeline from persisted events and item timestamps", () => {
    const timeline = buildVendorOrderTimeline(
      {
        createdAt: "2026-05-01T08:00:00.000Z",
        products: [
          {
            packedAt: "2026-05-02T08:00:00.000Z",
            shippedAt: "2026-05-04T08:00:00.000Z",
            trackingNumber: "TRK-100",
          },
        ],
      },
      [
        {
          status: "ready_to_ship",
          label: "Ready to ship",
          timestamp: "2026-05-03T08:00:00.000Z",
          actorRole: "vendor",
        },
      ],
    );

    expect(timeline.map((event) => event.label)).toEqual([
      "Order placed",
      "Packed",
      "Ready to ship",
      "Shipped",
    ]);
    expect(timeline[3]).toMatchObject({
      type: "shipped",
      note: "TRK-100",
    });
  });
});
