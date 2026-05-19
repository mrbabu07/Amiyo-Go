const { ObjectId } = require("mongodb");
const MarketplaceEventBus = require("../../services/marketplaceEventBus");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    const actual = doc[key];
    if (expected?.$in) return expected.$in.map(stringify).includes(stringify(actual));
    if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
    return stringify(actual) === stringify(expected);
  });

class FakeCursor {
  constructor(docs) {
    this.docs = docs;
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

  async insertMany(docs = []) {
    docs.forEach((doc) => {
      this.docs.push({ ...doc, _id: doc._id || new ObjectId() });
    });
    return { insertedCount: docs.length };
  }

  async updateOne(query, update) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(doc, update.$set || {});
    Object.entries(update.$inc || {}).forEach(([key, value]) => {
      doc[key] = Number(doc[key] || 0) + value;
    });
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

const buildApp = () => {
  const collections = {
    marketplace_events: new FakeCollection(),
    marketplace_notification_queue: new FakeCollection(),
    notifications: new FakeCollection(),
  };
  const db = {
    collection: jest.fn((name) => {
      if (!collections[name]) collections[name] = new FakeCollection();
      return collections[name];
    }),
  };

  return {
    app: {
      locals: {
        db,
        models: {
          Notification: {
            create: jest.fn(async (payload) => {
              const result = await collections.notifications.insertOne(payload);
              return { ...payload, _id: result.insertedId };
            }),
          },
        },
        realtime: { broadcast: jest.fn() },
      },
    },
    collections,
  };
};

describe("MarketplaceEventBus", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("persists events, queues notifications, and delivers in-app messages inline", async () => {
    const { app, collections } = buildApp();

    const result = await MarketplaceEventBus.publish(app, "order.created", {
      orderId: "order-1",
      notifications: [
        {
          userId: "customer-1",
          type: "order_created",
          title: "Order placed",
          message: "Your order is confirmed.",
          link: "/orders/order-1",
          orderId: "order-1",
        },
      ],
    }, {
      source: "checkout",
      actorId: "customer-1",
      actorRole: "user",
      subjectType: "order",
      subjectId: "order-1",
    });

    expect(result.event.eventName).toBe("order.created");
    expect(collections.marketplace_events.docs[0]).toEqual(
      expect.objectContaining({
        eventName: "order.created",
        status: "processed",
        subject: { type: "order", id: "order-1" },
      }),
    );
    expect(collections.marketplace_notification_queue.docs[0]).toEqual(
      expect.objectContaining({
        eventName: "order.created",
        recipientId: "customer-1",
        status: "sent",
      }),
    );
    expect(app.locals.models.Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "customer-1",
      type: "order_created",
      orderId: "order-1",
    }));
    expect(app.locals.realtime.broadcast).toHaveBeenCalledWith(
      "marketplace:events",
      "marketplace.event.processed",
      expect.objectContaining({ eventName: "order.created", status: "processed" }),
    );
  });

  test("deduplicates events by dedupe key before creating notification work", async () => {
    const { app, collections } = buildApp();
    const options = { dedupeKey: "order.created:order-1" };

    await MarketplaceEventBus.publish(app, "order.created", {
      notifications: [{ userId: "customer-1", title: "One" }],
    }, options);
    const second = await MarketplaceEventBus.publish(app, "order.created", {
      notifications: [{ userId: "customer-1", title: "Two" }],
    }, options);

    expect(second.deduped).toBe(true);
    expect(collections.marketplace_events.docs).toHaveLength(1);
    expect(collections.marketplace_notification_queue.docs).toHaveLength(1);
  });
});
