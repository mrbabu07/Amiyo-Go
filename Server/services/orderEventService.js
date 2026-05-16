const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const appendOrderEvent = async ({
  app,
  orderId,
  status,
  label,
  actorId = null,
  actorRole = "system",
  vendorId = null,
  courierName = "",
  trackingNumber = "",
  eta = null,
  note = "",
  metadata = {},
}) => {
  const OrderEvent = app.locals.models.OrderEvent;
  if (!OrderEvent || !orderId || !status) return null;

  const event = await OrderEvent.append({
    orderId: normalizeId(orderId),
    vendorId: vendorId ? normalizeId(vendorId) : null,
    status,
    label: label || status.replace(/_/g, " "),
    actorId: actorId ? normalizeId(actorId) : null,
    actorRole,
    courierName,
    trackingNumber,
    eta: eta ? new Date(eta) : null,
    note,
    metadata,
  });

  app.locals.realtime?.broadcast(`order:${normalizeId(orderId)}`, "order.event.created", {
    orderId: normalizeId(orderId),
    event,
  });

  return event;
};

const getTimelineForOrder = async (app, orderId) => {
  const OrderEvent = app.locals.models.OrderEvent;
  if (!OrderEvent) return [];
  return OrderEvent.findByOrderId(orderId);
};

module.exports = {
  appendOrderEvent,
  getTimelineForOrder,
};
