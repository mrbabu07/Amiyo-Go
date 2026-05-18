const statusMeta = {
  pending: {
    label: "Pending",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    nextAction: "Pack this order or cancel with a clear reason",
  },
  accepted: {
    label: "Accepted",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    nextAction: "Prepare items for packing",
  },
  processing: {
    label: "Processing",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    nextAction: "Pack and move to ready to ship",
  },
  packed: {
    label: "Packed",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    nextAction: "Schedule pickup or mark ready to ship",
  },
  ready_to_ship: {
    label: "Ready to ship",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
    nextAction: "Schedule pickup and hand over to courier",
  },
  pickup_ready: {
    label: "Pickup ready",
    tone: "border-teal-200 bg-teal-50 text-teal-800",
    nextAction: "Wait for courier pickup or mark shipped",
  },
  shipped: {
    label: "Shipped",
    tone: "border-violet-200 bg-violet-50 text-violet-800",
    nextAction: "Monitor delivery and COD collection",
  },
  delivered: {
    label: "Delivered",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    nextAction: "Review payout and support status",
  },
  cancelled: {
    label: "Cancelled",
    tone: "border-red-200 bg-red-50 text-red-800",
    nextAction: "No fulfillment action is available",
  },
  returned: {
    label: "Returned",
    tone: "border-slate-200 bg-slate-100 text-slate-800",
    nextAction: "Review the return case",
  },
};

const terminalStatuses = ["cancelled", "delivered", "returned"];

const cleanKey = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const getVendorOrderId = (order = {}) =>
  order._id?.toString?.() || order.parentOrderId?.toString?.() || String(order._id || order.parentOrderId || "");

export const shortVendorOrderId = (value) => {
  const id = value?._id || value?.parentOrderId || value;
  return String(id || "ORDER").slice(-8).toUpperCase();
};

export const normalizeVendorOrderStatus = (order = {}) => {
  const products = Array.isArray(order.products) ? order.products : [];
  const statuses = products
    .map((product) => cleanKey(product.itemStatus || product.status))
    .filter(Boolean);

  if (statuses.length === 0) return cleanKey(order.status, "pending");
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  if (statuses.every((status) => status === "returned")) return "returned";
  if (statuses.some((status) => status === "returned")) return "returned";
  if (statuses.every((status) => status === "delivered")) return "delivered";
  if (statuses.some((status) => status === "shipped")) return "shipped";
  if (statuses.some((status) => status === "pickup_ready")) return "pickup_ready";
  if (statuses.some((status) => status === "ready_to_ship")) return "ready_to_ship";
  if (statuses.some((status) => status === "packed")) return "packed";
  if (statuses.some((status) => ["accepted", "processing"].includes(status))) return "processing";
  return cleanKey(order.status, "pending");
};

export const getVendorOrderStatusMeta = (order = {}) => {
  const key = normalizeVendorOrderStatus(order);
  return {
    key,
    ...(statusMeta[key] || {
      label: key.replace(/_/g, " ") || "Pending",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      nextAction: "Review order details",
    }),
  };
};

export const isVendorCodOrder = (order = {}) => {
  const method = cleanKey(order.paymentMethod);
  return ["cod", "cash_on_delivery", "cash_on_delivery"].includes(method);
};

export const getVendorOrderFinancials = (order = {}) => {
  const products = Array.isArray(order.products) ? order.products : [];
  const itemSubtotal = products.reduce(
    (sum, item) => sum + toNumber(item.price) * Math.max(1, toNumber(item.quantity, 1)),
    0,
  );
  const vendorSubtotal = toNumber(order.vendorSubtotal, itemSubtotal);
  const vendorCommission = toNumber(
    order.vendorCommission,
    products.reduce((sum, item) => sum + toNumber(item.adminCommissionAmount), 0),
  );
  const vendorEarnings = toNumber(
    order.vendorEarnings,
    Math.max(vendorSubtotal - vendorCommission, 0),
  );
  const deliveryFee = toNumber(order.deliveryFee || order.shippingFee || order.deliveryCharge);
  const discount = toNumber(order.discount || order.vendorDiscount || order.couponDiscount);

  return {
    itemCount: products.length,
    quantity: products.reduce((sum, item) => sum + Math.max(1, toNumber(item.quantity, 1)), 0),
    itemSubtotal,
    vendorSubtotal,
    vendorCommission,
    vendorEarnings,
    deliveryFee,
    discount,
    payableTotal: Math.max(vendorSubtotal + deliveryFee - discount, 0),
    codAmount: isVendorCodOrder(order) ? Math.max(vendorSubtotal + deliveryFee - discount, 0) : 0,
  };
};

export const getVendorOrderActionPlan = (order = {}) => {
  const status = normalizeVendorOrderStatus(order);
  const terminal = terminalStatuses.includes(status);
  const cod = isVendorCodOrder(order);

  return {
    status,
    terminal,
    canPack: !terminal && !["packed", "ready_to_ship", "pickup_ready", "shipped"].includes(status),
    canReady: !terminal && ["pending", "accepted", "processing", "packed"].includes(status),
    canSchedulePickup: !terminal && ["packed", "ready_to_ship", "pickup_ready"].includes(status),
    canShip: !terminal && ["ready_to_ship", "pickup_ready"].includes(status),
    canDeliver: status === "shipped",
    canCancel: !terminal,
    canCollectCod: cod && !order.codCollected && !["cancelled", "returned"].includes(status),
    cod,
  };
};

export const buildVendorOrderAddress = (shippingInfo = {}) =>
  [
    shippingInfo.name,
    shippingInfo.phone,
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.union,
    shippingInfo.upazila,
    shippingInfo.city || shippingInfo.district,
    shippingInfo.division,
    shippingInfo.zipCode,
  ]
    .filter(Boolean)
    .join("\n");

const eventDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pushEvent = (events, type, label, value, note = "", actorRole = "system") => {
  const at = eventDate(value);
  if (!at) return;
  events.push({
    type: cleanKey(type, "update"),
    label,
    at,
    note,
    actorRole,
  });
};

const eventLabel = (event = {}) => {
  if (event.label) return event.label;
  return cleanKey(event.status || event.type || event.action, "update").replace(/_/g, " ");
};

export const buildVendorOrderTimeline = (order = {}, timelineEvents = []) => {
  const events = [];
  const products = Array.isArray(order.products) ? order.products : [];
  const firstProduct = products[0] || {};

  timelineEvents.forEach((event) => {
    pushEvent(
      events,
      event.status || event.type || event.action,
      eventLabel(event),
      event.timestamp || event.at || event.createdAt || event.date,
      event.note || event.reason || "",
      event.actorRole || event.actor || "system",
    );
  });

  pushEvent(events, "pending", "Order placed", order.createdAt, "", "customer");
  pushEvent(events, "accepted", "Order accepted", firstProduct.vendorAcceptedAt || order.acceptedAt, "", "vendor");
  pushEvent(events, "processing", "Order processing", firstProduct.processingAt || order.processingAt, "", "vendor");
  pushEvent(events, "packed", "Packed", firstProduct.packedAt || order.packedAt, "", "vendor");
  pushEvent(events, "ready_to_ship", "Ready to ship", firstProduct.readyToShipAt || order.readyToShipAt, "", "vendor");
  pushEvent(events, "pickup_ready", "Pickup ready", firstProduct.pickupReadyAt || order.pickupReadyAt, "", "vendor");
  pushEvent(events, "shipped", "Shipped", firstProduct.shippedAt || order.shippedAt, firstProduct.trackingNumber || "", "vendor");
  pushEvent(events, "delivered", "Delivered", firstProduct.deliveredAt || order.deliveredAt, "", "system");
  pushEvent(
    events,
    "cancelled",
    "Cancelled",
    firstProduct.cancelledAt || firstProduct.vendorRejectedAt || order.cancelledAt,
    firstProduct.rejectionReason || order.cancellationReason || order.cancellationMessage || "",
    "vendor",
  );
  pushEvent(events, "cod_collected", "COD collected", order.codCollectedAt, "", "vendor");

  const seen = new Set();
  return events
    .filter((event) => {
      const key = `${event.type}:${event.at.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
};
