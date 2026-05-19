const { ObjectId } = require("mongodb");

const SEARCH_LIMIT = 6;

const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const normalizeSearch = (value = "") =>
  String(value || "")
    .trim()
    .replace(/^(?:order|ord|vendor|seller|shop|product|sku|item|return|refund|support|ticket|customer|user)[\s:#-]+/i, "")
    .replace(/^#+/, "")
    .trim();

const asObjectId = (value) => {
  const normalized = normalizeId(value);
  return ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
};

const money = (value) => `BDT ${Number(value || 0).toLocaleString("en-BD")}`;

const dateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const compact = (items = []) => items.filter((item) => item?.value !== undefined && item?.value !== null && item?.value !== "");

const buildIdBranches = (value) => {
  const normalized = normalizeSearch(value);
  const branches = [];
  const objectId = asObjectId(normalized);
  if (objectId) branches.push({ _id: objectId });
  if (/^[a-f0-9]{6,24}$/i.test(normalized)) {
    branches.push({
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: escapeRegExp(normalized),
          options: "i",
        },
      },
    });
  }
  return branches;
};

const buildTextQuery = (query, fields = [], extraBranches = []) => {
  const raw = String(query || "").trim();
  const normalized = normalizeSearch(raw);
  const regex = new RegExp(escapeRegExp(raw), "i");
  const normalizedRegex = new RegExp(escapeRegExp(normalized || raw), "i");
  const branches = [
    ...fields.map((field) => ({ [field]: regex })),
    ...fields.map((field) => ({ [field]: normalizedRegex })),
    ...extraBranches,
    ...buildIdBranches(raw),
  ];

  return { $or: branches };
};

const searchConfigs = {
  order: {
    collection: "orders",
    fields: [
      "orderNumber",
      "invoiceNumber",
      "trackingNumber",
      "transactionId",
      "shippingInfo.name",
      "shippingInfo.email",
      "shippingInfo.phone",
      "products.title",
      "products.name",
      "products.sku",
    ],
    href: (id) => `/admin/orders?search=${encodeURIComponent(id)}`,
    sort: { createdAt: -1 },
  },
  vendor: {
    collection: "vendors",
    fields: ["shopName", "businessName", "storeName", "name", "slug", "email", "phone", "status"],
    href: (id) => `/admin/vendors/${encodeURIComponent(id)}`,
    sort: { createdAt: -1 },
  },
  product: {
    collection: "products",
    fields: ["title", "name", "sku", "description", "brand", "attributes.brand", "vendorName", "shopName"],
    href: (id) => `/admin/products/edit/${encodeURIComponent(id)}`,
    sort: { createdAt: -1 },
  },
  customer: {
    collection: "users",
    fields: ["email", "displayName", "phone", "firebaseUid", "profile.firstName", "profile.lastName", "profile.phone"],
    href: (id) => `/admin/customers?search=${encodeURIComponent(id)}`,
    sort: { createdAt: -1 },
  },
  return: {
    collection: "returns",
    fields: ["reason", "status", "orderId", "productId", "productName", "customerName", "customerEmail"],
    href: (id) => `/admin/returns?search=${encodeURIComponent(id)}`,
    sort: { createdAt: -1 },
  },
  support: {
    collection: "supportTickets",
    fields: ["ticketId", "subject", "status", "priority", "orderId", "customerInfo.email", "customerInfo.name"],
    href: (id) => `/admin/support?search=${encodeURIComponent(id)}`,
    sort: { createdAt: -1 },
  },
};

const getLabel = (doc = {}, type = "") => {
  const id = normalizeId(doc._id);
  if (type === "order") return doc.orderNumber || `#${id.slice(-8)}`;
  if (type === "vendor") return doc.shopName || doc.businessName || doc.storeName || doc.name || `Vendor ${id.slice(-6)}`;
  if (type === "product") return doc.title || doc.name || `Product ${id.slice(-6)}`;
  if (type === "customer") return doc.displayName || [doc.profile?.firstName, doc.profile?.lastName].filter(Boolean).join(" ") || doc.email || `User ${id.slice(-6)}`;
  if (type === "return") return `Return ${id.slice(-8)}`;
  if (type === "support") return doc.ticketId || `Ticket ${id.slice(-8)}`;
  return id;
};

const getSubtitle = (doc = {}, type = "") => {
  if (type === "order") return [doc.shippingInfo?.name, doc.shippingInfo?.phone, money(doc.total ?? doc.totalAmount)].filter(Boolean).join(" - ");
  if (type === "vendor") return [doc.email, doc.phone, doc.slug].filter(Boolean).join(" - ");
  if (type === "product") return [doc.sku || doc.attributes?.sku, money(doc.price), doc.vendorName || doc.shopName].filter(Boolean).join(" - ");
  if (type === "customer") return [doc.email, doc.profile?.phone || doc.phone, doc.role].filter(Boolean).join(" - ");
  if (type === "return") return [doc.productName, doc.reason, money(doc.adminRefund || doc.refundAmount || doc.totalAmount)].filter(Boolean).join(" - ");
  if (type === "support") return [doc.subject, doc.customerInfo?.email, doc.priority].filter(Boolean).join(" - ");
  return "";
};

const getStatus = (doc = {}, type = "") => {
  if (type === "product") return doc.approvalStatus || (doc.isActive === false ? "inactive" : "active");
  return doc.status || doc.paymentStatus || "";
};

const toResult = (doc = {}, type = "") => {
  const id = normalizeId(doc._id);
  const config = searchConfigs[type] || {};
  const status = getStatus(doc, type);
  return {
    id,
    type,
    title: getLabel(doc, type),
    subtitle: getSubtitle(doc, type),
    status,
    href: config.href?.(id) || "/admin",
    detailUrl: `/api/admin/search/${type}/${id}`,
    badges: [
      status ? { label: status, tone: ["rejected", "failed", "cancelled", "suspended"].includes(status) ? "danger" : "neutral" } : null,
      type === "order" && doc.paymentMethod ? { label: doc.paymentMethod, tone: doc.paymentMethod === "cod" ? "warning" : "info" } : null,
      type === "support" && doc.priority ? { label: doc.priority, tone: doc.priority === "high" ? "danger" : "warning" } : null,
    ].filter(Boolean),
    meta: {
      createdAt: dateText(doc.createdAt),
      updatedAt: dateText(doc.updatedAt),
    },
  };
};

const searchType = async (db, type, query, limit = SEARCH_LIMIT) => {
  const config = searchConfigs[type];
  if (!config) return [];

  const docs = await db
    .collection(config.collection)
    .find(buildTextQuery(query, config.fields))
    .sort(config.sort || { createdAt: -1 })
    .limit(Number(limit || SEARCH_LIMIT))
    .toArray();

  return docs.map((doc) => toResult(doc, type));
};

const searchAll = async (db, query, options = {}) => {
  const value = String(query || "").trim();
  if (!value) return { query: value, results: [], grouped: {}, total: 0 };

  const limit = Number(options.limit || SEARCH_LIMIT);
  const types = options.types?.length ? options.types : Object.keys(searchConfigs);
  const groupedEntries = await Promise.all(
    types.map(async (type) => [type, await searchType(db, type, value, limit)]),
  );
  const grouped = Object.fromEntries(groupedEntries);
  const results = groupedEntries.flatMap(([, rows]) => rows).slice(0, Number(options.totalLimit || 24));

  return {
    query: value,
    results,
    grouped,
    total: groupedEntries.reduce((sum, [, rows]) => sum + rows.length, 0),
  };
};

const findById = async (db, type, id) => {
  const config = searchConfigs[type];
  if (!config) return null;

  const normalized = normalizeId(id);
  const objectId = asObjectId(normalized);
  const query = objectId
    ? { _id: objectId }
    : type === "support"
      ? { ticketId: normalized }
      : { _id: normalized };
  return db.collection(config.collection).findOne(query);
};

const buildSections = (doc = {}, type = "") => {
  const id = normalizeId(doc._id);
  if (type === "order") {
    return [
      {
        title: "Order",
        items: compact([
          { label: "Order ID", value: id },
          { label: "Status", value: doc.status },
          { label: "Payment", value: [doc.paymentMethod, doc.paymentStatus].filter(Boolean).join(" / ") },
          { label: "Total", value: money(doc.total ?? doc.totalAmount) },
          { label: "Created", value: dateText(doc.createdAt) },
        ]),
      },
      {
        title: "Customer",
        items: compact([
          { label: "Name", value: doc.shippingInfo?.name },
          { label: "Phone", value: doc.shippingInfo?.phone },
          { label: "Email", value: doc.shippingInfo?.email },
          { label: "Address", value: [doc.shippingInfo?.address, doc.shippingInfo?.area, doc.shippingInfo?.district].filter(Boolean).join(", ") },
        ]),
      },
      {
        title: "Products",
        items: (doc.products || []).slice(0, 8).map((item) => ({
          label: item.sku || item.productId || "Item",
          value: `${item.title || item.name || "Product"} x ${item.quantity || 1} - ${money(Number(item.price || 0) * Number(item.quantity || 1))}`,
        })),
      },
    ];
  }

  if (type === "vendor") {
    return [
      {
        title: "Vendor",
        items: compact([
          { label: "Vendor ID", value: id },
          { label: "Shop", value: doc.shopName || doc.businessName || doc.name },
          { label: "Status", value: doc.status },
          { label: "Email", value: doc.email },
          { label: "Phone", value: doc.phone },
          { label: "Created", value: dateText(doc.createdAt) },
        ]),
      },
      {
        title: "Operations",
        items: compact([
          { label: "KYC", value: doc.kycStatus || doc.verificationStatus },
          { label: "Tier", value: doc.tier || doc.vendorTier },
          { label: "Allowed categories", value: Array.isArray(doc.allowedCategoryIds) ? doc.allowedCategoryIds.length : "" },
        ]),
      },
    ];
  }

  if (type === "product") {
    return [
      {
        title: "Product",
        items: compact([
          { label: "Product ID", value: id },
          { label: "Title", value: doc.title || doc.name },
          { label: "SKU", value: doc.sku || doc.attributes?.sku },
          { label: "Price", value: money(doc.price) },
          { label: "Stock", value: doc.stock },
          { label: "Status", value: getStatus(doc, type) },
        ]),
      },
    ];
  }

  if (type === "customer") {
    return [
      {
        title: "Customer",
        items: compact([
          { label: "User ID", value: id },
          { label: "Name", value: getLabel(doc, type) },
          { label: "Email", value: doc.email },
          { label: "Phone", value: doc.profile?.phone || doc.phone },
          { label: "Role", value: doc.role },
          { label: "Status", value: doc.status },
        ]),
      },
    ];
  }

  if (type === "return") {
    return [
      {
        title: "Return",
        items: compact([
          { label: "Return ID", value: id },
          { label: "Order ID", value: doc.orderId },
          { label: "Product", value: doc.productName || doc.productId },
          { label: "Reason", value: doc.reason },
          { label: "Status", value: doc.status },
          { label: "Refund", value: money(doc.adminRefund || doc.refundAmount || doc.totalAmount) },
          { label: "Vendor deduction", value: money(doc.vendorDeduction) },
        ]),
      },
    ];
  }

  if (type === "support") {
    return [
      {
        title: "Support Ticket",
        items: compact([
          { label: "Ticket ID", value: doc.ticketId || id },
          { label: "Subject", value: doc.subject },
          { label: "Status", value: doc.status },
          { label: "Priority", value: doc.priority },
          { label: "Customer", value: doc.customerInfo?.email || doc.userId },
          { label: "Order ID", value: doc.orderId },
        ]),
      },
    ];
  }

  return [{ title: "Details", items: [{ label: "ID", value: id }] }];
};

const detailActions = (doc = {}, type = "") => {
  const id = normalizeId(doc._id);
  const href = searchConfigs[type]?.href?.(id) || "/admin";
  return [
    { label: "Open workspace", path: href, variant: "primary" },
    type === "order" ? { label: "Open customer view", path: `/orders/${id}`, variant: "secondary" } : null,
  ].filter(Boolean);
};

const getDetail = async (db, type, id) => {
  const doc = await findById(db, type, id);
  if (!doc) return null;
  const result = toResult(doc, type);
  return {
    ...result,
    sections: buildSections(doc, type),
    actions: detailActions(doc, type),
  };
};

module.exports = {
  SEARCH_LIMIT,
  buildTextQuery,
  getDetail,
  normalizeSearch,
  searchAll,
  searchType,
  toResult,
  _test: {
    buildIdBranches,
    buildSections,
    searchConfigs,
  },
};
