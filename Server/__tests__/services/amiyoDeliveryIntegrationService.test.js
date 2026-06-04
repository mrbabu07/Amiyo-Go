const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const {
  buildAmiyoDeliveryPayload,
  createAmiyoDeliveryShipment,
  signAmiyoDeliveryPayload,
  updateOrderFromDeliveryCallback,
  verifyAmiyoDeliveryCallback,
} = require("../../services/amiyoDeliveryIntegrationService");

const testEnv = {
  AMIYO_DELIVERY_API_URL: "http://delivery.local",
  AMIYO_DELIVERY_CLIENT_URL: "http://delivery-web.local",
  AMIYO_DELIVERY_INTEGRATION_TOKEN: "integration-token",
  AMIYO_DELIVERY_WEBHOOK_SECRET: "outgoing-secret",
  AMIYO_DELIVERY_CALLBACK_API_SECRET: "callback-key",
  AMIYO_DELIVERY_CALLBACK_SECRET: "callback-secret",
  AMIYO_DELIVERY_CALLBACK_TOLERANCE_SECONDS: "300",
  AMIYO_DELIVERY_MAX_RETRIES: "2",
  AMIYO_DELIVERY_RETRY_DELAY_MS: "0",
};

const hmac = (secret, message) =>
  crypto.createHmac("sha256", secret).update(message).digest("hex");

describe("amiyoDeliveryIntegrationService", () => {
  test("builds one delivery payload with bundled vendor orders", () => {
    const orderId = new ObjectId("64f000000000000000000201");
    const payload = buildAmiyoDeliveryPayload({
      _id: orderId,
      userId: "customer-1",
      paymentMethod: "cod",
      subtotal: 1000,
      deliveryCharge: 60,
      totalDiscount: 100,
      total: 960,
      shippingInfo: {
        name: "Customer",
        email: "customer@example.com",
        phone: "+8801700000000",
        address: "House 1",
        area: "Gulshan",
        city: "Dhaka",
      },
      products: [
        {
          productId: "p-1",
          title: "Rice",
          vendorId: "vendor-1",
          vendorName: "Dhaka Fresh",
          quantity: 2,
          price: 500,
        },
      ],
    }, {
      vendorOrders: [
        {
          _id: "vendor-order-1",
          vendorId: "vendor-1",
          vendorName: "Dhaka Fresh",
          subtotal: 1000,
          deliveryCharge: 60,
          totalDiscount: 100,
          totalAmount: 960,
          products: [{ productId: "p-1", title: "Rice", quantity: 2, price: 500 }],
        },
      ],
    });

    expect(payload.order.id).toBe(orderId.toString());
    expect(payload.order.codAmount).toBe(960);
    expect(payload.customer.phone).toBe("+8801700000000");
    expect(payload.vendorOrders).toHaveLength(1);
    expect(payload.pickupManifest).toEqual(expect.objectContaining({
      vendorOrderIds: ["vendor-order-1"],
      vendorCount: 1,
      itemCount: 2,
    }));
  });

  test("signs outgoing delivery payload with timestamp.rawJson HMAC", () => {
    const rawJson = JSON.stringify({ orderId: "order-1" });
    const signed = signAmiyoDeliveryPayload(rawJson, {
      env: testEnv,
      timestamp: "1760000000",
    });

    expect(signed).toEqual({
      timestamp: "1760000000",
      signature: `sha256=${hmac("outgoing-secret", `1760000000.${rawJson}`)}`,
    });
  });

  test("verifies signed callbacks using raw request body", () => {
    const rawBody = JSON.stringify({ status: "delivered", trackingId: "TRK-1" });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const req = {
      rawBody,
      body: JSON.parse(rawBody),
      headers: {
        "x-api-key": "callback-key",
        "x-amiyo-delivery-timestamp": timestamp,
        "x-amiyo-delivery-signature": `sha256=${hmac("callback-secret", `${timestamp}.${rawBody}`)}`,
      },
    };

    expect(verifyAmiyoDeliveryCallback(req, { env: testEnv })).toEqual({ ok: true });
  });

  test("creates a delivery order, retries retryable failures, and stores response fields", async () => {
    const orderId = new ObjectId("64f000000000000000000201");
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: "Busy" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          data: {
            id: "delivery-1",
            code: "AD-1001",
            trackingId: "TRK-1001",
            status: "created",
          },
        }),
      });

    const result = await createAmiyoDeliveryShipment({
      _id: orderId,
      total: 500,
      shippingInfo: { name: "Customer", phone: "01700000000" },
      products: [{ productId: "p-1", title: "Rice", vendorId: "vendor-1", quantity: 1, price: 500 }],
    }, {
      env: testEnv,
      fetchImpl,
      orderCollection: { updateOne },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expect.objectContaining({
      success: true,
      deliveryOrderId: "delivery-1",
      deliveryCode: "AD-1001",
      trackingId: "TRK-1001",
    }));
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
      expect.objectContaining({
        $set: expect.objectContaining({
          deliveryProvider: "amiyo_delivery",
          deliveryOrderId: "delivery-1",
          deliveryCode: "AD-1001",
          trackingId: "TRK-1001",
          deliveryStatus: "created",
        }),
      }),
    );
  });

  test("updates order, vendor orders, and shipments from delivered callback", async () => {
    const orderId = new ObjectId("64f000000000000000000201");
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const orderCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: orderId,
        products: [{ productId: "p-1", itemStatus: "in_transit" }],
      }),
      updateOne,
    };
    const collectionMocks = {
      orders: orderCollection,
      shipments: { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }) },
      shipment_events: { insertOne: jest.fn().mockResolvedValue({ insertedId: "event-1" }) },
      vendorOrders: { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }) },
    };
    const db = {
      collection: jest.fn((name) => collectionMocks[name]),
    };

    const result = await updateOrderFromDeliveryCallback(orderId.toString(), {
      trackingId: "TRK-1001",
      pod: { receiverName: "Customer" },
    }, {
      db,
      orderCollection,
      eventType: "delivered",
    });

    expect(result).toEqual({
      orderId: orderId.toString(),
      deliveryStatus: "delivered",
      orderStatus: "delivered",
    });
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
      expect.objectContaining({
        $set: expect.objectContaining({
          deliveryProvider: "amiyo_delivery",
          deliveryStatus: "delivered",
          status: "delivered",
          trackingId: "TRK-1001",
          products: [expect.objectContaining({ itemStatus: "delivered" })],
        }),
      }),
    );
    expect(collectionMocks.shipments.updateMany).toHaveBeenCalled();
    expect(collectionMocks.vendorOrders.updateMany).toHaveBeenCalled();
  });
});
