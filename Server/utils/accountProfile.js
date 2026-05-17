const crypto = require("crypto");

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  orderUpdates: { email: true, sms: false, push: true },
  promotions: { email: false, sms: false, push: false },
  priceDrops: { email: true, sms: false, push: true },
  vendorNews: { email: false, sms: false, push: false },
});

const DEFAULT_PRIVACY_SETTINGS = Object.freeze({
  wishlistVisibility: "private",
  reviewHistoryVisibility: "public",
  personalization: true,
});

const DEFAULT_APP_PREFERENCES = Object.freeze({
  language: "en",
  currency: "BDT",
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeString = (value, max = 160) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);

const normalizePhone = (value) => normalizeString(value, 32).replace(/[^\d+]/g, "");

const splitName = (name = "") => {
  const parts = normalizeString(name, 100).split(" ").filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const getDisplayName = (user = {}, firebaseUser = {}) => {
  const profile = user.profile || {};
  const composedName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return (
    profile.displayName ||
    composedName ||
    user.name ||
    firebaseUser.name ||
    user.email?.split("@")[0] ||
    firebaseUser.email?.split("@")[0] ||
    "Customer"
  );
};

const mergeNotificationPreferences = (value = {}) => {
  const merged = clone(DEFAULT_NOTIFICATION_PREFERENCES);
  Object.entries(value || {}).forEach(([eventKey, channels]) => {
    if (!merged[eventKey]) return;
    ["email", "sms", "push"].forEach((channel) => {
      if (typeof channels?.[channel] === "boolean") {
        merged[eventKey][channel] = channels[channel];
      }
    });
  });
  return merged;
};

const sanitizePrivacySettings = (value = {}) => {
  const visibilityValues = new Set(["private", "followers", "public"]);
  return {
    wishlistVisibility: visibilityValues.has(value.wishlistVisibility)
      ? value.wishlistVisibility
      : DEFAULT_PRIVACY_SETTINGS.wishlistVisibility,
    reviewHistoryVisibility: visibilityValues.has(value.reviewHistoryVisibility)
      ? value.reviewHistoryVisibility
      : DEFAULT_PRIVACY_SETTINGS.reviewHistoryVisibility,
    personalization:
      typeof value.personalization === "boolean"
        ? value.personalization
        : DEFAULT_PRIVACY_SETTINGS.personalization,
  };
};

const sanitizeAppPreferences = (value = {}) => ({
  language: ["en", "bn"].includes(value.language)
    ? value.language
    : DEFAULT_APP_PREFERENCES.language,
  currency: value.currency === "BDT" ? "BDT" : DEFAULT_APP_PREFERENCES.currency,
});

const sanitizeProfileInput = (value = {}) => {
  const displayName = normalizeString(value.displayName || value.name, 100);
  const names = splitName(displayName);
  return {
    displayName,
    firstName: normalizeString(value.firstName || names.firstName, 60),
    lastName: normalizeString(value.lastName || names.lastName, 60),
    phone: normalizePhone(value.phone),
    avatar: normalizeString(value.avatar || value.photoURL, 500),
  };
};

const maskAccountNumber = (value = "") => {
  const cleaned = normalizePhone(value);
  if (!cleaned) return "";
  return cleaned.length <= 4
    ? cleaned
    : `${"*".repeat(Math.max(0, cleaned.length - 4))}${cleaned.slice(-4)}`;
};

const sanitizePaymentMethod = (value = {}) => {
  const type = ["bkash", "nagad", "card"].includes(String(value.type || "").toLowerCase())
    ? String(value.type).toLowerCase()
    : "bkash";
  const rawNumber = normalizePhone(value.accountNumber || value.number || value.phone);
  const last4 = normalizeString(value.last4 || rawNumber.slice(-4), 4);
  return {
    id: value.id || `pm_${crypto.randomBytes(6).toString("hex")}`,
    type,
    label:
      normalizeString(value.label, 60) ||
      (type === "card" ? `Card ending ${last4}` : `${type === "bkash" ? "bKash" : "Nagad"} ${last4}`),
    accountNumber: type === "card" ? "" : rawNumber,
    maskedAccount: type === "card" ? `**** ${last4}` : maskAccountNumber(rawNumber),
    last4,
    isDefault: Boolean(value.isDefault),
    createdAt: value.createdAt || new Date(),
  };
};

const normalizePaymentMethods = (methods = []) => {
  const sanitized = methods.map(sanitizePaymentMethod).slice(0, 10);
  if (sanitized.length > 0 && !sanitized.some((method) => method.isDefault)) {
    sanitized[0].isDefault = true;
  }
  return sanitized;
};

const buildLoginActivityEntry = (req = {}, now = new Date()) => ({
  id: `login_${crypto.randomBytes(6).toString("hex")}`,
  at: now,
  ip:
    req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown",
  device: normalizeString(req.headers?.["user-agent"] || "Unknown device", 180),
  location: normalizeString(req.headers?.["x-vercel-ip-city"] || req.headers?.["cf-ipcity"] || "Unknown location", 80),
});

const getDeletionDeadline = (now = new Date()) =>
  new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const buildAccountProfile = (user = {}, firebaseUser = {}) => {
  const account = user.account || {};
  const profile = user.profile || {};
  const displayName = getDisplayName(user, firebaseUser);
  const email = user.email || firebaseUser.email || "";

  return {
    id: user._id?.toString?.() || "",
    firebaseUid: user.firebaseUid || firebaseUser.uid || "",
    role: user.role || "customer",
    status: user.status || "active",
    profile: {
      displayName,
      firstName: profile.firstName || splitName(displayName).firstName,
      lastName: profile.lastName || splitName(displayName).lastName,
      email,
      phone: profile.phone || "",
      avatar: profile.avatar || profile.photoURL || firebaseUser.picture || "",
    },
    verificationBadges: {
      emailVerified: Boolean(
        user.verification?.emailVerified ?? firebaseUser.email_verified ?? firebaseUser.emailVerified ?? email,
      ),
      phoneVerified: Boolean(user.verification?.phoneVerified || profile.phoneVerified),
    },
    savedPaymentMethods: normalizePaymentMethods(account.savedPaymentMethods || []),
    notificationPreferences: mergeNotificationPreferences(
      account.notificationPreferences || profile.notificationPreferences,
    ),
    privacy: sanitizePrivacySettings(account.privacy),
    appPreferences: sanitizeAppPreferences(account.appPreferences),
    security: {
      twoFactorEnabled: Boolean(user.security?.twoFactor?.enabled),
      twoFactorProvider: user.security?.twoFactor?.provider || "speakeasy",
    },
    loginActivity: (user.loginActivity || []).slice(0, 10),
    deletion: user.deletion || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
};

const buildDataExportPayload = ({ user = {}, addresses = [] }) => ({
  generatedAt: new Date().toISOString(),
  user: buildAccountProfile(user, {}),
  rawUser: {
    firebaseUid: user.firebaseUid,
    email: user.email,
    role: user.role,
    status: user.status,
    profile: user.profile || {},
    account: user.account || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
  addresses,
});

module.exports = {
  DEFAULT_APP_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PRIVACY_SETTINGS,
  buildAccountProfile,
  buildDataExportPayload,
  buildLoginActivityEntry,
  getDeletionDeadline,
  mergeNotificationPreferences,
  normalizePaymentMethods,
  sanitizeAppPreferences,
  sanitizePaymentMethod,
  sanitizePrivacySettings,
  sanitizeProfileInput,
};
