const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const getAddressParts = (address = {}) =>
  [
    address.deliveryZone,
    address.zone,
    address.area,
    address.union,
    address.unionName,
    address.unionId,
    address.wardNo,
    address.ward,
    address.thana,
    address.thanaId,
    address.upazila,
    address.upazilaId,
    address.district || address.city,
    address.districtId,
    address.division,
    address.divisionId,
  ].filter(Boolean);

const zoneKeys = (zone = {}) =>
  [
    zone._id,
    zone.id,
    zone.code,
    zone.name,
    ...(Array.isArray(zone.districts) ? zone.districts : []),
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
  return [
    shipment.deliveryZone,
    shipment.zone,
    ...getAddressParts(address),
    shipment.deliveryAddressText,
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
  normalizeStringArray,
  orderMatchesLogisticsScope,
  shipmentMatchesLogisticsScope,
  zoneMatchesScope,
};
