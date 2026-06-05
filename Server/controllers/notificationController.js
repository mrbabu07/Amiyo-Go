const webpush = require("web-push");
const { withResolvedNotificationLink } = require("../utils/notificationTargets");

// Configure web-push with VAPID keys from environment variables only.
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};
const pushConfigured = Boolean(vapidKeys.publicKey && vapidKeys.privateKey);

const logPushDelivery = async (models = null, delivery = {}) => {
  try {
    const NotificationDeliveryLog = models?.NotificationDeliveryLog;
    if (!NotificationDeliveryLog?.record) return null;
    return await NotificationDeliveryLog.record({
      channel: "push",
      provider: "web-push",
      ...delivery,
    });
  } catch (error) {
    console.error("Failed to record notification delivery:", error.message);
    return null;
  }
};

// Only configure VAPID if we have valid keys
if (pushConfigured) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || process.env.VAPID_SUBJECT || "mailto:admin@amiyo-go.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );
    console.log("🔧 Push notifications configured with VAPID keys");
  } catch (error) {
    console.log("⚠️ VAPID configuration failed:", error.message);
    console.log("🔧 Push notifications will work with limited functionality");
  }
} else {
  console.log(
    "⚠️ VAPID keys not configured. Push notifications will have limited functionality",
  );
}

const subscribe = async (req, res) => {
  try {
    const NotificationSubscription =
      req.app.locals.models.NotificationSubscription;
    const { subscription, userAgent, timestamp } = req.body;
    const userId = req.user?.uid || "anonymous";

    console.log("📱 New notification subscription:", {
      userId,
      endpoint: subscription.endpoint.substring(0, 50) + "...",
      userAgent: userAgent?.substring(0, 100),
    });

    // Check if subscription already exists
    const existingSubscription = await NotificationSubscription.findByEndpoint(
      subscription.endpoint,
    );

    if (existingSubscription) {
      console.log("✅ Subscription already exists, updating...");
      await NotificationSubscription.collection.updateOne(
        { "subscription.endpoint": subscription.endpoint },
        {
          $set: {
            userId,
            userAgent,
            updatedAt: new Date(),
            isActive: true,
          },
        },
      );
    } else {
      // Create new subscription
      await NotificationSubscription.create({
        userId,
        subscription,
        userAgent,
        preferences: {
          order_status: true,
          flash_sale: true,
          back_in_stock: true,
          abandoned_cart: true,
          wishlist_sale: true,
          new_product: false,
          review_reminder: true,
        },
      });
    }

    res.json({
      success: true,
      message: "Subscription saved successfully",
    });
  } catch (error) {
    console.error("❌ Failed to save subscription:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save subscription",
    });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const NotificationSubscription =
      req.app.locals.models.NotificationSubscription;
    const { subscription } = req.body;

    console.log(
      "🚫 Unsubscribing notification:",
      subscription.endpoint.substring(0, 50) + "...",
    );

    await NotificationSubscription.deactivate(subscription.endpoint);

    res.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("❌ Failed to unsubscribe:", error);
    res.status(500).json({
      success: false,
      error: "Failed to unsubscribe",
    });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const NotificationSubscription =
      req.app.locals.models.NotificationSubscription;
    const userId = req.user.uid;
    const preferences = req.body;

    console.log("⚙️ Updating notification preferences for user:", userId);

    await NotificationSubscription.updatePreferences(userId, preferences);

    res.json({
      success: true,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("❌ Failed to update preferences:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update preferences",
    });
  }
};

const getPreferences = async (req, res) => {
  try {
    const NotificationSubscription =
      req.app.locals.models.NotificationSubscription;
    const userId = req.user.uid;

    const subscriptions = await NotificationSubscription.findByUserId(userId);

    if (subscriptions.length > 0) {
      res.json({
        success: true,
        data: subscriptions[0].preferences || {},
      });
    } else {
      res.json({
        success: true,
        data: {},
      });
    }
  } catch (error) {
    console.error("❌ Failed to get preferences:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get preferences",
    });
  }
};

// Send notification to specific users
const sendNotification = async (userIds, notificationData, models = null) => {
  try {
    if (!pushConfigured) {
      console.log("[mock-push]", { userIds, title: notificationData?.title });
      return { success: true, sent: 0, failed: 0, mock: true };
    }

    // Get models from parameter or require them
    const NotificationSubscription =
      models?.NotificationSubscription ||
      require("../models/NotificationSubscription");

    // Get active subscriptions for the users
    const subscriptions =
      await NotificationSubscription.findActiveSubscriptions(userIds);

    if (subscriptions.length === 0) {
      console.log("📭 No active subscriptions found for users:", userIds);
      return { success: true, sent: 0 };
    }

    const resolvedNotificationData = withResolvedNotificationLink(notificationData);
    const payload = JSON.stringify({
      ...resolvedNotificationData,
      data: {
        ...(resolvedNotificationData.data || {}),
        url: resolvedNotificationData.link || resolvedNotificationData.url || "/",
      },
    });
    const promises = [];
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      // Check if user has enabled this notification type
      if (
        notificationData.type &&
        sub.preferences &&
        !sub.preferences[notificationData.type]
      ) {
        console.log(
          `⏭️ Skipping notification for user ${sub.userId} - type ${notificationData.type} disabled`,
        );
        continue;
      }

      const promise = webpush
        .sendNotification(sub.subscription, payload)
        .then(async () => {
          successCount++;
          await logPushDelivery(models, {
            status: "sent",
            userId: sub.userId,
            endpoint: sub.subscription?.endpoint,
            notificationType: notificationData.type || resolvedNotificationData.type || resolvedNotificationData.data?.type,
            title: resolvedNotificationData.title,
            body: resolvedNotificationData.body,
            data: resolvedNotificationData.data,
          });
          console.log(`✅ Notification sent to user ${sub.userId}`);
        })
        .catch(async (error) => {
          failureCount++;
          await logPushDelivery(models, {
            status: "failed",
            userId: sub.userId,
            endpoint: sub.subscription?.endpoint,
            notificationType: notificationData.type || resolvedNotificationData.type || resolvedNotificationData.data?.type,
            title: resolvedNotificationData.title,
            body: resolvedNotificationData.body,
            data: resolvedNotificationData.data,
            error: error.message,
            statusCode: error.statusCode || null,
          });
          console.error(
            `❌ Failed to send notification to user ${sub.userId}:`,
            error,
          );

          // If subscription is invalid, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            NotificationSubscription.deactivate(sub.subscription.endpoint);
          }
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    console.log(
      `📊 Notification sending complete: ${successCount} sent, ${failureCount} failed`,
    );

    return {
      success: true,
      sent: successCount,
      failed: failureCount,
    };
  } catch (error) {
    console.error("❌ Failed to send notifications:", error);
    throw error;
  }
};

// Send notification by type (for system-wide notifications)
const sendNotificationByType = async (
  notificationType,
  notificationData,
  userIds = null,
  models = null,
) => {
  try {
    if (!pushConfigured) {
      console.log("[mock-push]", { notificationType, userIds, title: notificationData?.title });
      return { success: true, sent: 0, failed: 0, mock: true };
    }

    // Get models from parameter or require them
    const NotificationSubscription =
      models?.NotificationSubscription ||
      require("../models/NotificationSubscription");

    // Get subscriptions that have this notification type enabled
    const subscriptions = await NotificationSubscription.findByNotificationType(
      notificationType,
      userIds,
    );

    if (subscriptions.length === 0) {
      console.log(
        `📭 No subscriptions found for notification type: ${notificationType}`,
      );
      return { success: true, sent: 0 };
    }

    const resolvedNotificationData = withResolvedNotificationLink({
      ...notificationData,
      type: notificationType,
    });
    const payload = JSON.stringify({
      ...resolvedNotificationData,
      data: {
        ...(resolvedNotificationData.data || {}),
        url: resolvedNotificationData.link || resolvedNotificationData.url || "/",
      },
    });

    const promises = [];
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const promise = webpush
        .sendNotification(sub.subscription, payload)
        .then(async () => {
          successCount++;
          await logPushDelivery(models, {
            status: "sent",
            userId: sub.userId,
            endpoint: sub.subscription?.endpoint,
            notificationType,
            title: resolvedNotificationData.title,
            body: resolvedNotificationData.body,
            data: resolvedNotificationData.data,
          });
          console.log(
            `✅ ${notificationType} notification sent to user ${sub.userId}`,
          );
        })
        .catch(async (error) => {
          failureCount++;
          await logPushDelivery(models, {
            status: "failed",
            userId: sub.userId,
            endpoint: sub.subscription?.endpoint,
            notificationType,
            title: resolvedNotificationData.title,
            body: resolvedNotificationData.body,
            data: resolvedNotificationData.data,
            error: error.message,
            statusCode: error.statusCode || null,
          });
          console.error(
            `❌ Failed to send ${notificationType} notification to user ${sub.userId}:`,
            error,
          );

          // If subscription is invalid, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            NotificationSubscription.deactivate(sub.subscription.endpoint);
          }
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    console.log(
      `📊 ${notificationType} notifications complete: ${successCount} sent, ${failureCount} failed`,
    );

    return {
      success: true,
      sent: successCount,
      failed: failureCount,
    };
  } catch (error) {
    console.error(
      `❌ Failed to send ${notificationType} notifications:`,
      error,
    );
    throw error;
  }
};

// Test notification endpoint (no auth required)
const sendTestNotificationPublic = async (req, res) => {
  try {
    if (!pushConfigured) {
      return res.json({
        success: true,
        message: "Push notifications are not configured; mock mode active",
        sent: 0,
        failed: 0,
        mock: true,
      });
    }

    const NotificationSubscription =
      req.app.locals.models.NotificationSubscription;
    const { title, body, icon, badge, url, type } = req.body;

    // Get all active subscriptions for testing
    const subscriptions = await NotificationSubscription.find({
      isActive: true,
    }).limit(10);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No active subscriptions found",
      });
    }

    const notificationData = {
      title: title || "🧪 Test Notification",
      body: body || "This is a test notification from Amiyo-Go!",
      icon: icon || "/icons/icon-192x192.png",
      badge: badge || "/icons/icon-72x72.png",
      tag: "test-notification",
      data: {
        url: url || "/",
        timestamp: new Date().toISOString(),
        type: type || "test",
      },
    };

    const resolvedNotificationData = withResolvedNotificationLink(notificationData);
    const payload = JSON.stringify({
      ...resolvedNotificationData,
      data: {
        ...(resolvedNotificationData.data || {}),
        url: resolvedNotificationData.link || resolvedNotificationData.url || "/",
      },
    });
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        successCount++;
        await logPushDelivery(req.app.locals.models, {
          status: "sent",
          userId: sub.userId,
          endpoint: sub.subscription?.endpoint,
          notificationType: type || "test",
          title: resolvedNotificationData.title,
          body: resolvedNotificationData.body,
          data: resolvedNotificationData.data,
        });
        console.log(`✅ Test notification sent to subscription ${sub._id}`);
      } catch (error) {
        failureCount++;
        await logPushDelivery(req.app.locals.models, {
          status: "failed",
          userId: sub.userId,
          endpoint: sub.subscription?.endpoint,
          notificationType: type || "test",
          title: resolvedNotificationData.title,
          body: resolvedNotificationData.body,
          data: resolvedNotificationData.data,
          error: error.message,
          statusCode: error.statusCode || null,
        });
        console.error(`❌ Failed to send test notification:`, error.message);

        // If subscription is invalid, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await NotificationSubscription.findByIdAndUpdate(sub._id, {
            isActive: false,
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Test notifications sent: ${successCount} successful, ${failureCount} failed`,
      sent: successCount,
      failed: failureCount,
    });
  } catch (error) {
    console.error("❌ Failed to send test notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send test notification: " + error.message,
    });
  }
};

// Test notification endpoint
const sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.uid;

    const result = await sendNotification(
      [userId],
      {
        title: "🧪 Test Notification",
        body: "This is a test notification from Amiyo-Go!",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: "test-notification",
        data: {
          url: "/",
          timestamp: new Date().toISOString(),
        },
      },
      req.app.locals.models,
    );

    res.json(result);
  } catch (error) {
    console.error("❌ Failed to send test notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send test notification",
    });
  }
};

// Get VAPID public key for client
const getVapidPublicKey = async (req, res) => {
  try {
    res.json({
      success: Boolean(process.env.VAPID_PUBLIC_KEY),
      publicKey: process.env.VAPID_PUBLIC_KEY || "",
      configured: pushConfigured,
    });
  } catch (error) {
    console.error("❌ Failed to get VAPID public key:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get VAPID public key",
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const Notification = req.app.locals.models.Notification;
    if (!Notification) {
      return res.json({ success: true, data: [], unreadCount: 0 });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await Notification.findByUserId(req.user.uid, {
      limit,
      skip,
      unreadOnly,
    });
    const unreadCount = await Notification.getUnreadCount(req.user.uid);

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error("Failed to load notifications:", error);
    res.status(500).json({ success: false, error: "Failed to load notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const Notification = req.app.locals.models.Notification;
    await Notification.markAsRead(req.params.id, req.user.uid);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    res.status(500).json({ success: false, error: "Failed to mark notification read" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const Notification = req.app.locals.models.Notification;
    await Notification.markAllAsRead(req.user.uid);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notifications read:", error);
    res.status(500).json({ success: false, error: "Failed to mark notifications read" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const Notification = req.app.locals.models.Notification;
    await Notification.delete(req.params.id, req.user.uid);
    const unreadCount = await Notification.getUnreadCount(req.user.uid);
    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    res.status(500).json({ success: false, error: "Failed to delete notification" });
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  updatePreferences,
  getPreferences,
  sendNotification,
  sendNotificationByType,
  sendTestNotification,
  sendTestNotificationPublic,
  getVapidPublicKey,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
