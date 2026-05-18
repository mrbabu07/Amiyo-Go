import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Barcode,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  MessageSquare,
  Package,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  downloadVendorBarcodeLabel,
  downloadVendorPackingSlip,
  getVendorOrderDetail,
  getVendorOrderTimeline,
  getVendorReturns,
  markVendorCodCollected,
  recordVendorDeliveryException,
  rejectVendorOrder,
  scheduleVendorPickup,
  sendVendorBuyerMessage,
  updateVendorOrderStatus,
} from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";
import {
  buildVendorOrderAddress,
  buildVendorOrderTimeline,
  getVendorOrderActionPlan,
  getVendorOrderFinancials,
  getVendorOrderId,
  getVendorOrderStatusMeta,
  isVendorCodOrder,
  shortVendorOrderId,
} from "../../utils/vendorOrderDetail";
import useAuth from "../../hooks/useAuth";
import { hasVendorPermission } from "../../utils/vendorStaffPermissions";

const pickupSlots = [
  "09:00 AM - 12:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
  "06:00 PM - 09:00 PM",
];

const deliveryExceptionReasons = [
  "Courier missed pickup",
  "Customer unavailable",
  "Address issue",
  "Parcel damaged",
  "COD collection dispute",
  "Weather or road issue",
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const formatDateTime = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const renderColor = (color) => {
  if (!color) return "";
  if (typeof color === "string") return color;
  if (typeof color === "object") return color.name || color.value || "";
  return "";
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

function SummaryCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function ActionButton({ children, icon: Icon, disabled, onClick, variant = "default" }) {
  const classes =
    variant === "danger"
      ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
      : variant === "primary"
        ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function Timeline({ events }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Fulfillment timeline</h2>
          <p className="text-sm text-slate-500">Order, packing, courier, delivery, and COD events.</p>
        </div>
        <CalendarClock className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>
      {events.length ? (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={`${event.type}-${event.at.toISOString()}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                {index < events.length - 1 ? <span className="mt-1 h-full min-h-10 w-px bg-slate-200" /> : null}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{event.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {event.actorRole}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{formatDateTime(event.at)}</p>
                {event.note ? <p className="mt-1 text-sm text-slate-600">{event.note}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No timeline events recorded yet.
        </div>
      )}
    </section>
  );
}

function ProductList({ products, formatPrice }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Vendor items</h2>
          <p className="text-sm text-slate-500">{products.length} item{products.length === 1 ? "" : "s"} in this seller order.</p>
        </div>
        <Package className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>

      <div className="divide-y divide-slate-100">
        {products.map((item, index) => {
          const image = item.image || item.productDetails?.images?.[0] || item.productDetails?.image;
          const title = item.title || item.productDetails?.title || item.productDetails?.name || "Product";
          const quantity = Number(item.quantity || 1);
          const price = Number(item.price || 0);
          const color = renderColor(item.selectedColor || item.color);

          return (
            <div key={`${item.productId || item._id || index}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {image ? (
                  <img src={image} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Package className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-950">{title}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Qty {quantity}</span>
                  <span>{formatPrice(price)} each</span>
                  {item.selectedSize ? <span>Size {item.selectedSize}</span> : null}
                  {color ? <span>Color {color}</span> : null}
                  {item.sku ? <span>SKU {item.sku}</span> : null}
                  {item.itemStatus ? <span>Status {String(item.itemStatus).replace(/_/g, " ")}</span> : null}
                </div>
              </div>
              <div className="text-right text-sm font-bold text-slate-950">
                {formatPrice(price * quantity)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function VendorOrderDetail() {
  const { orderId } = useParams();
  const { formatPrice } = useCurrency();
  const { dbUser, role, permissions, isAdmin } = useAuth();
  const canManageOrders = hasVendorPermission({ dbUser, role, permissions, isAdmin }, "orders:manage");
  const [order, setOrder] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pickup, setPickup] = useState({
    pickupDate: todayInputValue(),
    timeSlot: pickupSlots[0],
    courierName: "Platform courier",
    notes: "",
  });
  const [exceptionForm, setExceptionForm] = useState({
    reason: "",
    resolution: "reattempt",
    retryDate: "",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [orderResult, timelineResult, returnsResult] = await Promise.allSettled([
        getVendorOrderDetail(orderId),
        getVendorOrderTimeline(orderId),
        getVendorReturns({ limit: 100 }),
      ]);

      if (orderResult.status !== "fulfilled") {
        throw orderResult.reason;
      }

      setOrder(orderResult.value.data?.data || null);
      setTimelineEvents(
        timelineResult.status === "fulfilled"
          ? timelineResult.value.data?.timeline || []
          : [],
      );
      setReturns(
        returnsResult.status === "fulfilled"
          ? returnsResult.value.data?.returns || returnsResult.value.data?.data || []
          : [],
      );
    } catch (err) {
      console.error("Error loading vendor order detail:", err);
      const messageText = err.response?.data?.error || "Failed to load order detail";
      setError(messageText);
      toast.error(messageText);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const status = useMemo(() => getVendorOrderStatusMeta(order || {}), [order]);
  const financials = useMemo(() => getVendorOrderFinancials(order || {}), [order]);
  const actionPlan = useMemo(() => getVendorOrderActionPlan(order || {}), [order]);
  const timeline = useMemo(() => buildVendorOrderTimeline(order || {}, timelineEvents), [order, timelineEvents]);
  const products = order?.products || [];
  const matchingReturns = useMemo(() => {
    const id = getVendorOrderId(order || {});
    return returns.filter((returnItem) => String(returnItem.orderId || "") === id);
  }, [order, returns]);
  const address = buildVendorOrderAddress(order?.shippingInfo || {});
  const currentException = products.find((item) => item.deliveryException)?.deliveryException || order?.deliveryException;

  const runStatusAction = async (statusKey) => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot update them.");
      return;
    }

    setBusy(statusKey);
    const loadingToast = toast.loading("Updating order...");
    try {
      await updateVendorOrderStatus(orderId, statusKey);
      toast.success(`Marked ${statusKey.replace(/_/g, " ")}`, { id: loadingToast });
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update order", { id: loadingToast });
    } finally {
      setBusy("");
    }
  };

  const schedulePickup = async (event) => {
    event.preventDefault();
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot schedule pickups.");
      return;
    }

    setBusy("pickup");
    const loadingToast = toast.loading("Scheduling pickup...");
    try {
      await scheduleVendorPickup(orderId, pickup);
      toast.success("Pickup scheduled", { id: loadingToast });
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to schedule pickup", { id: loadingToast });
    } finally {
      setBusy("");
    }
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot message buyers.");
      return;
    }

    setBusy("message");
    const loadingToast = toast.loading("Sending buyer message...");
    try {
      await sendVendorBuyerMessage(orderId, { message: message.trim() });
      toast.success("Message sent", { id: loadingToast });
      setMessage("");
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send message", { id: loadingToast });
    } finally {
      setBusy("");
    }
  };

  const cancelOrder = async (event) => {
    event.preventDefault();
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot cancel items.");
      return;
    }

    if (!cancelReason.trim()) {
      toast.error("Add a cancellation reason");
      return;
    }
    setBusy("cancel");
    const loadingToast = toast.loading("Cancelling vendor items...");
    try {
      await rejectVendorOrder(orderId, {
        reason: cancelReason.trim(),
        notes: cancelNotes.trim() || null,
      });
      toast.success("Cancellation recorded", { id: loadingToast });
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel items", { id: loadingToast });
    } finally {
      setBusy("");
    }
  };

  const collectCod = async () => {
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot record COD.");
      return;
    }

    setBusy("cod");
    const loadingToast = toast.loading("Recording COD collection...");
    try {
      await markVendorCodCollected(orderId);
      toast.success("COD collection recorded", { id: loadingToast });
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record COD collection", { id: loadingToast });
    } finally {
      setBusy("");
    }
  };

  const recordException = async (event) => {
    event.preventDefault();
    if (!canManageOrders) {
      toast.error("Your staff access can view orders, but cannot record delivery issues.");
      return;
    }
    if (!exceptionForm.reason.trim()) {
      toast.error("Select or enter a delivery exception reason");
      return;
    }

    setBusy("exception");
    const loadingToast = toast.loading("Recording delivery issue...");
    try {
      await recordVendorDeliveryException(orderId, exceptionForm);
      toast.success("Delivery exception recorded", { id: loadingToast });
      setExceptionForm({ reason: "", resolution: "reattempt", retryDate: "", notes: "" });
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record delivery issue", { id: loadingToast });
    } finally {
      setBusy("");
    }
  };

  const downloadPdf = async (type) => {
    setBusy(type);
    try {
      const response =
        type === "barcode"
          ? await downloadVendorBarcodeLabel(orderId)
          : await downloadVendorPackingSlip(orderId);
      openPdfBlob(response.data, `${type === "barcode" ? "waybill" : "packing-slip"}-${orderId}.pdf`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to download PDF");
    } finally {
      setBusy("");
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => toast.success("Address copied"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-28 animate-pulse rounded-xl bg-white" />
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="h-28 animate-pulse rounded-xl bg-white" />
            <div className="h-28 animate-pulse rounded-xl bg-white" />
            <div className="h-28 animate-pulse rounded-xl bg-white" />
            <div className="h-28 animate-pulse rounded-xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <XCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Order detail unavailable</h1>
          <p className="mt-2 text-slate-600">{error || "This order could not be loaded."}</p>
          <Link
            to="/vendor/orders"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                to="/vendor/orders"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-600"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to orders
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                  Order #{shortVendorOrderId(order)}
                </h1>
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.tone}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {status.nextAction}. This workspace includes fulfillment actions, customer context, packing tools, messages, returns, and payment status.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton icon={RefreshCw} disabled={Boolean(busy)} onClick={loadOrder}>
                Refresh
              </ActionButton>
              <ActionButton icon={FileText} disabled={busy === "packing"} onClick={() => downloadPdf("packing")}>
                Packing slip
              </ActionButton>
              <ActionButton icon={Barcode} disabled={busy === "barcode"} onClick={() => downloadPdf("barcode")}>
                Waybill
              </ActionButton>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Vendor subtotal" value={formatPrice(financials.vendorSubtotal)} helper={`${financials.quantity} units`} icon={Banknote} />
          <SummaryCard label="Net earnings" value={formatPrice(financials.vendorEarnings)} helper={`${formatPrice(financials.vendorCommission)} commission`} icon={CheckCircle2} />
          <SummaryCard label="COD amount" value={formatPrice(financials.codAmount)} helper={isVendorCodOrder(order) ? (order.codCollected ? "Collected" : "Pending collection") : "Prepaid order"} icon={Banknote} />
          <SummaryCard label="Payment" value={order.paymentStatus || "pending"} helper={order.paymentMethod || "No method"} icon={Truck} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-6">
            <ProductList products={products} formatPrice={formatPrice} />
            <Timeline events={timeline} />

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Buyer messages</h2>
                  <p className="text-sm text-slate-500">Keep buyer communication tied to this order.</p>
                </div>
                <MessageSquare className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {(order.customerMessages || []).length ? (
                  order.customerMessages.map((item) => (
                    <div key={item._id || item.createdAt} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>{item.vendorName || "Vendor"}</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-800">{item.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No buyer messages have been sent for this order.
                  </p>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Fulfillment actions</h2>
              {!canManageOrders && (
                <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                  View-only order access
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ActionButton icon={PackageCheck} disabled={!canManageOrders || !actionPlan.canPack || Boolean(busy)} onClick={() => runStatusAction("packed")}>
                  Pack
                </ActionButton>
                <ActionButton icon={Truck} disabled={!canManageOrders || !actionPlan.canReady || Boolean(busy)} onClick={() => runStatusAction("ready_to_ship")}>
                  Ready
                </ActionButton>
                <ActionButton icon={Truck} disabled={!canManageOrders || !actionPlan.canShip || Boolean(busy)} onClick={() => runStatusAction("shipped")}>
                  Ship
                </ActionButton>
                <ActionButton icon={CheckCircle2} disabled={!canManageOrders || !actionPlan.canDeliver || Boolean(busy)} onClick={() => runStatusAction("delivered")}>
                  Deliver
                </ActionButton>
                <ActionButton icon={Banknote} disabled={!canManageOrders || !actionPlan.canCollectCod || Boolean(busy)} onClick={collectCod}>
                  COD
                </ActionButton>
                <ActionButton icon={XCircle} variant="danger" disabled={!canManageOrders || !actionPlan.canCancel || Boolean(busy)} onClick={() => document.getElementById("vendor-cancel-reason")?.focus()}>
                  Cancel
                </ActionButton>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Pickup schedule</h2>
                <CalendarClock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <form onSubmit={schedulePickup} className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Pickup date
                  <input
                    type="date"
                    min={todayInputValue()}
                    value={pickup.pickupDate}
                    onChange={(event) => setPickup((current) => ({ ...current, pickupDate: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Time slot
                  <select
                    value={pickup.timeSlot}
                    onChange={(event) => setPickup((current) => ({ ...current, timeSlot: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  >
                    {pickupSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Courier
                  <input
                    value={pickup.courierName}
                    onChange={(event) => setPickup((current) => ({ ...current, courierName: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!canManageOrders || !actionPlan.canSchedulePickup || busy === "pickup"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  Schedule pickup
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Delivery exception</h2>
                  <p className="text-sm text-slate-500">Record missed pickup, address, damage, or COD issues.</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>
              {currentException && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">{currentException.reason || "Open delivery issue"}</p>
                  {currentException.notes ? <p className="mt-1">{currentException.notes}</p> : null}
                  <p className="mt-1 text-xs text-amber-700">
                    Resolution: {currentException.resolution || "reattempt"}
                    {currentException.retryDate ? `, retry ${formatDateTime(currentException.retryDate)}` : ""}
                  </p>
                </div>
              )}
              <form onSubmit={recordException} className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Reason
                  <select
                    value={exceptionForm.reason}
                    onChange={(event) => setExceptionForm((current) => ({ ...current, reason: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="">Select reason</option>
                    {deliveryExceptionReasons.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Resolution
                  <select
                    value={exceptionForm.resolution}
                    onChange={(event) => setExceptionForm((current) => ({ ...current, resolution: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="reattempt">Reattempt pickup/delivery</option>
                    <option value="customer_contact">Contact customer</option>
                    <option value="return_to_seller">Return to seller</option>
                    <option value="admin_help">Need admin help</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Retry date
                  <input
                    type="date"
                    value={exceptionForm.retryDate}
                    onChange={(event) => setExceptionForm((current) => ({ ...current, retryDate: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </label>
                <textarea
                  value={exceptionForm.notes}
                  onChange={(event) => setExceptionForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Add courier, rider, address, or customer contact notes."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="submit"
                  disabled={!canManageOrders || !actionPlan.canRecordException || !exceptionForm.reason || busy === "exception"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Record issue
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Customer</h2>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                {address || "No shipping address available."}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Message buyer</h2>
              <form onSubmit={submitMessage} className="mt-4 space-y-3">
                <textarea
                  value={message}
                  maxLength={1000}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  placeholder="Example: Your order is packed and waiting for courier pickup."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="submit"
                  disabled={!canManageOrders || !message.trim() || busy === "message"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send message
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Cancel vendor items</h2>
              <form onSubmit={cancelOrder} className="mt-4 space-y-3">
                <select
                  id="vendor-cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Select reason</option>
                  <option value="Out of stock">Out of stock</option>
                  <option value="Damaged inventory">Damaged inventory</option>
                  <option value="Unable to ship on time">Unable to ship on time</option>
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                </select>
                <textarea
                  value={cancelNotes}
                  onChange={(event) => setCancelNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional internal note"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="submit"
                  disabled={!canManageOrders || !actionPlan.canCancel || !cancelReason || busy === "cancel"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Cancel items
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Returns</h2>
                <RotateCcw className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              {matchingReturns.length ? (
                <div className="space-y-3">
                  {matchingReturns.map((returnItem) => (
                    <Link
                      key={returnItem._id}
                      to={`/vendor/returns/${returnItem._id}`}
                      className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{returnItem.productTitle || "Returned item"}</p>
                          <p className="mt-1 text-xs capitalize text-slate-500">{returnItem.status || "pending"}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-950">{formatPrice(returnItem.refundAmount || 0)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No return request is linked to this vendor order.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
