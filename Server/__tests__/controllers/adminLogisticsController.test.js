const { ObjectId } = require("mongodb");
const {
  _logisticsTestUtils,
  getCourierProviderReadiness,
  getLogisticsAuditLog,
  listCourierPartners,
  listDeliveryFeeRules,
  recordCodRemittance,
  scheduleFailedDeliveryReattempt,
  upsertCourierPartner,
  upsertDeliveryFeeRule,
  upsertDeliveryZone,
  upsertPickupStaff,
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

const buildReq = ({
  db,
  body = {},
  params = {},
  query = {},
  models = {},
  user = { uid: "admin-1", role: "admin", email: "admin@example.com" },
}) => ({
  body,
  params,
  query,
  user,
  app: { locals: { db, models } },
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

  test("builds ready-to-ship collection queue with vendor pickup location", () => {
    const orderId = new ObjectId();
    const vendorId = new ObjectId();
    const queue = _logisticsTestUtils.buildReadyToShipCollectionQueue({
      orders: [
        {
          _id: orderId,
          status: "ready_to_ship",
          paymentMethod: "cod",
          shippingInfo: {
            name: "Buyer",
            phone: "018",
            district: "Dhaka",
            address: "Dhanmondi",
          },
          products: [
            {
              productId: "product-1",
              vendorId,
              vendorName: "Tech World Bangladesh",
              title: "Wireless Mouse",
              price: 900,
              quantity: 2,
              itemStatus: "pickup_ready",
              pickupReadyAt: "2026-05-21T08:00:00.000Z",
            },
            {
              productId: "product-2",
              vendorId,
              title: "Keyboard",
              price: 1200,
              quantity: 1,
              itemStatus: "packed",
            },
          ],
        },
      ],
      vendorOrders: [
        {
          parentOrderId: orderId.toString(),
          vendorId: vendorId.toString(),
          status: "pickup_ready",
          courierPickupStatus: "ready",
          totalAmount: 3000,
        },
      ],
      vendors: [
        {
          _id: vendorId,
          shopName: "Tech World Bangladesh",
          phone: "01710000000",
          pickupAddresses: [
            {
              label: "Main pickup",
              street: "House 12, Road 4",
              area: "Mirpur",
              district: "Dhaka",
              phone: "01710000000",
              isDefault: true,
              lat: 23.8041,
              lng: 90.3667,
            },
          ],
        },
      ],
    });

    expect(queue.summary).toEqual(
      expect.objectContaining({
        totalPackages: 1,
        vendorCount: 1,
        pickupReady: 1,
        codToCollect: 3000,
      }),
    );
    expect(queue.rows[0]).toEqual(
      expect.objectContaining({
        orderId: orderId.toString(),
        vendorId: vendorId.toString(),
        vendorName: "Tech World Bangladesh",
        pickupStatus: "ready",
        codAmount: 3000,
        itemCount: 1,
        pickupAddress: expect.objectContaining({
          addressText: expect.stringContaining("House 12"),
        }),
        location: expect.objectContaining({
          lat: 23.8041,
          lng: 90.3667,
          mapUrl: expect.stringContaining("google.com/maps"),
        }),
      }),
    );
  });

  test("scopes ready pickup queue by vendor pickup union", () => {
    const orderId = new ObjectId();
    const vendorId = new ObjectId();
    const queue = _logisticsTestUtils.buildReadyToShipCollectionQueue({
      scope: { scoped: true, assignedZones: ["union:4012"], assignedVendorIds: [] },
      orders: [
        {
          _id: orderId,
          status: "processing",
          paymentMethod: "cod",
          shippingInfo: { name: "Buyer", district: "Sylhet", union: "Other union" },
          products: [
            {
              productId: "product-1",
              vendorId,
              vendorName: "Dhaka Vendor",
              title: "Ready item",
              price: 700,
              quantity: 1,
              itemStatus: "pickup_ready",
            },
          ],
        },
      ],
      vendors: [
        {
          _id: vendorId,
          shopName: "Dhaka Vendor",
          pickupAddress: {
            street: "Warehouse 2",
            division: "Dhaka",
            district: "Dhaka",
            upazila: "Savar",
            union: "Ashulia",
            unionId: "4012",
          },
        },
      ],
    });

    expect(queue.summary.totalPackages).toBe(1);
    expect(queue.rows[0]).toEqual(expect.objectContaining({ vendorName: "Dhaka Vendor" }));
  });

  test("scopes ready pickup queue by saved delivery zone districts", () => {
    const orderId = new ObjectId();
    const vendorId = new ObjectId();
    const queue = _logisticsTestUtils.buildReadyToShipCollectionQueue({
      zones: [{ code: "dhaka", name: "Dhaka", districts: ["Dhaka", "Narayanganj"] }],
      scope: { scoped: true, assignedZones: ["dhaka"], assignedVendorIds: [] },
      orders: [
        {
          _id: orderId,
          shippingInfo: { district: "Sylhet" },
          products: [{ productId: "product-1", vendorId, title: "Ready item", price: 700, itemStatus: "pickup_ready" }],
        },
      ],
      vendors: [
        {
          _id: vendorId,
          shopName: "Narayanganj Vendor",
          pickupAddress: { district: "Narayanganj", upazila: "Narayanganj Sadar" },
        },
      ],
    });

    expect(queue.summary.totalPackages).toBe(1);
    expect(queue.rows[0]).toEqual(expect.objectContaining({ vendorName: "Narayanganj Vendor" }));
  });

  test("hides ready pickup rows outside the logistics area", () => {
    const orderId = new ObjectId();
    const vendorId = new ObjectId();
    const queue = _logisticsTestUtils.buildReadyToShipCollectionQueue({
      scope: { scoped: true, assignedZones: ["union:9999"], assignedVendorIds: [] },
      orders: [
        {
          _id: orderId,
          status: "processing",
          shippingInfo: { district: "Sylhet", union: "Other union" },
          products: [{ productId: "product-1", vendorId, title: "Ready item", price: 700, itemStatus: "pickup_ready" }],
        },
      ],
      vendors: [
        {
          _id: vendorId,
          shopName: "Dhaka Vendor",
          pickupAddress: { division: "Dhaka", district: "Dhaka", upazila: "Savar", union: "Ashulia", unionId: "4012" },
        },
      ],
    });

    expect(queue.summary.totalPackages).toBe(0);
    expect(queue.rows).toEqual([]);
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
          provider: "redx",
          bookingMode: "live",
          coverageType: "outside_district",
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
        provider: "redx",
        bookingMode: "live",
        coverageType: "outside_district",
        baseDeliveryCost: 90,
        codCollectionFee: 12,
        credentialStatus: expect.any(String),
        slaByZone: [expect.objectContaining({ zoneCode: "dhaka", processingHours: 12 })],
      }),
    );
  });

  test("links pickup staff to a scoped logistics manager account", async () => {
    const db = buildDb();
    const user = {
      _id: new ObjectId(),
      firebaseUid: "logistics-uid",
      email: "logistics@example.com",
      role: "customer",
    };
    const User = {
      findByEmail: jest.fn(async () => user),
      findById: jest.fn(),
      updateRole: jest.fn(async () => ({ modifiedCount: 1 })),
      updateLogisticsProfile: jest.fn(async () => ({ modifiedCount: 1 })),
    };
    const res = createRes();

    await upsertPickupStaff(
      buildReq({
        db,
        models: { User },
        body: {
          name: "Dhaka Rider",
          phone: "017",
          email: "logistics@example.com",
          routeName: "Dhaka North",
          assignedZones: ["dhaka"],
          assignedVendorIds: ["vendor-1"],
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(User.updateRole).toHaveBeenCalledWith("logistics-uid", "logistics_manager", "admin-1");
    expect(User.updateLogisticsProfile).toHaveBeenCalledWith(
      "logistics-uid",
      expect.objectContaining({
        assignedZones: ["dhaka"],
        assignedVendorIds: ["vendor-1"],
        routeName: "Dhaka North",
      }),
      "admin-1",
    );
    expect(db.collection("pickup_staff").docs[0]).toEqual(
      expect.objectContaining({
        email: "logistics@example.com",
        linkedRole: "logistics_manager",
        firebaseUid: "logistics-uid",
      }),
    );
  });

  test("lists courier partners with provider credential readiness and no secret values", async () => {
    const originalRedx = process.env.REDX_API_TOKEN;
    try {
      process.env.REDX_API_TOKEN = "server-only-redx-token";
      const db = buildDb({
        courier_partners: [
          {
            _id: "courier-redx",
            name: "RedX Outside",
            code: "redx",
            provider: "redx",
            bookingMode: "live",
            serviceZones: ["outside"],
          },
        ],
      });
      const res = createRes();

      await listCourierPartners(buildReq({ db }), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            _id: "courier-redx",
            provider: "redx",
            credentialsConfigured: true,
            credentialStatus: "ready",
          }),
        ],
      });
      expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("server-only-redx-token");
    } finally {
      if (originalRedx === undefined) delete process.env.REDX_API_TOKEN;
      else process.env.REDX_API_TOKEN = originalRedx;
    }
  });

  test("scopes logistics manager lists to assigned delivery areas", async () => {
    const db = buildDb({
      courier_partners: [
        { _id: "courier-dhaka", name: "Dhaka Local", provider: "local", serviceZones: ["dhaka"] },
        { _id: "courier-ctg", name: "Chittagong Local", provider: "local", serviceZones: ["chittagong"] },
      ],
      delivery_fee_rules: [
        { _id: "rule-dhaka", name: "Dhaka rate", zoneCode: "dhaka" },
        { _id: "rule-ctg", name: "Chittagong rate", zoneCode: "chittagong" },
        { _id: "rule-global", name: "Global fallback", zoneCode: "" },
      ],
      orders: [
        { _id: "order-dhaka", shippingInfo: { district: "Dhaka" } },
        { _id: "order-ctg", shippingInfo: { district: "Chittagong" } },
      ],
      audit_logs: [
        { _id: "log-dhaka", module: "logistics", action: "dhaka", target: { type: "order", id: "order-dhaka" } },
        { _id: "log-ctg", module: "logistics", action: "ctg", target: { type: "order", id: "order-ctg" } },
      ],
    });
    const logisticsUser = {
      uid: "logistics-uid",
      role: "logistics_manager",
      logisticsProfile: { assignedZones: ["dhaka"], pickupStaffId: "staff-1" },
    };

    const courierRes = createRes();
    await listCourierPartners(buildReq({ db, user: logisticsUser }), courierRes);
    expect(courierRes.json.mock.calls[0][0].data.map((courier) => courier._id)).toEqual(["courier-dhaka"]);

    const feeRes = createRes();
    await listDeliveryFeeRules(buildReq({ db, user: logisticsUser }), feeRes);
    expect(feeRes.json.mock.calls[0][0].data.map((rule) => rule._id)).toEqual(["rule-dhaka", "rule-global"]);

    const auditRes = createRes();
    await getLogisticsAuditLog(buildReq({ db, user: logisticsUser }), auditRes);
    expect(auditRes.json.mock.calls[0][0].data.map((log) => log._id)).toEqual(["log-dhaka"]);
  });

  test("returns courier provider readiness for the admin logistics UI", () => {
    const res = createRes();

    getCourierProviderReadiness(buildReq({ db: buildDb() }), res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        providers: expect.objectContaining({
          redx: expect.objectContaining({ provider: "redx" }),
          steadfast: expect.objectContaining({ provider: "steadfast" }),
        }),
      }),
    });
  });

  test("saves delivery fee rules for per-item, weight, zone, and free shipping logic", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertDeliveryFeeRule(
      buildReq({
        db,
        body: {
          name: "Dhaka heavy item",
          ruleType: "per_item",
          zoneCode: "dhaka",
          minWeightKg: 5,
          baseFee: 80,
          perItemFee: 12,
          feePerKg: 15,
          freeShippingThreshold: 3000,
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("delivery_fee_rules").docs[0]).toEqual(
      expect.objectContaining({
        ruleType: "per_item",
        zoneCode: "dhaka",
        minWeightKg: 5,
        perItemFee: 12,
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
      orders: [
        {
          _id: "order-1",
          userId: "buyer-1",
          paymentMethod: "cod",
          paymentStatus: "pending",
          total: 1200,
          codCollectionStatus: "collected",
        },
      ],
      dispatch_assignments: [{ orderId: "order-1", courierName: "Pathao", codCollectionStatus: "collected" }],
      vendorOrders: [{ parentOrderId: "order-1", paymentStatus: "pending" }],
      payments: [],
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
      expect.objectContaining({
        courierName: "Pathao",
        remittedAmount: 1000,
        discrepancyAmount: 200,
        orderIds: ["order-1"],
      }),
    );
    expect(db.collection("dispatch_assignments").docs[0].codCollectionStatus).toBe("discrepancy");
    expect(db.collection("orders").docs[0]).toEqual(
      expect.objectContaining({
        paymentStatus: "paid",
        codRemittanceStatus: "remitted",
        codRemitted: true,
        codDiscrepancyAmount: 200,
      }),
    );
    expect(db.collection("vendorOrders").docs[0]).toEqual(
      expect.objectContaining({
        paymentStatus: "paid",
        codRemittanceStatus: "remitted",
      }),
    );
    expect(db.collection("payments").docs[0]).toEqual(
      expect.objectContaining({
        orderId: "order-1",
        paymentMethod: "cod",
        status: "completed",
        amount: 1200,
      }),
    );
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
