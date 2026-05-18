const { ObjectId } = require("mongodb");
const {
  _financeTestUtils,
  downloadRevenueReport,
  getPayoutQueue,
  getVendorFinanceSummary,
  reviewFinanceRefund,
  saveCommissionRule,
  upsertEscrowRules,
  upsertPayoutSchedule,
} = require("../../controllers/adminFinanceController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) return value.map((item) => item?.[key]).flat();
      return value[key];
    }, doc);

const setByPath = (doc, path, value) => {
  const parts = String(path).split(".");
  let target = doc;
  parts.slice(0, -1).forEach((part) => {
    target[part] = target[part] || {};
    target = target[part];
  });
  target[parts[parts.length - 1]] = value;
};

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    const actual = getByPath(doc, key);

    if (expected?.$in) {
      const accepted = expected.$in.map(stringify);
      return Array.isArray(actual)
        ? actual.some((item) => accepted.includes(stringify(item)))
        : accepted.includes(stringify(actual));
    }
    if (expected?.$nin) return !expected.$nin.map(stringify).includes(stringify(actual));
    if (expected?.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    if (expected?.$gte && actual < expected.$gte) return false;
    if (expected?.$lte && actual > expected.$lte) return false;
    if (expected instanceof RegExp) return expected.test(String(actual || ""));
    if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
    return stringify(actual) === stringify(expected);
  });

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec = {}) {
    const entries = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      for (const [path, direction] of entries) {
        const leftValue = getByPath(left, path);
        const rightValue = getByPath(right, path);
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

  async findOne(query = {}) {
    return this.docs.find((doc) => matchesQuery(doc, query)) || null;
  }

  async insertOne(doc) {
    const saved = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(saved);
    return { insertedId: saved._id };
  }

  async insertMany(rows) {
    this.docs.push(...rows);
    return { insertedCount: rows.length };
  }

  async deleteMany(query = {}) {
    const before = this.docs.length;
    this.docs = this.docs.filter((doc) => !matchesQuery(doc, query));
    return { deletedCount: before - this.docs.length };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...query, ...(update.$setOnInsert || {}) };
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };

    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    return { matchedCount: 1, modifiedCount: 1, upsertedId: doc._id };
  }
}

const buildDb = (collections = {}) => {
  const registry = new Map(
    Object.entries(collections).map(([name, docs]) => [
      name,
      docs instanceof FakeCollection ? docs : new FakeCollection(docs),
    ]),
  );

  return {
    collection: (name) => {
      if (!registry.has(name)) registry.set(name, new FakeCollection([]));
      return registry.get(name);
    },
  };
};

const buildReq = ({ db, body = {}, params = {}, query = {} } = {}) => ({
  body,
  params,
  query,
  user: { uid: "admin-1", role: "admin", email: "admin@example.com" },
  app: { locals: { db, models: {} } },
});

describe("adminFinanceController operations", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("builds ledger rows for sales, commission, escrow, refunds, and payouts", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T08:00:00.000Z"));

    const rows = _financeTestUtils.buildFinanceLedgerRows({
      vendors: [{ _id: "vendor-1", shopName: "Dhaka Fresh", sellerTier: "star" }],
      orders: [
        {
          _id: "order-1",
          status: "delivered",
          paymentMethod: "cod",
          createdAt: new Date("2026-01-01T09:00:00.000Z"),
          deliveredAt: new Date("2026-01-01T09:00:00.000Z"),
          products: [
            {
              productId: "rice-1",
              title: "Premium Rice",
              vendorId: "vendor-1",
              categoryId: "grocery",
              price: 1000,
              quantity: 2,
              itemStatus: "delivered",
              adminCommissionAmount: 200,
              vendorEarningAmount: 1800,
            },
          ],
        },
      ],
      returns: [
        {
          _id: "return-1",
          orderId: "order-1",
          vendorId: "vendor-1",
          refundStatus: "approved",
          vendorDeduction: 300,
          refundApprovedAt: new Date("2026-01-09T09:00:00.000Z"),
        },
      ],
      payouts: [
        {
          _id: "payout-1",
          vendorId: "vendor-1",
          vendorName: "Dhaka Fresh",
          status: "paid",
          amount: 500,
          paidAt: new Date("2026-01-10T09:00:00.000Z"),
        },
      ],
      escrowRules: { holdPercentage: 10, holdDaysAfterDelivery: 7 },
    });

    expect(rows.map((row) => row.type)).toEqual([
      "sale",
      "commission",
      "escrow_hold",
      "escrow_release",
      "refund",
      "payout",
    ]);
    expect(rows.find((row) => row.type === "sale")).toMatchObject({ amount: 2000, balanceAfter: 2000 });
    expect(rows.find((row) => row.type === "commission")).toMatchObject({ amount: -200, balanceAfter: 1800 });
    expect(rows.find((row) => row.type === "escrow_hold")).toMatchObject({ amount: -180, balanceAfter: 1620 });
    expect(rows.find((row) => row.type === "escrow_release")).toMatchObject({ amount: 180, balanceAfter: 1800 });
    expect(rows.find((row) => row.type === "refund")).toMatchObject({ amount: -300, balanceAfter: 1500 });
    expect(rows.find((row) => row.type === "payout")).toMatchObject({ amount: -500, balanceAfter: 1000 });
  });

  test("builds payout queue rows with escrow holds, refund deductions, and existing payouts", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-17T08:00:00.000Z"));

    const [row] = _financeTestUtils.buildPayoutQueueRows({
      vendors: [
        {
          _id: "vendor-1",
          shopName: "Dhaka Fresh",
          sellerTier: "preferred",
          mobileBankingProvider: "bKash",
          mobileBankingNumber: "01700000000",
        },
      ],
      orders: [
        {
          _id: "order-1",
          status: "delivered",
          deliveredAt: new Date("2026-05-15T08:00:00.000Z"),
          products: [
            {
              productId: "oil-1",
              vendorId: "vendor-1",
              price: 1000,
              quantity: 1,
              itemStatus: "delivered",
              adminCommissionAmount: 100,
              vendorEarningAmount: 900,
            },
          ],
        },
      ],
      returns: [
        { _id: "return-1", vendorId: "vendor-1", refundStatus: "approved", vendorDeduction: 100 },
      ],
      payouts: [{ _id: "payout-1", vendorId: "vendor-1", status: "pending", amount: 200 }],
      escrowRules: { holdPercentage: 20, holdDaysAfterDelivery: 7 },
    });

    expect(row).toEqual(
      expect.objectContaining({
        vendorName: "Dhaka Fresh",
        vendorTier: "preferred",
        payableBalance: 420,
        withheldAmount: 180,
        pendingClearance: 180,
        refundDeductions: 100,
        paidOrPendingPayouts: 200,
        ordersCount: 1,
        payoutMethodLabel: "bKash 01700000000",
      }),
    );
  });

  test("vendor finance summary subtracts completed return deductions from payable earnings", async () => {
    const vendorId = "64f000000000000000000111";
    const db = buildDb({
      orders: [
        {
          _id: "order-1",
          status: "delivered",
          createdAt: new Date("2026-05-18T08:00:00.000Z"),
          products: [
            {
              vendorId,
              title: "HP laptop",
              price: 10000,
              quantity: 1,
              adminCommissionAmount: 0,
            },
          ],
        },
      ],
      returns: [
        {
          _id: "return-1",
          orderId: "order-1",
          vendorId,
          status: "completed",
          productTitle: "HP laptop",
          refundAmount: 10000,
          adminCommissionAmount: 0,
          vendorDeduction: 10000,
          completedAt: new Date("2026-05-19T08:00:00.000Z"),
        },
      ],
    });
    const res = createRes();

    await getVendorFinanceSummary(buildReq({ db, params: { vendorId } }), res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        grossSales: 10000,
        totalCommission: 0,
        netEarningsBeforeReturns: 10000,
        returnDeductions: 10000,
        netEarnings: 0,
        payableEarnings: 0,
        ordersCount: 1,
      }),
    });
  });

  test("exposes payout queue with schedule minimums", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-17T08:00:00.000Z"));
    const db = buildDb({
      finance_settings: [
        { _id: "payout_schedule", frequency: "weekly", cutoffDay: 0, processingDay: 1, minimumPayout: 500 },
        { _id: "escrow_rules", holdPercentage: 0, holdDaysAfterDelivery: 0, disputeHoldPercentage: 100 },
      ],
      vendors: [{ _id: "vendor-1", shopName: "Dhaka Fresh" }],
      orders: [
        {
          _id: "order-1",
          status: "delivered",
          deliveredAt: new Date("2026-05-10T08:00:00.000Z"),
          products: [
            {
              productId: "rice-1",
              vendorId: "vendor-1",
              price: 600,
              quantity: 1,
              itemStatus: "delivered",
              adminCommissionAmount: 0,
              vendorEarningAmount: 600,
            },
          ],
        },
      ],
    });
    const res = createRes();

    await getPayoutQueue(buildReq({ db }), res);

    expect(res.status).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.summary).toEqual(
      expect.objectContaining({
        totalVendors: 1,
        payableVendors: 1,
        totalPayable: 600,
      }),
    );
    expect(payload.vendors[0]).toEqual(expect.objectContaining({ vendorId: "vendor-1", meetsMinimum: true }));
  });

  test("updates payout schedule and escrow rules with finance audit entries", async () => {
    const db = buildDb();

    await upsertPayoutSchedule(
      buildReq({
        db,
        body: { frequency: "biweekly", cutoffDay: 5, processingDay: 1, minimumPayout: 1500 },
      }),
      createRes(),
    );
    await upsertEscrowRules(
      buildReq({
        db,
        body: { holdPercentage: 12, holdDaysAfterDelivery: 5, disputeHoldPercentage: 80 },
      }),
      createRes(),
    );

    expect(await db.collection("finance_settings").findOne({ _id: "payout_schedule" })).toEqual(
      expect.objectContaining({ frequency: "biweekly", cutoffDay: 5, processingDay: 1, minimumPayout: 1500 }),
    );
    expect(await db.collection("finance_settings").findOne({ _id: "escrow_rules" })).toEqual(
      expect.objectContaining({ holdPercentage: 12, holdDaysAfterDelivery: 5, disputeHoldPercentage: 80 }),
    );
    expect(db.collection("audit_logs").docs.map((entry) => entry.action)).toEqual([
      "finance.payout_schedule.updated",
      "finance.escrow_rules.updated",
    ]);
  });

  test("saves commission rules and rejects invalid rates", async () => {
    const db = buildDb();
    const res = createRes();

    await saveCommissionRule(
      buildReq({
        db,
        body: {
          name: "Fashion preferred",
          categoryId: "fashion",
          vendorTier: "preferred",
          campaignType: "eid_sale",
          commissionRate: 8.5,
          priority: 10,
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("commission_rules").docs[0]).toEqual(
      expect.objectContaining({
        name: "Fashion preferred",
        categoryId: "fashion",
        vendorTier: "preferred",
        campaignType: "eid_sale",
        commissionRate: 8.5,
      }),
    );
    expect(db.collection("audit_logs").docs[0]).toEqual(
      expect.objectContaining({ action: "finance.commission_rule.saved" }),
    );

    const invalidRes = createRes();
    await saveCommissionRule(buildReq({ db, body: { commissionRate: 150 } }), invalidRes);

    expect(invalidRes.status).toHaveBeenCalledWith(400);
    expect(invalidRes.json).toHaveBeenCalledWith({
      success: false,
      error: "commissionRate must be between 0 and 100",
    });
  });

  test("approves refund workflow decisions and writes audit history", async () => {
    const db = buildDb({
      returns: [
        {
          _id: "return-1",
          orderId: "order-1",
          vendorId: "vendor-1",
          status: "requested",
          refundAmount: 300,
        },
      ],
    });
    const res = createRes();

    await reviewFinanceRefund(
      buildReq({
        db,
        params: { returnId: "return-1" },
        body: { decision: "approve", refundMethod: "store_credit", amount: 350, note: "Valid return" },
      }),
      res,
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(await db.collection("returns").findOne({ _id: "return-1" })).toEqual(
      expect.objectContaining({
        refundStatus: "approved",
        refundMethod: "store_credit",
        refundAmount: 350,
        vendorDeduction: 350,
        financeNote: "Valid return",
      }),
    );
    expect(db.collection("audit_logs").docs[0]).toEqual(
      expect.objectContaining({
        action: "finance.refund.approve",
        target: { type: "return", id: "return-1" },
      }),
    );
  });

  test("downloads revenue report CSV from real order and refund data", async () => {
    const db = buildDb({
      vendors: [{ _id: "vendor-1", shopName: "Dhaka Fresh" }],
      categories: [{ _id: "grocery", name: "Grocery" }],
      orders: [
        {
          _id: "order-1",
          status: "delivered",
          paymentMethod: "cod",
          createdAt: new Date("2026-05-01T08:00:00.000Z"),
          products: [
            {
              productId: "rice-1",
              vendorId: "vendor-1",
              categoryId: "grocery",
              price: 1000,
              quantity: 2,
              adminCommissionAmount: 200,
              vendorEarningAmount: 1800,
            },
          ],
        },
      ],
      returns: [
        {
          _id: "return-1",
          vendorId: "vendor-1",
          refundStatus: "approved",
          refundAmount: 250,
          refundApprovedAt: new Date("2026-05-02T08:00:00.000Z"),
        },
      ],
    });
    const res = createRes();

    await downloadRevenueReport(buildReq({ db, query: { format: "csv", groupBy: "day" } }), res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
    expect(res.send.mock.calls[0][0]).toContain('"Bucket","GMV","Commission","VendorEarnings","Refunds","Orders"');
    expect(res.send.mock.calls[0][0]).toContain('"2026-05-01","2000","200","1800","0","1"');
  });
});
