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
