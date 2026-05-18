import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarOff,
  CheckCircle2,
  Copy,
  Edit3,
  History,
  Info,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  MonitorSmartphone,
  Plus,
  Save,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Star,
  Trash2,
  Truck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  cancelVacationMode,
  disableVendorTwoFactor,
  getMyVendorProfile,
  getNotificationPreferences,
  getShopStatus,
  getVendorStaff,
  getVendorStaffAudit,
  inviteVendorStaff,
  removeVendorStaff,
  setVacationMode,
  setupVendorTwoFactor,
  updateVendorStaff,
  updateMyVendorProfile,
  updateNotificationPreferences,
  verifyVendorTwoFactor,
} from "../../services/api";
import {
  buildVendorPermissionMatrix,
  describeVendorPermission,
  getVendorRolePreset,
  normalizeVendorPermissions,
  VENDOR_ROLE_PRESETS,
} from "../../utils/vendorStaffPermissions";

const payoutTypes = [
  { value: "bkash", label: "bKash", icon: Smartphone },
  { value: "nagad", label: "Nagad", icon: Smartphone },
  { value: "bank", label: "Bank account", icon: Landmark },
];

const staffRoles = VENDOR_ROLE_PRESETS;

const notificationEvents = [
  { key: "new_order", label: "New order", description: "Order created or payment confirmed" },
  { key: "shipment_due", label: "Shipment SLA", description: "Orders close to ship deadline" },
  { key: "return_request", label: "Return request", description: "Buyer opened or updated a return" },
  { key: "payout_update", label: "Payout update", description: "Payout released, held, or failed" },
  { key: "low_stock", label: "Low stock", description: "SKU stock falls below threshold" },
  { key: "campaign_alert", label: "Campaign alert", description: "Campaign eligibility or deadline" },
  { key: "customer_message", label: "Customer message", description: "Buyer message needs reply" },
];

const tabs = [
  { id: "payouts", label: "Payouts", icon: Landmark },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "vacation", label: "Vacation", icon: CalendarOff },
  { id: "staff", label: "Staff", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
];

const channels = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "push", label: "Push", icon: MonitorSmartphone },
];

const emptyPayoutAccount = () => ({
  id: "",
  type: "bkash",
  label: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
  branchName: "",
  routingNumber: "",
  isDefault: false,
});

const emptyAddress = () => ({
  id: "",
  label: "",
  contactName: "",
  phone: "",
  street: "",
  area: "",
  city: "",
  district: "",
  division: "",
  postalCode: "",
  country: "Bangladesh",
  notes: "",
  isDefault: false,
});

const emptyReturnAddress = () => ({
  ...emptyAddress(),
  label: "Return address",
});

const defaultDeliverySettings = () => ({
  selfDeliveryEnabled: true,
  pickupEnabled: true,
  sameUnionFee: 30,
  sameUpazilaFee: 50,
  sameDistrictFee: 80,
  outsideDistrictFee: 120,
  freeDeliveryThreshold: 0,
  perishableFee: 20,
  handlingFee: 0,
  orderCutoffHour: 14,
  preparationTime: "1-2 days",
  defaultCourier: "Platform courier",
});

const defaultNotifications = () =>
  notificationEvents.reduce((acc, event) => {
    acc[event.key] = { email: true, sms: false, push: true };
    return acc;
  }, {});

const getApiError = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

const readData = (response) => response?.data?.data ?? response?.data;

const makeClientId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const getLegacyAccounts = (vendor) => {
  const accounts = [];

  if (vendor?.mobileBankingProvider || vendor?.mobileBankingNumber) {
    accounts.push({
      id: "legacy_mobile",
      type: vendor.mobileBankingProvider || "bkash",
      label: vendor.mobileBankingProvider || "Mobile banking",
      accountName: vendor.bankAccountName || "",
      accountNumber: vendor.mobileBankingNumber || "",
      isDefault: vendor.payoutMethod !== "bank_transfer",
    });
  }

  if (vendor?.bankName || vendor?.bankAccountNumber) {
    accounts.push({
      id: "legacy_bank",
      type: "bank",
      label: vendor.bankName || "Bank account",
      accountName: vendor.bankAccountName || "",
      accountNumber: vendor.bankAccountNumber || "",
      bankName: vendor.bankName || "",
      branchName: vendor.bankBranch || "",
      isDefault: vendor.payoutMethod === "bank_transfer",
    });
  }

  return accounts;
};

const normalizeAccounts = (vendor) => {
  const accounts = Array.isArray(vendor?.payoutAccounts) && vendor.payoutAccounts.length
    ? vendor.payoutAccounts
    : getLegacyAccounts(vendor);

  const defaultIndex = accounts.findIndex((account) => account.isDefault);
  return accounts.map((account, index) => ({
    ...emptyPayoutAccount(),
    ...account,
    id: account.id || account._id || makeClientId("pay"),
    type: String(account.type || account.provider || "bkash").toLowerCase(),
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
};

const normalizeAddresses = (vendor) => {
  const addresses = Array.isArray(vendor?.pickupAddresses) ? vendor.pickupAddresses : [];
  const defaultIndex = addresses.findIndex((address) => address.isDefault);

  return addresses.map((address, index) => ({
    ...emptyAddress(),
    ...address,
    id: address.id || address._id || makeClientId("pickup"),
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
};

const normalizeNotifications = (vendorPreferences = {}, pushPreferences = {}) => {
  const defaults = defaultNotifications();
  const combined = { ...defaults, ...vendorPreferences, ...pushPreferences };

  return notificationEvents.reduce((acc, event) => {
    acc[event.key] = {
      ...defaults[event.key],
      ...(typeof combined[event.key] === "object" ? combined[event.key] : {}),
    };
    return acc;
  }, {});
};

const normalizeDeliverySettings = (vendor) => ({
  ...defaultDeliverySettings(),
  ...(vendor?.deliverySettings || {}),
});

const formatDateValue = (date) => {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const defaultStaffRole = getVendorRolePreset("order-manager");

const emptyStaffForm = () => ({
  id: "",
  name: "",
  email: "",
  role: defaultStaffRole.id,
  status: "active",
  permissions: defaultStaffRole.permissions,
});

const VendorSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("payouts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [shopStatus, setShopStatus] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffAudit, setStaffAudit] = useState([]);

  const [payoutAccounts, setPayoutAccounts] = useState([]);
  const [accountForm, setAccountForm] = useState(emptyPayoutAccount);
  const [editingAccountId, setEditingAccountId] = useState("");

  const [pickupAddresses, setPickupAddresses] = useState([]);
  const [pickupForm, setPickupForm] = useState(emptyAddress);
  const [editingPickupId, setEditingPickupId] = useState("");
  const [returnAddress, setReturnAddress] = useState(emptyReturnAddress);
  const [deliverySettings, setDeliverySettings] = useState(defaultDeliverySettings);
  const [shippingNotes, setShippingNotes] = useState("");
  const [processingTime, setProcessingTime] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");

  const [vacationForm, setVacationForm] = useState({
    vacationStart: "",
    vacationEnd: "",
    vacationReason: "",
    buyerMessage: "",
  });

  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [editingStaffId, setEditingStaffId] = useState("");

  const [notificationPreferences, setNotificationPreferences] = useState(defaultNotifications);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const showNotice = useCallback((type, text) => {
    setNotice({ type, text });
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [profileResponse, statusResponse, staffResponse, auditResponse, preferenceResponse] = await Promise.allSettled([
        getMyVendorProfile(),
        getShopStatus(),
        getVendorStaff(),
        getVendorStaffAudit({ limit: 30 }),
        getNotificationPreferences(),
      ]);

      if (profileResponse.status !== "fulfilled") {
        throw profileResponse.reason;
      }

      const profileData = readData(profileResponse.value);
      const nextVendor = profileData?.vendor || profileResponse.value?.data?.vendor || profileData;
      setVendor(nextVendor);
      setPayoutAccounts(normalizeAccounts(nextVendor));
      setPickupAddresses(normalizeAddresses(nextVendor));
      setDeliverySettings(normalizeDeliverySettings(nextVendor));
      setShippingNotes(nextVendor?.shippingNotes || "");
      setProcessingTime(nextVendor?.processingTime || nextVendor?.deliverySettings?.preparationTime || "");
      setReturnPolicy(nextVendor?.returnPolicy || "");
      setReturnAddress({
        ...emptyReturnAddress(),
        ...(nextVendor?.returnAddress || {}),
        id: nextVendor?.returnAddress?.id || makeClientId("return"),
      });

      const statusData = statusResponse.status === "fulfilled" ? readData(statusResponse.value) : null;
      setShopStatus(statusData || null);
      const vacationMode = statusData?.vacationMode || nextVendor?.vacationMode || {};
      setVacationForm({
        vacationStart: formatDateValue(vacationMode.startDate),
        vacationEnd: formatDateValue(vacationMode.endDate),
        vacationReason: vacationMode.reason || "",
        buyerMessage: vacationMode.buyerMessage || vacationMode.message || "",
      });

      const staffData = staffResponse.status === "fulfilled" ? readData(staffResponse.value) : [];
      setStaff(Array.isArray(staffData) ? staffData : staffData?.data || []);

      const auditData = auditResponse.status === "fulfilled" ? readData(auditResponse.value) : [];
      setStaffAudit(Array.isArray(auditData) ? auditData : auditData?.data || []);

      const pushPreferences = preferenceResponse.status === "fulfilled" ? readData(preferenceResponse.value) : {};
      setNotificationPreferences(normalizeNotifications(nextVendor?.notificationPreferences, pushPreferences));
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  }, [showNotice, user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveVendorProfile = async (payload, successMessage) => {
    setSaving("profile");
    try {
      const response = await updateMyVendorProfile(payload);
      const nextVendor = response?.data?.vendor || readData(response)?.vendor || vendor;
      setVendor(nextVendor);
      showNotice("success", successMessage);
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to save settings"));
    } finally {
      setSaving("");
    }
  };

  const resetAccountForm = () => {
    setAccountForm(emptyPayoutAccount());
    setEditingAccountId("");
  };

  const submitAccount = (event) => {
    event.preventDefault();

    if (!accountForm.accountNumber.trim()) {
      showNotice("error", "Account number is required");
      return;
    }

    if (accountForm.type === "bank" && !accountForm.bankName.trim()) {
      showNotice("error", "Bank name is required");
      return;
    }

    const selectedType = payoutTypes.find((type) => type.value === accountForm.type);
    const nextAccount = {
      ...accountForm,
      id: editingAccountId || accountForm.id || makeClientId("pay"),
      label:
        accountForm.label ||
        (accountForm.type === "bank" ? accountForm.bankName || "Bank account" : selectedType?.label || accountForm.type),
    };

    setPayoutAccounts((accounts) => {
      const existingAccounts = editingAccountId
        ? accounts.map((account) => (account.id === editingAccountId ? nextAccount : account))
        : [...accounts, { ...nextAccount, isDefault: accounts.length === 0 || nextAccount.isDefault }];
      const defaultIndex = existingAccounts.findIndex((account) => account.isDefault);

      return existingAccounts.map((account, index) => ({
        ...account,
        isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
      }));
    });
    resetAccountForm();
  };

  const editAccount = (account) => {
    setEditingAccountId(account.id);
    setAccountForm({ ...emptyPayoutAccount(), ...account });
  };

  const removeAccount = (id) => {
    setPayoutAccounts((accounts) => {
      const remaining = accounts.filter((account) => account.id !== id);
      if (!remaining.length) return remaining;
      const hasDefault = remaining.some((account) => account.isDefault);
      return remaining.map((account, index) => ({
        ...account,
        isDefault: hasDefault ? account.isDefault : index === 0,
      }));
    });
  };

  const setDefaultAccount = (id) => {
    setPayoutAccounts((accounts) =>
      accounts.map((account) => ({ ...account, isDefault: account.id === id })),
    );
  };

  const savePayoutAccounts = () => {
    saveVendorProfile({ payoutAccounts }, "Payout accounts saved");
  };

  const resetPickupForm = () => {
    setPickupForm(emptyAddress());
    setEditingPickupId("");
  };

  const submitPickupAddress = (event) => {
    event.preventDefault();

    if (!pickupForm.street.trim() || !pickupForm.phone.trim()) {
      showNotice("error", "Pickup street address and phone are required");
      return;
    }

    const nextAddress = {
      ...pickupForm,
      id: editingPickupId || pickupForm.id || makeClientId("pickup"),
      label: pickupForm.label || "Warehouse",
    };

    setPickupAddresses((addresses) => {
      const nextAddresses = editingPickupId
        ? addresses.map((address) => (address.id === editingPickupId ? nextAddress : address))
        : [...addresses, { ...nextAddress, isDefault: addresses.length === 0 || nextAddress.isDefault }];
      const defaultIndex = nextAddresses.findIndex((address) => address.isDefault);

      return nextAddresses.map((address, index) => ({
        ...address,
        isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
      }));
    });
    resetPickupForm();
  };

  const editPickupAddress = (address) => {
    setEditingPickupId(address.id);
    setPickupForm({ ...emptyAddress(), ...address });
  };

  const removePickupAddress = (id) => {
    setPickupAddresses((addresses) => {
      const remaining = addresses.filter((address) => address.id !== id);
      if (!remaining.length) return remaining;
      const hasDefault = remaining.some((address) => address.isDefault);
      return remaining.map((address, index) => ({
        ...address,
        isDefault: hasDefault ? address.isDefault : index === 0,
      }));
    });
  };

  const setDefaultPickupAddress = (id) => {
    setPickupAddresses((addresses) =>
      addresses.map((address) => ({ ...address, isDefault: address.id === id })),
    );
  };

  const saveAddresses = () => {
    saveVendorProfile(
      {
        pickupAddresses,
        returnAddress,
        deliverySettings,
        shippingNotes,
        processingTime,
        returnPolicy,
      },
      "Fulfillment settings saved",
    );
  };

  const saveVacation = async (event) => {
    event.preventDefault();
    setSaving("vacation");
    try {
      await setVacationMode(vacationForm);
      showNotice("success", "Vacation mode saved");
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to save vacation mode"));
    } finally {
      setSaving("");
    }
  };

  const cancelVacation = async () => {
    setSaving("vacation");
    try {
      await cancelVacationMode();
      setVacationForm({ vacationStart: "", vacationEnd: "", vacationReason: "", buyerMessage: "" });
      showNotice("success", "Vacation mode cancelled");
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to cancel vacation mode"));
    } finally {
      setSaving("");
    }
  };

  const resetStaffForm = () => {
    setStaffForm(emptyStaffForm());
    setEditingStaffId("");
  };

  const changeStaffRole = (roleId) => {
    if (roleId === "custom") {
      setStaffForm((form) => ({ ...form, role: "custom" }));
      return;
    }

    const role = getVendorRolePreset(roleId);
    setStaffForm((form) => ({
      ...form,
      role: role.id,
      permissions: role.permissions,
    }));
  };

  const toggleStaffPermission = (permission) => {
    setStaffForm((form) => {
      const current = new Set(normalizeVendorPermissions({ permissions: form.permissions }));
      if (current.has(permission)) {
        current.delete(permission);
      } else {
        current.add(permission);
      }

      return {
        ...form,
        role: "custom",
        permissions: [...current],
      };
    });
  };

  const editStaff = (member) => {
    const permissions = normalizeVendorPermissions({ permissions: member.permissions || [] });
    const matchingRole = staffRoles.find((role) => {
      const rolePermissions = normalizeVendorPermissions({ permissions: role.permissions });
      return rolePermissions.length === permissions.length && rolePermissions.every((permission) => permissions.includes(permission));
    });

    setEditingStaffId(member._id || member.id);
    setStaffForm({
      id: member._id || member.id || "",
      name: member.name || "",
      email: member.email || "",
      role: matchingRole?.id || "custom",
      status: member.status || "active",
      permissions,
    });
  };

  const submitStaffInvite = async (event) => {
    event.preventDefault();
    const selectedPermissions = normalizeVendorPermissions({ permissions: staffForm.permissions });

    if (!editingStaffId && !staffForm.email.trim()) {
      showNotice("error", "Staff email is required");
      return;
    }

    if (selectedPermissions.length === 0) {
      showNotice("error", "Select at least one staff permission");
      return;
    }

    setSaving("staff");
    try {
      if (editingStaffId) {
        await updateVendorStaff(editingStaffId, {
          name: staffForm.name,
          status: staffForm.status,
          permissions: selectedPermissions,
        });
        showNotice("success", "Staff permissions updated");
      } else {
        await inviteVendorStaff({
          name: staffForm.name,
          email: staffForm.email,
          role: staffForm.role,
          permissions: selectedPermissions,
        });
        showNotice("success", "Staff invite created");
      }
      resetStaffForm();
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, editingStaffId ? "Failed to update staff" : "Failed to invite staff"));
    } finally {
      setSaving("");
    }
  };

  const deleteStaff = async (id) => {
    setSaving("staff");
    try {
      await removeVendorStaff(id);
      showNotice("success", "Staff account removed");
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to remove staff"));
    } finally {
      setSaving("");
    }
  };

  const toggleNotification = (eventKey, channel) => {
    setNotificationPreferences((preferences) => ({
      ...preferences,
      [eventKey]: {
        ...(preferences[eventKey] || {}),
        [channel]: !preferences[eventKey]?.[channel],
      },
    }));
  };

  const saveNotifications = async () => {
    setSaving("notifications");
    try {
      await Promise.all([
        updateNotificationPreferences(notificationPreferences),
        updateMyVendorProfile({ notificationPreferences }),
      ]);
      showNotice("success", "Notification preferences saved");
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to save notification preferences"));
    } finally {
      setSaving("");
    }
  };

  const startTwoFactorSetup = async () => {
    setSaving("security");
    try {
      const response = await setupVendorTwoFactor();
      const setup = readData(response);
      let qrCode = "";

      try {
        const qrModule = await import("qrcode");
        const toDataURL = qrModule.toDataURL || qrModule.default?.toDataURL;
        qrCode = toDataURL ? await toDataURL(setup.otpauthUrl, { margin: 1, width: 180 }) : "";
      } catch (qrError) {
        console.warn("QR code generation failed:", qrError);
      }

      setTwoFactorSetup({ ...setup, qrCode });
      showNotice("success", "Authenticator setup started");
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to start 2FA setup"));
    } finally {
      setSaving("");
    }
  };

  const confirmTwoFactorSetup = async (event) => {
    event.preventDefault();
    setSaving("security");
    try {
      await verifyVendorTwoFactor(twoFactorCode);
      setTwoFactorCode("");
      setTwoFactorSetup(null);
      showNotice("success", "Two-factor authentication enabled");
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Invalid authenticator code"));
    } finally {
      setSaving("");
    }
  };

  const turnOffTwoFactor = async (event) => {
    event.preventDefault();
    setSaving("security");
    try {
      await disableVendorTwoFactor(disableCode);
      setDisableCode("");
      showNotice("success", "Two-factor authentication disabled");
      await loadSettings();
    } catch (error) {
      showNotice("error", getApiError(error, "Failed to disable 2FA"));
    } finally {
      setSaving("");
    }
  };

  const activeAccount = useMemo(
    () => payoutAccounts.find((account) => account.isDefault) || payoutAccounts[0],
    [payoutAccounts],
  );
  const defaultPickup = useMemo(
    () => pickupAddresses.find((address) => address.isDefault) || pickupAddresses[0],
    [pickupAddresses],
  );
  const twoFactorEnabled = Boolean(vendor?.security?.twoFactor?.enabled);
  const vacationEnabled = Boolean(shopStatus?.vacationMode?.enabled || vendor?.vacationMode?.enabled);
  const staffPermissionMatrix = useMemo(
    () => buildVendorPermissionMatrix(staffForm.permissions),
    [staffForm.permissions],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-lg border border-slate-200 bg-white p-10">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-orange-600" />
          <span className="text-sm font-semibold text-slate-700">Loading vendor settings</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
              Vendor control center
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Settings</h1>
            <p className="mt-1 text-sm text-slate-600">
              {vendor?.shopName || "Your shop"} can manage payouts, fulfillment, people, alerts, and security here.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Default payout</p>
              <p className="mt-1 font-semibold text-slate-900">{activeAccount?.label || "Not set"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Default pickup</p>
              <p className="mt-1 font-semibold text-slate-900">{defaultPickup?.label || "Not set"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">2FA</p>
              <p className={`mt-1 font-semibold ${twoFactorEnabled ? "text-emerald-700" : "text-amber-700"}`}>
                {twoFactorEnabled ? "Enabled" : "Not enabled"}
              </p>
            </div>
          </div>
        </div>

        {notice && (
          <div
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-max items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "payouts" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Bank and MFS details</h2>
                  <p className="text-sm text-slate-600">Add bKash, Nagad, and bank payout accounts.</p>
                </div>
                <button
                  type="button"
                  onClick={savePayoutAccounts}
                  disabled={saving === "profile"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  {saving === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save payouts
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {payoutAccounts.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No payout account added yet.
                  </div>
                )}

                {payoutAccounts.map((account) => {
                  const type = payoutTypes.find((item) => item.value === account.type) || payoutTypes[0];
                  const Icon = type.icon;
                  return (
                    <div key={account.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-950">{account.label || type.label}</h3>
                              {account.isDefault && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  <Star className="h-3 w-3" />
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              {type.label} {account.accountNumber ? `- ${account.accountNumber}` : ""}
                            </p>
                            {account.type === "bank" && (
                              <p className="text-xs text-slate-500">
                                {account.bankName || "Bank"} {account.branchName ? `, ${account.branchName}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!account.isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultAccount(account.id)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Make default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => editAccount(account)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            aria-label="Edit payout account"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAccount(account.id)}
                            className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                            aria-label="Remove payout account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                {editingAccountId ? "Edit payout account" : "Add payout account"}
              </h2>
              <form onSubmit={submitAccount} className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Type</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {payoutTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAccountForm((form) => ({ ...form, type: type.value }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          accountForm.type === type.value
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field
                  label="Label"
                  value={accountForm.label}
                  onChange={(value) => setAccountForm((form) => ({ ...form, label: value }))}
                  placeholder="Primary bKash"
                />
                <Field
                  label="Account holder"
                  value={accountForm.accountName}
                  onChange={(value) => setAccountForm((form) => ({ ...form, accountName: value }))}
                  placeholder="Account holder name"
                />
                <Field
                  label="Account number"
                  value={accountForm.accountNumber}
                  onChange={(value) => setAccountForm((form) => ({ ...form, accountNumber: value }))}
                  placeholder="01XXXXXXXXX"
                />
                {accountForm.type === "bank" && (
                  <>
                    <Field
                      label="Bank name"
                      value={accountForm.bankName}
                      onChange={(value) => setAccountForm((form) => ({ ...form, bankName: value }))}
                      placeholder="Bank name"
                    />
                    <Field
                      label="Branch"
                      value={accountForm.branchName}
                      onChange={(value) => setAccountForm((form) => ({ ...form, branchName: value }))}
                      placeholder="Branch name"
                    />
                    <Field
                      label="Routing number"
                      value={accountForm.routingNumber}
                      onChange={(value) => setAccountForm((form) => ({ ...form, routingNumber: value }))}
                      placeholder="Optional"
                    />
                  </>
                )}
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={accountForm.isDefault}
                    onChange={(event) => setAccountForm((form) => ({ ...form, isDefault: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600"
                  />
                  Set as default payout account
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    {editingAccountId ? "Update" : "Add"}
                  </button>
                  {editingAccountId && (
                    <button
                      type="button"
                      onClick={resetAccountForm}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}

        {activeTab === "addresses" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Pickup addresses</h2>
                  <p className="text-sm text-slate-600">Manage warehouses and courier pickup points.</p>
                </div>
                <button
                  type="button"
                  onClick={saveAddresses}
                  disabled={saving === "profile"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  {saving === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save addresses
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {pickupAddresses.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No pickup address added yet.
                  </div>
                )}
                {pickupAddresses.map((address) => (
                  <div key={address.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">{address.label || "Warehouse"}</h3>
                            {address.isDefault && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{address.street}</p>
                          <p className="text-xs text-slate-500">
                            {[address.area, address.city, address.district].filter(Boolean).join(", ")}
                          </p>
                          <p className="text-xs text-slate-500">{address.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefaultPickupAddress(address.id)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Make default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => editPickupAddress(address)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          aria-label="Edit pickup address"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePickupAddress(address.id)}
                          className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                          aria-label="Remove pickup address"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  {editingPickupId ? "Edit pickup address" : "Add pickup address"}
                </h2>
                <form onSubmit={submitPickupAddress} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Label"
                    value={pickupForm.label}
                    onChange={(value) => setPickupForm((form) => ({ ...form, label: value }))}
                    placeholder="Dhaka warehouse"
                  />
                  <Field
                    label="Contact"
                    value={pickupForm.contactName}
                    onChange={(value) => setPickupForm((form) => ({ ...form, contactName: value }))}
                    placeholder="Pickup contact"
                  />
                  <Field
                    label="Phone"
                    value={pickupForm.phone}
                    onChange={(value) => setPickupForm((form) => ({ ...form, phone: value }))}
                    placeholder="01XXXXXXXXX"
                  />
                  <Field
                    label="District"
                    value={pickupForm.district}
                    onChange={(value) => setPickupForm((form) => ({ ...form, district: value }))}
                    placeholder="Dhaka"
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Street"
                    value={pickupForm.street}
                    onChange={(value) => setPickupForm((form) => ({ ...form, street: value }))}
                    placeholder="House, road, area"
                  />
                  <Field
                    label="Area"
                    value={pickupForm.area}
                    onChange={(value) => setPickupForm((form) => ({ ...form, area: value }))}
                    placeholder="Mirpur"
                  />
                  <Field
                    label="City"
                    value={pickupForm.city}
                    onChange={(value) => setPickupForm((form) => ({ ...form, city: value }))}
                    placeholder="Dhaka"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={pickupForm.isDefault}
                      onChange={(event) => setPickupForm((form) => ({ ...form, isDefault: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600"
                    />
                    Set as default pickup address
                  </label>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:col-span-2"
                  >
                    <Plus className="h-4 w-4" />
                    {editingPickupId ? "Update pickup address" : "Add pickup address"}
                  </button>
                </form>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Return address</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Contact"
                    value={returnAddress.contactName}
                    onChange={(value) => setReturnAddress((form) => ({ ...form, contactName: value }))}
                    placeholder="Returns contact"
                  />
                  <Field
                    label="Phone"
                    value={returnAddress.phone}
                    onChange={(value) => setReturnAddress((form) => ({ ...form, phone: value }))}
                    placeholder="01XXXXXXXXX"
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Street"
                    value={returnAddress.street}
                    onChange={(value) => setReturnAddress((form) => ({ ...form, street: value }))}
                    placeholder="Separate return address"
                  />
                  <Field
                    label="City"
                    value={returnAddress.city}
                    onChange={(value) => setReturnAddress((form) => ({ ...form, city: value }))}
                    placeholder="City"
                  />
                  <Field
                    label="District"
                    value={returnAddress.district}
                    onChange={(value) => setReturnAddress((form) => ({ ...form, district: value }))}
                    placeholder="District"
                  />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Shipping rules</h2>
                    <p className="text-sm text-slate-600">These values power seller promises, delivery notes, and pickup defaults.</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Preparation time"
                    value={deliverySettings.preparationTime}
                    onChange={(value) => {
                      setDeliverySettings((settings) => ({ ...settings, preparationTime: value }));
                      setProcessingTime(value);
                    }}
                    placeholder="1-2 days"
                  />
                  <Field
                    label="Default courier"
                    value={deliverySettings.defaultCourier}
                    onChange={(value) => setDeliverySettings((settings) => ({ ...settings, defaultCourier: value }))}
                    placeholder="Platform courier"
                  />
                  <Field
                    type="number"
                    label="Cutoff hour"
                    value={deliverySettings.orderCutoffHour}
                    onChange={(value) => setDeliverySettings((settings) => ({ ...settings, orderCutoffHour: value }))}
                    placeholder="14"
                  />
                  <Field
                    type="number"
                    label="Free delivery above"
                    value={deliverySettings.freeDeliveryThreshold}
                    onChange={(value) => setDeliverySettings((settings) => ({ ...settings, freeDeliveryThreshold: value }))}
                    placeholder="0"
                  />
                  <Field
                    type="number"
                    label="Same district fee"
                    value={deliverySettings.sameDistrictFee}
                    onChange={(value) => setDeliverySettings((settings) => ({ ...settings, sameDistrictFee: value }))}
                    placeholder="80"
                  />
                  <Field
                    type="number"
                    label="Outside district fee"
                    value={deliverySettings.outsideDistrictFee}
                    onChange={(value) => setDeliverySettings((settings) => ({ ...settings, outsideDistrictFee: value }))}
                    placeholder="120"
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(deliverySettings.pickupEnabled)}
                      onChange={(event) => setDeliverySettings((settings) => ({ ...settings, pickupEnabled: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600"
                    />
                    Buyer pickup allowed
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(deliverySettings.selfDeliveryEnabled)}
                      onChange={(event) => setDeliverySettings((settings) => ({ ...settings, selfDeliveryEnabled: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600"
                    />
                    Seller delivery supported
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Shipping note</span>
                    <textarea
                      value={shippingNotes}
                      onChange={(event) => setShippingNotes(event.target.value)}
                      rows={3}
                      placeholder="Courier across Bangladesh. Fresh items ship inside the cutoff window."
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Return policy summary</span>
                    <textarea
                      value={returnPolicy}
                      onChange={(event) => setReturnPolicy(event.target.value)}
                      rows={3}
                      placeholder="Example: Returns accepted within 3 days for damaged or wrong items."
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                </div>

                <div className="mt-4 flex gap-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs text-sky-800">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>
                    Admin delivery-zone rules still control final checkout fees. Vendor values here explain readiness,
                    pickup preference, and seller-funded delivery promises.
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "vacation" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Holiday and vacation mode</h2>
                <p className="text-sm text-slate-600">Pause new orders and show buyers a return message.</p>
              </div>
              <span
                className={`inline-flex w-max rounded-full px-3 py-1 text-xs font-semibold ${
                  vacationEnabled ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {vacationEnabled ? "Vacation active" : "Accepting orders"}
              </span>
            </div>

            <form onSubmit={saveVacation} className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field
                type="datetime-local"
                label="Start"
                value={vacationForm.vacationStart}
                onChange={(value) => setVacationForm((form) => ({ ...form, vacationStart: value }))}
              />
              <Field
                type="datetime-local"
                label="Back on"
                value={vacationForm.vacationEnd}
                onChange={(value) => setVacationForm((form) => ({ ...form, vacationEnd: value }))}
              />
              <Field
                label="Internal reason"
                value={vacationForm.vacationReason}
                onChange={(value) => setVacationForm((form) => ({ ...form, vacationReason: value }))}
                placeholder="Eid holiday"
              />
              <Field
                label="Buyer message"
                value={vacationForm.buyerMessage}
                onChange={(value) => setVacationForm((form) => ({ ...form, buyerMessage: value }))}
                placeholder="Back on May 25"
              />
              <div className="flex flex-col gap-2 sm:flex-row lg:col-span-2">
                <button
                  type="submit"
                  disabled={saving === "vacation"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                  {saving === "vacation" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarOff className="h-4 w-4" />}
                  Save vacation mode
                </button>
                <button
                  type="button"
                  onClick={cancelVacation}
                  disabled={saving === "vacation"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel vacation
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === "staff" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Staff accounts</h2>
                  <p className="text-sm text-slate-600">Review each team member's actual seller-center access before they operate the shop.</p>
                </div>
                <span className="w-max rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {staff.length} member{staff.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {staff.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No staff accounts invited yet.
                  </div>
                )}
                {staff.map((member) => (
                  <div key={member._id || member.id || member.email} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950">{member.name || member.email}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {member.status || "active"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{member.email}</p>
                        <PermissionSummary permissions={member.permissions || []} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editStaff(member)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit access
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStaff(member._id || member.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Staff audit trail</h2>
                  <p className="text-sm text-slate-600">Owner-only history for invites, permission edits, pauses, and removals.</p>
                </div>
                <History className="h-5 w-5 text-slate-400" />
              </div>
              <StaffAuditTrail logs={staffAudit} />
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {editingStaffId ? "Edit staff access" : "Invite team member"}
                  </h2>
                  <p className="text-sm text-slate-600">Choose a preset, then adjust the exact permissions if needed.</p>
                </div>
                {editingStaffId && (
                  <button
                    type="button"
                    onClick={resetStaffForm}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    New invite
                  </button>
                )}
              </div>
              <form onSubmit={submitStaffInvite} className="mt-4 space-y-4">
                <Field
                  label="Name"
                  value={staffForm.name}
                  onChange={(value) => setStaffForm((form) => ({ ...form, name: value }))}
                  placeholder="Team member name"
                />
                <Field
                  label="Email"
                  type="email"
                  value={staffForm.email}
                  onChange={(value) => setStaffForm((form) => ({ ...form, email: value }))}
                  placeholder="name@example.com"
                  disabled={Boolean(editingStaffId)}
                />
                <div>
                  <label className="text-sm font-semibold text-slate-700">Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(event) => changeStaffRole(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    {staffRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                    <option value="custom">Custom permissions</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {(staffRoles.find((role) => role.id === staffForm.role) || {}).description || "Custom permission set"}
                  </p>
                </div>
                {editingStaffId && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Status</label>
                    <select
                      value={staffForm.status}
                      onChange={(event) => setStaffForm((form) => ({ ...form, status: event.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="removed">Removed</option>
                    </select>
                  </div>
                )}
                <PermissionMatrix matrix={staffPermissionMatrix} onToggle={toggleStaffPermission} />
                <button
                  type="submit"
                  disabled={saving === "staff"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving === "staff" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {editingStaffId ? "Save staff access" : "Invite staff"}
                </button>
              </form>
            </section>
          </div>
        )}

        {activeTab === "notifications" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Notification preferences</h2>
                <p className="text-sm text-slate-600">Choose which vendor events trigger email, SMS, or push alerts.</p>
              </div>
              <button
                type="button"
                onClick={saveNotifications}
                disabled={saving === "notifications"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {saving === "notifications" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save notifications
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[minmax(210px,1fr)_repeat(3,86px)] bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <div className="px-4 py-3">Event</div>
                {channels.map((channel) => (
                  <div key={channel.key} className="px-3 py-3 text-center">
                    {channel.label}
                  </div>
                ))}
              </div>
              {notificationEvents.map((event) => (
                <div
                  key={event.key}
                  className="grid grid-cols-[minmax(210px,1fr)_repeat(3,86px)] border-t border-slate-200"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-950">{event.label}</p>
                    <p className="text-xs text-slate-500">{event.description}</p>
                  </div>
                  {channels.map((channel) => {
                    const Icon = channel.icon;
                    const checked = Boolean(notificationPreferences[event.key]?.[channel.key]);
                    return (
                      <div key={channel.key} className="flex items-center justify-center px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleNotification(event.key, channel.key)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${
                            checked
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                          aria-label={`${event.label} ${channel.label}`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "security" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Two-factor authentication</h2>
                <p className="text-sm text-slate-600">Protect finance, staff, and payout changes with authenticator codes.</p>
              </div>
              <span
                className={`inline-flex w-max items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  twoFactorEnabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {twoFactorEnabled ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">Authenticator app</h3>
                    <p className="text-sm text-slate-600">TOTP codes work without a paid SMS API.</p>
                  </div>
                </div>
                {!twoFactorEnabled && (
                  <button
                    type="button"
                    onClick={startTwoFactorSetup}
                    disabled={saving === "security"}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                  >
                    {saving === "security" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Start setup
                  </button>
                )}
              </div>

              {twoFactorEnabled ? (
                <form onSubmit={turnOffTwoFactor} className="rounded-lg border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-950">Disable 2FA</h3>
                  <p className="mt-1 text-sm text-slate-600">Enter your current authenticator code to turn it off.</p>
                  <Field
                    className="mt-4"
                    label="Authenticator code"
                    value={disableCode}
                    onChange={setDisableCode}
                    placeholder="123456"
                    inputMode="numeric"
                  />
                  <button
                    type="submit"
                    disabled={saving === "security"}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <ShieldOff className="h-4 w-4" />
                    Disable 2FA
                  </button>
                </form>
              ) : (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-950">Setup status</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Start setup to generate a QR code and manual secret for your authenticator app.
                  </p>
                </div>
              )}
            </div>

            {twoFactorSetup && (
              <form onSubmit={confirmTwoFactorSetup} className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="flex items-center justify-center rounded-lg bg-white p-4">
                    {twoFactorSetup.qrCode ? (
                      <img src={twoFactorSetup.qrCode} alt="2FA QR code" className="h-44 w-44" />
                    ) : (
                      <div className="text-center text-sm font-semibold text-orange-700">QR unavailable</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">Verify authenticator setup</h3>
                    <p className="mt-2 text-sm text-slate-700">
                      Manual key: <span className="font-mono font-semibold">{twoFactorSetup.manualEntryKey}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(twoFactorSetup.manualEntryKey)}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy key
                    </button>
                    <Field
                      className="mt-4 max-w-xs"
                      label="6-digit code"
                      value={twoFactorCode}
                      onChange={setTwoFactorCode}
                      placeholder="123456"
                      inputMode="numeric"
                    />
                    <button
                      type="submit"
                      disabled={saving === "security"}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {saving === "security" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Verify and enable
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  className = "",
  inputMode,
  disabled = false,
}) => (
  <div className={className}>
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    />
  </div>
);

const formatAuditTime = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const PermissionSummary = ({ permissions = [] }) => {
  const grouped = buildVendorPermissionMatrix(permissions)
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) => permission.granted),
    }))
    .filter((group) => group.permissions.length > 0);

  if (grouped.length === 0) {
    return (
      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
        No permissions assigned
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {grouped.map((group) => (
        <div key={group.id}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {group.permissions.map((permission) => (
              <span
                key={permission.value}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {permission.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const StaffAuditTrail = ({ logs = [] }) => {
  if (!logs.length) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Staff changes will appear here after the next invite or permission update.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {logs.slice(0, 8).map((log) => {
        const changes = log.changes || {};
        const added = changes.permissions?.added || [];
        const removed = changes.permissions?.removed || [];

        return (
          <div key={log._id || `${log.action}-${log.createdAt}`} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {(log.action || "staff.updated").replace("staff.", "").replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {log.staffName || log.staffEmail || "Staff member"} - {log.summary || "Access changed"}
                </p>
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                {formatAuditTime(log.createdAt)}
              </span>
            </div>
            {(added.length > 0 || removed.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {added.map((permission) => (
                  <span key={`add-${permission}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    + {permission}
                  </span>
                ))}
                {removed.map((permission) => (
                  <span key={`remove-${permission}`} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    - {permission}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const PermissionMatrix = ({ matrix = [], onToggle }) => (
  <div className="rounded-lg border border-slate-200">
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-sm font-bold text-slate-950">Permission matrix</p>
      <p className="text-xs text-slate-500">Checked items are the exact capabilities this staff member receives.</p>
    </div>
    <div className="divide-y divide-slate-100">
      {matrix.map((group) => (
        <div key={group.id} className="p-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{group.label}</p>
            <p className="text-xs text-slate-500">{group.description}</p>
          </div>
          <div className="mt-3 grid gap-2">
            {group.permissions.map((permission) => {
              const described = describeVendorPermission(permission.value);
              return (
                <label
                  key={permission.value}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                    permission.granted
                      ? "border-orange-200 bg-orange-50 text-orange-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{described.label}</span>
                  <input
                    type="checkbox"
                    checked={permission.granted}
                    onChange={() => onToggle(permission.value)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default VendorSettings;
