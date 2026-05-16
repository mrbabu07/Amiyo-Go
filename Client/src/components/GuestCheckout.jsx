import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";
import { createGuestOrder } from "../services/api";

const GUEST_CART_COOKIE = "amiyo_guest_cart";

const setSessionCookie = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
};

const clearSessionCookie = (name) => {
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
};

const buildCartSnapshot = (cart) =>
  cart.map((item) => ({
    id: item._id,
    quantity: item.quantity,
    price: item.price,
    size: item.selectedSize || item.size || null,
    color: item.selectedColor?.name || item.color || null,
  }));

export default function GuestCheckout() {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    upazila: "",
    union: "",
    area: "",
    postalCode: "",
    paymentMethod: "cod",
    transactionId: "",
  });

  useEffect(() => {
    setSessionCookie(GUEST_CART_COOKIE, JSON.stringify(buildCartSnapshot(cart)));
    sessionStorage.setItem(GUEST_CART_COOKIE, JSON.stringify(cart));
  }, [cart]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setGuestInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGuestCheckout = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (guestInfo.paymentMethod !== "cod" && !guestInfo.transactionId.trim()) {
      alert("Transaction ID is required for manual bKash/Nagad verification.");
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        products: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          price: item.price,
          size: item.selectedSize || item.size,
          color: item.selectedColor?.name || item.color,
        })),
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        shippingInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
          address: guestInfo.address,
          city: guestInfo.city,
          district: guestInfo.district,
          upazila: guestInfo.upazila,
          union: guestInfo.union,
          area: guestInfo.area,
          postalCode: guestInfo.postalCode,
        },
        paymentMethod: guestInfo.paymentMethod,
        transactionId: guestInfo.transactionId.trim() || null,
        isGuest: true,
      };

      setSessionCookie(GUEST_CART_COOKIE, JSON.stringify(buildCartSnapshot(cart)));
      const response = await createGuestOrder(orderData);

      if (response.data.success) {
        const orderId = response.data.data?.orderId;
        clearCart();
        clearSessionCookie(GUEST_CART_COOKIE);
        sessionStorage.removeItem(GUEST_CART_COOKIE);
        navigate("/order-confirmation", {
          state: {
            orderId,
            isGuest: true,
            email: guestInfo.email,
            paymentMethod: guestInfo.paymentMethod,
          },
        });
      }
    } catch (error) {
      console.error("Guest checkout failed:", error);
      alert(error.response?.data?.error || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const needsTransactionId = guestInfo.paymentMethod !== "cod";

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-600">
            Add products to your cart before starting guest checkout.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guest Checkout</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Complete your order without creating an account.
        </p>
      </div>

      <form onSubmit={handleGuestCheckout} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ["name", "Full Name", "text", true],
                ["email", "Email Address", "email", true],
                ["phone", "Phone Number", "tel", true],
                ["city", "City", "text", true],
              ].map(([name, label, type, required]) => (
                <label key={name} className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <input
                    type={type}
                    name={name}
                    value={guestInfo[name]}
                    onChange={handleInputChange}
                    required={required}
                    className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shipping Address</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm md:col-span-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Address</span>
                <textarea
                  name="address"
                  value={guestInfo.address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </label>
              {[
                ["district", "District", true],
                ["upazila", "Upazila", true],
                ["union", "Union", true],
                ["area", "Area", true],
                ["postalCode", "Postal Code", false],
              ].map(([name, label, required]) => (
                <label key={name} className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <input
                    type="text"
                    name={name}
                    value={guestInfo[name]}
                    onChange={handleInputChange}
                    required={required}
                    className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["cod", "Cash on Delivery"],
                ["bkash", "bKash"],
                ["nagad", "Nagad"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-300 p-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={value}
                    checked={guestInfo.paymentMethod === value}
                    onChange={handleInputChange}
                  />
                  {label}
                </label>
              ))}
            </div>
            {needsTransactionId && (
              <label className="mt-4 block text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Transaction ID</span>
                <input
                  type="text"
                  name="transactionId"
                  value={guestInfo.transactionId}
                  onChange={handleInputChange}
                  required
                  className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter the bKash/Nagad transaction ID"
                />
              </label>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order Summary</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Items ({cart.length})</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Delivery</span>
              <span>Calculated after order</span>
            </div>
            <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Placing Order..." : `Place Order - ${formatPrice(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            The cart is stored in a browser session cookie until checkout finishes.
          </p>
        </aside>
      </form>
    </div>
  );
}
