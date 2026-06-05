const getValue = (source, keys = []) => {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], source);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const compactPath = (path = "") => path.replace(/\/{2,}/g, "/");

const sanitizeInternalPath = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || raw === "#") return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return compactPath(raw);
  return compactPath(`/${raw}`);
};

const isGenericPath = (path = "") =>
  [
    "/",
    "/orders",
    "/vendor/orders",
    "/returns",
    "/support",
    "/wishlist",
    "/my-alerts",
    "/products",
    "/cart",
    "/flash-sales",
    "/campaigns",
    "/campaigns/",
    "/product",
    "/product/",
    "/vendor/marketing",
    "/vendor/marketing/campaigns",
    "/vendor/marketing/vouchers",
  ].includes(String(path || "").split("?")[0]);

const withQuery = (path, params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value);
  if (!entries.length) return path;
  const search = new URLSearchParams(entries).toString();
  return `${path}?${search}`;
};

const normalizeType = (notification = {}) => {
  const data = notification.data || {};
  return String(
    notification.type ||
      notification.eventName ||
      data.type ||
      data.eventName ||
      "",
  ).toLowerCase();
};

const resolveEntity = (notification = {}) => {
  const data = notification.data || {};
  const metadata = notification.metadata || {};
  const payload = notification.payload || {};
  const source = { ...data, ...metadata, ...payload, ...notification };

  return {
    direct: sanitizeInternalPath(
      getValue(source, [
        "link",
        "url",
        "actionUrl",
        "targetUrl",
        "deepLink",
        "data.link",
        "data.url",
        "payload.url",
      ]),
    ),
    orderId: getValue(source, ["orderId", "parentOrderId", "data.orderId", "order._id", "order.id"]),
    returnId: getValue(source, ["returnId", "returnRequestId", "data.returnId", "return._id", "return.id"]),
    ticketId: getValue(source, ["ticketId", "supportTicketId", "data.ticketId", "ticket._id", "ticket.id"]),
    productId: getValue(source, ["productId", "listingId", "data.productId", "product._id", "product.id"]),
    campaignSlug: getValue(source, ["campaignSlug", "promotionSlug", "slug", "data.campaignSlug", "campaign.slug"]),
    campaignId: getValue(source, ["campaignId", "promotionId", "data.campaignId", "campaign._id", "campaign.id"]),
    shopSlug: getValue(source, ["shopSlug", "vendorSlug", "data.shopSlug", "data.vendorSlug", "vendor.slug"]),
    vendorId: getValue(source, ["vendorId", "data.vendorId", "vendor._id", "vendor.id"]),
    payoutId: getValue(source, ["payoutId", "data.payoutId"]),
    code: getValue(source, ["code", "couponCode", "voucherCode", "data.code", "data.couponCode", "data.voucherCode"]),
  };
};

const buildNotificationLink = (notification = {}) => {
  const type = normalizeType(notification);
  const entity = resolveEntity(notification);
  const direct = entity.direct;
  const isVendorTarget = type.startsWith("vendor") || direct.startsWith("/vendor/");
  const isAdminTarget = type.startsWith("admin") || direct.startsWith("/admin/");

  if (entity.orderId && isVendorTarget) return `/vendor/orders/${entity.orderId}`;
  if (entity.orderId && !isAdminTarget) return `/orders/${entity.orderId}`;
  if (entity.orderId && isAdminTarget) return withQuery("/admin/orders", { q: entity.orderId });

  if (entity.returnId && isVendorTarget) return `/vendor/returns/${entity.returnId}`;
  if (entity.returnId && isAdminTarget) return withQuery("/admin/returns", { returnId: entity.returnId });
  if (entity.returnId) return withQuery("/returns", { returnId: entity.returnId });

  if (entity.ticketId && isAdminTarget) return withQuery("/admin/support", { ticketId: entity.ticketId });
  if (entity.ticketId) return withQuery("/support", { ticketId: entity.ticketId });

  if (entity.productId && (isVendorTarget || type.includes("stock_alert") || type.includes("moderation"))) {
    return `/vendor/products/${entity.productId}`;
  }
  if (entity.productId) return `/product/${entity.productId}`;

  if (entity.shopSlug) return `/shops/${entity.shopSlug}`;

  if (type.includes("campaign") || type.includes("promotion")) {
    const campaignTarget = entity.campaignSlug || entity.campaignId;
    if (campaignTarget && !isVendorTarget && !isAdminTarget) return `/campaigns/${campaignTarget}`;
    if (isAdminTarget) return "/admin/promotions";
    if (isVendorTarget) return "/vendor/marketing/campaigns";
    return "/flash-sales";
  }

  if (type.includes("flash_sale") || type.includes("flash-sale") || type.includes("flash")) {
    return isAdminTarget ? "/admin/flash-sales" : "/flash-sales";
  }

  if (type.includes("voucher") || type.includes("coupon") || type.includes("offer") || type.includes("promo")) {
    if (isAdminTarget) return "/admin/promotions";
    if (isVendorTarget) return "/vendor/marketing/vouchers";
    return withQuery("/cart", { coupon: entity.code });
  }

  if (type.includes("wishlist") || type.includes("price_drop") || type.includes("back_in_stock")) {
    return entity.productId ? `/product/${entity.productId}` : "/my-alerts";
  }

  if (type.includes("support") || type.includes("ticket")) return "/support";
  if (type.includes("return") || type.includes("refund")) return "/returns";
  if (type.includes("delivery") || type.includes("ship") || type.includes("order") || type.includes("payment")) {
    if (isVendorTarget) return "/vendor/orders";
    if (isAdminTarget) return "/admin/orders";
    return "/orders";
  }
  if (type.includes("payout")) return isAdminTarget ? "/admin/payouts" : "/vendor/finance/payouts";
  if (type.includes("vendor_approved") || type.includes("vendor_rejected")) return "/vendor/dashboard";

  if (direct && !isGenericPath(direct)) return direct;
  return direct || "/notifications";
};

const withResolvedNotificationLink = (notification = {}) => {
  const link = buildNotificationLink(notification);
  return {
    ...notification,
    link,
    url: link,
    data: {
      ...(notification.data || {}),
      url: link,
    },
  };
};

module.exports = {
  buildNotificationLink,
  sanitizeInternalPath,
  withResolvedNotificationLink,
};
