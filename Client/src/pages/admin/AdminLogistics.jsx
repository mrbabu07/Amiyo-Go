import { createElement, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Truck,
  Users,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import useCurrency from "../../hooks/useCurrency";
import {
  downloadDispatchManifestCsv,
  getCodFloatTracker,
  getCourierPartners,
  getCourierProviderStatus,
  getDeliveryFeeRules,
  getDeliveryZones,
  getDispatchManifest,
  getFailedDeliveries,
  getLogisticsShipments,
  getLogisticsAuditLog,
  getLogisticsOverview,
  getPickupStaff,
  getReadyToShipCollections,
  recordLogisticsDeliveryAttempt,
  recordCodRemittance,
  returnFailedDeliveryToSeller,
  assignLogisticsShipmentCourier,
  saveCourierPartner,
  saveDeliveryFeeRule,
  saveDeliveryZone,
  savePickupStaff,
  scheduleFailedDeliveryReattempt,
  updateLogisticsShipmentState,
} from "../../services/api";

const todayInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dateTimeInput = (days = 1) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const TABS = [
  { key: "work", label: "My Orders", icon: ClipboardList },
  { key: "zones", label: "Zones", icon: MapPin },
  { key: "couriers", label: "Couriers", icon: Truck },
  { key: "ready", label: "Ready to Ship", icon: PackageCheck },
  { key: "manifest", label: "Manifest", icon: ClipboardList },
  { key: "parcels", label: "Parcels", icon: Package },
  { key: "staff", label: "Pickup Staff", icon: Users },
  { key: "rules", label: "Fee Rules", icon: Calculator },
  { key: "cod", label: "COD Float", icon: Banknote },
  { key: "failed", label: "Failed Delivery", icon: AlertTriangle },
];

const OPERATIONAL_TAB_KEYS = ["work", "ready", "manifest", "parcels", "cod", "failed"];

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
  provider: "manual",
  bookingMode: "manual",
  coverageType: "outside_district",
  outsideDistrict: true,
  localArea: false,
  instantDelivery: false,
  trackingUrlPattern: "",
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
  email: "",
  userId: "",
  status: "active",
  routeName: "",
  assignedZonesText: "",
  assignedLocations: [],
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
  perItemFee: 0,
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

const emptyParcelAssignment = {
  shipmentId: "",
  courierId: "",
  bookingMode: "manual",
  trackingNumber: "",
  estimatedDeliveryDate: "",
  note: "",
};

const emptyDeliveryAction = {
  shipmentId: "",
  outcome: "delivered",
  receiverName: "",
  reason: "",
  notes: "",
  codCollected: true,
};

const emptyLocationDraft = {
  divisionId: "",
  districtId: "",
  upazilaId: "",
  unionId: "",
};

const terminalShipmentStates = new Set(["delivered", "return_to_origin"]);
const deliveryActiveStates = new Set(["picked_up", "in_transit", "out_for_delivery", "delivery_failed"]);
const deliveryConfirmationStates = new Set(["out_for_delivery", "delivery_failed"]);
const nextShipmentActions = {
  pickup_ready: { targetState: "pickup_scheduled", label: "Schedule pickup", Icon: ClipboardList },
  pickup_scheduled: { targetState: "picked_up", label: "Mark picked up", Icon: PackageCheck },
  picked_up: { targetState: "in_transit", label: "Start transit", Icon: Truck },
  in_transit: { targetState: "out_for_delivery", label: "Out for delivery", Icon: Truck },
};

const toArray = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueArray = (values = []) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const extractGeoTable = (payload, tableName) => {
  if (Array.isArray(payload)) {
    const table = payload.find((item) => item.type === "table" && (!tableName || item.name === tableName));
    if (Array.isArray(table?.data)) return table.data;
  }
  return Array.isArray(payload?.data) ? payload.data : [];
};

const buildLocationTokens = (level, item = {}) => {
  const id = String(item.id || "").trim();
  const name = String(item.name || "").trim();
  const aliases = [
    id && `${level}:${id}`,
    name && `${level}:${name}`,
    name,
  ];
  if (level === "upazila") {
    aliases.push(id && `thana:${id}`, name && `thana:${name}`);
  }
  return uniqueArray(aliases);
};

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

const providerLabels = {
  manual: "Manual",
  local: "Local instant",
  redx: "RedX",
  steadfast: "Steadfast",
};

const credentialTone = (status) => {
  if (["ready", "manual_dispatch"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "missing_credentials") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const toggleListValue = (list = [], value, checked) => {
  const current = new Set(list.filter(Boolean));
  if (checked) current.add(value);
  else current.delete(value);
  return [...current];
};

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

function OperatorTaskCard({ icon, label, value, detail, actionLabel, onAction, tone = "primary" }) {
  const Icon = icon;
  const toneClass = {
    primary: "border-primary-100 bg-primary-50 text-primary-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
  }[tone] || "border-primary-100 bg-primary-50 text-primary-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
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
    return_to_seller: "border-primary-200 bg-primary-50 text-primary-700",
    failed_delivery: "border-red-200 bg-red-50 text-red-700",
    collected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    remitted: "border-blue-200 bg-blue-50 text-blue-700",
    discrepancy: "border-red-200 bg-red-50 text-red-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ready_to_ship: "border-primary-200 bg-primary-50 text-primary-700",
    pickup_ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pickup_scheduled: "border-blue-200 bg-blue-50 text-blue-700",
    picked_up: "border-primary-200 bg-primary-50 text-primary-700",
    in_transit: "border-indigo-200 bg-indigo-50 text-indigo-700",
    out_for_delivery: "border-cyan-200 bg-cyan-50 text-cyan-700",
    delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
    delivery_failed: "border-red-200 bg-red-50 text-red-700",
    return_to_origin: "border-amber-200 bg-amber-50 text-amber-700",
    scheduled: "border-blue-200 bg-blue-50 text-blue-700",
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

function ShipmentAdvanceButton({ action, disabled, onClick }) {
  if (!action) return null;
  const Icon = action.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
      {action.label}
    </button>
  );
}

export default function AdminLogistics() {
  const { formatPrice } = useCurrency();
  const { role } = useAuth();
  const canManageLogisticsSettings = ["admin", "manager"].includes(role);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");
  const visibleTabs = useMemo(
    () => (canManageLogisticsSettings ? TABS : TABS.filter((tab) => OPERATIONAL_TAB_KEYS.includes(tab.key))),
    [canManageLogisticsSettings],
  );
  const defaultTab = canManageLogisticsSettings ? "zones" : "work";
  const initialTab = visibleTabs.some((tab) => tab.key === queryTab) ? queryTab : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [zones, setZones] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [providerStatus, setProviderStatus] = useState({ providers: {}, mode: "manual" });
  const [manifest, setManifest] = useState({ groups: [], rows: [] });
  const [readyQueue, setReadyQueue] = useState({ summary: {}, groups: [], rows: [] });
  const [readyStatusFilter, setReadyStatusFilter] = useState("all");
  const [readySearch, setReadySearch] = useState("");
  const [shipments, setShipments] = useState([]);
  const [shipmentStateFilter, setShipmentStateFilter] = useState("all");
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
  const [parcelAssignment, setParcelAssignment] = useState(emptyParcelAssignment);
  const [deliveryAction, setDeliveryAction] = useState(emptyDeliveryAction);
  const [staffLocationDraft, setStaffLocationDraft] = useState(emptyLocationDraft);
  const [geoData, setGeoData] = useState({
    divisions: [],
    districts: [],
    upazilas: [],
    unions: [],
  });

  const zoneOptions = useMemo(
    () => [
      { value: "sameUnion", label: "Same union" },
      { value: "sameUpazila", label: "Same upazila" },
      { value: "sameDistrict", label: "Same district" },
      { value: "outsideDistrict", label: "Outside district" },
      ...zones.map((zone) => ({ value: zone.code || zone._id, label: zone.name })),
    ],
    [zones],
  );

  const geoDistricts = useMemo(
    () => geoData.districts.filter((district) => district.division_id === staffLocationDraft.divisionId),
    [geoData.districts, staffLocationDraft.divisionId],
  );

  const geoUpazilas = useMemo(
    () => geoData.upazilas.filter((upazila) => upazila.district_id === staffLocationDraft.districtId),
    [geoData.upazilas, staffLocationDraft.districtId],
  );

  const geoUnions = useMemo(
    () => geoData.unions.filter((union) => union.upazilla_id === staffLocationDraft.upazilaId),
    [geoData.unions, staffLocationDraft.upazilaId],
  );

  const pickGeo = (items, id) => items.find((item) => item.id === id) || null;

  const selectedStaffDivision = pickGeo(geoData.divisions, staffLocationDraft.divisionId);
  const selectedStaffDistrict = pickGeo(geoData.districts, staffLocationDraft.districtId);
  const selectedStaffUpazila = pickGeo(geoData.upazilas, staffLocationDraft.upazilaId);
  const selectedStaffUnion = pickGeo(geoData.unions, staffLocationDraft.unionId);

  const staffLocationAssignment = useMemo(() => {
    const chain = [
      { level: "division", item: selectedStaffDivision },
      { level: "district", item: selectedStaffDistrict },
      { level: "upazila", item: selectedStaffUpazila },
      { level: "union", item: selectedStaffUnion },
    ].filter((entry) => entry.item);
    const selected = chain[chain.length - 1];
    if (!selected) return null;
    return {
      level: selected.level,
      id: selected.item.id,
      name: selected.item.name,
      label: chain.map((entry) => entry.item.name).join(" / "),
      tokens: buildLocationTokens(selected.level, selected.item),
    };
  }, [selectedStaffDivision, selectedStaffDistrict, selectedStaffUpazila, selectedStaffUnion]);

  const courierById = useMemo(
    () => new Map(couriers.map((courier) => [String(courier._id), courier])),
    [couriers],
  );

  const providerCards = useMemo(() => {
    const providers = providerStatus.providers || {};
    return ["redx", "steadfast", "local", "manual"].map((key) => ({
      key,
      label: providerLabels[key] || key,
      ...(providers[key] || {}),
    }));
  }, [providerStatus]);

  const courierOptions = useMemo(() => {
    const savedOptions = couriers.map((courier) => {
      const provider = courier.provider || courier.code || "manual";
      return {
        value: `courier:${courier._id}`,
        type: "courier",
        id: courier._id,
        provider,
        label: courier.name || providerLabels[provider] || "Courier partner",
        bookingMode: courier.bookingMode || (["redx", "steadfast"].includes(provider) ? "live" : "manual"),
        source: "Saved partner",
      };
    });

    const savedProviders = new Set(savedOptions.map((option) => option.provider));
    const fallbackOptions = ["redx", "steadfast", "local", "manual"]
      .filter((provider) => !savedProviders.has(provider))
      .map((provider) => ({
        value: `provider:${provider}`,
        type: "provider",
        id: "",
        provider,
        label: providerLabels[provider] || provider,
        bookingMode: ["redx", "steadfast"].includes(provider) ? "live" : "manual",
        source: providerStatus.providers?.[provider]?.configured ? "Env configured" : "Provider fallback",
      }));

    return [...savedOptions, ...fallbackOptions];
  }, [couriers, providerStatus]);

  const selectedParcel = useMemo(
    () => shipments.find((shipment) => String(shipment._id) === String(parcelAssignment.shipmentId)) || null,
    [shipments, parcelAssignment.shipmentId],
  );

  const selectedDeliveryShipment = useMemo(
    () => shipments.find((shipment) => String(shipment._id) === String(deliveryAction.shipmentId)) || null,
    [shipments, deliveryAction.shipmentId],
  );

  const readyRows = useMemo(() => readyQueue.rows || [], [readyQueue]);

  const shipmentsByOrderVendor = useMemo(() => {
    const map = new Map();
    shipments.forEach((shipment) => {
      const orderId = String(shipment.orderId || "");
      const vendorId = String(shipment.vendorId || "");
      if (!orderId) return;
      if (vendorId) map.set(`${orderId}:${vendorId}`, shipment);
      if (!map.has(orderId)) map.set(orderId, shipment);
    });
    return map;
  }, [shipments]);

  const getShipmentForReadyRow = (row) =>
    shipmentsByOrderVendor.get(`${row.orderId}:${row.vendorId}`) || shipmentsByOrderVendor.get(String(row.orderId || ""));

  const getNextShipmentAction = (shipment) =>
    nextShipmentActions[shipment?.shipmentState || ""] || null;

  const activeShipments = useMemo(
    () => shipments.filter((shipment) => !terminalShipmentStates.has(shipment.shipmentState || "created")),
    [shipments],
  );

  const deliveryQueue = useMemo(
    () => activeShipments.filter((shipment) => deliveryActiveStates.has(shipment.shipmentState || "")),
    [activeShipments],
  );

  const pickupReadyRows = useMemo(
    () => readyRows.filter((row) => row.status === "pickup_ready" || row.pickupStatus === "ready"),
    [readyRows],
  );

  const pickupRowsMissingLocation = useMemo(
    () => readyRows.filter((row) => row.missingPickupLocation || !row.pickupAddress?.addressText),
    [readyRows],
  );

  const pickupRowsWithoutParcel = useMemo(
    () => readyRows.filter((row) => !getShipmentForReadyRow(row)),
    [readyRows, shipmentsByOrderVendor],
  );

  const courierActionShipments = useMemo(
    () =>
      activeShipments.filter((shipment) =>
        ["created", "pending_packing", "packed", "pickup_ready", "pickup_scheduled"].includes(shipment.shipmentState || "created"),
      ),
    [activeShipments],
  );

  const outForDeliveryShipments = useMemo(
    () => activeShipments.filter((shipment) => shipment.shipmentState === "out_for_delivery"),
    [activeShipments],
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

  const codToRemitAmount = useMemo(
    () => outstandingCodOrders.reduce((sum, row) => sum + Number(row.outstandingAmount || row.amount || 0), 0),
    [outstandingCodOrders],
  );

  const routeStaff = useMemo(
    () => (!canManageLogisticsSettings ? pickupStaff[0] || null : null),
    [canManageLogisticsSettings, pickupStaff],
  );

  const routeCoverageLabels = useMemo(() => {
    const locations = routeStaff?.assignedLocations || [];
    const labels = locations.map((location) => location.label || location.name).filter(Boolean);
    if (labels.length > 0) return labels.slice(0, 6);
    return (routeStaff?.assignedZones || []).filter(Boolean).slice(0, 6);
  }, [routeStaff]);

  const dashboardCoverageLabels = useMemo(
    () => (canManageLogisticsSettings ? zones.map((zone) => zone.name || zone.code).filter(Boolean).slice(0, 6) : routeCoverageLabels),
    [canManageLogisticsSettings, routeCoverageLabels, zones],
  );

  const getZoneCourierNames = (zone) =>
    (zone.courierPartnerIds || [])
      .map((id) => courierById.get(String(id))?.name)
      .filter(Boolean)
      .join(", ");

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
        providerRes,
        manifestRes,
        readyRes,
        shipmentsRes,
        staffRes,
        rulesRes,
        codRes,
        failedRes,
        auditRes,
      ] = await Promise.all([
        getLogisticsOverview(),
        getDeliveryZones(),
        getCourierPartners(),
        getCourierProviderStatus(),
        getDispatchManifest({ date: manifestDate }),
        getReadyToShipCollections({ status: readyStatusFilter, q: readySearch }),
        getLogisticsShipments({ state: shipmentStateFilter }),
        getPickupStaff(),
        getDeliveryFeeRules(),
        getCodFloatTracker(),
        getFailedDeliveries(),
        getLogisticsAuditLog(),
      ]);

      setOverview(overviewRes.data.data || null);
      setZones(zonesRes.data.data || []);
      setCouriers(couriersRes.data.data || []);
      setProviderStatus(providerRes.data.data || { providers: {}, mode: "manual" });
      setManifest(manifestRes.data.data || { groups: [], rows: [] });
      setReadyQueue(readyRes.data.data || { summary: {}, groups: [], rows: [] });
      setShipments(shipmentsRes.data.data || []);
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

  useEffect(() => {
    let mounted = true;
    const loadGeoData = async () => {
      const [divisionsRes, districtsRes, upazilasRes, unionsRes] = await Promise.all([
        fetch("/divisions.json"),
        fetch("/districts.json"),
        fetch("/upazilas.json"),
        fetch("/unions.json"),
      ]);
      const [divisionsJson, districtsJson, upazilasJson, unionsJson] = await Promise.all([
        divisionsRes.json(),
        districtsRes.json(),
        upazilasRes.json(),
        unionsRes.json(),
      ]);
      if (!mounted) return;
      setGeoData({
        divisions: extractGeoTable(divisionsJson, "divisions"),
        districts: extractGeoTable(districtsJson, "districts"),
        upazilas: extractGeoTable(upazilasJson, "upazilas"),
        unions: extractGeoTable(unionsJson, "unions"),
      });
    };

    loadGeoData().catch(() => {
      if (mounted) toast.error("Failed to load Bangladesh area list");
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const nextTab = visibleTabs.some((tab) => tab.key === queryTab) ? queryTab : defaultTab;
    setActiveTab(nextTab);
  }, [defaultTab, queryTab, visibleTabs]);

  const changeTab = (tabKey) => {
    setActiveTab(tabKey);
    const nextParams = new URLSearchParams(searchParams);
    if (tabKey === "zones") nextParams.delete("tab");
    else nextParams.set("tab", tabKey);
    setSearchParams(nextParams, { replace: true });
  };

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

  const refreshReadyQueue = async () => {
    try {
      const response = await getReadyToShipCollections({ status: readyStatusFilter, q: readySearch });
      setReadyQueue(response.data.data || { summary: {}, groups: [], rows: [] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load ready-to-ship queue");
    }
  };

  useEffect(() => {
    if (!loading) refreshReadyQueue();
  }, [readyStatusFilter]);

  const refreshShipments = async () => {
    try {
      const response = await getLogisticsShipments({ state: shipmentStateFilter });
      setShipments(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load parcels");
    }
  };

  useEffect(() => {
    if (!loading) refreshShipments();
  }, [shipmentStateFilter]);

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

  const updateStaffLocationDraft = (field, value) => {
    setStaffLocationDraft((current) => {
      if (field === "divisionId") {
        return { divisionId: value, districtId: "", upazilaId: "", unionId: "" };
      }
      if (field === "districtId") {
        return { ...current, districtId: value, upazilaId: "", unionId: "" };
      }
      if (field === "upazilaId") {
        return { ...current, upazilaId: value, unionId: "" };
      }
      return { ...current, [field]: value };
    });
  };

  const addStaffLocationAssignment = () => {
    if (!staffLocationAssignment) {
      toast.error("Select a division, district, upazila, or union first");
      return;
    }

    const currentTokens = toArray(staffForm.assignedZonesText);
    const nextTokens = uniqueArray([...currentTokens, ...staffLocationAssignment.tokens]);
    const currentLocations = Array.isArray(staffForm.assignedLocations) ? staffForm.assignedLocations : [];
    const hasLocation = currentLocations.some(
      (location) => location.level === staffLocationAssignment.level && String(location.id) === String(staffLocationAssignment.id),
    );

    setStaffForm({
      ...staffForm,
      assignedZonesText: nextTokens.join(", "),
      assignedLocations: hasLocation ? currentLocations : [...currentLocations, staffLocationAssignment],
    });
    setStaffLocationDraft(emptyLocationDraft);
  };

  const removeStaffLocationAssignment = (location) => {
    const removeTokens = new Set(location.tokens || []);
    const nextTokens = toArray(staffForm.assignedZonesText).filter((token) => !removeTokens.has(token));
    setStaffForm({
      ...staffForm,
      assignedZonesText: nextTokens.join(", "),
      assignedLocations: (staffForm.assignedLocations || []).filter(
        (item) => !(item.level === location.level && String(item.id) === String(location.id)),
      ),
    });
  };

  const submitStaff = (event) => {
    event.preventDefault();
    const assignedZones = uniqueArray(toArray(staffForm.assignedZonesText));
    const assignedTokenSet = new Set(assignedZones);
    runSave(
      () =>
        savePickupStaff({
          ...staffForm,
          assignedZones,
          assignedLocations: (staffForm.assignedLocations || []).filter((location) =>
            (location.tokens || []).some((token) => assignedTokenSet.has(token)),
          ),
          assignedVendorIds: toArray(staffForm.assignedVendorIdsText),
        }),
      staffForm.staffId ? "Pickup staff updated" : "Pickup staff saved",
    ).then(() => {
      setStaffForm(emptyStaff);
      setStaffLocationDraft(emptyLocationDraft);
    });
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

  const openParcelAssignment = (shipment) => {
    const currentCourier = couriers.find(
      (courier) =>
        String(courier._id) === String(shipment.courierId || "") ||
        String(courier.name || "").toLowerCase() === String(shipment.courierName || "").toLowerCase(),
    );
    setParcelAssignment({
      shipmentId: shipment._id,
      courierId: currentCourier?._id ? `courier:${currentCourier._id}` : shipment.courierProvider ? `provider:${shipment.courierProvider}` : "",
      bookingMode: currentCourier?.bookingMode || (shipment.courierBookingStatus === "booked" ? "live" : "manual"),
      trackingNumber: shipment.trackingNumber || "",
      estimatedDeliveryDate: shipment.estimatedDeliveryDate
        ? new Date(shipment.estimatedDeliveryDate).toISOString().slice(0, 10)
        : "",
      note: "",
    });
    changeTab("parcels");
  };

  const changeParcelCourier = (courierId) => {
    const courier = courierOptions.find((item) => item.value === courierId);
    setParcelAssignment((current) => ({
      ...current,
      courierId,
      bookingMode: courier?.bookingMode || current.bookingMode || "manual",
    }));
  };

  const submitParcelAssignment = (event) => {
    event.preventDefault();
    if (!parcelAssignment.shipmentId) {
      toast.error("Select a parcel first");
      return;
    }
    const courier = courierOptions.find((item) => item.value === parcelAssignment.courierId);
    if (!courier) {
      toast.error("Select a courier partner");
      return;
    }
    const providerPayload = courier.type === "courier"
      ? { courierId: courier.id }
      : {
          provider: courier.provider,
          courierProvider: courier.provider,
          courierCode: courier.provider,
          courierName: courier.label,
        };
    runSave(
      () =>
        assignLogisticsShipmentCourier(parcelAssignment.shipmentId, {
          ...providerPayload,
          bookingMode: parcelAssignment.bookingMode,
          trackingNumber: parcelAssignment.trackingNumber,
          estimatedDeliveryDate: parcelAssignment.estimatedDeliveryDate,
          note: parcelAssignment.note,
          targetState: selectedParcel?.shipmentState || "created",
        }),
      parcelAssignment.bookingMode === "live" ? "Courier booking submitted" : "Courier assigned to parcel",
    ).then(() => setParcelAssignment(emptyParcelAssignment));
  };

  const advanceShipmentState = (shipment, action) => {
    if (!shipment?._id || !action?.targetState) return;
    runSave(
      () =>
        updateLogisticsShipmentState(shipment._id, {
          targetState: action.targetState,
          note: action.label,
        }),
      `${action.label} saved`,
    );
  };

  const openDeliveryAction = (shipment, outcome = "delivered") => {
    setDeliveryAction({
      ...emptyDeliveryAction,
      shipmentId: shipment._id,
      outcome,
      codCollected: outcome === "delivered",
    });
  };

  const submitDeliveryAction = (event) => {
    event.preventDefault();
    if (!deliveryAction.shipmentId) {
      toast.error("Select a parcel first");
      return;
    }
    if (deliveryAction.outcome !== "delivered" && !deliveryAction.reason.trim()) {
      toast.error("Add a reason for failed delivery");
      return;
    }

    runSave(
      () =>
        recordLogisticsDeliveryAttempt(deliveryAction.shipmentId, {
          outcome: deliveryAction.outcome,
          receiverName: deliveryAction.receiverName,
          reason: deliveryAction.reason,
          notes: deliveryAction.notes,
          codCollected: deliveryAction.codCollected,
        }),
      deliveryAction.outcome === "delivered" ? "Delivery confirmed" : "Delivery attempt saved",
    ).then(() => setDeliveryAction(emptyDeliveryAction));
  };

  const submitReadySearch = (event) => {
    event.preventDefault();
    refreshReadyQueue();
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

  const renderDeliveryActionPanel = () => {
    if (!deliveryAction.shipmentId) return null;

    return (
      <form onSubmit={submitDeliveryAction} className="mt-4 grid gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <div>
          <label className="text-xs font-bold uppercase text-primary-800">Delivery update</label>
          <p className="mt-1 font-semibold text-slate-950">Parcel #{shortId(deliveryAction.shipmentId)}</p>
          <p className="text-xs text-slate-600">Order #{shortId(selectedDeliveryShipment?.orderId || "")}</p>
        </div>
        <select
          className="input-control"
          value={deliveryAction.outcome}
          onChange={(event) => setDeliveryAction({ ...deliveryAction, outcome: event.target.value, codCollected: event.target.value === "delivered" })}
        >
          <option value="delivered">Delivered</option>
          <option value="failed">Failed attempt</option>
          <option value="rto">Return to origin</option>
        </select>
        <input
          className="input-control"
          placeholder="Receiver name"
          value={deliveryAction.receiverName}
          onChange={(event) => setDeliveryAction({ ...deliveryAction, receiverName: event.target.value })}
        />
        <input
          className="input-control"
          placeholder={deliveryAction.outcome === "delivered" ? "Note" : "Failure reason"}
          value={deliveryAction.outcome === "delivered" ? deliveryAction.notes : deliveryAction.reason}
          onChange={(event) => {
            const value = event.target.value;
            setDeliveryAction(
              deliveryAction.outcome === "delivered"
                ? { ...deliveryAction, notes: value }
                : { ...deliveryAction, reason: value },
            );
          }}
        />
        <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          <CheckCircle2 className="h-4 w-4" />
          Save
        </button>
        {selectedDeliveryShipment?.codAmount > 0 && (
          <label className="flex items-center gap-2 text-sm font-semibold text-primary-800 lg:col-span-2">
            <input
              type="checkbox"
              checked={deliveryAction.codCollected}
              disabled={deliveryAction.outcome !== "delivered"}
              onChange={(event) => setDeliveryAction({ ...deliveryAction, codCollected: event.target.checked })}
            />
            COD cash collected on delivery
          </label>
        )}
        <button
          type="button"
          onClick={() => setDeliveryAction(emptyDeliveryAction)}
          className="text-left text-sm font-semibold text-slate-500 hover:text-slate-800 lg:col-span-2"
        >
          Cancel update
        </button>
      </form>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{canManageLogisticsSettings ? "Logistics & Delivery" : "Logistics Dashboard"}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {canManageLogisticsSettings
                ? "Zones, couriers, dispatch, COD, and delivery exceptions."
                : "Your assigned vendor pickups, parcel delivery queue, COD cash, and failed delivery work."}
            </p>
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
          <Metric icon={PackageCheck} label="Ready vendor pickups" value={readyQueue.summary?.totalPackages ?? overview?.dispatch?.readyOrders ?? 0} />
          <Metric icon={Truck} label={canManageLogisticsSettings ? "Active couriers" : "Parcels in route"} value={canManageLogisticsSettings ? overview?.couriers?.active || 0 : activeShipments.length} tone="text-emerald-700" />
          <Metric icon={Banknote} label={canManageLogisticsSettings ? "COD outstanding" : "COD to remit"} value={formatPrice(canManageLogisticsSettings ? overview?.codFloat?.outstandingWithCouriers || 0 : codToRemitAmount)} tone="text-primary-700" />
          <Metric icon={AlertTriangle} label="Failed deliveries" value={canManageLogisticsSettings ? overview?.failedDeliveries?.total || 0 : failedDeliveries.length} tone="text-red-700" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                    active ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "work" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-700">
                      {canManageLogisticsSettings ? "Operations dashboard" : "My logistics dashboard"}
                    </span>
                    {routeStaff?.routeName && <StatusPill status={routeStaff.routeName} />}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-950">Area Order Workflow</h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Collect vendor-ready parcels, assign courier handover, confirm deliveries, reconcile COD cash, and handle failed delivery cases from one queue.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => changeTab("ready")}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      <PackageCheck className="h-4 w-4" />
                      Start pickup queue
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTab("parcels")}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Truck className="h-4 w-4" />
                      Manage parcels
                    </button>
                    <button
                      type="button"
                      onClick={loadData}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Assigned coverage</p>
                  <p className="mt-2 text-base font-bold text-slate-950">{canManageLogisticsSettings ? "Platform delivery network" : routeStaff?.name || "Area logistics team"}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {canManageLogisticsSettings
                      ? `${zones.length} zone(s), ${couriers.length} courier partner(s)`
                      : routeStaff?.phone || "Use the active area route and queues below"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dashboardCoverageLabels.length > 0 ? (
                      dashboardCoverageLabels.map((label) => (
                        <span key={label} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {canManageLogisticsSettings ? "No zones created" : "Coverage not assigned"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <OperatorTaskCard
                icon={PackageCheck}
                label="Vendor pickup"
                value={readyRows.length}
                detail={`${pickupReadyRows.length} ready now / ${pickupRowsMissingLocation.length} need address`}
                actionLabel="Open pickup"
                onAction={() => changeTab("ready")}
              />
              <OperatorTaskCard
                icon={Truck}
                label="Parcel handover"
                value={courierActionShipments.length}
                detail={`${pickupRowsWithoutParcel.length} waiting for parcel record`}
                actionLabel="Open parcels"
                onAction={() => changeTab("parcels")}
                tone="slate"
              />
              <OperatorTaskCard
                icon={CheckCircle2}
                label="Delivery work"
                value={deliveryQueue.length}
                detail={`${outForDeliveryShipments.length} out for delivery`}
                actionLabel="Update delivery"
                onAction={() => changeTab("parcels")}
                tone="emerald"
              />
              <OperatorTaskCard
                icon={Banknote}
                label="COD cash"
                value={formatPrice(codToRemitAmount)}
                detail={`${outstandingCodOrders.length} order(s) waiting`}
                actionLabel="Open COD"
                onAction={() => changeTab("cod")}
              />
              <OperatorTaskCard
                icon={AlertTriangle}
                label="Exceptions"
                value={failedDeliveries.length}
                detail="Failed delivery and return-to-seller cases"
                actionLabel="Open failed"
                onAction={() => changeTab("failed")}
                tone="red"
              />
            </div>

            {renderDeliveryActionPanel()}

            <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-950">Vendor Collection Queue</h3>
                  <button type="button" onClick={() => changeTab("ready")} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                    Open ready list
                  </button>
                </div>
                {readyRows.length === 0 && <EmptyPanel>No vendor pickup is ready in this area.</EmptyPanel>}
                {readyRows.slice(0, 6).map((row) => {
                  const shipment = getShipmentForReadyRow(row);
                  const nextAction = getNextShipmentAction(shipment);
                  return (
                    <div key={`work-ready-${row.orderId}-${row.vendorId}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-950">#{shortId(row.orderNumber || row.orderId)}</h4>
                            <StatusPill status={row.status} />
                            <StatusPill status={row.pickupStatus || "pending"} />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{row.vendorName}</p>
                          <p className="mt-1 text-sm text-slate-500">{row.pickupAddress?.addressText || "Pickup address not set"}</p>
                        </div>
                        <div className="text-sm md:text-right">
                          <p className="font-bold text-primary-700">{formatPrice(row.codAmount || 0)} COD</p>
                          <p className="text-slate-500">{row.quantity || 0} item(s)</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {row.location?.mapUrl && (
                          <a
                            href={row.location.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <MapPin className="h-4 w-4" />
                            Map
                          </a>
                        )}
                        {shipment ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openParcelAssignment(shipment)}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <Truck className="h-4 w-4" />
                              Courier
                            </button>
                            {nextAction && (
                              <ShipmentAdvanceButton
                                action={nextAction}
                                disabled={saving}
                                onClick={() => advanceShipmentState(shipment, nextAction)}
                              />
                            )}
                          </>
                        ) : (
                          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                            Parcel will appear after vendor shipment is created
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-950">Delivery Queue</h3>
                  <button type="button" onClick={() => changeTab("parcels")} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                    Open parcels
                  </button>
                </div>
                {activeShipments.length === 0 && <EmptyPanel>No parcels are moving in this area.</EmptyPanel>}
                {activeShipments.slice(0, 6).map((shipment) => {
                  const nextAction = getNextShipmentAction(shipment);
                  const canConfirmDelivery = deliveryConfirmationStates.has(shipment.shipmentState || "");
                  return (
                    <div key={`work-shipment-${shipment._id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-950">Parcel #{shortId(shipment._id)}</h4>
                            <StatusPill status={shipment.shipmentState || "created"} />
                            {shipment.codState && <StatusPill status={shipment.codState} />}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Order #{shortId(shipment.orderId)} / {shipment.courierName || "Courier not assigned"}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{shipment.deliveryAddressText || shipment.deliveryAddress?.address || "No delivery address"}</p>
                        </div>
                        <p className="text-sm font-bold text-primary-700 md:text-right">{formatPrice(shipment.codAmount || 0)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openParcelAssignment(shipment)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Truck className="h-4 w-4" />
                          Courier
                        </button>
                        {nextAction && (
                          <ShipmentAdvanceButton
                            action={nextAction}
                            disabled={saving}
                            onClick={() => advanceShipmentState(shipment, nextAction)}
                          />
                        )}
                        {canConfirmDelivery && (
                          <>
                            <button
                              type="button"
                              onClick={() => openDeliveryAction(shipment, "delivered")}
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Delivered
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeliveryAction(shipment, "failed")}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Failed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950">COD Cash Waiting</h3>
                  <button type="button" onClick={() => changeTab("cod")} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                    Open COD
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {outstandingCodOrders.slice(0, 5).map((row) => (
                    <div key={`work-cod-${row.orderId}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-800">#{shortId(row.orderId)} / {row.courierName}</span>
                      <span className="font-bold text-primary-700">{formatPrice(row.outstandingAmount || row.amount || 0)}</span>
                    </div>
                  ))}
                  {outstandingCodOrders.length === 0 && <p className="text-sm text-slate-500">No COD cash is waiting for this area.</p>}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950">Delivery Exceptions</h3>
                  <button type="button" onClick={() => changeTab("failed")} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                    Open failed
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {failedDeliveries.slice(0, 5).map((row) => (
                    <div key={`work-failed-${row.orderId}`} className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-800">#{shortId(row.orderId)} / {row.customerName || "Customer"}</span>
                        <StatusPill status={row.status} />
                      </div>
                      <span className="text-slate-500">{row.failureReason || row.address || "No reason saved"}</span>
                    </div>
                  ))}
                  {failedDeliveries.length === 0 && <p className="text-sm text-slate-500">No failed delivery is waiting for this area.</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "zones" && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={submitZone} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Delivery Zone</h2>
              <input className="input-control" placeholder="Zone name" value={zoneForm.name} onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })} />
              <input className="input-control" placeholder="Code" value={zoneForm.code} onChange={(event) => setZoneForm({ ...zoneForm, code: event.target.value })} />
              <textarea className="input-control min-h-24" placeholder="Districts, upazilas, unions, comma separated" value={zoneForm.districtsText} onChange={(event) => setZoneForm({ ...zoneForm, districtsText: event.target.value })} />
              <select className="input-control" value={zoneForm.defaultCourierName} onChange={(event) => setZoneForm({ ...zoneForm, defaultCourierName: event.target.value })}>
                <option value="">Default courier</option>
                {couriers.map((courier) => <option key={courier._id} value={courier.name}>{courier.name}</option>)}
              </select>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-700">Area courier partners</p>
                <p className="mt-1 text-xs text-slate-500">Orders matching this zone will prefer these courier partners before the fallback courier.</p>
                <div className="mt-3 grid gap-2">
                  {couriers.length === 0 && <p className="text-xs text-slate-500">Create RedX, Steadfast, or local courier partners first.</p>}
                  {couriers.map((courier) => (
                    <label key={courier._id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{courier.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{providerLabels[courier.provider] || courier.provider || "Manual"}</span>
                        <input
                          type="checkbox"
                          checked={(zoneForm.courierPartnerIds || []).map(String).includes(String(courier._id))}
                          onChange={(event) => setZoneForm({
                            ...zoneForm,
                            courierPartnerIds: toggleListValue(zoneForm.courierPartnerIds, courier._id, event.target.checked),
                          })}
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-control" type="number" min="1" placeholder="SLA hours" value={zoneForm.slaHours} onChange={(event) => setZoneForm({ ...zoneForm, slaHours: Number(event.target.value) })} />
                <input className="input-control" type="number" min="1" placeholder="Sort" value={zoneForm.sortOrder} onChange={(event) => setZoneForm({ ...zoneForm, sortOrder: Number(event.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={zoneForm.codAvailable} onChange={(event) => setZoneForm({ ...zoneForm, codAvailable: event.target.checked })} />
                COD available
              </label>
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
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
                      <p className="mt-2 text-sm text-slate-600">{(zone.districts || []).join(", ") || "Fallback coverage"}</p>
                      <p className="mt-1 text-xs text-slate-500">Couriers: {getZoneCourierNames(zone) || zone.defaultCourierName || "Unassigned"} / SLA {zone.slaHours || 48}h</p>
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
            <div className="xl:col-span-2 grid gap-3 md:grid-cols-4">
              {providerCards.map((provider) => (
                <div key={provider.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{provider.label}</p>
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${credentialTone(provider.status)}`}>
                      {String(provider.status || "manual").replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {provider.configured ? "Credentials are available from server env." : "No secret is stored in admin UI."}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={submitCourier} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Courier Partner</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input-control" placeholder="Courier name" value={courierForm.name} onChange={(event) => setCourierForm({ ...courierForm, name: event.target.value })} />
                <input className="input-control" placeholder="Code" value={courierForm.code} onChange={(event) => setCourierForm({ ...courierForm, code: event.target.value })} />
                <select
                  className="input-control"
                  value={courierForm.provider}
                  onChange={(event) => {
                    const provider = event.target.value;
                    setCourierForm({
                      ...courierForm,
                      provider,
                      bookingMode: ["redx", "steadfast"].includes(provider) ? "live" : "manual",
                      coverageType: provider === "local" ? "local_area" : courierForm.coverageType,
                      localArea: provider === "local" || courierForm.localArea,
                      outsideDistrict: provider === "local" ? false : courierForm.outsideDistrict,
                    });
                  }}
                >
                  <option value="manual">Manual courier</option>
                  <option value="redx">RedX</option>
                  <option value="steadfast">Steadfast</option>
                  <option value="local">Local instant</option>
                </select>
                <select className="input-control" value={courierForm.bookingMode} onChange={(event) => setCourierForm({ ...courierForm, bookingMode: event.target.value })}>
                  <option value="manual">Manual booking</option>
                  <option value="live">Live API booking</option>
                </select>
                <input className="input-control" placeholder="Contact name" value={courierForm.contactName} onChange={(event) => setCourierForm({ ...courierForm, contactName: event.target.value })} />
                <input className="input-control" placeholder="Phone" value={courierForm.phone} onChange={(event) => setCourierForm({ ...courierForm, phone: event.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="input-control" value={courierForm.coverageType} onChange={(event) => setCourierForm({ ...courierForm, coverageType: event.target.value })}>
                  <option value="outside_district">Outside districts</option>
                  <option value="local_area">Local instant area</option>
                  <option value="both">Both outside and local</option>
                </select>
                <input className="input-control" placeholder="Tracking URL pattern, use {trackingNumber}" value={courierForm.trackingUrlPattern} onChange={(event) => setCourierForm({ ...courierForm, trackingUrlPattern: event.target.value })} />
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
              <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={courierForm.outsideDistrict} onChange={(event) => setCourierForm({ ...courierForm, outsideDistrict: event.target.checked })} />
                  Outside district
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={courierForm.localArea} onChange={(event) => setCourierForm({ ...courierForm, localArea: event.target.checked })} />
                  Local area
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={courierForm.instantDelivery} onChange={(event) => setCourierForm({ ...courierForm, instantDelivery: event.target.checked })} />
                  Instant delivery
                </label>
              </div>
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
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
                      <p className="mt-1 text-sm text-slate-500">{providerLabels[courier.provider] || courier.provider || "Manual"} / {courier.bookingMode || "manual"} / SLA {courier.defaultSlaHours || 72}h</p>
                      <p className="mt-1 text-xs text-slate-500">{courier.phone || "No phone"} / {String(courier.coverageType || "outside_district").replaceAll("_", " ")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill status={courier.status || "active"} />
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${credentialTone(courier.credentialStatus)}`}>
                        {String(courier.credentialStatus || "manual").replaceAll("_", " ")}
                      </span>
                    </div>
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
                      slaProcessingHours: courier.slaByZone?.[0]?.processingHours || emptyCourier.slaProcessingHours,
                      slaDeliveryDaysMin: courier.slaByZone?.[0]?.deliveryDaysMin || emptyCourier.slaDeliveryDaysMin,
                      slaDeliveryDaysMax: courier.slaByZone?.[0]?.deliveryDaysMax || emptyCourier.slaDeliveryDaysMax,
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

        {activeTab === "ready" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Ready to Ship Collection</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Vendor packages marked ready for admin pickup before local delivery handover.
                  </p>
                </div>
                <form onSubmit={submitReadySearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="input-control sm:w-44"
                    value={readyStatusFilter}
                    onChange={(event) => setReadyStatusFilter(event.target.value)}
                  >
                    <option value="all">All ready orders</option>
                    <option value="ready_to_ship">Ready to ship</option>
                    <option value="pickup_ready">Pickup ready</option>
                  </select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input-control pl-9 sm:w-72"
                      value={readySearch}
                      onChange={(event) => setReadySearch(event.target.value)}
                      placeholder="Search order, vendor, area"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Metric icon={PackageCheck} label="Ready packages" value={readyQueue.summary?.totalPackages || 0} tone="text-primary-700" />
              <Metric icon={Users} label="Vendors" value={readyQueue.summary?.vendorCount || 0} />
              <Metric icon={Truck} label="Pickup ready" value={readyQueue.summary?.pickupReady || 0} tone="text-emerald-700" />
              <Metric icon={Banknote} label="COD value" value={formatPrice(readyQueue.summary?.codToCollect || 0)} tone="text-primary-700" />
              <Metric icon={MapPin} label="Need location" value={readyQueue.summary?.missingPickupLocation || 0} tone={readyQueue.summary?.missingPickupLocation ? "text-amber-700" : "text-slate-950"} />
            </div>

            {readyRows.length === 0 && <EmptyPanel>No vendor packages are ready for collection right now.</EmptyPanel>}

            <div className="grid gap-4">
              {readyRows.map((row) => {
                const shipment = getShipmentForReadyRow(row);
                const nextAction = getNextShipmentAction(shipment);
                return (
                  <div key={`${row.orderId}-${row.vendorId}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-950">#{shortId(row.orderNumber || row.orderId)}</h3>
                          <StatusPill status={row.status} />
                          <StatusPill status={row.pickupStatus || "pending"} />
                          {shipment?.shipmentState && <StatusPill status={shipment.shipmentState} />}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Ready {formatDate(row.readyAt)} / {row.quantity || 0} item(s) / {formatPrice(row.payableAmount || 0)}
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-xs font-bold uppercase text-slate-400">COD amount</p>
                        <p className="text-lg font-bold text-primary-700">{formatPrice(row.codAmount || 0)}</p>
                      </div>
                    </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
                    <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{row.vendorName}</p>
                          <p className="mt-1 break-words text-sm text-slate-600">
                            {row.pickupAddress?.addressText || "Pickup address not set"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{row.vendorPhone || "No phone saved"}</p>
                          {row.location?.mapUrl && (
                            <a
                              href={row.location.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
                            >
                              Open map
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Deliver to</p>
                      <p className="mt-2 font-semibold text-slate-950">{row.customerName}</p>
                      <p className="mt-1 text-sm text-slate-600">{row.customerPhone || "No phone"}</p>
                      <p className="mt-1 break-words text-sm text-slate-600">{row.deliveryAddress || "Delivery address missing"}</p>
                    </div>

                    <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Parcel details</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{row.itemCount || 0} product line(s)</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {row.assignment?.courierName ? `Courier: ${row.assignment.courierName}` : "Courier not assigned yet"}
                      </p>
                      {row.pickupSchedule?.pickupDate && (
                        <p className="mt-1 text-sm text-slate-600">
                          Pickup: {formatDate(row.pickupSchedule.pickupDate)} {row.pickupSchedule.timeSlot || ""}
                        </p>
                      )}
                    </div>
                  </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      {shipment ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openParcelAssignment(shipment)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Truck className="h-4 w-4" />
                            Courier
                          </button>
                          {nextAction && (
                            <ShipmentAdvanceButton
                              action={nextAction}
                              disabled={saving}
                              onClick={() => advanceShipmentState(shipment, nextAction)}
                            />
                          )}
                        </>
                      ) : (
                        <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                          Waiting for vendor shipment record
                        </span>
                      )}
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="text-left text-xs uppercase text-slate-400">
                          <tr>
                            <th className="py-2 pr-4">Product</th>
                            <th className="py-2 pr-4">SKU</th>
                            <th className="py-2 pr-4">Qty</th>
                            <th className="py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(row.items || []).map((item) => (
                            <tr key={`${item.productId}-${item.sku}-${item.title}`}>
                              <td className="max-w-xs py-2 pr-4 font-medium text-slate-900">{item.title}</td>
                              <td className="py-2 pr-4 text-slate-500">{item.sku || "N/A"}</td>
                              <td className="py-2 pr-4 text-slate-600">{item.quantity}</td>
                              <td className="py-2 text-right font-semibold text-slate-900">{formatPrice(item.amount || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
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
                  <p className="text-sm font-bold text-primary-700">COD {formatPrice(group.codToCollect || 0)}</p>
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

        {activeTab === "parcels" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Parcel Courier Assignment</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assign RedX, Steadfast, local, or manual couriers to shipment parcels after vendor packing.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select className="input-control w-auto" value={shipmentStateFilter} onChange={(event) => setShipmentStateFilter(event.target.value)}>
                    <option value="all">All states</option>
                    <option value="created">Created</option>
                    <option value="pending_packing">Pending packing</option>
                    <option value="packed">Packed</option>
                    <option value="pickup_ready">Pickup ready</option>
                    <option value="pickup_scheduled">Pickup scheduled</option>
                    <option value="picked_up">Picked up</option>
                    <option value="in_transit">In transit</option>
                    <option value="out_for_delivery">Out for delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <button type="button" onClick={refreshShipments} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>

              {renderDeliveryActionPanel()}

              {parcelAssignment.shipmentId && (
                <form onSubmit={submitParcelAssignment} className="mt-4 grid gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                  <div>
                    <label className="text-xs font-bold uppercase text-primary-800">Selected parcel</label>
                    <p className="mt-1 font-semibold text-slate-950">#{shortId(parcelAssignment.shipmentId)}</p>
                    <p className="text-xs text-slate-600">Order #{shortId(selectedParcel?.orderId || "")}</p>
                  </div>
                  <select className="input-control" value={parcelAssignment.courierId} onChange={(event) => changeParcelCourier(event.target.value)}>
                    <option value="">Select courier</option>
                    {courierOptions.map((courier) => (
                      <option key={courier.value} value={courier.value}>
                        {courier.label} ({providerLabels[courier.provider] || courier.provider || "Manual"} / {courier.source})
                      </option>
                    ))}
                  </select>
                  {couriers.length === 0 && (
                    <p className="text-xs font-medium text-primary-800 lg:col-span-5">
                      No saved courier partners yet. RedX, Steadfast, Local, and Manual fallback options are available here; save partners in the Couriers tab for zone/SLA routing.
                    </p>
                  )}
                  <select className="input-control" value={parcelAssignment.bookingMode} onChange={(event) => setParcelAssignment({ ...parcelAssignment, bookingMode: event.target.value })}>
                    <option value="manual">Assign manually</option>
                    <option value="live">Book with courier API</option>
                  </select>
                  <input className="input-control" placeholder="Tracking number if manual" value={parcelAssignment.trackingNumber} onChange={(event) => setParcelAssignment({ ...parcelAssignment, trackingNumber: event.target.value })} />
                  <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                    <PackageCheck className="h-4 w-4" />
                    Assign
                  </button>
                  <input className="input-control lg:col-span-2" type="date" value={parcelAssignment.estimatedDeliveryDate} onChange={(event) => setParcelAssignment({ ...parcelAssignment, estimatedDeliveryDate: event.target.value })} />
                  <input className="input-control lg:col-span-3" placeholder="Admin note for courier handoff" value={parcelAssignment.note} onChange={(event) => setParcelAssignment({ ...parcelAssignment, note: event.target.value })} />
                </form>
              )}
            </div>

            {shipments.length === 0 && <EmptyPanel>No shipment parcels found for this filter.</EmptyPanel>}
            <div className="grid gap-3">
              {shipments.map((shipment) => {
                const nextAction = getNextShipmentAction(shipment);
                const canConfirmDelivery = deliveryConfirmationStates.has(shipment.shipmentState || "");
                return (
                  <div key={shipment._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-950">Parcel #{shortId(shipment._id)}</h3>
                          <StatusPill status={shipment.shipmentState || "created"} />
                          {shipment.codState && <StatusPill status={shipment.codState} />}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Order #{shortId(shipment.orderId)} / Vendor #{shortId(shipment.vendorId)} / {shipment.itemCount || 0} items
                        </p>
                        <p className="mt-2 max-w-3xl text-sm text-slate-600">
                          {shipment.deliveryAddressText || shipment.deliveryAddress?.address || "No delivery address"}
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[460px]">
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Courier</p>
                          <p className="mt-1 font-bold text-slate-950">{shipment.courierName || "Unassigned"}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Tracking</p>
                          <p className="mt-1 font-bold text-slate-950">{shipment.trackingNumber || "Pending"}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">COD</p>
                          <p className="mt-1 font-bold text-slate-950">{formatPrice(shipment.codAmount || 0)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-500">
                        Booking: {String(shipment.courierBookingStatus || "draft").replaceAll("_", " ")}
                        {shipment.courierConsignmentId ? ` / Consignment ${shipment.courierConsignmentId}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openParcelAssignment(shipment)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Truck className="h-4 w-4" />
                          Courier
                        </button>
                        {nextAction && (
                          <ShipmentAdvanceButton
                            action={nextAction}
                            disabled={saving}
                            onClick={() => advanceShipmentState(shipment, nextAction)}
                          />
                        )}
                        {canConfirmDelivery && (
                          <>
                            <button
                              type="button"
                              onClick={() => openDeliveryAction(shipment, "delivered")}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Delivered
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeliveryAction(shipment, "failed")}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Failed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className={`grid gap-6 ${canManageLogisticsSettings ? "xl:grid-cols-[460px_1fr]" : ""}`}>
            {canManageLogisticsSettings && (
            <form onSubmit={submitStaff} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Pickup Staff</h2>
              <input className="input-control" placeholder="Name" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} />
              <input className="input-control" placeholder="Phone" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} />
              <input className="input-control" type="email" placeholder="Login email for logistics access" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} />
              <input className="input-control" placeholder="Route name" value={staffForm.routeName} onChange={(event) => setStaffForm({ ...staffForm, routeName: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <select className="input-control" value={staffForm.status} onChange={(event) => setStaffForm({ ...staffForm, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="off_duty">Off duty</option>
                  <option value="inactive">Inactive</option>
                </select>
                <input className="input-control" type="time" value={staffForm.shiftStart} onChange={(event) => setStaffForm({ ...staffForm, shiftStart: event.target.value })} />
                <input className="input-control" type="time" value={staffForm.shiftEnd} onChange={(event) => setStaffForm({ ...staffForm, shiftEnd: event.target.value })} />
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-bold text-slate-950">Area coverage</p>
                  <p className="mt-1 text-xs text-slate-500">Assign the exact division, district, upazila, or union this logistics user will handle.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select className="input-control" value={staffLocationDraft.divisionId} onChange={(event) => updateStaffLocationDraft("divisionId", event.target.value)}>
                    <option value="">Division</option>
                    {geoData.divisions.map((division) => (
                      <option key={division.id} value={division.id}>{division.name}</option>
                    ))}
                  </select>
                  <select className="input-control" value={staffLocationDraft.districtId} disabled={!staffLocationDraft.divisionId} onChange={(event) => updateStaffLocationDraft("districtId", event.target.value)}>
                    <option value="">District</option>
                    {geoDistricts.map((district) => (
                      <option key={district.id} value={district.id}>{district.name}</option>
                    ))}
                  </select>
                  <select className="input-control" value={staffLocationDraft.upazilaId} disabled={!staffLocationDraft.districtId} onChange={(event) => updateStaffLocationDraft("upazilaId", event.target.value)}>
                    <option value="">Upazila / Thana</option>
                    {geoUpazilas.map((upazila) => (
                      <option key={upazila.id} value={upazila.id}>{upazila.name}</option>
                    ))}
                  </select>
                  <select className="input-control" value={staffLocationDraft.unionId} disabled={!staffLocationDraft.upazilaId} onChange={(event) => updateStaffLocationDraft("unionId", event.target.value)}>
                    <option value="">Union / Area</option>
                    {geoUnions.map((union) => (
                      <option key={union.id} value={union.id}>{union.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addStaffLocationAssignment}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                >
                  <Plus className="h-4 w-4" />
                  Add selected area
                </button>
                {(staffForm.assignedLocations || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {staffForm.assignedLocations.map((location) => (
                      <span key={`${location.level}-${location.id}-${location.label}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary-700">
                        <span className="truncate">{location.label || location.name}</span>
                        <button type="button" onClick={() => removeStaffLocationAssignment(location)} className="text-primary-500 hover:text-primary-800" aria-label={`Remove ${location.label || location.name}`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  className="input-control min-h-20"
                  placeholder="Coverage tokens are filled automatically; add manual area names only if needed"
                  value={staffForm.assignedZonesText}
                  onChange={(event) => setStaffForm({ ...staffForm, assignedZonesText: event.target.value })}
                />
              </div>
              <textarea className="input-control min-h-20" placeholder="Vendor IDs" value={staffForm.assignedVendorIdsText} onChange={(event) => setStaffForm({ ...staffForm, assignedVendorIdsText: event.target.value })} />
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                If the email matches an existing user, saving will set that user as logistics manager and notify them when matching vendor pickup orders become ready.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-control" placeholder="Vehicle" value={staffForm.vehicleType} onChange={(event) => setStaffForm({ ...staffForm, vehicleType: event.target.value })} />
                <input className="input-control" type="number" min="0" value={staffForm.capacityOrders} onChange={(event) => setStaffForm({ ...staffForm, capacityOrders: Number(event.target.value) })} />
              </div>
              <textarea className="input-control min-h-20" placeholder="Internal note" value={staffForm.notes} onChange={(event) => setStaffForm({ ...staffForm, notes: event.target.value })} />
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save staff
              </button>
            </form>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {pickupStaff.length === 0 && <EmptyPanel>No pickup staff found.</EmptyPanel>}
              {pickupStaff.map((staff) => (
                <div key={staff._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{staff.name}</h3>
                      <p className="text-sm text-slate-500">{staff.phone} · {staff.routeName || "No route"}</p>
                      {staff.email && <p className="text-xs text-slate-500">Login: {staff.email}</p>}
                    </div>
                    <StatusPill status={staff.status || "active"} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {(staff.assignedLocations || []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {staff.assignedLocations.map((location) => (
                          <span key={`${staff._id}-${location.level}-${location.id}-${location.label}`} className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                            {location.label || location.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">{(staff.assignedZones || []).join(", ") || "No zones assigned"}</p>
                    )}
                  </div>
                  {staff.linkedRole === "logistics_manager" && (
                    <p className="mt-2 inline-flex rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                      Logistics area access
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="font-semibold uppercase text-slate-400">Vehicle</p>
                      <p className="mt-1 font-bold text-slate-800">{staff.vehicleType || "Bike"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="font-semibold uppercase text-slate-400">Capacity</p>
                      <p className="mt-1 font-bold text-slate-800">{staff.capacityOrders || 0}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="font-semibold uppercase text-slate-400">Shift</p>
                      <p className="mt-1 font-bold text-slate-800">{staff.shiftStart || "--"}-{staff.shiftEnd || "--"}</p>
                    </div>
                  </div>
                  {canManageLogisticsSettings && (
                    <button
                      type="button"
                      onClick={() => setStaffForm({
                        ...emptyStaff,
                        ...staff,
                        staffId: staff._id,
                        assignedZonesText: (staff.assignedZones || []).join(", "),
                        assignedLocations: staff.assignedLocations || [],
                        assignedVendorIdsText: (staff.assignedVendorIds || []).join(", "),
                      })}
                      className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  )}
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
                  <option value="per_item">Per item fee</option>
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
                <input className="input-control" type="number" min="0" placeholder="Per item" value={ruleForm.perItemFee} onChange={(event) => setRuleForm({ ...ruleForm, perItemFee: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Per kg" value={ruleForm.feePerKg} onChange={(event) => setRuleForm({ ...ruleForm, feePerKg: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Free threshold" value={ruleForm.freeShippingThreshold} onChange={(event) => setRuleForm({ ...ruleForm, freeShippingThreshold: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Min order" value={ruleForm.minOrderAmount} onChange={(event) => setRuleForm({ ...ruleForm, minOrderAmount: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="Min kg" value={ruleForm.minWeightKg} onChange={(event) => setRuleForm({ ...ruleForm, minWeightKg: Number(event.target.value) })} />
                <input className="input-control" type="number" min="0" placeholder="COD fee" value={ruleForm.codFee} onChange={(event) => setRuleForm({ ...ruleForm, codFee: Number(event.target.value) })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select className="input-control" value={ruleForm.status} onChange={(event) => setRuleForm({ ...ruleForm, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <input className="input-control" type="number" min="0" placeholder="Priority" value={ruleForm.priority} onChange={(event) => setRuleForm({ ...ruleForm, priority: Number(event.target.value) })} />
                <input className="input-control" placeholder="Payment methods" value={ruleForm.paymentMethodsText} onChange={(event) => setRuleForm({ ...ruleForm, paymentMethodsText: event.target.value })} />
              </div>
              <textarea className="input-control min-h-20" placeholder="Internal note" value={ruleForm.notes} onChange={(event) => setRuleForm({ ...ruleForm, notes: event.target.value })} />
              <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
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
                        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">Per item {formatPrice(rule.perItemFee || 0)}</span>
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
              <Metric icon={AlertTriangle} label="Outstanding" value={formatPrice(codFloat.summary?.outstandingWithCouriers || 0)} tone="text-primary-700" />
            </div>
            <form onSubmit={submitCodRemittance} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Record COD remittance</h2>
                  <p className="text-sm text-slate-500">
                    Select collected orders below, then record the courier cash handover.
                  </p>
                </div>
                <div className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
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
                <button type="submit" disabled={saving || !codForm.courierName || (!codForm.remittedAmount && !selectedCodAmount)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
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
                        <tr key={row.orderId} className={selectedCodOrderIds.includes(row.orderId) ? "bg-primary-50/60" : "hover:bg-slate-50"}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedCodOrderIds.includes(row.orderId)}
                              onChange={() => toggleCodOrder(row)}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
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
                    <div><p className="text-slate-500">Outstanding</p><p className="font-bold text-primary-700">{formatPrice(row.outstandingAmount || 0)}</p></div>
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
                <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
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
