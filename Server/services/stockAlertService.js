const StockAlert = require("../models/StockAlert");
const mongoose = require("mongoose");
const emailService = require("./emailService");
const NotificationService = require("./notificationService");

const productSchema = new mongoose.Schema({}, { strict: false });
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

const getProductTitle = (product = {}) =>
  product.title || product.name || product.productName || "Product";

const getProductUrl = (product = {}) =>
  `${process.env.FRONTEND_URL || ""}/products/${product._id}`;

const markAlertNotified = async (alert) => {
  alert.notified = true;
  alert.notifiedAt = new Date();
  await alert.save();
};

class StockAlertService {
  // Check and send back-in-stock alerts
  async checkBackInStockAlerts(models = null) {
    try {
      // Find products that are now in stock
      const products = await Product.find({ stock: { $gt: 0 } });
      const productIds = products.map((p) => p._id);

      // Find active alerts for these products
      const alerts = await StockAlert.find({
        productId: { $in: productIds },
        alertType: "back_in_stock",
        active: true,
        notified: false,
      }).populate("productId");

      console.log(`Found ${alerts.length} back-in-stock alerts to send`);

      let sentCount = 0;
      for (const alert of alerts) {
        const sent = await this.sendBackInStockEmail(alert, models);
        if (sent) {
          await markAlertNotified(alert);
          sentCount++;
        }
      }

      return sentCount;
    } catch (error) {
      console.error("Error checking back-in-stock alerts:", error);
      return 0;
    }
  }

  // Check and send price drop alerts
  async checkPriceDropAlerts(models = null) {
    try {
      const alerts = await StockAlert.find({
        alertType: "price_drop",
        active: true,
        notified: false,
      }).populate("productId");

      let sentCount = 0;

      for (const alert of alerts) {
        if (alert.productId && alert.productId.price <= alert.priceThreshold) {
          const sent = await this.sendPriceDropEmail(alert, models);
          if (sent) {
            await markAlertNotified(alert);
            sentCount++;
          }
        }
      }

      console.log(`Sent ${sentCount} price drop alerts`);
      return sentCount;
    } catch (error) {
      console.error("Error checking price drop alerts:", error);
      return 0;
    }
  }

  // Check and send low stock warnings to customers
  async checkLowStockAlerts(models = null) {
    try {
      // Find products with low stock (less than 10)
      const lowStockProducts = await Product.find({
        stock: { $gt: 0, $lt: 10 },
      });
      const productIds = lowStockProducts.map((p) => p._id);

      // Find active alerts for these products
      const alerts = await StockAlert.find({
        productId: { $in: productIds },
        alertType: "low_stock",
        active: true,
        notified: false,
      }).populate("productId");

      console.log(`Found ${alerts.length} low stock alerts to send`);

      let sentCount = 0;
      for (const alert of alerts) {
        const sent = await this.sendLowStockEmail(alert, models);
        if (sent) {
          await markAlertNotified(alert);
          sentCount++;
        }
      }

      return sentCount;
    } catch (error) {
      console.error("Error checking low stock alerts:", error);
      return 0;
    }
  }

  // Send back-in-stock email
  async sendBackInStockEmail(alert, models = null) {
    try {
      const product = alert.productId;
      console.log(
        `📧 Sending back-in-stock alert for ${product.name} to ${alert.email}`,
      );

      // Email content
      const emailContent = {
        to: alert.email,
        subject: `${product.name} is back in stock!`,
        html: `
          <h2>Good news! ${product.name} is back in stock</h2>
          <p>The product you were waiting for is now available.</p>
          <p><strong>Price:</strong> $${product.price}</p>
          <p><strong>Stock:</strong> ${product.stock} available</p>
          <a href="${process.env.FRONTEND_URL}/products/${product._id}" 
             style="background: #1e7098; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Product
          </a>
        `,
      };

      const productTitle = getProductTitle(product);
      await emailService.sendStockAlert({
        userEmail: alert.email,
        userName: "there",
        productTitle,
        productImage: product.images?.[0] || product.image || "",
        productUrl: getProductUrl(product),
      });

      if (alert.userId) {
        const productData = product.toObject?.() || product;
        await NotificationService.sendBackInStockNotification(
          { ...productData, title: productTitle },
          [alert.userId],
          models,
        ).catch((error) => console.error("Back-in-stock push failed:", error.message));
      }

      return true;
    } catch (error) {
      console.error("Error sending back-in-stock email:", error);
      return false;
    }
  }

  // Send price drop email
  async sendPriceDropEmail(alert, models = null) {
    try {
      const product = alert.productId;
      const productTitle = getProductTitle(product);
      const discount = (
        ((alert.priceThreshold - product.price) / alert.priceThreshold) *
        100
      ).toFixed(0);

      console.log(
        `📧 Sending price drop alert for ${product.name} to ${alert.email}`,
      );

      const emailContent = {
        to: alert.email,
        subject: `Price drop alert: ${productTitle}`,
        html: `
          <h2>Price Drop Alert!</h2>
          <p>${productTitle} is now available at a lower price.</p>
          <p><strong>New Price:</strong> $${product.price}</p>
          <p><strong>Your Target:</strong> $${alert.priceThreshold}</p>
          <p><strong>You Save:</strong> ${discount}%</p>
          <a href="${getProductUrl(product)}"
             style="background: #1e7098; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Buy Now
          </a>
        `,
      };

      const emailResult = await emailService.sendEmail(
        emailContent.to,
        emailContent.subject,
        emailContent.html,
      );

      if (alert.userId) {
        const productData = product.toObject?.() || product;
        await NotificationService.sendStockAlertNotification(
          "price_drop",
          { ...productData, title: productTitle },
          [alert.userId],
          models,
        ).catch((error) => console.error("Price-drop push failed:", error.message));
      }

      return emailResult?.success !== false;
    } catch (error) {
      console.error("Error sending price drop email:", error);
      return false;
    }
  }

  // Send low stock email
  async sendLowStockEmail(alert, models = null) {
    try {
      const product = alert.productId;
      const productTitle = getProductTitle(product);
      console.log(
        `📧 Sending low stock alert for ${product.name} to ${alert.email}`,
      );

      const emailContent = {
        to: alert.email,
        subject: `Hurry! Only ${product.stock} left: ${productTitle}`,
        html: `
          <h2>Low Stock Alert!</h2>
          <p>${productTitle} is running low on stock.</p>
          <p><strong>Only ${product.stock} left in stock!</strong></p>
          <p>Order now before it's gone.</p>
          <a href="${getProductUrl(product)}"
             style="background: #1e7098; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Order Now
          </a>
        `,
      };

      const emailResult = await emailService.sendEmail(
        emailContent.to,
        emailContent.subject,
        emailContent.html,
      );

      if (alert.userId) {
        const productData = product.toObject?.() || product;
        await NotificationService.sendStockAlertNotification(
          "low_stock",
          { ...productData, title: productTitle },
          [alert.userId],
          models,
        ).catch((error) => console.error("Low-stock push failed:", error.message));
      }

      return emailResult?.success !== false;
    } catch (error) {
      console.error("Error sending low stock email:", error);
      return false;
    }
  }

  // Check all alerts (to be run periodically)
  async checkAllAlerts(models = null) {
    console.log("🔔 Checking all stock alerts...");

    const backInStock = await this.checkBackInStockAlerts(models);
    const priceDrops = await this.checkPriceDropAlerts(models);
    const lowStock = await this.checkLowStockAlerts(models);

    console.log(
      `✅ Alerts sent: ${backInStock} back-in-stock, ${priceDrops} price drops, ${lowStock} low stock`,
    );

    return {
      backInStock,
      priceDrops,
      lowStock,
      total: backInStock + priceDrops + lowStock,
    };
  }
}

module.exports = new StockAlertService();
