const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const sameId = (left, right) => {
  const leftId = normalizeId(left);
  const rightId = normalizeId(right);
  return Boolean(leftId && rightId && leftId === rightId);
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeType = (value = "") => String(value || "").trim().toLowerCase();

const getProductVendorId = (product = {}) =>
  normalizeId(product.vendorId || product.vendor?._id || product.vendor) || "platform";

const getItemQuantity = (product = {}) => Math.max(0, toNumber(product.quantity, 1));

const getItemGross = (product = {}) =>
  roundMoney(toNumber(product.price ?? product.unitPrice ?? product.salePrice) * getItemQuantity(product));

const getOrderSubtotal = (order = {}) => {
  const explicit = toNumber(
    order.discountBreakdown?.totals?.subtotal ??
      order.subtotal ??
      order.vendorSubtotal ??
      order.productsSubtotal,
    NaN,
  );
  if (Number.isFinite(explicit)) return roundMoney(explicit);
  return roundMoney((order.products || []).reduce((sum, product) => sum + getItemGross(product), 0));
};

const getLineScopeVendorId = (line = {}) =>
  line.scopeVendorId ||
  line.vendorId ||
  line.vendor_id ||
  line.metadata?.scopeVendorId ||
  line.metadata?.vendorId ||
  null;

const getLineAmount = (line = {}) => roundMoney(line.amount ?? line.discountAmount ?? line.value ?? 0);

const isFreeShippingDiscount = (line = {}, order = {}) => {
  const values = [
    line.discountType,
    line.type,
    line.source,
    order.couponApplied?.discountType,
  ].map(normalizeType);
  return values.some((value) => value === "free_shipping" || value === "free-shipping");
};

const isSellerFundedDiscount = (line = {}, order = {}) => {
  const type = normalizeType(line.type || line.source || line.promotionType);
  const source = normalizeType(line.source || order.couponApplied?.source || order.couponApplied?.type);
  const sellerTypes = new Set([
    "vendor_voucher",
    "seller_voucher",
    "store_voucher",
    "vendor_campaign",
    "seller_campaign",
    "vendor_promotion",
    "seller_promotion",
    "vendor_bundle",
    "seller_bundle",
  ]);

  if (sellerTypes.has(type) || sellerTypes.has(source)) return true;
  if ((type.startsWith("vendor_") || type.startsWith("seller_")) && !type.includes("shipping")) return true;
  if (getLineScopeVendorId(line) && ["voucher", "campaign", "promotion", "bundle"].includes(type)) return true;
  return false;
};

const addSellerDiscount = ({ totals, order, vendorId, vendorSubtotal, line = {}, amount }) => {
  if (amount <= 0 || !isSellerFundedDiscount(line, order)) return;

  const scopeVendorId = getLineScopeVendorId(line) || order.couponApplied?.scopeVendorId || order.couponApplied?.vendorId;
  if (scopeVendorId && !sameId(scopeVendorId, vendorId)) return;

  const orderSubtotal = getOrderSubtotal(order);
  const scopedAmount = scopeVendorId
    ? amount
    : orderSubtotal > 0
      ? roundMoney(amount * (vendorSubtotal / orderSubtotal))
      : amount;

  if (isFreeShippingDiscount(line, order)) {
    totals.shippingDiscount += scopedAmount;
  } else {
    totals.productDiscount += scopedAmount;
  }
};

const getSellerFundedDiscountsForVendor = ({ order = {}, vendorId, vendorSubtotal = 0 } = {}) => {
  const totals = { productDiscount: 0, shippingDiscount: 0 };
  const lines = Array.isArray(order.discountBreakdown?.lines) ? order.discountBreakdown.lines : [];

  if (lines.length > 0) {
    lines.forEach((line) => {
      addSellerDiscount({
        totals,
        order,
        vendorId,
        vendorSubtotal,
        line,
        amount: getLineAmount(line),
      });
    });
  } else {
    const couponAmount = roundMoney(order.couponDiscount ?? order.couponApplied?.discountAmount);
    if (couponAmount > 0) {
      addSellerDiscount({
        totals,
        order,
        vendorId,
        vendorSubtotal,
        line: {
          type: order.couponApplied?.source || order.couponApplied?.type,
          source: order.couponApplied?.source || order.couponApplied?.type,
          discountType: order.couponApplied?.discountType,
          scopeVendorId: order.couponApplied?.scopeVendorId || order.couponApplied?.vendorId,
        },
        amount: couponAmount,
      });
    }
  }

  return {
    productDiscount: roundMoney(Math.min(Math.max(0, totals.productDiscount), Math.max(0, vendorSubtotal))),
    shippingDiscount: roundMoney(Math.max(0, totals.shippingDiscount)),
  };
};

const allocateDiscountAcrossProducts = (products = [], totalDiscount = 0) => {
  const grossLines = products.map(getItemGross);
  const grossTotal = roundMoney(grossLines.reduce((sum, amount) => sum + amount, 0));
  const cappedDiscount = roundMoney(Math.min(Math.max(0, totalDiscount), grossTotal));

  if (grossTotal <= 0 || cappedDiscount <= 0) return products.map(() => 0);

  let allocated = 0;
  return grossLines.map((gross, index) => {
    if (index === grossLines.length - 1) return roundMoney(cappedDiscount - allocated);
    const share = roundMoney((cappedDiscount * gross) / grossTotal);
    allocated = roundMoney(allocated + share);
    return share;
  });
};

const inferCommissionRate = ({ product = {}, grossSaleAmount = 0, explicitRate = null } = {}) => {
  if (explicitRate !== null && explicitRate !== undefined) {
    const directRate = toNumber(explicitRate, NaN);
    if (Number.isFinite(directRate)) return directRate;
  }

  const snapshotRate = toNumber(product.commissionRateSnapshot, NaN);
  if (Number.isFinite(snapshotRate)) return snapshotRate;

  const storedCommission = toNumber(product.adminCommissionAmount, NaN);
  if (Number.isFinite(storedCommission) && grossSaleAmount > 0) {
    return roundMoney((storedCommission / grossSaleAmount) * 100);
  }

  return 0;
};

const buildVendorSettlement = ({
  order = {},
  vendorId,
  products = null,
  vendor = {},
  rules = [],
  findCommissionRule = null,
} = {}) => {
  const vendorProducts = (products || order.products || []).filter((product) =>
    sameId(getProductVendorId(product), vendorId),
  );
  const grossSaleAmount = roundMoney(vendorProducts.reduce((sum, product) => sum + getItemGross(product), 0));
  const sellerDiscounts = getSellerFundedDiscountsForVendor({ order, vendorId, vendorSubtotal: grossSaleAmount });
  const discountShares = allocateDiscountAcrossProducts(vendorProducts, sellerDiscounts.productDiscount);

  const items = vendorProducts.map((product, index) => {
    const gross = getItemGross(product);
    const sellerFundedDiscount = roundMoney(Math.min(gross, discountShares[index] || 0));
    const saleAmount = roundMoney(Math.max(0, gross - sellerFundedDiscount));
    const appliedRule = typeof findCommissionRule === "function"
      ? findCommissionRule({ rules, product, vendor, order })
      : null;
    const commissionRate = inferCommissionRate({
      product,
      grossSaleAmount: gross,
      explicitRate: appliedRule?.commissionRate,
    });
    const shouldRecalculate = Boolean(appliedRule || sellerFundedDiscount > 0);
    const storedCommission = toNumber(product.adminCommissionAmount, NaN);
    const commissionAmount = roundMoney(
      shouldRecalculate || !Number.isFinite(storedCommission)
        ? (saleAmount * commissionRate) / 100
        : storedCommission,
    );
    const storedVendorEarning = toNumber(product.vendorEarningAmount, NaN);
    const vendorEarning = roundMoney(
      shouldRecalculate || !Number.isFinite(storedVendorEarning)
        ? Math.max(0, saleAmount - commissionAmount)
        : storedVendorEarning,
    );

    return {
      product,
      grossSaleAmount: gross,
      sellerFundedDiscount,
      saleAmount,
      commissionRate: roundMoney(commissionRate),
      commissionAmount,
      vendorEarning,
      appliedRule: appliedRule
        ? { ruleId: normalizeId(appliedRule._id), name: appliedRule.name || "", source: appliedRule.source || "admin_rule" }
        : null,
    };
  });

  return {
    vendorId: normalizeId(vendorId),
    grossSaleAmount,
    sellerFundedDiscount: roundMoney(sellerDiscounts.productDiscount + sellerDiscounts.shippingDiscount),
    sellerProductDiscount: sellerDiscounts.productDiscount,
    sellerShippingDiscount: sellerDiscounts.shippingDiscount,
    saleAmount: roundMoney(items.reduce((sum, item) => sum + item.saleAmount, 0)),
    commissionAmount: roundMoney(items.reduce((sum, item) => sum + item.commissionAmount, 0)),
    vendorEarning: roundMoney(items.reduce((sum, item) => sum + item.vendorEarning, 0)),
    items,
  };
};

module.exports = {
  allocateDiscountAcrossProducts,
  buildVendorSettlement,
  getItemGross,
  getSellerFundedDiscountsForVendor,
  normalizeId,
  roundMoney,
  sameId,
};
