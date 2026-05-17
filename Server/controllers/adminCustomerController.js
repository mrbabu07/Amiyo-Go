const { ObjectId } = require("mongodb");
const emailService = require("../services/emailService");

const CUSTOMER_STATUSES = ["active", "suspended", "banned", "merged"];
const LOYALTY_ACTIONS = ["award", "deduct"];
const DEFAULT_TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 10000,
};

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const safeObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const idFilter = (value) => {
  const objectId = safeObjectId(value);
  return objectId ? { $or: [{ _id: objectId }, { _id: normalizeId(value) }] } : { _id: normalizeId(value) };
};

const serializeDoc = (doc) => ({
  ...doc,
  _id: normalizeId(doc?._id),
});

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const getCustomerName = (user = {}) =>
  [
    user.profile?.firstName,
    user.profile?.lastName,
  ].filter(Boolean).join(" ").trim() ||
  user.displayName ||
  user.name ||
  user.email ||
  "Customer";

const getCustomerPhone = (user = {}) =>
  user.profile?.phone || user.phone || user.mobile || user.phoneNumber || "";

const getCustomerMatchValues = (user = {}) => {
  const objectId = safeObjectId(user._id);
  const values = [
    normalizeId(user._id),
    objectId,
    user.firebaseUid,
    user.uid,
    user.email,
    getCustomerPhone(user),
  ].filter(Boolean);

  const seen = new Set();
  return values.filter((value) => {
    const key = value instanceof ObjectId ? `object:${value.toString()}` : `value:${normalizeId(value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const matchesAny = (value, candidates) => candidates.map(normalizeId).includes(normalizeId(value));

const orderBelongsToCustomer = (order, user, values = getCustomerMatchValues(user)) => {
  const email = String(user.email || "").toLowerCase();
  const phone = getCustomerPhone(user);
  return (
    matchesAny(order.userId, values) ||
    matchesAny(order.customerId, values) ||
    matchesAny(order.customer?.firebaseUid, values) ||
    (email && String(order.shippingInfo?.email || order.customer?.email || "").toLowerCase() === email) ||
    (phone && normalizeId(order.shippingInfo?.phone || order.customer?.phone) === normalizeId(phone))
  );
};

const returnBelongsToCustomer = (item, user, orderIds = [], values = getCustomerMatchValues(user)) => {
  const email = String(user.email || "").toLowerCase();
  return (
    matchesAny(item.userId, values) ||
    matchesAny(item.customerId, values) ||
    matchesAny(item.orderId, orderIds) ||
    (email && String(item.customerInfo?.email || item.email || "").toLowerCase() === email)
  );
};

const ticketBelongsToCustomer = (ticket, user, values = getCustomerMatchValues(user)) => {
  const email = String(user.email || "").toLowerCase();
  return (
    matchesAny(ticket.userId, values) ||
    matchesAny(ticket.customerId, values) ||
    (email && String(ticket.customerInfo?.email || ticket.email || "").toLowerCase() === email)
  );
};

const addressBelongsToCustomer = (address, user, values = getCustomerMatchValues(user)) =>
  matchesAny(address.userId, values) || matchesAny(address.customerId, values);

const paymentBelongsToCustomer = (payment, user, orderIds = [], values = getCustomerMatchValues(user)) =>
  matchesAny(payment.userId, values) ||
  matchesAny(payment.customerId, values) ||
  matchesAny(payment.orderId, orderIds);

const collectionToArray = async (db, name, query = {}, sort = {}) => {
  const cursor = db.collection(name).find(query);
  if (Object.keys(sort).length > 0) cursor.sort(sort);
  return cursor.toArray();
};

const appendCustomerAudit = async (req, { action, target, changes = {}, metadata = {} }) => {
  const db = req.app.locals.db;
  if (!db?.collection) return null;
  const payload = {
    action,
    module: "customers",
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

const calculateTierFromThresholds = (totalEarned = 0, thresholds = DEFAULT_TIER_THRESHOLDS) => {
  const earned = Number(totalEarned || 0);
  if (earned >= Number(thresholds.platinum ?? DEFAULT_TIER_THRESHOLDS.platinum)) return "platinum";
  if (earned >= Number(thresholds.gold ?? DEFAULT_TIER_THRESHOLDS.gold)) return "gold";
  if (earned >= Number(thresholds.silver ?? DEFAULT_TIER_THRESHOLDS.silver)) return "silver";
  return "bronze";
};

const getOrderTotal = (order) => Number(order.totalAmount ?? order.total ?? order.finalTotal ?? order.grandTotal ?? 0);

const getOrderIdValues = (orders = []) =>
  [...new Set(orders.flatMap((order) => [normalizeId(order._id), order.orderId, order.orderNumber]).filter(Boolean))];

const buildPaymentMethods = (payments = [], orders = []) => {
  const map = new Map();
  const addMethod = ({ method, status, amount = 0, date, reference = "" }) => {
    const key = String(method || "unknown").toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        method: key,
        label: key.replaceAll("_", " ").toUpperCase(),
        orderCount: 0,
        totalAmount: 0,
        lastUsedAt: null,
        statuses: new Set(),
        references: new Set(),
      });
    }
    const row = map.get(key);
    row.orderCount += 1;
    row.totalAmount = roundMoney(row.totalAmount + Number(amount || 0));
    row.lastUsedAt = !row.lastUsedAt || new Date(date || 0) > new Date(row.lastUsedAt) ? date : row.lastUsedAt;
    if (status) row.statuses.add(status);
    if (reference) row.references.add(reference);
  };

  payments.forEach((payment) => addMethod({
    method: payment.paymentMethod || payment.method,
    status: payment.status,
    amount: payment.amount,
    date: payment.updatedAt || payment.createdAt,
    reference: payment.transactionId || payment.manualReference || payment.paymentReference,
  }));

  orders.forEach((order) => addMethod({
    method: order.paymentMethod,
    status: order.paymentStatus || order.status,
    amount: getOrderTotal(order),
    date: order.updatedAt || order.createdAt,
    reference: order.transactionId || order.paymentReference,
  }));

  return [...map.values()].map((row) => ({
    ...row,
    totalAmount: roundMoney(row.totalAmount),
    statuses: [...row.statuses],
    references: [...row.references].slice(0, 3),
  }));
};

const buildCustomerMetrics = ({ orders = [], returns = [], tickets = [], loyalty = null }) => {
  const paidOrders = orders.filter((order) => !["cancelled"].includes(order.status));
  const totalSpend = roundMoney(paidOrders.reduce((sum, order) => sum + getOrderTotal(order), 0));
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;

  return {
    orderCount: orders.length,
    deliveredOrders,
    totalSpend,
    averageOrderValue: paidOrders.length ? roundMoney(totalSpend / paidOrders.length) : 0,
    returnCount: returns.length,
    openTickets: tickets.filter((ticket) => !["closed", "resolved"].includes(ticket.status)).length,
    loyaltyPoints: Number(loyalty?.points || 0),
    loyaltyTier: loyalty?.tier || "bronze",
  };
};

const buildCustomerListRows = ({ users = [], orders = [], returns = [], tickets = [], loyalties = [], flags = [] }) =>
  users.map((user) => {
    const values = getCustomerMatchValues(user);
    const customerOrders = orders.filter((order) => orderBelongsToCustomer(order, user, values));
    const orderIds = getOrderIdValues(customerOrders);
    const customerReturns = returns.filter((item) => returnBelongsToCustomer(item, user, orderIds, values));
    const customerTickets = tickets.filter((ticket) => ticketBelongsToCustomer(ticket, user, values));
    const loyalty = loyalties.find((item) => matchesAny(item.userId, values) || item.email === user.email);
    const customerFlags = flags.filter((flag) => matchesAny(flag.customerId || flag.userId, values));
    const metrics = buildCustomerMetrics({
      orders: customerOrders,
      returns: customerReturns,
      tickets: customerTickets,
      loyalty,
    });

    return {
      _id: normalizeId(user._id),
      firebaseUid: user.firebaseUid || "",
      name: getCustomerName(user),
      email: user.email || "",
      phone: getCustomerPhone(user),
      role: user.role || "customer",
      status: user.status || "active",
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      suspensionUntil: user.suspensionUntil || null,
      flags: customerFlags.map((flag) => ({
        _id: normalizeId(flag._id),
        type: flag.type || flag.flagType || "manual",
        severity: flag.severity || "medium",
        reason: flag.reason || flag.note || "",
      })),
      ...metrics,
    };
  });

const buildCustomerDetail = ({
  user,
  orders = [],
  returns = [],
  addresses = [],
  payments = [],
  tickets = [],
  loyalty = null,
  flags = [],
  referrals = [],
}) => {
  const values = getCustomerMatchValues(user);
  const customerOrders = orders.filter((order) => orderBelongsToCustomer(order, user, values));
  const orderIds = getOrderIdValues(customerOrders);
  const customerReturns = returns.filter((item) => returnBelongsToCustomer(item, user, orderIds, values));
  const customerTickets = tickets.filter((ticket) => ticketBelongsToCustomer(ticket, user, values));
  const customerAddresses = addresses.filter((address) => addressBelongsToCustomer(address, user, values));
  const customerPayments = payments.filter((payment) => paymentBelongsToCustomer(payment, user, orderIds, values));
  const customerFlags = flags.filter((flag) => matchesAny(flag.customerId || flag.userId, values));
  const referralCode = loyalty?.referralCode || "";
  const referredUsers = referrals.filter((referral) =>
    referral.referrerId === user.firebaseUid ||
    referral.referrerUserId === user.firebaseUid ||
    referral.referralCode === referralCode ||
    matchesAny(referral.referrerCustomerId, values),
  );
  const metrics = buildCustomerMetrics({
    orders: customerOrders,
    returns: customerReturns,
    tickets: customerTickets,
    loyalty,
  });

  return {
    profile: {
      _id: normalizeId(user._id),
      firebaseUid: user.firebaseUid || "",
      name: getCustomerName(user),
      email: user.email || "",
      phone: getCustomerPhone(user),
      role: user.role || "customer",
      status: user.status || "active",
      tier: loyalty?.tier || "bronze",
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      suspensionReason: user.suspensionReason || "",
      suspensionUntil: user.suspensionUntil || null,
      banReason: user.banReason || "",
    },
    metrics,
    addresses: customerAddresses.map(serializeDoc),
    paymentMethods: buildPaymentMethods(customerPayments, customerOrders),
    openTickets: customerTickets.filter((ticket) => !["closed", "resolved"].includes(ticket.status)).map(serializeDoc),
    tickets: customerTickets.map(serializeDoc),
    flags: customerFlags.map(serializeDoc),
    loyalty: loyalty
      ? {
          ...serializeDoc(loyalty),
          transactions: [...(loyalty.transactions || [])].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)),
        }
      : null,
    referrals: referredUsers.map(serializeDoc),
    orders: customerOrders
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .map(serializeDoc),
    returns: customerReturns.map(serializeDoc),
  };
};

const buildReferralDashboard = ({ loyalties = [], referrals = [], users = [] }) => {
  const userByValue = new Map();
  users.forEach((user) => {
    getCustomerMatchValues(user).forEach((value) => userByValue.set(normalizeId(value), user));
  });

  const rowsFromLoyalty = loyalties
    .filter((loyalty) => loyalty.referralCode)
    .map((loyalty) => {
      const referrer = userByValue.get(normalizeId(loyalty.userId)) || userByValue.get(normalizeId(loyalty.email));
      const referredAccounts = loyalties.filter((candidate) => candidate.referredBy === loyalty.userId);
      const extraRecords = referrals.filter((referral) => referral.referralCode === loyalty.referralCode || referral.referrerId === loyalty.userId);
      const creditAwarded = referredAccounts.reduce((sum, account) => (
        sum + (account.transactions || [])
          .filter((transaction) => /welcome|referral/i.test(transaction.reason || ""))
          .reduce((total, transaction) => total + Number(transaction.points || 0), 0)
      ), 0);

      return {
        referralCode: loyalty.referralCode,
        referrerId: loyalty.userId,
        referrerName: referrer ? getCustomerName(referrer) : loyalty.email,
        referrerEmail: referrer?.email || loyalty.email || "",
        link: `/register?ref=${loyalty.referralCode}`,
        clicks: extraRecords.reduce((sum, record) => sum + Number(record.clicks || 0), 0),
        conversions: referredAccounts.length + extraRecords.filter((record) => record.status === "converted").length,
        creditAwarded: creditAwarded + extraRecords.reduce((sum, record) => sum + Number(record.creditAwarded || 0), 0),
        fraudFlags: extraRecords.filter((record) => record.fraudFlagged || record.status === "fraud_flagged").length,
        referredUsers: referredAccounts.map((account) => ({
          userId: account.userId,
          email: account.email,
          points: account.points || 0,
          createdAt: account.createdAt,
        })),
      };
    });

  const standaloneRows = referrals
    .filter((record) => !rowsFromLoyalty.some((row) => row.referralCode === record.referralCode))
    .map((record) => ({
      referralCode: record.referralCode || record.code || "manual",
      referrerId: record.referrerId || record.referrerUserId || "",
      referrerName: record.referrerName || record.referrerEmail || "Unknown",
      referrerEmail: record.referrerEmail || "",
      link: record.link || `/register?ref=${record.referralCode || ""}`,
      clicks: Number(record.clicks || 0),
      conversions: record.status === "converted" ? 1 : Number(record.conversions || 0),
      creditAwarded: Number(record.creditAwarded || 0),
      fraudFlags: record.fraudFlagged || record.status === "fraud_flagged" ? 1 : 0,
      referredUsers: [],
    }));

  const rows = [...rowsFromLoyalty, ...standaloneRows];

  return {
    summary: {
      referralLinks: rows.length,
      conversions: rows.reduce((sum, row) => sum + Number(row.conversions || 0), 0),
      creditAwarded: rows.reduce((sum, row) => sum + Number(row.creditAwarded || 0), 0),
      fraudFlags: rows.reduce((sum, row) => sum + Number(row.fraudFlags || 0), 0),
    },
    rows: rows.sort((left, right) => Number(right.conversions || 0) - Number(left.conversions || 0)),
  };
};

const loadCustomerData = async (db) => {
  const [orders, returns, tickets, loyalties, flags] = await Promise.all([
    collectionToArray(db, "orders", {}, { createdAt: -1 }),
    collectionToArray(db, "returns", {}, { createdAt: -1 }),
    collectionToArray(db, "supportTickets", {}, { createdAt: -1 }),
    collectionToArray(db, "loyalties", {}, { updatedAt: -1 }),
    collectionToArray(db, "customer_flags", {}, { createdAt: -1 }),
  ]);
  return { orders, returns, tickets, loyalties, flags };
};

const findCustomer = async (db, customerId) => {
  const users = db.collection("users");
  const user =
    await users.findOne(idFilter(customerId)) ||
    await users.findOne({ firebaseUid: customerId }) ||
    await users.findOne({ email: customerId });
  return user;
};

const createStatusEmailHtml = ({ name, status, reason, until }) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h2>Account status update</h2>
    <p>Hi ${name || "Customer"},</p>
    <p>Your marketplace account status is now <strong>${status}</strong>.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
    ${until ? `<p><strong>Until:</strong> ${until.toLocaleString("en-BD")}</p>` : ""}
    <p>Please contact support if you believe this needs review.</p>
  </div>
`;

exports.getCustomerList = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(Number(req.query.limit || 20), 100));
    const query = {};
    const search = String(req.query.search || "").trim();

    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.role && req.query.role !== "all") {
      query.role = req.query.role;
    } else {
      query.role = "customer";
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { email: regex },
        { displayName: regex },
        { name: regex },
        { phone: regex },
        { "profile.firstName": regex },
        { "profile.lastName": regex },
        { "profile.phone": regex },
      ];
    }

    const usersCursor = db.collection("users").find(query).sort({ createdAt: -1 });
    const users = await usersCursor.skip((page - 1) * limit).limit(limit).toArray();
    const total = await db.collection("users").countDocuments(query);
    const related = await loadCustomerData(db);

    res.json({
      success: true,
      data: buildCustomerListRows({ users, ...related }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error loading customers:", error);
    res.status(500).json({ success: false, error: "Failed to load customers" });
  }
};

exports.getCustomerDetail = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = await findCustomer(db, req.params.customerId);
    if (!user) return res.status(404).json({ success: false, error: "Customer not found" });

    const [orders, returns, addresses, payments, tickets, flags, referrals, loyalties] = await Promise.all([
      collectionToArray(db, "orders", {}, { createdAt: -1 }),
      collectionToArray(db, "returns", {}, { createdAt: -1 }),
      collectionToArray(db, "addresses", {}, { createdAt: -1 }),
      collectionToArray(db, "payments", {}, { createdAt: -1 }),
      collectionToArray(db, "supportTickets", {}, { createdAt: -1 }),
      collectionToArray(db, "customer_flags", {}, { createdAt: -1 }),
      collectionToArray(db, "customer_referrals", {}, { createdAt: -1 }),
      collectionToArray(db, "loyalties", {}, { updatedAt: -1 }),
    ]);
    const values = getCustomerMatchValues(user);
    const loyalty = loyalties.find((item) => matchesAny(item.userId, values) || item.email === user.email) || null;

    res.json({
      success: true,
      data: buildCustomerDetail({
        user,
        orders,
        returns,
        addresses,
        payments,
        tickets,
        loyalty,
        flags,
        referrals,
      }),
    });
  } catch (error) {
    console.error("Error loading customer detail:", error);
    res.status(500).json({ success: false, error: "Failed to load customer detail" });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const status = String(req.body.status || "").trim();
    const reason = String(req.body.reason || "").trim();
    const suspensionUntil = asDate(req.body.suspensionUntil || req.body.until);

    if (!CUSTOMER_STATUSES.includes(status) || status === "merged") {
      return res.status(400).json({ success: false, error: "Status must be active, suspended, or banned" });
    }
    if (["suspended", "banned"].includes(status) && !reason) {
      return res.status(400).json({ success: false, error: "Reason is required for account restrictions" });
    }

    const user = await findCustomer(db, req.params.customerId);
    if (!user) return res.status(404).json({ success: false, error: "Customer not found" });
    if (user.firebaseUid && user.firebaseUid === req.user?.uid) {
      return res.status(403).json({ success: false, error: "You cannot change your own status" });
    }

    const now = new Date();
    const update = {
      status,
      statusReason: status === "active" ? "" : reason,
      suspensionReason: status === "suspended" ? reason : "",
      suspensionUntil: status === "suspended" ? suspensionUntil : null,
      banReason: status === "banned" ? reason : "",
      banType: status === "banned" ? (req.body.permanent === false ? "temporary" : "permanent") : "",
      statusChangedAt: now,
      statusChangedBy: getActor(req),
      updatedAt: now,
    };

    await db.collection("users").updateOne(idFilter(user._id), { $set: update });
    await db.collection("customer_notices").insertOne({
      customerId: normalizeId(user._id),
      firebaseUid: user.firebaseUid || "",
      email: user.email || "",
      type: "account_status",
      status,
      reason,
      suspensionUntil,
      sentAt: now,
      actor: getActor(req),
    });

    if (user.email) {
      await emailService.sendEmail(
        user.email,
        `Account ${status}`,
        createStatusEmailHtml({
          name: getCustomerName(user),
          status,
          reason,
          until: suspensionUntil,
        }),
      );
    }

    await appendCustomerAudit(req, {
      action: "customers.status.updated",
      target: { type: "customer", id: normalizeId(user._id) },
      changes: update,
    });

    const updated = await db.collection("users").findOne(idFilter(user._id));
    res.json({ success: true, data: serializeDoc(updated) });
  } catch (error) {
    console.error("Error updating customer status:", error);
    res.status(500).json({ success: false, error: "Failed to update customer status" });
  }
};

exports.mergeDuplicateCustomers = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const sourceCustomerId = req.body.sourceCustomerId || req.params.sourceCustomerId;
    const targetCustomerId = req.body.targetCustomerId || req.params.targetCustomerId;
    const reason = String(req.body.reason || "").trim();

    if (!sourceCustomerId || !targetCustomerId) {
      return res.status(400).json({ success: false, error: "Source and target customers are required" });
    }
    if (normalizeId(sourceCustomerId) === normalizeId(targetCustomerId)) {
      return res.status(400).json({ success: false, error: "Source and target customers must be different" });
    }

    const source = await findCustomer(db, sourceCustomerId);
    const target = await findCustomer(db, targetCustomerId);
    if (!source || !target) return res.status(404).json({ success: false, error: "Customer not found" });

    const sourceValues = getCustomerMatchValues(source);
    const targetUserId = target.firebaseUid || normalizeId(target._id);
    const now = new Date();
    const moved = {};

    const collections = [
      ["orders", { userId: targetUserId, customerId: normalizeId(target._id), mergedFromCustomerId: normalizeId(source._id), updatedAt: now }],
      ["returns", { userId: targetUserId, customerId: normalizeId(target._id), mergedFromCustomerId: normalizeId(source._id), updatedAt: now }],
      ["addresses", { userId: targetUserId, customerId: normalizeId(target._id), updatedAt: now }],
      ["payments", { userId: targetUserId, customerId: normalizeId(target._id), updatedAt: now }],
      ["supportTickets", { userId: targetUserId, customerId: normalizeId(target._id), updatedAt: now }],
      ["wishlists", { userId: targetUserId, customerId: normalizeId(target._id), updatedAt: now }],
      ["reviews", { userId: targetUserId, customerId: normalizeId(target._id), updatedAt: now }],
    ];

    await Promise.all(collections.map(async ([name, set]) => {
      const result = await db.collection(name).updateMany({ userId: { $in: sourceValues } }, { $set: set });
      moved[name] = result.modifiedCount || result.matchedCount || 0;
    }));

    const loyalties = db.collection("loyalties");
    const sourceLoyalty = await loyalties.findOne({ userId: { $in: sourceValues } });
    const targetValues = getCustomerMatchValues(target);
    const targetLoyalty = await loyalties.findOne({ userId: { $in: targetValues } });

    if (sourceLoyalty && targetLoyalty) {
      const mergedTransactions = [
        ...(targetLoyalty.transactions || []),
        ...(sourceLoyalty.transactions || []),
        {
          type: "earned",
          points: 0,
          reason: `Admin merged loyalty account from ${source.email || source.firebaseUid}`,
          date: now,
          action: "merge",
        },
      ];
      const totalEarned = Number(targetLoyalty.totalEarned || 0) + Number(sourceLoyalty.totalEarned || 0);
      const thresholds = (await db.collection("customer_settings").findOne({ _id: "loyalty_program" }))?.tierThresholds || DEFAULT_TIER_THRESHOLDS;
      await loyalties.updateOne(
        idFilter(targetLoyalty._id),
        {
          $set: {
            points: Number(targetLoyalty.points || 0) + Number(sourceLoyalty.points || 0),
            totalEarned,
            totalRedeemed: Number(targetLoyalty.totalRedeemed || 0) + Number(sourceLoyalty.totalRedeemed || 0),
            tier: calculateTierFromThresholds(totalEarned, thresholds),
            transactions: mergedTransactions,
            updatedAt: now,
          },
        },
      );
      await loyalties.deleteOne(idFilter(sourceLoyalty._id));
      moved.loyaltyAccounts = 1;
    } else if (sourceLoyalty) {
      await loyalties.updateOne(
        idFilter(sourceLoyalty._id),
        { $set: { userId: targetUserId, email: target.email || sourceLoyalty.email, updatedAt: now } },
      );
      moved.loyaltyAccounts = 1;
    }

    await db.collection("users").updateOne(
      idFilter(source._id),
      {
        $set: {
          status: "merged",
          mergedIntoCustomerId: normalizeId(target._id),
          mergedAt: now,
          mergeReason: reason,
          updatedAt: now,
        },
      },
    );
    await db.collection("customer_merges").insertOne({
      sourceCustomerId: normalizeId(source._id),
      targetCustomerId: normalizeId(target._id),
      reason,
      moved,
      actor: getActor(req),
      createdAt: now,
    });
    await appendCustomerAudit(req, {
      action: "customers.duplicates.merged",
      target: { type: "customer", id: normalizeId(target._id) },
      changes: { sourceCustomerId: normalizeId(source._id), targetCustomerId: normalizeId(target._id), moved },
    });

    res.json({ success: true, data: { sourceCustomerId: normalizeId(source._id), targetCustomerId: normalizeId(target._id), moved } });
  } catch (error) {
    console.error("Error merging customers:", error);
    res.status(500).json({ success: false, error: "Failed to merge duplicate customers" });
  }
};

exports.adjustCustomerLoyalty = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const action = String(req.body.action || "").trim();
    const points = Math.floor(Number(req.body.points || 0));
    const reason = String(req.body.reason || "").trim();

    if (!LOYALTY_ACTIONS.includes(action)) return res.status(400).json({ success: false, error: "Action must be award or deduct" });
    if (points <= 0) return res.status(400).json({ success: false, error: "Points must be greater than zero" });
    if (!reason) return res.status(400).json({ success: false, error: "Reason is required" });

    const user = await findCustomer(db, req.params.customerId);
    if (!user) return res.status(404).json({ success: false, error: "Customer not found" });

    const values = getCustomerMatchValues(user);
    const loyaltyCol = db.collection("loyalties");
    let loyalty = await loyaltyCol.findOne({ userId: { $in: values } });
    const now = new Date();
    const settings = await db.collection("customer_settings").findOne({ _id: "loyalty_program" });
    const thresholds = settings?.tierThresholds || DEFAULT_TIER_THRESHOLDS;

    if (!loyalty) {
      loyalty = {
        userId: user.firebaseUid || normalizeId(user._id),
        email: user.email || "",
        points: 0,
        tier: "bronze",
        totalEarned: 0,
        totalRedeemed: 0,
        referralCode: `REF${normalizeId(user.firebaseUid || user._id).slice(0, 8).toUpperCase()}`,
        transactions: [],
        createdAt: now,
        updatedAt: now,
      };
      const result = await loyaltyCol.insertOne(loyalty);
      loyalty._id = result.insertedId;
    }

    const nextPoints = action === "award"
      ? Number(loyalty.points || 0) + points
      : Math.max(0, Number(loyalty.points || 0) - points);
    const nextTotalEarned = action === "award" ? Number(loyalty.totalEarned || 0) + points : Number(loyalty.totalEarned || 0);
    const nextTotalRedeemed = action === "deduct" ? Number(loyalty.totalRedeemed || 0) + points : Number(loyalty.totalRedeemed || 0);
    const transaction = {
      type: action === "award" ? "earned" : "redeemed",
      action: `admin_${action}`,
      points,
      reason,
      date: now,
      actor: getActor(req),
    };

    await loyaltyCol.updateOne(
      idFilter(loyalty._id),
      {
        $set: {
          points: nextPoints,
          totalEarned: nextTotalEarned,
          totalRedeemed: nextTotalRedeemed,
          tier: calculateTierFromThresholds(nextTotalEarned, thresholds),
          transactions: [...(loyalty.transactions || []), transaction],
          updatedAt: now,
        },
      },
    );

    await appendCustomerAudit(req, {
      action: `customers.loyalty.${action}`,
      target: { type: "customer", id: normalizeId(user._id) },
      changes: { points, reason },
    });

    const updated = await loyaltyCol.findOne(idFilter(loyalty._id));
    res.json({ success: true, data: serializeDoc(updated) });
  } catch (error) {
    console.error("Error adjusting loyalty points:", error);
    res.status(500).json({ success: false, error: "Failed to adjust loyalty points" });
  }
};

exports.getCustomerLoyaltyLedger = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = await findCustomer(db, req.params.customerId);
    if (!user) return res.status(404).json({ success: false, error: "Customer not found" });
    const values = getCustomerMatchValues(user);
    const loyalty = await db.collection("loyalties").findOne({ userId: { $in: values } });
    res.json({
      success: true,
      data: {
        account: loyalty ? serializeDoc(loyalty) : null,
        ledger: [...(loyalty?.transactions || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      },
    });
  } catch (error) {
    console.error("Error loading loyalty ledger:", error);
    res.status(500).json({ success: false, error: "Failed to load loyalty ledger" });
  }
};

exports.getLoyaltyProgram = async (req, res) => {
  try {
    const saved = await req.app.locals.db.collection("customer_settings").findOne({ _id: "loyalty_program" });
    res.json({
      success: true,
      data: {
        tierThresholds: DEFAULT_TIER_THRESHOLDS,
        referralCredit: 500,
        referredWelcomeCredit: 100,
        fraudRules: { maxAccountsPerPhone: 2, maxAccountsPerDevice: 3 },
        ...(saved || {}),
      },
    });
  } catch (error) {
    console.error("Error loading loyalty program:", error);
    res.status(500).json({ success: false, error: "Failed to load loyalty program" });
  }
};

exports.updateLoyaltyProgram = async (req, res) => {
  try {
    const now = new Date();
    const tierThresholds = {
      bronze: Number(req.body.tierThresholds?.bronze ?? req.body.bronze ?? 0),
      silver: Number(req.body.tierThresholds?.silver ?? req.body.silver ?? DEFAULT_TIER_THRESHOLDS.silver),
      gold: Number(req.body.tierThresholds?.gold ?? req.body.gold ?? DEFAULT_TIER_THRESHOLDS.gold),
      platinum: Number(req.body.tierThresholds?.platinum ?? req.body.platinum ?? DEFAULT_TIER_THRESHOLDS.platinum),
    };

    if (!(tierThresholds.bronze <= tierThresholds.silver && tierThresholds.silver <= tierThresholds.gold && tierThresholds.gold <= tierThresholds.platinum)) {
      return res.status(400).json({ success: false, error: "Tier thresholds must increase from bronze to platinum" });
    }

    const payload = {
      _id: "loyalty_program",
      tierThresholds,
      referralCredit: Number(req.body.referralCredit ?? 500),
      referredWelcomeCredit: Number(req.body.referredWelcomeCredit ?? 100),
      fraudRules: {
        maxAccountsPerPhone: Number(req.body.fraudRules?.maxAccountsPerPhone ?? 2),
        maxAccountsPerDevice: Number(req.body.fraudRules?.maxAccountsPerDevice ?? 3),
      },
      updatedAt: now,
      updatedBy: getActor(req),
    };

    await req.app.locals.db.collection("customer_settings").updateOne(
      { _id: "loyalty_program" },
      { $set: payload, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    await appendCustomerAudit(req, {
      action: "customers.loyalty_program.updated",
      target: { type: "customer_settings", id: "loyalty_program" },
      changes: payload,
    });

    const saved = await req.app.locals.db.collection("customer_settings").findOne({ _id: "loyalty_program" });
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error("Error updating loyalty program:", error);
    res.status(500).json({ success: false, error: "Failed to update loyalty program" });
  }
};

exports.getReferralDashboard = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [loyalties, referrals, users] = await Promise.all([
      collectionToArray(db, "loyalties", {}, { updatedAt: -1 }),
      collectionToArray(db, "customer_referrals", {}, { createdAt: -1 }),
      collectionToArray(db, "users", {}, { createdAt: -1 }),
    ]);

    res.json({ success: true, data: buildReferralDashboard({ loyalties, referrals, users }) });
  } catch (error) {
    console.error("Error loading referral dashboard:", error);
    res.status(500).json({ success: false, error: "Failed to load referral dashboard" });
  }
};

exports.getCustomerAuditLog = async (req, res) => {
  try {
    const logs = await collectionToArray(req.app.locals.db, "audit_logs", { module: "customers" }, { createdAt: -1 });
    res.json({ success: true, data: logs.slice(0, 100).map(serializeDoc) });
  } catch (error) {
    console.error("Error loading customer audit log:", error);
    res.status(500).json({ success: false, error: "Failed to load customer audit log" });
  }
};

exports._customerTestUtils = {
  buildCustomerDetail,
  buildCustomerListRows,
  buildCustomerMetrics,
  buildPaymentMethods,
  buildReferralDashboard,
  calculateTierFromThresholds,
  getCustomerMatchValues,
  orderBelongsToCustomer,
};
