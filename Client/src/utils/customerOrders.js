const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeOrderId = (value) =>
  value?.toString?.() || String(value || "");

const asOrder = (order = {}) => order || {};

export const getOrderItems = (order = {}) => {
  const safeOrder = asOrder(order);
  if (Array.isArray(safeOrder.products)) return safeOrder.products;
  if (Array.isArray(safeOrder.items)) return safeOrder.items;
  return [];
};

export const getShortOrderId = (orderOrId = {}) => {
  const safeOrderOrId = orderOrId || {};
  const id =
    typeof safeOrderOrId === "string"
      ? safeOrderOrId
      : normalizeOrderId(safeOrderOrId._id || safeOrderOrId.id || safeOrderOrId.orderId);

  return id ? `#${id.slice(-8).toUpperCase()}` : "Order";
};

export const findOrderByRouteId = (orders = [], routeId = "") => {
  const target = normalizeOrderId(routeId).replace(/^#/, "").toLowerCase();
  if (!target) return null;

  return (
    orders.find((order) => {
      const values = [
        order._id,
        order.id,
        order.orderId,
        order.orderNumber,
      ]
        .map(normalizeOrderId)
        .filter(Boolean);

      return values.some((value) => {
        const normalized = value.replace(/^#/, "").toLowerCase();
        return normalized === target || normalized.slice(-8) === target;
      });
    }) || null
  );
};

export const formatOrderStatus = (status = "pending") =>
  String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getOrderItemProductId = (item = {}) =>
  normalizeOrderId(item.productId || item.product?._id || item._id || item.id);

export const getOrderItemTitle = (item = {}) =>
  item.title ||
  item.productTitle ||
  item.name ||
  item.product?.title ||
  "Product";

export const getOrderItemImage = (item = {}) =>
  item.thumbnail ||
  item.image ||
  item.productImage ||
  item.product?.thumbnail ||
  item.product?.image ||
  item.product?.images?.[0] ||
  "";

export const getOrderItemVendorName = (item = {}, order = {}) =>
  item.vendorName ||
  item.shopName ||
  item.vendor?.shopName ||
  order.vendorName ||
  "Marketplace seller";

export const getOrderItemQuantity = (item = {}) =>
  Math.max(1, toNumber(item.quantity ?? item.qty, 1));

export const getOrderItemUnitPrice = (item = {}) =>
  toNumber(item.unitPrice ?? item.price ?? item.salePrice ?? item.product?.price, 0);

export const getOrderItemLineTotal = (item = {}) =>
  toNumber(
    item.lineTotal ?? item.total ?? item.subtotal,
    getOrderItemUnitPrice(item) * getOrderItemQuantity(item),
  );

export const getOrderSubtotal = (order = {}) => {
  const safeOrder = asOrder(order);
  return toNumber(
    safeOrder.subtotal,
    getOrderItems(safeOrder).reduce((sum, item) => sum + getOrderItemLineTotal(item), 0),
  );
};

export const getOrderDeliveryFee = (order = {}) => {
  const safeOrder = asOrder(order);
  return toNumber(safeOrder.deliveryCharge ?? safeOrder.deliveryFee ?? safeOrder.shippingFee, 0);
};

export const getOrderDiscount = (order = {}) => {
  const safeOrder = asOrder(order);
  if (safeOrder.totalDiscount !== undefined && safeOrder.totalDiscount !== null) {
    return toNumber(safeOrder.totalDiscount, 0);
  }
  if (safeOrder.discount !== undefined && safeOrder.discount !== null) {
    return toNumber(safeOrder.discount, 0);
  }
  return toNumber(safeOrder.couponDiscount, 0) + toNumber(safeOrder.pointsDiscount, 0);
};

export const getOrderTotal = (order = {}) => {
  const safeOrder = asOrder(order);
  return toNumber(
    safeOrder.total ?? safeOrder.totalAmount ?? safeOrder.finalTotal ?? safeOrder.grandTotal,
    getOrderSubtotal(safeOrder) + getOrderDeliveryFee(safeOrder) - getOrderDiscount(safeOrder),
  );
};

export const getPaymentLabel = (method = "") => {
  const normalized = String(method || "").toLowerCase();
  const labels = {
    cod: "Cash on Delivery",
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
    card: "Card",
  };
  return labels[normalized] || formatOrderStatus(method || "Payment pending");
};

export const getOrderEtaLabel = (order = {}) => {
  const safeOrder = asOrder(order);
  const eta =
    safeOrder.customerExperience?.tracking?.eta?.label ||
    safeOrder.estimatedDelivery ||
    safeOrder.deliveryEta ||
    safeOrder.expectedDeliveryDate;

  if (!eta) return "ETA will be updated after seller confirmation";

  const date = new Date(eta);
  if (Number.isNaN(date.getTime())) return String(eta);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const getCustomerOrderSummary = (order = {}) => {
  const safeOrder = asOrder(order);
  const items = getOrderItems(safeOrder);
  const itemCount = items.reduce(
    (sum, item) => sum + getOrderItemQuantity(item),
    0,
  );

  return {
    id: normalizeOrderId(safeOrder._id || safeOrder.id || safeOrder.orderId),
    shortId: getShortOrderId(safeOrder),
    status: safeOrder.status || "pending",
    statusLabel: formatOrderStatus(safeOrder.status || "pending"),
    itemCount,
    subtotal: getOrderSubtotal(safeOrder),
    deliveryFee: getOrderDeliveryFee(safeOrder),
    discount: getOrderDiscount(safeOrder),
    total: getOrderTotal(safeOrder),
    paymentLabel: getPaymentLabel(safeOrder.paymentMethod),
    etaLabel: getOrderEtaLabel(safeOrder),
    hasReturns: Boolean(safeOrder.customerExperience?.hasReturn),
  };
};
