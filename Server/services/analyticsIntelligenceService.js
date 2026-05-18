const { KPI_GROUPS } = require("./analyticsKpiFramework");

const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (value = new Date()) => {
  const date = asDate(value) || new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const dateKey = (date) => startOfDay(date).toISOString().slice(0, 10);

const collectionToArray = async (db, name, query = {}, sort = {}, limit = 50000) => {
  try {
    const collection = db?.collection?.(name);
    if (!collection?.find) return [];
    let cursor = collection.find(query);
    if (Object.keys(sort).length && cursor.sort) cursor = cursor.sort(sort);
    if (limit && cursor.limit) cursor = cursor.limit(limit);
    return cursor.toArray ? await cursor.toArray() : [];
  } catch {
    return [];
  }
};

const unique = (items) => new Set(items.map(normalizeId).filter(Boolean)).size;
const countEvent = (events, eventName) => events.filter((event) => event.eventName === eventName || event.type === eventName).length;
const sum = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);
const orderAmount = (order = {}) => Number(order.totalAmount ?? order.total ?? order.finalTotal ?? order.grandTotal ?? order.amount ?? 0);
const isCancelled = (order = {}) => ["cancelled", "canceled", "failed"].includes(String(order.status || "").toLowerCase());
const isDelivered = (order = {}) => ["delivered", "completed"].includes(String(order.status || "").toLowerCase());
const isPaid = (order = {}) => {
  const payment = String(order.paymentStatus || order.payment?.status || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  return ["paid", "completed", "verified", "captured"].includes(payment) ||
    ["processing", "packed", "ready_to_ship", "shipped", "delivered", "completed"].includes(status);
};
const orderDate = (order = {}) => asDate(order.createdAt || order.placedAt || order.orderDate || order.updatedAt);
const orderItems = (order = {}) => order.products || order.items || order.lineItems || [];
const itemAmount = (item = {}) => Number(item.total ?? item.totalAmount ?? item.lineTotal ?? Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1));
const itemVendorId = (item = {}, order = {}) => normalizeId(item.vendorId || item.sellerId || item.vendor?._id || order.vendorId || "platform");
const itemProductId = (item = {}) => normalizeId(item.productId || item.product?._id || item._id || item.sku || item.name);
const itemCategoryId = (item = {}, order = {}) => normalizeId(item.categoryId || item.category || order.categoryId || "uncategorized");
const userIdOfOrder = (order = {}) => normalizeId(order.userId || order.customerId || order.customer?.id || order.shippingInfo?.email || order.shippingInfo?.phone || `guest:${order._id}`);

const rate = (part, total) => total ? round2((Number(part || 0) / Number(total || 0)) * 100) : 0;

const groupBy = (items, getter) => {
  const map = new Map();
  items.forEach((item) => {
    const key = getter(item);
    if (!key) return;
    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
  });
  return map;
};

const movingAverageForecast = (rows = [], metric = "gmv", days = 7) => {
  const sorted = [...rows].sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));
  const window = sorted.slice(-days);
  const average = window.length ? sum(window, (row) => row[metric]) / window.length : 0;
  const lastDate = sorted.length ? new Date(`${sorted[sorted.length - 1].dateKey}T00:00:00.000Z`) : startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(lastDate, index + 1);
    return {
      dateKey: dateKey(date),
      metric,
      forecast: round2(average),
      method: `${window.length || 0}-day moving average`,
    };
  });
};

class AnalyticsIntelligenceService {
  static resolveRange({ start, end, range = "30d" } = {}) {
    const now = new Date();
    const endDate = startOfDay(end || addDays(now, 1));
    if (start) return { start: startOfDay(start), end: endDate };
    if (range === "7d") return { start: startOfDay(addDays(endDate, -7)), end: endDate };
    if (range === "90d") return { start: startOfDay(addDays(endDate, -90)), end: endDate };
    if (range === "12m") return { start: startOfDay(addDays(endDate, -365)), end: endDate };
    return { start: startOfDay(addDays(endDate, -30)), end: endDate };
  }

  static async loadCollections(db, range = {}) {
    const { start, end } = AnalyticsIntelligenceService.resolveRange(range);
    return {
      start,
      end,
      events: await collectionToArray(db, "event_stream", { timestamp: { $gte: start, $lt: end } }, { timestamp: -1 }),
      orders: await collectionToArray(db, "orders", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      returns: await collectionToArray(db, "returns", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      shipments: await collectionToArray(db, "shipments", { createdAt: { $gte: addDays(start, -30), $lt: end } }, { createdAt: -1 }),
      notifications: [
        ...await collectionToArray(db, "notifications", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
        ...await collectionToArray(db, "notification_queue", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      ],
      redemptions: await collectionToArray(db, "promotion_redemptions", { redeemedAt: { $gte: start, $lt: end } }, { redeemedAt: -1 }),
      promotionSnapshots: await collectionToArray(db, "promotion_snapshots", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      reviews: await collectionToArray(db, "reviews", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      products: await collectionToArray(db, "products", {}, { updatedAt: -1 }, 50000),
      vendors: await collectionToArray(db, "vendors", {}, { updatedAt: -1 }, 20000),
      users: await collectionToArray(db, "users", { createdAt: { $lt: end } }, { createdAt: -1 }, 50000),
      riskProfiles: await collectionToArray(db, "risk_profiles", {}, { updatedAt: -1 }, 20000),
      reports: await collectionToArray(db, "reports", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      disputes: await collectionToArray(db, "trust_disputes", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      enforcements: await collectionToArray(db, "enforcements", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      appeals: await collectionToArray(db, "appeals", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      payoutHolds: await collectionToArray(db, "payout_holds", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }),
      orderFacts: await collectionToArray(db, "fact_orders_daily", { dateKey: { $gte: dateKey(start), $lte: dateKey(addDays(end, -1)) } }, { dateKey: 1 }),
      jobRuns: await collectionToArray(db, "analytics_job_runs", {}, { startedAt: -1 }, 50),
      deadLetters: await collectionToArray(db, "event_dead_letter_queue", { createdAt: { $gte: start, $lt: end } }, { createdAt: -1 }, 1000),
      experiments: await collectionToArray(db, "experiment_assignments", {}, { assignedAt: -1 }, 50000),
    };
  }

  static buildCustomerFunnel({ events = [], orders = [] } = {}) {
    const sessions = unique(events.map((event) => event.sessionId || event.anonymousId));
    const productViews = countEvent(events, "product_viewed");
    const addToCart = countEvent(events, "add_to_cart");
    const checkoutStarted = countEvent(events, "checkout_started");
    const paymentSelected = countEvent(events, "payment_method_selected");
    const placed = orders.length || countEvent(events, "order_placed");
    const paid = orders.filter(isPaid).length || countEvent(events, "order_paid");
    const delivered = orders.filter(isDelivered).length || countEvent(events, "order_delivered");
    const steps = [
      { key: "sessions", label: "Sessions", count: sessions },
      { key: "productViews", label: "Product views", count: productViews },
      { key: "addToCart", label: "Add to cart", count: addToCart },
      { key: "checkoutStarted", label: "Checkout started", count: checkoutStarted },
      { key: "paymentSelected", label: "Payment selected", count: paymentSelected },
      { key: "orderPlaced", label: "Order placed", count: placed },
      { key: "orderPaid", label: "Order paid", count: paid },
      { key: "orderDelivered", label: "Order delivered", count: delivered },
    ];
    return steps.map((step, index) => {
      const previous = index === 0 ? step.count : steps[index - 1].count;
      return {
        ...step,
        conversionFromPrevious: index === 0 ? 100 : rate(step.count, previous),
        conversionFromSession: index === 0 ? 100 : rate(step.count, sessions),
        dropOff: index === 0 ? 0 : Math.max(0, previous - step.count),
      };
    });
  }

  static buildSearchAnalytics({ events = [], orders = [] } = {}) {
    const searches = events.filter((event) => ["search_performed", "search_no_result"].includes(event.eventName) || event.query);
    const grouped = groupBy(searches, (event) => String(event.query || event.metadata?.query || "").trim().toLowerCase());
    const queryRows = [...grouped.entries()].map(([query, rows]) => {
      const zeroResults = rows.filter((row) => row.eventName === "search_no_result" || Number(row.resultCount ?? row.metadata?.resultCount ?? 1) === 0).length;
      const clicks = rows.filter((row) => row.metadata?.clickedProductId || row.eventName === "product_viewed").length;
      const addToCart = rows.filter((row) => row.metadata?.convertedToCart).length;
      return {
        query,
        searches: rows.length,
        zeroResults,
        zeroResultRate: rate(zeroResults, rows.length),
        ctr: rate(clicks, rows.length),
        addToCart,
        queryToPurchaseRate: rate(orders.filter((order) => String(order.searchQuery || "").toLowerCase() === query).length, rows.length),
      };
    }).filter((row) => row.query);
    return {
      totalSearches: searches.length,
      zeroResultSearches: queryRows.reduce((total, row) => total + row.zeroResults, 0),
      zeroResultRate: rate(queryRows.reduce((total, row) => total + row.zeroResults, 0), searches.length),
      topQueries: queryRows.sort((a, b) => b.searches - a.searches).slice(0, 15),
      lowQualityQueries: queryRows.filter((row) => row.zeroResultRate >= 50 || row.ctr === 0).slice(0, 15),
    };
  }

  static buildProductPerformance({ events = [], orders = [], returns = [], reviews = [], products = [] } = {}) {
    const productMap = new Map(products.map((product) => [normalizeId(product._id || product.id || product.sku), {
      productId: normalizeId(product._id || product.id || product.sku),
      title: product.title || product.name || "Product",
      vendorId: normalizeId(product.vendorId || product.sellerId),
      categoryId: normalizeId(product.categoryId || product.category),
      impressions: 0,
      views: 0,
      addToCart: 0,
      orders: 0,
      gmv: 0,
      returns: 0,
      ratingTotal: 0,
      reviewCount: 0,
      stockoutCount: product.stock === 0 || product.quantity === 0 ? 1 : 0,
    }]));
    const ensure = (productId) => {
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,
          title: "Product",
          vendorId: "",
          categoryId: "",
          impressions: 0,
          views: 0,
          addToCart: 0,
          orders: 0,
          gmv: 0,
          returns: 0,
          ratingTotal: 0,
          reviewCount: 0,
          stockoutCount: 0,
        });
      }
      return productMap.get(productId);
    };
    events.forEach((event) => {
      const productId = normalizeId(event.resource?.productId || event.productId);
      if (!productId) return;
      const row = ensure(productId);
      if (event.eventName === "product_viewed") row.views += 1;
      if (event.eventName === "add_to_cart") row.addToCart += 1;
    });
    orders.filter((order) => !isCancelled(order)).forEach((order) => {
      orderItems(order).forEach((item) => {
        const row = ensure(itemProductId(item));
        row.orders += 1;
        row.gmv += itemAmount(item);
      });
    });
    returns.forEach((returnDoc) => {
      (returnDoc.products || returnDoc.items || [{ productId: returnDoc.productId }]).forEach((item) => {
        ensure(itemProductId(item)).returns += 1;
      });
    });
    reviews.forEach((review) => {
      const productId = normalizeId(review.productId || review.product?._id);
      if (!productId) return;
      const row = ensure(productId);
      row.ratingTotal += Number(review.rating || 0);
      row.reviewCount += 1;
    });
    return [...productMap.values()]
      .map((row) => ({
        ...row,
        gmv: round2(row.gmv),
        addToCartRate: rate(row.addToCart, row.views),
        conversionRate: rate(row.orders, row.views),
        returnRate: rate(row.returns, row.orders),
        ratingAverage: row.reviewCount ? round2(row.ratingTotal / row.reviewCount) : 0,
        promotionDependency: 0,
      }))
      .sort((a, b) => b.gmv - a.gmv || b.views - a.views)
      .slice(0, 50);
  }

  static buildCustomerSegments({ events = [], orders = [], returns = [], notifications = [] } = {}) {
    const byCustomer = groupBy(orders, userIdOfOrder);
    return [...byCustomer.entries()].map(([customerId, customerOrders]) => {
      const delivered = customerOrders.filter(isDelivered);
      const totalSpend = sum(delivered, orderAmount);
      const customerEvents = events.filter((event) => normalizeId(event.userId || event.actor?.actorId) === customerId);
      const customerReturns = returns.filter((row) => normalizeId(row.userId || row.customerId) === customerId);
      const notificationEvents = notifications.filter((row) => normalizeId(row.userId || row.customerId || row.recipientId) === customerId);
      const segments = [];
      if (delivered.length === 0) segments.push("first_time_buyer");
      if (delivered.length >= 2) segments.push("repeat_buyer");
      if (totalSpend >= 20000) segments.push("high_ltv");
      if (customerEvents.some((event) => event.eventName === "voucher_applied")) segments.push("voucher_driven_buyer");
      if (customerOrders.filter((order) => String(order.paymentMethod || "").toLowerCase().includes("cod")).length >= 2) segments.push("cod_heavy_buyer");
      if (customerReturns.length >= 3) segments.push("high_return_risk_buyer");
      return {
        customerId,
        lifetimeValue: round2(totalSpend),
        orders: customerOrders.length,
        averageBasketSize: delivered.length ? round2(totalSpend / delivered.length) : 0,
        returnFrequency: customerReturns.length,
        notificationEngagement: notificationEvents.length,
        categoryPreference: AnalyticsIntelligenceService.topCategory(customerOrders),
        preferredPaymentType: AnalyticsIntelligenceService.topPayment(customerOrders),
        segments,
      };
    }).sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 100);
  }

  static topCategory(orders = []) {
    const counts = new Map();
    orders.forEach((order) => orderItems(order).forEach((item) => {
      const categoryId = itemCategoryId(item, order);
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
    }));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
  }

  static topPayment(orders = []) {
    const counts = new Map();
    orders.forEach((order) => {
      const method = String(order.paymentMethod || order.payment?.method || "unknown").toLowerCase();
      counts.set(method, (counts.get(method) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
  }

  static buildVendorScorecards({ orders = [], returns = [], vendors = [], reviews = [], shipments = [], redemptions = [] } = {}) {
    const vendorRows = new Map(vendors.map((vendor) => [normalizeId(vendor._id || vendor.id), {
      vendorId: normalizeId(vendor._id || vendor.id),
      vendorName: vendor.shopName || vendor.businessName || vendor.name || "Vendor",
      gmv: 0,
      netPayout: 0,
      orders: new Set(),
      cancellations: 0,
      returns: 0,
      returnAmount: 0,
      ratingTotal: 0,
      reviewCount: 0,
      fulfilmentEvents: 0,
      voucherUsage: 0,
      campaignGmv: 0,
      repeatBuyers: new Set(),
      buyerOrders: new Map(),
    }]));
    const ensure = (vendorId) => {
      if (!vendorRows.has(vendorId)) {
        vendorRows.set(vendorId, {
          vendorId,
          vendorName: "Vendor",
          gmv: 0,
          netPayout: 0,
          orders: new Set(),
          cancellations: 0,
          returns: 0,
          returnAmount: 0,
          ratingTotal: 0,
          reviewCount: 0,
          fulfilmentEvents: 0,
          voucherUsage: 0,
          campaignGmv: 0,
          repeatBuyers: new Set(),
          buyerOrders: new Map(),
        });
      }
      return vendorRows.get(vendorId);
    };
    orders.forEach((order) => {
      orderItems(order).forEach((item) => {
        const vendorId = itemVendorId(item, order);
        const row = ensure(vendorId);
        row.orders.add(normalizeId(order._id || order.orderId));
        if (isCancelled(order)) row.cancellations += 1;
        if (!isCancelled(order)) row.gmv += itemAmount(item);
        row.netPayout += Number(item.vendorEarning || item.vendorAmount || itemAmount(item) - Number(item.adminCommissionAmount || 0));
        const buyerId = userIdOfOrder(order);
        row.buyerOrders.set(buyerId, (row.buyerOrders.get(buyerId) || 0) + 1);
      });
    });
    returns.forEach((returnDoc) => {
      const row = ensure(normalizeId(returnDoc.vendorId || returnDoc.sellerId || "platform"));
      row.returns += 1;
      row.returnAmount += Number(returnDoc.refundAmount || returnDoc.amount || 0);
    });
    reviews.forEach((review) => {
      const vendorId = normalizeId(review.vendorId || review.sellerId);
      if (!vendorId) return;
      const row = ensure(vendorId);
      row.ratingTotal += Number(review.rating || 0);
      row.reviewCount += 1;
    });
    shipments.forEach((shipment) => {
      const vendorId = normalizeId(shipment.vendorId);
      if (!vendorId) return;
      ensure(vendorId).fulfilmentEvents += 1;
    });
    redemptions.forEach((redemption) => {
      const vendorId = normalizeId(redemption.vendorId || redemption.snapshot?.vendorId);
      if (!vendorId) return;
      const row = ensure(vendorId);
      row.voucherUsage += 1;
      row.campaignGmv += Number(redemption.orderTotal || redemption.gmv || 0);
    });
    return [...vendorRows.values()].map((row) => {
      row.buyerOrders.forEach((count, buyerId) => {
        if (count >= 2) row.repeatBuyers.add(buyerId);
      });
      return {
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        gmv: round2(row.gmv),
        netPayout: round2(row.netPayout - row.returnAmount),
        orderCount: row.orders.size,
        cancellationRate: rate(row.cancellations, row.orders.size),
        returnRate: rate(row.returns, row.orders.size),
        reviewScore: row.reviewCount ? round2(row.ratingTotal / row.reviewCount) : 0,
        fulfilmentSlaSignals: row.fulfilmentEvents,
        voucherUsage: row.voucherUsage,
        campaignGmv: round2(row.campaignGmv),
        repeatBuyerRatio: rate(row.repeatBuyers.size, row.buyerOrders.size),
      };
    }).sort((a, b) => b.gmv - a.gmv);
  }

  static buildCampaignAnalytics({ events = [], redemptions = [], promotionSnapshots = [], orders = [] } = {}) {
    const impressions = events.filter((event) => ["flash_sale_clicked", "voucher_applied"].includes(event.eventName));
    const influencedOrders = unique([...redemptions.map((row) => row.orderId), ...promotionSnapshots.map((row) => row.orderId)]);
    const influencedGmv = sum(orders.filter((order) => redemptions.some((row) => normalizeId(row.orderId) === normalizeId(order._id))), orderAmount);
    const subsidyCost = sum(redemptions, (row) => row.discountAmount);
    return {
      impressions: impressions.length,
      clicks: events.filter((event) => ["flash_sale_clicked", "voucher_applied"].includes(event.eventName)).length,
      clickThroughRate: rate(events.filter((event) => ["flash_sale_clicked", "voucher_applied"].includes(event.eventName)).length, impressions.length),
      redemptionCount: redemptions.length,
      ordersInfluenced: influencedOrders,
      gmvInfluenced: round2(influencedGmv),
      subsidyCost: round2(subsidyCost),
      aovChangeSignal: influencedOrders ? round2(influencedGmv / influencedOrders) : 0,
    };
  }

  static buildNotificationAnalytics({ events = [], notifications = [] } = {}) {
    const sent = notifications.filter((row) => ["sent", "queued", "delivered"].includes(String(row.status || "").toLowerCase())).length;
    const delivered = notifications.filter((row) => String(row.status || "").toLowerCase() === "delivered").length;
    const failed = notifications.filter((row) => String(row.status || "").toLowerCase() === "failed").length;
    const opened = countEvent(events, "notification_opened");
    const clicked = countEvent(events, "notification_clicked");
    return {
      sent,
      delivered,
      failed,
      opened,
      clicked,
      openRate: rate(opened, delivered || sent),
      clickThroughRate: rate(clicked, opened),
      failureRate: rate(failed, sent),
      channelPerformance: [...groupBy(notifications, (row) => row.channel || row.metadata?.channel || "unknown").entries()].map(([channel, rows]) => ({
        channel,
        sent: rows.length,
        failed: rows.filter((row) => String(row.status || "").toLowerCase() === "failed").length,
      })),
    };
  }

  static buildLogisticsAnalytics({ shipments = [] } = {}) {
    const delivered = shipments.filter((row) => ["delivered"].includes(row.shipment_state || row.shipmentState));
    const failed = shipments.filter((row) => ["delivery_failed", "failed"].includes(row.shipment_state || row.shipmentState));
    const rto = shipments.filter((row) => ["return_to_origin", "rto"].includes(row.shipment_state || row.shipmentState));
    const codPending = shipments.filter((row) => ["cod_pending", "pending"].includes(row.cod_state || row.codState));
    const codCollected = shipments.filter((row) => ["cod_collected", "collected"].includes(row.cod_state || row.codState));
    return {
      shipments: shipments.length,
      delivered: delivered.length,
      failedDeliveries: failed.length,
      deliverySuccessRate: rate(delivered.length, shipments.length),
      failedDeliveryRate: rate(failed.length, shipments.length),
      rtoRate: rate(rto.length, shipments.length),
      codExposure: round2(sum([...codPending, ...codCollected], (row) => row.cod_amount || row.codAmount)),
      courierPerformance: [...groupBy(shipments, (row) => row.courier_code || row.courierCode || row.courierId || "unassigned").entries()].map(([courier, rows]) => ({
        courier,
        shipments: rows.length,
        delivered: rows.filter((row) => ["delivered"].includes(row.shipment_state || row.shipmentState)).length,
        successRate: rate(rows.filter((row) => ["delivered"].includes(row.shipment_state || row.shipmentState)).length, rows.length),
      })),
    };
  }

  static buildTrustAnalytics({ riskProfiles = [], reports = [], disputes = [], enforcements = [], appeals = [], payoutHolds = [] } = {}) {
    const highRisk = riskProfiles.filter((row) => ["high", "critical"].includes(row.riskLevel));
    return {
      flaggedSubjects: highRisk.length,
      flaggedVendors: highRisk.filter((row) => row.subjectType === "vendor").length,
      flaggedCustomers: highRisk.filter((row) => ["customer", "user"].includes(row.subjectType)).length,
      reportVolume: reports.length,
      disputeVolume: disputes.length,
      disputeRateSignal: reports.length ? rate(disputes.length, reports.length) : 0,
      payoutHolds: payoutHolds.filter((row) => row.status !== "released").length,
      appealVolume: appeals.length,
      enforcementVolume: enforcements.length,
      topViolationReasons: [...groupBy([...reports, ...enforcements], (row) => row.reasonCode || row.policyViolated || row.reason || "unknown").entries()]
        .map(([reason, rows]) => ({ reason, count: rows.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  static buildFinanceAnalytics({ orders = [], returns = [], redemptions = [], payoutHolds = [] } = {}) {
    const activeOrders = orders.filter((order) => !isCancelled(order));
    const gmv = sum(activeOrders, orderAmount);
    const commissionRevenue = activeOrders.reduce((total, order) => total + orderItems(order).reduce((itemTotal, item) => itemTotal + Number(item.adminCommissionAmount || item.commissionAmount || 0), 0), 0);
    const refundCost = sum(returns, (row) => row.refundAmount || row.amount);
    const promoSubsidy = sum(redemptions, (row) => row.discountAmount);
    const payoutLiability = sum(activeOrders, (order) => order.vendorPayable || order.vendorEarning || 0);
    return {
      grossRevenue: round2(gmv),
      netMarketplaceRevenue: round2(commissionRevenue - refundCost - promoSubsidy),
      commissionRevenue: round2(commissionRevenue),
      promoSubsidyCost: round2(promoSubsidy),
      refundCost: round2(refundCost),
      payoutLiability: round2(payoutLiability),
      payoutHolds: payoutHolds.length,
      grossMarginAfterLeakage: gmv ? rate(commissionRevenue - refundCost - promoSubsidy, gmv) : 0,
    };
  }

  static buildCohorts({ orders = [] } = {}) {
    const byCustomer = groupBy(orders.filter((order) => orderDate(order)), userIdOfOrder);
    const cohorts = new Map();
    byCustomer.forEach((customerOrders) => {
      const sorted = customerOrders.sort((a, b) => orderDate(a) - orderDate(b));
      const first = orderDate(sorted[0]);
      const key = first.toISOString().slice(0, 7);
      const current = cohorts.get(key) || { cohort: key, customers: 0, repeat30d: 0, repeatRevenue: 0 };
      current.customers += 1;
      const repeat = sorted.find((order) => orderDate(order) > first && orderDate(order) <= addDays(first, 30));
      if (repeat) {
        current.repeat30d += 1;
        current.repeatRevenue += orderAmount(repeat);
      }
      cohorts.set(key, current);
    });
    return [...cohorts.values()].map((row) => ({
      ...row,
      repeat30dRate: rate(row.repeat30d, row.customers),
      repeatRevenue: round2(row.repeatRevenue),
    })).sort((a, b) => a.cohort.localeCompare(b.cohort));
  }

  static buildDataQuality({ events = [], jobRuns = [], deadLetters = [], orderFacts = [], start, end } = {}) {
    const duplicateKeys = new Map();
    events.forEach((event) => {
      if (!event.dedupeKey) return;
      duplicateKeys.set(event.dedupeKey, (duplicateKeys.get(event.dedupeKey) || 0) + 1);
    });
    const latestJob = jobRuns[0] || null;
    const stale = !latestJob?.completedAt || new Date(end).getTime() - new Date(latestJob.completedAt).getTime() > 36 * 60 * 60 * 1000;
    const expectedDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
    const checks = [
      {
        key: "event_dead_letters",
        status: deadLetters.length ? "warning" : "pass",
        value: deadLetters.length,
        message: deadLetters.length ? "Rejected analytics events need review." : "No rejected analytics events.",
      },
      {
        key: "duplicate_events",
        status: [...duplicateKeys.values()].some((count) => count > 1) ? "warning" : "pass",
        value: [...duplicateKeys.values()].filter((count) => count > 1).length,
        message: "Duplicate event keys should stay near zero.",
      },
      {
        key: "warehouse_freshness",
        status: stale ? "warning" : "pass",
        value: latestJob?.completedAt || null,
        message: stale ? "Latest analytics warehouse job is stale." : "Analytics warehouse job is fresh.",
      },
      {
        key: "fact_coverage",
        status: orderFacts.length < expectedDays ? "warning" : "pass",
        value: `${orderFacts.length}/${expectedDays}`,
        message: "Daily order fact coverage for selected range.",
      },
    ];
    return {
      status: checks.some((check) => check.status === "warning") ? "warning" : "healthy",
      checks,
      latestJob,
    };
  }

  static buildExperimentAnalytics({ events = [], experiments = [] } = {}) {
    const exposures = events.filter((event) => event.eventName === "experiment_exposed");
    const conversions = events.filter((event) => event.eventName === "experiment_converted");
    const byExperiment = groupBy([...exposures, ...conversions], (event) => event.experiment?.key || event.resource?.experimentKey || event.experimentKey || "default");
    return [...byExperiment.entries()].map(([experimentKey, rows]) => {
      const byVariant = groupBy(rows, (row) => row.experiment?.variant || row.variant || "control");
      return {
        experimentKey,
        assignments: experiments.filter((row) => row.experimentKey === experimentKey).length,
        variants: [...byVariant.entries()].map(([variant, variantRows]) => {
          const cleanExposureCount = variantRows.filter((row) => row.eventName === "experiment_exposed").length;
          const conversionCount = variantRows.filter((row) => row.eventName === "experiment_converted").length;
          return {
            variant,
            exposureCount: cleanExposureCount,
            conversionCount,
            conversionRate: rate(conversionCount, cleanExposureCount),
            revenuePerUser: cleanExposureCount ? round2(sum(variantRows, (row) => row.orderValue) / cleanExposureCount) : 0,
            confidenceIndicator: cleanExposureCount >= 100 ? "usable" : "directional",
          };
        }),
      };
    });
  }

  static buildReportCenter() {
    return [
      { key: "customer_funnel", title: "Customer Funnel", roles: ["admin"], formats: ["csv", "pdf"], scheduleable: true },
      { key: "search_discovery", title: "Search And Discovery", roles: ["admin", "marketing"], formats: ["csv"], scheduleable: true },
      { key: "product_performance", title: "Product Performance", roles: ["admin", "vendor"], formats: ["csv"], scheduleable: true },
      { key: "vendor_scorecards", title: "Vendor Scorecards", roles: ["admin"], formats: ["csv", "pdf"], scheduleable: true },
      { key: "campaign_analytics", title: "Campaign Analytics", roles: ["admin", "vendor"], formats: ["csv"], scheduleable: true },
      { key: "notification_analytics", title: "Notification Analytics", roles: ["admin"], formats: ["csv"], scheduleable: true },
      { key: "logistics_efficiency", title: "Logistics Efficiency", roles: ["admin", "vendor"], formats: ["csv"], scheduleable: true },
      { key: "trust_risk", title: "Trust And Risk", roles: ["admin"], formats: ["csv"], scheduleable: false },
      { key: "finance_profitability", title: "Finance Profitability", roles: ["admin", "finance"], formats: ["csv", "pdf"], scheduleable: true },
      { key: "cohort_retention", title: "Cohort Retention", roles: ["admin", "marketing"], formats: ["csv"], scheduleable: true },
    ];
  }

  static buildDashboard(collections) {
    const activeOrders = collections.orders.filter((order) => !isCancelled(order));
    const gmv = sum(activeOrders, orderAmount);
    const customerFunnel = AnalyticsIntelligenceService.buildCustomerFunnel(collections);
    const vendorScorecards = AnalyticsIntelligenceService.buildVendorScorecards(collections);
    const finance = AnalyticsIntelligenceService.buildFinanceAnalytics(collections);
    const orderFacts = collections.orderFacts.length ? collections.orderFacts : activeOrders.map((order) => ({
      dateKey: dateKey(orderDate(order) || new Date()),
      gmv: orderAmount(order),
      orders: 1,
    }));
    return {
      generatedAt: new Date().toISOString(),
      range: {
        start: collections.start.toISOString(),
        end: collections.end.toISOString(),
      },
      kpis: KPI_GROUPS,
      summary: {
        totalGmv: round2(gmv),
        orders: collections.orders.length,
        paidOrders: collections.orders.filter(isPaid).length,
        deliveredOrders: collections.orders.filter(isDelivered).length,
        activeCustomers: unique([...collections.events.map((event) => event.userId || event.actor?.actorId), ...collections.orders.map(userIdOfOrder)]),
        activeVendors: vendorScorecards.filter((vendor) => vendor.orderCount > 0).length,
        commissionRevenue: finance.commissionRevenue,
        refundCost: finance.refundCost,
      },
      customerFunnel,
      search: AnalyticsIntelligenceService.buildSearchAnalytics(collections),
      products: AnalyticsIntelligenceService.buildProductPerformance(collections),
      customers: AnalyticsIntelligenceService.buildCustomerSegments(collections),
      vendors: vendorScorecards,
      campaigns: AnalyticsIntelligenceService.buildCampaignAnalytics(collections),
      notifications: AnalyticsIntelligenceService.buildNotificationAnalytics(collections),
      logistics: AnalyticsIntelligenceService.buildLogisticsAnalytics(collections),
      trust: AnalyticsIntelligenceService.buildTrustAnalytics(collections),
      finance,
      cohorts: AnalyticsIntelligenceService.buildCohorts(collections),
      forecasts: {
        gmv: movingAverageForecast(orderFacts, "gmv"),
        orders: movingAverageForecast(orderFacts, "orders"),
      },
      dataQuality: AnalyticsIntelligenceService.buildDataQuality(collections),
      experiments: AnalyticsIntelligenceService.buildExperimentAnalytics(collections),
      reportCenter: AnalyticsIntelligenceService.buildReportCenter(),
    };
  }

  static async getDashboard(db, range = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const collections = await AnalyticsIntelligenceService.loadCollections(db, range);
    return AnalyticsIntelligenceService.buildDashboard(collections);
  }
}

module.exports = AnalyticsIntelligenceService;
module.exports._test = {
  dateKey,
  movingAverageForecast,
  rate,
};
