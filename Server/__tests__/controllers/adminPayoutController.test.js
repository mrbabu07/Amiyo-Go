const {
  approvePayoutRequest,
  calculateEligiblePayout,
  createPayout,
} = require("../../controllers/adminPayoutController");

const cursorFrom = (items = []) => ({
  toArray: jest.fn(async () => items),
  sort: jest.fn(function sort() { return this; }),
  limit: jest.fn(function limit() { return this; }),
});

const buildReq = ({
  orders = [],
  payouts = [],
  payoutDoc = null,
  vendor = {},
  body = {},
  params = { vendorId: "64f000000000000000000111" },
} = {}) => {
  const payoutCollection = {
    find: jest.fn(() => cursorFrom(payouts)),
    findOne: jest.fn(async () => null),
    updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
  };

  return {
    params,
    body,
    user: { _id: "admin-1", role: "admin", email: "admin@example.com" },
    app: {
      locals: {
        db: {
          collection: jest.fn(() => ({
            find: jest.fn(() => cursorFrom([])),
            insertOne: jest.fn(),
          })),
        },
        models: {
          Order: {
            collection: {
              find: jest.fn(() => cursorFrom(orders)),
            },
          },
          Vendor: {
            findById: jest.fn(async () => vendor),
          },
          VendorPayout: {
            collection: payoutCollection,
            create: jest.fn(async (payload) => ({ ...payload, _id: "payout-1", status: "pending" })),
            findById: jest.fn(async () => payoutDoc),
            approvePayout: jest.fn(async () => ({ modifiedCount: 1 })),
          },
          Return: {
            getVendorDeductions: jest.fn(async () => ({ totalDeduction: 0, returnsCount: 0, returns: [] })),
          },
        },
      },
    },
  };
};

const buildRes = () => ({
  status: jest.fn(function status() { return this; }),
  json: jest.fn(),
});

describe("adminPayoutController", () => {
  test("calculateEligiblePayout shows net payable order amounts after vendor voucher", async () => {
    const vendorId = "64f000000000000000000111";
    const req = buildReq({
      params: { vendorId },
      vendor: { _id: vendorId, shopName: "Tech World", sellerTier: "normal" },
      orders: [
        {
          _id: "order-voucher-1",
          status: "delivered",
          paymentMethod: "cod",
          createdAt: new Date("2026-05-20T09:00:00.000Z"),
          deliveredAt: new Date("2026-05-20T09:00:00.000Z"),
          subtotal: 1000,
          discountBreakdown: {
            lines: [{ type: "vendor_voucher", amount: 200, scopeVendorId: vendorId }],
            totals: { subtotal: 1000, discountTotal: 200, payableTotal: 800 },
          },
          products: [
            {
              productId: "phone-1",
              title: "Smartphone",
              vendorId,
              price: 1000,
              quantity: 1,
              itemStatus: "delivered",
              commissionRateSnapshot: 10,
              adminCommissionAmount: 100,
              vendorEarningAmount: 900,
            },
          ],
        },
      ],
    });
    const res = buildRes();

    await calculateEligiblePayout(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        grossDeliveredSales: 1000,
        sellerFundedDiscount: 200,
        netDeliveredSales: 800,
        adminCommission: 80,
        totalDeliveredEarnings: 720,
        eligibleAmount: 720,
        eligibleOrders: [
          expect.objectContaining({
            orderId: "order-voucher-1",
            grossSaleAmount: 1000,
            sellerFundedDiscount: 200,
            netSaleAmount: 800,
            commissionAmount: 80,
            earnings: 720,
          }),
        ],
      }),
    });
  });

  test("createPayout rejects amounts above calculated payable balance", async () => {
    const vendorId = "64f000000000000000000111";
    const req = buildReq({
      params: { vendorId },
      body: { amount: 800, note: "manual payout" },
      vendor: { _id: vendorId, shopName: "Tech World" },
      orders: [
        {
          _id: "order-voucher-1",
          status: "delivered",
          createdAt: new Date("2026-05-20T09:00:00.000Z"),
          deliveredAt: new Date("2026-05-20T09:00:00.000Z"),
          subtotal: 1000,
          discountBreakdown: {
            lines: [{ type: "vendor_voucher", amount: 200, scopeVendorId: vendorId }],
            totals: { subtotal: 1000, discountTotal: 200, payableTotal: 800 },
          },
          products: [
            {
              vendorId,
              price: 1000,
              quantity: 1,
              itemStatus: "delivered",
              commissionRateSnapshot: 10,
            },
          ],
        },
      ],
    });
    const res = buildRes();

    await createPayout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("Payout amount exceeds"),
      }),
    );
    expect(req.app.locals.models.VendorPayout.create).not.toHaveBeenCalled();
  });

  test("approvePayoutRequest blocks vendor requests above calculated payable balance", async () => {
    const vendorId = "64f000000000000000000111";
    const req = buildReq({
      params: { payoutId: "payout-request-1" },
      body: { note: "reviewed" },
      payoutDoc: {
        _id: "payout-request-1",
        vendorId,
        type: "vendor_requested",
        status: "pending",
        amount: 800,
      },
      vendor: { _id: vendorId, shopName: "Tech World" },
      orders: [
        {
          _id: "order-voucher-1",
          status: "delivered",
          createdAt: new Date("2026-05-20T09:00:00.000Z"),
          deliveredAt: new Date("2026-05-20T09:00:00.000Z"),
          subtotal: 1000,
          discountBreakdown: {
            lines: [{ type: "vendor_voucher", amount: 200, scopeVendorId: vendorId }],
            totals: { subtotal: 1000, discountTotal: 200, payableTotal: 800 },
          },
          products: [
            {
              vendorId,
              price: 1000,
              quantity: 1,
              itemStatus: "delivered",
              commissionRateSnapshot: 10,
            },
          ],
        },
      ],
    });
    const res = buildRes();

    await approvePayoutRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("exceeds the current payable balance"),
      }),
    );
    expect(req.app.locals.models.VendorPayout.approvePayout).not.toHaveBeenCalled();
  });
});
