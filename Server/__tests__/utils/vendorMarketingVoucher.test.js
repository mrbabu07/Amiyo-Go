const {
  normalizeId,
  round2,
  getApprovedVendorVoucher,
  calculateVendorVoucherDiscount,
} = require("../../utils/vendorMarketingVoucher");

describe("vendorMarketingVoucher utils", () => {
  test("normalizeId and round2 normalize internal values consistently", () => {
    expect(normalizeId({ toString: () => "abc123" })).toBe("abc123");
    expect(normalizeId(null)).toBeNull();
    expect(round2(12.345)).toBe(12.35);
  });

  test("getApprovedVendorVoucher looks up an active approved voucher by uppercase code", async () => {
    const findOne = jest.fn().mockResolvedValue({ _id: "voucher-1" });
    const db = {
      collection: jest.fn(() => ({ findOne })),
    };

    const result = await getApprovedVendorVoucher(db, " save10 ");

    expect(db.collection).toHaveBeenCalledWith("vendorMarketingItems");
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "voucher",
        code: "SAVE10",
        status: "approved",
      }),
    );
    expect(result).toEqual({ _id: "voucher-1" });
  });

  test("calculateVendorVoucherDiscount returns scoped percentage discount for matching vendor items", () => {
    const voucher = {
      _id: "voucher-1",
      vendorId: "vendor-1",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 100,
      usageLimit: 10,
      usedCount: 0,
    };

    const result = calculateVendorVoucherDiscount({
      voucher,
      items: [
        { vendorId: "vendor-1", price: 200, quantity: 1 },
        { vendorId: "vendor-2", price: 80, quantity: 1 },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.scopeVendorId).toBe("vendor-1");
    expect(result.vendorSubtotal).toBe(200);
    expect(result.discountAmount).toBe(20);
    expect(result.matchingItems).toHaveLength(1);
  });

  test("calculateVendorVoucherDiscount caps free shipping vouchers to delivery charge", () => {
    const result = calculateVendorVoucherDiscount({
      voucher: {
        _id: "voucher-ship",
        vendorId: "vendor-1",
        discountType: "free_shipping",
        minOrderAmount: 100,
      },
      items: [{ vendorId: "vendor-1", price: 250, quantity: 1 }],
      deliveryCharge: 60,
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(60);
    expect(result.vendorSubtotal).toBe(250);
  });

  test("calculateVendorVoucherDiscount scopes free shipping to the matching vendor delivery fee", () => {
    const result = calculateVendorVoucherDiscount({
      voucher: {
        _id: "voucher-ship",
        vendorId: "vendor-1",
        discountType: "free_shipping",
      },
      items: [
        { vendorId: "vendor-1", price: 250, quantity: 1 },
        { vendorId: "vendor-2", price: 300, quantity: 1 },
      ],
      deliveryCharge: 140,
      deliveryBreakdown: [
        { vendorId: "vendor-1", deliveryFee: 45 },
        { vendorId: "vendor-2", deliveryFee: 95 },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(45);
    expect(result.vendorDeliveryCharge).toBe(45);
  });

  test("calculateVendorVoucherDiscount applies a configured maximum discount", () => {
    const result = calculateVendorVoucherDiscount({
      voucher: {
        _id: "voucher-cap",
        vendorId: "vendor-1",
        discountType: "percentage",
        discountValue: 50,
        maxDiscountAmount: 80,
      },
      items: [{ vendorId: "vendor-1", price: 300, quantity: 1 }],
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(80);
  });

  test("calculateVendorVoucherDiscount blocks mismatched vendor carts and exhausted vouchers", () => {
    const mismatch = calculateVendorVoucherDiscount({
      voucher: {
        vendorId: "vendor-1",
        discountType: "fixed",
        discountValue: 50,
      },
      items: [{ vendorId: "vendor-2", price: 300, quantity: 1 }],
    });

    expect(mismatch.valid).toBe(false);
    expect(mismatch.error).toMatch(/selected store/i);

    const exhausted = calculateVendorVoucherDiscount({
      voucher: {
        vendorId: "vendor-1",
        discountType: "fixed",
        discountValue: 500,
        minOrderAmount: 50,
        usageLimit: 1,
        usedCount: 1,
      },
      items: [{ vendorId: "vendor-1", price: 120, quantity: 1 }],
    });

    expect(exhausted.valid).toBe(false);
    expect(exhausted.error).toMatch(/usage limit/i);
  });
});
