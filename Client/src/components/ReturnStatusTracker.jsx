import { CheckCircle2, Circle, RotateCcw, WalletCards, XCircle } from "lucide-react";

const fallbackSteps = [
  { key: "requested", title: "Return Requested" },
  { key: "pickup_scheduled", title: "Pickup Scheduled" },
  { key: "item_received", title: "Item Received" },
  { key: "refund_processed", title: "Refund Processed" },
];

const statusToStep = {
  pending: "requested",
  approved: "pickup_scheduled",
  processing: "item_received",
  completed: "refund_processed",
  refunded: "refund_processed",
  rejected: "requested",
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const buildFallbackTracker = (returnItem = {}) => {
  const status = String(returnItem.status || "pending").toLowerCase();
  const currentStep = statusToStep[status] || "requested";
  const activeIndex = fallbackSteps.findIndex((step) => step.key === currentStep);
  const rejected = status === "rejected";

  return {
    status,
    rejected,
    productTitle: returnItem.productTitle,
    steps: fallbackSteps.map((step, index) => ({
      ...step,
      state: rejected
        ? index === 0
          ? "stopped"
          : "upcoming"
        : index < activeIndex
          ? "completed"
          : index === activeIndex
            ? "active"
            : "upcoming",
      date: index === 0 ? returnItem.createdAt : null,
      dateLabel: index === 0 ? formatDate(returnItem.createdAt) : "",
    })),
    refund: {
      amount: returnItem.refundAmount || 0,
      method: returnItem.refundMethod || "original",
      status: ["completed", "refunded"].includes(status) ? "processed" : rejected ? "rejected" : "pending",
      expectedCreditLabel: "",
    },
  };
};

export default function ReturnStatusTracker({ tracker, returnItem, formatPrice }) {
  const profile = tracker?.steps?.length ? tracker : buildFallbackTracker(returnItem);
  const price = typeof formatPrice === "function" ? formatPrice : (value) => `BDT ${value || 0}`;

  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {profile.rejected ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <RotateCcw className="h-5 w-5 text-orange-600" />
          )}
          <div>
            <h4 className="font-semibold text-orange-950">Return status</h4>
            {profile.productTitle && (
              <p className="text-sm text-orange-800">{profile.productTitle}</p>
            )}
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
          {profile.status?.replace(/_/g, " ") || "pending"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {profile.steps.map((step) => {
          const isCompleted = step.state === "completed";
          const isActive = step.state === "active";
          const isStopped = step.state === "stopped";

          return (
            <div key={step.key} className="flex gap-3 rounded-md bg-white p-3">
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isCompleted
                    ? "bg-green-600 text-white"
                    : isActive
                      ? "bg-orange-600 text-white"
                      : isStopped
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                {(step.dateLabel || step.date) && (
                  <p className="mt-1 text-xs text-gray-500">
                    {step.dateLabel || formatDate(step.date)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {profile.refund && (
        <div className="mt-4 flex flex-col gap-2 rounded-md border border-orange-100 bg-white p-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <WalletCards className="h-4 w-4 text-orange-600" />
            Refund {profile.refund.status}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Amount: {price(profile.refund.amount)}</span>
            <span>Method: {profile.refund.method}</span>
            {profile.refund.expectedCreditLabel && (
              <span>Expected credit: {profile.refund.expectedCreditLabel}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
