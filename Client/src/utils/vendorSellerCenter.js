const activeVendorStatuses = new Set(["approved", "active", "verified"]);
const pendingVendorStatuses = new Set(["pending", "submitted", "under_review"]);
const rejectedVendorStatuses = new Set(["rejected", "declined"]);
const suspendedVendorStatuses = new Set(["suspended", "blocked", "blacklisted"]);
const missingKycStatuses = new Set(["missing_kyc", "kyc_required", "verification_required"]);
const pendingKycStatuses = new Set(["pending", "submitted", "under_review", "kyc_pending"]);
const approvedKycStatuses = new Set(["approved", "verified"]);
const rejectedKycStatuses = new Set(["rejected", "declined"]);

export const normalizeSellerStatus = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

export const getVendorKycStatus = (vendor = {}) => {
  const rawStatus =
    vendor.kyc?.status ||
    vendor.kycStatus ||
    vendor.verificationStatus ||
    vendor.verificationLevel ||
    "";
  const normalized = normalizeSellerStatus(rawStatus, "not_submitted");

  if (normalized === "verified") return "approved";
  if (normalized === "kyc_pending") return "pending";
  if (normalized === "basic") return "not_submitted";
  return normalized || "not_submitted";
};

export const getVendorGateStatus = ({
  vendorProfile,
  role,
  isAdmin = false,
} = {}) => {
  if (isAdmin) return "active";
  if (!vendorProfile) return "missing";

  const vendorStatus = normalizeSellerStatus(vendorProfile.status, "pending");
  if (suspendedVendorStatuses.has(vendorStatus)) return "suspended";
  if (rejectedVendorStatuses.has(vendorStatus)) return "rejected";
  if (pendingVendorStatuses.has(vendorStatus)) return "pending";
  if (missingKycStatuses.has(vendorStatus)) return "missing_kyc";
  if (!activeVendorStatuses.has(vendorStatus)) return vendorStatus || "pending";

  if (!["vendor", "vendor_staff"].includes(role)) return "role_pending";

  const kycStatus = getVendorKycStatus(vendorProfile);
  const requiresKyc =
    vendorProfile.requiresKyc ||
    vendorProfile.kycRequired ||
    normalizeSellerStatus(vendorProfile.verificationLevel) === "kyc_required";

  if (rejectedKycStatuses.has(kycStatus)) return "missing_kyc";
  if (requiresKyc && pendingKycStatuses.has(kycStatus)) return "kyc_pending";
  if (requiresKyc && !approvedKycStatuses.has(kycStatus)) return "missing_kyc";

  return "active";
};

const actionTones = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const kycAction = (vendorProfile = {}) => {
  const status = getVendorKycStatus(vendorProfile);

  if (approvedKycStatuses.has(status)) {
    return {
      id: "kyc-verified",
      label: "KYC verified",
      description: "Your verification documents are approved.",
      path: "/vendor/kyc",
      severity: "success",
      icon: "kyc",
      tone: actionTones.success,
    };
  }

  if (pendingKycStatuses.has(status)) {
    return {
      id: "kyc-pending",
      label: "KYC review pending",
      description: "Track review status and add updated documents if admin asks.",
      path: "/vendor/kyc",
      severity: "warning",
      icon: "kyc",
      tone: actionTones.warning,
    };
  }

  if (rejectedKycStatuses.has(status)) {
    return {
      id: "kyc-rejected",
      label: "KYC needs resubmission",
      description: "Review the rejection reason and upload corrected documents.",
      path: "/vendor/kyc",
      severity: "danger",
      icon: "kyc",
      tone: actionTones.danger,
    };
  }

  return {
    id: "kyc-required",
    label: "Complete seller KYC",
    description: "Upload NID, trade license, and payout ownership details.",
    path: "/vendor/kyc",
    severity: "warning",
    icon: "kyc",
    tone: actionTones.warning,
  };
};

export const buildVendorActionItems = (vendorProfile = {}) => [
  kycAction(vendorProfile),
  {
    id: "orders",
    label: "Process orders",
    description: "Accept, pack, print slips, and mark pickup-ready.",
    path: "/vendor/orders",
    severity: "info",
    icon: "orders",
    tone: actionTones.info,
  },
  {
    id: "products",
    label: "Fix listings and stock",
    description: "Review rejected products, SKU stock, images, and pricing.",
    path: "/vendor/products",
    severity: "info",
    icon: "products",
    tone: actionTones.info,
  },
  {
    id: "returns",
    label: "Review return cases",
    description: "Respond to buyer evidence before admin decision.",
    path: "/vendor/returns",
    severity: "info",
    icon: "returns",
    tone: actionTones.info,
  },
  {
    id: "payouts",
    label: "Check payouts",
    description: "See pending balances, payout history, and statements.",
    path: "/vendor/finance/payouts",
    severity: "info",
    icon: "finance",
    tone: actionTones.info,
  },
  {
    id: "campaigns",
    label: "Campaign opportunities",
    description: "Create vouchers and join marketplace campaigns.",
    path: "/vendor/marketing/campaigns",
    severity: "info",
    icon: "marketing",
    tone: actionTones.info,
  },
  {
    id: "messages",
    label: "Customer communication",
    description: "Reply to messages, support threads, reviews, and Q&A.",
    path: "/vendor/messages",
    severity: "info",
    icon: "support",
    tone: actionTones.info,
  },
];

export const getVendorActionCount = (items = []) =>
  items.filter((item) => ["danger", "warning"].includes(item.severity)).length;

export const getVendorReadiness = (vendorProfile = {}) => {
  const actions = buildVendorActionItems(vendorProfile);
  const blockers = actions.filter((item) => item.severity === "danger");
  const warnings = actions.filter((item) => item.severity === "warning");
  const score = Math.max(0, 100 - blockers.length * 35 - warnings.length * 15);

  return {
    score,
    label: blockers.length ? "Blocked" : warnings.length ? "Needs attention" : "Ready",
    blockers,
    warnings,
  };
};
