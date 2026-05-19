const { ObjectId } = require("mongodb");
const vendorProductController = require("../../controllers/vendorProductController");

const createResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
};

const buildRequest = ({ product, body, vendorStaff = null }) => {
  let savedUpdate = null;
  const updatedProduct = () => ({
    ...product,
    ...savedUpdate,
  });

  const Product = {
    findById: jest
      .fn()
      .mockResolvedValueOnce(product)
      .mockImplementation(() => Promise.resolve(updatedProduct())),
    update: jest.fn((id, update) => {
      savedUpdate = update;
      return Promise.resolve({ modifiedCount: 1 });
    }),
  };

  return {
    req: {
      params: { id: product._id.toString() },
      body,
      user: { uid: "seller-firebase-1" },
      vendor: { _id: product.vendorId, shopName: "Seller Shop" },
      vendorStaff,
      app: {
        locals: {
          models: {
            Product,
            Vendor: { findById: jest.fn() },
            Category: { findById: jest.fn() },
          },
        },
      },
    },
    Product,
    get savedUpdate() {
      return savedUpdate;
    },
  };
};

describe("vendorProductController edit history", () => {
  test("records critical vendor edits and marks approved products for reapproval", async () => {
    const product = {
      _id: new ObjectId("665000000000000000000001"),
      vendorId: new ObjectId("665000000000000000000099"),
      categoryId: new ObjectId("665000000000000000000010"),
      title: "Old title",
      price: 100,
      images: ["old.jpg"],
      approvalStatus: "approved",
      editHistory: [{ summary: "Previous change", at: new Date("2026-05-01T00:00:00.000Z") }],
    };
    const harness = buildRequest({
      product,
      body: {
        title: "New title",
        price: 120,
      },
      vendorStaff: { _id: "staff-1", email: "catalog@example.com" },
    });
    const res = createResponse();

    await vendorProductController.updateProduct(harness.req, res);

    expect(res.statusCode).toBe(200);
    expect(harness.Product.update).toHaveBeenCalledTimes(1);
    expect(harness.savedUpdate).toMatchObject({
      title: "New title",
      price: 120,
      approvalStatus: "pending",
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
    });
    expect(harness.savedUpdate.editHistory).toHaveLength(2);
    expect(harness.savedUpdate.editHistory[0]).toMatchObject({
      action: "vendor_edit",
      actorRole: "vendor_staff",
      staffEmail: "catalog@example.com",
      changedFields: ["title", "price"],
      criticalFields: ["title", "price"],
      requiresReapproval: true,
    });
  });

  test("records non-critical listing edits without forcing reapproval", async () => {
    const product = {
      _id: new ObjectId("665000000000000000000002"),
      vendorId: new ObjectId("665000000000000000000099"),
      categoryId: new ObjectId("665000000000000000000010"),
      title: "Live product",
      price: 100,
      approvalStatus: "approved",
      seo: { metaTitle: "Old", metaDescription: "Old description" },
    };
    const harness = buildRequest({
      product,
      body: {
        seo: { metaTitle: "Better title", metaDescription: "Better description" },
      },
    });
    const res = createResponse();

    await vendorProductController.updateProduct(harness.req, res);

    expect(res.statusCode).toBe(200);
    expect(harness.savedUpdate.approvalStatus).toBeUndefined();
    expect(harness.savedUpdate.editHistory[0]).toMatchObject({
      changedFields: ["seo"],
      criticalFields: [],
      requiresReapproval: false,
    });
  });

  test("bulkProductAction updates selected products and requeues critical approved edits", async () => {
    const productId = new ObjectId("665000000000000000000003");
    const vendorId = new ObjectId("665000000000000000000099");
    const product = {
      _id: productId,
      vendorId,
      title: "Live bulk product",
      price: 100,
      stock: 5,
      approvalStatus: "approved",
      editHistory: [],
    };
    let savedUpdate = null;
    const Product = {
      findById: jest.fn().mockResolvedValue(product),
      update: jest.fn((id, update) => {
        savedUpdate = update;
        return Promise.resolve({ modifiedCount: 1 });
      }),
    };
    const req = {
      body: {
        action: "update_fields",
        updates: [
          {
            productId: productId.toString(),
            price: 120,
            stock: 8,
            lowStockThreshold: 3,
          },
        ],
      },
      user: { uid: "seller-firebase-1" },
      vendor: { _id: vendorId, shopName: "Seller Shop" },
      vendorStaff: { _id: "staff-2", email: "ops@example.com" },
      app: { locals: { models: { Product } } },
    };
    const res = createResponse();

    await vendorProductController.bulkProductAction(req, res);

    expect(res.statusCode).toBe(200);
    expect(Product.update).toHaveBeenCalledWith(productId.toString(), expect.objectContaining({
      price: 120,
      stock: 8,
      lowStockThreshold: 3,
      approvalStatus: "pending",
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
    }));
    expect(savedUpdate.editHistory[0]).toMatchObject({
      action: "vendor_bulk_edit",
      actorRole: "vendor_staff",
      staffEmail: "ops@example.com",
      changedFields: ["price", "stock", "lowStockThreshold"],
      criticalFields: ["price"],
      requiresReapproval: true,
    });
    expect(res.body).toEqual(expect.objectContaining({
      success: true,
      summary: expect.objectContaining({ requested: 1, updated: 1, failed: 0 }),
    }));
  });
});
