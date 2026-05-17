import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import useCart from "../hooks/useCart";
import useAuth from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { useCurrency } from "../hooks/useCurrency";
import BackButton from "../components/BackButton";
import Breadcrumb from "../components/Breadcrumb";
import { getDefaultAddress, validateCoupon } from "../services/api";
import {
  CART_COUPON_STORAGE_KEY,
  getCartColorName,
  getCartItemImage,
  getCartItemKey,
  getCouponDiscountBreakdown,
  getItemMaxOrder,
  getMaxOrderWarning,
  groupCartByVendor,
} from "../utils/cartCheckout";

export default function Cart() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    saveForLater,
    moveSavedToCart,
    removeSavedItem,
    savedForLater,
    cartTotal,
    cartCount,
  } = useCart();
  const { user } = useAuth();
  const { success, error } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [cartCoupon, setCartCoupon] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CART_COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");

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
        setDeliverySettings({
          freeDeliveryThreshold: 1000,
          standardDeliveryCharge: 100,
          freeDeliveryEnabled: true,
        });
      }
    };
    fetchDeliverySettings();
  }, []);

  useEffect(() => {
    const fetchDefaultAddress = async () => {
      if (!user) {
        setDefaultAddress(null);
        return;
      }

      try {
        const response = await getDefaultAddress();
        setDefaultAddress(response.data?.data || null);
      } catch {
        setDefaultAddress(null);
      }
    };

    fetchDefaultAddress();
  }, [user]);

  const freeDeliveryThreshold = deliverySettings?.freeDeliveryThreshold || 1000;
  const standardDeliveryCharge = deliverySettings?.standardDeliveryCharge || 100;
  const freeDeliveryEnabled = deliverySettings?.freeDeliveryEnabled !== false;

  useEffect(() => {
    const canQuote =
      cart.length > 0 &&
      defaultAddress?.district &&
      defaultAddress?.upazila &&
      defaultAddress?.union;

    if (!canQuote) {
      setDeliveryQuote(null);
      return;
    }

    const controller = new AbortController();
    const fetchDeliveryQuote = async () => {
      try {
        setDeliveryQuoteLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/delivery-settings/calculate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              products: cart.map((item) => ({
                productId: item._id,
                price: item.price,
                quantity: item.quantity,
                vendorId: item.vendorId,
                shopName: item.shopName || item.vendorName,
              })),
              shippingInfo: {
                division: defaultAddress.division,
                district: defaultAddress.district || defaultAddress.city,
                city: defaultAddress.district || defaultAddress.city,
                upazila: defaultAddress.upazila,
                union: defaultAddress.union,
                wardNo: defaultAddress.wardNo,
                area: defaultAddress.area,
              },
              deliveryMethod: "standard",
            }),
          },
        );
        const data = await response.json();
        if (data.success) {
          setDeliveryQuote({
            totalDeliveryFee:
              data.data.totalDeliveryFee ?? data.data.deliveryCharge,
            breakdown: data.data.deliveryBreakdown || [],
          });
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error calculating cart delivery quote:", err);
          setDeliveryQuote(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDeliveryQuoteLoading(false);
        }
      }
    };

    fetchDeliveryQuote();
    return () => controller.abort();
  }, [cart, defaultAddress]);

  const cartItemsForCoupon = useMemo(
    () =>
      cart.map((item) => ({
        productId: item._id,
        vendorId: item.vendorId,
        price: item.price,
        quantity: item.quantity,
        title: item.title,
        shopName: item.shopName || item.vendorName,
      })),
    [cart],
  );

  const vendorGroups = useMemo(
    () =>
      groupCartByVendor(cart, deliveryQuote?.breakdown || [], {
        freeDeliveryThreshold,
        standardDeliveryCharge,
        estimateDelivery: true,
      }),
    [cart, deliveryQuote, freeDeliveryThreshold, standardDeliveryCharge],
  );

  const { platformVoucherDiscount, vendorVoucherDiscount } =
    getCouponDiscountBreakdown(cartCoupon);
  const totalVoucherDiscount = platformVoucherDiscount + vendorVoucherDiscount;
  const shippingTotal = vendorGroups.reduce(
    (sum, group) => sum + group.shippingFee,
    0,
  );
  const estimatedTotal = Math.max(cartTotal - totalVoucherDiscount, 0) + shippingTotal;

  const handleCheckout = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }
    navigate("/checkout", {
      state: { preferredVoucherCode: cartCoupon?.code || null },
    });
  };

  const handleApplyCoupon = async (event) => {
    event.preventDefault();
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      error("Enter a voucher or coupon code first");
      return;
    }

    setCouponLoading(true);
    setCouponMessage("");

    try {
      const response = await validateCoupon(code, cartTotal, cartItemsForCoupon);
      const data = response.data?.data || {};
      const coupon = data.coupon || {};
      const applied = {
        code: coupon.code || code,
        coupon,
        discountAmount: Number(data.discountAmount || 0),
        scopeVendorId: data.scopeVendorId || coupon.vendorId || null,
      };

      setCartCoupon(applied);
      sessionStorage.setItem(CART_COUPON_STORAGE_KEY, JSON.stringify(applied));
      setCouponMessage(
        `${applied.code} applied. It will carry into checkout for final validation.`,
      );
      success(`${applied.code} applied to cart`);
    } catch (err) {
      const message = err.response?.data?.error || "Invalid coupon code";
      setCouponMessage(message);
      error(message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCartCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    sessionStorage.removeItem(CART_COUPON_STORAGE_KEY);
  };

  const renderItemOptions = (item) => (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
      {item.selectedSize && (
        <span className="rounded-md bg-gray-100 px-2 py-1">
          Size: {item.selectedSize}
        </span>
      )}
      {item.selectedColor && (
        <span className="rounded-md bg-gray-100 px-2 py-1">
          Color: {getCartColorName(item.selectedColor)}
        </span>
      )}
    </div>
  );

  const renderSavedItems = () =>
    savedForLater?.length > 0 && (
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Saved Items</h2>
            <p className="text-sm text-gray-500">
              Move these back to cart when you are ready.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {savedForLater.length}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {savedForLater.map((item) => (
            <div
              key={getCartItemKey(item)}
              className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <img
                src={getCartItemImage(item)}
                alt={item.title}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {item.title}
                </p>
                {renderItemOptions(item)}
                <p className="mt-2 text-sm font-bold text-primary-600">
                  {formatPrice(item.price)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveSavedToCart(item)}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                  >
                    Move to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSavedItem(item)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex min-h-[45vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Your cart is empty
            </h2>
            <p className="mb-8 text-gray-600">
              Add products from any seller and checkout in one flow.
            </p>
            <Link to="/" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        </div>
        {renderSavedItems()}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <BackButton />
      </div>
      <Breadcrumb />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="mt-1 text-sm text-gray-500">
            {cartCount} item{cartCount === 1 ? "" : "s"} from{" "}
            {vendorGroups.length} seller{vendorGroups.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          to="/"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {vendorGroups.map((group) => (
            <section
              key={group.vendorId}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Seller
                    </p>
                    <h2 className="text-lg font-bold text-gray-900">
                      {group.vendorName}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:text-right">
                    <div>
                      <p className="text-gray-500">Seller subtotal</p>
                      <p className="font-bold text-gray-900">
                        {formatPrice(group.subtotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">{group.shippingLabel}</p>
                      <p className="font-bold text-gray-900">
                        {deliveryQuoteLoading && !group.hasExactShipping
                          ? "Calculating..."
                          : group.shippingFee > 0
                            ? formatPrice(group.shippingFee)
                            : "FREE"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {group.items.map((item) => {
                  const maxOrder = getItemMaxOrder(item);
                  const maxWarning = getMaxOrderWarning(item);
                  const atMax = item.quantity >= maxOrder;

                  return (
                    <div
                      key={getCartItemKey(item)}
                      className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5"
                    >
                      <Link
                        to={`/product/${item._id}`}
                        className="h-28 w-full flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-28"
                      >
                        <img
                          src={getCartItemImage(item)}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <Link
                              to={`/product/${item._id}`}
                              className="line-clamp-2 font-semibold text-gray-900 hover:text-primary-600"
                            >
                              {item.title}
                            </Link>
                            {renderItemOptions(item)}
                            {maxWarning && (
                              <p className="mt-2 text-xs font-semibold text-amber-700">
                                {maxWarning}
                              </p>
                            )}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm text-gray-500">
                              {formatPrice(item.price)} each
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="inline-flex items-center rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item._id,
                                    item.quantity - 1,
                                    item.selectedSize,
                                    item.selectedColor,
                                  )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-l-lg text-gray-600 hover:bg-gray-100"
                                aria-label="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item._id,
                                    item.quantity + 1,
                                    item.selectedSize,
                                    item.selectedColor,
                                  )
                                }
                                disabled={atMax}
                                className="flex h-10 w-10 items-center justify-center rounded-r-lg text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            {atMax && maxWarning && (
                              <p className="mt-1 text-xs text-amber-700">
                                {maxWarning}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => saveForLater(item)}
                              className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              Save for Later
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeFromCart(
                                  item._id,
                                  item.selectedSize,
                                  item.selectedColor,
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {renderSavedItems()}
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              Order Summary
            </h2>

            <form onSubmit={handleApplyCoupon} className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Coupon or voucher code
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Enter code"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <button
                  type="submit"
                  disabled={couponLoading}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {couponLoading ? "Checking" : "Apply"}
                </button>
              </div>
              {cartCoupon && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <span>
                    {cartCoupon.code} applied as{" "}
                    {vendorVoucherDiscount ? "store voucher" : "platform voucher"}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="font-semibold text-green-700 hover:text-green-900"
                  >
                    Remove
                  </button>
                </div>
              )}
              {couponMessage && (
                <p className="mt-2 text-xs text-gray-500">{couponMessage}</p>
              )}
            </form>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartCount} items)</span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(cartTotal)}
                </span>
              </div>

              {vendorGroups.map((group) => (
                <div
                  key={group.vendorId}
                  className="flex justify-between text-gray-600"
                >
                  <span className="truncate pr-3">
                    Shipping - {group.vendorName}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {group.shippingFee > 0 ? formatPrice(group.shippingFee) : "FREE"}
                  </span>
                </div>
              ))}

              {platformVoucherDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Platform voucher</span>
                  <span className="font-semibold">
                    -{formatPrice(platformVoucherDiscount)}
                  </span>
                </div>
              )}

              {vendorVoucherDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Store voucher</span>
                  <span className="font-semibold">
                    -{formatPrice(vendorVoucherDiscount)}
                  </span>
                </div>
              )}

              {!deliveryQuote && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Delivery is estimated per seller now and recalculated after you
                  choose a checkout address.
                </p>
              )}

              {freeDeliveryEnabled && cartTotal < freeDeliveryThreshold && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">
                    Add {formatPrice(freeDeliveryThreshold - cartTotal)} more for
                    free base delivery when eligible.
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-amber-200">
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{
                        width: `${Math.min(
                          (cartTotal / freeDeliveryThreshold) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatPrice(estimatedTotal)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="btn-primary mt-6 w-full py-3"
            >
              Proceed to Checkout
            </button>

            <div className="mt-5 border-t border-gray-200 pt-5 text-center text-sm text-gray-500">
              Secure checkout with address, payment, review, and confirmation.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
