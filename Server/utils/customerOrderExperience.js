const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TRACKING_STEPS = Object.freeze([
  {
    key: "placed",
    title: "Order Placed",
    description: "We received your order.",
  },
  {
    key: "confirmed",
    title: "Confirmed",
    description: "The seller has confirmed the order.",
  },
  {
    key: "packed",
    title: "Packed",
    description: "Items are packed and ready for dispatch.",
  },
  {
    key: "dispatched",
    title: "Dispatched",
    description: "The courier has picked up the parcel.",
  },
  {
    key: "out_for_delivery",
    title: "Out for Delivery",
    description: "The parcel is moving toward your address.",
  },
  {
    key: "delivered",
    title: "Delivered",
    description: "The order has been delivered.",
  },
]);

const RETURN_STEPS = Object.freeze([
  { key: "requested", title: "Return Requested" },
  { key: "pickup_scheduled", title: "Pickup Scheduled" },
  { key: "item_received", title: "Item Received" },
  { key: "refund_processed", title: "Refund Processed" },
]);

const CANCELLATION_REASONS = Object.freeze([
  { value: "changed_mind", label: "Changed my mind" },
  { value: "ordered_by_mistake", label: "Ordered by mistake" },
  { value: "wrong_address", label: "Wrong delivery address" },
  { value: "found_better_price", label: "Found a better price" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "delivery_too_late", label: "Delivery is too late" },
  { value: "other", label: "Other reason" },
]);

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizeId = (value) => {
  if (!value) return "";
  return value.toString ? value.toString() : String(value);
};

const dateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);

const toIsoOrNull = (value) => {
  const date = dateOrNull(value);
  return date ? date.toISOString() : null;
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatDateLabel = (value) => {
  const date = dateOrNull(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
};

const statusToStepKey = (status) => {
  const normalized = normalizeStatus(status);
  if (["created", "placed", "order_placed", "pending"].includes(normalized)) return "placed";
  if (["accepted", "confirmed", "processing"].includes(normalized)) return "confirmed";
  if (["packed", "ready_to_ship", "pickup_ready"].includes(normalized)) return "packed";
  if (["dispatched", "shipped", "in_transit"].includes(normalized)) return "dispatched";
  if (["out_for_delivery", "delivery_attempted"].includes(normalized)) return "out_for_delivery";
  if (["delivered", "returned", "partially_returned"].includes(normalized)) return "delivered";
  return null;
};

const getOrderStepKey = (order = {}) => {
  const orderStatus = normalizeStatus(order.status);
  if (orderStatus === "cancelled") return "placed";

  const mapped = statusToStepKey(orderStatus);
  if (mapped) return mapped;

  const productStatuses = (order.products || [])
    .map((product) => statusToStepKey(product.itemStatus))
    .filter(Boolean);
  if (productStatuses.length === 0) return "placed";

  const lastIndex = productStatuses.reduce((highest, key) => {
    const index = TRACKING_STEPS.findIndex((step) => step.key === key);
    return Math.max(highest, index);
  }, 0);

  return TRACKING_STEPS[lastIndex]?.key || "placed";
};

const rememberStepDate = (stepDates, key, value) => {
  const date = dateOrNull(value);
  if (!key || !date) return;
  const existing = stepDates[key];
  if (!existing || date < existing) stepDates[key] = date;
};

const buildStepDateMap = (order = {}, timelineEvents = []) => {
  const stepDates = {};

  rememberStepDate(stepDates, "placed", order.createdAt);
  rememberStepDate(stepDates, "confirmed", order.confirmedAt || order.processingAt);
  rememberStepDate(stepDates, "packed", order.packedAt || order.readyToShipAt);
  rememberStepDate(stepDates, "dispatched", order.dispatchedAt || order.shippedAt);
  rememberStepDate(stepDates, "out_for_delivery", order.outForDeliveryAt);
  rememberStepDate(stepDates, "delivered", order.deliveredAt);

  (order.statusHistory || []).forEach((entry) => {
    rememberStepDate(stepDates, statusToStepKey(entry.status), entry.changedAt);
  });

  timelineEvents.forEach((event) => {
    rememberStepDate(
      stepDates,
      statusToStepKey(event.status || event.label),
      event.createdAt || event.changedAt || event.at,
    );
  });

  (order.products || []).forEach((product) => {
    rememberStepDate(stepDates, "confirmed", product.vendorAcceptedAt || product.processingAt);
    rememberStepDate(stepDates, "packed", product.packedAt || product.readyToShipAt);
    rememberStepDate(stepDates, "dispatched", product.dispatchedAt || product.shippedAt);
    rememberStepDate(stepDates, "out_for_delivery", product.outForDeliveryAt);
    rememberStepDate(stepDates, "delivered", product.deliveredAt);
  });

  return stepDates;
};

const estimateDeliveryDays = (order = {}) => {
  const method = normalizeStatus(order.deliveryMethod);
  if (method === "express") return 1;

  const zone = normalizeStatus(
    order.deliveryZone ||
      order.shippingInfo?.deliveryZone ||
      order.shippingInfo?.district ||
      order.shippingInfo?.city ||
      order.shippingInfo?.division ||
      "",
  );

  if (zone.includes("dhaka") || zone.includes("gazipur") || zone.includes("narayanganj")) return 2;
  if (zone.includes("chattogram") || zone.includes("chittagong") || zone.includes("sylhet")) return 3;
  return 5;
};

const getCourierName = (order = {}) => {
  const firstBreakdown = (order.deliveryBreakdown || []).find(
    (item) => item?.courierName || item?.courier,
  );
  const firstProduct = (order.products || []).find(
    (item) => item?.courierName || item?.trackingCarrier,
  );

  return (
    order.courierName ||
    order.courier?.name ||
    firstBreakdown?.courierName ||
    firstBreakdown?.courier ||
    firstProduct?.courierName ||
    firstProduct?.trackingCarrier ||
    "Internal courier"
  );
};

const getTrackingNumber = (order = {}) => {
  const firstProduct = (order.products || []).find((item) => item?.trackingNumber);
  return order.trackingNumber || firstProduct?.trackingNumber || "";
};

const buildTrackingProfile = (order = {}, timelineEvents = [], now = new Date()) => {
  const currentStepKey = getOrderStepKey(order);
  const activeIndex = Math.max(
    0,
    TRACKING_STEPS.findIndex((step) => step.key === currentStepKey),
  );
  const isCancelled = normalizeStatus(order.status) === "cancelled";
  const stepDates = buildStepDateMap(order, timelineEvents);

  const steps = TRACKING_STEPS.map((step, index) => {
    let state = "upcoming";
    if (isCancelled) {
      state = index === 0 ? "completed" : "stopped";
    } else if (index < activeIndex) {
      state = "completed";
    } else if (index === activeIndex) {
      state = "active";
    }

    return {
      ...step,
      state,
      date: toIsoOrNull(stepDates[step.key]),
      dateLabel: formatDateLabel(stepDates[step.key]),
    };
  });

  const etaSource =
    order.estimatedDelivery ||
    order.expectedDeliveryDate ||
    (dateOrNull(order.createdAt) ? addDays(dateOrNull(order.createdAt), estimateDeliveryDays(order)) : null);
  const eta = normalizeStatus(order.status) === "delivered" ? null : dateOrNull(etaSource);

  return {
    currentStep: currentStepKey,
    currentStatus: normalizeStatus(order.status) || "pending",
    steps,
    eta: eta
      ? {
          date: eta.toISOString(),
          label: formatDateLabel(eta),
          overdue: eta < now && !["delivered", "cancelled"].includes(normalizeStatus(order.status)),
        }
      : null,
    courierName: getCourierName(order),
    trackingNumber: getTrackingNumber(order),
    trackingUrl: order.trackingUrl || order.courierTrackingUrl || "",
    integrationMode: order.trackingUrl || order.courierTrackingUrl ? "courier_api" : "internal_status",
    reschedule: {
      supported: Boolean(order.rescheduleUrl || order.courierRescheduleEnabled),
      url: order.rescheduleUrl || "",
      message: order.rescheduleUrl
        ? "Choose a new delivery slot with the courier."
        : "Delivery rescheduling will appear here when courier API support is connected.",
    },
    cancelled: isCancelled
      ? {
          at: toIsoOrNull(order.cancelledAt || order.updatedAt),
          reason: order.cancellationReasonLabel || order.cancellationReason || "",
          message: order.cancellationMessage || "Order cancelled.",
        }
      : null,
  };
};

const findDeliveryBreakdownForProduct = (order = {}, product = {}) => {
  const vendorId = normalizeId(product.vendorId) || "platform";
  return (order.deliveryBreakdown || []).find((entry) => {
    const entryVendorId = normalizeId(entry.vendorId) || "platform";
    return entryVendorId === vendorId;
  });
};

const firstMoneyValue = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "" && Number.isFinite(Number(item)));
  return value === undefined ? null : round2(value);
};

const distributeDiscount = (lineTotals = [], amount = 0, eligibleIndexes = []) => {
  const discountAmount = Math.max(0, round2(amount));
  const eligible = eligibleIndexes.filter((index) => lineTotals[index] > 0);
  if (discountAmount <= 0 || eligible.length === 0) return new Array(lineTotals.length).fill(0);

  const base = eligible.reduce((sum, index) => sum + lineTotals[index], 0);
  if (base <= 0) return new Array(lineTotals.length).fill(0);

  const result = new Array(lineTotals.length).fill(0);
  let assigned = 0;
  eligible.forEach((index, position) => {
    const share = position === eligible.length - 1
      ? round2(discountAmount - assigned)
      : round2((discountAmount * lineTotals[index]) / base);
    result[index] = Math.min(lineTotals[index], Math.max(0, share));
    assigned = round2(assigned + result[index]);
  });

  return result;
};

const getOrderDiscount = (order = {}) => {
  const breakdownDiscount = order.discountBreakdown?.totals?.discountTotal;
  if (breakdownDiscount !== undefined && breakdownDiscount !== null) return Math.max(0, round2(breakdownDiscount));
  return Math.max(
    0,
    round2(
      firstMoneyValue(order.totalDiscount, order.discount, order.discountAmount) ||
        round2(Number(order.couponDiscount || order.couponApplied?.discountAmount || 0) + Number(order.pointsDiscount || 0)),
    ),
  );
};

const getProductDiscountShares = (order = {}) => {
  const products = order.products || [];
  const lineTotals = products.map((product) => round2(Number(product.price || product.unitPrice || 0) * Number(product.quantity || 0)));
  const discounts = new Array(products.length).fill(0);
  const totalDiscount = getOrderDiscount(order);
  if (totalDiscount <= 0 || products.length === 0) return discounts;

  const couponDiscount = Math.min(totalDiscount, Math.max(0, round2(order.couponDiscount || order.couponApplied?.discountAmount || 0)));
  const pointsDiscount = Math.max(0, round2(order.pointsDiscount || 0));
  const otherDiscount = Math.max(0, round2(totalDiscount - couponDiscount - pointsDiscount));
  const allIndexes = products.map((_, index) => index);
  const couponScopeVendorId = order.couponApplied?.source === "vendor_voucher"
    ? normalizeId(order.couponApplied?.scopeVendorId)
    : "";
  const couponIndexes = couponScopeVendorId
    ? allIndexes.filter((index) => normalizeId(products[index].vendorId) === couponScopeVendorId)
    : allIndexes;

  distributeDiscount(lineTotals, couponDiscount, couponIndexes).forEach((value, index) => {
    discounts[index] = round2(discounts[index] + value);
  });
  distributeDiscount(lineTotals, pointsDiscount + otherDiscount, allIndexes).forEach((value, index) => {
    discounts[index] = Math.min(lineTotals[index], round2(discounts[index] + value));
  });

  return discounts;
};

const buildItemizedReceipt = (order = {}) => {
  const discountShares = getProductDiscountShares(order);

  return (order.products || []).map((product, index) => {
    const delivery = findDeliveryBreakdownForProduct(order, product) || {};
    const quantity = Number(product.quantity || 0);
    const unitPrice = Number(product.price || product.unitPrice || 0);
    const grossLineTotal = round2(unitPrice * quantity);
    const lineDiscount = discountShares[index] || 0;
    const payableLineTotal = round2(Math.max(0, grossLineTotal - lineDiscount));

    return {
      lineId: `${normalizeId(order._id) || "order"}-${index}`,
      productId: normalizeId(product.productId || product._id),
      title: product.title || product.name || "Product",
      thumbnail: product.image || product.thumbnail || product.coverImage || "",
      quantity,
      unitPrice: round2(unitPrice),
      grossLineTotal,
      lineTotal: grossLineTotal,
      lineDiscount: round2(lineDiscount),
      payableLineTotal,
      payableUnitPrice: quantity > 0 ? round2(payableLineTotal / quantity) : payableLineTotal,
      vendorId: normalizeId(product.vendorId) || null,
      vendorName: product.vendorName || product.shopName || product.storeName || "HnilaBazar",
      courierName: product.courierName || delivery.courierName || getCourierName(order),
      trackingNumber: product.trackingNumber || getTrackingNumber(order),
      paymentMethod: order.paymentMethod || "",
      status: product.itemStatus || order.status || "pending",
      selectedSize: product.selectedSize || product.size || "",
      selectedColor: product.selectedColor || product.color || "",
    };
  });
};

const returnStatusToStepKey = (status) => {
  const normalized = normalizeStatus(status);
  if (["pending", "submitted", "requested"].includes(normalized)) return "requested";
  if (["approved", "pickup_scheduled"].includes(normalized)) return "pickup_scheduled";
  if (["processing", "item_received", "received"].includes(normalized)) return "item_received";
  if (["completed", "refunded", "refund_processed"].includes(normalized)) return "refund_processed";
  if (normalized === "rejected") return "requested";
  return "requested";
};

const getReturnTimelineDate = (returnItem = {}, stepKey) => {
  const timeline = returnItem.timeline || [];
  const match = timeline.find((event) => returnStatusToStepKey(event.status) === stepKey);
  if (match) return match.at || match.createdAt;

  if (stepKey === "requested") return returnItem.createdAt;
  if (stepKey === "pickup_scheduled") return returnItem.pickupScheduledAt || returnItem.approvedAt;
  if (stepKey === "item_received") return returnItem.itemReceivedAt || returnItem.processingAt;
  if (stepKey === "refund_processed") {
    return returnItem.refundProcessedAt || returnItem.completedAt || returnItem.refundedAt;
  }
  return null;
};

const buildReturnTracker = (returnItem = {}, now = new Date()) => {
  const currentKey = returnStatusToStepKey(returnItem.status);
  const activeIndex = RETURN_STEPS.findIndex((step) => step.key === currentKey);
  const rejected = normalizeStatus(returnItem.status) === "rejected";

  const steps = RETURN_STEPS.map((step, index) => {
    let state = "upcoming";
    if (rejected) state = index === 0 ? "stopped" : "upcoming";
    else if (index < activeIndex) state = "completed";
    else if (index === activeIndex) state = "active";

    const date = getReturnTimelineDate(returnItem, step.key);
    return {
      ...step,
      state,
      date: toIsoOrNull(date),
      dateLabel: formatDateLabel(date),
    };
  });

  const processedAt = dateOrNull(
    returnItem.refundProcessedAt || returnItem.completedAt || returnItem.refundedAt,
  );
  const expectedCreditDate = processedAt
    ? addDays(processedAt, 3)
    : addDays(dateOrNull(returnItem.approvedAt || returnItem.createdAt) || now, 7);

  return {
    returnId: normalizeId(returnItem._id),
    orderId: normalizeId(returnItem.orderId),
    productId: normalizeId(returnItem.productId),
    productTitle: returnItem.productTitle || "",
    status: normalizeStatus(returnItem.status) || "pending",
    rejected,
    steps,
    refund: {
      amount: round2(returnItem.refundAmount || returnItem.adminRefund || 0),
      method: returnItem.refundMethod || "original",
      status: processedAt ? "processed" : rejected ? "rejected" : "pending",
      expectedCreditDate: expectedCreditDate.toISOString(),
      expectedCreditLabel: formatDateLabel(expectedCreditDate),
    },
  };
};

const orderHasReturn = (order = {}, returns = []) => {
  const orderId = normalizeId(order._id);
  return returns.some((returnItem) => normalizeId(returnItem.orderId) === orderId);
};

const canCancelOrder = (order = {}, now = new Date()) => {
  if (normalizeStatus(order.status) !== "pending") return false;
  const createdAt = dateOrNull(order.createdAt);
  const cancelUntil = dateOrNull(order.canCancelUntil) || (createdAt ? addDays(createdAt, 30 / 1440) : null);
  return Boolean(cancelUntil && cancelUntil > now);
};

const buildReviewPrompt = (order = {}, now = new Date()) => {
  if (normalizeStatus(order.status) !== "delivered") return null;
  const deliveredAt = dateOrNull(order.deliveredAt || order.updatedAt);
  if (!deliveredAt) return null;

  const promptAt = addDays(deliveredAt, 2);
  return {
    due: now >= promptAt,
    promptAt: promptAt.toISOString(),
    promptAtLabel: formatDateLabel(promptAt),
    channelPlan: "in_app_email_push",
    message: "Rate your delivered products to help other buyers.",
  };
};

const buildCustomerOrderExperience = (
  order = {},
  userReturns = [],
  now = new Date(),
  timelineEvents = [],
) => {
  const orderId = normalizeId(order._id);
  const relatedReturns = userReturns.filter((returnItem) => normalizeId(returnItem.orderId) === orderId);
  const returnTrackers = relatedReturns.map((returnItem) => buildReturnTracker(returnItem, now));
  const hasReturn = relatedReturns.length > 0 || ["returned", "partially_returned"].includes(normalizeStatus(order.status));

  return {
    orderId,
    statusTab: hasReturn ? "return" : normalizeStatus(order.status || "pending"),
    hasReturn,
    tracking: buildTrackingProfile(order, timelineEvents, now),
    itemizedReceipt: buildItemizedReceipt(order),
    invoiceUrl: `/api/orders/${orderId}/invoice`,
    cancellation: {
      canCancel: canCancelOrder(order, now),
      reasons: CANCELLATION_REASONS,
      cancelUntil: toIsoOrNull(order.canCancelUntil),
    },
    returns: returnTrackers,
    refundStatus: returnTrackers.map((tracker) => tracker.refund),
    reviewPrompt: buildReviewPrompt(order, now),
  };
};

const sanitizeCancellationReason = (reason) => {
  const raw = String(reason || "").trim();
  if (!raw) {
    return {
      value: "",
      label: "",
      message: "User cancelled this order within 30 minutes.",
    };
  }

  const normalized = normalizeStatus(raw);
  const matched = CANCELLATION_REASONS.find(
    (item) => item.value === normalized || normalizeStatus(item.label) === normalized,
  );
  const value = matched?.value || "other";
  const label = matched?.label || raw.slice(0, 160);

  return {
    value,
    label,
    message: `Customer cancelled: ${label}`,
  };
};

module.exports = {
  TRACKING_STEPS,
  RETURN_STEPS,
  CANCELLATION_REASONS,
  buildCustomerOrderExperience,
  buildItemizedReceipt,
  buildReturnTracker,
  buildTrackingProfile,
  canCancelOrder,
  formatDateLabel,
  sanitizeCancellationReason,
};
