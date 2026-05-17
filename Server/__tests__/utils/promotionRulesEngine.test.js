const {
  DEFAULT_PROMOTION_RULES,
  buildDiscountBreakdown,
  normalizePromotionRules,
  validatePromotionStack,
} = require("../../utils/promotionRulesEngine");

describe("promotionRulesEngine", () => {
  test("allows a single platform voucher with loyalty points by default", () => {
    const breakdown = buildDiscountBreakdown({
      subtotal: 1000,
      deliveryCharge: 60,
      couponApplied: {
        code: "SAVE100",
        source: "admin_coupon",
        discountType: "fixed",
        discountValue: 100,
      },
      couponDiscountAmount: 100,
      pointsDiscountAmount: 20,
      redeemedPoints: 200,
    });

    expect(breakdown.validation.valid).toBe(true);
    expect(breakdown.lines.map((line) => line.type)).toEqual([
      "platform_voucher",
      "loyalty_points",
    ]);
    expect(breakdown.totals).toEqual(
      expect.objectContaining({
        subtotal: 1000,
        deliveryCharge: 60,
        discountTotal: 120,
        payableTotal: 940,
      }),
    );
  });

  test("blocks platform voucher and seller voucher stacking unless enabled", () => {
    const result = validatePromotionStack({
      subtotal: 500,
      lines: [
        { type: "platform_voucher", amount: 50 },
        { type: "vendor_voucher", amount: 40 },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "multiple_vouchers_blocked" }),
        expect.objectContaining({ code: "platform_vendor_stack_blocked" }),
      ]),
    );
  });

  test("normalizes saved rule settings with safe defaults", () => {
    expect(
      normalizePromotionRules({
        allowVoucherWithFlashSale: true,
        maxStackedDiscountPercent: 250,
      }),
    ).toEqual(
      expect.objectContaining({
        ...DEFAULT_PROMOTION_RULES,
        allowVoucherWithFlashSale: true,
        maxStackedDiscountPercent: 100,
      }),
    );
  });
});
