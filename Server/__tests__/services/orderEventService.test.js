jest.mock("../../services/marketplaceEventBus", () => ({
  publish: jest.fn().mockResolvedValue({ event: { _id: "event-1" } }),
}));

const MarketplaceEventBus = require("../../services/marketplaceEventBus");
const { appendOrderEvent } = require("../../services/orderEventService");

describe("orderEventService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("publishes order timeline events into the marketplace event bus", async () => {
    const appendedEvent = { _id: "timeline-1", status: "shipped" };
    const app = {
      locals: {
        models: {
          OrderEvent: {
            append: jest.fn().mockResolvedValue(appendedEvent),
          },
        },
        realtime: { broadcast: jest.fn() },
      },
    };

    const result = await appendOrderEvent({
      app,
      orderId: "order-1",
      status: "shipped",
      actorId: "admin-1",
      actorRole: "admin",
      trackingNumber: "TRK-1",
    });

    expect(result).toBe(appendedEvent);
    expect(app.locals.realtime.broadcast).toHaveBeenCalledWith(
      "order:order-1",
      "order.event.created",
      { orderId: "order-1", event: appendedEvent },
    );
    expect(MarketplaceEventBus.publish).toHaveBeenCalledWith(
      app,
      "order.timeline_event",
      expect.objectContaining({
        orderId: "order-1",
        status: "shipped",
        trackingNumber: "TRK-1",
      }),
      expect.objectContaining({
        source: "order_timeline",
        actorId: "admin-1",
        actorRole: "admin",
        subjectType: "order",
        subjectId: "order-1",
      }),
    );
  });
});
