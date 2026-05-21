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

  const promotionSettingsCollection = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const offersCollection = {
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  const db = {
    collection: jest.fn((name) => {
      if (name === "orders") return ordersCollection;
      if (name === "categories") return categoriesCollection;
      if (name === "coupons") return couponsCollection;
      if (name === "vendorMarketingItems") return voucherCollection;
      if (name === "offers") return offersCollection;
      if (name === "promotion_settings") return promotionSettingsCollection;
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
    offersCollection,
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
    expect(insertedOrder.discountBreakdown).toEqual(
      expect.objectContaining({
        version: 1,
        validation: expect.objectContaining({ valid: true }),
        totals: expect.objectContaining({
          subtotal: 300,
          deliveryCharge: 0,
          discountTotal: 20,
          payableTotal: 280,
        }),
        lines: [
          expect.objectContaining({
            type: "vendor_voucher",
            code: "SHOP10",
            amount: 20,
            scopeVendorId: "vendor-1",
            vendorSubtotal: 200,
          }),
        ],
      }),
    );
    expect(voucherCollection.updateOne).toHaveBeenCalled();
  });

  test("create applies platform free-shipping coupon against delivery charge", async () => {
    const { db, inserted, couponsCollection } = buildDb();
    couponsCollection.findOne.mockResolvedValueOnce({
      _id: "coupon-1",
      code: "SHIPFREE",
      discountType: "free_shipping",
      discountValue: 0,
      maxDiscountAmount: 80,
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const orderModel = new Order(db);

    await orderModel.create({
      userId: "user-1",
      products: [{ title: "A", vendorId: "vendor-1", price: 200, quantity: 1 }],
      couponCode: "shipfree",
      paymentMethod: "cod",
      deliveryCharge: 60,
    });

    const insertedOrder = inserted[0];
    expect(insertedOrder.couponDiscount).toBe(60);
    expect(insertedOrder.totalDiscount).toBe(60);
    expect(insertedOrder.total).toBe(200);
    expect(insertedOrder.discountBreakdown.lines[0]).toEqual(
      expect.objectContaining({
        type: "free_shipping",
        code: "SHIPFREE",
        amount: 60,
      }),
    );
    expect(couponsCollection.updateOne).toHaveBeenCalled();
  });

  test("create applies seller free-shipping voucher only to that vendor delivery charge", async () => {
    const { db, inserted, voucherCollection } = buildDb();
    voucherCollection.findOne.mockResolvedValueOnce({
      _id: "voucher-ship",
      code: "SHIPSHOP",
      title: "Seller shipping",
      vendorId: "vendor-1",
      vendorName: "Village Store",
      discountType: "free_shipping",
      discountValue: 0,
      status: "approved",
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 60_000),
      usedCount: 0,
      usageLimit: 20,
    });
    const orderModel = new Order(db);

    await orderModel.create({
      userId: "user-1",
      products: [
        { title: "A", vendorId: "vendor-1", price: 200, quantity: 1 },
        { title: "B", vendorId: "vendor-2", price: 100, quantity: 1 },
      ],
      couponCode: "shipshop",
      paymentMethod: "cod",
      deliveryCharge: 120,
      deliveryBreakdown: [
        { vendorId: "vendor-1", deliveryFee: 45 },
        { vendorId: "vendor-2", deliveryFee: 75 },
      ],
    });

    const insertedOrder = inserted[0];
    expect(insertedOrder.couponDiscount).toBe(45);
    expect(insertedOrder.totalDiscount).toBe(45);
    expect(insertedOrder.total).toBe(375);
    expect(insertedOrder.couponApplied).toEqual(
      expect.objectContaining({
        code: "SHIPSHOP",
        source: "vendor_voucher",
        scopeVendorId: "vendor-1",
        vendorDeliveryCharge: 45,
      }),
    );
    expect(insertedOrder.discountBreakdown.totals).toEqual(
      expect.objectContaining({
        subtotal: 300,
        deliveryCharge: 120,
        discountTotal: 45,
        payableTotal: 375,
      }),
    );
  });

  test("create persists offer promo code discounts in every customer-facing total field", async () => {
    const { db, inserted, voucherCollection, offersCollection } = buildDb();
    voucherCollection.findOne.mockResolvedValueOnce(null);
    offersCollection.findOne.mockResolvedValueOnce({
      _id: "offer-1",
      couponCode: "EID100",
      title: "Eid promo",
      discountType: "fixed",
      discountValue: 100,
      isActive: true,
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 60_000),
    });
    const orderModel = new Order(db);

    await orderModel.create({
      userId: "user-1",
      products: [{ title: "A", vendorId: "vendor-1", price: 500, quantity: 1 }],
      couponCode: "eid100",
      paymentMethod: "cod",
      deliveryCharge: 50,
    });

    const insertedOrder = inserted[0];
    expect(insertedOrder.couponDiscount).toBe(100);
    expect(insertedOrder.totalDiscount).toBe(100);
    expect(insertedOrder.discount).toBe(100);
    expect(insertedOrder.discountAmount).toBe(100);
    expect(insertedOrder.total).toBe(450);
    expect(insertedOrder.totalAmount).toBe(450);
    expect(insertedOrder.finalTotal).toBe(450);
    expect(insertedOrder.grandTotal).toBe(450);
    expect(insertedOrder.payableTotal).toBe(450);
    expect(insertedOrder.originalTotal).toBe(550);
    expect(insertedOrder.couponApplied).toEqual(
      expect.objectContaining({
        code: "EID100",
        source: "offer",
        type: "offer",
        discountAmount: 100,
      }),
    );
    expect(insertedOrder.discountBreakdown.totals).toEqual(
      expect.objectContaining({
        subtotal: 500,
        deliveryCharge: 50,
        discountTotal: 100,
        payableTotal: 450,
      }),
    );
    expect(offersCollection.updateOne).toHaveBeenCalled();
  });
});
