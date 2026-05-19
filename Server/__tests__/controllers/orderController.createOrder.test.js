const { ObjectId } = require("mongodb");

jest.mock("../../services/emailService", () => ({
  sendLowStockAlert: jest.fn().mockResolvedValue(undefined),
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/invoiceService", () => ({
  generateInvoice: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../models/DeliverySettings", () => ({
  getSettings: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../utils/deliveryCalculator", () => ({
  calculateDeliveryBreakdown: jest.fn(() => ({
    totalDeliveryFee: 60,
    breakdown: [
      {
        vendorId: "64f000000000000000000101",
        deliveryFee: 60,
        deliveryMethod: "standard",
      },
    ],
  })),
}));

jest.mock("../../services/orderEventService", () => ({
  appendOrderEvent: jest.fn().mockResolvedValue(null),
  getTimelineForOrder: jest.fn().mockResolvedValue([]),
}));

const orderController = require("../../controllers/orderController");

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe("orderController.createOrder", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates shipment drafts for each vendor group immediately after order placement", async () => {
    const orderId = new ObjectId("64f000000000000000000201");
    const vendorId = "64f000000000000000000101";
    const productId = "64f000000000000000000301";
    const vendorDoc = {
      _id: new ObjectId(vendorId),
      shopName: "Dhaka Fresh",
      ownerUserId: "owner-1",
      pickupAddress: {
        name: "Dhaka Fresh Warehouse",
        phone: "01711111111",
        address: "Warehouse Road",
        district: "Dhaka",
      },
    };

    let persistedOrder;
    const vendorCollection = {
      findOne: jest.fn().mockResolvedValue(vendorDoc),
    };
    const db = {
      collection: jest.fn((name) => {
        if (name === "vendors") return vendorCollection;
        throw new Error(`Unexpected collection: ${name}`);
      }),
    };

    const Order = {
      create: jest.fn(async (orderData) => {
        persistedOrder = {
          _id: orderId,
          ...orderData,
          subtotal: 1000,
          deliveryCharge: 60,
          couponDiscount: 0,
          pointsDiscount: 0,
          totalDiscount: 0,
          total: 1060,
          totalAmount: 1060,
          couponApplied: null,
        };
        return orderId;
      }),
      findById: jest.fn(async () => persistedOrder),
      collection: {
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      },
    };
    Order.collection.db = db;

    const Product = {
      findById: jest.fn().mockResolvedValue({
        _id: new ObjectId(productId),
        title: "Premium Rice",
        image: "rice.jpg",
        vendorId,
        categoryId: "cat-1",
        stock: 20,
        price: 500,
      }),
      updateStock: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      collection: { db },
    };

    const VendorOrder = {
      create: jest.fn().mockResolvedValue({ _id: new ObjectId("64f000000000000000000401") }),
    };
    const Shipment = {
      createFromOrder: jest.fn().mockResolvedValue({
        _id: new ObjectId("64f000000000000000000501"),
        trackingNumber: "AMG-ORDER-DRAFT",
        shipmentState: "created",
        codState: "cod_pending",
      }),
    };
    const Notification = {
      create: jest.fn().mockResolvedValue({ insertedId: "notification-1" }),
    };
    const Vendor = {
      findById: jest.fn().mockResolvedValue(vendorDoc),
    };
    const User = {
      findById: jest.fn().mockResolvedValue({ firebaseUid: "vendor-owner-firebase" }),
    };

    const req = {
      user: { uid: "customer-1" },
      body: {
        products: [{ productId, price: 500, quantity: 2 }],
        total: 1000,
        shippingInfo: {
          name: "Customer",
          email: "customer@example.com",
          phone: "01700000000",
          address: "House 1",
          city: "Dhaka",
          district: "Dhaka",
          upazila: "Dhanmondi",
          union: "Ward 1",
          area: "Road 1",
        },
        paymentMethod: "cod",
      },
      app: {
        locals: {
          models: {
            Order,
            VendorOrder,
            Product,
            Shipment,
            Notification,
            Vendor,
            User,
          },
        },
      },
    };
    const res = buildResponse();

    await orderController.createOrder(req, res);

    expect(Shipment.createFromOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: orderId,
        products: [
          expect.objectContaining({
            title: "Premium Rice",
            vendorId,
          }),
        ],
      }),
      vendorId,
      expect.objectContaining({
        actorRole: "system",
        actorId: "customer-1",
        pickupAddress: expect.objectContaining({
          address: "Warehouse Road",
        }),
        shipmentState: "created",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          orderId,
          shipmentDrafts: [
            expect.objectContaining({
              vendorId,
              trackingNumber: "AMG-ORDER-DRAFT",
              shipmentState: "created",
              codState: "cod_pending",
            }),
          ],
        }),
      }),
    );
  });
});
