const statusMeta = {
  needs_response: {
    label: "Needs response",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    nextAction: "Respond with approval, rejection, or evidence",
  },
  pending: {
    label: "Pending admin review",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    nextAction: "Wait for admin decision",
  },
  disputed: {
    label: "Disputed",
    tone: "border-orange-200 bg-orange-50 text-orange-800",
    nextAction: "Admin will compare both sides",
  },
  approved: {
    label: "Approved",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    nextAction: "Deduction will apply to payout",
  },
  rejected: {
    label: "Rejected",
    tone: "border-red-200 bg-red-50 text-red-800",
    nextAction: "No refund deduction is expected",
  },
  processing: {
    label: "Processing",
    tone: "border-violet-200 bg-violet-50 text-violet-800",
    nextAction: "Return is being processed",
  },
  completed: {
    label: "Completed",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    nextAction: "Return case is closed",
  },
  refunded: {
    label: "Refunded",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    nextAction: "Refund has been processed",
  },
};

const cleanKey = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeVendorReturnStatus = (returnItem = {}) => {
  const status = cleanKey(returnItem.status, "pending");
  const vendorResponse = cleanKey(returnItem.vendorResponse);

  if (status === "pending" && !vendorResponse) return "needs_response";
  if (status === "pending" && vendorResponse === "disputed") return "disputed";
  if (vendorResponse === "rejected") return "rejected";
  return status || "pending";
};

export const getVendorReturnStatusMeta = (returnItem = {}) => {
  const key = normalizeVendorReturnStatus(returnItem);
  return {
    key,
    ...(statusMeta[key] || {
      label: key.replace(/_/g, " ") || "Pending",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      nextAction: "Review return case",
    }),
  };
};

export const canVendorRespond = (returnItem = {}) =>
  ["pending", "requested", "submitted"].includes(cleanKey(returnItem.status, "pending")) &&
  !returnItem.vendorResponse;

export const getReasonLabel = (reason) => {
  const labels = {
    defective: "Defective product",
    wrong_item: "Wrong item received",
    not_as_described: "Not as described",
    damaged: "Damaged in shipping",
    missing_parts: "Missing parts",
    changed_mind: "Changed mind",
    size_issue: "Size issue",
    other: "Other",
  };
  return labels[cleanKey(reason)] || String(reason || "Not specified").replace(/_/g, " ");
};

export const getVendorReturnFinancials = (returnItem = {}) => {
  const quantity = Math.max(1, toNumber(returnItem.quantity, 1));
  const unitPrice = toNumber(returnItem.productPrice || returnItem.price);
  const refundAmount = toNumber(returnItem.refundAmount || returnItem.adminRefund, unitPrice * quantity);
  const vendorEarningAmount = toNumber(returnItem.vendorEarningAmount);
  const adminCommissionAmount = toNumber(returnItem.adminCommissionAmount);
  const status = normalizeVendorReturnStatus(returnItem);
  const approvedLike = ["approved", "processing", "completed", "refunded"].includes(status);
  const vendorDeduction = toNumber(
    returnItem.vendorDeduction,
    approvedLike ? vendorEarningAmount : 0,
  );
  const commissionRate = toNumber(returnItem.commissionRateSnapshot);

  return {
    quantity,
    unitPrice,
    refundAmount,
    customerRefund: refundAmount,
    vendorEarningAmount,
    vendorDeduction,
    adminCommissionAmount,
    commissionRate,
    netExposure: vendorDeduction,
    noDeductionExpected: ["rejected", "disputed", "needs_response", "pending"].includes(status),
  };
};

const normalizeEvidence = (item, source, index) => {
  if (!item) return null;
  const raw = typeof item === "string" ? { url: item } : item;
  const url = raw.url || raw.src || raw.path || raw.fileUrl || "";
  const name = raw.name || raw.fileName || raw.originalName || url.split("/").pop() || `Evidence ${index + 1}`;
  const type = raw.type || raw.mimeType || raw.contentType || "";
  const extension = name.split(".").pop()?.toLowerCase();
  const isImage =
    type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(extension);

  return {
    url,
    name,
    type,
    source,
    isImage,
  };
};

const collectEvidence = (items, source) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeEvidence(item, source, index))
    .filter((item) => item?.url);

export const getVendorReturnEvidence = (returnItem = {}) => {
  const customer = [
    ...collectEvidence(returnItem.images, "customer"),
    ...collectEvidence(returnItem.evidenceImages, "customer"),
    ...collectEvidence(returnItem.attachments, "customer"),
  ];
  const vendor = [
    ...collectEvidence(returnItem.vendorEvidenceImages, "vendor"),
    ...collectEvidence(returnItem.vendorEvidenceFiles, "vendor"),
    ...collectEvidence(returnItem.vendorEvidence, "vendor"),
  ];

  return {
    customer,
    vendor,
    hasCustomerEvidence: customer.length > 0,
    hasVendorEvidence: vendor.length > 0,
    total: customer.length + vendor.length,
  };
};

const eventDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pushEvent = (events, type, label, value, note = "", actorRole = "system") => {
  const at = eventDate(value);
  if (!at) return;
  events.push({
    type: cleanKey(type, "update"),
    label,
    at,
    note,
    actorRole,
  });
};

const eventLabel = (event = {}) => {
  if (event.label) return event.label;
  const type = cleanKey(event.status || event.type || event.action, "update");
  const labels = {
    submitted: "Return submitted",
    requested: "Return requested",
    under_review: "Vendor disputed return",
    disputed: "Vendor disputed return",
    approved: "Return approved",
    rejected: "Return rejected",
    processing: "Return processing",
    completed: "Return completed",
    refunded: "Refund processed",
  };
  return labels[type] || type.replace(/_/g, " ");
};

export const buildVendorReturnTimeline = (returnItem = {}) => {
  const events = [];

  (returnItem.timeline || []).forEach((event) => {
    pushEvent(
      events,
      event.status || event.type || event.action,
      eventLabel(event),
      event.at || event.createdAt || event.date,
      event.note || event.reason || "",
      event.actorRole || event.actor || "system",
    );
  });

  pushEvent(events, "submitted", "Return submitted", returnItem.createdAt, returnItem.reason, "customer");
  pushEvent(
    events,
    returnItem.vendorResponse || "vendor_response",
    returnItem.vendorResponse === "disputed"
      ? "Vendor disputed return"
      : returnItem.vendorResponse === "rejected"
        ? "Vendor rejected return"
        : "Vendor responded",
    returnItem.vendorResponseDate,
    returnItem.vendorResponseNotes || returnItem.disputeReason || "",
    "vendor",
  );
  pushEvent(events, "approved", "Return approved", returnItem.approvedAt, returnItem.adminNotes, "admin");
  pushEvent(events, "rejected", "Return rejected", returnItem.rejectedAt, returnItem.adminNotes, "admin");
  pushEvent(
    events,
    "refunded",
    "Refund processed",
    returnItem.refundProcessedAt || returnItem.completedAt || returnItem.refundedAt,
    returnItem.refundMethod,
    "admin",
  );

  const seen = new Set();
  return events
    .filter((event) => {
      const key = `${event.type}:${event.at.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
};
