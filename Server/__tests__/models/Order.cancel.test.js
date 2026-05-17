const { ObjectId } = require("mongodb");
const Order = require("../../models/Order");

const buildOrderModel = (existingOrder) => {
  const collection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(existingOrder),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  const db = { collection: jest.fn(() => collection) };
  return { order: new Order(db), collection };
};

const orderId = "64f000000000000000000001";

describe("Order model cancellation", () => {
  test("cancelOrder cancels pending orders inside the 30-minute window", async () => {
    const existingOrder = {
      _id: new ObjectId(orderId),
      userId: "customer-1",
      status: "pending",
      paymentStatus: "paid",
      createdAt: new Date(),
      products: [{ productId: "64f000000000000000000002", quantity: 1 }],
    };
    const { order, collection } = buildOrderModel(existingOrder);

    const result = await order.cancelOrder(orderId, "customer-1");

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(orderId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "cancelled",
          paymentStatus: "refund_pending",
          cancelledBy: "customer-1",
          cancelledByRole: "user",
          cancellationSource: "customer",
          cancellationReason: null,
          cancellationReasonLabel: null,
          cancellationMessage: "User cancelled this order within 30 minutes.",
        }),
        $push: expect.objectContaining({
          statusHistory: expect.objectContaining({
            status: "cancelled",
            changedBy: "customer-1",
          }),
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({
      status: "cancelled",
      products: [expect.objectContaining({ itemStatus: "cancelled" })],
      cancelledAt: expect.any(Date),
    }));
  });

  test("cancelOrder stores a customer selected cancellation reason", async () => {
    const existingOrder = {
      _id: new ObjectId(orderId),
      userId: "customer-1",
      status: "pending",
      paymentStatus: "pending",
      createdAt: new Date(),
      products: [{ productId: "64f000000000000000000002", quantity: 1 }],
    };
    const { order, collection } = buildOrderModel(existingOrder);

    const result = await order.cancelOrder(orderId, "customer-1", "wrong_address");

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(orderId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          cancellationReason: "wrong_address",
          cancellationReasonLabel: "Wrong delivery address",
          cancellationMessage: "Customer cancelled: Wrong delivery address",
        }),
        $push: expect.objectContaining({
          statusHistory: expect.objectContaining({
            note: "Customer cancelled within the 30-minute cancellation window: Wrong delivery address",
          }),
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({
      cancellationReason: "wrong_address",
      cancellationReasonLabel: "Wrong delivery address",
    }));
  });

  test("cancelOrder blocks unauthorized users", async () => {
    const { order } = buildOrderModel({
      _id: new ObjectId(orderId),
      userId: "customer-1",
      status: "pending",
      createdAt: new Date(),
    });

    await expect(order.cancelOrder(orderId, "other-user")).rejects.toThrow(
      "Unauthorized to cancel this order",
    );
  });

  test("cancelOrder blocks orders after cancellation window expires", async () => {
    const { order } = buildOrderModel({
      _id: new ObjectId(orderId),
      userId: "customer-1",
      status: "pending",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      canCancelUntil: new Date("2020-01-01T00:30:00.000Z"),
    });

    await expect(order.cancelOrder(orderId, "customer-1")).rejects.toThrow(
      "Cancellation period has expired (30 minutes)",
    );
  });
});
