import { useState, useEffect } from "react";
import pushNotificationService, {
  NotificationTypes,
} from "../services/pushNotifications";
import useAuth from "../hooks/useAuth";

export default function NotificationSettings() {
  const { user } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState({
    supported: false,
    subscribed: false,
    permission: "default",
  });
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    [NotificationTypes.ORDER_STATUS]: true,
    [NotificationTypes.FLASH_SALE]: true,
    [NotificationTypes.BACK_IN_STOCK]: true,
    [NotificationTypes.ABANDONED_CART]: true,
    [NotificationTypes.WISHLIST_SALE]: true,
    [NotificationTypes.NEW_PRODUCT]: false,
    [NotificationTypes.REVIEW_REMINDER]: true,
  });

  useEffect(() => {
    checkNotificationStatus();
    loadUserPreferences();
  }, [user]);

  const checkNotificationStatus = async () => {
    const status = await pushNotificationService.getSubscriptionStatus();
    setNotificationStatus(status);
  };

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/user/notification-preferences", {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPreferences((prev) => ({ ...prev, ...data.data }));
        }
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    }
  };

  const saveUserPreferences = async (newPreferences) => {
    if (!user) return;

    try {
      const response = await fetch("/api/user/notification-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify(newPreferences),
      });

      if (response.ok) {
        console.log("✅ Notification preferences saved");
      }
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const hasPermission = await pushNotificationService.requestPermission();

      if (hasPermission) {
        await pushNotificationService.subscribe();
        await checkNotificationStatus();

        // Show success notification
        pushNotificationService.showLocalNotification(
          "🎉 Notifications Enabled!",
          {
            body: "You'll now receive updates about your orders and special offers.",
            tag: "notification-enabled",
          },
        );
      } else {
        // Permission denied - show helpful message
        alert(
          "Notifications are blocked. To enable them:\n\n" +
            "Chrome: Click the lock icon in address bar → Notifications → Allow\n" +
            "Firefox: Click shield icon → Permissions → Allow notifications\n" +
            "Edge: Click lock icon → Notifications → Allow\n\n" +
            "Then refresh the page and try again.",
        );
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);

      // Show user-friendly error message
      if (error.message.includes("blocked")) {
        alert(error.message);
      } else {
        alert(
          "Failed to enable notifications. Please check your browser settings and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await pushNotificationService.unsubscribe();
      await checkNotificationStatus();
    } catch (error) {
      console.error("Failed to disable notifications:", error);
      alert("Failed to disable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (type, enabled) => {
    const newPreferences = { ...preferences, [type]: enabled };
    setPreferences(newPreferences);
    await saveUserPreferences(newPreferences);
  };

  const testNotification = () => {
    pushNotificationService.showLocalNotification("🧪 Test Notification", {
      body: "This is a test notification from HnilaBazar!",
      tag: "test-notification",
    });
  };

  const getPermissionStatusText = () => {
    switch (notificationStatus.permission) {
      case "granted":
        return { text: "Enabled", color: "text-green-600 dark:text-green-400" };
      case "denied":
        return { text: "Blocked", color: "text-red-600 dark:text-red-400" };
      case "default":
        return {
          text: "Not Set",
          color: "text-yellow-600 dark:text-yellow-400",
        };
      case "unsupported":
        return {
          text: "Not Supported",
          color: "text-gray-600 dark:text-gray-400",
        };
      default:
        return { text: "Unknown", color: "text-gray-600 dark:text-gray-400" };
    }
  };

  const statusInfo = getPermissionStatusText();

  if (!notificationStatus.supported) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Notifications Not Supported
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your browser doesn't support push notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Push Notifications
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Stay updated with order status and special offers
          </p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </div>
          {notificationStatus.subscribed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Subscribed
            </div>
          )}
        </div>
      </div>

      {/* Permission Denied Help */}
      {notificationStatus.permission === "denied" && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                Notifications are Blocked
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                To enable push notifications, you need to allow them in your
                browser:
              </p>
              <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                <div>
                  <strong>Chrome:</strong> Click the lock icon → Notifications →
                  Allow
                </div>
                <div>
                  <strong>Firefox:</strong> Click shield icon → Permissions →
                  Allow notifications
                </div>
                <div>
                  <strong>Edge:</strong> Click lock icon → Notifications → Allow
                </div>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                After changing the setting, refresh this page and try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Toggle */}
      <div className="mb-6">
        {!notificationStatus.subscribed ? (
          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enabling...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5V7a12 12 0 1 1 24 0v10z"
                  />
                </svg>
                Enable Notifications
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={testNotification}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Test
            </button>
            <button
              onClick={handleDisableNotifications}
              disabled={loading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Disabling...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  Disable
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      {notificationStatus.subscribed && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notification Preferences
          </h3>
          <div className="space-y-4">
            {Object.entries({
              [NotificationTypes.ORDER_STATUS]: {
                title: "Order Updates",
                description: "Get notified when your order status changes",
              },
              [NotificationTypes.FLASH_SALE]: {
                title: "Flash Sale Alerts",
                description: "Be the first to know about limited-time offers",
              },
              [NotificationTypes.BACK_IN_STOCK]: {
                title: "Back in Stock",
                description: "Get notified when wishlist items are available",
              },
              [NotificationTypes.ABANDONED_CART]: {
                title: "Cart Reminders",
                description: "Reminders about items left in your cart",
              },
              [NotificationTypes.WISHLIST_SALE]: {
                title: "Wishlist Sales",
                description: "Get notified when wishlist items go on sale",
              },
              [NotificationTypes.NEW_PRODUCT]: {
                title: "New Products",
                description:
                  "Updates about new products in your favorite categories",
              },
              [NotificationTypes.REVIEW_REMINDER]: {
                title: "Review Reminders",
                description: "Reminders to review your purchased products",
              },
            }).map(([type, info]) => (
              <div
                key={type}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {info.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {info.description}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={preferences[type]}
                    onChange={(e) =>
                      handlePreferenceChange(type, e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              About Push Notifications
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Push notifications work even when the app is closed. You can
              customize which types of notifications you want to receive and
              disable them anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
