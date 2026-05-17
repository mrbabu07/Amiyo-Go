const { ObjectId } = require("mongodb");

jest.mock("../../services/emailService", () => ({
  sendEmail: jest.fn(() => Promise.resolve({ success: true, mock: true })),
}));

const emailService = require("../../services/emailService");
const {
  _customerTestUtils,
  adjustCustomerLoyalty,
  mergeDuplicateCustomers,
  updateCustomerStatus,
  updateLoyaltyProgram,
} = require("../../controllers/adminCustomerController");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);

const setByPath = (doc, path, value) => {
  const parts = String(path).split(".");
  let target = doc;
  parts.slice(0, -1).forEach((part) => {
    target[part] = target[part] || {};
    target = target[part];
  });
  target[parts[parts.length - 1]] = value;
};

const matchesValue = (actual, expected) => {
  if (expected instanceof RegExp) return expected.test(String(actual || ""));
  if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.map(stringify).includes(stringify(actual));
    if (expected.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    return true;
  }
  if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
  return stringify(actual) === stringify(expected);
};

const matchesQuery = (doc, query = {}) => {
  if (query.$or) return query.$or.some((branch) => matchesQuery(doc, branch));
  return Object.entries(query).every(([key, expected]) => matchesValue(getByPath(doc, key), expected));
};

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

  skip(count) {
    this.docs = this.docs.slice(count);
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

  async countDocuments(query = {}) {
    return this.docs.filter((doc) => matchesQuery(doc, query)).length;
  }

  async insertOne(doc) {
    const saved = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(saved);
    return { insertedId: saved._id };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      if (query._id) doc._id = query._id;
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$setOnInsert || {}).forEach(([path, value]) => {
      if (getByPath(doc, path) === undefined) setByPath(doc, path, value);
    });
    return { matchedCount: 1, modifiedCount: 1, upsertedId: doc._id };
  }

  async updateMany(query, update) {
    const matched = this.docs.filter((doc) => matchesQuery(doc, query));
    matched.forEach((doc) => {
      Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    });
    return { matchedCount: matched.length, modifiedCount: matched.length };
  }

  async deleteOne(query) {
    const before = this.docs.length;
    this.docs = this.docs.filter((doc) => !matchesQuery(doc, query));
    return { deletedCount: before - this.docs.length };
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

const buildReq = ({ db, body = {}, params = {}, query = {} }) => ({
  body,
  params,
  query,
  user: { uid: "admin-1", role: "admin", email: "admin@example.com" },
  app: { locals: { db, models: {} } },
});

describe("adminCustomerController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("builds enriched customer list rows with orders, returns, tickets, loyalty, and flags", () => {
    const userId = new ObjectId();
    const rows = _customerTestUtils.buildCustomerListRows({
      users: [
        {
          _id: userId,
          firebaseUid: "fb-1",
          email: "buyer@example.com",
          profile: { firstName: "Amina", lastName: "Begum", phone: "01711111111" },
          role: "customer",
          status: "active",
        },
      ],
      orders: [
        { _id: "o1", userId: "fb-1", status: "delivered", total: 1200 },
        { _id: "o2", shippingInfo: { email: "buyer@example.com" }, status: "cancelled", total: 500 },
      ],
      returns: [{ userId: "fb-1", orderId: "o1" }],
      tickets: [{ userId: "fb-1", status: "open" }],
      loyalties: [{ userId: "fb-1", points: 750, tier: "silver" }],
      flags: [{ userId: "fb-1", type: "cod_risk", severity: "medium" }],
    });

    expect(rows[0]).toEqual(
      expect.objectContaining({
        name: "Amina Begum",
        orderCount: 2,
        totalSpend: 1200,
        returnCount: 1,
        openTickets: 1,
        loyaltyPoints: 750,
        loyaltyTier: "silver",
      }),
    );
    expect(rows[0].flags[0]).toEqual(expect.objectContaining({ type: "cod_risk" }));
  });

  test("builds customer detail with addresses, payment methods, tickets, and referrals", () => {
    const user = {
      _id: new ObjectId(),
      firebaseUid: "fb-2",
      email: "samira@example.com",
      profile: { firstName: "Samira", phone: "01811111111" },
      status: "active",
    };

    const detail = _customerTestUtils.buildCustomerDetail({
      user,
      orders: [
        { _id: "order-1", userId: "fb-2", paymentMethod: "cod", paymentStatus: "pending", status: "delivered", total: 900 },
      ],
      returns: [{ orderId: "order-1", userId: "fb-2" }],
      addresses: [{ _id: "addr-1", userId: "fb-2", district: "Dhaka", isDefault: true }],
      payments: [{ userId: "fb-2", paymentMethod: "bkash", amount: 500, status: "completed" }],
      tickets: [{ userId: "fb-2", status: "open", subject: "Delivery issue" }],
      loyalty: { userId: "fb-2", points: 300, tier: "bronze", referralCode: "REFSAMIRA", transactions: [] },
      flags: [{ userId: "fb-2", reason: "Multiple COD failures" }],
      referrals: [{ referralCode: "REFSAMIRA", status: "converted" }],
    });

    expect(detail.profile).toEqual(expect.objectContaining({ name: "Samira", tier: "bronze" }));
    expect(detail.addresses).toHaveLength(1);
    expect(detail.openTickets).toHaveLength(1);
    expect(detail.paymentMethods.map((method) => method.method)).toEqual(expect.arrayContaining(["cod", "bkash"]));
    expect(detail.referrals).toHaveLength(1);
  });

  test("suspends a customer, stores notice, sends email, and writes audit", async () => {
    const userId = new ObjectId();
    const db = buildDb({
      users: [
        {
          _id: userId,
          firebaseUid: "fb-3",
          email: "buyer@example.com",
          profile: { firstName: "Buyer" },
          role: "customer",
          status: "active",
        },
      ],
    });
    const res = createRes();

    await updateCustomerStatus(
      buildReq({
        db,
        params: { customerId: userId.toString() },
        body: { status: "suspended", reason: "Repeated fake COD orders", suspensionUntil: "2026-05-20T10:00:00.000Z" },
      }),
      res,
    );

    expect(res.json.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: "suspended" }));
    expect(db.collection("customer_notices").docs[0]).toEqual(
      expect.objectContaining({ type: "account_status", status: "suspended" }),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      "Account suspended",
      expect.stringContaining("Repeated fake COD orders"),
    );
    expect(db.collection("audit_logs").docs[0]).toEqual(expect.objectContaining({ action: "customers.status.updated" }));
  });

  test("merges duplicate accounts and combines loyalty ledgers", async () => {
    const sourceId = new ObjectId();
    const targetId = new ObjectId();
    const sourceLoyaltyId = new ObjectId();
    const targetLoyaltyId = new ObjectId();
    const db = buildDb({
      users: [
        { _id: sourceId, firebaseUid: "src-uid", email: "old@example.com", role: "customer", status: "active" },
        { _id: targetId, firebaseUid: "target-uid", email: "new@example.com", role: "customer", status: "active" },
      ],
      orders: [{ _id: "order-1", userId: "src-uid", total: 100 }],
      returns: [{ _id: "return-1", userId: "src-uid" }],
      loyalties: [
        { _id: sourceLoyaltyId, userId: "src-uid", email: "old@example.com", points: 200, totalEarned: 500, totalRedeemed: 100, transactions: [{ type: "earned", points: 500, reason: "Old", date: new Date() }] },
        { _id: targetLoyaltyId, userId: "target-uid", email: "new@example.com", points: 300, totalEarned: 800, totalRedeemed: 50, transactions: [] },
      ],
      customer_settings: [{ _id: "loyalty_program", tierThresholds: { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 } }],
    });
    const res = createRes();

    await mergeDuplicateCustomers(
      buildReq({
        db,
        body: { sourceCustomerId: sourceId.toString(), targetCustomerId: targetId.toString(), reason: "Same phone" },
      }),
      res,
    );

    expect(res.json.mock.calls[0][0].data.moved.orders).toBe(1);
    expect(db.collection("orders").docs[0]).toEqual(
      expect.objectContaining({ userId: "target-uid", customerId: targetId.toString() }),
    );
    expect(db.collection("users").docs[0]).toEqual(
      expect.objectContaining({ status: "merged", mergedIntoCustomerId: targetId.toString() }),
    );
    expect(db.collection("loyalties").docs).toHaveLength(1);
    expect(db.collection("loyalties").docs[0]).toEqual(
      expect.objectContaining({ points: 500, totalEarned: 1300, tier: "silver" }),
    );
  });

  test("awards and deducts loyalty points with admin ledger entries", async () => {
    const userId = new ObjectId();
    const loyaltyId = new ObjectId();
    const db = buildDb({
      users: [{ _id: userId, firebaseUid: "loyal-uid", email: "loyal@example.com", role: "customer" }],
      loyalties: [{ _id: loyaltyId, userId: "loyal-uid", email: "loyal@example.com", points: 900, totalEarned: 900, totalRedeemed: 0, tier: "bronze", transactions: [] }],
      customer_settings: [{ _id: "loyalty_program", tierThresholds: { bronze: 0, silver: 1000, gold: 5000, platinum: 10000 } }],
    });
    const res = createRes();

    await adjustCustomerLoyalty(
      buildReq({
        db,
        params: { customerId: userId.toString() },
        body: { action: "award", points: 200, reason: "Service recovery" },
      }),
      res,
    );

    expect(db.collection("loyalties").docs[0]).toEqual(
      expect.objectContaining({ points: 1100, totalEarned: 1100, tier: "silver" }),
    );
    expect(db.collection("loyalties").docs[0].transactions[0]).toEqual(
      expect.objectContaining({ action: "admin_award", points: 200 }),
    );
  });

  test("updates loyalty programme tier thresholds", async () => {
    const db = buildDb();
    const res = createRes();

    await updateLoyaltyProgram(
      buildReq({
        db,
        body: {
          tierThresholds: { bronze: 0, silver: 1500, gold: 6000, platinum: 12000 },
          referralCredit: 700,
          referredWelcomeCredit: 150,
        },
      }),
      res,
    );

    expect(res.json.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        _id: "loyalty_program",
        referralCredit: 700,
        tierThresholds: expect.objectContaining({ silver: 1500, platinum: 12000 }),
      }),
    );
  });

  test("builds referral dashboard from loyalty accounts and referral records", () => {
    const dashboard = _customerTestUtils.buildReferralDashboard({
      users: [{ _id: "u1", firebaseUid: "ref-uid", email: "ref@example.com", profile: { firstName: "Ref" } }],
      loyalties: [
        { userId: "ref-uid", email: "ref@example.com", referralCode: "REF123", transactions: [] },
        { userId: "new-uid", email: "new@example.com", referredBy: "ref-uid", points: 100, transactions: [{ type: "earned", points: 100, reason: "Welcome bonus" }] },
      ],
      referrals: [{ referralCode: "REF123", clicks: 4, status: "converted", creditAwarded: 500, fraudFlagged: true }],
    });

    expect(dashboard.summary).toEqual(
      expect.objectContaining({
        referralLinks: 1,
        conversions: 2,
        creditAwarded: 600,
        fraudFlags: 1,
      }),
    );
    expect(dashboard.rows[0]).toEqual(expect.objectContaining({ referralCode: "REF123", referrerName: "Ref" }));
  });
});
