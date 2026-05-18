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

const REPORT_REASON_CONFIG = {
  counterfeit: { severity: "critical", queue: "content_moderation_queue" },
  prohibited_product: { severity: "critical", queue: "content_moderation_queue" },
  fake_review: { severity: "high", queue: "review_moderation_queue" },
  seller_fraud: { severity: "high", queue: "risky_vendors_queue" },
  customer_abuse: { severity: "medium", queue: "risky_customers_queue" },
  support_abuse: { severity: "medium", queue: "support_safety_queue" },
  delivery_issue: { severity: "medium", queue: "delivery_risk_queue" },
  payout_issue: { severity: "high", queue: "finance_risk_queue" },
  promo_abuse: { severity: "medium", queue: "promo_abuse_queue" },
};

const RESOURCE_QUEUE = {
  product: "content_moderation_queue",
  review: "review_moderation_queue",
  vendor: "risky_vendors_queue",
  customer: "risky_customers_queue",
  user: "risky_customers_queue",
  order: "risky_orders_queue",
  return: "returns_risk_queue",
  payout: "finance_risk_queue",
  support_ticket: "support_safety_queue",
  message: "support_safety_queue",
};

const DISPUTE_STATES = [
  "opened",
  "awaiting_customer_evidence",
  "awaiting_vendor_response",
  "under_admin_review",
  "resolved_customer",
  "resolved_vendor",
  "partial_resolution",
  "escalated",
  "closed",
];

const DISPUTE_TRANSITIONS = {
  opened: ["awaiting_customer_evidence", "awaiting_vendor_response", "under_admin_review", "escalated", "closed"],
  awaiting_customer_evidence: ["under_admin_review", "awaiting_vendor_response", "escalated", "closed"],
  awaiting_vendor_response: ["under_admin_review", "awaiting_customer_evidence", "escalated", "closed"],
  under_admin_review: ["resolved_customer", "resolved_vendor", "partial_resolution", "escalated", "closed"],
  escalated: ["under_admin_review", "resolved_customer", "resolved_vendor", "partial_resolution", "closed"],
  resolved_customer: ["closed"],
  resolved_vendor: ["closed"],
  partial_resolution: ["closed"],
  closed: [],
};

const normalizeReporter = (reporter = {}) => ({
  id: normalizeId(reporter._id || reporter.id || reporter.userId || reporter.uid),
  role: reporter.role || "guest",
  email: reporter.email || null,
});

const severityRank = (severity = "low") => ({ low: 1, medium: 2, high: 3, critical: 4 }[severity] || 1);

class TrustCaseService {
  static routeReportQueue(resourceType, reasonCode) {
    return REPORT_REASON_CONFIG[reasonCode]?.queue || RESOURCE_QUEUE[resourceType] || "reports_queue";
  }

  static normalizeEvidence(evidence = [], base = {}) {
    const rows = Array.isArray(evidence) ? evidence : [evidence].filter(Boolean);
    return rows.map((item) => ({
      evidenceType: item.evidenceType || item.type || "note",
      url: item.url || item.fileUrl || null,
      text: item.text || item.note || item.description || "",
      metadata: item.metadata || {},
      uploadedBy: base.actor || item.uploadedBy || null,
      createdAt: base.createdAt || new Date(),
    }));
  }

  static async submitReport(db, payload = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const resourceType = String(payload.resourceType || "").trim();
    const resourceId = normalizeId(payload.resourceId);
    const reasonCode = String(payload.reasonCode || payload.reason || "").trim();
    if (!resourceType || !resourceId || !reasonCode) {
      throw new Error("resourceType, resourceId, and reasonCode are required");
    }

    const now = new Date();
    const config = REPORT_REASON_CONFIG[reasonCode] || {};
    const report = {
      resourceType,
      resourceId,
      reasonCode,
      details: payload.details || payload.description || "",
      severity: payload.severity || config.severity || "medium",
      queue: payload.queue || TrustCaseService.routeReportQueue(resourceType, reasonCode),
      status: "open",
      priority: severityRank(payload.severity || config.severity || "medium"),
      reporter: normalizeReporter(payload.reporter),
      linkedOrderId: payload.linkedOrderId ? normalizeId(payload.linkedOrderId) : null,
      metadata: payload.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db.collection("reports").insertOne(report);
    const reportId = normalizeId(inserted.insertedId);
    const evidence = TrustCaseService.normalizeEvidence(payload.evidence || [], {
      actor: report.reporter,
      createdAt: now,
    }).map((item) => ({
      ...item,
      reportId,
      caseType: "report",
      caseId: reportId,
    }));
    if (evidence.length) await db.collection("report_evidence").insertMany?.(evidence);
    if (evidence.length && !db.collection("report_evidence").insertMany) {
      await Promise.all(evidence.map((item) => db.collection("report_evidence").insertOne(item)));
    }
    await db.collection("report_actions").insertOne({
      reportId,
      action: "report.opened",
      actor: report.reporter,
      note: report.details,
      createdAt: now,
    });

    return { ...report, _id: inserted.insertedId, evidence };
  }

  static async recordReportAction(db, reportId, action = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const now = new Date();
    const row = {
      reportId: normalizeId(reportId),
      action: action.action || "report.reviewed",
      actor: action.actor || { role: "system" },
      note: action.note || "",
      metadata: action.metadata || {},
      createdAt: now,
    };
    await db.collection("report_actions").insertOne(row);
    const statusUpdate = action.status ? { status: action.status } : {};
    await db.collection("reports").updateOne(idQuery(reportId), {
      $set: {
        ...statusUpdate,
        lastAction: row.action,
        updatedAt: now,
      },
    });
    return row;
  }

  static async createDispute(db, payload = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    const type = String(payload.type || "").trim();
    if (!type) throw new Error("Dispute type is required");
    const now = new Date();
    const openedBy = normalizeReporter(payload.openedBy || payload.actor);
    const dispute = {
      type,
      status: "opened",
      priority: Number(payload.priority || 2),
      reason: payload.reason || "",
      summary: payload.summary || "",
      linkedOrderId: payload.linkedOrderId ? normalizeId(payload.linkedOrderId) : null,
      linkedProductId: payload.linkedProductId ? normalizeId(payload.linkedProductId) : null,
      linkedVendorId: payload.linkedVendorId ? normalizeId(payload.linkedVendorId) : null,
      linkedCustomerId: payload.linkedCustomerId ? normalizeId(payload.linkedCustomerId) : null,
      amount: Number(payload.amount || 0),
      openedBy,
      timeline: [
        {
          state: "opened",
          actor: openedBy,
          note: payload.reason || "Dispute opened",
          createdAt: now,
        },
      ],
      metadata: payload.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db.collection("trust_disputes").insertOne(dispute);
    const disputeId = normalizeId(inserted.insertedId);
    await db.collection("dispute_events").insertOne({
      disputeId,
      eventType: "dispute.opened",
      actor: openedBy,
      note: payload.reason || "",
      createdAt: now,
    });
    const evidence = await TrustCaseService.addEvidence(db, {
      caseType: "dispute",
      caseId: disputeId,
      evidence: payload.evidence || [],
      actor: openedBy,
    });
    return { ...dispute, _id: inserted.insertedId, evidence };
  }

  static async transitionDispute(db, disputeId, targetState, context = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    if (!DISPUTE_STATES.includes(targetState)) throw new Error("Unsupported dispute state");
    const dispute = await db.collection("trust_disputes").findOne(idQuery(disputeId));
    if (!dispute) throw new Error("Dispute not found");
    const current = dispute.status || "opened";
    if (!DISPUTE_TRANSITIONS[current]?.includes(targetState)) {
      throw new Error(`Cannot move dispute from ${current} to ${targetState}`);
    }
    const now = new Date();
    const event = {
      disputeId: normalizeId(disputeId),
      eventType: "dispute.transitioned",
      fromState: current,
      toState: targetState,
      actor: context.actor || { role: "system" },
      note: context.note || "",
      metadata: context.metadata || {},
      createdAt: now,
    };
    await db.collection("dispute_events").insertOne(event);
    await db.collection("trust_disputes").updateOne(idQuery(disputeId), {
      $set: {
        status: targetState,
        resolution: context.resolution || dispute.resolution || null,
        updatedAt: now,
      },
      $push: {
        timeline: {
          state: targetState,
          actor: event.actor,
          note: event.note,
          createdAt: now,
        },
      },
    });
    return {
      ...dispute,
      status: targetState,
      updatedAt: now,
      event,
    };
  }

  static async addEvidence(db, { caseType, caseId, evidence = [], actor = null } = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    if (!caseType || !caseId) throw new Error("caseType and caseId are required");
    const rows = TrustCaseService.normalizeEvidence(evidence, { actor }).map((item) => ({
      ...item,
      caseType,
      caseId: normalizeId(caseId),
    }));
    if (!rows.length) return [];
    if (db.collection("case_evidence").insertMany) {
      await db.collection("case_evidence").insertMany(rows);
    } else {
      await Promise.all(rows.map((item) => db.collection("case_evidence").insertOne(item)));
    }
    return rows;
  }

  static async getQueueSummary(db) {
    if (!db?.collection) throw new Error("Database connection is required");
    const reports = await db.collection("reports").find({ status: { $ne: "closed" } }).toArray();
    const disputes = await db.collection("trust_disputes").find({ status: { $ne: "closed" } }).toArray();
    const riskProfiles = await db.collection("risk_profiles").find({ manualReviewRequired: true }).toArray();
    const queueMap = new Map();
    const add = (queue, item) => {
      const current = queueMap.get(queue) || { queue, total: 0, highPriority: 0, items: [] };
      current.total += 1;
      if (Number(item.priority || 0) >= 3 || ["high", "critical"].includes(item.riskLevel || item.severity)) {
        current.highPriority += 1;
      }
      current.items.push(item);
      queueMap.set(queue, current);
    };
    reports.forEach((report) => add(report.queue || "reports_queue", report));
    disputes.forEach((dispute) => add(`${dispute.type || "general"}_disputes_queue`, dispute));
    riskProfiles.forEach((profile) => add(`${profile.subjectType || "subject"}_risk_queue`, profile));
    return [...queueMap.values()].sort((a, b) => b.highPriority - a.highPriority || b.total - a.total);
  }
}

module.exports = TrustCaseService;
module.exports.DISPUTE_STATES = DISPUTE_STATES;
module.exports.DISPUTE_TRANSITIONS = DISPUTE_TRANSITIONS;
module.exports.REPORT_REASON_CONFIG = REPORT_REASON_CONFIG;
