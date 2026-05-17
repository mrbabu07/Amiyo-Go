import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileImage,
  MessageSquare,
  Package,
  RotateCcw,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";
import { createReturnRequest, getUserOrders, getUserReturns } from "../services/api";
import { uploadToImgBB } from "../services/imageUpload";
import { useCurrency } from "../hooks/useCurrency";
import { useToast } from "../context/ToastContext";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import ReturnStatusTracker from "../components/ReturnStatusTracker";

const initialReturnForm = {
  reason: "",
  description: "",
  refundMethod: "",
  refundAccountNumber: "",
};

const wizardSteps = [
  "Select Item",
  "Reason",
  "Evidence",
  "Refund",
  "Confirm",
];

const returnReasons = [
  "Defective Product",
  "Wrong Item Received",
  "Size/Fit Issues",
  "Not as Described",
  "Damaged in Shipping",
  "Changed Mind",
  "Other",
];

const refundMethods = [
  { value: "bkash", label: "bKash", hint: "Mobile banking" },
  { value: "nagad", label: "Nagad", hint: "Mobile banking" },
  { value: "rocket", label: "Rocket", hint: "DBBL mobile" },
  { value: "upay", label: "Upay", hint: "Mobile banking" },
];

const statusStyles = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  approved: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  processing: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  refunded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
};

const normalizeId = (value) => value?.toString?.() || String(value || "");

const getProductId = (product = {}) =>
  normalizeId(product.productId || product._id || product.id);

const getProductKey = (product, index) => `${getProductId(product) || "item"}-${index}`;

const formatDate = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatOrderNumber = (order = {}) =>
  order.orderNumber || order.orderId || `#${normalizeId(order._id).slice(-8).toUpperCase()}`;

const getDeliveredDate = (order = {}) =>
  order.deliveredAt || order.statusHistory?.find?.((item) => item.status === "delivered")?.changedAt || order.updatedAt;

const isReturnEligible = (order = {}) => {
  if (String(order.status || "").toLowerCase() !== "delivered") return false;

  const explicitWindow = order.returnWindowExpiresAt || order.returnWindow?.expiresAt;
  if (explicitWindow) return new Date(explicitWindow) >= new Date();

  const deliveredDate = getDeliveredDate(order);
  if (!deliveredDate) return false;
  const daysSinceDelivery = (Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceDelivery <= 7;
};

const getStatusClass = (status) =>
  statusStyles[String(status || "").toLowerCase()] ||
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

function StepButton({ label, number, currentStep, onClick }) {
  const active = number === currentStep;
  const complete = number < currentStep;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={number > currentStep}
      className={`min-h-11 rounded-lg border px-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200"
          : complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
      }`}
    >
      {number}. {label}
    </button>
  );
}

export default function Returns() {
  const { formatPrice } = useCurrency();
  const { success, error } = useToast();
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [formData, setFormData] = useState(initialReturnForm);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadReturnsAndOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [returnsResponse, ordersResponse] = await Promise.all([
        getUserReturns(),
        getUserOrders(),
      ]);
      setReturns(returnsResponse.data?.data || []);
      setOrders(ordersResponse.data?.data || []);
    } catch (err) {
      console.error("Failed to load returns:", err);
      error(err.response?.data?.error || "Failed to load your returns");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadReturnsAndOrders();
  }, [loadReturnsAndOrders]);

  const eligibleOrders = useMemo(
    () => orders.filter((order) => isReturnEligible(order) && order.products?.length),
    [orders],
  );

  const selectedOrder = useMemo(
    () => eligibleOrders.find((order) => normalizeId(order._id) === selectedOrderId),
    [eligibleOrders, selectedOrderId],
  );

  const selectableItems = useMemo(
    () =>
      (selectedOrder?.products || []).map((product, index) => ({
        key: getProductKey(product, index),
        product,
      })),
    [selectedOrder],
  );

  const selectedProduct = useMemo(
    () => selectableItems.find((item) => item.key === selectedProductKey)?.product || null,
    [selectableItems, selectedProductKey],
  );

  const activeReturns = returns.filter((item) =>
    ["pending", "approved", "processing"].includes(String(item.status || "").toLowerCase()),
  );
  const completedReturns = returns.filter((item) =>
    ["completed", "refunded"].includes(String(item.status || "").toLowerCase()),
  );

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedOrderId("");
    setSelectedProductKey("");
    setFormData(initialReturnForm);
    setSelectedFiles([]);
  };

  const openWizard = () => {
    resetWizard();
    setShowModal(true);
  };

  const closeWizard = () => {
    if (submitting) return;
    setShowModal(false);
    resetWizard();
  };

  const handleOrderSelect = (orderId) => {
    const order = eligibleOrders.find((item) => normalizeId(item._id) === orderId);
    setSelectedOrderId(orderId);
    setSelectedProductKey(order?.products?.[0] ? getProductKey(order.products[0], 0) : "");
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      error("Maximum 5 evidence images are allowed");
      return;
    }
    setSelectedFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const canAdvanceStep = (step = wizardStep) => {
    if (step === 1) return Boolean(selectedOrder && selectedProduct);
    if (step === 2) return Boolean(formData.reason);
    if (step === 3) return true;
    if (step === 4) {
      return Boolean(
        formData.refundMethod &&
          formData.refundAccountNumber &&
          /^[0-9]{11}$/.test(formData.refundAccountNumber),
      );
    }
    return true;
  };

  const goNext = () => {
    if (!canAdvanceStep()) {
      error("Please complete this step before continuing");
      return;
    }
    setWizardStep((step) => Math.min(step + 1, wizardSteps.length));
  };

  const submitReturn = async (event) => {
    event.preventDefault();

    if (!selectedOrder || !selectedProduct || !canAdvanceStep(4)) {
      error("Please complete all required return information");
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls = selectedFiles.length
        ? await Promise.all(selectedFiles.map((file) => uploadToImgBB(file, "returns")))
        : [];

      await createReturnRequest({
        orderId: normalizeId(selectedOrder._id),
        productId: getProductId(selectedProduct),
        reason: formData.reason,
        description: formData.description,
        images: imageUrls,
        refundMethod: formData.refundMethod,
        refundAccountNumber: formData.refundAccountNumber,
      });

      success("Return request submitted successfully");
      setShowModal(false);
      resetWizard();
      await loadReturnsAndOrders();
    } catch (err) {
      console.error("Return request error:", err);
      error(err.response?.data?.error || err.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                to="/orders"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Back to orders"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-orange-600 dark:text-orange-300">
                  <RotateCcw className="h-4 w-4" />
                  Returns and refunds
                </div>
                <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">My Returns</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Start a return, upload evidence, and track refund progress in one place.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openWizard}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              <RotateCcw className="h-4 w-4" />
              Request Return
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Eligible Orders</p>
              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{eligibleOrders.length}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">Active Returns</p>
              <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{activeReturns.length}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Refunded</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{completedReturns.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {returns.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-200">
              <RotateCcw className="h-9 w-9" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">No returns yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Delivered orders stay eligible for return for 7 days. Use the guided workflow to select an item and upload proof.
            </p>
            <button
              type="button"
              onClick={openWizard}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              Start Return Request
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {returns.map((returnItem) => {
              const status = String(returnItem.status || "pending").toLowerCase();
              const canEscalate = ["rejected", "disputed", "under_review"].includes(status);

              return (
                <article
                  key={returnItem._id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                            Return #{normalizeId(returnItem._id).slice(-8).toUpperCase()}
                          </h2>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(status)}`}>
                            {status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Order #{normalizeId(returnItem.orderId).slice(-8).toUpperCase()} - Submitted {formatDate(returnItem.createdAt)}
                        </p>
                      </div>
                      {canEscalate ? (
                        <Link
                          to="/support"
                          state={{
                            supportTicket: {
                              category: "return",
                              issueType: "return_dispute",
                              priority: "high",
                              orderId: normalizeId(returnItem.orderId),
                              returnId: normalizeId(returnItem._id),
                              subject: `Return dispute for ${returnItem.productTitle || "my item"}`,
                              description: `I need platform support to review this return request. Return status: ${status}.`,
                              escalationReason:
                                returnItem.adminNotes ||
                                returnItem.disputeReason ||
                                returnItem.reason ||
                                "Return was rejected or disputed and needs admin arbitration.",
                            },
                          }}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-orange-200 px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-orange-900 dark:text-orange-200 dark:hover:bg-orange-950/40"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Escalate
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <div className="space-y-4">
                      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Product</p>
                        <p className="mt-2 font-bold text-slate-950 dark:text-white">{returnItem.productTitle || "Product"}</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <span>Qty: {returnItem.quantity || 1}</span>
                          <span>{formatPrice(returnItem.productPrice || 0)}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reason</p>
                        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{returnItem.reason}</p>
                        {returnItem.description ? (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{returnItem.description}</p>
                        ) : null}
                      </div>

                      {returnItem.images?.length ? (
                        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence</p>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {returnItem.images.slice(0, 4).map((imageUrl) => (
                              <a
                                key={imageUrl}
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="aspect-square overflow-hidden rounded-lg bg-slate-200"
                              >
                                <img src={imageUrl} alt="Return evidence" className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <ReturnStatusTracker
                        tracker={returnItem.customerTracker}
                        returnItem={returnItem}
                        formatPrice={formatPrice}
                      />

                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 font-bold text-slate-950 dark:text-white">
                            <WalletCards className="h-4 w-4 text-orange-600" />
                            Refund summary
                          </div>
                          <span className="font-bold text-slate-950 dark:text-white">
                            {formatPrice(returnItem.refundAmount || 0)}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                          <span>Method: {returnItem.refundMethod || "Original payment"}</span>
                          <span>Account: {returnItem.refundAccountNumber || "Not provided"}</span>
                        </div>
                      </div>

                      {returnItem.adminNotes ? (
                        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                          <p className="font-bold">Admin note</p>
                          <p className="mt-1">{returnItem.adminNotes}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Modal isOpen={showModal} onClose={closeWizard} title="Return Request Wizard">
        <form onSubmit={submitReturn} className="space-y-5">
          <div className="grid grid-cols-5 gap-2">
            {wizardSteps.map((step, index) => (
              <StepButton
                key={step}
                label={step}
                number={index + 1}
                currentStep={wizardStep}
                onClick={() => index + 1 <= wizardStep && setWizardStep(index + 1)}
              />
            ))}
          </div>

          {wizardStep === 1 ? (
            <section className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Delivered order
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(event) => handleOrderSelect(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select an eligible order</option>
                  {eligibleOrders.map((order) => (
                    <option key={order._id} value={normalizeId(order._id)}>
                      {formatOrderNumber(order)} - delivered {formatDate(getDeliveredDate(order))}
                    </option>
                  ))}
                </select>
                {eligibleOrders.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    No delivered orders are currently inside the 7-day return window.
                  </p>
                ) : null}
              </div>

              {selectableItems.length ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Select item</p>
                  <div className="grid gap-3">
                    {selectableItems.map(({ key, product }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedProductKey(key)}
                        className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-orange-500/25 ${
                          selectedProductKey === key
                            ? "border-orange-500 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30"
                            : "border-slate-200 hover:border-orange-200 dark:border-slate-800 dark:hover:border-orange-900"
                        }`}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                          {product.image || product.thumbnail ? (
                            <img
                              src={product.image || product.thumbnail}
                              alt={product.title || product.name || "Product"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">
                            {product.title || product.name || "Product"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Qty {product.quantity || 1} - {formatPrice(product.price || 0)}
                          </p>
                        </div>
                        {selectedProductKey === key ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-orange-600" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {wizardStep === 2 ? (
            <section className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Return reason
                </label>
                <select
                  value={formData.reason}
                  onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select a reason</option>
                  {returnReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Details
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="Describe the issue, packaging condition, or anything support should know."
                />
              </div>
            </section>
          ) : null}

          {wizardStep === 3 ? (
            <section className="space-y-4">
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950">
                <UploadCloud className="mx-auto h-8 w-8 text-orange-600" />
                <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">Upload evidence photos</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add up to 5 JPG or PNG images showing the issue.
                </p>
                <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800">
                  Choose images
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>
              </div>

              {selectedFiles.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <div className="aspect-square">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm"
                        aria-label="Remove evidence image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="truncate px-2 py-1 text-xs text-slate-500">{file.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  Evidence is optional, but photos make approval faster for damaged, wrong, or defective items.
                </div>
              )}
            </section>
          ) : null}

          {wizardStep === 4 ? (
            <section className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Refund method</p>
                <div className="grid grid-cols-2 gap-3">
                  {refundMethods.map((method) => (
                    <label
                      key={method.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        formData.refundMethod === method.value
                          ? "border-orange-500 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30"
                          : "border-slate-200 hover:border-orange-200 dark:border-slate-800 dark:hover:border-orange-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="refundMethod"
                        value={method.value}
                        checked={formData.refundMethod === method.value}
                        onChange={(event) => setFormData((current) => ({ ...current, refundMethod: event.target.value }))}
                        className="h-4 w-4 text-orange-600"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-950 dark:text-white">{method.label}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{method.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Account number
                </label>
                <input
                  type="tel"
                  value={formData.refundAccountNumber}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      refundAccountNumber: event.target.value.replace(/\D/g, "").slice(0, 11),
                    }))
                  }
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Use an 11-digit Bangladesh mobile banking number. No PIN or password is ever needed.
                </p>
              </div>
            </section>
          ) : null}

          {wizardStep === 5 ? (
            <section className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="font-bold text-slate-950 dark:text-white">Review return request</h3>
                <dl className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between gap-4">
                    <dt>Order</dt>
                    <dd className="text-right font-semibold">{formatOrderNumber(selectedOrder)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Item</dt>
                    <dd className="text-right font-semibold">{selectedProduct?.title || selectedProduct?.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Reason</dt>
                    <dd className="text-right font-semibold">{formData.reason}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Evidence</dt>
                    <dd className="text-right font-semibold">
                      {selectedFiles.length ? `${selectedFiles.length} photo(s)` : "No photos"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Refund</dt>
                    <dd className="text-right font-semibold">
                      {formData.refundMethod} to {formData.refundAccountNumber}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
                Products must be in original condition. Platform support may request more evidence before approval.
              </div>
            </section>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row">
            <button
              type="button"
              onClick={closeWizard}
              disabled={submitting}
              className="min-h-11 flex-1 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setWizardStep((step) => Math.max(step - 1, 1))}
              disabled={submitting || wizardStep === 1}
              className="min-h-11 flex-1 rounded-lg bg-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Back
            </button>
            {wizardStep < wizardSteps.length ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <UploadCloud className="h-4 w-4 animate-pulse" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4" />
                    Submit Return
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
