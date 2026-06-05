const { normalizeTrackingEvent } = require("../../services/courierProviderService");

describe("courier tracking normalization", () => {
  test("maps provider delivered payloads to delivery attempts", () => {
    const event = normalizeTrackingEvent("steadfast", {
      consignment_id: "CN-1",
      invoice: "order-1",
      current_status: "Delivered",
      receiver_name: "Customer",
    });

    expect(event).toEqual(expect.objectContaining({
      provider: "steadfast",
      consignmentId: "CN-1",
      orderId: "order-1",
      targetState: "delivered",
      outcome: "delivered",
      receiverName: "Customer",
    }));
  });

  test("maps failed and RTO statuses to logistics states", () => {
    expect(normalizeTrackingEvent("redx", { tracking_number: "TRK-1", status: "delivery failed" }))
      .toEqual(expect.objectContaining({ targetState: "delivery_failed", outcome: "failed" }));
    expect(normalizeTrackingEvent("redx", { tracking_number: "TRK-2", status: "RTO" }))
      .toEqual(expect.objectContaining({ targetState: "return_to_origin", outcome: "rto" }));
  });
});
