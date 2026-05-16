const { createTransport } = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      const smtpHost = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || "smtp-relay.brevo.com";
      const smtpPort = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || "587", 10);
      const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
      const smtpPass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

      // Check if SMTP credentials are configured
      if (!smtpUser || !smtpPass) {
        console.log(
          "ðŸ“§ Email service initialized (mock mode - no Brevo/SMTP config)",
        );
        return;
      }

      this.transporter = createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("ðŸ“§ Email service error:", error.message);
          this.transporter = null;
        } else {
          console.log("ðŸ“§ Email service initialized successfully");
        }
      });
    } catch (error) {
      console.error("ðŸ“§ Email service initialization failed:", error.message);
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, html) {
    try {
      console.log("ðŸ“§ [EmailService] Attempting to send email:");
      console.log("   To:", to);
      console.log("   Subject:", subject);

      if (!this.transporter) {
        console.log("ðŸ“§ [MOCK] Email not sent - no transporter configured");
        console.log("   Check SMTP credentials in .env file");
        return { success: true, mock: true };
      }

      const mailOptions = {
        from: `${process.env.APP_NAME || "Amiyo Go"} <${process.env.EMAIL_FROM || process.env.APP_EMAIL || process.env.SMTP_USER || process.env.BREVO_SMTP_USER}>`,
        to,
        subject,
        html,
      };

      console.log("ðŸ“§ [EmailService] Sending via SMTP...");
      const info = await this.transporter.sendMail(mailOptions);
      console.log("âœ… [EmailService] Email sent successfully!");
      console.log("   Message ID:", info.messageId);
      console.log("   Response:", info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("âŒ [EmailService] Email send error:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error details:", error);
      return { success: false, error: error.message };
    }
  }

  // Order Confirmation Email
  async sendOrderConfirmation(data) {
    const { userEmail, userName, orderId, orderTotal, items, shippingAddress } =
      data;

    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.product?.name || item.title || "Product"}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ৳${Math.round((item.price || 0) )}
        </td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ðŸŽ‰ Order Confirmed!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for your order! We're excited to get your items to you.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10B981;">
            <h2 style="margin-top: 0; color: #10B981;">Order Details</h2>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Order Total:</strong> ৳${Math.round(orderTotal )}</p>
          </div>
          
          <h3 style="color: #333; margin-top: 30px;">Items Ordered:</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          ${
            shippingAddress
              ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333;">Shipping Address:</h3>
            <p style="margin: 5px 0;">${shippingAddress.name}</p>
            <p style="margin: 5px 0;">${shippingAddress.address}</p>
            <p style="margin: 5px 0;">${shippingAddress.city}, ${shippingAddress.zipCode || ""}</p>
            <p style="margin: 5px 0;">Phone: ${shippingAddress.phone}</p>
          </div>
          `
              : ""
          }
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/orders" 
               style="display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Track Your Order
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Need help? Contact us at ${process.env.APP_EMAIL}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      userEmail,
      `Order Confirmation - #${orderId}`,
      html,
    );
  }

  // Order Status Update Email
  async sendOrderStatusUpdate(data) {
    const { userEmail, userName, orderId, status, trackingNumber } = data;

    const statusMessages = {
      pending: {
        title: "Order Received",
        message: "We've received your order and will process it soon.",
        icon: "ðŸ“¦",
        color: "#F59E0B",
      },
      processing: {
        title: "Order Processing",
        message: "Your order is being prepared for shipment.",
        icon: "âš™ï¸",
        color: "#3B82F6",
      },
      shipped: {
        title: "Order Shipped",
        message: "Your order is on its way!",
        icon: "ðŸšš",
        color: "#8B5CF6",
      },
      delivered: {
        title: "Order Delivered",
        message: "Your order has been delivered. Enjoy!",
        icon: "âœ…",
        color: "#10B981",
      },
      cancelled: {
        title: "Order Cancelled",
        message: "Your order has been cancelled.",
        icon: "âŒ",
        color: "#EF4444",
      },
    };

    const statusInfo = statusMessages[status] || statusMessages.pending;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${statusInfo.color}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${statusInfo.icon} ${statusInfo.title}</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${statusInfo.message}
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${statusInfo.color};">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${status.toUpperCase()}</p>
            ${trackingNumber ? `<p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/orders" 
               style="display: inline-block; background: ${statusInfo.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Questions? Contact us at ${process.env.APP_EMAIL}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      userEmail,
      `Order Update - #${orderId} - ${statusInfo.title}`,
      html,
    );
  }

  // Stock Alert Email
  async sendStockAlert(data) {
    const { userEmail, userName, productTitle, productImage, productUrl } =
      data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ðŸ”” Back in Stock!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName || "there"},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! The product you were waiting for is back in stock.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            ${productImage ? `<img src="${productImage}" alt="${productTitle}" style="max-width: 200px; height: auto; border-radius: 8px; margin-bottom: 15px;">` : ""}
            <h2 style="margin: 10px 0; color: #333;">${productTitle}</h2>
            <p style="color: #666; margin: 10px 0;">Hurry! Limited stock available.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${productUrl || process.env.FRONTEND_URL}" 
               style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Shop Now
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            This is an automated alert based on your stock notification request.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      userEmail,
      `${productTitle} is Back in Stock!`,
      html,
    );
  }

  // Welcome Email
  async sendWelcomeEmail(data) {
    const { userEmail, userName } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ðŸŽ‰ Welcome to ${process.env.APP_NAME}!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Welcome to ${process.env.APP_NAME}! We're thrilled to have you join our community.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #10B981;">ðŸŽ Get Started:</h3>
            <ul style="padding-left: 20px;">
              <li style="margin: 10px 0;">Browse our latest products</li>
              <li style="margin: 10px 0;">Check out flash sales for amazing deals</li>
              <li style="margin: 10px 0;">Earn loyalty points on every purchase</li>
              <li style="margin: 10px 0;">Get free delivery on orders over ৳5,500</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}" 
               style="display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Shopping
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Need help? We're here for you at ${process.env.APP_EMAIL}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      userEmail,
      `Welcome to ${process.env.APP_NAME}!`,
      html,
    );
  }

  // Password Reset Email
  async sendPasswordResetEmail(data) {
    const { userEmail, userName, resetLink } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ðŸ” Password Reset</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              âš ï¸ This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If you didn't request this, please ignore this email. Your password won't change.
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Need help? Contact us at ${process.env.APP_EMAIL}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, "Reset Your Password", html);
  }

  // Return Confirmation Email
  async sendReturnConfirmation(data) {
    const { userEmail, userName, returnId, orderId, reason, refundAmount } =
      data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ðŸ”„ Return Request Received</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We've received your return request and will process it shortly.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
            <h3 style="margin-top: 0; color: #F59E0B;">Return Details:</h3>
            <p style="margin: 5px 0;"><strong>Return ID:</strong> #${returnId}</p>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
            ${refundAmount ? `<p style="margin: 5px 0;"><strong>Refund Amount:</strong> ৳${Math.round(refundAmount )}</p>` : ""}
          </div>
          
          <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1E40AF; font-size: 14px;">
              â„¹ï¸ We'll review your request within 24-48 hours and send you an update.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/returns" 
               style="display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Track Return Status
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Questions? Contact us at ${process.env.APP_EMAIL}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      userEmail,
      `Return Request Confirmed - #${returnId}`,
      html,
    );
  }

  // Low Stock Alert (for admin)
  async sendLowStockAlert(data) {
    const { productTitle, currentStock, productId } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">âš ï¸ Low Stock Alert</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Admin Alert,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            The following product is running low on stock:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #EF4444;">
            <h3 style="margin-top: 0; color: #EF4444;">${productTitle}</h3>
            <p style="margin: 5px 0;"><strong>Current Stock:</strong> ${currentStock} units</p>
            <p style="margin: 5px 0;"><strong>Product ID:</strong> ${productId}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/admin/inventory" 
               style="display: inline-block; background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Manage Inventory
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Â© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      process.env.APP_EMAIL,
      `Low Stock Alert - ${productTitle}`,
      html,
    );
  }

  async sendOtpEmail(data) {
    const { userEmail, userName = "there", otp, purpose = "verification", expiresInMinutes = 10 } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px;">Your ${purpose} code</h2>
        <p>Hi ${userName},</p>
        <p>Use this one-time code to continue:</p>
        <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; background: #f3f4f6; padding: 18px 20px; border-radius: 8px; text-align: center; margin: 22px 0;">${otp}</div>
        <p style="color: #4b5563;">This code expires in ${expiresInMinutes} minutes. If you did not request it, you can ignore this email.</p>
        <p style="color: #6b7280; font-size: 13px;">${process.env.APP_NAME || "Amiyo Go"}</p>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, `${process.env.APP_NAME || "Amiyo Go"} ${purpose} code`, html);
  }

  async sendPayoutNotification(data) {
    const {
      vendorEmail,
      vendorName = "Vendor",
      amount = 0,
      status,
      transactionId = "",
      note = "",
      reason = "",
    } = data;

    const statusLabel = String(status || "updated").replace(/_/g, " ");
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; color: #111827; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px;">Payout ${statusLabel}</h2>
        <p>Hi ${vendorName},</p>
        <p>Your payout has been marked as <strong>${statusLabel}</strong>.</p>
        <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Amount:</strong> ৳${Math.round(Number(amount || 0))}</p>
          ${transactionId ? `<p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>` : ""}
          ${note ? `<p style="margin: 4px 0;"><strong>Note:</strong> ${note}</p>` : ""}
          ${reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${reason}</p>` : ""}
        </div>
        <p style="color: #6b7280;">You can view payout details from your vendor dashboard.</p>
      </body>
      </html>
    `;

    return this.sendEmail(vendorEmail, `Payout ${statusLabel}`, html);
  }
}

module.exports = new EmailService();


