import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Ban,
  BookOpenCheck,
  CheckCircle2,
  FileWarning,
  Gavel,
  History,
  ListChecks,
  RefreshCw,
  Save,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Star,
  Store,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useCurrency from "../../hooks/useCurrency";
import {
  createFraudFlag,
  createSellerPenalty,
  createTermsVersion,
  createTrustSafetyBan,
  createTrustSafetyDispute,
  getContentPolicyViolations,
  getDisputeCenter,
  getFraudDashboard,
  getReviewModerationQueue,
  getSellerPenaltyLog,
  getTermsVersions,
  getTrustSafetyAuditLog,
  getTrustSafetyBans,
  getTrustSafetyOverview,
  moderateTrustSafetyReview,
  publishTermsVersion,
  resolveTrustSafetyDispute,
  reviewContentPolicyViolation,
  updateFraudFlag,
  updateSellerPenaltyAppeal,
  updateTrustSafetyBan,
} from "../../services/api";

const TABS = [
  { key: "overview", label: "Overview", icon: ShieldCheck },
  { key: "fraud", label: "Fraud", icon: Siren },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "disputes", label: "Disputes", icon: Gavel },
  { key: "penalties", label: "Seller Penalties", icon: Store },
  { key: "content", label: "Content Policy", icon: FileWarning },
  { key: "bans", label: "Ban List", icon: Ban },
  { key: "terms", label: "Terms", icon: BookOpenCheck },
];

const emptyFraudFlag = {
  subjectType: "customer",
  subjectId: "",
  subjectName: "",
  type: "manual_flag",
  severity: "medium",
  reason: "",
};

const emptyDispute = {
  type: "vendor_customer",
  orderId: "",
  customerName: "",
  vendorId: "",
  vendorName: "",
  priority: "medium",
  amount: "",
  reason: "",
};

const emptyPenalty = {
  vendorId: "",
  type: "warning",
  severity: "medium",
  reason: "",
  note: "",
};

const emptyBan = {
  type: "ip",
  value: "",
  scope: "checkout",
  reason: "",
  expiresAt: "",
};

const emptyTerms = {
  type: "terms",
  version: "",
  title: "",
  summary: "",
  body: "",
  forceAccept: true,
  publish: true,
};

const severityTone = {
  critical: "border-red-300 bg-red-50 text-red-800",
  high: "border-primary-300 bg-primary-50 text-primary-800",
  medium: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-blue-200 bg-blue-50 text-blue-700",
};

const statusTone = {
  open: "border-red-200 bg-red-50 text-red-700",
  investigating: "border-blue-200 bg-blue-50 text-blue-700",
  active: "border-red-200 bg-red-50 text-red-700",
  appealed: "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  dismissed: "border-slate-200 bg-slate-100 text-slate-600",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  superseded: "border-slate-200 bg-slate-100 text-slate-500",
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (value = "") => value.toString().slice(-8).toUpperCase();

const formatSla = (minutes) => {
  if (minutes === undefined || minutes === null) return "N/A";
  const absolute = Math.abs(Number(minutes));
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  const text = `${hours}h ${mins}m`;
  return Number(minutes) < 0 ? `${text} overdue` : text;
};

function Pill({ children, tone = "border-slate-200 bg-slate-50 text-slate-600" }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {children}
    </span>
  );
}

function Metric({ icon: Icon, label, value, tone = "text-slate-950" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function AdminTrustSafety() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [overview, setOverview] = useState(null);
  const [fraud, setFraud] = useState({ summary: {}, rows: [] });
  const [reviews, setReviews] = useState({ summary: {}, rows: [] });
  const [disputes, setDisputes] = useState({ summary: {}, rows: [] });
  const [penalties, setPenalties] = useState({ summary: {}, rows: [] });
  const [content, setContent] = useState({ summary: {}, rows: [] });
  const [bans, setBans] = useState({ summary: {}, rows: [] });
  const [terms, setTerms] = useState({ active: {}, versions: [] });
  const [auditLog, setAuditLog] = useState([]);

  const [fraudFlagForm, setFraudFlagForm] = useState(emptyFraudFlag);
  const [fraudUpdate, setFraudUpdate] = useState({ flagId: "", status: "investigating", note: "" });
  const [reviewAction, setReviewAction] = useState({ reviewId: "", action: "approve", reason: "" });
  const [disputeForm, setDisputeForm] = useState(emptyDispute);
  const [resolveForm, setResolveForm] = useState({ disputeId: "", source: "trust_safety_disputes", decision: "close", resolutionNote: "" });
  const [penaltyForm, setPenaltyForm] = useState(emptyPenalty);
  const [appealForm, setAppealForm] = useState({ penaltyId: "", status: "upheld", appealResponse: "" });
  const [contentAction, setContentAction] = useState({ violationId: "", action: "request_changes", note: "" });
  const [banForm, setBanForm] = useState(emptyBan);
  const [banUpdate, setBanUpdate] = useState({ banId: "", status: "inactive", reason: "" });
  const [termsForm, setTermsForm] = useState(emptyTerms);

  const kpis = overview?.kpis || {};
  const totalRisk = useMemo(
    () => Number(kpis.openFraudFlags || 0) + Number(kpis.activeDisputes || 0) + Number(kpis.contentViolations || 0),
    [kpis.openFraudFlags, kpis.activeDisputes, kpis.contentViolations],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        fraudRes,
        reviewsRes,
        disputesRes,
        penaltiesRes,
        contentRes,
        bansRes,
        termsRes,
        auditRes,
      ] = await Promise.all([
        getTrustSafetyOverview(),
        getFraudDashboard(),
        getReviewModerationQueue(),
        getDisputeCenter(),
        getSellerPenaltyLog(),
        getContentPolicyViolations(),
        getTrustSafetyBans(),
        getTermsVersions(),
        getTrustSafetyAuditLog(),
      ]);

      setOverview(overviewRes.data.data || null);
      setFraud(fraudRes.data.data || { summary: {}, rows: [] });
      setReviews(reviewsRes.data.data || { summary: {}, rows: [] });
      setDisputes(disputesRes.data.data || { summary: {}, rows: [] });
      setPenalties(penaltiesRes.data.data || { summary: {}, rows: [] });
      setContent(contentRes.data.data || { summary: {}, rows: [] });
      setBans(bansRes.data.data || { summary: {}, rows: [] });
      setTerms(termsRes.data.data || { active: {}, versions: [] });
      setAuditLog(auditRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load trust and safety data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runAction = async (action, successMessage) => {
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const submitFraudFlag = (event) => {
    event.preventDefault();
    runAction(async () => {
      await createFraudFlag(fraudFlagForm);
      setFraudFlagForm(emptyFraudFlag);
    }, "Fraud flag created");
  };

  const submitFraudUpdate = (event) => {
    event.preventDefault();
    runAction(async () => {
      await updateFraudFlag(fraudUpdate.flagId, { status: fraudUpdate.status, note: fraudUpdate.note });
      setFraudUpdate({ flagId: "", status: "investigating", note: "" });
    }, "Fraud flag updated");
  };

  const submitReviewAction = (event) => {
    event.preventDefault();
    runAction(async () => {
      await moderateTrustSafetyReview(reviewAction.reviewId, {
        action: reviewAction.action,
        reason: reviewAction.reason,
      });
      setReviewAction({ reviewId: "", action: "approve", reason: "" });
    }, "Review moderation saved");
  };

  const submitDispute = (event) => {
    event.preventDefault();
    runAction(async () => {
      await createTrustSafetyDispute({ ...disputeForm, amount: Number(disputeForm.amount || 0) });
      setDisputeForm(emptyDispute);
    }, "Dispute created");
  };

  const submitResolveDispute = (event) => {
    event.preventDefault();
    runAction(async () => {
      await resolveTrustSafetyDispute(resolveForm.disputeId, {
        source: resolveForm.source,
        decision: resolveForm.decision,
        resolutionNote: resolveForm.resolutionNote,
      });
      setResolveForm({ disputeId: "", source: "trust_safety_disputes", decision: "close", resolutionNote: "" });
    }, "Dispute resolution saved");
  };

  const submitPenalty = (event) => {
    event.preventDefault();
    runAction(async () => {
      await createSellerPenalty(penaltyForm);
      setPenaltyForm(emptyPenalty);
    }, "Seller penalty created");
  };

  const submitAppeal = (event) => {
    event.preventDefault();
    runAction(async () => {
      await updateSellerPenaltyAppeal(appealForm.penaltyId, {
        status: appealForm.status,
        appealResponse: appealForm.appealResponse,
      });
      setAppealForm({ penaltyId: "", status: "upheld", appealResponse: "" });
    }, "Appeal response saved");
  };

  const submitContentAction = (event) => {
    event.preventDefault();
    runAction(async () => {
      await reviewContentPolicyViolation(contentAction.violationId, {
        action: contentAction.action,
        note: contentAction.note,
      });
      setContentAction({ violationId: "", action: "request_changes", note: "" });
    }, "Content policy action saved");
  };

  const submitBan = (event) => {
    event.preventDefault();
    runAction(async () => {
      await createTrustSafetyBan(banForm);
      setBanForm(emptyBan);
    }, "Ban list entry created");
  };

  const submitBanUpdate = (event) => {
    event.preventDefault();
    runAction(async () => {
      await updateTrustSafetyBan(banUpdate.banId, {
        status: banUpdate.status,
        reason: banUpdate.reason,
      });
      setBanUpdate({ banId: "", status: "inactive", reason: "" });
    }, "Ban list entry updated");
  };

  const submitTerms = (event) => {
    event.preventDefault();
    runAction(async () => {
      await createTermsVersion(termsForm);
      setTermsForm(emptyTerms);
    }, termsForm.publish ? "Policy version published" : "Policy draft created");
  };

  const publishExistingTerms = (versionId) => {
    runAction(async () => {
      await publishTermsVersion(versionId, { forceAccept: true });
    }, "Policy version published");
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Trust, Safety & Compliance</h1>
                <p className="mt-1 text-sm text-slate-500">Fraud, disputes, policy enforcement, bans, and terms control.</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric icon={Siren} label="Open fraud flags" value={kpis.openFraudFlags || 0} tone="text-red-700" />
          <Metric icon={Star} label="Review queue" value={kpis.reviewQueue || 0} />
          <Metric icon={Gavel} label="Active disputes" value={kpis.activeDisputes || 0} tone="text-primary-700" />
          <Metric icon={FileWarning} label="Content violations" value={kpis.contentViolations || 0} tone="text-amber-700" />
          <Metric icon={AlertOctagon} label="Total live risk" value={totalRisk} tone="text-red-800" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeTab === key ? "bg-red-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Priority Queue</h2>
                <Pill tone="border-red-200 bg-red-50 text-red-700">{kpis.highRiskFlags || 0} high risk</Pill>
              </div>
              <div className="space-y-3">
                {[...(overview?.fraud || []), ...(overview?.disputes || []), ...(overview?.contentViolations || [])]
                  .slice(0, 10)
                  .map((item) => (
                    <div key={`${item._id}-${item.type}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{item.subjectName || item.customerName || item.subjectTitle || item.reason}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.reason || item.issue}</p>
                        </div>
                        <div className="flex gap-2">
                          <Pill tone={severityTone[item.severity] || statusTone[item.status]}>{item.severity || item.status}</Pill>
                          {item.breached && <Pill tone="border-red-200 bg-red-50 text-red-700">SLA breached</Pill>}
                        </div>
                      </div>
                    </div>
                  ))}
                {(!overview?.fraud?.length && !overview?.disputes?.length && !overview?.contentViolations?.length) && (
                  <EmptyPanel>No priority trust and safety items.</EmptyPanel>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Active Policy Versions</h2>
                <div className="mt-4 space-y-3">
                  {["terms", "privacy"].map((type) => {
                    const version = terms.active?.[type];
                    return (
                      <div key={type} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">{type}</p>
                        <p className="mt-1 font-semibold text-slate-950">{version?.version || "No published version"}</p>
                        <p className="text-xs text-slate-500">{formatDate(version?.publishedAt)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Audit Trail</h2>
                <div className="mt-4 space-y-3">
                  {auditLog.slice(0, 6).map((entry) => (
                    <div key={entry._id} className="flex gap-3 rounded-lg bg-slate-50 p-3">
                      <History className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                        <p className="text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {auditLog.length === 0 && <p className="text-sm text-slate-500">No trust and safety audit events yet.</p>}
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "fraud" && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-950">Fraud Detection Dashboard</h2>
                <div className="flex gap-2">
                  <Pill tone="border-red-200 bg-red-50 text-red-700">{fraud.summary?.openFlags || 0} open</Pill>
                  <Pill>{fraud.summary?.activeBans || 0} active bans</Pill>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Signal</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fraud.rows.map((row) => (
                      <tr key={row._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950">{row.subjectName || row.subjectId}</p>
                          <p className="text-xs text-slate-500">{row.subjectType} #{shortId(row.subjectId)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{String(row.type || "").replaceAll("_", " ")}</p>
                          <p className="max-w-lg text-xs text-slate-500">{row.reason}</p>
                        </td>
                        <td className="px-4 py-3"><Pill tone={severityTone[row.severity]}>{row.severity}</Pill></td>
                        <td className="px-4 py-3"><Pill tone={statusTone[row.status]}>{row.status}</Pill></td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fraud.rows.length === 0 && <EmptyPanel>No fraud signals are currently open.</EmptyPanel>}
            </section>

            <aside className="space-y-4">
              <form onSubmit={submitFraudFlag} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Create Fraud Flag</h2>
                <div className="mt-4 grid gap-3">
                  <select className="input-control" value={fraudFlagForm.subjectType} onChange={(event) => setFraudFlagForm({ ...fraudFlagForm, subjectType: event.target.value })}>
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="order">Order</option>
                    <option value="device">Device</option>
                  </select>
                  <input required className="input-control" placeholder="Subject ID" value={fraudFlagForm.subjectId} onChange={(event) => setFraudFlagForm({ ...fraudFlagForm, subjectId: event.target.value })} />
                  <input className="input-control" placeholder="Subject name" value={fraudFlagForm.subjectName} onChange={(event) => setFraudFlagForm({ ...fraudFlagForm, subjectName: event.target.value })} />
                  <input className="input-control" placeholder="Flag type" value={fraudFlagForm.type} onChange={(event) => setFraudFlagForm({ ...fraudFlagForm, type: event.target.value })} />
                  <select className="input-control" value={fraudFlagForm.severity} onChange={(event) => setFraudFlagForm({ ...fraudFlagForm, severity: event.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <textarea required className="input-control min-h-24" placeholder="Reason" value={fraudFlagForm.reason} onChange={(event) => setFraudFlagForm({ ...fraudFlagForm, reason: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Save Flag
                  </button>
                </div>
              </form>

              <form onSubmit={submitFraudUpdate} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Update Flag Status</h2>
                <div className="mt-4 grid gap-3">
                  <select required className="input-control" value={fraudUpdate.flagId} onChange={(event) => setFraudUpdate({ ...fraudUpdate, flagId: event.target.value })}>
                    <option value="">Select flag</option>
                    {fraud.rows.filter((row) => row.source !== "auto").map((row) => (
                      <option key={row._id} value={row._id}>{shortId(row._id)} - {row.type}</option>
                    ))}
                  </select>
                  <select className="input-control" value={fraudUpdate.status} onChange={(event) => setFraudUpdate({ ...fraudUpdate, status: event.target.value })}>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <textarea className="input-control min-h-20" placeholder="Note" value={fraudUpdate.note} onChange={(event) => setFraudUpdate({ ...fraudUpdate, note: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" />
                    Update
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Review Moderation Queue</h2>
                <Pill>{reviews.summary?.total || 0} flagged</Pill>
              </div>
              <div className="space-y-3">
                {reviews.rows.map((review) => (
                  <div key={review._id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{review.productName}</p>
                        <p className="mt-1 text-sm text-slate-600">{review.comment || "No comment"}</p>
                        <p className="mt-2 text-xs text-slate-500">{review.customerName} · {formatDate(review.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={statusTone[review.status]}>{review.status}</Pill>
                        {review.verifiedPurchase && <Pill tone="border-emerald-200 bg-emerald-50 text-emerald-700">Verified Purchase</Pill>}
                      </div>
                    </div>
                    {review.reason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{review.reason}</p>}
                  </div>
                ))}
                {reviews.rows.length === 0 && <EmptyPanel>No reviews waiting for moderation.</EmptyPanel>}
              </div>
            </section>

            <form onSubmit={submitReviewAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Moderate Review</h2>
              <div className="mt-4 grid gap-3">
                <select required className="input-control" value={reviewAction.reviewId} onChange={(event) => setReviewAction({ ...reviewAction, reviewId: event.target.value })}>
                  <option value="">Select review</option>
                  {reviews.rows.map((review) => (
                    <option key={review._id} value={review._id}>{shortId(review._id)} - {review.productName}</option>
                  ))}
                </select>
                <select className="input-control" value={reviewAction.action} onChange={(event) => setReviewAction({ ...reviewAction, action: event.target.value })}>
                  <option value="approve">Approve</option>
                  <option value="hide">Hide</option>
                  <option value="remove">Remove</option>
                  <option value="mark_verified">Mark Verified Purchase</option>
                  <option value="unverify">Remove Verified Badge</option>
                  <option value="flag">Flag</option>
                </select>
                <textarea className="input-control min-h-24" placeholder="Reason" value={reviewAction.reason} onChange={(event) => setReviewAction({ ...reviewAction, reason: event.target.value })} />
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Save Moderation
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "disputes" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Dispute Resolution Centre</h2>
                <div className="flex gap-2">
                  <Pill>{disputes.summary?.total || 0} open</Pill>
                  <Pill tone="border-red-200 bg-red-50 text-red-700">{disputes.summary?.breached || 0} breached</Pill>
                </div>
              </div>
              <div className="space-y-3">
                {disputes.rows.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.reason}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.customerName} vs {item.vendorName} · Order #{shortId(item.orderId)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={item.breached ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700"}>
                          {formatSla(item.slaRemainingMinutes)}
                        </Pill>
                        <Pill>{item.type}</Pill>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Source: {item.source}</span>
                      <span>Amount: {formatPrice(item.amount || 0)}</span>
                      <span>Created: {formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {disputes.rows.length === 0 && <EmptyPanel>No active disputes.</EmptyPanel>}
              </div>
            </section>

            <aside className="space-y-4">
              <form onSubmit={submitDispute} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Create Dispute</h2>
                <div className="mt-4 grid gap-3">
                  <select className="input-control" value={disputeForm.type} onChange={(event) => setDisputeForm({ ...disputeForm, type: event.target.value })}>
                    <option value="vendor_customer">Vendor-Customer</option>
                    <option value="payment">Payment</option>
                    <option value="return">Return</option>
                  </select>
                  <input className="input-control" placeholder="Order ID" value={disputeForm.orderId} onChange={(event) => setDisputeForm({ ...disputeForm, orderId: event.target.value })} />
                  <input className="input-control" placeholder="Customer name" value={disputeForm.customerName} onChange={(event) => setDisputeForm({ ...disputeForm, customerName: event.target.value })} />
                  <input className="input-control" placeholder="Vendor ID" value={disputeForm.vendorId} onChange={(event) => setDisputeForm({ ...disputeForm, vendorId: event.target.value })} />
                  <input className="input-control" placeholder="Vendor name" value={disputeForm.vendorName} onChange={(event) => setDisputeForm({ ...disputeForm, vendorName: event.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="input-control" value={disputeForm.priority} onChange={(event) => setDisputeForm({ ...disputeForm, priority: event.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <input className="input-control" type="number" min="0" placeholder="Amount" value={disputeForm.amount} onChange={(event) => setDisputeForm({ ...disputeForm, amount: event.target.value })} />
                  </div>
                  <textarea required className="input-control min-h-24" placeholder="Reason" value={disputeForm.reason} onChange={(event) => setDisputeForm({ ...disputeForm, reason: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Create
                  </button>
                </div>
              </form>

              <form onSubmit={submitResolveDispute} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Resolve Dispute</h2>
                <div className="mt-4 grid gap-3">
                  <select required className="input-control" value={`${resolveForm.source}:${resolveForm.disputeId}`} onChange={(event) => {
                    const [source, disputeId] = event.target.value.split(":");
                    setResolveForm({ ...resolveForm, source, disputeId });
                  }}>
                    <option value="trust_safety_disputes:">Select dispute</option>
                    {disputes.rows.map((item) => (
                      <option key={item._id} value={`${item.source}:${item.sourceId}`}>{shortId(item.sourceId)} - {item.type}</option>
                    ))}
                  </select>
                  <select className="input-control" value={resolveForm.decision} onChange={(event) => setResolveForm({ ...resolveForm, decision: event.target.value })}>
                    <option value="approve_customer">Approve Customer</option>
                    <option value="approve_vendor">Approve Vendor</option>
                    <option value="partial_refund">Partial Refund</option>
                    <option value="reject">Reject</option>
                    <option value="escalate">Escalate</option>
                    <option value="close">Close</option>
                  </select>
                  <textarea required className="input-control min-h-24" placeholder="Resolution note" value={resolveForm.resolutionNote} onChange={(event) => setResolveForm({ ...resolveForm, resolutionNote: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {activeTab === "penalties" && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Seller Penalty Log</h2>
                <Pill tone="border-red-200 bg-red-50 text-red-700">{penalties.summary?.active || 0} active</Pill>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Seller</th>
                      <th className="px-4 py-3">Penalty</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Appeal</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {penalties.rows.map((row) => (
                      <tr key={`${row.source}-${row._id}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950">{row.vendorName}</p>
                          <p className="text-xs text-slate-500">#{shortId(row.vendorId)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{row.type} {row.strikeNumber ? `#${row.strikeNumber}` : ""}</p>
                          <p className="max-w-md text-xs text-slate-500">{row.reason}</p>
                        </td>
                        <td className="px-4 py-3"><Pill tone={statusTone[row.status]}>{row.status}</Pill></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{row.appealResponse || "No appeal response"}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {penalties.rows.length === 0 && <EmptyPanel>No seller penalties logged.</EmptyPanel>}
            </section>

            <aside className="space-y-4">
              <form onSubmit={submitPenalty} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Issue Penalty</h2>
                <div className="mt-4 grid gap-3">
                  <input required className="input-control" placeholder="Vendor ID" value={penaltyForm.vendorId} onChange={(event) => setPenaltyForm({ ...penaltyForm, vendorId: event.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="input-control" value={penaltyForm.type} onChange={(event) => setPenaltyForm({ ...penaltyForm, type: event.target.value })}>
                      <option value="warning">Warning</option>
                      <option value="strike">Strike</option>
                      <option value="suspension">Suspension</option>
                    </select>
                    <select className="input-control" value={penaltyForm.severity} onChange={(event) => setPenaltyForm({ ...penaltyForm, severity: event.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <textarea required className="input-control min-h-24" placeholder="Reason" value={penaltyForm.reason} onChange={(event) => setPenaltyForm({ ...penaltyForm, reason: event.target.value })} />
                  <textarea className="input-control min-h-20" placeholder="Admin note" value={penaltyForm.note} onChange={(event) => setPenaltyForm({ ...penaltyForm, note: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Issue
                  </button>
                </div>
              </form>

              <form onSubmit={submitAppeal} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Appeal Response</h2>
                <div className="mt-4 grid gap-3">
                  <select required className="input-control" value={appealForm.penaltyId} onChange={(event) => setAppealForm({ ...appealForm, penaltyId: event.target.value })}>
                    <option value="">Select penalty</option>
                    {penalties.rows.filter((row) => row.source === "seller_penalties").map((row) => (
                      <option key={row._id} value={row._id}>{shortId(row._id)} - {row.vendorName}</option>
                    ))}
                  </select>
                  <select className="input-control" value={appealForm.status} onChange={(event) => setAppealForm({ ...appealForm, status: event.target.value })}>
                    <option value="appealed">Appealed</option>
                    <option value="upheld">Upheld</option>
                    <option value="removed">Removed</option>
                  </select>
                  <textarea className="input-control min-h-24" placeholder="Appeal response" value={appealForm.appealResponse} onChange={(event) => setAppealForm({ ...appealForm, appealResponse: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Save Response
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {activeTab === "content" && (
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Content Policy Violation Queue</h2>
                <Pill tone="border-amber-200 bg-amber-50 text-amber-700">{content.summary?.highRisk || 0} high risk</Pill>
              </div>
              <div className="space-y-3">
                {content.rows.map((row) => (
                  <div key={row._id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{row.subjectTitle}</p>
                        <p className="mt-1 text-sm text-slate-500">{row.vendorName || row.subjectType} · {row.rule}</p>
                      </div>
                      <div className="flex gap-2">
                        <Pill tone={severityTone[row.severity]}>{row.severity}</Pill>
                        <Pill>{row.source}</Pill>
                      </div>
                    </div>
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{row.issue}</p>
                    {row.imageUrls?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {row.imageUrls.slice(0, 3).map((url) => <span key={url} className="rounded-full bg-slate-100 px-2 py-1">Image {shortId(url)}</span>)}
                      </div>
                    )}
                  </div>
                ))}
                {content.rows.length === 0 && <EmptyPanel>No content policy violations.</EmptyPanel>}
              </div>
            </section>

            <form onSubmit={submitContentAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Review Violation</h2>
              <div className="mt-4 grid gap-3">
                <select required className="input-control" value={contentAction.violationId} onChange={(event) => setContentAction({ ...contentAction, violationId: event.target.value })}>
                  <option value="">Select item</option>
                  {content.rows.map((row) => (
                    <option key={row._id} value={row._id}>{row.subjectType} - {row.subjectTitle}</option>
                  ))}
                </select>
                <select className="input-control" value={contentAction.action} onChange={(event) => setContentAction({ ...contentAction, action: event.target.value })}>
                  <option value="request_changes">Request Changes</option>
                  <option value="delist">Delist Product</option>
                  <option value="suspend_shop">Suspend Shop</option>
                  <option value="dismiss">Dismiss</option>
                  <option value="resolved">Resolve</option>
                </select>
                <textarea className="input-control min-h-24" placeholder="Review note" value={contentAction.note} onChange={(event) => setContentAction({ ...contentAction, note: event.target.value })} />
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Save Action
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "bans" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">IP / Device Ban List</h2>
                <Pill tone="border-red-200 bg-red-50 text-red-700">{bans.summary?.active || 0} active</Pill>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Scope</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bans.rows.map((row) => (
                      <tr key={row._id}>
                        <td className="px-4 py-3"><Pill>{row.type}</Pill></td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-800">{row.value}</td>
                        <td className="px-4 py-3 text-slate-500">{row.scope}</td>
                        <td className="px-4 py-3"><Pill tone={statusTone[row.status]}>{row.status}</Pill></td>
                        <td className="px-4 py-3 text-slate-500">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bans.rows.length === 0 && <EmptyPanel>No IP or device bans configured.</EmptyPanel>}
            </section>

            <aside className="space-y-4">
              <form onSubmit={submitBan} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Create Ban</h2>
                <div className="mt-4 grid gap-3">
                  <select className="input-control" value={banForm.type} onChange={(event) => setBanForm({ ...banForm, type: event.target.value })}>
                    <option value="ip">IP Address</option>
                    <option value="device">Device Fingerprint</option>
                  </select>
                  <input required className="input-control" placeholder="Value" value={banForm.value} onChange={(event) => setBanForm({ ...banForm, value: event.target.value })} />
                  <select className="input-control" value={banForm.scope} onChange={(event) => setBanForm({ ...banForm, scope: event.target.value })}>
                    <option value="checkout">Checkout</option>
                    <option value="login">Login</option>
                    <option value="all">All</option>
                  </select>
                  <input className="input-control" type="datetime-local" value={banForm.expiresAt} onChange={(event) => setBanForm({ ...banForm, expiresAt: event.target.value })} />
                  <textarea required className="input-control min-h-24" placeholder="Reason" value={banForm.reason} onChange={(event) => setBanForm({ ...banForm, reason: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Create Ban
                  </button>
                </div>
              </form>

              <form onSubmit={submitBanUpdate} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Update Ban</h2>
                <div className="mt-4 grid gap-3">
                  <select required className="input-control" value={banUpdate.banId} onChange={(event) => setBanUpdate({ ...banUpdate, banId: event.target.value })}>
                    <option value="">Select ban</option>
                    {bans.rows.map((row) => (
                      <option key={row._id} value={row._id}>{row.type} - {row.value}</option>
                    ))}
                  </select>
                  <select className="input-control" value={banUpdate.status} onChange={(event) => setBanUpdate({ ...banUpdate, status: event.target.value })}>
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                  <textarea className="input-control min-h-20" placeholder="Reason" value={banUpdate.reason} onChange={(event) => setBanUpdate({ ...banUpdate, reason: event.target.value })} />
                  <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Update Ban
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Platform Terms Versioning</h2>
                <Pill>{terms.versions?.length || 0} versions</Pill>
              </div>
              <div className="space-y-3">
                {terms.versions.map((version) => (
                  <div key={version._id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{version.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{version.type} v{version.version} · {formatDate(version.publishedAt || version.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={statusTone[version.status]}>{version.status}</Pill>
                        {version.forceAccept && <Pill tone="border-red-200 bg-red-50 text-red-700">Force accept</Pill>}
                      </div>
                    </div>
                    {version.summary && <p className="mt-3 text-sm text-slate-600">{version.summary}</p>}
                    {version.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => publishExistingTerms(version._id)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Publish
                      </button>
                    )}
                  </div>
                ))}
                {terms.versions.length === 0 && <EmptyPanel>No policy versions created yet.</EmptyPanel>}
              </div>
            </section>

            <form onSubmit={submitTerms} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Create Policy Version</h2>
              <div className="mt-4 grid gap-3">
                <select className="input-control" value={termsForm.type} onChange={(event) => setTermsForm({ ...termsForm, type: event.target.value })}>
                  <option value="terms">Terms & Conditions</option>
                  <option value="privacy">Privacy Policy</option>
                </select>
                <input required className="input-control" placeholder="Version, e.g. 2026.05" value={termsForm.version} onChange={(event) => setTermsForm({ ...termsForm, version: event.target.value })} />
                <input required className="input-control" placeholder="Title" value={termsForm.title} onChange={(event) => setTermsForm({ ...termsForm, title: event.target.value })} />
                <textarea className="input-control min-h-20" placeholder="Summary" value={termsForm.summary} onChange={(event) => setTermsForm({ ...termsForm, summary: event.target.value })} />
                <textarea required className="input-control min-h-40" placeholder="Policy body" value={termsForm.body} onChange={(event) => setTermsForm({ ...termsForm, body: event.target.value })} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={termsForm.publish} onChange={(event) => setTermsForm({ ...termsForm, publish: event.target.checked })} />
                  Publish immediately
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={termsForm.forceAccept} onChange={(event) => setTermsForm({ ...termsForm, forceAccept: event.target.checked })} />
                  Force users to accept on next login
                </label>
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Save Version
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
