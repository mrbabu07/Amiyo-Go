import { describe, expect, test } from "@jest/globals";
import {
  buildVendorOrderAddress,
  getVendorOrderActionPlan,
  getVendorOrderFinancials,
  getVendorOrderProductPricingSummaries,
  getVendorOrderStatusMeta,
  shortVendorOrderId,
} from "../vendorOrderDetail";

describe("vendor order detail black-box behavior", () => {
  test("summarizes seller-facing status and next action", () => {
    expect(
      getVendorOrderStatusMeta({
        products: [{ itemStatus: "ready_to_ship" }],
      }),
    ).toMatchObject({
      key: "ready_to_ship",
      label: "Ready to ship",
      nextAction: "Schedule pickup and hand over to courier",
    });
  });

  test("calculates vendor financial exposure from order items", () => {
    const financials = getVendorOrderFinancials({
      paymentMethod: "cod",
      products: [
        { price: 200, quantity: 2, adminCommissionAmount: 30 },
        { price: 100, quantity: 1, adminCommissionAmount: 10 },
      ],
      deliveryFee: 60,
      discount: 20,
    });

    expect(financials).toMatchObject({
      itemCount: 2,
      quantity: 3,
      vendorSubtotal: 500,
      vendorCommission: 40,
      vendorEarnings: 460,
      payableTotal: 540,
      codAmount: 540,
    });
  });

  test("shows item payable values after vendor voucher discount", () => {
    const rows = getVendorOrderProductPricingSummaries({
      products: [{ price: 10000, quantity: 1, title: "HP laptop" }],
      totalDiscount: 4999,
    });

    expect(rows[0]).toMatchObject({
      grossLineTotal: 10000,
      discountShare: 4999,
      payableLineTotal: 5001,
      payableUnitPrice: 5001,
    });
  });

  test("shows customer payable after a vendor voucher even when legacy totalAmount is gross", () => {
    const financials = getVendorOrderFinancials({
      paymentMethod: "cod",
      vendorSubtotal: 10000,
      totalAmount: 10000,
      totalDiscount: 4999,
      products: [{ price: 10000, quantity: 1 }],
    });

    expect(financials).toMatchObject({
      vendorSubtotal: 10000,
      discount: 4999,
      payableTotal: 5001,
      codAmount: 5001,
    });
  });

  test("shows correct available actions for a pickup-ready COD order", () => {
    expect(
      getVendorOrderActionPlan({
        paymentMethod: "Cash on delivery",
        products: [{ itemStatus: "pickup_ready" }],
      }),
    ).toMatchObject({
      status: "pickup_ready",
      canSchedulePickup: true,
      canShip: true,
      canCollectCod: true,
      canCancel: true,
      cod: true,
    });
  });

  test("formats IDs and customer address for operational use", () => {
    expect(shortVendorOrderId("665544332211009988776655")).toBe("88776655");
    expect(
      buildVendorOrderAddress({
        name: "Asha Karim",
        phone: "01700000000",
        address: "House 12",
        area: "Hnila",
        upazila: "Teknaf",
        district: "Cox's Bazar",
      }),
    ).toContain("Asha Karim\n01700000000\nHouse 12");
  });
});
