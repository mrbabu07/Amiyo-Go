import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";
import { createGuestOrder } from "../services/api";

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
    postalCode: "",
    paymentMethod: "cod",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGuestCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        products: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        shippingInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
          address: guestInfo.address,
          city: guestInfo.city,
          postalCode: guestInfo.postalCode,
        },
        paymentMethod: guestInfo.paymentMethod,
        isGuest: true,
      };

      const response = await createGuestOrder(orderData);

      if (response.data.success) {
        clearCart();
        navigate("/order-confirmation", {
          state: {
            orderId: response.data.data._id,
            isGuest: true,
            email: guestInfo.email,
          },
        });
      }
    } catch (error) {
      console.error("Guest checkout failed:", error);
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Guest Checkout
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your order without creating an account
          </p>
        </div>
      </div>

      <form onSubmit={handleGuestCheckout} className="space-y-6">
        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={guestInfo.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={guestInfo.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter your email"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={guestInfo.phone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Shipping Address
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address *
              </label>
              <textarea
                name="address"
                value={guestInfo.address}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter your full address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={guestInfo.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={guestInfo.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter postal code"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Method
          </h3>
          <div className="space-y-3">
            <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={guestInfo.paymentMethod === "cod"}
                onChange={handleInputChange}
                className="mr-3"
              />
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="font-medium">Cash on Delivery</span>
              </div>
            </label>
            <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={guestInfo.paymentMethod === "card"}
                onChange={handleInputChange}
                className="mr-3"
              />
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span className="font-medium">Credit/Debit Card</span>
              </div>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Order Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Items ({cart.length})
              </span>
              <span className="text-gray-900 dark:text-white">
                {formatPrice(total)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Shipping</span>
              <span className="text-gray-900 dark:text-white">Free</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Order...
            </div>
          ) : (
            `Place Order - ${formatPrice(total)}`
          )}
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          By placing this order, you agree to our Terms of Service and Privacy
          Policy. You will receive order updates via email.
        </p>
      </form>
    </div>
  );
}
