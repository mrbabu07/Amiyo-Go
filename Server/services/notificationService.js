const {
  sendNotificationByType,
  sendNotification,
} = require("../controllers/notificationController");

class NotificationService {
  // Send order status update notification
  static async sendOrderStatusNotification(userId, orderData) {
    try {
      const statusMessages = {
        pending: "Your order has been received and is being processed",
        processing: "Your order is being prepared for shipment",
        shipped: "Your order has been shipped and is on its way",
        delivered: "Your order has been delivered successfully",
        cancelled: "Your order has been cancelled",
      };

      const notification = {
        title: `Order ${statusMessages[orderData.status] ? "Update" : "Status Changed"}`,
        body:
          statusMessages[orderData.status] ||
          `Your order status is now: ${orderData.status}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `order-${orderData._id}`,
        data: {
          type: "order_status",
          orderId: orderData._id.toString(),
          status: orderData.status,
          url: `/orders`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType("order_status", notification, [
        userId,
      ]);
    } catch (error) {
      console.error("Failed to send order status notification:", error);
      throw error;
    }
  }

  // Send flash sale alert
  static async sendFlashSaleAlert(flashSaleData, userIds = null) {
    try {
      const notification = {
        title: "⚡ Flash Sale Alert!",
        body: `${flashSaleData.title} - ${flashSaleData.discountPercentage}% OFF! Limited time only.`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `flash-sale-${flashSaleData._id}`,
        data: {
          type: "flash_sale",
          flashSaleId: flashSaleData._id.toString(),
          productId: flashSaleData.product?._id?.toString(),
          discount: flashSaleData.discountPercentage,
          url: `/flash-sales`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType("flash_sale", notification, userIds);
    } catch (error) {
      console.error("Failed to send flash sale notification:", error);
      throw error;
    }
  }

  // Send back in stock notification
  static async sendBackInStockNotification(productData, userIds) {
    try {
      const notification = {
        title: "📦 Back in Stock!",
        body: `${productData.title} is now available. Get it before it's gone again!`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `back-in-stock-${productData._id}`,
        data: {
          type: "back_in_stock",
          productId: productData._id.toString(),
          productName: productData.title,
          url: `/product/${productData._id}`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType(
        "back_in_stock",
        notification,
        userIds,
      );
    } catch (error) {
      console.error("Failed to send back in stock notification:", error);
      throw error;
    }
  }

  // Send abandoned cart reminder
  static async sendAbandonedCartReminder(userId, cartData) {
    try {
      const itemCount = cartData.items?.length || 0;
      const notification = {
        title: "🛒 Don't forget your cart!",
        body: `You have ${itemCount} item${itemCount > 1 ? "s" : ""} waiting for you. Complete your purchase now!`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `abandoned-cart-${userId}`,
        data: {
          type: "abandoned_cart",
          userId: userId,
          itemCount: itemCount,
          url: `/cart`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType("abandoned_cart", notification, [
        userId,
      ]);
    } catch (error) {
      console.error("Failed to send abandoned cart notification:", error);
      throw error;
    }
  }

  // Send wishlist item on sale notification
  static async sendWishlistSaleNotification(userId, productData, saleData) {
    try {
      const notification = {
        title: "💝 Wishlist Item on Sale!",
        body: `${productData.title} from your wishlist is now ${saleData.discountPercentage}% off!`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `wishlist-sale-${productData._id}`,
        data: {
          type: "wishlist_sale",
          productId: productData._id.toString(),
          productName: productData.title,
          discount: saleData.discountPercentage,
          url: `/product/${productData._id}`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType("wishlist_sale", notification, [
        userId,
      ]);
    } catch (error) {
      console.error("Failed to send wishlist sale notification:", error);
      throw error;
    }
  }

  // Send new product notification
  static async sendNewProductNotification(productData, categoryUserIds = null) {
    try {
      const notification = {
        title: "🆕 New Product Available!",
        body: `Check out our latest addition: ${productData.title}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `new-product-${productData._id}`,
        data: {
          type: "new_product",
          productId: productData._id.toString(),
          productName: productData.title,
          categoryId: productData.categoryId,
          url: `/product/${productData._id}`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType(
        "new_product",
        notification,
        categoryUserIds,
      );
    } catch (error) {
      console.error("Failed to send new product notification:", error);
      throw error;
    }
  }

  // Send review reminder notification
  static async sendReviewReminder(userId, orderData) {
    try {
      const productCount =
        orderData.products?.length || orderData.items?.length || 0;
      const notification = {
        title: "⭐ How was your experience?",
        body: `Please take a moment to review your recent purchase${productCount > 1 ? "s" : ""}. Your feedback helps others!`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `review-reminder-${orderData._id}`,
        data: {
          type: "review_reminder",
          orderId: orderData._id.toString(),
          productCount: productCount,
          url: `/orders`,
          timestamp: new Date().toISOString(),
        },
      };

      return await sendNotificationByType("review_reminder", notification, [
        userId,
      ]);
    } catch (error) {
      console.error("Failed to send review reminder notification:", error);
      throw error;
    }
  }

  // Schedule abandoned cart reminders
  static scheduleAbandonedCartReminders() {
    // This would typically be called by a cron job or scheduled task
    // For now, we'll create a simple implementation
    console.log("📅 Scheduling abandoned cart reminders...");

    // In a real implementation, you would:
    // 1. Query for carts that haven't been updated in X hours
    // 2. Check if user has abandoned_cart notifications enabled
    // 3. Send reminders at intervals (1 hour, 24 hours, 7 days)

    // This is a placeholder for the actual implementation
    return Promise.resolve();
  }

  // Schedule review reminders
  static scheduleReviewReminders() {
    // This would typically be called by a cron job
    console.log("📅 Scheduling review reminders...");

    // In a real implementation, you would:
    // 1. Query for delivered orders from X days ago
    // 2. Check if products have been reviewed
    // 3. Send reminders to users who haven't reviewed

    return Promise.resolve();
  }
}

module.exports = NotificationService;
