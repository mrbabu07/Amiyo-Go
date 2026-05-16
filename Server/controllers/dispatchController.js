const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const { ObjectId } = require("mongodb");
const { appendOrderEvent } = require("../services/orderEventService");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const setPdfHeaders = (res, filename) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
};

const loadAssignmentContext = async (req, assignmentId) => {
  const DispatchAssignment = req.app.locals.models.DispatchAssignment;
  const Order = req.app.locals.models.Order;
  const assignment = await DispatchAssignment.findById(assignmentId);
  if (!assignment) return {};

  const order = assignment.orderId ? await Order.findById(assignment.orderId) : null;
  return { assignment, order };
};

exports.getAssignments = async (req, res) => {
  try {
    const DispatchAssignment = req.app.locals.models.DispatchAssignment;
    const assignments = await DispatchAssignment.findAll(req.query);
    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error("Error loading dispatch assignments:", error);
    res.status(500).json({ success: false, error: "Failed to load dispatch assignments" });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const DispatchAssignment = req.app.locals.models.DispatchAssignment;
    const Order = req.app.locals.models.Order;
    const db = req.app.locals.db;
    const {
      orderId,
      vendorOrderId,
      vendorId,
      courierName,
      trackingNumber,
      pickupDate,
      pickupWindow,
      pickupAddress,
      eta,
      notes,
      codCollectionStatus,
    } = req.body;

    if (!orderId || !courierName || !trackingNumber) {
      return res.status(400).json({
        success: false,
        error: "orderId, courierName, and trackingNumber are required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const assignment = await DispatchAssignment.create({
      orderId,
      vendorOrderId: vendorOrderId || null,
      vendorId: vendorId || null,
      courierName: courierName.trim(),
      trackingNumber: trackingNumber.trim(),
      pickupDate: pickupDate ? new Date(pickupDate) : null,
      pickupWindow: pickupWindow || "",
      pickupAddress: pickupAddress || "",
      eta: eta ? new Date(eta) : null,
      notes: notes || "",
      codCollectionStatus,
      createdBy: req.user?.uid || req.user?._id || "admin",
    });

    await Order.collection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          courierName: assignment.courierName,
          trackingNumber: assignment.trackingNumber,
          estimatedDelivery: assignment.eta,
          dispatchAssignmentId: assignment._id.toString(),
          updatedAt: new Date(),
        },
      },
    );

    if (vendorOrderId && ObjectId.isValid(vendorOrderId)) {
      await db.collection("vendorOrders").updateOne(
        { _id: new ObjectId(vendorOrderId) },
        {
          $set: {
            courierName: assignment.courierName,
            trackingNumber: assignment.trackingNumber,
            estimatedDelivery: assignment.eta,
            dispatchAssignmentId: assignment._id.toString(),
            updatedAt: new Date(),
          },
        },
      );
    }

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "dispatch_assigned",
      label: "Courier assigned",
      actorId: req.user?.uid,
      actorRole: "admin",
      courierName: assignment.courierName,
      trackingNumber: assignment.trackingNumber,
      eta: assignment.eta,
      note: notes || "",
      metadata: { dispatchAssignmentId: assignment._id.toString() },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error("Error creating dispatch assignment:", error);
    res.status(500).json({ success: false, error: "Failed to create dispatch assignment" });
  }
};

exports.updateAssignmentStatus = async (req, res) => {
  try {
    const DispatchAssignment = req.app.locals.models.DispatchAssignment;
    const { id } = req.params;
    const { status, codCollectionStatus, note, eta } = req.body;
    const assignment = await DispatchAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ success: false, error: "Dispatch assignment not found" });
    }

    const update = {};
    if (status) update.status = status;
    if (codCollectionStatus) update.codCollectionStatus = codCollectionStatus;
    if (note !== undefined) update.notes = note;
    if (eta) update.eta = new Date(eta);

    await DispatchAssignment.update(id, update);

    await appendOrderEvent({
      app: req.app,
      orderId: assignment.orderId,
      vendorId: assignment.vendorId,
      status: status || "dispatch_updated",
      label: status ? `Dispatch ${status}` : "Dispatch updated",
      actorId: req.user?.uid,
      actorRole: "admin",
      courierName: assignment.courierName,
      trackingNumber: assignment.trackingNumber,
      eta: update.eta || assignment.eta,
      note: note || "",
      metadata: {
        dispatchAssignmentId: assignment._id.toString(),
        codCollectionStatus: codCollectionStatus || assignment.codCollectionStatus,
      },
    });

    const updated = await DispatchAssignment.findById(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating dispatch assignment:", error);
    res.status(500).json({ success: false, error: "Failed to update dispatch assignment" });
  }
};

exports.downloadPackingSlip = async (req, res) => {
  try {
    const { assignment, order } = await loadAssignmentContext(req, req.params.id);
    if (!assignment || !order) {
      return res.status(404).json({ success: false, error: "Packing slip not found" });
    }

    setPdfHeaders(res, `packing-slip-${assignment.trackingNumber || assignment._id}.pdf`);
    const doc = new PDFDocument({ margin: 42 });
    doc.pipe(res);

    doc.fontSize(20).text("Packing Slip", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`Order: #${normalizeId(order._id)}`);
    doc.text(`Courier: ${assignment.courierName}`);
    doc.text(`Tracking: ${assignment.trackingNumber}`);
    if (assignment.pickupWindow) doc.text(`Pickup: ${assignment.pickupWindow}`);
    doc.moveDown();

    const shipping = order.shippingInfo || {};
    doc.fontSize(13).text("Ship To");
    doc.fontSize(10).text(shipping.name || "");
    doc.text(shipping.phone || "");
    doc.text([shipping.address, shipping.area, shipping.union, shipping.upazila, shipping.district].filter(Boolean).join(", "));
    doc.moveDown();

    doc.fontSize(13).text("Items");
    (order.products || []).forEach((item, index) => {
      doc.fontSize(10).text(`${index + 1}. ${item.title || item.name || "Product"} x ${item.quantity || 1}`);
    });

    doc.end();
  } catch (error) {
    console.error("Error generating packing slip:", error);
    res.status(500).json({ success: false, error: "Failed to generate packing slip" });
  }
};

exports.downloadBarcodeLabel = async (req, res) => {
  try {
    const { assignment, order } = await loadAssignmentContext(req, req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: "Dispatch assignment not found" });
    }

    const text = assignment.trackingNumber || assignment._id.toString();
    const barcode = await bwipjs.toBuffer({
      bcid: "code128",
      text,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: "center",
    });

    setPdfHeaders(res, `barcode-${text}.pdf`);
    const doc = new PDFDocument({ size: [288, 432], margin: 24 });
    doc.pipe(res);
    doc.fontSize(12).text("Dispatch Label", { align: "center" });
    doc.moveDown();
    doc.image(barcode, 30, 70, { fit: [228, 88], align: "center" });
    doc.moveDown(6);
    doc.fontSize(10).text(`Order: #${assignment.orderId}`);
    doc.text(`Courier: ${assignment.courierName}`);
    doc.text(`Tracking: ${text}`);
    if (order?.shippingInfo?.name) doc.text(`Customer: ${order.shippingInfo.name}`);
    doc.end();
  } catch (error) {
    console.error("Error generating barcode label:", error);
    res.status(500).json({ success: false, error: "Failed to generate barcode label" });
  }
};

exports.downloadManifest = async (req, res) => {
  try {
    const DispatchAssignment = req.app.locals.models.DispatchAssignment;
    const assignments = await DispatchAssignment.findAll({
      pickupDate: req.query.date,
      courierName: req.query.courierName,
    });

    setPdfHeaders(res, `pickup-manifest-${req.query.date || "all"}.pdf`);
    const doc = new PDFDocument({ margin: 42, layout: "landscape" });
    doc.pipe(res);
    doc.fontSize(18).text("Pickup Manifest", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Date: ${req.query.date || "All"}`);
    if (req.query.courierName) doc.text(`Courier: ${req.query.courierName}`);
    doc.moveDown();

    assignments.forEach((assignment, index) => {
      doc.text(
        `${index + 1}. Order #${assignment.orderId} | ${assignment.courierName} | ${assignment.trackingNumber} | COD: ${assignment.codCollectionStatus}`,
      );
    });

    doc.end();
  } catch (error) {
    console.error("Error generating pickup manifest:", error);
    res.status(500).json({ success: false, error: "Failed to generate pickup manifest" });
  }
};
