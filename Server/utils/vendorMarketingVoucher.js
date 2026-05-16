const { ObjectId } = require("mongodb");

const normalizeId = (value) => {
  if (!value) return null;
  return value.toString ? value.toString() : String(value);
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getVoucherCollection = (db) => db.collection("vendorMarketingItems");

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

const calculateVendorVoucherDiscount = ({ voucher, items = [], deliveryCharge = 0 }) => {
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
      error: `Minimum order for this store voucher is ৳${Number(voucher.minOrderAmount || 0)}`,
    };
  }

  if (voucher.usageLimit && Number(voucher.usedCount || 0) >= Number(voucher.usageLimit || 0)) {
    return {
      valid: false,
      error: "This store voucher has reached its usage limit.",
    };
  }

  let discountAmount = 0;
  if (voucher.discountType === "percentage") {
    discountAmount = (vendorSubtotal * Number(voucher.discountValue || 0)) / 100;
  } else if (voucher.discountType === "free_shipping") {
    discountAmount = Number(deliveryCharge || 0);
  } else {
    discountAmount = Number(voucher.discountValue || 0);
  }

  const maxDiscount = voucher.discountType === "free_shipping"
    ? Number(deliveryCharge || 0)
    : vendorSubtotal;
  discountAmount = round2(Math.min(discountAmount, maxDiscount));

  return {
    valid: discountAmount > 0,
    discountAmount,
    vendorSubtotal,
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
