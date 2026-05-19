const ACTION_ALIASES = {
  read: "view",
  create: "manage",
  update: "manage",
  delete: "manage",
};

export const VENDOR_PERMISSION_GROUPS = [
  {
    id: "products",
    label: "Products and inventory",
    description: "View listings, edit catalog data, and manage SKU stock.",
    permissions: [
      { value: "products:view", label: "View products" },
      { value: "products:manage", label: "Create and edit products" },
      { value: "inventory:manage", label: "Manage inventory" },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    description: "Process customer orders, update fulfillment, and ship packages.",
    permissions: [
      { value: "orders:view", label: "View orders" },
      { value: "orders:manage", label: "Update orders" },
      { value: "orders:ship", label: "Ship and print labels" },
    ],
  },
  {
    id: "returns",
    label: "Returns",
    description: "Review return cases, respond to buyers, and upload evidence.",
    permissions: [
      { value: "returns:view", label: "View returns" },
      { value: "returns:manage", label: "Respond to returns" },
    ],
  },
  {
    id: "finance",
    label: "Finance and reports",
    description: "See payouts, download statements, and review seller performance.",
    permissions: [
      { value: "finance:view", label: "View finance" },
      { value: "finance:manage", label: "Request payouts" },
      { value: "reports:view", label: "View reports" },
    ],
  },
  {
    id: "shop",
    label: "Shop and marketing",
    description: "Manage storefront content, vouchers, campaigns, and seller picks.",
    permissions: [
      { value: "shop:manage", label: "Manage shop" },
      { value: "marketing:manage", label: "Manage marketing" },
    ],
  },
  {
    id: "support",
    label: "Support and reviews",
    description: "Handle customer messages, support tickets, and review replies.",
    permissions: [
      { value: "support:view", label: "View support" },
      { value: "support:manage", label: "Reply to support" },
      { value: "reviews:view", label: "View reviews" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Control sensitive seller settings and staff access.",
    permissions: [
      { value: "settings:manage", label: "Manage settings" },
      { value: "staff:manage", label: "Manage staff" },
    ],
  },
];

export const VENDOR_ROLE_PRESETS = [
  {
    id: "order-manager",
    label: "Order manager",
    description: "Can run daily fulfillment and return responses.",
    permissions: ["orders:view", "orders:manage", "orders:ship", "returns:view", "returns:manage"],
  },
  {
    id: "product-editor",
    label: "Product editor",
    description: "Can maintain listings, stock, variants, and media.",
    permissions: ["products:view", "products:manage", "inventory:manage"],
  },
  {
    id: "finance-viewer",
    label: "Finance viewer",
    description: "Can read finance pages and seller reports without requesting payouts.",
    permissions: ["finance:view", "reports:view"],
  },
  {
    id: "finance-manager",
    label: "Finance manager",
    description: "Can review statements and submit payout requests.",
    permissions: ["finance:view", "finance:manage", "reports:view"],
  },
  {
    id: "support-operator",
    label: "Support operator",
    description: "Can handle customer issues, reviews, and return visibility.",
    permissions: ["support:view", "support:manage", "reviews:view", "returns:view"],
  },
  {
    id: "marketing-manager",
    label: "Marketing manager",
    description: "Can manage vouchers, campaigns, and performance reports.",
    permissions: ["marketing:manage", "reports:view"],
  },
  {
    id: "store-manager",
    label: "Store manager",
    description: "Can update storefront presentation and seller settings.",
    permissions: ["shop:manage", "settings:manage"],
  },
];

export const VENDOR_ROUTE_PERMISSIONS = [
  { prefix: "/vendor/products/add", permission: "products:manage" },
  { prefix: "/vendor/products/edit", permission: "products:manage" },
  { prefix: "/vendor/products/bulk", permission: "products:manage" },
  { prefix: "/vendor/products", permission: "products:view" },
  { prefix: "/vendor/category-requests", permission: "products:manage" },
  { prefix: "/vendor/orders", permission: "orders:view" },
  { prefix: "/vendor/returns", permission: "returns:view" },
  { prefix: "/vendor/finance/reconciliation", permission: "finance:view" },
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

const normalizePermission = (permission) => {
  const value = String(permission || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "_");

  if (!value.includes(":")) {
    const actionMatch = value.match(/^(.+)_(view|read|manage|create|update|delete|ship|\*)$/);
    if (actionMatch) {
      return `${actionMatch[1]}:${normalizeAction(actionMatch[2])}`;
    }
  }

  const [resource, action] = value.split(":");
  if (!resource || !action) return value;
  return `${resource}:${normalizeAction(action)}`;
};

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

export const getVendorRolePreset = (roleId) =>
  VENDOR_ROLE_PRESETS.find((role) => role.id === roleId) || VENDOR_ROLE_PRESETS[0];

export const describeVendorPermission = (permission) => {
  const normalized = normalizePermission(permission);
  for (const group of VENDOR_PERMISSION_GROUPS) {
    const match = group.permissions.find((item) => normalizePermission(item.value) === normalized);
    if (match) {
      return {
        ...match,
        value: normalized,
        groupId: group.id,
        groupLabel: group.label,
      };
    }
  }

  return {
    value: normalized,
    label: normalized
      .replace(/:/g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    groupId: "custom",
    groupLabel: "Custom",
  };
};

export const buildVendorPermissionMatrix = (permissions = []) => {
  const granted = new Set(normalizeVendorPermissions({ permissions }));

  return VENDOR_PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.map((permission) => {
      const normalized = normalizePermission(permission.value);
      return {
        ...permission,
        value: normalized,
        granted: granted.has(normalized),
      };
    }),
  }));
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
