const { _private } = require("../../controllers/vendorDashboardController");

describe("vendor dashboard command center helpers", () => {
  test("prioritizes seller actions across fulfillment, returns, catalog, finance, and setup", () => {
    const fulfillment = { breached: 2, dueSoon: 1 };
    const actionCenter = _private.buildVendorActionCenter({
      vendor: { status: "approved", allowedCategoryIds: [], payoutMethod: "" },
      fulfillment,
      products: [
        { _id: "p1", stock: 0, approvalStatus: "approved" },
        { _id: "p2", stock: 4, approvalStatus: "rejected" },
        { _id: "p3", stock: 8, approvalStatus: "pending" },
      ],
      returns: [{ status: "pending", refundAmount: 300 }],
      payouts: [{ status: "hold", amount: 700 }],
      marketingItems: [],
      categoryRequests: [{ status: "pending" }],
    });

    expect(actionCenter.summary).toEqual(expect.objectContaining({
      total: expect.any(Number),
      critical: 1,
      high: expect.any(Number),
      financeExposure: 700,
    }));
    expect(actionCenter.items[0]).toEqual(expect.objectContaining({
      key: "late_shipments",
      priority: "critical",
      path: "/vendor/orders",
    }));
    expect(actionCenter.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "return_responses", path: "/vendor/returns" }),
      expect.objectContaining({ key: "rejected_products", path: "/vendor/products" }),
      expect.objectContaining({ key: "missing_payout", path: "/vendor/settings" }),
    ]));
  });

  test("calculates vendor finance command numbers with COD, deductions, and payout holds", () => {
    const finance = _private.buildVendorFinanceCommand({
      orderRows: [
        {
          status: "delivered",
          gross: 1000,
          commission: 100,
          earnings: 900,
          deliveredEarnings: 900,
          order: { paymentMethod: "cod" },
          products: [{ codCollected: false }],
        },
        {
          status: "delivered",
          gross: 500,
          commission: 50,
          earnings: 450,
          deliveredEarnings: 450,
          order: { paymentMethod: "bkash" },
          products: [{}],
        },
      ],
      returns: [
        { status: "approved", refundAmount: 300, vendorDeduction: 250 },
        { status: "completed", refundAmount: 100, vendorDeductionAmount: 80 },
      ],
      payouts: [
        { status: "pending", amount: 400 },
        { status: "hold", amount: 100 },
        { status: "paid", amount: 200 },
      ],
    });

    expect(finance).toEqual(expect.objectContaining({
      grossSales: 1500,
      deliveredEarnings: 1350,
      commission: 150,
      codPending: 900,
      pendingRefundExposure: 300,
      vendorDeductions: 330,
      pendingPayouts: 400,
      payoutHolds: 100,
      paidPayouts: 200,
      availableEstimate: 520,
    }));
  });

  test("calculates vendor order totals after a seller voucher", () => {
    const financials = _private.calculateVendorOrderFinancials(
      {
        subtotal: 1000,
        couponDiscount: 150,
        totalDiscount: 150,
        couponApplied: {
          source: "vendor_voucher",
          scopeVendorId: "vendor-1",
          discountAmount: 150,
        },
        discountBreakdown: {
          lines: [
            {
              type: "vendor_voucher",
              amount: 150,
              scopeVendorId: "vendor-1",
            },
          ],
          totals: { discountTotal: 150 },
        },
      },
      [
        {
          vendorId: "vendor-1",
          price: 600,
          quantity: 1,
          adminCommissionAmount: 60,
          vendorEarningAmount: 540,
        },
      ],
      "vendor-1",
    );

    expect(financials).toEqual(expect.objectContaining({
      vendorSubtotal: 600,
      couponDiscount: 150,
      vendorVoucherDiscount: 150,
      totalDiscount: 150,
      payableTotal: 450,
      grossVendorEarnings: 540,
      vendorEarnings: 390,
      totalAmount: 450,
    }));

    const otherVendorFinancials = _private.calculateVendorOrderFinancials(
      {
        subtotal: 1000,
        couponDiscount: 150,
        totalDiscount: 150,
        couponApplied: {
          source: "vendor_voucher",
          scopeVendorId: "vendor-1",
          discountAmount: 150,
        },
      },
      [{ vendorId: "vendor-2", price: 400, quantity: 1, adminCommissionAmount: 40 }],
      "vendor-2",
    );

    expect(otherVendorFinancials).toEqual(expect.objectContaining({
      vendorSubtotal: 400,
      totalDiscount: 0,
      payableTotal: 400,
      vendorEarnings: 360,
    }));
  });

  test("reports vendor readiness with required and optional checks", () => {
    const readiness = _private.buildVendorReadiness({
      vendor: {
        status: "approved",
        kyc: { status: "approved" },
        shopName: "Dhaka Seller",
        phone: "01700000000",
        address: "Dhaka",
        allowedCategoryIds: ["cat-1"],
        payoutMethod: "bank_transfer",
      },
      products: [{ _id: "p1" }],
      staff: [],
      marketingItems: [],
      fulfillment: { breached: 0 },
      returns: [],
    });

    expect(readiness).toEqual(expect.objectContaining({
      status: "watch",
      requiredMissing: 0,
      optionalMissing: 2,
    }));
    expect(readiness.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "profile", ready: true, required: true }),
      expect.objectContaining({ key: "marketing", ready: false, required: false }),
      expect.objectContaining({ key: "staff", ready: false, required: false }),
    ]));
  });
});
