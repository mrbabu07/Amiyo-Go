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
} = {}) => {
  const config = plainSettings(settings);
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
    const freeThreshold = Number(
      vendorSettings.freeDeliveryThreshold ?? (config.freeDeliveryEnabled !== false ? config.freeDeliveryThreshold : 0) ?? 0,
    );
    const baseFee = method === "pickup" ? 0 : Number(feeConfig[zoneType] ?? feeConfig.outsideDistrict);
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
    const totalWeight = vendorItems.reduce(
      (sum, item) => sum + Number(item.weight || 0) * Number(item.quantity || 0),
      0,
    );
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
      ? round2(perishableFee + heavyFee + expressFee + remoteAreaFee + handlingFee)
      : round2(baseFee + perishableFee + heavyFee + expressFee + remoteAreaFee + handlingFee);

    return {
      vendorId: vendorId === "platform" ? null : vendorId,
      vendorName,
      deliveryMethod: method,
      zoneType,
      zoneLabel: getZoneLabel(zoneType),
      subtotal,
      baseFee: round2(baseFee),
      deliveryFee,
      freeDeliveryApplied,
      freeDeliveryThreshold: freeThreshold,
      perishableFee: round2(perishableFee),
      heavyFee,
      expressFee: round2(expressFee),
      remoteAreaFee: round2(remoteAreaFee),
      handlingFee: round2(handlingFee),
      estimatedDeliveryDays: vendorSettings.estimatedDeliveryDays || config.estimatedDeliveryDays || { min: 2, max: 5 },
      preparationTime: vendorSettings.preparationTime || "",
      itemCount: vendorItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
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
