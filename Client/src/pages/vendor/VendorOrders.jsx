import { Fragment, createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Barcode,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Inbox,
  MessageSquare,
  Package,
  PackageCheck,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import { generateVendorPackingSlip } from "../../utils/vendorPackingSlip";
import { hasVendorPermission } from "../../utils/vendorStaffPermissions";
import {
  downloadVendorBarcodeLabel,
  downloadVendorPackingSlip,
  getMyVendorProfile,
  getVendorOrders,
  getVendorOrderTimeline,
  getVendorReturns,
  markVendorCodCollected,
  rejectVendorOrder,
  scheduleVendorPickup,
  sendVendorBuyerMessage,
  updateVendorOrderStatus,
  vendorRespondToReturn,
  bulkUpdateVendorOrders,
} from "../../services/api";
import { getVendorOrderBulkWorkflow } from "../../utils/vendorOrderBulkActions";

const STATUS_META = {
  pending: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  accepted: {
    label: "Accepted",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  processing: {
    label: "Processing",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  packed: {
    label: "Packed",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  ready_to_ship: {
    label: "Ready to Ship",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  pickup_ready: {
    label: "Pickup Ready",
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  shipped: {
    label: "Shipped",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  delivered: {
    label: "Delivered",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  returned: {
    label: "Returned",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending", statuses: ["pending", "accepted", "processing"] },
  { key: "packed", label: "Packed", statuses: ["packed"] },
  { key: "ready_to_ship", label: "Ready to Ship", statuses: ["ready_to_ship", "pickup_ready"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  { key: "return_requested", label: "Return Requested" },
];

const PICKUP_SLOTS = [
  "09:00 AM - 12:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
  "06:00 PM - 09:00 PM",
];

const terminalStatuses = ["cancelled", "delivered", "returned"];

const getOrderId = (order) => order?._id?.toString?.() || String(order?._id || "");

const shortId = (id) => (id ? id.toString().slice(-8).toUpperCase() : "ORDER");

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateOnly = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const renderColor = (color) => {
  if (!color) return "";
  if (typeof color === "string") return color;
  if (typeof color === "object") return color.name || color.value || "";
  return "";
};

const deriveStatus = (order) => {
  const statuses = (order.products || []).map((product) => product.itemStatus || order.status || "pending");
  if (statuses.length === 0) return order.status || "pending";
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  if (statuses.every((status) => status === "returned")) return "returned";
  if (statuses.some((status) => status === "returned")) return "returned";
  if (statuses.every((status) => status === "delivered")) return "delivered";
  if (statuses.some((status) => status === "shipped")) return "shipped";
  if (statuses.some((status) => status === "pickup_ready")) return "pickup_ready";
  if (statuses.some((status) => status === "ready_to_ship")) return "ready_to_ship";
  if (statuses.some((status) => status === "packed")) return "packed";
  if (statuses.some((status) => ["accepted", "processing"].includes(status))) return "processing";
  return order.status || "pending";
};

const isCodOrder = (order) => {
  const method = String(order.paymentMethod || "").toLowerCase();
  return ["cod", "cash_on_delivery", "cash on delivery"].includes(method);
};

const buildAddress = (shippingInfo = {}) =>
  [
    shippingInfo.name,
    shippingInfo.phone,
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.union,
    shippingInfo.upazila,
    shippingInfo.city || shippingInfo.district,
    shippingInfo.division,
    shippingInfo.zipCode,
  ]
    .filter(Boolean)
    .join("\n");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const orderProductsTotal = (order) =>
  (order.products || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0,
  );

const orderDiscountTotal = (order) =>
  Number(order.totalDiscount ?? order.discount ?? order.vendorDiscount ?? order.couponDiscount ?? 0) || 0;

const orderPayableTotal = (order) => {
  const stored = Number(order.payableTotal ?? order.totalAmount ?? order.total ?? 0);
  if (stored > 0) return stored;

  const gross = Number(order.vendorSubtotal ?? order.subtotal ?? orderProductsTotal(order)) || 0;
  const delivery = Number(order.deliveryCharge ?? order.deliveryFee ?? order.shippingFee ?? 0) || 0;
  return Math.max(0, gross + delivery - orderDiscountTotal(order));
};

const exportOrdersCsv = (orders, moneyFormatter) => {
  const headers = ["Order ID", "Date", "Customer", "Phone", "Status", "Payment", "COD", "Items", "Total"];
  const rows = orders.map((order) => [
    getOrderId(order),
    formatDateTime(order.createdAt),
    order.shippingInfo?.name || "",
    order.shippingInfo?.phone || "",
    order.status || "",
    order.paymentMethod || "",
    isCodOrder(order) ? (order.codCollected ? "Collected" : "Pending") : "N/A",
    (order.products || []).map((item) => `${item.title || item.productDetails?.title || item.name || "Product"} x${item.quantity || 1}`).join(" | "),
    moneyFormatter(orderPayableTotal(order)),
  ]);
  const csv = [headers, ...rows]
    .map((line) => line.map((value) => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendor-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getReturnStatusLabel = (returnItem) =>
  (returnItem?.status || "pending").replace(/_/g, " ");

const getReturnEvents = (returnItem) => {
  const events = Array.isArray(returnItem?.timeline) ? returnItem.timeline : [];
  if (events.length > 0) return events;
  return [
    {
      label: `Return ${returnItem?.status || "submitted"}`,
      at: returnItem?.updatedAt || returnItem?.createdAt,
      note: returnItem?.reason || "",
    },
  ];
};

const buildBatchPackingSlipHtml = (orders, vendorProfile, moneyFormatter) => {
  const vendorName = vendorProfile?.shopName || vendorProfile?.businessName || "Vendor";
  const pages = orders
    .map((order) => {
      const orderId = getOrderId(order);
      const rows = (order.products || [])
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.title || item.productDetails?.title || item.name || "Product")}</td>
              <td>${escapeHtml(item.sku || item.selectedSize || "")}</td>
              <td>${item.quantity || 1}</td>
              <td>${escapeHtml(moneyFormatter(item.price || 0))}</td>
            </tr>
          `,
        )
        .join("");

      return `
        <section class="page">
          <header>
            <div>
              <h1>Packing Slip</h1>
              <p>${escapeHtml(vendorName)}</p>
            </div>
            <div class="order-id">#${escapeHtml(shortId(orderId))}</div>
          </header>
          <div class="grid">
            <div>
              <h2>Customer</h2>
              <p>${escapeHtml(buildAddress(order.shippingInfo)).replace(/\n/g, "<br>")}</p>
            </div>
            <div>
              <h2>Order</h2>
              <p>Created: ${escapeHtml(formatDateTime(order.createdAt))}</p>
              <p>Payment: ${escapeHtml(order.paymentMethod || "N/A")}</p>
              <p>Status: ${escapeHtml(STATUS_META[order.status]?.label || order.status || "Pending")}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Item</th><th>SKU/Variant</th><th>Qty</th><th>Price</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <footer>
            Subtotal: ${escapeHtml(moneyFormatter(order.vendorSubtotal || orderProductsTotal(order)))}
            ${orderDiscountTotal(order) > 0 ? `<br>Discount: -${escapeHtml(moneyFormatter(orderDiscountTotal(order)))}` : ""}
            <br>Payable: ${escapeHtml(moneyFormatter(orderPayableTotal(order)))}
          </footer>
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>Batch Packing Slips</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, sans-serif; }
          .page { min-height: 100vh; padding: 32px; page-break-after: always; }
          header { align-items: flex-start; border-bottom: 2px solid #111827; display: flex; justify-content: space-between; padding-bottom: 14px; }
          h1 { font-size: 24px; margin: 0; }
          h2 { font-size: 13px; margin: 0 0 8px; text-transform: uppercase; }
          p { margin: 3px 0; }
          .order-id { border: 1px solid #111827; font-family: monospace; font-size: 16px; font-weight: 700; padding: 8px 10px; }
          .grid { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin: 24px 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; font-size: 12px; padding: 9px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          footer { border-top: 2px solid #111827; font-size: 16px; font-weight: 700; margin-top: 20px; padding-top: 12px; text-align: right; }
          @media print { .page { page-break-after: always; } }
        </style>
      </head>
      <body>${pages}</body>
    </html>
  `;
};

export default function VendorOrders() {
  const { user, dbUser, role, permissions, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const vendorAccess = useMemo(
    () => ({ dbUser, role, permissions, isAdmin }),
    [dbUser, role, permissions, isAdmin],
  );
  const canManageOrders = hasVendorPermission(vendorAccess, "orders:manage");

  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [timelineByOrder, setTimelineByOrder] = useState({});
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [pickupModal, setPickupModal] = useState(null);
  const [messageModal, setMessageModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [ordersResult, vendorResult, returnsResult] = await Promise.allSettled([
        getVendorOrders({ limit: 100 }),
        getMyVendorProfile(),
        getVendorReturns({ limit: 100 }),
      ]);

      if (ordersResult.status === "fulfilled") {
        setOrders(ordersResult.value.data.orders || []);
      } else {
        toast.error(ordersResult.reason?.response?.data?.error || "Failed to load orders");
      }

      if (vendorResult.status === "fulfilled") {
        setVendorProfile(vendorResult.value.data.vendor || vendorResult.value.data.data || null);
      }

      if (returnsResult.status === "fulfilled") {
        setReturns(returnsResult.value.data.returns || returnsResult.value.data.data || []);
      } else {
        setReturns([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const returnsByOrder = useMemo(() => {
    const grouped = new Map();
    returns.forEach((returnItem) => {
      const orderId = returnItem.orderId?.toString?.() || String(returnItem.orderId || "");
      if (!orderId) return;
      const current = grouped.get(orderId) || [];
      current.push(returnItem);
      grouped.set(orderId, current);
    });
    return grouped;
  }, [returns]);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => {
        const orderId = getOrderId(order);
        const status = deriveStatus(order);
        const orderReturns = returnsByOrder.get(orderId) || [];
        return {
          ...order,
          status,
          returns: orderReturns,
          hasReturnRequest: orderReturns.length > 0,
        };
      }),
    [orders, returnsByOrder],
  );

  const matchesTab = useCallback((order, tabKey) => {
    if (tabKey === "all") return true;
    if (tabKey === "return_requested") return order.hasReturnRequest;
    const tab = FILTER_TABS.find((item) => item.key === tabKey);
    return tab?.statuses?.includes(order.status);
  }, []);

  const tabCounts = useMemo(() => {
    const counts = {};
    FILTER_TABS.forEach((tab) => {
      counts[tab.key] = enrichedOrders.filter((order) => matchesTab(order, tab.key)).length;
    });
    return counts;
  }, [enrichedOrders, matchesTab]);

  const stats = useMemo(
    () => ({
      pending: tabCounts.pending || 0,
      packed: tabCounts.packed || 0,
      ready: tabCounts.ready_to_ship || 0,
      returnRequested: tabCounts.return_requested || 0,
      codPending: enrichedOrders.filter(
        (order) => isCodOrder(order) && !order.codCollected && !["cancelled", "returned"].includes(order.status),
      ).length,
    }),
    [enrichedOrders, tabCounts],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enrichedOrders
      .filter((order) => matchesTab(order, activeTab))
      .filter((order) => {
        if (!query) return true;
        const searchable = [
          getOrderId(order),
          order.shippingInfo?.name,
          order.shippingInfo?.phone,
          order.paymentMethod,
          ...(order.products || []).map((item) => item.title || item.productDetails?.title || item.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      });
  }, [activeTab, enrichedOrders, matchesTab, search]);

  const selectedOrders = useMemo(
    () => enrichedOrders.filter((order) => selectedIds.has(getOrderId(order))),
    [enrichedOrders, selectedIds],
  );

  const bulkWorkflow = useMemo(
    () => getVendorOrderBulkWorkflow(selectedOrders),
    [selectedOrders],
  );

  const expandedOrder = useMemo(
    () => enrichedOrders.find((order) => getOrderId(order) === expandedOrderId),
    [enrichedOrders, expandedOrderId],
  );

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelection = (orderId) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectVisible = () => {
    const visibleIds = filteredOrders.map(getOrderId);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((previous) => {
      const next = new Set(previous);
      visibleIds.forEach((id) => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const loadTimeline = async (orderId) => {
    if (!orderId || timelineByOrder[orderId]) return;
    try {
      const response = await getVendorOrderTimeline(orderId);
      setTimelineByOrder((previous) => ({
        ...previous,
        [orderId]: response.data.timeline || [],
      }));
    } catch {
      setTimelineByOrder((previous) => ({
        ...previous,
        [orderId]: [],
      }));
    }
  };

  const toggleExpandedOrder = (orderId) => {
    const nextId = expandedOrderId === orderId ? null : orderId;
    setExpandedOrderId(nextId);
    if (nextId) loadTimeline(nextId);
  };

  const setLocalOrderStatus = (orderId, status, extra = {}) => {
    setOrders((previous) =>
      previous.map((order) => (getOrderId(order) === orderId ? { ...order, ...extra, status } : order)),
    );
  };

  const handleStatusUpdate = async (order, status) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot update them.");
      return;
    }

    const orderId = getOrderId(order);
    setBusyOrderId(orderId);
    const loadingToast = toast.loading("Updating order...");
    try {
      await updateVendorOrderStatus(orderId, status);
      setLocalOrderStatus(orderId, status);
      toast.success(`Marked ${STATUS_META[status]?.label || status}`, { id: loadingToast });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update order", { id: loadingToast });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleBatchStatusUpdate = async ({ orders: targetOrders, label, status }) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot update them.");
      return;
    }

    if (targetOrders.length === 0) {
      toast.error(`Select orders that can be marked ${label.toLowerCase()}`);
      return;
    }

    const loadingToast = toast.loading(`Marking selected orders ${label.toLowerCase()}...`);
    try {
      const response = await bulkUpdateVendorOrders({
        orderIds: targetOrders.map(getOrderId),
        status,
        note: `Bulk marked ${label.toLowerCase()} from seller center`,
      });
      const summary = response.data?.summary || { updated: targetOrders.length, failed: 0 };
      toast.success(`${summary.updated} orders marked ${label.toLowerCase()}${summary.failed ? `, ${summary.failed} failed` : ""}`, { id: loadingToast });
      clearSelection();
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || `Batch ${label.toLowerCase()} failed`, { id: loadingToast });
    }
  };

  const handleBatchPack = () =>
    handleBatchStatusUpdate({
      orders: bulkWorkflow.packableOrders,
      label: "Packed",
      status: "packed",
    });

  const handleBatchReadyToShip = () =>
    handleBatchStatusUpdate({
      orders: bulkWorkflow.readyToShipOrders,
      label: "Ready to Ship",
      status: "ready_to_ship",
    });

  const handleBatchPickupReady = () =>
    handleBatchStatusUpdate({
      orders: bulkWorkflow.pickupReadyOrders,
      label: "Pickup Ready",
      status: "pickup_ready",
    });

  const exportSelectedOrders = () => {
    const targetOrders = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (targetOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }
    exportOrdersCsv(targetOrders, formatPrice);
    toast.success(`${targetOrders.length} orders exported`);
  };

  const openPdfBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const downloadPackingSlipPdf = async (order) => {
    try {
      const orderId = getOrderId(order);
      const response = await downloadVendorPackingSlip(orderId);
      openPdfBlob(response.data, `packing-slip-${orderId}.pdf`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to open packing slip");
    }
  };

  const downloadBarcodePdf = async (order) => {
    try {
      const orderId = getOrderId(order);
      const response = await downloadVendorBarcodeLabel(orderId);
      openPdfBlob(response.data, `waybill-${orderId}.pdf`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to open waybill label");
    }
  };

  const printPackingSlip = (order) => {
    const orderId = getOrderId(order);
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    const html = generateVendorPackingSlip(order, {
      businessName: vendorProfile?.businessName || vendorProfile?.shopName || order.products?.[0]?.shopName,
      shopName: vendorProfile?.shopName || order.products?.[0]?.shopName,
      phone: vendorProfile?.phone || order.products?.[0]?.vendorPhone || "",
      email: vendorProfile?.email || order.products?.[0]?.vendorEmail || "",
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    toast.success(`Packing slip ready for ${shortId(orderId)}`);
  };

  const printBatchPackingSlips = () => {
    if (selectedOrders.length === 0) {
      toast.error("Select orders to print");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildBatchPackingSlipHtml(selectedOrders, vendorProfile, formatPrice));
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const copyAddress = (shippingInfo) => {
    const address = buildAddress(shippingInfo);
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => toast.success("Address copied"));
  };

  const openPickupSchedule = (order) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot schedule pickups.");
      return;
    }

    setPickupModal({
      order,
      pickupDate: todayInputValue(),
      timeSlot: order.pickupSchedule?.timeSlot || PICKUP_SLOTS[0],
      courierName: order.pickupSchedule?.courierName || "Platform courier",
      notes: order.pickupSchedule?.notes || "",
    });
  };

  const submitPickupSchedule = async (event) => {
    event.preventDefault();
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot schedule pickups.");
      return;
    }

    const orderId = getOrderId(pickupModal.order);
    const loadingToast = toast.loading("Scheduling pickup...");
    try {
      await scheduleVendorPickup(orderId, {
        pickupDate: pickupModal.pickupDate,
        timeSlot: pickupModal.timeSlot,
        courierName: pickupModal.courierName,
        notes: pickupModal.notes,
      });
      toast.success("Pickup scheduled", { id: loadingToast });
      setPickupModal(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to schedule pickup", { id: loadingToast });
    }
  };

  const openBuyerMessage = (order) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot message buyers.");
      return;
    }

    setMessageModal({
      order,
      message: "",
    });
  };

  const submitBuyerMessage = async (event) => {
    event.preventDefault();
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot message buyers.");
      return;
    }

    const orderId = getOrderId(messageModal.order);
    const loadingToast = toast.loading("Sending message...");
    try {
      await sendVendorBuyerMessage(orderId, { message: messageModal.message });
      toast.success("Message sent", { id: loadingToast });
      setMessageModal(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send message", { id: loadingToast });
    }
  };

  const openCancelOrder = (order) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot cancel items.");
      return;
    }

    setCancelModal({
      order,
      reason: "",
      notes: "",
    });
  };

  const submitCancellation = async (event) => {
    event.preventDefault();
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot cancel items.");
      return;
    }

    const orderId = getOrderId(cancelModal.order);
    const loadingToast = toast.loading("Cancelling order items...");
    try {
      await rejectVendorOrder(orderId, {
        reason: cancelModal.reason,
        notes: cancelModal.notes,
      });
      toast.success("Cancellation recorded", { id: loadingToast });
      setCancelModal(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to cancel order", { id: loadingToast });
    }
  };

  const markCodCollected = async (order) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot record COD.");
      return;
    }

    const orderId = getOrderId(order);
    const loadingToast = toast.loading("Recording COD collection...");
    try {
      await markVendorCodCollected(orderId);
      toast.success("COD collection recorded", { id: loadingToast });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to record COD collection", { id: loadingToast });
    }
  };

  const openReturnAction = (returnItem, action) => {
    setReturnModal({
      returnItem,
      action,
      notes: "",
      reason: "",
      evidence: "",
    });
  };

  const submitReturnAction = async (event) => {
    event.preventDefault();
    const action = returnModal.action;
    const evidenceImages = returnModal.evidence
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const loadingToast = toast.loading(action === "approved" ? "Approving return..." : "Rejecting return...");
    try {
      await vendorRespondToReturn(returnModal.returnItem._id, {
        action,
        notes: returnModal.notes,
        rejectionReason: returnModal.reason,
        disputeReason: returnModal.reason,
        evidenceImages,
      });
      toast.success(action === "approved" ? "Return approved" : "Return rejected", { id: loadingToast });
      setReturnModal(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to respond to return", { id: loadingToast });
    }
  };

  const renderOrderActions = (order, { align = "end" } = {}) => {
    const orderId = getOrderId(order);
    const isBusy = busyOrderId === orderId;
    const canMove = !terminalStatuses.includes(order.status);
    const alignClass = align === "start" ? "justify-start" : "justify-end";

    return (
      <>
        <div className={`flex flex-wrap gap-2 ${alignClass}`}>
          <Link
            to={`/vendor/orders/${orderId}`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Details
          </Link>
          <IconButton title="View details" onClick={() => toggleExpandedOrder(orderId)}>
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton title="Print packing slip" onClick={() => printPackingSlip(order)}>
            <Printer className="h-4 w-4" />
          </IconButton>
          <IconButton title="Download packing slip PDF" onClick={() => downloadPackingSlipPdf(order)}>
            <FileText className="h-4 w-4" />
          </IconButton>
          <IconButton title="Download waybill barcode" onClick={() => downloadBarcodePdf(order)}>
            <Barcode className="h-4 w-4" />
          </IconButton>
        </div>
        <div className={`mt-2 flex flex-wrap gap-2 ${alignClass}`}>
          {canMove && !["packed", "ready_to_ship", "pickup_ready", "shipped"].includes(order.status) && (
            <SmallActionButton disabled={isBusy || !canManageOrders} onClick={() => handleStatusUpdate(order, "packed")}>
              Pack
            </SmallActionButton>
          )}
          {canMove && ["packed", "processing", "pending"].includes(order.status) && (
            <SmallActionButton disabled={isBusy || !canManageOrders} onClick={() => handleStatusUpdate(order, "ready_to_ship")}>
              Ready
            </SmallActionButton>
          )}
          {canMove && ["packed", "ready_to_ship", "pickup_ready"].includes(order.status) && (
            <SmallActionButton disabled={isBusy || !canManageOrders} onClick={() => openPickupSchedule(order)}>
              Schedule
            </SmallActionButton>
          )}
          {canMove && ["ready_to_ship", "pickup_ready"].includes(order.status) && (
            <SmallActionButton disabled={isBusy || !canManageOrders} onClick={() => handleStatusUpdate(order, "shipped")}>
              Ship
            </SmallActionButton>
          )}
          {order.status === "shipped" && (
            <SmallActionButton disabled={isBusy || !canManageOrders} onClick={() => handleStatusUpdate(order, "delivered")}>
              Deliver
            </SmallActionButton>
          )}
          {isCodOrder(order) && !order.codCollected && order.status !== "cancelled" && (
            <SmallActionButton disabled={isBusy || !canManageOrders} onClick={() => markCodCollected(order)}>
              COD
            </SmallActionButton>
          )}
          <SmallActionButton disabled={!canManageOrders} onClick={() => openBuyerMessage(order)}>Message</SmallActionButton>
          {canMove && (
            <SmallDangerButton disabled={isBusy || !canManageOrders} onClick={() => openCancelOrder(order)}>
              Cancel
            </SmallDangerButton>
          )}
          {!canManageOrders && (
            <span className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-500">
              View-only
            </span>
          )}
        </div>
      </>
    );
  };

  if (loading) return <Loading />;

  const allVisibleSelected =
    filteredOrders.length > 0 && filteredOrders.every((order) => selectedIds.has(getOrderId(order)));

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/vendor/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
              <p className="text-sm text-slate-500">Manage customer orders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {!canManageOrders && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Your staff role can review orders, print slips, and inspect details. Fulfillment updates, buyer messages, COD collection, and cancellations require order management access.
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Pending" value={stats.pending} tone="amber" icon={Clock} />
          <MetricCard label="Packed" value={stats.packed} tone="indigo" icon={PackageCheck} />
          <MetricCard label="Ready to Ship" value={stats.ready} tone="cyan" icon={Truck} />
          <MetricCard label="Return Requested" value={stats.returnRequested} tone="rose" icon={RotateCcw} />
          <MetricCard label="COD Pending" value={stats.codPending} tone="emerald" icon={Banknote} />
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order, customer, phone, product"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {bulkWorkflow.selectedCount > 0 && (
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                    {bulkWorkflow.selectedCount} selected
                  </span>
                )}
                <button
                  type="button"
                  onClick={printBatchPackingSlips}
                  disabled={bulkWorkflow.printableOrders.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Print Slips
                </button>
                <button
                  type="button"
                  onClick={exportSelectedOrders}
                  disabled={filteredOrders.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleBatchPack}
                  disabled={!canManageOrders || bulkWorkflow.packableOrders.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PackageCheck className="h-4 w-4" />
                  Pack {bulkWorkflow.counts.pack ? `(${bulkWorkflow.counts.pack})` : ""}
                </button>
                <button
                  type="button"
                  onClick={handleBatchReadyToShip}
                  disabled={!canManageOrders || bulkWorkflow.readyToShipOrders.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" />
                  Ready {bulkWorkflow.counts.ready_to_ship ? `(${bulkWorkflow.counts.ready_to_ship})` : ""}
                </button>
                <button
                  type="button"
                  onClick={handleBatchPickupReady}
                  disabled={!canManageOrders || bulkWorkflow.pickupReadyOrders.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" />
                  Pickup Ready {bulkWorkflow.counts.pickup_ready ? `(${bulkWorkflow.counts.pickup_ready})` : ""}
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? "bg-orange-500 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  <span className={activeTab === tab.key ? "ml-2 text-orange-100" : "ml-2 text-slate-400"}>
                    {tabCounts[tab.key] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Inbox className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">No orders found</h2>
              <p className="mt-1 text-sm text-slate-500">Try another tab or search term.</p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-slate-200 lg:hidden">
              {filteredOrders.map((order) => {
                const orderId = getOrderId(order);
                const statusMeta = STATUS_META[order.status] || STATUS_META.pending;
                const products = order.products || [];
                const primaryProduct = products[0];
                const isExpanded = expandedOrderId === orderId;

                return (
                  <article key={orderId} className="bg-white p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(orderId)}
                        onChange={() => toggleSelection(orderId)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                        aria-label={`Select order ${shortId(orderId)}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            to={`/vendor/orders/${orderId}`}
                            className="font-mono text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            #{shortId(orderId)}
                          </Link>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                        <div className="mt-3 flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {primaryProduct?.image || primaryProduct?.productDetails?.images?.[0] ? (
                              <img
                                src={primaryProduct.image || primaryProduct.productDetails.images[0]}
                                alt={primaryProduct.title || primaryProduct.productDetails?.title || "Product"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                              {primaryProduct?.title || primaryProduct?.productDetails?.title || "Product"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {products.length} item{products.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-100 p-3">
                            <p className="text-xs font-semibold uppercase text-slate-400">Customer</p>
                            <p className="mt-1 font-semibold text-slate-950">{order.shippingInfo?.name || "Customer"}</p>
                            <p className="text-xs text-slate-500">{order.shippingInfo?.phone || "No phone"}</p>
                          </div>
                          <div className="rounded-lg border border-slate-100 p-3">
                            <p className="text-xs font-semibold uppercase text-slate-400">Total</p>
                            <p className="mt-1 font-semibold text-slate-950">
                              {formatPrice(orderPayableTotal(order))}
                            </p>
                            {orderDiscountTotal(order) > 0 && (
                              <p className="text-xs font-semibold text-emerald-700">
                                {formatPrice(order.vendorSubtotal || orderProductsTotal(order))} subtotal - {formatPrice(orderDiscountTotal(order))} discount
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              {isCodOrder(order) ? (order.codCollected ? "COD collected" : "COD pending") : "Prepaid"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-100 p-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                            {order.pickupSchedule
                              ? `${formatDateOnly(order.pickupSchedule.pickupDate)} ${order.pickupSchedule.timeSlot || ""}`
                              : "No pickup slot"}
                          </div>
                          {order.hasReturnRequest && (
                            <span className="mt-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              Return requested
                            </span>
                          )}
                        </div>
                        <div className="mt-4">{renderOrderActions(order, { align: "start" })}</div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <OrderDetail
                          order={order}
                          timeline={timelineByOrder[orderId]}
                          formatPrice={formatPrice}
                          onCopyAddress={copyAddress}
                          onMessage={openBuyerMessage}
                          onReturnAction={openReturnAction}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectVisible}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                        aria-label="Select visible orders"
                      />
                    </th>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pickup / COD</TableHead>
                    <TableHead align="right">Total</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredOrders.map((order) => {
                    const orderId = getOrderId(order);
                    const statusMeta = STATUS_META[order.status] || STATUS_META.pending;
                    const products = order.products || [];
                    const primaryProduct = products[0];
                    const isExpanded = expandedOrderId === orderId;

                    return (
                      <Fragment key={orderId}>
                        <tr className="align-top transition hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(orderId)}
                              onChange={() => toggleSelection(orderId)}
                              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                              aria-label={`Select order ${shortId(orderId)}`}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              to={`/vendor/orders/${orderId}`}
                              className="font-mono text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              #{shortId(orderId)}
                            </Link>
                            <div className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</div>
                            {order.isPartialOrder && (
                              <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                Split order
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-slate-950">{order.shippingInfo?.name || "Customer"}</div>
                            <div className="mt-1 text-sm text-slate-500">{order.shippingInfo?.phone || "No phone"}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex max-w-xs items-start gap-3">
                              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                {primaryProduct?.image || primaryProduct?.productDetails?.images?.[0] ? (
                                  <img
                                    src={primaryProduct.image || primaryProduct.productDetails.images[0]}
                                    alt={primaryProduct.title || primaryProduct.productDetails?.title || "Product"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-950">
                                  {primaryProduct?.title || primaryProduct?.productDetails?.title || "Product"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {products.length} item{products.length === 1 ? "" : "s"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                            {order.hasReturnRequest && (
                              <span className="mt-2 flex w-fit rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                Return requested
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-2 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                                {order.pickupSchedule
                                  ? `${formatDateOnly(order.pickupSchedule.pickupDate)} ${order.pickupSchedule.timeSlot || ""}`
                                  : "No pickup slot"}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Banknote className="h-3.5 w-3.5 text-slate-400" />
                                {isCodOrder(order) ? (order.codCollected ? "COD collected" : "COD pending") : "Prepaid"}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-semibold text-slate-950">
                            {formatPrice(orderPayableTotal(order))}
                            {orderDiscountTotal(order) > 0 && (
                              <div className="text-xs font-semibold text-emerald-700">
                                -{formatPrice(orderDiscountTotal(order))} discount
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {renderOrderActions(order)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-slate-50 px-4 py-5">
                              <OrderDetail
                                order={order}
                                timeline={timelineByOrder[orderId]}
                                formatPrice={formatPrice}
                                onCopyAddress={copyAddress}
                                onMessage={openBuyerMessage}
                                onReturnAction={openReturnAction}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        {expandedOrder && (
          <div className="mt-3 text-xs text-slate-500">
            Open order #{shortId(getOrderId(expandedOrder))} is showing vendor-specific items only.
          </div>
        )}
      </main>

      {pickupModal && (
        <Modal title={`Schedule pickup #${shortId(getOrderId(pickupModal.order))}`} onClose={() => setPickupModal(null)}>
          <form onSubmit={submitPickupSchedule} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Pickup date
              <input
                type="date"
                required
                min={todayInputValue()}
                value={pickupModal.pickupDate}
                onChange={(event) => setPickupModal((current) => ({ ...current, pickupDate: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Time slot
              <select
                value={pickupModal.timeSlot}
                onChange={(event) => setPickupModal((current) => ({ ...current, timeSlot: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                {PICKUP_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Courier
              <input
                type="text"
                required
                value={pickupModal.courierName}
                onChange={(event) => setPickupModal((current) => ({ ...current, courierName: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                value={pickupModal.notes}
                onChange={(event) => setPickupModal((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <ModalActions onCancel={() => setPickupModal(null)} submitLabel="Schedule pickup" icon={CalendarClock} />
          </form>
        </Modal>
      )}

      {messageModal && (
        <Modal title={`Message buyer #${shortId(getOrderId(messageModal.order))}`} onClose={() => setMessageModal(null)}>
          <form onSubmit={submitBuyerMessage} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Message
              <textarea
                value={messageModal.message}
                required
                maxLength={1000}
                onChange={(event) => setMessageModal((current) => ({ ...current, message: event.target.value }))}
                rows={5}
                placeholder="Example: Your order is packed and will be handed to courier today."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <ModalActions onCancel={() => setMessageModal(null)} submitLabel="Send message" icon={Send} />
          </form>
        </Modal>
      )}

      {cancelModal && (
        <Modal title={`Cancel order #${shortId(getOrderId(cancelModal.order))}`} onClose={() => setCancelModal(null)}>
          <form onSubmit={submitCancellation} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Reason
              <select
                required
                value={cancelModal.reason}
                onChange={(event) => setCancelModal((current) => ({ ...current, reason: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select reason</option>
                <option value="Out of stock">Out of stock</option>
                <option value="Damaged inventory">Damaged inventory</option>
                <option value="Pricing error">Pricing error</option>
                <option value="Unable to ship on time">Unable to ship on time</option>
                <option value="Customer requested cancellation">Customer requested cancellation</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                value={cancelModal.notes}
                onChange={(event) => setCancelModal((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Keep order
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" />
                Cancel items
              </button>
            </div>
          </form>
        </Modal>
      )}

      {returnModal && (
        <Modal
          title={`${returnModal.action === "approved" ? "Approve" : "Reject"} return #${shortId(returnModal.returnItem._id)}`}
          onClose={() => setReturnModal(null)}
        >
          <form onSubmit={submitReturnAction} className="space-y-4">
            {returnModal.action !== "approved" && (
              <label className="block text-sm font-medium text-slate-700">
                Reason
                <textarea
                  required
                  value={returnModal.reason}
                  onChange={(event) => setReturnModal((current) => ({ ...current, reason: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                value={returnModal.notes}
                onChange={(event) => setReturnModal((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Evidence links
              <textarea
                value={returnModal.evidence}
                onChange={(event) => setReturnModal((current) => ({ ...current, evidence: event.target.value }))}
                rows={3}
                placeholder="One image or document URL per line"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <ModalActions
              onCancel={() => setReturnModal(null)}
              submitLabel={returnModal.action === "approved" ? "Approve return" : "Reject return"}
              icon={returnModal.action === "approved" ? CheckCircle2 : XCircle}
              danger={returnModal.action !== "approved"}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
    >
      {children}
    </button>
  );
}

function SmallActionButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SmallDangerButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {createElement(icon, { className: "h-5 w-5" })}
        </div>
      </div>
    </div>
  );
}

function OrderDetail({ order, timeline = [], formatPrice, onCopyAddress, onMessage, onReturnAction }) {
  const products = order.products || [];
  const cancellationText =
    order.cancellationMessage || order.cancellationReason || order.products?.find((item) => item.rejectionReason)?.rejectionReason;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        {cancellationText && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="font-semibold">Cancellation reason</div>
            <p className="mt-1">{cancellationText}</p>
            {order.cancellationNotes && <p className="mt-1 text-red-700">{order.cancellationNotes}</p>}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Order Items</h3>
            <span className="text-xs text-slate-500">{products.length} item{products.length === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {products.map((item, index) => (
              <div key={`${item.productId || item._id || index}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {item.image || item.productDetails?.images?.[0] ? (
                    <img
                      src={item.image || item.productDetails.images[0]}
                      alt={item.title || item.productDetails?.title || "Product"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-950">{item.title || item.productDetails?.title || "Product"}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>Qty {item.quantity || 1}</span>
                    <span>{formatPrice(item.price || 0)}</span>
                    {item.selectedSize && <span>Size {item.selectedSize}</span>}
                    {renderColor(item.selectedColor) && <span>Color {renderColor(item.selectedColor)}</span>}
                    {item.sku && <span>SKU {item.sku}</span>}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold text-slate-950">
                  {formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Buyer Messages</h3>
            <button
              type="button"
              onClick={() => onMessage(order)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Message
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {(order.customerMessages || []).length === 0 ? (
              <p className="text-sm text-slate-500">No messages for this order.</p>
            ) : (
              order.customerMessages.map((message) => (
                <div key={message._id || message.createdAt} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{message.vendorName || "Vendor"}</span>
                    <span>{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{message.message}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Customer</h3>
            <button
              type="button"
              onClick={() => onCopyAddress(order.shippingInfo)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
            {buildAddress(order.shippingInfo) || "No shipping address"}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-950">Timeline</h3>
          <div className="mt-3 space-y-3">
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">No timeline events yet.</p>
            ) : (
              timeline.map((event, index) => (
                <div key={`${event.status || event.label}-${event.timestamp || event.at || index}`} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-950">{event.label || event.status}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(event.timestamp || event.at || event.createdAt)}</div>
                    {event.note && <div className="mt-1 text-xs text-slate-600">{event.note}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-950">Returns</h3>
          <div className="mt-3 space-y-3">
            {(order.returns || []).length === 0 ? (
              <p className="text-sm text-slate-500">No return request.</p>
            ) : (
              order.returns.map((returnItem) => (
                <div key={returnItem._id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{returnItem.productTitle || "Returned item"}</div>
                      <div className="mt-1 text-xs capitalize text-slate-500">{getReturnStatusLabel(returnItem)}</div>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-950">
                      {formatPrice(returnItem.refundAmount || 0)}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{returnItem.reason}</p>
                  {returnItem.description && <p className="mt-1 text-xs text-slate-500">{returnItem.description}</p>}
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {getReturnEvents(returnItem).map((event, index) => (
                      <div key={`${returnItem._id}-${index}`} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>
                          <span className="font-medium text-slate-800">{event.label || event.status}</span>
                          {event.at && ` - ${formatDateTime(event.at)}`}
                          {event.note && ` - ${event.note}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {returnItem.status === "pending" && !returnItem.vendorResponse && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onReturnAction(returnItem, "approved")}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onReturnAction(returnItem, "rejected")}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-950">Payment</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between gap-3">
              <span>Method</span>
              <span className="font-medium capitalize text-slate-950">{order.paymentMethod || "N/A"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Status</span>
              <span className="font-medium capitalize text-slate-950">{order.paymentStatus || "pending"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>COD</span>
              <span className="font-medium text-slate-950">
                {isCodOrder(order) ? (order.codCollected ? "Collected" : "Pending") : "Not COD"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            title="Close"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, submitLabel, icon, danger = false }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Cancel
      </button>
      <button
        type="submit"
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white ${
          danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
        }`}
      >
        {createElement(icon, { className: "h-4 w-4" })}
        {submitLabel}
      </button>
    </div>
  );
}
