import { LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import DeliveryEstimateWidget from "./DeliveryEstimateWidget";
import StockAlertButton from "./StockAlertButton";

const iconMap = {
  returns: RotateCcw,
  secure_payment: LockKeyhole,
  authentic: ShieldCheck,
};

export default function ProductTrustAndDelivery({ product, stockStatus }) {
  const detail = product?.detail || {};
  const delivery = detail.deliveryEstimate;
  const protections = detail.buyerProtection?.length
    ? detail.buyerProtection
    : [
        { key: "returns", label: "7-Day Return", description: "Marketplace-backed return support" },
        { key: "secure_payment", label: "Secure Payment", description: "Checkout is protected" },
        { key: "authentic", label: "Authentic Product", description: "Report wrong-item issues anytime" },
      ];

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      {delivery && (
        <DeliveryEstimateWidget
          title={delivery.label || "Delivery estimate"}
          eta={delivery.rangeLabel || "2-5 business days"}
          feeLabel={delivery.feeLabel || "Shown at checkout"}
          serviceArea={delivery.courierZone || "Service area confirmed by address"}
          note="Delivery availability and fee are confirmed again at checkout."
        />
      )}

      {!stockStatus.available && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">
                Out of Stock
              </p>
              <p className="text-sm text-red-700 dark:text-red-200">
                Get notified as soon as this item becomes available again.
              </p>
            </div>
            <StockAlertButton product={product} alertType="back_in_stock" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {protections.map((item) => {
          const Icon = iconMap[item.key] || ShieldCheck;
          return (
            <div
              key={item.key}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
