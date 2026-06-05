const { sendNotification } = require("./notificationController");

const serialize = (row = {}) => ({
  ...row,
  _id: row._id?.toString ? row._id.toString() : row._id,
});

exports.listNotificationDeliveries = async (req, res) => {
  try {
    const DeliveryLog = req.app.locals.models.NotificationDeliveryLog;
    const rows = await DeliveryLog.list({
      status: req.query.status || "all",
      channel: req.query.channel || "all",
      userId: req.query.userId || "",
    }, {
      limit: req.query.limit || 50,
    });

    res.json({ success: true, data: rows.map(serialize) });
  } catch (error) {
    console.error("Failed to list notification deliveries:", error);
    res.status(500).json({ success: false, error: "Failed to list notification deliveries" });
  }
};

exports.retryNotificationDelivery = async (req, res) => {
  try {
    const DeliveryLog = req.app.locals.models.NotificationDeliveryLog;
    const row = await DeliveryLog.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: "Notification delivery log not found" });
    }
    if (!row.userId) {
      return res.status(400).json({ success: false, error: "Delivery log has no user id to retry" });
    }

    const result = await sendNotification(
      [row.userId],
      {
        type: row.notificationType,
        title: row.title,
        body: row.body,
        data: row.data || {},
      },
      req.app.locals.models,
    );
    const updated = await DeliveryLog.markRetried(row._id, result);

    req.app.locals.realtime?.broadcast?.("admin:operations", "notification.delivery.retried", {
      deliveryId: serialize(row)._id,
      result,
    });

    res.json({ success: true, data: serialize(updated), retry: result });
  } catch (error) {
    console.error("Failed to retry notification delivery:", error);
    res.status(500).json({ success: false, error: "Failed to retry notification delivery" });
  }
};
