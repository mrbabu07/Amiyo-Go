const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const {
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_ROLES,
  getDefaultPermissions,
} = require("../config/permissions");
const {
  DEFAULT_PLATFORM_FEATURE_FLAGS,
  mergeFeatureFlags,
} = require("../utils/platformFeatures");

const ADMIN_ROLE_DEFINITIONS = [
  {
    role: "admin",
    label: "Super Admin",
    access: "Everything",
    description: "Full platform control across finance, catalog, vendors, logistics, staff, and settings.",
    sessionTimeoutMinutes: 30,
    requires2FA: true,
  },
  {
    role: "manager",
    label: "Operations Manager",
    access: "Cross-section operations without delete or platform settings",
    description: "Can coordinate orders, vendors, catalog, support, finance, and campaigns while destructive actions and settings remain locked to Super Admin.",
    sessionTimeoutMinutes: 25,
    requires2FA: true,
  },
  {
    role: "finance_manager",
    label: "Finance Manager",
    access: "Payouts, commissions, refund approvals, reports only",
    description: "Handles payout cycles, commission rules, refund approvals, financial reports, and finance audit logs.",
    sessionTimeoutMinutes: 20,
    requires2FA: true,
  },
  {
    role: "moderator",
    label: "Moderator",
    access: "Product queue, review moderation, content violations",
    description: "Reviews submitted listings, product content, reviews, and content policy queues.",
    sessionTimeoutMinutes: 30,
    requires2FA: true,
  },
  {
    role: "support_agent",
    label: "Support Agent",
    access: "Customer lookup, order override, dispute resolution",
    description: "Works customer profiles, support tickets, order assistance, and disputes.",
    sessionTimeoutMinutes: 30,
    requires2FA: true,
  },
  {
    role: "vendor_manager",
    label: "Vendor Manager",
    access: "Vendor approvals, KYC review, warnings, tier changes",
    description: "Owns vendor applications, KYC review, account health, warnings, tiers, and vendor notices.",
    sessionTimeoutMinutes: 30,
    requires2FA: true,
  },
  {
    role: "campaign_manager",
    label: "Campaign Manager",
    access: "Campaign builder, banners, vouchers, promotions only",
    description: "Runs campaigns, homepage slots, platform vouchers, banners, and promotion calendars.",
    sessionTimeoutMinutes: 30,
    requires2FA: true,
  },
  {
    role: "logistics_manager",
    label: "Logistics Manager",
    access: "Courier management, dispatch, COD reconciliation",
    description: "Manages delivery zones, courier partners, manifests, failed deliveries, and COD reconciliation.",
    sessionTimeoutMinutes: 25,
    requires2FA: true,
  },
];

const ROLE_DEFINITION_BY_ID = ADMIN_ROLE_DEFINITIONS.reduce((map, role) => {
  map[role.role] = role;
  return map;
}, {});

const DEFAULT_MESSAGE_TEMPLATES = [
  {
    key: "order_confirm",
    name: "Order confirmation",
    channel: "email",
    subject: "Your Amiyo-Go order #{order_id} is confirmed",
    body: "Hi {customer_name}, your order #{order_id} has been confirmed. Total: {order_total}.",
    variables: ["customer_name", "order_id", "order_total"],
    status: "active",
  },
  {
    key: "shipping_update",
    name: "Shipping update",
    channel: "push",
    subject: "Order #{order_id} is on the way",
    body: "Hi {customer_name}, your order #{order_id} has shipped with {courier_name}. Tracking: {tracking_number}.",
    variables: ["customer_name", "order_id", "courier_name", "tracking_number"],
    status: "active",
  },
  {
    key: "payout_done",
    name: "Vendor payout done",
    channel: "email",
    subject: "Payout {payout_reference} has been released",
    body: "Hi {vendor_name}, payout {payout_reference} for {payout_amount} has been released to {payout_method}.",
    variables: ["vendor_name", "payout_reference", "payout_amount", "payout_method"],
    status: "active",
  },
  {
    key: "account_suspended",
    name: "Account suspended",
    channel: "email",
    subject: "Important account status update",
    body: "Hi {user_name}, your account has been suspended because: {reason}. You can contact support with ticket {ticket_id}.",
    variables: ["user_name", "reason", "ticket_id"],
    status: "active",
  },
  {
    key: "return_approved",
    name: "Return approved",
    channel: "sms",
    subject: "Return approved",
    body: "Your return for order #{order_id} is approved. Refund method: {refund_method}.",
    variables: ["order_id", "refund_method"],
    status: "active",
  },
];

const DEFAULT_PLATFORM_CONFIG = {
  paymentMethods: {
    bkash: { enabled: true, zones: [] },
    nagad: { enabled: true, zones: [] },
    cod: { enabled: true, zones: ["dhaka", "chittagong", "sylhet", "others"] },
    card: { enabled: false, zones: [] },
  },
  shipping: {
    baseDeliveryFee: 80,
    freeShippingThreshold: 1000,
    codAvailableZones: ["dhaka", "chittagong", "sylhet"],
    defaultCourier: "Pathao",
  },
  returnPolicy: {
    defaultWindowDays: 7,
    categoryExceptions: [],
  },
  tax: {
    displayMode: "inclusive",
    vatByCategory: [],
  },
  featureFlags: { ...DEFAULT_PLATFORM_FEATURE_FLAGS },
  maintenanceMode: {
    enabled: false,
    message: "We are improving the marketplace. Please check back soon.",
    adminPanelAccessible: true,
  },
  seo: {
    defaultMetaTitle: "Amiyo-Go Marketplace",
    defaultMetaDescription: "Buy and sell products across Bangladesh.",
    ogImage: "",
    sitemapRegenerationRequestedAt: null,
  },
  sessionTimeoutByRole: ADMIN_ROLE_DEFINITIONS.reduce((map, role) => {
    map[role.role] = role.sessionTimeoutMinutes;
    return map;
  }, {}),
  twoFactor: {
    mandatoryForAdmin: true,
    provider: "speakeasy",
  },
};

const roundNumber = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const clone = (value) => JSON.parse(JSON.stringify(value || {}));
const asArray = (value) => (Array.isArray(value) ? value : []);

const safeObjectId = (value) => {
  const normalized = normalizeId(value);
  return ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
};

const flexibleIdFilter = (id) => {
  const objectId = safeObjectId(id);
  return objectId ? { _id: objectId } : { _id: id };
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const makeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const mergeConfig = (saved = {}) => {
  const merged = clone(DEFAULT_PLATFORM_CONFIG);
  Object.entries(saved || {}).forEach(([key, value]) => {
    if (key === "_id" || key === "createdAt") return;
    if (value && typeof value === "object" && !Array.isArray(value) && merged[key]) {
      merged[key] = { ...merged[key], ...value };
      return;
    }
    merged[key] = value;
  });
  return merged;
};

const csvSafe = (value) => String(value ?? "").replace(/"/g, '""');

const getCollectionRows = async (db, name, query = {}, options = {}) => {
  const collection = db.collection(name);
  if (!collection?.find) return [];
  let cursor = collection.find(query);
  if (options.sort && cursor.sort) cursor = cursor.sort(options.sort);
  if (options.limit && cursor.limit) cursor = cursor.limit(options.limit);
  return cursor.toArray();
};

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  firebaseUid: req.user?.uid || null,
  email: req.user?.email || req.dbUser?.email || "",
  role: req.user?.role || req.dbUser?.role || "admin",
});

const appendPlatformAudit = async (req, { action, target = {}, changes = {}, metadata = {} }) => {
  const payload = {
    module: "platform",
    action,
    actor: getActor(req),
    target,
    changes,
    metadata,
    ip: req.ip || req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || null,
    userAgent: req.headers?.["user-agent"] || "",
    createdAt: new Date(),
  };

  const AuditLog = req.app.locals.models?.AuditLog;
  if (AuditLog?.append) return AuditLog.append(payload);
  return req.app.locals.db.collection("audit_logs").insertOne(payload);
};

const getUserName = (user = {}) =>
  [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
  user.displayName ||
  user.name ||
  user.email ||
  "User";

const getUserPhone = (user = {}) => user.phone || user.profile?.phone || user.contactPhone || "";

const normalizeUserRecipient = (user = {}, source = "user") => ({
  userId: user.firebaseUid || user.uid || normalizeId(user._id) || user.email,
  dbUserId: normalizeId(user._id),
  email: user.email || "",
  phone: getUserPhone(user),
  role: user.role || "customer",
  name: getUserName(user),
  source,
});

const getVendorRecipientUsers = ({ users = [], vendors = [] }) => {
  const userById = new Map(users.map((user) => [normalizeId(user._id), user]));
  const userByFirebaseUid = new Map(users.map((user) => [normalizeId(user.firebaseUid), user]));
  const vendorUsers = users.filter((user) => ["vendor", "vendor_staff"].includes(user.role));

  vendors.forEach((vendor) => {
    const user =
      userById.get(normalizeId(vendor.userId)) ||
      userByFirebaseUid.get(normalizeId(vendor.firebaseUid)) ||
      (vendor.email
        ? {
            _id: vendor.userId || vendor._id,
            firebaseUid: vendor.firebaseUid,
            email: vendor.email,
            phone: vendor.phone,
            role: "vendor",
            profile: { firstName: vendor.shopName || vendor.businessName || vendor.name || "Vendor" },
          }
        : null);
    if (user) vendorUsers.push(user);
  });

  return vendorUsers;
};

const resolveBroadcastRecipients = ({ users = [], vendors = [], target = "all_users", segment = {} }) => {
  let selected = [];
  const normalizedTarget = target || segment.target || "all_users";

  if (normalizedTarget === "all_vendors") {
    selected = getVendorRecipientUsers({ users, vendors });
  } else if (normalizedTarget === "customers") {
    selected = users.filter((user) => !user.role || user.role === "customer");
  } else if (normalizedTarget === "admins") {
    selected = users.filter((user) => STAFF_ROLES.includes(user.role));
  } else if (normalizedTarget === "role") {
    const roles = asArray(segment.roles?.length ? segment.roles : [segment.role]).filter(Boolean);
    selected = users.filter((user) => roles.includes(user.role));
  } else if (normalizedTarget === "filtered") {
    selected = users.filter((user) => {
      if (segment.role && user.role !== segment.role) return false;
      if (segment.status && user.status !== segment.status) return false;
      if (segment.emailDomain && !String(user.email || "").endsWith(segment.emailDomain)) return false;
      return true;
    });
  } else {
    selected = users;
  }

  const deduped = new Map();
  selected
    .filter((user) => user?.status !== "banned" && user?.status !== "deleted")
    .map((user) => normalizeUserRecipient(user, normalizedTarget))
    .filter((recipient) => recipient.userId)
    .forEach((recipient) => deduped.set(recipient.userId, recipient));

  return Array.from(deduped.values());
};

const normalizeChannels = (channels) => {
  const allowed = new Set(["push", "email", "sms", "in_app"]);
  const normalized = asArray(channels)
    .map((channel) => String(channel || "").trim().toLowerCase())
    .filter((channel) => allowed.has(channel));
  return normalized.length ? Array.from(new Set(normalized)) : ["in_app"];
};

const buildCommunicationOverview = ({ users = [], vendors = [], broadcasts = [], templates = [], campaigns = [], announcements = [] }) => {
  const activeAnnouncements = announcements.filter((item) => item.status === "active").length;
  const templateKeys = new Set(templates.map((item) => item.key));
  const missingTemplates = DEFAULT_MESSAGE_TEMPLATES.filter((template) => !templateKeys.has(template.key)).length;
  const latestBroadcasts = [...broadcasts]
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 8);

  return {
    kpis: {
      totalUsers: users.length,
      totalVendors: vendors.length || users.filter((user) => user.role === "vendor").length,
      broadcastsSent: broadcasts.filter((item) => item.status === "sent").length,
      scheduledCampaigns: campaigns.filter((item) => item.status === "scheduled").length,
      activeAnnouncements,
      missingTemplates,
    },
    latestBroadcasts,
    templates: mergeMessageTemplates(templates),
    campaigns: campaigns.slice(0, 8),
    announcements: announcements.slice(0, 8),
  };
};

const mergeMessageTemplates = (storedTemplates = []) => {
  const storedByKey = new Map(storedTemplates.map((template) => [template.key, template]));
  const mergedDefaults = DEFAULT_MESSAGE_TEMPLATES.map((template) => ({
    ...template,
    ...(storedByKey.get(template.key) || {}),
    isDefault: true,
  }));
  const custom = storedTemplates.filter((template) => !DEFAULT_MESSAGE_TEMPLATES.some((item) => item.key === template.key));
  return [...mergedDefaults, ...custom];
};

const buildCategoryTree = (categories = [], parentId = null) => {
  const compare = parentId ? normalizeId(parentId) : "";
  return categories
    .filter((category) => normalizeId(category.parentId) === compare)
    .sort((left, right) => Number(left.displayOrder || 0) - Number(right.displayOrder || 0) || String(left.name).localeCompare(String(right.name)))
    .map((category) => ({
      ...category,
      children: buildCategoryTree(categories, category._id),
    }));
};

const buildPlatformConfigSnapshot = ({
  categories = [],
  categoryFields = [],
  config = {},
  commissionRules = [],
  deliveryZones = [],
  couriers = [],
}) => {
  const mergedConfig = mergeConfig(config);
  return {
    settings: mergedConfig,
    categoryTree: buildCategoryTree(categories),
    categories: categories.map((category) => ({
      ...category,
      attributes: asArray(category.attributes),
      fieldCount: categoryFields.filter((field) => normalizeId(field.categoryId) === normalizeId(category._id)).length,
    })),
    categoryFields,
    shipping: {
      zones: deliveryZones,
      couriers,
      settings: mergedConfig.shipping,
    },
    paymentMethods: mergedConfig.paymentMethods,
    commissionRules: commissionRules.slice(0, 50),
    returnPolicy: mergedConfig.returnPolicy,
    tax: mergedConfig.tax,
    featureFlags: mergedConfig.featureFlags,
    maintenanceMode: mergedConfig.maintenanceMode,
    seo: mergedConfig.seo,
  };
};

const buildStaffAccessCenter = ({ users = [], roleSettings = {}, auditLogs = [] }) => {
  const sessionTimeoutByRole = {
    ...DEFAULT_PLATFORM_CONFIG.sessionTimeoutByRole,
    ...(roleSettings.sessionTimeoutByRole || {}),
  };
  const staff = users
    .filter((user) => STAFF_ROLES.includes(user.role))
    .map((user) => ({
      _id: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: getUserName(user),
      role: user.role,
      roleLabel: ROLE_DEFINITION_BY_ID[user.role]?.label || user.role,
      status: user.status || "active",
      twoFactorEnabled: Boolean(user.security?.twoFactor?.enabled || user.twoFactor?.enabled),
      requires2FA: ROLE_DEFINITION_BY_ID[user.role]?.requires2FA !== false,
      sessionTimeoutMinutes: sessionTimeoutByRole[user.role] || 30,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt || null,
    }))
    .sort((left, right) => String(left.roleLabel).localeCompare(String(right.roleLabel)));

  const activityByActor = auditLogs.reduce((map, log) => {
    const key = normalizeId(log.actor?.userId || log.actor?.firebaseUid || log.actor?.email);
    if (!key) return map;
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});

  return {
    summary: {
      totalStaff: staff.length,
      twoFactorEnabled: staff.filter((member) => member.twoFactorEnabled).length,
      twoFactorRequired: staff.filter((member) => member.requires2FA).length,
      roles: ADMIN_ROLE_DEFINITIONS.length,
      recentActions: auditLogs.length,
    },
    guardrails: {
      destructiveActionsSuperAdminOnly: true,
      platformSettingsSuperAdminOnly: true,
      staffCanHandleAssignedSections: true,
      deleteLockedForRoles: ADMIN_ROLE_DEFINITIONS.filter((role) => role.role !== "admin").map((role) => role.role),
    },
    roles: ADMIN_ROLE_DEFINITIONS.map((role) => ({
      ...role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role.role] || {},
      sessionTimeoutMinutes: sessionTimeoutByRole[role.role] || role.sessionTimeoutMinutes,
      staffCount: staff.filter((member) => member.role === role.role).length,
    })),
    staff: staff.map((member) => ({
      ...member,
      recentActionCount:
        activityByActor[normalizeId(member._id)] ||
        activityByActor[normalizeId(member.firebaseUid)] ||
        activityByActor[member.email] ||
        0,
    })),
    activityLog: auditLogs.slice(0, 30),
  };
};

const loadPlatformSourceData = async (db) => {
  const [
    users,
    vendors,
    broadcasts,
    templates,
    campaigns,
    announcements,
    categories,
    categoryFields,
    configDoc,
    commissionRules,
    deliveryZones,
    couriers,
    auditLogs,
  ] = await Promise.all([
    getCollectionRows(db, "users"),
    getCollectionRows(db, "vendors"),
    getCollectionRows(db, "notification_broadcasts", {}, { sort: { createdAt: -1 }, limit: 25 }),
    getCollectionRows(db, "message_templates", {}, { sort: { updatedAt: -1 } }),
    getCollectionRows(db, "email_campaigns", {}, { sort: { createdAt: -1 }, limit: 25 }),
    getCollectionRows(db, "platform_announcements", {}, { sort: { updatedAt: -1 }, limit: 25 }),
    getCollectionRows(db, "categories"),
    getCollectionRows(db, "category_fields"),
    db.collection("platform_settings").findOne({ _id: "platform_control" }),
    getCollectionRows(db, "commission_rules", {}, { sort: { priority: -1, createdAt: -1 } }),
    getCollectionRows(db, "delivery_zones"),
    getCollectionRows(db, "courier_partners"),
    getCollectionRows(db, "audit_logs", {}, { sort: { createdAt: -1 }, limit: 120 }),
  ]);

  return {
    users,
    vendors,
    broadcasts,
    templates,
    campaigns,
    announcements,
    categories,
    categoryFields,
    configDoc: configDoc || {},
    commissionRules,
    deliveryZones,
    couriers,
    auditLogs,
  };
};

const getPlatformControlOverview = async (req, res) => {
  try {
    const source = await loadPlatformSourceData(req.app.locals.db);
    const config = buildPlatformConfigSnapshot({
      categories: source.categories,
      categoryFields: source.categoryFields,
      config: source.configDoc,
      commissionRules: source.commissionRules,
      deliveryZones: source.deliveryZones,
      couriers: source.couriers,
    });

    res.json({
      success: true,
      data: {
        communications: buildCommunicationOverview(source),
        configuration: config,
        accessControl: buildStaffAccessCenter({
          users: source.users,
          roleSettings: config.settings,
          auditLogs: source.auditLogs,
        }),
      },
    });
  } catch (error) {
    console.error("Error in getPlatformControlOverview:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to load platform overview" });
  }
};

const listNotificationBroadcasts = async (req, res) => {
  try {
    const broadcasts = await getCollectionRows(req.app.locals.db, "notification_broadcasts", {}, {
      sort: { createdAt: -1 },
      limit: Math.min(Number(req.query.limit || 50), 200),
    });
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    console.error("Error in listNotificationBroadcasts:", error);
    res.status(500).json({ success: false, error: "Failed to load broadcasts" });
  }
};

const sendNotificationBroadcast = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || req.body.message || "").trim();
    const channels = normalizeChannels(req.body.channels);
    const scheduledAt = normalizeDate(req.body.scheduledAt);

    if (!title) return res.status(400).json({ success: false, error: "title is required" });
    if (!body) return res.status(400).json({ success: false, error: "body is required" });

    const [users, vendors] = await Promise.all([
      getCollectionRows(db, "users"),
      getCollectionRows(db, "vendors"),
    ]);
    const recipients = resolveBroadcastRecipients({
      users,
      vendors,
      target: req.body.target || "all_users",
      segment: req.body.segment || {},
    });

    const now = new Date();
    const status = scheduledAt && scheduledAt > now ? "scheduled" : "sent";
    const broadcast = {
      title,
      body,
      channels,
      target: req.body.target || "all_users",
      segment: req.body.segment || {},
      status,
      scheduledAt,
      sentAt: status === "sent" ? now : null,
      recipientCount: recipients.length,
      channelCounts: {
        push: channels.includes("push") ? recipients.length : 0,
        email: channels.includes("email") ? recipients.filter((recipient) => recipient.email).length : 0,
        sms: channels.includes("sms") ? recipients.filter((recipient) => recipient.phone).length : 0,
        in_app: channels.includes("in_app") ? recipients.length : 0,
      },
      link: req.body.link || "",
      createdBy: getActor(req),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("notification_broadcasts").insertOne(broadcast);
    const broadcastId = result.insertedId;
    const broadcastIdText = normalizeId(broadcastId);

    const deliveryRows = recipients.flatMap((recipient) =>
      channels.map((channel) => ({
        broadcastId,
        broadcastIdText,
        userId: recipient.userId,
        email: recipient.email,
        phone: recipient.phone,
        channel,
        status: channel === "in_app" && status === "sent" ? "sent" : status === "scheduled" ? "scheduled" : "queued",
        createdAt: now,
        updatedAt: now,
      })),
    );

    if (deliveryRows.length) {
      await db.collection("notification_deliveries").insertMany(deliveryRows);
    }

    if (channels.includes("in_app") && status === "sent" && recipients.length) {
      await db.collection("notifications").insertMany(
        recipients.map((recipient) => ({
          userId: recipient.userId,
          title,
          message: body,
          type: "admin_broadcast",
          link: req.body.link || "",
          data: { broadcastId: broadcastIdText },
          isRead: false,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    await appendPlatformAudit(req, {
      action: "platform.broadcast.sent",
      target: { type: "notification_broadcast", id: broadcastIdText },
      changes: { title, channels, target: broadcast.target, recipientCount: recipients.length, status },
    });

    res.status(201).json({
      success: true,
      data: { ...broadcast, _id: broadcastId, deliveryRows: deliveryRows.length },
    });
  } catch (error) {
    console.error("Error in sendNotificationBroadcast:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to send broadcast" });
  }
};

const listMessageTemplates = async (req, res) => {
  try {
    const templates = await getCollectionRows(req.app.locals.db, "message_templates", {}, { sort: { updatedAt: -1 } });
    res.json({ success: true, data: mergeMessageTemplates(templates) });
  } catch (error) {
    console.error("Error in listMessageTemplates:", error);
    res.status(500).json({ success: false, error: "Failed to load templates" });
  }
};

const upsertMessageTemplate = async (req, res) => {
  try {
    const key = makeSlug(req.params.templateKey || req.body.key);
    const name = String(req.body.name || key).trim();
    const body = String(req.body.body || "").trim();
    if (!key) return res.status(400).json({ success: false, error: "template key is required" });
    if (!body) return res.status(400).json({ success: false, error: "template body is required" });

    const payload = {
      key,
      name,
      channel: req.body.channel || "email",
      subject: String(req.body.subject || "").trim(),
      body,
      variables: asArray(req.body.variables).map((item) => String(item).trim()).filter(Boolean),
      status: req.body.status || "active",
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };

    await req.app.locals.db.collection("message_templates").updateOne(
      { key },
      { $set: payload, $setOnInsert: { createdAt: new Date(), createdBy: getActor(req).userId } },
      { upsert: true },
    );
    await appendPlatformAudit(req, {
      action: "platform.template.saved",
      target: { type: "message_template", id: key },
      changes: payload,
    });
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error("Error in upsertMessageTemplate:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to save template" });
  }
};

const listEmailCampaigns = async (req, res) => {
  try {
    const campaigns = await getCollectionRows(req.app.locals.db, "email_campaigns", {}, {
      sort: { createdAt: -1 },
      limit: Math.min(Number(req.query.limit || 50), 200),
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Error in listEmailCampaigns:", error);
    res.status(500).json({ success: false, error: "Failed to load email campaigns" });
  }
};

const createEmailCampaign = async (req, res) => {
  try {
    const subject = String(req.body.subject || "").trim();
    const body = String(req.body.body || req.body.html || "").trim();
    if (!subject) return res.status(400).json({ success: false, error: "subject is required" });
    if (!body) return res.status(400).json({ success: false, error: "campaign body is required" });

    const scheduledAt = normalizeDate(req.body.scheduledAt);
    const now = new Date();
    const payload = {
      subject,
      previewText: String(req.body.previewText || "").trim(),
      body,
      html: req.body.html || body,
      segment: req.body.segment || { target: "newsletter_subscribers" },
      status: scheduledAt && scheduledAt > now ? "scheduled" : req.body.status || "draft",
      scheduledAt,
      openCount: 0,
      clickCount: 0,
      sentCount: 0,
      failedCount: 0,
      createdBy: getActor(req),
      createdAt: now,
      updatedAt: now,
    };
    const result = await req.app.locals.db.collection("email_campaigns").insertOne(payload);
    await appendPlatformAudit(req, {
      action: "platform.email_campaign.created",
      target: { type: "email_campaign", id: normalizeId(result.insertedId) },
      changes: { subject, status: payload.status, scheduledAt },
    });
    res.status(201).json({ success: true, data: { ...payload, _id: result.insertedId } });
  } catch (error) {
    console.error("Error in createEmailCampaign:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to create campaign" });
  }
};

const listAnnouncements = async (req, res) => {
  try {
    const announcements = await getCollectionRows(req.app.locals.db, "platform_announcements", {}, {
      sort: { updatedAt: -1 },
      limit: Math.min(Number(req.query.limit || 50), 200),
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error("Error in listAnnouncements:", error);
    res.status(500).json({ success: false, error: "Failed to load announcements" });
  }
};

const upsertAnnouncement = async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    if (!title) return res.status(400).json({ success: false, error: "title is required" });
    if (!message) return res.status(400).json({ success: false, error: "message is required" });

    const payload = {
      title,
      message,
      target: req.body.target || "all_users",
      roles: asArray(req.body.roles),
      status: req.body.status || "active",
      priority: req.body.priority || "normal",
      bannerTone: req.body.bannerTone || "info",
      link: req.body.link || "",
      dismissible: req.body.dismissible !== false,
      startAt: normalizeDate(req.body.startAt),
      endAt: normalizeDate(req.body.endAt),
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };

    let savedId = req.params.announcementId || req.body.announcementId;
    if (savedId) {
      await req.app.locals.db.collection("platform_announcements").updateOne(
        flexibleIdFilter(savedId),
        { $set: payload },
      );
    } else {
      payload.createdAt = new Date();
      payload.createdBy = getActor(req).userId;
      const result = await req.app.locals.db.collection("platform_announcements").insertOne(payload);
      savedId = result.insertedId;
    }

    await appendPlatformAudit(req, {
      action: "platform.announcement.saved",
      target: { type: "platform_announcement", id: normalizeId(savedId) },
      changes: payload,
    });
    res.status(req.params.announcementId ? 200 : 201).json({ success: true, data: { ...payload, _id: savedId } });
  } catch (error) {
    console.error("Error in upsertAnnouncement:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to save announcement" });
  }
};

const getPlatformConfig = async (req, res) => {
  try {
    const source = await loadPlatformSourceData(req.app.locals.db);
    res.json({
      success: true,
      data: buildPlatformConfigSnapshot({
        categories: source.categories,
        categoryFields: source.categoryFields,
        config: source.configDoc,
        commissionRules: source.commissionRules,
        deliveryZones: source.deliveryZones,
        couriers: source.couriers,
      }),
    });
  } catch (error) {
    console.error("Error in getPlatformConfig:", error);
    res.status(500).json({ success: false, error: "Failed to load platform config" });
  }
};

const getPublicPlatformConfig = async (req, res) => {
  try {
    const saved = await req.app.locals.db
      .collection("platform_settings")
      .findOne({ _id: "platform_control" });
    const config = mergeConfig(saved);
    const featureFlags = mergeFeatureFlags(config.featureFlags);

    res.json({
      success: true,
      data: {
        featureFlags,
        storefront: {
          shopsVisible: featureFlags.shopDirectory !== false,
        },
        maintenanceMode: {
          enabled: Boolean(config.maintenanceMode?.enabled),
          message: config.maintenanceMode?.message || DEFAULT_PLATFORM_CONFIG.maintenanceMode.message,
        },
        seo: {
          defaultMetaTitle: config.seo?.defaultMetaTitle || DEFAULT_PLATFORM_CONFIG.seo.defaultMetaTitle,
          defaultMetaDescription:
            config.seo?.defaultMetaDescription || DEFAULT_PLATFORM_CONFIG.seo.defaultMetaDescription,
          ogImage: config.seo?.ogImage || "",
        },
        updatedAt: config.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("Error in getPublicPlatformConfig:", error);
    res.status(500).json({ success: false, error: "Failed to load platform config" });
  }
};

const updatePlatformConfig = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const saved = await db.collection("platform_settings").findOne({ _id: "platform_control" });
    const config = mergeConfig(saved);
    const allowedSections = [
      "paymentMethods",
      "shipping",
      "returnPolicy",
      "tax",
      "featureFlags",
      "maintenanceMode",
      "seo",
      "sessionTimeoutByRole",
      "twoFactor",
    ];

    allowedSections.forEach((section) => {
      if (req.body[section] !== undefined) {
        config[section] =
          req.body[section] && typeof req.body[section] === "object" && !Array.isArray(req.body[section])
            ? { ...(config[section] || {}), ...req.body[section] }
            : req.body[section];
      }
    });

    if (req.body.regenerateSitemap) {
      config.seo = {
        ...(config.seo || {}),
        sitemapRegenerationRequestedAt: new Date(),
        sitemapRegenerationRequestedBy: getActor(req).userId,
      };
    }

    config.updatedAt = new Date();
    config.updatedBy = getActor(req).userId;

    await db.collection("platform_settings").updateOne(
      { _id: "platform_control" },
      { $set: config, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );

    await appendPlatformAudit(req, {
      action: "platform.config.updated",
      target: { type: "platform_settings", id: "platform_control" },
      changes: req.body,
    });
    res.json({ success: true, data: config });
  } catch (error) {
    console.error("Error in updatePlatformConfig:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update config" });
  }
};

const upsertCategoryNode = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, error: "category name is required" });

    const payload = {
      name,
      slug: makeSlug(req.body.slug || name),
      parentId: req.body.parentId ? safeObjectId(req.body.parentId) || req.body.parentId : null,
      image: req.body.image || "",
      icon: req.body.icon || "",
      seoTitle: req.body.seoTitle || "",
      seoDescription: req.body.seoDescription || "",
      displayOrder: Number(req.body.displayOrder || 0),
      isActive: req.body.isActive !== false,
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };

    let categoryId = req.params.categoryId || req.body.categoryId;
    if (categoryId) {
      await req.app.locals.db.collection("categories").updateOne(
        flexibleIdFilter(categoryId),
        { $set: payload },
      );
    } else {
      payload.createdAt = new Date();
      const result = await req.app.locals.db.collection("categories").insertOne(payload);
      categoryId = result.insertedId;
    }

    await appendPlatformAudit(req, {
      action: "platform.category.saved",
      target: { type: "category", id: normalizeId(categoryId) },
      changes: payload,
    });
    res.status(req.params.categoryId ? 200 : 201).json({ success: true, data: { ...payload, _id: categoryId } });
  } catch (error) {
    console.error("Error in upsertCategoryNode:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to save category" });
  }
};

const normalizeAttributes = (attributes = []) =>
  asArray(attributes).map((attribute, index) => ({
    key: makeSlug(attribute.key || attribute.name),
    name: String(attribute.name || attribute.key || "").trim(),
    type: attribute.type || "text",
    required: Boolean(attribute.required),
    filterable: Boolean(attribute.filterable),
    options: asArray(attribute.options).map((option) => String(option).trim()).filter(Boolean),
    displayOrder: Number(attribute.displayOrder ?? index),
  })).filter((attribute) => attribute.key && attribute.name);

const upsertCategoryAttributes = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const attributes = normalizeAttributes(req.body.attributes);
    const now = new Date();
    const db = req.app.locals.db;
    await db.collection("categories").updateOne(
      flexibleIdFilter(categoryId),
      { $set: { attributes, updatedAt: now, updatedBy: getActor(req).userId } },
    );
    await db.collection("category_fields").updateOne(
      { categoryId: normalizeId(categoryId) },
      {
        $set: {
          categoryId: normalizeId(categoryId),
          attributes,
          updatedAt: now,
          updatedBy: getActor(req).userId,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    await appendPlatformAudit(req, {
      action: "platform.category_attributes.saved",
      target: { type: "category", id: normalizeId(categoryId) },
      changes: { attributes },
    });
    res.json({ success: true, data: { categoryId, attributes } });
  } catch (error) {
    console.error("Error in upsertCategoryAttributes:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to save attributes" });
  }
};

const updateCommissionRuleTable = async (req, res) => {
  try {
    const rules = asArray(req.body.rules);
    if (!rules.length) return res.status(400).json({ success: false, error: "rules are required" });

    const now = new Date();
    const db = req.app.locals.db;
    const saved = [];

    for (const rule of rules) {
      const commissionRate = Number(rule.commissionRate);
      if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        return res.status(400).json({ success: false, error: "commissionRate must be between 0 and 100" });
      }
      const payload = {
        name: String(rule.name || "Commission rule").trim(),
        categoryId: normalizeId(rule.categoryId),
        vendorTier: rule.vendorTier || "all",
        campaignType: rule.campaignType || "all",
        commissionRate: roundNumber(commissionRate),
        effectiveFrom: normalizeDate(rule.effectiveFrom),
        effectiveTo: normalizeDate(rule.effectiveTo),
        priority: Number(rule.priority || 0),
        status: rule.status || "active",
        source: "platform_config",
        updatedAt: now,
        updatedBy: getActor(req).userId,
      };
      if (rule.ruleId || rule._id) {
        const id = rule.ruleId || rule._id;
        await db.collection("commission_rules").updateOne(flexibleIdFilter(id), { $set: payload });
        saved.push({ ...payload, _id: id });
      } else {
        payload.createdAt = now;
        payload.createdBy = getActor(req).userId;
        const result = await db.collection("commission_rules").insertOne(payload);
        saved.push({ ...payload, _id: result.insertedId });
      }
    }

    await appendPlatformAudit(req, {
      action: "platform.commission_table.saved",
      target: { type: "commission_rules", id: "bulk" },
      changes: { count: saved.length },
    });
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error("Error in updateCommissionRuleTable:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to save commission rules" });
  }
};

const listStaffAccess = async (req, res) => {
  try {
    const [users, config, auditLogs] = await Promise.all([
      getCollectionRows(req.app.locals.db, "users"),
      req.app.locals.db.collection("platform_settings").findOne({ _id: "platform_control" }),
      getCollectionRows(req.app.locals.db, "audit_logs", {}, { sort: { createdAt: -1 }, limit: 120 }),
    ]);
    res.json({
      success: true,
      data: buildStaffAccessCenter({
        users,
        roleSettings: mergeConfig(config || {}),
        auditLogs,
      }),
    });
  } catch (error) {
    console.error("Error in listStaffAccess:", error);
    res.status(500).json({ success: false, error: "Failed to load staff access" });
  }
};

const inviteStaffAccount = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const role = req.body.role || "support_agent";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "valid email is required" });
    }
    if (!ROLE_DEFINITION_BY_ID[role] && !["manager", "support"].includes(role)) {
      return res.status(400).json({ success: false, error: "invalid staff role" });
    }

    const now = new Date();
    const db = req.app.locals.db;
    const payload = {
      email,
      role,
      status: req.body.status || "invited",
      permissions: getDefaultPermissions(role),
      requireTwoFactor: true,
      invitedBy: getActor(req).userId,
      updatedAt: now,
      profile: {
        firstName: name,
        lastName: "",
        phone: req.body.phone || "",
      },
    };

    const existing = await db.collection("users").findOne({ email });
    let staffId = existing?._id;
    if (existing) {
      await db.collection("users").updateOne({ email }, { $set: payload });
    } else {
      payload.createdAt = now;
      payload.firebaseUid = req.body.firebaseUid || `staff:${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString("hex")}`;
      const result = await db.collection("users").insertOne(payload);
      staffId = result.insertedId;
    }

    await db.collection("admin_staff_invites").insertOne({
      staffId,
      email,
      role,
      inviteToken: crypto.randomBytes(24).toString("hex"),
      status: "pending",
      createdAt: now,
      createdBy: getActor(req).userId,
    });
    await appendPlatformAudit(req, {
      action: "platform.staff.invited",
      target: { type: "staff", id: normalizeId(staffId) },
      changes: { email, role },
    });
    res.status(201).json({ success: true, data: { ...payload, _id: staffId } });
  } catch (error) {
    console.error("Error in inviteStaffAccount:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to invite staff" });
  }
};

const updateStaffRole = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const role = req.body.role;
    if (!ROLE_DEFINITION_BY_ID[role] && !["manager", "support"].includes(role)) {
      return res.status(400).json({ success: false, error: "invalid staff role" });
    }
    const update = {
      role,
      permissions: getDefaultPermissions(role),
      status: req.body.status || "active",
      requireTwoFactor: true,
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };
    await req.app.locals.db.collection("users").updateOne(flexibleIdFilter(staffId), { $set: update });
    await appendPlatformAudit(req, {
      action: "platform.staff.role_updated",
      target: { type: "staff", id: normalizeId(staffId) },
      changes: update,
    });
    res.json({ success: true, data: { _id: staffId, ...update } });
  } catch (error) {
    console.error("Error in updateStaffRole:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update staff role" });
  }
};

const getStaffActivityLog = async (req, res) => {
  try {
    const query = {};
    if (req.query.staffId) query["actor.userId"] = req.query.staffId;
    const logs = await getCollectionRows(req.app.locals.db, "audit_logs", query, {
      sort: { createdAt: -1 },
      limit: Math.min(Number(req.query.limit || 100), 300),
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error in getStaffActivityLog:", error);
    res.status(500).json({ success: false, error: "Failed to load activity log" });
  }
};

const setupAdminTwoFactor = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const db = req.app.locals.db;
    const user = await db.collection("users").findOne(flexibleIdFilter(staffId));
    if (!user) return res.status(404).json({ success: false, error: "staff account not found" });

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Amiyo-Go Admin (${user.email || staffId})`,
      issuer: "Amiyo-Go",
    });
    const update = {
      "security.twoFactor.pendingSecret": secret.base32,
      "security.twoFactor.pendingAt": new Date(),
      "security.twoFactor.provider": "speakeasy",
      "security.twoFactor.required": true,
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };

    await db.collection("users").updateOne(flexibleIdFilter(staffId), { $set: update });
    await appendPlatformAudit(req, {
      action: "platform.staff.2fa_setup_started",
      target: { type: "staff", id: normalizeId(staffId) },
      changes: { provider: "speakeasy" },
    });
    res.json({
      success: true,
      data: {
        staffId,
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        provider: "speakeasy",
      },
    });
  } catch (error) {
    console.error("Error in setupAdminTwoFactor:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to start 2FA setup" });
  }
};

const verifyAdminTwoFactor = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const token = String(req.body.token || req.body.code || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ success: false, error: "valid 6 digit code is required" });
    }

    const db = req.app.locals.db;
    const user = await db.collection("users").findOne(flexibleIdFilter(staffId));
    if (!user) return res.status(404).json({ success: false, error: "staff account not found" });
    const secret = user.security?.twoFactor?.pendingSecret || user.security?.twoFactor?.secret;
    if (!secret) return res.status(400).json({ success: false, error: "2FA setup has not been started" });

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!verified) return res.status(400).json({ success: false, error: "invalid 2FA code" });

    const update = {
      "security.twoFactor.enabled": true,
      "security.twoFactor.secret": secret,
      "security.twoFactor.provider": "speakeasy",
      "security.twoFactor.required": true,
      "security.twoFactor.verifiedAt": new Date(),
      "security.twoFactor.pendingSecret": null,
      updatedAt: new Date(),
      updatedBy: getActor(req).userId,
    };
    await db.collection("users").updateOne(flexibleIdFilter(staffId), { $set: update });
    await appendPlatformAudit(req, {
      action: "platform.staff.2fa_verified",
      target: { type: "staff", id: normalizeId(staffId) },
      changes: { enabled: true },
    });
    res.json({ success: true, data: { staffId, enabled: true, provider: "speakeasy" } });
  } catch (error) {
    console.error("Error in verifyAdminTwoFactor:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to verify 2FA" });
  }
};

const updateRoleSessionPolicy = async (req, res) => {
  try {
    const role = req.params.role;
    if (!ROLE_DEFINITION_BY_ID[role] && !["manager", "support"].includes(role)) {
      return res.status(400).json({ success: false, error: "invalid staff role" });
    }
    const minutes = Number(req.body.sessionTimeoutMinutes);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) {
      return res.status(400).json({ success: false, error: "sessionTimeoutMinutes must be between 5 and 240" });
    }

    const db = req.app.locals.db;
    const saved = await db.collection("platform_settings").findOne({ _id: "platform_control" });
    const config = mergeConfig(saved);
    config.sessionTimeoutByRole = {
      ...(config.sessionTimeoutByRole || {}),
      [role]: minutes,
    };
    config.updatedAt = new Date();
    config.updatedBy = getActor(req).userId;

    await db.collection("platform_settings").updateOne(
      { _id: "platform_control" },
      { $set: config, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    await appendPlatformAudit(req, {
      action: "platform.role.session_policy_updated",
      target: { type: "role", id: role },
      changes: { sessionTimeoutMinutes: minutes },
    });
    res.json({ success: true, data: { role, sessionTimeoutMinutes: minutes } });
  } catch (error) {
    console.error("Error in updateRoleSessionPolicy:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update session policy" });
  }
};

module.exports = {
  getPlatformControlOverview,
  listNotificationBroadcasts,
  sendNotificationBroadcast,
  listMessageTemplates,
  upsertMessageTemplate,
  listEmailCampaigns,
  createEmailCampaign,
  listAnnouncements,
  upsertAnnouncement,
  getPlatformConfig,
  getPublicPlatformConfig,
  updatePlatformConfig,
  upsertCategoryNode,
  upsertCategoryAttributes,
  updateCommissionRuleTable,
  listStaffAccess,
  inviteStaffAccount,
  updateStaffRole,
  getStaffActivityLog,
  setupAdminTwoFactor,
  verifyAdminTwoFactor,
  updateRoleSessionPolicy,
  _platformTestUtils: {
    ADMIN_ROLE_DEFINITIONS,
    DEFAULT_MESSAGE_TEMPLATES,
    DEFAULT_PLATFORM_CONFIG,
    buildCommunicationOverview,
    buildPlatformConfigSnapshot,
    buildStaffAccessCenter,
    buildCategoryTree,
    mergeConfig,
    mergeMessageTemplates,
    normalizeAttributes,
    normalizeChannels,
    resolveBroadcastRecipients,
    csvSafe,
  },
};
