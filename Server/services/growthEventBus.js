const GrowthEventService = require("./growthEventService");
const GrowthNotificationService = require("./growthNotificationService");

const NOTIFIABLE_EVENTS = new Set([
  "cart.abandoned",
  "wishlist.price_dropped",
  "product.back_in_stock",
  "promotion.started",
  "voucher.expiring",
  "vendor.followed.new_product",
  "return.updated",
  "support.replied",
  "order.shipped",
  "order.delivered",
]);

class GrowthEventBus {
  static async publish(db, eventName, payload = {}, options = {}) {
    const event = await GrowthEventService.trackEvent(db, {
      eventName,
      userId: payload.userId || options.userId,
      anonymousSessionId: payload.anonymousSessionId || options.anonymousSessionId,
      productId: payload.productId,
      vendorId: payload.vendorId,
      categoryId: payload.categoryId,
      source: payload.source || options.source || "system",
      device: payload.device || options.device || "system",
      metadata: payload,
    });

    let notifications = [];
    if (NOTIFIABLE_EVENTS.has(eventName) && (payload.userId || payload.email || payload.phone)) {
      notifications = await GrowthNotificationService.enqueue(db, {
        eventName,
        recipient: {
          userId: payload.userId,
          email: payload.email,
          phone: payload.phone,
        },
        payload,
        channels: options.channels || ["in_app"],
        preferences: options.preferences || payload.preferences || {},
        scheduledFor: options.scheduledFor || null,
      });
    }

    return { event, notifications };
  }
}

module.exports = GrowthEventBus;
