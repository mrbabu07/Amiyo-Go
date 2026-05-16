const SUPPORTED_MANUAL_PAYMENT_METHODS = Object.freeze({
  bkash: {
    label: "bKash",
    requiresTransactionId: true,
    requiresSenderAccount: true,
    requiresProofImage: false,
  },
  nagad: {
    label: "Nagad",
    requiresTransactionId: true,
    requiresSenderAccount: true,
    requiresProofImage: false,
  },
  rocket: {
    label: "Rocket",
    requiresTransactionId: true,
    requiresSenderAccount: true,
    requiresProofImage: false,
  },
  bankTransfer: {
    label: "Bank transfer",
    requiresTransactionId: true,
    requiresSenderAccount: false,
    requiresProofImage: true,
  },
});

const PAYMENT_STATUSES = Object.freeze([
  "unpaid",
  "submitted",
  "verified",
  "rejected",
  "refunded",
]);

const METHOD_ALIASES = Object.freeze({
  bkash: "bkash",
  bKash: "bkash",
  বিকাশ: "bkash",
  nagad: "nagad",
  নগদ: "nagad",
  rocket: "rocket",
  dbblRocket: "rocket",
  "dbbl rocket": "rocket",
  bank: "bankTransfer",
  bankTransfer: "bankTransfer",
  bank_transfer: "bankTransfer",
  "bank transfer": "bankTransfer",
});

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, char = "") => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());

const normalizeManualPaymentMethod = (method) => {
  const raw = String(method || "").trim();
  const normalized = normalizeText(raw);
  return METHOD_ALIASES[raw] || METHOD_ALIASES[normalized] || normalized;
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeMoney = (value) => {
  const amount = round2(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

const hasValue = (value) => String(value || "").trim().length > 0;

const isSupportedManualPaymentMethod = (method) =>
  Boolean(SUPPORTED_MANUAL_PAYMENT_METHODS[normalizeManualPaymentMethod(method)]);

const validateManualPaymentProof = ({
  method,
  amount,
  orderTotal,
  transactionId,
  senderAccount,
  proofImageUrl,
  allowPartial = false,
} = {}) => {
  const normalizedMethod = normalizeManualPaymentMethod(method);
  const methodConfig = SUPPORTED_MANUAL_PAYMENT_METHODS[normalizedMethod];
  const errors = [];
  const paidAmount = normalizeMoney(amount);
  const expectedAmount = normalizeMoney(orderTotal);

  if (!methodConfig) {
    errors.push("Unsupported manual payment method.");
  }

  if (paidAmount <= 0) {
    errors.push("Payment amount must be greater than zero.");
  }

  if (!allowPartial && expectedAmount > 0 && paidAmount !== expectedAmount) {
    errors.push("Payment amount must match the order total.");
  }

  if (allowPartial && expectedAmount > 0 && paidAmount > expectedAmount) {
    errors.push("Partial payment cannot exceed the order total.");
  }

  if (methodConfig?.requiresTransactionId && !hasValue(transactionId)) {
    errors.push("Transaction ID is required.");
  }

  if (methodConfig?.requiresSenderAccount && !hasValue(senderAccount)) {
    errors.push("Sender account number is required.");
  }

  if (methodConfig?.requiresProofImage && !hasValue(proofImageUrl)) {
    errors.push("Payment proof image is required.");
  }

  return {
    valid: errors.length === 0,
    errors,
    method: normalizedMethod,
    methodLabel: methodConfig?.label || "",
    amount: paidAmount,
    orderTotal: expectedAmount,
  };
};

const buildManualPaymentRecord = ({
  orderId,
  userId,
  method,
  amount,
  orderTotal,
  transactionId,
  senderAccount,
  proofImageUrl,
  note,
  allowPartial = false,
  submittedAt = new Date(),
} = {}) => {
  const validation = validateManualPaymentProof({
    method,
    amount,
    orderTotal,
    transactionId,
    senderAccount,
    proofImageUrl,
    allowPartial,
  });

  if (!hasValue(orderId)) validation.errors.push("Order ID is required.");
  if (!hasValue(userId)) validation.errors.push("User ID is required.");

  const valid = validation.errors.length === 0;

  return {
    valid,
    errors: validation.errors,
    record: valid
      ? {
          orderId,
          userId,
          method: validation.method,
          methodLabel: validation.methodLabel,
          amount: validation.amount,
          orderTotal: validation.orderTotal,
          transactionId: String(transactionId || "").trim(),
          senderAccount: String(senderAccount || "").trim(),
          proofImageUrl: String(proofImageUrl || "").trim(),
          note: String(note || "").trim(),
          status: "submitted",
          submittedAt: submittedAt instanceof Date ? submittedAt : new Date(submittedAt),
        }
      : null,
  };
};

const canTransitionManualPaymentStatus = ({ from, to, actorRole } = {}) => {
  const current = String(from || "").trim();
  const next = String(to || "").trim();
  const role = String(actorRole || "").trim().toLowerCase();

  if (!PAYMENT_STATUSES.includes(current) || !PAYMENT_STATUSES.includes(next)) {
    return false;
  }

  if (current === next) return true;

  const adminTransitions = {
    submitted: ["verified", "rejected"],
    verified: ["refunded"],
    rejected: ["submitted"],
  };

  const buyerTransitions = {
    unpaid: ["submitted"],
    rejected: ["submitted"],
  };

  const transitions = role === "admin" || role === "superadmin"
    ? adminTransitions
    : buyerTransitions;

  return Boolean(transitions[current]?.includes(next));
};

module.exports = {
  SUPPORTED_MANUAL_PAYMENT_METHODS,
  PAYMENT_STATUSES,
  normalizeManualPaymentMethod,
  isSupportedManualPaymentMethod,
  validateManualPaymentProof,
  buildManualPaymentRecord,
  canTransitionManualPaymentStatus,
  round2,
};
