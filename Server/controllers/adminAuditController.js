const MAX_LIMIT = 200;
const SUMMARY_LIMIT = 1000;

const statusText = {
  ok: "OK",
  warning: "Warning",
  critical: "Critical",
};

const compact = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
};

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const moduleActionPrefixes = {
  customers: ["customer", "customers"],
  finance: ["finance", "payout", "payouts", "payment", "payments"],
  logistics: ["logistics", "dispatch", "delivery"],
  orders: ["order", "orders"],
  platform: ["platform"],
  products: ["product", "products"],
  promotions: ["promotion", "promotions", "coupon", "coupons", "campaign"],
  returns: ["return", "returns"],
  reviews: ["review", "reviews"],
  support: ["support", "ticket", "tickets"],
  vendors: ["vendor", "vendors"],
};

const parsePositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const deriveModule = (log = {}) => {
  if (log.module) return String(log.module);
  const action = String(log.action || "");
  const firstSegment = action.split(".")[0];
  if (!firstSegment) return "system";

  const moduleMap = {
    customer: "customers",
    customers: "customers",
    finance: "finance",
    logistics: "logistics",
    order: "orders",
    orders: "orders",
    payout: "finance",
    payouts: "finance",
    platform: "platform",
    product: "products",
    products: "products",
    promotion: "promotions",
    promotions: "promotions",
    return: "returns",
    returns: "returns",
    review: "reviews",
    reviews: "reviews",
    support: "support",
    vendor: "vendors",
    vendors: "vendors",
  };

  return moduleMap[firstSegment] || firstSegment || "system";
};

const deriveSeverity = (log = {}) => {
  if (log.severity) return String(log.severity).toLowerCase();
  if (log.metadata?.severity) return String(log.metadata.severity).toLowerCase();

  const action = String(log.action || "").toLowerCase();
  const statusCode = Number(log.statusCode || log.request?.statusCode || log.response?.statusCode || 0);

  if (statusCode >= 500 || /(failed|failure|error|disabled|suspended|deleted)/.test(action)) {
    return "critical";
  }

  if (statusCode >= 400 || /(rejected|refund|override|force|warning|hold|ban|risk)/.test(action)) {
    return "warning";
  }

  return "ok";
};

const serializeAuditLog = (log = {}) => {
  const actor = log.actor || {};
  const target = log.target || {};
  const request = log.request || {};
  const severity = deriveSeverity(log);

  return {
    id: String(log._id || log.id || ""),
    action: log.action || "unknown.action",
    module: deriveModule(log),
    severity,
    severityLabel: statusText[severity] || severity,
    message: log.message || log.description || "",
    actor: {
      id: compact(actor.userId || actor.id || log.actorId),
      name: compact(actor.name || actor.displayName),
      email: compact(actor.email || log.actorEmail),
      role: compact(actor.role || log.actorRole),
    },
    target: {
      type: compact(target.type || log.targetType),
      id: compact(target.id || log.targetId),
      name: compact(target.name || target.title),
      path: compact(target.path || log.path || request.path),
    },
    request: {
      method: compact(request.method || log.method),
      path: compact(request.path || log.path),
      ip: compact(request.ip || log.ip),
      userAgent: compact(request.userAgent || log.userAgent),
      statusCode: compact(log.statusCode || request.statusCode || log.response?.statusCode),
    },
    metadata: log.metadata || {},
    diff: log.diff || log.changes || null,
    createdAt: log.createdAt || log.timestamp || null,
    raw: log,
  };
};

const buildAuditQuery = (filters = {}) => {
  const query = {};
  const andClauses = [];

  if (filters.module && filters.module !== "all") {
    const module = String(filters.module);
    const prefixes = moduleActionPrefixes[module] || [module];
    andClauses.push({
      $or: [
        { module },
        { action: { $regex: `^(${prefixes.map(escapeRegex).join("|")})\\.`, $options: "i" } },
      ],
    });
  }
  if (filters.actorId) query["actor.userId"] = filters.actorId;
  if (filters.actorEmail) query["actor.email"] = { $regex: escapeRegex(filters.actorEmail), $options: "i" };
  if (filters.action) query.action = { $regex: escapeRegex(filters.action), $options: "i" };
  if (filters.targetType && filters.targetType !== "all") query["target.type"] = filters.targetType;
  if (filters.targetId) query["target.id"] = String(filters.targetId);

  const from = parseDate(filters.from || filters.startDate);
  const to = parseDate(filters.to || filters.endDate);
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  if (filters.severity && filters.severity !== "all") {
    const severity = String(filters.severity).toLowerCase();
    andClauses.push({
      $or: [
        { severity },
        { "metadata.severity": severity },
        ...(severity === "critical"
          ? [{ statusCode: { $gte: 500 } }, { action: { $regex: "(failed|failure|error|disabled|suspended|deleted)", $options: "i" } }]
          : []),
        ...(severity === "warning"
          ? [
            { statusCode: { $gte: 400, $lt: 500 } },
            { action: { $regex: "(rejected|refund|override|force|warning|hold|ban|risk)", $options: "i" } },
          ]
          : []),
      ],
    });
  }

  if (filters.search) {
    const searchRegex = { $regex: escapeRegex(filters.search), $options: "i" };
    andClauses.push({
      $or: [
        { action: searchRegex },
        { module: searchRegex },
        { message: searchRegex },
        { "actor.email": searchRegex },
        { "actor.name": searchRegex },
        { "actor.role": searchRegex },
        { "target.type": searchRegex },
        { "target.id": searchRegex },
        { "target.name": searchRegex },
        { "target.path": searchRegex },
        { path: searchRegex },
        { ip: searchRegex },
        { "request.path": searchRegex },
        { "request.ip": searchRegex },
      ],
    });
  }

  if (andClauses.length) {
    return Object.keys(query).length ? { $and: [query, ...andClauses] } : { $and: andClauses };
  }

  return query;
};

const countBy = (rows, resolver) =>
  rows.reduce((acc, row) => {
    const key = resolver(row) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const getActionGroup = (action = "") => String(action).split(".")[0] || "unknown";

const buildAuditSummary = (rows = [], total = 0) => {
  const serialized = rows.map(serializeAuditLog);
  const bySeverity = countBy(serialized, (row) => row.severity);

  return {
    total,
    sampled: serialized.length,
    byModule: countBy(serialized, (row) => row.module),
    byActionGroup: countBy(serialized, (row) => getActionGroup(row.action)),
    bySeverity,
    criticalCount: bySeverity.critical || 0,
    warningCount: bySeverity.warning || 0,
    okCount: bySeverity.ok || 0,
    sensitiveCount: serialized.filter((row) =>
      /(payout|payment|refund|commission|role|permission|2fa|suspend|delete|override)/i.test(row.action),
    ).length,
  };
};

const getCollection = (req) => {
  const db = req.app.locals.db;
  if (db?.collection) return db.collection("audit_logs");

  const modelCollection = req.app.locals.models?.AuditLog?.collection;
  if (modelCollection?.find) return modelCollection;

  return null;
};

exports.getUnifiedAuditLogs = async (req, res) => {
  try {
    const collection = getCollection(req);
    if (!collection) {
      return res.status(503).json({ success: false, error: "Audit log storage is not configured" });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 50, MAX_LIMIT);
    const query = buildAuditQuery(req.query);
    const skip = (page - 1) * limit;

    const cursor = collection.find(query).sort({ createdAt: -1 });
    if (typeof cursor.skip === "function") cursor.skip(skip);
    cursor.limit(limit);

    const summaryCursor = collection.find(query).sort({ createdAt: -1 }).limit(SUMMARY_LIMIT);

    const [logs, total, summaryRows] = await Promise.all([
      cursor.toArray(),
      collection.countDocuments(query),
      summaryCursor.toArray(),
    ]);

    res.json({
      success: true,
      data: {
        logs: logs.map(serializeAuditLog),
        summary: buildAuditSummary(summaryRows, total),
        filters: {
          search: req.query.search || "",
          module: req.query.module || "all",
          severity: req.query.severity || "all",
          action: req.query.action || "",
          targetType: req.query.targetType || "all",
          from: req.query.from || req.query.startDate || "",
          to: req.query.to || req.query.endDate || "",
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching unified audit logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports._testUtils = {
  buildAuditQuery,
  buildAuditSummary,
  deriveModule,
  deriveSeverity,
  serializeAuditLog,
};
