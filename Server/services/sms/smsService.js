const hasValue = (value) => String(value || "").trim().length > 0;

const sslWirelessConfigured = () =>
  hasValue(process.env.SSL_WIRELESS_API_TOKEN) &&
  hasValue(process.env.SSL_WIRELESS_SID) &&
  hasValue(process.env.SSL_WIRELESS_BASE_URL);

const twilioConfigured = () =>
  hasValue(process.env.TWILIO_ACCOUNT_SID) &&
  hasValue(process.env.TWILIO_AUTH_TOKEN) &&
  hasValue(process.env.TWILIO_PHONE_NUMBER) &&
  hasValue(process.env.TWILIO_BASE_URL);

function formatBDPhone(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  if (digits.length === 10 && digits.startsWith("1")) return `880${digits}`;
  return digits;
}

async function sendSslWireless(phone, message) {
  const url = `${String(process.env.SSL_WIRELESS_BASE_URL).replace(/\/+$/, "")}/${String(process.env.SSL_WIRELESS_SEND_PATH || "/api/v3/send-sms").replace(/^\/+/, "")}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      api_token: process.env.SSL_WIRELESS_API_TOKEN,
      sid: process.env.SSL_WIRELESS_SID,
      msisdn: phone,
      sms: message,
      csms_id: `AMIYO-${Date.now()}`,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `SSL Wireless failed with ${response.status}`);
  return { success: true, provider: "ssl-wireless", raw: data };
}

async function sendTwilio(phone, message) {
  const baseUrl = String(process.env.TWILIO_BASE_URL).replace(/\/+$/, "");
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${accountSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const url = `${baseUrl}/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: `+${phone}`,
    From: process.env.TWILIO_PHONE_NUMBER,
    Body: message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `Twilio failed with ${response.status}`);
  return { success: true, provider: "twilio", raw: data };
}

async function sendSMS(phone, message) {
  const normalizedPhone = formatBDPhone(phone);
  if (!normalizedPhone) {
    return { success: false, provider: "none", error: "Phone number is required" };
  }

  try {
    if (sslWirelessConfigured()) return await sendSslWireless(normalizedPhone, message);
    if (twilioConfigured()) return await sendTwilio(normalizedPhone, message);
    console.log("[mock-sms]", { to: normalizedPhone, message });
    return { success: true, provider: "mock", mock: true, messageId: `MOCK-SMS-${Date.now()}` };
  } catch (error) {
    console.error("SMS send failed:", error.message);
    return { success: false, provider: sslWirelessConfigured() ? "ssl-wireless" : "twilio", error: error.message };
  }
}

const sendOTP = (phone, otp) =>
  sendSMS(phone, `Your Amiyo-Go OTP is ${otp}. Valid for ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.`);

const sendOrderConfirmation = (phone, orderId, total) =>
  sendSMS(phone, `Amiyo-Go order #${orderId} confirmed. Total: BDT ${Math.round(Number(total || 0))}.`);

const sendDeliveryUpdate = (phone, status, orderId) =>
  sendSMS(phone, `Amiyo-Go delivery update for order #${orderId}: ${status}.`);

const sendDeliveryOTP = (phone, otp) =>
  sendSMS(phone, `Your Amiyo-Go delivery OTP is ${otp}. Valid for ${process.env.DELIVERY_OTP_EXPIRE_MINUTES || 10} minutes.`);

module.exports = {
  formatBDPhone,
  sendDeliveryOTP,
  sendDeliveryUpdate,
  sendOrderConfirmation,
  sendOTP,
  sendSMS,
};
