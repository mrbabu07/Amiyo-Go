import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Push Notifications Service
class PushNotificationService {
  constructor() {
    this.isSupported = "serviceWorker" in navigator && "PushManager" in window;
    this.subscription = null;
    this.publicKey = null; // Will be fetched from server
  }

  async getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    const currentUser = auth.currentUser;
    if (currentUser) {
      headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
    }
    return headers;
  }

  // Initialize service and fetch VAPID public key
  async initialize() {
    if (!this.publicKey) {
      try {
        const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
        const data = await response.json();
        if (data.success && data.publicKey) {
          this.publicKey = data.publicKey;
          console.log("✅ VAPID public key fetched from server");
        } else {
          // Fallback to current server key
          this.publicKey =
            "";
          console.log("⚠️ Using fallback VAPID public key");
        }
      } catch (error) {
        console.error("❌ Failed to fetch VAPID public key:", error);
        // Fallback to current server key
        this.publicKey =
          "";
      }
    }
  }

  // Check if push notifications are supported
  isNotificationSupported() {
    return this.isSupported;
  }

  // Request permission for notifications
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error("Push notifications are not supported");
    }

    // Check current permission status
    let permission = Notification.permission;

    console.log("🔔 Current notification permission:", permission);

    if (permission === "denied") {
      console.log(
        "❌ Notifications are blocked. User needs to manually enable them.",
      );
      throw new Error(
        "Notifications are blocked. Please enable them in your browser settings:\n\n" +
          "Chrome: Click the lock icon → Notifications → Allow\n" +
          "Firefox: Click the shield icon → Permissions → Allow notifications\n" +
          "Edge: Click the lock icon → Notifications → Allow",
      );
    }

    if (permission === "default") {
      console.log("🔔 Requesting notification permission...");
      permission = await Notification.requestPermission();
    }

    if (permission === "granted") {
      console.log("✅ Push notification permission granted");
      return true;
    } else if (permission === "denied") {
      console.log("❌ Push notification permission denied");
      return false;
    } else {
      console.log("⏳ Push notification permission dismissed");
      return false;
    }
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.isSupported) return "unsupported";
    return Notification.permission;
  }

  // Subscribe to push notifications
  async subscribe() {
    try {
      if (!this.isSupported) {
        throw new Error("Push notifications are not supported");
      }

      // Initialize and fetch VAPID key if needed
      await this.initialize();
      if (!this.publicKey) {
        throw new Error("Push notifications are not configured on the server");
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey),
      });

      this.subscription = subscription;

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      console.log("✅ Push notification subscription created");
      return subscription;
    } catch (error) {
      console.error("❌ Failed to subscribe to push notifications:", error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      if (!this.subscription) {
        const registration = await navigator.serviceWorker.ready;
        this.subscription = await registration.pushManager.getSubscription();
      }

      if (this.subscription) {
        await this.subscription.unsubscribe();
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
        console.log("✅ Push notification subscription removed");
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Failed to unsubscribe from push notifications:", error);
      throw error;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${API_URL}/notifications/subscribe`, {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send subscription to server");
      }

      console.log("✅ Subscription sent to server");
    } catch (error) {
      console.error("❌ Failed to send subscription to server:", error);
      throw error;
    }
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(subscription) {
    try {
      const response = await fetch(`${API_URL}/notifications/unsubscribe`, {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove subscription from server");
      }

      console.log("✅ Subscription removed from server");
    } catch (error) {
      console.error("❌ Failed to remove subscription from server:", error);
      throw error;
    }
  }

  // Show local notification (for testing)
  showLocalNotification(title, options = {}) {
    if (!this.isSupported) {
      console.warn("Notifications not supported");
      return;
    }

    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: options.body || "You have a new notification",
        icon: options.icon || "/icons/icon-192x192.png",
        badge: options.badge || "/icons/icon-72x72.png",
        tag: options.tag || "default",
        data: options.data || {},
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get subscription status
  async getSubscriptionStatus() {
    try {
      if (!this.isSupported) {
        return {
          supported: false,
          subscribed: false,
          permission: "unsupported",
        };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      return {
        supported: true,
        subscribed: !!subscription,
        permission: Notification.permission,
        subscription: subscription ? subscription.toJSON() : null,
      };
    } catch (error) {
      console.error("Failed to get subscription status:", error);
      return { supported: false, subscribed: false, permission: "error" };
    }
  }
}

// Notification types for different scenarios
export const NotificationTypes = {
  ORDER_STATUS: "order_status",
  FLASH_SALE: "flash_sale",
  BACK_IN_STOCK: "back_in_stock",
  ABANDONED_CART: "abandoned_cart",
  WISHLIST_SALE: "wishlist_sale",
  NEW_PRODUCT: "new_product",
  REVIEW_REMINDER: "review_reminder",
};

// Predefined notification templates
export const NotificationTemplates = {
  [NotificationTypes.ORDER_STATUS]: {
    title: "Order Update",
    body: "Your order status has been updated",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "order-update",
  },
  [NotificationTypes.FLASH_SALE]: {
    title: "⚡ Flash Sale Alert!",
    body: "Limited time offer on your favorite products",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "flash-sale",
  },
  [NotificationTypes.BACK_IN_STOCK]: {
    title: "📦 Back in Stock!",
    body: "The item you wanted is now available",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "back-in-stock",
  },
  [NotificationTypes.ABANDONED_CART]: {
    title: "🛒 Don't forget your cart!",
    body: "You have items waiting for you",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "abandoned-cart",
  },
};

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
