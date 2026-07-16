const crypto = require("crypto");
const { ObjectId } = require("mongodb");

const PROVIDER = "amiyo_delivery";
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const hasValue = (value) => String(value || "").trim().length > 0;
const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toObjectId = (value) => {
  const normalized = normalizeId(value);
  return normalized && ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
};

const orderQuery = (orderId) => {
  const normalized = normalizeId(orderId);
  const objectId = toObjectId(normalized);
  const branches = [
    { orderNumber: normalized },
    { invoiceNumber: normalized },
    { deliveryOrderId: normalized },
  ];
  if (objectId) branches.unshift({ _id: objectId });
  return { $or: branches };
};

const compact = (source = {}) =>
  Object.entries(source).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const getNested = (source, paths = []) => {
  for (const path of paths) {
    const value = String(path)
      .split(".")
      .reduce((current, key) => (current === undefined || current === null ? undefined : current[key]), source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const normalizePhone = (value = "") => String(value || "").replace(/[^\d+]/g, "");

const buildAddressText = (address = {}) =>
  [
    address.name,
    address.phone,
    address.details,
    address.address,
    address.line1,
    address.area,
    address.union,
    address.upazila,
    address.district || address.city,
    address.division,
    address.zipCode || address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

const addressGeo = (address = {}) => {
  const lat = address.lat ?? address.latitude ?? address.geo?.lat ?? address.location?.lat;
  const lng = address.lng ?? address.longitude ?? address.geo?.lng ?? address.location?.lng;
  const formattedAddress = address.formattedAddress || buildAddressText(address);
  return compact({
    lat: lat !== undefined && lat !== null && lat !== "" ? Number(lat) : undefined,
    lng: lng !== undefined && lng !== null && lng !== "" ? Number(lng) : undefined,
    formattedAddress,
  });
};

const deliveryAreaFromAddress = (address = {}) => ({
  division: String(address.division || address.state || address.city || address.district || "Unknown"),
  district: String(address.district || address.city || address.division || "Unknown"),
  upazila: String(address.upazila || address.area || address.city || address.district || "Unknown"),
  union: String(address.union || address.area || address.upazila || address.city || "Unknown"),
});

const normalizeAddressObject = (address = {}) =>
  typeof address === "string" ? { address } : address || {};

const pickupAddressFromVendorOrder = (vendorOrder = {}, index = 0) => {
  const firstProduct = (vendorOrder.products || vendorOrder.items || [])[0] || {};
  const pickup = normalizeAddressObject(
    vendorOrder.pickupAddress ||
      vendorOrder.vendorAddress ||
      firstProduct.pickupAddress ||
      firstProduct.vendorAddress ||
      {}
  );
  const fallbackAddress =
    pickup.address ||
    pickup.details ||
    pickup.formattedAddress ||
    buildAddressText(pickup) ||
    vendorOrder.vendorAddress ||
    `Pickup address pending for ${vendorOrder.vendorName || vendorOrder.shopName || `vendor ${index + 1}`}`;

  return compact({
    name: pickup.name || vendorOrder.vendorName || vendorOrder.shopName || firstProduct.vendorName || firstProduct.shopName || `Vendor ${index + 1}`,
    phone: normalizePhone(pickup.phone || vendorOrder.vendorPhone || firstProduct.vendorPhone || ""),
    address: fallbackAddress,
    division: pickup.division,
    district: pickup.district || pickup.city,
    upazila: pickup.upazila || pickup.area,
    union: pickup.union || pickup.area,
    geo: addressGeo(pickup),
  });
};

const packageCountFromItems = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 1;

const packageWeightFromItems = (items = []) => {
  const total = items.reduce(
    (sum, item) => sum + Number(item.weight || item.packageWeight || 0) * Number(item.quantity || 1),
    0,
  );
  return total > 0 ? round2(total) : 1;
};

const getIntegrationConfig = (env = process.env) => {
  const apiUrl = trimTrailingSlash(env.AMIYO_DELIVERY_API_URL || "");
  const integrationToken = env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "";
  return {
    apiUrl,
    clientUrl: trimTrailingSlash(env.AMIYO_DELIVERY_CLIENT_URL || ""),
    integrationToken,
    outgoingSecret: env.AMIYO_DELIVERY_WEBHOOK_SECRET || integrationToken,
    callbackApiSecret: env.AMIYO_DELIVERY_CALLBACK_API_SECRET || "",
    callbackSecret: env.AMIYO_DELIVERY_CALLBACK_SECRET || env.AMIYO_DELIVERY_CALLBACK_API_SECRET || "",
    timeoutMs: Number(env.AMIYO_DELIVERY_TIMEOUT_MS || 12000),
    maxRetries: Math.max(1, Number(env.AMIYO_DELIVERY_MAX_RETRIES || 3)),
    retryDelayMs: Math.max(0, Number(env.AMIYO_DELIVERY_RETRY_DELAY_MS || 400)),
    callbackToleranceSeconds: Math.max(0, Number(env.AMIYO_DELIVERY_CALLBACK_TOLERANCE_SECONDS || 300)),
    enabled: hasValue(apiUrl) && hasValue(integrationToken),
  };
};

const timingSafeEqualText = (left = "", right = "") => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const hmacSha256 = ({ secret, message }) =>
  crypto.createHmac("sha256", secret).update(message).digest("hex");

const signAmiyoDeliveryPayload = (rawJson, options = {}) => {
  const env = options.env || process.env;
  const config = getIntegrationConfig(env);
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();

  if (!hasValue(config.outgoingSecret)) {
    throw new Error("AMIYO_DELIVERY_WEBHOOK_SECRET or AMIYO_DELIVERY_INTEGRATION_TOKEN is required");
  }

  return {
    timestamp,
    signature: `sha256=${hmacSha256({
      secret: config.outgoingSecret,
      message: `${timestamp}.${rawJson}`,
    })}`,
  };
};

const buildVendorGroupsFromOrder = (order = {}) => {
  const groups = new Map();
  (order.products || []).forEach((item) => {
    const vendorId = normalizeId(item.vendorId) || "platform";
    if (!groups.has(vendorId)) {
      groups.set(vendorId, {
        vendorId: vendorId === "platform" ? null : vendorId,
        vendorName: item.vendorName || item.shopName || "Amiyo-Go",
        shopName: item.shopName || item.vendorName || "Amiyo-Go",
        products: [],
      });
    }
    groups.get(vendorId).products.push(item);
  });
  return [...groups.values()];
};

const mapVendorOrder = (vendorOrder = {}, index = 0) => {
  const products = vendorOrder.products || vendorOrder.items || [];
  return {
    vendorOrderId: normalizeId(vendorOrder._id || vendorOrder.vendorOrderId || vendorOrder.id),
    vendorId: normalizeId(vendorOrder.vendorId) || null,
    vendorName: vendorOrder.vendorName || products[0]?.vendorName || products[0]?.shopName || "Amiyo-Go",
    shopName: vendorOrder.shopName || products[0]?.shopName || products[0]?.vendorName || "Amiyo-Go",
    pickupAddress: vendorOrder.pickupAddress || vendorOrder.vendorAddress || null,
    vendorAddress: vendorOrder.vendorAddress || products[0]?.vendorAddress || null,
    vendorPhone: vendorOrder.vendorPhone || products[0]?.vendorPhone || "",
    subtotal: round2(vendorOrder.subtotal),
    deliveryCharge: round2(vendorOrder.deliveryCharge),
    discount: round2(vendorOrder.totalDiscount || vendorOrder.couponDiscount || vendorOrder.discount),
    totalAmount: round2(vendorOrder.totalAmount || vendorOrder.total),
    paymentStatus: vendorOrder.paymentStatus || "",
    status: vendorOrder.status || "pending",
    note: vendorOrder.vendorNote || vendorOrder.specialInstructions || "",
    sequence: index + 1,
    items: products.map((item) => ({
      productId: normalizeId(item.productId || item._id),
      title: item.title || item.name || item.productName || "Product",
      sku: item.sku || item.variantSku || "",
      quantity: Number(item.quantity || 1),
      weight: Number(item.weight || item.packageWeight || 0),
      unitPrice: round2(item.price),
      totalPrice: round2(Number(item.price || 0) * Number(item.quantity || 1)),
    })),
  };
};

const buildVendorOrdersPayload = (order = {}, options = {}) => {
  const explicitVendorOrders = Array.isArray(options.vendorOrders) ? options.vendorOrders : [];
  if (explicitVendorOrders.length) return explicitVendorOrders.map(mapVendorOrder);

  return buildVendorGroupsFromOrder(order).map((group, index) => {
    const subtotal = group.products.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0,
    );
    const vendorOrderId = normalizeId((order.vendorOrderIds || [])[index]);
    return mapVendorOrder({
      _id: vendorOrderId,
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      shopName: group.shopName,
      products: group.products,
      subtotal,
      totalAmount: subtotal,
      status: "pending",
    }, index);
  });
};

const buildAmiyoDeliveryPayload = (order = {}, options = {}) => {
  const orderId = normalizeId(order._id || order.id || order.orderId);
  const shippingInfo = order.shippingInfo || order.deliveryAddress || {};
  const vendorOrders = buildVendorOrdersPayload(order, options);
  const marketplaceStatus = String(
    options.fulfillmentStatus ||
    options.orderStatus ||
    order.status ||
    "pending",
  ).trim().toLowerCase();
  const syncMode = options.syncMode || (marketplaceStatus === "ready_to_ship" ? "ready_to_ship" : "order_placed");
  const dispatchRequested = Boolean(options.dispatchRequested || marketplaceStatus === "ready_to_ship");
  const readyForPickup = dispatchRequested || ["ready_to_ship", "pickup_ready"].includes(marketplaceStatus);
  const area = deliveryAreaFromAddress(shippingInfo);
  const itemCount = vendorOrders.reduce(
    (sum, vendorOrder) => sum + vendorOrder.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 1), 0),
    0,
  );
  const cod = ["cod", "cash_on_delivery", "cash on delivery"].includes(String(order.paymentMethod || "").toLowerCase());
  const total = round2(order.total ?? order.totalAmount ?? order.finalTotal ?? order.payableTotal);
  const paymentType = cod ? "cod" : "prepaid";
  const deliveryType = ["same_day", "scheduled", "express"].includes(order.deliveryMethod)
    ? order.deliveryMethod
    : "standard";
  const deliveryAddress = shippingInfo.formattedAddress || buildAddressText(shippingInfo) || shippingInfo.address;
  const deliveryVendorOrders = vendorOrders.map((vendorOrder, index) => ({
    vendorOrderId: vendorOrder.vendorOrderId || `${orderId}-vendor-${index + 1}`,
    ...(vendorOrder.vendorId ? { vendorId: vendorOrder.vendorId } : {}),
    pickup: pickupAddressFromVendorOrder(vendorOrder, index),
    area,
    codAmount: paymentType === "cod" ? round2(vendorOrder.totalAmount || 0) : 0,
    deliveryFee: round2(vendorOrder.deliveryCharge || 0),
    paymentType,
    parcelType: "ecommerce",
    deliveryType,
    packageCount: packageCountFromItems(vendorOrder.items),
    packageWeight: packageWeightFromItems(vendorOrder.items),
    specialInstructions: vendorOrder.note || "",
    marketplaceStatus: vendorOrder.status || marketplaceStatus,
    fulfillmentStatus: vendorOrder.status || marketplaceStatus,
    readyForPickup: ["ready_to_ship", "pickup_ready"].includes(vendorOrder.status || marketplaceStatus),
    dispatchRequested,
  }));

  return {
    orderId,
    source: "amiyo_go",
    syncMode,
    marketplaceStatus,
    orderStatus: marketplaceStatus,
    fulfillmentStatus: marketplaceStatus,
    readyForPickup,
    dispatchRequested,
    pickupRequest: dispatchRequested
      ? {
          requestedAt: new Date().toISOString(),
          reason: options.dispatchReason || "ready_to_ship",
          source: options.checkoutSource || syncMode,
        }
      : undefined,
    customer: {
      name: shippingInfo.name || shippingInfo.fullName || "Customer",
      phone: normalizePhone(shippingInfo.phone || shippingInfo.mobile || ""),
      alternatePhone: normalizePhone(shippingInfo.alternatePhone || shippingInfo.secondaryPhone || ""),
      address: deliveryAddress || "Delivery address pending",
      division: area.division,
      district: area.district,
      upazila: area.upazila,
      union: area.union,
      geo: addressGeo(shippingInfo),
    },
    pickup: deliveryVendorOrders[0]?.pickup,
    area,
    vendorOrders: deliveryVendorOrders,
    codAmount: paymentType === "cod" ? total : 0,
    deliveryFee: round2(order.deliveryCharge),
    paymentType,
    parcelType: "ecommerce",
    deliveryType,
    packageCount: itemCount || 1,
    packageWeight: packageWeightFromItems(vendorOrders.flatMap((vendorOrder) => vendorOrder.items || [])),
    specialInstructions: [
      order.specialInstructions,
      options.checkoutSource ? `Checkout source: ${options.checkoutSource}` : "",
      options.shipmentDrafts?.length ? `Shipment drafts: ${options.shipmentDrafts.length}` : "",
    ].filter(Boolean).join("\n"),
  };
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const requestWithRetry = async ({ url, headers, rawJson, config, fetchImpl = global.fetch }) => {
  if (typeof fetchImpl !== "function") {
    const error = new Error("Fetch API is not available in this Node runtime");
    error.retryable = false;
    throw error;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: rawJson,
        signal: controller.signal,
      });
      const json = await parseJsonResponse(response);

      if (response.ok) return json;

      const error = new Error(json.message || json.error || `Amiyo Delivery API failed with ${response.status}`);
      error.statusCode = response.status;
      error.providerResponse = json;
      error.retryable = RETRYABLE_STATUS_CODES.has(response.status);
      lastError = error;

      if (!error.retryable || attempt === config.maxRetries) throw error;
    } catch (error) {
      lastError = error;
      const retryable = error.name === "AbortError" || error.retryable !== false;
      if (!retryable || attempt === config.maxRetries) throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (config.retryDelayMs > 0) await sleep(config.retryDelayMs * attempt);
  }

  throw lastError || new Error("Amiyo Delivery API request failed");
};

const normalizeDeliveryCreateResponse = (response = {}, payload = {}, config = {}) => {
  const data = response.data || response.order || response.deliveryOrder || response.shipments?.[0] || response;
  const trackingId = getNested(response, [
    "trackingId",
    "tracking_id",
    "trackingNumber",
    "tracking_number",
    "tracking.code",
    "tracking.id",
    "trackingIds.0",
    "shipments.0.trackingId",
  ]) || getNested(data, [
    "trackingId",
    "tracking_id",
    "trackingNumber",
    "tracking_number",
    "tracking.code",
    "tracking.id",
  ]);
  const deliveryOrderId = getNested(response, [
    "deliveryOrderId",
    "delivery_order_id",
    "id",
    "_id",
    "deliveryOrderIds.0",
    "shipments.0.deliveryOrderId",
  ]) || getNested(data, [
    "deliveryOrderId",
    "delivery_order_id",
    "id",
    "_id",
  ]);
  const deliveryCode = getNested(response, [
    "deliveryCode",
    "delivery_code",
    "code",
    "deliveryCodes.0",
    "shipments.0.deliveryCode",
  ]) || getNested(data, ["deliveryCode", "delivery_code", "code"]);
  const trackingUrl =
    getNested(response, ["trackingUrl", "tracking_url", "tracking.url"]) ||
    getNested(data, ["trackingUrl", "tracking_url", "tracking.url"]) ||
    (config.clientUrl && trackingId ? `${config.clientUrl}/track/${encodeURIComponent(trackingId)}` : "");

  return {
    deliveryOrderId: deliveryOrderId ? String(deliveryOrderId) : "",
    deliveryCode: deliveryCode ? String(deliveryCode) : "",
    trackingId: trackingId ? String(trackingId) : "",
    trackingUrl,
    deliveryStatus: String(getNested(data, ["deliveryStatus", "delivery_status", "status"]) || "created"),
    pickupManifest: data.pickupManifest || data.pickup_manifest || payload.pickupManifest || null,
    rawResponse: response,
  };
};

const persistDeliveryCreateSuccess = async ({ collection, orderId, normalized, syncMode = "order_placed" }) => {
  if (!collection?.updateOne || !orderId) return null;
  const now = new Date();
  const deliveryStatus = normalized.deliveryStatus || (syncMode === "ready_to_ship" ? "ready_to_ship" : "created");
  const setPatch = compact({
    deliveryProvider: PROVIDER,
    deliveryOrderId: normalized.deliveryOrderId,
    deliveryCode: normalized.deliveryCode,
    trackingId: normalized.trackingId,
    trackingUrl: normalized.trackingUrl,
    deliveryStatus,
    deliverySyncMode: syncMode,
    deliveryCreatedAt: syncMode === "order_placed" ? now : undefined,
    deliveryOrderPlacedSyncedAt: syncMode === "order_placed" ? now : undefined,
    deliveryReadyToShipSyncedAt: syncMode === "ready_to_ship" ? now : undefined,
    deliveryDispatchRequestedAt: syncMode === "ready_to_ship" ? now : undefined,
    deliveryLastSyncedAt: now,
    pickupManifest: normalized.pickupManifest,
    updatedAt: now,
  });
  setPatch.deliveryError = null;

  const eventType = syncMode === "ready_to_ship"
    ? "delivery_ready_to_ship_synced"
    : "delivery_order_synced";

  return collection.updateOne(orderQuery(orderId), {
    $set: setPatch,
    $push: {
      deliveryEvents: {
        type: eventType,
        status: deliveryStatus,
        provider: PROVIDER,
        payload: normalized.rawResponse,
        createdAt: now,
      },
    },
  });
};

const persistDeliveryCreateFailure = async ({ collection, orderId, error }) => {
  if (!collection?.updateOne || !orderId) return null;
  const now = new Date();
  return collection.updateOne(orderQuery(orderId), {
    $set: {
      deliveryProvider: PROVIDER,
      deliveryStatus: "creation_failed",
      deliveryLastSyncedAt: now,
      deliveryError: {
        message: error.message || "Amiyo Delivery creation failed",
        statusCode: error.statusCode || null,
        providerResponse: error.providerResponse || null,
        failedAt: now,
      },
      updatedAt: now,
    },
    $push: {
      deliveryEvents: {
        type: "delivery_order_sync_failed",
        status: "creation_failed",
        provider: PROVIDER,
        message: error.message,
        statusCode: error.statusCode || null,
        createdAt: now,
      },
    },
  });
};

const createAmiyoDeliveryShipment = async (order = {}, options = {}) => {
  const env = options.env || process.env;
  const config = getIntegrationConfig(env);
  const orderId = normalizeId(order._id || order.id || order.orderId);
  const collection = options.orderCollection || options.Order?.collection || options.db?.collection?.("orders");
  const syncMode = options.syncMode || "order_placed";

  if (!config.enabled) {
    return {
      skipped: true,
      reason: "not_configured",
      provider: PROVIDER,
    };
  }

  const payload = buildAmiyoDeliveryPayload(order, options);
  const rawJson = JSON.stringify(payload);
  const signed = signAmiyoDeliveryPayload(rawJson, { env });
  const url = `${config.apiUrl}/api/integrations/amiyo/orders`;

  try {
    const response = await requestWithRetry({
      url,
      rawJson,
      config,
      fetchImpl: options.fetchImpl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": config.integrationToken,
        "x-amiyo-timestamp": signed.timestamp,
        "x-amiyo-signature": signed.signature,
      },
    });
    const normalized = normalizeDeliveryCreateResponse(response, payload, config);
    await persistDeliveryCreateSuccess({ collection, orderId, normalized, syncMode });
    return {
      attempted: true,
      success: true,
      provider: PROVIDER,
      syncMode,
      ...normalized,
    };
  } catch (error) {
    await persistDeliveryCreateFailure({ collection, orderId, error });
    throw error;
  }
};

const resolveVendorOrdersForOrder = async ({ order = {}, orderId, db, VendorOrder, vendorOrders = [] }) => {
  if (Array.isArray(vendorOrders) && vendorOrders.length) return vendorOrders;

  const normalizedOrderId = normalizeId(order._id || orderId);
  if (VendorOrder?.findByParentOrderId) {
    const rows = await VendorOrder.findByParentOrderId(normalizedOrderId);
    if (Array.isArray(rows) && rows.length) return rows;
  }

  if (db?.collection) {
    return db.collection("vendorOrders")
      .find({ parentOrderId: normalizedOrderId })
      .toArray();
  }

  return [];
};

const syncAmiyoDeliveryOrder = async (orderId, options = {}) => {
  const Order = options.Order;
  const db = options.db || Order?.collection?.db;
  const order = options.order || await Order?.findById?.(orderId);

  if (!order) throw new Error("Order not found");

  if (
    order.deliveryOrderId &&
    order.deliveryStatus !== "creation_failed" &&
    !options.forceSync
  ) {
    return { skipped: true, reason: "already_synced", provider: PROVIDER };
  }

  const vendorOrders = await resolveVendorOrdersForOrder({
    order,
    orderId,
    db,
    VendorOrder: options.VendorOrder,
    vendorOrders: options.vendorOrders,
  });

  return createAmiyoDeliveryShipment(order, {
    ...options,
    db,
    Order,
    vendorOrders,
    syncMode: options.syncMode || "order_placed",
    checkoutSource: options.checkoutSource || "order_placed",
    fulfillmentStatus: options.fulfillmentStatus || order.status || "pending",
  });
};

const createAmiyoDeliveryForReadyOrder = async (orderId, options = {}) => {
  const Order = options.Order;
  const db = options.db || Order?.collection?.db;
  const order = options.order || await Order?.findById?.(orderId);

  if (!order) throw new Error("Order not found");
  if (String(order.status || "").trim().toLowerCase() !== "ready_to_ship") {
    return { skipped: true, reason: "order_not_ready_to_ship", provider: PROVIDER };
  }
  const vendorOrders = await resolveVendorOrdersForOrder({
    order,
    orderId,
    db,
    VendorOrder: options.VendorOrder,
    vendorOrders: options.vendorOrders,
  });

  return createAmiyoDeliveryShipment(order, {
    ...options,
    db,
    Order,
    vendorOrders,
    syncMode: "ready_to_ship",
    fulfillmentStatus: "ready_to_ship",
    dispatchRequested: true,
    dispatchReason: "ready_to_ship",
  });
};

const getRawBody = (req = {}) => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8");
  if (typeof req.rawBody === "string") return req.rawBody;
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body || {});
};

const verifyAmiyoDeliveryCallback = (req = {}, options = {}) => {
  const env = options.env || process.env;
  const config = getIntegrationConfig(env);
  const headers = req.headers || {};
  const apiKey = headers["x-api-key"];
  const timestamp = headers["x-amiyo-delivery-timestamp"];
  const signature = headers["x-amiyo-delivery-signature"];

  if (!hasValue(config.callbackApiSecret)) {
    return { ok: false, status: 500, error: "Delivery callback API secret is not configured" };
  }

  if (!apiKey || !timingSafeEqualText(apiKey, config.callbackApiSecret)) {
    return { ok: false, status: 401, error: "Invalid delivery callback API key" };
  }

  if (!timestamp || !signature) {
    return { ok: false, status: 401, error: "Missing delivery callback signature headers" };
  }

  if (config.callbackToleranceSeconds > 0) {
    const timestampSeconds = Number(timestamp);
    const age = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
    if (!Number.isFinite(timestampSeconds) || age > config.callbackToleranceSeconds) {
      return { ok: false, status: 401, error: "Delivery callback signature timestamp is expired" };
    }
  }

  const rawBody = getRawBody(req);
  const expectedSignature = `sha256=${hmacSha256({
    secret: config.callbackSecret,
    message: `${timestamp}.${rawBody}`,
  })}`;

  if (!timingSafeEqualText(signature, expectedSignature)) {
    return { ok: false, status: 401, error: "Invalid delivery callback signature" };
  }

  return { ok: true };
};

const normalizeCallbackStatus = (eventType, payload = {}) => {
  const rawStatus = String(payload.deliveryStatus || payload.status || payload.state || eventType || "").toLowerCase();
  const aliases = {
    status: rawStatus || "status",
    delivered: "delivered",
    failed: "delivery_failed",
    return: "return_to_origin",
    returned: "return_to_origin",
    rto: "return_to_origin",
  };
  const normalized = aliases[eventType] || rawStatus || "status";
  return normalized.replace(/\s+/g, "_");
};

const orderStatusFromDeliveryStatus = (deliveryStatus) => {
  const map = {
    pending: "pending",
    created: "pending",
    assigned: "processing",
    pickup_scheduled: "pickup_scheduled",
    picked_up: "picked_up",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    delivery_failed: "failed_delivery",
    failed: "failed_delivery",
    return_to_origin: "returned",
    returned: "returned",
  };
  return map[deliveryStatus] || null;
};

const patchProductsForStatus = (products = [], orderStatus, payload = {}) => {
  const itemStatus = {
    processing: "processing",
    pickup_scheduled: "pickup_scheduled",
    picked_up: "picked_up",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    failed_delivery: "delivery_failed",
    returned: "returned",
  }[orderStatus];

  if (!itemStatus) return products;
  const now = new Date();
  return products.map((item) => ({
    ...item,
    itemStatus,
    deliveryStatus: itemStatus,
    trackingNumber: payload.trackingId || payload.trackingNumber || item.trackingNumber || null,
    statusUpdatedAt: now,
    ...(itemStatus === "delivered" ? { deliveredAt: payload.deliveredAt ? new Date(payload.deliveredAt) : now } : {}),
  }));
};

const updateRelatedDeliveryRecords = async ({ db, orderId, deliveryStatus, orderStatus, payload, now }) => {
  if (!db?.collection) return;

  const shipmentPatch = compact({
    deliveryProvider: PROVIDER,
    deliveryStatus,
    trackingNumber: payload.trackingId || payload.trackingNumber,
    courierTrackingUrl: payload.trackingUrl,
    courierProvider: PROVIDER,
    courierBookingStatus: "synced",
    updatedAt: now,
  });
  if (orderStatus === "delivered") shipmentPatch.shipmentState = "delivered";
  if (orderStatus === "failed_delivery") shipmentPatch.shipmentState = "delivery_failed";
  if (orderStatus === "returned") shipmentPatch.shipmentState = "return_to_origin";
  if (payload.codState) shipmentPatch.codState = payload.codState;

  await Promise.allSettled([
    db.collection("shipments").updateMany(
      { orderId: normalizeId(orderId), shipmentType: "forward" },
      {
        $set: shipmentPatch,
        $push: {
          events: {
            eventType: `amiyo_delivery.${deliveryStatus}`,
            eventDescription: payload.message || payload.reason || deliveryStatus,
            actor: "amiyo_delivery",
            timestamp: now,
            metadata: payload,
          },
        },
      },
    ),
    db.collection("shipment_events").insertOne({
      shipmentId: null,
      orderId: normalizeId(orderId),
      eventType: `amiyo_delivery.${deliveryStatus}`,
      eventDescription: payload.message || payload.reason || deliveryStatus,
      actor: "amiyo_delivery",
      timestamp: now,
      metadata: payload,
      createdAt: now,
    }),
    db.collection("vendorOrders").updateMany(
      { parentOrderId: normalizeId(orderId) },
      {
        $set: compact({
          deliveryProvider: PROVIDER,
          deliveryStatus,
          trackingId: payload.trackingId || payload.trackingNumber,
          status: orderStatus || undefined,
          updatedAt: now,
        }),
      },
    ),
  ]);
};

const updateOrderFromDeliveryCallback = async (orderId, payload = {}, options = {}) => {
  const db = options.db || options.Order?.collection?.db;
  const collection = options.orderCollection || options.Order?.collection || db?.collection?.("orders");
  if (!collection?.findOne || !collection?.updateOne) {
    throw new Error("Order collection is required for Amiyo Delivery callback updates");
  }

  const query = orderQuery(orderId);
  const order = await collection.findOne(query);
  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const eventType = options.eventType || payload.eventType || "status";
  const deliveryStatus = normalizeCallbackStatus(eventType, payload);
  const orderStatus = orderStatusFromDeliveryStatus(deliveryStatus);
  const setPatch = compact({
    deliveryProvider: PROVIDER,
    deliveryStatus,
    deliveryOrderId: payload.deliveryOrderId || payload.delivery_order_id || order.deliveryOrderId,
    deliveryCode: payload.deliveryCode || payload.delivery_code || order.deliveryCode,
    trackingId: payload.trackingId || payload.tracking_id || payload.trackingNumber || order.trackingId,
    trackingUrl: payload.trackingUrl || payload.tracking_url || order.trackingUrl,
    deliveryLastSyncedAt: now,
    deliveryFailureReason: payload.reason || payload.failureReason,
    deliveryReturnReason: payload.returnReason,
    deliveryPod: payload.pod || payload.proofOfDelivery,
    deliveryCod: payload.cod || payload.codCollection,
    deliveredAt: deliveryStatus === "delivered"
      ? (payload.deliveredAt ? new Date(payload.deliveredAt) : now)
      : undefined,
    returnedAt: deliveryStatus === "return_to_origin"
      ? (payload.returnedAt ? new Date(payload.returnedAt) : now)
      : undefined,
    status: orderStatus || undefined,
    products: orderStatus ? patchProductsForStatus(order.products || [], orderStatus, payload) : undefined,
    updatedAt: now,
  });
  setPatch.deliveryError = null;

  await collection.updateOne(query, {
    $set: setPatch,
    $push: {
      deliveryEvents: {
        type: `delivery_${eventType}`,
        status: deliveryStatus,
        provider: PROVIDER,
        payload,
        createdAt: now,
      },
      ...(orderStatus
        ? {
            statusHistory: {
              status: orderStatus,
              changedAt: now,
              changedBy: PROVIDER,
              note: payload.message || payload.reason || `Delivery callback: ${deliveryStatus}`,
            },
          }
        : {}),
    },
  });

  await updateRelatedDeliveryRecords({
    db,
    orderId: order._id || orderId,
    deliveryStatus,
    orderStatus,
    payload,
    now,
  });

  return {
    orderId: normalizeId(order._id || orderId),
    deliveryStatus,
    orderStatus,
  };
};

module.exports = {
  PROVIDER,
  buildAmiyoDeliveryPayload,
  createAmiyoDeliveryForReadyOrder,
  createAmiyoDeliveryShipment,
  getIntegrationConfig,
  signAmiyoDeliveryPayload,
  syncAmiyoDeliveryOrder,
  updateOrderFromDeliveryCallback,
  verifyAmiyoDeliveryCallback,
  __test__: {
    hmacSha256,
    normalizeDeliveryCreateResponse,
    orderStatusFromDeliveryStatus,
    orderQuery,
  },
};
