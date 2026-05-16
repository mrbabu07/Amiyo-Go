import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function OrderConfirmation() {
  const { state } = useLocation();
  const orderId = state?.orderId;
  const isGuest = Boolean(state?.isGuest);
  const email = state?.email;
  const paymentMethod = state?.paymentMethod;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          Order placed successfully
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {isGuest
            ? `We will send order updates to ${email || "your email address"}.`
            : "You can track this order from your account."}
        </p>

        <dl className="mt-6 grid gap-3 rounded-md bg-gray-50 p-4 text-left text-sm dark:bg-gray-700">
          {orderId && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-300">Order ID</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{String(orderId)}</dd>
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
        </dl>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/products"
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Continue Shopping
          </Link>
          {!isGuest && (
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
