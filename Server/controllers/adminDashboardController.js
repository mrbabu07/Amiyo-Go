const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  return date;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const dateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeId = (value) => value?.toString?.() || String(value || "unknown");

const getNestedValue = (doc, path) =>
  String(path)
    .split(".")
    .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), doc);

const getOrderAmount = (order) =>
  Number(order.total ?? order.totalAmount ?? order.grandTotal ?? order.subtotal ?? 0);

const getItemAmount = (item) => {
  const quantity = Number(item.quantity || item.qty || 1);
  const price = Number(item.price ?? item.salePrice ?? item.unitPrice ?? 0);
  return Number(item.total ?? item.totalAmount ?? item.subtotal ?? price * quantity);
};

const getItemCommission = (item) =>
  Number(item.adminCommissionAmount ?? item.commissionAmount ?? item.platformCommission ?? 0);

const getOrderCommission = (order) =>
  (order.products || order.items || []).reduce((sum, item) => sum + getItemCommission(item), 0);

const getRefundAmount = (returnDoc) =>
  Number(returnDoc.refundAmount ?? returnDoc.adminRefund ?? returnDoc.amount ?? returnDoc.totalAmount ?? 0);

const percentChange = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return round2(((currentValue - previousValue) / previousValue) * 100);
};

const getOrderCustomerName = (order) =>
  order.customerName || order.shippingInfo?.name || order.userName || order.shippingInfo?.phone || "Customer";

const resolveDateRange = (query = {}) => {
  const now = new Date();
  const preset = query.range || query.period || "7d";

  if (preset === "today") {
    return { preset, start: startOfDay(now), end: endOfDay(now) };
  }

  if (preset === "30d") {
    return { preset, start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
  }

  if (preset === "custom") {
    const start = query.start ? startOfDay(query.start) : startOfDay(addDays(now, -6));
    const end = query.end ? endOfDay(query.end) : endOfDay(now);
    return { preset, start, end };
  }

  return { preset: "7d", start: startOfDay(addDays(now, -6)), end: endOfDay(now) };
};

const safeCollection = (db, name) => {
  try {
    return db.collection(name);
  } catch {
    return null;
  }
};

const safeCount = async (collection, query = {}) => {
  try {
    return collection?.countDocuments ? await collection.countDocuments(query) : 0;
  } catch {
    return 0;
  }
};

const safeFind = async (collection, query = {}, options = {}) => {
  try {
    if (!collection?.find) return [];

    let cursor = collection.find(query);
    if (options.sort && cursor.sort) cursor = cursor.sort(options.sort);
    if (options.limit && cursor.limit) cursor = cursor.limit(options.limit);
    if (options.project && cursor.project) cursor = cursor.project(options.project);
    return cursor.toArray ? await cursor.toArray() : [];
  } catch {
    return [];
  }
};

const countActiveDisputes = async (returnsCollection) =>
  safeCount(returnsCollection, {
    $or: [
      { status: { $in: ["pending", "requested", "approved", "processing", "disputed"] } },
      { vendorResponse: "disputed" },
    ],
  });

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const failedStatusQuery = {
  $in: ["failed", "error", "partial_failed", "delivery_failed", "webhook_failed"],
};

const getEventDate = (doc = {}) =>
  doc.failedAt ||
  doc.completedAt ||
  doc.sentAt ||
  doc.updatedAt ||
  doc.createdAt ||
  doc.timestamp ||
  null;

const toOperationIssue = ({
  type,
  title,
  detail,
  status,
  severity = "medium",
  at,
  owner = "Operations",
  path = null,
  meta = {},
}) => ({
  id: `${type}-${normalizeId(meta.id || title)}-${new Date(at || Date.now()).getTime()}`,
  type,
  title,
  detail,
  status: status || "needs_attention",
  severity,
  at,
  owner,
  path,
  meta,
});

const getQueueItemDate = (item = {}) =>
  item.submittedAt ||
  item.kyc?.submittedAt ||
  item.requestedAt ||
  item.failedAt ||
  item.updatedAt ||
  item.createdAt ||
  null;

const getQueueItemAgeHours = (item = {}, now = new Date()) => {
  const date = getQueueItemDate(item);
  if (!date) return 0;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, (new Date(now).getTime() - time) / (60 * 60 * 1000));
};

const getOldestQueueDate = (items = []) =>
  items
    .map(getQueueItemDate)
    .filter(Boolean)
    .sort((left, right) => new Date(left) - new Date(right))[0] || null;

const getPayoutAmount = (payout = {}) =>
  Number(payout.amount ?? payout.requestedAmount ?? payout.netPayout ?? payout.totalAmount ?? 0);

const sumPayoutExposure = (payouts = []) =>
  round2(payouts.reduce((sum, payout) => sum + getPayoutAmount(payout), 0));

const buildQueueCard = ({
  key,
  label,
  owner,
  path,
  items = [],
  slaHours = 48,
  highRiskCount = 0,
  amount = 0,
  detail = "",
  now = new Date(),
}) => {
  const count = items.length;
  const breached = items.filter((item) => getQueueItemAgeHours(item, now) >= slaHours).length;
  const status = count === 0 ? "clear" : breached > 0 ? "breached" : "needs_review";
  const severity = breached > 0 ? "critical" : highRiskCount > 0 ? "watch" : count > 0 ? "watch" : "healthy";

  return {
    key,
    label,
    owner,
    path,
    count,
    status,
    severity,
    slaHours,
    breached,
    highRiskCount,
    amount: round2(amount),
    oldestOpenAt: getOldestQueueDate(items),
    detail,
  };
};

const buildAdminQueueWorkload = ({
  vendorApprovals = [],
  kycReviews = [],
  productModeration = [],
  reviewModeration = [],
  returnDisputes = [],
  openSupportTickets = [],
  payoutQueue = [],
  failedNotifications = [],
  now = new Date(),
}) => {
  const highRiskProducts = productModeration.filter((product) =>
    product.flagged ||
    (product.moderationFlags || []).length > 0 ||
    ["flagged", "rejected"].includes(normalizeStatus(product.approvalStatus || product.status)),
  ).length;
  const highRiskReviews = reviewModeration.filter((review) =>
    review.flagged ||
    Number(review.reportCount || review.reportsCount || 0) > 0 ||
    Number(review.rating || 0) <= 2,
  ).length;
  const highRiskReturns = returnDisputes.filter((returnDoc) =>
    normalizeStatus(returnDoc.vendorResponse) === "disputed" ||
    ["disputed", "under_review"].includes(normalizeStatus(returnDoc.status)),
  ).length;
  const highRiskSupport = openSupportTickets.filter((ticket) =>
    ["urgent", "high"].includes(normalizeStatus(ticket.priority)),
  ).length;
  const payoutExposure = sumPayoutExposure(payoutQueue);
  const highRiskPayouts = payoutQueue.filter((payout) =>
    ["hold", "held", "blocked"].includes(normalizeStatus(payout.status)) ||
    getPayoutAmount(payout) >= 10000,
  ).length;

  return [
    buildQueueCard({
      key: "vendor_approval",
      label: "Vendor Approval",
      owner: "Vendor Ops",
      path: "/admin/vendor-requests",
      items: vendorApprovals,
      slaHours: 48,
      highRiskCount: vendorApprovals.filter((vendor) => (vendor.policyFlags || []).length > 0).length,
      detail: "New seller applications waiting for approve, reject, or request-info action.",
      now,
    }),
    buildQueueCard({
      key: "kyc_review",
      label: "KYC Review",
      owner: "Vendor Ops",
      path: "/admin/vendor-kyc",
      items: kycReviews,
      slaHours: 48,
      highRiskCount: kycReviews.filter((vendor) => normalizeStatus(vendor.kyc?.status) === "under_review").length,
      detail: "Submitted NID, trade license, and business verification packages.",
      now,
    }),
    buildQueueCard({
      key: "product_moderation",
      label: "Product Moderation",
      owner: "Catalog",
      path: "/admin/products",
      items: productModeration,
      slaHours: 24,
      highRiskCount: highRiskProducts,
      detail: "Listings requiring approve, reject, disable, or edit-request decisions.",
      now,
    }),
    buildQueueCard({
      key: "review_moderation",
      label: "Review Moderation",
      owner: "Trust & Safety",
      path: "/admin/reviews",
      items: reviewModeration,
      slaHours: 24,
      highRiskCount: highRiskReviews,
      detail: "Flagged, reported, or pending-review customer reviews.",
      now,
    }),
    buildQueueCard({
      key: "returns",
      label: "Returns & Disputes",
      owner: "Trust & Safety",
      path: "/admin/returns",
      items: returnDisputes,
      slaHours: 48,
      highRiskCount: highRiskReturns,
      amount: returnDisputes.reduce((sum, item) => sum + getRefundAmount(item), 0),
      detail: "Return cases requiring vendor/customer arbitration or refund approval.",
      now,
    }),
    buildQueueCard({
      key: "support",
      label: "Support Queue",
      owner: "Support",
      path: "/admin/support",
      items: openSupportTickets,
      slaHours: 24,
      highRiskCount: highRiskSupport,
      detail: "Open and in-progress customer support tickets.",
      now,
    }),
    buildQueueCard({
      key: "payouts",
      label: "Payout Queue",
      owner: "Finance",
      path: "/admin/payouts",
      items: payoutQueue,
      slaHours: 24,
      highRiskCount: highRiskPayouts,
      amount: payoutExposure,
      detail: "Vendor payout requests, approved payouts, processing holds, and payable exposure.",
      now,
    }),
    buildQueueCard({
      key: "failed_notifications",
      label: "Failed Notifications",
      owner: "Comms",
      path: "/admin/platform",
      items: failedNotifications,
      slaHours: 6,
      highRiskCount: failedNotifications.length,
      detail: "Failed push, email, and in-app delivery attempts that may need retry.",
      now,
    }),
  ];
};

const summarizeOperationsHealth = (metrics = {}) => {
  const critical =
    Number(metrics.webhookFailures || 0) +
    Number(metrics.auditServerErrors || 0) +
    Number(metrics.failedBulkJobs || 0) +
    Number(metrics.queueSlaBreaches || 0);
  const warnings =
    Number(metrics.failedNotifications || 0) +
    Number(metrics.failedNewsletterRecipients || 0) +
    Number(metrics.openSupportTickets || 0) +
    Number(metrics.returnDisputes || 0) +
    Number(metrics.queueWarningQueues || 0);

  const deduction = critical * 12 + warnings * 3;
  const score = Math.max(0, Math.min(100, 100 - deduction));
  const status = score >= 85 ? "healthy" : score >= 65 ? "watch" : "critical";

  return {
    score,
    status,
    critical,
    warnings,
    message:
      status === "healthy"
        ? "Core operations are within normal thresholds."
        : status === "watch"
          ? "Some queues need attention before they become customer-facing issues."
          : "Multiple operational queues are unhealthy and need immediate review.",
  };
};

const buildOperationsJobCards = ({
  analyticsSummary,
  scheduledNewsletterCount,
  sendingNewsletterCount,
  failedNewsletterCount,
  failedBulkJobs,
  processingBulkJobs,
  failedNotifications,
  failedPayments,
}) => {
  const analyticsUpdatedAt = analyticsSummary?.updatedAt || analyticsSummary?.createdAt || null;
  const analyticsFresh =
    analyticsUpdatedAt && Date.now() - new Date(analyticsUpdatedAt).getTime() <= 2 * 60 * 60 * 1000;

  return [
    {
      key: "campaign_scheduler",
      label: "Campaign Scheduler",
      schedule: "0 * * * *, 0 */6 * * *, */10 * * * *",
      status: failedNotifications > 0 ? "watch" : "running",
      detail: failedNotifications > 0
        ? `${failedNotifications} campaign/notification delivery issue${failedNotifications > 1 ? "s" : ""} in the last 24h.`
        : "Campaign jobs are registered and no delivery failures were found in the window.",
      lastSignalAt: null,
      failures: failedNotifications,
    },
    {
      key: "analytics_summary",
      label: "Analytics Summary Cron",
      schedule: "17 * * * *",
      status: analyticsFresh ? "running" : "watch",
      detail: analyticsFresh
        ? "Latest analytics summary is fresh."
        : "No analytics summary refreshed in the last 2 hours.",
      lastSignalAt: analyticsUpdatedAt,
      failures: analyticsFresh ? 0 : 1,
    },
    {
      key: "newsletter_broadcast",
      label: "Newsletter Broadcast Cron",
      schedule: "* * * * *",
      status: failedNewsletterCount > 0 ? "watch" : "running",
      detail: `${scheduledNewsletterCount} scheduled, ${sendingNewsletterCount} sending, ${failedNewsletterCount} failed broadcasts.`,
      lastSignalAt: null,
      failures: failedNewsletterCount,
    },
    {
      key: "bulk_upload_queue",
      label: "Vendor Bulk Upload Queue",
      schedule: "On demand",
      status: failedBulkJobs > 0 ? "critical" : processingBulkJobs > 0 ? "running" : "idle",
      detail: `${processingBulkJobs} processing, ${failedBulkJobs} failed jobs in the last 24h.`,
      lastSignalAt: null,
      failures: failedBulkJobs,
    },
    {
      key: "payment_webhooks",
      label: "Payment Webhooks",
      schedule: "Real time",
      status: failedPayments > 0 ? "critical" : "running",
      detail: failedPayments > 0
        ? `${failedPayments} failed payment/webhook event${failedPayments > 1 ? "s" : ""} in the last 24h.`
        : "No failed payment webhook events in the window.",
      lastSignalAt: null,
      failures: failedPayments,
    },
  ];
};

const buildDateBuckets = (start, end) => {
  const buckets = [];
  for (let cursor = startOfDay(start); cursor < end; cursor = addDays(cursor, 1)) {
    buckets.push({
      date: dateKey(cursor),
      label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      gmv: 0,
      commission: 0,
      refunds: 0,
    });
  }
  return buckets;
};

const buildRevenueSeries = (orders = [], returns = [], start, end) => {
  const buckets = buildDateBuckets(start, end);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    const bucket = bucketMap.get(dateKey(order.createdAt || new Date()));
    if (!bucket) return;
    bucket.gmv += getOrderAmount(order);
    bucket.commission += getOrderCommission(order);
  });

  returns.forEach((returnDoc) => {
    const eventDate = returnDoc.completedAt || returnDoc.refundProcessedAt || returnDoc.updatedAt || returnDoc.createdAt;
    const bucket = bucketMap.get(dateKey(eventDate || new Date()));
    if (!bucket) return;
    bucket.refunds += getRefundAmount(returnDoc);
  });

  return buckets.map((bucket) => ({
    ...bucket,
    gmv: round2(bucket.gmv),
    commission: round2(bucket.commission),
    refunds: round2(bucket.refunds),
  }));
};

const buildFunnel = (orders = [], returns = []) => {
  const statuses = [
    { key: "pending", label: "Pending" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];
  const counts = statuses.map((status) => ({
    ...status,
    count: orders.filter((order) => order.status === status.key).length,
  }));
  counts.push({
    key: "returned",
    label: "Returned",
    count: returns.filter((returnDoc) =>
      ["pending", "requested", "approved", "processing", "completed", "refunded"].includes(returnDoc.status),
    ).length,
  });

  return counts.map((item, index) => ({
    ...item,
    dropOff: index === 0 ? 0 : Math.max(0, counts[index - 1].count - item.count),
  }));
};

const buildVendorLookup = (vendors = []) =>
  new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor]));

const getItemVendorId = (item, fallbackOrder) =>
  normalizeId(item.vendorId || item.sellerId || fallbackOrder.vendorId || "platform");

const buildTopVendors = (orders = [], vendors = []) => {
  const vendorLookup = buildVendorLookup(vendors);
  const vendorRows = new Map();

  orders
    .filter((order) => order.status !== "cancelled")
    .forEach((order) => {
      const items = order.products || order.items || [];
      items.forEach((item) => {
        const vendorId = getItemVendorId(item, order);
        const vendor = vendorLookup.get(vendorId);
        const row = vendorRows.get(vendorId) || {
          vendorId,
          vendorName: item.vendorName || vendor?.shopName || vendor?.name || "Platform",
          gmv: 0,
          commission: 0,
          units: 0,
          orderIds: new Set(),
        };

        row.gmv += getItemAmount(item);
        row.commission += getItemCommission(item);
        row.units += Number(item.quantity || item.qty || 1);
        row.orderIds.add(normalizeId(order._id));
        vendorRows.set(vendorId, row);
      });
    });

  return [...vendorRows.values()]
    .map((row) => ({
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      gmv: round2(row.gmv),
      commission: round2(row.commission),
      orders: row.orderIds.size,
      units: row.units,
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 10);
};

const buildTopProducts = (orders = [], vendors = []) => {
  const vendorLookup = buildVendorLookup(vendors);
  const productRows = new Map();

  orders
    .filter((order) => order.status !== "cancelled")
    .forEach((order) => {
      const items = order.products || order.items || [];
      items.forEach((item) => {
        const productId = normalizeId(item.productId || item._id || item.sku || item.name || item.title);
        const vendorId = getItemVendorId(item, order);
        const vendor = vendorLookup.get(vendorId);
        const row = productRows.get(productId) || {
          productId,
          sku: item.sku || item.SKU || productId,
          productName: item.name || item.title || item.productName || "Product",
          vendorName: item.vendorName || vendor?.shopName || vendor?.name || "Platform",
          revenue: 0,
          units: 0,
          orderIds: new Set(),
        };

        row.revenue += getItemAmount(item);
        row.units += Number(item.quantity || item.qty || 1);
        row.orderIds.add(normalizeId(order._id));
        productRows.set(productId, row);
      });
    });

  return [...productRows.values()]
    .map((row) => ({
      productId: row.productId,
      sku: row.sku,
      productName: row.productName,
      vendorName: row.vendorName,
      revenue: round2(row.revenue),
      units: row.units,
      orders: row.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
};

const buildTopCategories = (orders = []) => {
  const categoryRows = new Map();

  orders
    .filter((order) => order.status !== "cancelled")
    .forEach((order) => {
      const items = order.products || order.items || [];
      items.forEach((item) => {
        const categoryId = normalizeId(item.categoryId || item.category || item.categoryName || item.categoryPath || "uncategorized");
        const categoryName =
          item.categoryName ||
          item.categoryLabel ||
          (Array.isArray(item.categoryPath) ? item.categoryPath.filter(Boolean).join(" / ") : item.categoryPath) ||
          item.category ||
          "Uncategorized";
        const row = categoryRows.get(categoryId) || {
          categoryId,
          categoryName,
          gmv: 0,
          commission: 0,
          units: 0,
          orderIds: new Set(),
        };

        row.gmv += getItemAmount(item);
        row.commission += getItemCommission(item);
        row.units += Number(item.quantity || item.qty || 1);
        row.orderIds.add(normalizeId(order._id));
        categoryRows.set(categoryId, row);
      });
    });

  return [...categoryRows.values()]
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      gmv: round2(row.gmv),
      commission: round2(row.commission),
      units: row.units,
      orders: row.orderIds.size,
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 8);
};

const mapActivity = (type, title, at, meta = {}, severity = "info") => ({
  id: `${type}-${normalizeId(meta.id || title)}-${new Date(at || Date.now()).getTime()}`,
  type,
  title,
  at,
  severity,
  meta,
});

const buildActivityFeed = ({ orders, vendors, products, payments }) => {
  const activities = [];

  orders.slice(0, 8).forEach((order) => {
    activities.push(
      mapActivity(
        "order",
        `New order ${normalizeId(order._id).slice(-6)}`,
        order.createdAt,
        { id: order._id, label: getOrderCustomerName(order), amount: getOrderAmount(order) },
      ),
    );
  });

  vendors.slice(0, 6).forEach((vendor) => {
    activities.push(
      mapActivity(
        "vendor",
        `Vendor application: ${vendor.shopName || vendor.name || vendor.email || "New vendor"}`,
        vendor.updatedAt || vendor.createdAt,
        { id: vendor._id, label: vendor.email || vendor.phone || "Pending review" },
      ),
    );
  });

  products.slice(0, 6).forEach((product) => {
    activities.push(
      mapActivity(
        "product",
        `Product needs review: ${product.name || product.title || product.sku || "SKU"}`,
        product.updatedAt || product.createdAt,
        { id: product._id, label: product.approvalStatus || product.status || "flagged" },
        "warning",
      ),
    );
  });

  payments.slice(0, 6).forEach((payment) => {
    activities.push(
      mapActivity(
        "payment",
        `Failed payment ${normalizeId(payment._id).slice(-6)}`,
        payment.failedAt || payment.updatedAt || payment.createdAt,
        { id: payment._id, label: payment.paymentMethod || payment.gateway || "payment", amount: payment.amount },
        "critical",
      ),
    );
  });

  return activities
    .filter((activity) => activity.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 20);
};

const buildHealthAlerts = ({ orders, failedPayments24h, slaBreaches, fraudFlags }) => {
  const totalOrders = orders.length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;
  const cancellationRate = totalOrders ? round2((cancelled / totalOrders) * 100) : 0;
  const alerts = [];

  if (cancelled >= 3 && cancellationRate >= 15) {
    alerts.push({
      id: "cancellation_spike",
      severity: "high",
      title: "High cancellation spike",
      detail: `${cancellationRate}% of selected-range orders are cancelled.`,
      count: cancelled,
    });
  }

  if (failedPayments24h > 0) {
    alerts.push({
      id: "payment_failures",
      severity: failedPayments24h >= 5 ? "high" : "medium",
      title: "Payment webhook failures",
      detail: `${failedPayments24h} failed payment event${failedPayments24h > 1 ? "s" : ""} in the last 24h.`,
      count: failedPayments24h,
    });
  }

  if (slaBreaches > 0) {
    alerts.push({
      id: "vendor_sla",
      severity: slaBreaches >= 10 ? "high" : "medium",
      title: "Vendors breaching SLA",
      detail: `${slaBreaches} vendor order${slaBreaches > 1 ? "s" : ""} older than 48h are still open.`,
      count: slaBreaches,
    });
  }

  if (fraudFlags > 0) {
    alerts.push({
      id: "fraud_flags",
      severity: "high",
      title: "Fraud flags detected",
      detail: `${fraudFlags} order${fraudFlags > 1 ? "s" : ""} have fraud or risk flags.`,
      count: fraudFlags,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "healthy",
      severity: "low",
      title: "Platform health normal",
      detail: "No automatic warnings crossed the configured thresholds.",
      count: 0,
    });
  }

  return { cancellationRate, alerts };
};

exports.getAdminDashboardOverview = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    const range = resolveDateRange(req.query);
    const todayStart = startOfDay(now);
    const tomorrowStart = endOfDay(now);
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const slaDeadline = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const supportSlaDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(range.start.getTime() - (range.end.getTime() - range.start.getTime()));

    const ordersCollection = safeCollection(db, "orders");
    const usersCollection = safeCollection(db, "users");
    const vendorsCollection = safeCollection(db, "vendors");
    const productsCollection = safeCollection(db, "products");
    const returnsCollection = safeCollection(db, "returns");
    const payoutsCollection = safeCollection(db, "vendor_payouts");
    const paymentsCollection = safeCollection(db, "payments");
    const vendorOrdersCollection = safeCollection(db, "vendorOrders");
    const supportTicketsCollection = safeCollection(db, "supportTickets");
    const reviewsCollection = safeCollection(db, "reviews");
    const notificationDeliveriesCollection = safeCollection(db, "notification_deliveries");
    const bulkJobsCollection = safeCollection(db, "bulk_upload_jobs");
    const analyticsSummaryCollection = safeCollection(db, "analytics_summaries");

    const [
      ordersInRange,
      previousOrders,
      todayOrders,
      returnsInRange,
      previousReturns,
      vendors,
      recentOrders,
      pendingVendors,
      pendingProducts,
      failedPayments,
      totalOrders,
      newUsers,
      newVendors,
      pendingPayouts,
      activeDisputes,
      failedPayments24h,
      slaBreaches,
      vendorApprovals,
      productModeration,
      payoutRequests,
      returnDisputes,
      kycReviews,
      activeVendors,
      openSupportTickets,
      supportSlaBreaches,
      reviewModeration,
      failedNotificationDeliveries,
      failedBulkJobs,
      payoutQueue,
      latestAnalyticsSummary,
    ] = await Promise.all([
      safeFind(ordersCollection, { createdAt: { $gte: range.start, $lt: range.end } }, { sort: { createdAt: -1 }, limit: 5000 }),
      safeFind(ordersCollection, { createdAt: { $gte: previousStart, $lt: range.start } }, { sort: { createdAt: -1 }, limit: 5000 }),
      safeFind(ordersCollection, { createdAt: { $gte: todayStart, $lt: tomorrowStart } }, { sort: { createdAt: -1 }, limit: 2000 }),
      safeFind(returnsCollection, { createdAt: { $gte: range.start, $lt: range.end } }, { sort: { createdAt: -1 }, limit: 2000 }),
      safeFind(returnsCollection, { createdAt: { $gte: previousStart, $lt: range.start } }, { sort: { createdAt: -1 }, limit: 2000 }),
      safeFind(vendorsCollection, {}, { limit: 2000 }),
      safeFind(ordersCollection, { createdAt: { $gte: dayAgo } }, { sort: { createdAt: -1 }, limit: 12 }),
      safeFind(vendorsCollection, { status: "pending" }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 8 }),
      safeFind(productsCollection, { approvalStatus: { $in: ["pending", "flagged"] } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 8 }),
      safeFind(paymentsCollection, { status: "failed" }, { sort: { failedAt: -1, updatedAt: -1, createdAt: -1 }, limit: 8 }),
      safeCount(ordersCollection, {}),
      safeCount(usersCollection, { createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      safeCount(vendorsCollection, { createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      safeCount(payoutsCollection, { status: "pending" }),
      countActiveDisputes(returnsCollection),
      safeCount(paymentsCollection, { status: "failed", createdAt: { $gte: dayAgo } }),
      safeCount(vendorOrdersCollection, { status: { $in: ["pending", "processing"] }, createdAt: { $lt: slaDeadline } }),
      safeCount(vendorsCollection, { status: "pending" }),
      safeCount(productsCollection, { approvalStatus: "pending" }),
      safeCount(payoutsCollection, { type: "vendor_requested", status: "pending" }),
      countActiveDisputes(returnsCollection),
      safeCount(vendorsCollection, { "kyc.status": { $in: ["pending", "submitted", "under_review"] } }),
      safeCount(vendorsCollection, { status: { $in: ["approved", "active"] } }),
      safeCount(supportTicketsCollection, { status: { $in: ["open", "in_progress"] } }),
      safeCount(supportTicketsCollection, { status: { $in: ["open", "in_progress"] }, createdAt: { $lt: supportSlaDeadline } }),
      safeCount(reviewsCollection, {
        $or: [
          { moderationStatus: { $in: ["flagged", "pending_review"] } },
          { status: { $in: ["flagged", "pending_review"] } },
          { flagged: true },
          { reportCount: { $gt: 0 } },
        ],
      }),
      safeCount(notificationDeliveriesCollection, { status: failedStatusQuery }),
      safeCount(bulkJobsCollection, { status: { $in: ["failed", "error"] } }),
      safeFind(payoutsCollection, {
        status: { $in: ["pending", "approved", "processing", "hold", "held"] },
      }, { sort: { requestedAt: -1, updatedAt: -1, createdAt: -1 }, limit: 500 }),
      safeFind(analyticsSummaryCollection, {}, { sort: { updatedAt: -1, createdAt: -1 }, limit: 1 }),
    ]);

    const todayActiveOrders = todayOrders.filter((order) => order.status !== "cancelled");
    const todayGmv = todayActiveOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
    const revenueSeries = buildRevenueSeries(ordersInRange, returnsInRange, range.start, range.end);
    const previousRevenueSeries = buildRevenueSeries(previousOrders, previousReturns, previousStart, range.start);
    const orderFunnel = buildFunnel(ordersInRange, returnsInRange);
    const fraudFlags = ordersInRange.filter((order) => order.fraudFlag || order.risk?.flagged || Number(order.riskScore || 0) >= 80).length;
    const health = buildHealthAlerts({ orders: ordersInRange, failedPayments24h, slaBreaches, fraudFlags });

    const revenueTotals = revenueSeries.reduce(
      (totals, day) => ({
        gmv: round2(totals.gmv + day.gmv),
        commission: round2(totals.commission + day.commission),
        refunds: round2(totals.refunds + day.refunds),
      }),
      { gmv: 0, commission: 0, refunds: 0 },
    );
    const previousRevenueTotals = previousRevenueSeries.reduce(
      (totals, day) => ({
        gmv: round2(totals.gmv + day.gmv),
        commission: round2(totals.commission + day.commission),
        refunds: round2(totals.refunds + day.refunds),
      }),
      { gmv: 0, commission: 0, refunds: 0 },
    );
    const refundRate = revenueTotals.gmv ? round2((revenueTotals.refunds / revenueTotals.gmv) * 100) : 0;
    const previousRefundRate = previousRevenueTotals.gmv
      ? round2((previousRevenueTotals.refunds / previousRevenueTotals.gmv) * 100)
      : 0;
    const analyticsUpdatedAt = latestAnalyticsSummary[0]?.updatedAt || latestAnalyticsSummary[0]?.createdAt || null;
    const analyticsFresh =
      analyticsUpdatedAt && now.getTime() - new Date(analyticsUpdatedAt).getTime() <= 2 * 60 * 60 * 1000;

    res.json({
      success: true,
      data: {
        updatedAt: now,
        range: {
          preset: range.preset,
          start: range.start,
          end: range.end,
        },
        kpis: {
          todayGmv: round2(todayGmv),
          todayOrders: todayOrders.length,
          totalOrders,
          newUsers,
          newVendors,
          pendingPayouts,
          payoutExposure: sumPayoutExposure(payoutQueue),
          activeDisputes,
          activeVendors,
          supportOpen: openSupportTickets,
          supportSlaBreaches,
          reviewModeration,
          failedNotifications: failedNotificationDeliveries,
          failedBulkJobs,
          refundAmount: revenueTotals.refunds,
          refundRate,
          cancellationRate: health.cancellationRate,
        },
        revenueTotals,
        comparison: {
          previousStart,
          previousEnd: range.start,
          gmvChange: percentChange(revenueTotals.gmv, previousRevenueTotals.gmv),
          ordersChange: percentChange(ordersInRange.length, previousOrders.length),
          commissionChange: percentChange(revenueTotals.commission, previousRevenueTotals.commission),
          refundsChange: percentChange(revenueTotals.refunds, previousRevenueTotals.refunds),
          refundRateChange: round2(refundRate - previousRefundRate),
        },
        opsSummary: {
          supportOpen: openSupportTickets,
          supportSlaBreaches,
          failedNotifications: failedNotificationDeliveries,
          failedBulkJobs,
          failedPayments: failedPayments24h,
          analyticsCronStatus: analyticsFresh ? "running" : "watch",
          analyticsUpdatedAt,
        },
        revenueSeries,
        orderFunnel,
        activityFeed: buildActivityFeed({
          orders: recentOrders,
          vendors: pendingVendors,
          products: pendingProducts,
          payments: failedPayments,
        }),
        healthAlerts: health.alerts,
        topVendors: buildTopVendors(ordersInRange, vendors),
        topCategories: buildTopCategories(ordersInRange),
        topProductsToday: buildTopProducts(todayOrders, vendors),
        pendingActions: {
          vendorApprovals,
          productModeration,
          payoutRequests,
          returnDisputes,
          kycReviews,
          supportTickets: openSupportTickets,
          reviewModeration,
          failedNotifications: failedNotificationDeliveries,
        },
      },
    });
  } catch (error) {
    console.error("Error loading admin dashboard overview:", error);
    res.status(500).json({ success: false, error: "Failed to load admin dashboard overview" });
  }
};

exports.getAdminOperationsOverview = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    const windowHours = Math.min(Math.max(parseInt(req.query.windowHours, 10) || 24, 1), 168);
    const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

    const paymentsCollection = safeCollection(db, "payments");
    const auditCollection = safeCollection(db, "audit_logs");
    const notificationsCollection = safeCollection(db, "notifications");
    const notificationDeliveriesCollection = safeCollection(db, "notification_deliveries");
    const notificationBroadcastsCollection = safeCollection(db, "notification_broadcasts");
    const newsletterBroadcastsCollection = safeCollection(db, "newsletterBroadcasts");
    const newsletterRecipientsCollection = safeCollection(db, "newsletterBroadcastRecipients");
    const bulkJobsCollection = safeCollection(db, "bulk_upload_jobs");
    const supportTicketsCollection = safeCollection(db, "supportTickets");
    const returnsCollection = safeCollection(db, "returns");
    const vendorsCollection = safeCollection(db, "vendors");
    const productsCollection = safeCollection(db, "products");
    const reviewsCollection = safeCollection(db, "reviews");
    const payoutsCollection = safeCollection(db, "vendor_payouts");
    const analyticsSummaryCollection = safeCollection(db, "analytics_summaries");

    const failedQuery = {
      status: failedStatusQuery,
      $or: [
        { createdAt: { $gte: since } },
        { updatedAt: { $gte: since } },
        { failedAt: { $gte: since } },
      ],
    };

    const webhookAuditQuery = {
      action: { $regex: "webhook|payments", $options: "i" },
      createdAt: { $gte: since },
      "diff.statusCode": { $gte: 400 },
    };

    const [
      failedPayments,
      webhookAuditFailures,
      notificationDeliveries,
      failedNotificationDeliveries,
      notificationBroadcasts,
      newsletterBroadcasts,
      failedNewsletterRecipients,
      bulkJobs,
      openSupportTickets,
      returnDisputes,
      auditServerErrors,
      recentAuditLogs,
      recentNotifications,
      latestAnalyticsSummary,
      vendorApprovalQueue,
      kycReviewQueue,
      productModerationQueue,
      reviewModerationQueue,
      payoutQueue,
    ] = await Promise.all([
      safeFind(paymentsCollection, failedQuery, { sort: { failedAt: -1, updatedAt: -1, createdAt: -1 }, limit: 20 }),
      safeFind(auditCollection, webhookAuditQuery, { sort: { createdAt: -1 }, limit: 20 }),
      safeFind(notificationDeliveriesCollection, { createdAt: { $gte: since } }, { sort: { createdAt: -1 }, limit: 2000 }),
      safeFind(notificationDeliveriesCollection, failedQuery, { sort: { failedAt: -1, updatedAt: -1, createdAt: -1 }, limit: 20 }),
      safeFind(notificationBroadcastsCollection, { createdAt: { $gte: since } }, { sort: { createdAt: -1 }, limit: 200 }),
      safeFind(newsletterBroadcastsCollection, { createdAt: { $gte: since } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 200 }),
      safeFind(newsletterRecipientsCollection, failedQuery, { sort: { failedAt: -1, updatedAt: -1, createdAt: -1 }, limit: 20 }),
      safeFind(bulkJobsCollection, { createdAt: { $gte: since } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 200 }),
      safeFind(supportTicketsCollection, { status: { $in: ["open", "in_progress"] } }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 20 }),
      safeFind(returnsCollection, {
        $or: [
          { vendorResponse: "disputed" },
          { status: { $in: ["disputed", "under_review"] } },
        ],
      }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 20 }),
      safeFind(auditCollection, { createdAt: { $gte: since }, "diff.statusCode": { $gte: 500 } }, { sort: { createdAt: -1 }, limit: 20 }),
      safeFind(auditCollection, {}, { sort: { createdAt: -1 }, limit: 30 }),
      safeFind(notificationsCollection, { createdAt: { $gte: since } }, { sort: { createdAt: -1 }, limit: 30 }),
      safeFind(analyticsSummaryCollection, {}, { sort: { updatedAt: -1, createdAt: -1 }, limit: 1 }),
      safeFind(vendorsCollection, { status: "pending" }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 50 }),
      safeFind(vendorsCollection, { "kyc.status": { $in: ["pending", "submitted", "under_review"] } }, { sort: { "kyc.submittedAt": -1, updatedAt: -1 }, limit: 50 }),
      safeFind(productsCollection, {
        $or: [
          { approvalStatus: { $in: ["pending", "flagged"] } },
          { status: { $in: ["pending_moderation", "flagged"] } },
          { "moderationFlags.0": { $exists: true } },
        ],
      }, { sort: { submittedForReviewAt: -1, updatedAt: -1, createdAt: -1 }, limit: 50 }),
      safeFind(reviewsCollection, {
        $or: [
          { moderationStatus: { $in: ["flagged", "pending_review"] } },
          { status: { $in: ["flagged", "pending_review"] } },
          { flagged: true },
          { reportCount: { $gt: 0 } },
        ],
      }, { sort: { updatedAt: -1, createdAt: -1 }, limit: 50 }),
      safeFind(payoutsCollection, {
        status: { $in: ["pending", "approved", "processing", "hold", "held"] },
      }, { sort: { requestedAt: -1, updatedAt: -1, createdAt: -1 }, limit: 50 }),
    ]);

    const failedNewsletterBroadcasts = newsletterBroadcasts.filter((broadcast) =>
      ["failed", "partial_failed"].includes(normalizeStatus(broadcast.status)),
    );
    const scheduledNewsletterCount = newsletterBroadcasts.filter((broadcast) =>
      normalizeStatus(broadcast.status) === "scheduled",
    ).length;
    const sendingNewsletterCount = newsletterBroadcasts.filter((broadcast) =>
      normalizeStatus(broadcast.status) === "sending",
    ).length;
    const failedBulkJobs = bulkJobs.filter((job) =>
      ["failed", "error"].includes(normalizeStatus(job.status)),
    );
    const processingBulkJobs = bulkJobs.filter((job) =>
      ["queued", "processing", "running", "pending"].includes(normalizeStatus(job.status)),
    );
    const queueWorkload = buildAdminQueueWorkload({
      vendorApprovals: vendorApprovalQueue,
      kycReviews: kycReviewQueue,
      productModeration: productModerationQueue,
      reviewModeration: reviewModerationQueue,
      returnDisputes,
      openSupportTickets,
      payoutQueue,
      failedNotifications: failedNotificationDeliveries,
      now,
    });
    const queueSlaBreaches = queueWorkload.reduce((sum, queue) => sum + Number(queue.breached || 0), 0);
    const queueWarningQueues = queueWorkload.filter((queue) => queue.status !== "clear").length;
    const openAdminQueueItems = queueWorkload.reduce((sum, queue) => sum + Number(queue.count || 0), 0);

    const metrics = {
      failedPayments: failedPayments.length,
      webhookFailures: Math.max(webhookAuditFailures.length, failedPayments.length),
      failedNotifications: failedNotificationDeliveries.length,
      failedNewsletterBroadcasts: failedNewsletterBroadcasts.length,
      failedNewsletterRecipients: failedNewsletterRecipients.length,
      failedBulkJobs: failedBulkJobs.length,
      processingBulkJobs: processingBulkJobs.length,
      openSupportTickets: openSupportTickets.length,
      returnDisputes: returnDisputes.length,
      auditServerErrors: auditServerErrors.length,
      openAdminQueueItems,
      queueSlaBreaches,
      queueWarningQueues,
      payoutExposure: sumPayoutExposure(payoutQueue),
    };

    const issues = [
      ...vendorApprovalQueue.slice(0, 8).map((vendor) => toOperationIssue({
        type: "vendor_approval",
        title: vendor.shopName || vendor.name || vendor.email || "Vendor application",
        detail: vendor.email || vendor.phone || "Vendor is waiting for approval.",
        status: vendor.status || "pending",
        severity: (vendor.policyFlags || []).length ? "medium" : "low",
        at: vendor.updatedAt || vendor.createdAt,
        owner: "Vendor Ops",
        path: "/admin/vendor-requests",
        meta: { id: vendor._id, vendorId: vendor._id },
      })),
      ...kycReviewQueue.slice(0, 8).map((vendor) => toOperationIssue({
        type: "kyc_review",
        title: `KYC review: ${vendor.shopName || vendor.name || vendor.email || "Vendor"}`,
        detail: vendor.kyc?.notes || vendor.kyc?.reviewReason || "Submitted verification documents need review.",
        status: vendor.kyc?.status || "pending",
        severity: normalizeStatus(vendor.kyc?.status) === "under_review" ? "medium" : "low",
        at: vendor.kyc?.submittedAt || vendor.updatedAt || vendor.createdAt,
        owner: "Vendor Ops",
        path: "/admin/vendor-kyc",
        meta: { id: vendor._id, vendorId: vendor._id },
      })),
      ...productModerationQueue.slice(0, 8).map((product) => toOperationIssue({
        type: "product_moderation",
        title: product.name || product.title || product.sku || "Product listing",
        detail: (product.moderationFlags || [])[0]?.message || product.rejectionReason || "Listing requires moderation.",
        status: product.approvalStatus || product.status || "pending",
        severity: (product.moderationFlags || []).length ? "medium" : "low",
        at: product.submittedForReviewAt || product.updatedAt || product.createdAt,
        owner: "Catalog",
        path: "/admin/products",
        meta: { id: product._id, vendorId: product.vendorId, sku: product.sku },
      })),
      ...reviewModerationQueue.slice(0, 8).map((review) => toOperationIssue({
        type: "review_moderation",
        title: review.title || review.comment || review.content || "Review needs moderation",
        detail: review.flagReason || review.reason || `${Number(review.rating || 0)} star review`,
        status: review.moderationStatus || review.status || "flagged",
        severity: Number(review.reportCount || review.reportsCount || 0) > 0 ? "medium" : "low",
        at: review.updatedAt || review.createdAt,
        owner: "Trust & Safety",
        path: "/admin/reviews",
        meta: { id: review._id, productId: review.productId, vendorId: review.vendorId },
      })),
      ...failedPayments.map((payment) => toOperationIssue({
        type: "payment",
        title: `Payment failed ${normalizeId(payment._id).slice(-6)}`,
        detail: payment.error || payment.failureReason || payment.gatewayMessage || payment.paymentMethod || "Payment failure recorded.",
        status: payment.status,
        severity: "critical",
        at: getEventDate(payment),
        owner: "Finance",
        path: "/admin/payment-verifications",
        meta: { id: payment._id, amount: payment.amount, method: payment.paymentMethod || payment.gateway },
      })),
      ...webhookAuditFailures.map((log) => toOperationIssue({
        type: "webhook",
        title: "Webhook/API failure",
        detail: log.target?.path || log.action || "Payment webhook returned an error status.",
        status: log.diff?.statusCode ? String(log.diff.statusCode) : "failed",
        severity: Number(log.diff?.statusCode || 0) >= 500 ? "critical" : "medium",
        at: log.createdAt,
        owner: "Engineering",
        path: "/admin/operations",
        meta: { id: log._id, action: log.action },
      })),
      ...failedNotificationDeliveries.map((delivery) => toOperationIssue({
        type: "notification",
        title: `Notification failed ${normalizeId(delivery._id).slice(-6)}`,
        detail: delivery.error || delivery.reason || delivery.channel || "Notification delivery failed.",
        status: delivery.status,
        severity: "medium",
        at: getEventDate(delivery),
        owner: "Comms",
        path: "/admin/platform",
        meta: { id: delivery._id, channel: delivery.channel, userId: delivery.userId },
      })),
      ...failedNewsletterRecipients.map((recipient) => toOperationIssue({
        type: "newsletter",
        title: `Newsletter recipient failed ${recipient.email || normalizeId(recipient._id).slice(-6)}`,
        detail: recipient.error || "Newsletter recipient delivery failed.",
        status: recipient.status,
        severity: "medium",
        at: getEventDate(recipient),
        owner: "Marketing",
        path: "/admin/newsletter",
        meta: { id: recipient._id, email: recipient.email },
      })),
      ...failedBulkJobs.map((job) => toOperationIssue({
        type: "bulk_upload",
        title: `Bulk upload failed ${normalizeId(job._id).slice(-6)}`,
        detail: job.error || job.errorMessage || job.reportSummary || "Vendor product bulk upload failed.",
        status: job.status,
        severity: "critical",
        at: getEventDate(job),
        owner: "Catalog",
        path: "/admin/products",
        meta: { id: job._id, vendorId: job.vendorId, rows: job.totalRows },
      })),
      ...auditServerErrors.map((log) => toOperationIssue({
        type: "server_error",
        title: `API ${log.diff?.statusCode || 500} error`,
        detail: log.target?.path || log.action || "Sensitive operation returned a server error.",
        status: String(log.diff?.statusCode || 500),
        severity: "critical",
        at: log.createdAt,
        owner: "Engineering",
        path: "/admin/operations",
        meta: { id: log._id, actor: log.actor?.email },
      })),
      ...openSupportTickets.slice(0, 8).map((ticket) => toOperationIssue({
        type: "support",
        title: ticket.subject || ticket.ticketId || "Open support ticket",
        detail: ticket.customerInfo?.email || ticket.category || "Customer support is waiting.",
        status: ticket.status,
        severity: ticket.priority === "urgent" ? "critical" : ticket.priority === "high" ? "medium" : "low",
        at: ticket.updatedAt || ticket.createdAt,
        owner: "Support",
        path: "/admin/support",
        meta: { id: ticket._id, ticketId: ticket.ticketId, priority: ticket.priority },
      })),
      ...returnDisputes.slice(0, 8).map((returnDoc) => toOperationIssue({
        type: "return_dispute",
        title: returnDoc.productTitle || `Return ${normalizeId(returnDoc._id).slice(-6)}`,
        detail: returnDoc.disputeReason || returnDoc.vendorResponseNotes || returnDoc.reason || "Return dispute requires admin arbitration.",
        status: returnDoc.status || returnDoc.vendorResponse,
        severity: "medium",
        at: returnDoc.updatedAt || returnDoc.createdAt,
        owner: "Trust & Safety",
        path: "/admin/returns",
        meta: { id: returnDoc._id, orderId: returnDoc.orderId, refundAmount: returnDoc.refundAmount },
      })),
      ...payoutQueue.slice(0, 8).map((payout) => toOperationIssue({
        type: "payout",
        title: `Payout ${normalizeId(payout._id).slice(-6)}`,
        detail: `${payout.vendorName || payout.vendorId || "Vendor"} - ${round2(getPayoutAmount(payout))} pending finance action.`,
        status: payout.status || "pending",
        severity: getPayoutAmount(payout) >= 10000 ? "medium" : "low",
        at: payout.requestedAt || payout.updatedAt || payout.createdAt,
        owner: "Finance",
        path: payout.type === "vendor_requested" ? "/admin/payout-requests" : "/admin/payouts",
        meta: { id: payout._id, vendorId: payout.vendorId, amount: getPayoutAmount(payout) },
      })),
    ]
      .filter((issue) => issue.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 40);

    const operationsHealth = summarizeOperationsHealth(metrics);

    res.json({
      success: true,
      data: {
        updatedAt: now,
        windowHours,
        since,
        health: operationsHealth,
        metrics,
        queueWorkload,
        jobMonitors: buildOperationsJobCards({
          analyticsSummary: latestAnalyticsSummary[0],
          scheduledNewsletterCount,
          sendingNewsletterCount,
          failedNewsletterCount: failedNewsletterBroadcasts.length,
          failedNewsletterRecipients: failedNewsletterRecipients.length,
          failedBulkJobs: failedBulkJobs.length,
          processingBulkJobs: processingBulkJobs.length,
          failedNotifications: failedNotificationDeliveries.length,
          failedPayments: metrics.webhookFailures,
        }),
        notificationHealth: {
          deliveriesInWindow: notificationDeliveries.length,
          failedDeliveries: failedNotificationDeliveries.length,
          recentNotifications: recentNotifications.slice(0, 12),
          broadcasts: {
            total: notificationBroadcasts.length,
            queued: notificationBroadcasts.filter((broadcast) => normalizeStatus(broadcast.status) === "queued").length,
            sent: notificationBroadcasts.filter((broadcast) => normalizeStatus(broadcast.status) === "sent").length,
            failed: notificationBroadcasts.filter((broadcast) => ["failed", "partial_failed"].includes(normalizeStatus(broadcast.status))).length,
          },
          newsletter: {
            total: newsletterBroadcasts.length,
            scheduled: scheduledNewsletterCount,
            sending: sendingNewsletterCount,
            failedBroadcasts: failedNewsletterBroadcasts.length,
            failedRecipients: failedNewsletterRecipients.length,
          },
        },
        issueQueues: issues,
        recentAuditLogs: recentAuditLogs.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("Error loading admin operations overview:", error);
    res.status(500).json({ success: false, error: "Failed to load admin operations overview" });
  }
};

exports._private = {
  buildAdminQueueWorkload,
  buildFunnel,
  buildOperationsJobCards,
  buildRevenueSeries,
  buildTopProducts,
  buildTopVendors,
  getQueueItemAgeHours,
  resolveDateRange,
  summarizeOperationsHealth,
  toOperationIssue,
};
