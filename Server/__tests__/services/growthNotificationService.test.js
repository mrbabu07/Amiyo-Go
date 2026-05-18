const GrowthNotificationService = require("../../services/growthNotificationService");
const GrowthEventBus = require("../../services/growthEventBus");

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.includes(actual);
    if (expected.$ne !== undefined) return actual !== expected.$ne;
    return true;
  }
  return String(actual || "") === String(expected || "");
};

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => matchesValue(doc[key], expected));

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

  find(query = {}) {
    return new FakeCursor(this.docs.filter((doc) => matchesQuery(doc, query)));
  }

  async findOne(query = {}) {
    return this.docs.find((doc) => matchesQuery(doc, query)) || null;
  }

  async insertOne(doc) {
    const saved = { ...doc, _id: `${this.docs.length + 1}` };
    this.docs.push(saved);
    return { insertedId: saved._id };
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

describe("GrowthNotificationService", () => {
  test("renders templates with variables", () => {
    expect(
      GrowthNotificationService.renderTemplate("Use {{ code }} for {{amount}} off", {
        code: "SAVE10",
        amount: "BDT 100",
      }),
    ).toBe("Use SAVE10 for BDT 100 off");
  });

  test("blocks notifications during quiet hours and frequency caps", () => {
    const quiet = GrowthNotificationService.canSend({
      eventName: "cart.abandoned",
      channel: "push",
      preferences: { quietHours: { enabled: true, startHour: 22, endHour: 8 } },
      now: new Date("2026-05-19T23:00:00.000Z"),
    });
    const capped = GrowthNotificationService.canSend({
      eventName: "cart.abandoned",
      channel: "email",
      history: [
        { eventName: "cart.abandoned", createdAt: "2026-05-19T08:00:00.000Z" },
        { eventName: "cart.abandoned", createdAt: "2026-05-19T09:00:00.000Z" },
        { eventName: "cart.abandoned", createdAt: "2026-05-19T10:00:00.000Z" },
      ],
      now: new Date("2026-05-19T11:00:00.000Z"),
    });

    expect(quiet).toEqual({ allowed: false, reason: "quiet_hours" });
    expect(capped).toEqual({ allowed: false, reason: "event_frequency_cap" });
  });

  test("enqueues in-app notifications and publishes through the event bus", async () => {
    const db = buildDb({
      notification_templates: [
        {
          eventName: "cart.abandoned",
          channel: "in_app",
          title: "Still thinking?",
          body: "{{itemCount}} item left in cart",
          url: "/cart",
          active: true,
        },
      ],
    });

    const result = await GrowthEventBus.publish(db, "cart.abandoned", {
      userId: "user-1",
      itemCount: 2,
    });

    expect(result.event.eventName).toBe("cart.abandoned");
    expect(db.collection("notification_queue").docs[0]).toEqual(
      expect.objectContaining({
        eventName: "cart.abandoned",
        recipientId: "user-1",
        payload: expect.objectContaining({
          title: "Still thinking?",
          body: "2 item left in cart",
        }),
      }),
    );
    expect(db.collection("notifications").docs[0]).toEqual(
      expect.objectContaining({
        userId: "user-1",
        type: "cart.abandoned",
        isRead: false,
      }),
    );
  });
});
