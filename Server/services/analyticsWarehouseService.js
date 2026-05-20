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

const upsertOne = async (db, collectionName, query, doc) => {
  const now = new Date();
  const update = { $set: { ...doc, updatedAt: now } };
  if (!Object.prototype.hasOwnProperty.call(doc || {}, "createdAt")) {
    update.$setOnInsert = { createdAt: now };
  }

  return db.collection(collectionName).updateOne(query, update, { upsert: true });
};

const eventCount = (events, name) => events.filter((event) => event.eventName === name || event.type === name).length;
const unique = (items) => new Set(items.map(normalizeId).filter(Boolean));

const isCancelled = (order = {}) => ["cancelled", "canceled", "failed"].includes(String(order.status || "").toLowerCase());
const isDelivered = (order = {}) => ["delivered", "completed"].includes(String(order.status || "").toLowerCase());
const isPaid = (order = {}) => {
  const payment = String(order.paymentStatus || order.payment?.status || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  return ["paid", "completed", "verified", "captured"].includes(payment) ||
    ["processing", "packed", "ready_to_ship", "shipped", "delivered", "completed"].includes(status);
};
const orderAmount = (order = {}) => Number(order.totalAmount ?? order.total ?? order.finalTotal ?? order.grandTotal ?? order.amount ?? 0);
const orderDate = (order = {}) => asDate(order.createdAt || order.placedAt || order.orderDate || order.updatedAt);

const orderItems = (order = {}) => {
  const items = order.products || order.items || order.lineItems || [];
  if (items.length) return items;
  return [{
    productId: order.productId || "order-total",
    vendorId: order.vendorId || "platform",
    categoryId: order.categoryId || "uncategorized",
    price: orderAmount(order),
    quantity: 1,
    total: orderAmount(order),
  }];
};

const itemAmount = (item = {}) => {
  const quantity = Number(item.quantity || item.qty || 1);
  return Number(item.total ?? item.totalAmount ?? item.lineTotal ?? item.subtotal ?? Number(item.price || item.unitPrice || 0) * quantity);
};

const itemVendorId = (item = {}, order = {}) => normalizeId(item.vendorId || item.sellerId || item.vendor?._id || order.vendorId || "platform");
const itemProductId = (item = {}) => normalizeId(item.productId || item.product?._id || item._id || item.sku || item.name);
const itemCategoryId = (item = {}, product = {}) => normalizeId(item.categoryId || item.category || product.categoryId || product.category?._id || "uncategorized");

const buildDimDate = (start, end) => ({
  dateKey: dateKey(start),
  date: start,
  year: start.getUTCFullYear(),
  month: start.getUTCMonth() + 1,
  day: start.getUTCDate(),
  weekday: start.getUTCDay(),
  periodStart: start,
  periodEnd: end,
});

class AnalyticsWarehouseService {
  static async loadDayCollections(db, start, end) {
    const previousStart = addDays(start, -60);
    const [
      events,
      orders,
      returns,
      shipments,
      notifications,
      notificationQueue,
      promotionRedemptions,
      promotionSnapshots,
      reviews,
      searches,
      users,
      vendors,
      products,
      categories,
      couriers,
      campaigns,
    ] = await Promise.all([
      collectionToArray(db, "event_stream", { timestamp: { $gte: start, $lt: end } }),
      collectionToArray(db, "orders", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "returns", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "shipments", { createdAt: { $gte: previousStart, $lt: end } }),
      collectionToArray(db, "notifications", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "notification_queue", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "promotion_redemptions", { redeemedAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "promotion_snapshots", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "reviews", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "search_analytics", { createdAt: { $gte: start, $lt: end } }),
      collectionToArray(db, "users", { createdAt: { $lt: end } }, {}, 100000),
      collectionToArray(db, "vendors", {}, {}, 100000),
      collectionToArray(db, "products", {}, {}, 100000),
      collectionToArray(db, "categories", {}, {}, 100000),
      collectionToArray(db, "couriers", {}, {}, 10000),
      collectionToArray(db, "campaigns", {}, {}, 10000),
    ]);

    return {
      events,
      orders,
      returns,
      shipments,
      notifications: [...notifications, ...notificationQueue],
      promotionRedemptions,
      promotionSnapshots,
      reviews,
      searches,
      users,
      vendors,
      products,
      categories,
      couriers,
      campaigns,
    };
  }

  static buildFacts({ start, end, collections }) {
    const key = dateKey(start);
    const { events, orders, returns, shipments, notifications, promotionRedemptions, promotionSnapshots, reviews, searches, products } = collections;
    const activeOrders = orders.filter((order) => !isCancelled(order));
    const paidOrders = orders.filter(isPaid);
    const deliveredOrders = orders.filter(isDelivered);
    const gmv = activeOrders.reduce((sum, order) => sum + orderAmount(order), 0);
    const commissionRevenue = activeOrders.reduce((sum, order) =>
      sum + orderItems(order).reduce((itemSum, item) => itemSum + Number(item.adminCommissionAmount || item.commissionAmount || 0), 0), 0);
    const productLookup = new Map(products.map((product) => [normalizeId(product._id || product.id || product.sku), product]));

    const customerActivity = {
      dateKey: key,
      sessions: unique(events.map((event) => event.sessionId || event.anonymousId)).size,
      activeActors: unique(events.map((event) => event.userId || event.actor?.actorId)).size,
      homepageViews: eventCount(events, "homepage_viewed"),
      categoryViews: eventCount(events, "category_viewed"),
      productViews: eventCount(events, "product_viewed"),
      addToCart: eventCount(events, "add_to_cart"),
      checkoutStarted: eventCount(events, "checkout_started"),
      paymentSelected: eventCount(events, "payment_method_selected"),
      wishlistAdds: eventCount(events, "wishlist_added"),
      notificationOpens: eventCount(events, "notification_opened"),
      placedOrders: orders.length,
      paidOrders: paidOrders.length,
      deliveredOrders: deliveredOrders.length,
      conversionRate: 0,
      addToCartRate: 0,
      checkoutCompletionRate: 0,
      periodStart: start,
      periodEnd: end,
    };
    customerActivity.conversionRate = customerActivity.sessions ? round2((customerActivity.paidOrders / customerActivity.sessions) * 100) : 0;
    customerActivity.addToCartRate = customerActivity.productViews ? round2((customerActivity.addToCart / customerActivity.productViews) * 100) : 0;
    customerActivity.checkoutCompletionRate = customerActivity.checkoutStarted ? round2((customerActivity.placedOrders / customerActivity.checkoutStarted) * 100) : 0;

    const ordersDaily = {
      dateKey: key,
      orders: orders.length,
      paidOrders: paidOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: orders.filter(isCancelled).length,
      activeCustomers: unique(orders.map((order) => order.userId || order.customerId || order.shippingInfo?.email)).size,
      gmv: round2(gmv),
      commissionRevenue: round2(commissionRevenue),
      averageOrderValue: activeOrders.length ? round2(gmv / activeOrders.length) : 0,
      periodStart: start,
      periodEnd: end,
    };

    const vendorMap = new Map();
    activeOrders.forEach((order) => {
      orderItems(order).forEach((item) => {
        const vendorId = itemVendorId(item, order);
        const current = vendorMap.get(vendorId) || {
          dateKey: key,
          vendorId,
          orders: new Set(),
          gmv: 0,
          units: 0,
          commissionRevenue: 0,
          cancelledOrders: 0,
          returnAmount: 0,
          returnCount: 0,
        };
        current.orders.add(normalizeId(order._id || order.orderId));
        current.gmv += itemAmount(item);
        current.units += Number(item.quantity || item.qty || 1);
        current.commissionRevenue += Number(item.adminCommissionAmount || item.commissionAmount || 0);
        vendorMap.set(vendorId, current);
      });
    });
    returns.forEach((returnDoc) => {
      const vendorId = normalizeId(returnDoc.vendorId || returnDoc.sellerId || "platform");
      const current = vendorMap.get(vendorId) || {
        dateKey: key,
        vendorId,
        orders: new Set(),
        gmv: 0,
        units: 0,
        commissionRevenue: 0,
        cancelledOrders: 0,
        returnAmount: 0,
        returnCount: 0,
      };
      current.returnAmount += Number(returnDoc.refundAmount || returnDoc.amount || 0);
      current.returnCount += 1;
      vendorMap.set(vendorId, current);
    });
    const vendorSales = [...vendorMap.values()].map((row) => ({
      dateKey: key,
      vendorId: row.vendorId,
      orderCount: row.orders.size,
      gmv: round2(row.gmv),
      netSales: round2(row.gmv - row.returnAmount - row.commissionRevenue),
      commissionRevenue: round2(row.commissionRevenue),
      units: row.units,
      returnCount: row.returnCount,
      returnAmount: round2(row.returnAmount),
      returnRate: row.orders.size ? round2((row.returnCount / row.orders.size) * 100) : 0,
      periodStart: start,
      periodEnd: end,
    }));

    const returnAmount = returns.reduce((sum, row) => sum + Number(row.refundAmount || row.amount || 0), 0);
    const returnsDaily = {
      dateKey: key,
      returnCount: returns.length,
      refundAmount: round2(returnAmount),
      refundRate: gmv ? round2((returnAmount / gmv) * 100) : 0,
      highRiskReturns: returns.filter((row) => ["high", "critical"].includes(row.returnRiskLevel || row.riskLevel)).length,
      periodStart: start,
      periodEnd: end,
    };

    const shipmentsDaily = {
      dateKey: key,
      shipments: shipments.length,
      packed: shipments.filter((row) => row.shipment_state === "packed" || row.shipmentState === "packed").length,
      pickupReady: shipments.filter((row) => ["pickup_ready", "pickupReady"].includes(row.shipment_state || row.shipmentState)).length,
      delivered: shipments.filter((row) => ["delivered"].includes(row.shipment_state || row.shipmentState)).length,
      failed: shipments.filter((row) => ["delivery_failed", "failed"].includes(row.shipment_state || row.shipmentState)).length,
      rto: shipments.filter((row) => ["return_to_origin", "rto"].includes(row.shipment_state || row.shipmentState)).length,
      codPending: shipments.filter((row) => ["cod_pending", "pending"].includes(row.cod_state || row.codState)).length,
      codCollected: shipments.filter((row) => ["cod_collected", "collected"].includes(row.cod_state || row.codState)).length,
      codRemitted: shipments.filter((row) => ["cod_remitted", "remitted", "cod_settled"].includes(row.cod_state || row.codState)).length,
      periodStart: start,
      periodEnd: end,
    };
    shipmentsDaily.deliverySuccessRate = shipmentsDaily.shipments ? round2((shipmentsDaily.delivered / shipmentsDaily.shipments) * 100) : 0;
    shipmentsDaily.rtoRate = shipmentsDaily.shipments ? round2((shipmentsDaily.rto / shipmentsDaily.shipments) * 100) : 0;

    const notificationsDaily = {
      dateKey: key,
      sent: notifications.filter((row) => ["sent", "queued", "delivered"].includes(String(row.status || "").toLowerCase())).length,
      delivered: notifications.filter((row) => String(row.status || "").toLowerCase() === "delivered").length,
      failed: notifications.filter((row) => String(row.status || "").toLowerCase() === "failed").length,
      opened: eventCount(events, "notification_opened"),
      clicked: eventCount(events, "notification_clicked"),
      periodStart: start,
      periodEnd: end,
    };
    notificationsDaily.openRate = notificationsDaily.delivered ? round2((notificationsDaily.opened / notificationsDaily.delivered) * 100) : 0;
    notificationsDaily.clickThroughRate = notificationsDaily.opened ? round2((notificationsDaily.clicked / notificationsDaily.opened) * 100) : 0;

    const promoDiscount = promotionRedemptions.reduce((sum, row) => sum + Number(row.discountAmount || 0), 0);
    const promotionsDaily = {
      dateKey: key,
      redemptions: promotionRedemptions.length,
      snapshots: promotionSnapshots.length,
      subsidyCost: round2(promoDiscount),
      influencedOrders: unique(promotionRedemptions.map((row) => row.orderId)).size || promotionSnapshots.length,
      influencedGmv: round2(promotionRedemptions.reduce((sum, row) => sum + Number(row.orderTotal || row.gmv || 0), 0)),
      periodStart: start,
      periodEnd: end,
    };

    const searchEvents = events.filter((event) => ["search_performed", "search_no_result"].includes(event.eventName));
    const allSearch = [...searchEvents, ...searches];
    const searchDaily = {
      dateKey: key,
      searchCount: allSearch.length,
      zeroResultCount: allSearch.filter((row) => row.eventName === "search_no_result" || Number(row.resultCount || 0) === 0).length,
      addToCartAfterSearch: eventCount(events, "add_to_cart"),
      queryToPurchase: paidOrders.length,
      periodStart: start,
      periodEnd: end,
    };
    searchDaily.zeroResultRate = searchDaily.searchCount ? round2((searchDaily.zeroResultCount / searchDaily.searchCount) * 100) : 0;

    const reviewsDaily = {
      dateKey: key,
      reviewCount: reviews.length,
      approvedReviews: reviews.filter((row) => ["approved", "published"].includes(String(row.status || "").toLowerCase())).length,
      flaggedReviews: reviews.filter((row) => row.flagged || row.moderationStatus === "pending_review").length,
      averageRating: reviews.length ? round2(reviews.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviews.length) : 0,
      periodStart: start,
      periodEnd: end,
    };

    const productFacts = new Map();
    events.filter((event) => event.resource?.productId).forEach((event) => {
      const productId = normalizeId(event.resource.productId);
      const product = productLookup.get(productId) || {};
      const current = productFacts.get(productId) || {
        dateKey: key,
        productId,
        vendorId: normalizeId(product.vendorId || event.resource.vendorId),
        categoryId: normalizeId(product.categoryId || event.resource.categoryId),
        impressions: 0,
        views: 0,
        addToCart: 0,
        orders: 0,
        gmv: 0,
        returns: 0,
      };
      if (event.eventName === "product_viewed") current.views += 1;
      if (event.eventName === "add_to_cart") current.addToCart += 1;
      productFacts.set(productId, current);
    });
    activeOrders.forEach((order) => {
      orderItems(order).forEach((item) => {
        const productId = itemProductId(item);
        const product = productLookup.get(productId) || {};
        const current = productFacts.get(productId) || {
          dateKey: key,
          productId,
          vendorId: itemVendorId(item, order),
          categoryId: itemCategoryId(item, product),
          impressions: 0,
          views: 0,
          addToCart: 0,
          orders: 0,
          gmv: 0,
          returns: 0,
        };
        current.orders += 1;
        current.gmv += itemAmount(item);
        productFacts.set(productId, current);
      });
    });

    return {
      ordersDaily,
      customerActivity,
      vendorSales,
      returnsDaily,
      shipmentsDaily,
      notificationsDaily,
      promotionsDaily,
      searchDaily,
      reviewsDaily,
      productPerformance: [...productFacts.values()].map((row) => ({
        ...row,
        gmv: round2(row.gmv),
        addToCartRate: row.views ? round2((row.addToCart / row.views) * 100) : 0,
        conversionRate: row.views ? round2((row.orders / row.views) * 100) : 0,
        periodStart: start,
        periodEnd: end,
      })),
    };
  }

  static async writeFacts(db, facts) {
    const writes = [];
    const key = facts.ordersDaily.dateKey;
    writes.push(upsertOne(db, "fact_orders_daily", { dateKey: key }, facts.ordersDaily));
    writes.push(upsertOne(db, "fact_customer_activity_daily", { dateKey: key }, facts.customerActivity));
    writes.push(upsertOne(db, "fact_returns_daily", { dateKey: key }, facts.returnsDaily));
    writes.push(upsertOne(db, "fact_shipments_daily", { dateKey: key }, facts.shipmentsDaily));
    writes.push(upsertOne(db, "fact_notifications_daily", { dateKey: key }, facts.notificationsDaily));
    writes.push(upsertOne(db, "fact_promotions_daily", { dateKey: key }, facts.promotionsDaily));
    writes.push(upsertOne(db, "fact_search_daily", { dateKey: key }, facts.searchDaily));
    writes.push(upsertOne(db, "fact_reviews_daily", { dateKey: key }, facts.reviewsDaily));
    facts.vendorSales.forEach((row) => writes.push(upsertOne(db, "fact_vendor_sales_daily", { dateKey: key, vendorId: row.vendorId }, row)));
    facts.productPerformance.forEach((row) => writes.push(upsertOne(db, "fact_product_performance_daily", { dateKey: key, productId: row.productId }, row)));
    await Promise.all(writes);
    return writes.length;
  }

  static async writeDimensions(db, collections, start, end) {
    const writes = [upsertOne(db, "dim_dates", { dateKey: dateKey(start) }, buildDimDate(start, end))];
    collections.users.forEach((user) => writes.push(upsertOne(db, "dim_customers", { customerId: normalizeId(user._id || user.id) }, {
      customerId: normalizeId(user._id || user.id),
      email: user.email || null,
      phone: user.phone || null,
      role: user.role || "customer",
      createdAt: user.createdAt || null,
      status: user.status || "active",
    })));
    collections.vendors.forEach((vendor) => writes.push(upsertOne(db, "dim_vendors", { vendorId: normalizeId(vendor._id || vendor.id) }, {
      vendorId: normalizeId(vendor._id || vendor.id),
      name: vendor.shopName || vendor.businessName || vendor.name || "Vendor",
      status: vendor.status || vendor.adminStatus || "unknown",
      healthScore: Number(vendor.healthScore || 0),
    })));
    collections.products.forEach((product) => writes.push(upsertOne(db, "dim_products", { productId: normalizeId(product._id || product.id || product.sku) }, {
      productId: normalizeId(product._id || product.id || product.sku),
      title: product.title || product.name || product.sku || "Product",
      vendorId: normalizeId(product.vendorId || product.sellerId),
      categoryId: normalizeId(product.categoryId || product.category?._id || product.category),
      status: product.status || product.approvalStatus || "unknown",
    })));
    collections.categories.forEach((category) => writes.push(upsertOne(db, "dim_categories", { categoryId: normalizeId(category._id || category.id || category.slug) }, {
      categoryId: normalizeId(category._id || category.id || category.slug),
      name: category.name || category.title || "Category",
      parentId: normalizeId(category.parentId || category.parent),
    })));
    collections.couriers.forEach((courier) => writes.push(upsertOne(db, "dim_couriers", { courierId: normalizeId(courier._id || courier.id || courier.code) }, {
      courierId: normalizeId(courier._id || courier.id || courier.code),
      name: courier.name || courier.code || "Courier",
      code: courier.code || null,
      active: courier.active !== false,
    })));
    collections.campaigns.forEach((campaign) => writes.push(upsertOne(db, "dim_campaigns", { campaignId: normalizeId(campaign._id || campaign.id) }, {
      campaignId: normalizeId(campaign._id || campaign.id),
      name: campaign.name || campaign.title || "Campaign",
      status: campaign.status || "unknown",
      startsAt: campaign.startsAt || campaign.startDate || null,
      endsAt: campaign.endsAt || campaign.endDate || null,
    })));
    await Promise.all(writes);
    return writes.length;
  }

  static async rebuildDailyFacts({ db, start, end } = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const startDate = startOfDay(start || addDays(new Date(), -7));
    const endDate = startOfDay(end || addDays(new Date(), 1));
    const job = {
      jobType: "analytics.daily_facts.rebuild",
      status: "running",
      startedAt: new Date(),
      range: { start: startDate, end: endDate },
    };
    const jobResult = await db.collection("analytics_job_runs").insertOne(job);
    const jobId = jobResult.insertedId;
    const results = [];
    let rowsWritten = 0;

    try {
      for (let cursor = startDate; cursor < endDate; cursor = addDays(cursor, 1)) {
        const periodEnd = addDays(cursor, 1);
        const collections = await AnalyticsWarehouseService.loadDayCollections(db, cursor, periodEnd);
        const facts = AnalyticsWarehouseService.buildFacts({ start: cursor, end: periodEnd, collections });
        const factRows = await AnalyticsWarehouseService.writeFacts(db, facts);
        const dimRows = await AnalyticsWarehouseService.writeDimensions(db, collections, cursor, periodEnd);
        rowsWritten += factRows + dimRows;
        results.push({
          dateKey: dateKey(cursor),
          factRows,
          dimRows,
          orders: facts.ordersDaily.orders,
          gmv: facts.ordersDaily.gmv,
        });
      }
      await db.collection("analytics_job_runs").updateOne({ _id: jobId }, {
        $set: {
          status: "completed",
          completedAt: new Date(),
          rowsWritten,
          results,
        },
      });
      return { jobId, rowsWritten, results };
    } catch (error) {
      await db.collection("analytics_job_runs").updateOne({ _id: jobId }, {
        $set: {
          status: "failed",
          completedAt: new Date(),
          error: error.message,
        },
      });
      throw error;
    }
  }
}

module.exports = AnalyticsWarehouseService;
module.exports._test = {
  dateKey,
  startOfDay,
  orderAmount,
};
