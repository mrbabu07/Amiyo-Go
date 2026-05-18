import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Eye,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  PackageSearch,
  Phone,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import Loading from "../components/Loading";
import {
  addSavedPaymentMethod,
  cancelAccountDeletion,
  deleteSavedPaymentMethod,
  disableAccountTwoFactor,
  exportAccountData,
  getAccountLoginActivity,
  getAccountProfile,
  requestAccountDeletion,
  setupAccountTwoFactor,
  updateAccountPreferences,
  updateAccountProfile,
  verifyAccountTwoFactor,
} from "../services/api";

const emptyProfile = {
  displayName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  avatar: "",
};

const defaultNotificationPreferences = {
  orderUpdates: { email: true, sms: false, push: true },
  promotions: { email: false, sms: false, push: false },
  priceDrops: { email: true, sms: false, push: true },
  vendorNews: { email: false, sms: false, push: false },
};

const defaultPrivacy = {
  wishlistVisibility: "private",
  reviewHistoryVisibility: "public",
  personalization: true,
};

const defaultAppPreferences = {
  language: "en",
  currency: "BDT",
};

const notificationRows = [
  { key: "orderUpdates", label: "Order updates" },
  { key: "promotions", label: "Promotions" },
  { key: "priceDrops", label: "Price drops" },
  { key: "vendorNews", label: "Vendor news" },
];

const channels = ["email", "sms", "push"];

const visibilityOptions = [
  { value: "private", label: "Private" },
  { value: "followers", label: "Followers" },
  { value: "public", label: "Public" },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getInitials = (profile = {}) => {
  const source = profile.displayName || profile.email || "Customer";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.message || fallback;

function Section({ icon: Icon, title, action, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
      />
      {label}
    </label>
  );
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [account, setAccount] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [notificationPreferences, setNotificationPreferences] = useState(
    clone(defaultNotificationPreferences),
  );
  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [appPreferences, setAppPreferences] = useState(defaultAppPreferences);
  const [paymentForm, setPaymentForm] = useState({
    type: "bkash",
    label: "",
    accountNumber: "",
    last4: "",
    isDefault: false,
  });
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [loginActivity, setLoginActivity] = useState([]);

  const quickLinks = useMemo(
    () => [
      {
        to: "/orders",
        label: "Orders",
        description: "Track purchases",
        icon: PackageSearch,
        color: "bg-blue-50 text-blue-700",
      },
      {
        to: "/addresses",
        label: "Address book",
        description: "Saved delivery points",
        icon: MapPin,
        color: "bg-emerald-50 text-emerald-700",
      },
      {
        to: "/returns",
        label: "Returns",
        description: "Refund status",
        icon: RotateCcw,
        color: "bg-orange-50 text-orange-700",
      },
      {
        to: "/wishlist",
        label: "Wishlist",
        description: "Saved products",
        icon: Eye,
        color: "bg-pink-50 text-pink-700",
      },
      {
        to: "/loyalty",
        label: "Coins",
        description: "Balance and history",
        icon: WalletCards,
        color: "bg-violet-50 text-violet-700",
      },
      {
        to: "/my-alerts",
        label: "Notifications",
        description: "Unread updates",
        icon: Bell,
        color: "bg-cyan-50 text-cyan-700",
      },
      {
        to: "/support",
        label: "Support",
        description: "Tickets and help",
        icon: MessageSquare,
        color: "bg-slate-100 text-slate-700",
      },
    ],
    [],
  );

  const applyAccount = (nextAccount) => {
    if (!nextAccount) return;
    setAccount(nextAccount);
    setProfileForm({
      ...emptyProfile,
      ...nextAccount.profile,
      email: nextAccount.profile?.email || user?.email || "",
    });
    setNotificationPreferences({
      ...clone(defaultNotificationPreferences),
      ...(nextAccount.notificationPreferences || {}),
    });
    setPrivacy({ ...defaultPrivacy, ...(nextAccount.privacy || {}) });
    setAppPreferences({
      ...defaultAppPreferences,
      ...(nextAccount.appPreferences || {}),
    });
    const preferredLanguage = nextAccount.appPreferences?.language;
    if (preferredLanguage && preferredLanguage !== i18n.resolvedLanguage) {
      i18n.changeLanguage(preferredLanguage);
    }
    setLoginActivity(nextAccount.loginActivity || []);
  };

  const loadAccount = async () => {
    try {
      setLoading(true);
      const response = await getAccountProfile();
      const nextAccount = response.data.data;
      applyAccount(nextAccount);

      try {
        const activityResponse = await getAccountLoginActivity();
        setLoginActivity(activityResponse.data.data || nextAccount.loginActivity || []);
      } catch (activityError) {
        console.error("Failed to load login activity:", activityError);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load account profile"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving("profile");
      const response = await updateAccountProfile(profileForm);
      applyAccount(response.data.data);
      toast.success("Profile saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save profile"));
    } finally {
      setSaving("");
    }
  };

  const savePreferences = async () => {
    try {
      setSaving("preferences");
      const response = await updateAccountPreferences({
        notificationPreferences,
        privacy,
        appPreferences,
      });
      applyAccount(response.data.data);
      if (appPreferences.language !== i18n.resolvedLanguage) {
        i18n.changeLanguage(appPreferences.language);
      }
      toast.success(t("profile.preferencesSaved"));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save preferences"));
    } finally {
      setSaving("");
    }
  };

  const addPaymentMethod = async (event) => {
    event.preventDefault();
    const payload = {
      ...paymentForm,
      accountNumber: paymentForm.type === "card" ? "" : paymentForm.accountNumber,
      last4: paymentForm.type === "card" ? paymentForm.last4 : paymentForm.accountNumber.slice(-4),
    };

    try {
      setSaving("payment");
      const response = await addSavedPaymentMethod(payload);
      setAccount((prev) => ({
        ...prev,
        savedPaymentMethods: response.data.data.savedPaymentMethods,
      }));
      setPaymentForm({
        type: "bkash",
        label: "",
        accountNumber: "",
        last4: "",
        isDefault: false,
      });
      toast.success("Payment method saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save payment method"));
    } finally {
      setSaving("");
    }
  };

  const removePaymentMethod = async (methodId) => {
    try {
      setSaving(methodId);
      const response = await deleteSavedPaymentMethod(methodId);
      setAccount((prev) => ({
        ...prev,
        savedPaymentMethods: response.data.data.savedPaymentMethods,
      }));
      toast.success("Payment method removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete payment method"));
    } finally {
      setSaving("");
    }
  };

  const startTwoFactorSetup = async () => {
    try {
      setSaving("2fa-setup");
      const response = await setupAccountTwoFactor();
      setTwoFactorSetup(response.data.data);
      toast.success("Authenticator setup started");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to start 2FA setup"));
    } finally {
      setSaving("");
    }
  };

  const verifyTwoFactor = async (event) => {
    event.preventDefault();
    try {
      setSaving("2fa-verify");
      await verifyAccountTwoFactor({ code: twoFactorCode });
      setTwoFactorCode("");
      setTwoFactorSetup(null);
      await loadAccount();
      toast.success("2FA enabled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid authenticator code"));
    } finally {
      setSaving("");
    }
  };

  const turnOffTwoFactor = async (event) => {
    event.preventDefault();
    try {
      setSaving("2fa-disable");
      await disableAccountTwoFactor({ code: disableCode });
      setDisableCode("");
      await loadAccount();
      toast.success("2FA disabled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to disable 2FA"));
    } finally {
      setSaving("");
    }
  };

  const downloadDataExport = async () => {
    try {
      setSaving("export");
      const response = await exportAccountData();
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `amiyo-account-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Data export downloaded");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to export account data"));
    } finally {
      setSaving("");
    }
  };

  const submitDeletionRequest = async () => {
    if (!window.confirm("Schedule this account for deletion after a 30-day grace period?")) {
      return;
    }

    try {
      setSaving("delete");
      await requestAccountDeletion({ reason: deletionReason });
      await loadAccount();
      toast.success("Deletion request scheduled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to request account deletion"));
    } finally {
      setSaving("");
    }
  };

  const cancelDeletionRequest = async () => {
    try {
      setSaving("delete-cancel");
      await cancelAccountDeletion();
      await loadAccount();
      toast.success("Deletion request cancelled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to cancel deletion request"));
    } finally {
      setSaving("");
    }
  };

  const updateNotificationChannel = (eventKey, channel, checked) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        [channel]: checked,
      },
    }));
  };

  if (loading) return <Loading />;

  const savedPaymentMethods = account?.savedPaymentMethods || [];
  const verification = account?.verificationBadges || {};
  const twoFactorEnabled = Boolean(account?.security?.twoFactorEnabled);
  const deletionPending = account?.status === "deletion_pending" || account?.deletion;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {profileForm.avatar ? (
                  <img
                    src={profileForm.avatar}
                    alt={profileForm.displayName || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-500">
                    {getInitials(profileForm)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-950">
                    {profileForm.displayName || user?.displayName || "Customer"}
                  </h1>
                  {isAdmin && (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                      Admin
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Account dashboard for profile, orders, addresses, coins, notifications, and support.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Mail className="h-3.5 w-3.5" />
                    Email {verification.emailVerified ? "verified" : "unverified"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      verification.phoneVerified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Phone {verification.phoneVerified ? "verified" : "unverified"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      twoFactorEnabled
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    2FA {twoFactorEnabled ? "on" : "off"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Status</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-900">
                  {account?.status || "active"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Role</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-900">
                  {account?.role || "customer"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Language</p>
                <p className="mt-1 text-sm font-bold uppercase text-slate-900">
                  {appPreferences.language}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Currency</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {appPreferences.currency}
                </p>
              </div>
            </div>
          </div>
        </div>

        {deletionPending && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                <span className="font-semibold">
                  Account deletion scheduled for {formatDateTime(account?.deletion?.scheduledFor)}
                </span>
              </div>
              <button
                onClick={cancelDeletionRequest}
                disabled={saving === "delete-cancel"}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Cancel Request
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-semibold text-slate-950">{item.label}</p>
                <p className="text-sm text-slate-500">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section
              icon={UserRound}
              title="Profile"
              action={
                <button
                  form="profile-form"
                  type="submit"
                  disabled={saving === "profile"}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              }
            >
              <form id="profile-form" onSubmit={saveProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Display name">
                  <input
                    className="input-control"
                    value={profileForm.displayName}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="input-control"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </Field>
                <Field label="First name">
                  <input
                    className="input-control"
                    value={profileForm.firstName}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Last name">
                  <input
                    className="input-control"
                    value={profileForm.lastName}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Email">
                  <input className="input-control bg-slate-100" value={profileForm.email} disabled />
                </Field>
                <Field label="Profile photo URL">
                  <input
                    className="input-control"
                    value={profileForm.avatar}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, avatar: event.target.value }))
                    }
                  />
                </Field>
              </form>
            </Section>

            <Section
              icon={Bell}
              title="Notification Preferences"
              action={
                <button
                  onClick={savePreferences}
                  disabled={saving === "preferences"}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              }
            >
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-2 pr-4 font-semibold">Event</th>
                      {channels.map((channel) => (
                        <th key={channel} className="px-4 py-2 text-center font-semibold capitalize">
                          {channel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notificationRows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-800">{row.label}</td>
                        {channels.map((channel) => (
                          <td key={channel} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(notificationPreferences[row.key]?.[channel])}
                              onChange={(event) =>
                                updateNotificationChannel(row.key, channel, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                              aria-label={`${row.label} ${channel}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              icon={Eye}
              title="Privacy and Locale"
              action={
                <button
                  onClick={savePreferences}
                  disabled={saving === "preferences"}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Wishlist visibility">
                  <select
                    className="input-control"
                    value={privacy.wishlistVisibility}
                    onChange={(event) =>
                      setPrivacy((prev) => ({ ...prev, wishlistVisibility: event.target.value }))
                    }
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Review history">
                  <select
                    className="input-control"
                    value={privacy.reviewHistoryVisibility}
                    onChange={(event) =>
                      setPrivacy((prev) => ({ ...prev, reviewHistoryVisibility: event.target.value }))
                    }
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("profile.languageLabel")}>
                  <select
                    className="input-control"
                    value={appPreferences.language}
                    onChange={(event) =>
                      setAppPreferences((prev) => ({ ...prev, language: event.target.value }))
                    }
                  >
                    <option value="en">{t("profile.english")}</option>
                    <option value="bn">{t("profile.bangla")}</option>
                  </select>
                </Field>
                <Field label={t("profile.currencyLabel")}>
                  <select
                    className="input-control"
                    value={appPreferences.currency}
                    onChange={(event) =>
                      setAppPreferences((prev) => ({ ...prev, currency: event.target.value }))
                    }
                  >
                    <option value="BDT">BDT</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Toggle
                    checked={privacy.personalization}
                    onChange={(checked) =>
                      setPrivacy((prev) => ({ ...prev, personalization: checked }))
                    }
                    label="Personalized recommendations"
                  />
                </div>
              </div>
            </Section>

            <Section icon={WalletCards} title="Saved Payment Methods">
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {savedPaymentMethods.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 sm:col-span-2">
                    No saved payment methods.
                  </div>
                ) : (
                  savedPaymentMethods.map((method) => (
                    <div key={method.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <CreditCard className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-950">{method.label}</p>
                            <p className="text-sm capitalize text-slate-500">
                              {method.type} - {method.maskedAccount || `**** ${method.last4}`}
                            </p>
                            {method.isDefault && (
                              <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removePaymentMethod(method.id)}
                          disabled={saving === method.id}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
                          title="Delete payment method"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={addPaymentMethod} className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                <Field label="Type">
                  <select
                    className="input-control"
                    value={paymentForm.type}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, type: event.target.value }))
                    }
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="card">Card last 4</option>
                  </select>
                </Field>
                <Field label="Label">
                  <input
                    className="input-control"
                    value={paymentForm.label}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                    placeholder="Personal bKash"
                  />
                </Field>
                {paymentForm.type === "card" ? (
                  <Field label="Card last 4">
                    <input
                      className="input-control"
                      value={paymentForm.last4}
                      maxLength={4}
                      pattern="[0-9]{4}"
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, last4: event.target.value.replace(/\D/g, "") }))
                      }
                      required
                    />
                  </Field>
                ) : (
                  <Field label="MFS number">
                    <input
                      className="input-control"
                      value={paymentForm.accountNumber}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, accountNumber: event.target.value }))
                      }
                      required
                    />
                  </Field>
                )}
                <div className="flex items-end justify-between gap-3">
                  <Toggle
                    checked={paymentForm.isDefault}
                    onChange={(checked) =>
                      setPaymentForm((prev) => ({ ...prev, isDefault: checked }))
                    }
                    label="Default"
                  />
                  <button
                    type="submit"
                    disabled={saving === "payment"}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </form>
            </Section>
          </div>

          <div className="space-y-6">
            <Section icon={MapPin} title="Address Book">
              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Multiple saved addresses</p>
                <p className="mt-1 text-emerald-800">
                  Default address, edit/delete controls, and Leaflet map pins are managed here.
                </p>
              </div>
              <Link
                to="/addresses"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <MapPin className="h-4 w-4" />
                Manage Addresses
              </Link>
            </Section>

            <Section icon={KeyRound} title="Two-Factor Authentication">
              <div className="mb-4 flex items-center gap-2">
                {twoFactorEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                )}
                <span className="text-sm font-semibold text-slate-800">
                  {twoFactorEnabled ? "Authenticator enabled" : "Authenticator not enabled"}
                </span>
              </div>

              {!twoFactorEnabled && !twoFactorSetup && (
                <button
                  onClick={startTwoFactorSetup}
                  disabled={saving === "2fa-setup"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  Set Up 2FA
                </button>
              )}

              {twoFactorSetup && (
                <form onSubmit={verifyTwoFactor} className="space-y-3">
                  <Field label="Manual key">
                    <input className="input-control font-mono" value={twoFactorSetup.manualEntryKey} readOnly />
                  </Field>
                  <Field label="Authenticator code">
                    <input
                      className="input-control"
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value)}
                      required
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={saving === "2fa-verify"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify
                  </button>
                </form>
              )}

              {twoFactorEnabled && (
                <form onSubmit={turnOffTwoFactor} className="space-y-3">
                  <Field label="Authenticator code">
                    <input
                      className="input-control"
                      value={disableCode}
                      onChange={(event) => setDisableCode(event.target.value)}
                      required
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={saving === "2fa-disable"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Disable 2FA
                  </button>
                </form>
              )}
            </Section>

            <Section icon={Clock3} title="Login Activity">
              <div className="space-y-3">
                {loginActivity.length === 0 ? (
                  <p className="text-sm text-slate-500">No login activity yet.</p>
                ) : (
                  loginActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id || activity.at} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDateTime(activity.at)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {activity.device || "Unknown device"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {activity.location || "Unknown location"} - {activity.ip || "unknown IP"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section icon={Languages} title="Data and Account">
              <div className="space-y-3">
                <button
                  onClick={downloadDataExport}
                  disabled={saving === "export"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Download Data
                </button>
                <textarea
                  className="input-control h-24 py-2"
                  value={deletionReason}
                  onChange={(event) => setDeletionReason(event.target.value)}
                  placeholder="Deletion reason"
                />
                <button
                  onClick={submitDeletionRequest}
                  disabled={saving === "delete" || deletionPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
