const webpush = require("web-push");

// Configure web-push with VAPID keys from environment variables
const vapidKeys = {
  publicKey:
    process.env.VAPID_PUBLIC_KEY ||
    "BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOU2gKOt5-_qS3AROhD-cy_bUtpQHhNVA",
  privateKey:
    process.env.VAPID_PRIVATE_KEY ||
    "dUh2Q7blFqhvdQ9jD6uQrPQO8WA0lEjqahJI6br7SKI", // Default key for development
};

// Only configure VAPID if we have valid keys
if (
  vapidKeys.privateKey &&
  vapidKeys.privateKey !== "your-private-vapid-key-here"
) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@hnilabazar.com",
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

    const payload = JSON.stringify(notificationData);
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
        .then(() => {
          successCount++;
          console.log(`✅ Notification sent to user ${sub.userId}`);
        })
        .catch((error) => {
          failureCount++;
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

    const payload = JSON.stringify({
      ...notificationData,
      type: notificationType,
    });

    const promises = [];
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const promise = webpush
        .sendNotification(sub.subscription, payload)
        .then(() => {
          successCount++;
          console.log(
            `✅ ${notificationType} notification sent to user ${sub.userId}`,
          );
        })
        .catch((error) => {
          failureCount++;
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
      body: body || "This is a test notification from HnilaBazar!",
      icon: icon || "/icons/icon-192x192.png",
      badge: badge || "/icons/icon-72x72.png",
      tag: "test-notification",
      data: {
        url: url || "/",
        timestamp: new Date().toISOString(),
        type: type || "test",
      },
    };

    const payload = JSON.stringify(notificationData);
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        successCount++;
        console.log(`✅ Test notification sent to subscription ${sub._id}`);
      } catch (error) {
        failureCount++;
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
        body: "This is a test notification from HnilaBazar!",
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
    const publicKey =
      process.env.VAPID_PUBLIC_KEY ||
      "BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOU2gKOt5-_qS3AROhD-cy_bUtpQHhNVA";

    res.json({
      success: true,
      publicKey: publicKey,
    });
  } catch (error) {
    console.error("❌ Failed to get VAPID public key:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get VAPID public key",
    });
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
};
