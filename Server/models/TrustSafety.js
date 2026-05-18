class TrustSafety {
  constructor(db) {
    this.collection = db.collection("trust_cases");
    this.policies = db.collection("trust_policies");
    this.verifications = db.collection("identity_verifications");
    this.riskEvents = db.collection("risk_events");
    this.riskProfiles = db.collection("risk_profiles");
    this.reports = db.collection("reports");
    this.reportEvidence = db.collection("report_evidence");
    this.reportActions = db.collection("report_actions");
    this.disputes = db.collection("trust_disputes");
    this.disputeEvents = db.collection("dispute_events");
    this.caseEvidence = db.collection("case_evidence");
    this.enforcements = db.collection("enforcements");
    this.appeals = db.collection("appeals");
    this.appealEvents = db.collection("appeal_events");
    this.reviewFlags = db.collection("review_flags");
    this.returnFlags = db.collection("return_flags");
    this.promoAbuseFlags = db.collection("promo_abuse_flags");
    this.payoutHolds = db.collection("payout_holds");
    this.queueAssignments = db.collection("trust_queue_assignments");
    this.auditEvents = db.collection("trust_audit_events");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex?.({ caseType: 1, status: 1, createdAt: -1 });
      await this.policies.createIndex?.({ violationType: 1 }, { unique: true });
      await this.verifications.createIndex?.({ subjectType: 1, subjectId: 1 }, { unique: true });
      await this.riskEvents.createIndex?.({ subjectType: 1, subjectId: 1, createdAt: -1 });
      await this.riskEvents.createIndex?.({ eventType: 1, createdAt: -1 });
      await this.riskProfiles.createIndex?.({ subjectType: 1, subjectId: 1 }, { unique: true });
      await this.reports.createIndex?.({ status: 1, queue: 1, createdAt: -1 });
      await this.reports.createIndex?.({ resourceType: 1, resourceId: 1 });
      await this.disputes.createIndex?.({ status: 1, priority: -1, createdAt: -1 });
      await this.disputes.createIndex?.({ linkedOrderId: 1 });
      await this.enforcements.createIndex?.({ targetType: 1, targetId: 1, status: 1 });
      await this.appeals.createIndex?.({ enforcementId: 1, status: 1 });
      await this.reviewFlags.createIndex?.({ reviewId: 1, status: 1 });
      await this.returnFlags.createIndex?.({ returnId: 1, riskLevel: 1 });
      await this.promoAbuseFlags.createIndex?.({ userId: 1, deviceFingerprint: 1, createdAt: -1 });
      await this.payoutHolds.createIndex?.({ vendorId: 1, status: 1, createdAt: -1 });
      await this.queueAssignments.createIndex?.({ queue: 1, status: 1, assigneeId: 1 });
      await this.auditEvents.createIndex?.({ targetType: 1, targetId: 1, createdAt: -1 });
    } catch (error) {
      console.error("Error creating TrustSafety indexes:", error);
    }
  }

  async createVerification(subjectType, subjectId, data = {}) {
    const now = new Date();
    const doc = {
      subjectType,
      subjectId: subjectId?.toString ? subjectId.toString() : String(subjectId || ""),
      verificationStatus: data.verificationStatus || data.status || "pending",
      isEmailVerified: Boolean(data.isEmailVerified),
      isPhoneVerified: Boolean(data.isPhoneVerified),
      manualReviewRequired: Boolean(data.manualReviewRequired),
      checks: data.checks || {},
      documents: data.documents || [],
      riskScore: Number(data.riskScore || 0),
      updatedAt: now,
    };
    await this.verifications.updateOne(
      { subjectType: doc.subjectType, subjectId: doc.subjectId },
      { $set: doc, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return this.verifications.findOne({ subjectType: doc.subjectType, subjectId: doc.subjectId });
  }

  async addAuditEvent(event = {}) {
    const doc = {
      ...event,
      actor: event.actor || { role: "system" },
      createdAt: new Date(),
    };
    const result = await this.auditEvents.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }
}

module.exports = TrustSafety;
