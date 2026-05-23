const stringifyValue = (value) => {
  if (value === null || value === undefined) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value).trim();
  if (value?.toString && value.toString !== Object.prototype.toString) return value.toString().trim();
  return "";
};

const normalizeId = (value) => stringifyValue(value);

const normalizeText = (value) => stringifyValue(value).toLowerCase();

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const uniqueNormalized = (values = []) => [...new Set(values.map(normalizeText).filter(Boolean))];

const fieldValues = (source = {}, fields = []) =>
  fields.map((field) => stringifyValue(source[field])).filter(Boolean);

const prefixedKeys = (prefix, values = []) =>
  values.flatMap((value) => {
    const normalized = normalizeText(value);
    return normalized ? [`${prefix}:${normalized}`] : [];
  });

const locationKeysFromAddress = (address = {}) => {
  const divisionValues = fieldValues(address, ["division", "divisionName", "divisionId", "division_id"]);
  const districtValues = fieldValues(address, ["district", "districtName", "districtId", "district_id", "city"]);
  const upazilaValues = fieldValues(address, [
    "upazila",
    "upazilla",
    "upazilaName",
    "upazillaName",
    "upazilaId",
    "upazillaId",
    "upazila_id",
    "upazilla_id",
    "thana",
    "thanaName",
    "thanaId",
  ]);
  const unionValues = fieldValues(address, [
    "union",
    "unionName",
    "unionId",
    "union_id",
    "areaUnion",
    "ward",
    "wardNo",
  ]);
  const areaValues = fieldValues(address, [
    "deliveryZone",
    "zone",
    "area",
    "deliveryArea",
    "localArea",
    "address",
    "street",
    "addressText",
    "formattedAddress",
  ]);

  return uniqueNormalized([
    ...areaValues,
    ...unionValues,
    ...upazilaValues,
    ...districtValues,
    ...divisionValues,
    ...prefixedKeys("division", divisionValues),
    ...prefixedKeys("district", districtValues),
    ...prefixedKeys("upazila", upazilaValues),
    ...prefixedKeys("thana", upazilaValues),
    ...prefixedKeys("union", unionValues),
    ...prefixedKeys("area", areaValues),
  ]);
};

const getAddressParts = (address = {}) => locationKeysFromAddress(address);

const addressTextMatchesScope = (address = {}, assigned = []) => {
  const haystack = normalizeText([
    address.addressText,
    address.formattedAddress,
    address.address,
    address.street,
    address.line1,
    address.addressLine1,
  ].filter(Boolean).join(" "));
  if (!haystack) return false;
  return assigned.some((value) => value && !value.includes(":") && value.length >= 3 && haystack.includes(value));
};

const zoneKeys = (zone = {}) =>
  [
    zone._id,
    zone.id,
    zone.code,
    zone.name,
    ...(Array.isArray(zone.districts) ? zone.districts : []),
    ...prefixedKeys("district", Array.isArray(zone.districts) ? zone.districts : []),
    ...prefixedKeys("division", [zone.division, zone.divisionId]),
  ]
    .map(normalizeText)
    .filter(Boolean);

const orderLocationKeys = (order = {}) => {
  const shipping = order.shippingInfo || order.deliveryAddress || {};
  return [
    order.deliveryZone,
    shipping.deliveryZone,
    shipping.zone,
    ...getAddressParts(shipping),
  ]
    .map(normalizeText)
    .filter(Boolean);
};

const shipmentLocationKeys = (shipment = {}) => {
  const address = shipment.deliveryAddress || {};
  const pickupAddress = shipment.pickupAddress || shipment.vendorAddress || {};
  return [
    shipment.deliveryZone,
    shipment.zone,
    ...getAddressParts(address),
    ...getAddressParts(pickupAddress),
    shipment.deliveryAddressText,
    shipment.pickupAddressText,
  ]
    .map(normalizeText)
    .filter(Boolean);
};

const getScopeFromUser = (user = {}) => {
  const profile = user.logisticsProfile || {};
  const assignedZones = normalizeStringArray(profile.assignedZones || user.assignedZones);
  const assignedVendorIds = normalizeStringArray(profile.assignedVendorIds || user.assignedVendorIds);

  return {
    assignedZones,
    assignedVendorIds,
    firebaseUid: user.firebaseUid || user.uid || "",
    userId: normalizeId(user._id || user.userId),
    pickupStaffId: normalizeId(profile.pickupStaffId),
  };
};

const getLogisticsScopeFromRequest = (req) => {
  const role = req.dbUser?.role || req.user?.role;
  if (!role || ["admin", "manager"].includes(role)) return null;
  if (role !== "logistics_manager") return null;

  const scope = getScopeFromUser(req.dbUser || req.user || {});
  return {
    ...scope,
    scoped: true,
  };
};

const valueMatchesScope = (value, scopedValues = []) => {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return scopedValues.map(normalizeText).includes(normalized);
};

const zoneMatchesScope = (zone, scope) => {
  if (!scope?.scoped) return true;
  if (!scope.assignedZones?.length) return false;
  const assigned = scope.assignedZones.map(normalizeText);
  return zoneKeys(zone).some((key) => assigned.includes(key));
};

const addressMatchesLogisticsScope = (address = {}, scope = null) => {
  if (!scope?.scoped) return true;
  if (!scope.assignedZones?.length) return false;
  const assigned = scope.assignedZones.map(normalizeText);
  const locationKeys = locationKeysFromAddress(address);
  return locationKeys.some((key) => assigned.includes(key)) || addressTextMatchesScope(address, assigned);
};

const orderVendorMatchesScope = (order = {}, scope) => {
  if (!scope?.assignedVendorIds?.length) return false;
  const assigned = scope.assignedVendorIds.map(normalizeId);
  return (order.products || []).some((product) =>
    assigned.includes(normalizeId(product.vendorId || product.vendor_id || product.sellerId)),
  );
};

const orderZoneMatchesScope = (order = {}, zones = [], scope) => {
  if (!scope?.assignedZones?.length) return false;
  const assigned = scope.assignedZones.map(normalizeText);
  const locationKeys = orderLocationKeys(order);
  if (locationKeys.some((key) => assigned.includes(key))) return true;
  return zones.some((zone) => zoneMatchesScope(zone, scope) && zoneKeys(zone).some((key) => locationKeys.includes(key)));
};

const orderMatchesLogisticsScope = (order = {}, zones = [], scope = null) => {
  if (!scope?.scoped) return true;
  if (!scope.assignedZones?.length && !scope.assignedVendorIds?.length) return false;
  return orderZoneMatchesScope(order, zones, scope) || orderVendorMatchesScope(order, scope);
};

const shipmentVendorMatchesScope = (shipment = {}, scope) => {
  if (!scope?.assignedVendorIds?.length) return false;
  return scope.assignedVendorIds.map(normalizeId).includes(normalizeId(shipment.vendorId));
};

const shipmentZoneMatchesScope = (shipment = {}, zones = [], scope) => {
  if (!scope?.assignedZones?.length) return false;
  const assigned = scope.assignedZones.map(normalizeText);
  const locationKeys = shipmentLocationKeys(shipment);
  if (locationKeys.some((key) => assigned.includes(key))) return true;
  return zones.some((zone) => zoneMatchesScope(zone, scope) && zoneKeys(zone).some((key) => locationKeys.includes(key)));
};

const shipmentMatchesLogisticsScope = (shipment = {}, zones = [], scope = null) => {
  if (!scope?.scoped) return true;
  if (!scope.assignedZones?.length && !scope.assignedVendorIds?.length) return false;
  return shipmentZoneMatchesScope(shipment, zones, scope) || shipmentVendorMatchesScope(shipment, scope);
};

const filterZonesForLogisticsScope = (zones = [], scope = null) =>
  scope?.scoped ? zones.filter((zone) => zoneMatchesScope(zone, scope)) : zones;

const filterOrdersForLogisticsScope = (orders = [], zones = [], scope = null) =>
  scope?.scoped ? orders.filter((order) => orderMatchesLogisticsScope(order, zones, scope)) : orders;

const filterShipmentsForLogisticsScope = (shipments = [], zones = [], scope = null) =>
  scope?.scoped ? shipments.filter((shipment) => shipmentMatchesLogisticsScope(shipment, zones, scope)) : shipments;

module.exports = {
  filterOrdersForLogisticsScope,
  filterShipmentsForLogisticsScope,
  filterZonesForLogisticsScope,
  getLogisticsScopeFromRequest,
  getScopeFromUser,
  addressMatchesLogisticsScope,
  locationKeysFromAddress,
  normalizeStringArray,
  orderMatchesLogisticsScope,
  shipmentMatchesLogisticsScope,
  zoneMatchesScope,
};
