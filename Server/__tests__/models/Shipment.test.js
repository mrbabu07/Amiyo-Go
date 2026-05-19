const { ObjectId } = require("mongodb");
const Shipment = require("../../models/Shipment");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

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
  return stringify(actual) === stringify(expected);
};

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => matchesValue(getByPath(doc, key), expected));

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort() {
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

  async createIndex() {}

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

  async updateOne(query, update) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$push || {}).forEach(([path, value]) => {
      const current = getByPath(doc, path) || [];
      setByPath(doc, path, [...current, value]);
    });
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

const buildModel = (collections = {}) => {
  const registry = new Map(
    Object.entries(collections).map(([name, docs]) => [
      name,
      docs instanceof FakeCollection ? docs : new FakeCollection(docs),
    ]),
  );
  const db = {
    collection: (name) => {
      if (!registry.has(name)) registry.set(name, new FakeCollection([]));
      return registry.get(name);
    },
  };
  return { model: new Shipment(db), registry };
};

const buildOrder = ({ orderId = new ObjectId(), vendorId = new ObjectId(), paymentMethod = "cod" } = {}) => ({
  _id: orderId,
  userId: "user-1",
  paymentMethod,
  shippingInfo: {
    name: "Rahim",
    phone: "01700000000",
    address: "Mirpur",
    district: "Dhaka",
  },
  products: [
    {
      productId: new ObjectId(),
      vendorId,
      title: "HP laptop",
      sku: "HP-15",
      price: 10000,
      quantity: 1,
    },
  ],
});

describe("Shipment model", () => {
  test("creates a vendor shipment from an order with COD tracking", async () => {
    const vendorId = new ObjectId();
    const { model, registry } = buildModel();

    const shipment = await model.createFromOrder(buildOrder({ vendorId }), vendorId, {
      actorRole: "vendor",
      actorId: "vendor-user",
    });

    expect(shipment.shipmentState).toBe("created");
    expect(shipment.codState).toBe("cod_pending");
    expect(shipment.codAmount).toBe(10000);
    expect(shipment.items).toEqual([expect.objectContaining({ title: "HP laptop", quantity: 1 })]);
    expect(registry.get("shipment_events").docs[0]).toEqual(
      expect.objectContaining({
        shipmentId: shipment._id.toString(),
        eventType: "shipment.created",
      }),
    );
  });

  test("creates a platform shipment for order items without vendor id", async () => {
    const { model } = buildModel();
    const order = buildOrder({ vendorId: null });

    const shipment = await model.createFromOrder(order, "platform");

    expect(shipment.vendorId).toBe("platform");
    expect(shipment.itemCount).toBe(1);
    expect(shipment.codAmount).toBe(10000);
    expect(shipment.items).toEqual([
      expect.objectContaining({ title: "HP laptop", quantity: 1 }),
    ]);
  });

  test("marks packed through the required pending packing step", async () => {
    const vendorId = new ObjectId();
    const { model } = buildModel();
    const shipment = await model.createFromOrder(buildOrder({ vendorId }), vendorId);

    const updated = await model.markPacked(shipment._id, {
      checklist: ["invoice", "sealed"],
      weight: 1.7,
      dimensions: { length: 30, width: 20, height: 8 },
      packingNotes: "Bubble wrapped",
    }, { role: "vendor", id: "vendor-user" });

    expect(updated.shipmentState).toBe("packed");
    expect(updated.weight).toBe(1.7);
    expect(updated.packingSlipUrl).toContain("/api/vendor/logistics/shipments/");
    expect(updated.events.map((event) => event.eventType)).toEqual([
      "shipment.created",
      "shipment.pending_packing",
      "shipment.packed",
    ]);
  });

  test("moves failed delivery attempts to RTO and COD failure", async () => {
    const vendorId = new ObjectId();
    const { model } = buildModel();
    const shipment = await model.createFromOrder(buildOrder({ vendorId }), vendorId);

    await model.assignCourier(shipment._id, {
      courierCode: "REDX",
      courierName: "RedX",
      courierProvider: "redx",
      courierBookingStatus: "booked",
      courierConsignmentId: "parcel-100",
      courierTrackingUrl: "https://redx.example/track/RX-100",
      courierBooking: { attempted: true, provider: "redx", status: "booked", consignmentId: "parcel-100" },
      trackingNumber: "RX-100",
    }, { role: "admin", id: "admin-1" });
    await model.recordDeliveryAttempt(shipment._id, { outcome: "failed", reason: "Customer unreachable" });
    await model.recordDeliveryAttempt(shipment._id, { outcome: "failed", reason: "Customer unreachable" });
    const updated = await model.recordDeliveryAttempt(shipment._id, { outcome: "failed", reason: "Customer unreachable" });

    expect(updated.shipmentState).toBe("return_to_origin");
    expect(updated.codState).toBe("cod_failed");
    expect(updated.deliveryAttempts).toHaveLength(3);
    expect(updated.courierProvider).toBe("redx");
    expect(updated.courierBookingStatus).toBe("booked");
    expect(updated.courierConsignmentId).toBe("parcel-100");
  });

  test("runs reverse logistics from return request to restock decision", async () => {
    const returnId = new ObjectId();
    const vendorId = new ObjectId();
    const { model } = buildModel();

    const reverseShipment = await model.ensureReverseForReturn({
      _id: returnId,
      orderId: new ObjectId(),
      userId: "user-1",
      vendorId,
      reason: "Defective Product",
      quantity: 1,
    });
    const updated = await model.updateReverseStateByReturn(returnId, "restocked", {
      inspectionResult: "sealed and sellable",
      restockQuantity: 1,
    }, { role: "vendor", id: "vendor-user" });

    expect(reverseShipment.reverseState).toBe("return_requested");
    expect(updated.reverseState).toBe("restocked");
    expect(updated.inspectionResult).toBe("sealed and sellable");
    expect(updated.restockQuantity).toBe(1);
  });
});
