const { ObjectId } = require("mongodb");

const normalizeId = (value) => {
  if (!value) return null;
  return value.toString ? value.toString() : String(value);
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getVoucherCollection = (db) => db.collection("vendorMarketingItems");

const asPositiveNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const getVendorDeliveryCharge = ({ scopeVendorId, deliveryCharge = 0, deliveryBreakdown = [] }) => {
  const matchingDelivery = (deliveryBreakdown || []).find(
    (entry) => normalizeId(entry.vendorId || entry.vendor || entry.sellerId || "platform") === scopeVendorId,
  );

  if (!matchingDelivery) {
    return round2(deliveryCharge);
  }

  return round2(
    matchingDelivery.deliveryFee ??
      matchingDelivery.shippingFee ??
      matchingDelivery.fee ??
      matchingDelivery.totalDeliveryFee ??
      0,
  );
};

const getApprovedVendorVoucher = async (db, code) => {
  if (!db || !code) return null;

  const normalizedCode = String(code).trim().toUpperCase();
  const now = new Date();

  return getVoucherCollection(db).findOne({
    type: "voucher",
    code: normalizedCode,
    status: "approved",
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

const calculateVendorVoucherDiscount = ({
  voucher,
  items = [],
  deliveryCharge = 0,
  deliveryBreakdown = [],
}) => {
  if (!voucher) {
    return {
      valid: false,
      error: "Vendor voucher not found",
    };
  }

  const scopeVendorId = normalizeId(voucher.vendorId);
  const matchingItems = (items || []).filter((item) => normalizeId(item.vendorId) === scopeVendorId);

  if (matchingItems.length === 0) {
    return {
      valid: false,
      error: "This voucher only works for products from the selected store.",
    };
  }

  const vendorSubtotal = round2(
    matchingItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    ),
  );

  if (voucher.minOrderAmount && vendorSubtotal < Number(voucher.minOrderAmount || 0)) {
    return {
      valid: false,
      error: `Minimum order for this store voucher is BDT ${Number(voucher.minOrderAmount || 0)}`,
    };
  }

  if (voucher.usageLimit && Number(voucher.usedCount || 0) >= Number(voucher.usageLimit || 0)) {
    return {
      valid: false,
      error: "This store voucher has reached its usage limit.",
    };
  }

  let discountAmount = 0;
  let vendorDeliveryCharge = 0;
  if (voucher.discountType === "percentage") {
    discountAmount = (vendorSubtotal * Number(voucher.discountValue || 0)) / 100;
  } else if (voucher.discountType === "free_shipping") {
    vendorDeliveryCharge = getVendorDeliveryCharge({
      scopeVendorId,
      deliveryCharge,
      deliveryBreakdown,
    });
    const shippingCap =
      asPositiveNumber(voucher.maxDiscountAmount) ||
      asPositiveNumber(voucher.discountValue) ||
      vendorDeliveryCharge;
    discountAmount = Math.min(vendorDeliveryCharge, shippingCap);
  } else {
    discountAmount = Number(voucher.discountValue || 0);
  }

  const configuredMaxDiscount = asPositiveNumber(voucher.maxDiscountAmount);
  if (configuredMaxDiscount && voucher.discountType !== "free_shipping") {
    discountAmount = Math.min(discountAmount, configuredMaxDiscount);
  }

  const maxDiscount = voucher.discountType === "free_shipping"
    ? vendorDeliveryCharge
    : vendorSubtotal;
  discountAmount = round2(Math.min(discountAmount, maxDiscount));

  return {
    valid: discountAmount > 0,
    discountAmount,
    vendorSubtotal,
    vendorDeliveryCharge,
    scopeVendorId,
    matchingItems,
    voucher: {
      ...voucher,
      _id: voucher._id instanceof ObjectId ? voucher._id : voucher._id,
    },
  };
};

module.exports = {
  normalizeId,
  round2,
  getApprovedVendorVoucher,
  calculateVendorVoucherDiscount,
};
