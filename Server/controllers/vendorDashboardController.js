const { ObjectId } = require("mongodb");
const { appendOrderEvent } = require("../services/orderEventService");
const { createAmiyoDeliveryShipment } = require("../services/amiyoDeliveryIntegrationService");

const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const dateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  const stringValue = value.toString();
  return ObjectId.isValid(stringValue) ? new ObjectId(stringValue) : null;
};

const getIdVariants = (value) => {
  const objectId = toObjectId(value);
  return [value?.toString?.() || value, objectId].filter(Boolean);
};

const getReportDays = (period = "week") => {
  const normalized = period.toString().toLowerCase();
  if (["90", "quarter", "last90"].includes(normalized)) return 90;
  if (["30", "month", "last30"].includes(normalized)) return 30;
  return 7;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const buildPeriodRange = (days) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - days + 1);

  const currentEnd = new Date(today);
  currentEnd.setDate(today.getDate() + 1);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - days);

  const previousEnd = new Date(currentStart);

  return { currentStart, currentEnd, previousStart, previousEnd };
};

const isInRange = (date, start, end) => {
  const value = new Date(date || Date.now());
  return value >= start && value < end;
};

const percent = (part, whole) => (whole > 0 ? round2((part / whole) * 100) : 0);

const periodChange = (current, previous) => {
  if (previous > 0) return round2(((current - previous) / previous) * 100);
  return current > 0 ? 100 : 0;
};

const readCursor = async (cursor) => {
  if (!cursor || typeof cursor.toArray !== "function") return [];
  return cursor.toArray();
};

const findDocuments = async (db, collectionName, query = {}, options = {}) => {
  const collection = db.collection(collectionName);
  if (!collection || typeof collection.find !== "function") return [];

  let cursor = collection.find(query, options.projection ? { projection: options.projection } : undefined);
  if (options.sort && typeof cursor.sort === "function") cursor = cursor.sort(options.sort);
  if (options.limit && typeof cursor.limit === "function") cursor = cursor.limit(options.limit);
  if (options.projection && typeof cursor.project === "function") cursor = cursor.project(options.projection);
  return readCursor(cursor);
};

const countDocuments = async (db, collectionName, query = {}) => {
  const collection = db.collection(collectionName);
  if (!collection) return 0;
  if (typeof collection.countDocuments === "function") {
    return collection.countDocuments(query);
  }
  if (typeof collection.find === "function") {
    const rows = await readCursor(collection.find(query));
    return rows.length;
  }
  return 0;
};

const escapeRegex = (value = "") => value.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProductId = (product) => (
  product.productId ||
  product.product_id ||
  product._id ||
  product.id ||
  product.sku ||
  product.title ||
  product.name ||
  ""
).toString();

const getProductName = (product) => (
  product.title ||
  product.name ||
  product.productName ||
  product.productTitle ||
  "Product"
);

const getProductImage = (product) => {
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    return first?.url || first?.src || first;
  }
  if (Array.isArray(product.media) && product.media.length > 0) {
    const first = product.media[0];
    return first?.url || first?.src || first;
  }
  return product.image || product.imageUrl || product.coverImage || "";
};

const getStock = (product) => {
  if (Number.isFinite(Number(product.stock))) return Number(product.stock);
  if (!Array.isArray(product.variants)) return 0;
  return product.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
};

const getAddToCartCount = (product) => Number(
  product.addToCartCount ??
  product.cartAdds ??
  product.addToCart ??
  product.addedToCart ??
  product.analytics?.addToCart ??
  product.metrics?.addToCart ??
  0,
) || 0;

const getBuyerKey = (order = {}) => (
  order.userId ||
  order.customerId ||
  order.buyerId ||
  order.customer?.email ||
  order.customer?.phone ||
  order.shippingInfo?.email ||
  order.shippingInfo?.phone ||
  order.shippingAddress?.email ||
  order.shippingAddress?.phone ||
  order.email ||
  order.phone ||
  `order:${order._id || Math.random()}`
).toString();

const isCancelledOrReturnedOrder = (order = {}) => {
  if (["cancelled", "returned"].includes(order.status)) return true;
  return (order.products || []).some((product) => ["cancelled", "returned"].includes(product.itemStatus));
};

const getPayoutAmount = (payout = {}) =>
  Number(payout.amount ?? payout.requestedAmount ?? payout.netPayout ?? payout.totalAmount ?? 0);

const getReturnAmount = (returnDoc = {}) =>
  Number(returnDoc.adminRefund ?? returnDoc.refundAmount ?? returnDoc.amount ?? returnDoc.totalAmount ?? 0);

const getVendorDeductionAmount = (returnDoc = {}) =>
  Number(returnDoc.vendorDeduction ?? returnDoc.vendorDeductionAmount ?? returnDoc.deductionAmount ?? 0);

const isCodOrder = (order = {}) =>
  ["cod", "cash_on_delivery", "cash on delivery"].includes(normalizeStatus(order.paymentMethod || order.payment?.method || order.paymentType));

const VENDOR_ORDER_STATUS_TRANSITIONS = ["pending", "processing", "packed", "ready_to_ship", "pickup_ready", "shipped", "delivered", "cancelled"];

const getOrderIdFilter = (orderId) => {
  const objectId = toObjectId(orderId);
  return objectId ? { _id: objectId } : { _id: orderId };
};

const getVendorArrayFilter = (vendor) => ({
  $or: [
    { "elem.vendorId": vendor._id?.toString?.() || vendor._id },
    { "elem.vendorId": vendor._id },
  ],
});

const getVendorProductsFromOrder = (order = {}, vendorId) =>
  (order.products || []).filter((product) => product.vendorId && product.vendorId.toString() === vendorId.toString());

const getVendorStatusTimestampFields = (status, now, reason = "", note = "") => ({
  ...(status === "processing" ? { "products.$[elem].processingAt": now } : {}),
  ...(status === "packed" ? { "products.$[elem].packedAt": now } : {}),
  ...(status === "ready_to_ship" ? { "products.$[elem].readyToShipAt": now } : {}),
  ...(status === "pickup_ready" ? { "products.$[elem].pickupReadyAt": now } : {}),
  ...(status === "shipped" ? { "products.$[elem].shippedAt": now } : {}),
  ...(status === "delivered" ? { "products.$[elem].deliveredAt": now } : {}),
  ...(status === "cancelled" ? {
    "products.$[elem].cancelledAt": now,
    "products.$[elem].rejectionReason": reason || "Vendor cancelled",
    "products.$[elem].rejectionNotes": note || null,
  } : {}),
});

const getVendorOrderSnapshotFields = (status, now, reason = "", note = "") => ({
  ...(status === "processing" ? { processingAt: now } : {}),
  ...(status === "packed" ? { packedAt: now } : {}),
  ...(status === "ready_to_ship" ? { readyToShipAt: now, courierPickupStatus: "pending" } : {}),
  ...(status === "pickup_ready" ? { pickupReadyAt: now, courierPickupStatus: "ready" } : {}),
  ...(status === "shipped" ? { shippedAt: now } : {}),
  ...(status === "delivered" ? { deliveredAt: now } : {}),
  ...(status === "cancelled" ? {
    cancelledAt: now,
    cancellationSource: "vendor",
    cancellationMessage: reason || "Vendor cancelled",
    rejectionReason: reason || "Vendor cancelled",
    rejectionNotes: note || null,
  } : {}),
});

const deriveVendorOrderStatus = (statuses = []) => {
  const normalized = statuses.map((status) => status || "pending");
  if (normalized.length === 0) return "pending";
  if (normalized.every((status) => status === "cancelled")) return "cancelled";
  if (normalized.every((status) => status === "returned")) return "returned";
  if (normalized.some((status) => status === "returned")) return "returned";
  if (normalized.every((status) => status === "delivered")) return "delivered";
  if (normalized.some((status) => status === "shipped")) return "shipped";
  if (normalized.some((status) => status === "pickup_ready")) return "pickup_ready";
  if (normalized.some((status) => status === "ready_to_ship")) return "ready_to_ship";
  if (normalized.some((status) => status === "packed")) return "packed";
  if (normalized.some((status) => ["accepted", "processing"].includes(status))) return "processing";
  return "pending";
};

const VENDOR_ORDER_ALLOWED_TRANSITIONS = {
  pending: ["processing", "packed", "ready_to_ship", "cancelled"],
  accepted: ["processing", "packed", "ready_to_ship", "cancelled"],
  processing: ["packed", "ready_to_ship", "cancelled"],
  packed: ["ready_to_ship", "pickup_ready", "cancelled"],
  ready_to_ship: ["pickup_ready", "shipped", "cancelled"],
  pickup_ready: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  returned: [],
  cancelled: [],
};

const canApplyVendorStatus = (vendorItems = [], nextStatus = "") =>
  vendorItems.every((item) => {
    const currentStatus = normalizeStatus(item.itemStatus || "pending") || "pending";
    if (currentStatus === nextStatus) return true;
    return (VENDOR_ORDER_ALLOWED_TRANSITIONS[currentStatus] || []).includes(nextStatus);
  });

const firstVendorField = (products, field) =>
  products.find((product) => product[field] !== undefined && product[field] !== null)?.[field];

const sameId = (left, right) => {
  if (left === undefined || left === null || right === undefined || right === null) return false;
  return left.toString() === right.toString();
};

const getItemLineTotal = (product = {}) => {
  const price = Number(product.price) || 0;
  const quantity = Number(product.quantity);
  return price * (Number.isFinite(quantity) ? quantity : 1);
};

const sumProducts = (products = [], mapper) =>
  products.reduce((sum, product) => sum + (Number(mapper(product)) || 0), 0);

const getOrderSubtotal = (order = {}) => {
  const storedSubtotal = Number(order.subtotal);
  if (Number.isFinite(storedSubtotal) && storedSubtotal > 0) return storedSubtotal;
  return sumProducts(order.products || [], getItemLineTotal);
};

const getVendorDeliveryCharge = (order = {}, vendorId) => {
  const deliveryBreakdown = Array.isArray(order.deliveryBreakdown) ? order.deliveryBreakdown : [];
  const deliveryShare = deliveryBreakdown.find((item) =>
    sameId(item.vendorId || item.vendor_id || item.id || "platform", vendorId),
  );

  if (deliveryShare) {
    return round2(
      deliveryShare.deliveryFee ??
      deliveryShare.deliveryCharge ??
      deliveryShare.shippingFee ??
      deliveryShare.amount ??
      deliveryShare.fee ??
      0,
    );
  }

  const isFullVendorOrder = order.isPartialOrder === false || (
    Array.isArray(order.products) &&
    order.products.length > 0 &&
    order.products.every((product) => sameId(product.vendorId, vendorId))
  );

  return isFullVendorOrder
    ? round2(order.deliveryCharge ?? order.deliveryFee ?? order.shippingFee ?? 0)
    : 0;
};

const getDiscountAmount = (value) => round2(Number(value) || 0);

const getLineScopeVendorId = (line = {}) =>
  line.scopeVendorId ||
  line.vendorId ||
  line.vendor_id ||
  line.metadata?.scopeVendorId ||
  line.metadata?.vendorId ||
  null;

const isVendorVoucherType = (line = {}) => {
  const type = normalizeStatus(line.type || line.source || "");
  return type === "vendor_voucher" || type === "seller_voucher" || type === "store_voucher";
};

const addDiscountLine = (totals, line = {}, amount) => {
  const type = normalizeStatus(line.type || line.source || "");
  totals.totalDiscount += amount;

  if (isVendorVoucherType(line)) {
    totals.vendorVoucherDiscount += amount;
    totals.couponDiscount += amount;
    totals.sellerFundedDiscount += amount;
    return;
  }

  if (type.includes("loyalty") || type.includes("point")) {
    totals.pointsDiscount += amount;
    return;
  }

  if (type.includes("flash")) {
    totals.flashDiscount += amount;
    return;
  }

  totals.couponDiscount += amount;
};

const calculateVendorDiscounts = ({ order = {}, vendorId, vendorSubtotal = 0 } = {}) => {
  const orderSubtotal = getOrderSubtotal(order);
  const ratio = orderSubtotal > 0 ? vendorSubtotal / orderSubtotal : 0;
  const totals = {
    couponDiscount: 0,
    vendorVoucherDiscount: 0,
    pointsDiscount: 0,
    flashDiscount: 0,
    totalDiscount: 0,
    sellerFundedDiscount: 0,
  };
  const lines = Array.isArray(order.discountBreakdown?.lines) ? order.discountBreakdown.lines : [];

  if (lines.length > 0) {
    const orderLineDiscountTotal = lines.reduce(
      (sum, line) => sum + getDiscountAmount(line.amount ?? line.discountAmount),
      0,
    );

    lines.forEach((line) => {
      const amount = getDiscountAmount(line.amount ?? line.discountAmount);
      if (amount <= 0) return;

      const scopeVendorId = getLineScopeVendorId(line);
      if (scopeVendorId) {
        if (sameId(scopeVendorId, vendorId)) addDiscountLine(totals, line, amount);
        return;
      }

      if (isVendorVoucherType(line)) {
        const appliedScope = order.couponApplied?.scopeVendorId || order.couponApplied?.vendorId;
        if (sameId(appliedScope, vendorId)) addDiscountLine(totals, line, amount);
        return;
      }

      addDiscountLine(totals, line, round2(amount * ratio));
    });

    const explicitTotal = getDiscountAmount(
      order.totalDiscount ??
      order.discountAmount ??
      order.discount ??
      order.discountBreakdown?.totals?.discountTotal,
    );
    const residual = round2(Math.max(0, explicitTotal - orderLineDiscountTotal));
    if (residual > 0) {
      addDiscountLine(totals, { type: "order_discount" }, round2(residual * ratio));
    }
  } else {
    const couponAmount = getDiscountAmount(order.couponDiscount ?? order.couponApplied?.discountAmount);
    const couponType = normalizeStatus(order.couponApplied?.source || order.couponApplied?.type || "");
    const couponScopeVendorId = order.couponApplied?.scopeVendorId || order.couponApplied?.vendorId;

    if (couponAmount > 0) {
      if (couponType === "vendor_voucher" || couponType === "seller_voucher" || couponScopeVendorId) {
        if (sameId(couponScopeVendorId, vendorId)) {
          addDiscountLine(totals, { type: "vendor_voucher" }, couponAmount);
        }
      } else {
        addDiscountLine(totals, { type: "platform_voucher" }, round2(couponAmount * ratio));
      }
    }

    const pointsDiscount = round2(getDiscountAmount(order.pointsDiscount) * ratio);
    if (pointsDiscount > 0) addDiscountLine(totals, { type: "loyalty_points" }, pointsDiscount);

    const flashDiscount = round2(getDiscountAmount(order.flashDiscount ?? order.flashSaleDiscount) * ratio);
    if (flashDiscount > 0) addDiscountLine(totals, { type: "flash_sale" }, flashDiscount);

    const explicitTotal = getDiscountAmount(order.totalDiscount ?? order.discountAmount ?? order.discount);
    const explicitComponents =
      couponAmount +
      getDiscountAmount(order.pointsDiscount) +
      getDiscountAmount(order.flashDiscount ?? order.flashSaleDiscount);
    const residual = round2(Math.max(0, explicitTotal - explicitComponents));
    if (residual > 0) addDiscountLine(totals, { type: "order_discount" }, round2(residual * ratio));
  }

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, round2(value)]),
  );
};

const calculateVendorOrderFinancials = (order = {}, vendorProducts = [], vendorId, overrides = {}) => {
  const productSubtotal = sumProducts(vendorProducts, getItemLineTotal);
  const vendorSubtotal = round2(
    overrides.vendorSubtotal ??
    order.vendorSubtotal ??
    (productSubtotal > 0 ? productSubtotal : order.subtotal),
  );
  const vendorCommission = round2(
    overrides.vendorCommission ??
    order.vendorCommission ??
    sumProducts(vendorProducts, (product) => product.adminCommissionAmount || 0),
  );
  const productEarnings = sumProducts(
    vendorProducts,
    (product) => product.vendorEarningAmount ?? (getItemLineTotal(product) - (Number(product.adminCommissionAmount) || 0)),
  );
  const explicitVendorEarnings = Number(
    overrides.vendorEarnings ??
    order.grossVendorEarnings ??
    order.vendorEarnings,
  );
  const grossVendorEarnings = round2(
    Number.isFinite(explicitVendorEarnings) && explicitVendorEarnings > 0
      ? explicitVendorEarnings
      : productEarnings,
  );
  const deliveryCharge = getVendorDeliveryCharge(order, vendorId);
  const discounts = calculateVendorDiscounts({ order, vendorId, vendorSubtotal });
  const payableTotal = round2(Math.max(0, vendorSubtotal + deliveryCharge - discounts.totalDiscount));
  const vendorEarnings = round2(Math.max(0, grossVendorEarnings - discounts.sellerFundedDiscount));

  return {
    vendorSubtotal,
    vendorCommission,
    grossVendorEarnings,
    vendorEarnings,
    deliveryCharge,
    ...discounts,
    payableTotal,
    totalAmount: payableTotal,
  };
};

const vendorStaffCan = (req, permission) => {
  if (!req.vendorStaff) return true;
  const permissions = req.vendorStaff.permissions || [];
  const [resource, action] = permission.split(":");
  return (
    permissions.includes("*") ||
    permissions.includes(permission) ||
    permissions.includes(`${resource}:*`) ||
    (action === "view" && permissions.includes(`${resource}:manage`)) ||
    (action === "view" && permissions.includes(`${resource}:ship`))
  );
};

const rejectVendorStaffPermission = (res, permission) =>
  res.status(403).json({
    error: "Vendor staff permission denied",
    required: permission,
  });

const getVendorForRequest = async (req) => {
  const Vendor = req.app.locals.models.Vendor;
  const User = req.app.locals.models.User;
  const user = req.dbUser || await User.findByFirebaseUid(req.user.uid);
  if (!user) return { error: "User not found" };
  const vendor = req.vendor || await Vendor.findByUserId(user._id);
  if (!vendor) return { error: "Vendor not found" };
  return { user, vendor };
};

const getVendorOrderRows = async (db, vendorId) => {
  const orders = await db.collection("orders")
    .find({
      "products.vendorId": { $in: getIdVariants(vendorId) },
    })
    .sort({ createdAt: -1 })
    .toArray();

  return orders.map((order) => {
    const products = (order.products || []).filter(
      (product) => product.vendorId && product.vendorId.toString() === vendorId,
    );
    if (products.length === 0) return null;

    const gross = products.reduce(
      (sum, product) => sum + ((Number(product.price) || 0) * (Number(product.quantity) || 0)),
      0,
    );
    const commission = products.reduce(
      (sum, product) => sum + (Number(product.adminCommissionAmount) || 0),
      0,
    );
    const earnings = products.reduce(
      (sum, product) => sum + (
        Number(product.vendorEarningAmount) ||
        ((Number(product.price) || 0) * (Number(product.quantity) || 0))
      ),
      0,
    );
    const statuses = products.map((product) => product.itemStatus || order.status || "pending");
    const status = deriveVendorOrderStatus(statuses);
    const financials = calculateVendorOrderFinancials(order, products, vendorId, {
      vendorSubtotal: gross,
      vendorCommission: commission,
      vendorEarnings: earnings,
    });
    const deliveredEarnings = status === "delivered" ? financials.vendorEarnings : products.reduce((sum, product) => {
      if ((product.itemStatus || order.status) !== "delivered") return sum;
      return sum + (
        Number(product.vendorEarningAmount) ||
        ((Number(product.price) || 0) * (Number(product.quantity) || 0))
      );
    }, 0);

    return {
      order,
      products,
      status,
      gross: round2(gross),
      commission: round2(commission),
      earnings: financials.vendorEarnings,
      deliveredEarnings: round2(deliveredEarnings),
      totalDiscount: financials.totalDiscount,
      payableTotal: financials.payableTotal,
      createdAt: new Date(order.createdAt || Date.now()),
    };
  }).filter(Boolean);
};

const buildDailySales = (rows, days = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    buckets.push({
      key: dateKey(day),
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      amount: 0,
      orders: 0,
    });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  rows.forEach((row) => {
    if (row.status !== "delivered") return;
    const key = dateKey(row.createdAt);
    const bucket = byKey.get(key);
    if (!bucket) return;
    bucket.amount += row.deliveredEarnings;
    bucket.orders += 1;
  });

  return buckets.map((bucket) => ({
    ...bucket,
    amount: round2(bucket.amount),
  }));
};

const getItemRevenue = (item) => round2(
  Number(item.vendorEarningAmount) ||
  ((Number(item.price) || 0) * (Number(item.quantity) || 0)),
);

const isDeliveredItem = (item, orderStatus) => (item.itemStatus || orderStatus) === "delivered";

const buildSalesTrend = (rows, days, currentStart, previousStart) => {
  const buckets = [];
  const currentByKey = new Map();
  const previousByKey = new Map();

  for (let index = 0; index < days; index += 1) {
    const day = new Date(currentStart);
    day.setDate(currentStart.getDate() + index);
    const previousDay = new Date(previousStart);
    previousDay.setDate(previousStart.getDate() + index);
    const key = dateKey(day);

    const bucket = {
      key,
      date: day.toISOString(),
      label: days <= 7
        ? day.toLocaleDateString("en-US", { weekday: "short" })
        : day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: 0,
      amount: 0,
      orders: 0,
      previousRevenue: 0,
      previousOrders: 0,
    };

    buckets.push(bucket);
    currentByKey.set(key, bucket);
    previousByKey.set(dateKey(previousDay), bucket);
  }

  rows.forEach((row) => {
    if (row.status !== "delivered") return;
    const currentBucket = currentByKey.get(dateKey(row.createdAt));
    if (currentBucket) {
      currentBucket.revenue += row.deliveredEarnings;
      currentBucket.amount += row.deliveredEarnings;
      currentBucket.orders += 1;
      return;
    }

    const previousBucket = previousByKey.get(dateKey(row.createdAt));
    if (previousBucket) {
      previousBucket.previousRevenue += row.deliveredEarnings;
      previousBucket.previousOrders += 1;
    }
  });

  return buckets.map((bucket) => ({
    ...bucket,
    revenue: round2(bucket.revenue),
    amount: round2(bucket.amount),
    previousRevenue: round2(bucket.previousRevenue),
  }));
};

const buildMonthlyData = (rows) => {
  const monthlyMap = new Map();
  rows
    .filter((row) => row.status === "delivered")
    .forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 7);
      const label = row.createdAt.toLocaleDateString("en-US", { month: "short" });
      const item = monthlyMap.get(key) || { key, month: label, amount: 0, revenue: 0, orders: 0 };
      item.amount += row.deliveredEarnings;
      item.revenue += row.deliveredEarnings;
      item.orders += 1;
      monthlyMap.set(key, item);
    });

  return [...monthlyMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12)
    .map((row) => ({
      ...row,
      amount: round2(row.amount),
      revenue: round2(row.revenue),
    }));
};

const buildProductPerformance = ({ currentRows, productDocs, reviewMeta }) => {
  const stats = new Map();

  productDocs.forEach((product) => {
    const key = product._id?.toString?.() || product.id?.toString?.();
    if (!key) return;
    stats.set(key, {
      productId: key,
      sku: product.sku || product.defaultSku || "",
      name: getProductName(product),
      image: getProductImage(product),
      revenue: 0,
      unitsSold: 0,
      sold: 0,
      views: Number(product.views || 0),
      addToCart: getAddToCartCount(product),
      purchases: 0,
      conversionRate: 0,
      stock: getStock(product),
      rating: reviewMeta.get(key) || 0,
    });
  });

  currentRows.forEach((row) => {
    row.products.forEach((item) => {
      if (!isDeliveredItem(item, row.order.status)) return;
      const key = getProductId(item);
      if (!key) return;
      const current = stats.get(key) || {
        productId: key,
        sku: item.sku || "",
        name: getProductName(item),
        image: getProductImage(item),
        revenue: 0,
        unitsSold: 0,
        sold: 0,
        views: Number(item.views || 0),
        addToCart: getAddToCartCount(item),
        purchases: 0,
        conversionRate: 0,
        stock: Number(item.stock || 0),
        rating: reviewMeta.get(key) || 0,
      };

      const quantity = Number(item.quantity) || 0;
      current.revenue += getItemRevenue(item);
      current.unitsSold += quantity;
      current.sold += quantity;
      current.purchases += quantity;
      if (item.sku && !current.sku) current.sku = item.sku;
      stats.set(key, current);
    });
  });

  return [...stats.values()]
    .map((product) => ({
      ...product,
      revenue: round2(product.revenue),
      conversionRate: percent(product.purchases, product.views),
      addToCartRate: percent(product.addToCart, product.views),
      purchaseConversionRate: percent(product.purchases, product.views),
    }))
    .sort((a, b) => (
      (b.revenue - a.revenue) ||
      (b.unitsSold - a.unitsSold) ||
      (b.views - a.views)
    ));
};

const buildCustomerRepeat = (allRows, currentRows) => {
  const history = new Map();
  allRows.forEach((row) => {
    const buyerKey = getBuyerKey(row.order);
    const buyer = history.get(buyerKey) || { count: 0 };
    buyer.count += 1;
    history.set(buyerKey, buyer);
  });

  const currentBuyers = new Set();
  const returningBuyers = new Set();
  let returningOrders = 0;

  currentRows.forEach((row) => {
    const buyerKey = getBuyerKey(row.order);
    currentBuyers.add(buyerKey);
    if ((history.get(buyerKey)?.count || 0) > 1) {
      returningBuyers.add(buyerKey);
      returningOrders += 1;
    }
  });

  return {
    totalOrders: currentRows.length,
    uniqueCustomers: currentBuyers.size,
    returningCustomers: returningBuyers.size,
    returningOrders,
    repeatRate: percent(returningOrders, currentRows.length),
  };
};

const buildCancellationReturnTrend = ({ currentRows, platformAverageRate, days, currentStart }) => {
  const buckets = [];
  const byKey = new Map();

  for (let index = 0; index < days; index += 1) {
    const day = new Date(currentStart);
    day.setDate(currentStart.getDate() + index);
    const bucket = {
      key: dateKey(day),
      date: day.toISOString(),
      label: days <= 7
        ? day.toLocaleDateString("en-US", { weekday: "short" })
        : day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      totalOrders: 0,
      cancelled: 0,
      returned: 0,
      rate: 0,
      platformAverageRate,
    };
    buckets.push(bucket);
    byKey.set(bucket.key, bucket);
  }

  currentRows.forEach((row) => {
    const bucket = byKey.get(dateKey(row.createdAt));
    if (!bucket) return;
    bucket.totalOrders += 1;
    if (row.status === "returned") bucket.returned += 1;
    if (row.status === "cancelled") bucket.cancelled += 1;
  });

  return buckets.map((bucket) => ({
    ...bucket,
    rate: percent(bucket.cancelled + bucket.returned, bucket.totalOrders),
  }));
};

const buildInventoryForecast = ({ productPerformance, days }) => (
  productPerformance
    .map((product) => {
      const dailyVelocity = round2(product.unitsSold / days);
      const daysUntilStockout = dailyVelocity > 0 ? round2(product.stock / dailyVelocity) : null;
      let status = "healthy";
      if (product.stock <= 0) status = "out_of_stock";
      else if (dailyVelocity === 0) status = "no_recent_sales";
      else if (daysUntilStockout <= 3) status = "critical";
      else if (daysUntilStockout <= 7) status = "restock_soon";
      else if (daysUntilStockout <= 14) status = "watch";

      return {
        productId: product.productId,
        sku: product.sku,
        name: product.name,
        stock: product.stock,
        unitsSold: product.unitsSold,
        dailyVelocity,
        daysUntilStockout,
        status,
      };
    })
    .sort((a, b) => {
      const aDays = a.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysUntilStockout ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    })
);

const getVendorRatingStats = async (db, vendorId) => {
  const productIds = await db.collection("products")
    .find({ vendorId }, { projection: { _id: 1 } })
    .toArray();
  const ids = productIds.map((product) => product._id);
  if (ids.length === 0) {
    return { avgRating: 0, totalReviews: 0 };
  }

  const [stats] = await db.collection("reviews").aggregate([
    { $match: { productId: { $in: ids } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]).toArray();

  return {
    avgRating: round2(stats?.avgRating || 0),
    totalReviews: stats?.totalReviews || 0,
  };
};

const buildVendorFulfillmentCommand = ({ orderRows = [], now = new Date(), slaHours = 48 } = {}) => {
  const activeStatuses = new Set(["pending", "processing", "packed", "ready_to_ship", "pickup_ready"]);
  const byStatus = orderRows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const activeRows = orderRows
    .filter((row) => activeStatuses.has(row.status))
    .map((row) => {
      const deadline = new Date(row.createdAt.getTime() + slaHours * 60 * 60 * 1000);
      const hoursRemaining = (deadline.getTime() - new Date(now).getTime()) / (60 * 60 * 1000);
      return {
        orderId: row.order?._id?.toString?.() || row.order?._id || "",
        status: row.status,
        amount: row.earnings,
        createdAt: row.createdAt,
        deadline,
        hoursRemaining: round2(hoursRemaining),
        breached: hoursRemaining < 0,
      };
    })
    .sort((left, right) => left.hoursRemaining - right.hoursRemaining);

  return {
    pending: byStatus.pending || 0,
    processing: byStatus.processing || 0,
    packed: byStatus.packed || 0,
    pickupReady: byStatus.pickup_ready || 0,
    shipped: byStatus.shipped || 0,
    delivered: byStatus.delivered || 0,
    active: activeRows.length,
    breached: activeRows.filter((row) => row.breached).length,
    dueSoon: activeRows.filter((row) => row.hoursRemaining >= 0 && row.hoursRemaining <= 12).length,
    nextDeadline: activeRows[0] || null,
  };
};

const buildVendorFinanceCommand = ({ orderRows = [], returns = [], payouts = [] } = {}) => {
  const codRows = orderRows.filter((row) => isCodOrder(row.order));
  const codPending = codRows
    .filter((row) => !row.products.every((product) => product.codCollected === true))
    .reduce((sum, row) => sum + row.earnings, 0);
  const codCollected = codRows
    .filter((row) => row.products.every((product) => product.codCollected === true))
    .reduce((sum, row) => sum + row.earnings, 0);
  const pendingPayouts = payouts
    .filter((payout) => ["pending", "approved", "processing"].includes(normalizeStatus(payout.status)))
    .reduce((sum, payout) => sum + getPayoutAmount(payout), 0);
  const paidPayouts = payouts
    .filter((payout) => ["paid", "completed"].includes(normalizeStatus(payout.status)))
    .reduce((sum, payout) => sum + getPayoutAmount(payout), 0);
  const payoutHolds = payouts
    .filter((payout) => ["hold", "held", "risk_hold", "blocked"].includes(normalizeStatus(payout.status)))
    .reduce((sum, payout) => sum + getPayoutAmount(payout), 0);
  const pendingRefundExposure = returns
    .filter((returnDoc) => !["completed", "refunded", "rejected", "cancelled"].includes(normalizeStatus(returnDoc.status)))
    .reduce((sum, returnDoc) => sum + getReturnAmount(returnDoc), 0);
  const vendorDeductions = returns.reduce((sum, returnDoc) => sum + getVendorDeductionAmount(returnDoc), 0);
  const deliveredEarnings = orderRows.reduce((sum, row) => sum + row.deliveredEarnings, 0);

  return {
    grossSales: round2(orderRows.reduce((sum, row) => sum + row.gross, 0)),
    deliveredEarnings: round2(deliveredEarnings),
    commission: round2(orderRows.reduce((sum, row) => sum + row.commission, 0)),
    pendingOrderValue: round2(orderRows
      .filter((row) => ["pending", "processing", "packed", "ready_to_ship", "pickup_ready", "shipped"].includes(row.status))
      .reduce((sum, row) => sum + row.earnings, 0)),
    codPending: round2(codPending),
    codCollected: round2(codCollected),
    pendingRefundExposure: round2(pendingRefundExposure),
    vendorDeductions: round2(vendorDeductions),
    pendingPayouts: round2(pendingPayouts),
    paidPayouts: round2(paidPayouts),
    payoutHolds: round2(payoutHolds),
    availableEstimate: round2(Math.max(0, deliveredEarnings - vendorDeductions - pendingPayouts - payoutHolds)),
  };
};

const buildVendorActionCenter = ({
  vendor = {},
  orderRows = [],
  products = [],
  returns = [],
  payouts = [],
  marketingItems = [],
  categoryRequests = [],
  fulfillment = {},
} = {}) => {
  const activeReturns = returns.filter((returnDoc) =>
    ["pending", "requested", "approved", "processing", "disputed", "under_review"].includes(normalizeStatus(returnDoc.status)) ||
    ["pending", "disputed"].includes(normalizeStatus(returnDoc.vendorResponse)),
  );
  const lowStock = products.filter((product) => getStock(product) > 0 && getStock(product) < 10);
  const outOfStock = products.filter((product) => getStock(product) <= 0);
  const rejectedProducts = products.filter((product) =>
    ["rejected", "disabled"].includes(normalizeStatus(product.approvalStatus || product.moderationStatus || product.status)),
  );
  const pendingModeration = products.filter((product) =>
    ["pending", "in_review", "under_review"].includes(normalizeStatus(product.approvalStatus || product.moderationStatus || product.status)),
  );
  const pendingPayouts = payouts.filter((payout) =>
    ["pending", "approved", "processing", "hold", "held", "risk_hold"].includes(normalizeStatus(payout.status)),
  );
  const pendingCategoryRequests = categoryRequests.filter((request) => normalizeStatus(request.status) === "pending");
  const activeMarketing = marketingItems.filter((item) =>
    ["approved", "active"].includes(normalizeStatus(item.status)) &&
    (!item.endDate || new Date(item.endDate) >= new Date()),
  );
  const missingPayout = !vendor.payoutMethod && !(vendor.payoutAccounts || []).length;
  const kycStatus = normalizeStatus(vendor.kyc?.status || vendor.verificationStatus || vendor.status);

  const items = [
    fulfillment.breached > 0 && {
      key: "late_shipments",
      title: "Late fulfillment needs action",
      detail: `${fulfillment.breached} order${fulfillment.breached === 1 ? "" : "s"} crossed the 48h shipping SLA.`,
      count: fulfillment.breached,
      priority: "critical",
      workflow: "Fulfillment",
      path: "/vendor/orders",
      actionLabel: "Process orders",
    },
    fulfillment.dueSoon > 0 && {
      key: "ship_due_soon",
      title: "Ship due soon",
      detail: `${fulfillment.dueSoon} order${fulfillment.dueSoon === 1 ? "" : "s"} should be packed or pickup-ready within 12h.`,
      count: fulfillment.dueSoon,
      priority: "high",
      workflow: "Fulfillment",
      path: "/vendor/orders",
      actionLabel: "Open queue",
    },
    activeReturns.length > 0 && {
      key: "return_responses",
      title: "Return cases waiting",
      detail: "Review customer evidence, respond, or upload counter-evidence.",
      count: activeReturns.length,
      priority: "high",
      workflow: "Returns",
      path: "/vendor/returns",
      actionLabel: "Review returns",
    },
    rejectedProducts.length > 0 && {
      key: "rejected_products",
      title: "Fix rejected listings",
      detail: "Use moderation feedback to edit and resubmit products.",
      count: rejectedProducts.length,
      priority: "high",
      workflow: "Catalog",
      path: "/vendor/products",
      actionLabel: "Fix listings",
    },
    outOfStock.length > 0 && {
      key: "out_of_stock",
      title: "Restock unavailable products",
      detail: "Products with no stock cannot convert.",
      count: outOfStock.length,
      priority: "medium",
      workflow: "Inventory",
      path: "/vendor/products",
      actionLabel: "Restock",
    },
    lowStock.length > 0 && {
      key: "low_stock",
      title: "Low stock risk",
      detail: "Replenish fast-moving products before campaigns.",
      count: lowStock.length,
      priority: "medium",
      workflow: "Inventory",
      path: "/vendor/products",
      actionLabel: "Review stock",
    },
    pendingModeration.length > 0 && {
      key: "pending_moderation",
      title: "Products in moderation",
      detail: "Track listings before promotion planning.",
      count: pendingModeration.length,
      priority: "medium",
      workflow: "Catalog",
      path: "/vendor/products",
      actionLabel: "Track status",
    },
    pendingPayouts.length > 0 && {
      key: "payouts",
      title: "Payouts need visibility",
      detail: "Review pending, held, or processing payout records.",
      count: pendingPayouts.length,
      priority: "medium",
      workflow: "Finance",
      path: "/vendor/finance/payouts",
      actionLabel: "Open finance",
      amount: round2(pendingPayouts.reduce((sum, payout) => sum + getPayoutAmount(payout), 0)),
    },
    pendingCategoryRequests.length > 0 && {
      key: "category_requests",
      title: "Category requests pending",
      detail: "Admin approval controls where you can list products.",
      count: pendingCategoryRequests.length,
      priority: "low",
      workflow: "Catalog access",
      path: "/vendor/category-requests",
      actionLabel: "View requests",
    },
    missingPayout && {
      key: "missing_payout",
      title: "Payout setup incomplete",
      detail: "Add bank or mobile financial details before requesting payout.",
      count: 1,
      priority: "high",
      workflow: "Finance",
      path: "/vendor/settings",
      actionLabel: "Add payout details",
    },
    !["approved", "verified", "active"].includes(kycStatus) && {
      key: "kyc",
      title: "KYC or seller status needs attention",
      detail: `Current status: ${kycStatus || "missing"}. Resolve it to keep selling normally.`,
      count: 1,
      priority: "critical",
      workflow: "Verification",
      path: "/vendor/kyc",
      actionLabel: "Open KYC",
    },
    activeMarketing.length === 0 && {
      key: "marketing_opportunity",
      title: "No active seller promotion",
      detail: "Create a voucher or join a campaign to increase traffic.",
      count: 1,
      priority: "low",
      workflow: "Marketing",
      path: "/vendor/marketing",
      actionLabel: "Start promotion",
    },
  ].filter(Boolean);

  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = items.sort((left, right) =>
    (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9) ||
    Number(right.count || 0) - Number(left.count || 0),
  );

  return {
    summary: {
      total: sorted.length,
      critical: sorted.filter((item) => item.priority === "critical").length,
      high: sorted.filter((item) => item.priority === "high").length,
      financeExposure: round2(sorted.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
    },
    items: sorted.slice(0, 8),
  };
};

const buildVendorReadiness = ({ vendor = {}, products = [], staff = [], marketingItems = [], fulfillment = {}, returns = [] } = {}) => {
  const profileComplete = Boolean(
    (vendor.shopName || vendor.businessName || vendor.name) &&
    (vendor.phone || vendor.contactPhone || vendor.mobile) &&
    (vendor.address || vendor.district || vendor.upazila || vendor.pickupAddress),
  );
  const payoutReady = Boolean(vendor.payoutMethod || (vendor.payoutAccounts || []).length);
  const categoryReady = (vendor.allowedCategoryIds || []).length > 0;
  const kycReady = ["approved", "verified", "active"].includes(normalizeStatus(vendor.kyc?.status || vendor.verificationStatus || vendor.status));
  const checks = [
    { key: "profile", label: "Shop profile", ready: profileComplete, required: true, path: "/vendor/shop/profile" },
    { key: "kyc", label: "KYC verified", ready: kycReady, required: true, path: "/vendor/kyc" },
    { key: "categories", label: "Category access", ready: categoryReady, required: true, path: "/vendor/category-requests" },
    { key: "payout", label: "Payout method", ready: payoutReady, required: true, path: "/vendor/settings" },
    { key: "catalog", label: "Product catalog", ready: products.length > 0, required: true, path: "/vendor/products/add" },
    { key: "fulfillment", label: "Fulfillment SLA", ready: Number(fulfillment.breached || 0) === 0, required: false, path: "/vendor/orders" },
    { key: "returns", label: "Return response", ready: returns.filter((item) => ["pending", "requested", "disputed", "under_review"].includes(normalizeStatus(item.status))).length === 0, required: false, path: "/vendor/returns" },
    { key: "marketing", label: "Growth tools", ready: marketingItems.length > 0, required: false, path: "/vendor/marketing" },
    { key: "staff", label: "Team access", ready: staff.filter((member) => normalizeStatus(member.status) === "active").length > 0, required: false, path: "/vendor/settings" },
  ];
  const requiredMissing = checks.filter((item) => item.required && !item.ready).length;
  const optionalMissing = checks.filter((item) => !item.required && !item.ready).length;

  return {
    score: Math.round((checks.filter((item) => item.ready).length / checks.length) * 100),
    status: requiredMissing > 0 ? "blocking" : optionalMissing > 0 ? "watch" : "ready",
    requiredMissing,
    optionalMissing,
    checks,
  };
};

// Get vendor dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const { vendor, error } = await getVendorForRequest(req);
    if (error) return res.status(404).json({ error });
    if (!vendorStaffCan(req, "orders:view") && !vendorStaffCan(req, "products:view") && !vendorStaffCan(req, "finance:view")) {
      return rejectVendorStaffPermission(res, "orders:view");
    }

    if (vendor.status !== "approved") {
      return res.status(403).json({ error: "Vendor not approved" });
    }

    const db = req.app.locals.db;
    const vendorId = vendor._id.toString();
    const vendorIds = getIdVariants(vendorId);

    const [
      productDocs,
      orderRows,
      returns,
      payouts,
      marketingItems,
      categoryRequests,
      staffMembers,
    ] = await Promise.all([
      findDocuments(db, "products", { vendorId: { $in: vendorIds } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 1000 }),
      getVendorOrderRows(db, vendorId),
      findDocuments(db, "returns", { vendorId: { $in: vendorIds } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 300 }),
      findDocuments(db, "vendor_payouts", { vendorId: { $in: vendorIds } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 300 }),
      findDocuments(db, "vendorMarketingItems", { vendorId: { $in: vendorIds } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 200 }),
      findDocuments(db, "category_requests", { vendorId: { $in: vendorIds } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 100 }),
      findDocuments(db, "vendor_staff", { vendorId: { $in: vendorIds } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 50 }),
    ]);

    const totalProducts = productDocs.length;
    const lowStockProducts = productDocs.filter((product) => getStock(product) < 10).length;
    
    const totalOrders = orderRows.length;
    const pendingOrders = orderRows.filter((row) => row.status === "pending").length;
    const totalRevenue = orderRows.reduce((sum, row) => sum + row.deliveredEarnings, 0);

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 7);
    const previousStart = new Date(now);
    previousStart.setDate(now.getDate() - 14);
    const currentRevenue = orderRows
      .filter((row) => row.status === "delivered" && row.createdAt >= currentStart)
      .reduce((sum, row) => sum + row.deliveredEarnings, 0);
    const previousRevenue = orderRows
      .filter((row) => row.status === "delivered" && row.createdAt >= previousStart && row.createdAt < currentStart)
      .reduce((sum, row) => sum + row.deliveredEarnings, 0);
    const revenueGrowth = previousRevenue > 0
      ? round2(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : (currentRevenue > 0 ? 100 : 0);

    const { avgRating, totalReviews } = await getVendorRatingStats(db, vendorId);

    const dailySales = buildDailySales(orderRows, 7);
    const salesChart = {
      labels: dailySales.map((day) => day.label),
      data: dailySales.map((day) => day.amount),
      orders: dailySales.map((day) => day.orders),
    };
    const fulfillmentCommand = buildVendorFulfillmentCommand({ orderRows, now });
    const financeCommand = buildVendorFinanceCommand({ orderRows, returns, payouts });
    const actionCenter = buildVendorActionCenter({
      vendor,
      orderRows,
      products: productDocs,
      returns,
      payouts,
      marketingItems,
      categoryRequests,
      fulfillment: fulfillmentCommand,
    });
    const readiness = buildVendorReadiness({
      vendor,
      products: productDocs,
      staff: staffMembers,
      marketingItems,
      fulfillment: fulfillmentCommand,
      returns,
    });

    const stats = {
      totalRevenue: round2(totalRevenue),
      revenueGrowth,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      avgRating,
      totalReviews,
      salesChart,
      actionCenter,
      fulfillmentCommand,
      financeCommand,
      readiness,
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

// Get vendor orders (from parent orders collection, filtered by vendor items)
exports.getVendorOrders = async (req, res) => {
  try {
    if (!vendorStaffCan(req, "orders:view")) {
      return rejectVendorStaffPermission(res, "orders:view");
    }

    const { limit = 100, page = 1, status, vendorId: requestedVendorId } = req.query;
    const Vendor = req.app.locals.models.Vendor;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;

    let vendor = null;
    if (req.user?.role === "admin" && requestedVendorId) {
      vendor = await Vendor.findById(requestedVendorId);
    } else {
      const user = req.dbUser || await User.findByFirebaseUid(req.user.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      vendor = req.vendor || await Vendor.findByUserId(user._id);
    }

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorId = vendor._id.toString();
    console.log('\n🔍 VENDOR ORDERS DEBUG');
    console.log('   Vendor ID:', vendorId);
    console.log('   Vendor Shop:', vendor.shopName);
    
    const db = req.app.locals.db;
    const ordersCollection = db.collection("orders");
    const productsCollection = db.collection("products");

    // First, check total orders in database
    const totalOrders = await ordersCollection.countDocuments({});
    console.log('   Total orders in DB:', totalOrders);

    // Build query to find orders containing vendor's items
    // Try both string and ObjectId formats
    const query = {
      $or: [
        { "products.vendorId": vendorId },
        { "products.vendorId": vendor._id }
      ]
    };

    console.log('   Query:', JSON.stringify(query));

    // Get all orders containing vendor's items
    const allOrders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log('   Orders found with vendorId:', allOrders.length);

    // If no orders found, check if there are orders with products from this vendor
    if (allOrders.length === 0) {
      console.log('   ⚠️  No orders found with vendorId in products array');
      
      // Check vendor's products
      const vendorProducts = await productsCollection.find({ vendorId }).limit(5).toArray();
      console.log('   Vendor has', vendorProducts.length, 'products');
      
      if (vendorProducts.length > 0) {
        console.log('   Sample product IDs:', vendorProducts.map(p => p._id.toString()).slice(0, 3));
        
        // Check if any orders contain these products
        const productIds = vendorProducts.map(p => p._id.toString());
        const ordersWithProducts = await ordersCollection.find({
          "products.productId": { $in: productIds }
        }).limit(5).toArray();
        
        console.log('   Orders containing vendor products:', ordersWithProducts.length);
        
        if (ordersWithProducts.length > 0) {
          console.log('   ⚠️  Orders exist but vendorId not set on products!');
          console.log('   Sample order products:', JSON.stringify(ordersWithProducts[0].products[0], null, 2));
        }
      }
    }

    // Filter and transform orders to show only vendor's items
    let vendorOrders = allOrders.map(order => {
      const vendorProducts = (order.products || []).filter(
        p => p.vendorId && p.vendorId.toString() === vendorId
      );

      if (vendorProducts.length === 0) return null;

      // Calculate vendor-specific totals
      const vendorSubtotal = vendorProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const vendorCommission = vendorProducts.reduce((sum, p) => sum + (p.adminCommissionAmount || 0), 0);
      const vendorEarnings = vendorProducts.reduce((sum, p) => sum + (p.vendorEarningAmount || 0), 0);
      const financials = calculateVendorOrderFinancials(order, vendorProducts, vendorId, {
        vendorSubtotal,
        vendorCommission,
        vendorEarnings,
      });

      // Determine vendor-specific order status from item statuses.
      const itemStatuses = vendorProducts.map(p => p.itemStatus || 'pending');
      const vendorOrderStatus = deriveVendorOrderStatus(itemStatuses);
      const cancellationItem = vendorProducts.find((product) =>
        product.rejectionReason || product.cancellationReason || product.rejectionNotes,
      );
      const vendorMessages = (order.customerMessages || []).filter(
        (message) => !message.vendorId || message.vendorId.toString() === vendorId,
      );

      return {
        _id: order._id,
        parentOrderId: order._id,
        vendorId,
        products: vendorProducts,
        shippingInfo: order.shippingInfo,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: vendorOrderStatus, // Vendor-specific status
        overallOrderStatus: order.status, // Full order status
        cancelledAt: order.cancelledAt,
        cancelledBy: order.cancelledBy,
        cancelledByRole: order.cancelledByRole,
        cancellationSource: order.cancellationSource,
        cancellationMessage: order.cancellationMessage || cancellationItem?.rejectionReason || cancellationItem?.cancellationReason,
        cancellationReason: cancellationItem?.rejectionReason || cancellationItem?.cancellationReason || order.cancellationMessage,
        cancellationNotes: cancellationItem?.rejectionNotes || null,
        statusHistory: order.statusHistory || [],
        customerMessages: vendorMessages,
        packedAt: firstVendorField(vendorProducts, "packedAt"),
        readyToShipAt: firstVendorField(vendorProducts, "readyToShipAt"),
        pickupReadyAt: firstVendorField(vendorProducts, "pickupReadyAt"),
        pickupSchedule: firstVendorField(vendorProducts, "pickupSchedule"),
        courierPickupStatus: firstVendorField(vendorProducts, "courierPickupStatus"),
        codCollected: vendorProducts.length > 0 && vendorProducts.every((product) => product.codCollected === true),
        codCollectedAt: firstVendorField(vendorProducts, "codCollectedAt"),
        codCollectionStatus: order.codCollectionStatus || null,
        vendorSubtotal: financials.vendorSubtotal,
        vendorCommission: financials.vendorCommission,
        grossVendorEarnings: financials.grossVendorEarnings,
        vendorEarnings: financials.vendorEarnings,
        deliveryCharge: financials.deliveryCharge,
        couponDiscount: financials.couponDiscount,
        vendorVoucherDiscount: financials.vendorVoucherDiscount,
        pointsDiscount: financials.pointsDiscount,
        flashDiscount: financials.flashDiscount,
        totalDiscount: financials.totalDiscount,
        payableTotal: financials.payableTotal,
        totalAmount: financials.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        isPartialOrder: vendorProducts.length < (order.products || []).length,
      };
    }).filter(Boolean);

    // Apply status filter if provided
    if (status && status !== 'all') {
      vendorOrders = vendorOrders.filter(o => o.status === status);
    }

    // Populate product details
    for (let order of vendorOrders) {
      if (order.products && Array.isArray(order.products)) {
        for (let item of order.products) {
          if (item.productId) {
            const product = await productsCollection.findOne({ 
              _id: typeof item.productId === 'string' 
                ? new ObjectId(item.productId) 
                : item.productId 
            });
            if (product) {
              item.productDetails = product;
            }
          }
        }
      }
    }

    // Pagination
    const total = vendorOrders.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = vendorOrders.slice(startIndex, endIndex);

    console.log('   ✅ Returning', paginatedOrders.length, 'orders to vendor\n');

    res.json({
      success: true,
      orders: paginatedOrders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching vendor orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    if (!vendorStaffCan(req, "orders:manage")) {
      return rejectVendorStaffPermission(res, "orders:manage");
    }

    const { orderId } = req.params;
    const { status, reason = "", note = "" } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    if (!VENDOR_ORDER_STATUS_TRANSITIONS.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VENDOR_ORDER_STATUS_TRANSITIONS.join(", ")}` });
    }

    const user = req.dbUser || await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorId = vendor._id.toString();

    // Get the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if vendor has items in this order
    const vendorItems = getVendorProductsFromOrder(order, vendorId);

    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    if (!canApplyVendorStatus(vendorItems, status)) {
      return res.status(400).json({
        error: `Cannot mark vendor items ${status.replace(/_/g, " ")} from their current status`,
      });
    }

    // Update item statuses for vendor's products
    const ordersCollection = db.collection("orders");
    const now = new Date();
    const timestampFields = getVendorStatusTimestampFields(status, now, reason, note);

    await ordersCollection.updateOne(
      getOrderIdFilter(orderId),
      {
        $set: {
          "products.$[elem].itemStatus": status,
          "products.$[elem].statusUpdatedAt": now,
          ...timestampFields,
        }
      },
      {
        arrayFilters: [getVendorArrayFilter(vendor)]
      }
    );

    const updatedOrder = await Order.findById(orderId);
    const updatedVendorProducts = getVendorProductsFromOrder(updatedOrder || {}, vendorId);
    const vendorOrder = (await VendorOrder.findByParentOrderId(orderId)).find(
      (vo) => vo.vendorId === vendorId,
    );
    if (vendorOrder) {
      await VendorOrder.updateStatus(vendorOrder._id.toString(), status, {
        products: updatedVendorProducts,
        ...getVendorOrderSnapshotFields(status, now, reason, note),
      });
    }

    // Sync overall order status
    await Order.syncOrderStatus(orderId);

    const amiyoDelivery = status === "ready_to_ship"
      ? await createAmiyoDeliveryShipment(updatedOrder || order, {
          db,
          Order,
          checkoutSource: "ready_to_ship",
        })
      : null;

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status,
      label: `Marked ${status.replace(/_/g, " ")}`,
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: note || reason || "",
    });

    res.json({ success: true, message: "Order status updated", amiyoDelivery });
  } catch (error) {
    console.error("Error updating order status:", error);
    const deliverySyncFailed = Boolean(error.providerResponse || error.statusCode);
    res.status(deliverySyncFailed ? 502 : 500).json({
      error: deliverySyncFailed
        ? `Ready to ship saved, but Amiyo Delivery sync failed: ${error.message}`
        : "Failed to update order status",
    });
  }
};

exports.bulkUpdateVendorOrders = async (req, res) => {
  try {
    if (!vendorStaffCan(req, "orders:manage")) {
      return rejectVendorStaffPermission(res, "orders:manage");
    }

    const { orderIds = [], status, reason = "", note = "" } = req.body || {};
    const uniqueOrderIds = [...new Set((Array.isArray(orderIds) ? orderIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean))]
      .slice(0, 100);

    if (!uniqueOrderIds.length) {
      return res.status(400).json({ error: "Select at least one order" });
    }

    if (!VENDOR_ORDER_STATUS_TRANSITIONS.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VENDOR_ORDER_STATUS_TRANSITIONS.join(", ")}` });
    }

    const { vendor, error } = await getVendorForRequest(req);
    if (error) return res.status(404).json({ error });

    const db = req.app.locals.db;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const vendorId = vendor._id.toString();
    const now = new Date();
    const results = [];

    for (const orderId of uniqueOrderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          results.push({ orderId, success: false, error: "Order not found" });
          continue;
        }

        const vendorItems = getVendorProductsFromOrder(order, vendorId);
        if (vendorItems.length === 0) {
          results.push({ orderId, success: false, error: "No vendor items in order" });
          continue;
        }

        if (!canApplyVendorStatus(vendorItems, status)) {
          results.push({
            orderId,
            success: false,
            error: `Cannot mark vendor items ${status.replace(/_/g, " ")} from their current status`,
          });
          continue;
        }

        await db.collection("orders").updateOne(
          getOrderIdFilter(orderId),
          {
            $set: {
              "products.$[elem].itemStatus": status,
              "products.$[elem].statusUpdatedAt": now,
              ...getVendorStatusTimestampFields(status, now, reason, note),
            },
          },
          { arrayFilters: [getVendorArrayFilter(vendor)] },
        );

        const updatedOrder = await Order.findById(orderId);
        const updatedVendorProducts = getVendorProductsFromOrder(updatedOrder || {}, vendorId);
        const vendorOrder = (await VendorOrder.findByParentOrderId(orderId)).find(
          (vo) => vo.vendorId === vendorId,
        );

        if (vendorOrder) {
          await VendorOrder.updateStatus(vendorOrder._id.toString(), status, {
            products: updatedVendorProducts,
            ...getVendorOrderSnapshotFields(status, now, reason, note),
          });
        }

        await Order.syncOrderStatus(orderId);
        const amiyoDelivery = status === "ready_to_ship"
          ? await createAmiyoDeliveryShipment(updatedOrder || order, {
              db,
              Order,
              checkoutSource: "ready_to_ship_bulk",
            })
          : null;
        await appendOrderEvent({
          app: req.app,
          orderId,
          vendorId,
          status,
          label: `Bulk marked ${status.replace(/_/g, " ")}`,
          actorId: req.user?.uid,
          actorRole: req.vendorStaff ? "vendor_staff" : "vendor",
          note: note || reason || "",
          metadata: { bulk: true },
        });

        results.push({ orderId, success: true, status, amiyoDelivery });
      } catch (itemError) {
        results.push({ orderId, success: false, error: itemError.message || "Update failed" });
      }
    }

    const successful = results.filter((item) => item.success);
    const failed = results.filter((item) => !item.success);

    res.json({
      success: failed.length === 0,
      message: `${successful.length} order${successful.length === 1 ? "" : "s"} updated${failed.length ? `, ${failed.length} failed` : ""}`,
      summary: {
        requested: uniqueOrderIds.length,
        updated: successful.length,
        failed: failed.length,
      },
      results,
    });
  } catch (error) {
    console.error("Error bulk updating vendor orders:", error);
    res.status(500).json({ error: "Failed to bulk update orders" });
  }
};

// Get top selling products
exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const db = req.app.locals.db;
    const productsCollection = db.collection("products");

    // Get products sorted by views (or sales when implemented)
    const products = await productsCollection
      .find({ vendorId: vendor._id.toString() })
      .sort({ views: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
};

exports.getVendorReports = async (req, res) => {
  try {
    if (!vendorStaffCan(req, "reports:view")) {
      return rejectVendorStaffPermission(res, "reports:view");
    }

    const days = getReportDays(req.query.period);
    const { currentStart, currentEnd, previousStart, previousEnd } = buildPeriodRange(days);
    const { vendor, error } = await getVendorForRequest(req);
    if (error) return res.status(404).json({ error });

    const db = req.app.locals.db;
    const vendorId = vendor._id.toString();
    const vendorIds = getIdVariants(vendorId);

    const [orderRows, productDocs] = await Promise.all([
      getVendorOrderRows(db, vendorId),
      findDocuments(
        db,
        "products",
        { vendorId: { $in: vendorIds } },
        {
          projection: {
            _id: 1,
            title: 1,
            name: 1,
            sku: 1,
            images: 1,
            media: 1,
            image: 1,
            imageUrl: 1,
            coverImage: 1,
            views: 1,
            addToCartCount: 1,
            cartAdds: 1,
            addToCart: 1,
            stock: 1,
            variants: 1,
            isActive: 1,
            createdAt: 1,
          },
        },
      ),
    ]);

    const currentRows = orderRows.filter((row) => isInRange(row.createdAt, currentStart, currentEnd));
    const previousRows = orderRows.filter((row) => isInRange(row.createdAt, previousStart, previousEnd));
    const currentDelivered = currentRows.filter((row) => row.status === "delivered");
    const previousDelivered = previousRows.filter((row) => row.status === "delivered");
    const currentRevenue = currentDelivered.reduce((sum, row) => sum + row.deliveredEarnings, 0);
    const previousRevenue = previousDelivered.reduce((sum, row) => sum + row.deliveredEarnings, 0);

    const productIds = productDocs
      .map((product) => toObjectId(product._id))
      .filter(Boolean);
    const reviewRows = productIds.length
      ? await db.collection("reviews").aggregate([
          { $match: { productId: { $in: productIds } } },
          { $group: { _id: "$productId", avgRating: { $avg: "$rating" } } },
        ]).toArray()
      : [];
    const reviewMeta = new Map(reviewRows.map((row) => [row._id.toString(), round2(row.avgRating)]));

    const productPerformance = buildProductPerformance({
      currentRows,
      productDocs,
      reviewMeta,
    });
    const topProducts = productPerformance.slice(0, 10);
    const productFunnel = productPerformance
      .filter((product) => product.views > 0 || product.addToCart > 0 || product.purchases > 0)
      .slice(0, 20);

    const monthlyData = buildMonthlyData(orderRows);
    const salesTrend = buildSalesTrend(orderRows, days, currentStart, previousStart);

    const platformOrders = await findDocuments(
      db,
      "orders",
      { createdAt: { $gte: currentStart, $lt: currentEnd } },
      { projection: { status: 1, products: 1, createdAt: 1 } },
    );
    const platformAverageRate = percent(
      platformOrders.filter(isCancelledOrReturnedOrder).length,
      platformOrders.length,
    );
    const cancellationReturnTrend = buildCancellationReturnTrend({
      currentRows,
      platformAverageRate,
      days,
      currentStart,
    });

    const campaignEvents = await countDocuments(db, "vendorMarketingEvents", {
      vendorId: { $in: vendorIds },
      event: { $in: ["view", "click"] },
      createdAt: { $gte: currentStart, $lt: currentEnd },
    });

    const shopSlug = vendor.shopSlug || vendor.slug || vendor.customSlug || vendor.shopName;
    const externalViews = await countDocuments(db, "pageViews", {
      createdAt: { $gte: currentStart, $lt: currentEnd },
      referrer: { $exists: true, $ne: "" },
      $or: [
        { vendorId: { $in: vendorIds } },
        { "metadata.vendorId": { $in: vendorIds } },
        { path: { $regex: `/vendor/${escapeRegex(vendorId)}`, $options: "i" } },
        ...(shopSlug ? [{ path: { $regex: `/shop/${escapeRegex(shopSlug)}`, $options: "i" } }] : []),
      ],
    });

    const summary = {
      totalSales: round2(currentRevenue),
      totalOrders: currentRows.length,
      deliveredOrders: currentDelivered.length,
      cancelledOrders: currentRows.filter((row) => row.status === "cancelled").length,
      returnedOrders: currentRows.filter((row) => row.status === "returned").length,
      averageOrderValue: round2(
        currentDelivered.length
          ? currentRevenue / currentDelivered.length
          : 0,
      ),
      previousSales: round2(previousRevenue),
      previousOrders: previousRows.length,
      revenueChangePercent: periodChange(currentRevenue, previousRevenue),
      orderChangePercent: periodChange(currentRows.length, previousRows.length),
      cancellationReturnRate: percent(
        currentRows.filter((row) => ["cancelled", "returned"].includes(row.status)).length,
        currentRows.length,
      ),
    };
    const customerRepeat = buildCustomerRepeat(orderRows, currentRows);
    summary.customerRepeatRate = customerRepeat.repeatRate;

    const totalViews = productDocs.reduce((sum, product) => sum + Number(product.views || 0), 0);
    const productsWithViews = productDocs.filter((product) => Number(product.views || 0) > 0);
    const activeProducts = productDocs.filter((product) => product.isActive !== false);
    const zeroViewProducts = productDocs.filter((product) => Number(product.views || 0) === 0);
    const topViewedProducts = [...productDocs]
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, 5)
      .map((product) => ({
        productId: product._id.toString(),
        name: product.title || product.name || "Product",
        views: Number(product.views || 0),
        stock: Number(product.stock || 0),
      }));

    const visibilityStats = {
      totalViews,
      activeListings: activeProducts.length,
      productsWithViews: productsWithViews.length,
      zeroViewProducts: zeroViewProducts.length,
      averageViewsPerProduct: round2(
        productDocs.length ? totalViews / productDocs.length : 0,
      ),
      topViewedProducts,
    };
    const organicViews = Math.max(totalViews - campaignEvents - externalViews, 0);
    const trafficTotal = organicViews + campaignEvents + externalViews;
    const trafficSources = [
      {
        id: "organic",
        label: "Organic platform search",
        value: organicViews,
        unit: "visits",
        share: percent(organicViews, trafficTotal),
      },
      {
        id: "campaign",
        label: "Campaign traffic",
        value: campaignEvents,
        unit: "events",
        share: percent(campaignEvents, trafficTotal),
      },
      {
        id: "external",
        label: "External shop link",
        value: externalViews,
        unit: "visits",
        share: percent(externalViews, trafficTotal),
      },
    ];

    res.json({
      success: true,
      data: {
        period: {
          days,
          label: `Last ${days} days`,
          currentStart: currentStart.toISOString(),
          currentEnd: currentEnd.toISOString(),
          previousStart: previousStart.toISOString(),
          previousEnd: previousEnd.toISOString(),
        },
        summary,
        salesData: salesTrend,
        salesTrend,
        monthlyData,
        topProducts,
        productFunnel,
        trafficSources,
        visibilityStats,
        cancellationReturnTrend,
        customerRepeat,
        inventoryForecast: buildInventoryForecast({ productPerformance, days }),
        benchmark: {
          platformCancellationReturnRate: platformAverageRate,
        },
        trafficMessage: productDocs.length
          ? "Traffic combines product views with campaign and external shop-link events when those events are available."
          : "Add products to start building visibility, funnel, and traffic metrics.",
      },
    });
  } catch (error) {
    console.error("Error fetching vendor reports:", error);
    res.status(500).json({ error: "Failed to fetch vendor reports" });
  }
};

// ─── Vendor: Single order detail ─────────────────────────────
exports.getVendorOrderDetail = async (req, res) => {
  try {
    if (!vendorStaffCan(req, "orders:view")) {
      return rejectVendorStaffPermission(res, "orders:view");
    }

    const { orderId } = req.params;
    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = req.dbUser || await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    // Get vendor-specific items from parent order
    const orderData = await Order.getVendorItems(orderId, vendorId);
    if (!orderData) {
      return res.status(404).json({ error: "Order not found or no items for this vendor" });
    }

    // Enrich products with full product details
    const productsCollection = db.collection("products");
    const enrichedProducts = [];
    if (orderData.products && Array.isArray(orderData.products)) {
      for (const item of orderData.products) {
        let productDetails = null;
        if (item.productId) {
          try {
            const { ObjectId } = require("mongodb");
            productDetails = await productsCollection.findOne({
              _id: typeof item.productId === "string" ? new ObjectId(item.productId) : item.productId,
            });
          } catch (_) {}
        }
        enrichedProducts.push({ ...item, productDetails });
      }
    }

    const financials = calculateVendorOrderFinancials(orderData, orderData.products || [], vendorId, {
      vendorSubtotal: orderData.vendorSubtotal,
      vendorCommission: orderData.vendorCommission,
      vendorEarnings: orderData.vendorEarnings,
    });

    res.json({
      success: true,
      data: {
        ...orderData,
        products: enrichedProducts,
        vendorSubtotal: financials.vendorSubtotal,
        vendorCommission: financials.vendorCommission,
        grossVendorEarnings: financials.grossVendorEarnings,
        vendorEarnings: financials.vendorEarnings,
        deliveryCharge: financials.deliveryCharge,
        couponDiscount: financials.couponDiscount,
        vendorVoucherDiscount: financials.vendorVoucherDiscount,
        pointsDiscount: financials.pointsDiscount,
        flashDiscount: financials.flashDiscount,
        totalDiscount: financials.totalDiscount,
        payableTotal: financials.payableTotal,
        totalAmount: financials.totalAmount,
        statusHistory: orderData.statusHistory || [],
      },
    });
  } catch (error) {
    console.error("Error in getVendorOrderDetail:", error);
    res.status(500).json({ error: "Failed to fetch order detail" });
  }
};

// ─── Vendor: Finance stats ────────────────────────────────────
exports.getVendorOrderStats = async (req, res) => {
  try {
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const stats = await VendorOrder.getVendorOrderStats(vendor._id.toString());
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error in getVendorOrderStats:", error);
    res.status(500).json({ error: "Failed to fetch vendor order stats" });
  }
};

// ─── Vendor: Pack items ────────────────────────────────────────
exports.packVendorItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") return res.status(403).json({ error: "Vendor not approved" });

    const vendorId = vendor._id.toString();

    // Find the VendorOrder for this vendor
    const vendorOrders = await VendorOrder.findByParentOrderId(orderId);
    const myVendorOrder = vendorOrders.find((vo) => vo.vendorId === vendorId);
    if (!myVendorOrder) return res.status(404).json({ error: "Order not found for this vendor" });

    // Check parent order exists
    const parentOrder = await Order.findById(orderId);
    if (!parentOrder) return res.status(404).json({ error: "Parent order not found" });

    // Verify vendor has items in this order
    const hasItems = (parentOrder.products || []).some((p) => p.vendorId === vendorId);
    if (!hasItems) return res.status(403).json({ error: "No items for this vendor in order" });

    // Update item statuses on parent order
    await Order.updateItemStatus(orderId, vendorId, "packed");
    await Order.syncOrderStatus(orderId);

    // Update VendorOrder status
    await VendorOrder.updateStatus(myVendorOrder._id.toString(), "packed");

    res.json({ success: true, message: "Items marked as packed" });
  } catch (error) {
    console.error("Error in packVendorItems:", error);
    res.status(500).json({ error: "Failed to pack items" });
  }
};

// ─── Vendor: Ship items ────────────────────────────────────────
exports.shipVendorItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber } = req.body;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ error: "trackingNumber is required for shipping" });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") return res.status(403).json({ error: "Vendor not approved" });

    const vendorId = vendor._id.toString();

    const vendorOrders = await VendorOrder.findByParentOrderId(orderId);
    const myVendorOrder = vendorOrders.find((vo) => vo.vendorId === vendorId);
    if (!myVendorOrder) return res.status(404).json({ error: "Order not found for this vendor" });

    const parentOrder = await Order.findById(orderId);
    if (!parentOrder) return res.status(404).json({ error: "Parent order not found" });

    const hasItems = (parentOrder.products || []).some((p) => p.vendorId === vendorId);
    if (!hasItems) return res.status(403).json({ error: "No items for this vendor in order" });

    // Update item statuses on parent order (with tracking number)
    await Order.updateItemStatus(orderId, vendorId, "shipped", trackingNumber.trim());
    await Order.syncOrderStatus(orderId);

    // Update VendorOrder with tracking info
    await VendorOrder.updateStatus(myVendorOrder._id.toString(), "shipped", {
      trackingNumber: trackingNumber.trim(),
      shippedAt: new Date(),
    });

    res.json({ success: true, message: "Items marked as shipped", trackingNumber: trackingNumber.trim() });
  } catch (error) {
    console.error("Error in shipVendorItems:", error);
    res.status(500).json({ error: "Failed to ship items" });
  }
};

// ─── Vendor: Deliver items ─────────────────────────────────────
exports.deliverVendorItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const Order = req.app.locals.models.Order;
    const VendorOrder = req.app.locals.models.VendorOrder;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") return res.status(403).json({ error: "Vendor not approved" });

    const vendorId = vendor._id.toString();

    const vendorOrders = await VendorOrder.findByParentOrderId(orderId);
    const myVendorOrder = vendorOrders.find((vo) => vo.vendorId === vendorId);
    if (!myVendorOrder) return res.status(404).json({ error: "Order not found for this vendor" });

    const parentOrder = await Order.findById(orderId);
    if (!parentOrder) return res.status(404).json({ error: "Parent order not found" });

    const hasItems = (parentOrder.products || []).some((p) => p.vendorId === vendorId);
    if (!hasItems) return res.status(403).json({ error: "No items for this vendor in order" });

    await Order.updateItemStatus(orderId, vendorId, "delivered");
    await Order.syncOrderStatus(orderId);

    await VendorOrder.updateStatus(myVendorOrder._id.toString(), "delivered", {
      deliveredAt: new Date(),
    });

    res.json({ success: true, message: "Items marked as delivered" });
  } catch (error) {
    console.error("Error in deliverVendorItems:", error);
    res.status(500).json({ error: "Failed to mark items as delivered" });
  }
};

exports._private = {
  buildVendorActionCenter,
  buildVendorFinanceCommand,
  buildVendorFulfillmentCommand,
  buildVendorReadiness,
  calculateVendorOrderFinancials,
  deriveVendorOrderStatus,
  getStock,
};

module.exports = exports;

