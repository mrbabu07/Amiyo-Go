import { describe, expect, test } from "@jest/globals";
import {
  buildVendorParcelLabelModel,
  buildVendorParcelQrPayload,
} from "../vendorParcelLabel";

describe("vendor parcel label white-box behavior", () => {
  test("keeps a multi-vendor order scoped to the current seller", () => {
    const label = buildVendorParcelLabelModel(
      {
        _id: "665000000000000000001234",
        vendorId: "vendor-a",
        isPartialOrder: true,
        paymentMethod: "cod",
        payableTotal: 1250,
        status: "ready_to_ship",
        shippingInfo: {
          name: "Test Buyer",
          phone: "01700000000",
          address: "Road 1",
          area: "Dhanmondi",
          city: "Dhaka",
        },
        products: [
          { vendorId: "vendor-a", title: "Seller A shirt", quantity: 2, price: 600 },
          { vendorId: "vendor-b", title: "Seller B shoes", quantity: 1, price: 3000 },
        ],
      },
      { _id: "vendor-a", shopName: "Seller A", phone: "01800000000" },
    );

    expect(label.items).toEqual([
      expect.objectContaining({ title: "Seller A shirt", quantity: 2 }),
    ]);
    expect(label.quantity).toBe(2);
    expect(label.codAmount).toBe(1250);
    expect(label.isPartialOrder).toBe(true);
    expect(label.parcelId).toContain("AG-00001234");
  });

  test("keeps personal delivery details out of the rider QR payload", () => {
    const label = buildVendorParcelLabelModel({
      _id: "order-100",
      vendorId: "vendor-20",
      shippingInfo: {
        name: "Private Buyer",
        phone: "01700000000",
        address: "Private address",
      },
      products: [{ vendorId: "vendor-20", title: "Item", trackingNumber: "TRK-100" }],
    });
    const payload = buildVendorParcelQrPayload(label);

    expect(payload).toContain("AGP2");
    expect(payload).toContain("O=order-100");
    expect(payload).toContain("V=vendor-20");
    expect(payload).toContain("T=TRK-100");
    expect(payload).toContain("PM=PREPAID");
    expect(payload).toContain("PS=VERIFY_PAYMENT");
    expect(payload).toContain("OS=PENDING");
    expect(payload).toContain("A=0.00");
    expect(payload).toContain("I=1");
    expect(payload).toContain("Q=1");
    expect(payload).toContain("C=BDT");
    expect(payload.length).toBeLessThan(180);
    expect(payload).not.toContain("Private Buyer");
    expect(payload).not.toContain("01700000000");
    expect(payload).not.toContain("Private address");
    expect(payload).not.toContain("Tk ");
  });

  test("puts only the selected vendor payable amount in a multi-order QR", () => {
    const label = buildVendorParcelLabelModel({
      _id: "multi-order-200",
      vendorId: "vendor-a",
      paymentMethod: "cod",
      paymentStatus: "pending",
      vendorSubtotal: 1000,
      deliveryCharge: 50,
      totalDiscount: 100,
      payableTotal: 950,
      totalAmount: 5000,
      products: [{ vendorId: "vendor-a", title: "Seller A item", price: 1000, quantity: 1 }],
    });
    const payload = buildVendorParcelQrPayload(label);

    expect(label.payableAmount).toBe(950);
    expect(label.codAmount).toBe(950);
    expect(payload).toContain("PM=COD");
    expect(payload).toContain("PS=COLLECT_ON_DELIVERY");
    expect(payload).toContain("A=950.00");
    expect(payload).not.toContain("A=5000.00");
  });
});
