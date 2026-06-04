const express = require("express");
const MarketplaceEventBus = require("../services/marketplaceEventBus");
const {
  updateOrderFromDeliveryCallback,
  verifyAmiyoDeliveryCallback,
} = require("../services/amiyoDeliveryIntegrationService");

const router = express.Router();

const handleCallback = (eventType) => async (req, res) => {
  const verification = verifyAmiyoDeliveryCallback(req);
  if (!verification.ok) {
    return res.status(verification.status || 401).json({
      success: false,
      error: verification.error || "Invalid delivery callback",
    });
  }

  try {
    const result = await updateOrderFromDeliveryCallback(req.params.orderId, req.body || {}, {
      db: req.app.locals.db,
      Order: req.app.locals.models.Order,
      eventType,
    });

    MarketplaceEventBus.publish(req.app, `delivery.${eventType}`, {
      orderId: result.orderId,
      deliveryStatus: result.deliveryStatus,
      orderStatus: result.orderStatus,
      payload: req.body || {},
    }, {
      source: "amiyo_delivery",
      actorId: "amiyo_delivery",
      actorRole: "system",
      subjectType: "order",
      subjectId: result.orderId,
    }).catch((error) => {
      console.error("Failed to publish Amiyo Delivery callback event:", error);
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error("Amiyo Delivery callback failed:", error);
    return res.status(status).json({
      success: false,
      error: error.message || "Failed to process delivery callback",
    });
  }
};

router.post("/orders/:orderId/status", handleCallback("status"));
router.post("/orders/:orderId/delivered", handleCallback("delivered"));
router.post("/orders/:orderId/failed", handleCallback("failed"));
router.post("/orders/:orderId/return", handleCallback("return"));

module.exports = router;
