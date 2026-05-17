import { createElement, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Download,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Save,
  Truck,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useCurrency from "../../hooks/useCurrency";
import {
  downloadDispatchManifestCsv,
  getCodFloatTracker,
  getCourierPartners,
  getDeliveryFeeRules,
  getDeliveryZones,
  getDispatchManifest,
  getFailedDeliveries,
  getLogisticsAuditLog,
  getLogisticsOverview,
  getPickupStaff,
  recordCodRemittance,
  returnFailedDeliveryToSeller,
  saveCourierPartner,
  saveDeliveryFeeRule,
  saveDeliveryZone,
  savePickupStaff,
  scheduleFailedDeliveryReattempt,
} from "../../services/api";

const todayInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dateTimeInput = (days = 1) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const TABS = [
  { key: "zones", label: "Zones", icon: MapPin },
  { key: "couriers", label: "Couriers", icon: Truck },
  { key: "manifest", label: "Manifest", icon: ClipboardList },
  { key: "staff", label: "Pickup Staff", icon: Users },
  { key: "rules", label: "Fee Rules", icon: Calculator },
  { key: "cod", label: "COD Float", icon: Banknote },
  { key: "failed", label: "Failed Delivery", icon: AlertTriangle },
];

const emptyZone = {
  name: "",
  code: "",
  districtsText: "",
  courierPartnerIds: [],
  defaultCourierName: "",
  codAvailable: true,
  status: "active",
  slaHours: 48,
  sortOrder: 100,
  notes: "",
};

const emptyCourier = {
  name: "",
  code: "",
  status: "active",
  contactName: "",
  phone: "",
  email: "",
  serviceZonesText: "",
  codSupported: true,
  baseDeliveryCost: 80,
  codCollectionFee: 10,
  defaultSlaHours: 72,
  slaZoneCode: "",
  slaProcessingHours: 24,
  slaDeliveryDaysMin: 1,
  slaDeliveryDaysMax: 3,
  notes: "",
};

const emptyStaff = {
  name: "",
  phone: "",
  status: "active",
  routeName: "",
  assignedZonesText: "",
  assignedVendorIdsText: "",
  vehicleType: "bike",
  capacityOrders: 25,
  shiftStart: "09:00",
  shiftEnd: "18:00",
  notes: "",
};

const emptyRule = {
  name: "",
  ruleType: "zone_rate",
  status: "active",
  priority: 100,
  zoneCode: "",
  minOrderAmount: 0,
  maxOrderAmount: 0,
  minWeightKg: 0,
  maxWeightKg: 0,
  baseFee: 80,
  feePerKg: 10,
  codFee: 0,
  redeliveryFee: 0,
  freeShippingThreshold: 0,
  paymentMethodsText: "",
  notes: "",
};

const emptyCodRemittance = {
  courierName: "",
  collectedAmount: "",
  remittedAmount: "",
  forwardedToVendorAmount: "",
  reference: "",
  notes: "",
};

const emptyFailureAction = {
  orderId: "",
  courierName: "",
  nextAttemptAt: dateTimeInput(1),
  redeliveryFee: 0,
  reason: "",
  returnReason: "",
  returnFee: 0,
  note: "",
};

const toArray = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (id = "") => id.toString().slice(-8).toUpperCase();

function Metric({ icon, label, value, tone = "text-slate-950" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {createElement(icon, { className: "h-4 w-4 text-slate-400" })}
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const tone = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    paused: "border-amber-200 bg-amber-50 text-amber-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-600",
    disabled: "border-slate-200 bg-slate-100 text-slate-600",
    reattempt_scheduled: "border-blue-200 bg-blue-50 text-blue-700",
    return_to_seller: "border-orange-200 bg-orange-50 text-orange-700",
    failed_delivery: "border-red-200 bg-red-50 text-red-700",
    collected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    remitted: "border-blue-200 bg-blue-50 text-blue-700",
    discrepancy: "border-red-200 bg-red-50 text-red-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
  }[status] || "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {String(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function EmptyPanel({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function AdminLogistics() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("zones");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [zones, setZones] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [manifest, setManifest] = useState({ groups: [], rows: [] });
  const [pickupStaff, setPickupStaff] = useState([]);
  const [feeRules, setFeeRules] = useState([]);
  const [codFloat, setCodFloat] = useState({ summary: {}, byCourier: [], orders: [], remittances: [] });
  const [failedDeliveries, setFailedDeliveries] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [manifestDate, setManifestDate] = useState(todayInput());

  const [zoneForm, setZoneForm] = useState(emptyZone);
  const [courierForm, setCourierForm] = useState(emptyCourier);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [codForm, setCodForm] = useState(emptyCodRemittance);
  const [selectedCodOrderIds, setSelectedCodOrderIds] = useState([]);
  const [failureAction, setFailureAction] = useState(emptyFailureAction);

  const zoneOptions = useMemo(
    () => zones.map((zone) => ({ value: zone.code || zone._id, label: zone.name })),
    [zones],
  );

  const outstandingCodOrders = useMemo(
    () =>
      (codFloat.orders || []).filter(
        (row) =>
          Number(row.outstandingAmount || 0) > 0 ||
          ["collected", "discrepancy"].includes(row.collectionStatus),
      ),
    [codFloat.orders],
  );

  const selectedCodOrders = useMemo(
    () => outstandingCodOrders.filter((row) => selectedCodOrderIds.includes(row.orderId)),
    [outstandingCodOrders, selectedCodOrderIds],
  );

  const selectedCodAmount = useMemo(
    () =>
      selectedCodOrders.reduce(
        (sum, row) => sum + Number(row.outstandingAmount || row.amount || 0),
        0,
      ),
    [selectedCodOrders],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        zonesRes,
        couriersRes,
        manifestRes,
        staffRes,
        rulesRes,
        codRes,
        failedRes,
        auditRes,
      ] = await Promise.all([
        getLogisticsOverview(),
        getDeliveryZones(),
        getCourierPartners(),
        getDispatchManifest({ date: manifestDate }),
        getPickupStaff(),
        getDeliveryFeeRules(),
        getCodFloatTracker(),
        getFailedDeliveries(),
        getLogisticsAuditLog(),
      ]);

      setOverview(overviewRes.data.data || null);
      setZones(zonesRes.data.data || []);
      setCouriers(couriersRes.data.data || []);
      setManifest(manifestRes.data.data || { groups: [], rows: [] });
      setPickupStaff(staffRes.data.data || []);
      setFeeRules(rulesRes.data.data || []);
      setCodFloat(codRes.data.data || { summary: {}, byCourier: [], orders: [], remittances: [] });
      setFailedDeliveries(failedRes.data.data || []);
      setAuditLog(auditRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load logistics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshManifest = async () => {
    try {
      const response = await getDispatchManifest({ date: manifestDate });
      setManifest(response.data.data || { groups: [], rows: [] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load manifest");
    }
  };

  useEffect(() => {
    if (!loading) refreshManifest();
  }, [manifestDate]);

  const runSave = async (action, successMessage) => {
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const submitZone = (event) => {
    event.preventDefault();
    runSave(
      () =>
        saveDeliveryZone({
          ...zoneForm,
          districts: toArray(zoneForm.districtsText),
        }),
      zoneForm.zoneId ? "Zone updated" : "Zone created",
    ).then(() => setZoneForm(emptyZone));
  };

  const submitCourier = (event) => {
    event.preventDefault();
    const slaByZone = courierForm.slaZoneCode
      ? [
          {
            zoneCode: courierForm.slaZoneCode,
            processingHours: courierForm.slaProcessingHours,
            deliveryDaysMin: courierForm.slaDeliveryDaysMin,
            deliveryDaysMax: courierForm.slaDeliveryDaysMax,
            baseDeliveryCost: courierForm.baseDeliveryCost,
            codCollectionFee: courierForm.codCollectionFee,
          },
        ]
      : [];

    runSave(
      () =>
        saveCourierPartner({
          ...courierForm,
          serviceZones: toArray(courierForm.serviceZonesText),
          slaByZone,
        }),
      courierForm.courierId ? "Courier updated" : "Courier created",
    ).then(() => setCourierForm(emptyCourier));
  };

  const submitStaff = (event) => {
    event.preventDefault();
    runSave(
      () =>
        savePickupStaff({
          ...staffForm,
          assignedZones: toArray(staffForm.assignedZonesText),
          assignedVendorIds: toArray(staffForm.assignedVendorIdsText),
        }),
      staffForm.staffId ? "Pickup staff updated" : "Pickup staff saved",
    ).then(() => setStaffForm(emptyStaff));
  };

  const submitRule = (event) => {
    event.preventDefault();
    runSave(
      () =>
        saveDeliveryFeeRule({
          ...ruleForm,
          paymentMethods: toArray(ruleForm.paymentMethodsText),
        }),
      ruleForm.ruleId ? "Fee rule updated" : "Fee rule created",
    ).then(() => setRuleForm(emptyRule));
  };

  const submitCodRemittance = (event) => {
    event.preventDefault();
    const collectedAmount = codForm.collectedAmount || (selectedCodAmount ? String(selectedCodAmount) : "");
    const remittedAmount = codForm.remittedAmount || (selectedCodAmount ? String(selectedCodAmount) : "");
    runSave(
      () =>
        recordCodRemittance({
          ...codForm,
          collectedAmount,
          remittedAmount,
          orderIds: selectedCodOrderIds,
        }),
      "COD remittance recorded",
    ).then(() => {
      setCodForm(emptyCodRemittance);
      setSelectedCodOrderIds([]);
    });
  };

  const toggleCodOrder = (row) => {
    setSelectedCodOrderIds((current) => {
      const exists = current.includes(row.orderId);
      const next = exists
        ? current.filter((id) => id !== row.orderId)
        : [...current, row.orderId];
      return next;
    });
    setCodForm((current) => ({
      ...current,
      courierName: current.courierName || row.courierName || "",
    }));
  };

  const submitReattempt = (event) => {
    event.preventDefault();
    if (!failureAction.orderId) {
      toast.error("Select an order first");
      return;
    }
    runSave(
      () =>
        scheduleFailedDeliveryReattempt(failureAction.orderId, {
          courierName: failureAction.courierName,
          nextAttemptAt: failureAction.nextAttemptAt,
          redeliveryFee: failureAction.redeliveryFee,
          reason: failureAction.reason,
          note: failureAction.note,
        }),
      "Re-attempt scheduled",
    ).then(() => setFailureAction(emptyFailureAction));
  };

  const submitReturnToSeller = () => {
    if (!failureAction.orderId) {
      toast.error("Select an order first");
      return;
    }
    runSave(
      () =>
        returnFailedDeliveryToSeller(failureAction.orderId, {
          courierName: failureAction.courierName,
          returnReason: failureAction.returnReason || failureAction.reason,
          returnFee: failureAction.returnFee,
          note: failureAction.note,
        }),
      "Return-to-seller started",
    ).then(() => setFailureAction(emptyFailureAction));
  };

  const exportManifest = async () => {
    try {
      const response = await downloadDispatchManifestCsv({ date: manifestDate });
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `dispatch-manifest-${manifestDate || "all"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to export manifest");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Logistics & Delivery</h1>
            <p className="mt-1 text-sm text-slate-500">Zones, couriers, dispatch, COD, and delivery exceptions.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={PackageCheck} label="Ready to dispatch" value={overview?.dispatch?.readyOrders || 0} />
          <Metric icon={Truck} label="Active couriers" value={overview?.couriers?.active || 0} tone="text-emerald-700" />
          <Metric icon={Banknote} label="COD outstanding" value={formatPrice(overview?.codFloat?.outstandingWithCouriers || 0)} tone="text-orange-700" />
          <Metric icon={AlertTriangle} label="Failed deliveries" value={overview?.failedDeliveries?.total || 0} tone="text-red-700" />
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

        {activeTab === "zones" && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={submitZone} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Delivery Zone</h2>
              <input className="input-control" placeholder="Zone name" value={zoneForm.name} onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })} />
              <input className="input-control" placeholder="Code" value={zoneForm.code} onChange={(event) => setZoneForm({ ...zoneForm, code: event.target.value })} />
              <textarea className="input-control min-h-24" placeholder="Districts, comma separated" value={zoneForm.districtsText} onChange={(event) => setZoneForm({ ...zoneForm, districtsText: event.target.value })} />
              <select className="input-control" value={zoneForm.defaultCourierName} onChange={(event) => setZoneForm({ ...zoneForm, defaultCourierName: event.target.value })}>
                <option value="">Default courier</option>
                {couriers.map((courier) => <option key={courier._id} value={courier.name}>{courier.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-control" type="number" min="1" placeholder="SLA hours" value={zoneForm.slaHours} onChange={(event) => setZoneForm({ ...zoneForm, slaHours: Number(event.target.value) })} />
                <input className="input-control" type="number" min="1" placeholder="Sort" value={zoneForm.sortOrder} onChange={(event) => setZoneForm({ ...zoneForm, sortOrder: Number(event.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={zoneForm.codAvailable} onChange={(event) => setZoneForm({ ...zoneForm, codAvailable: event.target.checked })} />
                COD available
              </label>
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save zone
              </button>
            </form>

            <div className="space-y-3">
              {zones.length === 0 && <EmptyPanel>No delivery zones found.</EmptyPanel>}
              {zones.map((zone) => (
                <div key={zone._id || zone.code} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950">{zone.name}</h3>
                        <StatusPill status={zone.status || "active"} />
                        {zone.codAvailable !== false && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">COD</span>}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{(zone.districts || []).join(", ") || "Fallback zone"}</p>
                      <p className="mt-1 text-xs text-slate-500">Courier: {zone.defaultCourierName || "Unassigned"} · SLA {zone.slaHours || 48}h</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoneForm({
                        ...zone,
                        zoneId: zone._id,
                        districtsText: (zone.districts || []).join(", "),
                      })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "couriers" && (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <form onSubmit={submitCourier} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Courier Partner</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input-control" placeholder="Courier name" value={courierForm.name} onChange={(event) => setCourierForm({ ...courierForm, name: event.target.value })} />
                <input className="input-control" placeholder="Code" value={courierForm.code} onChange={(event) => setCourierForm({ ...courierForm, code: event.target.value })} />
                <input className="input-control" placeholder="Contact name" value={courierForm.contactName} onChange={(event) => setCourierForm({ ...courierForm, contactName: event.target.value })} />
                <input className="input-control" placeholder="Phone" value={courierForm.phone} onChange={(event) => setCourierForm({ ...courierForm, phone: event.target.value })} />
              </div>
              <textarea className="input-control min-h-20" placeholder="Service zones, comma separated" value={courierForm.serviceZonesText} onChange={(event) => setCourierForm({ ...courierForm, serviceZonesText: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <input className="input-control" type="number" min="0" placeholder="Base cost" value={courierForm.baseDeliveryCost} onChange={(event) => setCourierForm({ ...courierForm, baseDeliveryCost: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="COD fee" value={courierForm.codCollectionFee} onChange={(event) => setCourierForm({ ...courierForm, codCollectionFee: Number(event.target.value) })} />
                <input className="input-control" type="number" min="1" placeholder="SLA hours" value={courierForm.defaultSlaHours} onChange={(event) => setCourierForm({ ...courierForm, defaultSlaHours: Number(event.target.value) })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <select className="input-control" value={courierForm.slaZoneCode} onChange={(event) => setCourierForm({ ...courierForm, slaZoneCode: event.target.value })}>
                  <option value="">Zone SLA</option>
                  {zoneOptions.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                </select>
                <input className="input-control" type="number" min="1" value={courierForm.slaProcessingHours} onChange={(event) => setCourierForm({ ...courierForm, slaProcessingHours: Number(event.target.value) })} />
                <input className="input-control" type="number" min="1" value={courierForm.slaDeliveryDaysMin} onChange={(event) => setCourierForm({ ...courierForm, slaDeliveryDaysMin: Number(event.target.value) })} />
                <input className="input-control" type="number" min="1" value={courierForm.slaDeliveryDaysMax} onChange={(event) => setCourierForm({ ...courierForm, slaDeliveryDaysMax: Number(event.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={courierForm.codSupported} onChange={(event) => setCourierForm({ ...courierForm, codSupported: event.target.checked })} />
                COD supported
              </label>
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save courier
              </button>
            </form>

            <div className="grid gap-3 lg:grid-cols-2">
              {couriers.length === 0 && <EmptyPanel>No courier partners found.</EmptyPanel>}
              {couriers.map((courier) => (
                <div key={courier._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-950">{courier.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{courier.phone || "No phone"} · SLA {courier.defaultSlaHours || 72}h</p>
                    </div>
                    <StatusPill status={courier.status || "active"} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">Base cost</p>
                      <p className="font-bold">{formatPrice(courier.baseDeliveryCost || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-500">COD fee</p>
                      <p className="font-bold">{formatPrice(courier.codCollectionFee || 0)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCourierForm({
                      ...emptyCourier,
                      ...courier,
                      courierId: courier._id,
                      serviceZonesText: (courier.serviceZones || []).join(", "),
                      slaZoneCode: courier.slaByZone?.[0]?.zoneCode || "",
                    })}
                    className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "manifest" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <input type="date" className="input-control w-auto" value={manifestDate} onChange={(event) => setManifestDate(event.target.value)} />
                <span className="text-sm font-semibold text-slate-600">{manifest.totalOrders || 0} orders · {formatPrice(manifest.totalCodToCollect || 0)} COD</span>
              </div>
              <button type="button" onClick={exportManifest} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            {manifest.groups?.length === 0 && <EmptyPanel>No ready-to-ship orders for this date.</EmptyPanel>}
            {manifest.groups?.map((group) => (
              <div key={group.courierName} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-950">{group.courierName}</h3>
                    <p className="text-sm text-slate-500">{group.totalOrders} orders · {group.zones.join(", ")}</p>
                  </div>
                  <p className="text-sm font-bold text-orange-700">COD {formatPrice(group.codToCollect || 0)}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Zone</th>
                        <th className="px-4 py-3">Tracking</th>
                        <th className="px-4 py-3 text-right">COD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.orders.map((order) => (
                        <tr key={order.orderId}>
                          <td className="px-4 py-3 font-semibold">#{shortId(order.orderId)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{order.customerName}</div>
                            <div className="text-xs text-slate-500">{order.phone}</div>
                          </td>
                          <td className="px-4 py-3">{order.zoneName}</td>
                          <td className="px-4 py-3">{order.trackingNumber || "Pending"}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatPrice(order.codAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "staff" && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={submitStaff} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Pickup Staff</h2>
              <input className="input-control" placeholder="Name" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} />
              <input className="input-control" placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} />
              <input className="input-control" placeholder="Route name" value={staffForm.routeName} onChange={(event) => setStaffForm({ ...staffForm, routeName: event.target.value })} />
              <textarea className="input-control min-h-20" placeholder="Assigned zones" value={staffForm.assignedZonesText} onChange={(event) => setStaffForm({ ...staffForm, assignedZonesText: event.target.value })} />
              <textarea className="input-control min-h-20" placeholder="Vendor IDs" value={staffForm.assignedVendorIdsText} onChange={(event) => setStaffForm({ ...staffForm, assignedVendorIdsText: event.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-control" placeholder="Vehicle" value={staffForm.vehicleType} onChange={(event) => setStaffForm({ ...staffForm, vehicleType: event.target.value })} />
                <input className="input-control" type="number" min="0" value={staffForm.capacityOrders} onChange={(event) => setStaffForm({ ...staffForm, capacityOrders: Number(event.target.value) })} />
              </div>
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save staff
              </button>
            </form>
            <div className="grid gap-3 lg:grid-cols-2">
              {pickupStaff.length === 0 && <EmptyPanel>No pickup staff found.</EmptyPanel>}
              {pickupStaff.map((staff) => (
                <div key={staff._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{staff.name}</h3>
                      <p className="text-sm text-slate-500">{staff.phone} · {staff.routeName || "No route"}</p>
                    </div>
                    <StatusPill status={staff.status || "active"} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{(staff.assignedZones || []).join(", ") || "No zones assigned"}</p>
                  <button
                    type="button"
                    onClick={() => setStaffForm({
                      ...emptyStaff,
                      ...staff,
                      staffId: staff._id,
                      assignedZonesText: (staff.assignedZones || []).join(", "),
                      assignedVendorIdsText: (staff.assignedVendorIds || []).join(", "),
                    })}
                    className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <form onSubmit={submitRule} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Delivery Fee Rule</h2>
              <input className="input-control" placeholder="Rule name" value={ruleForm.name} onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="input-control" value={ruleForm.ruleType} onChange={(event) => setRuleForm({ ...ruleForm, ruleType: event.target.value })}>
                  <option value="zone_rate">Zone rate</option>
                  <option value="weight_based">Weight based</option>
                  <option value="free_shipping">Free shipping</option>
                  <option value="cod_fee">COD fee</option>
                  <option value="redelivery_fee">Re-delivery fee</option>
                </select>
                <select className="input-control" value={ruleForm.zoneCode} onChange={(event) => setRuleForm({ ...ruleForm, zoneCode: event.target.value })}>
                  <option value="">Any zone</option>
                  {zoneOptions.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input className="input-control" type="number" min="0" placeholder="Base fee" value={ruleForm.baseFee} onChange={(event) => setRuleForm({ ...ruleForm, baseFee: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Per kg" value={ruleForm.feePerKg} onChange={(event) => setRuleForm({ ...ruleForm, feePerKg: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Free threshold" value={ruleForm.freeShippingThreshold} onChange={(event) => setRuleForm({ ...ruleForm, freeShippingThreshold: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Min order" value={ruleForm.minOrderAmount} onChange={(event) => setRuleForm({ ...ruleForm, minOrderAmount: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Min kg" value={ruleForm.minWeightKg} onChange={(event) => setRuleForm({ ...ruleForm, minWeightKg: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="COD fee" value={ruleForm.codFee} onChange={(event) => setRuleForm({ ...ruleForm, codFee: Number(event.target.value) })} />
              </div>
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save rule
              </button>
            </form>
            <div className="space-y-3">
              {feeRules.length === 0 && <EmptyPanel>No delivery fee rules found.</EmptyPanel>}
              {feeRules.map((rule) => (
                <div key={rule._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{rule.name}</h3>
                        <StatusPill status={rule.status || "active"} />
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{rule.ruleType?.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Zone {rule.zoneCode || "Any"} · Base {formatPrice(rule.baseFee || 0)} · Per kg {formatPrice(rule.feePerKg || 0)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRuleForm({
                        ...emptyRule,
                        ...rule,
                        ruleId: rule._id,
                        paymentMethodsText: (rule.paymentMethods || []).join(", "),
                      })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "cod" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Metric icon={Banknote} label="COD order value" value={formatPrice(codFloat.summary?.codOrderValue || 0)} />
              <Metric icon={Truck} label="Collected by couriers" value={formatPrice(codFloat.summary?.collectedByCouriers || 0)} />
              <Metric icon={CheckCircle2} label="Remitted platform" value={formatPrice(codFloat.summary?.remittedToPlatform || 0)} tone="text-emerald-700" />
              <Metric icon={AlertTriangle} label="Outstanding" value={formatPrice(codFloat.summary?.outstandingWithCouriers || 0)} tone="text-orange-700" />
            </div>
            <form onSubmit={submitCodRemittance} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Record COD remittance</h2>
                  <p className="text-sm text-slate-500">
                    Select collected orders below, then record the courier cash handover.
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                  {selectedCodOrderIds.length} selected · {formatPrice(selectedCodAmount)}
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-6">
                <select className="input-control md:col-span-2" value={codForm.courierName} onChange={(event) => setCodForm({ ...codForm, courierName: event.target.value })}>
                  <option value="">Courier</option>
                  {couriers.map((courier) => <option key={courier._id} value={courier.name}>{courier.name}</option>)}
                </select>
                <input className="input-control" type="number" min="0" placeholder={selectedCodAmount ? `Collected ${selectedCodAmount}` : "Collected"} value={codForm.collectedAmount} onChange={(event) => setCodForm({ ...codForm, collectedAmount: event.target.value })} />
                <input className="input-control" type="number" min="0" placeholder={selectedCodAmount ? `Remitted ${selectedCodAmount}` : "Remitted"} value={codForm.remittedAmount} onChange={(event) => setCodForm({ ...codForm, remittedAmount: event.target.value })} />
                <input className="input-control" placeholder="Reference" value={codForm.reference} onChange={(event) => setCodForm({ ...codForm, reference: event.target.value })} />
                <button type="submit" disabled={saving || !codForm.courierName || (!codForm.remittedAmount && !selectedCodAmount)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  Record
                </button>
              </div>
            </form>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h2 className="font-bold text-slate-950">Collected COD waiting for remittance</h2>
                  <p className="text-xs text-slate-500">{outstandingCodOrders.length} orders need platform reconciliation</p>
                </div>
                {selectedCodOrderIds.length > 0 && (
                  <button type="button" onClick={() => setSelectedCodOrderIds([])} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                    Clear
                  </button>
                )}
              </div>
              {outstandingCodOrders.length === 0 ? (
                <EmptyPanel>No collected COD orders are waiting for remittance.</EmptyPanel>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Select</th>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Courier</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {outstandingCodOrders.map((row) => (
                        <tr key={row.orderId} className={selectedCodOrderIds.includes(row.orderId) ? "bg-orange-50/60" : "hover:bg-slate-50"}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedCodOrderIds.includes(row.orderId)}
                              onChange={() => toggleCodOrder(row)}
                              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">#{shortId(row.orderId)}</td>
                          <td className="px-4 py-3 text-slate-600">{row.courierName}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{row.customerName || "Customer"}</div>
                            <div className="text-xs text-slate-400">{row.customerPhone || "No phone"}</div>
                          </td>
                          <td className="px-4 py-3"><StatusPill status={row.collectionStatus} /></td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{formatPrice(row.outstandingAmount || row.amount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {codFloat.byCourier?.map((row) => (
                <div key={row.courierName} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="font-bold">{row.courierName}</h3>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-slate-500">Orders</p><p className="font-bold">{row.orders}</p></div>
                    <div><p className="text-slate-500">Collected</p><p className="font-bold">{formatPrice(row.collectedAmount || 0)}</p></div>
                    <div><p className="text-slate-500">Outstanding</p><p className="font-bold text-orange-700">{formatPrice(row.outstandingAmount || 0)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "failed" && (
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <form onSubmit={submitReattempt} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Failed Delivery Action</h2>
              <select className="input-control" value={failureAction.orderId} onChange={(event) => setFailureAction({ ...failureAction, orderId: event.target.value })}>
                <option value="">Select order</option>
                {failedDeliveries.map((row) => <option key={row.orderId} value={row.orderId}>#{shortId(row.orderId)} · {row.customerName || row.status}</option>)}
              </select>
              <select className="input-control" value={failureAction.courierName} onChange={(event) => setFailureAction({ ...failureAction, courierName: event.target.value })}>
                <option value="">Courier</option>
                {couriers.map((courier) => <option key={courier._id} value={courier.name}>{courier.name}</option>)}
              </select>
              <input className="input-control" type="datetime-local" value={failureAction.nextAttemptAt} onChange={(event) => setFailureAction({ ...failureAction, nextAttemptAt: event.target.value })} />
              <input className="input-control" type="number" min="0" placeholder="Re-delivery fee" value={failureAction.redeliveryFee} onChange={(event) => setFailureAction({ ...failureAction, redeliveryFee: Number(event.target.value) })} />
              <input className="input-control" placeholder="Reason" value={failureAction.reason} onChange={(event) => setFailureAction({ ...failureAction, reason: event.target.value })} />
              <input className="input-control" placeholder="Return reason" value={failureAction.returnReason} onChange={(event) => setFailureAction({ ...failureAction, returnReason: event.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                  <RotateCcw className="h-4 w-4" />
                  Re-attempt
                </button>
                <button type="button" onClick={submitReturnToSeller} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">
                  <PackageCheck className="h-4 w-4" />
                  Return
                </button>
              </div>
            </form>
            <div className="space-y-3">
              {failedDeliveries.length === 0 && <EmptyPanel>No failed deliveries found.</EmptyPanel>}
              {failedDeliveries.map((row) => (
                <div key={`${row.orderId}-${row.status}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">#{shortId(row.orderId)}</h3>
                        <StatusPill status={row.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{row.customerName} · {row.phone}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.address || row.failureReason || "No address"}</p>
                    </div>
                    <div className="text-sm text-slate-600 md:text-right">
                      <p className="font-semibold">{row.courierName}</p>
                      <p>{row.nextAttemptAt ? formatDate(row.nextAttemptAt) : "No attempt scheduled"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFailureAction({
                      ...failureAction,
                      orderId: row.orderId,
                      courierName: row.courierName || "",
                      reason: row.failureReason || "",
                    })}
                    className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Audit Trail</h2>
          <div className="mt-3 space-y-2">
            {auditLog.slice(0, 6).map((log) => (
              <div key={log._id} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <span className="font-semibold text-slate-800">{log.action}</span>
                <span className="text-xs text-slate-500">{formatDate(log.createdAt)} · {log.actor?.email || log.actor?.userId || "admin"}</span>
              </div>
            ))}
            {auditLog.length === 0 && <p className="text-sm text-slate-500">No logistics audit entries yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
