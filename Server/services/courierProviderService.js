const PROVIDERS = ["manual", "local", "redx", "steadfast"];

const hasValue = (value) => String(value || "").trim().length > 0;
const trimSlash = (value) => String(value || "").replace(/\/+$/, "");
const leadSlash = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.startsWith("/") ? text : `/${text}`;
};

const normalizeProvider = (value) => {
  const text = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (["redx", "redxcourier"].includes(text)) return "redx";
  if (["steadfast", "steadfastcourier", "packzy"].includes(text)) return "steadfast";
  if (["local", "localinstant", "instant"].includes(text)) return "local";
  return "manual";
};

const configuredProviders = (env = process.env) => ({
  redx: hasValue(env.REDX_API_TOKEN || env.REDX_API_KEY),
  steadfast: hasValue(env.STEADFAST_API_KEY) && hasValue(env.STEADFAST_SECRET_KEY || env.STEADFAST_API_SECRET),
});

const getCourierProviderStatus = (env = process.env) => {
  const providers = configuredProviders(env);
  const anyLiveProvider = Object.values(providers).some(Boolean);
  return {
    mode: env.COURIER_API_MODE || (anyLiveProvider ? "live" : "manual"),
    timeoutMs: Number(env.COURIER_API_TIMEOUT_MS || 12000),
    providers: {
      redx: {
        provider: "redx",
        configured: providers.redx,
        status: providers.redx ? "ready" : "missing_credentials",
        baseUrl: env.REDX_API_BASE_URL || "https://openapi.redx.com.bd/v1.0.0-beta",
        createPath: env.REDX_CREATE_PARCEL_PATH || "/parcel",
      },
      steadfast: {
        provider: "steadfast",
        configured: providers.steadfast,
        status: providers.steadfast ? "ready" : "missing_credentials",
        baseUrl: env.STEADFAST_API_BASE_URL || "https://portal.packzy.com/api/v1",
        createPath: env.STEADFAST_CREATE_ORDER_PATH || "/create_order",
      },
      local: {
        provider: "local",
        configured: true,
        status: "manual_dispatch",
      },
      manual: {
        provider: "manual",
        configured: true,
        status: "manual_dispatch",
      },
    },
  };
};

const getNested = (source, paths = []) => {
  for (const path of paths) {
    const value = String(path)
      .split(".")
      .reduce((current, key) => (current === undefined || current === null ? undefined : current[key]), source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const normalizePhone = (value) => String(value || "").replace(/[^\d+]/g, "");

const buildAddressText = (address = {}, fallback = "") =>
  fallback ||
  [
    address.address,
    address.street,
    address.area,
    address.upazila,
    address.district || address.city,
    address.division,
  ]
    .filter(Boolean)
    .join(", ");

const resolveRecipient = (shipment = {}) => {
  const address = shipment.deliveryAddress || {};
  return {
    name: address.name || address.fullName || address.customerName || shipment.customerName || "Customer",
    phone: normalizePhone(address.phone || address.mobile || shipment.customerPhone || ""),
    addressText: buildAddressText(address, shipment.deliveryAddressText),
    area: address.area || address.upazila || address.thana || "",
    district: address.district || address.city || "",
    division: address.division || "",
  };
};

const resolveSender = (shipment = {}) => {
  const address = shipment.pickupAddress || {};
  return {
    name: address.name || address.shopName || shipment.vendorName || "Amiyo-Go vendor",
    phone: normalizePhone(address.phone || address.mobile || shipment.vendorPhone || ""),
    addressText: buildAddressText(address, shipment.pickupAddressText),
  };
};

const resolveMoney = (value) => Math.max(0, Math.round(Number(value || 0)));

const requestJson = async ({ url, headers, body, timeoutMs }) => {
  if (typeof fetch !== "function") {
    const error = new Error("Fetch API is not available in this Node runtime");
    error.statusCode = 500;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let json = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }

    if (!response.ok) {
      const error = new Error(json.message || json.error || `Courier API failed with ${response.status}`);
      error.statusCode = response.status;
      error.providerResponse = json;
      throw error;
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
};

const extractTracking = (provider, response = {}) => {
  const trackingNumber = getNested(response, [
    "tracking_number",
    "trackingNumber",
    "tracking_id",
    "tracking_code",
    "trackingCode",
    "consignment.tracking_code",
    "consignment.trackingCode",
    "data.tracking_number",
    "data.tracking_id",
    "data.tracking_code",
    "data.consignment.tracking_code",
    "result.tracking_number",
  ]);

  const consignmentId = getNested(response, [
    "consignment_id",
    "consignmentId",
    "parcel_id",
    "parcelId",
    "data.consignment_id",
    "data.parcel_id",
    "consignment.consignment_id",
    "consignment.id",
    "id",
  ]);

  return {
    provider,
    providerStatus: getNested(response, ["status", "message", "Message", "data.status"]) || "booked",
    trackingNumber: trackingNumber ? String(trackingNumber) : null,
    consignmentId: consignmentId ? String(consignmentId) : null,
    rawStatus: response.success ?? response.Success ?? response.status ?? null,
  };
};

const TRACKING_STATUS_MAP = {
  created: "created",
  booked: "pickup_scheduled",
  pending: "pickup_scheduled",
  pickup_pending: "pickup_scheduled",
  pickup_scheduled: "pickup_scheduled",
  picked: "picked_up",
  picked_up: "picked_up",
  collected: "picked_up",
  in_transit: "in_transit",
  transit: "in_transit",
  shipped: "in_transit",
  out_for_delivery: "out_for_delivery",
  outfordelivery: "out_for_delivery",
  delivery: "out_for_delivery",
  delivered: "delivered",
  success: "delivered",
  completed: "delivered",
  failed: "delivery_failed",
  delivery_failed: "delivery_failed",
  hold: "delivery_failed",
  cancelled: "return_to_origin",
  canceled: "return_to_origin",
  rto: "return_to_origin",
  return_to_origin: "return_to_origin",
  returned: "return_to_origin",
};

const normalizeTrackingStatus = (value = "") => {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return TRACKING_STATUS_MAP[key] || TRACKING_STATUS_MAP[key.replace(/_/g, "")] || "";
};

const normalizeTrackingEvent = (provider, payload = {}) => {
  const normalizedProvider = normalizeProvider(provider || payload.provider || payload.courierProvider);
  const tracking = extractTracking(normalizedProvider, payload);
  const rawStatus = getNested(payload, [
    "shipmentState",
    "deliveryStatus",
    "status",
    "current_status",
    "tracking_status",
    "data.status",
    "data.current_status",
    "consignment.status",
    "event",
  ]);
  const targetState = normalizeTrackingStatus(rawStatus);
  const outcome =
    targetState === "delivered"
      ? "delivered"
      : targetState === "return_to_origin"
        ? "rto"
        : targetState === "delivery_failed"
          ? "failed"
          : "";

  return {
    provider: normalizedProvider,
    trackingNumber: tracking.trackingNumber || payload.trackingNumber || payload.tracking_number || payload.tracking_id || null,
    consignmentId: tracking.consignmentId || payload.consignmentId || payload.consignment_id || payload.parcel_id || null,
    orderId: payload.orderId || payload.order_id || payload.merchant_invoice_id || payload.invoice || null,
    targetState,
    outcome,
    rawStatus: rawStatus || tracking.providerStatus || "",
    reason: payload.reason || payload.failed_reason || payload.delivery_reason || payload.message || "",
    receiverName: payload.receiverName || payload.receiver_name || payload.pod?.receiverName || "",
    proofUrl: payload.proofUrl || payload.proof_url || payload.pod?.proofUrl || "",
    codCollected: payload.codCollected ?? payload.cod_collected ?? true,
    payload,
  };
};

const buildTrackingUrl = (pattern, trackingNumber) => {
  if (!pattern || !trackingNumber) return "";
  return String(pattern).replace("{trackingNumber}", encodeURIComponent(trackingNumber));
};

const bookRedxShipment = async ({ shipment, courier = {}, env = process.env, payload = {} }) => {
  const token = env.REDX_API_TOKEN || env.REDX_API_KEY;
  if (!hasValue(token)) {
    return { attempted: false, status: "manual_required", warning: "RedX credentials are not configured." };
  }

  const recipient = resolveRecipient(shipment);
  const sender = resolveSender(shipment);
  const url = `${trimSlash(env.REDX_API_BASE_URL || "https://openapi.redx.com.bd/v1.0.0-beta")}${leadSlash(env.REDX_CREATE_PARCEL_PATH || "/parcel")}`;
  const body = {
    customer_name: recipient.name,
    customer_phone: recipient.phone,
    customer_address: recipient.addressText,
    delivery_area: recipient.area || recipient.district || "Bangladesh",
    merchant_invoice_id: shipment.orderId || shipment._id,
    parcel_weight: Number(payload.weight || shipment.weight || 1) || 1,
    cash_collection_amount: resolveMoney(payload.codAmount ?? shipment.codAmount),
    value: resolveMoney(payload.value ?? shipment.codAmount),
    instruction: payload.notes || shipment.packingNotes || "",
    sender_name: sender.name,
    sender_phone: sender.phone,
    sender_address: sender.addressText,
    item_count: Number(shipment.itemCount || 1),
    ...payload.providerPayload,
  };

  const headerName = env.REDX_AUTH_HEADER || "API-ACCESS-TOKEN";
  const response = await requestJson({
    url,
    headers: { [headerName]: token },
    body,
    timeoutMs: Number(env.COURIER_API_TIMEOUT_MS || 12000),
  });
  const normalized = extractTracking("redx", response);
  return {
    attempted: true,
    status: "booked",
    provider: "redx",
    providerResponse: response,
    trackingNumber: normalized.trackingNumber || normalized.consignmentId,
    consignmentId: normalized.consignmentId,
    trackingUrl: buildTrackingUrl(courier.trackingUrlPattern || env.REDX_TRACKING_URL_PATTERN, normalized.trackingNumber || normalized.consignmentId),
  };
};

const bookSteadfastShipment = async ({ shipment, courier = {}, env = process.env, payload = {} }) => {
  const apiKey = env.STEADFAST_API_KEY;
  const secretKey = env.STEADFAST_SECRET_KEY || env.STEADFAST_API_SECRET;
  if (!hasValue(apiKey) || !hasValue(secretKey)) {
    return { attempted: false, status: "manual_required", warning: "Steadfast credentials are not configured." };
  }

  const recipient = resolveRecipient(shipment);
  const url = `${trimSlash(env.STEADFAST_API_BASE_URL || "https://portal.packzy.com/api/v1")}${leadSlash(env.STEADFAST_CREATE_ORDER_PATH || "/create_order")}`;
  const invoice = String(payload.invoice || shipment.orderId || shipment._id || "").slice(0, 120);
  const body = {
    invoice,
    recipient_name: recipient.name,
    recipient_phone: recipient.phone,
    recipient_address: recipient.addressText,
    cod_amount: resolveMoney(payload.codAmount ?? shipment.codAmount),
    note: payload.notes || shipment.packingNotes || "",
    delivery_type: Number(payload.deliveryType ?? 0),
    item_count: Number(shipment.itemCount || 1),
    ...payload.providerPayload,
  };

  const response = await requestJson({
    url,
    headers: {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
    },
    body,
    timeoutMs: Number(env.COURIER_API_TIMEOUT_MS || 12000),
  });
  const normalized = extractTracking("steadfast", response);
  return {
    attempted: true,
    status: "booked",
    provider: "steadfast",
    providerResponse: response,
    trackingNumber: normalized.trackingNumber || normalized.consignmentId,
    consignmentId: normalized.consignmentId,
    trackingUrl: buildTrackingUrl(courier.trackingUrlPattern || env.STEADFAST_TRACKING_URL_PATTERN, normalized.trackingNumber || normalized.consignmentId),
  };
};

const bookShipment = async ({ shipment, courier = {}, env = process.env, payload = {} }) => {
  const provider = normalizeProvider(courier.provider || payload.provider || courier.code || payload.courierCode);
  if (!PROVIDERS.includes(provider) || provider === "manual" || provider === "local") {
    return {
      attempted: false,
      status: provider === "local" ? "local_manual_dispatch" : "manual_dispatch",
      provider,
    };
  }

  if (provider === "redx") return bookRedxShipment({ shipment, courier, env, payload });
  if (provider === "steadfast") return bookSteadfastShipment({ shipment, courier, env, payload });

  return { attempted: false, status: "manual_dispatch", provider: "manual" };
};

const summarizeBookingForStorage = (booking = null) => {
  if (!booking) return null;
  return {
    attempted: booking.attempted === true,
    status: booking.status || "manual_dispatch",
    provider: normalizeProvider(booking.provider),
    trackingNumber: booking.trackingNumber || null,
    consignmentId: booking.consignmentId || null,
    warning: booking.warning || null,
    bookedAt: booking.attempted ? new Date() : null,
  };
};

module.exports = {
  bookShipment,
  getCourierProviderStatus,
  normalizeProvider,
  normalizeTrackingEvent,
  summarizeBookingForStorage,
};
