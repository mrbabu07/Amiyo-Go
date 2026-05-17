const { ObjectId } = require("mongodb");
const {
  _logisticsTestUtils,
  recordCodRemittance,
  scheduleFailedDeliveryReattempt,
  upsertCourierPartner,
  upsertDeliveryFeeRule,
  upsertDeliveryZone,
} = require("../../controllers/adminLogisticsController");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.send = jest.fn(() => res);
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
  if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.map(stringify).includes(stringify(actual));
    return true;
  }
  if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
  if (expected instanceof RegExp) return expected.test(String(actual || ""));
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
      doc = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      if (query._id && !(query._id instanceof ObjectId)) doc._id = query._id;
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

describe("adminLogisticsController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("builds dispatch manifest grouped by assigned courier with COD totals", () => {
    const orderId = new ObjectId();
    const manifest = _logisticsTestUtils.buildDispatchManifest({
      zones: [{ _id: "zone-dhaka", name: "Dhaka", code: "dhaka", districts: ["Dhaka"], courierPartnerIds: [] }],
      couriers: [{ _id: "courier-1", name: "Pathao", serviceZones: ["dhaka"] }],
      assignments: [{ orderId: orderId.toString(), courierName: "Pathao", trackingNumber: "PX-1" }],
      orders: [
        {
          _id: orderId,
          status: "ready_to_ship",
          paymentMethod: "cod",
          total: 1250,
          shippingInfo: { name: "Rahim", phone: "017", district: "Dhaka", address: "Mirpur" },
          products: [{ vendorName: "BD Shop" }],
        },
      ],
    });

    expect(manifest.totalOrders).toBe(1);
    expect(manifest.totalCodToCollect).toBe(1250);
    expect(manifest.groups[0]).toEqual(
      expect.objectContaining({
        courierName: "Pathao",
        totalOrders: 1,
        codToCollect: 1250,
      }),
    );
    expect(manifest.rows[0]).toEqual(expect.objectContaining({ trackingNumber: "PX-1", zoneName: "Dhaka" }));
  });

  test("creates a delivery zone with COD availability and audit trail", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertDeliveryZone(
      buildReq({
        db,
        body: {
          name: "Dhaka Metro",
          districts: ["Dhaka"],
          courierPartnerIds: ["courier-1"],
          codAvailable: true,
          slaHours: 36,
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("delivery_zones").docs[0]).toEqual(
      expect.objectContaining({
        name: "Dhaka Metro",
        code: "dhaka-metro",
        codAvailable: true,
        slaHours: 36,
      }),
    );
    expect(db.collection("audit_logs").docs[0]).toEqual(
      expect.objectContaining({ action: "logistics.zone.created" }),
    );
  });

  test("saves courier partner SLA per zone", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertCourierPartner(
      buildReq({
        db,
        body: {
          name: "Redx",
          serviceZones: ["dhaka", "sylhet"],
          baseDeliveryCost: 90,
          codCollectionFee: 12,
          slaByZone: [{ zoneCode: "dhaka", processingHours: 12, deliveryDaysMin: 1, deliveryDaysMax: 2 }],
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("courier_partners").docs[0]).toEqual(
      expect.objectContaining({
        name: "Redx",
        baseDeliveryCost: 90,
        codCollectionFee: 12,
        slaByZone: [expect.objectContaining({ zoneCode: "dhaka", processingHours: 12 })],
      }),
    );
  });

  test("saves delivery fee rules for weight, zone, and free shipping logic", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertDeliveryFeeRule(
      buildReq({
        db,
        body: {
          name: "Dhaka heavy item",
          ruleType: "weight_based",
          zoneCode: "dhaka",
          minWeightKg: 5,
          baseFee: 80,
          feePerKg: 15,
          freeShippingThreshold: 3000,
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("delivery_fee_rules").docs[0]).toEqual(
      expect.objectContaining({
        ruleType: "weight_based",
        zoneCode: "dhaka",
        minWeightKg: 5,
        feePerKg: 15,
        freeShippingThreshold: 3000,
      }),
    );
  });

  test("tracks COD float from collected courier cash and remittances", async () => {
    const orderId = new ObjectId();
    const summary = _logisticsTestUtils.buildCodFloatTracker({
      orders: [{ _id: orderId, status: "delivered", paymentMethod: "cod", total: 1000 }],
      assignments: [{ orderId: orderId.toString(), courierName: "Paperfly", codCollectionStatus: "collected" }],
      remittances: [{ courierName: "Paperfly", remittedAmount: 600, forwardedToVendorAmount: 300 }],
    });

    expect(summary.summary).toEqual(
      expect.objectContaining({
        codOrders: 1,
        collectedByCouriers: 1000,
        remittedToPlatform: 600,
        forwardedToVendors: 300,
        outstandingWithCouriers: 400,
      }),
    );
  });

  test("records COD remittance and marks selected dispatch assignments remitted", async () => {
    const db = buildDb({
      dispatch_assignments: [{ orderId: "order-1", courierName: "Pathao", codCollectionStatus: "collected" }],
    });
    const res = createRes();

    await recordCodRemittance(
      buildReq({
        db,
        body: {
          courierName: "Pathao",
          collectedAmount: 1200,
          remittedAmount: 1000,
          forwardedToVendorAmount: 700,
          orderIds: ["order-1"],
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("cod_remittances").docs[0]).toEqual(
      expect.objectContaining({ courierName: "Pathao", remittedAmount: 1000, discrepancyAmount: 200 }),
    );
    expect(db.collection("dispatch_assignments").docs[0].codCollectionStatus).toBe("remitted");
  });

  test("schedules failed delivery re-attempt and updates order delivery status", async () => {
    const orderId = new ObjectId();
    const db = buildDb({
      orders: [{ _id: orderId, status: "failed_delivery", deliveryStatus: "failed_delivery" }],
    });
    const res = createRes();

    await scheduleFailedDeliveryReattempt(
      buildReq({
        db,
        params: { orderId: orderId.toString() },
        body: {
          courierName: "Pathao",
          nextAttemptAt: "2026-05-18T10:00:00.000Z",
          redeliveryFee: 40,
          reason: "Customer unavailable",
        },
      }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: "reattempt_scheduled", redeliveryFee: 40 }),
      }),
    );
    expect(db.collection("orders").docs[0]).toEqual(
      expect.objectContaining({ deliveryStatus: "reattempt_scheduled", redeliveryFee: 40 }),
    );
  });
});
