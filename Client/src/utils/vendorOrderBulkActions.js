export const VENDOR_ORDER_TERMINAL_STATUSES = ["cancelled", "delivered", "returned"];

const normalizeStatus = (status) =>
  String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

export const getVendorOrderId = (order) => order?._id?.toString?.() || String(order?._id || "");

export const getVendorOrderStatus = (order = {}) =>
  normalizeStatus(order.status || order.vendorOrderStatus || order.overallOrderStatus || "pending");

export const isVendorOrderTerminal = (order = {}) =>
  VENDOR_ORDER_TERMINAL_STATUSES.includes(getVendorOrderStatus(order));

const statusGroups = {
  pack: ["pending", "accepted", "processing"],
  ready_to_ship: ["pending", "accepted", "processing", "packed"],
  pickup_ready: ["packed", "ready_to_ship"],
};

export const getEligibleVendorOrdersForBulkStatus = (orders = [], status) => {
  const normalizedStatus = normalizeStatus(status);
  const allowedStatuses = statusGroups[normalizedStatus] || [];
  if (allowedStatuses.length === 0) return [];

  return orders.filter((order) => {
    if (!getVendorOrderId(order) || isVendorOrderTerminal(order)) return false;
    return allowedStatuses.includes(getVendorOrderStatus(order));
  });
};

export const getVendorOrderBulkWorkflow = (orders = []) => {
  const selectedOrders = Array.isArray(orders) ? orders : [];
  const packableOrders = getEligibleVendorOrdersForBulkStatus(selectedOrders, "pack");
  const readyToShipOrders = getEligibleVendorOrdersForBulkStatus(selectedOrders, "ready_to_ship");
  const pickupReadyOrders = getEligibleVendorOrdersForBulkStatus(selectedOrders, "pickup_ready");

  return {
    selectedCount: selectedOrders.length,
    printableOrders: selectedOrders.filter((order) => Boolean(getVendorOrderId(order))),
    packableOrders,
    readyToShipOrders,
    pickupReadyOrders,
    counts: {
      pack: packableOrders.length,
      ready_to_ship: readyToShipOrders.length,
      pickup_ready: pickupReadyOrders.length,
    },
  };
};
