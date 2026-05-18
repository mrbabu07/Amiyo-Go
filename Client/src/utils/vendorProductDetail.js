const statusMeta = {
  draft: {
    label: "Draft",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    nextAction: "Submit for moderation",
  },
  pending: {
    label: "Pending moderation",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    nextAction: "Waiting for admin review",
  },
  approved: {
    label: "Live",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    nextAction: "Monitor stock and performance",
  },
  rejected: {
    label: "Rejected",
    tone: "border-red-200 bg-red-50 text-red-700",
    nextAction: "Fix rejection reason and resubmit",
  },
  delisted: {
    label: "Delisted",
    tone: "border-slate-200 bg-slate-100 text-slate-700",
    nextAction: "Edit and reactivate when ready",
  },
  inactive: {
    label: "Delisted",
    tone: "border-slate-200 bg-slate-100 text-slate-700",
    nextAction: "Edit and reactivate when ready",
  },
  out_of_stock: {
    label: "Out of stock",
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    nextAction: "Restock this listing",
  },
};

export const normalizeVendorProductStatus = (product = {}) => {
  if (product.isActive === false || ["inactive", "delisted"].includes(product.status)) {
    return "delisted";
  }
  if (Number(product.stock || 0) <= 0 && !product.allowBackorder) return "out_of_stock";
  return String(
    product.approvalStatus || product.moderationStatus || product.status || "pending",
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

export const getVendorProductStatusMeta = (product = {}) => {
  const status = normalizeVendorProductStatus(product);
  return {
    key: status,
    ...(statusMeta[status] || {
      label: status.replace(/_/g, " ") || "Pending",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      nextAction: "Review listing details",
    }),
  };
};

export const summarizeVendorInventory = (product = {}) => {
  const threshold = Number(product.lowStockThreshold ?? 5);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variantStock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const totalStock = variants.length ? variantStock : Number(product.stock || 0);
  const lowStockVariants = variants.filter((variant) => {
    const stock = Number(variant.stock || 0);
    return stock > 0 && stock <= threshold;
  });
  const outOfStockVariants = variants.filter((variant) => Number(variant.stock || 0) <= 0);

  return {
    threshold,
    totalStock,
    variantCount: variants.length,
    lowStockVariants: lowStockVariants.length,
    outOfStockVariants: outOfStockVariants.length,
    stockState:
      totalStock <= 0
        ? "out"
        : totalStock <= threshold
          ? "low"
          : "healthy",
  };
};

export const getVendorProductQualityChecks = (product = {}) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const seo = product.seo || {};
  const attributes = product.attributes || product.specifications || {};
  const inventory = summarizeVendorInventory(product);

  const checks = [
    {
      id: "images",
      label: "Product images",
      done: images.length > 0,
      detail: images.length ? `${images.length} images uploaded` : "Add at least one clear image",
    },
    {
      id: "description",
      label: "Description",
      done: String(product.description || "").trim().length >= 30,
      detail: "Use at least 30 characters for buyer confidence",
    },
    {
      id: "price",
      label: "Price",
      done: Number(product.price || 0) > 0,
      detail: "Price must be greater than zero",
    },
    {
      id: "category",
      label: "Category",
      done: Boolean(product.categoryId || product.category?._id || product.categoryName),
      detail: "Required for search and commission rules",
    },
    {
      id: "inventory",
      label: "Inventory",
      done: inventory.totalStock > 0 || product.allowBackorder,
      detail: product.allowBackorder ? "Backorder enabled" : "Keep stock above zero",
    },
    {
      id: "seo",
      label: "Search metadata",
      done: Boolean(seo.metaTitle && seo.metaDescription),
      detail: "Add meta title and description",
    },
    {
      id: "attributes",
      label: "Attributes",
      done: Object.keys(attributes).length > 0,
      detail: "Add buyer-facing specifications",
    },
  ];

  const completed = checks.filter((check) => check.done).length;
  return {
    checks,
    completed,
    total: checks.length,
    score: Math.round((completed / checks.length) * 100),
    missing: checks.filter((check) => !check.done),
  };
};

const eventDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pushEvent = (events, type, label, value, note = "") => {
  const at = eventDate(value);
  if (!at) return;
  events.push({
    type,
    label,
    at,
    note,
  });
};

export const buildVendorProductTimeline = (product = {}) => {
  const events = [];

  pushEvent(events, "created", "Listing created", product.createdAt);
  pushEvent(events, "submitted", "Submitted for moderation", product.lastSubmittedAt);
  pushEvent(events, "approved", "Approved for storefront", product.approvedAt);
  pushEvent(events, "rejected", "Rejected by moderation", product.rejectedAt, product.rejectionReason);
  pushEvent(events, "updated", "Last updated", product.updatedAt);

  (product.moderationHistory || []).forEach((item) => {
    pushEvent(
      events,
      item.status || item.action || "moderation",
      String(item.status || item.action || "Moderation update").replace(/_/g, " "),
      item.at || item.createdAt || item.date,
      item.reason || item.note || "",
    );
  });

  (product.editHistory || []).forEach((item) => {
    const fields = Array.isArray(item.changedFields) ? item.changedFields : [];
    const note = [
      fields.length ? `Fields: ${fields.join(", ")}` : "",
      item.requiresReapproval ? "Reapproval required" : "",
      item.staffEmail ? `Staff: ${item.staffEmail}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    pushEvent(
      events,
      item.action || "vendor_edit",
      item.summary || "Vendor edited listing",
      item.at || item.createdAt || item.date,
      item.note || note,
    );
  });

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
};
