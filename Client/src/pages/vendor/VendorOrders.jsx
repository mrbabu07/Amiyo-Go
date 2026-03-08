import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useCurrency } from "../../hooks/useCurrency";
import Loading from "../../components/Loading";
import toast, { Toaster } from "react-hot-toast";
import { generateVendorPackingSlip } from "../../utils/vendorPackingSlip";

const statusConfig = {
  pending: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "⏳",
    label: "Pending",
  },
  processing: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🔄",
    label: "Processing",
  },
  shipped: {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "📦",
    label: "Shipped",
  },
  delivered: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "✅",
    label: "Delivered",
  },
  cancelled: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "❌",
    label: "Cancelled",
  },
};

const renderColor = (color) => {
  if (!color) return null;
  if (typeof color === "string") return color;
  if (typeof color === "object" && color.name) return color.name;
  return "Unknown";
};

export default function VendorOrders() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // ── derived stats ──────────────────────────────────────
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  // ── filtered list ──────────────────────────────────────
  const filteredOrders = orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const orderId = o._id?.toLowerCase() || "";
      const customerName = o.shippingInfo?.name?.toLowerCase() || "";
      const phone = o.shippingInfo?.phone?.toLowerCase() || "";
      return (
        orderId.includes(q) || customerName.includes(q) || phone.includes(q)
      );
    });

  // ── fetch ──────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const url = `${import.meta.env.VITE_API_URL}/vendors/orders?limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.error || "Failed to load orders");
      }
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── status update ──────────────────────────────────────
  const handleStatusChange = async (orderId, newStatus) => {
    if (!user) return;
    setUpdatingStatus(orderId);
    const loadingToast = toast.loading("Updating order status…");
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/vendors/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
        );
        toast.success(`Status updated to ${newStatus}!`, { id: loadingToast });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status", {
          id: loadingToast,
        });
      }
    } catch {
      toast.error("Failed to update status", { id: loadingToast });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ── print packing slip ──────────────────────────────────────
  const printPackingSlip = (order) => {
    try {
      // Use vendor packing slip template
      const printContent = generateVendorPackingSlip(order, {
        businessName: "Your Business", // TODO: Get from vendor profile
        phone: "", // TODO: Get from vendor profile
      });

      // Create a new window for printing
      const printWindow = window.open("", "_blank", "width=800,height=600");

      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups.");
        return;
      }

      // Write content to the new window
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to print packing slip");
    }
  };

  // ── copy address ───────────────────────────────────────
  const copyAddress = (shippingInfo) => {
    const addr = [
      shippingInfo.name,
      shippingInfo.phone,
      shippingInfo.address,
      shippingInfo.area + (shippingInfo.city ? `, ${shippingInfo.city}` : ""),
      shippingInfo.zipCode,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(addr).then(() => {
      toast.success("Address copied!");
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: "#363636", color: "#fff" },
        }}
      />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/vendor/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600">Manage and track your customer orders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Order Status Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Understanding Order Status
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-1">
                  <strong>Order Status:</strong> The overall status of the entire order (may contain items from multiple vendors)
                </p>
                <p>
                  <strong>Your Control:</strong> You can update the status of YOUR items within each order using the dropdown. Changes affect the overall order status.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total Orders", value: stats.total, color: "text-gray-900" },
            { label: "Pending", value: stats.pending, color: "text-yellow-600" },
            { label: "Processing", value: stats.processing, color: "text-blue-600" },
            { label: "Delivered", value: stats.delivered, color: "text-green-600" },
            { label: "Cancelled", value: stats.cancelled, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Filter ───────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by order ID, customer name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === status
                      ? "bg-orange-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== "all" && (
                    <span className="ml-1.5 text-xs opacity-75">
                      ({orders.filter((o) => o.status === status).length})
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* ── Empty state ───────────────────────────────────── */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500 text-sm">
              {filter === "all" && !search
                ? "Orders will appear here when customers purchase your products."
                : `No ${filter} orders${search ? ` matching "${search}"` : ""}.`}
            </p>
          </div>
        ) : (

          /* ── Orders list ─────────────────────────────────── */
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const sc = statusConfig[order.status] || {
                color: "bg-gray-100 text-gray-800 border-gray-200",
                icon: "📋",
              };
              const isExpanded = expandedOrder === order._id;
              const products = order.products || [];

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  {/* ── Row header (click to expand) ─────────── */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() =>
                      setExpandedOrder(isExpanded ? null : order._id)
                    }
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left — icon + meta */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                          {sc.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">
                              Order #{order._id?.slice(-8).toUpperCase()}
                            </p>
                            {order.paymentMethod && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                {order.paymentMethod.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span>
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                            {order.shippingInfo?.name && (
                              <>
                                <span>•</span>
                                <span>{order.shippingInfo.name}</span>
                              </>
                            )}
                            {order.shippingInfo?.city && (
                              <>
                                <span>•</span>
                                <span>{order.shippingInfo.city}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right — price + print + status dropdown + chevron */}
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{products.length} item{products.length !== 1 ? "s" : ""}</p>
                          <p className="font-bold text-lg text-orange-600">
                            {formatPrice(order.totalAmount)}
                          </p>
                        </div>

                        {/* Print Packing Slip button */}
                        <button
                          onClick={() => printPackingSlip(order)}
                          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Print Packing Slip"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>

                        {/* Status dropdown */}
                        <select
                          value={order.status}
                          disabled={updatingStatus === order._id}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                          className={`px-3 py-2 rounded-lg text-sm font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60 ${sc.color}`}
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="processing">🔄 Processing</option>
                          <option value="shipped">📦 Shipped</option>
                          <option value="delivered">✅ Delivered</option>
                          <option value="cancelled">❌ Cancelled</option>
                        </select>

                        {/* Chevron */}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded detail ───────────────────────── */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Products + order summary */}
                        <div className="lg:col-span-2 space-y-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Order Items ({products.length})
                          </h4>

                          {products.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-start gap-4"
                            >
                              {/* Image */}
                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {item.image || item.productDetails?.images?.[0] ? (
                                  <img
                                    src={item.image || item.productDetails?.images?.[0]}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 mb-2">
                                  {item.title || item.productDetails?.title || "Product"}
                                </h5>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-500">Qty:</span>
                                    <span className="ml-2 font-medium text-gray-900">
                                      {item.quantity}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Unit Price:</span>
                                    <span className="ml-2 font-medium text-gray-900">
                                      {formatPrice(item.price)}
                                    </span>
                                  </div>
                                  {item.selectedSize && (
                                    <div>
                                      <span className="text-gray-500">Size:</span>
                                      <span className="ml-2 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                                        {item.selectedSize}
                                      </span>
                                    </div>
                                  )}
                                  {item.selectedColor && (
                                    <div className="flex items-center">
                                      <span className="text-gray-500">Color:</span>
                                      <div className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded text-xs">
                                        {typeof item.selectedColor === "object" &&
                                          item.selectedColor.value && (
                                            <div
                                              className="w-3 h-3 rounded-full border border-gray-300"
                                              style={{
                                                backgroundColor:
                                                  item.selectedColor.value,
                                              }}
                                            />
                                          )}
                                        {renderColor(item.selectedColor)}
                                      </div>
                                    </div>
                                  )}
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {formatPrice((item.price || 0) * (item.quantity || 1))}
                                    </span>
                                  </div>
                                </div>

                                {/* Commission details if available */}
                                {item.vendorEarningAmount !== undefined && (
                                  <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex gap-4 text-xs">
                                    <span className="text-green-700 font-medium">
                                      Your earnings: {formatPrice(item.vendorEarningAmount)}
                                    </span>
                                    <span className="text-gray-400">
                                      Commission: {formatPrice(item.adminCommissionAmount || 0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Order summary */}
                          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h5 className="font-medium text-gray-900 mb-3">Order Summary</h5>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal:</span>
                                <span>{formatPrice(
                                  products.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1), 0)
                                )}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Delivery Charge:</span>
                                <span>{order.deliveryCharge ? formatPrice(order.deliveryCharge) : "FREE"}</span>
                              </div>
                              <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>Total:</span>
                                <span className="text-orange-600">{formatPrice(order.totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sidebar — customer + address + order info */}
                        <div className="space-y-4">

                          {/* Customer info */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Customer
                            </h4>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                              {order.shippingInfo ? (
                                <>
                                  {order.shippingInfo.name && (
                                    <div>
                                      <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                                        {order.shippingInfo.name}
                                      </p>
                                    </div>
                                  )}
                                  {order.shippingInfo.phone && (
                                    <div>
                                      <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                                      <a
                                        href={`tel:${order.shippingInfo.phone}`}
                                        className="text-sm text-blue-600 hover:underline font-medium mt-0.5 block"
                                      >
                                        {order.shippingInfo.phone}
                                      </a>
                                    </div>
                                  )}
                                  {order.shippingInfo.email && (
                                    <div>
                                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                                      <a
                                        href={`mailto:${order.shippingInfo.email}`}
                                        className="text-sm text-blue-600 hover:underline mt-0.5 block"
                                      >
                                        {order.shippingInfo.email}
                                      </a>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  No customer info available
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Delivery address */}
                          {order.shippingInfo && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Delivery Address
                              </h4>
                              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="space-y-2 text-sm">
                                  {order.shippingInfo.address && (
                                    <p className="text-gray-900">{order.shippingInfo.address}</p>
                                  )}
                                  {(order.shippingInfo.area || order.shippingInfo.city) && (
                                    <p className="text-gray-700">
                                      {[order.shippingInfo.area, order.shippingInfo.city].filter(Boolean).join(", ")}
                                    </p>
                                  )}
                                  {order.shippingInfo.zipCode && (
                                    <p className="text-gray-500">{order.shippingInfo.zipCode}</p>
                                  )}
                                </div>

                                {/* Shipping label + copy */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-gray-500 font-medium">📦 Shipping Label</span>
                                    <button
                                      onClick={() => copyAddress(order.shippingInfo)}
                                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 transition flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      Copy
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded border whitespace-pre-line leading-relaxed">
                                    {[
                                      order.shippingInfo.name,
                                      order.shippingInfo.phone,
                                      order.shippingInfo.address,
                                      order.shippingInfo.area +
                                        (order.shippingInfo.city ? `, ${order.shippingInfo.city}` : ""),
                                      order.shippingInfo.zipCode,
                                    ].filter(Boolean).join("\n")}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Order details */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              Order Details
                            </h4>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3 text-sm">
                              {order.paymentMethod && (
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Payment</p>
                                  <p className="font-medium text-gray-900 mt-0.5 capitalize">
                                    {order.paymentMethod}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                                <span
                                  className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig[order.status]?.color}`}
                                >
                                  {statusConfig[order.status]?.icon} {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                                </span>
                              </div>
                              {order.specialInstructions && (
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Special Notes</p>
                                  <p className="mt-1 text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-100">
                                    {order.specialInstructions}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Order ID</p>
                                <p className="font-mono text-xs text-gray-600 bg-gray-50 p-1.5 rounded mt-0.5">
                                  {order._id}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => printPackingSlip(order)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Print Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
