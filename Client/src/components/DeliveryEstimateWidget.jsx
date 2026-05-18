import { Clock3, MapPin, ShieldCheck, Truck } from "lucide-react";
import { cx } from "./ui/designTokens";

const defaultFormatAmount = (amount) => {
  const value = Number(amount || 0);
  return value > 0 ? value.toLocaleString("en-BD") : "FREE";
};

export default function DeliveryEstimateWidget({
  title = "Delivery estimate",
  eta = "2-5 business days",
  feeLabel = "Calculated at checkout",
  serviceArea = "Bangladesh coverage",
  note = "Final delivery fee and ETA are confirmed before order placement.",
  breakdown = [],
  loading = false,
  formatAmount = defaultFormatAmount,
  className = "",
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-200 dark:ring-emerald-900">
          <Truck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black sm:text-base">{title}</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-100 dark:ring-emerald-900">
              {loading ? "Calculating" : feeLabel}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200 sm:grid-cols-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0" />
              <span className="truncate">{eta}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{serviceArea}</span>
            </span>
          </div>

          {breakdown.length > 0 && (
            <div className="mt-3 space-y-2 rounded-lg bg-white/80 p-3 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900/70">
              {breakdown.map((item, index) => {
                const fee = Number(item.deliveryFee ?? item.shippingFee ?? item.fee ?? 0);
                return (
                  <div
                    key={`${item.vendorId || item.vendorName || "vendor"}-${index}`}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-black">
                        {item.vendorName || "Marketplace seller"}
                      </span>
                      <span className="block truncate text-emerald-700 dark:text-emerald-200">
                        {item.zoneLabel || item.deliveryMethod || "Delivery quote"}
                      </span>
                    </span>
                    <span className="shrink-0 font-black">
                      {fee > 0 ? formatAmount(fee) : "FREE"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {note && (
            <p className="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-emerald-700 dark:text-emerald-200">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{note}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
