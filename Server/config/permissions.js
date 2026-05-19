const STAFF_ROLES = [
  "admin",
  "manager",
  "support",
  "moderator",
  "finance_manager",
  "support_agent",
  "vendor_manager",
  "campaign_manager",
  "logistics_manager",
];

const DEFAULT_ROLE_PERMISSIONS = {
  customer: {
    orders: ["read"],
    profile: ["read", "update"],
    wishlist: ["read", "create", "update", "delete"],
    reviews: ["read", "create", "update", "delete"],
    support: ["create", "read"],
  },
  vendor: {
    orders: ["read", "update"],
    profile: ["read", "update"],
    products: ["read", "create", "update", "delete"],
    inventory: ["read", "update"],
    reviews: ["read"],
    returns: ["read", "update"],
    support: ["create", "read"],
    vendor: ["read", "update"],
    vendors: ["read", "update"],
    analytics: ["read"],
    finance: ["read", "create"],
  },
  vendor_staff: {
    vendor: ["read"],
    orders: ["read", "update"],
    products: ["read"],
    returns: ["read", "update"],
  },
  support: {
    orders: ["read"],
    users: ["read"],
    vendors: ["read"],
    products: ["read"],
    returns: ["read", "update"],
    support: ["read", "create", "update"],
    chat: ["read", "create", "update"],
    tickets: ["read", "create", "update"],
    payments: ["read"],
    communications: ["read"],
    system: ["read"],
  },
  support_agent: {
    orders: ["read", "update"],
    users: ["read"],
    vendors: ["read"],
    products: ["read"],
    returns: ["read", "update"],
    support: ["read", "create", "update"],
    chat: ["read", "create", "update"],
    tickets: ["read", "create", "update"],
    payments: ["read"],
    communications: ["read"],
    system: ["read"],
  },
  moderator: {
    orders: ["read", "update"],
    users: ["read", "update"],
    vendors: ["read", "update"],
    products: ["read", "create", "update"],
    inventory: ["read", "update"],
    categories: ["read", "create", "update"],
    reviews: ["read", "update"],
    returns: ["read", "update"],
    support: ["read", "create", "update"],
    chat: ["read", "create", "update"],
    tickets: ["read", "create", "update"],
    payments: ["read", "update"],
    system: ["read"],
  },
  finance_manager: {
    payments: ["read", "create", "update"],
    finance: ["read", "create", "update"],
    analytics: ["read"],
    orders: ["read"],
    returns: ["read", "update"],
    vendors: ["read"],
    audit_logs: ["read"],
    system: ["read"],
  },
  vendor_manager: {
    vendors: ["read", "create", "update"],
    users: ["read"],
    products: ["read"],
    orders: ["read"],
    analytics: ["read"],
    audit_logs: ["read"],
    system: ["read"],
  },
  campaign_manager: {
    coupons: ["read", "create", "update"],
    promotions: ["read", "create", "update"],
    communications: ["read", "create", "update"],
    products: ["read"],
    categories: ["read"],
    analytics: ["read"],
    system: ["read"],
  },
  logistics_manager: {
    orders: ["read", "update"],
    vendors: ["read"],
    payments: ["read", "update"],
    returns: ["read", "update"],
    analytics: ["read"],
    system: ["read"],
  },
  manager: {
    orders: ["read", "create", "update"],
    users: ["read", "create", "update"],
    vendors: ["read", "create", "update"],
    products: ["read", "create", "update"],
    inventory: ["read", "create", "update"],
    categories: ["read", "create", "update"],
    coupons: ["read", "create", "update"],
    promotions: ["read", "create", "update"],
    communications: ["read", "create", "update"],
    reviews: ["read", "create", "update"],
    returns: ["read", "create", "update"],
    support: ["read", "create", "update"],
    chat: ["read", "create", "update"],
    tickets: ["read", "create", "update"],
    payments: ["read", "update"],
    finance: ["read", "create", "update"],
    analytics: ["read"],
    system: ["read"],
  },
  admin: {
    orders: ["read", "create", "update", "delete"],
    users: ["read", "create", "update", "delete"],
    vendors: ["read", "create", "update", "delete"],
    products: ["read", "create", "update", "delete"],
    inventory: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    coupons: ["read", "create", "update", "delete"],
    reviews: ["read", "create", "update", "delete"],
    returns: ["read", "create", "update", "delete"],
    support: ["read", "create", "update", "delete"],
    chat: ["read", "create", "update", "delete"],
    tickets: ["read", "create", "update", "delete"],
    payments: ["read", "create", "update", "delete"],
    finance: ["read", "create", "update", "delete"],
    communications: ["read", "create", "update", "delete"],
    analytics: ["read", "create", "update", "delete"],
    audit_logs: ["read"],
    system: ["read", "create", "update", "delete"],
  },
};

const METHOD_ACTION = {
  GET: "read",
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
};

const RESOURCE_BY_PATH = [
  [/\/admin\/users|\/admin($|\/users)/, "users"],
  [/\/admin\/vendors|\/vendors/, "vendors"],
  [/\/admin\/products|\/vendor\/products|\/products|\/inventory/, "products"],
  [/\/category|\/categories|\/dynamic-categories|\/category-fields|\/category-requests/, "categories"],
  [/\/coupon/, "coupons"],
  [/\/review/, "reviews"],
  [/\/return/, "returns"],
  [/\/support/, "support"],
  [/\/chat|\/vendor-chat/, "chat"],
  [/\/payment|\/payout|\/finance/, "payments"],
  [/\/dispatch/, "orders"],
  [/\/analytics/, "analytics"],
  [/\/order/, "orders"],
  [/\/broadcast|\/template|\/email-campaign|\/announcement/, "communications"],
  [/\/campaign|\/offer|\/flash-sales|\/newsletter|\/promotion/, "promotions"],
  [/\/audit/, "audit_logs"],
];

const clonePermissions = (permissions) => JSON.parse(JSON.stringify(permissions || {}));

const getDefaultPermissions = (role) =>
  clonePermissions(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.customer);

const isStaffRole = (role) => STAFF_ROLES.includes(role);

const getEffectivePermissions = (user = {}, permissionDoc = null) => {
  if (permissionDoc?.permissions) {
    return {
      ...(DEFAULT_ROLE_PERMISSIONS[user.role] || {}),
      ...permissionDoc.permissions,
    };
  }

  if (user.permissions) {
    return {
      ...(DEFAULT_ROLE_PERMISSIONS[user.role] || {}),
      ...user.permissions,
    };
  }

  return DEFAULT_ROLE_PERMISSIONS[user.role] || {};
};

const hasPermission = (permissions, resource, action) => {
  const allowed = permissions?.[resource] || [];
  return allowed.includes(action) || allowed.includes("*");
};

const roleCan = (user, resource, action, permissionDoc = null) => {
  if (!user) return false;
  if (user.role === "admin") return true;

  // Marketplace staff can operate assigned sections, but destructive actions
  // and platform settings remain super-admin only even if a stale/custom
  // permission document accidentally grants them.
  if (action === "delete") return false;
  if (resource === "system" && action !== "read") return false;

  const effectivePermissions = getEffectivePermissions(user, permissionDoc);
  return hasPermission(effectivePermissions, resource, action);
};

const resolvePermissionFromRequest = (req) => {
  const path = `${req.baseUrl || ""}${req.route?.path || req.path || ""}`;
  const action = METHOD_ACTION[req.method] || "read";
  const match = RESOURCE_BY_PATH.find(([pattern]) => pattern.test(path));

  return {
    resource: req.permissionResource || match?.[1] || "system",
    action: req.permissionAction || action,
  };
};

module.exports = {
  STAFF_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  getDefaultPermissions,
  isStaffRole,
  roleCan,
  resolvePermissionFromRequest,
};
