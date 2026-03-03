import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import useCart from "../hooks/useCart";
import {
  createOrder,
  getDefaultAddress,
  getUserAddresses,
} from "../services/api";
import { auth } from "../firebase/firebase.config";
import CouponInput from "../components/CouponInput";
import PointsRedemption from "../components/PointsRedemption";
import { useNotifications } from "../context/NotificationContext";
import { useCurrency } from "../hooks/useCurrency";
import BackButton from "../components/BackButton";
import Breadcrumb from "../components/Breadcrumb";

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [appliedPoints, setAppliedPoints] = useState(null);
  const [userLoyalty, setUserLoyalty] = useState(null);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    area: "",
    zipCode: "",
    paymentMethod: "cod",
    specialInstructions: "",
    transactionId: "",
  });

  // Fetch delivery settings
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/delivery-settings`,
        );
        const data = await response.json();
        if (data.success) {
          setDeliverySettings(data.data);
        }
      } catch (err) {
        console.error("Error fetching delivery settings:", err);
        // Use defaults if fetch fails
        setDeliverySettings({
          freeDeliveryThreshold: 50,
          standardDeliveryCharge: 100 / 110,
          freeDeliveryEnabled: true,
        });
      }
    };
    fetchDeliverySettings();
  }, []);

  // Use delivery settings or defaults
  const freeDeliveryThreshold = deliverySettings?.freeDeliveryThreshold || 50;
  const deliveryChargeAmount =
    deliverySettings?.standardDeliveryCharge || 100 / 110;
  const freeDeliveryEnabled = deliverySettings?.freeDeliveryEnabled !== false;

  // Validate cart items have product IDs
  useEffect(() => {
    const invalidItems = cart.filter((item) => !item._id);
    if (invalidItems.length > 0) {
      console.error("Cart has items without product IDs:", invalidItems);
      alert(
        "Some items in your cart are invalid. Please remove them and try again.",
      );
    }
  }, [cart]);

  // Calculate totals with coupon and points
  const subtotal = cartTotal;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const pointsDiscount = appliedPoints?.discountAmount || 0;
  const totalDiscount = couponDiscount + pointsDiscount;

  // Calculate delivery charge based on settings
  const deliveryCharge =
    freeDeliveryEnabled && subtotal - totalDiscount >= freeDeliveryThreshold
      ? 0
      : deliveryChargeAmount;
  const finalTotal = subtotal - totalDiscount + deliveryCharge;

  // Fetch default address and set user email on mount
  useEffect(() => {
    const fetchDefaultAddress = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Set user's email and name from Firebase auth
        setFormData((prev) => ({
          ...prev,
          email: user.email || prev.email,
          name: user.displayName || prev.name,
        }));

        // Fetch user loyalty data
        try {
          const token = await user.getIdToken();
          const loyaltyResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/loyalty/my-points`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (loyaltyResponse.ok) {
            const loyaltyData = await loyaltyResponse.json();
            setUserLoyalty(loyaltyData.data);
          }
        } catch (loyaltyError) {
          console.error("Failed to fetch loyalty data:", loyaltyError);
        }

        // Try to get default address
        try {
          const response = await getDefaultAddress();
          if (response.data.success && response.data.data) {
            setDefaultAddress(response.data.data);
          }
        } catch (error) {
          // If no default address, fetch all addresses
          if (error.response?.status === 404) {
            const addressesResponse = await getUserAddresses();
            if (addressesResponse.data.data?.length > 0) {
              setSavedAddresses(addressesResponse.data.data);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch addresses:", error);
      }
    };

    fetchDefaultAddress();
  }, []);

  // Auto-fill form with default address
  const loadAddress = (address) => {
    setFormData({
      ...formData,
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      area: address.area,
      zipCode: address.zipCode || "",
    });
    setAddressLoaded(true);
    setShowAddressSelector(false);
  };

  // Load all saved addresses
  const fetchSavedAddresses = async () => {
    try {
      const response = await getUserAddresses();
      setSavedAddresses(response.data.data || []);
      setShowAddressSelector(true);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCouponApplied = (couponData) => {
    setAppliedCoupon(couponData);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
  };

  const handlePointsApplied = (pointsData) => {
    setAppliedPoints(pointsData);
  };

  const handlePointsRemoved = () => {
    setAppliedPoints(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to place an order");
        navigate("/login");
        return;
      }

      // Validate required fields
      if (
        !formData.name ||
        !formData.phone ||
        !formData.address ||
        !formData.city
      ) {
        alert("Please fill in all required fields");
        setLoading(false);
        return;
      }

      // Validate transaction ID for mobile banking payments
      if (
        (formData.paymentMethod === "bkash" ||
          formData.paymentMethod === "nagad" ||
          formData.paymentMethod === "rocket") &&
        !formData.transactionId
      ) {
        alert("Please enter your transaction ID for mobile banking payment");
        setLoading(false);
        return;
      }

      const orderData = {
        products: cart.map((item) => {
          // Ensure we have a valid product ID
          if (!item._id) {
            console.error("Cart item missing _id:", item);
            throw new Error(
              `Cart item "${item.title || "Unknown"}" is missing product ID`,
            );
          }
          return {
            productId: item._id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize || null,
            selectedColor: item.selectedColor || null,
            image: item.selectedImage || item.image,
          };
        }),
        total: finalTotal,
        subtotal: subtotal,
        shippingInfo: {
          name: formData.name,
          email: user.email || formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          area: formData.area,
          zipCode: formData.zipCode,
        },
        paymentMethod: formData.paymentMethod,
        transactionId:
          formData.paymentMethod !== "cod" ? formData.transactionId : null,
        specialInstructions: formData.specialInstructions,
        couponCode: appliedCoupon?.code || null,
        redeemedPoints: appliedPoints?.points || null,
        pointsDiscount: appliedPoints?.discountAmount || 0,
        couponDiscount: couponDiscount,
        totalDiscount: totalDiscount,
      };

      const response = await createOrder(orderData);

      // Get order ID safely
      const orderId = response.data?.data?._id || response.data?._id || "NEW";
      const orderIdShort =
        orderId !== "NEW" ? orderId.slice(-8).toUpperCase() : "NEW";

      // Add notification for successful order
      addNotification({
        type: "order",
        title: "Order Placed Successfully!",
        message: `Your order #${orderIdShort} has been placed and is being processed.`,
        link: "/orders",
      });

      clearCart();
      navigate("/orders", { state: { orderSuccess: true } });
    } catch (error) {
      console.error("Order failed:", error);
      console.error("Error details:", error.response?.data);

      let errorMessage = "Failed to place order. Please try again.";

      if (error.response?.status === 401) {
        errorMessage = "Please log in to place an order";
        navigate("/login");
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-6">
            Add some amazing products to get started!
          </p>
          <Link to="/" className="btn-primary inline-block">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/cart"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Cart"
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Secure Checkout
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              SSL Secured
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          customItems={[
            { label: "Cart", href: "/cart" },
            { label: "Checkout" },
          ]}
        />

        <div className="flex items-center justify-center mb-8">
          {[
            { step: 1, title: "Shipping", icon: "📦" },
            { step: 2, title: "Payment", icon: "💳" },
            { step: 3, title: "Review", icon: "✅" },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold text-sm transition-all ${
                  step >= item.step
                    ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
              </div>
              <div className="ml-3 mr-8">
                <p
                  className={`text-sm font-medium ${step >= item.step ? "text-primary-600" : "text-gray-500"}`}
                >
                  Step {item.step}
                </p>
                <p
                  className={`text-xs ${step >= item.step ? "text-gray-900" : "text-gray-400"}`}
                >
                  {item.title}
                </p>
              </div>
              {index < 2 && (
                <div
                  className={`w-16 h-1 rounded-full mr-8 ${step > item.step ? "bg-gradient-to-r from-primary-500 to-secondary-500" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shipping Information */}
              <div className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Delivery Information
                    </h2>
                  </div>

                  {/* Load Saved Address Button */}
                  <button
                    type="button"
                    onClick={fetchSavedAddresses}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                    Use Saved Address
                  </button>
                </div>

                {/* Default Address Suggestion */}
                {defaultAddress && !addressLoaded && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-primary-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          💡 Use your default address?
                        </p>
                        <p className="text-xs text-blue-700 mb-2">
                          {defaultAddress.name} • {defaultAddress.phone}
                          <br />
                          {defaultAddress.address}, {defaultAddress.area},{" "}
                          {defaultAddress.city}
                        </p>
                        <button
                          type="button"
                          onClick={() => loadAddress(defaultAddress)}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-white px-3 py-1.5 rounded-lg border border-primary-200 hover:border-primary-300 transition-colors"
                        >
                          Use This Address
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Loaded Success Message */}
                {addressLoaded && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-green-800 font-medium">
                      Address loaded successfully! You can edit if needed.
                    </p>
                  </div>
                )}

                {/* Saved Addresses Selector Modal */}
                {showAddressSelector && savedAddresses.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Select a saved address
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddressSelector(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr._id}
                          type="button"
                          onClick={() => loadAddress(addr)}
                          className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {addr.name}
                                {addr.isDefault && (
                                  <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {addr.phone}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {addr.address}, {addr.area}, {addr.city}
                              </p>
                            </div>
                            <svg
                              className="w-5 h-5 text-primary-600 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        readOnly
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed focus:outline-none"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Name from your account (read-only)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="+880 1521-721946"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed focus:outline-none"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email from your account (read-only)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select City</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Barisal">Barisal</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Area/Thana *
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Dhanmondi, Gulshan"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder="1000"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Complete Address *
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      rows="3"
                      placeholder="House/Flat no, Road no, Block, etc."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
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
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Payment Method
                  </h2>
                </div>

                <div className="space-y-3">
                  <label
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                      formData.paymentMethod === "cod"
                        ? "border-primary-500 bg-primary-50 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === "cod"}
                      onChange={handleChange}
                      className="w-5 h-5 text-primary-500 border-gray-300 focus:ring-primary-500"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💵</span>
                        <div>
                          <span className="font-semibold text-gray-900">
                            Cash on Delivery
                          </span>
                          <p className="text-sm text-gray-500">
                            Pay when you receive your order
                          </p>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === "cod" && (
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </label>

                  <label
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                      formData.paymentMethod === "bkash"
                        ? "border-primary-500 bg-primary-50 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bkash"
                      checked={formData.paymentMethod === "bkash"}
                      onChange={handleChange}
                      className="w-5 h-5 text-primary-500 border-gray-300 focus:ring-primary-500"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📱</span>
                        <div>
                          <span className="font-semibold text-gray-900">
                            bKash Payment
                          </span>
                          <p className="text-sm text-gray-500">
                            Pay securely with bKash mobile banking
                          </p>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === "bkash" && (
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </label>

                  <label
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                      formData.paymentMethod === "nagad"
                        ? "border-primary-500 bg-primary-50 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="nagad"
                      checked={formData.paymentMethod === "nagad"}
                      onChange={handleChange}
                      className="w-5 h-5 text-primary-500 border-gray-300 focus:ring-primary-500"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💳</span>
                        <div>
                          <span className="font-semibold text-gray-900">
                            Nagad Payment
                          </span>
                          <p className="text-sm text-gray-500">
                            Pay with Nagad digital wallet
                          </p>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === "nagad" && (
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </label>

                  <label
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                      formData.paymentMethod === "rocket"
                        ? "border-primary-500 bg-primary-50 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="rocket"
                      checked={formData.paymentMethod === "rocket"}
                      onChange={handleChange}
                      className="w-5 h-5 text-primary-500 border-gray-300 focus:ring-primary-500"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🚀</span>
                        <div>
                          <span className="font-semibold text-gray-900">
                            Rocket Payment
                          </span>
                          <p className="text-sm text-gray-500">
                            Pay with Rocket mobile banking
                          </p>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === "rocket" && (
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </label>
                </div>

                {/* Payment Instructions for Mobile Banking */}
                {(formData.paymentMethod === "bkash" ||
                  formData.paymentMethod === "nagad" ||
                  formData.paymentMethod === "rocket") && (
                  <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-2xl shadow-lg">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <svg
                          className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                          💳 Payment Instructions
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600">
                          Complete your payment using{" "}
                          <span className="font-semibold text-blue-700">
                            {formData.paymentMethod === "bkash"
                              ? "bKash"
                              : formData.paymentMethod === "nagad"
                                ? "Nagad"
                                : "Rocket"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {formData.paymentMethod === "bkash" && (
                      <div className="space-y-4 sm:space-y-5">
                        {/* bKash Numbers Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-pink-200 shadow-md hover:shadow-lg transition-shadow">
                          <div className="flex items-center gap-2 sm:gap-3 mb-4">
                            <span className="text-2xl sm:text-3xl">📱</span>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">
                              bKash Payment Numbers
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {/* Merchant Account - Payment */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl border-2 border-pink-300 gap-2">
                              <div className="flex-1">
                                <p className="text-xs sm:text-sm text-pink-700 font-semibold mb-1">
                                  💼 Merchant Account - Use "Payment" Option
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-pink-600 font-mono tracking-wide">
                                  01521721946
                                </p>
                                <p className="text-xs text-pink-600 mt-1 font-medium">
                                  ⚠️ Use "Payment" not "Send Money"
                                </p>
                              </div>
                              <span className="px-3 py-1.5 bg-pink-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-md self-start sm:self-center">
                                ⭐ Preferred
                              </span>
                            </div>

                            {/* Personal Account - Send Money */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-xl border-2 border-gray-300 gap-2">
                              <div className="flex-1">
                                <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-1">
                                  👤 Personal Account - Use "Send Money"
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-700 font-mono tracking-wide">
                                  01621937035
                                </p>
                                <p className="text-xs text-gray-600 mt-1 font-medium">
                                  ℹ️ Use "Send Money" option
                                </p>
                              </div>
                              <span className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-full self-start sm:self-center">
                                Alternative
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* How to Pay Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-blue-200 shadow-md">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-xl sm:text-2xl">📝</span>
                            Step-by-Step Guide
                          </h4>
                          <ol className="space-y-3">
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                1
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Open your{" "}
                                <strong className="text-pink-600">
                                  bKash app
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                2
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                <strong className="text-pink-600">
                                  For Merchant (01521721946):
                                </strong>{" "}
                                Select <strong>"Payment"</strong> option
                                <br />
                                <strong className="text-gray-600">
                                  For Personal (01621937035):
                                </strong>{" "}
                                Select <strong>"Send Money"</strong> option
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                3
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter number:{" "}
                                <strong className="text-pink-600 font-mono text-base sm:text-lg">
                                  01521721946
                                </strong>{" "}
                                (Payment) or{" "}
                                <strong className="text-gray-600 font-mono text-base sm:text-lg">
                                  01621937035
                                </strong>{" "}
                                (Send Money)
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                4
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter amount:{" "}
                                <strong className="text-green-600 text-base sm:text-lg">
                                  {formatPrice(finalTotal)}
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                5
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Add reference: Your phone number or order note
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                6
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Complete payment and{" "}
                                <strong className="text-red-600">
                                  save the transaction ID
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                7
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter transaction ID below and click "Place
                                Order"
                              </span>
                            </li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {formData.paymentMethod === "nagad" && (
                      <div className="space-y-4 sm:space-y-5">
                        {/* Nagad Number Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-orange-200 shadow-md hover:shadow-lg transition-shadow">
                          <div className="flex items-center gap-2 sm:gap-3 mb-4">
                            <span className="text-2xl sm:text-3xl">📱</span>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">
                              Nagad Payment Number
                            </h4>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-2 border-orange-300 gap-2">
                            <div className="flex-1">
                              <p className="text-xs sm:text-sm text-orange-700 font-semibold mb-1">
                                💳 Nagad Account
                              </p>
                              <p className="text-xl sm:text-2xl font-bold text-orange-600 font-mono tracking-wide">
                                01521721946
                              </p>
                            </div>
                            <span className="px-3 py-1.5 bg-orange-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-md self-start sm:self-center">
                              ✓ Active
                            </span>
                          </div>
                        </div>

                        {/* How to Pay Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-blue-200 shadow-md">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-xl sm:text-2xl">📝</span>
                            Step-by-Step Guide
                          </h4>
                          <ol className="space-y-3">
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                1
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Open your{" "}
                                <strong className="text-orange-600">
                                  Nagad app
                                </strong>{" "}
                                and select <strong>"Send Money"</strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                2
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter number:{" "}
                                <strong className="text-orange-600 font-mono text-base sm:text-lg">
                                  01521721946
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                3
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter amount:{" "}
                                <strong className="text-green-600 text-base sm:text-lg">
                                  {formatPrice(finalTotal)}
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                4
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Add reference: Your phone number or order note
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                5
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Complete payment and{" "}
                                <strong className="text-red-600">
                                  save the transaction ID
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                6
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter transaction ID below and click "Place
                                Order"
                              </span>
                            </li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {formData.paymentMethod === "rocket" && (
                      <div className="space-y-4 sm:space-y-5">
                        {/* Rocket Number Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                          <div className="flex items-center gap-2 sm:gap-3 mb-4">
                            <span className="text-2xl sm:text-3xl">🚀</span>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">
                              Rocket Payment Number
                            </h4>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border-2 border-purple-300 gap-2">
                            <div className="flex-1">
                              <p className="text-xs sm:text-sm text-purple-700 font-semibold mb-1">
                                🚀 Rocket Account
                              </p>
                              <p className="text-xl sm:text-2xl font-bold text-purple-600 font-mono tracking-wide">
                                016219370359
                              </p>
                            </div>
                            <span className="px-3 py-1.5 bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-md self-start sm:self-center">
                              ✓ Active
                            </span>
                          </div>
                        </div>

                        {/* How to Pay Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-blue-200 shadow-md">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-xl sm:text-2xl">📝</span>
                            Step-by-Step Guide
                          </h4>
                          <ol className="space-y-3">
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                1
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Dial{" "}
                                <strong className="text-purple-600 font-mono">
                                  *322#
                                </strong>{" "}
                                or use{" "}
                                <strong className="text-purple-600">
                                  Rocket app
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                2
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Select <strong>"Send Money"</strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                3
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter number:{" "}
                                <strong className="text-purple-600 font-mono text-base sm:text-lg">
                                  016219370359
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                4
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter amount:{" "}
                                <strong className="text-green-600 text-base sm:text-lg">
                                  {formatPrice(finalTotal)}
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                5
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Add reference: Your phone number or order note
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                6
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Complete payment and{" "}
                                <strong className="text-red-600">
                                  save the transaction ID
                                </strong>
                              </span>
                            </li>
                            <li className="flex gap-3">
                              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                                7
                              </span>
                              <span className="text-sm sm:text-base text-gray-700 pt-1">
                                Enter transaction ID below and click "Place
                                Order"
                              </span>
                            </li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Important Note */}
                    <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl shadow-md">
                      <div className="flex gap-2 sm:gap-3">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <div className="text-sm sm:text-base">
                          <p className="font-bold text-yellow-900 mb-1 sm:mb-2">
                            ⚠️ Important Note
                          </p>
                          <p className="text-yellow-800 leading-relaxed">
                            Please complete the payment before placing your
                            order. Our team will verify the transaction and
                            process your order within <strong>1-2 hours</strong>
                            .
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Transaction ID Input */}
                    <div className="mt-4 sm:mt-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-green-300 shadow-lg">
                      <label className="block">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                            <svg
                              className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <span className="text-base sm:text-lg font-bold text-gray-900 block">
                              📄 Transaction ID
                              <span className="text-red-500 ml-1">*</span>
                            </span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              Required for payment verification
                            </span>
                          </div>
                        </div>
                        <input
                          type="text"
                          name="transactionId"
                          value={formData.transactionId}
                          onChange={handleChange}
                          required
                          placeholder="Enter transaction ID (e.g., 8A5B2C3D4E)"
                          className="w-full px-4 py-3 sm:py-4 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-mono text-base sm:text-lg font-semibold bg-white shadow-inner"
                        />
                        <div className="mt-2 sm:mt-3 flex items-start gap-2">
                          <span className="text-lg sm:text-xl">💡</span>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                            You'll receive this ID after completing the payment
                            in your mobile banking app. Please save it
                            carefully.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Special Instructions
                  </h2>
                </div>
                <textarea
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Any special delivery instructions? (Optional)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </form>
          </div>
          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={`${item._id}-${item.selectedSize || "no-size"}`}
                    className="flex gap-4 p-3 bg-gray-50 rounded-xl"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {item.title}
                      </h4>
                      {item.selectedSize && (
                        <p className="text-xs text-gray-500">
                          Size: {item.selectedSize}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </span>
                        <span className="font-bold text-primary-600">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Input */}
              <div className="mb-6">
                <CouponInput
                  orderTotal={cartTotal}
                  onCouponApplied={handleCouponApplied}
                  onCouponRemoved={handleCouponRemoved}
                  appliedCoupon={appliedCoupon}
                />
              </div>

              {/* Points Redemption */}
              <div className="mb-6">
                <PointsRedemption
                  userLoyalty={userLoyalty}
                  orderTotal={subtotal - couponDiscount} // Apply points after coupon discount
                  onPointsApplied={handlePointsApplied}
                  onPointsRemoved={handlePointsRemoved}
                  appliedPoints={appliedPoints}
                />
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>
                    Subtotal (
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                  </span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      Coupon Discount ({appliedCoupon.code})
                    </span>
                    <span className="font-semibold">
                      -{formatPrice(couponDiscount)}
                    </span>
                  </div>
                )}

                {appliedPoints && (
                  <div className="flex justify-between text-blue-600">
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Points Discount ({appliedPoints.points} points)
                    </span>
                    <span className="font-semibold">
                      -{formatPrice(pointsDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-2">
                    Delivery Charge
                    {deliveryCharge === 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        FREE
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      deliveryCharge === 0 ? "line-through text-gray-400" : ""
                    }
                  >
                    {formatPrice(deliveryCharge)}
                  </span>
                </div>

                {freeDeliveryEnabled &&
                  cartTotal < freeDeliveryThreshold &&
                  !appliedCoupon && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700">
                        💡 Add {formatPrice(freeDeliveryThreshold - cartTotal)}{" "}
                        more to get FREE delivery!
                      </p>
                    </div>
                  )}

                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing Order...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Place Order - {formatPrice(finalTotal)}
                  </>
                )}
              </button>

              {/* Security Badge */}
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-800">
                      Secure Checkout
                    </p>
                    <p className="text-xs text-green-600">
                      Your information is protected with SSL encryption
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold text-blue-800">
                      Delivery Information
                    </p>
                    <ul className="text-xs text-blue-600 mt-1 space-y-1">
                      <li>• Standard delivery: 2-5 business days</li>
                      <li>• Free delivery on orders over ৳5,500</li>
                      <li>• Multiple payment options available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
