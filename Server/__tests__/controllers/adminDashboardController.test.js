const { getAdminDashboardOverview } = require("../../controllers/adminDashboardController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const getNested = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), doc);

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !(expected instanceof Date) && !Array.isArray(expected)) {
    if (expected.$gte !== undefined && !(actual >= expected.$gte)) return false;
    if (expected.$gt !== undefined && !(actual > expected.$gt)) return false;
    if (expected.$lte !== undefined && !(actual <= expected.$lte)) return false;
    if (expected.$lt !== undefined && !(actual < expected.$lt)) return false;
    if (expected.$in !== undefined && !expected.$in.includes(actual)) return false;
    if (expected.$nin !== undefined && expected.$nin.includes(actual)) return false;
    return true;
  }

  return actual === expected;
};

const matchesQuery = (doc, query = {}) => {
  if (query.$or) return query.$or.some((branch) => matchesQuery(doc, branch));

  return Object.entries(query).every(([key, expected]) => matchesValue(getNested(doc, key), expected));
};

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec = {}) {
    const entries = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      for (const [key, direction] of entries) {
        const leftValue = getNested(left, key);
        const rightValue = getNested(right, key);
        if (leftValue > rightValue) return direction < 0 ? -1 : 1;
        if (leftValue < rightValue) return direction < 0 ? 1 : -1;
      }
      return 0;
    });
    return this;
  }

  limit(count) {
    this.docs = this.docs.slice(0, count);
    return this;
  }

  async toArray() {
    return this.docs;
  }
}

class FakeCollection {
  constructor(docs = []) {
    this.docs = docs;
  }

  find(query = {}) {
    return new FakeCursor(this.docs.filter((doc) => matchesQuery(doc, query)));
  }

  async countDocuments(query = {}) {
    return this.docs.filter((doc) => matchesQuery(doc, query)).length;
  }
}

const buildDb = (collections) => ({
  collection: (name) => collections[name] || new FakeCollection([]),
});

describe("adminDashboardController", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("builds command-center KPIs, funnels, alerts, and leaderboards", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-15T10:00:00.000Z"));

    const orders = [
      {
        _id: "ord-1",
        status: "delivered",
        total: 1000,
        shippingInfo: { name: "Mina" },
        createdAt: new Date("2026-06-15T08:00:00.000Z"),
        products: [
          {
            productId: "rice-1",
            sku: "RICE-1",
            name: "Premium Rice",
            vendorId: "vendor-1",
            price: 700,
            quantity: 1,
            adminCommissionAmount: 70,
          },
          {
            productId: "oil-1",
            sku: "OIL-1",
            name: "Mustard Oil",
            vendorId: "vendor-2",
            price: 300,
            quantity: 1,
            adminCommissionAmount: 30,
          },
        ],
      },
      {
        _id: "ord-2",
        status: "pending",
        total: 500,
        createdAt: new Date("2026-06-15T09:00:00.000Z"),
        products: [
          {
            productId: "rice-1",
            sku: "RICE-1",
            name: "Premium Rice",
            vendorId: "vendor-1",
            price: 250,
            quantity: 2,
            adminCommissionAmount: 50,
          },
        ],
      },
      {
        _id: "ord-3",
        status: "processing",
        total: 400,
        createdAt: new Date("2026-06-14T09:00:00.000Z"),
        products: [
          {
            productId: "tea-1",
            sku: "TEA-1",
            name: "Black Tea",
            vendorId: "vendor-2",
            price: 400,
            quantity: 1,
            adminCommissionAmount: 40,
          },
        ],
      },
      {
        _id: "ord-4",
        status: "cancelled",
        total: 200,
        createdAt: new Date("2026-06-13T09:00:00.000Z"),
        fraudFlag: true,
        products: [
          {
            productId: "flagged-1",
            name: "Flagged Item",
            vendorId: "vendor-1",
            price: 200,
            quantity: 1,
            adminCommissionAmount: 20,
          },
        ],
      },
    ];

    const vendors = [
      { _id: "vendor-1", shopName: "Dhaka Fresh", status: "approved", createdAt: new Date("2026-05-01") },
      {
        _id: "vendor-2",
        shopName: "Bazar House",
        status: "pending",
        email: "vendor@example.com",
        createdAt: new Date("2026-06-15T07:00:00.000Z"),
        updatedAt: new Date("2026-06-15T07:30:00.000Z"),
        kyc: { status: "pending" },
      },
    ];

    const db = buildDb({
      orders: new FakeCollection(orders),
      users: new FakeCollection([
        { _id: "user-1", createdAt: new Date("2026-06-15T01:00:00.000Z") },
        { _id: "user-2", createdAt: new Date("2026-06-15T02:00:00.000Z") },
        { _id: "user-3", createdAt: new Date("2026-05-01T02:00:00.000Z") },
      ]),
      vendors: new FakeCollection(vendors),
      products: new FakeCollection([
        {
          _id: "product-1",
          name: "Pending SKU",
          approvalStatus: "pending",
          createdAt: new Date("2026-06-15T08:30:00.000Z"),
          updatedAt: new Date("2026-06-15T08:30:00.000Z"),
        },
      ]),
      returns: new FakeCollection([
        {
          _id: "return-1",
          status: "pending",
          vendorResponse: "disputed",
          refundAmount: 100,
          createdAt: new Date("2026-06-15T08:45:00.000Z"),
          updatedAt: new Date("2026-06-15T09:10:00.000Z"),
        },
      ]),
      vendor_payouts: new FakeCollection([
        { _id: "payout-1", type: "vendor_requested", status: "pending", createdAt: new Date("2026-06-15T08:00:00.000Z") },
        { _id: "payout-2", type: "admin_generated", status: "pending", createdAt: new Date("2026-06-14T08:00:00.000Z") },
      ]),
      payments: new FakeCollection([
        {
          _id: "payment-1",
          status: "failed",
          amount: 500,
          paymentMethod: "bkash",
          createdAt: new Date("2026-06-15T09:30:00.000Z"),
          failedAt: new Date("2026-06-15T09:31:00.000Z"),
        },
      ]),
      vendorOrders: new FakeCollection([
        {
          _id: "vendor-order-1",
          status: "pending",
          createdAt: new Date("2026-06-12T09:00:00.000Z"),
        },
      ]),
    });

    const req = {
      query: { range: "7d" },
      app: { locals: { db } },
    };
    const res = createRes();

    await getAdminDashboardOverview(req, res);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.kpis).toEqual(
      expect.objectContaining({
        todayGmv: 1500,
        todayOrders: 2,
        totalOrders: 4,
        newUsers: 2,
        newVendors: 1,
        pendingPayouts: 2,
        activeDisputes: 1,
      }),
    );
    expect(payload.revenueTotals).toEqual(
      expect.objectContaining({
        gmv: 1900,
        commission: 190,
        refunds: 100,
      }),
    );
    expect(payload.orderFunnel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "pending", count: 1 }),
        expect.objectContaining({ key: "processing", count: 1 }),
        expect.objectContaining({ key: "delivered", count: 1 }),
        expect.objectContaining({ key: "returned", count: 1 }),
      ]),
    );
    expect(payload.healthAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "payment_failures", count: 1 }),
        expect.objectContaining({ id: "vendor_sla", count: 1 }),
        expect.objectContaining({ id: "fraud_flags", count: 1 }),
      ]),
    );
    expect(payload.topVendors[0]).toEqual(
      expect.objectContaining({
        vendorName: "Dhaka Fresh",
        gmv: 1200,
        commission: 120,
        orders: 2,
      }),
    );
    expect(payload.topProductsToday[0]).toEqual(
      expect.objectContaining({
        productName: "Premium Rice",
        revenue: 1200,
        units: 3,
      }),
    );
    expect(payload.pendingActions).toEqual({
      vendorApprovals: 1,
      productModeration: 1,
      payoutRequests: 1,
      returnDisputes: 1,
      kycReviews: 1,
    });
    expect(payload.activityFeed.map((item) => item.type)).toEqual(
      expect.arrayContaining(["order", "vendor", "product", "payment"]),
    );
  });
});
