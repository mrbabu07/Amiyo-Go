const analyticsService = require("../services/analyticsService");

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_LIMIT = 20000;

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeId = (value) => value?.toString?.() || String(value || "");
const normalizeText = (value) => String(value || "").trim().toLowerCase();

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  return date;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const addYears = (date, years) => {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
};

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
const monthKey = (date) => new Date(date).toISOString().slice(0, 7);

const startOfWeek = (value) => {
  const date = startOfDay(value);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
};

const startOfMonth = (value) => {
  const date = startOfDay(value);
  date.setUTCDate(1);
  return date;
};

const bucketStart = (value, granularity = "day") => {
  if (granularity === "week") return startOfWeek(value);
  if (granularity === "month") return startOfMonth(value);
  return startOfDay(value);
};

const addBucket = (date, granularity = "day", amount = 1) => {
  if (granularity === "week") return addDays(date, amount * 7);
  if (granularity === "month") return addMonths(date, amount);
  return addDays(date, amount);
};

const bucketKey = (value, granularity = "day") => {
  const start = bucketStart(value, granularity);
  if (granularity === "month") return monthKey(start);
  if (granularity === "week") return `${dateKey(start)} week`;
  return dateKey(start);
};

const bucketLabel = (value, granularity = "day") => {
  const start = bucketStart(value, granularity);
  if (granularity === "month") return start.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (granularity === "week") return `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isInRange = (value, start, end) => {
  const date = asDate(value);
  return Boolean(date && date >= start && date < end);
};

const resolveReportRange = (query = {}) => {
  const now = new Date();
  const range = query.range || query.period || "30d";
  const granularity = ["day", "week", "month"].includes(query.granularity) ? query.granularity : "day";

  if (range === "today") {
    return { range, granularity: "day", start: startOfDay(now), end: endOfDay(now) };
  }

  if (range === "7d") {
    return { range, granularity, start: startOfDay(addDays(now, -6)), end: endOfDay(now) };
  }

  if (range === "90d") {
    return { range, granularity, start: startOfDay(addDays(now, -89)), end: endOfDay(now) };
  }

  if (range === "12m") {
    return { range, granularity: query.granularity || "month", start: startOfMonth(addMonths(now, -11)), end: endOfDay(now) };
  }

  if (range === "custom") {
    return {
      range,
      granularity,
      start: startOfDay(query.start || addDays(now, -29)),
      end: endOfDay(query.end || now),
    };
  }

  return { range: "30d", granularity, start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
};

const collectionToArray = async (db, name, query = {}, sort = {}, limit = REPORT_LIMIT) => {
  try {
    const collection = db?.collection?.(name);
    if (!collection?.find) return [];
    let cursor = collection.find(query);
    if (Object.keys(sort).length > 0 && cursor.sort) cursor = cursor.sort(sort);
    if (limit > 0 && cursor.limit) cursor = cursor.limit(limit);
    return cursor.toArray ? await cursor.toArray() : [];
  } catch {
    return [];
  }
};

const getOrderAmount = (order = {}) =>
  Number(order.totalAmount ?? order.total ?? order.finalTotal ?? order.grandTotal ?? order.subtotal ?? order.amount ?? 0);

const getOrderDate = (order = {}) => order.createdAt || order.placedAt || order.orderDate || order.updatedAt;

const getReturnDate = (item = {}) => item.completedAt || item.refundProcessedAt || item.updatedAt || item.createdAt || item.requestedAt;

const isCancelledOrder = (order = {}) => ["cancelled", "canceled", "failed"].includes(normalizeText(order.status));

const isActiveOrder = (order = {}) => !isCancelledOrder(order);

const isPaidOrder = (order = {}) => {
  const paymentStatus = normalizeText(order.paymentStatus || order.payment?.status);
  const status = normalizeText(order.status);
  return ["paid", "completed", "verified", "captured"].includes(paymentStatus) ||
    ["processing", "packed", "ready_to_ship", "shipped", "delivered", "completed"].includes(status);
};

const isDeliveredOrder = (order = {}) => ["delivered", "completed"].includes(normalizeText(order.status));

const getOrderCustomerId = (order = {}) =>
  normalizeId(order.userId || order.customerId || order.customer?.firebaseUid || order.customer?.email || order.shippingInfo?.email || order.shippingInfo?.phone || `guest:${order._id}`);

const getOrderItems = (order = {}) => {
  const items = order.products || order.items || order.lineItems || [];
  if (items.length > 0) return items;
  return [{
    productId: order.productId || "order-total",
    name: order.productName || "Order total",
    quantity: 1,
    price: getOrderAmount(order),
    total: getOrderAmount(order),
    vendorId: order.vendorId,
    vendorName: order.vendorName,
    categoryId: order.categoryId,
    categoryName: order.categoryName,
  }];
};

const getItemQuantity = (item = {}) => Number(item.quantity ?? item.qty ?? item.count ?? 1);

const getItemAmount = (item = {}) => {
  const quantity = getItemQuantity(item);
  const price = Number(item.price ?? item.salePrice ?? item.unitPrice ?? item.discountedPrice ?? 0);
  return Number(item.total ?? item.totalAmount ?? item.subtotal ?? item.lineTotal ?? price * quantity);
};

const getItemProductId = (item = {}) => normalizeId(item.productId || item.product?._id || item._id || item.sku || item.name || item.title);
const getItemVendorId = (item = {}, order = {}) => normalizeId(item.vendorId || item.sellerId || item.vendor?._id || order.vendorId || order.sellerId || "platform");
const getItemVendorName = (item = {}, order = {}, vendor = null) =>
  item.vendorName || item.shopName || item.vendor?.shopName || order.vendorName || vendor?.shopName || vendor?.businessName || vendor?.name || "Platform";

const getProductTitle = (product = {}, fallback = "Product") => product.title || product.name || product.productName || product.sku || fallback;
const getProductCategoryId = (product = {}) => normalizeId(product.categoryId || product.category?._id || product.category || "uncategorized");
const getProductCategoryName = (product = {}) => product.categoryName || product.category?.name || product.category || "Uncategorized";

const buildProductLookup = (products = []) => {
  const lookup = new Map();
  products.forEach((product) => {
    [product._id, product.id, product.sku].filter(Boolean).forEach((value) => lookup.set(normalizeId(value), product));
  });
  return lookup;
};

const buildVendorLookup = (vendors = []) => {
  const lookup = new Map();
  vendors.forEach((vendor) => {
    [vendor._id, vendor.id, vendor.firebaseUid, vendor.ownerId].filter(Boolean).forEach((value) => lookup.set(normalizeId(value), vendor));
  });
  return lookup;
};

const buildBuckets = (start, end, granularity = "day") => {
  const buckets = [];
  for (let cursor = bucketStart(start, granularity); cursor < end; cursor = addBucket(cursor, granularity)) {
    buckets.push({
      key: bucketKey(cursor, granularity),
      label: bucketLabel(cursor, granularity),
      periodStart: cursor,
      periodEnd: addBucket(cursor, granularity),
      gmv: 0,
      orders: 0,
      units: 0,
      refunds: 0,
      previousYearGmv: 0,
      yoyChangePct: 0,
    });
  }
  return buckets;
};

const buildGmvTrend = ({ orders = [], returns = [], start, end, granularity = "day" }) => {
  const buckets = buildBuckets(start, end, granularity);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const previousYear = new Map();
  const previousStart = addYears(start, -1);
  const previousEnd = addYears(end, -1);

  orders.forEach((order) => {
    const date = asDate(getOrderDate(order));
    if (!date || !isActiveOrder(order)) return;
    const amount = getOrderAmount(order);
    const units = getOrderItems(order).reduce((sum, item) => sum + getItemQuantity(item), 0);

    if (date >= start && date < end) {
      const bucket = bucketMap.get(bucketKey(date, granularity));
      if (!bucket) return;
      bucket.gmv += amount;
      bucket.orders += 1;
      bucket.units += units;
    } else if (date >= previousStart && date < previousEnd) {
      const shiftedKey = bucketKey(addYears(date, 1), granularity);
      previousYear.set(shiftedKey, (previousYear.get(shiftedKey) || 0) + amount);
    }
  });

  returns.forEach((returnDoc) => {
    const date = asDate(getReturnDate(returnDoc));
    if (!date || date < start || date >= end) return;
    const bucket = bucketMap.get(bucketKey(date, granularity));
    if (!bucket) return;
    bucket.refunds += Number(returnDoc.refundAmount ?? returnDoc.amount ?? returnDoc.totalAmount ?? 0);
  });

  return buckets.map((bucket) => {
    const previousYearGmv = previousYear.get(bucket.key) || 0;
    return {
      ...bucket,
      periodStart: bucket.periodStart.toISOString(),
      periodEnd: bucket.periodEnd.toISOString(),
      gmv: round2(bucket.gmv),
      refunds: round2(bucket.refunds),
      netGmv: round2(bucket.gmv - bucket.refunds),
      previousYearGmv: round2(previousYearGmv),
      yoyChangePct: previousYearGmv ? round2(((bucket.gmv - previousYearGmv) / previousYearGmv) * 100) : null,
    };
  });
};

const eventName = (event = {}) => normalizeText(event.event || event.type || event.action || event.name);
const eventSessionId = (event = {}) => normalizeId(event.sessionId || event.session || event.visitorId || event.userId || event._id);
const eventDate = (event = {}) => event.createdAt || event.timestamp || event.date || event.updatedAt;

const countEvents = (events = [], names = []) => {
  const wanted = new Set(names);
  return events.filter((event) => wanted.has(eventName(event))).length;
};

const buildConversionFunnel = ({ orders = [], sessions = [], pageViews = [], events = [], start, end }) => {
  const eventsInRange = events.filter((event) => isInRange(eventDate(event), start, end));
  const pageViewsInRange = pageViews.filter((view) => isInRange(eventDate(view), start, end));
  const sessionIds = new Set([
    ...sessions.filter((session) => isInRange(session.createdAt || session.startedAt || session.date, start, end)).map(eventSessionId),
    ...pageViewsInRange.map(eventSessionId),
    ...eventsInRange.map(eventSessionId),
  ].filter(Boolean));

  const productViewsFromPages = pageViewsInRange.filter((view) =>
    String(view.path || view.url || view.page || "").includes("/product"),
  ).length;
  const productViews = productViewsFromPages + countEvents(eventsInRange, ["product_view", "view_product", "product:view"]);
  const addToCart = countEvents(eventsInRange, ["add_to_cart", "cart_add", "cart:add", "add-to-cart"]);
  const checkout = countEvents(eventsInRange, ["checkout_started", "checkout", "begin_checkout", "checkout:start"]);
  const ordersInRange = orders.filter((order) => isInRange(getOrderDate(order), start, end));
  const paid = ordersInRange.filter(isPaidOrder).length;
  const delivered = ordersInRange.filter(isDeliveredOrder).length;

  const steps = [
    { key: "sessions", label: "Sessions", count: sessionIds.size || sessions.length || pageViewsInRange.length },
    { key: "productViews", label: "Product views", count: productViews },
    { key: "addToCart", label: "Add to cart", count: addToCart },
    { key: "checkout", label: "Checkout", count: checkout },
    { key: "paid", label: "Paid", count: paid },
    { key: "delivered", label: "Delivered", count: delivered },
  ];

  return steps.map((step, index) => {
    const previous = index === 0 ? step.count : steps[index - 1].count;
    return {
      ...step,
      dropOff: index === 0 ? 0 : Math.max(0, previous - step.count),
      stepConversionRate: index === 0 || !previous ? 100 : round2((step.count / previous) * 100),
      sessionConversionRate: steps[0].count ? round2((step.count / steps[0].count) * 100) : 0,
    };
  });
};

const buildCustomerAcquisition = ({ orders = [], users = [], marketingSpend = [], start, end }) => {
  const validOrders = orders.filter(isActiveOrder).sort((a, b) => new Date(getOrderDate(a) || 0) - new Date(getOrderDate(b) || 0));
  const firstOrderByCustomer = new Map();
  const ordersByCustomer = new Map();

  validOrders.forEach((order) => {
    const customerId = getOrderCustomerId(order);
    const date = asDate(getOrderDate(order));
    if (!customerId || !date) return;
    if (!firstOrderByCustomer.has(customerId)) firstOrderByCustomer.set(customerId, date);
    if (!ordersByCustomer.has(customerId)) ordersByCustomer.set(customerId, []);
    ordersByCustomer.get(customerId).push(date);
  });

  const buyersInRange = new Set(validOrders.filter((order) => isInRange(getOrderDate(order), start, end)).map(getOrderCustomerId));
  const newBuyers = [...buyersInRange].filter((customerId) => isInRange(firstOrderByCustomer.get(customerId), start, end));
  const returningBuyers = [...buyersInRange].filter((customerId) => {
    const first = firstOrderByCustomer.get(customerId);
    return first && first < start;
  });
  const newUsers = users.filter((user) => isInRange(user.createdAt, start, end)).length;
  const totalMarketingSpend = marketingSpend
    .filter((row) => isInRange(row.date || row.createdAt || row.spentAt, start, end))
    .reduce((sum, row) => sum + Number(row.amount || row.spend || row.cost || 0), 0);

  const cohortMonths = [];
  const cohortStart = startOfMonth(addMonths(end, -5));
  for (let cursor = cohortStart; cursor < end; cursor = addMonths(cursor, 1)) {
    cohortMonths.push(monthKey(cursor));
  }

  const cohortRetention = cohortMonths.map((cohort) => {
    const cohortCustomers = [...firstOrderByCustomer.entries()]
      .filter(([, firstDate]) => monthKey(firstDate) === cohort)
      .map(([customerId]) => customerId);

    const retainedByMonth = [0, 1, 2, 3].map((offset) => {
      if (offset === 0) return cohortCustomers.length;
      const retained = cohortCustomers.filter((customerId) =>
        (ordersByCustomer.get(customerId) || []).some((date) => monthKey(date) === monthKey(addMonths(`${cohort}-01`, offset))),
      ).length;
      return retained;
    });

    return {
      cohort,
      customers: cohortCustomers.length,
      month0: cohortCustomers.length ? 100 : 0,
      month1: cohortCustomers.length ? round2((retainedByMonth[1] / cohortCustomers.length) * 100) : 0,
      month2: cohortCustomers.length ? round2((retainedByMonth[2] / cohortCustomers.length) * 100) : 0,
      month3: cohortCustomers.length ? round2((retainedByMonth[3] / cohortCustomers.length) * 100) : 0,
    };
  });

  return {
    summary: {
      newUsers,
      buyers: buyersInRange.size,
      newBuyers: newBuyers.length,
      returningBuyers: returningBuyers.length,
      retentionRate: buyersInRange.size ? round2((returningBuyers.length / buyersInRange.size) * 100) : 0,
      marketingSpend: round2(totalMarketingSpend),
      cacEstimate: newBuyers.length ? round2(totalMarketingSpend / newBuyers.length) : 0,
    },
    cohortRetention,
  };
};

const getCategoryForItem = (item, productLookup) => {
  const product = productLookup.get(getItemProductId(item));
  return {
    categoryId: normalizeId(item.categoryId || item.category?._id || product?.categoryId || product?.category?._id || product?.category || "uncategorized"),
    categoryName: item.categoryName || item.category?.name || product?.categoryName || product?.category?.name || product?.category || "Uncategorized",
  };
};

const getVendorForItem = (item, order, vendorLookup) => {
  const vendorId = getItemVendorId(item, order);
  const vendor = vendorLookup.get(vendorId);
  return {
    vendorId,
    vendorName: getItemVendorName(item, order, vendor),
    vendor,
  };
};

const forEachReturnItem = (returnDoc, callback) => {
  const items = returnDoc.products || returnDoc.items || returnDoc.returnItems || [];
  if (items.length > 0) {
    items.forEach((item) => callback(item, Number(item.refundAmount || item.amount || item.total || 0)));
    return;
  }

  callback({
    productId: returnDoc.productId,
    categoryId: returnDoc.categoryId,
    categoryName: returnDoc.categoryName,
    vendorId: returnDoc.vendorId,
    vendorName: returnDoc.vendorName,
    quantity: returnDoc.quantity || 1,
  }, Number(returnDoc.refundAmount || returnDoc.amount || returnDoc.totalAmount || 0));
};

const buildCategoryPerformance = ({ orders = [], returns = [], products = [], start, end }) => {
  const productLookup = buildProductLookup(products);
  const rows = new Map();

  orders.filter((order) => isActiveOrder(order) && isInRange(getOrderDate(order), start, end)).forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const { categoryId, categoryName } = getCategoryForItem(item, productLookup);
      const row = rows.get(categoryId) || {
        categoryId,
        categoryName,
        revenue: 0,
        units: 0,
        orderIds: new Set(),
        returnCount: 0,
        refundAmount: 0,
      };
      row.revenue += getItemAmount(item);
      row.units += getItemQuantity(item);
      row.orderIds.add(normalizeId(order._id));
      rows.set(categoryId, row);
    });
  });

  returns.filter((item) => isInRange(getReturnDate(item), start, end)).forEach((returnDoc) => {
    forEachReturnItem(returnDoc, (item, amount) => {
      const { categoryId, categoryName } = getCategoryForItem({ ...returnDoc, ...item }, productLookup);
      const row = rows.get(categoryId) || {
        categoryId,
        categoryName,
        revenue: 0,
        units: 0,
        orderIds: new Set(),
        returnCount: 0,
        refundAmount: 0,
      };
      row.returnCount += 1;
      row.refundAmount += amount;
      rows.set(categoryId, row);
    });
  });

  return [...rows.values()]
    .map((row) => {
      const ordersCount = row.orderIds.size;
      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        revenue: round2(row.revenue),
        orders: ordersCount,
        units: row.units,
        averageOrderValue: ordersCount ? round2(row.revenue / ordersCount) : 0,
        returnCount: row.returnCount,
        refundAmount: round2(row.refundAmount),
        returnRate: ordersCount ? round2((row.returnCount / ordersCount) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

const getReviewVendorId = (review, productLookup) => {
  if (review.vendorId || review.sellerId) return normalizeId(review.vendorId || review.sellerId);
  const product = productLookup.get(normalizeId(review.productId));
  return normalizeId(product?.vendorId || product?.sellerId);
};

const buildVendorLeague = ({ orders = [], returns = [], vendors = [], reviews = [], products = [], start, end }) => {
  const vendorLookup = buildVendorLookup(vendors);
  const productLookup = buildProductLookup(products);
  const rows = new Map();

  vendors.forEach((vendor) => {
    const vendorId = normalizeId(vendor._id);
    rows.set(vendorId, {
      vendorId,
      vendorName: vendor.shopName || vendor.businessName || vendor.name || vendor.email || "Vendor",
      gmv: 0,
      units: 0,
      orderIds: new Set(),
      returnCount: 0,
      refundAmount: 0,
      healthScore: Number(vendor.healthScore ?? vendor.accountHealth?.score ?? vendor.performance?.healthScore ?? 0),
      ratingTotal: 0,
      ratingCount: 0,
    });
  });

  orders.filter((order) => isActiveOrder(order) && isInRange(getOrderDate(order), start, end)).forEach((order) => {
    getOrderItems(order).forEach((item) => {
      const { vendorId, vendorName } = getVendorForItem(item, order, vendorLookup);
      const row = rows.get(vendorId) || {
        vendorId,
        vendorName,
        gmv: 0,
        units: 0,
        orderIds: new Set(),
        returnCount: 0,
        refundAmount: 0,
        healthScore: 0,
        ratingTotal: 0,
        ratingCount: 0,
      };
      row.gmv += getItemAmount(item);
      row.units += getItemQuantity(item);
      row.orderIds.add(normalizeId(order._id));
      rows.set(vendorId, row);
    });
  });

  returns.filter((item) => isInRange(getReturnDate(item), start, end)).forEach((returnDoc) => {
    forEachReturnItem(returnDoc, (item, amount) => {
      const vendorId = normalizeId(item.vendorId || returnDoc.vendorId || "platform");
      const row = rows.get(vendorId) || {
        vendorId,
        vendorName: item.vendorName || returnDoc.vendorName || "Platform",
        gmv: 0,
        units: 0,
        orderIds: new Set(),
        returnCount: 0,
        refundAmount: 0,
        healthScore: 0,
        ratingTotal: 0,
        ratingCount: 0,
      };
      row.returnCount += 1;
      row.refundAmount += amount;
      rows.set(vendorId, row);
    });
  });

  reviews.forEach((review) => {
    const vendorId = getReviewVendorId(review, productLookup);
    if (!vendorId) return;
    const rating = Number(review.rating || 0);
    if (!rating) return;
    const row = rows.get(vendorId);
    if (!row) return;
    row.ratingTotal += rating;
    row.ratingCount += 1;
  });

  return [...rows.values()]
    .map((row) => {
      const ordersCount = row.orderIds.size;
      const returnRate = ordersCount ? round2((row.returnCount / ordersCount) * 100) : 0;
      const customerRating = row.ratingCount ? round2(row.ratingTotal / row.ratingCount) : 0;
      const computedHealth = row.healthScore || Math.max(0, round2(100 - returnRate * 2 + customerRating * 4));
      return {
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        gmv: round2(row.gmv),
        orders: ordersCount,
        units: row.units,
        healthScore: round2(computedHealth),
        customerRating,
        reviewCount: row.ratingCount,
        returnCount: row.returnCount,
        refundAmount: round2(row.refundAmount),
        returnRate,
      };
    })
    .sort((a, b) => b.gmv - a.gmv)
    .map((row, index) => ({ rank: index + 1, ...row }));
};

const normalizePaymentMethod = (method) => {
  const value = normalizeText(method || "unknown").replace(/\s+/g, "_");
  if (["bkash", "b_kash", "b-kash"].includes(value)) return "bkash";
  if (["nagad"].includes(value)) return "nagad";
  if (["cod", "cash_on_delivery", "cash"].includes(value)) return "cod";
  if (["card", "credit_card", "debit_card", "sslcommerz"].includes(value)) return "card";
  return value || "unknown";
};

const buildPaymentBreakdown = ({ orders = [], start, end }) => {
  const rows = new Map();
  const activeOrders = orders.filter((order) => isActiveOrder(order) && isInRange(getOrderDate(order), start, end));
  const totalValue = activeOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);

  activeOrders.forEach((order) => {
    const method = normalizePaymentMethod(order.paymentMethod || order.payment?.method || order.paymentType);
    const row = rows.get(method) || { method, volume: 0, value: 0, paid: 0, delivered: 0 };
    row.volume += 1;
    row.value += getOrderAmount(order);
    if (isPaidOrder(order)) row.paid += 1;
    if (isDeliveredOrder(order)) row.delivered += 1;
    rows.set(method, row);
  });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      value: round2(row.value),
      valueShare: totalValue ? round2((row.value / totalValue) * 100) : 0,
      paidRate: row.volume ? round2((row.paid / row.volume) * 100) : 0,
      deliveredRate: row.volume ? round2((row.delivered / row.volume) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const searchTerm = (row = {}) => String(row.term || row.query || row.searchTerm || row.keyword || row.q || "").trim().toLowerCase();

const searchResultCount = (row = {}) => Number(row.resultCount ?? row.resultsCount ?? row.results ?? row.totalResults ?? 0);

const searchConversionCount = (row = {}) =>
  Number(row.conversions ?? row.conversionCount ?? row.orders ?? row.orderCount ?? (row.converted || row.orderId ? 1 : 0));

const buildSearchAnalytics = ({ searchLogs = [], events = [], start, end }) => {
  const grouped = new Map();
  const rows = [
    ...searchLogs.filter((row) => isInRange(row.createdAt || row.searchedAt || row.date, start, end)),
    ...events
      .filter((event) => isInRange(eventDate(event), start, end) && ["search", "search_query", "product_search"].includes(eventName(event)))
      .map((event) => ({
        term: event.term || event.query || event.searchTerm || event.metadata?.query,
        resultCount: event.resultCount || event.metadata?.resultCount,
        conversions: event.conversions || event.metadata?.conversions,
        createdAt: eventDate(event),
      })),
  ];

  rows.forEach((row) => {
    const term = searchTerm(row);
    if (!term) return;
    const item = grouped.get(term) || {
      term,
      searches: 0,
      noResultSearches: 0,
      resultSearches: 0,
      conversions: 0,
      lastSearchedAt: null,
    };
    const resultCount = searchResultCount(row);
    const conversions = searchConversionCount(row);
    item.searches += Number(row.searches || row.count || 1);
    if (resultCount <= 0) item.noResultSearches += 1;
    if (resultCount > 0) item.resultSearches += 1;
    item.conversions += conversions;
    const when = asDate(row.createdAt || row.searchedAt || row.date);
    if (when && (!item.lastSearchedAt || when > item.lastSearchedAt)) item.lastSearchedAt = when;
    grouped.set(term, item);
  });

  const terms = [...grouped.values()].map((row) => ({
    ...row,
    conversionRate: row.searches ? round2((row.conversions / row.searches) * 100) : 0,
    lastSearchedAt: row.lastSearchedAt ? row.lastSearchedAt.toISOString() : null,
  }));

  return {
    topNoResults: terms
      .filter((row) => row.noResultSearches > 0)
      .sort((a, b) => b.noResultSearches - a.noResultSearches || b.searches - a.searches)
      .slice(0, 20),
    topZeroConversion: terms
      .filter((row) => row.resultSearches > 0 && row.conversions === 0)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 20),
    terms,
  };
};

const buildRefundReturnAnalytics = ({ returns = [], categoryPerformance = [], vendorLeague = [], products = [], start, end, granularity = "day" }) => {
  const productLookup = buildProductLookup(products);
  const categoryDenominator = new Map(categoryPerformance.map((row) => [row.categoryId, row.orders]));
  const vendorDenominator = new Map(vendorLeague.map((row) => [row.vendorId, row.orders]));
  const byReason = new Map();
  const byCategory = new Map();
  const byVendor = new Map();
  const trendBuckets = buildBuckets(start, end, granularity).map((bucket) => ({ ...bucket, returns: 0, refundAmount: 0 }));
  const trendMap = new Map(trendBuckets.map((bucket) => [bucket.key, bucket]));

  returns.filter((item) => isInRange(getReturnDate(item), start, end)).forEach((returnDoc) => {
    const reason = returnDoc.reasonCode || returnDoc.reason || returnDoc.returnReason || returnDoc.disputeReason || "unspecified";
    const date = asDate(getReturnDate(returnDoc));
    const trend = trendMap.get(bucketKey(date, granularity));
    if (trend) {
      trend.returns += 1;
      trend.refundAmount += Number(returnDoc.refundAmount || returnDoc.amount || returnDoc.totalAmount || 0);
    }

    const reasonRow = byReason.get(reason) || { reason, returns: 0, refundAmount: 0 };
    reasonRow.returns += 1;
    reasonRow.refundAmount += Number(returnDoc.refundAmount || returnDoc.amount || returnDoc.totalAmount || 0);
    byReason.set(reason, reasonRow);

    forEachReturnItem(returnDoc, (item, amount) => {
      const merged = { ...returnDoc, ...item };
      const { categoryId, categoryName } = getCategoryForItem(merged, productLookup);
      const categoryRow = byCategory.get(categoryId) || { categoryId, categoryName, returns: 0, refundAmount: 0 };
      categoryRow.returns += 1;
      categoryRow.refundAmount += amount;
      byCategory.set(categoryId, categoryRow);

      const vendorId = normalizeId(item.vendorId || returnDoc.vendorId || "platform");
      const vendorName = item.vendorName || returnDoc.vendorName || vendorLeague.find((row) => row.vendorId === vendorId)?.vendorName || "Platform";
      const vendorRow = byVendor.get(vendorId) || { vendorId, vendorName, returns: 0, refundAmount: 0 };
      vendorRow.returns += 1;
      vendorRow.refundAmount += amount;
      byVendor.set(vendorId, vendorRow);
    });
  });

  return {
    byReason: [...byReason.values()]
      .map((row) => ({ ...row, refundAmount: round2(row.refundAmount) }))
      .sort((a, b) => b.returns - a.returns),
    byCategory: [...byCategory.values()]
      .map((row) => ({
        ...row,
        refundAmount: round2(row.refundAmount),
        returnRate: categoryDenominator.get(row.categoryId) ? round2((row.returns / categoryDenominator.get(row.categoryId)) * 100) : 0,
      }))
      .sort((a, b) => b.returns - a.returns),
    byVendor: [...byVendor.values()]
      .map((row) => ({
        ...row,
        refundAmount: round2(row.refundAmount),
        returnRate: vendorDenominator.get(row.vendorId) ? round2((row.returns / vendorDenominator.get(row.vendorId)) * 100) : 0,
      }))
      .sort((a, b) => b.returns - a.returns),
    trend: trendBuckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      returns: bucket.returns,
      refundAmount: round2(bucket.refundAmount),
    })),
  };
};

const buildRevenueForecast = ({ orders = [], start, end }) => {
  const daily = buildGmvTrend({ orders, returns: [], start, end, granularity: "day" });
  const values = daily.map((row) => row.gmv);
  const lastSeven = values.slice(-7);
  const previousSeven = values.slice(-14, -7);
  const average = lastSeven.length ? lastSeven.reduce((sum, value) => sum + value, 0) / lastSeven.length : 0;
  const previousAverage = previousSeven.length ? previousSeven.reduce((sum, value) => sum + value, 0) / previousSeven.length : average;
  const dailySlope = (average - previousAverage) / 7;
  const forecastStart = startOfDay(end);

  const projection = Array.from({ length: 30 }, (_, index) => {
    const projectedGmv = Math.max(0, average + dailySlope * (index + 1));
    return {
      date: dateKey(addDays(forecastStart, index)),
      projectedGmv: round2(projectedGmv),
      movingAverageBase: round2(average),
    };
  });

  return {
    movingAverageDays: lastSeven.length,
    baseDailyAverage: round2(average),
    dailySlope: round2(dailySlope),
    projected30DayGmv: round2(projection.reduce((sum, row) => sum + row.projectedGmv, 0)),
    projection,
  };
};

const summarizeReport = ({ gmvTrend, conversionFunnel, acquisition, categoryPerformance, vendorLeague, paymentBreakdown, refundReturnAnalytics, revenueForecast }) => {
  const totalGmv = gmvTrend.reduce((sum, row) => sum + row.gmv, 0);
  const totalOrders = gmvTrend.reduce((sum, row) => sum + row.orders, 0);
  const totalRefunds = gmvTrend.reduce((sum, row) => sum + row.refunds, 0);
  const delivered = conversionFunnel.find((step) => step.key === "delivered")?.count || 0;

  return {
    totalGmv: round2(totalGmv),
    totalOrders,
    totalRefunds: round2(totalRefunds),
    deliveredOrders: delivered,
    blendedConversionRate: conversionFunnel[0]?.count ? round2((delivered / conversionFunnel[0].count) * 100) : 0,
    newBuyers: acquisition.summary.newBuyers,
    returningBuyers: acquisition.summary.returningBuyers,
    topCategory: categoryPerformance[0]?.categoryName || "N/A",
    topVendor: vendorLeague[0]?.vendorName || "N/A",
    topPaymentMethod: paymentBreakdown[0]?.method || "N/A",
    totalReturns: refundReturnAnalytics.byReason.reduce((sum, row) => sum + row.returns, 0),
    projected30DayGmv: revenueForecast.projected30DayGmv,
  };
};

const buildAdminAnalyticsReport = ({
  orders = [],
  returns = [],
  users = [],
  vendors = [],
  products = [],
  reviews = [],
  sessions = [],
  pageViews = [],
  events = [],
  searchLogs = [],
  marketingSpend = [],
  start,
  end,
  granularity = "day",
  range = "30d",
} = {}) => {
  const gmvTrend = buildGmvTrend({ orders, returns, start, end, granularity });
  const conversionFunnel = buildConversionFunnel({ orders, sessions, pageViews, events, start, end });
  const acquisition = buildCustomerAcquisition({ orders, users, marketingSpend, start, end });
  const categoryPerformance = buildCategoryPerformance({ orders, returns, products, start, end });
  const vendorLeague = buildVendorLeague({ orders, returns, vendors, reviews, products, start, end });
  const paymentBreakdown = buildPaymentBreakdown({ orders, start, end });
  const searchAnalytics = buildSearchAnalytics({ searchLogs, events, start, end });
  const refundReturnAnalytics = buildRefundReturnAnalytics({
    returns,
    categoryPerformance,
    vendorLeague,
    products,
    start,
    end,
    granularity,
  });
  const revenueForecast = buildRevenueForecast({ orders, start, end });

  const report = {
    generatedAt: new Date().toISOString(),
    range: {
      preset: range,
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    },
    gmvTrend,
    conversionFunnel,
    acquisition,
    categoryPerformance,
    vendorLeague,
    paymentBreakdown,
    searchAnalytics,
    refundReturnAnalytics,
    revenueForecast,
  };
  report.summary = summarizeReport(report);
  return report;
};

const loadReportCollections = async (db, range) => {
  const previousStart = addYears(range.start, -1);
  const [
    orders,
    returns,
    users,
    vendors,
    products,
    reviews,
    sessions,
    pageViews,
    analyticsEvents,
    searchAnalytics,
    searchLogs,
    marketingSpend,
  ] = await Promise.all([
    collectionToArray(db, "orders", { createdAt: { $gte: previousStart, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "returns", { createdAt: { $gte: previousStart, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "users", { createdAt: { $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "vendors", {}, { updatedAt: -1 }, 5000),
    collectionToArray(db, "products", {}, { updatedAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "reviews", { createdAt: { $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "analytics_sessions", { createdAt: { $gte: range.start, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "pageViews", { createdAt: { $gte: range.start, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "analytics_events", { createdAt: { $gte: range.start, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "search_analytics", { createdAt: { $gte: range.start, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "search_logs", { createdAt: { $gte: range.start, $lt: range.end } }, { createdAt: -1 }, REPORT_LIMIT),
    collectionToArray(db, "marketing_spend", { date: { $gte: range.start, $lt: range.end } }, { date: -1 }, REPORT_LIMIT),
  ]);

  return {
    orders,
    returns,
    users,
    vendors,
    products,
    reviews,
    sessions,
    pageViews,
    events: analyticsEvents,
    searchLogs: [...searchAnalytics, ...searchLogs],
    marketingSpend,
  };
};

const getReportRows = (report, reportName = "gmvTrend") => {
  const registry = {
    gmvTrend: report.gmvTrend,
    conversionFunnel: report.conversionFunnel,
    acquisition: [report.acquisition.summary],
    cohortRetention: report.acquisition.cohortRetention,
    categoryPerformance: report.categoryPerformance,
    vendorLeague: report.vendorLeague,
    paymentBreakdown: report.paymentBreakdown,
    searchNoResults: report.searchAnalytics.topNoResults,
    searchZeroConversion: report.searchAnalytics.topZeroConversion,
    refundReasons: report.refundReturnAnalytics.byReason,
    returnCategories: report.refundReturnAnalytics.byCategory,
    returnVendors: report.refundReturnAnalytics.byVendor,
    refundTrend: report.refundReturnAnalytics.trend,
    revenueForecast: report.revenueForecast.projection,
  };
  return registry[reportName] || report.gmvTrend;
};

const flattenValue = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const rowsToCsv = (rows = []) => {
  if (rows.length === 0) return "No data\n";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => `"${flattenValue(value).replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
};

const escapePdfText = (value) =>
  flattenValue(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .slice(0, 110);

const textToSimplePdf = (title, lines = []) => {
  const pageLines = [title, "", ...lines].slice(0, 52);
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    ...pageLines.flatMap((line, index) => [
      index === 0 ? "/F1 16 Tf" : "/F1 9 Tf",
      `(${escapePdfText(line)}) Tj`,
      "0 -14 Td",
    ]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let offset = "%PDF-1.3\n".length;
  const body = objects.map((object, index) => {
    const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
    const item = { offset, chunk };
    offset += Buffer.byteLength(chunk);
    return item;
  });
  const xrefStart = offset;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...body.map((item) => `${String(item.offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefStart),
    "%%EOF",
  ].join("\n");

  return Buffer.from(`%PDF-1.3\n${body.map((item) => item.chunk).join("")}${xref}`, "utf8");
};

const rowsToPdf = (reportName, rows = []) => {
  const lines = rows.slice(0, 40).map((row) =>
    Object.entries(row)
      .slice(0, 6)
      .map(([key, value]) => `${key}: ${flattenValue(value)}`)
      .join(" | "),
  );
  return textToSimplePdf(`Amiyo-Go Analytics Report: ${reportName}`, lines.length ? lines : ["No data"]);
};

exports.getAdminAnalyticsReports = async (req, res) => {
  try {
    const range = resolveReportRange(req.query);
    const collections = await loadReportCollections(req.app.locals.db, range);
    const report = buildAdminAnalyticsReport({ ...collections, ...range });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error("Error loading admin analytics reports:", error);
    res.status(500).json({ success: false, error: "Failed to load admin analytics reports" });
  }
};

exports.downloadAdminAnalyticsReport = async (req, res) => {
  try {
    const range = resolveReportRange(req.query);
    const collections = await loadReportCollections(req.app.locals.db, range);
    const report = buildAdminAnalyticsReport({ ...collections, ...range });
    const reportName = req.query.report || "gmvTrend";
    const format = req.query.format === "pdf" ? "pdf" : "csv";
    const rows = getReportRows(report, reportName);

    if (format === "pdf") {
      const pdf = rowsToPdf(reportName, rows);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="analytics-${reportName}.pdf"`);
      return res.send(pdf);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="analytics-${reportName}.csv"`);
    return res.send(rowsToCsv(rows));
  } catch (error) {
    console.error("Error exporting admin analytics report:", error);
    res.status(500).json({ success: false, error: "Failed to export admin analytics report" });
  }
};

exports.getAdminAnalyticsSummary = async (req, res) => {
  try {
    const AnalyticsSummary = req.app.locals.models.AnalyticsSummary;
    const { granularity = "daily", start, end, rebuild } = req.query;

    if (rebuild === "true") {
      await analyticsService.rebuildDailySummary({
        db: req.app.locals.db,
        AnalyticsSummary,
        start,
        end,
      });
    }

    const data = await AnalyticsSummary.findRange({ granularity, start, end });
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error loading analytics summary:", error);
    res.status(500).json({ success: false, error: "Failed to load analytics summary" });
  }
};

exports.rebuildAdminAnalyticsSummary = async (req, res) => {
  try {
    const summaries = await analyticsService.rebuildDailySummary({
      db: req.app.locals.db,
      AnalyticsSummary: req.app.locals.models.AnalyticsSummary,
      start: req.body.start,
      end: req.body.end,
    });

    res.json({
      success: true,
      message: `Rebuilt ${summaries.length} daily analytics summaries`,
      data: summaries,
    });
  } catch (error) {
    console.error("Error rebuilding analytics summary:", error);
    res.status(500).json({ success: false, error: "Failed to rebuild analytics summary" });
  }
};

exports._analyticsTestUtils = {
  buildAdminAnalyticsReport,
  buildCategoryPerformance,
  buildConversionFunnel,
  buildCustomerAcquisition,
  buildGmvTrend,
  buildPaymentBreakdown,
  buildRefundReturnAnalytics,
  buildRevenueForecast,
  buildSearchAnalytics,
  buildVendorLeague,
  getReportRows,
  resolveReportRange,
  rowsToCsv,
  rowsToPdf,
};
