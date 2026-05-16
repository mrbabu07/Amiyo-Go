const Order = require("../../models/Order");

const buildDb = () => {
  const inserted = [];
  const ordersCollection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    insertOne: jest.fn(async (doc) => {
      inserted.push(doc);
      return { insertedId: "order-1" };
    }),
  };

  const categoriesCollection = {
    find: jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue([]),
    })),
  };

  const couponsCollection = {
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  };

  const voucherCollection = {
    findOne: jest.fn().mockResolvedValue({
      _id: "voucher-1",
      code: "SHOP10",
      title: "Store Voucher",
      vendorId: "vendor-1",
      vendorName: "Village Store",
      discountType: "percentage",
      discountValue: 10,
      status: "approved",
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 60_000),
      usedCount: 0,
      usageLimit: 20,
    }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  const analyticsCollection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    countDocuments: jest.fn().mockResolvedValue(0),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const db = {
    collection: jest.fn((name) => {
      if (name === "orders") return ordersCollection;
      if (name === "categories") return categoriesCollection;
      if (name === "coupons") return couponsCollection;
      if (name === "vendorMarketingItems") return voucherCollection;
      if (["campaignVendorJoins", "vendorMarketingEvents", "campaignVoucherAnalytics"].includes(name)) {
        return analyticsCollection;
      }
      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  ordersCollection.db = db;

  return {
    db,
    inserted,
    ordersCollection,
    couponsCollection,
    voucherCollection,
  };
};

describe("Order model vendor voucher flow", () => {
  test("create applies approved vendor voucher only to the matching vendor subtotal", async () => {
    const { db, inserted, voucherCollection } = buildDb();
    const orderModel = new Order(db);

    await orderModel.create({
      userId: "user-1",
      products: [
        { title: "A", vendorId: "vendor-1", price: 200, quantity: 1 },
        { title: "B", vendorId: "vendor-2", price: 100, quantity: 1 },
      ],
      couponCode: "shop10",
      paymentMethod: "cod",
      deliveryCharge: 0,
    });

    const insertedOrder = inserted[0];
    expect(insertedOrder.couponDiscount).toBe(20);
    expect(insertedOrder.totalDiscount).toBe(20);
    expect(insertedOrder.total).toBe(280);
    expect(insertedOrder.couponApplied).toEqual(
      expect.objectContaining({
        code: "SHOP10",
        source: "vendor_voucher",
        scopeVendorId: "vendor-1",
        vendorSubtotal: 200,
        discountAmount: 20,
      }),
    );
    expect(voucherCollection.updateOne).toHaveBeenCalled();
  });
});
