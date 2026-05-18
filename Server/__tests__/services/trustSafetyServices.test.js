const { ObjectId } = require("mongodb");
const TrustPolicyService = require("../../services/trustPolicyService");
const RiskScoringService = require("../../services/riskScoringService");
const TrustCaseService = require("../../services/trustCaseService");
const EnforcementService = require("../../services/enforcementService");

const stringify = (value) => (value instanceof ObjectId ? value.toString() : String(value || ""));

const getByPath = (doc, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.map(stringify).includes(stringify(actual));
    if (expected.$nin) return !expected.$nin.map(stringify).includes(stringify(actual));
    if (expected.$ne !== undefined) return stringify(actual) !== stringify(expected.$ne);
    if (expected.$gte !== undefined && actual < expected.$gte) return false;
    if (expected.$lte !== undefined && actual > expected.$lte) return false;
    return true;
  }
  if (expected instanceof ObjectId) return stringify(actual) === stringify(expected);
  return stringify(actual) === stringify(expected);
};

const matchesQuery = (doc, query = {}) => {
  if (query.$or && !query.$or.some((branch) => matchesQuery(doc, branch))) return false;
  if (query.$and && !query.$and.every((branch) => matchesQuery(doc, branch))) return false;
  return Object.entries(query)
    .filter(([key]) => key !== "$or" && key !== "$and")
    .every(([key, expected]) => matchesValue(getByPath(doc, key), expected));
};

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sort = {}) {
    const [[key, direction] = []] = Object.entries(sort);
    if (key) {
      this.docs.sort((a, b) => {
        const left = getByPath(a, key);
        const right = getByPath(b, key);
        if (left === right) return 0;
        return left > right ? direction : -direction;
      });
    }
    return this;
  }

  limit(limit) {
    this.docs = this.docs.slice(0, limit);
    return this;
  }

  async toArray() {
    return this.docs;
  }
}

class FakeCollection {
  constructor(docs = []) {
    this.docs = docs;
  }

  find(query = {}) {
    return new FakeCursor(this.docs.filter((doc) => matchesQuery(doc, query)));
  }

  async findOne(query = {}) {
    return this.docs.find((doc) => matchesQuery(doc, query)) || null;
  }

  async countDocuments(query = {}) {
    return this.docs.filter((doc) => matchesQuery(doc, query)).length;
  }

  async insertOne(doc) {
    const saved = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(saved);
    return { insertedId: saved._id };
  }

  async insertMany(docs = []) {
    docs.forEach((doc) => {
      this.docs.push({ ...doc, _id: doc._id || new ObjectId() });
    });
    return { insertedCount: docs.length };
  }

  async updateOne(query, update, options = {}) {
    let doc = this.docs.find((item) => matchesQuery(item, query));
    if (!doc && options.upsert) {
      doc = { _id: query._id || new ObjectId(), ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      this.docs.push(doc);
    }
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(doc, update.$set || {});
    Object.entries(update.$inc || {}).forEach(([key, value]) => {
      doc[key] = Number(doc[key] || 0) + Number(value || 0);
    });
    Object.entries(update.$push || {}).forEach(([key, value]) => {
      doc[key] = Array.isArray(doc[key]) ? doc[key] : [];
      doc[key].push(value);
    });
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

const buildDb = (collections = {}) => {
  const registry = new Map(
    Object.entries(collections).map(([name, docs]) => [
      name,
      docs instanceof FakeCollection ? docs : new FakeCollection(docs),
    ]),
  );
  return {
    registry,
    collection: (name) => {
      if (!registry.has(name)) registry.set(name, new FakeCollection([]));
      return registry.get(name);
    },
  };
};

describe("TrustPolicyService", () => {
  test("returns default policies and evaluates a policy violation", async () => {
    const db = buildDb();
    const policies = await TrustPolicyService.listPolicies(db);

    expect(policies.map((policy) => policy.violationType)).toEqual(
      expect.arrayContaining(["prohibited_product", "fake_review", "payout_risk"]),
    );

    const result = await TrustPolicyService.evaluatePolicyViolation(db, {
      violationType: "prohibited_product",
      target: { type: "product", id: "p-1" },
      evidence: { riskScore: 80, flags: [{ type: "prohibited_product_keyword" }] },
    });

    expect(result.matched).toBe(true);
    expect(result.policyAction).toEqual(expect.objectContaining({
      automaticAction: "listing_unpublish",
      manualReviewRequired: true,
    }));
  });

  test("upserts a custom policy override", async () => {
    const db = buildDb();
    const policy = await TrustPolicyService.upsertPolicy(db, {
      violationType: "promo_abuse",
      severity: "high",
      automaticAction: "promotion_cooldown",
    }, { userId: "admin-1" });

    expect(policy).toEqual(expect.objectContaining({
      violationType: "promo_abuse",
      severity: "high",
      updatedBy: { userId: "admin-1" },
    }));
  });
});

describe("RiskScoringService", () => {
  test("records risk events and rebuilds a subject profile", async () => {
    const db = buildDb();

    await RiskScoringService.recordRiskEvent(db, {
      subjectType: "customer",
      subjectId: "u-1",
      eventType: "duplicate_device_account",
    });
    const result = await RiskScoringService.recordRiskEvent(db, {
      subjectType: "customer",
      subjectId: "u-1",
      eventType: "cod_refusal",
    });

    expect(db.collection("risk_events").docs).toHaveLength(2);
    expect(result.profile).toEqual(expect.objectContaining({
      subjectType: "customer",
      subjectId: "u-1",
      riskScore: 50,
      riskLevel: "medium",
    }));
  });

  test("flags risky returns, reviews, promotions, and payouts", () => {
    const returnRisk = RiskScoringService.scoreReturnRequest({
      returnDoc: { userId: "u-1", reason: "missing item", refundAmount: 12000 },
      priorReturns: [
        { userId: "u-1", reason: "missing item" },
        { userId: "u-1", reason: "missing item" },
        { userId: "u-1", reason: "wrong item" },
      ],
      orders: [
        { userId: "u-1", paymentMethod: "cod", status: "returned" },
        { userId: "u-1", paymentMethod: "cod", status: "failed_delivery" },
        { userId: "u-1", paymentMethod: "card", status: "delivered" },
      ],
    });
    expect(returnRisk.autoReview).toBe(true);
    expect(returnRisk.flags.map((flag) => flag.type)).toEqual(expect.arrayContaining(["excessive_return_rate", "cod_refusal"]));

    const reviewRisk = RiskScoringService.scoreReview({
      review: { userId: "u-1", comment: "good" },
      priorReviews: Array.from({ length: 5 }, () => ({ userId: "u-1", comment: "good" })),
    });
    expect(reviewRisk.moderationStatus).toBe("pending_review");

    const promoRisk = RiskScoringService.scorePromoUse({
      user: { _id: "u-1" },
      voucherAttempts: Array.from({ length: 8 }, () => ({ createdAt: new Date() })),
      deviceAccounts: ["u-1", "u-2", "u-3"],
    });
    expect(promoRisk.cooldownRecommended).toBe(true);

    const payoutRisk = RiskScoringService.scorePayoutRequest({
      vendor: { _id: "v-1", payoutChangedAt: new Date() },
      disputes: [{ status: "under_admin_review" }],
      riskProfile: { riskLevel: "high" },
    });
    expect(payoutRisk.holdRecommended).toBe(true);
  });
});

describe("TrustCaseService and EnforcementService", () => {
  test("creates reports with evidence and queue routing", async () => {
    const db = buildDb();
    const report = await TrustCaseService.submitReport(db, {
      resourceType: "product",
      resourceId: "p-1",
      reasonCode: "counterfeit",
      details: "Looks fake",
      reporter: { userId: "u-1", role: "customer" },
      evidence: [{ type: "image", url: "https://example.com/proof.jpg" }],
    });

    expect(report.queue).toBe("content_moderation_queue");
    expect(db.collection("reports").docs).toHaveLength(1);
    expect(db.collection("report_evidence").docs).toHaveLength(1);
    expect(db.collection("report_actions").docs[0].action).toBe("report.opened");
  });

  test("creates disputes and enforces valid state transitions", async () => {
    const db = buildDb();
    const dispute = await TrustCaseService.createDispute(db, {
      type: "order",
      linkedOrderId: "o-1",
      reason: "Missing item",
      openedBy: { userId: "u-1", role: "customer" },
    });

    const transitioned = await TrustCaseService.transitionDispute(db, dispute._id, "awaiting_vendor_response", {
      actor: { userId: "admin-1", role: "admin" },
      note: "Need vendor proof",
    });

    expect(transitioned.status).toBe("awaiting_vendor_response");
    await expect(
      TrustCaseService.transitionDispute(db, dispute._id, "resolved_customer", {
        actor: { userId: "admin-1", role: "admin" },
      }),
    ).rejects.toThrow("Cannot move dispute");
  });

  test("creates payout holds and appeal decisions with auditability", async () => {
    const db = buildDb({
      vendors: [{ _id: "v-1", status: "approved" }],
    });

    const enforcement = await EnforcementService.createEnforcement(db, {
      action: "payout_hold",
      targetType: "vendor",
      targetId: "v-1",
      reason: "High dispute rate",
      policyViolated: "payout_risk",
      actor: { userId: "admin-1", role: "admin" },
    });

    expect(db.collection("enforcements").docs).toHaveLength(1);
    expect(db.collection("payout_holds").docs[0]).toEqual(expect.objectContaining({ vendorId: "v-1", status: "active" }));
    expect(db.collection("audit_logs").docs[0].action).toBe("trust.enforcement.payout_hold");

    const appeal = await EnforcementService.submitAppeal(db, {
      enforcementId: enforcement._id,
      appellant: { userId: "vendor-1", role: "vendor" },
      explanation: "We have resolved the dispute",
    });
    const reviewed = await EnforcementService.reviewAppeal(db, appeal._id, {
      decision: "reverse",
      actor: { userId: "admin-2", role: "admin" },
      note: "Evidence accepted",
    });

    expect(reviewed.status).toBe("reversed");
    expect(db.collection("enforcements").docs[0].status).toBe("reversed");
    expect(db.collection("appeal_events").docs.map((event) => event.eventType)).toEqual([
      "appeal.submitted",
      "appeal.reverse",
    ]);
  });
});
