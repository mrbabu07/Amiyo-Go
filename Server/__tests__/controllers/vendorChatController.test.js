const { ObjectId } = require("mongodb");
const {
  createVendorMessageTemplate,
  createVendorQuickReply,
  getVendorConversations,
  getVendorSupportTools,
} = require("../../controllers/vendorChatController");

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const cursorFrom = (rows) => {
  const cursor = {
    sort: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    toArray: jest.fn().mockResolvedValue(rows),
  };
  return cursor;
};

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

const buildReq = ({
  vendorId = new ObjectId(),
  conversations = [],
  orders = [],
  products = [],
  settings = null,
  body = {},
  params = {},
} = {}) => {
  const settingsCollection = {
    findOne: jest.fn().mockResolvedValue(settings),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1, upsertedCount: 1 }),
  };
  const ordersCollection = {
    find: jest.fn(() => cursorFrom(orders)),
  };
  const productsCollection = {
    find: jest.fn(() => cursorFrom(products)),
  };
  const VendorChat = {
    getVendorConversations: jest.fn().mockResolvedValue(conversations),
    collection: {
      find: jest.fn(() => cursorFrom(conversations)),
    },
  };

  return {
    body,
    params,
    user: { uid: "vendor-user", role: "vendor", vendorId },
    app: {
      locals: {
        db: {
          collection: jest.fn((name) => {
            if (name === "vendorMessageSettings") return settingsCollection;
            if (name === "orders") return ordersCollection;
            if (name === "products") return productsCollection;
            return { find: jest.fn(() => cursorFrom([])), findOne: jest.fn(), updateOne: jest.fn() };
          }),
        },
        models: {
          VendorChat,
        },
      },
    },
    testDoubles: {
      settingsCollection,
      VendorChat,
    },
  };
};

describe("vendor chat support controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getVendorConversations enriches inbox rows with customer, order, product, and response metrics", async () => {
    const vendorId = new ObjectId();
    const productId = new ObjectId();
    const orderId = new ObjectId();
    const conversations = [
      {
        _id: new ObjectId(),
        userId: "buyer-firebase",
        vendorId,
        productId,
        orderId,
        status: "active",
        messages: [
          { _id: "m1", senderType: "user", message: "Is it packed?", createdAt: hoursAgo(2), read: false },
          { _id: "m2", senderType: "vendor", message: "Packing now", createdAt: hoursAgo(1.5), read: true },
        ],
        user: {
          firebaseUid: "buyer-firebase",
          email: "buyer@example.com",
          profile: { firstName: "Amina", lastName: "Rahman", phone: "01700000000" },
        },
      },
    ];
    const orders = [
      {
        _id: orderId,
        userId: "buyer-firebase",
        orderNumber: "BD-1001",
        status: "packed",
        paymentMethod: "cod",
        createdAt: hoursAgo(6),
        products: [
          {
            vendorId,
            productId,
            title: "Cotton panjabi",
            sku: "PANJABI-M",
            price: 1200,
            quantity: 1,
          },
        ],
      },
      {
        _id: new ObjectId(),
        userId: "buyer-firebase",
        status: "delivered",
        createdAt: hoursAgo(100),
        products: [{ vendorId, productId, title: "Cotton panjabi", price: 1200, quantity: 1 }],
      },
      {
        _id: new ObjectId(),
        userId: "buyer-firebase",
        status: "delivered",
        createdAt: hoursAgo(200),
        products: [{ vendorId, productId, title: "Cotton panjabi", price: 1200, quantity: 1 }],
      },
    ];
    const req = buildReq({
      vendorId,
      conversations,
      orders,
      products: [{ _id: productId, title: "Cotton panjabi", sku: "PANJABI-M", stock: 7 }],
    });
    const res = createRes();

    await getVendorConversations(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data[0]).toEqual(expect.objectContaining({
      customerTier: "Repeat",
      orderContext: expect.objectContaining({
        orderNumber: "BD-1001",
        status: "packed",
        total: 1200,
      }),
      productContext: expect.objectContaining({
        name: "Cotton panjabi",
        sku: "PANJABI-M",
        stock: 7,
      }),
    }));
    expect(payload.data[0].context.customer).toEqual(expect.objectContaining({
      name: "Amina Rahman",
      email: "buyer@example.com",
      tier: "Repeat",
      orderCount: 3,
    }));
    expect(payload.meta.responseMetrics).toEqual(expect.objectContaining({
      averageReplyMinutes: 30,
      tone: "green",
      pendingResponseCount: 0,
    }));
  });

  test("getVendorSupportTools returns saved tools, defaults, and red response health after 24h", async () => {
    const vendorId = new ObjectId();
    const req = buildReq({
      vendorId,
      conversations: [
        {
          _id: new ObjectId(),
          vendorId,
          messages: [
            { senderType: "user", message: "Any update?", createdAt: hoursAgo(60) },
            { senderType: "vendor", message: "Sorry for delay", createdAt: hoursAgo(10) },
          ],
        },
      ],
      settings: {
        vendorId: vendorId.toString(),
        quickReplies: [{ _id: "qr-1", title: "Custom", message: "Custom reply" }],
        templates: [{ _id: "tpl-1", title: "Packed", body: "Hi {customer_name}", variables: ["customer_name"] }],
      },
    });
    const res = createRes();

    await getVendorSupportTools(req, res);

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.quickReplies).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: "default-ship-24h" }),
      expect.objectContaining({ _id: "qr-1", title: "Custom" }),
    ]));
    expect(payload.templates).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: "default-packed" }),
      expect.objectContaining({ _id: "tpl-1", title: "Packed" }),
    ]));
    expect(payload.responseMetrics).toEqual(expect.objectContaining({
      averageReplyHours: 50,
      tone: "red",
      isBreachingSla: true,
    }));
  });

  test("createVendorQuickReply stores a vendor scoped reusable reply", async () => {
    const vendorId = new ObjectId();
    const req = buildReq({
      vendorId,
      body: {
        title: "Ship today",
        message: "We will ship your order today.",
      },
    });
    const res = createRes();

    await createVendorQuickReply(req, res);

    expect(req.testDoubles.settingsCollection.updateOne).toHaveBeenCalledWith(
      { vendorId: vendorId.toString() },
      expect.objectContaining({
        $push: {
          quickReplies: expect.objectContaining({
            title: "Ship today",
            message: "We will ship your order today.",
            isDefault: false,
          }),
        },
      }),
      { upsert: true },
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data).toEqual(expect.objectContaining({
      title: "Ship today",
    }));
  });

  test("createVendorMessageTemplate stores variables for rendered message templates", async () => {
    const vendorId = new ObjectId();
    const req = buildReq({
      vendorId,
      body: {
        title: "Packed order",
        body: "Hi {customer_name}, order #{order_id} is packed.",
        variables: ["customer_name", "order_id"],
      },
    });
    const res = createRes();

    await createVendorMessageTemplate(req, res);

    expect(req.testDoubles.settingsCollection.updateOne).toHaveBeenCalledWith(
      { vendorId: vendorId.toString() },
      expect.objectContaining({
        $push: {
          templates: expect.objectContaining({
            title: "Packed order",
            body: "Hi {customer_name}, order #{order_id} is packed.",
            variables: ["customer_name", "order_id"],
          }),
        },
      }),
      { upsert: true },
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
