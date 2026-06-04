const emailService = require("../email/emailService");
const smsService = require("../sms/smsService");
const pushService = require("../push/pushService");

async function safe(name, fn) {
  try {
    return await fn();
  } catch (error) {
    return { success: false, channel: name, error: error.message };
  }
}

async function persistNotification(userId, payload, channelResults = {}, app = null) {
  const notification = {
    userId: userId ? String(userId) : null,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    channels: {
      email: channelResults.email || { sent: false },
      sms: channelResults.sms || { sent: false },
      push: channelResults.push || { sent: false },
    },
    read: false,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const Notification = app?.locals?.models?.Notification;
  if (Notification?.create) {
    await Notification.create(notification);
  }
  return notification;
}

const emailOf = (entity = {}) =>
  entity.customerEmail ||
  entity.userEmail ||
  entity.email ||
  entity.shippingInfo?.email ||
  entity.customer?.email ||
  "";

const phoneOf = (entity = {}) =>
  entity.customerPhone ||
  entity.phone ||
  entity.shippingInfo?.phone ||
  entity.customer?.phone ||
  "";

const userIdOf = (entity = {}) => entity.userId || entity.customerId || entity.customer?._id || entity.ownerUserId || null;

async function notify({ app = null, userId, email, phone, type, title, body, data = {}, templateName, templateData = {}, smsMessage }) {
  const results = {};

  if (email && templateName) {
    results.email = await safe("email", () => emailService.sendTemplate(templateName, email, templateData));
  } else if (email) {
    results.email = await safe("email", () => emailService.sendEmail({ to: email, subject: title, html: body, text: body }));
  }

  if (phone && smsMessage) {
    results.sms = await safe("sms", () => smsService.sendSMS(phone, smsMessage));
  }

  if (userId) {
    results.push = await safe("push", () => pushService.sendToUser(userId, { title, body, data: { type, ...data }, url: data.url }));
  }

  await persistNotification(userId, { type, title, body, data }, results, app);
  return { success: true, channels: results };
}

function notifyOrderConfirmed(order, app = null) {
  const orderId = order._id || order.orderId;
  const total = order.finalTotal || order.totalAmount || order.total || 0;
  return notify({
    app,
    userId: userIdOf(order),
    email: emailOf(order),
    phone: phoneOf(order),
    type: "order_confirmed",
    title: "Order confirmed",
    body: `Your Amiyo-Go order #${orderId} is confirmed.`,
    data: { orderId: String(orderId), url: `/orders/${orderId}` },
    templateName: "orderConfirmation",
    templateData: {
      orderId,
      customerName: order.shippingInfo?.name || order.customerName || "Customer",
      items: order.products || order.items || [],
      subtotal: order.subtotal || order.itemsSubtotal || 0,
      deliveryFee: order.deliveryCharge || order.deliveryFee || 0,
      total,
      address: order.shippingInfo?.address || order.deliveryAddress || "",
      estimatedDelivery: order.estimatedDeliveryDate || "",
    },
    smsMessage: `Amiyo-Go order #${orderId} confirmed. Total: BDT ${Math.round(Number(total || 0))}.`,
  });
}

function notifyOrderShipped(order, delivery = {}, app = null) {
  const orderId = order._id || order.orderId;
  return notify({
    app,
    userId: userIdOf(order),
    email: emailOf(order),
    phone: phoneOf(order),
    type: "shipped",
    title: "Order shipped",
    body: `Your Amiyo-Go order #${orderId} has shipped.`,
    data: { orderId: String(orderId), trackingId: delivery.trackingNumber, url: `/orders/${orderId}` },
    templateName: "orderShipped",
    templateData: {
      orderId,
      customerName: order.shippingInfo?.name || order.customerName || "Customer",
      trackingId: delivery.trackingNumber || delivery.trackingId || "",
      riderName: delivery.riderName || "",
      riderPhone: delivery.riderPhone || "",
      trackingUrl: delivery.trackingUrl || "",
    },
    smsMessage: `Amiyo-Go order #${orderId} shipped. Tracking: ${delivery.trackingNumber || "pending"}.`,
  });
}

function notifyOrderDelivered(order, delivery = {}, app = null) {
  const orderId = order._id || order.orderId;
  return notify({
    app,
    userId: userIdOf(order),
    email: emailOf(order),
    phone: phoneOf(order),
    type: "delivered",
    title: "Order delivered",
    body: `Your Amiyo-Go order #${orderId} was delivered.`,
    data: { orderId: String(orderId), url: `/orders/${orderId}` },
    templateName: "orderDelivered",
    templateData: {
      orderId,
      customerName: order.shippingInfo?.name || order.customerName || "Customer",
      deliveredAt: delivery.deliveredAt || new Date().toISOString(),
      reviewUrl: delivery.reviewUrl || `${process.env.APP_URL || ""}/orders/${orderId}`,
    },
    smsMessage: `Amiyo-Go order #${orderId} delivered. Thank you for shopping with us.`,
  });
}

function notifyDeliveryAssigned(delivery, rider, app = null) {
  return notify({
    app,
    userId: rider?.userId || rider?._id,
    phone: rider?.phone,
    type: "delivery_assigned",
    title: "Delivery assigned",
    body: `New delivery assigned: #${delivery.orderId || delivery._id}.`,
    data: { deliveryId: String(delivery._id || ""), orderId: String(delivery.orderId || "") },
    smsMessage: `New Amiyo-Go delivery assigned: #${delivery.orderId || delivery._id}.`,
  });
}

function notifyDeliveryFailed(order, reason, app = null) {
  const orderId = order._id || order.orderId;
  return notify({
    app,
    userId: userIdOf(order),
    email: emailOf(order),
    phone: phoneOf(order),
    type: "delivery_failed",
    title: "Delivery attempt failed",
    body: `Delivery attempt failed for order #${orderId}: ${reason || "Please contact support."}`,
    data: { orderId: String(orderId), reason, url: `/orders/${orderId}` },
    smsMessage: `Delivery failed for Amiyo-Go order #${orderId}. Reason: ${reason || "Contact support"}.`,
  });
}

function notifyVendorApproved(vendor, app = null) {
  return notify({
    app,
    userId: vendor.ownerUserId || vendor.userId,
    email: vendor.email,
    phone: vendor.phone,
    type: "vendor_approved",
    title: "Vendor approved",
    body: `${vendor.shopName || "Your shop"} is approved.`,
    data: { vendorId: String(vendor._id || "") },
    templateName: "vendorApproved",
    templateData: {
      vendorName: vendor.name || vendor.ownerName || vendor.shopName,
      shopName: vendor.shopName,
      dashboardUrl: `${process.env.APP_URL || ""}/vendor`,
    },
    smsMessage: `Your Amiyo-Go shop ${vendor.shopName || ""} is approved.`,
  });
}

function notifyVendorRejected(vendor, reason, app = null) {
  return notify({
    app,
    userId: vendor.ownerUserId || vendor.userId,
    email: vendor.email,
    type: "vendor_rejected",
    title: "Vendor application update",
    body: `${vendor.shopName || "Your shop"} needs updates before approval.`,
    data: { vendorId: String(vendor._id || ""), reason },
    templateName: "vendorRejected",
    templateData: {
      vendorName: vendor.name || vendor.ownerName || vendor.shopName,
      shopName: vendor.shopName,
      reason,
      supportEmail: process.env.SUPPORT_EMAIL,
    },
  });
}

function notifyPayoutProcessed(vendor, payout, app = null) {
  return notify({
    app,
    userId: vendor.ownerUserId || vendor.userId,
    email: vendor.email,
    phone: vendor.phone,
    type: "payout_processed",
    title: "Payout processed",
    body: `Payout of BDT ${Math.round(Number(payout.amount || 0))} processed.`,
    data: { payoutId: String(payout._id || ""), vendorId: String(vendor._id || "") },
    templateName: "payoutProcessed",
    templateData: {
      vendorName: vendor.shopName || vendor.name,
      amount: payout.amount,
      transactionId: payout.transactionId,
      processedAt: payout.processedAt || new Date().toISOString(),
    },
    smsMessage: `Amiyo-Go payout processed: BDT ${Math.round(Number(payout.amount || 0))}.`,
  });
}

function notifyStockAlert(product, vendor, app = null) {
  return notify({
    app,
    userId: vendor.ownerUserId || vendor.userId,
    email: vendor.email,
    type: "stock_alert",
    title: "Stock alert",
    body: `${product.title || product.name} has low stock.`,
    data: { productId: String(product._id || "") },
    templateName: "stockAlert",
    templateData: {
      productName: product.title || product.name,
      currentStock: product.stock,
      productUrl: `${process.env.APP_URL || ""}/product/${product._id}`,
    },
  });
}

function notifyPasswordReset(user, resetLink, app = null) {
  return notify({
    app,
    userId: user._id || user.userId,
    email: user.email,
    type: "password_reset",
    title: "Password reset",
    body: "Use the secure link to reset your password.",
    data: {},
    templateName: "passwordReset",
    templateData: { name: user.name, resetLink, expiresIn: process.env.JWT_EXPIRE || "a short time" },
  });
}

function notifyOTP(user, otp, purpose, app = null) {
  return notify({
    app,
    userId: user._id || user.userId,
    email: user.email,
    phone: user.phone,
    type: "otp",
    title: "Your OTP",
    body: `Your Amiyo-Go OTP is ${otp}.`,
    data: { purpose },
    templateName: "otpEmail",
    templateData: { name: user.name, otp, purpose, expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 5} minutes` },
    smsMessage: `Your Amiyo-Go OTP is ${otp}. Valid for ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.`,
  });
}

module.exports = {
  notifyDeliveryAssigned,
  notifyDeliveryFailed,
  notifyOrderConfirmed,
  notifyOrderDelivered,
  notifyOrderShipped,
  notifyOTP,
  notifyPasswordReset,
  notifyPayoutProcessed,
  notifyStockAlert,
  notifyVendorApproved,
  notifyVendorRejected,
};
