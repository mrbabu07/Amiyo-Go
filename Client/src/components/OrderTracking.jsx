import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  Home,
  MapPin,
  PackageCheck,
  Truck,
  Warehouse,
} from "lucide-react";

const fallbackSteps = [
  { key: "placed", title: "Order Placed", description: "We received your order." },
  { key: "confirmed", title: "Confirmed", description: "The seller has confirmed the order." },
  { key: "packed", title: "Packed", description: "Items are packed and ready for dispatch." },
  { key: "dispatched", title: "Dispatched", description: "The courier has picked up the parcel." },
  { key: "out_for_delivery", title: "Out for Delivery", description: "The parcel is moving toward your address." },
  { key: "delivered", title: "Delivered", description: "The order has been delivered." },
];

const statusToStep = {
  pending: "placed",
  processing: "confirmed",
  packed: "packed",
  ready_to_ship: "packed",
  shipped: "dispatched",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "placed",
};

const iconByStep = {
  placed: ClipboardCheck,
  confirmed: CheckCircle2,
  packed: PackageCheck,
  dispatched: Truck,
  out_for_delivery: MapPin,
  delivered: Home,
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

const buildFallbackTracking = ({ currentStatus, orderDate, estimatedDelivery }) => {
  const currentStep = statusToStep[currentStatus] || "placed";
  const activeIndex = Math.max(
    0,
    fallbackSteps.findIndex((step) => step.key === currentStep),
  );

  return {
    steps: fallbackSteps.map((step, index) => ({
      ...step,
      state:
        currentStatus === "cancelled"
          ? index === 0
            ? "completed"
            : "stopped"
          : index < activeIndex
            ? "completed"
            : index === activeIndex
              ? "active"
              : "upcoming",
      date: index === 0 ? orderDate : null,
      dateLabel: index === 0 ? formatDate(orderDate) : "",
    })),
    eta: estimatedDelivery
      ? {
          date: estimatedDelivery,
          label: new Date(estimatedDelivery).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          }),
        }
      : null,
    courierName: "Internal courier",
    trackingNumber: "",
    trackingUrl: "",
    integrationMode: "internal_status",
    reschedule: {
      supported: false,
      message: "Delivery rescheduling will appear here when courier API support is connected.",
    },
  };
};

export default function OrderTracking({
  orderId,
  currentStatus,
  orderDate,
  estimatedDelivery,
  tracking,
}) {
  const profile =
    tracking?.steps?.length > 0
      ? tracking
      : buildFallbackTracking({ currentStatus, orderDate, estimatedDelivery });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Order Tracking
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Order #{orderId?.slice(-8).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Truck className="h-4 w-4 text-primary-600" />
          <span>{profile.courierName || "Internal courier"}</span>
          {profile.trackingNumber && (
            <span className="rounded-full bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {profile.trackingNumber}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-6">
        {profile.steps.map((step) => {
          const Icon = iconByStep[step.key] || Circle;
          const isCompleted = step.state === "completed";
          const isActive = step.state === "active";
          const isStopped = step.state === "stopped";

          return (
            <div
              key={step.key}
              className={`min-h-[128px] rounded-lg border p-3 transition-colors ${
                isCompleted
                  ? "border-green-200 bg-green-50 text-green-900"
                  : isActive
                    ? "border-primary-300 bg-primary-50 text-primary-900"
                    : isStopped
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${
                  isCompleted
                    ? "bg-green-600 text-white"
                    : isActive
                      ? "bg-primary-600 text-white"
                      : "bg-white text-gray-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-5 opacity-80">{step.description}</p>
              {(step.dateLabel || step.date) && (
                <p className="mt-2 text-xs font-medium">{step.dateLabel || formatDate(step.date)}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {profile.eta && currentStatus !== "delivered" && currentStatus !== "cancelled" && (
          <div
            className={`rounded-lg border p-4 ${
              profile.eta.overdue
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" />
              Expected delivery: {profile.eta.label || formatDate(profile.eta.date)}
            </div>
            <p className="mt-1 text-xs">
              Courier: {profile.courierName || "Internal courier"}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Warehouse className="h-4 w-4 text-primary-600" />
            Courier tracking
          </div>
          {profile.trackingUrl ? (
            <a
              href={profile.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-primary-700 hover:text-primary-800"
            >
              Open live courier status
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="mt-2 text-xs leading-5">
              Internal marketplace status is active. Live courier map or status link will appear
              here when a courier API is connected.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
