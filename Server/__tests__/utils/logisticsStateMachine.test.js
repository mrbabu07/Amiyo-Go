const {
  canTransition,
  findTransitionPath,
  stateLabel,
} = require("../../utils/logisticsStateMachine");

describe("logistics state machine", () => {
  test("walks a forward shipment from creation to delivery", () => {
    expect(findTransitionPath("shipmentState", "created", "delivered")).toEqual([
      "created",
      "pending_packing",
      "packed",
      "pickup_ready",
      "pickup_scheduled",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
    ]);
  });

  test("blocks invalid forward transitions", () => {
    expect(canTransition("shipmentState", "created", "delivered")).toBe(false);
    expect(canTransition("shipmentState", "delivery_failed", "return_to_origin")).toBe(true);
  });

  test("keeps COD as a parallel state machine", () => {
    expect(canTransition("codState", "cod_pending", "cod_collected")).toBe(true);
    expect(canTransition("codState", "cod_collected", "cod_failed")).toBe(false);
    expect(findTransitionPath("codState", "cod_pending", "cod_settled")).toEqual([
      "cod_pending",
      "cod_collected",
      "cod_remitted",
      "cod_settled",
    ]);
  });

  test("labels states for timelines", () => {
    expect(stateLabel("pickup_ready")).toBe("Pickup ready");
    expect(stateLabel("custom_state")).toBe("Custom State");
  });
});
