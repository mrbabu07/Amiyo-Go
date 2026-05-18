import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Clipboard, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";

export default function OrderConfirmation() {
  const { state } = useLocation();
  const { formatPrice } = useCurrency();
  const [copied, setCopied] = useState(false);
  const orderId = state?.orderId;
  const isGuest = Boolean(state?.isGuest);
  const email = state?.email;
  const paymentMethod = state?.paymentMethod;
  const eta = state?.eta || "ETA will update after seller confirmation";
  const total = Number(state?.total || 0);
  const itemCount = Number(state?.itemCount || 0);

  const copyOrderId = async () => {
    if (!orderId) return;
    try {
      await navigator.clipboard?.writeText(String(orderId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          Order placed successfully
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {isGuest
            ? `We will send order updates to ${email || "your email address"}.`
            : "Your order is confirmed. Track delivery, invoice, support, returns, and reviews from your account."}
        </p>

        <dl className="mt-6 grid gap-3 rounded-lg bg-gray-50 p-4 text-left text-sm dark:bg-gray-700">
          {orderId && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-300">Order ID</dt>
              <dd className="flex min-w-0 items-center gap-2 font-medium text-gray-900 dark:text-white">
                <span className="truncate font-mono">{String(orderId)}</span>
                <button
                  type="button"
                  onClick={copyOrderId}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-orange-600 dark:border-gray-600 dark:bg-gray-800"
                  aria-label="Copy order ID"
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </dd>
            </div>
          )}
          {copied && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-center text-xs font-bold text-green-700">
              Order ID copied
            </div>
          )}
          {itemCount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-300">Items</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </dd>
            </div>
          )}
          {total > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-300">Total</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {formatPrice(total)}
              </dd>
            </div>
          )}
          {paymentMethod && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-300">Payment</dt>
              <dd className="font-medium uppercase text-gray-900 dark:text-white">
                {paymentMethod}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-300">Delivery ETA</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{eta}</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          {[
            {
              icon: PackageCheck,
              title: "Seller review",
              text: "Seller confirms stock and prepares your items.",
            },
            {
              icon: Truck,
              title: "Delivery tracking",
              text: "Courier and timeline updates appear on the order page.",
            },
            {
              icon: ShoppingBag,
              title: "Buyer support",
              text: "Returns and support stay linked to this order.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <Icon className="h-5 w-5 text-orange-600" />
                <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/products"
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Continue Shopping
          </Link>
          {!isGuest && orderId && (
            <>
              <Link
                to={`/orders/${orderId}/track`}
                className="rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                Track Order
              </Link>
              <Link
                to={`/orders/${orderId}`}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Order Details
              </Link>
            </>
          )}
          {!isGuest && !orderId && (
            <Link
              to="/orders"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              View Orders
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
