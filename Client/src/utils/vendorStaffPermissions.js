const ACTION_ALIASES = {
  read: "view",
  create: "manage",
  update: "manage",
  delete: "manage",
};

export const VENDOR_ROUTE_PERMISSIONS = [
  { prefix: "/vendor/products/add", permission: "products:manage" },
  { prefix: "/vendor/products/edit", permission: "products:manage" },
  { prefix: "/vendor/products/bulk", permission: "products:manage" },
  { prefix: "/vendor/products", permission: "products:view" },
  { prefix: "/vendor/category-requests", permission: "products:manage" },
  { prefix: "/vendor/orders", permission: "orders:view" },
  { prefix: "/vendor/returns", permission: "returns:view" },
  { prefix: "/vendor/finance/statements", permission: "finance:view" },
  { prefix: "/vendor/finance/transactions", permission: "finance:view" },
  { prefix: "/vendor/finance/payouts", permission: "finance:view" },
  { prefix: "/vendor/finance/commissions", permission: "finance:view" },
  { prefix: "/vendor/finance", permission: "finance:view" },
  { prefix: "/vendor/settings/bank", permission: "finance:manage" },
  { prefix: "/vendor/marketing", permission: "marketing:manage" },
  { prefix: "/vendor/reports", permission: "reports:view" },
  { prefix: "/vendor/shop", permission: "shop:manage" },
  { prefix: "/vendor/kyc", permission: "settings:manage" },
  { prefix: "/vendor/messages", permission: "support:view" },
  { prefix: "/vendor/support-chat", permission: "support:view" },
  { prefix: "/vendor/reviews", permission: "reviews:view" },
  { prefix: "/vendor/qa", permission: "support:view" },
  { prefix: "/vendor/settings", permission: "settings:manage" },
];

const normalizeAction = (action) => ACTION_ALIASES[action] || action;

const normalizePermission = (permission) =>
  String(permission || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "_");

const flattenObjectPermissions = (permissions = {}) =>
  Object.entries(permissions).flatMap(([resource, actions]) => {
    if (resource === "vendor" && Array.isArray(actions)) return actions;
    if (actions === true) return [`${resource}:*`];
    if (Array.isArray(actions)) {
      return actions.map((action) => `${resource}:${normalizeAction(action)}`);
    }
    if (actions && typeof actions === "object") {
      return Object.entries(actions)
        .filter(([, allowed]) => Boolean(allowed))
        .map(([action]) => `${resource}:${normalizeAction(action)}`);
    }
    return [];
  });

export const normalizeVendorPermissions = (source = {}) => {
  const candidates = [
    source.vendorPermissions,
    source.staffPermissions,
    source.dbUser?.vendorPermissions,
    source.dbUser?.staffPermissions,
    source.dbUser?.permissions?.vendor,
    source.user?.vendorPermissions,
    source.user?.permissions?.vendor,
    source.permissions?.vendor,
    source.permissions,
  ];

  const raw = candidates.find((candidate) => {
    if (Array.isArray(candidate)) return candidate.length > 0;
    return candidate && typeof candidate === "object" && Object.keys(candidate).length > 0;
  });

  if (!raw) return [];

  const permissions = Array.isArray(raw) ? raw : flattenObjectPermissions(raw);
  return [...new Set(permissions.map(normalizePermission).filter(Boolean))];
};

export const isVendorOwnerAccess = (source = {}) => {
  const role = source.role || source.dbUser?.role || source.user?.role || "";
  return Boolean(source.isAdmin || role === "admin" || role === "vendor");
};

export const hasVendorPermission = (source = {}, requiredPermission) => {
  const required = normalizePermission(requiredPermission);
  if (!required || isVendorOwnerAccess(source)) return true;

  const permissions = normalizeVendorPermissions(source);
  if (permissions.includes("*")) return true;
  if (permissions.includes(required)) return true;

  const [resource, action] = required.split(":");
  if (!resource || !action) return false;

  if (permissions.includes(`${resource}:*`)) return true;
  if (action === "view" && permissions.includes(`${resource}:manage`)) return true;
  if (action === "view" && permissions.includes(`${resource}:ship`)) return true;

  return false;
};

export const getVendorPathPermission = (pathname = "") => {
  const normalizedPath = String(pathname || "").split("?")[0].replace(/\/$/, "");
  const match = VENDOR_ROUTE_PERMISSIONS
    .filter((rule) => normalizedPath === rule.prefix || normalizedPath.startsWith(`${rule.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match?.permission || null;
};

export const canAccessVendorPath = (pathname, source = {}) =>
  hasVendorPermission(source, getVendorPathPermission(pathname));

export const filterVendorNavigation = (items = [], source = {}) =>
  items
    .map((item) => {
      if (Array.isArray(item.children)) {
        const children = filterVendorNavigation(item.children, source);
        if (children.length === 0) return null;
        return { ...item, children };
      }

      const permission = item.permission || getVendorPathPermission(item.path);
      return hasVendorPermission(source, permission) ? item : null;
    })
    .filter(Boolean);

export const getVendorAccessSummary = (source = {}) => {
  if (isVendorOwnerAccess(source)) {
    return {
      label: "Owner workspace",
      description: "Full seller-center access",
      permissions: ["*"],
    };
  }

  const permissions = normalizeVendorPermissions(source);
  return {
    label: "Staff workspace",
    description: permissions.length
      ? `${permissions.length} seller permission${permissions.length === 1 ? "" : "s"} enabled`
      : "No seller permissions assigned",
    permissions,
  };
};
