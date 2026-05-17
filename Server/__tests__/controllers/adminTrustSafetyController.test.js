const { ObjectId } = require("mongodb");

const {
  _trustSafetyTestUtils,
  createBanListEntry,
  createSellerPenalty,
  createTermsVersion,
  moderateReview,
  resolveDispute,
} = require("../../controllers/adminTrustSafetyController");

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
    if (expected.$exists !== undefined) return expected.$exists ? actual !== undefined : actual === undefined;
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

  applyUpdate(doc, update) {
    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$push || {}).forEach(([path, value]) => {
      const existing = getByPath(doc, path);
      setByPath(doc, path, Array.isArray(existing) ? [...existing, value] : [value]);
    });
  }

  async updateOne(query, update) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    this.applyUpdate(doc, update);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(query, update) {
    const matched = this.docs.filter((doc) => matchesQuery(doc, query));
    matched.forEach((doc) => this.applyUpdate(doc, update));
    return { matchedCount: matched.length, modifiedCount: matched.length };
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

describe("adminTrustSafetyController", () => {
  test("builds fraud dashboard from review velocity, shared device, COD abuse, manual flags, and bans", () => {
    const now = new Date("2026-05-17T12:00:00.000Z");
    const users = [
      { _id: "user-1", email: "buyer@example.com", deviceFingerprint: "dev-1", ipAddress: "103.1.1.1", profile: { firstName: "Buyer" } },
      { _id: "user-2", email: "other@example.com", deviceFingerprint: "dev-1", ipAddress: "103.1.1.1" },
    ];
    const reviews = Array.from({ length: 5 }, (_, index) => ({
      _id: `review-${index}`,
      userId: "user-1",
      createdAt: new Date("2026-05-17T10:00:00.000Z"),
    }));
    const orders = [
      { _id: "order-1", userId: "user-1", paymentMethod: "cod", status: "cancelled", total: 500 },
      { _id: "order-2", userId: "user-1", paymentMethod: "cod", status: "failed_delivery", total: 700 },
      { _id: "order-3", userId: "user-1", paymentMethod: "cod", status: "delivered", total: 900 },
    ];

    const result = _trustSafetyTestUtils.buildFraudDashboard({
      users,
      orders,
      reviews,
      flags: [{ _id: "flag-1", subjectId: "user-1", type: "manual_flag", severity: "medium", reason: "Manual review" }],
      bans: [{ type: "ip", value: "103.1.1.1", status: "active" }],
      now,
    });

    expect(result.summary).toEqual(expect.objectContaining({
      activeBans: 1,
      codAbuseFlags: 1,
      reviewVelocityFlags: 1,
      sharedDeviceGroups: 1,
    }));
    expect(result.rows.map((row) => row.type)).toEqual(expect.arrayContaining([
      "abnormal_review_velocity",
      "cod_abuse",
      "shared_device",
      "shared_ip",
      "manual_flag",
    ]));
  });

  test("builds review moderation queue and verifies purchase evidence", () => {
    const rows = _trustSafetyTestUtils.buildReviewModerationQueue({
      products: [{ _id: "prod-1", title: "Phone" }],
      reviews: [
        {
          _id: "review-1",
          productId: "prod-1",
          userId: "user-1",
          userName: "Amina",
          rating: 5,
          comment: "Looks like spam",
          flagged: true,
          createdAt: new Date(),
        },
      ],
      orders: [
        {
          _id: "order-1",
          userId: "user-1",
          status: "delivered",
          products: [{ productId: "prod-1" }],
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      productName: "Phone",
      verifiedPurchase: true,
      flagged: true,
    }));
  });

  test("builds dispute queue with SLA breach metadata", () => {
    const rows = _trustSafetyTestUtils.buildDisputeQueue({
      returns: [
        {
          _id: "return-1",
          orderId: "order-1",
          status: "under_review",
          vendorResponse: "disputed",
          disputeReason: "Item used",
          createdAt: new Date("2026-05-14T10:00:00.000Z"),
        },
      ],
      payments: [
        {
          _id: "payment-1",
          orderId: "order-2",
          status: "payment_disputed",
          amount: 1200,
          createdAt: new Date("2026-05-17T08:00:00.000Z"),
        },
      ],
      disputes: [{ _id: "case-1", type: "vendor_customer", reason: "Chat conflict", status: "open" }],
      now: new Date("2026-05-17T12:00:00.000Z"),
    });

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.source === "returns")).toEqual(expect.objectContaining({ breached: true }));
    expect(rows.map((row) => row.type)).toEqual(expect.arrayContaining(["return", "payment", "vendor_customer"]));
  });

  test("builds seller penalty and content policy queues", () => {
    const penaltyRows = _trustSafetyTestUtils.buildSellerPenaltyLog({
      vendors: [
        {
          _id: "vendor-1",
          shopName: "BD Shop",
          violations: [{ _id: "vio-1", strikeNumber: 1, reason: "Late shipping", status: "active", createdAt: new Date() }],
        },
      ],
      penalties: [{ _id: "penalty-1", vendorId: "vendor-1", type: "suspension", reason: "Fraud", status: "appealed" }],
    });

    const contentRows = _trustSafetyTestUtils.buildContentPolicyViolations({
      products: [{ _id: "prod-1", title: "Fake brand phone", vendorId: "vendor-1" }],
      vendors: [{ _id: "vendor-1", shopName: "Replica Market" }],
      violations: [{ _id: "custom-1", subjectTitle: "Banner", issue: "Prohibited image", status: "open" }],
    });

    expect(penaltyRows).toHaveLength(2);
    expect(contentRows.map((row) => row.subjectType)).toEqual(expect.arrayContaining(["product", "shop", "content"]));
  });

  test("moderates a review and stores moderation action", async () => {
    const db = buildDb({ reviews: [{ _id: "review-1", flagged: true, status: "flagged" }] });
    const res = createRes();

    await moderateReview(
      buildReq({ db, params: { reviewId: "review-1" }, body: { action: "mark_verified", reason: "Order delivered" } }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(db.collection("reviews").docs[0]).toEqual(expect.objectContaining({
      verified: true,
      verifiedPurchase: true,
      moderationStatus: "approved",
    }));
    expect(db.collection("review_moderation_actions").docs).toHaveLength(1);
  });

  test("creates a seller strike and auto-suspends after third strike", async () => {
    const db = buildDb({
      vendors: [
        {
          _id: "vendor-1",
          shopName: "Strike Shop",
          violations: [
            { strikeNumber: 1, status: "active" },
            { strikeNumber: 2, status: "active" },
          ],
        },
      ],
    });
    const res = createRes();

    await createSellerPenalty(
      buildReq({ db, body: { vendorId: "vendor-1", type: "strike", reason: "Repeated SLA breach" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("seller_penalties").docs).toHaveLength(1);
    expect(db.collection("vendors").docs[0]).toEqual(expect.objectContaining({ status: "suspended", adminStatus: "suspended" }));
    expect(db.collection("vendors").docs[0].violations).toHaveLength(3);
  });

  test("creates ban entries, resolves disputes, and publishes terms with forced acceptance", async () => {
    const db = buildDb({
      trust_safety_disputes: [{ _id: "dispute-1", status: "open" }],
      policy_terms_versions: [{ _id: "old-terms", type: "terms", version: "2026.01", status: "published" }],
      users: [{ _id: "user-1", email: "buyer@example.com" }],
    });
    const banRes = createRes();
    const disputeRes = createRes();
    const termsRes = createRes();

    await createBanListEntry(
      buildReq({ db, body: { type: "ip", value: "103.1.1.1", reason: "COD abuse" } }),
      banRes,
    );
    await resolveDispute(
      buildReq({
        db,
        params: { disputeId: "dispute-1" },
        body: { source: "trust_safety_disputes", decision: "close", resolutionNote: "Resolved by admin" },
      }),
      disputeRes,
    );
    await createTermsVersion(
      buildReq({
        db,
        body: {
          type: "terms",
          version: "2026.05",
          title: "Marketplace Terms",
          body: "Updated seller and buyer rules",
          publish: true,
          forceAccept: true,
        },
      }),
      termsRes,
    );

    expect(banRes.status).toHaveBeenCalledWith(201);
    expect(disputeRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(termsRes.status).toHaveBeenCalledWith(201);
    expect(db.collection("trust_safety_bans").docs[0]).toEqual(expect.objectContaining({ status: "active" }));
    expect(db.collection("trust_safety_disputes").docs[0]).toEqual(expect.objectContaining({ status: "resolved" }));
    expect(db.collection("users").docs[0]).toEqual(expect.objectContaining({
      termsAcceptanceRequired: true,
      requiredTermsVersion: "2026.05",
    }));
  });
});
