const { ObjectId } = require("mongodb");

const FRAUD_STATUSES = ["open", "investigating", "resolved", "dismissed"];
const REVIEW_ACTIONS = ["approve", "remove", "hide", "mark_verified", "unverify", "flag"];
const DISPUTE_DECISIONS = ["approve_customer", "approve_vendor", "partial_refund", "reject", "escalate", "close"];
const PENALTY_TYPES = ["warning", "strike", "suspension"];
const PENALTY_STATUSES = ["active", "appealed", "upheld", "removed", "expired"];
const BAN_TYPES = ["ip", "device"];
const BAN_STATUSES = ["active", "inactive", "expired"];
const TERMS_TYPES = ["terms", "privacy"];
const TERMS_STATUSES = ["draft", "published", "superseded", "archived"];

const COD_ABUSE_STATUSES = ["cancelled", "failed_delivery", "delivery_failed", "returned", "return_to_seller"];
const REVIEW_QUEUE_STATUSES = ["flagged", "pending_review", "hidden", "removed"];
const DISPUTE_STATUSES = ["pending", "requested", "under_review", "disputed", "open", "payment_disputed", "manual_review"];
const CONTENT_QUEUE_STATUSES = ["flagged", "pending_review", "changes_requested"];

const REVIEW_ABUSE_WORDS = ["abuse", "fake", "scam", "spam", "fraud"];
const CONTENT_POLICY_WORDS = ["replica", "copy product", "fake brand", "weapon", "drug", "adult"];

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const safeObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);

const idFilter = (value) => {
  const objectId = safeObjectId(value);
  return objectId ? { $or: [{ _id: objectId }, { _id: normalizeId(value) }] } : { _id: normalizeId(value) };
};

const idValues = (value) => {
  const normalized = normalizeId(value);
  const objectId = safeObjectId(value);
  return objectId ? [normalized, objectId] : [normalized];
};

const matchesAny = (value, candidates = []) => candidates.map(normalizeId).includes(normalizeId(value));

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const serializeDoc = (doc = {}) => ({
  ...doc,
  _id: normalizeId(doc._id),
});

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const collectionToArray = async (db, name, query = {}, sort = {}, limit = 0) => {
  const cursor = db.collection(name).find(query);
  if (Object.keys(sort).length > 0) cursor.sort(sort);
  if (limit > 0) cursor.limit(limit);
  return cursor.toArray();
};

const appendTrustSafetyAudit = async (req, { action, target, changes = {}, metadata = {} }) => {
  const db = req.app.locals.db;
  if (!db?.collection) return null;

  const payload = {
    action,
    module: "trust_safety",
    actor: getActor(req),
    target,
    changes,
    metadata,
    createdAt: new Date(),
  };

  const AuditLog = req.app.locals.models?.AuditLog;
  if (AuditLog?.append) return AuditLog.append(payload);
  return db.collection("audit_logs").insertOne(payload);
};

const getUserName = (user = {}) =>
  [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() ||
  user.displayName ||
  user.name ||
  user.email ||
  user.phone ||
  "Customer";

const getUserPhone = (user = {}) => user.profile?.phone || user.phone || user.mobile || user.phoneNumber || "";

const getUserIdentityValues = (user = {}) =>
  [
    normalizeId(user._id),
    safeObjectId(user._id),
    user.firebaseUid,
    user.uid,
    user.email,
    getUserPhone(user),
  ].filter(Boolean);

const getOrderIdentityValues = (order = {}) =>
  [
    order.userId,
    order.customerId,
    order.customer?.firebaseUid,
    order.customer?.email,
    order.shippingInfo?.email,
    order.shippingInfo?.phone,
  ].filter(Boolean);

const getReviewIdentityValues = (review = {}) =>
  [
    review.userId,
    review.customerId,
    review.userEmail,
    review.email,
    review.customer?.email,
    review.userName,
  ].filter(Boolean);

const userMatchesRecord = (user, values = []) => {
  const userValues = getUserIdentityValues(user);
  return values.some((value) => matchesAny(value, userValues));
};

const orderBelongsToUser = (order, user) => userMatchesRecord(user, getOrderIdentityValues(order));
const reviewBelongsToUser = (review, user) => userMatchesRecord(user, getReviewIdentityValues(review));

const getOrderAmount = (order = {}) =>
  Number(order.totalAmount ?? order.total ?? order.finalTotal ?? order.grandTotal ?? order.amount ?? 0);

const isCodOrder = (order = {}) =>
  ["cod", "cash_on_delivery", "cash on delivery"].includes(
    normalizeText(order.paymentMethod || order.payment?.method || order.paymentType),
  );

const includesPolicyWord = (value, words = CONTENT_POLICY_WORDS) => {
  const text = normalizeText(value);
  return words.find((word) => text.includes(word)) || "";
};

const severityRank = (severity = "low") => ({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}[severity] || 1);

const sortByRisk = (rows = []) =>
  [...rows].sort((left, right) => {
    const riskDiff = severityRank(right.severity) - severityRank(left.severity);
    if (riskDiff) return riskDiff;
    return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
  });

const getProductTitle = (product = {}) => product.title || product.name || product.productName || product.sku || "Product";
const getVendorName = (vendor = {}, fallback = "") => vendor.shopName || vendor.businessName || vendor.name || vendor.email || fallback || "Vendor";

const findProduct = (products = [], value) =>
  products.find((product) => matchesAny(value, idValues(product._id)) || normalizeId(product.sku) === normalizeId(value));

const hasPurchasedProduct = ({ review, orders = [] }) => {
  const reviewProductId = normalizeId(review.productId);
  if (!reviewProductId) return false;

  return orders.some((order) => {
    const sameCustomer = getReviewIdentityValues(review).some((value) => matchesAny(value, getOrderIdentityValues(order)));
    if (!sameCustomer) return false;

    const orderDelivered = ["delivered", "completed"].includes(normalizeText(order.status));
    const containsProduct = (order.products || order.items || []).some((item) =>
      matchesAny(item.productId || item._id || item.sku, [reviewProductId, review.productId]),
    );
    return orderDelivered && containsProduct;
  });
};

const buildFraudDashboard = ({ users = [], orders = [], reviews = [], flags = [], bans = [], now = new Date() }) => {
  const rows = [];
  const nowTime = new Date(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  users.forEach((user) => {
    const userReviews = reviews.filter((review) => reviewBelongsToUser(review, user));
    const reviewsLastDay = userReviews.filter((review) => {
      const createdAt = asDate(review.createdAt);
      return createdAt && nowTime - createdAt.getTime() <= dayMs;
    });

    if (reviewsLastDay.length >= 5) {
      rows.push({
        _id: `review_velocity:${normalizeId(user._id)}`,
        source: "auto",
        subjectType: "customer",
        subjectId: normalizeId(user._id),
        subjectName: getUserName(user),
        type: "abnormal_review_velocity",
        severity: reviewsLastDay.length >= 10 ? "critical" : "high",
        reason: `${reviewsLastDay.length} reviews posted in the last 24 hours`,
        status: "open",
        signalCount: reviewsLastDay.length,
        signals: reviewsLastDay.map((review) => ({
          label: "Review",
          value: normalizeId(review._id),
          createdAt: review.createdAt,
        })),
        createdAt: reviewsLastDay[0]?.createdAt || now,
      });
    }

    const codOrders = orders.filter((order) => orderBelongsToUser(order, user) && isCodOrder(order));
    const failedCodOrders = codOrders.filter((order) => COD_ABUSE_STATUSES.includes(normalizeText(order.status || order.deliveryStatus)));
    if (codOrders.length >= 3 && failedCodOrders.length >= 2 && failedCodOrders.length / codOrders.length >= 0.5) {
      rows.push({
        _id: `cod_abuse:${normalizeId(user._id)}`,
        source: "auto",
        subjectType: "customer",
        subjectId: normalizeId(user._id),
        subjectName: getUserName(user),
        type: "cod_abuse",
        severity: failedCodOrders.length >= 4 ? "critical" : "high",
        reason: `${failedCodOrders.length}/${codOrders.length} COD orders failed, cancelled, or returned`,
        status: "open",
        signalCount: failedCodOrders.length,
        signals: failedCodOrders.map((order) => ({
          label: "COD order",
          value: normalizeId(order._id),
          amount: getOrderAmount(order),
          status: order.status || order.deliveryStatus,
        })),
        createdAt: failedCodOrders[0]?.updatedAt || failedCodOrders[0]?.createdAt || now,
      });
    }
  });

  const pushSharedIdentityRows = (fieldName, type, label) => {
    const groups = new Map();
    users.forEach((user) => {
      const value = normalizeText(user[fieldName] || user.device?.[fieldName] || user.metadata?.[fieldName]);
      if (!value) return;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(user);
    });

    groups.forEach((groupUsers, value) => {
      if (groupUsers.length < 2) return;
      rows.push({
        _id: `${type}:${value}`,
        source: "auto",
        subjectType: "identity",
        subjectId: value,
        subjectName: value,
        type,
        severity: groupUsers.length >= 4 ? "critical" : "medium",
        reason: `${groupUsers.length} accounts share the same ${label}`,
        status: "open",
        signalCount: groupUsers.length,
        signals: groupUsers.map((user) => ({
          label: "Account",
          value: normalizeId(user._id),
          name: getUserName(user),
          email: user.email || "",
        })),
        createdAt: groupUsers[0]?.createdAt || now,
      });
    });
  };

  ["deviceFingerprint", "deviceId"].forEach((field) => pushSharedIdentityRows(field, "shared_device", "device"));
  ["ipAddress", "lastIp", "registrationIp"].forEach((field) => pushSharedIdentityRows(field, "shared_ip", "IP address"));

  flags.forEach((flag) => {
    const status = flag.status || "open";
    if (!FRAUD_STATUSES.includes(status)) return;
    rows.push({
      _id: normalizeId(flag._id),
      source: flag.source || "manual",
      subjectType: flag.subjectType || flag.type || "account",
      subjectId: normalizeId(flag.subjectId || flag.customerId || flag.userId || flag.vendorId || flag._id),
      subjectName: flag.subjectName || flag.customerName || flag.vendorName || "",
      type: flag.flagType || flag.type || "manual_flag",
      severity: flag.severity || "medium",
      reason: flag.reason || flag.note || "",
      status,
      signalCount: Number(flag.signalCount || (flag.signals || []).length || 1),
      signals: flag.signals || [],
      createdAt: flag.createdAt,
      resolvedAt: flag.resolvedAt || null,
    });
  });

  const activeBans = bans.filter((ban) => (ban.status || "active") === "active");
  const summary = rows.reduce(
    (acc, row) => {
      acc.totalFlags += 1;
      if (row.status === "open" || row.status === "investigating") acc.openFlags += 1;
      if (["high", "critical"].includes(row.severity)) acc.highRisk += 1;
      acc.byType[row.type] = (acc.byType[row.type] || 0) + 1;
      return acc;
    },
    {
      totalFlags: 0,
      openFlags: 0,
      highRisk: 0,
      activeBans: activeBans.length,
      sharedIpGroups: rows.filter((row) => row.type === "shared_ip").length,
      sharedDeviceGroups: rows.filter((row) => row.type === "shared_device").length,
      codAbuseFlags: rows.filter((row) => row.type === "cod_abuse").length,
      reviewVelocityFlags: rows.filter((row) => row.type === "abnormal_review_velocity").length,
      byType: {},
    },
  );

  return { summary, rows: sortByRisk(rows) };
};

const buildReviewModerationQueue = ({ reviews = [], orders = [], products = [] }) =>
  reviews
    .map((review) => {
      const product = findProduct(products, review.productId);
      const abusiveWord = includesPolicyWord(review.comment || review.content || review.title, REVIEW_ABUSE_WORDS);
      const verifiedPurchase = Boolean(review.verified || review.verifiedPurchase || hasPurchasedProduct({ review, orders }));
      const status = review.moderationStatus || review.status || (review.flagged || abusiveWord ? "flagged" : "approved");
      const queueReason = review.flagReason || review.reason || (abusiveWord ? `Contains "${abusiveWord}"` : "");

      return {
        _id: normalizeId(review._id),
        productId: normalizeId(review.productId),
        productName: getProductTitle(product),
        vendorId: normalizeId(review.vendorId || product?.vendorId || product?.sellerId),
        customerId: normalizeId(review.userId || review.customerId),
        customerName: review.userName || review.customerName || review.email || "Customer",
        rating: Number(review.rating || 0),
        comment: review.comment || review.content || "",
        status,
        flagged: Boolean(review.flagged || REVIEW_QUEUE_STATUSES.includes(status) || abusiveWord),
        reason: queueReason,
        verifiedPurchase,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      };
    })
    .filter((row) => row.flagged || REVIEW_QUEUE_STATUSES.includes(row.status))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

const getSlaDueAt = (item, type, now = new Date()) => {
  const explicit = asDate(item.slaDueAt || item.slaDeadline || item.dueAt);
  if (explicit) return explicit;

  const created = asDate(item.createdAt || item.requestedAt || item.updatedAt) || new Date(now);
  const hours = type === "payment" ? 24 : type === "return" ? 48 : 72;
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
};

const withSla = (row, now = new Date()) => {
  const dueAt = getSlaDueAt(row.raw || row, row.type, now);
  const remainingMinutes = Math.round((dueAt.getTime() - new Date(now).getTime()) / 60000);
  return {
    ...row,
    slaDueAt: dueAt,
    slaRemainingMinutes: remainingMinutes,
    breached: remainingMinutes < 0,
  };
};

const buildDisputeQueue = ({ returns = [], payments = [], disputes = [], orders = [], vendors = [], now = new Date() }) => {
  const rows = [];

  returns
    .filter((item) =>
      DISPUTE_STATUSES.includes(normalizeText(item.status || item.refundStatus)) ||
      normalizeText(item.vendorResponse) === "disputed" ||
      Boolean(item.disputeReason),
    )
    .forEach((item) => {
      const order = orders.find((orderDoc) => matchesAny(item.orderId, idValues(orderDoc._id)));
      rows.push(withSla({
        _id: `return:${normalizeId(item._id)}`,
        source: "returns",
        sourceId: normalizeId(item._id),
        type: "return",
        status: item.status || item.refundStatus || "under_review",
        priority: item.priority || (item.vendorResponse === "disputed" ? "high" : "medium"),
        orderId: normalizeId(item.orderId || order?._id),
        customerName: item.customerName || item.customerInfo?.name || order?.shippingInfo?.name || "Customer",
        vendorName: item.vendorName || order?.vendorName || "Vendor",
        reason: item.disputeReason || item.reason || item.returnReason || "Return dispute",
        amount: Number(item.refundAmount || item.amount || getOrderAmount(order)),
        createdAt: item.createdAt || item.requestedAt,
        raw: item,
      }, now));
    });

  payments
    .filter((item) => DISPUTE_STATUSES.includes(normalizeText(item.status || item.paymentStatus || item.reviewStatus)))
    .forEach((item) => {
      const order = orders.find((orderDoc) => matchesAny(item.orderId, idValues(orderDoc._id)));
      rows.push(withSla({
        _id: `payment:${normalizeId(item._id)}`,
        source: "payments",
        sourceId: normalizeId(item._id),
        type: "payment",
        status: item.status || item.paymentStatus || "manual_review",
        priority: item.priority || "high",
        orderId: normalizeId(item.orderId || order?._id),
        customerName: item.customerName || order?.shippingInfo?.name || "Customer",
        vendorName: item.vendorName || order?.vendorName || "Vendor",
        reason: item.disputeReason || item.failureReason || item.reviewNote || "Payment dispute",
        amount: Number(item.amount || getOrderAmount(order)),
        createdAt: item.createdAt || item.updatedAt,
        raw: item,
      }, now));
    });

  disputes.forEach((item) => {
    if (["resolved", "closed", "rejected"].includes(normalizeText(item.status))) return;
    const vendor = vendors.find((vendorDoc) => matchesAny(item.vendorId, idValues(vendorDoc._id)));
    rows.push(withSla({
      _id: `dispute:${normalizeId(item._id)}`,
      source: "trust_safety_disputes",
      sourceId: normalizeId(item._id),
      type: item.type || "vendor_customer",
      status: item.status || "open",
      priority: item.priority || "medium",
      orderId: normalizeId(item.orderId),
      customerName: item.customerName || "Customer",
      vendorName: item.vendorName || getVendorName(vendor),
      reason: item.reason || item.subject || "Vendor-customer conflict",
      amount: Number(item.amount || 0),
      createdAt: item.createdAt,
      raw: item,
    }, now));
  });

  return rows.sort((left, right) => {
    if (left.breached !== right.breached) return left.breached ? -1 : 1;
    return left.slaRemainingMinutes - right.slaRemainingMinutes;
  });
};

const buildSellerPenaltyLog = ({ vendors = [], penalties = [] }) => {
  const rows = [];

  penalties.forEach((penalty) => {
    const vendor = vendors.find((item) => matchesAny(penalty.vendorId, idValues(item._id)));
    rows.push({
      _id: normalizeId(penalty._id),
      source: "seller_penalties",
      vendorId: normalizeId(penalty.vendorId),
      vendorName: penalty.vendorName || getVendorName(vendor),
      type: penalty.type || "warning",
      severity: penalty.severity || "medium",
      strikeNumber: penalty.strikeNumber || null,
      reason: penalty.reason || "",
      status: penalty.status || "active",
      admin: penalty.admin || penalty.issuedBy || "",
      appealResponse: penalty.appealResponse || penalty.appeal?.response || "",
      createdAt: penalty.createdAt,
    });
  });

  vendors.forEach((vendor) => {
    (vendor.violations || []).forEach((violation) => {
      rows.push({
        _id: normalizeId(violation._id || `${vendor._id}:${violation.strikeNumber}:${violation.createdAt}`),
        source: "vendors.violations",
        vendorId: normalizeId(vendor._id),
        vendorName: getVendorName(vendor),
        type: violation.type || "strike",
        severity: violation.severity || "warning",
        strikeNumber: violation.strikeNumber || null,
        reason: violation.reason || "",
        status: violation.status || "active",
        admin: violation.issuedBy || violation.admin || "",
        appealResponse: violation.appealResponse || violation.appeal?.response || "",
        createdAt: violation.createdAt,
      });
    });
  });

  return rows.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
};

const buildContentPolicyViolations = ({ products = [], vendors = [], violations = [] }) => {
  const rows = [];

  products.forEach((product) => {
    const productFlags = [
      ...(product.moderationFlags || []),
      ...(product.contentPolicyFlags || []),
    ];
    const word = includesPolicyWord(`${product.title || product.name || ""} ${product.description || ""}`);
    if (word && !productFlags.some((flag) => flag.type === "prohibited_keyword")) {
      productFlags.push({ type: "prohibited_keyword", message: `Contains "${word}"`, severity: "high" });
    }

    if (!productFlags.length && !CONTENT_QUEUE_STATUSES.includes(normalizeText(product.approvalStatus || product.status))) return;

    const vendor = vendors.find((item) => matchesAny(product.vendorId || product.sellerId, idValues(item._id)));
    productFlags.forEach((flag, index) => {
      rows.push({
        _id: `product:${normalizeId(product._id)}:${index}`,
        source: "products",
        sourceId: normalizeId(product._id),
        subjectType: "product",
        subjectTitle: getProductTitle(product),
        vendorId: normalizeId(product.vendorId || product.sellerId),
        vendorName: getVendorName(vendor, product.vendorName || product.shopName),
        rule: flag.type || flag.rule || "content_policy",
        issue: flag.message || flag.reason || flag.note || "Product content needs review",
        severity: flag.severity || "medium",
        status: product.approvalStatus || product.status || "flagged",
        imageUrls: product.images || product.imageUrls || [],
        createdAt: flag.createdAt || product.updatedAt || product.createdAt,
      });
    });
  });

  vendors.forEach((vendor) => {
    const word = includesPolicyWord(`${vendor.shopName || ""} ${vendor.shopDescription || vendor.description || ""}`);
    const flags = [...(vendor.policyFlags || [])];
    if (word) flags.push({ type: "shop_name_policy", message: `Shop text contains "${word}"`, severity: "high" });

    flags.forEach((flag, index) => {
      rows.push({
        _id: `vendor:${normalizeId(vendor._id)}:${index}`,
        source: "vendors",
        sourceId: normalizeId(vendor._id),
        subjectType: "shop",
        subjectTitle: getVendorName(vendor),
        vendorId: normalizeId(vendor._id),
        vendorName: getVendorName(vendor),
        rule: flag.type || flag.rule || "shop_policy",
        issue: flag.message || flag.reason || flag.note || "Shop content needs review",
        severity: flag.severity || "medium",
        status: vendor.adminStatus || vendor.status || "flagged",
        imageUrls: [vendor.logo, vendor.banner].filter(Boolean),
        createdAt: flag.createdAt || vendor.updatedAt || vendor.createdAt,
      });
    });
  });

  violations.forEach((violation) => {
    if (["resolved", "dismissed"].includes(normalizeText(violation.status))) return;
    rows.push({
      _id: normalizeId(violation._id),
      source: "content_policy_violations",
      sourceId: normalizeId(violation.subjectId || violation.sourceId),
      subjectType: violation.subjectType || "content",
      subjectTitle: violation.subjectTitle || violation.title || "Policy violation",
      vendorId: normalizeId(violation.vendorId),
      vendorName: violation.vendorName || "",
      rule: violation.rule || violation.type || "content_policy",
      issue: violation.issue || violation.reason || "",
      severity: violation.severity || "medium",
      status: violation.status || "open",
      imageUrls: violation.imageUrls || [],
      createdAt: violation.createdAt,
    });
  });

  return sortByRisk(rows);
};

const buildTermsSummary = (versions = []) => {
  const byType = TERMS_TYPES.reduce((acc, type) => {
    acc[type] = versions
      .filter((version) => version.type === type)
      .sort((left, right) => new Date(right.publishedAt || right.createdAt || 0) - new Date(left.publishedAt || left.createdAt || 0));
    return acc;
  }, {});

  return {
    active: {
      terms: byType.terms.find((version) => version.status === "published") || null,
      privacy: byType.privacy.find((version) => version.status === "published") || null,
    },
    versions: versions
      .map(serializeDoc)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)),
  };
};

exports.getTrustSafetyOverview = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users, orders, reviews, fraudFlags, customerFlags, bans, returns, payments, disputes, vendors, penalties, products, contentViolations, terms] =
      await Promise.all([
        collectionToArray(db, "users", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "orders", {}, { createdAt: -1 }, 1000),
        collectionToArray(db, "reviews", {}, { createdAt: -1 }, 1000),
        collectionToArray(db, "trust_safety_flags", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "customer_flags", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "trust_safety_bans", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "returns", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "payments", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "trust_safety_disputes", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "vendors", {}, { updatedAt: -1 }, 500),
        collectionToArray(db, "seller_penalties", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "products", {}, { updatedAt: -1 }, 1000),
        collectionToArray(db, "content_policy_violations", {}, { createdAt: -1 }, 500),
        collectionToArray(db, "policy_terms_versions", {}, { createdAt: -1 }, 100),
      ]);

    const fraud = buildFraudDashboard({ users, orders, reviews, flags: [...fraudFlags, ...customerFlags], bans });
    const reviewQueue = buildReviewModerationQueue({ reviews, orders, products });
    const disputesQueue = buildDisputeQueue({ returns, payments, disputes, orders, vendors });
    const penaltiesLog = buildSellerPenaltyLog({ vendors, penalties });
    const contentQueue = buildContentPolicyViolations({ products, vendors, violations: contentViolations });
    const termsSummary = buildTermsSummary(terms);

    res.json({
      success: true,
      data: {
        kpis: {
          openFraudFlags: fraud.summary.openFlags,
          highRiskFlags: fraud.summary.highRisk,
          reviewQueue: reviewQueue.length,
          activeDisputes: disputesQueue.length,
          breachedDisputes: disputesQueue.filter((item) => item.breached).length,
          sellerPenalties: penaltiesLog.filter((item) => item.status === "active").length,
          contentViolations: contentQueue.length,
          activeBans: fraud.summary.activeBans,
          forceAcceptTerms: terms.filter((item) => item.status === "published" && item.forceAccept).length,
        },
        fraud: fraud.rows.slice(0, 8),
        reviews: reviewQueue.slice(0, 8),
        disputes: disputesQueue.slice(0, 8),
        penalties: penaltiesLog.slice(0, 8),
        contentViolations: contentQueue.slice(0, 8),
        activeTerms: termsSummary.active,
      },
    });
  } catch (error) {
    console.error("Error loading trust safety overview:", error);
    res.status(500).json({ success: false, error: "Failed to load trust safety overview" });
  }
};

exports.getFraudDashboard = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users, orders, reviews, fraudFlags, customerFlags, bans] = await Promise.all([
      collectionToArray(db, "users", {}, { createdAt: -1 }, 1000),
      collectionToArray(db, "orders", {}, { createdAt: -1 }, 2000),
      collectionToArray(db, "reviews", {}, { createdAt: -1 }, 2000),
      collectionToArray(db, "trust_safety_flags", {}, { createdAt: -1 }, 1000),
      collectionToArray(db, "customer_flags", {}, { createdAt: -1 }, 1000),
      collectionToArray(db, "trust_safety_bans", {}, { createdAt: -1 }, 1000),
    ]);

    const data = buildFraudDashboard({ users, orders, reviews, flags: [...fraudFlags, ...customerFlags], bans });
    const status = req.query.status || "all";
    data.rows = data.rows.filter((row) => (status === "all" ? true : row.status === status));
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error loading fraud dashboard:", error);
    res.status(500).json({ success: false, error: "Failed to load fraud dashboard" });
  }
};

exports.createFraudFlag = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const type = String(req.body.type || req.body.flagType || "manual_flag").trim();
    const subjectId = normalizeId(req.body.subjectId || req.body.customerId || req.body.vendorId);
    const reason = String(req.body.reason || "").trim();

    if (!subjectId) return res.status(400).json({ success: false, error: "Subject ID is required" });
    if (!reason) return res.status(400).json({ success: false, error: "Fraud flag reason is required" });

    const now = new Date();
    const flag = {
      subjectType: req.body.subjectType || "account",
      subjectId,
      subjectName: req.body.subjectName || "",
      type,
      flagType: type,
      severity: req.body.severity || "medium",
      reason,
      status: req.body.status || "open",
      signals: Array.isArray(req.body.signals) ? req.body.signals : [],
      source: "manual",
      createdBy: getActor(req),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("trust_safety_flags").insertOne(flag);
    await appendTrustSafetyAudit(req, {
      action: "fraud.flag.created",
      target: { type: flag.subjectType, id: subjectId },
      changes: { flagType: type, severity: flag.severity, reason },
    });

    res.status(201).json({ success: true, message: "Fraud flag created", data: { ...flag, _id: normalizeId(result.insertedId) } });
  } catch (error) {
    console.error("Error creating fraud flag:", error);
    res.status(500).json({ success: false, error: "Failed to create fraud flag" });
  }
};

exports.updateFraudFlag = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const status = req.body.status || "investigating";
    if (!FRAUD_STATUSES.includes(status)) return res.status(400).json({ success: false, error: "Invalid fraud flag status" });

    const update = {
      status,
      note: req.body.note || "",
      updatedAt: new Date(),
      updatedBy: getActor(req),
    };
    if (["resolved", "dismissed"].includes(status)) update.resolvedAt = new Date();

    const result = await db.collection("trust_safety_flags").updateOne(idFilter(req.params.flagId), { $set: update });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Fraud flag not found" });

    await appendTrustSafetyAudit(req, {
      action: "fraud.flag.updated",
      target: { type: "trust_safety_flag", id: req.params.flagId },
      changes: update,
    });

    res.json({ success: true, message: "Fraud flag updated" });
  } catch (error) {
    console.error("Error updating fraud flag:", error);
    res.status(500).json({ success: false, error: "Failed to update fraud flag" });
  }
};

exports.getReviewModerationQueue = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [reviews, orders, products] = await Promise.all([
      collectionToArray(db, "reviews", {}, { createdAt: -1 }, 2000),
      collectionToArray(db, "orders", {}, { createdAt: -1 }, 2000),
      collectionToArray(db, "products", {}, { updatedAt: -1 }, 1000),
    ]);

    const status = req.query.status || "all";
    const rows = buildReviewModerationQueue({ reviews, orders, products })
      .filter((row) => (status === "all" ? true : row.status === status));

    res.json({
      success: true,
      data: {
        summary: {
          total: rows.length,
          unverified: rows.filter((row) => !row.verifiedPurchase).length,
          abusive: rows.filter((row) => row.reason).length,
        },
        rows,
      },
    });
  } catch (error) {
    console.error("Error loading review moderation queue:", error);
    res.status(500).json({ success: false, error: "Failed to load review moderation queue" });
  }
};

exports.moderateReview = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const action = req.body.action;
    const reason = String(req.body.reason || "").trim();
    if (!REVIEW_ACTIONS.includes(action)) return res.status(400).json({ success: false, error: "Invalid review moderation action" });
    if (["remove", "hide", "flag"].includes(action) && !reason) {
      return res.status(400).json({ success: false, error: "Reason is required for this review action" });
    }

    const now = new Date();
    const update = {
      updatedAt: now,
      moderatedAt: now,
      moderatedBy: getActor(req).userId,
      moderationReason: reason,
    };

    if (action === "approve") Object.assign(update, { moderationStatus: "approved", status: "published", flagged: false, hidden: false });
    if (action === "remove") Object.assign(update, { moderationStatus: "removed", status: "removed", removedAt: now, removedBy: getActor(req).userId, hidden: true });
    if (action === "hide") Object.assign(update, { moderationStatus: "hidden", status: "hidden", hidden: true });
    if (action === "mark_verified") Object.assign(update, { verified: true, verifiedPurchase: true, moderationStatus: "approved" });
    if (action === "unverify") Object.assign(update, { verified: false, verifiedPurchase: false });
    if (action === "flag") Object.assign(update, { flagged: true, moderationStatus: "flagged", status: "flagged" });

    const result = await db.collection("reviews").updateOne(idFilter(req.params.reviewId), { $set: update });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Review not found" });

    await db.collection("review_moderation_actions").insertOne({
      reviewId: req.params.reviewId,
      action,
      reason,
      actor: getActor(req),
      createdAt: now,
    });
    await appendTrustSafetyAudit(req, {
      action: "review.moderated",
      target: { type: "review", id: req.params.reviewId },
      changes: { action, reason },
    });

    res.json({ success: true, message: "Review moderation saved" });
  } catch (error) {
    console.error("Error moderating review:", error);
    res.status(500).json({ success: false, error: "Failed to moderate review" });
  }
};

exports.getDisputeCenter = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [returns, payments, disputes, orders, vendors] = await Promise.all([
      collectionToArray(db, "returns", {}, { createdAt: -1 }, 1000),
      collectionToArray(db, "payments", {}, { createdAt: -1 }, 1000),
      collectionToArray(db, "trust_safety_disputes", {}, { createdAt: -1 }, 1000),
      collectionToArray(db, "orders", {}, { createdAt: -1 }, 2000),
      collectionToArray(db, "vendors", {}, { updatedAt: -1 }, 500),
    ]);

    const rows = buildDisputeQueue({ returns, payments, disputes, orders, vendors })
      .filter((row) => (req.query.type && req.query.type !== "all" ? row.type === req.query.type : true));

    res.json({
      success: true,
      data: {
        summary: {
          total: rows.length,
          breached: rows.filter((row) => row.breached).length,
          highPriority: rows.filter((row) => row.priority === "high").length,
          returnDisputes: rows.filter((row) => row.type === "return").length,
          paymentDisputes: rows.filter((row) => row.type === "payment").length,
        },
        rows,
      },
    });
  } catch (error) {
    console.error("Error loading dispute center:", error);
    res.status(500).json({ success: false, error: "Failed to load dispute center" });
  }
};

exports.createDispute = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const reason = String(req.body.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, error: "Dispute reason is required" });

    const now = new Date();
    const dispute = {
      type: req.body.type || "vendor_customer",
      orderId: normalizeId(req.body.orderId),
      customerId: normalizeId(req.body.customerId),
      customerName: req.body.customerName || "",
      vendorId: normalizeId(req.body.vendorId),
      vendorName: req.body.vendorName || "",
      priority: req.body.priority || "medium",
      status: "open",
      reason,
      amount: Number(req.body.amount || 0),
      slaDueAt: asDate(req.body.slaDueAt) || getSlaDueAt({ createdAt: now }, req.body.type || "vendor_customer"),
      createdBy: getActor(req),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("trust_safety_disputes").insertOne(dispute);
    await appendTrustSafetyAudit(req, {
      action: "dispute.created",
      target: { type: "dispute", id: normalizeId(result.insertedId) },
      changes: { type: dispute.type, reason },
    });

    res.status(201).json({ success: true, message: "Dispute created", data: { ...dispute, _id: normalizeId(result.insertedId) } });
  } catch (error) {
    console.error("Error creating dispute:", error);
    res.status(500).json({ success: false, error: "Failed to create dispute" });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const source = req.body.source || req.query.source || "trust_safety_disputes";
    const decision = req.body.decision || "close";
    const resolutionNote = String(req.body.resolutionNote || req.body.note || "").trim();

    if (!DISPUTE_DECISIONS.includes(decision)) return res.status(400).json({ success: false, error: "Invalid dispute decision" });
    if (!resolutionNote) return res.status(400).json({ success: false, error: "Resolution note is required" });

    const now = new Date();
    const update = {
      status: decision === "escalate" ? "under_review" : "resolved",
      resolutionDecision: decision,
      resolutionNote,
      resolvedAt: decision === "escalate" ? null : now,
      resolvedBy: getActor(req),
      updatedAt: now,
    };

    let collectionName = "trust_safety_disputes";
    if (source === "returns" || source === "return") collectionName = "returns";
    if (source === "payments" || source === "payment") collectionName = "payments";

    const result = await db.collection(collectionName).updateOne(idFilter(req.params.disputeId), { $set: update });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Dispute not found" });

    await appendTrustSafetyAudit(req, {
      action: "dispute.resolved",
      target: { type: collectionName, id: req.params.disputeId },
      changes: { decision, resolutionNote },
    });

    res.json({ success: true, message: "Dispute resolution saved" });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({ success: false, error: "Failed to resolve dispute" });
  }
};

exports.getSellerPenaltyLog = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [vendors, penalties] = await Promise.all([
      collectionToArray(db, "vendors", {}, { updatedAt: -1 }, 1000),
      collectionToArray(db, "seller_penalties", {}, { createdAt: -1 }, 1000),
    ]);

    const rows = buildSellerPenaltyLog({ vendors, penalties })
      .filter((row) => (req.query.vendorId ? row.vendorId === normalizeId(req.query.vendorId) : true))
      .filter((row) => (req.query.status && req.query.status !== "all" ? row.status === req.query.status : true));

    res.json({
      success: true,
      data: {
        summary: {
          total: rows.length,
          active: rows.filter((row) => row.status === "active").length,
          appealed: rows.filter((row) => row.status === "appealed").length,
          suspensions: rows.filter((row) => row.type === "suspension").length,
        },
        rows,
      },
    });
  } catch (error) {
    console.error("Error loading seller penalty log:", error);
    res.status(500).json({ success: false, error: "Failed to load seller penalty log" });
  }
};

exports.createSellerPenalty = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorId = normalizeId(req.body.vendorId);
    const type = req.body.type || "warning";
    const reason = String(req.body.reason || "").trim();

    if (!vendorId) return res.status(400).json({ success: false, error: "Vendor ID is required" });
    if (!PENALTY_TYPES.includes(type)) return res.status(400).json({ success: false, error: "Invalid seller penalty type" });
    if (!reason) return res.status(400).json({ success: false, error: "Penalty reason is required" });

    const vendor = await db.collection("vendors").findOne(idFilter(vendorId));
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor not found" });

    const now = new Date();
    const activeStrikes = (vendor.violations || []).filter((violation) => violation.status !== "removed").length + (type === "strike" ? 1 : 0);
    const shouldSuspend = type === "suspension" || activeStrikes >= 3;
    const penalty = {
      vendorId,
      vendorName: getVendorName(vendor),
      type,
      severity: req.body.severity || (type === "suspension" ? "high" : "medium"),
      strikeNumber: type === "strike" ? activeStrikes : null,
      reason,
      note: req.body.note || "",
      status: "active",
      admin: getActor(req).userId,
      issuedBy: getActor(req).userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("seller_penalties").insertOne(penalty);
    const violation = {
      _id: result.insertedId,
      type,
      severity: penalty.severity,
      strikeNumber: penalty.strikeNumber,
      reason,
      note: penalty.note,
      status: "active",
      issuedBy: getActor(req).userId,
      createdAt: now,
    };
    const $set = { updatedAt: now };
    if (shouldSuspend) {
      $set.status = "suspended";
      $set.adminStatus = "suspended";
      $set.statusNote = reason;
      $set.statusUpdatedAt = now;
      $set.statusUpdatedBy = getActor(req).userId;
    }

    await db.collection("vendors").updateOne(idFilter(vendorId), { $push: { violations: violation }, $set });
    await appendTrustSafetyAudit(req, {
      action: "seller.penalty.created",
      target: { type: "vendor", id: vendorId },
      changes: { type, reason, suspended: shouldSuspend },
    });

    res.status(201).json({
      success: true,
      message: shouldSuspend ? "Penalty created and seller suspended" : "Penalty created",
      data: { ...penalty, _id: normalizeId(result.insertedId) },
    });
  } catch (error) {
    console.error("Error creating seller penalty:", error);
    res.status(500).json({ success: false, error: "Failed to create seller penalty" });
  }
};

exports.updateSellerPenaltyAppeal = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const status = req.body.status || "appealed";
    if (!PENALTY_STATUSES.includes(status)) return res.status(400).json({ success: false, error: "Invalid penalty status" });

    const update = {
      status,
      appealResponse: req.body.appealResponse || req.body.response || "",
      appealReviewedBy: getActor(req),
      appealReviewedAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("seller_penalties").updateOne(idFilter(req.params.penaltyId), { $set: update });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Penalty not found" });

    await appendTrustSafetyAudit(req, {
      action: "seller.penalty.appeal_updated",
      target: { type: "seller_penalty", id: req.params.penaltyId },
      changes: update,
    });

    res.json({ success: true, message: "Penalty appeal response saved" });
  } catch (error) {
    console.error("Error updating seller penalty appeal:", error);
    res.status(500).json({ success: false, error: "Failed to update seller penalty appeal" });
  }
};

exports.getContentPolicyViolations = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [products, vendors, violations] = await Promise.all([
      collectionToArray(db, "products", {}, { updatedAt: -1 }, 2000),
      collectionToArray(db, "vendors", {}, { updatedAt: -1 }, 1000),
      collectionToArray(db, "content_policy_violations", {}, { createdAt: -1 }, 1000),
    ]);

    const rows = buildContentPolicyViolations({ products, vendors, violations })
      .filter((row) => (req.query.source && req.query.source !== "all" ? row.source === req.query.source : true));

    res.json({
      success: true,
      data: {
        summary: {
          total: rows.length,
          products: rows.filter((row) => row.subjectType === "product").length,
          shops: rows.filter((row) => row.subjectType === "shop").length,
          highRisk: rows.filter((row) => ["high", "critical"].includes(row.severity)).length,
        },
        rows,
      },
    });
  } catch (error) {
    console.error("Error loading content policy violations:", error);
    res.status(500).json({ success: false, error: "Failed to load content policy violations" });
  }
};

exports.reviewContentPolicyViolation = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const action = req.body.action || "resolved";
    const note = String(req.body.note || req.body.reason || "").trim();
    if (!["dismiss", "request_changes", "delist", "suspend_shop", "resolved"].includes(action)) {
      return res.status(400).json({ success: false, error: "Invalid content policy action" });
    }
    if (["request_changes", "delist", "suspend_shop"].includes(action) && !note) {
      return res.status(400).json({ success: false, error: "Reason is required for this content policy action" });
    }

    const now = new Date();
    const customResult = await db.collection("content_policy_violations").updateOne(idFilter(req.params.violationId), {
      $set: {
        status: action === "dismiss" ? "dismissed" : "resolved",
        action,
        reviewNote: note,
        reviewedBy: getActor(req),
        reviewedAt: now,
        updatedAt: now,
      },
    });

    let matched = customResult.matchedCount;
    const [source, sourceId] = String(req.params.violationId).split(":");
    if (!matched && source === "product" && sourceId) {
      const update = {
        updatedAt: now,
        policyReviewedAt: now,
        policyReviewedBy: getActor(req).userId,
        policyReviewNote: note,
      };
      if (action === "dismiss") Object.assign(update, { approvalStatus: "approved", status: "active", moderationFlags: [] });
      if (action === "request_changes") Object.assign(update, { approvalStatus: "changes_requested", status: "changes_requested" });
      if (action === "delist") Object.assign(update, { approvalStatus: "rejected", status: "delisted", delistedReason: note });
      const result = await db.collection("products").updateOne(idFilter(sourceId), { $set: update });
      matched = result.matchedCount;
    }

    if (!matched && source === "vendor" && sourceId) {
      const update = {
        updatedAt: now,
        policyReviewedAt: now,
        policyReviewedBy: getActor(req).userId,
        policyReviewNote: note,
      };
      if (action === "dismiss") Object.assign(update, { policyFlags: [] });
      if (action === "request_changes") Object.assign(update, { adminStatus: "changes_requested", statusNote: note });
      if (action === "suspend_shop") Object.assign(update, { adminStatus: "suspended", status: "suspended", statusNote: note });
      const result = await db.collection("vendors").updateOne(idFilter(sourceId), { $set: update });
      matched = result.matchedCount;
    }

    if (!matched) return res.status(404).json({ success: false, error: "Content policy violation not found" });

    await appendTrustSafetyAudit(req, {
      action: "content_policy.reviewed",
      target: { type: "content_policy_violation", id: req.params.violationId },
      changes: { action, note },
    });

    res.json({ success: true, message: "Content policy action saved" });
  } catch (error) {
    console.error("Error reviewing content policy violation:", error);
    res.status(500).json({ success: false, error: "Failed to review content policy violation" });
  }
};

exports.getBanList = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const rows = await collectionToArray(db, "trust_safety_bans", {}, { createdAt: -1 }, 1000);
    const filteredRows = rows
      .filter((row) => (req.query.type && req.query.type !== "all" ? row.type === req.query.type : true))
      .filter((row) => (req.query.status && req.query.status !== "all" ? (row.status || "active") === req.query.status : true))
      .map(serializeDoc);

    res.json({
      success: true,
      data: {
        summary: {
          total: filteredRows.length,
          active: filteredRows.filter((row) => (row.status || "active") === "active").length,
          ip: filteredRows.filter((row) => row.type === "ip").length,
          device: filteredRows.filter((row) => row.type === "device").length,
        },
        rows: filteredRows,
      },
    });
  } catch (error) {
    console.error("Error loading ban list:", error);
    res.status(500).json({ success: false, error: "Failed to load ban list" });
  }
};

exports.createBanListEntry = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const type = req.body.type;
    const value = String(req.body.value || "").trim();
    const reason = String(req.body.reason || "").trim();

    if (!BAN_TYPES.includes(type)) return res.status(400).json({ success: false, error: "Ban type must be ip or device" });
    if (!value) return res.status(400).json({ success: false, error: "Ban value is required" });
    if (!reason) return res.status(400).json({ success: false, error: "Ban reason is required" });

    const now = new Date();
    const entry = {
      type,
      value,
      normalizedValue: normalizeText(value),
      scope: req.body.scope || "checkout",
      reason,
      status: req.body.status || "active",
      expiresAt: asDate(req.body.expiresAt),
      createdBy: getActor(req),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("trust_safety_bans").insertOne(entry);
    await appendTrustSafetyAudit(req, {
      action: "ban.created",
      target: { type, id: value },
      changes: { reason, scope: entry.scope },
    });

    res.status(201).json({ success: true, message: "Ban list entry created", data: { ...entry, _id: normalizeId(result.insertedId) } });
  } catch (error) {
    console.error("Error creating ban list entry:", error);
    res.status(500).json({ success: false, error: "Failed to create ban list entry" });
  }
};

exports.updateBanListEntry = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const status = req.body.status || "inactive";
    if (!BAN_STATUSES.includes(status)) return res.status(400).json({ success: false, error: "Invalid ban status" });

    const update = {
      status,
      reason: req.body.reason,
      expiresAt: asDate(req.body.expiresAt),
      updatedBy: getActor(req),
      updatedAt: new Date(),
    };
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const result = await db.collection("trust_safety_bans").updateOne(idFilter(req.params.banId), { $set: update });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Ban list entry not found" });

    await appendTrustSafetyAudit(req, {
      action: "ban.updated",
      target: { type: "trust_safety_ban", id: req.params.banId },
      changes: update,
    });

    res.json({ success: true, message: "Ban list entry updated" });
  } catch (error) {
    console.error("Error updating ban list entry:", error);
    res.status(500).json({ success: false, error: "Failed to update ban list entry" });
  }
};

exports.getTermsVersions = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const versions = await collectionToArray(db, "policy_terms_versions", {}, { createdAt: -1 }, 500);
    res.json({ success: true, data: buildTermsSummary(versions) });
  } catch (error) {
    console.error("Error loading terms versions:", error);
    res.status(500).json({ success: false, error: "Failed to load terms versions" });
  }
};

exports.createTermsVersion = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const type = req.body.type || "terms";
    const version = String(req.body.version || "").trim();
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || req.body.content || "").trim();
    const status = req.body.publish ? "published" : (req.body.status || "draft");

    if (!TERMS_TYPES.includes(type)) return res.status(400).json({ success: false, error: "Policy type must be terms or privacy" });
    if (!version) return res.status(400).json({ success: false, error: "Policy version is required" });
    if (!title || !body) return res.status(400).json({ success: false, error: "Policy title and body are required" });
    if (!TERMS_STATUSES.includes(status)) return res.status(400).json({ success: false, error: "Invalid policy status" });

    const now = new Date();
    if (status === "published") {
      await db.collection("policy_terms_versions").updateMany({ type, status: "published" }, {
        $set: { status: "superseded", supersededAt: now, updatedAt: now },
      });
    }

    const doc = {
      type,
      version,
      title,
      body,
      summary: req.body.summary || "",
      status,
      forceAccept: Boolean(req.body.forceAccept || req.body.publish),
      publishedAt: status === "published" ? now : null,
      publishedBy: status === "published" ? getActor(req) : null,
      createdBy: getActor(req),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("policy_terms_versions").insertOne(doc);
    if (status === "published" && doc.forceAccept) {
      await db.collection("users").updateMany({}, {
        $set: {
          termsAcceptanceRequired: true,
          requiredTermsType: type,
          requiredTermsVersion: version,
          updatedAt: now,
        },
      });
    }

    await appendTrustSafetyAudit(req, {
      action: status === "published" ? "terms.published" : "terms.created",
      target: { type, id: version },
      changes: { status, forceAccept: doc.forceAccept },
    });

    res.status(201).json({ success: true, message: status === "published" ? "Policy version published" : "Policy draft created", data: { ...doc, _id: normalizeId(result.insertedId) } });
  } catch (error) {
    console.error("Error creating terms version:", error);
    res.status(500).json({ success: false, error: "Failed to create policy version" });
  }
};

exports.publishTermsVersion = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const version = await db.collection("policy_terms_versions").findOne(idFilter(req.params.versionId));
    if (!version) return res.status(404).json({ success: false, error: "Policy version not found" });

    const now = new Date();
    await db.collection("policy_terms_versions").updateMany({ type: version.type, status: "published" }, {
      $set: { status: "superseded", supersededAt: now, updatedAt: now },
    });
    await db.collection("policy_terms_versions").updateOne(idFilter(req.params.versionId), {
      $set: {
        status: "published",
        forceAccept: req.body.forceAccept !== undefined ? Boolean(req.body.forceAccept) : Boolean(version.forceAccept),
        publishedAt: now,
        publishedBy: getActor(req),
        updatedAt: now,
      },
    });

    const forceAccept = req.body.forceAccept !== undefined ? Boolean(req.body.forceAccept) : Boolean(version.forceAccept);
    if (forceAccept) {
      await db.collection("users").updateMany({}, {
        $set: {
          termsAcceptanceRequired: true,
          requiredTermsType: version.type,
          requiredTermsVersion: version.version,
          updatedAt: now,
        },
      });
    }

    await appendTrustSafetyAudit(req, {
      action: "terms.published",
      target: { type: version.type, id: normalizeId(version._id) },
      changes: { version: version.version, forceAccept },
    });

    res.json({ success: true, message: "Policy version published" });
  } catch (error) {
    console.error("Error publishing terms version:", error);
    res.status(500).json({ success: false, error: "Failed to publish policy version" });
  }
};

exports.getTrustSafetyAuditLog = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const rows = await collectionToArray(db, "audit_logs", { module: "trust_safety" }, { createdAt: -1 }, 100);
    res.json({ success: true, data: rows.map(serializeDoc) });
  } catch (error) {
    console.error("Error loading trust safety audit log:", error);
    res.status(500).json({ success: false, error: "Failed to load trust safety audit log" });
  }
};

exports._trustSafetyTestUtils = {
  buildFraudDashboard,
  buildReviewModerationQueue,
  buildDisputeQueue,
  buildSellerPenaltyLog,
  buildContentPolicyViolations,
  buildTermsSummary,
  hasPurchasedProduct,
};
