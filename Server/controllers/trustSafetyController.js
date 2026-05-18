const TrustPolicyService = require("../services/trustPolicyService");
const RiskScoringService = require("../services/riskScoringService");
const TrustCaseService = require("../services/trustCaseService");
const EnforcementService = require("../services/enforcementService");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const getDb = (req) => req.app.locals.db || req.app.locals.models?.TrustSafety?.policies?.db;

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || req.dbUser?._id || "system"),
  role: req.user?.role || req.dbUser?.role || "system",
  email: req.user?.email || req.dbUser?.email || null,
});

const getReporter = (req) => ({
  ...getActor(req),
  id: normalizeId(req.user?._id || req.user?.uid || req.body.reporterId),
});

const jsonError = (res, error, fallback = "Request failed") =>
  res.status(error.statusCode || 400).json({ success: false, error: error.message || fallback });

const parseLimit = (value, fallback = 25) => Math.min(Math.max(Number(value || fallback), 1), 100);

exports.getTrustPolicies = async (req, res) => {
  try {
    const policies = await TrustPolicyService.listPolicies(getDb(req));
    res.json({ success: true, data: policies });
  } catch (error) {
    jsonError(res, error, "Failed to load trust policies");
  }
};

exports.upsertTrustPolicy = async (req, res) => {
  try {
    const policy = await TrustPolicyService.upsertPolicy(
      getDb(req),
      { ...req.body, violationType: req.params.violationType || req.body.violationType },
      getActor(req),
    );
    res.json({ success: true, data: policy });
  } catch (error) {
    jsonError(res, error, "Failed to save trust policy");
  }
};

exports.evaluatePolicyViolation = async (req, res) => {
  try {
    const result = await TrustPolicyService.evaluatePolicyViolation(getDb(req), req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to evaluate trust policy");
  }
};

exports.updateVerification = async (req, res) => {
  try {
    const subjectType = req.params.subjectType || req.body.subjectType;
    const subjectId = req.params.subjectId || req.body.subjectId;
    if (!subjectType || !subjectId) throw new Error("subjectType and subjectId are required");
    const model = req.app.locals.models?.TrustSafety;
    if (!model?.createVerification) throw new Error("TrustSafety model is not available");
    const verification = await model.createVerification(subjectType, subjectId, {
      ...req.body,
      updatedBy: getActor(req),
    });
    res.json({ success: true, data: verification });
  } catch (error) {
    jsonError(res, error, "Failed to update verification");
  }
};

exports.submitReport = async (req, res) => {
  try {
    const report = await TrustCaseService.submitReport(getDb(req), {
      ...req.body,
      reporter: req.user ? getReporter(req) : req.body.reporter || { role: "guest" },
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    jsonError(res, error, "Failed to submit report");
  }
};

exports.recordReportAction = async (req, res) => {
  try {
    const action = await TrustCaseService.recordReportAction(getDb(req), req.params.reportId, {
      ...req.body,
      actor: getActor(req),
    });
    res.json({ success: true, data: action });
  } catch (error) {
    jsonError(res, error, "Failed to record report action");
  }
};

exports.recordRiskEvent = async (req, res) => {
  try {
    const result = await RiskScoringService.recordRiskEvent(getDb(req), {
      ...req.body,
      actor: getActor(req),
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to record risk event");
  }
};

exports.getRiskProfile = async (req, res) => {
  try {
    const profile = await RiskScoringService.getRiskProfile(getDb(req), req.params.subjectType, req.params.subjectId);
    res.json({ success: true, data: profile });
  } catch (error) {
    jsonError(res, error, "Failed to load risk profile");
  }
};

exports.getMyRiskProfile = async (req, res) => {
  try {
    const subjectId = normalizeId(req.user?._id || req.user?.uid);
    const profile = await RiskScoringService.getRiskProfile(getDb(req), req.user?.role === "vendor" ? "vendor" : "customer", subjectId);
    res.json({ success: true, data: profile });
  } catch (error) {
    jsonError(res, error, "Failed to load risk profile");
  }
};

exports.getTrustQueues = async (req, res) => {
  try {
    const queues = await TrustCaseService.getQueueSummary(getDb(req));
    res.json({ success: true, data: queues });
  } catch (error) {
    jsonError(res, error, "Failed to load trust queues");
  }
};

exports.createTrustDispute = async (req, res) => {
  try {
    const dispute = await TrustCaseService.createDispute(getDb(req), {
      ...req.body,
      openedBy: req.body.openedBy || getActor(req),
    });
    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    jsonError(res, error, "Failed to create trust dispute");
  }
};

exports.transitionTrustDispute = async (req, res) => {
  try {
    const dispute = await TrustCaseService.transitionDispute(
      getDb(req),
      req.params.disputeId,
      req.body.status || req.body.targetState,
      {
        actor: getActor(req),
        note: req.body.note,
        metadata: req.body.metadata,
        resolution: req.body.resolution,
      },
    );
    res.json({ success: true, data: dispute });
  } catch (error) {
    jsonError(res, error, "Failed to transition trust dispute");
  }
};

exports.addTrustEvidence = async (req, res) => {
  try {
    const evidence = await TrustCaseService.addEvidence(getDb(req), {
      ...req.body,
      caseType: req.params.caseType || req.body.caseType,
      caseId: req.params.caseId || req.body.caseId,
      evidence: req.body.evidence || req.body,
      actor: getActor(req),
    });
    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    jsonError(res, error, "Failed to add evidence");
  }
};

exports.createEnforcement = async (req, res) => {
  try {
    const enforcement = await EnforcementService.createEnforcement(getDb(req), {
      ...req.body,
      actor: getActor(req),
    });
    res.status(201).json({ success: true, data: enforcement });
  } catch (error) {
    jsonError(res, error, "Failed to create enforcement");
  }
};

exports.submitAppeal = async (req, res) => {
  try {
    const appeal = await EnforcementService.submitAppeal(getDb(req), {
      ...req.body,
      appellant: req.body.appellant || getActor(req),
    });
    res.status(201).json({ success: true, data: appeal });
  } catch (error) {
    jsonError(res, error, "Failed to submit appeal");
  }
};

exports.reviewAppeal = async (req, res) => {
  try {
    const appeal = await EnforcementService.reviewAppeal(getDb(req), req.params.appealId, {
      ...req.body,
      actor: getActor(req),
    });
    res.json({ success: true, data: appeal });
  } catch (error) {
    jsonError(res, error, "Failed to review appeal");
  }
};

exports.scoreReviewRisk = async (req, res) => {
  try {
    const result = RiskScoringService.scoreReview(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score review risk");
  }
};

exports.scoreReturnRisk = async (req, res) => {
  try {
    const result = RiskScoringService.scoreReturnRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score return risk");
  }
};

exports.scoreProductRisk = async (req, res) => {
  try {
    const policies = await TrustPolicyService.listPolicies(getDb(req));
    const result = RiskScoringService.scoreProductContent({ ...req.body, policies });
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score product risk");
  }
};

exports.scorePromoRisk = async (req, res) => {
  try {
    const result = RiskScoringService.scorePromoUse(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score promotion risk");
  }
};

exports.scorePayoutRisk = async (req, res) => {
  try {
    const result = RiskScoringService.scorePayoutRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score payout risk");
  }
};

exports.scoreAccountRisk = async (req, res) => {
  try {
    const result = RiskScoringService.scoreAccountAbuse(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score account risk");
  }
};

exports.scoreChatRisk = async (req, res) => {
  try {
    const result = RiskScoringService.scoreChatSafety(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    jsonError(res, error, "Failed to score chat risk");
  }
};

exports.getTrustDashboard = async (req, res) => {
  try {
    const db = getDb(req);
    const limit = parseLimit(req.query.limit, 10);
    const [
      openReports,
      openDisputes,
      activeEnforcements,
      pendingAppeals,
      highRiskProfiles,
      payoutHolds,
      queues,
      latestRiskEvents,
    ] = await Promise.all([
      db.collection("reports").countDocuments({ status: { $ne: "closed" } }),
      db.collection("trust_disputes").countDocuments({ status: { $nin: ["closed"] } }),
      db.collection("enforcements").countDocuments({ status: { $in: ["active", "appealed", "modified"] } }),
      db.collection("appeals").countDocuments({ status: "submitted" }),
      db.collection("risk_profiles").countDocuments({ riskLevel: { $in: ["high", "critical"] } }),
      db.collection("payout_holds").countDocuments({ status: "active" }),
      TrustCaseService.getQueueSummary(db),
      db.collection("risk_events").find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          openReports,
          openDisputes,
          activeEnforcements,
          pendingAppeals,
          highRiskProfiles,
          payoutHolds,
        },
        queues,
        latestRiskEvents,
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load trust dashboard");
  }
};
