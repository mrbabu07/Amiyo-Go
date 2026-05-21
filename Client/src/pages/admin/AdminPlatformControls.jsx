import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  Flag,
  KeyRound,
  Mail,
  Megaphone,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  TreePine,
  UserPlus,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import {
  createPlatformEmailCampaign,
  getPlatformControlOverview,
  invitePlatformStaff,
  savePlatformAnnouncement,
  savePlatformCategory,
  savePlatformCategoryAttributes,
  savePlatformMessageTemplate,
  sendPlatformNotificationBroadcast,
  setupPlatformStaffTwoFactor,
  updatePlatformCommissionRules,
  updatePlatformConfig,
  updatePlatformRoleSessionPolicy,
  updatePlatformStaffRole,
  verifyPlatformStaffTwoFactor,
} from "../../services/api";
import useAuth from "../../hooks/useAuth";

const tabs = [
  { key: "communications", label: "Communications", icon: Megaphone },
  { key: "configuration", label: "Configuration", icon: SlidersHorizontal },
  { key: "staff", label: "Staff & RBAC", icon: ShieldCheck },
];

const roleOptions = [
  ["admin", "Super Admin"],
  ["manager", "Operations Manager"],
  ["finance_manager", "Finance Manager"],
  ["moderator", "Moderator"],
  ["support_agent", "Support Agent"],
  ["vendor_manager", "Vendor Manager"],
  ["campaign_manager", "Campaign Manager"],
  ["logistics_manager", "Logistics Manager"],
];

const defaultBroadcast = {
  title: "",
  body: "",
  target: "all_users",
  channels: ["in_app"],
  link: "",
};

const defaultCampaign = {
  subject: "",
  previewText: "",
  body: "",
  scheduledAt: "",
  segmentTarget: "newsletter_subscribers",
};

const defaultAnnouncement = {
  title: "",
  message: "",
  target: "all_users",
  status: "active",
  priority: "normal",
  bannerTone: "info",
  link: "",
};

const defaultCategory = {
  name: "",
  slug: "",
  parentId: "",
  image: "",
  icon: "",
  displayOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

const defaultStaff = {
  name: "",
  email: "",
  phone: "",
  role: "support_agent",
};

const featureFlagLabels = {
  guestCheckout: "Guest checkout",
  vendorSignups: "Vendor signups",
  shopDirectory: "Show Shops section",
  cod: "Cash on delivery",
  reviews: "Customer reviews",
  referrals: "Referrals",
};

const formatFeatureFlagLabel = (key) =>
  featureFlagLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

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

const getId = (item) => item?._id?.toString?.() || item?._id || item?.id || "";

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value ?? 0}</p>
    </div>
  );
}

function Pill({ children, tone = "border-slate-200 bg-slate-50 text-slate-700" }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
      />
    </label>
  );
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AdminPlatformControls() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("communications");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [overview, setOverview] = useState(null);

  const [broadcast, setBroadcast] = useState(defaultBroadcast);
  const [campaign, setCampaign] = useState(defaultCampaign);
  const [announcement, setAnnouncement] = useState(defaultAnnouncement);
  const [templateKey, setTemplateKey] = useState("order_confirm");
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "", channel: "email", variables: "" });

  const [configPatch, setConfigPatch] = useState({
    featureFlags: {},
    paymentMethods: {},
    maintenanceMode: {},
    returnPolicy: {},
    tax: {},
    seo: {},
  });
  const [categoryForm, setCategoryForm] = useState(defaultCategory);
  const [attributeForm, setAttributeForm] = useState({
    categoryId: "",
    rows: "Brand|text|required|filterable\nSize|select||filterable",
  });
  const [commissionRows, setCommissionRows] = useState("Fashion|fashion|all|standard|8\nElectronics|electronics|preferred|campaign|5");

  const [staffForm, setStaffForm] = useState(defaultStaff);
  const [staffRoleForm, setStaffRoleForm] = useState({ staffId: "", role: "support_agent", status: "active" });
  const [twoFactor, setTwoFactor] = useState({ staffId: "", token: "", setup: null });
  const [sessionForm, setSessionForm] = useState({ role: "support_agent", sessionTimeoutMinutes: 30 });

  const communications = overview?.communications || {};
  const configuration = overview?.configuration || {};
  const accessControl = overview?.accessControl || {};
  const settings = configuration.settings || {};

  const selectedTemplate = useMemo(
    () => (communications.templates || []).find((item) => item.key === templateKey),
    [communications.templates, templateKey],
  );

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateForm({
      name: selectedTemplate.name || "",
      subject: selectedTemplate.subject || "",
      body: selectedTemplate.body || "",
      channel: selectedTemplate.channel || "email",
      variables: (selectedTemplate.variables || []).join(", "),
    });
  }, [selectedTemplate]);

  useEffect(() => {
    if (!settings.featureFlags) return;
    setConfigPatch({
      featureFlags: settings.featureFlags || {},
      paymentMethods: settings.paymentMethods || {},
      maintenanceMode: settings.maintenanceMode || {},
      returnPolicy: settings.returnPolicy || {},
      tax: settings.tax || {},
      seo: settings.seo || {},
    });
  }, [settings.featureFlags]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await getPlatformControlOverview();
      setOverview(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load platform controls");
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (key, action, message = "Saved") => {
    setSaving(key);
    try {
      await action();
      toast.success(message);
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving("");
    }
  };

  const updateChannel = (channel, checked) => {
    setBroadcast((form) => ({
      ...form,
      channels: checked
        ? Array.from(new Set([...form.channels, channel]))
        : form.channels.filter((item) => item !== channel),
    }));
  };

  const parseAttributes = () =>
    attributeForm.rows
      .split("\n")
      .map((row, index) => {
        const [name, type = "text", required = "", filterable = "", options = ""] = row.split("|");
        return {
          name: (name || "").trim(),
          key: (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          type: type.trim() || "text",
          required: required.trim().toLowerCase() === "required",
          filterable: filterable.trim().toLowerCase() === "filterable",
          options: options ? options.split(",").map((item) => item.trim()).filter(Boolean) : [],
          displayOrder: index,
        };
      })
      .filter((item) => item.name);

  const parseCommissionRows = () =>
    commissionRows
      .split("\n")
      .map((row) => {
        const [name, categoryId, vendorTier, campaignType, commissionRate] = row.split("|");
        return {
          name: (name || "").trim(),
          categoryId: (categoryId || "").trim(),
          vendorTier: (vendorTier || "all").trim(),
          campaignType: (campaignType || "all").trim(),
          commissionRate: Number(commissionRate || 0),
          status: "active",
        };
      })
      .filter((item) => item.name && item.categoryId);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Platform control</p>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Notifications, configuration, and staff access</h1>
            <p className="mt-1 text-sm text-slate-500">
              Broadcast messages, tune marketplace settings, and manage granular admin roles.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "communications" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Metric icon={Users} label="Users" value={communications.kpis?.totalUsers} />
              <Metric icon={Users} label="Vendors" value={communications.kpis?.totalVendors} />
              <Metric icon={Bell} label="Broadcasts sent" value={communications.kpis?.broadcastsSent} />
              <Metric icon={Mail} label="Scheduled emails" value={communications.kpis?.scheduledCampaigns} />
              <Metric icon={Megaphone} label="Active banners" value={communications.kpis?.activeAnnouncements} />
              <Metric icon={FileText} label="Template gaps" value={communications.kpis?.missingTemplates} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Section title="Notification Broadcast" icon={Send}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="input-control sm:col-span-2"
                    placeholder="Broadcast title"
                    value={broadcast.title}
                    onChange={(event) => setBroadcast((form) => ({ ...form, title: event.target.value }))}
                  />
                  <select
                    className="input-control"
                    value={broadcast.target}
                    onChange={(event) => setBroadcast((form) => ({ ...form, target: event.target.value }))}
                  >
                    <option value="all_users">All users</option>
                    <option value="customers">Customers</option>
                    <option value="all_vendors">All vendors</option>
                    <option value="admins">Admin staff</option>
                  </select>
                  <input
                    className="input-control"
                    placeholder="Optional link"
                    value={broadcast.link}
                    onChange={(event) => setBroadcast((form) => ({ ...form, link: event.target.value }))}
                  />
                  <textarea
                    className="input-control min-h-28 sm:col-span-2"
                    placeholder="Message body"
                    value={broadcast.body}
                    onChange={(event) => setBroadcast((form) => ({ ...form, body: event.target.value }))}
                  />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {["in_app", "push", "email", "sms"].map((channel) => (
                    <Toggle
                      key={channel}
                      label={channel.replace("_", " ")}
                      checked={broadcast.channels.includes(channel)}
                      onChange={(checked) => updateChannel(channel, checked)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={saving === "broadcast"}
                  onClick={() =>
                    runAction(
                      "broadcast",
                      async () => {
                        await sendPlatformNotificationBroadcast(broadcast);
                        setBroadcast(defaultBroadcast);
                      },
                      "Broadcast queued",
                    )
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Send broadcast
                </button>
              </Section>

              <Section title="In-app Announcements" icon={Megaphone}>
                <div className="grid gap-3">
                  <input
                    className="input-control"
                    placeholder="Announcement title"
                    value={announcement.title}
                    onChange={(event) => setAnnouncement((form) => ({ ...form, title: event.target.value }))}
                  />
                  <textarea
                    className="input-control min-h-24"
                    placeholder="Announcement message"
                    value={announcement.message}
                    onChange={(event) => setAnnouncement((form) => ({ ...form, message: event.target.value }))}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      className="input-control"
                      value={announcement.target}
                      onChange={(event) => setAnnouncement((form) => ({ ...form, target: event.target.value }))}
                    >
                      <option value="all_users">All users</option>
                      <option value="customers">Customers</option>
                      <option value="all_vendors">Vendors</option>
                      <option value="admins">Admins</option>
                    </select>
                    <select
                      className="input-control"
                      value={announcement.status}
                      onChange={(event) => setAnnouncement((form) => ({ ...form, status: event.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                    <select
                      className="input-control"
                      value={announcement.priority}
                      onChange={(event) => setAnnouncement((form) => ({ ...form, priority: event.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={saving === "announcement"}
                    onClick={() =>
                      runAction(
                        "announcement",
                        async () => {
                          await savePlatformAnnouncement(announcement);
                          setAnnouncement(defaultAnnouncement);
                        },
                        "Announcement saved",
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save announcement
                  </button>
                </div>
              </Section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Transactional Templates" icon={FileText}>
                <div className="grid gap-3">
                  <select
                    className="input-control"
                    value={templateKey}
                    onChange={(event) => setTemplateKey(event.target.value)}
                  >
                    {(communications.templates || []).map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-control"
                    placeholder="Subject"
                    value={templateForm.subject}
                    onChange={(event) => setTemplateForm((form) => ({ ...form, subject: event.target.value }))}
                  />
                  <textarea
                    className="input-control min-h-28"
                    placeholder="Body with variables like {order_id}"
                    value={templateForm.body}
                    onChange={(event) => setTemplateForm((form) => ({ ...form, body: event.target.value }))}
                  />
                  <input
                    className="input-control"
                    placeholder="Variables, comma separated"
                    value={templateForm.variables}
                    onChange={(event) => setTemplateForm((form) => ({ ...form, variables: event.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={saving === "template"}
                    onClick={() =>
                      runAction("template", async () => {
                        await savePlatformMessageTemplate(templateKey, {
                          ...templateForm,
                          key: templateKey,
                          variables: templateForm.variables.split(",").map((item) => item.trim()).filter(Boolean),
                        });
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save template
                  </button>
                </div>
              </Section>

              <Section title="Email Campaign Manager" icon={Mail}>
                <div className="grid gap-3">
                  <input
                    className="input-control"
                    placeholder="Subject"
                    value={campaign.subject}
                    onChange={(event) => setCampaign((form) => ({ ...form, subject: event.target.value }))}
                  />
                  <input
                    className="input-control"
                    placeholder="Preview text"
                    value={campaign.previewText}
                    onChange={(event) => setCampaign((form) => ({ ...form, previewText: event.target.value }))}
                  />
                  <textarea
                    className="input-control min-h-28"
                    placeholder="Campaign body"
                    value={campaign.body}
                    onChange={(event) => setCampaign((form) => ({ ...form, body: event.target.value }))}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="input-control"
                      type="datetime-local"
                      value={campaign.scheduledAt}
                      onChange={(event) => setCampaign((form) => ({ ...form, scheduledAt: event.target.value }))}
                    />
                    <select
                      className="input-control"
                      value={campaign.segmentTarget}
                      onChange={(event) => setCampaign((form) => ({ ...form, segmentTarget: event.target.value }))}
                    >
                      <option value="newsletter_subscribers">Newsletter subscribers</option>
                      <option value="customers">Customers</option>
                      <option value="vendors">Vendors</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={saving === "campaign"}
                    onClick={() =>
                      runAction(
                        "campaign",
                        async () => {
                          await createPlatformEmailCampaign({
                            ...campaign,
                            segment: { target: campaign.segmentTarget },
                          });
                          setCampaign(defaultCampaign);
                        },
                        "Email campaign saved",
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Mail className="h-4 w-4" />
                    Save campaign
                  </button>
                </div>
              </Section>
            </div>

            <Section title="Recent Communication Activity" icon={Bell}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Title</th>
                      <th className="px-3 py-3">Target</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(communications.latestBroadcasts || []).map((item) => (
                      <tr key={getId(item)}>
                        <td className="px-3 py-3 font-semibold text-slate-700">Broadcast</td>
                        <td className="px-3 py-3 text-slate-700">{item.title}</td>
                        <td className="px-3 py-3 text-slate-500">{item.target}</td>
                        <td className="px-3 py-3"><Pill>{item.status}</Pill></td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))}
                    {(communications.announcements || []).slice(0, 5).map((item) => (
                      <tr key={getId(item)}>
                        <td className="px-3 py-3 font-semibold text-slate-700">Announcement</td>
                        <td className="px-3 py-3 text-slate-700">{item.title}</td>
                        <td className="px-3 py-3 text-slate-500">{item.target}</td>
                        <td className="px-3 py-3"><Pill>{item.status}</Pill></td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "configuration" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Metric icon={TreePine} label="Categories" value={configuration.categories?.length || 0} />
              <Metric icon={Settings} label="Commission rules" value={configuration.commissionRules?.length || 0} />
              <Metric icon={CheckCircle2} label="Payment methods" value={Object.keys(configuration.paymentMethods || {}).length} />
              <Metric icon={Store} label="Shops section" value={configuration.featureFlags?.shopDirectory === false ? "Hidden" : "Visible"} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Section title="Site-wide Feature Flags" icon={Flag}>
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <Toggle
                    label="Show Shops section in customer frontend"
                    checked={configPatch.featureFlags?.shopDirectory !== false}
                    onChange={(checked) =>
                      setConfigPatch((form) => ({
                        ...form,
                        featureFlags: { ...form.featureFlags, shopDirectory: checked },
                      }))
                    }
                  />
                  <p className="mt-2 text-sm font-medium text-primary-800">
                    Controls the public Shops navigation, shop listing page, shop detail page, and product-card shop links.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(configPatch.featureFlags || {})
                    .filter(([key]) => key !== "shopDirectory")
                    .map(([key, value]) => (
                    <Toggle
                      key={key}
                      label={formatFeatureFlagLabel(key)}
                      checked={value}
                      onChange={(checked) =>
                        setConfigPatch((form) => ({
                          ...form,
                          featureFlags: { ...form.featureFlags, [key]: checked },
                        }))
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!isAdmin || saving === "flags"}
                  onClick={() => runAction("flags", () => updatePlatformConfig({ featureFlags: configPatch.featureFlags }))}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save flags
                </button>
              </Section>

              <Section title="Payment, Maintenance, Tax, SEO" icon={Settings}>
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {Object.entries(configPatch.paymentMethods || {}).map(([key, value]) => (
                      <Toggle
                        key={key}
                        label={key}
                        checked={value?.enabled}
                        onChange={(checked) =>
                          setConfigPatch((form) => ({
                            ...form,
                            paymentMethods: {
                              ...form.paymentMethods,
                              [key]: { ...(form.paymentMethods?.[key] || {}), enabled: checked },
                            },
                          }))
                        }
                      />
                    ))}
                  </div>
                  <Toggle
                    label="Maintenance mode"
                    checked={configPatch.maintenanceMode?.enabled}
                    onChange={(checked) =>
                      setConfigPatch((form) => ({
                        ...form,
                        maintenanceMode: { ...form.maintenanceMode, enabled: checked },
                      }))
                    }
                  />
                  <textarea
                    className="input-control min-h-20"
                    placeholder="Maintenance message"
                    value={configPatch.maintenanceMode?.message || ""}
                    onChange={(event) =>
                      setConfigPatch((form) => ({
                        ...form,
                        maintenanceMode: { ...form.maintenanceMode, message: event.target.value },
                      }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      className="input-control"
                      type="number"
                      min="1"
                      placeholder="Return window days"
                      value={configPatch.returnPolicy?.defaultWindowDays || ""}
                      onChange={(event) =>
                        setConfigPatch((form) => ({
                          ...form,
                          returnPolicy: { ...form.returnPolicy, defaultWindowDays: Number(event.target.value) },
                        }))
                      }
                    />
                    <select
                      className="input-control"
                      value={configPatch.tax?.displayMode || "inclusive"}
                      onChange={(event) =>
                        setConfigPatch((form) => ({
                          ...form,
                          tax: { ...form.tax, displayMode: event.target.value },
                        }))
                      }
                    >
                      <option value="inclusive">Tax inclusive</option>
                      <option value="exclusive">Tax exclusive</option>
                    </select>
                    <input
                      className="input-control"
                      placeholder="OG image URL"
                      value={configPatch.seo?.ogImage || ""}
                      onChange={(event) =>
                        setConfigPatch((form) => ({
                          ...form,
                          seo: { ...form.seo, ogImage: event.target.value },
                        }))
                      }
                    />
                  </div>
                  <input
                    className="input-control"
                    placeholder="Default meta title"
                    value={configPatch.seo?.defaultMetaTitle || ""}
                    onChange={(event) =>
                      setConfigPatch((form) => ({
                        ...form,
                        seo: { ...form.seo, defaultMetaTitle: event.target.value },
                      }))
                    }
                  />
                  <textarea
                    className="input-control min-h-20"
                    placeholder="Default meta description"
                    value={configPatch.seo?.defaultMetaDescription || ""}
                    onChange={(event) =>
                      setConfigPatch((form) => ({
                        ...form,
                        seo: { ...form.seo, defaultMetaDescription: event.target.value },
                      }))
                    }
                  />
                  <button
                    type="button"
                    disabled={!isAdmin || saving === "config"}
                    onClick={() => runAction("config", () => updatePlatformConfig(configPatch))}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save configuration
                  </button>
                </div>
              </Section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Category Tree Editor" icon={TreePine}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input-control" placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} />
                  <input className="input-control" placeholder="SEO slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((form) => ({ ...form, slug: event.target.value }))} />
                  <select className="input-control" value={categoryForm.parentId} onChange={(event) => setCategoryForm((form) => ({ ...form, parentId: event.target.value }))}>
                    <option value="">Root category</option>
                    {(configuration.categories || []).map((category) => (
                      <option key={getId(category)} value={getId(category)}>{category.name}</option>
                    ))}
                  </select>
                  <input className="input-control" type="number" placeholder="Display order" value={categoryForm.displayOrder} onChange={(event) => setCategoryForm((form) => ({ ...form, displayOrder: Number(event.target.value) }))} />
                  <input className="input-control" placeholder="Image URL" value={categoryForm.image} onChange={(event) => setCategoryForm((form) => ({ ...form, image: event.target.value }))} />
                  <input className="input-control" placeholder="Icon name" value={categoryForm.icon} onChange={(event) => setCategoryForm((form) => ({ ...form, icon: event.target.value }))} />
                  <input className="input-control sm:col-span-2" placeholder="SEO title" value={categoryForm.seoTitle} onChange={(event) => setCategoryForm((form) => ({ ...form, seoTitle: event.target.value }))} />
                  <textarea className="input-control min-h-20 sm:col-span-2" placeholder="SEO description" value={categoryForm.seoDescription} onChange={(event) => setCategoryForm((form) => ({ ...form, seoDescription: event.target.value }))} />
                </div>
                <button
                  type="button"
                  disabled={saving === "category"}
                  onClick={() =>
                    runAction(
                      "category",
                      async () => {
                        await savePlatformCategory(categoryForm);
                        setCategoryForm(defaultCategory);
                      },
                      "Category saved",
                    )
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save category
                </button>
              </Section>

              <Section title="Attribute & Commission Rules" icon={SlidersHorizontal}>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Category attributes</label>
                    <select className="input-control mb-2" value={attributeForm.categoryId} onChange={(event) => setAttributeForm((form) => ({ ...form, categoryId: event.target.value }))}>
                      <option value="">Select category</option>
                      {(configuration.categories || []).map((category) => (
                        <option key={getId(category)} value={getId(category)}>{category.name}</option>
                      ))}
                    </select>
                    <textarea
                      className="input-control min-h-24"
                      value={attributeForm.rows}
                      onChange={(event) => setAttributeForm((form) => ({ ...form, rows: event.target.value }))}
                    />
                    <p className="mt-1 text-xs text-slate-500">Format: Name|type|required|filterable|option1,option2</p>
                    <button
                      type="button"
                      disabled={!attributeForm.categoryId || saving === "attributes"}
                      onClick={() => runAction("attributes", () => savePlatformCategoryAttributes(attributeForm.categoryId, parseAttributes()), "Attributes saved")}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      Save attributes
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Commission rules table</label>
                    <textarea className="input-control min-h-28" value={commissionRows} onChange={(event) => setCommissionRows(event.target.value)} />
                    <p className="mt-1 text-xs text-slate-500">Format: Name|categoryId|vendorTier|campaignType|commissionRate</p>
                    <button
                      type="button"
                      disabled={!isAdmin || saving === "commission"}
                      onClick={() => runAction("commission", () => updatePlatformCommissionRules(parseCommissionRows()), "Commission rules saved")}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      Save commission rules
                    </button>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <Metric icon={Users} label="Staff accounts" value={accessControl.summary?.totalStaff} />
              <Metric icon={KeyRound} label="2FA enabled" value={accessControl.summary?.twoFactorEnabled} />
              <Metric icon={ShieldCheck} label="2FA required" value={accessControl.summary?.twoFactorRequired} />
              <Metric icon={Settings} label="Roles" value={accessControl.summary?.roles} />
              <Metric icon={FileText} label="Recent actions" value={accessControl.summary?.recentActions} />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold">Staff safety guardrails are active</h2>
                    <p className="mt-1 text-sm text-amber-800">
                      Managers and staff can handle assigned sections, but deleting records and changing platform settings are Super Admin only.
                    </p>
                  </div>
                </div>
                <Pill tone="border-amber-300 bg-white text-amber-800">No staff delete access</Pill>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <Section title="Invite Staff Account" icon={UserPlus}>
                <div className="grid gap-3">
                  <input className="input-control" placeholder="Name" value={staffForm.name} onChange={(event) => setStaffForm((form) => ({ ...form, name: event.target.value }))} />
                  <input className="input-control" placeholder="Email" value={staffForm.email} onChange={(event) => setStaffForm((form) => ({ ...form, email: event.target.value }))} />
                  <input className="input-control" placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm((form) => ({ ...form, phone: event.target.value }))} />
                  <select className="input-control" value={staffForm.role} onChange={(event) => setStaffForm((form) => ({ ...form, role: event.target.value }))}>
                    {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!isAdmin || saving === "staff"}
                    onClick={() =>
                      runAction(
                        "staff",
                        async () => {
                          await invitePlatformStaff(staffForm);
                          setStaffForm(defaultStaff);
                        },
                        "Staff invite saved",
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite staff
                  </button>
                </div>
              </Section>

              <Section title="Role Definitions" icon={ShieldCheck}>
                <div className="grid gap-3 md:grid-cols-2">
                  {(accessControl.roles || []).map((role) => (
                    <div key={role.role} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-950">{role.label}</h3>
                        <Pill>{role.staffCount || 0} staff</Pill>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{role.access}</p>
                      <p className="mt-2 text-xs text-slate-500">Session timeout: {role.sessionTimeoutMinutes} minutes</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Section title="Update Staff Role" icon={Users}>
                <div className="grid gap-3">
                  <select className="input-control" value={staffRoleForm.staffId} onChange={(event) => setStaffRoleForm((form) => ({ ...form, staffId: event.target.value }))}>
                    <option value="">Select staff</option>
                    {(accessControl.staff || []).map((member) => (
                      <option key={getId(member)} value={getId(member)}>{member.email} - {member.roleLabel}</option>
                    ))}
                  </select>
                  <select className="input-control" value={staffRoleForm.role} onChange={(event) => setStaffRoleForm((form) => ({ ...form, role: event.target.value }))}>
                    {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select className="input-control" value={staffRoleForm.status} onChange={(event) => setStaffRoleForm((form) => ({ ...form, status: event.target.value }))}>
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <button
                    type="button"
                    disabled={!isAdmin || !staffRoleForm.staffId || saving === "role"}
                    onClick={() => runAction("role", () => updatePlatformStaffRole(staffRoleForm.staffId, staffRoleForm), "Staff role updated")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Update role
                  </button>
                </div>
              </Section>

              <Section title="2FA Setup" icon={KeyRound}>
                <div className="grid gap-3">
                  <select className="input-control" value={twoFactor.staffId} onChange={(event) => setTwoFactor({ staffId: event.target.value, token: "", setup: null })}>
                    <option value="">Select staff</option>
                    {(accessControl.staff || []).map((member) => (
                      <option key={getId(member)} value={getId(member)}>{member.email}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!isAdmin || !twoFactor.staffId || saving === "2fa-setup"}
                    onClick={() =>
                      runAction(
                        "2fa-setup",
                        async () => {
                          const response = await setupPlatformStaffTwoFactor(twoFactor.staffId);
                          setTwoFactor((form) => ({ ...form, setup: response.data.data }));
                        },
                        "2FA secret created",
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    Start setup
                  </button>
                  {twoFactor.setup && (
                    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900">
                      <p className="font-semibold">Authenticator secret</p>
                      <p className="mt-1 break-all font-mono text-xs">{twoFactor.setup.secret}</p>
                    </div>
                  )}
                  <input className="input-control" placeholder="6 digit code" value={twoFactor.token} onChange={(event) => setTwoFactor((form) => ({ ...form, token: event.target.value }))} />
                  <button
                    type="button"
                    disabled={!isAdmin || !twoFactor.staffId || !twoFactor.token || saving === "2fa-verify"}
                    onClick={() => runAction("2fa-verify", () => verifyPlatformStaffTwoFactor(twoFactor.staffId, { token: twoFactor.token }), "2FA verified")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verify 2FA
                  </button>
                </div>
              </Section>

              <Section title="Session Timeout" icon={Settings}>
                <div className="grid gap-3">
                  <select className="input-control" value={sessionForm.role} onChange={(event) => setSessionForm((form) => ({ ...form, role: event.target.value }))}>
                    {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input className="input-control" type="number" min="5" max="240" value={sessionForm.sessionTimeoutMinutes} onChange={(event) => setSessionForm((form) => ({ ...form, sessionTimeoutMinutes: Number(event.target.value) }))} />
                  <button
                    type="button"
                    disabled={!isAdmin || saving === "session"}
                    onClick={() => runAction("session", () => updatePlatformRoleSessionPolicy(sessionForm.role, sessionForm), "Session policy updated")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save policy
                  </button>
                </div>
              </Section>
            </div>

            <Section title="Staff Activity Log" icon={FileText}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Staff</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">2FA</th>
                      <th className="px-3 py-3">Actions</th>
                      <th className="px-3 py-3">Last login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(accessControl.staff || []).map((member) => (
                      <tr key={getId(member)}>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{member.roleLabel}</td>
                        <td className="px-3 py-3"><Pill tone={member.twoFactorEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>{member.twoFactorEnabled ? "Enabled" : "Required"}</Pill></td>
                        <td className="px-3 py-3 text-slate-600">{member.recentActionCount}</td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(member.lastLogin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
