const webpush = require("web-push");
const PushSubscription = require("../../models/PushSubscription");

const hasValue = (value) => String(value || "").trim().length > 0;

let vapidReady = false;

function initVapid() {
  if (!hasValue(process.env.VAPID_PUBLIC_KEY) || !hasValue(process.env.VAPID_PRIVATE_KEY)) {
    vapidReady = false;
    console.log("Push service running in mock mode (VAPID keys not configured)");
    return { configured: false, mock: true };
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || "admin@amiyo-go.local"}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    vapidReady = true;
    console.log("Push service configured with env VAPID keys");
    return { configured: true, mock: false };
  } catch (error) {
    vapidReady = false;
    console.warn("Push service VAPID configuration failed:", error.message);
    return { configured: false, mock: true, error: error.message };
  }
}

async function sendPush(subscription, payload = {}) {
  if (!vapidReady) {
    console.log("[mock-push]", {
      endpoint: subscription?.endpoint,
      title: payload.title,
      body: payload.body,
    });
    return { success: true, mock: true };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title || process.env.APP_NAME || "Amiyo-Go",
        body: payload.body || "",
        icon: payload.icon || "/icons/icon-192x192.png",
        data: {
          ...(payload.data || {}),
          url: payload.url || payload.data?.url || "/",
        },
      }),
    );
    return { success: true, mock: false };
  } catch (error) {
    if ([404, 410].includes(error.statusCode) && subscription?.endpoint) {
      await PushSubscription.updateOne(
        { "subscription.endpoint": subscription.endpoint },
        { $set: { isActive: false } },
      ).catch(() => {});
    }
    return { success: false, error: error.message };
  }
}

async function sendToUser(userId, payload = {}) {
  const subscriptions = await PushSubscription.find({ userId: String(userId), isActive: true }).lean();
  const results = await Promise.all(subscriptions.map((item) => sendPush(item.subscription, payload)));
  return {
    success: true,
    sent: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    mock: !vapidReady,
  };
}

async function sendBulk(userIds = [], payload = {}) {
  const uniqueUserIds = [...new Set(userIds.map((id) => String(id)).filter(Boolean))];
  const results = await Promise.all(uniqueUserIds.map((userId) => sendToUser(userId, payload)));
  return {
    success: true,
    sent: results.reduce((sum, item) => sum + (item.sent || 0), 0),
    failed: results.reduce((sum, item) => sum + (item.failed || 0), 0),
    mock: !vapidReady,
  };
}

module.exports = {
  initVapid,
  sendBulk,
  sendPush,
  sendToUser,
  isReady: () => vapidReady,
};
