const { ObjectId } = require("mongodb");

const STATUS_MAP = {
  active: "approved",
  approved: "approved",
  pending: "pending",
  suspended: "suspended",
  rejected: "rejected",
  blacklisted: "blacklisted",
};

const TIER_RULES = [
  { key: "mall_seller", label: "Mall Seller", minGmv: 1000000, minHealth: 90 },
  { key: "star", label: "Star", minGmv: 500000, minHealth: 85 },
  { key: "preferred", label: "Preferred", minGmv: 100000, minHealth: 75 },
  { key: "normal", label: "Normal", minGmv: 0, minHealth: 0 },
];

const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const getVendorObjectId = (id) => {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
};

const getVendorIdValues = (vendorId) => {
  const values = [vendorId.toString()];
  if (ObjectId.isValid(vendorId)) values.push(new ObjectId(vendorId));
  return values;
};

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLineItemsForVendor = (order, vendorIdStrings) => {
  const products = Array.isArray(order.products) ? order.products : [];
  const matches = products.filter((product) => vendorIdStrings.includes(String(product.vendorId)));

  if (matches.length > 0) return matches;
  if (vendorIdStrings.includes(String(order.vendorId))) return products;
  return [];
};

const getLineTotal = (item) => {
  const quantity = Number(item.quantity || item.qty || 1);
  const price = Number(item.price || item.unitPrice || item.totalPrice || 0);
  if (item.lineTotal || item.subtotal) return Number(item.lineTotal || item.subtotal) || 0;
  return price * quantity;
};

const isCancelled = (status) => ["cancelled", "canceled"].includes(String(status || "").toLowerCase());
const isReturned = (status) => ["returned", "return_approved", "refunded"].includes(String(status || "").toLowerCase());

const didShipLate = (order) => {
  if (order.slaBreached || order.shippedLate || order.lateShipment) return true;

  const createdAt = toDate(order.createdAt);
  const shippedAt =
    toDate(order.shippedAt) ||
    toDate(order.readyToShipAt) ||
    toDate(order.statusHistory?.find((entry) => entry.status === "shipped")?.createdAt);

  if (!createdAt || !shippedAt) return false;
  const hours = (shippedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hours > 48;
};

const getActiveViolations = (vendor = {}) =>
  (vendor.violations || []).filter((violation) => violation.status !== "removed" && violation.status !== "void");

const calculateHealth = (vendor, performance) => {
  const warningStrikes = Number(vendor.warningStrikes ?? getActiveViolations(vendor).length);
  const responseRate = Number(performance.responseRate ?? 100);
  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        performance.cancellationRate * 1.5 -
        performance.returnRate * 1.2 -
        performance.lateShipmentRate -
        Math.max(0, 95 - responseRate) * 0.35 -
        warningStrikes * 8,
    ),
  );

  const rounded = Math.round(score);
  const color = rounded >= 85 ? "green" : rounded >= 65 ? "yellow" : "red";

  return {
    score: rounded,
    color,
    warningStrikes,
    responseRate: round2(responseRate),
    lateShipmentRate: round2(performance.lateShipmentRate),
    cancellationRate: round2(performance.cancellationRate),
    returnRate: round2(performance.returnRate),
  };
};

const calculateTier = (gmv, healthScore) =>
  TIER_RULES.find((rule) => gmv >= rule.minGmv && healthScore >= rule.minHealth) || TIER_RULES[TIER_RULES.length - 1];

const buildTrend = (orders, vendorIdStrings, days = 7) => {
  const today = new Date();
  const buckets = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    buckets.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: 0,
      orders: 0,
      cancellations: 0,
      returns: 0,
    });
  }

  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  orders.forEach((order) => {
    const createdAt = toDate(order.createdAt);
    if (!createdAt) return;
    const key = createdAt.toISOString().slice(0, 10);
    const bucket = bucketByKey.get(key);
    if (!bucket) return;

    const items = getLineItemsForVendor(order, vendorIdStrings);
    if (items.length === 0) return;

    bucket.orders += 1;
    if (isCancelled(order.status)) bucket.cancellations += 1;
    if (isReturned(order.status)) bucket.returns += 1;
    if (!isCancelled(order.status)) {
      bucket.revenue += items.reduce((sum, item) => sum + getLineTotal(item), 0);
    }
  });

  return buckets.map((bucket) => ({ ...bucket, revenue: round2(bucket.revenue) }));
};

const buildTopProducts = (orders, vendorIdStrings) => {
  const byProduct = new Map();

  orders.forEach((order) => {
    if (isCancelled(order.status)) return;
    getLineItemsForVendor(order, vendorIdStrings).forEach((item) => {
      const id = String(item.productId || item._id || item.sku || item.name || "unknown");
      const existing = byProduct.get(id) || {
        productId: id,
        title: item.title || item.name || item.productName || "Untitled product",
        sku: item.sku || "",
        unitsSold: 0,
        revenue: 0,
      };
      const quantity = Number(item.quantity || item.qty || 1);
      existing.unitsSold += quantity;
      existing.revenue += getLineTotal(item);
      byProduct.set(id, existing);
    });
  });

  return [...byProduct.values()]
    .map((product) => ({ ...product, revenue: round2(product.revenue) }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 8);
};

const buildPerformance = ({ vendor, orders, returns, reviews, vendorIdStrings }) => {
  let gmv = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let returnedOrders = 0;
  let lateShipments = 0;

  orders.forEach((order) => {
    const items = getLineItemsForVendor(order, vendorIdStrings);
    if (items.length === 0) return;

    if (isCancelled(order.status)) {
      cancelledOrders += 1;
      return;
    }

    completedOrders += 1;
    if (isReturned(order.status)) returnedOrders += 1;
    if (didShipLate(order)) lateShipments += 1;
    gmv += items.reduce((sum, item) => sum + getLineTotal(item), 0);
  });

  const totalOrders = completedOrders + cancelledOrders;
  const returnCount = Math.max(returnedOrders, returns.length);
  const ratings = reviews.map((review) => Number(review.rating)).filter((rating) => rating > 0);
  const averageReviewScore = ratings.length
    ? round2(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length)
    : null;

  return {
    gmv: round2(gmv),
    totalOrders,
    completedOrders,
    cancelledOrders,
    returnedOrders: returnCount,
    responseRate: round2(vendor.performance?.responseRate ?? vendor.responseRate ?? 100),
    lateShipmentRate: totalOrders ? round2((lateShipments / totalOrders) * 100) : 0,
    cancellationRate: totalOrders ? round2((cancelledOrders / totalOrders) * 100) : 0,
    returnRate: totalOrders ? round2((returnCount / totalOrders) * 100) : 0,
    averageReviewScore,
    trend: buildTrend(orders, vendorIdStrings),
    topProducts: buildTopProducts(orders, vendorIdStrings),
  };
};

const pickKycDocuments = (vendor) => {
  const docs = [];
  const pushDoc = (label, value) => {
    if (!value) return;
    docs.push({ label, url: value.url || value.path || value, status: value.status || vendor.kyc?.status || "submitted" });
  };

  pushDoc("NID front", vendor.nidFrontUrl || vendor.kyc?.nidFrontUrl || vendor.kyc?.nidFront);
  pushDoc("NID back", vendor.nidBackUrl || vendor.kyc?.nidBackUrl || vendor.kyc?.nidBack);
  pushDoc("Trade license", vendor.tradeLicenseUrl || vendor.kyc?.tradeLicenseUrl || vendor.kyc?.tradeLicense);
  pushDoc("TIN certificate", vendor.tinCertificateUrl || vendor.kyc?.tinCertificateUrl || vendor.kyc?.tinCertificate);

  return docs;
};

const buildPayoutDetails = (vendor) => ({
  bankName: vendor.bankName || vendor.payoutDetails?.bankName || "",
  bankAccountName: vendor.bankAccountName || vendor.payoutDetails?.accountName || "",
  bankAccountNumber: vendor.bankAccountNumber || vendor.payoutDetails?.accountNumber || "",
  bankBranch: vendor.bankBranch || vendor.payoutDetails?.branchName || "",
  mfsProvider: vendor.mobileBankingProvider || vendor.payoutMethod || "",
  mfsNumber: vendor.mobileBankingNumber || vendor.payoutDetails?.mobileNumber || "",
});

const logVendorAudit = async (db, req, vendorId, action, message, metadata = {}) => {
  const entry = {
    vendorId,
    action,
    message,
    metadata,
    actorUid: req.user?.uid || req.user?.id || "system",
    actorRole: req.user?.role || "admin",
    createdAt: new Date(),
  };
  await db.collection("vendor_audit_logs").insertOne(entry);
  return entry;
};

const buildManagementProfile = async (db, vendorId) => {
  const vendorObjectId = getVendorObjectId(vendorId);
  if (!vendorObjectId) {
    const error = new Error("Invalid vendor ID");
    error.statusCode = 400;
    throw error;
  }

  const vendorsCol = db.collection("vendors");
  const vendor = await vendorsCol.findOne({ _id: vendorObjectId });
  if (!vendor) {
    const error = new Error("Vendor not found");
    error.statusCode = 404;
    throw error;
  }

  const vendorIdValues = getVendorIdValues(vendorObjectId);
  const vendorIdStrings = vendorIdValues.map((value) => String(value));

  const productVendorQuery = {
    $or: [
      { vendorId: { $in: vendorIdValues } },
      { vendor: { $in: vendorIdValues } },
      { sellerId: { $in: vendorIdValues } },
    ],
  };
  const orderVendorQuery = {
    $or: [
      { vendorId: { $in: vendorIdValues } },
      { "products.vendorId": { $in: vendorIdValues } },
    ],
  };
  const reviewVendorQuery = {
    $or: [
      { vendorId: { $in: vendorIdValues } },
      { "vendor._id": { $in: vendorIdValues } },
    ],
  };

  const [products, orders, returns, reviews, auditTrail] = await Promise.all([
    db.collection("products").find(productVendorQuery).sort({ updatedAt: -1 }).limit(200).toArray(),
    db.collection("orders").find(orderVendorQuery).sort({ createdAt: -1 }).limit(500).toArray(),
    db.collection("returns").find({ vendorId: { $in: vendorIdValues } }).sort({ createdAt: -1 }).limit(100).toArray(),
    db.collection("reviews").find(reviewVendorQuery).sort({ createdAt: -1 }).limit(500).toArray(),
    db.collection("vendor_audit_logs").find({ vendorId: vendorObjectId }).sort({ createdAt: -1 }).limit(60).toArray(),
  ]);

  const performance = buildPerformance({ vendor, orders, returns, reviews, vendorIdStrings });
  const health = calculateHealth(vendor, performance);
  const tierRule = calculateTier(performance.gmv, health.score);

  return {
    vendor,
    kyc: {
      status: vendor.kyc?.status || vendor.kycStatus || vendor.verificationLevel || "not_submitted",
      documents: pickKycDocuments(vendor),
    },
    payoutDetails: buildPayoutDetails(vendor),
    tier: {
      current: vendor.tier || "normal",
      mode: vendor.tierMode || "auto",
      calculated: tierRule.key,
      calculatedLabel: tierRule.label,
      thresholds: TIER_RULES,
      updatedAt: vendor.tierUpdatedAt || null,
      note: vendor.tierNote || "",
    },
    commissionOverride: vendor.commissionOverride || null,
    statusControl: {
      status: vendor.status,
      adminStatus: vendor.adminStatus || (vendor.status === "approved" ? "active" : vendor.status),
      note: vendor.statusNote || "",
      vacationModeOverride: Boolean(vendor.vacationMode?.adminOverride),
      blacklistedAt: vendor.blacklistedAt || null,
    },
    health,
    performance,
    violations: getActiveViolations(vendor),
    warningStrikes: health.warningStrikes,
    adminNotices: (vendor.adminNotices || []).slice(-20).reverse(),
    counts: {
      products: products.length,
      liveProducts: products.filter((product) => product.approvalStatus === "approved" || product.status === "live").length,
      orders: performance.totalOrders,
      returns: returns.length,
    },
    recentProducts: products.slice(0, 10),
    recentOrders: orders.slice(0, 10),
    auditTrail,
  };
};

const handleControllerError = (res, error, fallbackMessage) => {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(fallbackMessage, error);
  res.status(status).json({ success: false, error: status >= 500 ? fallbackMessage : error.message });
};

exports.getVendorManagementProfile = async (req, res) => {
  try {
    const profile = await buildManagementProfile(req.app.locals.db, req.params.vendorId);
    res.json({ success: true, data: profile });
  } catch (error) {
    handleControllerError(res, error, "Failed to load vendor management profile");
  }
};

const syncOwnerRole = async (req, vendor, status) => {
  const User = req.app.locals.models?.User;
  if (!User || !vendor?.ownerUserId) return;

  const user = await User.findById(vendor.ownerUserId);
  if (!user?.firebaseUid) return;

  const nextRole = status === "approved" ? "vendor" : "customer";
  if (user.role !== nextRole) await User.updateRole(user.firebaseUid, nextRole, req.user?.uid);
};

exports.updateVendorStatus = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorObjectId = getVendorObjectId(req.params.vendorId);
    if (!vendorObjectId) return res.status(400).json({ success: false, error: "Invalid vendor ID" });

    const requestedStatus = String(req.body.status || "").toLowerCase();
    const status = STATUS_MAP[requestedStatus];
    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status must be one of active, approved, pending, suspended, rejected, blacklisted",
      });
    }

    const vendorsCol = db.collection("vendors");
    const vendor = await vendorsCol.findOne({ _id: vendorObjectId });
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor not found" });

    const now = new Date();
    const $set = {
      status,
      adminStatus: requestedStatus === "active" ? "active" : status,
      statusNote: req.body.note || "",
      statusUpdatedAt: now,
      statusUpdatedBy: req.user?.uid || "admin",
      updatedAt: now,
    };

    if (status === "blacklisted") $set.blacklistedAt = now;
    if (req.body.vacationModeOverride !== undefined) {
      $set["vacationMode.adminOverride"] = Boolean(req.body.vacationModeOverride);
      $set["vacationMode.adminNote"] = req.body.note || "";
      $set["vacationMode.updatedAt"] = now;
      if (req.body.vacationModeOverride) $set.isShopOpen = false;
    }

    await vendorsCol.updateOne({ _id: vendorObjectId }, { $set });
    await syncOwnerRole(req, vendor, status);
    await logVendorAudit(db, req, vendorObjectId, "status_updated", `Vendor status changed to ${status}`, {
      status,
      requestedStatus,
      note: req.body.note || "",
      vacationModeOverride: req.body.vacationModeOverride,
    });

    res.json({
      success: true,
      message: "Vendor status updated",
      data: await buildManagementProfile(db, req.params.vendorId),
    });
  } catch (error) {
    handleControllerError(res, error, "Failed to update vendor status");
  }
};

exports.updateVendorTier = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorObjectId = getVendorObjectId(req.params.vendorId);
    if (!vendorObjectId) return res.status(400).json({ success: false, error: "Invalid vendor ID" });

    const tier = String(req.body.tier || "").toLowerCase();
    if (!TIER_RULES.some((rule) => rule.key === tier)) {
      return res.status(400).json({ success: false, error: "Invalid vendor tier" });
    }

    const now = new Date();
    const result = await db.collection("vendors").updateOne(
      { _id: vendorObjectId },
      {
        $set: {
          tier,
          tierMode: req.body.mode === "auto" ? "auto" : "manual",
          tierNote: req.body.note || "",
          tierUpdatedAt: now,
          tierUpdatedBy: req.user?.uid || "admin",
          updatedAt: now,
        },
      },
    );

    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Vendor not found" });

    await logVendorAudit(db, req, vendorObjectId, "tier_updated", `Vendor tier set to ${tier}`, {
      tier,
      mode: req.body.mode === "auto" ? "auto" : "manual",
      note: req.body.note || "",
    });

    res.json({ success: true, message: "Vendor tier updated", data: await buildManagementProfile(db, req.params.vendorId) });
  } catch (error) {
    handleControllerError(res, error, "Failed to update vendor tier");
  }
};

exports.autoCalculateVendorTier = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const profile = await buildManagementProfile(db, req.params.vendorId);
    const tierRule = calculateTier(profile.performance.gmv, profile.health.score);

    await db.collection("vendors").updateOne(
      { _id: profile.vendor._id },
      {
        $set: {
          tier: tierRule.key,
          tierMode: "auto",
          tierNote: `Auto-calculated from GMV ${profile.performance.gmv} and health score ${profile.health.score}`,
          tierUpdatedAt: new Date(),
          tierUpdatedBy: req.user?.uid || "admin",
          updatedAt: new Date(),
        },
      },
    );

    await logVendorAudit(db, req, profile.vendor._id, "tier_auto_calculated", `Vendor tier auto-calculated as ${tierRule.key}`, {
      gmv: profile.performance.gmv,
      healthScore: profile.health.score,
    });

    res.json({ success: true, message: "Vendor tier auto-calculated", data: await buildManagementProfile(db, req.params.vendorId) });
  } catch (error) {
    handleControllerError(res, error, "Failed to auto-calculate vendor tier");
  }
};

exports.updateVendorCommission = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorObjectId = getVendorObjectId(req.params.vendorId);
    if (!vendorObjectId) return res.status(400).json({ success: false, error: "Invalid vendor ID" });

    const rawRate = req.body.commissionOverrideRate;
    const now = new Date();
    const update = { $set: { updatedAt: now } };
    let message = "Vendor commission override cleared";
    let metadata = { cleared: true };

    if (rawRate !== null && rawRate !== undefined && rawRate !== "") {
      const rate = Number(rawRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 60) {
        return res.status(400).json({ success: false, error: "Commission override must be between 0 and 60 percent" });
      }
      update.$set.commissionOverride = {
        rate,
        note: req.body.note || "",
        updatedAt: now,
        updatedBy: req.user?.uid || "admin",
      };
      message = `Vendor commission override set to ${rate}%`;
      metadata = { rate, note: req.body.note || "" };
    } else {
      update.$unset = { commissionOverride: "" };
    }

    const result = await db.collection("vendors").updateOne({ _id: vendorObjectId }, update);
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Vendor not found" });

    await logVendorAudit(db, req, vendorObjectId, "commission_override_updated", message, metadata);
    res.json({ success: true, message, data: await buildManagementProfile(db, req.params.vendorId) });
  } catch (error) {
    handleControllerError(res, error, "Failed to update vendor commission override");
  }
};

exports.sendVendorNotice = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorObjectId = getVendorObjectId(req.params.vendorId);
    if (!vendorObjectId) return res.status(400).json({ success: false, error: "Invalid vendor ID" });

    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();
    if (!subject || !message) {
      return res.status(400).json({ success: false, error: "Subject and message are required" });
    }

    const now = new Date();
    const notice = {
      _id: new ObjectId(),
      subject,
      message,
      severity: req.body.severity || "notice",
      type: req.body.type || "official_notice",
      sentBy: req.user?.uid || "admin",
      createdAt: now,
    };

    const result = await db.collection("vendors").updateOne(
      { _id: vendorObjectId },
      {
        $push: { adminNotices: notice },
        $set: { updatedAt: now },
      },
    );
    if (!result.matchedCount) return res.status(404).json({ success: false, error: "Vendor not found" });

    await logVendorAudit(db, req, vendorObjectId, "notice_sent", `Notice sent: ${subject}`, {
      noticeId: notice._id,
      severity: notice.severity,
    });

    res.status(201).json({ success: true, message: "Vendor notice sent", data: await buildManagementProfile(db, req.params.vendorId) });
  } catch (error) {
    handleControllerError(res, error, "Failed to send vendor notice");
  }
};

exports.issueVendorViolation = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorObjectId = getVendorObjectId(req.params.vendorId);
    if (!vendorObjectId) return res.status(400).json({ success: false, error: "Invalid vendor ID" });

    const reason = String(req.body.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, error: "Violation reason is required" });

    const vendorsCol = db.collection("vendors");
    const vendor = await vendorsCol.findOne({ _id: vendorObjectId });
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor not found" });

    const activeStrikes = getActiveViolations(vendor).length + 1;
    const autoSuspended = activeStrikes >= 3;
    const now = new Date();
    const violation = {
      _id: new ObjectId(),
      strikeNumber: activeStrikes,
      reason,
      severity: req.body.severity || "warning",
      note: req.body.note || "",
      status: "active",
      issuedBy: req.user?.uid || "admin",
      createdAt: now,
    };

    const $set = {
      warningStrikes: activeStrikes,
      updatedAt: now,
    };
    if (autoSuspended) {
      $set.status = "suspended";
      $set.adminStatus = "suspended";
      $set.statusNote = "Auto-suspended after 3 warning strikes";
      $set.statusUpdatedAt = now;
      $set.statusUpdatedBy = req.user?.uid || "admin";
    }

    await vendorsCol.updateOne({ _id: vendorObjectId }, { $push: { violations: violation }, $set });
    if (autoSuspended) await syncOwnerRole(req, vendor, "suspended");

    await logVendorAudit(db, req, vendorObjectId, "violation_issued", `Warning strike ${activeStrikes} issued`, {
      strikeNumber: activeStrikes,
      reason,
      autoSuspended,
    });

    res.status(201).json({
      success: true,
      message: autoSuspended ? "Violation issued and vendor auto-suspended" : "Violation issued",
      data: await buildManagementProfile(db, req.params.vendorId),
    });
  } catch (error) {
    handleControllerError(res, error, "Failed to issue vendor violation");
  }
};

const escapeCsv = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

exports.bulkVendorAction = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorIds = Array.isArray(req.body.vendorIds) ? req.body.vendorIds : [];
    const action = String(req.body.action || "").toLowerCase();

    if (vendorIds.length === 0) return res.status(400).json({ success: false, error: "Select at least one vendor" });

    const objectIds = vendorIds.map(getVendorObjectId);
    if (objectIds.some((id) => !id)) return res.status(400).json({ success: false, error: "One or more vendor IDs are invalid" });

    const vendorsCol = db.collection("vendors");

    if (action === "export") {
      const vendors = await vendorsCol.find({ _id: { $in: objectIds } }).sort({ shopName: 1 }).toArray();
      const headers = ["Shop Name", "Email", "Phone", "Status", "Tier", "Commission Override", "Warning Strikes"];
      const rows = vendors.map((vendor) => [
        vendor.shopName,
        vendor.email,
        vendor.phone,
        vendor.status,
        vendor.tier || "normal",
        vendor.commissionOverride?.rate ?? "",
        vendor.warningStrikes || 0,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      await logVendorAudit(db, req, objectIds[0], "vendors_exported", `${vendors.length} vendors exported`, {
        vendorIds,
      });
      return res.json({ success: true, message: "Vendor export ready", data: { count: vendors.length, csv } });
    }

    const statusByAction = {
      approve: "approved",
      activate: "approved",
      reactivate: "approved",
      suspend: "suspended",
      blacklist: "blacklisted",
    };
    const status = statusByAction[action];
    if (!status) {
      return res.status(400).json({ success: false, error: "Unsupported bulk action" });
    }

    const now = new Date();
    const result = await vendorsCol.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          status,
          adminStatus: status === "approved" ? "active" : status,
          statusNote: req.body.note || "",
          statusUpdatedAt: now,
          statusUpdatedBy: req.user?.uid || "admin",
          updatedAt: now,
          ...(status === "blacklisted" ? { blacklistedAt: now } : {}),
        },
      },
    );

    await Promise.all(
      objectIds.map((vendorId) =>
        logVendorAudit(db, req, vendorId, "bulk_status_updated", `Bulk action ${action} applied`, {
          action,
          status,
          note: req.body.note || "",
        }),
      ),
    );

    res.json({
      success: true,
      message: `${result.modifiedCount || 0} vendors updated`,
      data: { matchedCount: result.matchedCount || 0, modifiedCount: result.modifiedCount || 0, status },
    });
  } catch (error) {
    handleControllerError(res, error, "Failed to apply bulk vendor action");
  }
};

exports._private = {
  buildManagementProfile,
  calculateHealth,
  calculateTier,
  buildPerformance,
};
