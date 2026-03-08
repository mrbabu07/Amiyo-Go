const { ObjectId } = require("mongodb");

/**
 * Daraz-Style Vendor Order Management Controller
 * Handles: Accept, Reject, Ready to Ship, Ship, Deliver
 */

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

    const vendor = await Vendor.findByUserId(user._id);
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
      p => p.vendorId === vendorId
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
        arrayFilters: [{ "elem.vendorId": vendorId }]
      }
    );

    // Sync overall order status
    await Order.syncOrderStatus(orderId);

    // TODO: Send notification to customer

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

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      p => p.vendorId === vendorId
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
        arrayFilters: [{ "elem.vendorId": vendorId }]
      }
    );

    await Order.syncOrderStatus(orderId);

    // TODO: Initiate refund for cancelled items
    // TODO: Send notification to customer

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

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      p => p.vendorId === vendorId
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    // Check if items are accepted
    const notAccepted = vendorItems.some(
      item => item.itemStatus !== 'accepted'
    );
    if (notAccepted) {
      return res.status(400).json({ error: "Order must be accepted first" });
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
        arrayFilters: [{ "elem.vendorId": vendorId }]
      }
    );

    await Order.syncOrderStatus(orderId);

    // TODO: Notify courier for pickup
    // TODO: Send notification to customer

    res.json({
      success: true,
      message: "Items marked as ready to ship",
      data: {
        orderId,
        readyToShipAt: new Date(),
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

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      p => p.vendorId === vendorId
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
    }

    // Check if items are ready to ship
    const notReady = vendorItems.some(
      item => item.itemStatus !== 'ready_to_ship' && item.itemStatus !== 'accepted'
    );
    if (notReady) {
      return res.status(400).json({ error: "Items must be ready to ship first" });
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
        arrayFilters: [{ "elem.vendorId": vendorId }]
      }
    );

    await Order.syncOrderStatus(orderId);

    // TODO: Send tracking info to customer
    // TODO: Update courier API

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

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      p => p.vendorId === vendorId
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
        arrayFilters: [{ "elem.vendorId": vendorId }]
      }
    );

    await Order.syncOrderStatus(orderId);

    // TODO: Release payment to vendor
    // TODO: Request customer review
    // TODO: Send delivery confirmation

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
exports.getOrderTimeline = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const Order = req.app.locals.models.Order;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const vendorId = vendor._id.toString();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const vendorItems = (order.products || []).filter(
      p => p.vendorId === vendorId
    );
    if (vendorItems.length === 0) {
      return res.status(403).json({ error: "No items for this vendor in order" });
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
