const { markPickupReady, recordDeliveryAttempt } = require("../../controllers/shipmentController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const stringify = (value) => (value?.toString ? value.toString() : String(value || ""));

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
  if (expected && typeof expected === "object" && expected.$in) {
    return expected.$in.map(stringify).includes(stringify(actual));
  }
  return stringify(actual) === stringify(expected);
};

const matchesQuery = (doc, query = {}) => {
  if (query.$or) return query.$or.some((branch) => matchesQuery(doc, branch));
  return Object.entries(query).every(([key, expected]) => matchesValue(getByPath(doc, key), expected));
};

class FakeCursor {
  constructor(docs = []) {
    this.docs = docs;
  }

  toArray() {
    return Promise.resolve(this.docs);
  }
}

class FakeCollection {
  constructor(docs = []) {
    this.docs = docs;
  }

  find(query = {}) {
    return new FakeCursor(this.docs.filter((item) => matchesQuery(item, query)));
  }

  async findOne(query = {}) {
    return this.docs.find((item) => matchesQuery(item, query)) || null;
  }

  async insertOne(doc) {
    const saved = { ...doc, _id: doc._id || `doc-${this.docs.length + 1}` };
    this.docs.push(saved);
    return { insertedId: saved._id };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...(update.$setOnInsert || {}) };
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$setOnInsert || {}).forEach(([path, value]) => {
      if (getByPath(doc, path) === undefined) setByPath(doc, path, value);
    });
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(query, update) {
    const matched = this.docs.filter((item) => matchesQuery(item, query));
    matched.forEach((doc) => {
      Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    });
    return { matchedCount: matched.length, modifiedCount: matched.length };
  }
}

const buildDb = (collections = {}) => {
  const registry = new Map(
    Object.entries(collections).map(([name, docs]) => [name, new FakeCollection(docs)]),
  );
  return {
    collection: (name) => {
      if (!registry.has(name)) registry.set(name, new FakeCollection([]));
      return registry.get(name);
    },
  };
};

describe("shipmentController delivery workflow", () => {
  test("syncs delivered shipment state to order, vendor order, dispatch, and COD collection", async () => {
    const deliveredAt = new Date("2026-05-22T10:00:00.000Z");
    const codCollectedAt = new Date("2026-05-22T10:05:00.000Z");
    const db = buildDb({
      orders: [{ _id: "order-1", status: "in_transit", paymentMethod: "cod" }],
      vendorOrders: [{ parentOrderId: "order-1", vendorId: "vendor-1", status: "in_transit" }],
      dispatch_assignments: [{ orderId: "order-1", deliveryStatus: "in_transit" }],
      delivery_failures: [],
    });
    const shipmentBefore = {
      _id: "shipment-1",
      orderId: "order-1",
      vendorId: "vendor-1",
      codAmount: 1200,
      shipmentState: "out_for_delivery",
    };
    const deliveredShipment = {
      ...shipmentBefore,
      shipmentState: "delivered",
      deliveredAt,
      codState: "cod_collected",
      codCollectedAt,
    };
    const Shipment = {
      findById: jest.fn(async () => shipmentBefore),
      recordDeliveryAttempt: jest.fn(async () => deliveredShipment),
    };
    const req = {
      params: { id: "shipment-1" },
      body: { outcome: "delivered", receiverName: "Buyer", codCollected: true },
      user: { uid: "admin-1", role: "admin" },
      app: { locals: { db, models: { Shipment } } },
    };
    const res = createRes();

    await recordDeliveryAttempt(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: deliveredShipment });
    expect(db.collection("orders").docs[0]).toEqual(
      expect.objectContaining({
        status: "delivered",
        deliveryStatus: "delivered",
        deliveredAt,
        codCollectionStatus: "collected",
        codCollected: true,
        codCollectedAt,
      }),
    );
    expect(db.collection("vendorOrders").docs[0]).toEqual(
      expect.objectContaining({
        status: "delivered",
        deliveryStatus: "delivered",
        codCollectionStatus: "collected",
      }),
    );
    expect(db.collection("dispatch_assignments").docs[0]).toEqual(
      expect.objectContaining({
        deliveryStatus: "delivered",
        codCollectionStatus: "collected",
      }),
    );
  });

  test("notifies scoped logistics manager when vendor marks pickup ready", async () => {
    const db = buildDb({
      orders: [
        {
          _id: "order-1",
          userId: "buyer-1",
          paymentMethod: "cod",
          products: [{ vendorId: "vendor-1", title: "Ready item", price: 500, quantity: 1 }],
        },
      ],
      users: [
        {
          _id: "user-1",
          firebaseUid: "logistics-uid",
          role: "logistics_manager",
          status: "active",
          logisticsProfile: { assignedZones: ["union:4012"], assignedVendorIds: [] },
        },
        {
          _id: "user-2",
          firebaseUid: "other-logistics",
          role: "logistics_manager",
          status: "active",
          logisticsProfile: { assignedZones: ["union:9999"], assignedVendorIds: [] },
        },
      ],
      vendors: [{ _id: "vendor-1", shopName: "Dhaka Vendor" }],
      delivery_zones: [],
      notifications: [],
    });
    const shipment = {
      _id: "shipment-1",
      orderId: "order-1",
      vendorId: "vendor-1",
      shipmentState: "packed",
      pickupAddress: { division: "Dhaka", district: "Dhaka", upazila: "Savar", union: "Ashulia", unionId: "4012" },
      deliveryAddress: { division: "Sylhet", district: "Sylhet", union: "Other union" },
    };
    const updatedShipment = { ...shipment, shipmentState: "pickup_ready" };
    const Shipment = {
      createFromOrder: jest.fn(async () => shipment),
      markPacked: jest.fn(),
      transition: jest.fn(async () => updatedShipment),
    };
    const req = {
      params: { orderId: "order-1" },
      body: {},
      user: { uid: "vendor-user", role: "vendor", vendorId: "vendor-1" },
      vendor: { _id: "vendor-1" },
      app: { locals: { db, models: { Shipment } } },
    };
    const res = createRes();

    await markPickupReady(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedShipment });
    expect(db.collection("notifications").docs).toHaveLength(1);
    expect(db.collection("notifications").docs[0]).toEqual(
      expect.objectContaining({
        userId: "logistics-uid",
        type: "delivery",
        title: "Vendor pickup ready",
        link: "/admin/logistics?tab=work",
      }),
    );
  });
});
