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
            categoryId: "grocery",
            categoryName: "Grocery",
            vendorId: "vendor-1",
            price: 700,
            quantity: 1,
            adminCommissionAmount: 70,
          },
          {
            productId: "oil-1",
            sku: "OIL-1",
            name: "Mustard Oil",
            categoryId: "grocery",
            categoryName: "Grocery",
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
            categoryId: "grocery",
            categoryName: "Grocery",
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
            categoryId: "beverages",
            categoryName: "Beverages",
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
        { _id: "payout-1", type: "vendor_requested", status: "pending", amount: 750, createdAt: new Date("2026-06-15T08:00:00.000Z") },
        { _id: "payout-2", type: "admin_generated", status: "pending", amount: 500, createdAt: new Date("2026-06-14T08:00:00.000Z") },
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
      supportTickets: new FakeCollection([
        { _id: "ticket-1", status: "open", priority: "high", createdAt: new Date("2026-06-13T08:00:00.000Z") },
        { _id: "ticket-2", status: "in_progress", priority: "medium", createdAt: new Date("2026-06-15T08:00:00.000Z") },
      ]),
      reviews: new FakeCollection([
        { _id: "review-1", moderationStatus: "flagged", reportCount: 2, createdAt: new Date("2026-06-15T08:00:00.000Z") },
      ]),
      notification_deliveries: new FakeCollection([
        { _id: "delivery-1", status: "failed", failedAt: new Date("2026-06-15T08:00:00.000Z") },
      ]),
      bulk_upload_jobs: new FakeCollection([
        { _id: "bulk-1", status: "failed", updatedAt: new Date("2026-06-15T07:00:00.000Z") },
      ]),
      analytics_summaries: new FakeCollection([
        { _id: "summary-1", updatedAt: new Date("2026-06-15T09:30:00.000Z") },
      ]),
      admin_case_assignments: new FakeCollection([
        {
          caseKey: "support:ticket-1",
          assignedTo: "support-lead@amiyo.test",
          status: "open",
          priority: "critical",
          workflow: "Support",
          dueAt: new Date("2026-06-15T08:30:00.000Z"),
          updatedAt: new Date("2026-06-15T09:00:00.000Z"),
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
        payoutExposure: 1250,
        activeDisputes: 1,
        activeVendors: 1,
        supportOpen: 2,
        supportSlaBreaches: 1,
        reviewModeration: 1,
        failedNotifications: 1,
        failedBulkJobs: 1,
        refundAmount: 100,
        refundRate: 5.26,
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
    expect(payload.topCategories[0]).toEqual(
      expect.objectContaining({
        categoryName: "Grocery",
        gmv: 1500,
        units: 4,
      }),
    );
    expect(payload.comparison).toEqual(expect.objectContaining({
      gmvChange: expect.any(Number),
      ordersChange: expect.any(Number),
      refundRateChange: expect.any(Number),
    }));
    expect(payload.opsSummary).toEqual(expect.objectContaining({
      supportOpen: 2,
      supportSlaBreaches: 1,
      failedNotifications: 1,
      failedBulkJobs: 1,
      analyticsCronStatus: "running",
    }));
    expect(payload.pendingActions).toEqual({
      vendorApprovals: 1,
      productModeration: 1,
      payoutRequests: 1,
      returnDisputes: 1,
      kycReviews: 1,
      supportTickets: 2,
      reviewModeration: 1,
      failedNotifications: 1,
    });
    expect(payload.exceptionInbox.summary).toEqual(expect.objectContaining({
      total: 12,
      critical: expect.any(Number),
      breached: expect.any(Number),
      financeExposure: 1850,
    }));
    expect(payload.exceptionInbox.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "payment",
        priority: "critical",
        workflow: "Payment recovery",
        nextAction: "Check gateway/manual payment evidence",
      }),
      expect.objectContaining({
        type: "support",
        owner: "Support",
        actionLabel: "Open ticket queue",
      }),
      expect.objectContaining({
        type: "payout",
        owner: "Finance",
      }),
    ]));
    expect(payload.adminHardening).toEqual(expect.objectContaining({
      staffWorkload: expect.objectContaining({
        totalOpen: 1,
        assigned: 1,
        overdue: 1,
      }),
      financeReconciliation: expect.objectContaining({
        refundExposure: 100,
        pendingPayoutExposure: 1250,
        vendorDeductions: 0,
        status: "watch",
      }),
      integrationReadiness: expect.objectContaining({
        watch: expect.any(Number),
        integrations: expect.arrayContaining([
          expect.objectContaining({ key: "analytics", status: "ready" }),
        ]),
      }),
    }));
    expect(payload.activityFeed.map((item) => item.type)).toEqual(
      expect.arrayContaining(["order", "vendor", "product", "payment"]),
    );
  });
});
