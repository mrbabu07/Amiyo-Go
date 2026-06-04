const crypto = require("crypto");
const express = require("express");
const request = require("supertest");

jest.mock("../services/marketplaceEventBus", () => ({
  publish: jest.fn().mockResolvedValue({ event: { _id: "event-1" } }),
}));

const deliveryRoutes = require("../routes/deliveryRoutes");

const signCallback = (rawBody, timestamp, secret) =>
  `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;

const buildApp = () => {
  const app = express();
  const order = {
    _id: "64f000000000000000000201",
    products: [{ productId: "p-1", itemStatus: "in_transit" }],
  };
  const orderCollection = {
    findOne: jest.fn().mockResolvedValue(order),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  const collections = {
    orders: orderCollection,
    shipments: { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }) },
    shipment_events: { insertOne: jest.fn().mockResolvedValue({ insertedId: "event-1" }) },
    vendorOrders: { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }) },
  };
  const db = {
    collection: jest.fn((name) => collections[name]),
  };

  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }));
  app.locals.db = db;
  app.locals.models = { Order: { collection: orderCollection } };
  app.use("/api/delivery", deliveryRoutes);
  app.locals.__collections = collections;
  return app;
};

describe("Amiyo Delivery callback routes", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AMIYO_DELIVERY_CALLBACK_API_SECRET = "callback-key";
    process.env.AMIYO_DELIVERY_CALLBACK_SECRET = "callback-secret";
    process.env.AMIYO_DELIVERY_CALLBACK_TOLERANCE_SECONDS = "300";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  test("rejects unsigned delivery callbacks", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/delivery/orders/64f000000000000000000201/delivered")
      .send({ status: "delivered" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("accepts signed delivered callback and updates order", async () => {
    const app = buildApp();
    const rawBody = JSON.stringify({ trackingId: "TRK-1", pod: { receiverName: "Customer" } });
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const response = await request(app)
      .post("/api/delivery/orders/64f000000000000000000201/delivered")
      .set("Content-Type", "application/json")
      .set("x-api-key", "callback-key")
      .set("x-amiyo-delivery-timestamp", timestamp)
      .set("x-amiyo-delivery-signature", signCallback(rawBody, timestamp, "callback-secret"))
      .send(rawBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        orderId: "64f000000000000000000201",
        deliveryStatus: "delivered",
        orderStatus: "delivered",
      },
    });
    expect(app.locals.__collections.orders.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({
          deliveryStatus: "delivered",
          status: "delivered",
          trackingId: "TRK-1",
        }),
      }),
    );
  });
});
