const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const DEFAULT_ZONE_FEES = {
  sameUnion: 30,
  sameUpazila: 50,
  sameDistrict: 80,
  outsideDistrict: 120,
};

const DEFAULT_PLATFORM_LOCATION = {
  division: "Chattogram",
  district: "Coxsbazar",
  upazila: "Teknaf",
  union: "Hnila",
};

const LOCATION_ALIASES = {
  chittagong: "chattogram",
  chattagram: "chattogram",
  "cox's bazar": "coxsbazar",
  "coxs bazar": "coxsbazar",
  "cox bazar": "coxsbazar",
  "cox-bazar": "coxsbazar",
  "coxsbazar sadar": "coxsbazar sadar",
  nhila: "hnila",
  "hnila union": "hnila",
  "teknaf sadar": "teknaf sadar",
};

const normalizeText = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return LOCATION_ALIASES[normalized] || normalized;
};

const getVendorLocation = (vendor = {}, platformBaseLocation = DEFAULT_PLATFORM_LOCATION) => {
  const address = vendor.address || {};
  const fallbackLocation = vendor.platformBaseLocation || platformBaseLocation || DEFAULT_PLATFORM_LOCATION;
  return {
    division: vendor.division || address.division || address.state || fallbackLocation.division || "",
    district: vendor.district || address.district || address.city || fallbackLocation.district || "",
    upazila: vendor.upazila || address.upazila || fallbackLocation.upazila || "",
    union: vendor.union || address.union || fallbackLocation.union || "",
  };
};

const getZoneType = (shippingInfo = {}, vendor = {}, platformBaseLocation = DEFAULT_PLATFORM_LOCATION) => {
  const vendorLocation = getVendorLocation(vendor, platformBaseLocation);
  const customerDistrict = normalizeText(shippingInfo.district || shippingInfo.city);
  const sameDistrict = customerDistrict && customerDistrict === normalizeText(vendorLocation.district);
  const sameUpazila = sameDistrict && normalizeText(shippingInfo.upazila) === normalizeText(vendorLocation.upazila);
  const sameUnion = sameUpazila && normalizeText(shippingInfo.union) === normalizeText(vendorLocation.union);

  if (sameUnion) return "sameUnion";
  if (sameUpazila) return "sameUpazila";
  if (sameDistrict) return "sameDistrict";
  return "outsideDistrict";
};

const getZoneLabel = (zoneType) => ({
  sameUnion: "Same union",
  sameUpazila: "Same upazila",
  sameDistrict: "Same district",
  outsideDistrict: "Outside district",
}[zoneType] || "Standard");

const plainSettings = (settings = {}) =>
  typeof settings.toObject === "function" ? settings.toObject() : settings;

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizePaymentMethod = (value) => normalizeText(value).replace(/\s+/g, "_");

const getItemCount = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const getDeliveryZoneCode = (shippingInfo = {}, zones = []) => {
  const customerTokens = [
    shippingInfo.union,
    shippingInfo.unionId,
    shippingInfo.upazila,
    shippingInfo.upazilaId,
    shippingInfo.district,
    shippingInfo.districtId,
    shippingInfo.city,
    shippingInfo.division,
    shippingInfo.divisionId,
    shippingInfo.area,
  ].map(normalizeText).filter(Boolean);

  const matchedZone = (zones || []).find((zone) => {
    if (zone.status && zone.status !== "active") return false;
    const zoneTokens = [
      zone.code,
      zone.name,
      ...(zone.districts || []),
      ...(zone.areas || []),
      ...(zone.upazilas || []),
      ...(zone.unions || []),
    ].map(normalizeText).filter(Boolean);

    return zoneTokens.some((token) => customerTokens.includes(token));
  });

  return matchedZone?.code || matchedZone?.name || "";
};

const ruleMatchesContext = (rule = {}, context = {}) => {
  if (rule.status && rule.status !== "active") return false;

  const zoneCode = normalizeText(rule.zoneCode);
  if (zoneCode) {
    const candidates = [
      context.deliveryZoneCode,
      context.zoneType,
      getZoneLabel(context.zoneType),
    ].map(normalizeText).filter(Boolean);
    if (!candidates.includes(zoneCode)) return false;
  }

  const subtotal = toNumber(context.subtotal);
  const totalWeight = toNumber(context.totalWeight);
  if (toNumber(rule.minOrderAmount) > 0 && subtotal < toNumber(rule.minOrderAmount)) return false;
  if (toNumber(rule.maxOrderAmount) > 0 && subtotal > toNumber(rule.maxOrderAmount)) return false;
  if (toNumber(rule.minWeightKg) > 0 && totalWeight < toNumber(rule.minWeightKg)) return false;
  if (toNumber(rule.maxWeightKg) > 0 && totalWeight > toNumber(rule.maxWeightKg)) return false;

  const paymentMethods = Array.isArray(rule.paymentMethods)
    ? rule.paymentMethods.map(normalizePaymentMethod).filter(Boolean)
    : [];
  if (paymentMethods.length > 0 && !paymentMethods.includes(normalizePaymentMethod(context.paymentMethod))) {
    return false;
  }

  return true;
};

const sortFeeRules = (rules = []) =>
  [...rules].sort((first, second) =>
    Number(first.priority || 100) - Number(second.priority || 100) ||
    new Date(first.createdAt || 0) - new Date(second.createdAt || 0),
  );

const getVendorFeeConfig = (vendorSettings = {}, settings = {}) => {
  const globalZoneFees = plainSettings(settings).zoneFees || DEFAULT_ZONE_FEES;
  return {
    sameUnion: Number(vendorSettings.sameUnionFee ?? globalZoneFees.sameUnion ?? DEFAULT_ZONE_FEES.sameUnion),
    sameUpazila: Number(vendorSettings.sameUpazilaFee ?? globalZoneFees.sameUpazila ?? DEFAULT_ZONE_FEES.sameUpazila),
    sameDistrict: Number(vendorSettings.sameDistrictFee ?? globalZoneFees.sameDistrict ?? DEFAULT_ZONE_FEES.sameDistrict),
    outsideDistrict: Number(vendorSettings.outsideDistrictFee ?? globalZoneFees.outsideDistrict ?? DEFAULT_ZONE_FEES.outsideDistrict),
  };
};

const calculateDeliveryBreakdown = ({
  items = [],
  shippingInfo = {},
  vendorsById = {},
  settings = {},
  deliveryMethod = "standard",
  paymentMethod = "",
} = {}) => {
  const config = plainSettings(settings);
  const deliveryFeeRules = sortFeeRules(config.deliveryFeeRules || []);
  const deliveryZones = config.deliveryZones || [];
  const vendorGroups = items.reduce((groups, item) => {
    const vendorId = item.vendorId ? String(item.vendorId) : "platform";
    if (!groups[vendorId]) groups[vendorId] = [];
    groups[vendorId].push(item);
    return groups;
  }, {});

  const breakdown = Object.entries(vendorGroups).map(([vendorId, vendorItems]) => {
    const vendor = vendorsById[vendorId] || {};
    const vendorSettings = vendor.deliverySettings || {};
    const vendorName = vendor.shopName || vendor.businessName || vendor.name || vendorItems[0]?.shopName || "HnilaBazar";
    const subtotal = round2(vendorItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    ));
    const zoneType = getZoneType(shippingInfo, vendor, config.platformBaseLocation);
    const feeConfig = getVendorFeeConfig(vendorSettings, config);
    const method = deliveryMethod === "pickup" && vendorSettings.pickupEnabled
      ? "pickup"
      : vendorSettings.selfDeliveryEnabled
        ? "vendor_delivery"
        : "platform_delivery";
    const totalWeight = vendorItems.reduce(
      (sum, item) => sum + Number(item.weight || 0) * Number(item.quantity || 0),
      0,
    );
    const itemCount = getItemCount(vendorItems);
    const deliveryZoneCode = getDeliveryZoneCode(shippingInfo, deliveryZones);
    const matchingRules = deliveryFeeRules.filter((rule) =>
      ruleMatchesContext(rule, {
        deliveryZoneCode,
        zoneType,
        subtotal,
        totalWeight,
        paymentMethod,
      }),
    );
    const zoneRule = matchingRules.find((rule) =>
      ["zone_rate", "per_item", "weight_based"].includes(rule.ruleType) &&
      rule.baseFee !== undefined,
    );
    const perItemRule = matchingRules.find((rule) =>
      rule.ruleType === "per_item" || toNumber(rule.perItemFee) > 0,
    );
    const weightRule = matchingRules.find((rule) =>
      rule.ruleType === "weight_based" || toNumber(rule.feePerKg) > 0,
    );
    const freeShippingRule = matchingRules.find((rule) =>
      rule.ruleType === "free_shipping" && toNumber(rule.freeShippingThreshold) > 0,
    );
    const codRule = matchingRules.find((rule) =>
      rule.ruleType === "cod_fee" || toNumber(rule.codFee) > 0,
    );
    const adminBaseFee = zoneRule ? toNumber(zoneRule.baseFee) : null;
    const baseFee = method === "pickup"
      ? 0
      : adminBaseFee !== null
        ? adminBaseFee
        : Number(feeConfig[zoneType] ?? feeConfig.outsideDistrict);
    const perItemFeeRate = method === "pickup" ? 0 : toNumber(perItemRule?.perItemFee);
    const itemFee = round2(perItemFeeRate * itemCount);
    const ruleWeightFee = method === "pickup" || !weightRule
      ? 0
      : round2(Math.max(0, totalWeight - toNumber(weightRule.minWeightKg)) * toNumber(weightRule.feePerKg));
    const codFee = method === "pickup" || !["cod", "cash_on_delivery", "cash on delivery"].includes(normalizePaymentMethod(paymentMethod))
      ? 0
      : toNumber(codRule?.codFee ?? config.codCharge);
    const ruleFreeThreshold = toNumber(freeShippingRule?.freeShippingThreshold);
    const freeThreshold = Number(
      vendorSettings.freeDeliveryThreshold ??
        (ruleFreeThreshold > 0 ? ruleFreeThreshold : undefined) ??
        (config.freeDeliveryEnabled !== false ? config.freeDeliveryThreshold : 0) ??
        0,
    );
    const chargeableDeliveryFee = round2(baseFee + itemFee + ruleWeightFee);
    const freeDeliveryApplied = method !== "pickup" && freeThreshold > 0 && subtotal >= freeThreshold;
    const hasPerishable = vendorItems.some((item) =>
      item.isPerishable || [
        "perishable",
        "fish",
        "vegetable",
        "frozen",
        "homemade",
        "restaurant",
        "ready-food",
        "cooked-food",
      ].includes(item.deliveryClass),
    );
    const perishableFee = method === "pickup" || !hasPerishable
      ? 0
      : Number(vendorSettings.perishableFee ?? config.perishableFee ?? 20);
    const heavyThreshold = Number(config.heavyItemThresholdKg ?? 5);
    const heavyFee = method === "pickup" || totalWeight <= heavyThreshold
      ? 0
      : round2((totalWeight - heavyThreshold) * Number(config.heavyItemFeePerKg ?? 10));
    const expressFee = deliveryMethod === "express" && config.expressDeliveryEnabled
      ? Number(config.expressDeliveryCharge || 0)
      : 0;
    const remoteAreaFee = zoneType === "outsideDistrict" ? Number(config.remoteAreaFee || 0) : 0;
    const handlingFee = method === "pickup" ? 0 : Number(vendorSettings.handlingFee || 0);
    const deliveryFee = freeDeliveryApplied
      ? round2(perishableFee + heavyFee + expressFee + remoteAreaFee + handlingFee + codFee)
      : round2(chargeableDeliveryFee + perishableFee + heavyFee + expressFee + remoteAreaFee + handlingFee + codFee);

    return {
      vendorId: vendorId === "platform" ? null : vendorId,
      vendorName,
      deliveryMethod: method,
      zoneType,
      zoneLabel: getZoneLabel(zoneType),
      deliveryZoneCode,
      subtotal,
      baseFee: round2(baseFee),
      chargeableDeliveryFee,
      waivedDeliveryFee: freeDeliveryApplied ? chargeableDeliveryFee : 0,
      perItemFee: round2(perItemFeeRate),
      itemFee,
      weightFee: round2(ruleWeightFee),
      codFee: round2(codFee),
      deliveryFee,
      freeDeliveryApplied,
      freeDeliveryThreshold: freeThreshold,
      feeRuleId: zoneRule?._id || perItemRule?._id || weightRule?._id || null,
      feeRuleName: zoneRule?.name || perItemRule?.name || weightRule?.name || "",
      perishableFee: round2(perishableFee),
      heavyFee,
      expressFee: round2(expressFee),
      remoteAreaFee: round2(remoteAreaFee),
      handlingFee: round2(handlingFee),
      estimatedDeliveryDays: vendorSettings.estimatedDeliveryDays || config.estimatedDeliveryDays || { min: 2, max: 5 },
      preparationTime: vendorSettings.preparationTime || "",
      itemCount,
    };
  });

  const totalDeliveryFee = round2(breakdown.reduce((sum, item) => sum + Number(item.deliveryFee || 0), 0));

  return {
    breakdown,
    totalDeliveryFee,
    isFree: totalDeliveryFee === 0,
  };
};

module.exports = {
  calculateDeliveryBreakdown,
  DEFAULT_ZONE_FEES,
  DEFAULT_PLATFORM_LOCATION,
  round2,
};
