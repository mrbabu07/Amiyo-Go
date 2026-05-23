const { ObjectId } = require("mongodb");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const { isStaffRole } = require("../config/permissions");
const {
  bookShipment,
  normalizeProvider,
  summarizeBookingForStorage,
} = require("../services/courierProviderService");
const {
  COD_TRANSITIONS,
  FORWARD_TRANSITIONS,
  REVERSE_TRANSITIONS,
  stateLabel,
} = require("../utils/logisticsStateMachine");
const {
  addressMatchesLogisticsScope,
  filterShipmentsForLogisticsScope,
  getLogisticsScopeFromRequest,
  getScopeFromUser,
  shipmentMatchesLogisticsScope,
} = require("../utils/logisticsScope");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);
const idValues = (value) => {
  const normalized = normalizeId(value);
  const objectId = toObjectId(value);
  return objectId ? [normalized, objectId] : [normalized];
};
const idFilter = (value) => {
  const values = idValues(value);
  return { _id: { $in: values } };
};

const getActor = (req, fallbackRole = "system") => ({
  id: normalizeId(req.user?._id || req.user?.uid || req.user?.email || fallbackRole),
  role: req.user?.role || fallbackRole,
});

const getShipmentModel = (req) => req.app.locals.models.Shipment;
const isVendorActor = (req) => ["vendor", "vendor_staff"].includes(req.user?.role);

const syncOrderAfterDeliveryAttempt = async (req, shipment = {}, attempt = {}) => {
  const db = req.app.locals.db;
  if (!db?.collection || !shipment?.orderId) return;

  const now = new Date();
  const orderId = normalizeId(shipment.orderId);
  const vendorId = normalizeId(shipment.vendorId);
  const actor = getActor(req, "admin");
  const orderQuery = idFilter(orderId);
  const vendorOrderQuery = {
    parentOrderId: { $in: idValues(orderId) },
    ...(vendorId ? { vendorId: { $in: idValues(vendorId) } } : {}),
  };
  const assignmentQuery = { orderId: { $in: idValues(orderId) } };
  const codCollected = Number(shipment.codAmount || 0) > 0 && attempt.codCollected !== false;

  if (shipment.shipmentState === "delivered") {
    const orderPatch = {
      status: "delivered",
      deliveryStatus: "delivered",
      deliveredAt: shipment.deliveredAt || now,
      updatedAt: now,
      ...(codCollected
        ? {
            codCollectionStatus: "collected",
            codCollected: true,
            codCollectedAt: shipment.codCollectedAt || now,
            codCollectedBy: actor,
          }
        : {}),
    };
    await Promise.all([
      db.collection("orders").updateOne(orderQuery, { $set: orderPatch }),
      db.collection("vendorOrders").updateMany(vendorOrderQuery, {
        $set: {
          status: "delivered",
          deliveryStatus: "delivered",
          deliveredAt: orderPatch.deliveredAt,
          updatedAt: now,
          ...(codCollected ? { codCollectionStatus: "collected", codCollectedAt: orderPatch.codCollectedAt } : {}),
        },
      }),
      db.collection("dispatch_assignments").updateMany(assignmentQuery, {
        $set: {
          deliveryStatus: "delivered",
          deliveredAt: orderPatch.deliveredAt,
          updatedAt: now,
          ...(codCollected ? { codCollectionStatus: "collected", codCollectedAt: orderPatch.codCollectedAt } : {}),
        },
      }),
    ]);
    return;
  }

  if (["delivery_failed", "return_to_origin"].includes(shipment.shipmentState)) {
    const isReturn = shipment.shipmentState === "return_to_origin" || attempt.outcome === "rto";
    const status = isReturn ? "return_to_seller" : "failed_delivery";
    const failurePatch = {
      status,
      deliveryStatus: status,
      failureReason: attempt.reason || attempt.notes || "",
      lastDeliveryFailedAt: shipment.lastDeliveryFailedAt || now,
      updatedAt: now,
    };
    await Promise.all([
      db.collection("orders").updateOne(orderQuery, { $set: failurePatch }),
      db.collection("vendorOrders").updateMany(vendorOrderQuery, { $set: failurePatch }),
      db.collection("dispatch_assignments").updateMany(assignmentQuery, {
        $set: {
          deliveryStatus: status,
          failureReason: failurePatch.failureReason,
          updatedAt: now,
        },
      }),
      db.collection("delivery_failures").updateOne(
        { orderId },
        {
          $set: {
            orderId,
            shipmentId: normalizeId(shipment._id),
            vendorId,
            status,
            courierName: shipment.courierName || "",
            failureReason: failurePatch.failureReason,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      ),
    ]);
  }
};

const getDeliveryZones = async (req) => {
  const db = req.app.locals.db;
  if (!db?.collection) return [];
  return db.collection("delivery_zones").find({}).toArray();
};

const getLogisticsNotificationUsers = async (req) => {
  const collection = req.app.locals.models?.User?.collection || req.app.locals.db?.collection?.("users");
  if (!collection?.find) return [];
  const users = await collection.find({ role: "logistics_manager" }).toArray();
  return users.filter((user) => !["inactive", "disabled", "banned", "deleted"].includes(String(user.status || "active")));
};

const getVendorForShipment = async (req, shipment = {}) => {
  const db = req.app.locals.db;
  if (!db?.collection || !shipment.vendorId) return null;
  return db.collection("vendors").findOne(idFilter(shipment.vendorId));
};

const createInAppNotification = async (req, payload = {}) => {
  const Notification = req.app.locals.models?.Notification;
  if (Notification?.create) return Notification.create(payload);
  const db = req.app.locals.db;
  if (!db?.collection) return null;
  const now = new Date();
  return db.collection("notifications").insertOne({
    ...payload,
    isRead: false,
    createdAt: now,
    updatedAt: now,
  });
};

const notifyScopedLogisticsPickupReady = async (req, shipment = {}) => {
  try {
    const users = await getLogisticsNotificationUsers(req);
    if (users.length === 0) return [];

    const [zones, vendor] = await Promise.all([
      getDeliveryZones(req),
      getVendorForShipment(req, shipment),
    ]);
    const vendorName = vendor?.shopName || vendor?.businessName || vendor?.name || "Vendor";
    const orderLabel = normalizeId(shipment.orderId).slice(-8).toUpperCase();
    const link = "/admin/logistics?tab=work";
    const seenRecipients = new Set();

    const recipients = users.filter((user) => {
      const recipientId = normalizeId(user.firebaseUid || user.uid || user._id || user.email);
      if (!recipientId || seenRecipients.has(recipientId)) return false;
      const scope = { ...getScopeFromUser(user), scoped: true };
      const matches =
        shipmentMatchesLogisticsScope(shipment, zones, scope) ||
        addressMatchesLogisticsScope(shipment.pickupAddress, scope);
      if (matches) seenRecipients.add(recipientId);
      return matches;
    });

    return Promise.all(
      recipients.map((user) => {
        const recipientId = normalizeId(user.firebaseUid || user.uid || user._id || user.email);
        return createInAppNotification(req, {
          userId: recipientId,
          type: "delivery",
          title: "Vendor pickup ready",
          message: `${vendorName} marked order #${orderLabel} ready for pickup.`,
          link,
          data: {
            url: link,
            event: "shipment.pickup_ready",
            shipmentId: normalizeId(shipment._id),
            orderId: normalizeId(shipment.orderId),
            vendorId: normalizeId(shipment.vendorId),
          },
          metadata: {
            shipmentId: normalizeId(shipment._id),
            orderId: normalizeId(shipment.orderId),
            vendorId: normalizeId(shipment.vendorId),
            vendorName,
          },
        });
      }),
    );
  } catch (error) {
    console.error("Failed to notify logistics pickup-ready users:", error);
    return [];
  }
};

const assertShipmentInLogisticsScope = async (req, shipment) => {
  const scope = getLogisticsScopeFromRequest(req);
  if (!scope?.scoped) return;
  const zones = await getDeliveryZones(req);
  if (shipmentMatchesLogisticsScope(shipment, zones, scope)) return;
  const error = new Error("Shipment is outside your assigned logistics area");
  error.statusCode = 403;
  throw error;
};

const assertShipmentAccess = async (req, shipment) => {
  if (!shipment) return;
  if (isStaffRole(req.user?.role)) {
    await assertShipmentInLogisticsScope(req, shipment);
    return;
  }

  if (isVendorActor(req) && normalizeId(shipment.vendorId) === normalizeId(req.user?.vendorId)) return;

  const userIds = [req.user?.uid, req.user?._id].map(normalizeId).filter(Boolean);
  if (userIds.includes(normalizeId(shipment.userId))) return;

  const error = new Error("Shipment access denied");
  error.statusCode = 403;
  throw error;
};

const assertShipmentMutationAccess = async (req, shipment) => {
  if (isStaffRole(req.user?.role)) {
    await assertShipmentInLogisticsScope(req, shipment);
    return;
  }
  if (isVendorActor(req) && normalizeId(shipment.vendorId) === normalizeId(req.user?.vendorId)) return;
  const error = new Error("Only vendor or admin users can update this shipment");
  error.statusCode = 403;
  throw error;
};

const assertVendorShipmentAccess = (req, shipment) => {
  if (!shipment || !isVendorActor(req)) return;
  if (normalizeId(shipment.vendorId) !== normalizeId(req.user?.vendorId)) {
    const error = new Error("Shipment does not belong to this vendor");
    error.statusCode = 403;
    throw error;
  }
};

const findAccessibleShipment = async (req, shipmentId) => {
  const shipment = await getShipmentModel(req).findById(shipmentId);
  if (!shipment) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }
  await assertShipmentAccess(req, shipment);
  return shipment;
};

const vendorArrayFilter = (vendorId) => {
  const values = [normalizeId(vendorId)];
  const objectId = toObjectId(vendorId);
  if (objectId) values.push(objectId);
  return { "elem.vendorId": { $in: values } };
};

const orderFilter = (orderId) => {
  const objectId = toObjectId(orderId);
  return objectId ? { _id: objectId } : { _id: orderId };
};

const findCourierPartner = async (req, data = {}) => {
  const db = req.app.locals.db;
  if (!db?.collection) return null;

  const courierId = data.courierId || data.courierPartnerId;
  if (courierId) {
    const objectId = toObjectId(courierId);
    const courier = await db.collection("courier_partners").findOne(
      objectId ? { $or: [{ _id: objectId }, { _id: normalizeId(courierId) }] } : { _id: normalizeId(courierId) },
    );
    if (courier) return courier;
  }

  const code = String(data.courierCode || data.code || "").trim().toLowerCase();
  if (code) {
    const courier = await db.collection("courier_partners").findOne({ code });
    if (courier) return courier;
  }

  const name = String(data.courierName || data.name || "").trim();
  if (name) {
    const courier = await db.collection("courier_partners").findOne({ name });
    if (courier) return courier;
  }

  return null;
};

const buildCourierAssignmentPayload = ({ data = {}, courier = null, booking = null }) => {
  const provider = normalizeProvider(data.provider || data.courierProvider || courier?.provider || courier?.code);
  const trackingNumber = booking?.trackingNumber || data.trackingNumber || data.tracking_number || null;
  const code = data.courierCode || data.courier_code || courier?.code || provider || "manual";

  return {
    ...data,
    courierId: data.courierId || data.courierPartnerId || courier?._id || null,
    courierCode: code,
    courierName: data.courierName || data.name || courier?.name || provider || "Manual courier",
    courierProvider: provider,
    courierBookingStatus: booking?.status || (provider === "manual" || provider === "local" ? "manual_dispatch" : "manual_required"),
    courierConsignmentId: booking?.consignmentId || data.courierConsignmentId || null,
    courierTrackingUrl: booking?.trackingUrl || data.courierTrackingUrl || "",
    courierBooking: summarizeBookingForStorage(booking),
    trackingNumber,
  };
};

const findOrder = async (req, orderId) => {
  const Order = req.app.locals.models.Order;
  if (Order?.findById) return Order.findById(orderId);
  return req.app.locals.db.collection("orders").findOne(orderFilter(orderId));
};

const updateOrderVendorItems = async (req, orderId, vendorId, set = {}) => {
  const db = req.app.locals.db;
  if (!db?.collection) return;
  await db.collection("orders").updateOne(
    orderFilter(orderId),
    { $set: { ...set, updatedAt: new Date() } },
    { arrayFilters: [vendorArrayFilter(vendorId)] },
  );
};

const requireVendorShipmentContext = async (req, orderId) => {
  const vendorId = normalizeId(req.user?.vendorId || req.vendor?._id);
  if (!vendorId) {
    const error = new Error("Vendor context is required");
    error.statusCode = 403;
    throw error;
  }

  const order = await findOrder(req, orderId);
  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const hasVendorItems = (order.products || []).some((item) => normalizeId(item.vendorId) === vendorId);
  if (!hasVendorItems) {
    const error = new Error("Order does not contain this vendor's items");
    error.statusCode = 403;
    throw error;
  }

  return { order, vendorId };
};

const ensureVendorShipment = async (req, orderId, payload = {}) => {
  const Shipment = getShipmentModel(req);
  const { order, vendorId } = await requireVendorShipmentContext(req, orderId);
  return Shipment.createFromOrder(order, vendorId, {
    ...payload,
    vendorAddress: req.vendor?.pickupAddress || req.vendor?.warehouseAddress || req.vendor?.address || {},
    actorId: getActor(req, "vendor").id,
    actorRole: "vendor",
  });
};

const jsonError = (res, error, fallback = "Request failed") =>
  res.status(error.statusCode || 400).json({ success: false, error: error.message || fallback });

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const setPdfHeaders = (res, filename) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
};

const barcodeBuffer = async (text) => bwipjs.toBuffer({
  bcid: "code128",
  text,
  scale: 3,
  height: 18,
  includetext: true,
  textxalign: "center",
});

const drawShipmentAddress = (doc, title, addressText) => {
  doc.fontSize(10).fillColor("#111").text(title, { underline: true });
  doc.fontSize(9).fillColor("#444").text(addressText || "Address not available", { width: 230 });
  doc.fillColor("#111");
};

const streamLabelPdf = async (res, shipment) => {
  setPdfHeaders(res, `shipping-label-${shipment.trackingNumber || shipment._id}.pdf`);
  const doc = new PDFDocument({ margin: 18, size: [360, 520] });
  doc.pipe(res);

  doc.fontSize(16).text("Amiyo-Go Shipping Label", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).text(`Tracking: ${shipment.trackingNumber || "-"}`, { align: "center" });
  doc.text(`Order: ${normalizeId(shipment.orderId).slice(-10).toUpperCase()}`, { align: "center" });
  doc.moveDown(0.5);

  const barcode = await barcodeBuffer(shipment.trackingNumber || normalizeId(shipment._id));
  doc.image(barcode, 42, 92, { fit: [276, 90], align: "center" });
  doc.moveDown(6);

  drawShipmentAddress(doc, "Sender", shipment.pickupAddressText);
  doc.moveDown(0.8);
  drawShipmentAddress(doc, "Recipient", shipment.deliveryAddressText);
  doc.moveDown(0.8);
  doc.fontSize(10).text(`Courier: ${shipment.courierName || "Manual courier"}`);
  doc.text(`Items: ${shipment.itemCount || 0}`);
  doc.text(`COD Amount: BDT ${Number(shipment.codAmount || 0).toLocaleString("en-US")}`);
  doc.text(`Delivery ETA: ${formatDate(shipment.estimatedDeliveryDate) || "-"}`);
  doc.end();
};

const streamPackingSlipPdf = async (res, shipment) => {
  setPdfHeaders(res, `packing-slip-${shipment.orderId}-${shipment.vendorId}.pdf`);
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).text("Vendor Packing Slip", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Order: ${shipment.orderId}`);
  doc.text(`Shipment: ${shipment.trackingNumber || normalizeId(shipment._id)}`);
  doc.text(`Packed: ${formatDate(shipment.packedAt) || "-"}`);
  doc.moveDown();
  drawShipmentAddress(doc, "Ship To", shipment.deliveryAddressText);
  doc.moveDown();
  doc.fontSize(12).text("Items", { underline: true });
  (shipment.items || []).forEach((item, index) => {
    doc.fontSize(10).text(`${index + 1}. ${item.title} | SKU: ${item.sku || "-"} | Qty: ${item.quantity || 1}`);
  });
  doc.moveDown();
  doc.fontSize(9).text(`Packing notes: ${shipment.packingNotes || "-"}`);
  doc.end();
};

const streamWaybillPdf = async (res, manifest = {}) => {
  setPdfHeaders(res, `waybill-${manifest.manifestNumber || manifest._id}.pdf`);
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).text("Dispatch Waybill", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Manifest: ${manifest.manifestNumber || normalizeId(manifest._id)}`);
  doc.text(`Courier: ${manifest.courierName || "Platform courier"}`);
  doc.text(`Date: ${formatDate(manifest.date || manifest.createdAt)}`);
  doc.text(`Shipment count: ${(manifest.shipments || []).length}`);
  doc.moveDown();
  doc.fontSize(11).text("Shipments", { underline: true });
  (manifest.shipments || []).forEach((item, index) => {
    doc.fontSize(9).text(`${index + 1}. ${item.orderId} | ${item.trackingNumber || "-"} | COD BDT ${item.codAmount || 0}`);
  });
  doc.moveDown(2);
  doc.text("Vendor signature: __________________________");
  doc.moveDown();
  doc.text("Courier signature: _________________________");
  doc.end();
};

exports.getStateMachine = (req, res) => {
  res.json({
    success: true,
    data: {
      forward: FORWARD_TRANSITIONS,
      reverse: REVERSE_TRANSITIONS,
      cod: COD_TRANSITIONS,
      labels: Object.fromEntries(
        [...Object.keys(FORWARD_TRANSITIONS), ...Object.keys(REVERSE_TRANSITIONS), ...Object.keys(COD_TRANSITIONS)]
          .map((state) => [state, stateLabel(state)]),
      ),
    },
  });
};

exports.listVendorShipments = async (req, res) => {
  try {
    const shipments = await getShipmentModel(req).list({
      vendorId: req.user.vendorId || req.query.vendorId,
      orderId: req.query.orderId || undefined,
      shipmentState: req.query.state || req.query.shipmentState || "all",
      codState: req.query.codState || "all",
      reverseState: req.query.reverseState || "all",
      shipmentType: req.query.shipmentType || undefined,
    });
    const scopedShipments = filterShipmentsForLogisticsScope(
      shipments,
      await getDeliveryZones(req),
      getLogisticsScopeFromRequest(req),
    );
    res.json({ success: true, data: scopedShipments });
  } catch (error) {
    jsonError(res, error, "Failed to load shipments");
  }
};

exports.listVendorCourierOptions = async (req, res) => {
  try {
    const couriers = await req.app.locals.db.collection("courier_partners")
      .find({ status: { $ne: "inactive" } })
      .sort({ name: 1 })
      .toArray();

    res.json({
      success: true,
      data: couriers.map((courier) => ({
        _id: normalizeId(courier._id),
        name: courier.name,
        code: courier.code,
        provider: normalizeProvider(courier.provider || courier.code),
        bookingMode: courier.bookingMode || "manual",
        coverageType: courier.coverageType || "outside_district",
        outsideDistrict: courier.outsideDistrict !== false,
        localArea: courier.localArea === true,
        instantDelivery: courier.instantDelivery === true,
        codSupported: courier.codSupported !== false,
        defaultSlaHours: courier.defaultSlaHours || 72,
        serviceZones: courier.serviceZones || [],
      })),
    });
  } catch (error) {
    jsonError(res, error, "Failed to load courier options");
  }
};

exports.markOrderPacked = async (req, res) => {
  try {
    const shipment = await ensureVendorShipment(req, req.params.orderId, req.body);
    const updated = await getShipmentModel(req).markPacked(shipment._id, req.body, getActor(req, "vendor"));
    await updateOrderVendorItems(req, req.params.orderId, req.user.vendorId, {
      "products.$[elem].itemStatus": "packed",
      "products.$[elem].packedAt": new Date(),
      "products.$[elem].shipmentId": normalizeId(updated._id),
      "products.$[elem].trackingNumber": updated.trackingNumber,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to mark packed");
  }
};

exports.markPickupReady = async (req, res) => {
  try {
    const shipment = await ensureVendorShipment(req, req.params.orderId, req.body);
    const model = getShipmentModel(req);
    const packed = shipment.shipmentState === "packed" ? shipment : await model.markPacked(shipment._id, req.body, getActor(req, "vendor"));
    const updated = await model.transition(packed._id, "shipmentState", "pickup_ready", {
      actorRole: "vendor",
      actorId: getActor(req, "vendor").id,
      type: "shipment.pickup_ready",
      description: "Vendor marked shipment pickup ready",
      metadata: req.body,
    });
    await updateOrderVendorItems(req, req.params.orderId, req.user.vendorId, {
      "products.$[elem].itemStatus": "pickup_ready",
      "products.$[elem].pickupReadyAt": new Date(),
      "products.$[elem].shipmentId": normalizeId(updated._id),
    });
    await notifyScopedLogisticsPickupReady(req, updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to mark pickup ready");
  }
};

exports.generateLabel = async (req, res) => {
  try {
    const shipment = await findAccessibleShipment(req, req.params.id);
    await assertShipmentMutationAccess(req, shipment);
    const updated = await getShipmentModel(req).generateLabel(req.params.id, getActor(req));
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to generate label");
  }
};

exports.downloadLabel = async (req, res) => {
  try {
    const shipment = await findAccessibleShipment(req, req.params.id);
    await streamLabelPdf(res, shipment);
  } catch (error) {
    if (!res.headersSent) jsonError(res, error, "Failed to download label");
  }
};

exports.downloadPackingSlip = async (req, res) => {
  try {
    const shipment = await findAccessibleShipment(req, req.params.id);
    await streamPackingSlipPdf(res, shipment);
  } catch (error) {
    if (!res.headersSent) jsonError(res, error, "Failed to download packing slip");
  }
};

exports.createVendorManifest = async (req, res) => {
  try {
    const manifest = await getShipmentModel(req).createManifest({
      vendorId: req.user.vendorId,
      shipmentIds: req.body.shipmentIds || [],
      courierId: req.body.courierId || null,
      courierName: req.body.courierName || "",
      pickupDate: req.body.pickupDate || null,
      notes: req.body.notes || "",
    }, getActor(req, "vendor"));
    res.status(201).json({ success: true, data: manifest });
  } catch (error) {
    jsonError(res, error, "Failed to create manifest");
  }
};

exports.listVendorManifests = async (req, res) => {
  try {
    const manifests = await req.app.locals.models.Shipment.manifestsCollection
      .find({ vendorId: normalizeId(req.user.vendorId) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, data: manifests });
  } catch (error) {
    jsonError(res, error, "Failed to load manifests");
  }
};

exports.submitVendorManifest = async (req, res) => {
  try {
    const manifest = await getShipmentModel(req).submitManifest(req.params.id, getActor(req, "vendor"));
    res.json({ success: true, data: manifest });
  } catch (error) {
    jsonError(res, error, "Failed to submit manifest");
  }
};

exports.downloadWaybill = async (req, res) => {
  try {
    const manifest = await getShipmentModel(req).manifestsCollection.findOne({ _id: toObjectId(req.params.id) || req.params.id });
    if (!manifest) return res.status(404).json({ success: false, error: "Manifest not found" });
    await streamWaybillPdf(res, manifest);
  } catch (error) {
    if (!res.headersSent) jsonError(res, error, "Failed to download waybill");
  }
};

exports.confirmManifestPickup = async (req, res) => {
  try {
    const manifest = await getShipmentModel(req).confirmManifestPickup(req.params.id, getActor(req, "admin"));
    res.json({ success: true, data: manifest });
  } catch (error) {
    jsonError(res, error, "Failed to confirm pickup");
  }
};

exports.assignCourier = async (req, res) => {
  try {
    const Shipment = getShipmentModel(req);
    const currentShipment = await Shipment.findById(req.params.id);
    if (!currentShipment) {
      const error = new Error("Shipment not found");
      error.statusCode = 404;
      throw error;
    }
    await assertShipmentInLogisticsScope(req, currentShipment);

    const courier = await findCourierPartner(req, req.body);
    const provider = normalizeProvider(req.body.provider || req.body.courierProvider || courier?.provider || courier?.code);
    const requestedBookingMode = req.body.bookWithCourier === false
      ? "manual"
      : req.body.bookingMode || courier?.bookingMode || (provider === "manual" || provider === "local" ? "manual" : "live");
    const bookingMode = process.env.COURIER_API_MODE === "manual" ? "manual" : requestedBookingMode;

    let booking = null;
    if (bookingMode === "live") {
      booking = await bookShipment({
        shipment: currentShipment,
        courier: courier || req.body,
        payload: {
          ...req.body,
          provider,
        },
      });
    } else {
      booking = { attempted: false, status: provider === "local" ? "local_manual_dispatch" : "manual_dispatch", provider };
    }

    const assignment = buildCourierAssignmentPayload({ data: req.body, courier, booking });
    const shipment = await Shipment.assignCourier(req.params.id, assignment, getActor(req, "admin"));
    res.json({ success: true, data: shipment, courierBooking: summarizeBookingForStorage(booking) });
  } catch (error) {
    jsonError(res, error, "Failed to assign courier");
  }
};

exports.assignVendorCourier = async (req, res) => {
  try {
    const Shipment = getShipmentModel(req);
    const currentShipment = await Shipment.findById(req.params.id);
    if (!currentShipment) {
      const error = new Error("Shipment not found");
      error.statusCode = 404;
      throw error;
    }
    assertVendorShipmentAccess(req, currentShipment);

    const courier = await findCourierPartner(req, req.body);
    const provider = normalizeProvider(req.body.provider || req.body.courierProvider || courier?.provider || courier?.code);
    const requestedBookingMode = req.body.bookWithCourier === false
      ? "manual"
      : req.body.bookingMode || courier?.bookingMode || (provider === "manual" || provider === "local" ? "manual" : "live");
    const bookingMode = process.env.COURIER_API_MODE === "manual" ? "manual" : requestedBookingMode;

    let booking = null;
    if (bookingMode === "live") {
      booking = await bookShipment({
        shipment: currentShipment,
        courier: courier || req.body,
        payload: {
          ...req.body,
          provider,
        },
      });
    } else {
      booking = { attempted: false, status: provider === "local" ? "local_manual_dispatch" : "manual_dispatch", provider };
    }

    const assignment = buildCourierAssignmentPayload({ data: req.body, courier, booking });
    const shipment = await Shipment.assignCourier(req.params.id, assignment, getActor(req, "vendor"));
    await updateOrderVendorItems(req, currentShipment.orderId, req.user.vendorId, {
      "products.$[elem].shipmentId": normalizeId(shipment._id),
      "products.$[elem].trackingNumber": shipment.trackingNumber,
      "products.$[elem].courierName": shipment.courierName,
    });
    res.json({ success: true, data: shipment, courierBooking: summarizeBookingForStorage(booking) });
  } catch (error) {
    jsonError(res, error, "Failed to assign courier");
  }
};

exports.recordDeliveryAttempt = async (req, res) => {
  try {
    await assertShipmentInLogisticsScope(req, await findAccessibleShipment(req, req.params.id));
    const shipment = await getShipmentModel(req).recordDeliveryAttempt(req.params.id, req.body, getActor(req, "admin"));
    await syncOrderAfterDeliveryAttempt(req, shipment, req.body);
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to record delivery attempt");
  }
};

exports.markRto = async (req, res) => {
  try {
    await assertShipmentInLogisticsScope(req, await findAccessibleShipment(req, req.params.id));
    const shipment = await getShipmentModel(req).markRto(req.params.id, req.body, getActor(req, "admin"));
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to mark RTO");
  }
};

exports.confirmRtoReceived = async (req, res) => {
  try {
    const shipmentToReceive = await findAccessibleShipment(req, req.params.id);
    assertVendorShipmentAccess(req, shipmentToReceive);
    const shipment = await getShipmentModel(req).confirmRtoReceived(req.params.id, req.body, getActor(req, "vendor"));
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to confirm RTO received");
  }
};

exports.updateCodState = (targetState) => async (req, res) => {
  try {
    await assertShipmentInLogisticsScope(req, await findAccessibleShipment(req, req.params.id));
    const shipment = await getShipmentModel(req).updateCodState(req.params.id, targetState, req.body, getActor(req, "admin"));
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to update COD state");
  }
};

exports.getCustomerTracking = async (req, res) => {
  try {
    const order = await findOrder(req, req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    const ownsOrder = normalizeId(order.userId) === normalizeId(req.user?.uid) ||
      normalizeId(order.userId) === normalizeId(req.user?._id);
    if (!ownsOrder && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const shipments = await getShipmentModel(req).list({ orderId: req.params.orderId });
    res.json({
      success: true,
      data: {
        orderId: normalizeId(order._id || req.params.orderId),
        shipments,
        currentState: shipments[0]?.shipmentState || order.status || "created",
        timeline: shipments.flatMap((shipment) =>
          (shipment.events || []).map((event) => ({
            shipmentId: normalizeId(shipment._id),
            trackingNumber: shipment.trackingNumber,
            status: event.eventType,
            label: event.eventDescription,
            timestamp: event.timestamp,
            actor: event.actor,
          })),
        ).sort((left, right) => new Date(left.timestamp || 0) - new Date(right.timestamp || 0)),
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load tracking");
  }
};

exports.generateReturnLabel = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const returnDoc = await Return.findById(req.params.returnId);
    if (!returnDoc) return res.status(404).json({ success: false, error: "Return not found" });

    const shipment = await getShipmentModel(req).ensureReverseForReturn(returnDoc, {
      courierName: req.body.courierName || "Return courier",
      pickupAddress: req.body.pickupAddress || returnDoc.customerAddress || {},
      destinationAddress: req.body.destinationAddress || {},
    }, getActor(req, "admin"));
    const updated = await getShipmentModel(req).generateLabel(shipment._id, getActor(req, "admin"));
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to generate return label");
  }
};

exports.updateReverseState = (targetState) => async (req, res) => {
  try {
    const shipment = await getShipmentModel(req).updateReverseStateByReturn(
      req.params.returnId,
      targetState,
      req.body,
      getActor(req, req.user?.role || "admin"),
    );
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to update reverse logistics");
  }
};

exports.listReverseLogistics = async (req, res) => {
  try {
    const shipments = await getShipmentModel(req).list({
      vendorId: req.user.vendorId,
      shipmentType: "reverse",
      reverseState: req.query.state || req.query.reverseState || "all",
    });
    res.json({ success: true, data: shipments });
  } catch (error) {
    jsonError(res, error, "Failed to load reverse logistics");
  }
};

exports.getLogisticsDashboard = async (req, res) => {
  try {
    const shipments = filterShipmentsForLogisticsScope(
      await getShipmentModel(req).list({}),
      await getDeliveryZones(req),
      getLogisticsScopeFromRequest(req),
    );
    const countBy = (field, value) => shipments.filter((item) => item[field] === value).length;
    const codExposure = shipments
      .filter((item) => ["cod_pending", "cod_collected"].includes(item.codState))
      .reduce((sum, item) => sum + Number(item.codAmount || 0), 0);
    res.json({
      success: true,
      data: {
        fulfillment: {
          packed: countBy("shipmentState", "packed"),
          pickupReady: countBy("shipmentState", "pickup_ready"),
          inTransit: countBy("shipmentState", "in_transit"),
          outForDelivery: countBy("shipmentState", "out_for_delivery"),
          delivered: countBy("shipmentState", "delivered"),
          failed: countBy("shipmentState", "delivery_failed"),
          rto: countBy("shipmentState", "return_to_origin"),
        },
        cod: {
          pending: countBy("codState", "cod_pending"),
          collected: countBy("codState", "cod_collected"),
          remitted: countBy("codState", "cod_remitted"),
          failed: countBy("codState", "cod_failed"),
          disputed: countBy("codState", "cod_disputed"),
          exposure: codExposure,
        },
        returns: {
          inTransit: countBy("reverseState", "return_in_transit"),
          received: countBy("reverseState", "return_received"),
          inspected: countBy("reverseState", "inspected"),
          restocked: countBy("reverseState", "restocked"),
          disposed: countBy("reverseState", "disposed"),
        },
      },
    });
  } catch (error) {
    jsonError(res, error, "Failed to load logistics dashboard");
  }
};
