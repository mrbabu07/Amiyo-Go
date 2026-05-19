const { ObjectId } = require("mongodb");
const {
  _promotionTestUtils,
  applyClearanceSale,
  createFlashDeal,
  createPlatformVoucher,
  createPromotionCampaign,
  reviewCampaignNomination,
  upsertHomepageSlot,
  upsertLoyaltyRules,
  upsertPromotionRules,
} = require("../../controllers/adminPromotionController");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
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
    if (expected.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    return true;
  }
  if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
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

  async insertOne(doc) {
    const saved = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(saved);
    return { insertedId: saved._id };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { ...query, ...(update.$setOnInsert || {}) };
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    return { matchedCount: 1, modifiedCount: 1 };
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

const buildReq = ({ db, body = {}, params = {}, query = {} }) => ({
  body,
  params,
  query,
  user: { uid: "admin-1", role: "admin", email: "admin@example.com" },
  app: { locals: { db, models: {} } },
});

describe("adminPromotionController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("builds promotion overview from live campaign, voucher, slot, and nomination data", () => {
    const overview = _promotionTestUtils.buildPromotionOverview({
      campaigns: [{ status: "Active" }, { status: "Draft" }],
      nominationItems: [
        {
          _id: "nom-1",
          status: "pending",
          productNominations: [
            { productId: "p1", campaignPrice: 80, regularPrice: 100 },
            { productId: "p2", moderationStatus: "approved", campaignPrice: 50, regularPrice: 100 },
          ],
        },
      ],
      flashDeals: [{ status: "active" }],
      vouchers: [{ isActive: true, expiresAt: new Date(Date.now() + 86400000), firstOrderOnly: true }],
      homepageSlots: [{ slotType: "hero_banner", status: "active" }],
      clearanceRules: [{ status: "active", productsAffected: 4 }],
    });

    expect(overview).toEqual(
      expect.objectContaining({
        campaigns: expect.objectContaining({ total: 2, active: 1, draft: 1 }),
        nominations: expect.objectContaining({ total: 2, pending: 1, approved: 1 }),
        flashDeals: expect.objectContaining({ active: 1 }),
        vouchers: expect.objectContaining({ active: 1, firstOrderOnly: 1 }),
        clearance: expect.objectContaining({ productsDiscounted: 4 }),
      }),
    );
  });

  test("creates a campaign builder record and audit entry", async () => {
    const db = buildDb();
    const res = createRes();

    await createPromotionCampaign(
      buildReq({
        db,
        body: {
          name: "Eid Sale",
          bannerImageUrl: "https://cdn/banner.jpg",
          startDate: "2026-06-01T00:00:00.000Z",
          endDate: "2026-06-10T00:00:00.000Z",
          discountPercentage: 15,
          minDiscountPercentage: 10,
          eligibleCategories: ["fashion"],
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("campaigns").docs[0]).toEqual(
      expect.objectContaining({
        name: "Eid Sale",
        slug: "eid-sale",
        minDiscountPercentage: 10,
        eligibleCategories: ["fashion"],
      }),
    );
    expect(db.collection("audit_logs").docs[0]).toEqual(
      expect.objectContaining({ action: "promotions.campaign.created" }),
    );
  });

  test("reviews an individual campaign nomination SKU with reason tracking", async () => {
    const nominationId = new ObjectId();
    const db = buildDb({
      vendorMarketingItems: [
        {
          _id: nominationId,
          type: "campaign_nomination",
          status: "pending",
          vendorId: "vendor-1",
          vendorName: "Dhaka Fresh",
          campaignName: "11.11",
          productNominations: [
            { productId: "p1", title: "Rice", sku: "RICE-1", regularPrice: 100, campaignPrice: 90 },
            { productId: "p2", title: "Oil", sku: "OIL-1", regularPrice: 200, campaignPrice: 170 },
          ],
        },
      ],
    });
    const res = createRes();

    await reviewCampaignNomination(
      buildReq({
        db,
        params: { nominationId: nominationId.toString() },
        body: { productId: "p1", status: "rejected", reason: "Discount is too low" },
      }),
      res,
    );

    const updated = db.collection("vendorMarketingItems").docs[0];
    expect(updated.status).toBe("pending");
    expect(updated.productNominations[0]).toEqual(
      expect.objectContaining({
        moderationStatus: "rejected",
        moderationReason: "Discount is too low",
      }),
    );
    expect(res.json.mock.calls[0][0].data[0]).toEqual(
      expect.objectContaining({ productId: "p1", status: "rejected" }),
    );
  });

  test("schedules flash deals only when the minimum discount rule is met", async () => {
    const productId = new ObjectId();
    const db = buildDb({
      products: [{ _id: productId, title: "Cotton Panjabi", price: 1000, vendorId: "vendor-1" }],
    });
    const rejectedRes = createRes();

    await createFlashDeal(
      buildReq({
        db,
        body: {
          productId: productId.toString(),
          flashPrice: 980,
          minDiscountPercentage: 10,
          startTime: "2026-06-01T10:00:00.000Z",
          endTime: "2026-06-01T12:00:00.000Z",
          totalStock: 20,
          maxPerUser: 2,
        },
      }),
      rejectedRes,
    );

    expect(rejectedRes.status).toHaveBeenCalledWith(400);

    const res = createRes();
    await createFlashDeal(
      buildReq({
        db,
        body: {
          title: "Lunch Flash",
          productId: productId.toString(),
          flashPrice: 800,
          minDiscountPercentage: 10,
          startTime: "2026-06-01T10:00:00.000Z",
          endTime: "2026-06-01T12:00:00.000Z",
          totalStock: 20,
          maxPerUser: 2,
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("flashsales").docs[0]).toEqual(
      expect.objectContaining({
        title: "Lunch Flash",
        flashPrice: 800,
        discountPercentage: 20,
        maxPerUser: 2,
      }),
    );
  });

  test("creates platform vouchers with free shipping and first-order flags", async () => {
    const db = buildDb();
    const res = createRes();

    await createPlatformVoucher(
      buildReq({
        db,
        body: {
          code: "shipfree",
          name: "Free Delivery",
          discountType: "free_shipping",
          maxDiscountAmount: 120,
          minOrderAmount: 500,
          usageLimit: 100,
          firstOrderOnly: true,
          expiresAt: "2026-08-01T00:00:00.000Z",
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("coupons").docs[0]).toEqual(
      expect.objectContaining({
        code: "SHIPFREE",
        discountType: "free_shipping",
        maxDiscountAmount: 120,
        isPlatformVoucher: true,
        firstOrderOnly: true,
      }),
    );
  });

  test("saves homepage carousel slots with admin-controlled trust badges", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertHomepageSlot(
      buildReq({
        db,
        body: {
          slotType: "hero_banner",
          title: "Mega marketplace day",
          subtitle: "Admin controlled homepage copy",
          badge: "Official sale",
          imageUrl: "https://cdn/banner.webp",
          trustBadges: ["Fast delivery", "COD available", "Verified seller", ""],
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("homepage_slots").docs[0]).toEqual(
      expect.objectContaining({
        title: "Mega marketplace day",
        trustBadges: ["Fast delivery", "COD available", "Verified seller"],
      }),
    );
  });

  test("applies clearance discounts to selected slow-moving inventory", async () => {
    const productId = new ObjectId();
    const db = buildDb({
      products: [
        { _id: productId, title: "Old Stock", categoryId: "fashion", vendorId: "vendor-1", views: 12 },
        { _id: new ObjectId(), title: "Fast Stock", categoryId: "fashion", vendorId: "vendor-1", views: 200 },
      ],
    });
    const res = createRes();

    await applyClearanceSale(
      buildReq({
        db,
        body: {
          title: "Slow stock",
          categoryIds: ["fashion"],
          discountPercentage: 20,
          startDate: "2026-06-01T00:00:00.000Z",
          endDate: "2026-06-20T00:00:00.000Z",
          onlySlowMoving: true,
          maxViews: 50,
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.collection("clearance_rules").docs[0]).toEqual(
      expect.objectContaining({ title: "Slow stock", productsAffected: 1 }),
    );
    expect(db.collection("products").docs[0].clearanceSale).toEqual(
      expect.objectContaining({ discountPercentage: 20, status: "active" }),
    );
    expect(db.collection("products").docs[1].clearanceSale).toBeUndefined();
  });

  test("updates loyalty earn, redemption, multiplier, and expiry rules", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertLoyaltyRules(
      buildReq({
        db,
        body: {
          earnRate: 2,
          redemptionValue: 0.02,
          minRedeemPoints: 200,
          pointsExpiryDays: 180,
          tierMultipliers: { bronze: 1, silver: 1.25, gold: 1.75, platinum: 2.5 },
        },
      }),
      res,
    );

    expect(res.json.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        earnRate: 2,
        redemptionValue: 0.02,
        minRedeemPoints: 200,
        pointsExpiryDays: 180,
        tierMultipliers: expect.objectContaining({ platinum: 2.5 }),
      }),
    );
    expect(db.collection("promotion_settings").docs[0]).toEqual(
      expect.objectContaining({ _id: "loyalty_rules", earnRate: 2 }),
    );
  });

  test("updates promotion stacking rules with audit visibility", async () => {
    const db = buildDb();
    const res = createRes();

    await upsertPromotionRules(
      buildReq({
        db,
        body: {
          allowVoucherWithFlashSale: true,
          allowPlatformVoucherWithVendorVoucher: true,
          maxStackedDiscountPercent: 80,
        },
      }),
      res,
    );

    expect(res.json.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        _id: "promotion_rules",
        allowVoucherWithFlashSale: true,
        allowPlatformVoucherWithVendorVoucher: true,
        maxStackedDiscountPercent: 80,
      }),
    );
    expect(db.collection("promotion_settings").docs[0]).toEqual(
      expect.objectContaining({
        _id: "promotion_rules",
        allowVoucherWithFlashSale: true,
        maxStackedDiscountPercent: 80,
      }),
    );
    expect(db.collection("audit_logs").docs[0]).toEqual(
      expect.objectContaining({ action: "promotions.rules.updated" }),
    );
  });
});
