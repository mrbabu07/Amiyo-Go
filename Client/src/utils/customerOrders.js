const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const roundMoney = (value) =>
  Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;

const hasNumberValue = (value) =>
  value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));

const firstNumberValue = (...values) => {
  const value = values.find(hasNumberValue);
  return value === undefined ? null : toNumber(value, 0);
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

const getOrderCouponDiscount = (order = {}) =>
  Math.max(
    0,
    toNumber(order.couponDiscount ?? order.couponApplied?.discountAmount, 0),
  );

const getOrderPointsDiscount = (order = {}) =>
  Math.max(0, toNumber(order.pointsDiscount, 0));

const getItemVendorId = (item = {}) =>
  normalizeOrderId(item.vendorId || item.vendor?._id || item.vendor?.id || "");

const isSameId = (left, right) =>
  normalizeOrderId(left).toLowerCase() === normalizeOrderId(right).toLowerCase();

const distributeDiscount = (lineTotals = [], amount = 0, eligibleIndexes = []) => {
  const discountAmount = roundMoney(Math.max(0, toNumber(amount, 0)));
  const eligible = eligibleIndexes.filter((index) => lineTotals[index] > 0);
  if (discountAmount <= 0 || eligible.length === 0) return new Array(lineTotals.length).fill(0);

  const base = eligible.reduce((sum, index) => sum + lineTotals[index], 0);
  if (base <= 0) return new Array(lineTotals.length).fill(0);

  const result = new Array(lineTotals.length).fill(0);
  let assigned = 0;

  eligible.forEach((index, position) => {
    const isLast = position === eligible.length - 1;
    const share = isLast
      ? roundMoney(discountAmount - assigned)
      : roundMoney((discountAmount * lineTotals[index]) / base);
    result[index] = Math.min(lineTotals[index], Math.max(0, share));
    assigned = roundMoney(assigned + result[index]);
  });

  return result;
};

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
  const breakdownDiscount = safeOrder.discountBreakdown?.totals?.discountTotal;
  if (breakdownDiscount !== undefined && breakdownDiscount !== null) {
    return toNumber(breakdownDiscount, 0);
  }
  if (safeOrder.totalDiscount !== undefined && safeOrder.totalDiscount !== null) {
    return toNumber(safeOrder.totalDiscount, 0);
  }
  if (safeOrder.discount !== undefined && safeOrder.discount !== null) {
    return toNumber(safeOrder.discount, 0);
  }
  if (safeOrder.discountAmount !== undefined && safeOrder.discountAmount !== null) {
    return toNumber(safeOrder.discountAmount, 0);
  }
  return (
    getOrderCouponDiscount(safeOrder) +
    getOrderPointsDiscount(safeOrder)
  );
};

export const getOrderCouponCode = (order = {}) =>
  order?.couponApplied?.code ||
  order?.couponCode ||
  order?.discountBreakdown?.lines?.find?.((line) => line?.code)?.code ||
  "";

export const getOrderItemPricingSummaries = (order = {}) => {
  const safeOrder = asOrder(order);
  const items = getOrderItems(safeOrder);
  const receipt = safeOrder.customerExperience?.itemizedReceipt || [];
  const lineTotals = items.map((item, index) => {
    const receiptLine = receipt[index];
    return roundMoney(
      firstNumberValue(
        receiptLine?.grossLineTotal,
        receiptLine?.lineTotal,
        getOrderItemLineTotal(item),
      ) || 0,
    );
  });
  const allIndexes = items.map((_, index) => index);
  const discounts = new Array(items.length).fill(0);

  items.forEach((item, index) => {
    const receiptLine = receipt[index];
    const explicitDiscount = firstNumberValue(
      receiptLine?.lineDiscount,
      receiptLine?.discountShare,
      item.lineDiscount,
      item.discountShare,
      item.discountAmount,
    );
    if (explicitDiscount !== null) {
      discounts[index] = Math.min(lineTotals[index], roundMoney(Math.max(0, explicitDiscount)));
    }
  });

  const hasExplicitDiscounts = discounts.some((value) => value > 0);
  if (!hasExplicitDiscounts) {
    const totalDiscount = getOrderDiscount(safeOrder);
    const couponDiscount = Math.min(getOrderCouponDiscount(safeOrder), totalDiscount);
    const pointsDiscount = getOrderPointsDiscount(safeOrder);
    const otherDiscount = Math.max(0, roundMoney(totalDiscount - couponDiscount - pointsDiscount));

    const couponScopeVendorId = safeOrder.couponApplied?.source === "vendor_voucher"
      ? safeOrder.couponApplied?.scopeVendorId
      : null;
    const couponIndexes = couponScopeVendorId
      ? allIndexes.filter((index) => isSameId(getItemVendorId(items[index]), couponScopeVendorId))
      : allIndexes;

    distributeDiscount(lineTotals, couponDiscount, couponIndexes).forEach((value, index) => {
      discounts[index] = roundMoney(discounts[index] + value);
    });
    distributeDiscount(lineTotals, pointsDiscount + otherDiscount, allIndexes).forEach((value, index) => {
      discounts[index] = Math.min(lineTotals[index], roundMoney(discounts[index] + value));
    });
  }

  return items.map((item, index) => {
    const quantity = getOrderItemQuantity(item);
    const grossLineTotal = lineTotals[index];
    const discountShare = Math.min(grossLineTotal, roundMoney(discounts[index]));
    const payableLineTotal = roundMoney(Math.max(0, grossLineTotal - discountShare));

    return {
      item,
      index,
      quantity,
      unitPrice: getOrderItemUnitPrice(item),
      grossLineTotal,
      discountShare,
      payableLineTotal,
      payableUnitPrice: quantity > 0 ? roundMoney(payableLineTotal / quantity) : payableLineTotal,
    };
  });
};

export const getOrderTotal = (order = {}) => {
  const safeOrder = asOrder(order);
  const subtotal = getOrderSubtotal(safeOrder);
  const deliveryFee = getOrderDeliveryFee(safeOrder);
  const discount = getOrderDiscount(safeOrder);
  const computedTotal = Math.max(0, subtotal + deliveryFee - discount);
  const storedTotal = firstNumberValue(
    safeOrder.discountBreakdown?.totals?.payableTotal,
    safeOrder.total,
    safeOrder.finalTotal,
    safeOrder.totalAmount,
    safeOrder.grandTotal,
    safeOrder.payableTotal,
  );

  if (storedTotal === null) return computedTotal;

  const preDiscountTotal = subtotal + deliveryFee;
  const storedLooksUndiscounted =
    discount > 0 &&
    storedTotal > computedTotal &&
    Math.abs(storedTotal - preDiscountTotal) <= 0.01;

  return storedLooksUndiscounted ? computedTotal : storedTotal;
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
