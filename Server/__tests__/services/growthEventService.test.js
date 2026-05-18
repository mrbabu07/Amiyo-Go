const GrowthEventService = require("../../services/growthEventService");
const AbandonedCartService = require("../../services/abandonedCartService");

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.includes(actual);
    if (expected.$gte !== undefined && actual < expected.$gte) return false;
    if (expected.$lte !== undefined && actual > expected.$lte) return false;
    if (expected.$ne !== undefined) return actual !== expected.$ne;
    return true;
  }
  return String(actual || "") === String(expected || "");
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

  async insertOne(doc) {
    this.docs.push({ ...doc, _id: `${this.docs.length + 1}` });
    return { insertedId: `${this.docs.length}` };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      this.docs.push(doc);
    }
    if (doc) Object.assign(doc, update.$set || {});
    return { matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
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

describe("GrowthEventService", () => {
  test("tracks events and aggregates daily metrics", async () => {
    const db = buildDb();

    await GrowthEventService.trackEvent(db, {
      eventName: "product.viewed",
      userId: "user-1",
      productId: "p-1",
      device: "mobile",
      timestamp: "2026-05-19T08:00:00.000Z",
    });
    await GrowthEventService.trackEvent(db, {
      eventName: "product.viewed",
      anonymousSessionId: "guest-1",
      productId: "p-1",
      device: "desktop",
      timestamp: "2026-05-19T09:00:00.000Z",
    });

    const rows = await GrowthEventService.aggregateDaily(db, "2026-05-19");

    expect(rows).toEqual([
      expect.objectContaining({
        dateKey: "2026-05-19",
        eventName: "product.viewed",
        count: 2,
        uniqueUsers: 1,
        uniqueSessions: 1,
      }),
    ]);
  });

  test("derives customer growth segments from behavior", () => {
    const segments = GrowthEventService.deriveCustomerSegments({
      events: [
        { eventName: "checkout.started", timestamp: "2026-05-18T10:00:00.000Z" },
        { eventName: "voucher.applied", timestamp: "2026-05-18T10:05:00.000Z" },
        { eventName: "category.viewed", categoryId: "grocery", timestamp: "2026-05-18T10:06:00.000Z" },
        { eventName: "category.viewed", categoryId: "grocery", timestamp: "2026-05-18T10:07:00.000Z" },
        { eventName: "category.viewed", categoryId: "grocery", timestamp: "2026-05-18T10:08:00.000Z" },
      ],
      orders: [],
      now: new Date("2026-05-19T00:00:00.000Z"),
    });

    expect(segments).toEqual(expect.arrayContaining([
      "new_user",
      "first_order_not_completed",
      "bargain_hunter",
      "category_loyalist",
    ]));
  });

  test("detects abandoned cart candidates from event streams", async () => {
    const db = buildDb({
      growth_events: [
        {
          eventName: "cart.added",
          userId: "user-1",
          productId: "p-1",
          metadata: { productId: "p-1", title: "Rice" },
          timestamp: new Date("2026-05-19T08:00:00.000Z"),
        },
        {
          eventName: "cart.added",
          userId: "user-2",
          productId: "p-2",
          metadata: { productId: "p-2", title: "Oil" },
          timestamp: new Date("2026-05-19T08:00:00.000Z"),
        },
        {
          eventName: "checkout.started",
          userId: "user-2",
          timestamp: new Date("2026-05-19T08:10:00.000Z"),
        },
      ],
    });

    const candidates = await AbandonedCartService.detectCandidates(db, {
      now: new Date("2026-05-19T10:00:00.000Z"),
      olderThanMinutes: 60,
    });

    expect(candidates).toEqual([
      expect.objectContaining({ userId: "user-1", itemCount: 1 }),
    ]);
  });
});
