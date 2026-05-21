const { ObjectId } = require("mongodb");
const {
  getVendorManagementProfile,
  updateVendorStatus,
  updateVendorHomepageFeature,
  issueVendorViolation,
  bulkVendorAction,
} = require("../../controllers/adminVendorManagementController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value));

const getValuesByPath = (doc, path) => {
  const parts = String(path).split(".");
  const walk = (value, index) => {
    if (value === undefined || value === null) return [];
    if (index >= parts.length) return [value];
    if (Array.isArray(value)) return value.flatMap((item) => walk(item, index));
    return walk(value[parts[index]], index + 1);
  };
  return walk(doc, 0);
};

const matchesExpected = (actualValues, expected) => {
  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof ObjectId)) {
    if (expected.$in) {
      const expectedValues = expected.$in.map(stringify);
      return actualValues.some((actual) => expectedValues.includes(stringify(actual)));
    }
    return true;
  }

  return actualValues.some((actual) => stringify(actual) === stringify(expected));
};

const matchesQuery = (doc, query = {}) => {
  if (query.$or) return query.$or.some((branch) => matchesQuery(doc, branch));

  return Object.entries(query).every(([key, expected]) => {
    const actualValues = getValuesByPath(doc, key);
    return matchesExpected(actualValues, expected);
  });
};

const setByPath = (doc, path, value) => {
  const parts = path.split(".");
  let target = doc;
  parts.slice(0, -1).forEach((part) => {
    target[part] = target[part] || {};
    target = target[part];
  });
  target[parts[parts.length - 1]] = value;
};

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec = {}) {
    const entries = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      for (const [key, direction] of entries) {
        const [leftValue] = getValuesByPath(left, key);
        const [rightValue] = getValuesByPath(right, key);
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
    this.docs.push(doc);
    return { insertedId: doc._id || new ObjectId() };
  }

  async updateOne(query, update) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };

    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$unset || {}).forEach(([path]) => setByPath(doc, path, undefined));
    Object.entries(update.$push || {}).forEach(([path, value]) => {
      const parts = path.split(".");
      const targetPath = parts.slice(0, -1).join(".");
      const target = targetPath ? getValuesByPath(doc, targetPath)[0] : doc;
      const key = parts[parts.length - 1];
      if (target) {
        target[key] = target[key] || [];
        target[key].push(value);
      }
    });

    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(query, update) {
    let matchedCount = 0;
    let modifiedCount = 0;
    for (const doc of this.docs) {
      if (!matchesQuery(doc, query)) continue;
      matchedCount += 1;
      Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
      modifiedCount += 1;
    }
    return { matchedCount, modifiedCount };
  }
}

const buildDb = (collections) => ({
  collection: (name) => collections[name] || new FakeCollection([]),
});

const buildReq = ({ db, vendorId, body = {} }) => ({
  params: { vendorId },
  body,
  user: { uid: "admin-1", role: "admin" },
  app: { locals: { db, models: {} } },
});

describe("adminVendorManagementController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("builds a full vendor management profile with health, KYC, payout, and performance data", async () => {
    const vendorId = new ObjectId();
    const productId = new ObjectId();
    const db = buildDb({
      vendors: new FakeCollection([
        {
          _id: vendorId,
          shopName: "Dhaka Fresh",
          status: "approved",
          bankName: "City Bank",
          bankAccountNumber: "123456",
          kyc: { status: "pending", nidFrontUrl: "https://docs/nid-front.jpg" },
          violations: [{ _id: new ObjectId(), strikeNumber: 1, reason: "Late shipment", status: "active" }],
        },
      ]),
      products: new FakeCollection([
        { _id: productId, vendorId, approvalStatus: "approved", title: "Rice" },
        { _id: new ObjectId(), vendorId, approvalStatus: "pending", title: "Oil" },
      ]),
      orders: new FakeCollection([
        {
          _id: new ObjectId(),
          status: "delivered",
          createdAt: new Date(),
          shippedAt: new Date(),
          products: [{ productId, vendorId, title: "Rice", price: 500, quantity: 2 }],
        },
        {
          _id: new ObjectId(),
          status: "cancelled",
          createdAt: new Date(),
          products: [{ productId, vendorId, title: "Rice", price: 200, quantity: 1 }],
        },
      ]),
      returns: new FakeCollection([{ _id: new ObjectId(), vendorId, createdAt: new Date() }]),
      reviews: new FakeCollection([
        { _id: new ObjectId(), vendorId, rating: 4 },
        { _id: new ObjectId(), vendorId, rating: 5 },
      ]),
      vendor_audit_logs: new FakeCollection([
        { _id: new ObjectId(), vendorId, action: "status_updated", createdAt: new Date() },
      ]),
    });

    const req = buildReq({ db, vendorId: vendorId.toString() });
    const res = createRes();

    await getVendorManagementProfile(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const profile = res.json.mock.calls[0][0].data;
    expect(profile.vendor.shopName).toBe("Dhaka Fresh");
    expect(profile.kyc.documents).toHaveLength(1);
    expect(profile.payoutDetails.bankName).toBe("City Bank");
    expect(profile.counts.products).toBe(2);
    expect(profile.performance).toEqual(
      expect.objectContaining({
        gmv: 1000,
        totalOrders: 2,
        cancellationRate: 50,
        averageReviewScore: 4.5,
      }),
    );
    expect(profile.health.warningStrikes).toBe(1);
    expect(profile.auditTrail).toHaveLength(1);
  });

  test("updates vendor status with admin note and vacation override", async () => {
    const vendorId = new ObjectId();
    const vendors = new FakeCollection([{ _id: vendorId, shopName: "Bazar House", status: "approved" }]);
    const db = buildDb({
      vendors,
      products: new FakeCollection([]),
      orders: new FakeCollection([]),
      returns: new FakeCollection([]),
      reviews: new FakeCollection([]),
      vendor_audit_logs: new FakeCollection([]),
    });

    const req = buildReq({
      db,
      vendorId: vendorId.toString(),
      body: { status: "suspended", note: "Policy breach", vacationModeOverride: true },
    });
    const res = createRes();

    await updateVendorStatus(req, res);

    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(vendors.docs[0]).toEqual(
      expect.objectContaining({
        status: "suspended",
        adminStatus: "suspended",
        statusNote: "Policy breach",
        isShopOpen: false,
      }),
    );
    expect(vendors.docs[0].vacationMode.adminOverride).toBe(true);
  });

  test("toggles vendor Shop by brand homepage visibility", async () => {
    const vendorId = new ObjectId();
    const audit = new FakeCollection([]);
    const vendors = new FakeCollection([
      { _id: vendorId, shopName: "Featured Shop", status: "approved", featuredOnHomepage: false },
    ]);
    const db = buildDb({
      vendors,
      vendor_audit_logs: audit,
    });

    const showReq = buildReq({
      db,
      vendorId: vendorId.toString(),
      body: { featuredOnHomepage: true },
    });
    const showRes = createRes();

    await updateVendorHomepageFeature(showReq, showRes);

    expect(showRes.json.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        success: true,
        message: "Vendor will show in Shop by brand",
      }),
    );
    expect(vendors.docs[0]).toEqual(
      expect.objectContaining({
        featuredOnHomepage: true,
        homepageFeaturedBy: "admin-1",
      }),
    );
    expect(vendors.docs[0].homepageFeaturedAt).toBeInstanceOf(Date);
    expect(audit.docs[0]).toEqual(expect.objectContaining({ action: "homepage_featured_updated" }));

    const hideReq = buildReq({
      db,
      vendorId: vendorId.toString(),
      body: { featuredOnHomepage: "false" },
    });
    const hideRes = createRes();

    await updateVendorHomepageFeature(hideReq, hideRes);

    expect(hideRes.json.mock.calls[0][0].message).toBe("Vendor hidden from Shop by brand");
    expect(vendors.docs[0]).toEqual(
      expect.objectContaining({
        featuredOnHomepage: false,
        homepageFeaturedAt: null,
        homepageFeaturedBy: null,
      }),
    );
  });

  test("issues third warning strike and auto-suspends the vendor", async () => {
    const vendorId = new ObjectId();
    const vendors = new FakeCollection([
      {
        _id: vendorId,
        status: "approved",
        violations: [
          { _id: new ObjectId(), strikeNumber: 1, reason: "A", status: "active" },
          { _id: new ObjectId(), strikeNumber: 2, reason: "B", status: "active" },
        ],
      },
    ]);
    const audit = new FakeCollection([]);
    const db = buildDb({
      vendors,
      products: new FakeCollection([]),
      orders: new FakeCollection([]),
      returns: new FakeCollection([]),
      reviews: new FakeCollection([]),
      vendor_audit_logs: audit,
    });

    const req = buildReq({
      db,
      vendorId: vendorId.toString(),
      body: { reason: "Repeated SLA breach", severity: "major" },
    });
    const res = createRes();

    await issueVendorViolation(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(vendors.docs[0].warningStrikes).toBe(3);
    expect(vendors.docs[0].status).toBe("suspended");
    expect(vendors.docs[0].violations).toHaveLength(3);
    expect(audit.docs[0]).toEqual(expect.objectContaining({ action: "violation_issued" }));
  });

  test("bulk vendor actions update statuses and export selected vendors", async () => {
    const vendorA = new ObjectId();
    const vendorB = new ObjectId();
    const vendors = new FakeCollection([
      { _id: vendorA, shopName: "Shop A", email: "a@example.com", status: "approved", tier: "normal" },
      { _id: vendorB, shopName: "Shop B", email: "b@example.com", status: "approved", tier: "preferred" },
    ]);
    const db = buildDb({ vendors, vendor_audit_logs: new FakeCollection([]) });

    const suspendReq = {
      body: { vendorIds: [vendorA.toString(), vendorB.toString()], action: "suspend", note: "Risk review" },
      user: { uid: "admin-1", role: "admin" },
      app: { locals: { db } },
    };
    const suspendRes = createRes();

    await bulkVendorAction(suspendReq, suspendRes);

    expect(suspendRes.json.mock.calls[0][0].data.modifiedCount).toBe(2);
    expect(vendors.docs.map((vendor) => vendor.status)).toEqual(["suspended", "suspended"]);

    const exportReq = {
      body: { vendorIds: [vendorA.toString(), vendorB.toString()], action: "export" },
      user: { uid: "admin-1", role: "admin" },
      app: { locals: { db } },
    };
    const exportRes = createRes();

    await bulkVendorAction(exportReq, exportRes);

    expect(exportRes.json.mock.calls[0][0].data.csv).toContain("Shop A");
    expect(exportRes.json.mock.calls[0][0].data.csv).toContain("Shop B");
  });
});
