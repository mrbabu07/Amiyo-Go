const nodemailer = require("nodemailer");
const templates = require("./templates");

const hasValue = (value) => String(value || "").trim().length > 0;

let smtpTransporter = null;

const getSender = () => ({
  email: process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.SUPPORT_EMAIL || "noreply@amiyo-go.local",
  name: process.env.BREVO_SENDER_NAME || process.env.APP_NAME || "Amiyo-Go",
});

const brevoConfigured = () => hasValue(process.env.BREVO_API_KEY) && hasValue(process.env.BREVO_API_URL);

const smtpConfigured = () =>
  hasValue(process.env.SMTP_HOST) &&
  hasValue(process.env.SMTP_USER) &&
  hasValue(process.env.SMTP_PASS);

const getSmtpTransporter = () => {
  if (!smtpConfigured()) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
};

async function sendViaBrevo({ to, subject, html, text }) {
  const sender = getSender();
  const response = await fetch(process.env.BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender,
      to: Array.isArray(to)
        ? to.map((email) => ({ email }))
        : [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Brevo email failed with ${response.status}`);
  }

  return { success: true, provider: "brevo", messageId: data?.messageId || data?.id || null, raw: data };
}

async function sendViaSmtp({ to, subject, html, text }) {
  const transporter = getSmtpTransporter();
  if (!transporter) return null;
  const sender = getSender();
  const info = await transporter.sendMail({
    from: `${sender.name} <${sender.email}>`,
    to,
    subject,
    html,
    text,
  });
  return { success: true, provider: "smtp", messageId: info.messageId, raw: info };
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    return { success: false, provider: "none", error: "Recipient email is required" };
  }

  try {
    if (brevoConfigured()) return await sendViaBrevo({ to, subject, html, text });
    if (smtpConfigured()) return await sendViaSmtp({ to, subject, html, text });

    console.log("[mock-email]", { to, subject, preview: text || String(html || "").slice(0, 180) });
    return { success: true, provider: "mock", mock: true, messageId: `MOCK-EMAIL-${Date.now()}` };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { success: false, provider: brevoConfigured() ? "brevo" : "smtp", error: error.message };
  }
}

async function sendTemplate(templateName, to, data = {}) {
  const template = templates[templateName];
  if (!template) {
    return { success: false, provider: "template", error: `Unknown email template: ${templateName}` };
  }

  const subjectMap = {
    orderConfirmation: "Your Amiyo-Go order is confirmed",
    orderShipped: "Your Amiyo-Go order has shipped",
    orderDelivered: "Your Amiyo-Go order was delivered",
    passwordReset: "Reset your Amiyo-Go password",
    otpEmail: "Your Amiyo-Go OTP",
    vendorApproved: "Your Amiyo-Go seller account is approved",
    vendorRejected: "Your Amiyo-Go seller application update",
    payoutProcessed: "Your Amiyo-Go payout was processed",
    stockAlert: "Amiyo-Go stock alert",
    welcomeEmail: "Welcome to Amiyo-Go",
  };

  return sendEmail({
    to,
    subject: data.subject || subjectMap[templateName] || "Amiyo-Go notification",
    html: template(data),
    text: data.text || "",
  });
}

module.exports = {
  sendEmail,
  sendTemplate,
  _internals: {
    brevoConfigured,
    smtpConfigured,
  },
};
