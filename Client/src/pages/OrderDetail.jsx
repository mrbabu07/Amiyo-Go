import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import BackButton from "../components/BackButton";
import Loading from "../components/Loading";
import OrderTracking from "../components/OrderTracking";
import { downloadOrderInvoice, getUserOrderDetail } from "../services/api";
import { useCurrency } from "../hooks/useCurrency";
import { useToast } from "../context/ToastContext";
import {
  findOrderByRouteId,
  formatOrderStatus,
  getCustomerOrderSummary,
  getOrderItemImage,
  getOrderItemLineTotal,
  getOrderItemProductId,
  getOrderItemQuantity,
  getOrderItemTitle,
  getOrderItemUnitPrice,
  getOrderItemVendorName,
  getOrderItems,
} from "../utils/customerOrders";

const statusTone = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-blue-200 bg-blue-50 text-blue-800",
  packed: "border-indigo-200 bg-indigo-50 text-indigo-800",
  shipped: "border-violet-200 bg-violet-50 text-violet-800",
  out_for_delivery: "border-sky-200 bg-sky-50 text-sky-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  returned: "border-orange-200 bg-orange-50 text-orange-800",
  partially_returned: "border-orange-200 bg-orange-50 text-orange-800",
};

const getStatusClass = (status) =>
  statusTone[String(status || "").toLowerCase()] ||
  "border-slate-200 bg-slate-50 text-slate-700";

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAddressLine = (shippingInfo = {}) =>
  [
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.union,
    shippingInfo.upazila,
    shippingInfo.district || shippingInfo.city,
    shippingInfo.division,
  ]
    .filter(Boolean)
    .join(", ");

export default function OrderDetail() {
  const { orderId } = useParams();
  const location = useLocation();
  const { formatPrice } = useCurrency();
  const { success: toastSuccess, error: toastError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const trackingFirst = location.pathname.endsWith("/track");

  useEffect(() => {
    let ignore = false;

    const loadOrder = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await getUserOrderDetail(orderId);
        if (!ignore) {
          setOrders(response.data?.data ? [response.data.data] : []);
        }
      } catch (error) {
        console.error("Failed to load order detail:", error);
        if (!ignore) {
          const status = error.response?.status;
          const message =
            status === 403
              ? "This order belongs to a different account."
              : status === 404
                ? "Order not found."
                : error.response?.data?.error || "Failed to load this order";
          setLoadError(message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadOrder();
    return () => {
      ignore = true;
    };
  }, [orderId]);

  const order = useMemo(() => findOrderByRouteId(orders, orderId), [orders, orderId]);
  const summary = useMemo(
    () => (order ? getCustomerOrderSummary(order) : null),
    [order],
  );
  const items = useMemo(() => getOrderItems(order), [order]);

  const handleDownloadInvoice = async () => {
    if (!order?._id) return;
    setDownloading(true);

    try {
      const response = await downloadOrderInvoice(order._id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${summary.shortId.replace("#", "")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toastSuccess("Invoice download started");
    } catch (error) {
      console.error("Failed to download invoice:", error);
      toastError(error.response?.data?.error || "Failed to download invoice");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Loading />;

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <BackButton />
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800">
          <h1 className="text-xl font-black">Could not load order</h1>
          <p className="mt-2 text-sm">{loadError}</p>
          <Link
            to="/orders"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700"
          >
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order || !summary) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <BackButton />
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Package className="mx-auto h-12 w-12 text-slate-400" />
          <h1 className="mt-4 text-xl font-black text-slate-950">Order not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not find this order in your account. It may belong to a different login.
          </p>
          <Link
            to="/orders"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700"
          >
            View my orders
          </Link>
        </div>
      </div>
    );
  }

  const shippingInfo = order.shippingInfo || {};
  const trackingSection = (
    <OrderTracking
      orderId={summary.id}
      currentStatus={order.status}
      orderDate={order.createdAt}
      estimatedDelivery={order.estimatedDelivery}
      tracking={order.customerExperience?.tracking}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                to="/orders"
                className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to order history
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-slate-950">
                  Order {summary.shortId}
                </h1>
                <span
                  className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-black uppercase ${getStatusClass(order.status)}`}
                >
                  {summary.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Placed {formatDateTime(order.createdAt)} - {summary.itemCount} item
                {summary.itemCount === 1 ? "" : "s"} - ETA {summary.etaLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/orders/${summary.id}/track`}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 hover:bg-sky-100"
              >
                <Truck className="h-4 w-4" />
                Track
              </Link>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloading}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Preparing" : "Invoice"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-6">
            {trackingFirst ? trackingSection : null}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-black text-slate-950">Items in this order</h2>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const productId = getOrderItemProductId(item);
                  const image = getOrderItemImage(item);
                  const title = getOrderItemTitle(item);
                  const quantity = getOrderItemQuantity(item);

                  return (
                    <div
                      key={`${productId || title}-${index}`}
                      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                        {image ? (
                          <img
                            src={image}
                            alt={title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Package className="h-7 w-7" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-950">{title}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {getOrderItemVendorName(item, order)} - Qty {quantity} -{" "}
                          {formatPrice(getOrderItemUnitPrice(item))} each
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                          {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                          {item.selectedColor && (
                            <span>
                              Color: {item.selectedColor?.name || item.selectedColor}
                            </span>
                          )}
                          {item.trackingNumber && <span>Tracking: {item.trackingNumber}</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <p className="font-black text-slate-950">
                          {formatPrice(getOrderItemLineTotal(item))}
                        </p>
                        {order.status === "delivered" && productId ? (
                          <Link
                            to={`/product/${productId}#reviews`}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <Star className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {!trackingFirst ? trackingSection : null}

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-black text-slate-950">Delivery address</h2>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-bold text-slate-900">{shippingInfo.name || "Customer"}</p>
                  {shippingInfo.phone && <p>{shippingInfo.phone}</p>}
                  <p>{getAddressLine(shippingInfo) || "Address unavailable"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary-600" />
                  <h2 className="font-black text-slate-950">Payment</h2>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-bold text-slate-900">{summary.paymentLabel}</p>
                  <p>Status: {formatOrderStatus(order.paymentStatus || "pending")}</p>
                  {order.transactionId && <p>Transaction: {order.transactionId}</p>}
                </div>
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <section className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                <h2 className="font-black text-slate-950">Invoice summary</h2>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-slate-600">
                  <dt>Subtotal</dt>
                  <dd className="font-bold text-slate-900">{formatPrice(summary.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-slate-600">
                  <dt>Delivery</dt>
                  <dd className="font-bold text-slate-900">
                    {summary.deliveryFee === 0 ? "FREE" : formatPrice(summary.deliveryFee)}
                  </dd>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-700">
                    <dt>Discount</dt>
                    <dd className="font-bold">-{formatPrice(summary.discount)}</dd>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between gap-4 text-lg font-black text-slate-950">
                    <dt>Total</dt>
                    <dd>{formatPrice(summary.total)}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-black">
                  <ShieldCheck className="h-4 w-4" />
                  Buyer protection
                </div>
                <p className="mt-1">
                  Returns, support, and review actions stay available from this order page.
                </p>
              </div>

              <div className="mt-5 grid gap-2">
                <Link
                  to="/support"
                  state={{
                    supportTicket: {
                      category: "order",
                      issueType: "order",
                      orderId: summary.id,
                      subject: `Help with order ${summary.shortId}`,
                    },
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700"
                >
                  <HelpCircle className="h-4 w-4" />
                  Get support
                </Link>
                <Link
                  to="/returns"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 hover:bg-orange-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start a return
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
