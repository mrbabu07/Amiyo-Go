const TrustPolicyService = require("./trustPolicyService");

const RISK_SIGNAL_DELTAS = {
  duplicate_device_account: 25,
  shared_ip_account_burst: 20,
  failed_login_burst: 20,
  suspicious_device_login: 25,
  voucher_testing: 15,
  first_order_discount_abuse: 25,
  excessive_return_rate: 30,
  high_value_return: 20,
  cod_refusal: 25,
  review_burst: 25,
  repetitive_review_text: 20,
  unverified_review: 15,
  duplicate_listing: 20,
  prohibited_product_keyword: 40,
  payout_change: 20,
  shared_payout_account: 35,
  high_dispute_rate: 30,
  abusive_language: 20,
  attachment_abuse: 10,
  address_phone_reuse: 20,
};

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(Number(value || 0), max));
const round = (value) => Math.round(Number(value || 0));

const riskLevel = (score = 0) => {
  const value = Number(score || 0);
  if (value >= 85) return "critical";
  if (value >= 65) return "high";
  if (value >= 35) return "medium";
  return "low";
};

const riskDeltaFor = (eventType, override = null) =>
  override === null || override === undefined
    ? Number(RISK_SIGNAL_DELTAS[eventType] || 5)
    : Number(override || 0);

const normalizeReason = (value = "") => String(value || "").trim().toLowerCase();

const repeatedTextRatio = (texts = []) => {
  const normalized = texts.map((text) => normalizeReason(text)).filter(Boolean);
  if (normalized.length <= 1) return 0;
  const counts = new Map();
  normalized.forEach((text) => counts.set(text, (counts.get(text) || 0) + 1));
  return Math.max(...counts.values()) / normalized.length;
};

class RiskScoringService {
  static riskLevel(score) {
    return riskLevel(score);
  }

  static computeRiskScore(events = []) {
    const total = events.reduce((sum, event) => sum + riskDeltaFor(event.eventType, event.scoreDelta), 0);
    const score = clamp(total);
    return {
      score: round(score),
      level: riskLevel(score),
      eventCount: events.length,
      signals: events.map((event) => ({
        eventType: event.eventType,
        scoreDelta: riskDeltaFor(event.eventType, event.scoreDelta),
        metadata: event.metadata || {},
        createdAt: event.createdAt,
      })),
    };
  }

  static async recordRiskEvent(db, event = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    if (!event.subjectType || !event.subjectId || !event.eventType) {
      throw new Error("subjectType, subjectId, and eventType are required");
    }

    const row = {
      subjectType: String(event.subjectType),
      subjectId: normalizeId(event.subjectId),
      eventType: String(event.eventType),
      scoreDelta: riskDeltaFor(event.eventType, event.scoreDelta),
      metadata: event.metadata || {},
      policyType: event.policyType || null,
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
    };
    const result = await db.collection("risk_events").insertOne(row);
    const profile = await RiskScoringService.buildRiskProfile(db, row.subjectType, row.subjectId);
    await RiskScoringService.updateSubjectRisk(db, row.subjectType, row.subjectId, profile);
    return { event: { ...row, _id: result.insertedId }, profile };
  }

  static async updateSubjectRisk(db, subjectType, subjectId, profile) {
    const collectionName = subjectType === "vendor" ? "vendors" : subjectType === "customer" || subjectType === "user" ? "users" : null;
    if (!collectionName) return;
    try {
      await db.collection(collectionName).updateOne(
        { _id: subjectId },
        {
          $set: {
            riskScore: profile.riskScore,
            riskLevel: profile.riskLevel,
            manualReviewRequired: profile.manualReviewRequired,
            riskUpdatedAt: profile.updatedAt,
          },
        },
      );
    } catch {
      // Some test doubles or legacy collections store ids as ObjectIds only. Risk profile is still authoritative.
    }
  }

  static async buildRiskProfile(db, subjectType, subjectId) {
    if (!db?.collection) throw new Error("Database connection is required");
    const query = { subjectType, subjectId: normalizeId(subjectId) };
    const events = await db.collection("risk_events").find(query).sort({ createdAt: -1 }).toArray();
    const computed = RiskScoringService.computeRiskScore(events);
    const profile = {
      ...query,
      riskScore: computed.score,
      riskLevel: computed.level,
      signalCount: computed.eventCount,
      topSignals: computed.signals.slice(0, 20),
      manualReviewRequired: computed.level === "high" || computed.level === "critical",
      updatedAt: new Date(),
    };
    await db.collection("risk_profiles").updateOne(
      query,
      { $set: profile, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    return profile;
  }

  static async getRiskProfile(db, subjectType, subjectId) {
    if (!db?.collection) throw new Error("Database connection is required");
    const query = { subjectType, subjectId: normalizeId(subjectId) };
    const profile = await db.collection("risk_profiles").findOne(query);
    if (profile) return profile;
    return RiskScoringService.buildRiskProfile(db, subjectType, subjectId);
  }

  static scoreReview({ review = {}, priorReviews = [], deliveredOrder = null, now = new Date() } = {}) {
    const flags = [];
    if (!deliveredOrder) flags.push({ type: "unverified_review", score: RISK_SIGNAL_DELTAS.unverified_review });
    const deliveredAt = deliveredOrder?.deliveredAt ? new Date(deliveredOrder.deliveredAt) : null;
    if (deliveredAt && new Date(now) - deliveredAt < 6 * 60 * 60 * 1000) {
      flags.push({ type: "suspiciously_fast_review", score: 15 });
    }
    const recentByUser = priorReviews.filter((item) => normalizeId(item.userId) === normalizeId(review.userId));
    if (recentByUser.length >= 5) flags.push({ type: "review_burst", score: RISK_SIGNAL_DELTAS.review_burst });
    const repeatRatio = repeatedTextRatio([review.comment || review.text, ...recentByUser.map((item) => item.comment || item.text)]);
    if (repeatRatio >= 0.5) flags.push({ type: "repetitive_review_text", score: RISK_SIGNAL_DELTAS.repetitive_review_text });
    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    return {
      riskScore: round(score),
      riskLevel: riskLevel(score),
      flags,
      moderationStatus: score >= 35 ? "pending_review" : "approved",
      verifiedPurchase: Boolean(deliveredOrder),
    };
  }

  static scoreReturnRequest({ returnDoc = {}, priorReturns = [], orders = [] } = {}) {
    const flags = [];
    const customerReturns = priorReturns.filter((item) => normalizeId(item.userId) === normalizeId(returnDoc.userId));
    const completedOrders = orders.filter((order) => normalizeId(order.userId) === normalizeId(returnDoc.userId));
    const returnRate = completedOrders.length ? customerReturns.length / completedOrders.length : customerReturns.length;

    if (customerReturns.length >= 3 || returnRate >= 0.5) {
      flags.push({ type: "excessive_return_rate", score: RISK_SIGNAL_DELTAS.excessive_return_rate });
    }
    if (Number(returnDoc.refundAmount || returnDoc.amount || 0) >= 10000) {
      flags.push({ type: "high_value_return", score: RISK_SIGNAL_DELTAS.high_value_return });
    }
    const reason = normalizeReason(returnDoc.reason || returnDoc.reasonCode);
    const repeatedReasonCount = customerReturns.filter((item) => normalizeReason(item.reason || item.reasonCode) === reason).length;
    if (["missing item", "item not as described", "wrong item"].includes(reason) && repeatedReasonCount >= 2) {
      flags.push({ type: "repeat_claim_pattern", score: 20 });
    }
    const failedCodOrders = completedOrders.filter((order) =>
      ["cod", "cash_on_delivery", "cash on delivery"].includes(normalizeReason(order.paymentMethod)) &&
      ["cancelled", "failed_delivery", "delivery_failed", "returned"].includes(normalizeReason(order.status || order.deliveryStatus)),
    );
    if (failedCodOrders.length >= 2) flags.push({ type: "cod_refusal", score: RISK_SIGNAL_DELTAS.cod_refusal });

    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    return {
      returnRiskScore: round(score),
      returnRiskLevel: riskLevel(score),
      autoReview: score >= 35,
      flags,
    };
  }

  static scoreProductContent({ product = {}, existingProducts = [], policies = [] } = {}) {
    const flags = [];
    const text = `${product.title || ""} ${product.description || ""}`.toLowerCase();
    const prohibitedWords = ["replica", "fake brand", "weapon", "drug", "adult", "counterfeit"];
    const matchedWord = prohibitedWords.find((word) => text.includes(word));
    if (matchedWord) flags.push({ type: "prohibited_product_keyword", word: matchedWord, score: RISK_SIGNAL_DELTAS.prohibited_product_keyword });

    const normalizedTitle = normalizeReason(product.title);
    const duplicate = existingProducts.find((item) =>
      normalizeId(item._id) !== normalizeId(product._id) &&
      normalizeReason(item.title) === normalizedTitle &&
      normalizeId(item.vendorId) === normalizeId(product.vendorId),
    );
    if (duplicate) flags.push({ type: "duplicate_listing", duplicateProductId: normalizeId(duplicate._id), score: RISK_SIGNAL_DELTAS.duplicate_listing });

    const regular = Number(product.originalPrice || product.compareAtPrice || 0);
    const price = Number(product.price || 0);
    if (regular > 0 && price > 0 && regular / price >= 5) {
      flags.push({ type: "misleading_pricing", score: 15 });
    }

    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    const policy = flags.find((flag) => flag.type === "prohibited_product_keyword")
      ? policies.find((item) => item.violationType === "prohibited_product") || null
      : null;
    return {
      riskScore: round(score),
      riskLevel: riskLevel(score),
      flags,
      policyAction: policy ? TrustPolicyService.buildPolicyAction(policy, { target: normalizeId(product._id) }) : null,
      moderationStatus: score >= 40 ? "auto_flagged" : score > 0 ? "needs_review" : "clean",
    };
  }

  static scorePayoutRequest({ vendor = {}, payout = {}, returns = [], disputes = [], riskProfile = {} } = {}) {
    const flags = [];
    if (["high", "critical"].includes(riskProfile.riskLevel)) {
      flags.push({ type: "vendor_under_investigation", score: 30 });
    }
    if (vendor.payoutChangedAt && new Date() - new Date(vendor.payoutChangedAt) < 7 * 24 * 60 * 60 * 1000) {
      flags.push({ type: "recent_payout_change", score: RISK_SIGNAL_DELTAS.payout_change });
    }
    const openDisputes = disputes.filter((item) => ["open", "under_admin_review", "escalated"].includes(normalizeReason(item.status)));
    if (openDisputes.length > 0) flags.push({ type: "unresolved_disputes", score: RISK_SIGNAL_DELTAS.high_dispute_rate });
    const recentReturns = returns.filter((item) => normalizeId(item.vendorId) === normalizeId(vendor._id || payout.vendorId));
    if (recentReturns.length >= 5) flags.push({ type: "high_recent_return_rate", score: 25 });

    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    return {
      payoutRiskScore: round(score),
      payoutRiskLevel: riskLevel(score),
      holdRecommended: score >= 35,
      flags,
    };
  }

  static scorePromoUse({ user = {}, voucherAttempts = [], orders = [], deviceAccounts = [], addressMatches = [] } = {}) {
    const flags = [];
    const recentAttempts = voucherAttempts.filter((attempt) => {
      const createdAt = attempt.createdAt ? new Date(attempt.createdAt) : new Date();
      return Date.now() - createdAt.getTime() <= 24 * 60 * 60 * 1000;
    });
    if (recentAttempts.length >= 8) {
      flags.push({ type: "voucher_testing", score: RISK_SIGNAL_DELTAS.voucher_testing });
    }
    if (deviceAccounts.length >= 3) {
      flags.push({ type: "duplicate_device_account", score: RISK_SIGNAL_DELTAS.duplicate_device_account });
    }
    const firstOrderDiscounts = orders.filter((order) =>
      Boolean(order.firstOrderDiscount || order.appliedPromotions?.some?.((promo) => promo.type === "first_order_discount")),
    );
    if (firstOrderDiscounts.length > 1 || addressMatches.length >= 3) {
      flags.push({ type: "first_order_discount_abuse", score: RISK_SIGNAL_DELTAS.first_order_discount_abuse });
    }
    const cancelledDiscounted = orders.filter((order) =>
      ["cancelled", "refunded"].includes(normalizeReason(order.status)) &&
      Number(order.discountAmount || order.totalDiscount || 0) > 0,
    );
    if (cancelledDiscounted.length >= 2) {
      flags.push({ type: "discount_cancel_pattern", score: 15 });
    }

    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    return {
      userId: normalizeId(user._id || user.id || user.userId),
      promoRiskScore: round(score),
      promoRiskLevel: riskLevel(score),
      cooldownRecommended: score >= 35,
      flags,
    };
  }

  static scoreAccountAbuse({ failedLogins = [], sessions = [], devices = [], now = new Date() } = {}) {
    const flags = [];
    const oneHourAgo = new Date(new Date(now).getTime() - 60 * 60 * 1000);
    const recentFailures = failedLogins.filter((item) => new Date(item.createdAt || item.timestamp || now) >= oneHourAgo);
    if (recentFailures.length >= 5) flags.push({ type: "failed_login_burst", score: RISK_SIGNAL_DELTAS.failed_login_burst });
    const riskySessions = sessions.filter((session) => session.suspicious || session.geoVelocityRisk || session.newDevice);
    if (riskySessions.length >= 2) flags.push({ type: "suspicious_device_login", score: RISK_SIGNAL_DELTAS.suspicious_device_login });
    if (devices.length >= 5) flags.push({ type: "duplicate_device_account", score: RISK_SIGNAL_DELTAS.duplicate_device_account });

    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    return {
      accountRiskScore: round(score),
      accountRiskLevel: riskLevel(score),
      stepUpVerificationRequired: score >= 35,
      flags,
    };
  }

  static scoreChatSafety({ messages = [], attachments = [] } = {}) {
    const abusiveWords = ["scam", "kill", "abuse", "fraudster"];
    const flags = [];
    const abusiveCount = messages.filter((message) => {
      const text = normalizeReason(message.body || message.text || message.message);
      return abusiveWords.some((word) => text.includes(word));
    }).length;
    if (abusiveCount >= 2) flags.push({ type: "abusive_language", score: RISK_SIGNAL_DELTAS.abusive_language });
    const riskyAttachments = attachments.filter((item) => item.flagged || Number(item.size || 0) > 20 * 1024 * 1024);
    if (riskyAttachments.length > 0) flags.push({ type: "attachment_abuse", score: RISK_SIGNAL_DELTAS.attachment_abuse });

    const score = clamp(flags.reduce((sum, flag) => sum + flag.score, 0));
    return {
      communicationRiskScore: round(score),
      communicationRiskLevel: riskLevel(score),
      muteRecommended: score >= 35,
      flags,
    };
  }
}

module.exports = RiskScoringService;
module.exports.RISK_SIGNAL_DELTAS = RISK_SIGNAL_DELTAS;
module.exports._test = {
  repeatedTextRatio,
};
