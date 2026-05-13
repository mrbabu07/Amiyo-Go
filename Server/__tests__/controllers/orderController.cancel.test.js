jest.mock("../../services/emailService", () => ({
  sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/invoiceService", () => ({}));

const { ObjectId } = require("mongodb");
const emailService = require("../../services/emailService");
const orderController = require("../../controllers/orderController");

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe("orderController.cancelOrder", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("cancels customer order, syncs vendor order, restores stock, and notifies vendor", async () => {
    const orderId = "64f000000000000000000001";
    const productId = "64f000000000000000000002";
    const vendorId = "64f000000000000000000003";
    const vendorUserId = "64f000000000000000000004";
    const cancelledAt = new Date("2026-05-13T10:00:00.000Z");

    const originalOrder = {
      _id: new ObjectId(orderId),
      userId: "customer-1",
      status: "pending",
      paymentStatus: "paid",
      shippingInfo: {
        name: "Customer",
        email: "customer@example.com",
      },
      products: [{
        productId,
        vendorId,
        title: "Rice",
        quantity: 2,
        price: 100,
        adminCommissionAmount: 10,
        vendorEarningAmount: 190,
      }],
    };
    const cancelledOrder = {
      ...originalOrder,
      status: "cancelled",
      paymentStatus: "refund_pending",
      cancelledBy: "customer-1",
      cancelledByRole: "user",
      cancellationSource: "customer",
      cancellationMessage: "User cancelled this order within 30 minutes.",
      cancelledAt,
      products: originalOrder.products.map((product) => ({
        ...product,
        itemStatus: "cancelled",
        cancelledAt,
      })),
    };

    const vendorOrderUpdateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const productUpdateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const Notification = { create: jest.fn().mockResolvedValue({ insertedId: "notification-1" }) };
    const Vendor = { findById: jest.fn().mockResolvedValue({ userId: new ObjectId(vendorUserId) }) };
    const User = { findById: jest.fn().mockResolvedValue({ firebaseUid: "vendor-firebase-1" }) };
    const Order = {
      findById: jest.fn().mockResolvedValue(originalOrder),
      cancelOrder: jest.fn().mockResolvedValue(cancelledOrder),
      collection: { db: {} },
    };
    const Product = {
      collection: { updateOne: productUpdateOne },
    };
    const req = {
      params: { id: orderId },
      user: { uid: "customer-1" },
      app: {
        locals: {
          db: {
            collection: jest.fn((name) => {
              if (name === "vendorOrders") return { updateOne: vendorOrderUpdateOne };
              throw new Error(`Unexpected collection: ${name}`);
            }),
          },
          models: { Order, Product, Notification, Vendor, User },
        },
      },
    };
    const res = buildResponse();

    await orderController.cancelOrder(req, res);

    expect(Order.cancelOrder).toHaveBeenCalledWith(orderId, "customer-1");
    expect(vendorOrderUpdateOne).toHaveBeenCalledWith(
      { parentOrderId: orderId, vendorId },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "cancelled",
          paymentStatus: "refund_pending",
          cancellationMessage: "User cancelled this order within 30 minutes.",
          subtotal: 200,
          totalAmount: 200,
          totalCommission: 10,
          vendorEarnings: 190,
        }),
      }),
      { upsert: true },
    );
    expect(productUpdateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(productId) },
      expect.objectContaining({ $inc: { stock: 2 } }),
    );
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "vendor-firebase-1",
      type: "order_cancelled",
      orderId,
    }));
    expect(emailService.sendOrderStatusUpdate).toHaveBeenCalledWith({
      userEmail: "customer@example.com",
      userName: "Customer",
      orderId,
      status: "cancelled",
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Order cancelled successfully",
    });
  });

  test("maps expired cancellation errors to 400", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const Order = {
      findById: jest.fn().mockResolvedValue({ products: [], shippingInfo: {} }),
      cancelOrder: jest.fn().mockRejectedValue(new Error("Cancellation period has expired (30 minutes)")),
      collection: { db: {} },
    };
    const req = {
      params: { id: "64f000000000000000000001" },
      user: { uid: "customer-1" },
      app: {
        locals: {
          db: { collection: jest.fn() },
          models: {
            Order,
            Product: { collection: { updateOne: jest.fn() } },
            Notification: null,
            Vendor: {},
            User: {},
          },
        },
      },
    };
    const res = buildResponse();

    await orderController.cancelOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Cancellation period has expired (30 minutes)",
    });
  });
});
