const { ObjectId } = require("mongodb");
const speakeasy = require("speakeasy");
const { roleCan, STAFF_ROLES } = require("../../config/permissions");
const {
  _platformTestUtils,
  inviteStaffAccount,
  sendNotificationBroadcast,
  setupAdminTwoFactor,
  updateCommissionRuleTable,
  updatePlatformConfig,
  updateRoleSessionPolicy,
  upsertCategoryAttributes,
  upsertCategoryNode,
  verifyAdminTwoFactor,
} = require("../../controllers/adminPlatformController");

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
    rows.forEach((row) => this.docs.push({ ...row, _id: row._id || new ObjectId() }));
    return { insertedCount: rows.length };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...(update.$setOnInsert || {}) };
      Object.entries(query).forEach(([key, value]) => {
        if (!key.startsWith("$")) setByPath(doc, key, value);
      });
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.entries(update.$setOnInsert || {}).forEach(([path, value]) => {
      if (getByPath(doc, path) === undefined) setByPath(doc, path, value);
    });
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

const buildReq = ({ db, body = {}, params = {}, query = {} }) => ({
  body,
  params,
  query,
  user: { uid: "admin-1", role: "admin", email: "admin@example.com" },
  app: { locals: { db, models: {} } },
  headers: {},
  socket: {},
});

describe("adminPlatformController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("defines granular admin roles and resolves broadcast recipients", () => {
    expect(STAFF_ROLES).toEqual(expect.arrayContaining([
      "finance_manager",
      "support_agent",
      "vendor_manager",
      "campaign_manager",
      "logistics_manager",
    ]));
    expect(roleCan({ role: "finance_manager" }, "finance", "update")).toBe(true);
    expect(roleCan({ role: "finance_manager" }, "products", "delete")).toBe(false);

    const users = [
      { _id: "u1", firebaseUid: "customer-1", email: "c@example.com", role: "customer", status: "active" },
      { _id: "u2", firebaseUid: "vendor-uid", email: "v@example.com", role: "vendor", status: "active" },
      { _id: "u3", firebaseUid: "admin-uid", email: "a@example.com", role: "finance_manager", status: "active" },
    ];
    const vendors = [{ _id: "vendor-1", userId: "u2", shopName: "Vendor Shop" }];

    expect(_platformTestUtils.resolveBroadcastRecipients({ users, vendors, target: "all_vendors" })).toHaveLength(1);
    expect(_platformTestUtils.resolveBroadcastRecipients({ users, vendors, target: "admins" })[0].role).toBe("finance_manager");

    const overview = _platformTestUtils.buildCommunicationOverview({
      users,
      vendors,
      broadcasts: [{ status: "sent", createdAt: new Date() }],
      templates: [{ key: "order_confirm" }],
      campaigns: [{ status: "scheduled" }],
      announcements: [{ status: "active" }],
    });
    expect(overview.kpis).toEqual(expect.objectContaining({
      totalUsers: 3,
      totalVendors: 1,
      broadcastsSent: 1,
      scheduledCampaigns: 1,
      activeAnnouncements: 1,
    }));
  });

  test("sends notification broadcasts without paid APIs and stores delivery queues", async () => {
    const db = buildDb({
      users: [
        { _id: "u1", firebaseUid: "buyer-1", email: "buyer@example.com", phone: "01700000000", role: "customer", status: "active" },
        { _id: "u2", firebaseUid: "vendor-1", email: "vendor@example.com", role: "vendor", status: "active" },
      ],
      vendors: [{ _id: "vendor-doc", userId: "u2" }],
    });
    const res = createRes();

    await sendNotificationBroadcast(
      buildReq({
        db,
        body: {
          title: "Maintenance tonight",
          body: "Storefront maintenance starts at midnight.",
          target: "customers",
          channels: ["in_app", "email", "sms"],
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data).toEqual(expect.objectContaining({
      recipientCount: 1,
      deliveryRows: 3,
    }));
    expect(db.collection("notifications").docs).toHaveLength(1);
    expect(db.collection("notification_deliveries").docs.map((row) => row.channel)).toEqual(["in_app", "email", "sms"]);
    expect(db.collection("audit_logs").docs[0]).toEqual(expect.objectContaining({ action: "platform.broadcast.sent" }));
  });

  test("updates platform config, category attributes, and commission table", async () => {
    const categoryId = new ObjectId();
    const db = buildDb({
      categories: [{ _id: categoryId, name: "Electronics", slug: "electronics", parentId: null, attributes: [] }],
    });

    const configRes = createRes();
    await updatePlatformConfig(
      buildReq({
        db,
        body: {
          featureFlags: { guestCheckout: false, referrals: false },
          maintenanceMode: { enabled: true, message: "Deploy window" },
          returnPolicy: { defaultWindowDays: 15 },
          regenerateSitemap: true,
        },
      }),
      configRes,
    );
    expect(configRes.json.mock.calls[0][0].data.featureFlags.guestCheckout).toBe(false);
    expect(configRes.json.mock.calls[0][0].data.seo.sitemapRegenerationRequestedAt).toBeInstanceOf(Date);

    const categoryRes = createRes();
    await upsertCategoryNode(
      buildReq({ db, body: { name: "Phones", parentId: categoryId.toString(), displayOrder: 2 } }),
      categoryRes,
    );
    expect(categoryRes.status).toHaveBeenCalledWith(201);
    expect(db.collection("categories").docs.find((item) => item.name === "Phones").slug).toBe("phones");

    const attributesRes = createRes();
    await upsertCategoryAttributes(
      buildReq({
        db,
        params: { categoryId: categoryId.toString() },
        body: {
          attributes: [
            { name: "RAM", type: "select", required: true, filterable: true, options: ["4GB", "8GB"] },
          ],
        },
      }),
      attributesRes,
    );
    expect(attributesRes.json.mock.calls[0][0].data.attributes[0]).toEqual(expect.objectContaining({
      key: "ram",
      required: true,
      filterable: true,
    }));
    expect(db.collection("category_fields").docs[0].attributes).toHaveLength(1);

    const commissionRes = createRes();
    await updateCommissionRuleTable(
      buildReq({
        db,
        body: {
          rules: [
            { name: "Electronics preferred", categoryId: categoryId.toString(), vendorTier: "preferred", commissionRate: 6.5 },
          ],
        },
      }),
      commissionRes,
    );
    expect(commissionRes.json.mock.calls[0][0].data[0]).toEqual(expect.objectContaining({
      name: "Electronics preferred",
      commissionRate: 6.5,
      source: "platform_config",
    }));
  });

  test("invites staff, verifies speakeasy 2FA, and saves session timeout policy", async () => {
    const db = buildDb({ users: [] });

    const inviteRes = createRes();
    await inviteStaffAccount(
      buildReq({
        db,
        body: { name: "Finance Lead", email: "finance@example.com", role: "finance_manager" },
      }),
      inviteRes,
    );
    expect(inviteRes.status).toHaveBeenCalledWith(201);
    const staff = db.collection("users").docs.find((user) => user.email === "finance@example.com");
    expect(staff.role).toBe("finance_manager");
    expect(staff.permissions.finance).toEqual(expect.arrayContaining(["read", "update"]));

    const setupRes = createRes();
    await setupAdminTwoFactor(
      buildReq({ db, params: { staffId: staff._id.toString() } }),
      setupRes,
    );
    expect(setupRes.json.mock.calls[0][0].data.provider).toBe("speakeasy");

    const pendingSecret = staff.security.twoFactor.pendingSecret;
    const token = speakeasy.totp({ secret: pendingSecret, encoding: "base32" });
    const verifyRes = createRes();
    await verifyAdminTwoFactor(
      buildReq({ db, params: { staffId: staff._id.toString() }, body: { token } }),
      verifyRes,
    );
    expect(verifyRes.json.mock.calls[0][0].data).toEqual(expect.objectContaining({ enabled: true }));
    expect(staff.security.twoFactor.enabled).toBe(true);
    expect(staff.security.twoFactor.secret).toBe(pendingSecret);

    const sessionRes = createRes();
    await updateRoleSessionPolicy(
      buildReq({
        db,
        params: { role: "finance_manager" },
        body: { sessionTimeoutMinutes: 12 },
      }),
      sessionRes,
    );
    expect(sessionRes.json.mock.calls[0][0].data).toEqual({
      role: "finance_manager",
      sessionTimeoutMinutes: 12,
    });
    expect(db.collection("platform_settings").docs[0].sessionTimeoutByRole.finance_manager).toBe(12);
  });
});
