const { ObjectId } = require("mongodb");

const PROMOTION_TYPES = [
  "platform_voucher",
  "vendor_voucher",
  "category_discount",
  "product_discount",
  "flash_sale",
  "free_shipping",
  "loyalty_coin_discount",
  "first_order_discount",
  "campaign_discount",
  "bundle_offer",
];

const EVALUATION_ORDER = [
  "product_discount",
  "flash_sale",
  "category_discount",
  "vendor_voucher",
  "vendor_discount",
  "voucher_code",
  "platform_voucher",
  "first_order_discount",
  "campaign_discount",
  "bundle_offer",
  "free_shipping",
  "loyalty_coin_discount",
];

const DEFAULT_RULES = {
  allowFreeShippingWithDiscount: true,
  maxStackedDiscountPercent: 80,
  loyaltyCoinValue: 0.01,
  minCoinRedeem: 100,
  maxCoinRedeemPercent: 30,
};

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const uniqueStrings = (value = []) =>
  [...new Set((Array.isArray(value) ? value : [value]).map(normalizeId).filter(Boolean))];

const normalizeCart = (cart = {}) => {
  const rawItems = Array.isArray(cart.items) ? cart.items : Array.isArray(cart.products) ? cart.products : [];
  const items = rawItems.map((item) => {
    const price = Number(item.price ?? item.salePrice ?? item.unitPrice ?? 0);
    const quantity = Number(item.quantity || 1);
    return {
      ...item,
      productId: normalizeId(item.productId || item._id || item.product),
      vendorId: normalizeId(item.vendorId),
      categoryId: normalizeId(item.categoryId || item.category),
      price,
      quantity,
      lineTotal: roundMoney(price * quantity),
    };
  });
  const subtotal = cart.subtotal === undefined || cart.subtotal === null
    ? items.reduce((sum, item) => sum + item.lineTotal, 0)
    : Number(cart.subtotal || 0);
  return {
    ...cart,
    items,
    subtotal: roundMoney(subtotal),
    deliveryCharge: roundMoney(cart.deliveryCharge || cart.shippingFee || 0),
  };
};

const determineStatus = (promotion = {}, now = new Date()) => {
  const status = String(promotion.status || "active").toLowerCase();
  if (status === "paused" || status === "draft" || status === "expired") return status;
  const startsAt = toDate(promotion.startsAt || promotion.startDate);
  const endsAt = toDate(promotion.endsAt || promotion.endDate || promotion.expiresAt);
  if (startsAt && startsAt > now) return "scheduled";
  if (endsAt && endsAt < now) return "expired";
  if (promotion.isActive === false) return "paused";
  return "active";
};

const getScope = (promotion = {}) => ({
  vendorIds: uniqueStrings(promotion.scope?.vendorIds || promotion.vendorIds || promotion.vendorId),
  categoryIds: uniqueStrings(promotion.scope?.categoryIds || promotion.categoryIds || promotion.categoryId),
  productIds: uniqueStrings(promotion.scope?.productIds || promotion.productIds || promotion.productId),
  customerSegments: uniqueStrings(promotion.scope?.customerSegments || promotion.customerSegments),
});

const matchesAny = (value, candidates) => {
  const normalized = normalizeId(value);
  return candidates.length === 0 || candidates.includes(normalized);
};

const scopeMatchedItems = (promotion, cart) => {
  const scope = getScope(promotion);
  return cart.items.filter((item) =>
    matchesAny(item.vendorId, scope.vendorIds) &&
    matchesAny(item.categoryId, scope.categoryIds) &&
    matchesAny(item.productId, scope.productIds),
  );
};

const getPromotionSubtotal = (promotion, cart) => {
  const matched = scopeMatchedItems(promotion, cart);
  if (matched.length === 0) return 0;
  const scope = getScope(promotion);
  const hasSpecificScope = scope.vendorIds.length || scope.categoryIds.length || scope.productIds.length;
  return hasSpecificScope ? roundMoney(matched.reduce((sum, item) => sum + item.lineTotal, 0)) : cart.subtotal;
};

const customerSegmentMatches = (promotion = {}, user = {}, context = {}) => {
  const required = getScope(promotion).customerSegments;
  if (required.length === 0) return true;
  const userSegments = uniqueStrings(context.customerSegments || user.segments || user.customerSegments);
  return required.some((segment) => userSegments.includes(segment));
};

const isFirstOrderEligible = (promotion = {}, user = {}, context = {}) => {
  if (promotion.type !== "first_order_discount") return true;
  return Number(user.orderCount || context.orderCount || 0) === 0;
};

const calculateDiscount = (promotion = {}, cart = {}, context = {}) => {
  if (promotion.type === "loyalty_coin_discount") {
    const redeemPoints = Number(context.redeemPoints || context.redeemedPoints || 0);
    if (redeemPoints <= 0) return { amount: 0, base: 0 };
    const coinValue = Number(promotion.coinValue || context.rules?.loyaltyCoinValue || DEFAULT_RULES.loyaltyCoinValue);
    const maxRedeemAmount = roundMoney((cart.subtotal * Number(promotion.maxRedeemPercent || DEFAULT_RULES.maxCoinRedeemPercent)) / 100);
    return { amount: Math.min(roundMoney(redeemPoints * coinValue), maxRedeemAmount), base: cart.subtotal };
  }

  if (promotion.type === "free_shipping" || promotion.discountType === "free_shipping") {
    const cap = Number(promotion.maxDiscount || promotion.maxDiscountAmount || promotion.discountValue || cart.deliveryCharge);
    return { amount: Math.min(cart.deliveryCharge, cap), base: cart.deliveryCharge };
  }

  if (promotion.type === "bundle_offer") {
    const matchedItems = scopeMatchedItems(promotion, cart);
    const minQuantity = Number(promotion.bundleQuantity || promotion.rules?.bundleQuantity || 2);
    const quantity = matchedItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    if (quantity < minQuantity) return { amount: 0, base: 0 };
  }

  const base = getPromotionSubtotal(promotion, cart);
  if (base <= 0) return { amount: 0, base };

  const discountType = promotion.discountType || (promotion.type === "free_shipping" ? "free_shipping" : "fixed");
  let amount = 0;
  if (discountType === "percentage") {
    amount = (base * Number(promotion.discountValue || 0)) / 100;
  } else if (discountType === "fixed") {
    amount = Number(promotion.discountValue || promotion.amount || 0);
  } else if (discountType === "bundle_fixed") {
    amount = Math.max(0, base - Number(promotion.bundleFixedPrice || 0));
  }

  const maxDiscount = Number(promotion.maxDiscount || promotion.maxDiscountAmount || 0);
  if (maxDiscount > 0) amount = Math.min(amount, maxDiscount);
  amount = Math.min(amount, base);
  return { amount: roundMoney(amount), base: roundMoney(base) };
};

const normalizePromotionLine = ({ promotion, discount, base }) => ({
  promotionId: normalizeId(promotion._id || promotion.id),
  type: promotion.type,
  code: promotion.code || null,
  title: promotion.title || promotion.name || promotion.code || promotion.type,
  priority: Number(promotion.priority || 100),
  stackable: promotion.stackable !== false,
  discountType: promotion.discountType || null,
  discountValue: Number(promotion.discountValue || 0),
  discountAmount: roundMoney(discount),
  baseAmount: roundMoney(base),
  scope: getScope(promotion),
});

class PromotionService {
  static normalizeCart(cart) {
    return normalizeCart(cart);
  }

  static determineStatus(promotion, now) {
    return determineStatus(promotion, now);
  }

  static async loadActivePromotions(db, now = new Date()) {
    if (!db?.collection) return [];
    return db
      .collection("promotions")
      .find({
        status: { $in: ["active", "scheduled"] },
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }, { startDate: { $lte: now } }],
        $and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }, { endDate: { $gte: now } }, { expiresAt: { $gte: now } }] }],
      })
      .sort({ priority: -1, createdAt: -1 })
      .toArray();
  }

  static async getPromotionRules(db) {
    if (!db?.collection) return DEFAULT_RULES;
    const saved = await db.collection("promotion_settings").findOne({ _id: "growth_promotion_rules" });
    return { ...DEFAULT_RULES, ...(saved?.rules || saved || {}) };
  }

  static async getUserRedemptionCount(db, promotion, userId) {
    if (!db?.collection || !userId || !promotion?._id) return 0;
    return db.collection("promotion_redemptions").countDocuments({
      promotionId: normalizeId(promotion._id),
      userId: normalizeId(userId),
    });
  }

  static async isEligible({ db, promotion, cart, user = {}, context = {}, now = new Date(), codeOnly = false }) {
    const status = determineStatus(promotion, now);
    if (status !== "active") return { eligible: false, reason: status };
    if (!PROMOTION_TYPES.includes(promotion.type)) return { eligible: false, reason: "unsupported_type" };
    if (codeOnly && promotion.code !== String(context.code || "").trim().toUpperCase()) {
      return { eligible: false, reason: "code_mismatch" };
    }
    if (promotion.code && context.code && promotion.code !== String(context.code).trim().toUpperCase()) {
      return { eligible: false, reason: "code_mismatch" };
    }
    if (promotion.automaticApply === false && !context.code) return { eligible: false, reason: "code_required" };
    if (Number(promotion.minOrderValue || promotion.minOrderAmount || 0) > cart.subtotal) {
      return { eligible: false, reason: "minimum_order_not_met" };
    }
    if (promotion.totalUsageCap && Number(promotion.usedCount || 0) >= Number(promotion.totalUsageCap)) {
      return { eligible: false, reason: "total_usage_cap_reached" };
    }
    if (promotion.usageLimitPerUser && user?.id) {
      const count = await PromotionService.getUserRedemptionCount(db, promotion, user.id);
      if (count >= Number(promotion.usageLimitPerUser)) return { eligible: false, reason: "user_usage_cap_reached" };
    }
    if (!customerSegmentMatches(promotion, user, context)) return { eligible: false, reason: "segment_mismatch" };
    if (!isFirstOrderEligible(promotion, user, context)) return { eligible: false, reason: "first_order_only" };
    if (getPromotionSubtotal(promotion, cart) <= 0 && promotion.type !== "loyalty_coin_discount") {
      return { eligible: false, reason: "scope_mismatch" };
    }
    return { eligible: true };
  }

  static async evaluateCart({ db, cart = {}, user = {}, context = {} }) {
    const now = context.now ? new Date(context.now) : new Date();
    const normalizedCart = normalizeCart(cart);
    const rules = { ...(await PromotionService.getPromotionRules(db)), ...(context.rules || {}) };
    const promotions = context.promotionsOverride || await PromotionService.loadActivePromotions(db, now);
    const code = context.code ? String(context.code).trim().toUpperCase() : "";
    const rejectedPromotions = [];
    const appliedPromotions = [];
    let blockedByNonStackable = false;

    const sorted = [...promotions]
      .filter((promotion) => !code || !promotion.code || promotion.code === code || promotion.automaticApply !== false)
      .sort((left, right) => {
        const leftOrder = EVALUATION_ORDER.indexOf(left.type);
        const rightOrder = EVALUATION_ORDER.indexOf(right.type);
        const normalizedLeftOrder = leftOrder === -1 ? 999 : leftOrder;
        const normalizedRightOrder = rightOrder === -1 ? 999 : rightOrder;
        if (normalizedLeftOrder !== normalizedRightOrder) return normalizedLeftOrder - normalizedRightOrder;
        return Number(right.priority || 100) - Number(left.priority || 100);
      });

    for (const promotion of sorted) {
      if (blockedByNonStackable) {
        rejectedPromotions.push({ promotionId: normalizeId(promotion._id), code: promotion.code || null, reason: "blocked_by_non_stackable" });
        continue;
      }

      const eligibility = await PromotionService.isEligible({
        db,
        promotion,
        cart: normalizedCart,
        user,
        context: { ...context, code },
        now,
      });
      if (!eligibility.eligible) {
        rejectedPromotions.push({ promotionId: normalizeId(promotion._id), code: promotion.code || null, reason: eligibility.reason });
        continue;
      }

      if (promotion.type === "free_shipping" && !rules.allowFreeShippingWithDiscount && appliedPromotions.length > 0) {
        rejectedPromotions.push({ promotionId: normalizeId(promotion._id), code: promotion.code || null, reason: "free_shipping_stack_blocked" });
        continue;
      }

      const discount = calculateDiscount(promotion, normalizedCart, { ...context, rules });
      if (discount.amount <= 0) {
        rejectedPromotions.push({ promotionId: normalizeId(promotion._id), code: promotion.code || null, reason: "no_discount" });
        continue;
      }

      appliedPromotions.push(normalizePromotionLine({ promotion, discount: discount.amount, base: discount.base }));
      if (promotion.stackable === false) blockedByNonStackable = true;
    }

    const discountTotalBeforeCap = appliedPromotions.reduce((sum, line) => sum + line.discountAmount, 0);
    const maxDiscount = roundMoney(((normalizedCart.subtotal + normalizedCart.deliveryCharge) * Number(rules.maxStackedDiscountPercent || 100)) / 100);
    const discountTotal = roundMoney(Math.min(discountTotalBeforeCap, maxDiscount));
    const finalTotal = roundMoney(Math.max(0, normalizedCart.subtotal + normalizedCart.deliveryCharge - discountTotal));

    return {
      version: 1,
      rules,
      cart: normalizedCart,
      appliedPromotions,
      rejectedPromotions,
      totals: {
        subtotal: normalizedCart.subtotal,
        deliveryCharge: normalizedCart.deliveryCharge,
        discountTotal,
        uncappedDiscountTotal: roundMoney(discountTotalBeforeCap),
        maxDiscount,
        finalTotal,
      },
      snapshot: {
        capturedAt: now,
        appliedPromotions,
        totals: {
          subtotal: normalizedCart.subtotal,
          deliveryCharge: normalizedCart.deliveryCharge,
          discountTotal,
          finalTotal,
        },
      },
    };
  }

  static async validateCode({ db, code, cart = {}, user = {}, context = {} }) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return { valid: false, error: "Promotion code is required" };
    const result = await PromotionService.evaluateCart({
      db,
      cart,
      user,
      context: { ...context, code: normalizedCode },
    });
    const applied = result.appliedPromotions.find((line) => line.code === normalizedCode);
    return applied
      ? { valid: true, promotion: applied, result }
      : { valid: false, error: "Promotion code is not eligible", result };
  }

  static async snapshotForOrder({ db, orderId, userId = null, result = {} }) {
    if (!db?.collection || !orderId) return null;
    const snapshot = {
      orderId: normalizeId(orderId),
      userId: userId ? normalizeId(userId) : null,
      version: result.version || 1,
      appliedPromotions: result.appliedPromotions || [],
      rejectedPromotions: result.rejectedPromotions || [],
      totals: result.totals || {},
      rules: result.rules || {},
      createdAt: new Date(),
    };
    await db.collection("promotion_snapshots").insertOne(snapshot);
    return snapshot;
  }

  static async lockRedemptions({ db, orderId, userId = null, result = {} }) {
    if (!db?.collection || !orderId) return [];
    const rows = [];
    for (const line of result.appliedPromotions || []) {
      const row = {
        promotionId: line.promotionId,
        promotionCode: line.code || null,
        promotionType: line.type,
        userId: userId ? normalizeId(userId) : null,
        orderId: normalizeId(orderId),
        discountAmount: Number(line.discountAmount || 0),
        snapshot: line,
        redeemedAt: new Date(),
        createdAt: new Date(),
      };
      rows.push(row);
      await db.collection("promotion_redemptions").insertOne(row);
      if (line.promotionId && ObjectId.isValid(line.promotionId)) {
        await db.collection("promotions").updateOne(
          { _id: new ObjectId(line.promotionId) },
          {
            $inc: { usedCount: 1, totalDiscountGiven: Number(line.discountAmount || 0) },
            $set: { updatedAt: new Date() },
          },
        );
      }
    }
    return rows;
  }
}

module.exports = PromotionService;
module.exports.PROMOTION_TYPES = PROMOTION_TYPES;
module.exports.EVALUATION_ORDER = EVALUATION_ORDER;
module.exports.DEFAULT_RULES = DEFAULT_RULES;
module.exports._test = {
  calculateDiscount,
  determineStatus,
  getPromotionSubtotal,
  normalizeCart,
  scopeMatchedItems,
};
