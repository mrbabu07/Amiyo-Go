const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const money = (value = 0) => `BDT ${Math.round(Number(value || 0))}`;

const layout = (title, body) => {
  const appName = process.env.APP_NAME || "Amiyo-Go";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#f4f7fb;color:#111827;font-family:Inter,Segoe UI,Noto Sans Bengali,Noto Sans Bengali UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0f172a;color:#ffffff;padding:24px 28px;">
              <div style="font-size:22px;font-weight:800;letter-spacing:0;">${escapeHtml(appName)}</div>
              <div style="font-size:14px;color:#cbd5e1;margin-top:6px;">${escapeHtml(title)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px;">
              This message was sent by ${escapeHtml(appName)}. Need help? Contact ${escapeHtml(process.env.SUPPORT_EMAIL || "support")}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const button = (label, url) =>
  url
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">${escapeHtml(label)}</a></p>`
    : "";

const itemRows = (items = []) =>
  items
    .map((item) => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.title || item.name || item.product?.name || "Product")}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(item.quantity || 1)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.price || item.total || 0)}</td>
    </tr>`)
    .join("");

function orderConfirmation(data = {}) {
  const body = `
    <h1 style="font-size:24px;margin:0 0 14px;">Order confirmed</h1>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(data.customerName || "Customer")}, your order <strong>#${escapeHtml(data.orderId)}</strong> has been received.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px;">
      <thead><tr><th align="left">Item</th><th>Qty</th><th align="right">Price</th></tr></thead>
      <tbody>${itemRows(data.items || [])}</tbody>
    </table>
    <table role="presentation" width="100%" style="margin-top:18px;color:#111827;">
      <tr><td>Subtotal</td><td align="right">${money(data.subtotal)}</td></tr>
      <tr><td>Delivery</td><td align="right">${money(data.deliveryFee)}</td></tr>
      <tr><td style="font-weight:800;padding-top:8px;">Total</td><td align="right" style="font-weight:800;padding-top:8px;">${money(data.total)}</td></tr>
    </table>
    ${data.estimatedDelivery ? `<p style="margin-top:18px;">Estimated delivery: <strong>${escapeHtml(data.estimatedDelivery)}</strong></p>` : ""}
    ${data.address ? `<p style="color:#475569;">Delivery address: ${escapeHtml(data.address)}</p>` : ""}
  `;
  return layout("Order confirmation", body);
}

function orderShipped(data = {}) {
  return layout("Order shipped", `
    <h1 style="font-size:24px;margin:0 0 14px;">Your order is on the way</h1>
    <p>Hi ${escapeHtml(data.customerName || "Customer")}, order <strong>#${escapeHtml(data.orderId)}</strong> has shipped.</p>
    <p>Tracking ID: <strong>${escapeHtml(data.trackingId || "Pending")}</strong></p>
    ${data.riderName ? `<p>Rider: ${escapeHtml(data.riderName)} ${data.riderPhone ? `(${escapeHtml(data.riderPhone)})` : ""}</p>` : ""}
    ${button("Track order", data.trackingUrl)}
  `);
}

function orderDelivered(data = {}) {
  return layout("Order delivered", `
    <h1 style="font-size:24px;margin:0 0 14px;">Delivered successfully</h1>
    <p>Hi ${escapeHtml(data.customerName || "Customer")}, order <strong>#${escapeHtml(data.orderId)}</strong> was delivered${data.deliveredAt ? ` at ${escapeHtml(data.deliveredAt)}` : ""}.</p>
    ${button("Write a review", data.reviewUrl)}
  `);
}

function passwordReset(data = {}) {
  return layout("Password reset", `
    <h1 style="font-size:24px;margin:0 0 14px;">Reset your password</h1>
    <p>Hi ${escapeHtml(data.name || "there")}, use the secure link below. It expires in ${escapeHtml(data.expiresIn || "a short time")}.</p>
    ${button("Reset password", data.resetLink)}
  `);
}

function otpEmail(data = {}) {
  return layout("Your OTP", `
    <h1 style="font-size:24px;margin:0 0 14px;">Verification code</h1>
    <p>Hi ${escapeHtml(data.name || "there")}, your ${escapeHtml(data.purpose || "verification")} OTP is:</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:6px;background:#f1f5f9;border-radius:10px;padding:18px;text-align:center;">${escapeHtml(data.otp)}</div>
    <p>This code expires in ${escapeHtml(data.expiresIn || `${process.env.OTP_EXPIRE_MINUTES || 5} minutes`)}.</p>
  `);
}

function vendorApproved(data = {}) {
  return layout("Vendor approved", `
    <h1 style="font-size:24px;margin:0 0 14px;">Your seller account is approved</h1>
    <p>Hi ${escapeHtml(data.vendorName || data.shopName || "Seller")}, ${escapeHtml(data.shopName || "your shop")} is ready to sell on Amiyo-Go.</p>
    ${button("Open seller center", data.dashboardUrl)}
  `);
}

function vendorRejected(data = {}) {
  return layout("Vendor application update", `
    <h1 style="font-size:24px;margin:0 0 14px;">More work is needed</h1>
    <p>Hi ${escapeHtml(data.vendorName || "Seller")}, ${escapeHtml(data.shopName || "your shop")} was not approved yet.</p>
    <p>Reason: <strong>${escapeHtml(data.reason || "Please contact support for details.")}</strong></p>
    <p>Support: ${escapeHtml(data.supportEmail || process.env.SUPPORT_EMAIL || "")}</p>
  `);
}

function payoutProcessed(data = {}) {
  return layout("Payout processed", `
    <h1 style="font-size:24px;margin:0 0 14px;">Payout processed</h1>
    <p>Hi ${escapeHtml(data.vendorName || "Seller")}, your payout of <strong>${money(data.amount)}</strong> has been processed.</p>
    <p>Transaction ID: <strong>${escapeHtml(data.transactionId || "Pending")}</strong></p>
    ${data.processedAt ? `<p>Processed at: ${escapeHtml(data.processedAt)}</p>` : ""}
  `);
}

function stockAlert(data = {}) {
  return layout("Stock alert", `
    <h1 style="font-size:24px;margin:0 0 14px;">Stock needs attention</h1>
    <p><strong>${escapeHtml(data.productName || "Product")}</strong> has ${escapeHtml(data.currentStock || 0)} units left.</p>
    ${button("View product", data.productUrl)}
  `);
}

function welcomeEmail(data = {}) {
  return layout("Welcome", `
    <h1 style="font-size:24px;margin:0 0 14px;">Welcome to Amiyo-Go</h1>
    <p>Hi ${escapeHtml(data.name || "there")}, your ${escapeHtml(data.role || "customer")} account is ready.</p>
    <p>Email: ${escapeHtml(data.email || "")}</p>
    ${button("Log in", data.loginUrl)}
  `);
}

module.exports = {
  orderConfirmation,
  orderDelivered,
  orderShipped,
  otpEmail,
  passwordReset,
  payoutProcessed,
  stockAlert,
  vendorApproved,
  vendorRejected,
  welcomeEmail,
};
