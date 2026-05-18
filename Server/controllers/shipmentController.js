const { ObjectId } = require("mongodb");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const { isStaffRole } = require("../config/permissions");
const {
  COD_TRANSITIONS,
  FORWARD_TRANSITIONS,
  REVERSE_TRANSITIONS,
  stateLabel,
} = require("../utils/logisticsStateMachine");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);

const getActor = (req, fallbackRole = "system") => ({
  id: normalizeId(req.user?._id || req.user?.uid || req.user?.email || fallbackRole),
  role: req.user?.role || fallbackRole,
});

const getShipmentModel = (req) => req.app.locals.models.Shipment;
const isVendorActor = (req) => ["vendor", "vendor_staff"].includes(req.user?.role);

const assertShipmentAccess = (req, shipment) => {
  if (!shipment || isStaffRole(req.user?.role)) return;

  if (isVendorActor(req) && normalizeId(shipment.vendorId) === normalizeId(req.user?.vendorId)) return;

  const userIds = [req.user?.uid, req.user?._id].map(normalizeId).filter(Boolean);
  if (userIds.includes(normalizeId(shipment.userId))) return;

  const error = new Error("Shipment access denied");
  error.statusCode = 403;
  throw error;
};

const assertShipmentMutationAccess = (req, shipment) => {
  if (isStaffRole(req.user?.role)) return;
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
  assertShipmentAccess(req, shipment);
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
      shipmentState: req.query.state || req.query.shipmentState || "all",
      codState: req.query.codState || "all",
      reverseState: req.query.reverseState || "all",
      shipmentType: req.query.shipmentType || undefined,
    });
    res.json({ success: true, data: shipments });
  } catch (error) {
    jsonError(res, error, "Failed to load shipments");
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
    res.json({ success: true, data: updated });
  } catch (error) {
    jsonError(res, error, "Failed to mark pickup ready");
  }
};

exports.generateLabel = async (req, res) => {
  try {
    const shipment = await findAccessibleShipment(req, req.params.id);
    assertShipmentMutationAccess(req, shipment);
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
    const shipment = await getShipmentModel(req).assignCourier(req.params.id, req.body, getActor(req, "admin"));
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to assign courier");
  }
};

exports.recordDeliveryAttempt = async (req, res) => {
  try {
    const shipment = await getShipmentModel(req).recordDeliveryAttempt(req.params.id, req.body, getActor(req, "admin"));
    res.json({ success: true, data: shipment });
  } catch (error) {
    jsonError(res, error, "Failed to record delivery attempt");
  }
};

exports.markRto = async (req, res) => {
  try {
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
    const shipments = await getShipmentModel(req).list({});
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
