const { ObjectId } = require("mongodb");
const PromotionService = require("../../services/promotionService");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.map(stringify).includes(stringify(actual));
    if (expected.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    if (expected.$gte !== undefined && actual < expected.$gte) return false;
    if (expected.$lte !== undefined && actual > expected.$lte) return false;
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
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
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

describe("PromotionService", () => {
  test("evaluates priority, scope, and non-stackable promotions", async () => {
    const now = new Date("2026-05-19T10:00:00.000Z");
    const db = buildDb({
      promotion_settings: [{ _id: "growth_promotion_rules", maxStackedDiscountPercent: 100 }],
      promotions: [
        {
          _id: new ObjectId("665000000000000000000001"),
          type: "product_discount",
          title: "Laptop deal",
          discountType: "percentage",
          discountValue: 10,
          priority: 500,
          status: "active",
          stackable: true,
          scope: { productIds: ["p-1"] },
        },
        {
          _id: new ObjectId("665000000000000000000002"),
          type: "platform_voucher",
          code: "SAVE100",
          title: "Platform voucher",
          discountType: "fixed",
          discountValue: 100,
          priority: 300,
          status: "active",
          stackable: false,
          automaticApply: false,
        },
        {
          _id: new ObjectId("665000000000000000000003"),
          type: "free_shipping",
          title: "Free delivery",
          discountType: "free_shipping",
          priority: 100,
          status: "active",
          stackable: true,
        },
      ],
    });

    const result = await PromotionService.evaluateCart({
      db,
      cart: {
        deliveryCharge: 80,
        items: [{ productId: "p-1", vendorId: "v-1", categoryId: "c-1", price: 1000, quantity: 1 }],
      },
      user: { id: "user-1" },
      context: { code: "SAVE100", now },
    });

    expect(result.appliedPromotions.map((line) => line.type)).toEqual(["product_discount", "platform_voucher"]);
    expect(result.rejectedPromotions).toEqual([
      expect.objectContaining({ reason: "blocked_by_non_stackable" }),
    ]);
    expect(result.totals.discountTotal).toBe(200);
    expect(result.totals.finalTotal).toBe(880);
  });

  test("validates a code and stores order snapshots/redemptions", async () => {
    const db = buildDb({
      promotion_settings: [{ _id: "growth_promotion_rules", maxStackedDiscountPercent: 100 }],
      promotions: [
        {
          _id: new ObjectId("665000000000000000000004"),
          type: "platform_voucher",
          code: "WELCOME",
          title: "Welcome voucher",
          discountType: "percentage",
          discountValue: 20,
          maxDiscount: 150,
          status: "active",
          automaticApply: false,
        },
      ],
    });

    const validation = await PromotionService.validateCode({
      db,
      code: "welcome",
      cart: { items: [{ productId: "p-1", price: 1000, quantity: 1 }] },
      user: { id: "user-1" },
    });
    const snapshot = await PromotionService.snapshotForOrder({
      db,
      orderId: "order-1",
      userId: "user-1",
      result: validation.result,
    });
    await PromotionService.lockRedemptions({
      db,
      orderId: "order-1",
      userId: "user-1",
      result: validation.result,
    });

    expect(validation.valid).toBe(true);
    expect(validation.promotion.discountAmount).toBe(150);
    expect(snapshot.orderId).toBe("order-1");
    expect(db.collection("promotion_snapshots").docs).toHaveLength(1);
    expect(db.collection("promotion_redemptions").docs).toEqual([
      expect.objectContaining({ promotionCode: "WELCOME", discountAmount: 150 }),
    ]);
    expect(db.collection("promotions").docs[0].usedCount).toBe(1);
  });
});
