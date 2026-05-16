const { ObjectId } = require("mongodb");
const {
  getAllAdminProducts,
  bulkModerateProducts,
  adminEditProduct,
  reviewIpViolationReport,
  reviewBrandRegistryItem,
} = require("../../controllers/adminProductController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value));

const getValuesByPath = (doc, path) => {
  const parts = String(path).split(".");
  const walk = (value, index) => {
    if (value === undefined || value === null) return [];
    if (index >= parts.length) return [value];
    if (Array.isArray(value)) return value.flatMap((item) => walk(item, index));
    return walk(value[parts[index]], index + 1);
  };
  return walk(doc, 0);
};

const matchesExpected = (actualValues, expected) => {
  if (expected instanceof RegExp) {
    return actualValues.some((actual) => expected.test(String(actual || "")));
  }

  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof ObjectId) && !(expected instanceof Date)) {
    if (expected.$in) {
      const values = expected.$in.map(stringify);
      return actualValues.some((actual) => values.includes(stringify(actual)));
    }
    if (expected.$ne !== undefined) {
      return actualValues.every((actual) => stringify(actual) !== stringify(expected.$ne));
    }
    if (expected.$exists !== undefined) {
      return expected.$exists ? actualValues.length > 0 : actualValues.length === 0;
    }
    return true;
  }

  return actualValues.some((actual) => stringify(actual) === stringify(expected));
};

const matchesQuery = (doc, query = {}) => {
  if (query.$and) return query.$and.every((branch) => matchesQuery(doc, branch));
  if (query.$or) return query.$or.some((branch) => matchesQuery(doc, branch));

  return Object.entries(query).every(([key, expected]) => {
    const values = getValuesByPath(doc, key);
    return matchesExpected(values, expected);
  });
};

const setByPath = (doc, path, value) => {
  const parts = path.split(".");
  let target = doc;
  parts.slice(0, -1).forEach((part) => {
    target[part] = target[part] || {};
    target = target[part];
  });
  target[parts[parts.length - 1]] = value;
};

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec = {}) {
    const entries = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      for (const [key, direction] of entries) {
        const [leftValue] = getValuesByPath(left, key);
        const [rightValue] = getValuesByPath(right, key);
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

  async countDocuments(query = {}) {
    return this.docs.filter((doc) => matchesQuery(doc, query)).length;
  }

  async insertOne(doc) {
    const saved = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(saved);
    return { insertedId: saved._id };
  }

  async updateOne(query, update) {
    const doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };

    Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
    Object.entries(update.$push || {}).forEach(([path, value]) => {
      const current = getValuesByPath(doc, path)[0];
      if (!current) setByPath(doc, path, []);
      getValuesByPath(doc, path)[0].push(value);
    });
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(query, update) {
    let matchedCount = 0;
    for (const doc of this.docs) {
      if (!matchesQuery(doc, query)) continue;
      matchedCount += 1;
      Object.entries(update.$set || {}).forEach(([path, value]) => setByPath(doc, path, value));
      Object.entries(update.$push || {}).forEach(([path, value]) => {
        const current = getValuesByPath(doc, path)[0];
        if (!current) setByPath(doc, path, []);
        getValuesByPath(doc, path)[0].push(value);
      });
    }
    return { matchedCount, modifiedCount: matchedCount };
  }

  async bulkWrite(ops) {
    for (const op of ops) {
      if (op.updateOne) await this.updateOne(op.updateOne.filter, op.updateOne.update);
    }
    return { modifiedCount: ops.length };
  }
}

const buildDb = (collections) => ({
  collection: (name) => collections[name] || new FakeCollection([]),
});

const buildReq = ({ db, params = {}, query = {}, body = {} }) => ({
  params,
  query,
  body,
  user: { uid: "admin-1", role: "admin" },
  app: { locals: { db } },
});

describe("adminProductController", () => {
  test("returns a sorted moderation queue with vendor/category search and computed flags", async () => {
    const vendorId = new ObjectId();
    const categoryId = new ObjectId();
    const oldProduct = {
      _id: new ObjectId(),
      title: "Basic Laptop",
      sku: "LAP-1",
      vendorId,
      categoryId,
      approvalStatus: "pending",
      submittedForReviewAt: new Date("2026-05-10T10:00:00.000Z"),
      images: ["https://img/laptop.jpg"],
      attributes: { RAM: "8GB" },
    };
    const newProduct = {
      _id: new ObjectId(),
      title: "Replica Laptop",
      vendorId,
      categoryId,
      approvalStatus: "pending",
      submittedForReviewAt: new Date("2026-05-11T10:00:00.000Z"),
      images: [],
      attributes: {},
    };
    const db = buildDb({
      products: new FakeCollection([oldProduct, newProduct]),
      vendors: new FakeCollection([{ _id: vendorId, shopName: "Tech House", tier: "star", status: "approved" }]),
      categories: new FakeCollection([{ _id: categoryId, name: "Laptops", attributes: [{ name: "RAM", required: true }] }]),
      product_moderation_rules: new FakeCollection([{ type: "prohibited_keywords", keywords: ["replica"] }]),
    });

    const req = buildReq({ db, query: { status: "queue", search: "Tech House", page: "1", limit: "20" } });
    const res = createRes();

    await getAllAdminProducts(req, res);

    const products = res.json.mock.calls[0][0].data;
    expect(products.map((product) => product._id)).toEqual([newProduct._id, oldProduct._id]);
    expect(products[0]).toEqual(
      expect.objectContaining({
        vendorShopName: "Tech House",
        categoryName: "Laptops",
        trustedVendor: true,
      }),
    );
    expect(products[0].moderationFlags.map((flag) => flag.type)).toEqual(
      expect.arrayContaining(["prohibited_keyword", "missing_image", "missing_sku", "missing_required_attributes"]),
    );
  });

  test("bulk rejects products with vendor guidance and moderation history", async () => {
    const productA = { _id: new ObjectId(), approvalStatus: "pending" };
    const productB = { _id: new ObjectId(), approvalStatus: "pending" };
    const products = new FakeCollection([productA, productB]);
    const db = buildDb({ products });
    const req = buildReq({
      db,
      body: { action: "reject", productIds: [productA._id.toString(), productB._id.toString()], reason: "Add white background image" },
    });
    const res = createRes();

    await bulkModerateProducts(req, res);

    expect(res.json.mock.calls[0][0].data.modifiedCount).toBe(2);
    expect(products.docs.map((product) => product.approvalStatus)).toEqual(["rejected", "rejected"]);
    expect(products.docs[0].rejectionReason).toBe("Add white background image");
    expect(products.docs[0].moderationHistory[0].action).toBe("bulk_reject");
  });

  test("admin edit can fix a listing and approve it in one action", async () => {
    const productId = new ObjectId();
    const categoryId = new ObjectId();
    const products = new FakeCollection([{ _id: productId, title: "Bad Ttile", approvalStatus: "pending" }]);
    const db = buildDb({ products });
    const req = buildReq({
      db,
      params: { id: productId.toString() },
      body: { title: "Good Title", sku: "SKU-1", categoryId: categoryId.toString(), approveAfterEdit: true, note: "Fixed typo" },
    });
    const res = createRes();

    await adminEditProduct(req, res);

    expect(products.docs[0]).toEqual(
      expect.objectContaining({
        title: "Good Title",
        sku: "SKU-1",
        approvalStatus: "approved",
      }),
    );
    expect(products.docs[0].adminEditHistory[0].note).toBe("Fixed typo");
  });

  test("IP report review can delist the reported product", async () => {
    const productId = new ObjectId();
    const reportId = new ObjectId();
    const products = new FakeCollection([{ _id: productId, approvalStatus: "approved", isActive: true }]);
    const reports = new FakeCollection([{ _id: reportId, productId, status: "pending" }]);
    const db = buildDb({ products, product_ip_reports: reports });
    const req = buildReq({
      db,
      params: { reportId: reportId.toString() },
      body: { status: "actioned", delistProduct: true, adminNote: "Counterfeit confirmed" },
    });
    const res = createRes();

    await reviewIpViolationReport(req, res);

    expect(reports.docs[0].status).toBe("actioned");
    expect(products.docs[0]).toEqual(
      expect.objectContaining({
        approvalStatus: "delisted",
        isActive: false,
        delistedReason: "Counterfeit confirmed",
      }),
    );
  });

  test("brand approval marks the owner vendor as an official store", async () => {
    const brandId = new ObjectId();
    const vendorId = new ObjectId();
    const brands = new FakeCollection([{ _id: brandId, name: "Amiyo", ownerVendorId: vendorId, status: "pending" }]);
    const vendors = new FakeCollection([{ _id: vendorId, shopName: "Amiyo Store" }]);
    const db = buildDb({ brand_registry: brands, vendors });
    const req = buildReq({
      db,
      params: { brandId: brandId.toString() },
      body: { status: "approved", officialStoreEligible: true },
    });
    const res = createRes();

    await reviewBrandRegistryItem(req, res);

    expect(brands.docs[0].status).toBe("approved");
    expect(vendors.docs[0]).toEqual(
      expect.objectContaining({
        officialStore: true,
        officialBrandName: "Amiyo",
      }),
    );
  });
});
