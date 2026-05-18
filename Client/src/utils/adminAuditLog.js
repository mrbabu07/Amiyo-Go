export const auditSeverityOptions = [
  { value: "all", label: "All severity" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "ok", label: "OK" },
];

export const auditModuleOptions = [
  { value: "all", label: "All modules" },
  { value: "finance", label: "Finance" },
  { value: "logistics", label: "Logistics" },
  { value: "orders", label: "Orders" },
  { value: "platform", label: "Platform" },
  { value: "products", label: "Products" },
  { value: "promotions", label: "Promotions" },
  { value: "returns", label: "Returns" },
  { value: "reviews", label: "Reviews" },
  { value: "support", label: "Support" },
  { value: "vendors", label: "Vendors" },
  { value: "customers", label: "Customers" },
];

const riskyActionPattern = /(failed|failure|error|disabled|suspended|deleted)/i;
const warningActionPattern = /(rejected|refund|override|force|warning|hold|ban|risk)/i;

export const getAuditModule = (log = {}) => {
  if (log.module) return String(log.module);
  const prefix = String(log.action || "").split(".")[0];
  const moduleMap = {
    customer: "customers",
    order: "orders",
    payout: "finance",
    product: "products",
    promotion: "promotions",
    return: "returns",
    review: "reviews",
    vendor: "vendors",
  };

  return moduleMap[prefix] || prefix || "system";
};

export const getAuditSeverity = (log = {}) => {
  if (log.severity) return String(log.severity).toLowerCase();
  if (log.metadata?.severity) return String(log.metadata.severity).toLowerCase();

  const statusCode = Number(log.request?.statusCode || log.statusCode || 0);
  const action = String(log.action || "");

  if (statusCode >= 500 || riskyActionPattern.test(action)) return "critical";
  if (statusCode >= 400 || warningActionPattern.test(action)) return "warning";
  return "ok";
};

export const normalizeAuditLog = (log = {}) => {
  const actor = log.actor || {};
  const target = log.target || {};
  const request = log.request || {};

  return {
    ...log,
    id: String(log.id || log._id || ""),
    module: getAuditModule(log),
    severity: getAuditSeverity(log),
    action: log.action || "unknown.action",
    actor: {
      id: actor.id || actor.userId || log.actorId || "",
      name: actor.name || actor.displayName || "",
      email: actor.email || log.actorEmail || "",
      role: actor.role || log.actorRole || "",
    },
    target: {
      type: target.type || log.targetType || "",
      id: target.id || log.targetId || "",
      name: target.name || target.title || "",
      path: target.path || log.path || request.path || "",
    },
    request: {
      method: request.method || log.method || "",
      path: request.path || log.path || "",
      ip: request.ip || log.ip || "",
      statusCode: request.statusCode || log.statusCode || "",
      userAgent: request.userAgent || log.userAgent || "",
    },
  };
};

const includesQuery = (value, query) =>
  String(value || "").toLowerCase().includes(String(query || "").toLowerCase());

export const filterAuditLogs = (logs = [], filters = {}) => {
  const query = String(filters.search || "").trim();

  return logs.map(normalizeAuditLog).filter((log) => {
    if (filters.module && filters.module !== "all" && log.module !== filters.module) return false;
    if (filters.severity && filters.severity !== "all" && log.severity !== filters.severity) return false;
    if (filters.targetType && filters.targetType !== "all" && log.target.type !== filters.targetType) return false;
    if (filters.action && !includesQuery(log.action, filters.action)) return false;

    if (!query) return true;

    return [
      log.action,
      log.module,
      log.actor.email,
      log.actor.name,
      log.actor.role,
      log.target.type,
      log.target.id,
      log.target.name,
      log.target.path,
      log.request.path,
      log.request.ip,
    ].some((value) => includesQuery(value, query));
  });
};

export const summarizeAuditLogs = (logs = []) => {
  const normalized = logs.map(normalizeAuditLog);
  const initial = {
    total: normalized.length,
    critical: 0,
    warning: 0,
    ok: 0,
    sensitive: 0,
    modules: {},
  };

  return normalized.reduce((summary, log) => {
    summary[log.severity] = (summary[log.severity] || 0) + 1;
    summary.modules[log.module] = (summary.modules[log.module] || 0) + 1;
    if (/(payout|payment|refund|commission|role|permission|2fa|suspend|delete|override)/i.test(log.action)) {
      summary.sensitive += 1;
    }
    return summary;
  }, initial);
};

export const formatAuditTime = (value) => {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
