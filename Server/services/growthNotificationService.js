const { buildNotificationLink, withResolvedNotificationLink } = require("../utils/notificationTargets");

const DEFAULT_TEMPLATES = {
  "cart.abandoned": {
    title: "Your cart is waiting",
    body: "Complete your order for {{itemCount}} item(s) before they sell out.",
    url: "/cart",
  },
  "wishlist.price_dropped": {
    title: "Price drop on your wishlist",
    body: "{{productName}} is now available at a better price.",
    url: "/product/{{productId}}",
  },
  "product.back_in_stock": {
    title: "Back in stock",
    body: "{{productName}} is available again.",
    url: "/product/{{productId}}",
  },
  "promotion.started": {
    title: "New deal is live",
    body: "{{promotionTitle}} has started.",
    url: "/campaigns/{{campaignSlug}}",
  },
  "voucher.expiring": {
    title: "Voucher expiring soon",
    body: "Use {{code}} before it expires.",
    url: "/cart?coupon={{code}}",
  },
  "vendor.followed.new_product": {
    title: "New product from {{vendorName}}",
    body: "{{productName}} was just added.",
    url: "/product/{{productId}}",
  },
};

const DEFAULT_FREQUENCY_CAPS = {
  perEventPerDay: 3,
  totalPerDay: 8,
};

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const renderTemplate = (template = "", payload = {}) =>
  String(template || "").replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const value = key.split(".").reduce((current, part) => current?.[part], payload);
    return value === undefined || value === null ? "" : String(value);
  });

const hourInQuietWindow = (hour, quietHours = {}) => {
  if (!quietHours.enabled) return false;
  const start = Number(quietHours.startHour ?? 22);
  const end = Number(quietHours.endHour ?? 8);
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

const canSend = ({
  eventName,
  channel,
  preferences = {},
  history = [],
  now = new Date(),
  frequencyCaps = DEFAULT_FREQUENCY_CAPS,
} = {}) => {
  const channelPrefs = preferences.channels || {};
  const eventPrefs = preferences.events || {};
  if (preferences.unsubscribed === true) return { allowed: false, reason: "unsubscribed" };
  if (channelPrefs[channel] === false) return { allowed: false, reason: "channel_disabled" };
  if (eventPrefs[eventName] === false) return { allowed: false, reason: "event_disabled" };
  if (hourInQuietWindow(now.getHours(), preferences.quietHours)) return { allowed: false, reason: "quiet_hours" };

  const dayKey = now.toISOString().slice(0, 10);
  const todays = history.filter((row) => new Date(row.createdAt || row.sentAt || 0).toISOString().slice(0, 10) === dayKey);
  const sameEvent = todays.filter((row) => row.eventName === eventName);
  if (sameEvent.length >= Number(frequencyCaps.perEventPerDay || DEFAULT_FREQUENCY_CAPS.perEventPerDay)) {
    return { allowed: false, reason: "event_frequency_cap" };
  }
  if (todays.length >= Number(frequencyCaps.totalPerDay || DEFAULT_FREQUENCY_CAPS.totalPerDay)) {
    return { allowed: false, reason: "daily_frequency_cap" };
  }
  return { allowed: true };
};

const buildNotificationPayload = ({ eventName, channel = "in_app", template = {}, payload = {} }) => {
  const fallback = DEFAULT_TEMPLATES[eventName] || {
    title: eventName.replace(/\./g, " "),
    body: "{{message}}",
    url: "/",
  };
  const source = { ...fallback, ...template };
  const rendered = {
    eventName,
    channel,
    title: renderTemplate(source.title, payload),
    body: renderTemplate(source.body, payload),
    url: renderTemplate(source.url || payload.url || "/", payload),
    data: payload,
  };
  return withResolvedNotificationLink({
    ...rendered,
    type: eventName,
    data: {
      ...payload,
      url: buildNotificationLink({
        type: eventName,
        url: rendered.url,
        data: payload,
      }),
    },
  });
};

class GrowthNotificationService {
  static renderTemplate(template, payload) {
    return renderTemplate(template, payload);
  }

  static canSend(options) {
    return canSend(options);
  }

  static buildNotificationPayload(options) {
    return buildNotificationPayload(options);
  }

  static async loadTemplate(db, eventName, channel) {
    if (!db?.collection) return null;
    return db.collection("notification_templates").findOne({
      eventName,
      channel,
      active: { $ne: false },
    });
  }

  static async enqueue(db, {
    eventName,
    recipient,
    payload = {},
    channels = ["in_app"],
    preferences = {},
    frequencyCaps = DEFAULT_FREQUENCY_CAPS,
    scheduledFor = null,
  } = {}) {
    if (!db?.collection) throw new Error("Database connection is required");
    if (!eventName) throw new Error("Event name is required");
    if (!recipient?.userId && !recipient?.email && !recipient?.phone) throw new Error("Recipient is required");

    const queued = [];
    const recipientId = normalizeId(recipient.userId || recipient.email || recipient.phone);
    const history = await db
      .collection("notification_queue")
      .find({ recipientId, status: { $in: ["queued", "sent"] } })
      .toArray();

    for (const channel of channels) {
      const decision = canSend({ eventName, channel, preferences, history, frequencyCaps });
      if (!decision.allowed) {
        queued.push({ skipped: true, channel, reason: decision.reason });
        continue;
      }

      const template = await GrowthNotificationService.loadTemplate(db, eventName, channel);
      const notification = buildNotificationPayload({ eventName, channel, template, payload });
      const row = {
        eventName,
        channel,
        recipient,
        recipientId,
        payload: notification,
        status: "queued",
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await db.collection("notification_queue").insertOne(row);
      queued.push({ ...row, _id: result.insertedId });

      if (channel === "in_app" && recipient.userId) {
        await db.collection("notifications").insertOne(withResolvedNotificationLink({
          userId: normalizeId(recipient.userId),
          type: eventName,
          title: notification.title,
          body: notification.body,
          url: notification.url || notification.link,
          link: notification.link || notification.url,
          data: notification.data,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      }
    }

    return queued;
  }
}

module.exports = GrowthNotificationService;
module.exports.DEFAULT_TEMPLATES = DEFAULT_TEMPLATES;
module.exports.DEFAULT_FREQUENCY_CAPS = DEFAULT_FREQUENCY_CAPS;
module.exports._test = {
  buildNotificationPayload,
  canSend,
  hourInQuietWindow,
  renderTemplate,
};
