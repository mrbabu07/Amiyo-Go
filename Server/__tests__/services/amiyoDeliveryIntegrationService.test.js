const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const {
  buildAmiyoDeliveryPayload,
  createAmiyoDeliveryForReadyOrder,
  createAmiyoDeliveryShipment,
  signAmiyoDeliveryPayload,
  syncAmiyoDeliveryOrder,
  updateOrderFromDeliveryCallback,
  verifyAmiyoDeliveryCallback,
  __test__,
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

    expect(payload.orderId).toBe(orderId.toString());
    expect(payload.syncMode).toBe("order_placed");
    expect(payload.marketplaceStatus).toBe("pending");
    expect(payload.readyForPickup).toBe(false);
    expect(payload.dispatchRequested).toBe(false);
    expect(payload.codAmount).toBe(960);
    expect(payload.customer.address).toBe("Customer, +8801700000000, House 1, Gulshan, Dhaka");
    expect(payload.customer.phone).toBe("+8801700000000");
    expect(payload.vendorOrders).toHaveLength(1);
    expect(payload.vendorOrders[0]).toEqual(expect.objectContaining({
      vendorOrderId: "vendor-order-1",
      pickup: expect.objectContaining({ address: expect.stringContaining("Pickup address pending") }),
      area: expect.objectContaining({ district: "Dhaka", upazila: "Gulshan", union: "Gulshan" }),
      codAmount: 960,
      payableAmount: 960,
      deliveryFee: 60,
      paymentType: "cod",
      parcelType: "ecommerce",
      deliveryType: "standard",
      packageCount: 2,
      dispatchRequested: false,
    }));
  });

  test("uses product vendor address snapshot as pickup fallback", () => {
    const orderId = new ObjectId("64f000000000000000000202");
    const payload = buildAmiyoDeliveryPayload({
      _id: orderId,
      paymentMethod: "cod",
      total: 10030,
      shippingInfo: {
        name: "Customer",
        phone: "+8801700000000",
        address: "House 1",
        area: "Hnila",
        upazila: "Teknaf",
        district: "Coxsbazar",
        division: "Chattagram",
      },
    }, {
      vendorOrders: [
        {
          _id: "vendor-order-2",
          vendorId: "vendor-2",
          totalAmount: 10030,
          deliveryCharge: 30,
          products: [
            {
              productId: "p-2",
              title: "Laptop",
              quantity: 1,
              price: 10000,
              vendorName: "Tech World Bangladesh",
              vendorPhone: "01812345679",
              vendorAddress: {
                details: "Shop 45, GEC Circle, Chattogram",
              },
            },
          ],
        },
      ],
    });

    expect(payload.vendorOrders[0].pickup).toEqual(expect.objectContaining({
      name: "Tech World Bangladesh",
      phone: "01812345679",
      address: "Shop 45, GEC Circle, Chattogram",
    }));
  });

  test("derives vendor COD from subtotal, delivery, and discount when total is absent", () => {
    const payload = buildAmiyoDeliveryPayload({
      _id: new ObjectId("64f000000000000000000203"),
      paymentMethod: "cod",
      total: 5000,
      shippingInfo: { name: "Customer", phone: "01700000000", address: "Dhaka" },
    }, {
      vendorOrders: [{
        _id: "vendor-order-3",
        vendorId: "vendor-3",
        subtotal: 1000,
        deliveryCharge: 50,
        totalDiscount: 100,
        products: [{ productId: "p-3", title: "Vendor item", quantity: 1, price: 1000 }],
      }],
    });

    expect(payload.vendorOrders[0]).toEqual(expect.objectContaining({
      codAmount: 950,
      deliveryFee: 50,
    }));
    expect(payload.vendorOrders[0].codAmount).not.toBe(5000);
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
          deliveryError: null,
        }),
      }),
    );
  });

  test("syncs a newly placed order to Amiyo Delivery before it is ready to ship", async () => {
    const orderId = new ObjectId("64f000000000000000000204");
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: {
          id: "delivery-new-order",
          trackingId: "TRK-NEW",
          status: "created",
        },
      }),
    });
    const Order = {
      findById: jest.fn().mockResolvedValue({
        _id: orderId,
        status: "pending",
        total: 500,
        paymentMethod: "cod",
        shippingInfo: { name: "Customer", phone: "01700000000" },
        products: [{ productId: "p-1", title: "Rice", vendorId: "vendor-1", quantity: 1, price: 500 }],
      }),
      collection: { updateOne },
    };

    const result = await syncAmiyoDeliveryOrder(orderId.toString(), {
      env: testEnv,
      Order,
      fetchImpl,
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      syncMode: "order_placed",
      deliveryOrderId: "delivery-new-order",
    }));
    const payload = JSON.parse(fetchImpl.mock.calls[0][0].body || fetchImpl.mock.calls[0][1]?.body || "{}");
    expect(payload).toEqual(expect.objectContaining({
      orderId: orderId.toString(),
      syncMode: "order_placed",
      fulfillmentStatus: "pending",
      dispatchRequested: false,
    }));
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
      expect.objectContaining({
        $set: expect.objectContaining({
          deliveryOrderPlacedSyncedAt: expect.any(Date),
          deliverySyncMode: "order_placed",
        }),
      }),
    );
  });

  test("only dispatches an order after its parent status is ready_to_ship", async () => {
    const fetchImpl = jest.fn();
    const Order = {
      findById: jest.fn().mockResolvedValue({
        _id: new ObjectId("64f000000000000000000203"),
        status: "processing",
      }),
    };

    await expect(createAmiyoDeliveryForReadyOrder("64f000000000000000000203", {
      env: testEnv,
      Order,
      fetchImpl,
    })).resolves.toEqual(expect.objectContaining({
      skipped: true,
      reason: "order_not_ready_to_ship",
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("ready_to_ship resyncs an existing delivery order so rider pickup can start", async () => {
    const orderId = new ObjectId("64f000000000000000000205");
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: {
          id: "delivery-existing",
          trackingId: "TRK-READY",
          status: "ready_to_ship",
        },
      }),
    });
    const Order = {
      findById: jest.fn().mockResolvedValue({
        _id: orderId,
        status: "ready_to_ship",
        deliveryOrderId: "delivery-existing",
        deliveryStatus: "created",
        total: 500,
        paymentMethod: "cod",
        shippingInfo: { name: "Customer", phone: "01700000000" },
        products: [{ productId: "p-1", title: "Rice", vendorId: "vendor-1", quantity: 1, price: 500 }],
      }),
      collection: { updateOne },
    };

    const result = await createAmiyoDeliveryForReadyOrder(orderId.toString(), {
      env: testEnv,
      Order,
      fetchImpl,
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      syncMode: "ready_to_ship",
      deliveryOrderId: "delivery-existing",
    }));
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(payload).toEqual(expect.objectContaining({
      orderId: orderId.toString(),
      syncMode: "ready_to_ship",
      fulfillmentStatus: "ready_to_ship",
      dispatchRequested: true,
      readyForPickup: true,
    }));
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
      expect.objectContaining({
        $set: expect.objectContaining({
          deliveryReadyToShipSyncedAt: expect.any(Date),
          deliveryDispatchRequestedAt: expect.any(Date),
          deliverySyncMode: "ready_to_ship",
        }),
      }),
    );
  });

  test("normalizes Amiyo Delivery root ids before nested marketplace order ids", () => {
    const response = {
      trackingId: "AMD-1001",
      deliveryOrderId: "delivery-object-id",
      deliveryCode: "DLY-1001",
      deliveryOrder: {
        _id: "nested-delivery-id",
        orderId: "marketplace-order-id",
        status: "created"
      }
    };

    const normalized = __test__.normalizeDeliveryCreateResponse(response, {}, {
      clientUrl: "https://delivery-web.local"
    });

    expect(normalized).toEqual(expect.objectContaining({
      deliveryOrderId: "delivery-object-id",
      deliveryCode: "DLY-1001",
      trackingId: "AMD-1001",
      trackingUrl: "https://delivery-web.local/track/AMD-1001"
    }));
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
          deliveryError: null,
          products: [expect.objectContaining({ itemStatus: "delivered" })],
        }),
      }),
    );
    expect(collectionMocks.shipments.updateMany).toHaveBeenCalled();
    expect(collectionMocks.vendorOrders.updateMany).toHaveBeenCalled();
  });
});
