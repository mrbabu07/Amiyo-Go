const { ObjectId } = require("mongodb");
const adminGlobalSearchService = require("../../services/adminGlobalSearchService");

const getValuesByPath = (value, parts = []) => {
  if (value === undefined || value === null) return [];
  if (!parts.length) return Array.isArray(value) ? value : [value];
  if (Array.isArray(value)) return value.flatMap((item) => getValuesByPath(item, parts));

  const [key, ...rest] = parts;
  return getValuesByPath(value[key], rest);
};

const getByPath = (doc, path) => getValuesByPath(doc, String(path).split("."));

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const matchesQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((branch) => matchesQuery(doc, branch));
    if (key === "$expr") return true;
    const actualValues = getByPath(doc, key);
    if (expected instanceof RegExp) return actualValues.some((actual) => expected.test(String(actual || "")));
    if (expected instanceof ObjectId) return actualValues.some((actual) => stringify(actual) === stringify(expected));
    return actualValues.some((actual) => stringify(actual) === stringify(expected));
  });

class FakeCursor {
  constructor(docs) {
    this.docs = docs;
  }

  sort() {
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
}

const buildDb = () => {
  const orderId = new ObjectId("64f000000000000000000001");
  const vendorId = new ObjectId("64f000000000000000000002");
  const productId = new ObjectId("64f000000000000000000003");
  const collections = {
    orders: new FakeCollection([
      {
        _id: orderId,
        status: "processing",
        paymentMethod: "cod",
        paymentStatus: "pending",
        total: 1250,
        shippingInfo: { name: "Rahim", phone: "01700000000", email: "rahim@example.com" },
        products: [{ title: "Rice", sku: "RICE-5KG", quantity: 1, price: 1250 }],
      },
    ]),
    vendors: new FakeCollection([
      { _id: vendorId, shopName: "Dhaka Fresh", status: "approved", email: "fresh@example.com" },
    ]),
    products: new FakeCollection([
      { _id: productId, title: "Premium Rice", sku: "RICE-5KG", price: 1250, stock: 20, approvalStatus: "approved" },
    ]),
    users: new FakeCollection([]),
    returns: new FakeCollection([]),
    supportTickets: new FakeCollection([]),
  };

  return {
    db: {
      collection: (name) => collections[name],
    },
    orderId,
    vendorId,
  };
};

describe("adminGlobalSearchService", () => {
  test("searchAll returns grouped marketplace resources with actionable hrefs", async () => {
    const { db } = buildDb();

    const result = await adminGlobalSearchService.searchAll(db, "rice", { types: ["order", "product"], limit: 5 });

    expect(result.total).toBe(2);
    expect(result.grouped.order[0]).toEqual(expect.objectContaining({
      type: "order",
      title: expect.stringContaining("#"),
      href: expect.stringContaining("/admin/orders"),
    }));
    expect(result.grouped.product[0]).toEqual(expect.objectContaining({
      type: "product",
      title: "Premium Rice",
      href: expect.stringContaining("/admin/products/edit/"),
    }));
  });

  test("getDetail builds drawer-ready sections and actions", async () => {
    const { db, orderId } = buildDb();

    const detail = await adminGlobalSearchService.getDetail(db, "order", orderId.toString());

    expect(detail.title).toContain(orderId.toString().slice(-8));
    expect(detail.sections.map((section) => section.title)).toEqual(["Order", "Customer", "Products"]);
    expect(detail.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Open workspace", path: expect.stringContaining("/admin/orders") }),
    ]));
  });
});
