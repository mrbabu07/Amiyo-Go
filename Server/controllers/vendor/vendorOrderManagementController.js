const { ObjectId } = require("mongodb");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const { appendOrderEvent, getTimelineForOrder } = require("../../services/orderEventService");
const { notifyAmiyoDeliveryOrderReady } = require("../../services/amiyoDeliveryIntegrationService");

/**
 * Daraz-Style Vendor Order Management Controller
 * Handles: Accept, Reject, Ready to Ship, Ship, Deliver
 */

const notifyCustomer = async (req, order, payload) => {
  const Notification = req.app.locals.models.Notification;
  if (!Notification || !order?.userId) return;

  await Notification.create({
    userId: order.userId,
    orderId: order._id?.toString(),
    link: `/orders`,
    ...payload,
  }).catch((error) => {
    console.error("Failed to create customer order notification:", error);
  });
};

const updateVendorOrderSnapshot = async (db, orderId, vendorId, update) => {
  await db.collection("vendorOrders").updateOne(
    {
      parentOrderId: orderId.toString(),
      vendorId: vendorId.toString(),
    },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    },
  );
};

const belongsToVendor = (product, vendorId) =>
  product?.vendorId && product.vendorId.toString() === vendorId.toString();

const normalizeItemStatus = (value) => String(value || "pending").trim().toLowerCase();

const allVendorItemsInStatus = (items = [], statuses = []) =>
  items.every((item) => statuses.includes(normalizeItemStatus(item.itemStatus)));

const getVendorArrayFilter = (vendorId) => {
  const vendorKey = vendorId.toString();
  const filters = [{ "elem.vendorId": vendorKey }];
  if (ObjectId.isValid(vendorKey)) {
    filters.push({ "elem.vendorId": new ObjectId(vendorKey) });
  }
  return filters.length > 1 ? { $or: filters } : filters[0];
};

const getVendorOrderContext = async (req, orderId) => {
  const Order = req.app.locals.models.Order;
  const vendor = req.vendor;
  if (!vendor) {
    const error = new Error("Vendor not found");
    error.statusCode = 404;
    throw error;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const vendorId = vendor._id.toString();
  const vendorItems = (order.products || []).filter((product) => belongsToVendor(product, vendorId));
  if (vendorItems.length === 0) {
    const error = new Error("No items for this vendor in order");
    error.statusCode = 403;
    throw error;
  }

  return { Order, order, vendor, vendorId, vendorItems };
};

const setPdfHeaders = (res, filename) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
};

// ─── Accept Order ──────────────────────────────────────────────
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { estimatedReadyTime } = req.body; // Optional: hours until ready
    
    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    if (vendor.status !== "approved") {
      return res.status(403).json({ error: "Vendor not approved" });
    }

    const vendorId = vendor._id.toString();

    // Get order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Check if vendor has items in this order
    const vendorItems = (order.products || []).filter(
      (product) => belongsToVendor(product, vendorId)
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    // Check if already accepted
    const alreadyAccepted = vendorItems.some(
      item => item.itemStatus && item.itemStatus !== 'pending'
    );
    if (alreadyAccepted) {
      return res.status(400).json({ error: "Order already accepted" });
    }

    // Update item statuses to 'accepted'
    const ordersCollection = db.collection("orders");
    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": "accepted",
          "products.$[elem].vendorAcceptedAt": new Date(),
          "products.$[elem].estimatedReadyTime": estimatedReadyTime || null,
        }
      },
      {
        arrayFilters: [getVendorArrayFilter(vendorId)]
      }
    );

    // Sync overall order status
    await Order.syncOrderStatus(orderId);

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "accepted",
      acceptedAt: new Date(),
      estimatedReadyTime: estimatedReadyTime || null,
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "accepted",
      label: "Vendor accepted order",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: estimatedReadyTime ? `Estimated ready time: ${estimatedReadyTime}` : "",
    });

    await notifyCustomer(req, order, {
      type: "order_accepted",
      title: "Order accepted",
      message: `${vendor.shopName || "Vendor"} accepted your order items.`,
    });

    res.json({
      success: true,
      message: "Order accepted successfully",
      data: {
        orderId,
        acceptedAt: new Date(),
        itemCount: vendorItems.length,
      }
    });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ error: "Failed to accept order" });
  }
};

// ─── Reject Order ──────────────────────────────────────────────
exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      (product) => belongsToVendor(product, vendorId)
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    // Update item statuses to 'cancelled'
    const ordersCollection = db.collection("orders");
    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": "cancelled",
          "products.$[elem].vendorRejectedAt": new Date(),
          "products.$[elem].rejectionReason": reason,
          "products.$[elem].rejectionNotes": notes || null,
        }
      },
      {
        arrayFilters: [getVendorArrayFilter(vendorId)]
      }
    );

    await Order.syncOrderStatus(orderId);

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "cancelled",
      paymentStatus: order.paymentStatus === "paid" ? "refund_pending" : "cancelled",
      cancellationSource: "vendor",
      cancellationMessage: `Vendor rejected these items: ${reason}`,
      cancelledAt: new Date(),
      rejectionReason: reason,
      rejectionNotes: notes || null,
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "cancelled",
      label: "Vendor rejected order items",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: notes || reason,
      metadata: { reason },
    });

    await notifyCustomer(req, order, {
      type: "order_rejected",
      title: "Order item cancelled",
      message: `${vendor.shopName || "Vendor"} cancelled items in your order. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: "Order rejected",
      data: {
        orderId,
        rejectedAt: new Date(),
        reason,
      }
    });
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({ error: "Failed to reject order" });
  }
};

// ─── Mark Ready to Ship ────────────────────────────────────────
exports.markReadyToShip = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      (product) => belongsToVendor(product, vendorId)
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    if (!allVendorItemsInStatus(vendorItems, ["pending", "accepted", "processing", "packed", "ready_to_ship"])) {
      return res.status(400).json({ error: "Only open packed or processing items can be marked ready to ship" });
    }

    // Update to ready_to_ship
    const ordersCollection = db.collection("orders");
    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": "ready_to_ship",
          "products.$[elem].readyToShipAt": new Date(),
        }
      },
      {
        arrayFilters: [getVendorArrayFilter(vendorId)]
      }
    );

    await Order.syncOrderStatus(orderId);

    const updatedOrder = await Order.findById(orderId);
    const amiyoDelivery = await notifyAmiyoDeliveryOrderReady(updatedOrder || order, { db, Order });

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "ready_to_ship",
      readyToShipAt: new Date(),
      courierPickupStatus: "pending",
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "ready_to_ship",
      label: "Ready to ship",
      actorId: req.user?.uid,
      actorRole: "vendor",
    });

    await notifyCustomer(req, order, {
      type: "order_ready_to_ship",
      title: "Order ready to ship",
      message: `${vendor.shopName || "Vendor"} marked your order items ready for shipment.`,
    });

    res.json({
      success: true,
      message: "Items marked as ready to ship",
      data: {
        orderId,
        readyToShipAt: new Date(),
        amiyoDelivery,
      }
    });
  } catch (error) {
    console.error("Error marking ready to ship:", error);
    res.status(500).json({ error: "Failed to mark ready to ship" });
  }
};

// ─── Ship Order ────────────────────────────────────────────────
exports.shipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, courierName, estimatedDelivery } = req.body;

    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ error: "Tracking number is required" });
    }
    if (!courierName || !courierName.trim()) {
      return res.status(400).json({ error: "Courier name is required" });
    }

    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      (product) => belongsToVendor(product, vendorId)
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    if (!allVendorItemsInStatus(vendorItems, ["ready_to_ship", "pickup_ready"])) {
      return res.status(400).json({ error: "Items must be ready for courier handover before shipping" });
    }

    // Update to shipped
    const ordersCollection = db.collection("orders");
    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": "shipped",
          "products.$[elem].shippedAt": new Date(),
          "products.$[elem].trackingNumber": trackingNumber.trim(),
          "products.$[elem].courierName": courierName.trim(),
          "products.$[elem].estimatedDelivery": estimatedDelivery ? new Date(estimatedDelivery) : null,
        }
      },
      {
        arrayFilters: [getVendorArrayFilter(vendorId)]
      }
    );

    await Order.syncOrderStatus(orderId);

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "shipped",
      shippedAt: new Date(),
      trackingNumber: trackingNumber.trim(),
      courierName: courierName.trim(),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      courierSyncStatus: "manual_tracking",
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "shipped",
      label: "Order shipped",
      actorId: req.user?.uid,
      actorRole: "vendor",
      courierName: courierName.trim(),
      trackingNumber: trackingNumber.trim(),
      eta: estimatedDelivery ? new Date(estimatedDelivery) : null,
    });

    await notifyCustomer(req, order, {
      type: "order_shipped",
      title: "Order shipped",
      message: `${vendor.shopName || "Vendor"} shipped your order items via ${courierName.trim()}. Tracking: ${trackingNumber.trim()}`,
      trackingNumber: trackingNumber.trim(),
      courierName: courierName.trim(),
    });

    res.json({
      success: true,
      message: "Order shipped successfully",
      data: {
        orderId,
        shippedAt: new Date(),
        trackingNumber: trackingNumber.trim(),
        courierName: courierName.trim(),
      }
    });
  } catch (error) {
    console.error("Error shipping order:", error);
    res.status(500).json({ error: "Failed to ship order" });
  }
};

// ─── Mark Delivered ────────────────────────────────────────────
exports.markDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryNotes } = req.body;

    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      (product) => belongsToVendor(product, vendorId)
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    // Check if items are shipped
    const notShipped = vendorItems.some(
      item => item.itemStatus !== 'shipped'
    );
    if (notShipped) {
      return res.status(400).json({ error: "Items must be shipped first" });
    }

    // Update to delivered
    const ordersCollection = db.collection("orders");
    await ordersCollection.updateOne(
      { _id: typeof orderId === 'string' ? new ObjectId(orderId) : orderId },
      {
        $set: {
          "products.$[elem].itemStatus": "delivered",
          "products.$[elem].deliveredAt": new Date(),
          "products.$[elem].deliveryNotes": deliveryNotes || null,
        }
      },
      {
        arrayFilters: [getVendorArrayFilter(vendorId)]
      }
    );

    await Order.syncOrderStatus(orderId);

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "delivered",
      deliveredAt: new Date(),
      deliveryNotes: deliveryNotes || null,
      payoutEligibilityStatus: "eligible",
      payoutEligibleAt: new Date(),
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "delivered",
      label: "Delivered",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: deliveryNotes || "",
    });

    await notifyCustomer(req, order, {
      type: "order_delivered",
      title: "Order delivered",
      message: `${vendor.shopName || "Vendor"} marked your order items as delivered. Please review your purchase when you can.`,
    });

    res.json({
      success: true,
      message: "Order marked as delivered",
      data: {
        orderId,
        deliveredAt: new Date(),
      }
    });
  } catch (error) {
    console.error("Error marking delivered:", error);
    res.status(500).json({ error: "Failed to mark as delivered" });
  }
};

// ─── Get Order Timeline ────────────────────────────────────────
exports.markPickupReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = req.app.locals.db;
    const { Order, order, vendor, vendorId, vendorItems } = await getVendorOrderContext(req, orderId);

    if (!allVendorItemsInStatus(vendorItems, ["packed", "ready_to_ship", "pickup_ready"])) {
      return res.status(400).json({ error: "Items must be packed or ready to ship before pickup handover" });
    }

    const now = new Date();
    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          "products.$[elem].itemStatus": "pickup_ready",
          "products.$[elem].pickupReadyAt": now,
        },
      },
      { arrayFilters: [getVendorArrayFilter(vendorId)] },
    );

    await Order.syncOrderStatus(orderId);
    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "pickup_ready",
      pickupReadyAt: now,
      courierPickupStatus: "ready",
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "pickup_ready",
      label: "Pickup ready",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: "Vendor marked the package ready for pickup.",
    });

    await notifyCustomer(req, order, {
      type: "order_pickup_ready",
      title: "Order ready for pickup",
      message: `${vendor.shopName || "Vendor"} marked your package ready for courier pickup.`,
    });

    res.json({
      success: true,
      message: "Order marked pickup ready",
      data: { orderId, pickupReadyAt: now },
    });
  } catch (error) {
    console.error("Error marking pickup ready:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to mark pickup ready" });
  }
};

exports.schedulePickup = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { pickupDate, timeSlot, courierName = "Platform courier", notes = "" } = req.body;

    if (!pickupDate || !timeSlot) {
      return res.status(400).json({ error: "Pickup date and time slot are required" });
    }

    const db = req.app.locals.db;
    const { Order, order, vendor, vendorId, vendorItems } = await getVendorOrderContext(req, orderId);
    if (!allVendorItemsInStatus(vendorItems, ["packed", "ready_to_ship", "pickup_ready"])) {
      return res.status(400).json({ error: "Items must be packed or ready to ship before pickup scheduling" });
    }

    const now = new Date();
    const schedule = {
      pickupDate: new Date(pickupDate),
      timeSlot: String(timeSlot).trim(),
      courierName: String(courierName || "Platform courier").trim(),
      notes: String(notes || "").trim(),
      scheduledAt: now,
      status: "scheduled",
    };

    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          "products.$[elem].itemStatus": "pickup_ready",
          "products.$[elem].pickupReadyAt": now,
          "products.$[elem].courierPickupStatus": "scheduled",
          "products.$[elem].pickupSchedule": schedule,
        },
      },
      { arrayFilters: [getVendorArrayFilter(vendorId)] },
    );

    await Order.syncOrderStatus(orderId);
    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      status: "pickup_ready",
      pickupReadyAt: now,
      courierPickupStatus: "scheduled",
      pickupSchedule: schedule,
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "pickup_scheduled",
      label: "Drop-off scheduled",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: `${schedule.courierName} pickup on ${schedule.pickupDate.toISOString().slice(0, 10)} ${schedule.timeSlot}`,
      metadata: { pickupSchedule: schedule },
    });

    await notifyCustomer(req, order, {
      type: "order_pickup_scheduled",
      title: "Courier pickup scheduled",
      message: `${vendor.shopName || "Vendor"} scheduled courier pickup for your package.`,
    });

    res.json({
      success: true,
      message: "Pickup scheduled",
      data: { orderId, pickupSchedule: schedule, pickupReadyAt: now },
    });
  } catch (error) {
    console.error("Error scheduling pickup:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to schedule pickup" });
  }
};

exports.recordDeliveryException = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      reason = "",
      resolution = "reattempt",
      notes = "",
      retryDate = "",
    } = req.body;
    const cleanedReason = String(reason || "").trim();
    const cleanedResolution = String(resolution || "reattempt").trim();

    if (!cleanedReason) {
      return res.status(400).json({ error: "Delivery exception reason is required" });
    }

    const db = req.app.locals.db;
    const { order, vendor, vendorId, vendorItems } = await getVendorOrderContext(req, orderId);
    const invalidItems = vendorItems.some((item) =>
      ["cancelled", "delivered", "returned"].includes(item.itemStatus),
    );

    if (invalidItems) {
      return res.status(400).json({ error: "Exceptions cannot be recorded for cancelled, returned, or delivered items" });
    }

    const now = new Date();
    const exception = {
      reason: cleanedReason,
      resolution: cleanedResolution,
      notes: String(notes || "").trim(),
      retryDate: retryDate ? new Date(retryDate) : null,
      status: "open",
      recordedAt: now,
      recordedBy: req.user?.uid || null,
    };

    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          "products.$[elem].courierPickupStatus": "exception",
          "products.$[elem].deliveryException": exception,
          updatedAt: now,
        },
      },
      { arrayFilters: [getVendorArrayFilter(vendorId)] },
    );

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      courierPickupStatus: "exception",
      deliveryException: exception,
      exceptionOpenAt: now,
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "delivery_exception",
      label: "Delivery exception recorded",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: `${cleanedReason}${notes ? ` - ${notes}` : ""}`,
      metadata: { deliveryException: exception },
    });

    await notifyCustomer(req, order, {
      type: "delivery_exception",
      title: "Delivery needs attention",
      message: `${vendor.shopName || "Vendor"} reported a delivery issue: ${cleanedReason}.`,
    });

    res.json({
      success: true,
      message: "Delivery exception recorded",
      data: { orderId, deliveryException: exception },
    });
  } catch (error) {
    console.error("Error recording delivery exception:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to record delivery exception" });
  }
};

exports.markCodCollected = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note = "" } = req.body;
    const db = req.app.locals.db;
    const { order, vendor, vendorId, vendorItems } = await getVendorOrderContext(req, orderId);
    const paymentMethod = String(order.paymentMethod || "").toLowerCase();

    if (!["cod", "cash_on_delivery", "cash on delivery"].includes(paymentMethod)) {
      return res.status(400).json({ error: "COD collection can only be marked for cash-on-delivery orders" });
    }

    const notDelivered = vendorItems.some((item) => item.itemStatus !== "delivered");
    if (notDelivered) {
      return res.status(400).json({ error: "COD collection can only be confirmed after delivery" });
    }

    const now = new Date();
    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          "products.$[elem].codCollected": true,
          "products.$[elem].codCollectedAt": now,
          "products.$[elem].codCollectedBy": req.user?.uid || null,
          "products.$[elem].codCollectionNote": String(note || "").trim(),
          codCollectionStatus: "partially_collected",
          updatedAt: now,
        },
      },
      { arrayFilters: [getVendorArrayFilter(vendorId)] },
    );

    const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    const allCodCollected = (updatedOrder?.products || [])
      .filter((product) => product.itemStatus !== "cancelled")
      .every((product) => product.codCollected === true);

    if (allCodCollected) {
      await db.collection("orders").updateOne(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            codCollectionStatus: "collected",
            codCollectedAt: now,
            updatedAt: now,
          },
        },
      );
    }

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      codCollected: true,
      codCollectedAt: now,
      codCollectionNote: String(note || "").trim(),
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "cod_collected",
      label: "COD cash collected",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: String(note || "").trim(),
    });

    await notifyCustomer(req, order, {
      type: "cod_collected",
      title: "COD payment collected",
      message: `${vendor.shopName || "Vendor"} marked cash collection for your order.`,
    });

    res.json({
      success: true,
      message: "COD cash collection recorded",
      data: { orderId, codCollectedAt: now },
    });
  } catch (error) {
    console.error("Error marking COD collected:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to mark COD collected" });
  }
};

exports.sendBuyerMessage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: "Message must be 1000 characters or fewer" });
    }

    const db = req.app.locals.db;
    const { order, vendor, vendorId } = await getVendorOrderContext(req, orderId);
    const now = new Date();
    const buyerMessage = {
      _id: new ObjectId(),
      vendorId,
      vendorName: vendor.shopName || vendor.businessName || "Vendor",
      senderRole: "vendor",
      senderId: req.user?.uid || null,
      message,
      createdAt: now,
    };

    await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $push: { customerMessages: buyerMessage },
        $set: { updatedAt: now },
      },
    );

    await updateVendorOrderSnapshot(db, orderId, vendorId, {
      lastBuyerMessage: buyerMessage,
      lastBuyerMessageAt: now,
    });

    await appendOrderEvent({
      app: req.app,
      orderId,
      vendorId,
      status: "buyer_message",
      label: "Message sent to buyer",
      actorId: req.user?.uid,
      actorRole: "vendor",
      note: message,
    });

    await notifyCustomer(req, order, {
      type: "order_message",
      title: "Message from seller",
      message,
      link: `/orders`,
    });

    res.json({
      success: true,
      message: "Message sent to buyer",
      data: buyerMessage,
    });
  } catch (error) {
    console.error("Error sending buyer message:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to send buyer message" });
  }
};

exports.downloadPackingSlip = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order, vendor, vendorItems } = await getVendorOrderContext(req, orderId);

    setPdfHeaders(res, `vendor-packing-slip-${orderId}.pdf`);
    const doc = new PDFDocument({ margin: 36, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text("Vendor Packing Slip", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Order: ${orderId}`);
    doc.text(`Vendor: ${vendor.shopName || vendor.businessName || "Vendor"}`);
    doc.text(`Created: ${new Date(order.createdAt || Date.now()).toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(12).text("Customer", { underline: true });
    doc.fontSize(10);
    doc.text(order.shippingInfo?.name || "Customer");
    doc.text(order.shippingInfo?.phone || "");
    doc.text([
      order.shippingInfo?.address,
      order.shippingInfo?.area,
      order.shippingInfo?.city || order.shippingInfo?.district,
      order.shippingInfo?.zipCode,
    ].filter(Boolean).join(", "));
    doc.moveDown();

    doc.fontSize(12).text("Items", { underline: true });
    doc.moveDown(0.25);
    vendorItems.forEach((item, index) => {
      doc
        .fontSize(10)
        .text(`${index + 1}. ${item.title || item.name || "Product"}`, { continued: true })
        .text(`  Qty: ${item.quantity || 1}`, { align: "right" });
      if (item.selectedSize || item.selectedColor) {
        const color =
          typeof item.selectedColor === "object"
            ? item.selectedColor.name || item.selectedColor.value
            : item.selectedColor;
        doc.fontSize(9).fillColor("#555").text(
          [item.selectedSize ? `Size: ${item.selectedSize}` : "", color ? `Color: ${color}` : ""]
            .filter(Boolean)
            .join(" | "),
        );
        doc.fillColor("#000");
      }
    });

    doc.moveDown();
    doc.fontSize(10).text(`Payment: ${order.paymentMethod || "N/A"} (${order.paymentStatus || "pending"})`);
    doc.text(`Package status: ${vendorItems[0]?.itemStatus || order.status || "pending"}`);
    doc.end();
  } catch (error) {
    console.error("Error generating vendor packing slip:", error);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message || "Failed to generate packing slip" });
    }
  }
};

exports.downloadBarcodeLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order, vendor, vendorId } = await getVendorOrderContext(req, orderId);
    const labelText = `${orderId.slice(-10).toUpperCase()}-${vendorId.slice(-6).toUpperCase()}`;
    const barcode = await bwipjs.toBuffer({
      bcid: "code128",
      text: labelText,
      scale: 3,
      height: 16,
      includetext: true,
      textxalign: "center",
    });

    setPdfHeaders(res, `vendor-barcode-${labelText}.pdf`);
    const doc = new PDFDocument({ margin: 20, size: [288, 180] });
    doc.pipe(res);
    doc.fontSize(10).text(vendor.shopName || "Vendor", { align: "center" });
    doc.fontSize(9).text(`Order #${orderId.slice(-8).toUpperCase()}`, { align: "center" });
    doc.image(barcode, 26, 52, { fit: [236, 78], align: "center" });
    doc.fontSize(8).text(order.shippingInfo?.name || "Customer", 20, 142, { align: "center" });
    doc.end();
  } catch (error) {
    console.error("Error generating vendor barcode label:", error);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message || "Failed to generate barcode label" });
    }
  }
};

exports.getOrderTimeline = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = req.vendor || await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      (product) => belongsToVendor(product, vendorId)
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    const persistedEvents = (await getTimelineForOrder(req.app, orderId)).filter(
      (event) => !event.vendorId || event.vendorId.toString() === vendorId,
    );

    if (persistedEvents.length > 0) {
      return res.json({
        success: true,
        timeline: persistedEvents,
        currentStatus: vendorItems[0]?.itemStatus || order.status || "pending",
      });
    }

    // Build timeline from item data
    const timeline = [];
    const item = vendorItems[0]; // Use first item as reference

    timeline.push({
      status: "pending",
      label: "Order Placed",
      timestamp: order.createdAt,
      completed: true,
    });

    if (item.vendorAcceptedAt) {
      timeline.push({
        status: "accepted",
        label: "Order Accepted",
        timestamp: item.vendorAcceptedAt,
        completed: true,
      });
    }

    if (item.readyToShipAt) {
      timeline.push({
        status: "ready_to_ship",
        label: "Ready to Ship",
        timestamp: item.readyToShipAt,
        completed: true,
      });
    }

    if (item.shippedAt) {
      timeline.push({
        status: "shipped",
        label: "Shipped",
        timestamp: item.shippedAt,
        completed: true,
        trackingNumber: item.trackingNumber,
        courierName: item.courierName,
      });
    }

    if (item.deliveredAt) {
      timeline.push({
        status: "delivered",
        label: "Delivered",
        timestamp: item.deliveredAt,
        completed: true,
      });
    }

    res.json({
      success: true,
      timeline,
      currentStatus: item.itemStatus || 'pending',
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
};

module.exports = exports;
