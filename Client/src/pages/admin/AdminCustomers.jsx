import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Gift,
  History,
  Mail,
  MapPin,
  Merge,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Star,
  Ticket,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useCurrency from "../../hooks/useCurrency";
import {
  adjustAdminCustomerLoyalty,
  getAdminCustomerDetail,
  getAdminCustomers,
  getCustomerAuditLog,
  getCustomerLoyaltyProgram,
  getReferralDashboard,
  mergeAdminCustomers,
  updateAdminCustomerStatus,
  updateCustomerLoyaltyProgram,
} from "../../services/api";

const TABS = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "profile", label: "Detail", icon: UserRound },
  { key: "loyalty", label: "Loyalty", icon: Star },
  { key: "referrals", label: "Referrals", icon: Gift },
];

const DEFAULT_FILTERS = {
  search: "",
  status: "all",
  page: 1,
  limit: 20,
};

const DEFAULT_STATUS_FORM = {
  status: "suspended",
  reason: "",
  suspensionUntil: "",
  permanent: true,
};

const DEFAULT_MERGE_FORM = {
  sourceCustomerId: "",
  targetCustomerId: "",
  reason: "",
};

const DEFAULT_LOYALTY_FORM = {
  action: "award",
  points: 100,
  reason: "",
};

const DEFAULT_PROGRAM_FORM = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 10000,
  referralCredit: 500,
  referredWelcomeCredit: 100,
  maxAccountsPerPhone: 2,
  maxAccountsPerDevice: 3,
};

const statusTone = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-amber-200 bg-amber-50 text-amber-700",
  banned: "border-red-200 bg-red-50 text-red-700",
  merged: "border-slate-200 bg-slate-100 text-slate-600",
};

const tierTone = {
  bronze: "border-orange-200 bg-orange-50 text-orange-700",
  silver: "border-slate-200 bg-slate-50 text-slate-700",
  gold: "border-yellow-200 bg-yellow-50 text-yellow-700",
  platinum: "border-indigo-200 bg-indigo-50 text-indigo-700",
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

const shortId = (id = "") => id.toString().slice(-8).toUpperCase();

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

function DetailRow({ icon: Icon, label, value, subValue }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value || "N/A"}</p>
        {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
      </div>
    </div>
  );
}

export default function AdminCustomers() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("customers");
  const [loading, setLoading] = useState(true);
  const [sideLoading, setSideLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [detail, setDetail] = useState(null);
  const [referrals, setReferrals] = useState({ summary: {}, rows: [] });
  const [program, setProgram] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [statusForm, setStatusForm] = useState(DEFAULT_STATUS_FORM);
  const [mergeForm, setMergeForm] = useState(DEFAULT_MERGE_FORM);
  const [loyaltyForm, setLoyaltyForm] = useState(DEFAULT_LOYALTY_FORM);
  const [programForm, setProgramForm] = useState(DEFAULT_PROGRAM_FORM);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer._id === selectedCustomerId) || detail?.profile || null,
    [customers, detail, selectedCustomerId],
  );

  const overview = useMemo(() => ({
    total: pagination.total || customers.length,
    active: customers.filter((customer) => customer.status === "active").length,
    restricted: customers.filter((customer) => ["suspended", "banned"].includes(customer.status)).length,
    loyaltyPoints: customers.reduce((sum, customer) => sum + Number(customer.loyaltyPoints || 0), 0),
  }), [customers, pagination.total]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await getAdminCustomers(filters);
      setCustomers(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
      if (!selectedCustomerId && response.data.data?.[0]?._id) {
        setSelectedCustomerId(response.data.data[0]._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const loadSideData = async () => {
    setSideLoading(true);
    try {
      const [referralRes, programRes, auditRes] = await Promise.all([
        getReferralDashboard(),
        getCustomerLoyaltyProgram(),
        getCustomerAuditLog(),
      ]);
      const programData = programRes.data.data || {};
      setReferrals(referralRes.data.data || { summary: {}, rows: [] });
      setProgram(programData);
      setAuditLog(auditRes.data.data || []);
      setProgramForm({
        bronze: programData.tierThresholds?.bronze ?? 0,
        silver: programData.tierThresholds?.silver ?? 1000,
        gold: programData.tierThresholds?.gold ?? 5000,
        platinum: programData.tierThresholds?.platinum ?? 10000,
        referralCredit: programData.referralCredit ?? 500,
        referredWelcomeCredit: programData.referredWelcomeCredit ?? 100,
        maxAccountsPerPhone: programData.fraudRules?.maxAccountsPerPhone ?? 2,
        maxAccountsPerDevice: programData.fraudRules?.maxAccountsPerDevice ?? 3,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load customer programme data");
    } finally {
      setSideLoading(false);
    }
  };

  const loadDetail = async (customerId = selectedCustomerId) => {
    if (!customerId) return;
    try {
      const response = await getAdminCustomerDetail(customerId);
      setDetail(response.data.data || null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load customer detail");
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [filters.page, filters.status]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1 }));
      loadCustomers();
    }, 350);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    loadSideData();
  }, []);

  useEffect(() => {
    loadDetail();
  }, [selectedCustomerId]);

  const refreshAll = async () => {
    await Promise.all([loadCustomers(), loadSideData()]);
    await loadDetail();
  };

  const selectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setActiveTab("profile");
    setMergeForm((form) => ({ ...form, targetCustomerId: customerId }));
  };

  const runAction = async (action, successMessage) => {
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const submitStatus = (event) => {
    event.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Select a customer first");
      return;
    }
    runAction(
      () => updateAdminCustomerStatus(selectedCustomerId, statusForm),
      "Customer status updated",
    );
  };

  const submitMerge = (event) => {
    event.preventDefault();
    runAction(
      () => mergeAdminCustomers(mergeForm),
      "Duplicate customer accounts merged",
    ).then(() => setMergeForm(DEFAULT_MERGE_FORM));
  };

  const submitLoyalty = (event) => {
    event.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Select a customer first");
      return;
    }
    runAction(
      () => adjustAdminCustomerLoyalty(selectedCustomerId, loyaltyForm),
      "Loyalty points updated",
    ).then(() => setLoyaltyForm(DEFAULT_LOYALTY_FORM));
  };

  const submitProgram = (event) => {
    event.preventDefault();
    runAction(
      () => updateCustomerLoyaltyProgram({
        tierThresholds: {
          bronze: Number(programForm.bronze),
          silver: Number(programForm.silver),
          gold: Number(programForm.gold),
          platinum: Number(programForm.platinum),
        },
        referralCredit: Number(programForm.referralCredit),
        referredWelcomeCredit: Number(programForm.referredWelcomeCredit),
        fraudRules: {
          maxAccountsPerPhone: Number(programForm.maxAccountsPerPhone),
          maxAccountsPerDevice: Number(programForm.maxAccountsPerDevice),
        },
      }),
      "Loyalty programme updated",
    );
  };

  if (loading && customers.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">User & Customer Management</h1>
            <p className="mt-1 text-sm text-slate-500">Customer profiles, restrictions, duplicate merges, loyalty, and referrals.</p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Users} label="Customers" value={overview.total} />
          <Metric icon={UserRound} label="Active shown" value={overview.active} tone="text-emerald-700" />
          <Metric icon={Ban} label="Restricted shown" value={overview.restricted} tone="text-red-700" />
          <Metric icon={Star} label="Loyalty points shown" value={overview.loyaltyPoints.toLocaleString()} tone="text-orange-700" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                    active ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "customers" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_120px]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input-control pl-9"
                      placeholder="Search name, phone, email"
                      value={filters.search}
                      onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                    />
                  </label>
                  <select className="input-control" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                    <option value="merged">Merged</option>
                  </select>
                  <button type="button" onClick={loadCustomers} className="rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                    Search
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">Spend</th>
                        <th className="px-4 py-3">Returns</th>
                        <th className="px-4 py-3">Loyalty</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.map((customer) => (
                        <tr key={customer._id} className="cursor-pointer hover:bg-orange-50/60" onClick={() => selectCustomer(customer._id)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-950">{customer.name}</div>
                            <div className="text-xs text-slate-500">{customer.email || customer.phone || customer.firebaseUid}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold">{customer.orderCount || 0}</td>
                          <td className="px-4 py-3 font-semibold">{formatPrice(customer.totalSpend || 0)}</td>
                          <td className="px-4 py-3">{customer.returnCount || 0}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{Number(customer.loyaltyPoints || 0).toLocaleString()}</div>
                            <Pill tone={tierTone[customer.loyaltyTier] || tierTone.bronze}>{customer.loyaltyTier || "bronze"}</Pill>
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={statusTone[customer.status] || statusTone.active}>{customer.status || "active"}</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {customers.length === 0 && <EmptyPanel>No customers found.</EmptyPanel>}
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                  <span>Page {pagination.page || filters.page} of {pagination.totalPages || 1}</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-50">Prev</button>
                    <button type="button" disabled={filters.page >= (pagination.totalPages || 1)} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-50">Next</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={submitStatus} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-bold text-slate-950">Suspend / Ban Account</h2>
                <select className="input-control" value={statusForm.status} onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value })}>
                  <option value="active">Restore active</option>
                  <option value="suspended">Temporary suspend</option>
                  <option value="banned">Permanent ban</option>
                </select>
                {statusForm.status === "suspended" && (
                  <input className="input-control" type="datetime-local" value={statusForm.suspensionUntil} onChange={(event) => setStatusForm({ ...statusForm, suspensionUntil: event.target.value })} />
                )}
                <textarea className="input-control min-h-24" placeholder="Reason sent to customer" value={statusForm.reason} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} />
                <button type="submit" disabled={saving || !selectedCustomerId} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  <ShieldAlert className="h-4 w-4" />
                  Apply status
                </button>
              </form>

              <form onSubmit={submitMerge} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-bold text-slate-950">Merge Duplicate Accounts</h2>
                <select className="input-control" value={mergeForm.sourceCustomerId} onChange={(event) => setMergeForm({ ...mergeForm, sourceCustomerId: event.target.value })}>
                  <option value="">Source duplicate</option>
                  {customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name} · {customer.email}</option>)}
                </select>
                <select className="input-control" value={mergeForm.targetCustomerId} onChange={(event) => setMergeForm({ ...mergeForm, targetCustomerId: event.target.value })}>
                  <option value="">Target customer</option>
                  {customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name} · {customer.email}</option>)}
                </select>
                <textarea className="input-control min-h-20" placeholder="Merge reason" value={mergeForm.reason} onChange={(event) => setMergeForm({ ...mergeForm, reason: event.target.value })} />
                <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  <Merge className="h-4 w-4" />
                  Merge accounts
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            {!detail ? (
              <EmptyPanel>Select a customer to view full profile.</EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Metric icon={WalletCards} label="Total spend" value={formatPrice(detail.metrics?.totalSpend || 0)} />
                  <Metric icon={History} label="Orders" value={detail.metrics?.orderCount || 0} />
                  <Metric icon={AlertTriangle} label="Returns" value={detail.metrics?.returnCount || 0} tone="text-orange-700" />
                  <Metric icon={Ticket} label="Open tickets" value={detail.metrics?.openTickets || 0} tone="text-blue-700" />
                </div>
                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-slate-950">{detail.profile?.name}</h2>
                          <p className="text-sm text-slate-500">#{shortId(detail.profile?._id)}</p>
                        </div>
                        <Pill tone={statusTone[detail.profile?.status] || statusTone.active}>{detail.profile?.status}</Pill>
                      </div>
                      <div className="mt-4 space-y-3">
                        <DetailRow icon={Mail} label="Email" value={detail.profile?.email} />
                        <DetailRow icon={Phone} label="Phone" value={detail.profile?.phone} />
                        <DetailRow icon={Star} label="Tier" value={detail.profile?.tier} subValue={`${detail.metrics?.loyaltyPoints || 0} points`} />
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="font-bold">Flags</h3>
                      <div className="mt-3 space-y-2">
                        {detail.flags?.map((flag) => (
                          <div key={flag._id} className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            <p className="font-semibold">{flag.type || "manual"} · {flag.severity || "medium"}</p>
                            <p>{flag.reason || flag.note || "No note"}</p>
                          </div>
                        ))}
                        {detail.flags?.length === 0 && <p className="text-sm text-slate-500">No flags.</p>}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="font-bold">Addresses</h3>
                      <div className="mt-3 space-y-3">
                        {detail.addresses?.map((address) => (
                          <div key={address._id} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <p className="font-semibold">{address.name || detail.profile?.name}</p>
                            <p className="text-slate-600">{[address.address, address.area, address.upazila, address.district, address.division].filter(Boolean).join(", ")}</p>
                            {address.isDefault && <Pill tone="border-blue-200 bg-blue-50 text-blue-700">Default</Pill>}
                          </div>
                        ))}
                        {detail.addresses?.length === 0 && <p className="text-sm text-slate-500">No addresses saved.</p>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="font-bold">Payment Methods</h3>
                      <div className="mt-3 space-y-3">
                        {detail.paymentMethods?.map((method) => (
                          <div key={method.method} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="flex justify-between gap-3">
                              <p className="font-semibold">{method.label}</p>
                              <p className="font-bold">{formatPrice(method.totalAmount || 0)}</p>
                            </div>
                            <p className="text-xs text-slate-500">{method.orderCount} uses · Last {formatDate(method.lastUsedAt)}</p>
                          </div>
                        ))}
                        {detail.paymentMethods?.length === 0 && <p className="text-sm text-slate-500">No payment method history.</p>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                      <h3 className="font-bold">Recent Orders</h3>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Order</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detail.orders?.slice(0, 8).map((order) => (
                              <tr key={order._id}>
                                <td className="px-3 py-2 font-semibold">#{shortId(order._id)}</td>
                                <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                                <td className="px-3 py-2">{order.status}</td>
                                <td className="px-3 py-2 text-right font-semibold">{formatPrice(order.totalAmount ?? order.total ?? 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {detail.orders?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No order history.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "loyalty" && (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <div className="space-y-4">
              <form onSubmit={submitLoyalty} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Manual Points Adjustment</h2>
                <p className="text-sm text-slate-500">{selectedCustomer ? `Selected: ${selectedCustomer.name || selectedCustomer.email}` : "Select a customer first"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <select className="input-control" value={loyaltyForm.action} onChange={(event) => setLoyaltyForm({ ...loyaltyForm, action: event.target.value })}>
                    <option value="award">Award</option>
                    <option value="deduct">Deduct</option>
                  </select>
                  <input className="input-control" type="number" min="1" value={loyaltyForm.points} onChange={(event) => setLoyaltyForm({ ...loyaltyForm, points: Number(event.target.value) })} />
                </div>
                <textarea className="input-control min-h-24" placeholder="Reason for ledger" value={loyaltyForm.reason} onChange={(event) => setLoyaltyForm({ ...loyaltyForm, reason: event.target.value })} />
                <button type="submit" disabled={saving || !selectedCustomerId} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Save points
                </button>
              </form>

              <form onSubmit={submitProgram} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Tier Thresholds</h2>
                <div className="grid grid-cols-2 gap-3">
                  {["bronze", "silver", "gold", "platinum"].map((tier) => (
                    <label key={tier} className="block">
                      <span className="text-xs font-semibold capitalize text-slate-500">{tier}</span>
                      <input className="input-control mt-1" type="number" min="0" value={programForm[tier]} onChange={(event) => setProgramForm({ ...programForm, [tier]: Number(event.target.value) })} />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">Referral credit</span>
                    <input className="input-control mt-1" type="number" min="0" value={programForm.referralCredit} onChange={(event) => setProgramForm({ ...programForm, referralCredit: Number(event.target.value) })} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">Welcome credit</span>
                    <input className="input-control mt-1" type="number" min="0" value={programForm.referredWelcomeCredit} onChange={(event) => setProgramForm({ ...programForm, referredWelcomeCredit: Number(event.target.value) })} />
                  </label>
                </div>
                <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Update programme
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Selected Customer Ledger</h2>
                <div className="mt-3 space-y-2">
                  {(detail?.loyalty?.transactions || []).slice().reverse().slice(0, 12).map((transaction, index) => (
                    <div key={`${transaction.date}-${index}`} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{transaction.reason}</p>
                        <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
                      </div>
                      <span className={transaction.type === "earned" ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                        {transaction.type === "earned" ? "+" : "-"}{Number(transaction.points || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {!detail?.loyalty?.transactions?.length && <p className="text-sm text-slate-500">No loyalty ledger for selected customer.</p>}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">Programme Rules</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {Object.entries(program?.tierThresholds || {}).map(([tier, value]) => (
                    <div key={tier} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">{tier}</p>
                      <p className="text-lg font-bold">{Number(value || 0).toLocaleString()} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="space-y-6">
            {sideLoading ? (
              <Loading />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Metric icon={Gift} label="Referral links" value={referrals.summary?.referralLinks || 0} />
                  <Metric icon={UserRound} label="Conversions" value={referrals.summary?.conversions || 0} tone="text-emerald-700" />
                  <Metric icon={Star} label="Credit awarded" value={Number(referrals.summary?.creditAwarded || 0).toLocaleString()} tone="text-orange-700" />
                  <Metric icon={ShieldAlert} label="Fraud flags" value={referrals.summary?.fraudFlags || 0} tone="text-red-700" />
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Referrer</th>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Clicks</th>
                          <th className="px-4 py-3">Conversions</th>
                          <th className="px-4 py-3">Credit</th>
                          <th className="px-4 py-3">Fraud</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {referrals.rows?.map((row) => (
                          <tr key={`${row.referrerId}-${row.referralCode}`}>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{row.referrerName}</div>
                              <div className="text-xs text-slate-500">{row.referrerEmail}</div>
                            </td>
                            <td className="px-4 py-3 font-semibold">{row.referralCode}</td>
                            <td className="px-4 py-3">{row.clicks || 0}</td>
                            <td className="px-4 py-3">{row.conversions || 0}</td>
                            <td className="px-4 py-3">{Number(row.creditAwarded || 0).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <Pill tone={row.fraudFlags ? statusTone.banned : statusTone.active}>{row.fraudFlags || 0}</Pill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {referrals.rows?.length === 0 && <EmptyPanel>No referral records found.</EmptyPanel>}
                </div>
              </>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Customer Audit Trail</h2>
          <div className="mt-3 space-y-2">
            {auditLog.slice(0, 6).map((log) => (
              <div key={log._id} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <span className="font-semibold text-slate-800">{log.action}</span>
                <span className="text-xs text-slate-500">{formatDate(log.createdAt)} · {log.actor?.email || log.actor?.userId || "admin"}</span>
              </div>
            ))}
            {auditLog.length === 0 && <p className="text-sm text-slate-500">No customer audit entries yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
