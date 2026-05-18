const { ObjectId } = require("mongodb");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectId = (value) => {
  const normalized = normalizeId(value);
  return ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
};
const idQuery = (id) => {
  const objectId = toObjectId(id);
  return objectId ? { _id: objectId } : { _id: normalizeId(id) };
};

const ENFORCEMENT_ACTIONS = [
  "warn",
  "temporary_hold",
  "listing_unpublish",
  "review_remove",
  "return_hold",
  "payout_hold",
  "account_suspension",
  "permanent_ban",
  "shadow_restriction",
];

const APPEAL_DECISIONS = ["uphold", "modify", "reverse"];

const normalizeActor = (actor = {}) => ({
  userId: normalizeId(actor._id || actor.id || actor.userId || actor.uid || "system"),
  role: actor.role || "system",
  email: actor.email || null,
});

class EnforcementService {
  static validateAction(action) {
    if (!ENFORCEMENT_ACTIONS.includes(action)) {
      throw new Error("Unsupported enforcement action");
    }
  }

  static async createEnforcement(db, payload = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    EnforcementService.validateAction(payload.action);
    const targetType = String(payload.targetType || "").trim();
    const targetId = normalizeId(payload.targetId);
    if (!targetType || !targetId) throw new Error("targetType and targetId are required");

    const now = new Date();
    const enforcement = {
      action: payload.action,
      status: payload.status || "active",
      targetType,
      targetId,
      reason: payload.reason || "",
      policyViolated: payload.policyViolated || payload.violationType || null,
      linkedEvidenceIds: (payload.linkedEvidenceIds || payload.evidenceIds || []).map(normalizeId),
      appealAllowed: payload.appealAllowed !== false,
      startAt: payload.startAt ? new Date(payload.startAt) : now,
      endAt: payload.endAt ? new Date(payload.endAt) : null,
      actor: normalizeActor(payload.actor),
      metadata: payload.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db.collection("enforcements").insertOne(enforcement);
    const enforcementId = normalizeId(inserted.insertedId);
    await EnforcementService.applyTargetSideEffect(db, enforcement, enforcementId);
    await EnforcementService.writeAudit(db, {
      action: `trust.enforcement.${enforcement.action}`,
      actor: enforcement.actor,
      target: { type: targetType, id: targetId },
      changes: { status: enforcement.status, policyViolated: enforcement.policyViolated },
      metadata: { enforcementId, reason: enforcement.reason },
    });
    return { ...enforcement, _id: inserted.insertedId };
  }

  static async applyTargetSideEffect(db, enforcement, enforcementId) {
    const now = new Date();
    if (enforcement.action === "payout_hold") {
      await db.collection("payout_holds").insertOne({
        enforcementId,
        vendorId: enforcement.targetType === "vendor" ? enforcement.targetId : enforcement.metadata.vendorId || null,
        targetType: enforcement.targetType,
        targetId: enforcement.targetId,
        reason: enforcement.reason,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    const collectionByTarget = {
      vendor: "vendors",
      customer: "users",
      user: "users",
      product: "products",
      review: "reviews",
      return: "returns",
    };
    const collectionName = collectionByTarget[enforcement.targetType];
    if (!collectionName) return;
    const update = {
      trustSafetyStatus: enforcement.action,
      trustSafetyUpdatedAt: now,
    };
    if (enforcement.action === "account_suspension") update.status = "suspended";
    if (enforcement.action === "permanent_ban") update.status = "banned";
    if (enforcement.action === "listing_unpublish") update.status = "disabled";
    if (enforcement.action === "review_remove") update.status = "removed";
    if (enforcement.action === "return_hold") update.status = "under_review";

    try {
      await db.collection(collectionName).updateOne({ _id: enforcement.targetId }, { $set: update });
    } catch {
      // Trust enforcement remains recorded even if a legacy target collection uses ObjectId-only keys.
    }
  }

  static async submitAppeal(db, payload = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const enforcementId = normalizeId(payload.enforcementId);
    if (!enforcementId) throw new Error("enforcementId is required");
    const enforcement = await db.collection("enforcements").findOne(idQuery(enforcementId));
    if (!enforcement) throw new Error("Enforcement not found");
    if (enforcement.appealAllowed === false) throw new Error("Appeal is not allowed for this enforcement");

    const now = new Date();
    const appeal = {
      enforcementId,
      status: "submitted",
      appellant: normalizeActor(payload.appellant || payload.actor),
      explanation: payload.explanation || "",
      evidence: payload.evidence || [],
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db.collection("appeals").insertOne(appeal);
    const appealId = normalizeId(inserted.insertedId);
    await db.collection("appeal_events").insertOne({
      appealId,
      enforcementId,
      eventType: "appeal.submitted",
      actor: appeal.appellant,
      note: appeal.explanation,
      createdAt: now,
    });
    await db.collection("enforcements").updateOne(idQuery(enforcementId), {
      $set: { status: "appealed", updatedAt: now },
    });
    return { ...appeal, _id: inserted.insertedId };
  }

  static async reviewAppeal(db, appealId, payload = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    if (!APPEAL_DECISIONS.includes(payload.decision)) throw new Error("Unsupported appeal decision");
    const appeal = await db.collection("appeals").findOne(idQuery(appealId));
    if (!appeal) throw new Error("Appeal not found");

    const now = new Date();
    const actor = normalizeActor(payload.actor);
    const status = payload.decision === "reverse" ? "reversed" : payload.decision === "modify" ? "modified" : "upheld";
    await db.collection("appeals").updateOne(idQuery(appealId), {
      $set: {
        status,
        decision: payload.decision,
        decisionNote: payload.note || "",
        reviewedBy: actor,
        reviewedAt: now,
        updatedAt: now,
      },
    });
    await db.collection("appeal_events").insertOne({
      appealId: normalizeId(appealId),
      enforcementId: appeal.enforcementId,
      eventType: `appeal.${payload.decision}`,
      actor,
      note: payload.note || "",
      createdAt: now,
    });
    const enforcementStatus = payload.decision === "reverse" ? "reversed" : payload.decision === "modify" ? "modified" : "active";
    await db.collection("enforcements").updateOne(idQuery(appeal.enforcementId), {
      $set: {
        status: enforcementStatus,
        appealDecision: payload.decision,
        updatedAt: now,
      },
    });
    await EnforcementService.writeAudit(db, {
      action: `trust.appeal.${payload.decision}`,
      actor,
      target: { type: "enforcement", id: appeal.enforcementId },
      changes: { appealId: normalizeId(appealId), status: enforcementStatus },
      metadata: { note: payload.note || "" },
    });
    return {
      ...appeal,
      status,
      decision: payload.decision,
      reviewedBy: actor,
      reviewedAt: now,
    };
  }

  static async writeAudit(db, log = {}) {
    const row = {
      ...log,
      createdAt: new Date(),
    };
    await db.collection("audit_logs").insertOne(row);
    await db.collection("trust_audit_events").insertOne({
      action: log.action,
      actor: log.actor,
      targetType: log.target?.type,
      targetId: log.target?.id,
      changes: log.changes || {},
      metadata: log.metadata || {},
      createdAt: row.createdAt,
    });
    return row;
  }
}

module.exports = EnforcementService;
module.exports.ENFORCEMENT_ACTIONS = ENFORCEMENT_ACTIONS;
module.exports.APPEAL_DECISIONS = APPEAL_DECISIONS;
