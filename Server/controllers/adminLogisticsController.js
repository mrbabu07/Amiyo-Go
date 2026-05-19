const { ObjectId } = require("mongodb");
const { appendOrderEvent } = require("../services/orderEventService");
const {
  getCourierProviderStatus,
  normalizeProvider,
} = require("../services/courierProviderService");

const READY_FOR_DISPATCH_STATUSES = ["packed", "ready_to_ship", "pickup_ready"];
const FAILED_DELIVERY_STATUSES = ["failed_delivery", "delivery_failed", "reattempt_scheduled", "return_to_seller"];
const FEE_RULE_TYPES = ["free_shipping", "weight_based", "zone_rate", "cod_fee", "redelivery_fee"];
const COURIER_STATUSES = ["active", "paused", "disabled"];
const COURIER_BOOKING_MODES = ["manual", "live"];
const COURIER_COVERAGE_TYPES = ["outside_district", "local_area", "both"];
const STAFF_STATUSES = ["active", "off_duty", "inactive"];

const DEFAULT_DELIVERY_ZONES = [
  {
    name: "Dhaka",
    code: "dhaka",
    districts: ["Dhaka", "Gazipur", "Narayanganj", "Savar"],
    codAvailable: true,
    status: "active",
    sortOrder: 1,
  },
  {
    name: "Chittagong",
    code: "chittagong",
    districts: ["Chattogram", "Chittagong", "Cox's Bazar", "Coxsbazar"],
    codAvailable: true,
    status: "active",
    sortOrder: 2,
  },
  {
    name: "Sylhet",
    code: "sylhet",
    districts: ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
    codAvailable: true,
    status: "active",
    sortOrder: 3,
  },
  {
    name: "Others",
    code: "others",
    districts: [],
    codAvailable: false,
    status: "active",
    sortOrder: 99,
  },
];

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const safeObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const idFilter = (value) => {
  const objectId = safeObjectId(value);
  return objectId ? { $or: [{ _id: objectId }, { _id: normalizeId(value) }] } : { _id: normalizeId(value) };
};

const idValues = (value) => {
  const normalized = normalizeId(value);
  const objectId = safeObjectId(value);
  return objectId ? [normalized, objectId] : [normalized];
};

const serializeDoc = (doc) => ({
  ...doc,
  _id: normalizeId(doc?._id),
});

const attachCourierCredentialStatus = (courier, env = process.env) => {
  const status = getCourierProviderStatus(env);
  const provider = normalizeProvider(courier?.provider || courier?.code);
  const providerStatus = status.providers[provider] || status.providers.manual;
  return {
    ...courier,
    provider,
    credentialStatus: providerStatus.status,
    credentialsConfigured: providerStatus.configured,
    providerBaseUrl: providerStatus.baseUrl || null,
  };
};

const getActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const appendLogisticsAudit = async (req, { action, target, changes = {}, metadata = {} }) => {
  const db = req.app.locals.db;
  if (!db?.collection) return null;

  const payload = {
    action,
    module: "logistics",
    actor: getActor(req),
    target,
    changes,
    metadata,
    createdAt: new Date(),
  };

  const AuditLog = req.app.locals.models?.AuditLog;
  if (AuditLog?.append) return AuditLog.append(payload);
  return db.collection("audit_logs").insertOne(payload);
};

const collectionToArray = async (db, name, query = {}, sort = {}) => {
  const cursor = db.collection(name).find(query);
  if (Object.keys(sort).length > 0) cursor.sort(sort);
  return cursor.toArray();
};

const dayRange = (value) => {
  if (!value) return null;
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const isCodOrder = (order) => {
  const method = normalizeText(order.paymentMethod || order.payment?.method || order.paymentType);
  return ["cod", "cash_on_delivery", "cash on delivery"].includes(method);
};

const orderAmount = (order) =>
  roundMoney(order.totalAmount ?? order.total ?? order.finalTotal ?? order.grandTotal ?? order.amount ?? 0);

const getOrderDate = (order) => order.readyToShipAt || order.pickupReadyAt || order.updatedAt || order.createdAt || null;

const isReadyForDispatch = (order) => {
  if (READY_FOR_DISPATCH_STATUSES.includes(order.status)) return true;
  return (order.products || []).some((item) => READY_FOR_DISPATCH_STATUSES.includes(item.itemStatus || item.status));
};

const isFailedDelivery = (order) =>
  FAILED_DELIVERY_STATUSES.includes(order.status) ||
  FAILED_DELIVERY_STATUSES.includes(order.deliveryStatus) ||
  (order.products || []).some((item) => FAILED_DELIVERY_STATUSES.includes(item.itemStatus || item.deliveryStatus));

const getAddressParts = (shippingInfo = {}) =>
  [
    shippingInfo.address,
    shippingInfo.area,
    shippingInfo.upazila,
    shippingInfo.district || shippingInfo.city,
    shippingInfo.division,
  ].filter(Boolean);

const extractVendorNames = (order) => {
  const names = new Set();
  if (Array.isArray(order.vendorNames)) order.vendorNames.forEach((name) => name && names.add(name));
  (order.products || []).forEach((product) => {
    const name = product.vendorName || product.shopName || product.vendor?.shopName;
    if (name) names.add(name);
  });
  return [...names];
};

const getZoneForOrder = (order, zones = []) => {
  const shipping = order.shippingInfo || {};
  const locationValues = [
    order.deliveryZone,
    shipping.deliveryZone,
    shipping.zone,
    shipping.district,
    shipping.city,
    shipping.division,
    shipping.upazila,
    shipping.area,
  ].map(normalizeText);

  const activeZones = zones.filter((zone) => zone.status !== "inactive" && zone.status !== "disabled");
  const matched = activeZones.find((zone) => {
    const zoneNames = [zone.name, zone.code, ...(zone.districts || [])].map(normalizeText);
    return locationValues.some((value) => value && zoneNames.includes(value));
  });

  return matched || activeZones.find((zone) => normalizeText(zone.code) === "others") || null;
};

const getAssignmentForOrder = (order, assignmentsByOrderId) => {
  const keys = idValues(order._id);
  return keys.map(normalizeId).map((key) => assignmentsByOrderId.get(key)).find(Boolean) || null;
};

const chooseCourierForOrder = ({ order, zone, assignment, couriers = [] }) => {
  if (assignment?.courierName) return assignment.courierName;
  if (order.courierName) return order.courierName;

  const zoneCourierIds = (zone?.courierPartnerIds || []).map(normalizeId);
  const matchedById = couriers.find((courier) => zoneCourierIds.includes(normalizeId(courier._id)));
  if (matchedById?.name) return matchedById.name;

  const matchedByZone = couriers.find((courier) =>
    (courier.serviceZones || []).map(normalizeText).includes(normalizeText(zone?.code || zone?.name)),
  );
  if (matchedByZone?.name) return matchedByZone.name;

  return zone?.defaultCourierName || "Unassigned";
};

const buildDispatchManifest = ({ orders = [], zones = [], couriers = [], assignments = [], date = null }) => {
  const range = dayRange(date);
  const assignmentsByOrderId = new Map(
    assignments.flatMap((assignment) => idValues(assignment.orderId).map((value) => [normalizeId(value), assignment])),
  );

  const rows = orders
    .filter(isReadyForDispatch)
    .filter((order) => {
      if (!range) return true;
      const assignment = getAssignmentForOrder(order, assignmentsByOrderId);
      const dateValue = assignment?.pickupDate || getOrderDate(order);
      if (!dateValue) return false;
      const parsed = new Date(dateValue);
      return parsed >= range.start && parsed < range.end;
    })
    .map((order) => {
      const assignment = getAssignmentForOrder(order, assignmentsByOrderId);
      const zone = getZoneForOrder(order, zones);
      const courierName = chooseCourierForOrder({ order, zone, assignment, couriers });
      const shipping = order.shippingInfo || {};

      return {
        orderId: normalizeId(order._id),
        status: order.status,
        customerName: shipping.name || order.customerName || "Customer",
        phone: shipping.phone || "",
        address: getAddressParts(shipping).join(", "),
        zoneId: normalizeId(zone?._id || zone?.code || "others"),
        zoneName: zone?.name || "Others",
        courierName,
        trackingNumber: assignment?.trackingNumber || order.trackingNumber || "",
        pickupWindow: assignment?.pickupWindow || order.pickupWindow || "",
        pickupAddress: assignment?.pickupAddress || order.pickupAddress || "",
        vendorNames: extractVendorNames(order),
        paymentMethod: order.paymentMethod || "",
        codAmount: isCodOrder(order) ? orderAmount(order) : 0,
        createdAt: order.createdAt,
        readyAt: getOrderDate(order),
      };
    });

  const groupsMap = rows.reduce((groups, row) => {
    if (!groups.has(row.courierName)) {
      groups.set(row.courierName, {
        courierName: row.courierName,
        totalOrders: 0,
        codToCollect: 0,
        zones: new Set(),
        orders: [],
      });
    }
    const group = groups.get(row.courierName);
    group.totalOrders += 1;
    group.codToCollect = roundMoney(group.codToCollect + row.codAmount);
    group.zones.add(row.zoneName);
    group.orders.push(row);
    return groups;
  }, new Map());

  const groups = [...groupsMap.values()].map((group) => ({
    ...group,
    zones: [...group.zones],
  }));

  return {
    date: date || null,
    totalOrders: rows.length,
    totalCodToCollect: roundMoney(rows.reduce((sum, row) => sum + row.codAmount, 0)),
    courierCount: groups.length,
    groups,
    rows,
  };
};

const buildCodFloatTracker = ({ orders = [], assignments = [], remittances = [] }) => {
  const assignmentsByOrderId = new Map(
    assignments.flatMap((assignment) => idValues(assignment.orderId).map((value) => [normalizeId(value), assignment])),
  );

  const codOrders = orders.filter(isCodOrder).filter((order) => !["cancelled", "returned"].includes(order.status));
  const rows = codOrders.map((order) => {
    const assignment = getAssignmentForOrder(order, assignmentsByOrderId);
    const amount = orderAmount(order);
    const collectionStatus = assignment?.codCollectionStatus || order.codCollectionStatus || "pending";
    const remittanceStatus = assignment?.codRemittanceStatus || order.codRemittanceStatus || "pending";
    const courierName = assignment?.courierName || order.courierName || "Unassigned";
    const collected =
      ["collected", "remitted", "forwarded_to_vendor"].includes(collectionStatus) ||
      order.codCollected === true ||
      Boolean(order.codCollectedAt) ||
      order.status === "delivered";
    const remitted =
      ["remitted", "forwarded_to_vendor"].includes(collectionStatus) ||
      ["remitted", "forwarded_to_vendor"].includes(remittanceStatus) ||
      order.codRemitted === true ||
      Boolean(order.codRemittedAt || order.vendorRemittedAt);

    return {
      orderId: normalizeId(order._id),
      courierName,
      amount,
      orderStatus: order.status,
      collectionStatus,
      remittanceStatus,
      customerName: order.shippingInfo?.name || "",
      customerPhone: order.shippingInfo?.phone || "",
      collectedAmount: collected ? amount : 0,
      outstandingAmount: collected && !remitted ? amount : 0,
      remittedAmount: remitted ? amount : 0,
    };
  });

  const remittanceTotal = roundMoney(remittances.reduce((sum, row) => sum + Number(row.remittedAmount || 0), 0));
  const forwardedToVendors = roundMoney(remittances.reduce((sum, row) => sum + Number(row.forwardedToVendorAmount || 0), 0));
  const collectedByCouriers = roundMoney(rows.reduce((sum, row) => sum + row.collectedAmount, 0));
  const remittedFromAssignments = roundMoney(rows.reduce((sum, row) => sum + row.remittedAmount, 0));

  const byCourier = rows.reduce((map, row) => {
    if (!map.has(row.courierName)) {
      map.set(row.courierName, {
        courierName: row.courierName,
        orders: 0,
        collectedAmount: 0,
        outstandingAmount: 0,
        remittedAmount: 0,
      });
    }
    const bucket = map.get(row.courierName);
    bucket.orders += 1;
    bucket.collectedAmount = roundMoney(bucket.collectedAmount + row.collectedAmount);
    bucket.outstandingAmount = roundMoney(bucket.outstandingAmount + row.outstandingAmount);
    bucket.remittedAmount = roundMoney(bucket.remittedAmount + row.remittedAmount);
    return map;
  }, new Map());

  return {
    summary: {
      codOrders: codOrders.length,
      codOrderValue: roundMoney(codOrders.reduce((sum, order) => sum + orderAmount(order), 0)),
      collectedByCouriers,
      remittedToPlatform: roundMoney(remittanceTotal || remittedFromAssignments),
      forwardedToVendors,
      outstandingWithCouriers: roundMoney(Math.max(0, collectedByCouriers - (remittanceTotal || remittedFromAssignments))),
    },
    byCourier: [...byCourier.values()],
    orders: rows,
    remittances: remittances.map(serializeDoc),
  };
};

const buildFailedDeliveryRows = ({ orders = [], failureRecords = [], assignments = [] }) => {
  const failureByOrderId = new Map(
    failureRecords.flatMap((failure) => idValues(failure.orderId).map((value) => [normalizeId(value), failure])),
  );
  const assignmentByOrderId = new Map(
    assignments.flatMap((assignment) => idValues(assignment.orderId).map((value) => [normalizeId(value), assignment])),
  );
  const orderRows = orders.filter(isFailedDelivery).map((order) => {
    const failure = failureByOrderId.get(normalizeId(order._id));
    const assignment = assignmentByOrderId.get(normalizeId(order._id));
    const shipping = order.shippingInfo || {};
    return {
      _id: normalizeId(failure?._id || order._id),
      orderId: normalizeId(order._id),
      customerName: shipping.name || order.customerName || "Customer",
      phone: shipping.phone || "",
      address: getAddressParts(shipping).join(", "),
      status: failure?.status || order.deliveryStatus || order.status,
      failureReason: failure?.failureReason || order.deliveryFailureReason || "",
      courierName: failure?.courierName || assignment?.courierName || order.courierName || "Unassigned",
      attemptCount: Number(failure?.attemptCount || order.deliveryAttemptCount || 1),
      nextAttemptAt: failure?.nextAttemptAt || order.nextAttemptAt || null,
      redeliveryFee: Number(failure?.redeliveryFee || order.redeliveryFee || 0),
      updatedAt: failure?.updatedAt || order.updatedAt || order.createdAt,
    };
  });

  const orderIds = new Set(orderRows.map((row) => row.orderId));
  const recordOnlyRows = failureRecords
    .filter((failure) => !orderIds.has(normalizeId(failure.orderId)))
    .map((failure) => ({
      ...serializeDoc(failure),
      orderId: normalizeId(failure.orderId),
    }));

  return [...orderRows, ...recordOnlyRows].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
};

const buildLogisticsOverview = ({
  zones = [],
  couriers = [],
  pickupStaff = [],
  feeRules = [],
  orders = [],
  assignments = [],
  failureRecords = [],
  remittances = [],
}) => {
  const manifest = buildDispatchManifest({ orders, zones, couriers, assignments });
  const cod = buildCodFloatTracker({ orders, assignments, remittances });
  const failedDeliveries = buildFailedDeliveryRows({ orders, failureRecords, assignments });

  return {
    zones: {
      total: zones.length,
      active: zones.filter((zone) => zone.status !== "inactive" && zone.status !== "disabled").length,
      codAvailable: zones.filter((zone) => zone.codAvailable !== false).length,
    },
    couriers: {
      total: couriers.length,
      active: couriers.filter((courier) => courier.status === "active").length,
      codEnabled: couriers.filter((courier) => courier.codSupported !== false).length,
    },
    dispatch: {
      readyOrders: manifest.totalOrders,
      courierGroups: manifest.courierCount,
      codToCollect: manifest.totalCodToCollect,
    },
    pickupStaff: {
      total: pickupStaff.length,
      active: pickupStaff.filter((staff) => staff.status === "active").length,
      assignedRoutes: pickupStaff.filter((staff) => staff.routeName || (staff.assignedZones || []).length > 0).length,
    },
    feeRules: {
      total: feeRules.length,
      active: feeRules.filter((rule) => rule.status !== "inactive").length,
      freeShipping: feeRules.filter((rule) => rule.ruleType === "free_shipping").length,
    },
    codFloat: cod.summary,
    failedDeliveries: {
      total: failedDeliveries.length,
      pendingReattempt: failedDeliveries.filter((row) => row.status === "reattempt_scheduled").length,
      returnToSeller: failedDeliveries.filter((row) => row.status === "return_to_seller").length,
    },
  };
};

const csvEscape = (value) => {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const manifestToCsv = (manifest) => {
  const headers = [
    "Courier",
    "Order ID",
    "Status",
    "Customer",
    "Phone",
    "Zone",
    "Address",
    "Tracking",
    "Payment",
    "COD Amount",
    "Vendors",
  ];
  const rows = manifest.rows.map((row) => [
    row.courierName,
    row.orderId,
    row.status,
    row.customerName,
    row.phone,
    row.zoneName,
    row.address,
    row.trackingNumber,
    row.paymentMethod,
    row.codAmount,
    (row.vendorNames || []).join("; "),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
};

const loadBaseLogisticsData = async (db) => {
  const [zones, couriers, pickupStaff, feeRules, orders, assignments, failureRecords, remittances] = await Promise.all([
    collectionToArray(db, "delivery_zones", {}, { sortOrder: 1, name: 1 }),
    collectionToArray(db, "courier_partners", {}, { name: 1 }),
    collectionToArray(db, "pickup_staff", {}, { name: 1 }),
    collectionToArray(db, "delivery_fee_rules", {}, { priority: 1, createdAt: -1 }),
    collectionToArray(db, "orders", {}, { createdAt: -1 }),
    collectionToArray(db, "dispatch_assignments", {}, { createdAt: -1 }),
    collectionToArray(db, "delivery_failures", {}, { updatedAt: -1 }),
    collectionToArray(db, "cod_remittances", {}, { remittedAt: -1 }),
  ]);

  return { zones, couriers, pickupStaff, feeRules, orders, assignments, failureRecords, remittances };
};

const getSeededZones = async (db) => {
  const zones = await collectionToArray(db, "delivery_zones", {}, { sortOrder: 1, name: 1 });
  if (zones.length > 0) return zones;

  const now = new Date();
  const seeds = DEFAULT_DELIVERY_ZONES.map((zone) => ({
    ...zone,
    courierPartnerIds: [],
    createdAt: now,
    updatedAt: now,
    seeded: true,
  }));
  await db.collection("delivery_zones").insertMany(seeds);
  return seeds;
};

exports.getLogisticsOverview = async (req, res) => {
  try {
    const data = await loadBaseLogisticsData(req.app.locals.db);
    res.json({
      success: true,
      data: buildLogisticsOverview(data),
    });
  } catch (error) {
    console.error("Error loading logistics overview:", error);
    res.status(500).json({ success: false, error: "Failed to load logistics overview" });
  }
};

exports.listDeliveryZones = async (req, res) => {
  try {
    const zones = await getSeededZones(req.app.locals.db);
    res.json({ success: true, data: zones.map(serializeDoc) });
  } catch (error) {
    console.error("Error loading delivery zones:", error);
    res.status(500).json({ success: false, error: "Failed to load delivery zones" });
  }
};

exports.upsertDeliveryZone = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    const zoneId = req.params.zoneId || req.body.zoneId;
    const name = String(req.body.name || "").trim();
    const code = slugify(req.body.code || name);

    if (!name) return res.status(400).json({ success: false, error: "Zone name is required" });
    if (!code) return res.status(400).json({ success: false, error: "Zone code is required" });

    const payload = {
      name,
      code,
      districts: normalizeStringArray(req.body.districts),
      courierPartnerIds: normalizeStringArray(req.body.courierPartnerIds),
      codAvailable: req.body.codAvailable !== false,
      status: req.body.status || "active",
      defaultCourierName: String(req.body.defaultCourierName || "").trim(),
      slaHours: Number(req.body.slaHours || 48),
      notes: String(req.body.notes || "").trim(),
      sortOrder: Number(req.body.sortOrder || 100),
      updatedAt: now,
    };

    if (zoneId) {
      const result = await db.collection("delivery_zones").updateOne(idFilter(zoneId), { $set: payload });
      if (result.matchedCount === 0) return res.status(404).json({ success: false, error: "Delivery zone not found" });
      await appendLogisticsAudit(req, {
        action: "logistics.zone.updated",
        target: { type: "delivery_zone", id: zoneId },
        changes: payload,
      });
      const updated = await db.collection("delivery_zones").findOne(idFilter(zoneId));
      return res.json({ success: true, data: serializeDoc(updated) });
    }

    const doc = { ...payload, createdAt: now };
    const result = await db.collection("delivery_zones").insertOne(doc);
    const saved = { ...doc, _id: result.insertedId };
    await appendLogisticsAudit(req, {
      action: "logistics.zone.created",
      target: { type: "delivery_zone", id: normalizeId(result.insertedId) },
      changes: payload,
    });
    return res.status(201).json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error saving delivery zone:", error);
    res.status(500).json({ success: false, error: "Failed to save delivery zone" });
  }
};

exports.listCourierPartners = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    const couriers = await collectionToArray(req.app.locals.db, "courier_partners", query, { name: 1 });
    res.json({
      success: true,
      data: couriers.map((courier) => attachCourierCredentialStatus(serializeDoc(courier), process.env)),
    });
  } catch (error) {
    console.error("Error loading courier partners:", error);
    res.status(500).json({ success: false, error: "Failed to load courier partners" });
  }
};

exports.getCourierProviderReadiness = (req, res) => {
  res.json({ success: true, data: getCourierProviderStatus(process.env) });
};

exports.upsertCourierPartner = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    const courierId = req.params.courierId || req.body.courierId;
    const name = String(req.body.name || "").trim();
    const code = slugify(req.body.code || name);

    if (!name) return res.status(400).json({ success: false, error: "Courier name is required" });

    const status = COURIER_STATUSES.includes(req.body.status) ? req.body.status : "active";
    const provider = normalizeProvider(req.body.provider || code);
    const bookingMode = COURIER_BOOKING_MODES.includes(req.body.bookingMode)
      ? req.body.bookingMode
      : provider === "manual" || provider === "local" ? "manual" : "live";
    const coverageType = COURIER_COVERAGE_TYPES.includes(req.body.coverageType)
      ? req.body.coverageType
      : req.body.localArea && !req.body.outsideDistrict ? "local_area" : "outside_district";
    const slaByZone = Array.isArray(req.body.slaByZone)
      ? req.body.slaByZone.map((row) => ({
          zoneCode: String(row.zoneCode || row.zoneId || "").trim(),
          zoneName: String(row.zoneName || "").trim(),
          processingHours: Number(row.processingHours || 24),
          deliveryDaysMin: Number(row.deliveryDaysMin || 1),
          deliveryDaysMax: Number(row.deliveryDaysMax || 3),
          baseDeliveryCost: Number(row.baseDeliveryCost || req.body.baseDeliveryCost || 0),
          codCollectionFee: Number(row.codCollectionFee || req.body.codCollectionFee || 0),
        }))
      : [];

    const payload = {
      name,
      code,
      status,
      provider,
      bookingMode,
      coverageType,
      outsideDistrict: req.body.outsideDistrict !== false,
      localArea: req.body.localArea === true || coverageType === "local_area" || coverageType === "both",
      instantDelivery: req.body.instantDelivery === true,
      trackingUrlPattern: String(req.body.trackingUrlPattern || "").trim(),
      contactName: String(req.body.contactName || "").trim(),
      phone: String(req.body.phone || "").trim(),
      email: String(req.body.email || "").trim(),
      serviceZones: normalizeStringArray(req.body.serviceZones),
      codSupported: req.body.codSupported !== false,
      baseDeliveryCost: Number(req.body.baseDeliveryCost || 0),
      codCollectionFee: Number(req.body.codCollectionFee || 0),
      defaultSlaHours: Number(req.body.defaultSlaHours || 72),
      slaByZone,
      notes: String(req.body.notes || "").trim(),
      updatedAt: now,
    };
    payload.credentialStatus = attachCourierCredentialStatus(payload, process.env).credentialStatus;

    if (courierId) {
      const result = await db.collection("courier_partners").updateOne(idFilter(courierId), { $set: payload });
      if (result.matchedCount === 0) return res.status(404).json({ success: false, error: "Courier partner not found" });
      await appendLogisticsAudit(req, {
        action: "logistics.courier.updated",
        target: { type: "courier_partner", id: courierId },
        changes: payload,
      });
      const updated = await db.collection("courier_partners").findOne(idFilter(courierId));
      return res.json({ success: true, data: attachCourierCredentialStatus(serializeDoc(updated), process.env) });
    }

    const doc = { ...payload, createdAt: now };
    const result = await db.collection("courier_partners").insertOne(doc);
    const saved = { ...doc, _id: result.insertedId };
    await appendLogisticsAudit(req, {
      action: "logistics.courier.created",
      target: { type: "courier_partner", id: normalizeId(result.insertedId) },
      changes: payload,
    });
    return res.status(201).json({ success: true, data: attachCourierCredentialStatus(serializeDoc(saved), process.env) });
  } catch (error) {
    console.error("Error saving courier partner:", error);
    res.status(500).json({ success: false, error: "Failed to save courier partner" });
  }
};

exports.getDispatchManifest = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [zones, couriers, orders, assignments] = await Promise.all([
      getSeededZones(db),
      collectionToArray(db, "courier_partners", {}, { name: 1 }),
      collectionToArray(db, "orders", {}, { updatedAt: -1 }),
      collectionToArray(db, "dispatch_assignments", {}, { pickupDate: 1 }),
    ]);

    res.json({
      success: true,
      data: buildDispatchManifest({
        orders,
        zones,
        couriers,
        assignments,
        date: req.query.date,
      }),
    });
  } catch (error) {
    console.error("Error loading dispatch manifest:", error);
    res.status(500).json({ success: false, error: "Failed to load dispatch manifest" });
  }
};

exports.downloadDispatchManifestCsv = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [zones, couriers, orders, assignments] = await Promise.all([
      getSeededZones(db),
      collectionToArray(db, "courier_partners", {}, { name: 1 }),
      collectionToArray(db, "orders", {}, { updatedAt: -1 }),
      collectionToArray(db, "dispatch_assignments", {}, { pickupDate: 1 }),
    ]);
    const manifest = buildDispatchManifest({ orders, zones, couriers, assignments, date: req.query.date });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="dispatch-manifest-${req.query.date || "all"}.csv"`);
    res.send(manifestToCsv(manifest));
  } catch (error) {
    console.error("Error exporting dispatch manifest:", error);
    res.status(500).json({ success: false, error: "Failed to export dispatch manifest" });
  }
};

exports.listPickupStaff = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    const staff = await collectionToArray(req.app.locals.db, "pickup_staff", query, { name: 1 });
    res.json({ success: true, data: staff.map(serializeDoc) });
  } catch (error) {
    console.error("Error loading pickup staff:", error);
    res.status(500).json({ success: false, error: "Failed to load pickup staff" });
  }
};

exports.upsertPickupStaff = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    const staffId = req.params.staffId || req.body.staffId;
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (!name) return res.status(400).json({ success: false, error: "Pickup staff name is required" });
    if (!phone) return res.status(400).json({ success: false, error: "Pickup staff phone is required" });

    const payload = {
      name,
      phone,
      status: STAFF_STATUSES.includes(req.body.status) ? req.body.status : "active",
      routeName: String(req.body.routeName || "").trim(),
      assignedZones: normalizeStringArray(req.body.assignedZones),
      assignedVendorIds: normalizeStringArray(req.body.assignedVendorIds),
      vehicleType: String(req.body.vehicleType || "").trim(),
      capacityOrders: Number(req.body.capacityOrders || 0),
      shiftStart: String(req.body.shiftStart || "").trim(),
      shiftEnd: String(req.body.shiftEnd || "").trim(),
      notes: String(req.body.notes || "").trim(),
      updatedAt: now,
    };

    if (staffId) {
      const result = await db.collection("pickup_staff").updateOne(idFilter(staffId), { $set: payload });
      if (result.matchedCount === 0) return res.status(404).json({ success: false, error: "Pickup staff not found" });
      await appendLogisticsAudit(req, {
        action: "logistics.pickup_staff.updated",
        target: { type: "pickup_staff", id: staffId },
        changes: payload,
      });
      const updated = await db.collection("pickup_staff").findOne(idFilter(staffId));
      return res.json({ success: true, data: serializeDoc(updated) });
    }

    const doc = { ...payload, createdAt: now };
    const result = await db.collection("pickup_staff").insertOne(doc);
    const saved = { ...doc, _id: result.insertedId };
    await appendLogisticsAudit(req, {
      action: "logistics.pickup_staff.created",
      target: { type: "pickup_staff", id: normalizeId(result.insertedId) },
      changes: payload,
    });
    return res.status(201).json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error saving pickup staff:", error);
    res.status(500).json({ success: false, error: "Failed to save pickup staff" });
  }
};

exports.listDeliveryFeeRules = async (req, res) => {
  try {
    const rules = await collectionToArray(req.app.locals.db, "delivery_fee_rules", {}, { priority: 1, createdAt: -1 });
    res.json({ success: true, data: rules.map(serializeDoc) });
  } catch (error) {
    console.error("Error loading delivery fee rules:", error);
    res.status(500).json({ success: false, error: "Failed to load delivery fee rules" });
  }
};

exports.upsertDeliveryFeeRule = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    const ruleId = req.params.ruleId || req.body.ruleId;
    const name = String(req.body.name || "").trim();
    const ruleType = req.body.ruleType || "zone_rate";

    if (!name) return res.status(400).json({ success: false, error: "Rule name is required" });
    if (!FEE_RULE_TYPES.includes(ruleType)) return res.status(400).json({ success: false, error: "Invalid delivery fee rule type" });

    const payload = {
      name,
      ruleType,
      status: req.body.status || "active",
      priority: Number(req.body.priority || 100),
      zoneCode: String(req.body.zoneCode || "").trim(),
      minOrderAmount: Number(req.body.minOrderAmount || 0),
      maxOrderAmount: Number(req.body.maxOrderAmount || 0),
      minWeightKg: Number(req.body.minWeightKg || 0),
      maxWeightKg: Number(req.body.maxWeightKg || 0),
      baseFee: Number(req.body.baseFee || 0),
      feePerKg: Number(req.body.feePerKg || 0),
      codFee: Number(req.body.codFee || 0),
      redeliveryFee: Number(req.body.redeliveryFee || 0),
      freeShippingThreshold: Number(req.body.freeShippingThreshold || 0),
      vendorTier: String(req.body.vendorTier || "").trim(),
      paymentMethods: normalizeStringArray(req.body.paymentMethods),
      notes: String(req.body.notes || "").trim(),
      updatedAt: now,
    };

    if (ruleId) {
      const result = await db.collection("delivery_fee_rules").updateOne(idFilter(ruleId), { $set: payload });
      if (result.matchedCount === 0) return res.status(404).json({ success: false, error: "Delivery fee rule not found" });
      await appendLogisticsAudit(req, {
        action: "logistics.fee_rule.updated",
        target: { type: "delivery_fee_rule", id: ruleId },
        changes: payload,
      });
      const updated = await db.collection("delivery_fee_rules").findOne(idFilter(ruleId));
      return res.json({ success: true, data: serializeDoc(updated) });
    }

    const doc = { ...payload, createdAt: now };
    const result = await db.collection("delivery_fee_rules").insertOne(doc);
    const saved = { ...doc, _id: result.insertedId };
    await appendLogisticsAudit(req, {
      action: "logistics.fee_rule.created",
      target: { type: "delivery_fee_rule", id: normalizeId(result.insertedId) },
      changes: payload,
    });
    return res.status(201).json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error saving delivery fee rule:", error);
    res.status(500).json({ success: false, error: "Failed to save delivery fee rule" });
  }
};

exports.getCodFloatTracker = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [orders, assignments, remittances] = await Promise.all([
      collectionToArray(db, "orders", {}, { createdAt: -1 }),
      collectionToArray(db, "dispatch_assignments", {}, { createdAt: -1 }),
      collectionToArray(db, "cod_remittances", {}, { remittedAt: -1 }),
    ]);
    res.json({ success: true, data: buildCodFloatTracker({ orders, assignments, remittances }) });
  } catch (error) {
    console.error("Error loading COD float tracker:", error);
    res.status(500).json({ success: false, error: "Failed to load COD float tracker" });
  }
};

exports.recordCodRemittance = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const courierName = String(req.body.courierName || "").trim();
    const remittedAmount = Number(req.body.remittedAmount || 0);
    const selectedOrderIds = Array.isArray(req.body.orderIds)
      ? [...new Set(req.body.orderIds.map(normalizeId).filter(Boolean))]
      : [];

    if (!courierName) return res.status(400).json({ success: false, error: "Courier name is required" });
    if (remittedAmount <= 0) return res.status(400).json({ success: false, error: "Remitted amount must be greater than zero" });

    const now = new Date();
    const remittedAt = asDate(req.body.remittedAt) || now;
    const doc = {
      courierName,
      collectedAmount: Number(req.body.collectedAmount || remittedAmount),
      remittedAmount,
      forwardedToVendorAmount: Number(req.body.forwardedToVendorAmount || 0),
      discrepancyAmount: roundMoney(Number(req.body.collectedAmount || remittedAmount) - remittedAmount),
      orderIds: selectedOrderIds,
      reference: String(req.body.reference || "").trim(),
      notes: String(req.body.notes || "").trim(),
      remittedAt,
      recordedBy: getActor(req),
      createdAt: now,
    };
    const result = await db.collection("cod_remittances").insertOne(doc);
    const saved = { ...doc, _id: result.insertedId };

    let reconciledOrders = [];
    if (selectedOrderIds.length > 0) {
      const objectIds = selectedOrderIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
      const orderQuery =
        objectIds.length > 0
          ? { $or: [{ _id: { $in: objectIds } }, { _id: { $in: selectedOrderIds } }] }
          : { _id: { $in: selectedOrderIds } };

      reconciledOrders = await collectionToArray(db, "orders", orderQuery);
      const reconciliationPatch = {
        codCollectionStatus: doc.discrepancyAmount > 0 ? "discrepancy" : "remitted",
        codRemittanceStatus: "remitted",
        codRemitted: true,
        codRemittedAt: remittedAt,
        codRemittedBy: getActor(req),
        codRemittanceReference: doc.reference,
        codDiscrepancyAmount: doc.discrepancyAmount,
        paymentStatus: "paid",
        updatedAt: now,
      };

      await db.collection("dispatch_assignments").updateMany(
        { orderId: { $in: selectedOrderIds } },
        {
          $set: {
            codCollectionStatus: doc.discrepancyAmount > 0 ? "discrepancy" : "remitted",
            codRemittanceStatus: "remitted",
            codRemittedAt: remittedAt,
            codRemittanceReference: doc.reference,
            updatedAt: now,
          },
        },
      );

      await db.collection("orders").updateMany(orderQuery, { $set: reconciliationPatch });
      await db.collection("vendorOrders").updateMany(
        { parentOrderId: { $in: selectedOrderIds } },
        {
          $set: {
            paymentStatus: "paid",
            codCollectionStatus: reconciliationPatch.codCollectionStatus,
            codRemittanceStatus: "remitted",
            codRemittedAt: remittedAt,
            updatedAt: now,
          },
        },
      );

      await Promise.all(
        reconciledOrders.map(async (order) => {
          const orderId = normalizeId(order._id);
          await db.collection("payments").updateOne(
            { orderId },
            {
              $set: {
                userId: order.userId || null,
                orderId,
                amount: orderAmount(order),
                currency: "bdt",
                paymentMethod: "cod",
                transactionId: doc.reference || `COD-${orderId.slice(-8).toUpperCase()}`,
                status: "completed",
                codReconciliation: {
                  remittanceId: normalizeId(result.insertedId),
                  courierName,
                  remittedAmount,
                  collectedAmount: doc.collectedAmount,
                  discrepancyAmount: doc.discrepancyAmount,
                  remittedAt,
                  reference: doc.reference,
                },
                completedAt: remittedAt,
                updatedAt: now,
              },
              $setOnInsert: { createdAt: now },
            },
            { upsert: true },
          );

          await appendOrderEvent({
            app: req.app,
            orderId,
            status: "cod_remitted",
            label: "COD remitted to platform",
            actorId: getActor(req).userId,
            actorRole: "admin",
            courierName,
            note: doc.reference ? `Reference: ${doc.reference}` : "COD cash reconciled",
            metadata: {
              remittanceId: normalizeId(result.insertedId),
              remittedAmount,
              discrepancyAmount: doc.discrepancyAmount,
            },
          });
        }),
      );
    }

    await appendLogisticsAudit(req, {
      action: "logistics.cod_remittance.recorded",
      target: { type: "cod_remittance", id: normalizeId(result.insertedId) },
      changes: doc,
    });

    res.status(201).json({
      success: true,
      data: {
        ...serializeDoc(saved),
        reconciledOrderCount: reconciledOrders.length,
        reconciledAmount: roundMoney(reconciledOrders.reduce((sum, order) => sum + orderAmount(order), 0)),
      },
    });
  } catch (error) {
    console.error("Error recording COD remittance:", error);
    res.status(500).json({ success: false, error: "Failed to record COD remittance" });
  }
};

exports.listFailedDeliveries = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [orders, failureRecords, assignments] = await Promise.all([
      collectionToArray(db, "orders", {}, { updatedAt: -1 }),
      collectionToArray(db, "delivery_failures", {}, { updatedAt: -1 }),
      collectionToArray(db, "dispatch_assignments", {}, { updatedAt: -1 }),
    ]);
    let rows = buildFailedDeliveryRows({ orders, failureRecords, assignments });
    if (req.query.status && req.query.status !== "all") {
      rows = rows.filter((row) => row.status === req.query.status);
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error loading failed deliveries:", error);
    res.status(500).json({ success: false, error: "Failed to load failed deliveries" });
  }
};

exports.scheduleFailedDeliveryReattempt = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const orderId = req.params.orderId;
    const nextAttemptAt = asDate(req.body.nextAttemptAt);
    if (!nextAttemptAt) return res.status(400).json({ success: false, error: "Next attempt date is required" });

    const now = new Date();
    const payload = {
      orderId: normalizeId(orderId),
      status: "reattempt_scheduled",
      courierName: String(req.body.courierName || "").trim(),
      failureReason: String(req.body.failureReason || req.body.reason || "").trim(),
      nextAttemptAt,
      redeliveryFee: Number(req.body.redeliveryFee || 0),
      note: String(req.body.note || "").trim(),
      updatedAt: now,
    };

    const existing = await db.collection("delivery_failures").findOne({ orderId: normalizeId(orderId) });
    const attempt = {
      type: "reattempt_scheduled",
      scheduledAt: nextAttemptAt,
      fee: payload.redeliveryFee,
      note: payload.note,
      createdAt: now,
      actor: getActor(req),
    };

    if (existing) {
      await db.collection("delivery_failures").updateOne(
        { orderId: normalizeId(orderId) },
        {
          $set: {
            ...payload,
            attemptCount: Number(existing.attemptCount || 1) + 1,
            attempts: [...(existing.attempts || []), attempt],
          },
        },
      );
    } else {
      await db.collection("delivery_failures").insertOne({
        ...payload,
        attemptCount: 1,
        attempts: [attempt],
        createdAt: now,
      });
    }

    await db.collection("orders").updateOne(
      idFilter(orderId),
      {
        $set: {
          deliveryStatus: "reattempt_scheduled",
          nextAttemptAt,
          redeliveryFee: payload.redeliveryFee,
          updatedAt: now,
        },
      },
    );

    await appendLogisticsAudit(req, {
      action: "logistics.failed_delivery.reattempt_scheduled",
      target: { type: "order", id: normalizeId(orderId) },
      changes: payload,
    });

    const saved = await db.collection("delivery_failures").findOne({ orderId: normalizeId(orderId) });
    res.json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error scheduling delivery reattempt:", error);
    res.status(500).json({ success: false, error: "Failed to schedule delivery reattempt" });
  }
};

exports.returnFailedDeliveryToSeller = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const orderId = req.params.orderId;
    const now = new Date();
    const payload = {
      orderId: normalizeId(orderId),
      status: "return_to_seller",
      returnReason: String(req.body.returnReason || req.body.reason || "").trim(),
      courierName: String(req.body.courierName || "").trim(),
      returnFee: Number(req.body.returnFee || 0),
      note: String(req.body.note || "").trim(),
      returnedToSellerAt: asDate(req.body.returnedToSellerAt) || now,
      updatedAt: now,
    };

    await db.collection("delivery_failures").updateOne(
      { orderId: normalizeId(orderId) },
      {
        $set: payload,
        $setOnInsert: { createdAt: now, attemptCount: 1 },
      },
      { upsert: true },
    );
    await db.collection("orders").updateOne(
      idFilter(orderId),
      {
        $set: {
          deliveryStatus: "return_to_seller",
          returnToSellerAt: payload.returnedToSellerAt,
          returnFee: payload.returnFee,
          updatedAt: now,
        },
      },
    );

    await appendLogisticsAudit(req, {
      action: "logistics.failed_delivery.return_to_seller",
      target: { type: "order", id: normalizeId(orderId) },
      changes: payload,
    });

    const saved = await db.collection("delivery_failures").findOne({ orderId: normalizeId(orderId) });
    res.json({ success: true, data: serializeDoc(saved) });
  } catch (error) {
    console.error("Error returning failed delivery to seller:", error);
    res.status(500).json({ success: false, error: "Failed to return delivery to seller" });
  }
};

exports.getLogisticsAuditLog = async (req, res) => {
  try {
    const logs = await collectionToArray(req.app.locals.db, "audit_logs", { module: "logistics" }, { createdAt: -1 });
    res.json({ success: true, data: logs.slice(0, 100).map(serializeDoc) });
  } catch (error) {
    console.error("Error loading logistics audit log:", error);
    res.status(500).json({ success: false, error: "Failed to load logistics audit log" });
  }
};

exports._logisticsTestUtils = {
  buildCodFloatTracker,
  buildDispatchManifest,
  buildFailedDeliveryRows,
  buildLogisticsOverview,
  getZoneForOrder,
  isReadyForDispatch,
  manifestToCsv,
};
