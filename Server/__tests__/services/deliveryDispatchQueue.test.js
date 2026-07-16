jest.mock("../../services/amiyoDeliveryIntegrationService", () => ({
  createAmiyoDeliveryForReadyOrder: jest.fn(),
}));

const {
  enqueueReadyToShipDelivery,
  __test__,
} = require("../../services/deliveryDispatchQueue");
const {
  createAmiyoDeliveryForReadyOrder,
} = require("../../services/amiyoDeliveryIntegrationService");

class FakeCollection {
  constructor() {
    this.docs = [];
  }

  async createIndex() {}

  async findOne(query) {
    return this.docs.find((doc) => doc.idempotencyKey === query.idempotencyKey) || null;
  }

  async updateOne(query, update, options = {}) {
    let doc = await this.findOne(query);
    if (!doc && options.upsert) {
      doc = { ...query };
      this.docs.push(doc);
      Object.assign(doc, update.$setOnInsert || {});
    }
    if (!doc) return { matchedCount: 0 };
    Object.assign(doc, update.$set || {});
    Object.entries(update.$inc || {}).forEach(([key, value]) => {
      doc[key] = Number(doc[key] || 0) + value;
    });
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

const buildApp = () => {
  const collection = new FakeCollection();
  const db = { collection: jest.fn(() => collection) };
  return {
    app: {
      locals: {
        db,
        models: {
          Order: { findById: jest.fn() },
          VendorOrder: { findByParentOrderId: jest.fn() },
        },
      },
    },
    collection,
  };
};

describe("deliveryDispatchQueue", () => {
  beforeEach(() => {
    __test__.reset();
    jest.clearAllMocks();
    delete process.env.VERCEL;
    delete process.env.DELIVERY_DISPATCH_API_INLINE;
    delete process.env.DELIVERY_DISPATCH_STALE_PROCESSING_MS;
  });

  test("creates one idempotent READY_TO_SHIP queue job", async () => {
    const { app, collection } = buildApp();
    const queue = { add: jest.fn(), getJob: jest.fn().mockResolvedValue(null) };
    __test__.setQueue(queue);

    const first = await enqueueReadyToShipDelivery({ app, orderId: "order-1", source: "vendor" });
    const second = await enqueueReadyToShipDelivery({ app, orderId: "order-1", source: "admin" });

    expect(first).toEqual({ queued: true, idempotencyKey: "delivery-create:order-1" });
    expect(second).toEqual({ queued: false, deduped: true, idempotencyKey: "delivery-create:order-1" });
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(collection.docs[0]).toEqual(expect.objectContaining({
      eventName: "ORDER_READY_TO_SHIP",
      idempotencyKey: "delivery-create:order-1",
      status: "queued",
    }));
  });

  test("dispatches the queued job through the ready-order integration helper", async () => {
    const { app, collection } = buildApp();
    collection.docs.push({ idempotencyKey: "delivery-create:order-2", status: "queued", attempts: 0 });
    __test__.setApp(app);
    createAmiyoDeliveryForReadyOrder.mockResolvedValue({ success: true, deliveryOrderId: "delivery-2" });

    await expect(__test__.processDeliveryDispatch({
      orderId: "order-2",
      idempotencyKey: "delivery-create:order-2",
      source: "vendor_ready_to_ship",
    })).resolves.toEqual(expect.objectContaining({ success: true }));

    expect(createAmiyoDeliveryForReadyOrder).toHaveBeenCalledWith("order-2", expect.objectContaining({
      Order: app.locals.models.Order,
      VendorOrder: app.locals.models.VendorOrder,
    }));
    expect(collection.docs[0]).toEqual(expect.objectContaining({ status: "succeeded", attempts: 1 }));
  });

  test("does not mark an unconfigured delivery integration as succeeded", async () => {
    const { app, collection } = buildApp();
    collection.docs.push({ idempotencyKey: "delivery-create:order-3", status: "queued", attempts: 0 });
    __test__.setApp(app);
    createAmiyoDeliveryForReadyOrder.mockResolvedValue({ skipped: true, reason: "not_configured" });

    await expect(__test__.processDeliveryDispatch({
      orderId: "order-3",
      idempotencyKey: "delivery-create:order-3",
    })).rejects.toMatchObject({ statusCode: 503 });

    expect(collection.docs[0]).toEqual(expect.objectContaining({ status: "retrying", attempts: 1 }));
  });

  test("uses inline fallback when the Redis queue is unavailable", async () => {
    const previousUseRedis = process.env.DELIVERY_DISPATCH_USE_REDIS;
    const previousInlineFallback = process.env.DELIVERY_DISPATCH_INLINE_FALLBACK;
    process.env.DELIVERY_DISPATCH_USE_REDIS = "false";
    process.env.DELIVERY_DISPATCH_INLINE_FALLBACK = "true";

    try {
      const { app, collection } = buildApp();
      createAmiyoDeliveryForReadyOrder.mockResolvedValue({ success: true, deliveryOrderId: "delivery-inline" });

      const result = await enqueueReadyToShipDelivery({
        app,
        orderId: "order-inline",
        source: "vendor_order_status",
      });

      expect(result).toEqual(expect.objectContaining({
        queued: false,
        inline: true,
        idempotencyKey: "delivery-create:order-inline",
      }));
      expect(result.result).toEqual(expect.objectContaining({ deliveryOrderId: "delivery-inline" }));
      expect(createAmiyoDeliveryForReadyOrder).toHaveBeenCalledWith("order-inline", expect.objectContaining({
        Order: app.locals.models.Order,
        VendorOrder: app.locals.models.VendorOrder,
      }));
      expect(collection.docs[0]).toEqual(expect.objectContaining({
        status: "succeeded",
        attempts: 1,
      }));
    } finally {
      if (previousUseRedis === undefined) delete process.env.DELIVERY_DISPATCH_USE_REDIS;
      else process.env.DELIVERY_DISPATCH_USE_REDIS = previousUseRedis;
      if (previousInlineFallback === undefined) delete process.env.DELIVERY_DISPATCH_INLINE_FALLBACK;
      else process.env.DELIVERY_DISPATCH_INLINE_FALLBACK = previousInlineFallback;
    }
  });

  test("processes the job immediately in Vercel/serverless even when Redis queue exists", async () => {
    process.env.VERCEL = "1";
    const { app, collection } = buildApp();
    const queue = { add: jest.fn(), getJob: jest.fn().mockResolvedValue(null) };
    __test__.setQueue(queue);
    createAmiyoDeliveryForReadyOrder.mockResolvedValue({ success: true, deliveryOrderId: "delivery-vercel" });

    const result = await enqueueReadyToShipDelivery({
      app,
      orderId: "order-vercel",
      source: "vendor_ready_to_ship",
    });

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({
      queued: false,
      inline: true,
      idempotencyKey: "delivery-create:order-vercel",
    }));
    expect(result.result).toEqual(expect.objectContaining({ deliveryOrderId: "delivery-vercel" }));
    expect(createAmiyoDeliveryForReadyOrder).toHaveBeenCalledWith("order-vercel", expect.objectContaining({
      Order: app.locals.models.Order,
      VendorOrder: app.locals.models.VendorOrder,
    }));
    expect(collection.docs[0]).toEqual(expect.objectContaining({
      status: "succeeded",
      attempts: 1,
    }));
  });

  test("serverless repeat trigger processes a previously queued job instead of deduping forever", async () => {
    process.env.VERCEL = "1";
    const { app, collection } = buildApp();
    collection.docs.push({
      idempotencyKey: "delivery-create:order-stuck",
      orderId: "order-stuck",
      status: "queued",
      attempts: 0,
      updatedAt: new Date(),
    });
    const queue = { add: jest.fn(), getJob: jest.fn().mockResolvedValue(null) };
    __test__.setQueue(queue);
    createAmiyoDeliveryForReadyOrder.mockResolvedValue({ success: true, deliveryOrderId: "delivery-stuck" });

    const result = await enqueueReadyToShipDelivery({
      app,
      orderId: "order-stuck",
      source: "vendor_ready_to_ship",
    });

    expect(queue.add).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      queued: false,
      inline: true,
      idempotencyKey: "delivery-create:order-stuck",
    }));
    expect(collection.docs[0]).toEqual(expect.objectContaining({
      status: "succeeded",
      attempts: 1,
    }));
  });

  test("returns inline failure details instead of throwing into the status update response path", async () => {
    const previousUseRedis = process.env.DELIVERY_DISPATCH_USE_REDIS;
    const previousInlineFallback = process.env.DELIVERY_DISPATCH_INLINE_FALLBACK;
    process.env.DELIVERY_DISPATCH_USE_REDIS = "false";
    process.env.DELIVERY_DISPATCH_INLINE_FALLBACK = "true";

    try {
      const { app, collection } = buildApp();
      const providerError = new Error("Delivery API unavailable");
      providerError.statusCode = 503;
      providerError.providerStatus = 503;
      createAmiyoDeliveryForReadyOrder.mockRejectedValue(providerError);

      const result = await enqueueReadyToShipDelivery({
        app,
        orderId: "order-inline-fail",
        source: "vendor_order_status",
      });

      expect(result).toEqual(expect.objectContaining({
        queued: false,
        inline: true,
        failed: true,
        idempotencyKey: "delivery-create:order-inline-fail",
      }));
      expect(result.error).toEqual(expect.objectContaining({
        message: "Delivery API unavailable",
        statusCode: 503,
      }));
      expect(collection.docs[0]).toEqual(expect.objectContaining({
        status: "retrying",
        attempts: 1,
      }));
    } finally {
      if (previousUseRedis === undefined) delete process.env.DELIVERY_DISPATCH_USE_REDIS;
      else process.env.DELIVERY_DISPATCH_USE_REDIS = previousUseRedis;
      if (previousInlineFallback === undefined) delete process.env.DELIVERY_DISPATCH_INLINE_FALLBACK;
      else process.env.DELIVERY_DISPATCH_INLINE_FALLBACK = previousInlineFallback;
    }
  });
});
