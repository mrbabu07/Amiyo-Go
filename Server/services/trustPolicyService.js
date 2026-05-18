const DEFAULT_TRUST_POLICIES = [
  {
    violationType: "seller_verification_missing",
    title: "Seller verification missing",
    severity: "high",
    automaticAction: "vendor_hold",
    manualReviewRequired: true,
    escalationPath: "vendor_approval_queue",
    appealAllowed: true,
  },
  {
    violationType: "prohibited_product",
    title: "Prohibited product",
    severity: "critical",
    automaticAction: "listing_unpublish",
    manualReviewRequired: true,
    escalationPath: "content_moderation_queue",
    appealAllowed: true,
  },
  {
    violationType: "fake_review",
    title: "Fake review or review manipulation",
    severity: "high",
    automaticAction: "review_hold",
    manualReviewRequired: true,
    escalationPath: "review_moderation_queue",
    appealAllowed: true,
  },
  {
    violationType: "refund_abuse",
    title: "Refund or return abuse",
    severity: "high",
    automaticAction: "return_hold",
    manualReviewRequired: true,
    escalationPath: "returns_risk_queue",
    appealAllowed: true,
  },
  {
    violationType: "promo_abuse",
    title: "Promotion or voucher abuse",
    severity: "medium",
    automaticAction: "promotion_cooldown",
    manualReviewRequired: true,
    escalationPath: "promo_abuse_queue",
    appealAllowed: false,
  },
  {
    violationType: "spam_bot",
    title: "Spam or bot behavior",
    severity: "medium",
    automaticAction: "account_rate_limit",
    manualReviewRequired: false,
    escalationPath: "account_abuse_queue",
    appealAllowed: false,
  },
  {
    violationType: "harassment_support_chat",
    title: "Harassment or support/chat misuse",
    severity: "high",
    automaticAction: "message_hold",
    manualReviewRequired: true,
    escalationPath: "support_safety_queue",
    appealAllowed: true,
  },
  {
    violationType: "account_takeover_risk",
    title: "Account takeover risk",
    severity: "critical",
    automaticAction: "step_up_verification",
    manualReviewRequired: true,
    escalationPath: "account_abuse_queue",
    appealAllowed: false,
  },
  {
    violationType: "payout_risk",
    title: "Payout risk",
    severity: "critical",
    automaticAction: "payout_hold",
    manualReviewRequired: true,
    escalationPath: "finance_risk_queue",
    appealAllowed: true,
  },
];

const SEVERITY_ORDER = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const normalizePolicy = (policy = {}) => ({
  violationType: String(policy.violationType || "").trim(),
  title: String(policy.title || policy.violationType || "").trim(),
  severity: ["low", "medium", "high", "critical"].includes(policy.severity) ? policy.severity : "medium",
  automaticAction: policy.automaticAction || "manual_review",
  manualReviewRequired: policy.manualReviewRequired !== false,
  escalationPath: policy.escalationPath || "trust_safety_queue",
  appealAllowed: policy.appealAllowed !== false,
  policyVersion: Number(policy.policyVersion || 1),
  active: policy.active !== false,
});

const buildDefaultEvidence = (evidence = {}) => ({
  signalCount: Number(evidence.signalCount || evidence.flags?.length || 0),
  riskScore: Number(evidence.riskScore || evidence.score || 0),
  flags: evidence.flags || [],
  source: evidence.source || "system",
});

class TrustPolicyService {
  static getDefaultPolicies() {
    return DEFAULT_TRUST_POLICIES.map(normalizePolicy);
  }

  static severityRank(severity = "low") {
    return SEVERITY_ORDER[severity] || 1;
  }

  static async listPolicies(db) {
    if (!db?.collection) return TrustPolicyService.getDefaultPolicies();
    const saved = await db.collection("trust_policies").find({ active: { $ne: false } }).sort({ violationType: 1 }).toArray();
    if (!saved.length) return TrustPolicyService.getDefaultPolicies();
    const savedByType = new Map(saved.map((policy) => [policy.violationType, normalizePolicy(policy)]));
    return TrustPolicyService.getDefaultPolicies().map((policy) => savedByType.get(policy.violationType) || policy);
  }

  static async getPolicy(db, violationType) {
    const normalized = normalizeId(violationType);
    const policies = await TrustPolicyService.listPolicies(db);
    return policies.find((policy) => policy.violationType === normalized) || null;
  }

  static async upsertPolicy(db, policy = {}, actor = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const normalized = normalizePolicy(policy);
    if (!normalized.violationType) throw new Error("Violation type is required");
    const doc = {
      ...normalized,
      updatedBy: actor,
      updatedAt: new Date(),
    };
    await db.collection("trust_policies").updateOne(
      { violationType: normalized.violationType },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    return db.collection("trust_policies").findOne({ violationType: normalized.violationType });
  }

  static buildPolicyAction(policy = {}, context = {}) {
    const normalized = normalizePolicy(policy);
    return {
      violationType: normalized.violationType,
      severity: normalized.severity,
      automaticAction: normalized.automaticAction,
      manualReviewRequired: normalized.manualReviewRequired,
      escalationPath: normalized.escalationPath,
      appealAllowed: normalized.appealAllowed,
      target: context.target || null,
      reason: context.reason || normalized.title,
    };
  }

  static async evaluatePolicyViolation(db, { violationType, target = null, evidence = {}, reason = "" } = {}) {
    if (!violationType) throw new Error("Violation type is required");
    const policy = await TrustPolicyService.getPolicy(db, violationType);
    if (!policy) {
      return {
        matched: false,
        violationType,
        target,
        evidence: buildDefaultEvidence(evidence),
        policyAction: null,
      };
    }

    const action = TrustPolicyService.buildPolicyAction(policy, {
      target,
      reason: reason || policy.title,
    });
    const normalizedEvidence = buildDefaultEvidence(evidence);
    return {
      matched: true,
      policy,
      target,
      evidence: normalizedEvidence,
      policyAction: {
        ...action,
        manualReviewRequired:
          action.manualReviewRequired ||
          TrustPolicyService.severityRank(action.severity) >= TrustPolicyService.severityRank("high") ||
          normalizedEvidence.riskScore >= 65,
      },
    };
  }
}

module.exports = TrustPolicyService;
module.exports.DEFAULT_TRUST_POLICIES = DEFAULT_TRUST_POLICIES;
module.exports._test = {
  buildDefaultEvidence,
  normalizePolicy,
};
