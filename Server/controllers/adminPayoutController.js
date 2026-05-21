const { ObjectId } = require("mongodb");
const emailService = require("../services/emailService");
const { buildVendorSettlement, normalizeId, roundMoney, sameId } = require("../utils/vendorSettlement");

const ACTIVE_PAYOUT_STATUSES = ["pending", "approved", "paid", "completed"];
const PAYOUT_STATUS_PRIORITY = {
  paid: 5,
  completed: 5,
  approved: 4,
  pending: 3,
  cancelled: 2,
  rejected: 1,
};

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isInDateRange = (value, startDate, endDate) => {
  const date = asDate(value);
  if (!date) return !startDate && !endDate;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
};

const getVendorIdValues = (vendorId) => {
  const vendorKey = normalizeId(vendorId);
  const values = [vendorKey];
  if (ObjectId.isValid(vendorKey)) values.push(new ObjectId(vendorKey));
  return values;
};

const getVendorName = (vendor) =>
  vendor?.shopName || vendor?.businessName || vendor?.storeName || vendor?.name || "Unknown Vendor";

const getPayoutMethodLabel = (vendor) =>
  vendor?.mobileBankingProvider
    ? `${vendor.mobileBankingProvider} ${vendor.mobileBankingNumber || ""}`.trim()
    : vendor?.bankName
      ? `${vendor.bankName}${vendor.bankAccountNumber ? ` (${vendor.bankAccountNumber})` : ""}`
      : "";

const findBestCommissionRule = ({ rules = [], product = {}, vendor = {}, order = {}, now = new Date() }) =>
  rules
    .filter((rule) => rule.status !== "inactive")
    .filter((rule) => {
      const from = asDate(rule.effectiveFrom);
      const to = asDate(rule.effectiveTo);
      return (!from || from <= now) && (!to || to >= now);
    })
    .filter((rule) => {
      if (rule.categoryId && normalizeId(rule.categoryId) !== normalizeId(product.categoryId)) return false;
      if (rule.vendorTier && rule.vendorTier !== "all" && rule.vendorTier !== (vendor.sellerTier || vendor.tier || "normal")) return false;
      if (rule.campaignType && rule.campaignType !== "all" && rule.campaignType !== (order.campaignType || product.campaignType || "standard")) return false;
      return true;
    })
    .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0))[0] || null;

const buildPayoutDedupKey = (payout) => {
  const vendorKey = payout.vendorId?.toString?.() || "";
  const startKey = toDateKey(payout.periodStart);
  const endKey = toDateKey(payout.periodEnd);

  if (payout.type === "admin_generated" && vendorKey && startKey && endKey) {
    const amountKey = Number(payout.amount || 0).toFixed(2);
    return `cycle:${vendorKey}:${startKey}:${endKey}:${amountKey}`;
  }

  return `id:${payout._id?.toString?.() || Math.random().toString(36).slice(2)}`;
};

const pickPreferredPayout = (current, incoming) => {
  const currentPriority = PAYOUT_STATUS_PRIORITY[current.status] || 0;
  const incomingPriority = PAYOUT_STATUS_PRIORITY[incoming.status] || 0;

  if (incomingPriority !== currentPriority) {
    return incomingPriority > currentPriority ? incoming : current;
  }

  const currentTime = new Date(current.paidAt || current.approvedAt || current.createdAt || 0).getTime();
  const incomingTime = new Date(incoming.paidAt || incoming.approvedAt || incoming.createdAt || 0).getTime();

  return incomingTime >= currentTime ? incoming : current;
};

const dedupePayouts = (payouts = []) => {
  const deduped = new Map();

  for (const payout of payouts) {
    const key = buildPayoutDedupKey(payout);
    if (!deduped.has(key)) {
      deduped.set(key, payout);
      continue;
    }

    deduped.set(key, pickPreferredPayout(deduped.get(key), payout));
  }

  return Array.from(deduped.values()).sort(
    (a, b) =>
      new Date(b.paidAt || b.approvedAt || b.createdAt || 0).getTime() -
      new Date(a.paidAt || a.approvedAt || a.createdAt || 0).getTime()
  );
};

const isSameCycleWindow = (left, right) =>
  toDateKey(left?.periodStart) === toDateKey(right?.periodStart) &&
  toDateKey(left?.periodEnd) === toDateKey(right?.periodEnd);

const notifyVendorPayout = async (req, payout, status, extra = {}) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = payout?.vendorId ? await Vendor.findById(payout.vendorId) : null;
    const vendorEmail = vendor?.email || payout?.vendorEmail;

    if (!vendorEmail) return;

    await emailService.sendPayoutNotification({
      vendorEmail,
      vendorName: vendor?.shopName || payout?.vendorName || "Vendor",
      amount: payout?.amount || 0,
      status,
      ...extra,
    });
  } catch (error) {
    console.error("Failed to send payout email:", error.message);
  }
};

const getFinanceActor = (req) => ({
  userId: req.user?._id?.toString?.() || req.user?.uid || "admin",
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const appendPayoutAudit = async (req, action, payout, changes = {}) => {
  try {
    const db = req.app.locals.db || req.app.locals.models?.VendorPayout?.collection?.db;
    if (!db?.collection) return;
    const payload = {
      action,
      module: "finance",
      actor: getFinanceActor(req),
      target: {
        type: "payout",
        id: payout?._id?.toString?.() || payout?.payoutId || "",
        vendorId: payout?.vendorId?.toString?.() || "",
      },
      changes,
      createdAt: new Date(),
    };
    const AuditLog = req.app.locals.models?.AuditLog;
    if (AuditLog?.append) await AuditLog.append(payload);
    else await db.collection("audit_logs").insertOne(payload);
  } catch (error) {
    console.error("Failed to append payout audit:", error.message);
  }
};

const getDeliveredPayoutEligibility = async (req, vendorId, options = {}) => {
  const {
    startDate = null,
    endDate = null,
    subtractPaidWithinPeriod = false,
    excludePayoutId = null,
  } = options;
  const Order = req.app.locals.models.Order;
  const VendorPayout = req.app.locals.models.VendorPayout;
  const Return = req.app.locals.models.Return;
  const Vendor = req.app.locals.models.Vendor;
  const db = req.app.locals.db || VendorPayout?.collection?.db || Order?.collection?.db;
  const vendorKey = normalizeId(vendorId);
  const vendorIdValues = getVendorIdValues(vendorKey);

  const orderQuery = {
    "products.vendorId": { $in: vendorIdValues },
    "products.itemStatus": "delivered",
  };
  if (startDate || endDate) {
    orderQuery["products.deliveredAt"] = {};
    if (startDate) orderQuery["products.deliveredAt"].$gte = startDate;
    if (endDate) orderQuery["products.deliveredAt"].$lte = endDate;
  }

  const [orders, vendor, rules] = await Promise.all([
    Order.collection.find(orderQuery).toArray(),
    Vendor.findById(vendorKey),
    db?.collection ? db.collection("commission_rules").find({}).toArray() : Promise.resolve([]),
  ]);

  let totalDeliveredEarnings = 0;
  let grossDeliveredSales = 0;
  let sellerFundedDiscount = 0;
  let netDeliveredSales = 0;
  let adminCommission = 0;
  let totalItems = 0;
  const eligibleOrders = [];

  orders.forEach((order) => {
    if (order.status === "cancelled") return;

    const vendorProducts = (order.products || []).filter(
      (product) =>
        sameId(product.vendorId, vendorKey) &&
        product.itemStatus !== "cancelled",
    );
    if (vendorProducts.length === 0) return;

    const settlement = buildVendorSettlement({
      order,
      vendorId: vendorKey,
      products: vendorProducts,
      vendor,
      rules,
      findCommissionRule: findBestCommissionRule,
    });

    const orderSummary = {
      orderId: normalizeId(order._id),
      orderNumber: order.orderNumber || order.orderNo || "",
      orderDate: order.createdAt || order.orderedAt || null,
      deliveredAt: order.deliveredAt || null,
      paymentMethod: order.paymentMethod || "",
      itemsCount: 0,
      productNames: [],
      grossSaleAmount: 0,
      sellerFundedDiscount: 0,
      netSaleAmount: 0,
      commissionAmount: 0,
      earnings: 0,
    };

    settlement.items.forEach((settledItem) => {
      const { product } = settledItem;
      const deliveredAt = product.deliveredAt || order.deliveredAt || order.updatedAt || order.createdAt;
      const isDelivered = ["delivered", "partially_delivered"].includes(product.itemStatus || order.status);
      if (!isDelivered || !isInDateRange(deliveredAt, startDate, endDate)) return;

      const quantity = Number(product.quantity || 1);
      totalItems += quantity;
      totalDeliveredEarnings += settledItem.vendorEarning;
      grossDeliveredSales += settledItem.grossSaleAmount;
      sellerFundedDiscount += settledItem.sellerFundedDiscount;
      netDeliveredSales += settledItem.saleAmount;
      adminCommission += settledItem.commissionAmount;

      orderSummary.deliveredAt = orderSummary.deliveredAt || deliveredAt;
      orderSummary.itemsCount += quantity;
      const productName = product.title || product.name || product.productName;
      if (productName && orderSummary.productNames.length < 3) orderSummary.productNames.push(productName);
      orderSummary.grossSaleAmount += settledItem.grossSaleAmount;
      orderSummary.sellerFundedDiscount += settledItem.sellerFundedDiscount;
      orderSummary.netSaleAmount += settledItem.saleAmount;
      orderSummary.commissionAmount += settledItem.commissionAmount;
      orderSummary.earnings += settledItem.vendorEarning;
    });

    if (orderSummary.itemsCount > 0) {
      eligibleOrders.push({
        ...orderSummary,
        grossSaleAmount: roundMoney(orderSummary.grossSaleAmount),
        sellerFundedDiscount: roundMoney(orderSummary.sellerFundedDiscount),
        netSaleAmount: roundMoney(orderSummary.netSaleAmount),
        commissionAmount: roundMoney(orderSummary.commissionAmount),
        earnings: roundMoney(orderSummary.earnings),
      });
    }
  });

  const payoutQueryBase = { vendorId: { $in: vendorIdValues } };
  if (subtractPaidWithinPeriod && (startDate || endDate)) {
    payoutQueryBase.periodStart = {};
    payoutQueryBase.periodEnd = {};
    if (startDate) payoutQueryBase.periodStart.$gte = startDate;
    if (endDate) payoutQueryBase.periodEnd.$lte = endDate;
  }

  const [paidPayoutRows, pendingPayoutRows, returnDeductions] = await Promise.all([
    VendorPayout.collection
      .find({ ...payoutQueryBase, status: { $in: ["approved", "paid", "completed"] } })
      .toArray(),
    VendorPayout.collection
      .find({ ...payoutQueryBase, status: "pending" })
      .toArray(),
    Return.getVendorDeductions(vendorKey, startDate, endDate),
  ]);

  const excludedPayoutKey = normalizeId(excludePayoutId);
  const isExcludedPayout = (payout) =>
    excludedPayoutKey && normalizeId(payout._id) === excludedPayoutKey;
  const paidPayouts = paidPayoutRows.filter((payout) => !isExcludedPayout(payout));
  const pendingPayouts = pendingPayoutRows.filter((payout) => !isExcludedPayout(payout));
  const alreadyPaid = paidPayouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const pendingAmount = pendingPayouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const totalReturnDeductions = Number(returnDeductions.totalDeduction || 0);
  const eligibleAmount = Math.max(
    0,
    totalDeliveredEarnings - alreadyPaid - pendingAmount - totalReturnDeductions,
  );

  return {
    vendor,
    totalDeliveredEarnings: roundMoney(totalDeliveredEarnings),
    grossDeliveredSales: roundMoney(grossDeliveredSales),
    sellerFundedDiscount: roundMoney(sellerFundedDiscount),
    netDeliveredSales: roundMoney(netDeliveredSales),
    adminCommission: roundMoney(adminCommission),
    alreadyPaid: roundMoney(alreadyPaid),
    pendingPayouts: roundMoney(pendingAmount),
    returnDeductions: roundMoney(totalReturnDeductions),
    returnsCount: returnDeductions.returnsCount || 0,
    eligibleAmount: roundMoney(eligibleAmount),
    totalItems,
    eligibleOrdersCount: eligibleOrders.length,
    eligibleOrders: eligibleOrders.sort(
      (left, right) => new Date(right.deliveredAt || right.orderDate || 0) - new Date(left.deliveredAt || left.orderDate || 0),
    ),
    returns: returnDeductions.returns || [],
  };
};

/**
 * Calculate eligible payout for a vendor
 * Shows delivered items that haven't been paid yet, minus return deductions
 */
exports.calculateEligiblePayout = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const eligibility = await getDeliveredPayoutEligibility(req, vendorId);

    res.json({
      success: true,
      data: {
        totalDeliveredEarnings: eligibility.totalDeliveredEarnings,
        grossDeliveredSales: eligibility.grossDeliveredSales,
        sellerFundedDiscount: eligibility.sellerFundedDiscount,
        netDeliveredSales: eligibility.netDeliveredSales,
        adminCommission: eligibility.adminCommission,
        alreadyPaid: eligibility.alreadyPaid,
        pendingPayouts: eligibility.pendingPayouts,
        returnDeductions: eligibility.returnDeductions,
        returnsCount: eligibility.returnsCount,
        eligibleAmount: eligibility.eligibleAmount,
        totalItems: eligibility.totalItems,
        eligibleOrdersCount: eligibility.eligibleOrdersCount,
        eligibleOrders: eligibility.eligibleOrders.slice(0, 25),
        returns: eligibility.returns.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Error calculating eligible payout:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate eligible payout",
    });
  }
};

/**
 * Create a payout for a vendor
 */
exports.createPayout = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { amount, note, periodStart, periodEnd } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid payout amount",
      });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;
    const Vendor = req.app.locals.models.Vendor;

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    if (periodStart && periodEnd) {
      const existingCyclePayouts = await VendorPayout.collection
        .find({
          vendorId: new ObjectId(vendorId),
          type: "admin_generated",
          status: { $in: ACTIVE_PAYOUT_STATUSES },
        })
        .project({ _id: 1, amount: 1, status: 1, periodStart: 1, periodEnd: 1 })
        .toArray();

      const duplicateCyclePayout = existingCyclePayouts.find((payout) =>
        isSameCycleWindow(
          { periodStart, periodEnd },
          { periodStart: payout.periodStart, periodEnd: payout.periodEnd }
        )
      );

      if (duplicateCyclePayout) {
        return res.status(400).json({
          success: false,
          error: "A payout already exists for this vendor in the selected payout cycle",
        });
      }
    }

    const eligibility = await getDeliveredPayoutEligibility(req, vendorId);
    const requestedAmount = roundMoney(amount);
    if (requestedAmount > eligibility.eligibleAmount + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Payout amount exceeds the current payable balance of ${eligibility.eligibleAmount}`,
        data: {
          eligibleAmount: eligibility.eligibleAmount,
          requestedAmount,
          eligibleOrders: eligibility.eligibleOrders.slice(0, 25),
        },
      });
    }

    // Create payout record
    const payout = await VendorPayout.create({
      vendorId,
      amount: requestedAmount,
      note: note || "",
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      createdBy: req.user._id,
      vendorName: vendor.shopName,
      vendorPhone: vendor.phone,
      linkedOrders: eligibility.eligibleOrders
        .filter((order) => Number(order.earnings || 0) > 0)
        .slice(0, 50),
      payoutSnapshot: {
        grossDeliveredSales: eligibility.grossDeliveredSales,
        sellerFundedDiscount: eligibility.sellerFundedDiscount,
        netDeliveredSales: eligibility.netDeliveredSales,
        adminCommission: eligibility.adminCommission,
        totalDeliveredEarnings: eligibility.totalDeliveredEarnings,
        alreadyPaid: eligibility.alreadyPaid,
        pendingPayouts: eligibility.pendingPayouts,
        returnDeductions: eligibility.returnDeductions,
        eligibleAmount: eligibility.eligibleAmount,
      },
    });

    await appendPayoutAudit(req, "finance.payout.created", payout, {
      amount: payout.amount,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      note: payout.note,
    });

    res.json({
      success: true,
      message: "Payout created successfully",
      data: payout,
    });
  } catch (error) {
    console.error("Error creating payout:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create payout",
    });
  }
};

/**
 * Get all payouts with filters
 */
exports.getAllPayouts = async (req, res) => {
  try {
    const { status, vendorId, page = 1, limit = 20 } = req.query;
    const VendorPayout = req.app.locals.models.VendorPayout;

    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    filter.page = parseInt(page);
    filter.limit = parseInt(limit);

    const result = await VendorPayout.findAll(filter);

    // Populate vendor names
    const Vendor = req.app.locals.models.Vendor;
    const payoutsWithVendor = await Promise.all(
      result.payouts.map(async (payout) => {
        const vendor = await Vendor.findById(payout.vendorId);
        return {
          ...payout,
          vendorName: vendor?.shopName || "Unknown",
          vendorPhone: vendor?.phone || "",
        };
      })
    );

    const normalizedPayouts = vendorId ? dedupePayouts(payoutsWithVendor) : payoutsWithVendor;

    res.json({
      success: true,
      payouts: normalizedPayouts,
      total: vendorId ? normalizedPayouts.length : result.total,
      page: result.page,
      pages: vendorId ? Math.max(1, Math.ceil(normalizedPayouts.length / (filter.limit || 20))) : result.pages,
    });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payouts",
    });
  }
};

/**
 * Get payout by ID
 */
exports.getPayoutById = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const VendorPayout = req.app.locals.models.VendorPayout;
    const Vendor = req.app.locals.models.Vendor;

    const payout = await VendorPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout not found",
      });
    }

    // Get vendor details
    const vendor = await Vendor.findById(payout.vendorId);

    res.json({
      success: true,
      data: {
        ...payout,
        vendorName: vendor?.shopName || "Unknown",
        vendorPhone: vendor?.phone || "",
        vendorEmail: vendor?.email || "",
      },
    });
  } catch (error) {
    console.error("Error fetching payout:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payout",
    });
  }
};

/**
 * Mark payout as paid
 */
exports.markPayoutPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionId, note } = req.body;

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payout = await VendorPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout not found",
      });
    }

    if (payout.status === "paid") {
      return res.status(400).json({
        success: false,
        error: "Payout already marked as paid",
      });
    }

    // Update payout status
    await VendorPayout.collection.updateOne(
      { _id: new ObjectId(payoutId) },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          paidBy: req.user._id,
          transactionId: transactionId || "",
          paymentNote: note || "",
        },
      }
    );

    await notifyVendorPayout(req, payout, "paid", {
      transactionId: transactionId || "",
      note: note || "",
    });

    await appendPayoutAudit(req, "finance.payout.paid", payout, {
      transactionId: transactionId || "",
      note: note || "",
      status: "paid",
    });

    res.json({
      success: true,
      message: "Payout marked as paid successfully",
    });
  } catch (error) {
    console.error("Error marking payout as paid:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark payout as paid",
    });
  }
};

/**
 * Cancel/reject a payout
 */
exports.cancelPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payout = await VendorPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout not found",
      });
    }

    if (payout.status === "paid") {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel a paid payout",
      });
    }

    await VendorPayout.collection.updateOne(
      { _id: new ObjectId(payoutId) },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: req.user._id,
          cancellationReason: reason || "",
        },
      }
    );

    await notifyVendorPayout(req, payout, "cancelled", {
      reason: reason || "",
    });

    await appendPayoutAudit(req, "finance.payout.cancelled", payout, {
      reason: reason || "",
      status: "cancelled",
    });

    res.json({
      success: true,
      message: "Payout cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling payout:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel payout",
    });
  }
};

/**
 * Get payout statistics
 */
exports.getPayoutStats = async (req, res) => {
  try {
    const VendorPayout = req.app.locals.models.VendorPayout;

    const payouts = await VendorPayout.collection.find({}).toArray();

    const stats = {
      totalPaid: 0,
      totalPending: 0,
      totalCancelled: 0,
      paidCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    payouts.forEach((payout) => {
      if (payout.status === "paid") {
        stats.totalPaid += payout.amount || 0;
        stats.paidCount++;
      } else if (payout.status === "pending") {
        stats.totalPending += payout.amount || 0;
        stats.pendingCount++;
      } else if (payout.status === "cancelled") {
        stats.totalCancelled += payout.amount || 0;
        stats.cancelledCount++;
      }
    });

    res.json({
      success: true,
      data: {
        totalPaid: Math.round(stats.totalPaid * 100) / 100,
        totalPending: Math.round(stats.totalPending * 100) / 100,
        totalCancelled: Math.round(stats.totalCancelled * 100) / 100,
        paidCount: stats.paidCount,
        pendingCount: stats.pendingCount,
        cancelledCount: stats.cancelledCount,
        totalPayouts: payouts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching payout stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payout stats",
    });
  }
};

/**
 * Get vendor's payout history (for vendor dashboard)
 */
exports.getVendorPayouts = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.params.vendorId;
    
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Not a vendor",
      });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;

    const result = await VendorPayout.findAll({
      vendorId: vendorId.toString(),
      page: parseInt(req.query.page || 1),
      limit: parseInt(req.query.limit || 20),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching vendor payouts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payouts",
    });
  }
};

/**
 * Get vendors eligible for 7-day payout cycle
 * Returns vendors with delivered orders from the last 7 days
 */
exports.getWeeklyPayoutList = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`📅 Calculating weekly payouts from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all orders with delivered items in the last 7 days
    const orders = await Order.collection
      .find({
        "products.itemStatus": "delivered",
        "products.deliveredAt": {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    console.log(`📦 Found ${orders.length} orders with delivered items in last 7 days`);

    const vendorIds = new Set();

    orders.forEach((order) => {
      (order.products || []).forEach((product) => {
        if (
          product.itemStatus === "delivered" &&
          product.vendorId &&
          isInDateRange(product.deliveredAt, startDate, endDate)
        ) {
          vendorIds.add(normalizeId(product.vendorId));
        }
      });
    });

    const vendorsList = await Promise.all(
      Array.from(vendorIds).map(async (vendorId) => {
        const eligibility = await getDeliveredPayoutEligibility(req, vendorId, {
          startDate,
          endDate,
          subtractPaidWithinPeriod: true,
        });
        const { vendor } = eligibility;
        const hasPendingPayout = eligibility.pendingPayouts > 0;
        const hasPayoutMethod = Boolean(
          (vendor?.bankName && vendor?.bankAccountNumber) ||
          (vendor?.mobileBankingProvider && vendor?.mobileBankingNumber)
        );

        let blockingReason = "";
        if (!vendor) {
          blockingReason = "Vendor record no longer exists";
        } else if (hasPendingPayout) {
          blockingReason = "Vendor already has a pending payout for this cycle";
        } else if (eligibility.eligibleAmount <= 0) {
          blockingReason = "No remaining eligible balance for this cycle";
        }

        return {
          vendorId,
          vendorName: getVendorName(vendor),
          vendorEmail: vendor?.email || "",
          vendorPhone: vendor?.phone || "",
          bankName: vendor?.bankName || "",
          bankAccountNumber: vendor?.bankAccountNumber || "",
          bankAccountName: vendor?.bankAccountName || "",
          bankBranch: vendor?.bankBranch || "",
          mobileBankingProvider: vendor?.mobileBankingProvider || "",
          mobileBankingNumber: vendor?.mobileBankingNumber || "",
          grossDeliveredSales: eligibility.grossDeliveredSales,
          sellerFundedDiscount: eligibility.sellerFundedDiscount,
          netDeliveredSales: eligibility.netDeliveredSales,
          adminCommission: eligibility.adminCommission,
          totalEarnings: eligibility.totalDeliveredEarnings,
          alreadyPaidOrPending: roundMoney(eligibility.alreadyPaid + eligibility.pendingPayouts),
          alreadyPaid: eligibility.alreadyPaid,
          pendingPayouts: eligibility.pendingPayouts,
          returnDeductions: eligibility.returnDeductions,
          returnsCount: eligibility.returnsCount,
          eligibleAmount: eligibility.eligibleAmount,
          itemsCount: eligibility.totalItems,
          ordersCount: eligibility.eligibleOrdersCount,
          eligibleOrders: eligibility.eligibleOrders.slice(0, 10),
          hasPendingPayout,
          hasPayoutMethod,
          payoutMethodLabel: getPayoutMethodLabel(vendor),
          canCreatePayout: !blockingReason,
          blockingReason,
          periodStart: startDate,
          periodEnd: endDate,
        };
      })
    );

    const eligibleVendors = vendorsList.filter((v) => v.canCreatePayout);
    const blockedVendors = vendorsList.filter((v) => !v.canCreatePayout);

    // Calculate totals
    const totalEligibleAmount = eligibleVendors.reduce(
      (sum, v) => sum + v.eligibleAmount,
      0
    );

    console.log(`✅ Found ${eligibleVendors.length} vendors eligible for payout`);

    res.json({
      success: true,
      data: {
        periodStart: startDate,
        periodEnd: endDate,
        vendors: eligibleVendors,
        blockedVendors,
        totalVendors: eligibleVendors.length,
        totalBlockedVendors: blockedVendors.length,
        totalEligibleAmount: roundMoney(totalEligibleAmount),
      },
    });
  } catch (error) {
    console.error("Error calculating weekly payout list:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate weekly payout list",
    });
  }
};

/**
 * Create bulk payouts for weekly cycle
 * Creates payout records for multiple vendors at once
 */
exports.createBulkPayouts = async (req, res) => {
  try {
    const { payouts, periodStart, periodEnd } = req.body;

    if (!Array.isArray(payouts) || payouts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Payouts array is required",
      });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;
    const Vendor = req.app.locals.models.Vendor;

    const createdPayouts = [];
    const errors = [];

    for (const payoutData of payouts) {
      try {
        const { vendorId, amount, note } = payoutData;

        if (!vendorId || !amount || amount <= 0) {
          errors.push({
            vendorId,
            error: "Invalid vendor ID or amount",
          });
          continue;
        }

        // Get vendor details
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
          errors.push({
            vendorId,
            error: "Vendor record no longer exists",
          });
          continue;
        }

        const existingPayout = await VendorPayout.collection.findOne({
          vendorId: new ObjectId(vendorId),
          periodStart: periodStart ? new Date(periodStart) : null,
          periodEnd: periodEnd ? new Date(periodEnd) : null,
          status: { $in: ["pending", "paid"] },
        });

        if (existingPayout) {
          errors.push({
            vendorId,
            error: "A payout already exists for this vendor in the selected period",
          });
          continue;
        }

        const eligibility = await getDeliveredPayoutEligibility(req, vendorId, {
          startDate: periodStart ? new Date(periodStart) : null,
          endDate: periodEnd ? new Date(periodEnd) : null,
          subtractPaidWithinPeriod: true,
        });
        const requestedAmount = roundMoney(amount);
        if (requestedAmount > eligibility.eligibleAmount + 0.01) {
          errors.push({
            vendorId,
            error: `Payout amount exceeds the current payable balance of ${eligibility.eligibleAmount}`,
            eligibleAmount: eligibility.eligibleAmount,
            requestedAmount,
          });
          continue;
        }

        // Create payout record
        const payout = await VendorPayout.create({
          vendorId,
          amount: requestedAmount,
          note: note || `Weekly payout for ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`,
          periodStart: periodStart ? new Date(periodStart) : null,
          periodEnd: periodEnd ? new Date(periodEnd) : null,
          createdBy: req.user._id,
          vendorName: vendor.shopName,
          vendorPhone: vendor.phone,
          linkedOrders: eligibility.eligibleOrders.slice(0, 50),
          payoutSnapshot: {
            grossDeliveredSales: eligibility.grossDeliveredSales,
            sellerFundedDiscount: eligibility.sellerFundedDiscount,
            netDeliveredSales: eligibility.netDeliveredSales,
            adminCommission: eligibility.adminCommission,
            totalDeliveredEarnings: eligibility.totalDeliveredEarnings,
            alreadyPaid: eligibility.alreadyPaid,
            pendingPayouts: eligibility.pendingPayouts,
            returnDeductions: eligibility.returnDeductions,
            eligibleAmount: eligibility.eligibleAmount,
          },
        });

        await appendPayoutAudit(req, "finance.payout.bulk_created", payout, {
          amount: payout.amount,
          periodStart: payout.periodStart,
          periodEnd: payout.periodEnd,
        });

        createdPayouts.push(payout);
      } catch (error) {
        console.error(`Error creating payout for vendor ${payoutData.vendorId}:`, error);
        errors.push({
          vendorId: payoutData.vendorId,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Created ${createdPayouts.length} payouts successfully`,
      data: {
        created: createdPayouts.length,
        failed: errors.length,
        payouts: createdPayouts,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error creating bulk payouts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create bulk payouts",
    });
  }
};


/**
 * Get all vendor payout requests (pending approval)
 */
exports.getPayoutRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const VendorPayout = req.app.locals.models.VendorPayout;
    const Vendor = req.app.locals.models.Vendor;

    const query = { type: "vendor_requested" };
    if (status && status !== "all") {
      query.status = status;
    }

    const requests = await VendorPayout.collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Populate vendor details
    const requestsWithVendor = await Promise.all(
      requests.map(async (request) => {
        const vendor = await Vendor.findById(request.vendorId);
        return {
          ...request,
          vendorName: vendor?.shopName || request.vendorName || "Unknown",
          vendorEmail: vendor?.email || request.vendorEmail || "",
          vendorPhone: vendor?.phone || request.vendorPhone || "",
        };
      })
    );

    res.json({
      success: true,
      data: requestsWithVendor,
    });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payout requests",
    });
  }
};

/**
 * Approve a vendor payout request
 */
exports.approvePayoutRequest = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { note } = req.body;

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payout = await VendorPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout request not found",
      });
    }

    if (payout.type !== "vendor_requested") {
      return res.status(400).json({
        success: false,
        error: "Not a vendor request",
      });
    }

    if (payout.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Payout request is not pending",
      });
    }

    const eligibility = await getDeliveredPayoutEligibility(req, payout.vendorId, {
      excludePayoutId: payout._id,
    });
    const requestedAmount = roundMoney(payout.amount);
    if (requestedAmount > eligibility.eligibleAmount + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Requested payout exceeds the current payable balance of ${eligibility.eligibleAmount}`,
        data: {
          eligibleAmount: eligibility.eligibleAmount,
          requestedAmount,
          eligibleOrders: eligibility.eligibleOrders.slice(0, 25),
        },
      });
    }

    // Approve the request
    await VendorPayout.approvePayout(payoutId, req.user._id);

    await VendorPayout.collection.updateOne(
      { _id: new ObjectId(payoutId) },
      {
        $set: {
          ...(note ? { adminNote: note } : {}),
          linkedOrders: eligibility.eligibleOrders.slice(0, 50),
          payoutSnapshot: {
            grossDeliveredSales: eligibility.grossDeliveredSales,
            sellerFundedDiscount: eligibility.sellerFundedDiscount,
            netDeliveredSales: eligibility.netDeliveredSales,
            adminCommission: eligibility.adminCommission,
            totalDeliveredEarnings: eligibility.totalDeliveredEarnings,
            alreadyPaid: eligibility.alreadyPaid,
            pendingPayouts: eligibility.pendingPayouts,
            returnDeductions: eligibility.returnDeductions,
            eligibleAmount: eligibility.eligibleAmount,
          },
        },
      }
    );

    await notifyVendorPayout(req, payout, "approved", {
      note: note || "",
    });

    await appendPayoutAudit(req, "finance.payout_request.approved", payout, {
      note: note || "",
      status: "approved",
    });

    res.json({
      success: true,
      message: "Payout request approved successfully",
    });
  } catch (error) {
    console.error("Error approving payout request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to approve payout request",
    });
  }
};

/**
 * Reject a vendor payout request
 */
exports.rejectPayoutRequest = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "Rejection reason is required",
      });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payout = await VendorPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout request not found",
      });
    }

    if (payout.type !== "vendor_requested") {
      return res.status(400).json({
        success: false,
        error: "Not a vendor request",
      });
    }

    if (payout.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Payout request is not pending",
      });
    }

    // Reject the request
    await VendorPayout.rejectPayout(payoutId, reason, req.user._id);

    await notifyVendorPayout(req, payout, "rejected", { reason });

    await appendPayoutAudit(req, "finance.payout_request.rejected", payout, {
      reason,
      status: "rejected",
    });

    res.json({
      success: true,
      message: "Payout request rejected",
    });
  } catch (error) {
    console.error("Error rejecting payout request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reject payout request",
    });
  }
};

/**
 * Mark approved payout request as paid
 */
exports.markRequestPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionId, note } = req.body;

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payout = await VendorPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout request not found",
      });
    }

    if (payout.status !== "approved" && payout.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Payout must be approved before marking as paid",
      });
    }

    const eligibility = await getDeliveredPayoutEligibility(req, payout.vendorId, {
      excludePayoutId: payout._id,
    });
    const requestedAmount = roundMoney(payout.amount);
    if (requestedAmount > eligibility.eligibleAmount + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Requested payout exceeds the current payable balance of ${eligibility.eligibleAmount}`,
        data: {
          eligibleAmount: eligibility.eligibleAmount,
          requestedAmount,
          eligibleOrders: eligibility.eligibleOrders.slice(0, 25),
        },
      });
    }

    // Mark as paid
    await VendorPayout.collection.updateOne(
      { _id: new ObjectId(payoutId) },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          paidBy: req.user._id,
          transactionId: transactionId || "",
          paymentNote: note || "",
          linkedOrders: eligibility.eligibleOrders.slice(0, 50),
          payoutSnapshot: {
            grossDeliveredSales: eligibility.grossDeliveredSales,
            sellerFundedDiscount: eligibility.sellerFundedDiscount,
            netDeliveredSales: eligibility.netDeliveredSales,
            adminCommission: eligibility.adminCommission,
            totalDeliveredEarnings: eligibility.totalDeliveredEarnings,
            alreadyPaid: eligibility.alreadyPaid,
            pendingPayouts: eligibility.pendingPayouts,
            returnDeductions: eligibility.returnDeductions,
            eligibleAmount: eligibility.eligibleAmount,
          },
        },
      }
    );

    await notifyVendorPayout(req, payout, "paid", {
      transactionId: transactionId || "",
      note: note || "",
    });

    await appendPayoutAudit(req, "finance.payout_request.paid", payout, {
      transactionId: transactionId || "",
      note: note || "",
      status: "paid",
    });

    res.json({
      success: true,
      message: "Payout marked as paid successfully",
    });
  } catch (error) {
    console.error("Error marking payout as paid:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark payout as paid",
    });
  }
};
