const { ObjectId } = require("mongodb");

jest.mock("../services/emailService", () => ({
  sendLowStockAlert: jest.fn().mockResolvedValue(undefined),
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/invoiceService", () => ({
  generateInvoice: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../models/DeliverySettings", () => ({
  getSettings: jest.fn().mockResolvedValue({}),
}));

jest.mock("../utils/deliveryCalculator", () => ({
  calculateDeliveryBreakdown: jest.fn(({ items }) => ({
    totalDeliveryFee: 60,
    breakdown: [
      {
        vendorId: items[0]?.vendorId,
        deliveryFee: 60,
        deliveryMethod: "standard",
      },
    ],
  })),
}));

jest.mock("../services/orderEventService", () => ({
  appendOrderEvent: jest.fn().mockResolvedValue(null),
  getTimelineForOrder: jest.fn().mockResolvedValue([]),
}));

jest.mock("../services/marketplaceEventBus", () => ({
  publish: jest.fn().mockResolvedValue({ success: true }),
}));

const orderController = require("../controllers/orderController");
const MarketplaceEventBus = require("../services/marketplaceEventBus");

const SMOKE_EMAIL = "smoke@gmail.com";

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return value instanceof ObjectId ? value.toString() : String(value);
};

const getPathValues = (doc, path) =>
  path.split(".").reduce(
    (values, part) =>
      values.flatMap((value) => {
        if (Array.isArray(value)) return value.map((item) => item?.[part]);
        return value?.[part];
      }),
    [doc],
  );

const sameValue = (actual, expected) => normalizeId(actual) === normalizeId(expected);

const matchesCondition = (actualValues, expected) => {
  const values = Array.isArray(actualValues) ? actualValues.flat() : [actualValues];
  if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (Array.isArray(expected.$in)) {
      return values.some((actual) => expected.$in.some((item) => sameValue(actual, item)));
    }
    if (expected.$ne !== undefined) {
      return values.every((actual) => !sameValue(actual, expected.$ne));
    }
  }
  return values.some((actual) => sameValue(actual, expected));
};

const matchesQuery = (doc, query = {}) => {
  if (!query || Object.keys(query).length === 0) return true;
  if (query.$and) return query.$and.every((clause) => matchesQuery(doc, clause));
  if (query.$or) return query.$or.some((clause) => matchesQuery(doc, clause));

  return Object.entries(query).every(([key, expected]) =>
    matchesCondition(getPathValues(doc, key), expected),
  );
};

const assignPath = (doc, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((current, part) => {
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    return current[part];
  }, doc);
  target[last] = value;
};

const applyUpdate = (doc, update = {}, inserting = false) => {
  Object.entries(update.$set || {}).forEach(([key, value]) => assignPath(doc, key, value));
  Object.entries(update.$inc || {}).forEach(([key, value]) => {
    assignPath(doc, key, Number(getPathValues(doc, key)[0] || 0) + Number(value || 0));
  });
  Object.entries(update.$push || {}).forEach(([key, value]) => {
    const current = getPathValues(doc, key)[0];
    const next = Array.isArray(current) ? current : [];
    next.push(value);
    assignPath(doc, key, next);
  });
  if (inserting) {
    Object.entries(update.$setOnInsert || {}).forEach(([key, value]) => assignPath(doc, key, value));
  }
};

const seedFromQuery = (query = {}) =>
  Object.entries(query).reduce((doc, [key, value]) => {
    if (key.startsWith("$")) return doc;
    if (value && typeof value === "object" && !(value instanceof ObjectId)) return doc;
    assignPath(doc, key, value);
    return doc;
  }, {});

class FakeCursor {
  constructor(docs) {
    this.docs = docs;
  }

  sort(sortSpec = {}) {
    const [[key, direction] = []] = Object.entries(sortSpec);
    if (!key) return this;
    this.docs = [...this.docs].sort((left, right) => {
      const leftValue = getPathValues(left, key)[0];
      const rightValue = getPathValues(right, key)[0];
      return (leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0) * (direction < 0 ? -1 : 1);
    });
    return this;
  }

  skip(count = 0) {
    this.docs = this.docs.slice(Number(count) || 0);
    return this;
  }

  limit(count = this.docs.length) {
    this.docs = this.docs.slice(0, Number(count) || this.docs.length);
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

  async updateOne(query, update, options = {}) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (doc) {
      applyUpdate(doc, update);
      return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
    }

    if (!options.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
    const inserted = seedFromQuery(query);
    applyUpdate(inserted, update, true);
    inserted._id = inserted._id || new ObjectId();
    this.docs.push(inserted);
    return { matchedCount: 0, modifiedCount: 0, upsertedId: inserted._id };
  }

  async updateMany(query, update) {
    const docs = this.docs.filter((doc) => matchesQuery(doc, query));
    docs.forEach((doc) => applyUpdate(doc, update));
    return { matchedCount: docs.length, modifiedCount: docs.length };
  }

  async countDocuments(query = {}) {
    return this.docs.filter((doc) => matchesQuery(doc, query)).length;
  }
}

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

const createSmokeApp = () => {
  const orderId = new ObjectId("64f100000000000000000001");
  const vendorId = new ObjectId("64f100000000000000000101");
  const productId = new ObjectId("64f100000000000000000201");
  const ownerUserId = new ObjectId("64f100000000000000000301");

  const collections = {
    orders: new FakeCollection(),
    vendors: new FakeCollection([
      {
        _id: vendorId,
        shopName: "Smoke Test Shop",
        slug: "smoke-test-shop",
        email: SMOKE_EMAIL,
        phone: "01711111111",
        ownerUserId,
        pickupAddress: {
          name: "Smoke Test Shop",
          phone: "01711111111",
          address: "Smoke Warehouse",
          district: "Dhaka",
        },
      },
    ]),
    vendorOrders: new FakeCollection(),
    shipments: new FakeCollection(),
    dispatch_assignments: new FakeCollection(),
    payments: new FakeCollection(),
    notifications: new FakeCollection(),
    marketplace_events: new FakeCollection(),
    marketplace_notification_queue: new FakeCollection(),
  };

  const db = {
    collection: jest.fn((name) => {
      if (!collections[name]) collections[name] = new FakeCollection();
      return collections[name];
    }),
  };

  const productDoc = {
    _id: productId,
    title: "Smoke Market Rice",
    image: "smoke-rice.jpg",
    vendorId: vendorId.toString(),
    categoryId: "smoke-category",
    stock: 20,
    price: 1200,
  };

  const Order = {
    collection: collections.orders,
    create: jest.fn(async (orderData) => {
      const subtotal = orderData.products.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      );
      const deliveryCharge = Number(orderData.deliveryCharge || 0);
      const order = {
        _id: orderId,
        ...orderData,
        subtotal,
        deliveryCharge,
        couponDiscount: 0,
        pointsDiscount: 0,
        totalDiscount: 0,
        total: subtotal + deliveryCharge,
        totalAmount: subtotal + deliveryCharge,
        paymentStatus: "pending",
        status: "pending",
        createdAt: new Date("2026-05-21T08:00:00.000Z"),
        updatedAt: new Date("2026-05-21T08:00:00.000Z"),
      };
      await collections.orders.insertOne(order);
      return orderId;
    }),
    findById: jest.fn(async (id) => collections.orders.findOne({ _id: new ObjectId(normalizeId(id)) })),
  };
  Order.collection.db = db;

  const Product = {
    collection: { db },
    findById: jest.fn(async (id) => (normalizeId(id) === productId.toString() ? productDoc : null)),
    updateStock: jest.fn(async (id, quantity) => {
      if (normalizeId(id) === productId.toString()) productDoc.stock -= Number(quantity || 0);
      return { modifiedCount: 1 };
    }),
  };

  const VendorOrder = {
    create: jest.fn(async (vendorOrderData) => {
      const vendorOrder = {
        _id: new ObjectId("64f100000000000000000401"),
        ...vendorOrderData,
        createdAt: new Date("2026-05-21T08:00:00.000Z"),
        updatedAt: new Date("2026-05-21T08:00:00.000Z"),
      };
      await collections.vendorOrders.insertOne(vendorOrder);
      return vendorOrder;
    }),
  };

  const Shipment = {
    createFromOrder: jest.fn(async (order, selectedVendorId, data = {}) => {
      const shipment = {
        _id: new ObjectId("64f100000000000000000501"),
        orderId: normalizeId(order._id),
        userId: order.userId,
        vendorId: normalizeId(selectedVendorId),
        trackingNumber: "AMG-SMOKE-001",
        shipmentState: data.shipmentState || "created",
        codState: "cod_pending",
        pickupAddress: data.pickupAddress,
        deliveryAddress: order.shippingInfo,
        createdAt: new Date("2026-05-21T08:00:00.000Z"),
        updatedAt: new Date("2026-05-21T08:00:00.000Z"),
      };
      await collections.shipments.insertOne(shipment);
      return shipment;
    }),
  };

  const app = {
    locals: {
      db,
      models: {
        Order,
        Product,
        VendorOrder,
        Shipment,
        Notification: {
          create: jest.fn((notification) => collections.notifications.insertOne(notification)),
        },
        Vendor: {
          findById: jest.fn((id) => collections.vendors.findOne({ _id: new ObjectId(normalizeId(id)) })),
        },
        User: {
          findById: jest.fn((id) =>
            normalizeId(id) === ownerUserId.toString()
              ? { _id: ownerUserId, firebaseUid: "smoke-vendor-firebase", email: SMOKE_EMAIL }
              : null,
          ),
        },
      },
    },
  };

  return { app, collections, ids: { orderId, vendorId, productId } };
};

describe("real-market smoke test", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("smoke@gmail.com can place a vendor COD order and admin can confirm delivery payment", async () => {
    const { app, collections, ids } = createSmokeApp();

    const createRes = buildResponse();
    await orderController.createOrder(
      {
        user: { uid: "smoke-user-firebase", email: SMOKE_EMAIL },
        body: {
          products: [
            {
              productId: ids.productId.toString(),
              price: 1200,
              quantity: 1,
            },
          ],
          total: 1200,
          shippingInfo: {
            name: "Smoke Customer",
            email: SMOKE_EMAIL,
            phone: "01700000000",
            address: "Smoke House 1",
            city: "Dhaka",
            district: "Dhaka",
            upazila: "Dhanmondi",
            union: "Ward 1",
            area: "Road 1",
          },
          paymentMethod: "cod",
          vendorNotes: {
            [ids.vendorId.toString()]: "Smoke checkout note",
          },
        },
        app,
      },
      createRes,
    );

    expect(createRes.status).toHaveBeenCalledWith(201);
    expect(createRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const createdOrder = await collections.orders.findOne({ _id: ids.orderId });
    expect(createdOrder.shippingInfo.email).toBe(SMOKE_EMAIL);
    expect(createdOrder.products[0]).toEqual(
      expect.objectContaining({
        vendorId: ids.vendorId.toString(),
        vendorEmail: SMOKE_EMAIL,
        vendorNote: "Smoke checkout note",
      }),
    );
    expect(collections.vendorOrders.docs[0]).toEqual(
      expect.objectContaining({
        vendorId: ids.vendorId.toString(),
        userId: "smoke-user-firebase",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }),
    );
    expect(MarketplaceEventBus.publish).toHaveBeenCalledWith(
      app,
      "order.created",
      expect.objectContaining({
        userId: "smoke-user-firebase",
        paymentMethod: "cod",
        notifications: expect.arrayContaining([
          expect.objectContaining({ userId: "smoke-user-firebase", type: "order_created" }),
          expect.objectContaining({ userId: "smoke-vendor-firebase", type: "vendor_new_order" }),
        ]),
      }),
      expect.any(Object),
    );

    const deliveredRes = buildResponse();
    await orderController.markAdminCodDelivered(
      {
        user: { uid: "smoke-admin-firebase", role: "admin", email: SMOKE_EMAIL },
        params: { id: ids.orderId.toString() },
        body: {
          courierName: "Smoke Courier",
          note: "Smoke order delivered and cash collected",
        },
        app,
      },
      deliveredRes,
    );

    expect(deliveredRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          status: "delivered",
          codCollectionStatus: "collected",
        }),
      }),
    );
    const deliveredOrder = await collections.orders.findOne({ _id: ids.orderId });
    expect(deliveredOrder).toEqual(
      expect.objectContaining({
        status: "delivered",
        deliveryStatus: "delivered",
        codCollectionStatus: "collected",
        codCollected: true,
      }),
    );
    expect(collections.shipments.docs[0]).toEqual(
      expect.objectContaining({
        shipmentState: "delivered",
        codState: "cod_collected",
      }),
    );

    const confirmRes = buildResponse();
    await orderController.confirmAdminCodPayment(
      {
        user: { uid: "smoke-admin-firebase", role: "admin", email: SMOKE_EMAIL },
        params: { id: ids.orderId.toString() },
        body: {
          amount: 1260,
          reference: "SMOKE-COD-001",
          courierName: "Smoke Courier",
          note: "Smoke COD cash received by admin",
        },
        app,
      },
      confirmRes,
    );

    expect(confirmRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          paymentStatus: "paid",
          codCollectionStatus: "collected",
        }),
      }),
    );
    const paidOrder = await collections.orders.findOne({ _id: ids.orderId });
    expect(paidOrder).toEqual(
      expect.objectContaining({
        paymentStatus: "paid",
        codRemittanceStatus: "remitted",
        codPaymentConfirmed: true,
        codConfirmedAmount: 1260,
        codPaymentReference: "SMOKE-COD-001",
      }),
    );
    expect(collections.payments.docs[0]).toEqual(
      expect.objectContaining({
        orderId: ids.orderId.toString(),
        userId: "smoke-user-firebase",
        amount: 1260,
        status: "completed",
        paymentMethod: "cod",
      }),
    );
    expect(collections.vendorOrders.docs[0]).toEqual(
      expect.objectContaining({
        status: "delivered",
        paymentStatus: "paid",
        codPaymentConfirmed: true,
      }),
    );
    expect(collections.shipments.docs[0]).toEqual(
      expect.objectContaining({
        shipmentState: "delivered",
        codState: "cod_remitted",
      }),
    );

    const reconciliationRes = buildResponse();
    await orderController.getAdminCodReconciliation(
      {
        user: { uid: "smoke-admin-firebase", role: "admin", email: SMOKE_EMAIL },
        query: {},
        app,
      },
      reconciliationRes,
    );

    expect(reconciliationRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({
            totalCod: 1,
            confirmed: 1,
            awaitingConfirmation: 0,
          }),
          orders: [
            expect.objectContaining({
              customerName: "Smoke Customer",
              paymentStatus: "paid",
              codCollectionStatus: "collected",
              paymentConfirmed: true,
            }),
          ],
        }),
      }),
    );
  });
});
