const PROMOTION_RULES_SETTING_ID = "promotion_rules";

const DEFAULT_PROMOTION_RULES = Object.freeze({
  allowMultipleVoucherCodes: false,
  allowPlatformVoucherWithVendorVoucher: false,
  allowVoucherWithFlashSale: false,
  allowLoyaltyWithPlatformVoucher: true,
  allowLoyaltyWithVendorVoucher: true,
  allowLoyaltyWithFreeShipping: true,
  allowLoyaltyWithFlashSale: true,
  allowFreeShippingWithVoucher: false,
  maxStackedDiscountPercent: 100,
});

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value.toString ? value.toString() : String(value);
};

const normalizePromotionRules = (rules = {}) => {
  const source = rules?.rules && typeof rules.rules === "object" ? rules.rules : rules;
  const normalized = { ...DEFAULT_PROMOTION_RULES };

  Object.keys(DEFAULT_PROMOTION_RULES).forEach((key) => {
    if (source[key] === undefined || source[key] === null) return;
    if (typeof DEFAULT_PROMOTION_RULES[key] === "boolean") {
      normalized[key] = Boolean(source[key]);
      return;
    }
    if (key === "maxStackedDiscountPercent") {
      const parsed = Number(source[key]);
      normalized[key] = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100)) : 100;
    }
  });

  return normalized;
};

const loadPromotionRules = async (db) => {
  if (!db?.collection) return normalizePromotionRules();

  try {
    const saved = await db
      .collection("promotion_settings")
      .findOne({ _id: PROMOTION_RULES_SETTING_ID });
    return normalizePromotionRules(saved || {});
  } catch (error) {
    console.error("Failed to load promotion rules, using defaults:", error.message);
    return normalizePromotionRules();
  }
};

const inferPromotionType = (couponApplied = {}) => {
  if (couponApplied.source === "vendor_voucher" || couponApplied.type === "vendor_voucher") {
    return "vendor_voucher";
  }
  if (couponApplied.discountType === "free_shipping") return "free_shipping";
  return "platform_voucher";
};

const toDiscountLine = ({
  type,
  amount,
  code = null,
  label = "",
  source = "",
  discountType = null,
  discountValue = null,
  scopeVendorId = null,
  vendorSubtotal = null,
  metadata = {},
}) => ({
  type,
  source: source || type,
  code: code || null,
  label: label || type.replace(/_/g, " "),
  amount: roundMoney(amount),
  discountType,
  discountValue,
  scopeVendorId: normalizeId(scopeVendorId),
  vendorSubtotal: vendorSubtotal === null || vendorSubtotal === undefined ? null : roundMoney(vendorSubtotal),
  metadata,
});

const addViolation = (violations, code, message, lineTypes = []) => {
  violations.push({ code, message, lineTypes });
};

const validatePromotionStack = ({
  lines = [],
  rules = {},
  subtotal = 0,
  deliveryCharge = 0,
} = {}) => {
  const normalizedRules = normalizePromotionRules(rules);
  const discountLines = lines.filter((line) => roundMoney(line.amount) > 0);
  const lineTypes = new Set(discountLines.map((line) => line.type));
  const voucherLines = discountLines.filter((line) =>
    ["platform_voucher", "vendor_voucher", "free_shipping"].includes(line.type),
  );
  const violations = [];

  const hasPlatformVoucher = lineTypes.has("platform_voucher");
  const hasVendorVoucher = lineTypes.has("vendor_voucher");
  const hasFreeShipping = lineTypes.has("free_shipping");
  const hasFlashSale = lineTypes.has("flash_sale");
  const hasLoyalty = lineTypes.has("loyalty_points");
  const hasAnyVoucher = voucherLines.length > 0;

  if (!normalizedRules.allowMultipleVoucherCodes && voucherLines.length > 1) {
    addViolation(
      violations,
      "multiple_vouchers_blocked",
      "Only one voucher can be applied to an order.",
      voucherLines.map((line) => line.type),
    );
  }

  if (
    !normalizedRules.allowPlatformVoucherWithVendorVoucher &&
    hasPlatformVoucher &&
    hasVendorVoucher
  ) {
    addViolation(
      violations,
      "platform_vendor_stack_blocked",
      "Platform vouchers and seller vouchers cannot be combined.",
      ["platform_voucher", "vendor_voucher"],
    );
  }

  if (!normalizedRules.allowVoucherWithFlashSale && hasAnyVoucher && hasFlashSale) {
    addViolation(
      violations,
      "voucher_flash_sale_stack_blocked",
      "Vouchers cannot be combined with flash sale discounts.",
      ["flash_sale", ...voucherLines.map((line) => line.type)],
    );
  }

  if (!normalizedRules.allowLoyaltyWithPlatformVoucher && hasLoyalty && hasPlatformVoucher) {
    addViolation(
      violations,
      "loyalty_platform_stack_blocked",
      "Loyalty points cannot be combined with platform vouchers.",
      ["loyalty_points", "platform_voucher"],
    );
  }

  if (!normalizedRules.allowLoyaltyWithVendorVoucher && hasLoyalty && hasVendorVoucher) {
    addViolation(
      violations,
      "loyalty_vendor_stack_blocked",
      "Loyalty points cannot be combined with seller vouchers.",
      ["loyalty_points", "vendor_voucher"],
    );
  }

  if (!normalizedRules.allowLoyaltyWithFreeShipping && hasLoyalty && hasFreeShipping) {
    addViolation(
      violations,
      "loyalty_free_shipping_stack_blocked",
      "Loyalty points cannot be combined with free shipping vouchers.",
      ["loyalty_points", "free_shipping"],
    );
  }

  if (!normalizedRules.allowLoyaltyWithFlashSale && hasLoyalty && hasFlashSale) {
    addViolation(
      violations,
      "loyalty_flash_sale_stack_blocked",
      "Loyalty points cannot be combined with flash sale discounts.",
      ["loyalty_points", "flash_sale"],
    );
  }

  if (
    !normalizedRules.allowFreeShippingWithVoucher &&
    hasFreeShipping &&
    (hasPlatformVoucher || hasVendorVoucher)
  ) {
    addViolation(
      violations,
      "free_shipping_voucher_stack_blocked",
      "Free shipping cannot be combined with another voucher.",
      ["free_shipping", ...voucherLines.filter((line) => line.type !== "free_shipping").map((line) => line.type)],
    );
  }

  const orderValue = Math.max(0, roundMoney(subtotal) + roundMoney(deliveryCharge));
  const discountTotal = roundMoney(discountLines.reduce((sum, line) => sum + roundMoney(line.amount), 0));
  const maxDiscount = roundMoney((orderValue * normalizedRules.maxStackedDiscountPercent) / 100);

  if (orderValue > 0 && discountTotal > maxDiscount) {
    addViolation(
      violations,
      "max_discount_exceeded",
      `Total discount cannot exceed ${normalizedRules.maxStackedDiscountPercent}% of the order value.`,
      discountLines.map((line) => line.type),
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    rules: normalizedRules,
  };
};

const buildDiscountBreakdown = ({
  subtotal = 0,
  deliveryCharge = 0,
  couponApplied = null,
  couponDiscountAmount = 0,
  pointsDiscountAmount = 0,
  redeemedPoints = 0,
  flashDiscountAmount = 0,
  rules = {},
  metadata = {},
} = {}) => {
  const normalizedRules = normalizePromotionRules(rules);
  const lines = [];

  if (couponApplied && roundMoney(couponDiscountAmount) > 0) {
    const promotionType = inferPromotionType(couponApplied);
    lines.push(
      toDiscountLine({
        type: promotionType,
        amount: couponDiscountAmount,
        code: couponApplied.code,
        label:
          couponApplied.name ||
          (promotionType === "vendor_voucher" ? "Seller voucher" : "Platform voucher"),
        source: couponApplied.source,
        discountType: couponApplied.discountType,
        discountValue: couponApplied.discountValue,
        scopeVendorId: couponApplied.scopeVendorId,
        vendorSubtotal: couponApplied.vendorSubtotal,
        metadata: {
          couponId: normalizeId(couponApplied.couponId),
          minOrderAmount: couponApplied.minOrderAmount ?? null,
          scopeVendorName: couponApplied.scopeVendorName || couponApplied.vendorName || "",
        },
      }),
    );
  }

  if (roundMoney(flashDiscountAmount) > 0) {
    lines.push(
      toDiscountLine({
        type: "flash_sale",
        amount: flashDiscountAmount,
        label: "Flash sale",
        source: "flash_sale",
        metadata: metadata.flashSale || {},
      }),
    );
  }

  if (roundMoney(pointsDiscountAmount) > 0) {
    lines.push(
      toDiscountLine({
        type: "loyalty_points",
        amount: pointsDiscountAmount,
        label: "Loyalty points",
        source: "loyalty",
        metadata: { redeemedPoints: Number(redeemedPoints || 0) },
      }),
    );
  }

  const validation = validatePromotionStack({
    lines,
    rules: normalizedRules,
    subtotal,
    deliveryCharge,
  });
  const discountTotal = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const payableTotal = roundMoney(Math.max(0, roundMoney(subtotal) + roundMoney(deliveryCharge) - discountTotal));

  return {
    version: 1,
    rules: normalizedRules,
    lines,
    validation,
    totals: {
      subtotal: roundMoney(subtotal),
      deliveryCharge: roundMoney(deliveryCharge),
      discountTotal,
      payableTotal,
    },
    createdAt: new Date(),
  };
};

module.exports = {
  DEFAULT_PROMOTION_RULES,
  PROMOTION_RULES_SETTING_ID,
  buildDiscountBreakdown,
  inferPromotionType,
  loadPromotionRules,
  normalizePromotionRules,
  roundMoney,
  validatePromotionStack,
};
