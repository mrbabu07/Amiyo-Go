const Order = require("../../models/Order");

describe("Order.syncOrderStatus", () => {
  test("derives ready_to_ship when every non-cancelled item is ready", async () => {
    const model = Object.create(Order.prototype);
    model.findById = jest.fn().mockResolvedValue({
      _id: "64f000000000000000000301",
      status: "processing",
      products: [
        { itemStatus: "ready_to_ship" },
        { itemStatus: "ready_to_ship" },
      ],
    });
    model.collection = { updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };

    await expect(model.syncOrderStatus("64f000000000000000000301")).resolves.toBe("ready_to_ship");
    expect(model.collection.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ $set: expect.objectContaining({ status: "ready_to_ship" }) }),
    );
  });
});
