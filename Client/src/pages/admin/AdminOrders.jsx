import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  Download,
  Eye,
  FileText,
  Filter,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useCurrency from "../../hooks/useCurrency";
import {
  adminChangeOrderDeliveryAddress,
  adminExtendOrderReturnWindow,
  adminForceCancelOrder,
  adminForceRefundOrder,
  adminOverrideOrderStatus,
  adminReassignOrderCourier,
  exportAdminOrdersCsv,
  getAdminCodReconciliation,
  getAdminFraudQueue,
  getAdminOrderDetail,
  getAdminOrderManagement,
  getAdminSlaBreaches,
} from "../../services/api";
import {
  getCustomerOrderSummary,
  getOrderItemPricingSummaries,
} from "../../utils/customerOrders";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

const ORDER_STATUSES = [
  "pending",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const DEFAULT_FILTERS = {
  status: "all",
  vendorId: "",
  paymentMethod: "all",
  deliveryZone: "",
  from: "",
  to: "",
  search: "",
};

const filtersFromSearchParams = (searchParams) => ({
  search: searchParams.get("search") || "",
  status: searchParams.get("status") || "all",
  vendorId: searchParams.get("vendorId") || "",
  paymentMethod: searchParams.get("paymentMethod") || "all",
  deliveryZone: searchParams.get("deliveryZone") || "",
  from: searchParams.get("from") || "",
  to: searchParams.get("to") || "",
});

const DEFAULT_FORMS = {
  status: "processing",
  statusNote: "",
  cancelReason: "",
  refundAmount: "",
  refundReason: "",
  refundMethod: "manual",
  courierName: "",
  trackingNumber: "",
  riderName: "",
  riderPhone: "",
  courierNote: "",
  returnWindowUntil: "",
  returnWindowNote: "",
};

const statusTone = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-blue-200 bg-blue-50 text-blue-800",
  packed: "border-cyan-200 bg-cyan-50 text-cyan-800",
  ready_to_ship: "border-indigo-200 bg-indigo-50 text-indigo-800",
  shipped: "border-indigo-200 bg-indigo-50 text-indigo-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  returned: "border-slate-200 bg-slate-100 text-slate-700",
};

const statusDotTone = {
  pending: "bg-amber-500",
  processing: "bg-blue-500",
  packed: "bg-cyan-500",
  ready_to_ship: "bg-indigo-500",
  shipped: "bg-indigo-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
  returned: "bg-slate-500",
};

const metricAccent = {
  orange: "bg-[#F57224]/10 text-[#F57224] ring-[#F57224]/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#F57224] focus:ring-2 focus:ring-[#F57224]/20";
const softButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60";
const darkButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A1A2E] px-3 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60";
const orangeButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#F57224] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#d85f1b] disabled:opacity-60";

const formatStatus = (status = "") =>
  status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const shortId = (id = "") => id.toString().slice(-8).toUpperCase();

const getOrderPayableTotal = (order = {}) => getCustomerOrderSummary(order).total;
const getOrderDiscountTotal = (order = {}) => getCustomerOrderSummary(order).discount;

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

const formatCount = (value = 0) => Number(value || 0).toLocaleString("en-BD");

const cleanParams = (filters) =>
  Object.entries(filters).reduce((params, [key, value]) => {
    if (value && value !== "all") params[key] = value;
    return params;
  }, {});

const getVendorNames = (order) =>
  order?.vendorNames?.length
    ? order.vendorNames.join(", ")
    : order?.perVendorBreakdown?.map((vendor) => vendor.vendorName || vendor.shopName).filter(Boolean).join(", ") ||
      order?.primaryVendorName ||
      "Amiyo-Go";

const getAddressText = (shippingInfo = {}) =>
  [
    shippingInfo.name,
    shippingInfo.phone,
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.upazila,
    shippingInfo.district || shippingInfo.city,
    shippingInfo.division,
  ]
    .filter(Boolean)
    .join(", ");

function MetricTile({ icon: Icon, label, value, accent = "orange", helper }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-600">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${metricAccent[accent] || metricAccent.orange}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black text-[#1A1A2E]">{typeof value === "number" ? formatCount(value) : value}</p>
      {helper && <p className="mt-1 text-xs font-medium text-gray-500">{helper}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone[status] || "border-gray-200 bg-gray-50 text-gray-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotTone[status] || "bg-gray-400"}`} />
      {formatStatus(status)}
    </span>
  );
}

function EmptyPanel({ title }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
      {title}
    </div>
  );
}

export default function AdminOrders() {
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    ...filtersFromSearchParams(searchParams),
  }));
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ all: 0 });
  const [loading, setLoading] = useState(true);
  const [sideLoading, setSideLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [codData, setCodData] = useState({ summary: {}, orders: [] });
  const [slaData, setSlaData] = useState({ summary: {}, breaches: [] });
  const [fraudData, setFraudData] = useState({ summary: {}, orders: [] });
  const [forms, setForms] = useState(DEFAULT_FORMS);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    address: "",
    area: "",
    upazila: "",
    district: "",
    division: "",
  });

  const metrics = useMemo(
    () => ({
      total,
      pending: orders.filter((order) => order.status === "pending").length,
      processing: orders.filter((order) => ["processing", "packed", "ready_to_ship"].includes(order.status)).length,
      disputes: orders.filter((order) => ["return_requested", "returned"].includes(order.status)).length,
    }),
    [orders, total],
  );

  const vendorOptions = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      (order.perVendorBreakdown || []).forEach((vendor) => {
        if (vendor.vendorId) map.set(vendor.vendorId, vendor.vendorName || vendor.shopName || vendor.vendorId);
      });
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [orders]);

  const selectedOrder = orderDetail || orders.find((order) => order._id === selectedOrderId);

  const loadOrders = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await getAdminOrderManagement({
        ...cleanParams(nextFilters),
        page: 1,
        limit: 50,
      });
      const payload = response.data || {};
      const nextOrders = payload.data || payload.orders || [];
      setOrders(nextOrders);
      setTotal(payload.total || nextOrders.length);
      setStatusCounts({
        all: payload.statusCounts?.all ?? payload.total ?? nextOrders.length,
        ...(payload.statusCounts || {}),
      });
      if (nextFilters.search && nextOrders.length === 1) {
        loadDetail(nextOrders[0]._id);
      } else if (nextFilters.search && nextOrders.length !== 1) {
        setSelectedOrderId(null);
        setOrderDetail(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadSidePanels = async () => {
    setSideLoading(true);
    try {
      const [codResponse, slaResponse, fraudResponse] = await Promise.all([
        getAdminCodReconciliation({ limit: 500 }),
        getAdminSlaBreaches({ limit: 500 }),
        getAdminFraudQueue({ limit: 500 }),
      ]);
      setCodData(codResponse.data.data || { summary: {}, orders: [] });
      setSlaData(slaResponse.data.data || { summary: {}, breaches: [] });
      setFraudData(fraudResponse.data.data || { summary: {}, orders: [] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load order monitors");
    } finally {
      setSideLoading(false);
    }
  };

  const loadDetail = async (orderId) => {
    if (!orderId) return;
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    try {
      const response = await getAdminOrderDetail(orderId);
      const detail = response.data.data;
      setOrderDetail(detail);
      const shippingInfo = detail?.shippingInfo || {};
      setAddressForm({
        name: shippingInfo.name || "",
        phone: shippingInfo.phone || "",
        address: shippingInfo.address || "",
        area: shippingInfo.area || "",
        upazila: shippingInfo.upazila || "",
        district: shippingInfo.district || shippingInfo.city || "",
        division: shippingInfo.division || "",
      });
      setForms((current) => ({
        ...current,
        status: detail?.status || "processing",
        refundAmount: detail?.total ? String(detail.total) : "",
        courierName: detail?.courierName || "",
        trackingNumber: detail?.trackingNumber || "",
      }));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load order detail");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadSidePanels();
  }, []);

  useEffect(() => {
    const urlFilters = filtersFromSearchParams(searchParams);
    const hasChanged = Object.entries(urlFilters).some(([key, value]) => filters[key] !== value);
    if (!hasChanged) return;

    const next = { ...filters, ...urlFilters };
    setFilters(next);
    loadOrders(next);
  }, [searchParams]);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (key === "status") loadOrders(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    loadOrders();
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    loadOrders(DEFAULT_FILTERS);
  };

  const refreshAll = async () => {
    await Promise.all([loadOrders(), loadSidePanels()]);
    if (selectedOrderId) await loadDetail(selectedOrderId);
  };

  const runAction = async (action, successMessage) => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    try {
      await action();
      toast.success(successMessage);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const response = await exportAdminOrdersCsv(cleanParams(filters));
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Order export downloaded");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to export orders");
    }
  };

  if (loading && orders.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <Toaster position="top-right" />

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="rounded-lg border border-[#F57224]/20 bg-[#F57224]/10 p-2 text-[#F57224] transition hover:bg-[#F57224]/15" title="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="mb-1 inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#1A1A2E]">
                Amiyo-Go Admin
              </div>
              <h1 className="text-2xl font-black text-[#1A1A2E]">Order Management</h1>
              <p className="text-sm font-medium text-gray-500">Global operations across vendors, delivery, payment, SLA, and risk.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshAll}
              className={softButtonClass}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className={darkButtonClass}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile icon={PackageCheck} label="Filtered Orders" value={metrics.total} accent="orange" helper="Current view" />
          <MetricTile icon={CalendarClock} label="Pending" value={metrics.pending} accent="amber" helper="Needs attention" />
          <MetricTile icon={Truck} label="In Fulfillment" value={metrics.processing} accent="blue" helper="Processing to ship" />
          <MetricTile icon={AlertTriangle} label="SLA Breaches" value={slaData.summary?.total || 0} accent="red" helper="Operations risk" />
        </div>

        <form onSubmit={handleSearch} className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-[#1A1A2E]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F57224]/10 text-[#F57224]">
                <Filter className="h-4 w-4" />
              </span>
              Filters
            </div>
            <p className="text-xs font-semibold text-gray-500">{formatCount(total)} matching orders</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-7">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Search</span>
              <div className="flex rounded-lg border border-gray-300 bg-white transition focus-within:border-[#F57224] focus-within:ring-2 focus-within:ring-[#F57224]/20">
                <Search className="ml-3 mt-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none"
                  placeholder="Order, buyer, SKU"
                />
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Vendor</span>
              <select
                value={filters.vendorId}
                onChange={(event) => updateFilter("vendorId", event.target.value)}
                className={fieldClass}
              >
                <option value="">All vendors</option>
                {vendorOptions.map((vendor) => (
                  <option key={vendor.value} value={vendor.value}>
                    {vendor.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Payment</span>
              <select
                value={filters.paymentMethod}
                onChange={(event) => updateFilter("paymentMethod", event.target.value)}
                className={fieldClass}
              >
                <option value="all">All methods</option>
                <option value="cod">COD</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="bank">Bank</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Zone</span>
              <input
                value={filters.deliveryZone}
                onChange={(event) => updateFilter("deliveryZone", event.target.value)}
                className={fieldClass}
                placeholder="Dhaka, Chattogram"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">From</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">To</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className={`${orangeButtonClass} w-full`}>
                Apply
              </button>
              <button type="button" onClick={resetFilters} className={softButtonClass}>
                Reset
              </button>
            </div>
          </div>
        </form>

        {filters.search && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#F57224]/20 bg-[#F57224]/5 px-4 py-3 text-sm text-[#1A1A2E] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Searching order operations for {filters.search}</p>
              <p className="text-[#F57224]">Short order codes like #{String(filters.search).replace(/^#+/, "")} open the matching order automatically when only one result is found.</p>
            </div>
            <Link to="/admin/orders" className="inline-flex items-center justify-center rounded-lg border border-[#F57224]/25 bg-white px-3 py-2 font-semibold text-[#F57224] transition hover:bg-[#F57224]/10">
              Clear search
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
          {STATUS_TABS.map((tab) => {
            const isActive = filters.status === tab.key;
            const count = statusCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateFilter("status", tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1A1A2E] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                aria-label={`${tab.label} orders, ${formatCount(count)} total`}
              >
                <span>{tab.label}</span>
                <span
                  className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-black leading-5 ${
                    isActive
                      ? "bg-white text-gray-950"
                      : count > 0
                        ? "bg-[#F57224]/10 text-[#F57224] ring-1 ring-[#F57224]/20"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {formatCount(count)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-[#1A1A2E]">Global Orders</h2>
                    <span className="rounded-full bg-[#1A1A2E] px-2.5 py-1 text-xs font-black text-white">
                      {formatCount(total)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{loading ? "Loading..." : `${orders.length} visible from ${total} matching orders`}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F57224]/10 text-[#F57224]">
                  <FileText className="h-5 w-5" />
                </span>
              </div>

              {orders.length === 0 ? (
                <EmptyPanel title="No orders match the current filters." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-[#F5F5F5] text-left text-xs font-black uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Buyer</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Zone</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map((order) => (
                        <tr key={order._id} className={selectedOrderId === order._id ? "bg-[#F57224]/5" : "transition hover:bg-gray-50"}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">#{shortId(order._id)}</div>
                            <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                          </td>
                          <td className="max-w-40 px-4 py-3 text-gray-700">
                            <span className="line-clamp-2">{getVendorNames(order)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{order.shippingInfo?.name || "Customer"}</div>
                            <div className="text-xs text-gray-500">{order.shippingInfo?.phone || "No phone"}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="font-medium uppercase">{order.paymentMethod || "N/A"}</div>
                            <div className="text-xs text-gray-500">{formatStatus(order.paymentStatus || "pending")}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              {order.deliveryZone || order.shippingInfo?.district || order.shippingInfo?.city || "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatPrice(getOrderPayableTotal(order))}
                            {getOrderDiscountTotal(order) > 0 && (
                              <div className="text-xs font-semibold text-emerald-700">
                                -{formatPrice(getOrderDiscountTotal(order))} discount
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => loadDetail(order._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#F57224]/25 bg-white px-2.5 py-1.5 text-xs font-bold text-[#F57224] transition hover:bg-[#F57224]/10"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedOrder && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-[#F5F5F5] px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-[#1A1A2E]">Order #{shortId(selectedOrder._id)}</h2>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{getAddressText(selectedOrder.shippingInfo)}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-sm text-gray-500">Order total</p>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(getOrderPayableTotal(selectedOrder))}</p>
                    {getOrderDiscountTotal(selectedOrder) > 0 && (
                      <p className="text-xs font-semibold text-emerald-700">
                        Discount -{formatPrice(getOrderDiscountTotal(selectedOrder))}
                      </p>
                    )}
                  </div>
                </div>

                {detailLoading ? (
                  <div className="p-6">
                    <Loading />
                  </div>
                ) : (
                  <div className="grid gap-6 p-4 xl:grid-cols-2">
                    <div className="space-y-5">
                      <section>
                        <h3 className="mb-3 font-semibold text-gray-900">Buyer, Payment And Delivery</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-semibold uppercase text-gray-500">Buyer</p>
                            <p className="mt-1 font-semibold text-gray-900">{selectedOrder.shippingInfo?.name || "Customer"}</p>
                            <p className="text-sm text-gray-600">{selectedOrder.shippingInfo?.phone || "No phone"}</p>
                            <p className="text-sm text-gray-600">{selectedOrder.shippingInfo?.email || "No email"}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-semibold uppercase text-gray-500">Payment</p>
                            <p className="mt-1 font-semibold uppercase text-gray-900">{selectedOrder.paymentMethod || "N/A"}</p>
                            <p className="text-sm text-gray-600">{formatStatus(selectedOrder.paymentStatus || "pending")}</p>
                            <p className="text-sm text-gray-600">Delivery: {formatPrice(selectedOrder.deliveryCharge || 0)}</p>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="mb-3 font-semibold text-gray-900">Vendor Order Info</h3>
                        {(selectedOrder.perVendorBreakdown || []).length === 0 ? (
                          <EmptyPanel title="No vendor split found for this order." />
                        ) : (
                          <div className="space-y-3">
                            {(selectedOrder.perVendorBreakdown || []).map((vendor) => {
                              const vendorProducts = (selectedOrder.products || []).filter(
                                (product) => String(product.vendorId || "") === String(vendor.vendorId || ""),
                              );
                              return (
                                <div key={vendor.vendorId || vendor.vendorName} className="rounded-lg border border-gray-200 p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-gray-900">{vendor.vendorName || vendor.shopName || "Platform"}</p>
                                      <p className="font-mono text-xs text-gray-500">{vendor.vendorId || "platform"}</p>
                                      {vendor.vendorOrderId && (
                                        <p className="mt-1 font-mono text-xs text-gray-500">Vendor order #{shortId(vendor.vendorOrderId)}</p>
                                      )}
                                    </div>
                                    <div className="text-left sm:text-right">
                                      <StatusBadge status={vendor.vendorOrderStatus || selectedOrder.status} />
                                      <p className="mt-1 text-xs text-gray-500">Updated {formatDate(vendor.vendorOrderUpdatedAt || selectedOrder.updatedAt)}</p>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                                    <div className="rounded-lg bg-gray-50 p-2">
                                      <p className="text-xs text-gray-500">Gross</p>
                                      <p className="font-semibold text-gray-900">{formatPrice(vendor.grossSales || 0)}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-2">
                                      <p className="text-xs text-gray-500">Commission</p>
                                      <p className="font-semibold text-gray-900">{formatPrice(vendor.totalCommission || 0)}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-2">
                                      <p className="text-xs text-gray-500">Payable / earning</p>
                                      <p className="font-semibold text-gray-900">{formatPrice(vendor.vendorOrderTotal ?? vendor.netEarnings ?? 0)}</p>
                                      {vendor.vendorOrderTotal !== null && vendor.vendorOrderTotal !== undefined && Number(vendor.grossSales || 0) > Number(vendor.vendorOrderTotal || 0) && (
                                        <p className="text-xs font-semibold text-emerald-700">
                                          Discount -{formatPrice(Number(vendor.grossSales || 0) - Number(vendor.vendorOrderTotal || 0))}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {vendorProducts.map((product) => (
                                      <div key={`${vendor.vendorId}-${product.productId || product.sku || product.title}`} className="flex items-center justify-between gap-3 text-xs text-gray-600">
                                        <span className="line-clamp-1">{product.title || product.name || "Product"}</span>
                                        <span className="shrink-0">{formatStatus(product.itemStatus || selectedOrder.status)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {vendor.vendorId && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Link to={`/admin/vendors/${vendor.vendorId}`} className="rounded-lg border border-[#F57224]/25 bg-white px-2.5 py-1.5 text-xs font-bold text-[#F57224] transition hover:bg-[#F57224]/10">
                                        Vendor profile
                                      </Link>
                                      <Link to={`/admin/orders?vendorId=${vendor.vendorId}`} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50">
                                        Vendor orders
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      <section>
                        <h3 className="mb-3 font-semibold text-gray-900">Order Items</h3>
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                          {getOrderItemPricingSummaries(selectedOrder).map(({ item, index, quantity, grossLineTotal, discountShare, payableLineTotal }) => (
                            <div key={`${item.productId || item._id || item.sku}-${item.title || index}`} className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0">
                              <div>
                                <p className="font-medium text-gray-900">{item.title || item.name || "Product"}</p>
                                <p className="text-xs text-gray-500">{item.sku || item.vendorName || item.shopName || "No SKU"}</p>
                                {discountShare > 0 && (
                                  <p className="text-xs font-semibold text-emerald-700">
                                    Item discount -{formatPrice(discountShare)}
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-sm">
                                {discountShare > 0 && (
                                  <p className="text-xs font-semibold text-gray-400 line-through">{formatPrice(grossLineTotal)}</p>
                                )}
                                <p className="font-semibold text-gray-900">{formatPrice(payableLineTotal)}</p>
                                <p className="text-xs text-gray-500">Qty {quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h3 className="mb-3 font-semibold text-gray-900">Full Timeline</h3>
                        <div className="space-y-3">
                          {(selectedOrder.timeline || []).length === 0 ? (
                            <EmptyPanel title="No timeline events recorded yet." />
                          ) : (
                            selectedOrder.timeline.map((event, index) => (
                              <div key={`${event.type}-${event.status}-${event.createdAt}-${index}`} className="flex gap-3">
                                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#F57224]" />
                                <div className="flex-1 border-b border-gray-100 pb-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium text-gray-900">{event.label || formatStatus(event.status)}</p>
                                    <span className="text-xs text-gray-500">{formatDate(event.createdAt)}</span>
                                  </div>
                                  <p className="text-xs uppercase text-gray-500">{event.type || "event"} {event.actorRole ? `by ${event.actorRole}` : ""}</p>
                                  {event.note && <p className="mt-1 text-sm text-gray-600">{event.note}</p>}
                                  {(event.courierName || event.trackingNumber) && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {event.courierName} {event.trackingNumber ? `- ${event.trackingNumber}` : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="space-y-5">
                      <section>
                        <h3 className="mb-3 font-semibold text-gray-900">Admin Overrides</h3>
                        <div className="space-y-3">
                          <div className="rounded-lg border border-gray-200 p-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                value={forms.status}
                                onChange={(event) => setForms((current) => ({ ...current, status: event.target.value }))}
                                className={fieldClass}
                              >
                                {ORDER_STATUSES.map((status) => (
                                  <option key={status} value={status}>{formatStatus(status)}</option>
                                ))}
                              </select>
                              <input
                                value={forms.statusNote}
                                onChange={(event) => setForms((current) => ({ ...current, statusNote: event.target.value }))}
                                className={fieldClass}
                                placeholder="Status note"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => runAction(() => adminOverrideOrderStatus(selectedOrderId, { status: forms.status, note: forms.statusNote }), "Status overridden")}
                              className={`${darkButtonClass} mt-2`}
                            >
                              <Activity className="h-4 w-4" />
                              Override Status
                            </button>
                          </div>

                          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <input
                              value={forms.cancelReason}
                              onChange={(event) => setForms((current) => ({ ...current, cancelReason: event.target.value }))}
                              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                              placeholder="Force-cancel reason"
                            />
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => runAction(() => adminForceCancelOrder(selectedOrderId, { reason: forms.cancelReason }), "Order force-cancelled")}
                              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              Force Cancel
                            </button>
                          </div>

                          <div className="rounded-lg border border-gray-200 p-3">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <input
                                value={forms.refundAmount}
                                onChange={(event) => setForms((current) => ({ ...current, refundAmount: event.target.value }))}
                                className={fieldClass}
                                placeholder="Amount"
                              />
                              <input
                                value={forms.refundMethod}
                                onChange={(event) => setForms((current) => ({ ...current, refundMethod: event.target.value }))}
                                className={fieldClass}
                                placeholder="Method"
                              />
                              <input
                                value={forms.refundReason}
                                onChange={(event) => setForms((current) => ({ ...current, refundReason: event.target.value }))}
                                className={fieldClass}
                                placeholder="Reason"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() =>
                                runAction(
                                  () => adminForceRefundOrder(selectedOrderId, {
                                    amount: Number(forms.refundAmount || selectedOrder.total || 0),
                                    reason: forms.refundReason,
                                    method: forms.refundMethod,
                                  }),
                                  "Refund forced",
                                )
                              }
                              className={`${softButtonClass} mt-2`}
                            >
                              <Wallet className="h-4 w-4" />
                              Force Refund
                            </button>
                          </div>

                          <div className="rounded-lg border border-gray-200 p-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input value={forms.courierName} onChange={(event) => setForms((current) => ({ ...current, courierName: event.target.value }))} className={fieldClass} placeholder="Courier name" />
                              <input value={forms.trackingNumber} onChange={(event) => setForms((current) => ({ ...current, trackingNumber: event.target.value }))} className={fieldClass} placeholder="Tracking number" />
                              <input value={forms.riderName} onChange={(event) => setForms((current) => ({ ...current, riderName: event.target.value }))} className={fieldClass} placeholder="Rider name" />
                              <input value={forms.riderPhone} onChange={(event) => setForms((current) => ({ ...current, riderPhone: event.target.value }))} className={fieldClass} placeholder="Rider phone" />
                            </div>
                            <input value={forms.courierNote} onChange={(event) => setForms((current) => ({ ...current, courierNote: event.target.value }))} className={`${fieldClass} mt-2`} placeholder="Courier note" />
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() =>
                                runAction(
                                  () => adminReassignOrderCourier(selectedOrderId, {
                                    courierName: forms.courierName,
                                    trackingNumber: forms.trackingNumber,
                                    riderName: forms.riderName,
                                    riderPhone: forms.riderPhone,
                                    note: forms.courierNote,
                                  }),
                                  "Courier reassigned",
                                )
                              }
                              className={`${softButtonClass} mt-2`}
                            >
                              <Truck className="h-4 w-4" />
                              Reassign Courier
                            </button>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="mb-3 font-semibold text-gray-900">Address And Return Window</h3>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.keys(addressForm).map((key) => (
                              <input
                                key={key}
                                value={addressForm[key]}
                                onChange={(event) => setAddressForm((current) => ({ ...current, [key]: event.target.value }))}
                                className={fieldClass}
                                placeholder={formatStatus(key)}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => runAction(() => adminChangeOrderDeliveryAddress(selectedOrderId, { shippingInfo: addressForm, note: "Admin address correction" }), "Delivery address updated")}
                            className={`${softButtonClass} mt-2`}
                          >
                            <MapPin className="h-4 w-4" />
                            Change Address
                          </button>
                        </div>
                        <div className="mt-3 rounded-lg border border-gray-200 p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="datetime-local"
                              value={forms.returnWindowUntil}
                              onChange={(event) => setForms((current) => ({ ...current, returnWindowUntil: event.target.value }))}
                              className={fieldClass}
                            />
                            <input
                              value={forms.returnWindowNote}
                              onChange={(event) => setForms((current) => ({ ...current, returnWindowNote: event.target.value }))}
                              className={fieldClass}
                              placeholder="Reason"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => runAction(() => adminExtendOrderReturnWindow(selectedOrderId, { returnWindowUntil: forms.returnWindowUntil, note: forms.returnWindowNote }), "Return window extended")}
                            className={`${softButtonClass} mt-2`}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Extend Return Window
                          </button>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#F5F5F5] px-4 py-3">
                <div>
                  <h2 className="font-black text-[#1A1A2E]">COD Reconciliation</h2>
                  <p className="text-xs text-gray-500">{sideLoading ? "Loading..." : `${codData.summary?.totalCod || 0} COD orders`}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <Banknote className="h-5 w-5" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 text-sm">
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Collected</p><p className="font-black text-[#1A1A2E]">{formatCount(codData.summary?.collected || 0)}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Remitted</p><p className="font-black text-[#1A1A2E]">{formatCount(codData.summary?.remitted || 0)}</p></div>
                <div className="rounded-lg bg-red-50 p-3"><p className="text-red-600">Discrepancies</p><p className="font-black text-red-700">{formatCount(codData.summary?.discrepancies || 0)}</p></div>
                <div className="rounded-lg bg-[#F57224]/5 p-3"><p className="text-gray-500">COD Value</p><p className="font-black text-[#1A1A2E]">{formatPrice(codData.summary?.codValue || 0)}</p></div>
              </div>
              <div className="border-t border-gray-100">
                {(codData.orders || []).slice(0, 6).map((order) => (
                  <button key={order.orderId} type="button" onClick={() => loadDetail(order.orderId)} className="block w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F57224]/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">#{shortId(order.orderId)}</p>
                      <span className={order.hasDiscrepancy ? "text-xs font-semibold text-red-700" : "text-xs font-semibold text-gray-500"}>{formatStatus(order.reconciliationStatus)}</span>
                    </div>
                    <p className="text-xs text-gray-500">{order.vendorNames?.join(", ") || "Vendor"} - {formatPrice(order.total || 0)}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#F5F5F5] px-4 py-3">
                <div>
                  <h2 className="font-black text-[#1A1A2E]">SLA Breach Monitor</h2>
                  <p className="text-xs text-gray-500">{slaData.summary?.processing || 0} processing, {slaData.summary?.delivery || 0} delivery</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-200">
                  <CalendarClock className="h-5 w-5" />
                </span>
              </div>
              {(slaData.breaches || []).length === 0 ? (
                <div className="p-4"><EmptyPanel title="No SLA breaches found." /></div>
              ) : (
                (slaData.breaches || []).slice(0, 6).map((breach) => (
                  <button key={`${breach.orderId}-${breach.breachType}`} type="button" onClick={() => loadDetail(breach.orderId)} className="block w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-red-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">#{shortId(breach.orderId)}</p>
                      <span className="text-xs font-semibold text-red-700">{breach.breachHours}h late</span>
                    </div>
                    <p className="text-xs text-gray-500">{formatStatus(breach.breachType)} - {breach.vendorNames?.join(", ") || "Vendor"}</p>
                  </button>
                ))
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#F5F5F5] px-4 py-3">
                <div>
                  <h2 className="font-black text-[#1A1A2E]">Fraud Order Queue</h2>
                  <p className="text-xs text-gray-500">{fraudData.summary?.totalFlagged || 0} flagged orders</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F57224]/10 text-[#F57224] ring-1 ring-[#F57224]/20">
                  <ShieldAlert className="h-5 w-5" />
                </span>
              </div>
              {(fraudData.orders || []).length === 0 ? (
                <div className="p-4"><EmptyPanel title="No fraud signals found." /></div>
              ) : (
                (fraudData.orders || []).slice(0, 6).map((order) => (
                  <button key={order.orderId} type="button" onClick={() => loadDetail(order.orderId)} className="block w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F57224]/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">#{shortId(order.orderId)}</p>
                      <span className="text-xs font-semibold text-orange-700">{order.signals?.length || 0} signals</span>
                    </div>
                    <p className="text-xs text-gray-500">{order.signals?.[0]?.label || "Review required"}</p>
                  </button>
                ))
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
