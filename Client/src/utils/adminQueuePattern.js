const statusToneMap = {
  active: "success",
  approved: "success",
  clear: "success",
  completed: "success",
  delivered: "success",
  paid: "success",
  replied: "success",
  resolved: "success",
  verified: "success",
  approved_pending_payment: "info",
  assigned: "info",
  in_review: "info",
  in_progress: "info",
  processing: "info",
  escalated: "warning",
  open: "warning",
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

const vendorHasAddress = (vendor = {}) => {
  const address = vendor.address || vendor.shopAddress || vendor.businessAddress || {};
  if (typeof address === "string") return Boolean(address.trim());

  return [
    address.divisionId,
    address.districtId,
    address.upazilaId,
    address.details,
    address.addressLine,
    address.area,
  ].some(Boolean);
};

const vendorHasPayoutDetails = (vendor = {}) =>
  Boolean(
    (vendor.bankName && vendor.bankAccountNumber) ||
      (vendor.mobileBankingProvider && vendor.mobileBankingNumber) ||
      vendor.payoutMethod,
  );

export const getVendorQueueReadiness = (vendor = {}) => {
  const items = [
    { label: "Shop name", done: Boolean(vendor.shopName || vendor.vendorName) },
    { label: "Phone", done: Boolean(vendor.phone || vendor.vendorPhone) },
    { label: "Address", done: vendorHasAddress(vendor) },
    {
      label: "Categories",
      done: Boolean(
        (vendor.allowedCategoryIds || vendor.categories || vendor.requestedCategories || []).length,
      ),
    },
    { label: "Payout details", done: vendorHasPayoutDetails(vendor) },
  ];

  return {
    items,
    completed: items.filter((item) => item.done).length,
    total: items.length,
    missing: items.filter((item) => !item.done).map((item) => item.label),
  };
};

export const normalizeVendorQueueItem = (vendor = {}) => {
  const status = vendor.status || vendor.approvalStatus || "pending";
  const readiness = getVendorQueueReadiness(vendor);

  return {
    id: String(vendor._id || vendor.id || vendor.vendorId || ""),
    type: "vendor",
    title: vendor.shopName || vendor.vendorName || "Unnamed vendor",
    subtitle: vendor.email || vendor.phone || "No contact",
    owner: vendor.ownerName || vendor.userName || vendor.email || "Vendor applicant",
    ownerId: vendor.userId || vendor.ownerId || "",
    status,
    tone: readiness.missing.length ? "warning" : getQueueStatusTone(status),
    riskCount: readiness.missing.length,
    riskLabel: readiness.missing.length
      ? `Missing ${readiness.missing.join(", ")}`
      : "Ready for approval review",
    amount: 0,
    createdAt: vendor.createdAt || vendor.updatedAt || null,
    href: vendor._id ? `/admin/vendors/${vendor._id}` : "",
    searchText: [
      vendor.shopName,
      vendor.vendorName,
      vendor.email,
      vendor.phone,
      status,
      ...(vendor.allowedCategoryIds || vendor.categories || []).map((item) =>
        typeof item === "string" ? item : item?.name || item?.title,
      ),
      ...readiness.missing,
    ].filter(Boolean).join(" "),
    readiness,
    raw: vendor,
  };
};

export const normalizeReviewQueueItem = (review = {}) => {
  const rating = Number(review.rating || 0);
  const status = review.status || review.moderationStatus || (review.adminReply ? "replied" : "pending");
  const risks = [
    rating > 0 && rating <= 2 ? "low rating" : "",
    !review.verified ? "unverified" : "",
    !review.adminReply ? "needs reply" : "",
    review.reportCount || review.flaggedReason || review.flagReason ? "reported" : "",
  ].filter(Boolean);

  return {
    id: String(review._id || review.id || ""),
    type: "review",
    title: review.productTitle || `${rating || "No"} star review`,
    subtitle: review.comment || review.productId || "No review text",
    owner: review.userName || review.customerName || "Anonymous customer",
    ownerId: review.userId || "",
    status,
    tone: risks.includes("reported") ? "danger" : risks.length ? "warning" : getQueueStatusTone(status),
    riskCount: risks.length,
    riskLabel: risks.length ? risks.join(", ") : "No review risk signals",
    amount: 0,
    createdAt: review.createdAt || review.updatedAt || null,
    href: review.productId ? `/product/${review.productId}` : "",
    searchText: [
      review.userName,
      review.customerName,
      review.comment,
      review.productTitle,
      review.productId,
      status,
      ...risks,
    ].filter(Boolean).join(" "),
    raw: review,
  };
};

export const normalizeReturnQueueItem = (returnItem = {}) => {
  const status = returnItem.status || "pending";
  const vendorResponse = returnItem.vendorResponse || "";
  const risks = [
    vendorResponse && vendorResponse !== "approved" ? "vendor disputed" : "",
    returnItem.images?.length ? "customer evidence" : "",
    returnItem.vendorEvidenceImages?.length ? "vendor evidence" : "",
    !returnItem.refundMethod && !returnItem.refundAmount ? "refund method pending" : "",
  ].filter(Boolean);

  return {
    id: String(returnItem._id || returnItem.id || returnItem.returnId || ""),
    type: "return",
    title: returnItem.productTitle || "Return request",
    subtitle: returnItem.reason || returnItem.description || "No reason provided",
    owner: returnItem.userInfo?.name || returnItem.customerName || returnItem.userId || "Customer",
    ownerId: returnItem.userId || "",
    status,
    tone: vendorResponse && vendorResponse !== "approved" ? "danger" : getQueueStatusTone(status),
    riskCount: risks.length,
    riskLabel: risks.length ? risks.join(", ") : "No dispute signals",
    amount: Number(returnItem.refundAmount || returnItem.productPrice || 0),
    createdAt: returnItem.createdAt || returnItem.updatedAt || returnItem.vendorResponseDate || null,
    href: returnItem.vendorId ? `/admin/vendors/${returnItem.vendorId}` : "",
    searchText: [
      returnItem.productTitle,
      returnItem.reason,
      returnItem.description,
      returnItem.userInfo?.name,
      returnItem.userInfo?.email,
      returnItem.vendorShopName,
      vendorResponse,
      status,
      ...risks,
    ].filter(Boolean).join(" "),
    raw: returnItem,
  };
};

export const normalizeSupportQueueItem = (ticket = {}) => {
  const status = ticket.status || "open";
  const priority = ticket.priority || "medium";
  const risks = [
    ["urgent", "high"].includes(String(priority).toLowerCase()) ? `${priority} priority` : "",
    !ticket.assignedTo ? "unassigned" : "",
    ticket.slaBreached || ticket.slaStatus === "breached" ? "SLA breached" : "",
    !(ticket.messages || []).length ? "no conversation" : "",
  ].filter(Boolean);

  return {
    id: String(ticket._id || ticket.id || ticket.ticketId || ""),
    type: "support",
    title: ticket.subject || "Support ticket",
    subtitle: ticket.ticketId || ticket.description || "No ticket reference",
    owner: ticket.customerInfo?.name || ticket.customerName || ticket.customerEmail || "Customer",
    ownerId: ticket.customerId || ticket.userId || "",
    status,
    tone: risks.some((risk) => /urgent|SLA/i.test(risk)) ? "danger" : risks.length ? "warning" : getQueueStatusTone(status),
    riskCount: risks.length,
    riskLabel: risks.length ? risks.join(", ") : "No SLA risk",
    amount: 0,
    createdAt: ticket.updatedAt || ticket.createdAt || null,
    href: ticket.orderId ? `/admin/orders?search=${ticket.orderId}` : "",
    searchText: [
      ticket.ticketId,
      ticket.subject,
      ticket.description,
      ticket.customerInfo?.name,
      ticket.customerInfo?.email,
      ticket.orderId,
      ticket.vendorId,
      ticket.productId,
      status,
      priority,
      ...risks,
    ].filter(Boolean).join(" "),
    raw: ticket,
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
