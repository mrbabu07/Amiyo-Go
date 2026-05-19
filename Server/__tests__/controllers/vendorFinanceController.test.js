const { ObjectId } = require("mongodb");
const {
  downloadStatement,
  getCommissionRates,
  getFinanceSummary,
  getReconciliation,
  getTransactions,
} = require("../../controllers/vendor/vendorFinanceController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const cursorFrom = (rows) => {
  const cursor = {
    sort: jest.fn(() => cursor),
    skip: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    toArray: jest.fn().mockResolvedValue(rows),
  };
  return cursor;
};

const buildFinanceReq = ({
  vendorId = new ObjectId(),
  orders = [],
  payouts = [],
  returns = [],
  vendor = null,
  categories = [],
  query = {},
  params = {},
} = {}) => {
  const orderCollection = {
    find: jest.fn(() => cursorFrom(orders)),
    countDocuments: jest.fn().mockResolvedValue(orders.length),
  };
  const payoutCollection = {
    find: jest.fn(() => cursorFrom(payouts)),
  };
  const returnModel = {
    getVendorDeductions: jest.fn().mockResolvedValue({
      totalDeduction: returns.reduce((sum, item) => sum + Number(item.vendorDeduction || 0), 0),
      returnsCount: returns.length,
      returns,
    }),
  };

  return {
    user: { vendorId: vendorId.toString() },
    query,
    params,
    app: {
      locals: {
        models: {
          Order: { collection: orderCollection },
          VendorPayout: {
            collection: payoutCollection,
          },
          Return: returnModel,
          Vendor: {
            findById: jest.fn().mockResolvedValue(vendor || {
              _id: vendorId,
              shopName: "Test Seller",
              allowedCategoryIds: categories.slice(0, 1).map((category) => category._id),
            }),
          },
          Category: {
            getCategoriesWithCommission: jest.fn().mockResolvedValue(categories),
          },
        },
      },
    },
  };
};

describe("vendor finance controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getFinanceSummary exposes current cycle, payout, and return totals", async () => {
    const vendorId = new ObjectId();
    const orderId = new ObjectId();
    const orders = [
      {
        _id: orderId,
        createdAt: new Date(),
        subtotal: 2000,
        paymentMethod: "cod",
        deliveryBreakdown: [
          {
            vendorId: vendorId.toString(),
            deliveryMethod: "vendor_delivery",
            deliveryFee: 60,
          },
        ],
        products: [
          {
            vendorId: vendorId.toString(),
            title: "Rice bag",
            price: 1000,
            quantity: 2,
            itemStatus: "delivered",
            commissionRateSnapshot: 10,
            adminCommissionAmount: 200,
            vendorEarningAmount: 1800,
          },
        ],
      },
    ];
    const returns = [
      {
        _id: new ObjectId(),
        orderId,
        status: "approved",
        productTitle: "Rice bag",
        vendorDeduction: 200,
        approvedAt: new Date(),
      },
    ];
    const payouts = [
      { _id: new ObjectId(), vendorId, status: "paid", amount: 500 },
      { _id: new ObjectId(), vendorId, status: "pending", amount: 100 },
    ];
    const req = buildFinanceReq({ vendorId, orders, returns, payouts });
    const res = createRes();

    await getFinanceSummary(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        grossSales: 2000,
        totalCommission: 200,
        pendingBalance: 1060,
        earningsSummary: expect.objectContaining({
          currentCycleBalance: 1660,
          releasedAmount: 500,
          withheldForReturns: 200,
        }),
        refundImpact: expect.objectContaining({
          totalDeducted: 200,
          returnsCount: 1,
        }),
        payoutSchedule: expect.objectContaining({
          cadence: "Weekly",
          minimumPayoutThreshold: 1000,
        }),
      }),
    });
  });

  test("getTransactions returns order-level sale, commission, shipping, refund, and net payout", async () => {
    const vendorId = new ObjectId();
    const orderId = new ObjectId();
    const req = buildFinanceReq({
      vendorId,
      orders: [
        {
          _id: orderId,
          createdAt: new Date("2026-05-04T10:00:00.000Z"),
          subtotal: 1200,
          deliveryBreakdown: [
            {
              vendorId: vendorId.toString(),
              deliveryMethod: "platform_delivery",
              deliveryFee: 0,
              baseFee: 80,
              freeDeliveryApplied: true,
            },
          ],
          products: [
            {
              vendorId: vendorId.toString(),
              title: "Cotton panjabi",
              sku: "PANJABI-BLUE-M",
              price: 1200,
              quantity: 1,
              itemStatus: "delivered",
              commissionRateSnapshot: 12,
              adminCommissionAmount: 144,
              vendorEarningAmount: 1056,
            },
          ],
        },
      ],
      returns: [
        {
          _id: new ObjectId(),
          orderId,
          status: "completed",
          productTitle: "Cotton panjabi",
          deduction: 300,
        },
      ],
      query: { limit: "20" },
    });
    const res = createRes();

    await getTransactions(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          orderId,
          saleAmount: 1200,
          platformCommissionRate: 12,
          platformCommissionAmount: 144,
          shippingFeeCredited: 0,
          shippingFeeDebited: 80,
          refundDeducted: 300,
          netPayout: 676,
          items: [
            expect.objectContaining({
              sku: "PANJABI-BLUE-M",
              commissionRate: 12,
            }),
          ],
        }),
      ],
      total: 1,
      page: 1,
      pages: 1,
    });
  });

  test("getReconciliation exposes COD exposure, payout holds, and available balance", async () => {
    const vendorId = new ObjectId();
    const deliveredOrderId = new ObjectId();
    const pendingOrderId = new ObjectId();
    const req = buildFinanceReq({
      vendorId,
      orders: [
        {
          _id: deliveredOrderId,
          createdAt: new Date("2026-05-08T10:00:00.000Z"),
          paymentMethod: "cod",
          deliveryBreakdown: [
            {
              vendorId: vendorId.toString(),
              deliveryMethod: "vendor_delivery",
              deliveryFee: 50,
            },
          ],
          products: [
            {
              vendorId: vendorId.toString(),
              title: "Laptop bag",
              price: 1000,
              quantity: 1,
              itemStatus: "delivered",
              adminCommissionAmount: 100,
              vendorEarningAmount: 900,
            },
          ],
        },
        {
          _id: pendingOrderId,
          createdAt: new Date("2026-05-09T10:00:00.000Z"),
          paymentMethod: "cod",
          products: [
            {
              vendorId: vendorId.toString(),
              title: "Mouse",
              price: 500,
              quantity: 1,
              itemStatus: "processing",
              adminCommissionAmount: 50,
              vendorEarningAmount: 450,
            },
          ],
        },
      ],
      returns: [
        {
          _id: new ObjectId(),
          orderId: deliveredOrderId,
          status: "completed",
          productTitle: "Laptop bag",
          vendorDeduction: 200,
          approvedAt: new Date("2026-05-10T10:00:00.000Z"),
        },
      ],
      payouts: [
        { _id: new ObjectId(), vendorId, status: "paid", amount: 300 },
        { _id: new ObjectId(), vendorId, status: "processing", amount: 100 },
        { _id: new ObjectId(), vendorId, status: "risk_hold", amount: 50 },
      ],
    });
    const res = createRes();

    await getReconciliation(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        summary: expect.objectContaining({
          grossSales: 1500,
          returnDeduction: 200,
          releasedNet: 750,
          pendingPayouts: 100,
          payoutHolds: 50,
          paidPayouts: 300,
          availableBalance: 300,
        }),
        cod: expect.objectContaining({
          orders: 2,
          pendingExposure: 450,
          releasedExposure: 750,
        }),
        orderStatus: expect.objectContaining({
          released: 1,
          pending: 1,
          refundDeducted: 1,
        }),
        buckets: expect.arrayContaining([
          expect.objectContaining({ key: "payout_holds", amount: 50, type: "hold" }),
          expect.objectContaining({ key: "return_deductions", amount: 200, type: "debit" }),
        ]),
      }),
    });
  });

  test("downloadStatement returns CSV statement rows", async () => {
    const vendorId = new ObjectId();
    const orderId = new ObjectId();
    const req = buildFinanceReq({
      vendorId,
      params: { format: "csv" },
      query: { month: "2026-05" },
      orders: [
        {
          _id: orderId,
          createdAt: new Date("2026-05-10T10:00:00.000Z"),
          subtotal: 500,
          products: [
            {
              vendorId: vendorId.toString(),
              title: "Local honey",
              price: 500,
              quantity: 1,
              itemStatus: "delivered",
              commissionRateSnapshot: 8,
              adminCommissionAmount: 40,
              vendorEarningAmount: 460,
            },
          ],
        },
      ],
    });
    const res = createRes();

    await downloadStatement(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="statement-2026-05.csv"');
    expect(res.send.mock.calls[0][0]).toContain("Order ID,Date,Products,Sale Amount");
    expect(res.send.mock.calls[0][0]).toContain("Local honey");
  });

  test("getCommissionRates filters to the vendor allowed category card", async () => {
    const vendorId = new ObjectId();
    const allowed = new ObjectId();
    const blocked = new ObjectId();
    const req = buildFinanceReq({
      vendorId,
      vendor: { _id: vendorId, shopName: "Test Seller", allowedCategoryIds: [allowed] },
      categories: [
        {
          _id: allowed,
          name: "Fashion",
          slug: "fashion",
          commissionRate: 12,
          minimumCommissionRate: 5,
          effectiveCommissionRate: 12,
        },
        {
          _id: blocked,
          name: "Electronics",
          slug: "electronics",
          commissionRate: 8,
          minimumCommissionRate: 4,
          effectiveCommissionRate: 8,
        },
      ],
    });
    const res = createRes();

    await getCommissionRates(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          categoryId: allowed,
          name: "Fashion",
          effectiveCommissionRate: 12,
        }),
      ],
    });
  });
});
