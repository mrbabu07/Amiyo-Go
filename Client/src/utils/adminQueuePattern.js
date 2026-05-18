const statusToneMap = {
  active: "success",
  approved: "success",
  clear: "success",
  completed: "success",
  delivered: "success",
  paid: "success",
  resolved: "success",
  approved_pending_payment: "info",
  assigned: "info",
  in_review: "info",
  processing: "info",
  pending: "warning",
  pending_review: "warning",
  requested: "warning",
  submitted: "warning",
  at_risk: "warning",
  breached: "danger",
  cancelled: "danger",
  disabled: "danger",
  failed: "danger",
  flagged: "danger",
  rejected: "danger",
  suspended: "danger",
  delisted: "danger",
};

export const getQueueStatusTone = (status) => {
  const key = String(status || "pending").toLowerCase().replace(/\s+/g, "_");
  return statusToneMap[key] || "neutral";
};

export const formatQueueDate = (value) => {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  return date.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const normalizeProductQueueItem = (product = {}) => {
  const flags = product.moderationFlags || [];
  const status = product.approvalStatus || product.status || "approved";

  return {
    id: String(product._id || product.id || ""),
    type: "product",
    title: product.title || product.name || "Untitled product",
    subtitle: product.sku ? `SKU ${product.sku}` : product.categoryName || "No SKU",
    owner: product.vendorShopName || product.vendorName || (product.vendorId ? "Vendor" : "Admin product"),
    ownerId: product.vendorId || "",
    status,
    tone: flags.length ? "danger" : getQueueStatusTone(status),
    riskCount: flags.length,
    riskLabel: flags.length ? `${flags.length} moderation flag${flags.length === 1 ? "" : "s"}` : "No moderation flags",
    amount: Number(product.price || 0),
    createdAt: product.submittedAt || product.createdAt || product.updatedAt || null,
    href: product._id ? `/admin/products/edit/${product._id}` : "",
    searchText: [
      product.title,
      product.name,
      product.sku,
      product.categoryName,
      product.vendorShopName,
      product.vendorName,
      status,
      ...flags.map((flag) => flag.message || flag.type),
    ].filter(Boolean).join(" "),
    raw: product,
  };
};

export const normalizePayoutQueueItem = (request = {}) => {
  const status = request.status || "pending";
  const method = request.payoutMethod || request.mobileBankingProvider || "bank";

  return {
    id: String(request._id || request.id || ""),
    type: "payout",
    title: request.vendorName || "Unknown vendor",
    subtitle: `${method} payout request`,
    owner: request.vendorEmail || request.vendorPhone || "No vendor contact",
    ownerId: request.vendorId || "",
    status,
    tone: getQueueStatusTone(status),
    riskCount: Number(request.riskFlags?.length || request.holds?.length || 0),
    riskLabel: request.rejectionReason || request.note || "No risk notes",
    amount: Number(request.amount || 0),
    createdAt: request.requestedAt || request.createdAt || null,
    href: request.vendorId ? `/admin/vendors/${request.vendorId}` : "",
    searchText: [
      request.vendorName,
      request.vendorEmail,
      request.vendorPhone,
      request._id,
      method,
      status,
      request.rejectionReason,
      request.note,
    ].filter(Boolean).join(" "),
    raw: request,
  };
};

export const filterQueueItems = (items = [], filters = {}) => {
  const search = String(filters.search || "").trim().toLowerCase();
  const status = String(filters.status || "all").toLowerCase();
  const type = String(filters.type || "all").toLowerCase();

  return items.filter((item) => {
    if (status !== "all" && String(item.status || "").toLowerCase() !== status) return false;
    if (type !== "all" && String(item.type || "").toLowerCase() !== type) return false;
    if (!search) return true;

    return [
      item.id,
      item.title,
      item.subtitle,
      item.owner,
      item.ownerId,
      item.status,
      item.riskLabel,
      item.searchText,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
};

export const buildQueueSummary = (items = []) =>
  items.reduce((summary, item) => {
    summary.total += 1;
    summary.amount += Number(item.amount || 0);
    summary.byStatus[item.status || "unknown"] = (summary.byStatus[item.status || "unknown"] || 0) + 1;
    summary.byTone[item.tone || "neutral"] = (summary.byTone[item.tone || "neutral"] || 0) + 1;
    if (Number(item.riskCount || 0) > 0 || item.tone === "danger") summary.risk += 1;
    return summary;
  }, {
    total: 0,
    risk: 0,
    amount: 0,
    byStatus: {},
    byTone: {},
  });
