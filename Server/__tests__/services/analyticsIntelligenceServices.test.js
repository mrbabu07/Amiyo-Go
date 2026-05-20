const { ObjectId } = require("mongodb");
const { EVENT_TAXONOMY, KPI_GROUPS, normalizeEventName } = require("../../services/analyticsKpiFramework");
const AnalyticsEventService = require("../../services/analyticsEventService");
const AnalyticsWarehouseService = require("../../services/analyticsWarehouseService");
const AnalyticsIntelligenceService = require("../../services/analyticsIntelligenceService");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !(expected instanceof Date) && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.map(stringify).includes(stringify(actual));
    if (expected.$nin) return !expected.$nin.map(stringify).includes(stringify(actual));
    if (expected.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    if (expected.$gte !== undefined && actual < expected.$gte) return false;
    if (expected.$gt !== undefined && actual <= expected.$gt) return false;
    if (expected.$lte !== undefined && actual > expected.$lte) return false;
    if (expected.$lt !== undefined && actual >= expected.$lt) return false;
    return true;
  }
  if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
  return stringify(actual) === stringify(expected);
};

const matchesQuery = (doc, query = {}) => {
  if (query.$or && !query.$or.some((branch) => matchesQuery(doc, branch))) return false;
  if (query.$and && !query.$and.every((branch) => matchesQuery(doc, branch))) return false;
  return Object.entries(query)
    .filter(([key]) => key !== "$or" && key !== "$and")
    .every(([key, expected]) => matchesValue(getByPath(doc, key), expected));
};

const assertNoMongoUpdatePathConflict = (update = {}) => {
  const setPaths = new Set(Object.keys(update.$set || {}));
  Object.keys(update.$setOnInsert || {}).forEach((path) => {
    if (setPaths.has(path)) {
      throw new Error(`Updating the path '${path}' would create a conflict at '${path}'`);
    }
  });
};

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sort = {}) {
    Object.entries(sort).reverse().forEach(([key, direction]) => {
      this.docs.sort((a, b) => {
        const left = getByPath(a, key);
        const right = getByPath(b, key);
        if (left === right) return 0;
        return left > right ? direction : -direction;
      });
    });
    return this;
  }

  limit(limit) {
    this.docs = this.docs.slice(0, limit);
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
    assertNoMongoUpdatePathConflict(update);
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...(query || {}), ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(doc, update.$set || {});
    Object.entries(update.$inc || {}).forEach(([key, value]) => {
      doc[key] = Number(doc[key] || 0) + Number(value || 0);
    });
    return { matchedCount: 1, modifiedCount: 1 };
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
    registry,
    collection: (name) => {
      if (!registry.has(name)) registry.set(name, new FakeCollection([]));
      return registry.get(name);
    },
  };
};

const baseDate = new Date("2026-05-19T10:00:00.000Z");

describe("analytics KPI framework and event ingestion", () => {
  test("defines shared KPI groups and event taxonomy aliases", () => {
    expect(KPI_GROUPS.customer.map((kpi) => kpi.key)).toEqual(expect.arrayContaining(["sessions", "conversionRate", "notificationCtr"]));
    expect(KPI_GROUPS.vendor.map((kpi) => kpi.key)).toEqual(expect.arrayContaining(["gmv", "fulfilmentSpeed"]));
    expect(KPI_GROUPS.platform.map((kpi) => kpi.key)).toEqual(expect.arrayContaining(["commissionRevenue", "fraudDisputeRate"]));
    expect(EVENT_TAXONOMY).toEqual(expect.arrayContaining(["product_viewed", "shipment_out_for_delivery", "experiment_converted"]));
    expect(normalizeEventName("cart.added")).toBe("add_to_cart");
    expect(normalizeEventName("paymentMethodSelected")).toBe("payment_method_selected");
  });

  test("tracks accepted, duplicated, and rejected events through the raw stream", async () => {
    const db = buildDb();

    const accepted = await AnalyticsEventService.trackEvent(db, {
      eventName: "product.viewed",
      eventId: "event-1",
      userId: "user-1",
      sessionId: "session-1",
      productId: "product-1",
      timestamp: baseDate,
    }, { user: { role: "customer" } });
    const duplicate = await AnalyticsEventService.trackEvent(db, {
      eventName: "product.viewed",
      eventId: "event-1",
      userId: "user-1",
      sessionId: "session-1",
      productId: "product-1",
      timestamp: baseDate,
    });
    const rejected = await AnalyticsEventService.trackEvent(db, {
      eventName: "unknown_event",
      timestamp: baseDate,
    });

    expect(accepted).toEqual(expect.objectContaining({ accepted: true, duplicate: false }));
    expect(accepted.event.eventName).toBe("product_viewed");
    expect(duplicate).toEqual(expect.objectContaining({ accepted: true, duplicate: true }));
    expect(rejected.accepted).toBe(false);
    expect(db.collection("event_stream").docs).toHaveLength(1);
    expect(db.collection("analytics_events").docs).toHaveLength(1);
    expect(db.collection("growth_events").docs).toHaveLength(1);
    expect(db.collection("event_dead_letter_queue").docs).toHaveLength(1);
  });
});

describe("AnalyticsWarehouseService", () => {
  test("rebuilds daily warehouse facts and dimensions", async () => {
    const db = buildDb({
      event_stream: [
        { eventName: "product_viewed", userId: "u-1", sessionId: "s-1", resource: { productId: "p-1" }, timestamp: new Date("2026-05-19T09:00:00.000Z") },
        { eventName: "add_to_cart", userId: "u-1", sessionId: "s-1", resource: { productId: "p-1" }, timestamp: new Date("2026-05-19T09:05:00.000Z") },
        { eventName: "checkout_started", userId: "u-1", sessionId: "s-1", timestamp: new Date("2026-05-19T09:10:00.000Z") },
      ],
      orders: [
        {
          _id: "o-1",
          userId: "u-1",
          status: "delivered",
          paymentStatus: "paid",
          totalAmount: 1000,
          createdAt: new Date("2026-05-19T10:00:00.000Z"),
          products: [{ productId: "p-1", vendorId: "v-1", categoryId: "c-1", quantity: 2, price: 500, adminCommissionAmount: 100 }],
        },
      ],
      returns: [{ _id: "r-1", vendorId: "v-1", refundAmount: 200, createdAt: new Date("2026-05-19T11:00:00.000Z") }],
      shipments: [{ _id: "s-1", vendorId: "v-1", shipment_state: "delivered", cod_state: "cod_remitted", createdAt: new Date("2026-05-19T12:00:00.000Z") }],
      notification_queue: [{ _id: "n-1", status: "delivered", createdAt: new Date("2026-05-19T12:00:00.000Z") }],
      promotion_redemptions: [{ _id: "pr-1", orderId: "o-1", vendorId: "v-1", discountAmount: 50, redeemedAt: new Date("2026-05-19T12:00:00.000Z") }],
      reviews: [{ _id: "rev-1", productId: "p-1", vendorId: "v-1", rating: 5, status: "approved", createdAt: new Date("2026-05-19T12:00:00.000Z") }],
      products: [{ _id: "p-1", title: "Phone", vendorId: "v-1", categoryId: "c-1" }],
      vendors: [{ _id: "v-1", shopName: "Tech Shop", status: "approved" }],
      categories: [{ _id: "c-1", name: "Phones" }],
      users: [{ _id: "u-1", email: "buyer@example.com", createdAt: new Date("2026-01-01T00:00:00.000Z") }],
    });

    const result = await AnalyticsWarehouseService.rebuildDailyFacts({
      db,
      start: "2026-05-19",
      end: "2026-05-20",
    });

    expect(result.rowsWritten).toBeGreaterThan(0);
    expect(db.collection("fact_orders_daily").docs[0]).toEqual(expect.objectContaining({
      dateKey: "2026-05-19",
      orders: 1,
      gmv: 1000,
      commissionRevenue: 100,
    }));
    expect(db.collection("fact_vendor_sales_daily").docs[0]).toEqual(expect.objectContaining({
      vendorId: "v-1",
      gmv: 1000,
      returnAmount: 200,
      netSales: 700,
    }));
    expect(db.collection("fact_customer_activity_daily").docs[0]).toEqual(expect.objectContaining({
      productViews: 1,
      addToCart: 1,
      checkoutStarted: 1,
    }));
    expect(db.collection("dim_products").docs[0]).toEqual(expect.objectContaining({ productId: "p-1", title: "Phone" }));
    expect(db.collection("analytics_job_runs").docs[0].status).toBe("completed");
  });
});

describe("AnalyticsIntelligenceService", () => {
  test("builds a role-ready marketplace intelligence dashboard", () => {
    const dashboard = AnalyticsIntelligenceService.buildDashboard({
      start: new Date("2026-05-19T00:00:00.000Z"),
      end: new Date("2026-05-20T00:00:00.000Z"),
      events: [
        { eventName: "homepage_viewed", userId: "u-1", sessionId: "s-1", timestamp: baseDate },
        { eventName: "product_viewed", userId: "u-1", sessionId: "s-1", resource: { productId: "p-1", vendorId: "v-1" }, timestamp: baseDate },
        { eventName: "add_to_cart", userId: "u-1", sessionId: "s-1", resource: { productId: "p-1", vendorId: "v-1" }, timestamp: baseDate },
        { eventName: "checkout_started", userId: "u-1", sessionId: "s-1", timestamp: baseDate },
        { eventName: "search_no_result", userId: "u-1", sessionId: "s-1", query: "rare item", resultCount: 0, timestamp: baseDate },
        { eventName: "notification_opened", userId: "u-1", sessionId: "s-1", timestamp: baseDate },
        { eventName: "experiment_exposed", userId: "u-1", sessionId: "s-1", experiment: { key: "hero", variant: "b" }, timestamp: baseDate },
        { eventName: "experiment_converted", userId: "u-1", sessionId: "s-1", experiment: { key: "hero", variant: "b" }, orderValue: 1000, timestamp: baseDate },
      ],
      orders: [
        {
          _id: "o-1",
          userId: "u-1",
          status: "delivered",
          paymentStatus: "paid",
          paymentMethod: "cod",
          totalAmount: 1000,
          vendorPayable: 800,
          createdAt: baseDate,
          products: [{ productId: "p-1", vendorId: "v-1", categoryId: "c-1", quantity: 1, price: 1000, adminCommissionAmount: 150 }],
        },
      ],
      returns: [{ _id: "r-1", vendorId: "v-1", userId: "u-1", refundAmount: 100, createdAt: baseDate }],
      shipments: [{ _id: "sh-1", vendorId: "v-1", shipment_state: "delivered", cod_state: "cod_pending", cod_amount: 1000, createdAt: baseDate }],
      notifications: [{ _id: "n-1", userId: "u-1", status: "delivered", channel: "push", createdAt: baseDate }],
      redemptions: [{ _id: "red-1", vendorId: "v-1", orderId: "o-1", discountAmount: 50, redeemedAt: baseDate }],
      promotionSnapshots: [{ _id: "snap-1", orderId: "o-1", createdAt: baseDate }],
      reviews: [{ _id: "rev-1", productId: "p-1", vendorId: "v-1", rating: 5, status: "approved", createdAt: baseDate }],
      products: [{ _id: "p-1", title: "Phone", vendorId: "v-1", categoryId: "c-1" }],
      vendors: [{ _id: "v-1", shopName: "Tech Shop" }],
      users: [{ _id: "u-1", createdAt: baseDate }],
      riskProfiles: [{ subjectType: "customer", subjectId: "u-1", riskLevel: "high" }],
      reports: [{ reasonCode: "fake_review", createdAt: baseDate }],
      disputes: [{ type: "order", status: "opened", createdAt: baseDate }],
      enforcements: [{ policyViolated: "payout_risk", createdAt: baseDate }],
      appeals: [{ status: "submitted", createdAt: baseDate }],
      payoutHolds: [{ status: "active", createdAt: baseDate }],
      orderFacts: [{ dateKey: "2026-05-19", gmv: 1000, orders: 1 }],
      jobRuns: [{ status: "completed", completedAt: baseDate }],
      deadLetters: [],
      experiments: [{ experimentKey: "hero", variant: "b" }],
    });

    expect(dashboard.summary).toEqual(expect.objectContaining({
      totalGmv: 1000,
      paidOrders: 1,
      deliveredOrders: 1,
      commissionRevenue: 150,
    }));
    expect(dashboard.customerFunnel.map((step) => step.key)).toEqual(expect.arrayContaining(["sessions", "orderPaid", "orderDelivered"]));
    expect(dashboard.search.zeroResultSearches).toBe(1);
    expect(dashboard.products[0]).toEqual(expect.objectContaining({ productId: "p-1", conversionRate: 100 }));
    expect(dashboard.vendors[0]).toEqual(expect.objectContaining({ vendorId: "v-1", gmv: 1000 }));
    expect(dashboard.logistics.codExposure).toBe(1000);
    expect(dashboard.trust.flaggedSubjects).toBe(1);
    expect(dashboard.finance.grossMarginAfterLeakage).toBe(0);
    expect(dashboard.dataQuality.status).toBe("healthy");
    expect(dashboard.experiments[0].variants[0]).toEqual(expect.objectContaining({ variant: "b", conversionCount: 1 }));
    expect(dashboard.reportCenter.map((report) => report.key)).toEqual(expect.arrayContaining(["customer_funnel", "finance_profitability"]));
  });
});
