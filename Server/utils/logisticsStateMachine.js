const FORWARD_STATES = [
  "created",
  "pending_packing",
  "packed",
  "pickup_ready",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "return_to_origin",
];

const REVERSE_STATES = [
  "return_requested",
  "return_approved",
  "return_pickup_scheduled",
  "return_picked_up",
  "return_in_transit",
  "return_received",
  "inspected",
  "restocked",
  "disposed",
  "refurbished",
];

const COD_STATES = [
  "cod_pending",
  "cod_collected",
  "cod_remitted",
  "cod_settled",
  "cod_failed",
  "cod_disputed",
];

const FORWARD_TRANSITIONS = {
  created: ["pending_packing"],
  pending_packing: ["packed"],
  packed: ["pickup_ready"],
  pickup_ready: ["pickup_scheduled"],
  pickup_scheduled: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["out_for_delivery", "delivery_failed", "return_to_origin"],
  out_for_delivery: ["delivered", "delivery_failed", "return_to_origin"],
  delivered: [],
  delivery_failed: ["out_for_delivery", "return_to_origin"],
  return_to_origin: [],
};

const REVERSE_TRANSITIONS = {
  return_requested: ["return_approved"],
  return_approved: ["return_pickup_scheduled", "return_picked_up"],
  return_pickup_scheduled: ["return_picked_up"],
  return_picked_up: ["return_in_transit"],
  return_in_transit: ["return_received"],
  return_received: ["inspected"],
  inspected: ["restocked", "disposed", "refurbished"],
  restocked: [],
  disposed: [],
  refurbished: [],
};

const COD_TRANSITIONS = {
  cod_pending: ["cod_collected", "cod_failed", "cod_disputed"],
  cod_collected: ["cod_remitted", "cod_disputed"],
  cod_remitted: ["cod_settled", "cod_disputed"],
  cod_settled: [],
  cod_failed: ["cod_disputed"],
  cod_disputed: ["cod_collected", "cod_failed", "cod_remitted"],
};

const STATE_FIELD_TO_MACHINE = {
  shipmentState: FORWARD_TRANSITIONS,
  reverseState: REVERSE_TRANSITIONS,
  codState: COD_TRANSITIONS,
};

const STATE_FIELD_TO_STATES = {
  shipmentState: FORWARD_STATES,
  reverseState: REVERSE_STATES,
  codState: COD_STATES,
};

const STATE_LABELS = {
  created: "Shipment created",
  pending_packing: "Pending packing",
  packed: "Packed",
  pickup_ready: "Pickup ready",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  return_to_origin: "Return to origin",
  return_requested: "Return requested",
  return_approved: "Return approved",
  return_pickup_scheduled: "Return pickup scheduled",
  return_picked_up: "Return picked up",
  return_in_transit: "Return in transit",
  return_received: "Return received",
  inspected: "Inspected",
  restocked: "Restocked",
  disposed: "Disposed",
  refurbished: "Refurbished",
  cod_pending: "COD pending",
  cod_collected: "COD collected",
  cod_remitted: "COD remitted",
  cod_settled: "COD settled",
  cod_failed: "COD failed",
  cod_disputed: "COD disputed",
};

const canTransition = (field, fromState, toState) => {
  if (!toState || fromState === toState) return true;
  const machine = STATE_FIELD_TO_MACHINE[field];
  if (!machine || !machine[fromState]) return false;
  return machine[fromState].includes(toState);
};

const findTransitionPath = (field, fromState, toState) => {
  if (fromState === toState) return [fromState];
  const machine = STATE_FIELD_TO_MACHINE[field];
  if (!machine || !machine[fromState] || !STATE_FIELD_TO_STATES[field]?.includes(toState)) return [];

  const queue = [[fromState]];
  const visited = new Set([fromState]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    for (const next of machine[current] || []) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === toState) return nextPath;
      visited.add(next);
      queue.push(nextPath);
    }
  }

  return [];
};

const stateLabel = (state) =>
  STATE_LABELS[state] || String(state || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

module.exports = {
  COD_STATES,
  COD_TRANSITIONS,
  FORWARD_STATES,
  FORWARD_TRANSITIONS,
  REVERSE_STATES,
  REVERSE_TRANSITIONS,
  STATE_FIELD_TO_MACHINE,
  STATE_FIELD_TO_STATES,
  STATE_LABELS,
  canTransition,
  findTransitionPath,
  stateLabel,
};
