const { ObjectId } = require("mongodb");
const GrowthRecommendationService = require("../../services/growthRecommendationService");

const stringify = (value) => (value?.toString ? value.toString() : String(value || ""));

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.map(stringify).includes(stringify(actual));
    if (expected.$gt !== undefined) return Number(actual || 0) > Number(expected.$gt);
    if (expected.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    return true;
  }
  return stringify(actual) === stringify(expected);
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

describe("GrowthRecommendationService", () => {
  test("builds recently viewed recommendations from growth events", async () => {
    const productId = new ObjectId("665000000000000000000010");
    const db = buildDb({
      growth_events: [
        {
          eventName: "product.viewed",
          userId: "user-1",
          productId: productId.toString(),
          timestamp: new Date("2026-05-19T10:00:00.000Z"),
        },
      ],
      products: [
        {
          _id: productId,
          title: "Mustard Oil",
          stock: 12,
          isActive: true,
        },
      ],
    });

    const result = await GrowthRecommendationService.recentlyViewed(db, "user-1", 4);

    expect(result).toEqual([
      expect.objectContaining({
        productId: productId.toString(),
        title: "Mustard Oil",
        recommendationReason: "recently_viewed",
      }),
    ]);
  });

  test("combines homepage recommendation rails without duplicates", async () => {
    const productId = new ObjectId("665000000000000000000011");
    const db = buildDb({
      growth_events: [
        { eventName: "product.viewed", userId: "user-1", productId: productId.toString(), timestamp: new Date() },
      ],
      orders: [
        {
          userId: "user-1",
          status: "delivered",
          products: [{ productId: productId.toString(), quantity: 2 }],
          createdAt: new Date(),
        },
      ],
      vendor_follows: [],
      products: [{ _id: productId, title: "Rice", stock: 10, isActive: true }],
    });

    const result = await GrowthRecommendationService.forPlacement(db, {
      placement: "homepage",
      userId: "user-1",
      limit: 6,
    });

    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe(productId.toString());
  });
});
