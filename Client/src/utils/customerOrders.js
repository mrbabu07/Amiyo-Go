const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeOrderId = (value) =>
  value?.toString?.() || String(value || "");

export const getOrderItems = (order = {}) => {
  if (Array.isArray(order.products)) return order.products;
  if (Array.isArray(order.items)) return order.items;
  return [];
};

export const getShortOrderId = (orderOrId = {}) => {
  const id =
    typeof orderOrId === "string"
      ? orderOrId
      : normalizeOrderId(orderOrId._id || orderOrId.id || orderOrId.orderId);

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

export const getOrderSubtotal = (order = {}) =>
  toNumber(
    order.subtotal,
    getOrderItems(order).reduce((sum, item) => sum + getOrderItemLineTotal(item), 0),
  );

export const getOrderDeliveryFee = (order = {}) =>
  toNumber(order.deliveryCharge ?? order.deliveryFee ?? order.shippingFee, 0);

export const getOrderDiscount = (order = {}) => {
  if (order.totalDiscount !== undefined && order.totalDiscount !== null) {
    return toNumber(order.totalDiscount, 0);
  }
  if (order.discount !== undefined && order.discount !== null) {
    return toNumber(order.discount, 0);
  }
  return toNumber(order.couponDiscount, 0) + toNumber(order.pointsDiscount, 0);
};

export const getOrderTotal = (order = {}) =>
  toNumber(
    order.total ?? order.totalAmount ?? order.finalTotal ?? order.grandTotal,
    getOrderSubtotal(order) + getOrderDeliveryFee(order) - getOrderDiscount(order),
  );

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
  const eta =
    order.customerExperience?.tracking?.eta?.label ||
    order.estimatedDelivery ||
    order.deliveryEta ||
    order.expectedDeliveryDate;

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
  const items = getOrderItems(order);
  const itemCount = items.reduce(
    (sum, item) => sum + getOrderItemQuantity(item),
    0,
  );

  return {
    id: normalizeOrderId(order._id || order.id || order.orderId),
    shortId: getShortOrderId(order),
    status: order.status || "pending",
    statusLabel: formatOrderStatus(order.status || "pending"),
    itemCount,
    subtotal: getOrderSubtotal(order),
    deliveryFee: getOrderDeliveryFee(order),
    discount: getOrderDiscount(order),
    total: getOrderTotal(order),
    paymentLabel: getPaymentLabel(order.paymentMethod),
    etaLabel: getOrderEtaLabel(order),
    hasReturns: Boolean(order.customerExperience?.hasReturn),
  };
};
