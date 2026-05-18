export const CART_COUPON_STORAGE_KEY = "amiyogo_cart_coupon";

const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const asId = (value, fallback = "") => {
  if (!value) return fallback;
  if (typeof value === "object") {
    return value._id || value.id || value.toString?.() || fallback;
  }
  return String(value);
};

export const getCartColorName = (color) => {
  if (!color) return "";
  if (typeof color === "string") return color;
  return color.name || color.label || color.value || "";
};

export const getCartItemKey = (item) =>
  [
    item._id || item.productId || "product",
    item.selectedVariantId || item.variantId || "default",
    item.selectedSize || "no-size",
    getCartColorName(item.selectedColor) || "no-color",
  ].join("_");

export const getVendorId = (item) =>
  asId(item.vendorId || item.vendor?._id || item.sellerId || item.shopId, "platform");

export const getVendorName = (item) =>
  item.shopName ||
  item.vendorShopName ||
  item.vendorName ||
  item.vendor?.shopName ||
  item.vendor?.businessName ||
  "Marketplace";

export const getCartItemImage = (item) =>
  item.selectedImage ||
  item.image ||
  item.thumbnail ||
  (Array.isArray(item.images) && item.images[0]) ||
  "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200";

export const getItemMaxOrder = (item) => {
  const candidates = [
    item.maxPerUser,
    item.maxPerCustomer,
    item.maxOrderQuantity,
    item.maxQuantityPerBuyer,
    item.limitPerCustomer,
    item.purchaseLimit,
    item.flashSale?.maxPerUser,
    item.flashDeal?.maxPerUser,
    item.flashSale?.maxQuantityPerBuyer,
    item.stock,
  ];

  const limit = candidates
    .map((value) => asNumber(value, 0))
    .find((value) => value > 0);

  return limit || 99;
};

export const getMaxOrderWarning = (item) => {
  const max = getItemMaxOrder(item);
  const hasExplicitLimit = Boolean(
    item.maxPerUser ||
      item.maxPerCustomer ||
      item.maxOrderQuantity ||
      item.maxQuantityPerBuyer ||
      item.limitPerCustomer ||
      item.purchaseLimit ||
      item.flashSale?.maxPerUser ||
      item.flashDeal?.maxPerUser,
  );

  if (!hasExplicitLimit) return "";
  const dealLabel = item.flashSale || item.flashDeal || item.isFlashDeal ? " for this deal" : "";
  return `Max ${max} per customer${dealLabel}`;
};

const findDeliveryForVendor = (deliveryBreakdown, vendorId) =>
  (deliveryBreakdown || []).find(
    (entry) => asId(entry.vendorId, "platform") === asId(vendorId, "platform"),
  );

export const groupCartByVendor = (
  cart = [],
  deliveryBreakdown = [],
  {
    freeDeliveryThreshold = 1000,
    standardDeliveryCharge = 100,
    estimateDelivery = false,
  } = {},
) => {
  const groups = new Map();

  cart.forEach((item) => {
    const vendorId = getVendorId(item);
    if (!groups.has(vendorId)) {
      groups.set(vendorId, {
        vendorId,
        vendorName: getVendorName(item),
        items: [],
        itemCount: 0,
        subtotal: 0,
        shippingFee: 0,
        shippingLabel: "Calculated at checkout",
        hasExactShipping: false,
      });
    }

    const group = groups.get(vendorId);
    const quantity = asNumber(item.quantity, 1);
    group.items.push(item);
    group.itemCount += quantity;
    group.subtotal += asNumber(item.price) * quantity;
  });

  return Array.from(groups.values()).map((group) => {
    const delivery = findDeliveryForVendor(deliveryBreakdown, group.vendorId);
    const hasExactShipping = Boolean(delivery);
    const estimatedFee =
      estimateDelivery && group.subtotal < freeDeliveryThreshold
        ? asNumber(standardDeliveryCharge)
        : 0;
    const shippingFee = hasExactShipping
      ? asNumber(delivery.deliveryFee ?? delivery.shippingFee ?? delivery.fee)
      : estimatedFee;

    return {
      ...group,
      subtotal: Math.round(group.subtotal * 100) / 100,
      shippingFee: Math.round(shippingFee * 100) / 100,
      shippingLabel: hasExactShipping
        ? delivery.zoneLabel || delivery.deliveryMethod || "Delivery quote"
        : estimateDelivery
          ? "Estimated shipping"
          : "Calculated at checkout",
      hasExactShipping,
      freeDeliveryApplied: Boolean(delivery?.freeDeliveryApplied) || shippingFee === 0,
    };
  });
};

export const getCouponDiscountBreakdown = (appliedCoupon) => {
  const amount = asNumber(appliedCoupon?.discountAmount);
  const source =
    appliedCoupon?.coupon?.type ||
    appliedCoupon?.coupon?.source ||
    appliedCoupon?.source ||
    "";

  if (!amount) {
    return { platformVoucherDiscount: 0, vendorVoucherDiscount: 0 };
  }

  if (source === "vendor_voucher") {
    return { platformVoucherDiscount: 0, vendorVoucherDiscount: amount };
  }

  return { platformVoucherDiscount: amount, vendorVoucherDiscount: 0 };
};

export const getCheckoutTarget = (user) => (user ? "/checkout" : "/checkout/guest");

export const getCheckoutCtaLabel = (user) =>
  user ? "Proceed to Checkout" : "Checkout as Guest";

export const estimateAddressDelivery = (address = {}) => {
  const district = String(address.district || address.city || "").toLowerCase();
  const division = String(address.division || "").toLowerCase();

  if (district.includes("dhaka") || division.includes("dhaka")) {
    return "Estimated delivery: 1-3 business days";
  }

  if (
    district.includes("chattogram") ||
    district.includes("chittagong") ||
    district.includes("sylhet") ||
    district.includes("khulna")
  ) {
    return "Estimated delivery: 2-4 business days";
  }

  return "Estimated delivery: 3-5 business days";
};

export const checkoutSteps = [
  { step: 1, title: "Cart" },
  { step: 2, title: "Address" },
  { step: 3, title: "Payment" },
  { step: 4, title: "Review" },
  { step: 5, title: "Confirm" },
];

export const getCheckoutStep = ({ cartCount, hasAddress, paymentMethod, loading }) => {
  if (loading) return 5;
  if (!cartCount) return 1;
  if (!hasAddress) return 2;
  if (!paymentMethod) return 3;
  return 4;
};
