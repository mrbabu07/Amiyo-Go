const { ObjectId } = require("mongodb");

jest.mock("../../services/orderEventService", () => ({
  appendOrderEvent: jest.fn(async () => null),
  getTimelineForOrder: jest.fn(async () => []),
}));

const {
  getAdminOrders,
  getAdminOrderById,
  getAdminCodReconciliation,
  markAdminCodDelivered,
  confirmAdminCodPayment,
  getAdminSlaBreaches,
  getAdminFraudOrders,
  adminReassignCourier,
  adminChangeDeliveryAddress,
  adminExtendReturnWindow,
  adminForceRefundOrder,
} = require("../../controllers/orderController");

const { appendOrderEvent, getTimelineForOrder } = require("../../services/orderEventService");

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

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((branch) => matchesQuery(doc, branch));
    if (key === "$and") return expected.every((branch) => matchesQuery(doc, branch));

    const actual = getByPath(doc, key);
    if (expected?.$in) {
      return expected.$in.map(stringify).includes(stringify(actual));
    }
    if (expected instanceof RegExp) {
      return expected.test(String(actual || ""));
    }
    if (expected?.$gte || expected?.$lte) {
      const actualDate = new Date(actual);
      if (expected.$gte && actualDate < expected.$gte) return false;
      if (expected.$lte && actualDate > expected.$lte) return false;
      return true;
    }
    return stringify(actual) === stringify(expected);
  });

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec = {}) {
    const [[path, direction] = []] = Object.entries(sortSpec);
    if (path) {
      this.docs.sort((left, right) => {
        const leftValue = getByPath(left, path);
        const rightValue = getByPath(right, path);
        if (leftValue > rightValue) return direction < 0 ? -1 : 1;
        if (leftValue < rightValue) return direction < 0 ? 1 : -1;
        return 0;
      });
    }
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

  async updateOne(query, update, options = {}) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc) {
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };
      const inserted = {};
      Object.entries(query || {}).forEach(([path, value]) => {
        if (value && typeof value === "object" && !(value instanceof ObjectId)) return;
        setByPath(inserted, path, value);
      });
      Object.entries(update.$setOnInsert || {}).forEach(([path, value]) => setByPath(inserted, path, value));
      Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(inserted, path, value));
      this.docs.push(inserted);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }

    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$push || {}).forEach(([path, value]) => {
      const current = getByPath(doc, path);
      if (!Array.isArray(current)) setByPath(doc, path, []);
      getByPath(doc, path).push(value);
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

class FakeOrderModel {
  constructor(docs, db) {
    this.docs = docs;
    this.collection = new FakeCollection(docs);
    this.collection.db = db;
  }

  async findAllPaginated(filter = {}) {
    let orders = [...this.docs];
    if (filter.status && filter.status !== "all") {
      orders = orders.filter((order) => order.status === filter.status);
    }
    if (filter.vendorId) {
      orders = orders.filter((order) =>
        (order.products || []).some((product) => stringify(product.vendorId) === stringify(filter.vendorId)),
      );
    }
    if (filter.paymentMethod && filter.paymentMethod !== "all") {
      orders = orders.filter((order) => String(order.paymentMethod).toLowerCase() === filter.paymentMethod);
    }
    if (filter.deliveryZone) {
      orders = orders.filter((order) =>
        [order.deliveryZone, order.shippingInfo?.district, order.shippingInfo?.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(String(filter.deliveryZone).toLowerCase())),
      );
    }

    return {
      orders,
      total: orders.length,
      page: Number(filter.page || 1),
      limit: Number(filter.limit || 20),
      pages: 1,
    };
  }

  async findById(id) {
    return this.docs.find((order) => stringify(order._id) === stringify(id)) || null;
  }

  async getAdminStatusCounts() {
    return this.docs.reduce(
      (counts, order) => {
        const status = order.status || "pending";
        counts[status] = (counts[status] || 0) + 1;
        counts.all += 1;
        return counts;
      },
      { all: 0 },
    );
  }
}

const buildFixture = () => {
  const vendorA = new ObjectId();
  const vendorB = new ObjectId();
  const sharedAddress = {
    name: "Rafiq",
    phone: "01700000000",
    address: "House 10",
    district: "Dhaka",
    city: "Dhaka",
  };

  const orders = [
    {
      _id: new ObjectId(),
      userId: "buyer-1",
      status: "shipped",
      paymentMethod: "cod",
      paymentStatus: "pending",
      codCollectionStatus: "discrepancy",
      codDiscrepancyAmount: 250,
      total: 4200,
      createdAt: new Date(),
      updatedAt: new Date(),
      shippingInfo: sharedAddress,
      products: [
        {
          productId: "p1",
          title: "Cotton Panjabi",
          vendorId: vendorA,
          price: 2100,
          quantity: 2,
          itemStatus: "shipped",
          shippedAt: new Date("2025-01-01T18:00:00Z"),
          codCollected: true,
          codCollectedAt: new Date("2025-01-02T10:00:00Z"),
        },
      ],
      statusHistory: [
        { status: "shipped", changedAt: new Date("2025-01-01T18:00:00Z"), changedBy: "vendor-1" },
      ],
      adminActions: [
        { type: "note", label: "Admin note added", createdAt: new Date("2025-01-01T19:00:00Z") },
      ],
      paymentEvents: [
        { status: "cod_pending", label: "COD pending", createdAt: new Date("2025-01-01T08:05:00Z") },
      ],
    },
    {
      _id: new ObjectId(),
      userId: "buyer-2",
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
      total: 1800,
      createdAt: new Date("2024-01-01T08:00:00Z"),
      shippingInfo: sharedAddress,
      products: [{ productId: "p2", title: "Rice Cooker", vendorId: vendorB, price: 1800, quantity: 1 }],
    },
    {
      _id: new ObjectId(),
      userId: "buyer-3",
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
      total: 56000,
      createdAt: new Date(),
      shippingInfo: sharedAddress,
      products: [{ productId: "p3", title: "Phone", vendorId: vendorB, price: 56000, quantity: 1 }],
    },
    {
      _id: new ObjectId(),
      userId: "buyer-4",
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
      total: 1200,
      createdAt: new Date(),
      shippingInfo: sharedAddress,
      products: [{ productId: "p4", title: "T-shirt", vendorId: vendorB, price: 1200, quantity: 1 }],
    },
  ];

  const vendors = [
    { _id: vendorA, shopName: "Alpha Shop" },
    { _id: vendorB, shopName: "Beta Traders" },
  ];

  return { orders, vendors, vendorA, vendorB };
};

const createReq = ({ orders, vendors, vendorOrders = [], query = {}, params = {}, body = {} }) => {
  const collections = {
    vendors: new FakeCollection(vendors),
    vendorOrders: new FakeCollection(vendorOrders),
    payments: new FakeCollection([]),
    dispatch_assignments: new FakeCollection([]),
    shipments: new FakeCollection([]),
  };
  const db = {
    collection: (name) => collections[name] || new FakeCollection([]),
  };
  const Order = new FakeOrderModel(orders, db);

  return {
    _collections: collections,
    query,
    params,
    body,
    user: { uid: "admin-1", role: "admin" },
    app: {
      locals: {
        db,
        models: { Order },
      },
    },
  };
};

describe("admin order management controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("filters global orders by status vendor payment and delivery zone with vendor enrichment", async () => {
    const fixture = buildFixture();
    const req = createReq({
      ...fixture,
      query: {
        status: "shipped",
        vendorId: fixture.vendorA.toString(),
        paymentMethod: "cod",
        deliveryZone: "Dhaka",
      },
    });
    const res = createRes();

    await getAdminOrders(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        total: 1,
        data: [
          expect.objectContaining({
            primaryVendorName: "Alpha Shop",
            deliveryZone: "Dhaka",
            itemCount: 2,
          }),
        ],
      }),
    );
  });

  test("builds an admin detail timeline from persisted events and order snapshots", async () => {
    const fixture = buildFixture();
    const vendorOrderId = new ObjectId();
    getTimelineForOrder.mockResolvedValueOnce([
      {
        status: "courier_update",
        label: "Courier pickup scanned",
        createdAt: new Date("2025-01-01T20:00:00Z"),
        actorRole: "courier",
      },
    ]);
    const req = createReq({
      ...fixture,
      vendorOrders: [
        {
          _id: vendorOrderId,
          parentOrderId: fixture.orders[0]._id.toString(),
          vendorId: fixture.vendorA.toString(),
          status: "ready_to_ship",
          totalAmount: 4200,
          updatedAt: new Date("2025-01-01T20:30:00Z"),
        },
      ],
      params: { id: fixture.orders[0]._id.toString() },
    });
    const res = createRes();

    await getAdminOrderById(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.data.primaryVendorName).toBe("Alpha Shop");
    expect(body.data.vendorOrders).toEqual([
      expect.objectContaining({ _id: vendorOrderId, status: "ready_to_ship" }),
    ]);
    expect(body.data.perVendorBreakdown[0]).toEqual(
      expect.objectContaining({
        vendorOrderId: vendorOrderId.toString(),
        vendorOrderStatus: "ready_to_ship",
        vendorOrderTotal: 4200,
      }),
    );
    expect(body.data.timeline.map((event) => event.label)).toEqual(
      expect.arrayContaining(["Order placed", "Courier pickup scanned", "Admin note added", "COD cash collected"]),
    );
    expect(body.data.codReconciliation.reconciliationStatus).toBe("discrepancy");
  });

  test("reports COD reconciliation, SLA breaches, and fraud queue signals", async () => {
    const fixture = buildFixture();

    const codRes = createRes();
    await getAdminCodReconciliation(createReq(fixture), codRes);
    expect(codRes.json.mock.calls[0][0].data.summary).toEqual(
      expect.objectContaining({ totalCod: 4, discrepancies: 1, confirmed: 0 }),
    );

    const slaRes = createRes();
    await getAdminSlaBreaches(createReq(fixture), slaRes);
    expect(slaRes.json.mock.calls[0][0].data.breaches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: fixture.orders[1]._id.toString(),
          breachType: "processing",
        }),
      ]),
    );

    const fraudRes = createRes();
    await getAdminFraudOrders(createReq({ ...fixture, query: { abnormalAmount: 20000 } }), fraudRes);
    const flagged = fraudRes.json.mock.calls[0][0].data.orders;
    expect(flagged.some((order) => order.signals.some((signal) => signal.type === "multiple_cod_same_address"))).toBe(true);
    expect(flagged.some((order) => order.signals.some((signal) => signal.type === "abnormal_order_size"))).toBe(true);
  });

  test("marks a COD order delivered so payment confirmation becomes available", async () => {
    const fixture = buildFixture();
    const orderId = fixture.orders[1]._id.toString();
    const req = createReq({
      ...fixture,
      params: { id: orderId },
      body: { courierName: "Pathao", note: "Customer received product" },
      vendorOrders: [
        {
          _id: new ObjectId(),
          parentOrderId: orderId,
          vendorId: fixture.vendorB.toString(),
          status: "shipped",
          paymentStatus: "pending",
        },
      ],
    });
    const res = createRes();

    await markAdminCodDelivered(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "COD order marked delivered",
        data: expect.objectContaining({
          status: "delivered",
          codCollectionStatus: "collected",
        }),
      }),
    );
    expect(fixture.orders[1]).toEqual(
      expect.objectContaining({
        status: "delivered",
        deliveryStatus: "delivered",
        codCollectionStatus: "collected",
        codCollected: true,
      }),
    );
    expect(fixture.orders[1].products[0]).toEqual(
      expect.objectContaining({
        itemStatus: "delivered",
        codCollected: true,
      }),
    );
    expect(req._collections.vendorOrders.docs[0]).toEqual(
      expect.objectContaining({
        status: "delivered",
        deliveryStatus: "delivered",
        codCollectionStatus: "collected",
      }),
    );

    const codRes = createRes();
    await getAdminCodReconciliation(req, codRes);
    const row = codRes.json.mock.calls[0][0].data.orders.find((item) => item.orderId === orderId);
    expect(row).toEqual(
      expect.objectContaining({
        delivered: true,
        awaitingConfirmation: true,
        waitingDelivery: false,
      }),
    );
    expect(appendOrderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        status: "delivered",
        actorRole: "admin",
      }),
    );
  });

  test("confirms received COD payment and writes payment evidence", async () => {
    const fixture = buildFixture();
    const orderId = fixture.orders[1]._id.toString();
    fixture.orders[1].status = "delivered";
    fixture.orders[1].products[0].itemStatus = "delivered";
    const req = createReq({
      ...fixture,
      params: { id: orderId },
      body: { collectedAmount: 1800, reference: "CASH-123", courierName: "Pathao", note: "Cash received" },
      vendorOrders: [
        {
          _id: new ObjectId(),
          parentOrderId: orderId,
          paymentStatus: "pending",
        },
      ],
    });
    const res = createRes();

    await confirmAdminCodPayment(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "COD payment confirmed",
        data: expect.objectContaining({
          paymentStatus: "paid",
          codCollectionStatus: "collected",
        }),
      }),
    );
    expect(fixture.orders[1]).toEqual(
      expect.objectContaining({
        paymentStatus: "paid",
        codCollectionStatus: "collected",
        codRemittanceStatus: "remitted",
        codPaymentConfirmed: true,
        codConfirmedAmount: 1800,
        codPaymentReference: "CASH-123",
      }),
    );
    expect(fixture.orders[1].products[0]).toEqual(expect.objectContaining({ codCollected: true }));
    expect(req._collections.vendorOrders.docs[0]).toEqual(
      expect.objectContaining({
        paymentStatus: "paid",
        codCollectionStatus: "collected",
        codRemittanceStatus: "remitted",
        codPaymentConfirmed: true,
      }),
    );
    expect(req._collections.payments.docs[0]).toEqual(
      expect.objectContaining({
        orderId,
        paymentMethod: "cod",
        status: "completed",
        transactionId: "CASH-123",
      }),
    );
    expect(appendOrderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        status: "cod_payment_confirmed",
        actorRole: "admin",
      }),
    );
  });

  test("blocks COD payment confirmation before delivery or cash collection", async () => {
    const fixture = buildFixture();
    const orderId = fixture.orders[1]._id.toString();
    const req = createReq({
      ...fixture,
      params: { id: orderId },
      body: { collectedAmount: 1800 },
    });
    const res = createRes();

    await confirmAdminCodPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "COD payment can be confirmed only after the order is delivered or COD cash is collected",
      }),
    );
    expect(fixture.orders[1].paymentStatus).toBe("pending");
  });

  test("applies admin override actions for courier address return window and refund", async () => {
    const fixture = buildFixture();
    const orderId = fixture.orders[0]._id.toString();

    await adminReassignCourier(
      createReq({
        ...fixture,
        params: { id: orderId },
        body: { courierName: "Pathao Courier", trackingNumber: "TRK-1", riderName: "Hasan" },
      }),
      createRes(),
    );
    expect(fixture.orders[0].courierAssignment).toEqual(
      expect.objectContaining({ courierName: "Pathao Courier", trackingNumber: "TRK-1" }),
    );

    await adminChangeDeliveryAddress(
      createReq({
        ...fixture,
        params: { id: orderId },
        body: { shippingInfo: { district: "Chattogram", address: "New address" } },
      }),
      createRes(),
    );
    expect(fixture.orders[0].shippingInfo).toEqual(
      expect.objectContaining({ district: "Chattogram", address: "New address" }),
    );

    await adminExtendReturnWindow(
      createReq({
        ...fixture,
        params: { id: orderId },
        body: { returnWindowUntil: "2026-06-01T12:00:00Z", note: "Manual extension" },
      }),
      createRes(),
    );
    expect(fixture.orders[0].returnWindow).toEqual(
      expect.objectContaining({ note: "Manual extension" }),
    );

    await adminForceRefundOrder(
      createReq({
        ...fixture,
        params: { id: orderId },
        body: { amount: 500, reason: "Ops refund" },
      }),
      createRes(),
    );
    expect(fixture.orders[0]).toEqual(
      expect.objectContaining({ refundStatus: "refunded", paymentStatus: "refunded", refundAmount: 500 }),
    );
  });
});
