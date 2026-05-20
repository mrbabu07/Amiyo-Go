const { ObjectId } = require("mongodb");
const PDFDocument = require("pdfkit");

/**
 * GET /api/admin/finance/overview
 *
 * Aggregates marketplace revenue, vendor earnings, and admin commission
 * from the `orders` collection (excluding cancelled orders).
 */
exports.getFinanceOverview = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const ordersCol = db.collection("orders");

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    // Main aggregation — sum financial fields from non-cancelled orders
    const [overview, monthlySales] = await Promise.all([
      ordersCol.aggregate([
        { $match: { status: { $nin: ["cancelled"] } } },
        { $unwind: "$products" },
        {
          $group: {
            _id: null,
            totalMarketplaceRevenue: { $sum: "$products.vendorEarningAmount" },
            totalAdminCommission:    { $sum: "$products.adminCommissionAmount" },
            totalVendorEarnings:     { $sum: "$products.vendorEarningAmount" },
            totalOrders:             { $sum: 1 },
          },
        },
      ]).toArray(),

      // Monthly sales trend (last 6 months)
      ordersCol.aggregate([
        { $match: { status: { $nin: ["cancelled"] } } },
        {
          $group: {
            _id: {
              year:  { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue:    { $sum: "$total" },
            commission: { $sum: { $sum: "$products.adminCommissionAmount" } },
            orders:     { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 6 },
      ]).toArray(),
    ]);

    // Also compute gross revenue from order.total
    const grossAgg = await ordersCol.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      { $group: { _id: null, gross: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]).toArray();

    const gross          = grossAgg[0]?.gross      || 0;
    const totalOrders    = grossAgg[0]?.orders     || 0;
    const commission     = overview[0]?.totalAdminCommission  || 0;
    const vendorEarnings = overview[0]?.totalVendorEarnings   || 0;

    res.json({
      success: true,
      data: {
        totalMarketplaceRevenue: round2(gross),
        totalAdminCommission:    round2(commission),
        totalVendorEarnings:     round2(vendorEarnings),
        totalOrders,
        monthlySales: monthlySales.map(m => ({
          year:    m._id.year,
          month:   m._id.month,
          revenue: round2(m.revenue),
          orders:  m.orders,
        })).reverse(),
      },
    });
  } catch (error) {
    console.error("Error in getFinanceOverview:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/vendors/:vendorId/finance/summary
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/admin/finance/commission-summary?days=7
 *
 * Shows admin commission earned for recent windows. Used by category control
 * so admins can tune category commission floors against real marketplace data.
 */
exports.getCommissionSummary = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const ordersCol = db.collection("orders");
    const days = Math.max(1, Math.min(Number(req.query.days) || 7, 365));
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    const [summaryRows, categoryRows] = await Promise.all([
      ordersCol.aggregate([
        { $match: { createdAt: { $gte: from }, status: { $nin: ["cancelled"] } } },
        { $unwind: "$products" },
        {
          $group: {
            _id: null,
            grossSales: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
            totalCommission: { $sum: "$products.adminCommissionAmount" },
            vendorEarnings: { $sum: "$products.vendorEarningAmount" },
            orderIds: { $addToSet: "$_id" },
            items: { $sum: "$products.quantity" },
          },
        },
        {
          $project: {
            _id: 0,
            grossSales: 1,
            totalCommission: 1,
            vendorEarnings: 1,
            orders: { $size: "$orderIds" },
            items: 1,
          },
        },
      ]).toArray(),

      ordersCol.aggregate([
        { $match: { createdAt: { $gte: from }, status: { $nin: ["cancelled"] } } },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.categoryId",
            grossSales: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
            totalCommission: { $sum: "$products.adminCommissionAmount" },
            items: { $sum: "$products.quantity" },
          },
        },
        { $sort: { totalCommission: -1 } },
        { $limit: 6 },
      ]).toArray(),
    ]);

    const summary = summaryRows[0] || {
      grossSales: 0,
      totalCommission: 0,
      vendorEarnings: 0,
      orders: 0,
      items: 0,
    };

    res.json({
      success: true,
      data: {
        days,
        from,
        grossSales: round2(summary.grossSales || 0),
        totalCommission: round2(summary.totalCommission || 0),
        vendorEarnings: round2(summary.vendorEarnings || 0),
        orders: summary.orders || 0,
        items: summary.items || 0,
        topCategories: categoryRows.map((row) => ({
          categoryId: row._id,
          grossSales: round2(row.grossSales || 0),
          totalCommission: round2(row.totalCommission || 0),
          items: row.items || 0,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getCommissionSummary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getVendorFinanceSummary = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = req.params;
    const { from, to } = req.query;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const { ObjectId } = require("mongodb");
    const vendorIdValues = [vendorId.toString()];
    if (ObjectId.isValid(vendorId)) vendorIdValues.push(new ObjectId(vendorId));

    const idStrings = new Set(vendorIdValues.map((value) => value.toString()));
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const inRange = (value) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return !fromDate && !toDate;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    };
    const getReturnDeduction = (returnDoc = {}) => {
      const storedDeduction = Number(returnDoc.vendorDeduction || 0);
      if (storedDeduction > 0) return storedDeduction;
      const vendorEarning = Number(returnDoc.vendorEarningAmount || 0);
      if (vendorEarning > 0) return vendorEarning;
      const quantity = Number(returnDoc.quantity || 1);
      const fallbackRefund = Number(returnDoc.productPrice || returnDoc.price || returnDoc.unitPrice || 0) * quantity;
      const refundAmount = Number(
        returnDoc.refundAmount ??
        returnDoc.adminRefund ??
        returnDoc.totalAmount ??
        returnDoc.amount ??
        fallbackRefund,
      );
      return Math.max(0, refundAmount - Number(returnDoc.adminCommissionAmount || 0));
    };

    const orderQuery = {
      "products.vendorId": { $in: vendorIdValues },
      status: { $ne: "cancelled" },
    };
    if (fromDate || toDate) {
      orderQuery.createdAt = {};
      if (fromDate) orderQuery.createdAt.$gte = fromDate;
      if (toDate) orderQuery.createdAt.$lte = toDate;
    }

    const [orders, returns] = await Promise.all([
      db.collection("orders").find(orderQuery).toArray(),
      db.collection("returns").find({ vendorId: { $in: vendorIdValues } }).toArray(),
    ]);

    const summary = orders
      .filter((order) => inRange(order.createdAt))
      .reduce(
        (acc, order) => {
          const vendorProducts = (order.products || []).filter((product) =>
            idStrings.has(product.vendorId?.toString?.() || String(product.vendorId || "")),
          );
          if (vendorProducts.length === 0) return acc;

          acc.ordersList.add(order._id?.toString?.() || String(order._id));
          vendorProducts.forEach((product) => {
            const gross = Number(product.price || 0) * Number(product.quantity || 0);
            const commission = Number(product.adminCommissionAmount || 0);
            acc.grossSales += gross;
            acc.totalCommission += commission;
            acc.netEarningsBeforeReturns += Number(product.vendorEarningAmount ?? Math.max(0, gross - commission));
          });
          return acc;
        },
        { grossSales: 0, totalCommission: 0, netEarningsBeforeReturns: 0, ordersList: new Set() },
      );

    const returnDeductions = returns
      .filter((returnDoc) =>
        idStrings.has(returnDoc.vendorId?.toString?.() || String(returnDoc.vendorId || "")) &&
        ["approved", "completed", "refunded"].includes(String(returnDoc.refundStatus || returnDoc.status || "").toLowerCase()) &&
        inRange(
          returnDoc.refundApprovedAt ||
          returnDoc.approvedAt ||
          returnDoc.refundProcessedAt ||
          returnDoc.completedAt ||
          returnDoc.refundedAt ||
          returnDoc.updatedAt ||
          returnDoc.createdAt,
        ),
      )
      .reduce((sum, returnDoc) => sum + getReturnDeduction(returnDoc), 0);

    const payableEarnings = Math.max(0, summary.netEarningsBeforeReturns - returnDeductions);

    res.json({
      success: true,
      data: {
        grossSales: round2(summary.grossSales),
        totalCommission: round2(summary.totalCommission),
        netEarningsBeforeReturns: round2(summary.netEarningsBeforeReturns),
        returnDeductions: round2(returnDeductions),
        netEarnings: round2(payableEarnings),
        payableEarnings: round2(payableEarnings),
        ordersCount: summary.ordersList.size,
      },
    });
  } catch (error) {
    console.error("Error in getVendorFinanceSummary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/vendors/:vendorId/finance/transactions
// ─────────────────────────────────────────────────────────────
exports.getVendorFinanceTransactions = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = req.params;
    const { from, to, page = 1, limit = 20 } = req.query;
    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const { ObjectId } = require("mongodb");
    const vendorIdValues = [vendorId.toString()];
    if (ObjectId.isValid(vendorId)) vendorIdValues.push(new ObjectId(vendorId));

    const match = { "products.vendorId": { $in: vendorIdValues } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$products" },
      { $match: { "products.vendorId": { $in: vendorIdValues } } },
      { $sort: { createdAt: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          date: "$createdAt",
          product: { $ifNull: ["$products.title", "$products.name"] },
          qty: "$products.quantity",
          subtotal: { $multiply: ["$products.price", "$products.quantity"] },
          commissionRateSnapshot: "$products.commissionRateSnapshot",
          adminCommissionAmount:  "$products.adminCommissionAmount",
          vendorEarningAmount:    "$products.vendorEarningAmount",
          orderStatus: "$status",
        },
      },
    ];

    const countPipeline = [
      { $match: match },
      { $unwind: "$products" },
      { $match: { "products.vendorId": { $in: vendorIdValues } } },
      { $count: "total" },
    ];

    const [transactions, countResult] = await Promise.all([
      db.collection("orders").aggregate(pipeline).toArray(),
      db.collection("orders").aggregate(countPipeline).toArray(),
    ]);

    const total = countResult[0]?.total || 0;
    res.json({
      success: true,
      data: transactions,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error("Error in getVendorFinanceTransactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const DEFAULT_PAYOUT_SCHEDULE = {
  frequency: "weekly",
  cutoffDay: 0,
  processingDay: 1,
  minimumPayout: 1000,
  timezone: "Asia/Dhaka",
};

const DEFAULT_ESCROW_RULES = {
  holdPercentage: 15,
  holdDaysAfterDelivery: 7,
  disputeHoldPercentage: 100,
  releaseAfterReturnWindow: true,
};

const FINANCE_EVENT_SORT = {
  sale: 1,
  commission: 2,
  escrow_hold: 3,
  escrow_release: 4,
  dispute_hold: 5,
  refund: 6,
  payout: 7,
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const safeObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);
const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const collectionToArray = async (db, name, query = {}) => {
  const collection = db.collection(name);
  if (!collection?.find) return [];
  return collection.find(query).toArray();
};

const getVendorName = (vendor) =>
  vendor?.shopName || vendor?.businessName || vendor?.storeName || vendor?.name || "Unknown Vendor";

const getAdminActor = (req) => ({
  userId: normalizeId(req.user?._id || req.user?.uid || "admin"),
  role: req.user?.role || "admin",
  email: req.user?.email || "",
});

const omitDocumentMetadata = (value = {}) => {
  const payload = { ...(value || {}) };
  delete payload._id;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.updatedBy;
  return payload;
};

const appendFinanceAudit = async (req, { action, target, changes = {}, metadata = {} }) => {
  const db = req.app.locals.db;
  if (!db?.collection) return null;
  const payload = {
    action,
    actor: getAdminActor(req),
    target,
    changes,
    metadata,
    module: "finance",
    createdAt: new Date(),
  };

  const AuditLog = req.app.locals.models?.AuditLog;
  if (AuditLog?.append) {
    return AuditLog.append(payload);
  }
  return db.collection("audit_logs").insertOne(payload);
};

const getPayoutScheduleDoc = async (db) => {
  const saved = await db.collection("finance_settings").findOne({ _id: "payout_schedule" });
  return { ...DEFAULT_PAYOUT_SCHEDULE, ...(saved || {}) };
};

const getEscrowRulesDoc = async (db) => {
  const saved = await db.collection("finance_settings").findOne({ _id: "escrow_rules" });
  return { ...DEFAULT_ESCROW_RULES, ...(saved || {}) };
};

const getNextDayOfWeek = (from, targetDay) => {
  const date = new Date(from);
  date.setHours(9, 0, 0, 0);
  const days = ((Number(targetDay || 0) - date.getDay() + 7) % 7) || 7;
  date.setDate(date.getDate() + days);
  return date;
};

const buildSchedulePreview = (schedule = {}, now = new Date()) => {
  const cadenceDays = schedule.frequency === "biweekly" ? 14 : 7;
  const nextProcessingDate = getNextDayOfWeek(now, schedule.processingDay);
  const cutoffDate = getNextDayOfWeek(now, schedule.cutoffDay);
  if (cutoffDate > nextProcessingDate) cutoffDate.setDate(cutoffDate.getDate() - 7);
  const periodStart = new Date(cutoffDate);
  periodStart.setDate(cutoffDate.getDate() - (cadenceDays - 1));
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(cutoffDate);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    ...schedule,
    cadenceDays,
    nextCutoffDate: periodEnd,
    nextProcessingDate,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  };
};

const loadFinanceSourceData = async (db) => {
  const [orders, returns, payouts, vendors, categories, rules, auditLogs] = await Promise.all([
    collectionToArray(db, "orders"),
    collectionToArray(db, "returns"),
    collectionToArray(db, "vendor_payouts"),
    collectionToArray(db, "vendors"),
    collectionToArray(db, "categories"),
    collectionToArray(db, "commission_rules"),
    db.collection("audit_logs").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);

  return {
    orders,
    returns,
    payouts,
    vendors,
    categories,
    rules,
    auditLogs,
  };
};

const buildVendorMaps = (vendors = []) => ({
  vendorById: new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor])),
  vendorByTier: vendors.reduce((map, vendor) => {
    const tier = vendor.sellerTier || vendor.tier || "normal";
    if (!map[tier]) map[tier] = [];
    map[tier].push(vendor);
    return map;
  }, {}),
});

const findBestCommissionRule = ({ rules = [], product = {}, vendor = {}, order = {}, now = new Date() }) => {
  const activeRules = rules
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
    .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));

  return activeRules[0] || null;
};

const getVendorProductAmounts = ({ product, vendor, order, rules }) => {
  const gross = roundMoney(Number(product.price || 0) * Number(product.quantity || 0));
  const rule = findBestCommissionRule({ rules, product, vendor, order });
  const commissionRate = Number(rule?.commissionRate ?? product.commissionRateSnapshot ?? 0);
  const commissionAmount = roundMoney(
    product.adminCommissionAmount ?? (gross * commissionRate) / 100,
  );
  const vendorEarning = roundMoney(product.vendorEarningAmount ?? (gross - commissionAmount));

  return {
    gross,
    commissionRate,
    commissionAmount,
    vendorEarning,
    appliedRule: rule
      ? { ruleId: normalizeId(rule._id), name: rule.name || "", source: rule.source || "admin_rule" }
      : null,
  };
};

const pushLedgerEvent = (events, event) => {
  if (!event.vendorId || !event.amount) return;
  events.push({
    ...event,
    amount: roundMoney(event.amount),
    occurredAt: asDate(event.occurredAt) || new Date(),
    createdAt: new Date(),
    source: event.source || "derived",
  });
};

const buildFinanceLedgerRows = ({ orders = [], returns = [], payouts = [], vendors = [], rules = [], escrowRules = {} }) => {
  const { vendorById } = buildVendorMaps(vendors);
  const now = new Date();
  const holdRate = Number(escrowRules.holdPercentage || 0) / 100;
  const holdDays = Number(escrowRules.holdDaysAfterDelivery || 0);
  const events = [];

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    (order.products || []).forEach((product) => {
      const vendorId = normalizeId(product.vendorId);
      if (!vendorId || vendorId === "platform") return;
      if (product.itemStatus === "cancelled") return;

      const vendor = vendorById.get(vendorId) || {};
      const amounts = getVendorProductAmounts({ product, vendor, order, rules });
      const orderId = normalizeId(order._id);
      const itemKey = `${orderId}:${normalizeId(product.productId || product._id || product.sku || product.title)}`;
      const occurredAt = product.deliveredAt || order.deliveredAt || order.createdAt || order.updatedAt;

      pushLedgerEvent(events, {
        eventKey: `sale:${itemKey}`,
        vendorId,
        vendorName: product.vendorName || product.shopName || getVendorName(vendor),
        type: "sale",
        label: "Sale booked",
        amount: amounts.gross,
        orderId,
        categoryId: normalizeId(product.categoryId),
        paymentMethod: order.paymentMethod || "",
        occurredAt,
        metadata: { productName: product.title || product.name || "", status: product.itemStatus || order.status },
      });

      pushLedgerEvent(events, {
        eventKey: `commission:${itemKey}`,
        vendorId,
        vendorName: product.vendorName || product.shopName || getVendorName(vendor),
        type: "commission",
        label: "Platform commission deducted",
        amount: -amounts.commissionAmount,
        orderId,
        categoryId: normalizeId(product.categoryId),
        paymentMethod: order.paymentMethod || "",
        occurredAt,
        metadata: { commissionRate: amounts.commissionRate, appliedRule: amounts.appliedRule },
      });

      if (["delivered", "partially_delivered"].includes(product.itemStatus || order.status) && holdRate > 0) {
        const deliveredAt = asDate(product.deliveredAt || order.deliveredAt || order.updatedAt || order.createdAt);
        const holdAmount = roundMoney(amounts.vendorEarning * holdRate);
        const releaseAt = deliveredAt ? new Date(deliveredAt.getTime() + holdDays * 24 * 60 * 60 * 1000) : null;

        pushLedgerEvent(events, {
          eventKey: `escrow_hold:${itemKey}`,
          vendorId,
          vendorName: product.vendorName || product.shopName || getVendorName(vendor),
          type: "escrow_hold",
          label: "Return-window escrow hold",
          amount: -holdAmount,
          orderId,
          categoryId: normalizeId(product.categoryId),
          occurredAt: deliveredAt,
          metadata: { holdPercentage: escrowRules.holdPercentage, releaseAt },
        });

        if (releaseAt && releaseAt <= now) {
          pushLedgerEvent(events, {
            eventKey: `escrow_release:${itemKey}`,
            vendorId,
            vendorName: product.vendorName || product.shopName || getVendorName(vendor),
            type: "escrow_release",
            label: "Escrow released",
            amount: holdAmount,
            orderId,
            categoryId: normalizeId(product.categoryId),
            occurredAt: releaseAt,
            metadata: { holdPercentage: escrowRules.holdPercentage },
          });
        }
      }
    });
  });

  returns.forEach((item) => {
    const vendorId = normalizeId(item.vendorId);
    if (!vendorId) return;
    const vendor = vendorById.get(vendorId) || {};
    const refundAmount = roundMoney(item.vendorDeduction ?? item.refundAmount ?? item.totalAmount ?? item.amount ?? 0);
    const status = item.refundStatus || item.status || "";

    if (["approved", "completed", "refunded"].includes(status)) {
      pushLedgerEvent(events, {
        eventKey: `refund:${normalizeId(item._id)}`,
        vendorId,
        vendorName: item.vendorName || getVendorName(vendor),
        type: "refund",
        label: "Refund deducted",
        amount: -refundAmount,
        orderId: normalizeId(item.orderId),
        returnId: normalizeId(item._id),
        occurredAt: item.refundApprovedAt || item.refundProcessedAt || item.updatedAt || item.createdAt,
        metadata: { refundMethod: item.refundMethod || "", status },
      });
    } else if (["requested", "pending", "return_requested", "under_review"].includes(status)) {
      const holdAmount = roundMoney(refundAmount * (Number(escrowRules.disputeHoldPercentage || 100) / 100));
      pushLedgerEvent(events, {
        eventKey: `dispute_hold:${normalizeId(item._id)}`,
        vendorId,
        vendorName: item.vendorName || getVendorName(vendor),
        type: "dispute_hold",
        label: "Dispute hold",
        amount: -holdAmount,
        orderId: normalizeId(item.orderId),
        returnId: normalizeId(item._id),
        occurredAt: item.createdAt || item.updatedAt,
        metadata: { status },
      });
    }
  });

  payouts.forEach((payout) => {
    if (!["paid", "completed"].includes(payout.status)) return;
    const vendorId = normalizeId(payout.vendorId);
    const vendor = vendorById.get(vendorId) || {};
    pushLedgerEvent(events, {
      eventKey: `payout:${normalizeId(payout._id)}`,
      vendorId,
      vendorName: payout.vendorName || getVendorName(vendor),
      type: "payout",
      label: "Payout paid",
      amount: -Number(payout.amount || 0),
      payoutId: normalizeId(payout._id),
      occurredAt: payout.paidAt || payout.updatedAt || payout.createdAt,
      metadata: { transactionId: payout.transactionId || "", payoutType: payout.type || "" },
    });
  });

  const sorted = events.sort((left, right) => {
    const vendorCompare = left.vendorId.localeCompare(right.vendorId);
    if (vendorCompare) return vendorCompare;
    const timeCompare = new Date(left.occurredAt) - new Date(right.occurredAt);
    if (timeCompare) return timeCompare;
    return (FINANCE_EVENT_SORT[left.type] || 99) - (FINANCE_EVENT_SORT[right.type] || 99);
  });

  const balances = {};
  return sorted.map((event) => {
    balances[event.vendorId] = roundMoney((balances[event.vendorId] || 0) + Number(event.amount || 0));
    return { ...event, balanceAfter: balances[event.vendorId] };
  });
};

const syncFinanceLedger = async (db, rows) => {
  const collection = db.collection("finance_ledger");
  if (!collection?.deleteMany || !collection?.insertMany) return;
  await collection.deleteMany({ source: "derived" });
  if (rows.length > 0) await collection.insertMany(rows);
};

const buildPayoutQueueRows = ({ orders = [], returns = [], payouts = [], vendors = [], rules = [], escrowRules = {} }) => {
  const { vendorById } = buildVendorMaps(vendors);
  const now = new Date();
  const holdRate = Number(escrowRules.holdPercentage || 0) / 100;
  const holdDays = Number(escrowRules.holdDaysAfterDelivery || 0);
  const rows = {};

  const ensureVendor = (vendorId) => {
    const vendor = vendorById.get(vendorId) || {};
    rows[vendorId] = rows[vendorId] || {
      vendorId,
      vendorName: getVendorName(vendor),
      vendorTier: vendor.sellerTier || vendor.tier || "normal",
      payableBalance: 0,
      pendingClearance: 0,
      withheldAmount: 0,
      refundDeductions: 0,
      paidOrPendingPayouts: 0,
      ordersCount: 0,
      itemsCount: 0,
      payoutMethodLabel: vendor.mobileBankingProvider
        ? `${vendor.mobileBankingProvider} ${vendor.mobileBankingNumber || ""}`.trim()
        : vendor.bankName
          ? `${vendor.bankName}${vendor.bankAccountNumber ? ` (${vendor.bankAccountNumber})` : ""}`
          : "",
    };
    return rows[vendorId];
  };

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    const countedOrders = new Set();
    (order.products || []).forEach((product) => {
      const vendorId = normalizeId(product.vendorId);
      if (!vendorId || vendorId === "platform" || product.itemStatus === "cancelled") return;
      const row = ensureVendor(vendorId);
      const vendor = vendorById.get(vendorId) || {};
      const amounts = getVendorProductAmounts({ product, vendor, order, rules });
      const deliveredAt = asDate(product.deliveredAt || order.deliveredAt);
      const isDelivered = ["delivered", "partially_delivered"].includes(product.itemStatus || order.status);
      const holdAmount = roundMoney(amounts.vendorEarning * holdRate);
      const releaseAt = deliveredAt ? new Date(deliveredAt.getTime() + holdDays * 24 * 60 * 60 * 1000) : null;
      row.itemsCount += Number(product.quantity || 1);
      countedOrders.add(vendorId);

      if (isDelivered && (!releaseAt || releaseAt <= now)) {
        row.payableBalance += amounts.vendorEarning;
      } else if (isDelivered) {
        row.payableBalance += roundMoney(amounts.vendorEarning - holdAmount);
        row.withheldAmount += holdAmount;
        row.pendingClearance += holdAmount;
      } else {
        row.pendingClearance += amounts.vendorEarning;
      }
    });
    countedOrders.forEach((vendorId) => {
      ensureVendor(vendorId).ordersCount += 1;
    });
  });

  returns.forEach((item) => {
    const vendorId = normalizeId(item.vendorId);
    if (!vendorId) return;
    const row = ensureVendor(vendorId);
    const amount = roundMoney(item.vendorDeduction ?? item.refundAmount ?? item.totalAmount ?? item.amount ?? 0);
    if (["approved", "completed", "refunded"].includes(item.refundStatus || item.status)) {
      row.refundDeductions += amount;
      row.payableBalance -= amount;
    } else if (["requested", "pending", "return_requested", "under_review"].includes(item.refundStatus || item.status)) {
      row.withheldAmount += amount;
      row.pendingClearance += amount;
      row.payableBalance -= amount;
    }
  });

  payouts.forEach((payout) => {
    const vendorId = normalizeId(payout.vendorId);
    if (!vendorId || !["pending", "approved", "paid", "completed"].includes(payout.status)) return;
    const row = ensureVendor(vendorId);
    row.paidOrPendingPayouts += Number(payout.amount || 0);
    row.payableBalance -= Number(payout.amount || 0);
  });

  return Object.values(rows)
    .map((row) => ({
      ...row,
      payableBalance: roundMoney(Math.max(0, row.payableBalance)),
      pendingClearance: roundMoney(Math.max(0, row.pendingClearance)),
      withheldAmount: roundMoney(Math.max(0, row.withheldAmount)),
      refundDeductions: roundMoney(row.refundDeductions),
      paidOrPendingPayouts: roundMoney(row.paidOrPendingPayouts),
      canPayout: row.payableBalance > 0,
    }))
    .sort((left, right) => right.payableBalance - left.payableBalance);
};

const buildRevenueReport = ({ orders = [], returns = [], vendors = [], categories = [], groupBy = "day" }) => {
  const vendorById = new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor]));
  const categoryById = new Map(categories.map((category) => [normalizeId(category._id), category]));
  const byDate = {};
  const byCategory = {};
  const byVendor = {};
  const byPaymentMethod = {};
  const summary = { gmv: 0, commission: 0, vendorEarnings: 0, refunds: 0, orders: 0 };

  const dateKey = (dateValue) => {
    const date = asDate(dateValue) || new Date();
    if (groupBy === "month") return date.toISOString().slice(0, 7);
    if (groupBy === "week") {
      const copy = new Date(date);
      const day = copy.getDay() || 7;
      copy.setDate(copy.getDate() - day + 1);
      return copy.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  };

  const bump = (map, key, seed = {}) => {
    map[key] = map[key] || { key, gmv: 0, commission: 0, vendorEarnings: 0, orders: 0, ...seed };
    return map[key];
  };

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    summary.orders += 1;
    const day = bump(byDate, dateKey(order.createdAt));
    const payment = bump(byPaymentMethod, order.paymentMethod || "unknown");
    const countedVendors = new Set();
    const countedCategories = new Set();
    day.orders += 1;
    payment.orders += 1;
    (order.products || []).forEach((product) => {
      const gross = Number(product.price || 0) * Number(product.quantity || 0);
      const commission = Number(product.adminCommissionAmount || 0);
      const earning = Number(product.vendorEarningAmount ?? gross - commission);
      const vendor = vendorById.get(normalizeId(product.vendorId));
      const category = categoryById.get(normalizeId(product.categoryId));
      const vendorKey = normalizeId(product.vendorId) || "platform";
      const categoryKey = normalizeId(product.categoryId) || "uncategorized";
      const vendorRow = bump(byVendor, vendorKey, { vendorName: getVendorName(vendor) });
      const categoryRow = bump(byCategory, categoryKey, { categoryName: category?.name || "Uncategorized" });

      if (!countedVendors.has(vendorKey)) {
        vendorRow.orders += 1;
        countedVendors.add(vendorKey);
      }
      if (!countedCategories.has(categoryKey)) {
        categoryRow.orders += 1;
        countedCategories.add(categoryKey);
      }

      [summary, day, payment, vendorRow, categoryRow].forEach((row) => {
        row.gmv += gross;
        row.commission += commission;
        row.vendorEarnings += earning;
      });
    });
  });

  returns
    .filter((item) => ["approved", "completed", "refunded"].includes(item.refundStatus || item.status))
    .forEach((item) => {
      const amount = Number(item.refundAmount || item.totalAmount || item.amount || item.vendorDeduction || 0);
      summary.refunds += amount;
      bump(byDate, dateKey(item.refundApprovedAt || item.updatedAt || item.createdAt)).refunds =
        (bump(byDate, dateKey(item.refundApprovedAt || item.updatedAt || item.createdAt)).refunds || 0) + amount;
    });

  const normalizeRows = (rows) =>
    Object.values(rows)
      .map((row) => ({
        ...row,
        gmv: roundMoney(row.gmv),
        commission: roundMoney(row.commission),
        vendorEarnings: roundMoney(row.vendorEarnings),
        refunds: roundMoney(row.refunds || 0),
      }))
      .sort((left, right) => String(left.key).localeCompare(String(right.key)));

  return {
    summary: {
      gmv: roundMoney(summary.gmv),
      commission: roundMoney(summary.commission),
      vendorEarnings: roundMoney(summary.vendorEarnings),
      refunds: roundMoney(summary.refunds),
      orders: summary.orders,
    },
    byDate: normalizeRows(byDate),
    byCategory: normalizeRows(byCategory).sort((left, right) => right.commission - left.commission),
    byVendor: normalizeRows(byVendor).sort((left, right) => right.commission - left.commission),
    byPaymentMethod: normalizeRows(byPaymentMethod).sort((left, right) => right.gmv - left.gmv),
  };
};

exports.getFinanceOperationsOverview = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [schedule, escrowRules, source] = await Promise.all([
      getPayoutScheduleDoc(db),
      getEscrowRulesDoc(db),
      loadFinanceSourceData(db),
    ]);
    const payoutQueue = buildPayoutQueueRows({ ...source, escrowRules });
    const ledgerRows = buildFinanceLedgerRows({ ...source, escrowRules });
    const report = buildRevenueReport(source);

    res.json({
      success: true,
      data: {
        payoutSchedule: buildSchedulePreview(schedule),
        escrowRules,
        payoutQueue: {
          vendors: payoutQueue.slice(0, 10),
          totalPayable: roundMoney(payoutQueue.reduce((sum, row) => sum + row.payableBalance, 0)),
          vendorsCount: payoutQueue.filter((row) => row.payableBalance > 0).length,
        },
        ledgerSummary: {
          events: ledgerRows.length,
          vendors: new Set(ledgerRows.map((row) => row.vendorId)).size,
        },
        revenueSummary: report.summary,
        commissionRules: source.rules.slice(0, 8),
        pendingRefunds: source.returns.filter((item) =>
          ["requested", "pending", "return_requested", "under_review"].includes(item.refundStatus || item.status),
        ).length,
        auditLog: source.auditLogs.filter((log) => log.module === "finance" || /^finance|^payout|^refund|^commission/.test(log.action || "")).slice(0, 12),
      },
    });
  } catch (error) {
    console.error("Error in getFinanceOperationsOverview:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPayoutSchedule = async (req, res) => {
  try {
    const schedule = await getPayoutScheduleDoc(req.app.locals.db);
    res.json({ success: true, data: buildSchedulePreview(schedule) });
  } catch (error) {
    console.error("Error in getPayoutSchedule:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.upsertPayoutSchedule = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const body = omitDocumentMetadata(req.body);
    const payload = {
      ...DEFAULT_PAYOUT_SCHEDULE,
      ...body,
      frequency: ["weekly", "biweekly"].includes(body.frequency) ? body.frequency : "weekly",
      cutoffDay: Number(body.cutoffDay ?? DEFAULT_PAYOUT_SCHEDULE.cutoffDay),
      processingDay: Number(body.processingDay ?? DEFAULT_PAYOUT_SCHEDULE.processingDay),
      minimumPayout: Number(body.minimumPayout ?? DEFAULT_PAYOUT_SCHEDULE.minimumPayout),
      updatedAt: new Date(),
      updatedBy: getAdminActor(req).userId,
    };
    await db.collection("finance_settings").updateOne(
      { _id: "payout_schedule" },
      { $set: payload, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    await appendFinanceAudit(req, {
      action: "finance.payout_schedule.updated",
      target: { type: "finance_setting", id: "payout_schedule" },
      changes: payload,
    });
    res.json({ success: true, data: buildSchedulePreview(payload) });
  } catch (error) {
    console.error("Error in upsertPayoutSchedule:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEscrowRules = async (req, res) => {
  try {
    const rules = await getEscrowRulesDoc(req.app.locals.db);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("Error in getEscrowRules:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.upsertEscrowRules = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const body = omitDocumentMetadata(req.body);
    const payload = {
      ...DEFAULT_ESCROW_RULES,
      ...body,
      holdPercentage: Math.max(0, Math.min(Number(body.holdPercentage ?? DEFAULT_ESCROW_RULES.holdPercentage), 100)),
      holdDaysAfterDelivery: Math.max(0, Number(body.holdDaysAfterDelivery ?? DEFAULT_ESCROW_RULES.holdDaysAfterDelivery)),
      disputeHoldPercentage: Math.max(0, Math.min(Number(body.disputeHoldPercentage ?? DEFAULT_ESCROW_RULES.disputeHoldPercentage), 100)),
      releaseAfterReturnWindow: body.releaseAfterReturnWindow !== false,
      updatedAt: new Date(),
      updatedBy: getAdminActor(req).userId,
    };
    await db.collection("finance_settings").updateOne(
      { _id: "escrow_rules" },
      { $set: payload, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    await appendFinanceAudit(req, {
      action: "finance.escrow_rules.updated",
      target: { type: "finance_setting", id: "escrow_rules" },
      changes: payload,
    });
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error("Error in upsertEscrowRules:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPayoutQueue = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [schedule, escrowRules, source] = await Promise.all([
      getPayoutScheduleDoc(db),
      getEscrowRulesDoc(db),
      loadFinanceSourceData(db),
    ]);
    const minimum = Number(schedule.minimumPayout || DEFAULT_PAYOUT_SCHEDULE.minimumPayout);
    const rows = buildPayoutQueueRows({ ...source, escrowRules }).map((row) => ({
      ...row,
      meetsMinimum: row.payableBalance >= minimum,
    }));
    res.json({
      success: true,
      data: {
        schedule: buildSchedulePreview(schedule),
        summary: {
          totalVendors: rows.length,
          payableVendors: rows.filter((row) => row.meetsMinimum).length,
          totalPayable: roundMoney(rows.reduce((sum, row) => sum + row.payableBalance, 0)),
          totalWithheld: roundMoney(rows.reduce((sum, row) => sum + row.withheldAmount, 0)),
          totalPendingClearance: roundMoney(rows.reduce((sum, row) => sum + row.pendingClearance, 0)),
        },
        vendors: rows,
      },
    });
  } catch (error) {
    console.error("Error in getPayoutQueue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCommissionRules = async (req, res) => {
  try {
    const rules = await req.app.locals.db
      .collection("commission_rules")
      .find({})
      .sort({ priority: -1, createdAt: -1 })
      .toArray();
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("Error in getCommissionRules:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.saveCommissionRule = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const ruleId = req.params.ruleId || req.body.ruleId;
    const rate = Number(req.body.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ success: false, error: "commissionRate must be between 0 and 100" });
    }
    const payload = {
      name: String(req.body.name || "Commission rule").trim(),
      categoryId: normalizeId(req.body.categoryId),
      vendorTier: req.body.vendorTier || "all",
      campaignType: req.body.campaignType || "all",
      commissionRate: rate,
      effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : null,
      effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : null,
      priority: Number(req.body.priority || 0),
      status: req.body.status || "active",
      updatedAt: new Date(),
      updatedBy: getAdminActor(req).userId,
    };

    let savedId = ruleId;
    if (ruleId && ObjectId.isValid(ruleId)) {
      await db.collection("commission_rules").updateOne(
        { _id: new ObjectId(ruleId) },
        { $set: payload },
      );
    } else {
      payload.createdAt = new Date();
      payload.createdBy = getAdminActor(req).userId;
      const result = await db.collection("commission_rules").insertOne(payload);
      savedId = normalizeId(result.insertedId);
    }

    await appendFinanceAudit(req, {
      action: "finance.commission_rule.saved",
      target: { type: "commission_rule", id: savedId },
      changes: payload,
    });
    res.status(ruleId ? 200 : 201).json({ success: true, data: { ...payload, _id: savedId } });
  } catch (error) {
    console.error("Error in saveCommissionRule:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFinanceLedger = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [escrowRules, source] = await Promise.all([getEscrowRulesDoc(db), loadFinanceSourceData(db)]);
    const rows = buildFinanceLedgerRows({ ...source, escrowRules });
    await syncFinanceLedger(db, rows);

    const filtered = rows.filter((row) => {
      if (req.query.vendorId && row.vendorId !== req.query.vendorId) return false;
      if (req.query.type && req.query.type !== "all" && row.type !== req.query.type) return false;
      if (req.query.from && row.occurredAt < new Date(req.query.from)) return false;
      if (req.query.to && row.occurredAt > new Date(req.query.to)) return false;
      return true;
    });
    const limit = Math.min(Number(req.query.limit || 100), 500);
    res.json({
      success: true,
      data: filtered.sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt)).slice(0, limit),
      summary: {
        events: filtered.length,
        totalCredits: roundMoney(filtered.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0)),
        totalDebits: roundMoney(filtered.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0)),
      },
    });
  } catch (error) {
    console.error("Error in getFinanceLedger:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRefundWorkflow = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const items = await collectionToArray(req.app.locals.db, "returns");
    const filtered = items
      .filter((item) => (status === "all" ? true : ["requested", "pending", "return_requested", "under_review"].includes(item.refundStatus || item.status)))
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Error in getRefundWorkflow:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reviewFinanceRefund = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { returnId } = req.params;
    const { decision, refundMethod = "manual_transfer", amount, note = "" } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, error: "decision must be approve or reject" });
    }
    const filter = safeObjectId(returnId) ? { _id: safeObjectId(returnId) } : { _id: returnId };
    const returnDoc = await db.collection("returns").findOne(filter);
    if (!returnDoc) return res.status(404).json({ success: false, error: "Return not found" });

    const now = new Date();
    const update = decision === "approve"
      ? {
          refundStatus: "approved",
          status: returnDoc.status === "requested" ? "approved" : returnDoc.status,
          refundMethod,
          refundAmount: roundMoney(amount ?? returnDoc.refundAmount ?? returnDoc.totalAmount ?? returnDoc.amount ?? 0),
          vendorDeduction: roundMoney(amount ?? returnDoc.vendorDeduction ?? returnDoc.refundAmount ?? returnDoc.totalAmount ?? 0),
          refundApprovedAt: now,
          refundApprovedBy: getAdminActor(req).userId,
          financeNote: note,
          updatedAt: now,
        }
      : {
          refundStatus: "rejected",
          status: "rejected",
          refundRejectedAt: now,
          refundRejectedBy: getAdminActor(req).userId,
          financeNote: note,
          updatedAt: now,
        };

    await db.collection("returns").updateOne(filter, { $set: update });
    await appendFinanceAudit(req, {
      action: `finance.refund.${decision}`,
      target: { type: "return", id: returnId },
      changes: update,
    });
    res.json({ success: true, data: { ...returnDoc, ...update } });
  } catch (error) {
    console.error("Error in reviewFinanceRefund:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRevenueReports = async (req, res) => {
  try {
    const source = await loadFinanceSourceData(req.app.locals.db);
    const report = buildRevenueReport({ ...source, groupBy: req.query.groupBy || "day" });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error("Error in getRevenueReports:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.downloadRevenueReport = async (req, res) => {
  try {
    const source = await loadFinanceSourceData(req.app.locals.db);
    const report = buildRevenueReport({ ...source, groupBy: req.query.groupBy || "day" });
    const format = req.query.format === "pdf" ? "pdf" : "csv";

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 44, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="revenue-report-${Date.now()}.pdf"`);
      doc.pipe(res);
      doc.fontSize(18).text("Marketplace Revenue Report");
      doc.moveDown();
      doc.fontSize(11).text(`GMV: ${report.summary.gmv}`);
      doc.text(`Commission: ${report.summary.commission}`);
      doc.text(`Refunds: ${report.summary.refunds}`);
      doc.moveDown();
      report.byDate.slice(0, 20).forEach((row) => {
        doc.text(`${row.key} | GMV ${row.gmv} | Commission ${row.commission} | Refunds ${row.refunds}`);
      });
      doc.end();
      return;
    }

    const header = ["Bucket", "GMV", "Commission", "VendorEarnings", "Refunds", "Orders"];
    const rows = report.byDate.map((row) => [row.key, row.gmv, row.commission, row.vendorEarnings, row.refunds, row.orders || ""]);
    const csv = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="revenue-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Error in downloadRevenueReport:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFinanceAuditLog = async (req, res) => {
  try {
    const logs = await req.app.locals.db.collection("audit_logs").find({}).sort({ createdAt: -1 }).limit(200).toArray();
    const filtered = logs.filter((log) => log.module === "finance" || /^finance|^payout|^refund|^commission/.test(log.action || ""));
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Error in getFinanceAuditLog:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports._financeTestUtils = {
  buildFinanceLedgerRows,
  buildPayoutQueueRows,
  buildRevenueReport,
  buildSchedulePreview,
};
