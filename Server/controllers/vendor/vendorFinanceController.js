const { ObjectId } = require("mongodb");
const PDFDocument = require("pdfkit");

const PLATFORM_NAME = "HnilaBazar";
const MINIMUM_PAYOUT = 1000;
const SETTLED_RETURN_STATUSES = ["approved", "completed", "refunded"];

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeId = (value) => {
  if (!value) return "";
  return value.toString ? value.toString() : String(value);
};

const getObjectId = (value) => {
  const id = normalizeId(value);
  return id && ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const getVendorIdValues = (vendorId) => {
  const id = normalizeId(vendorId);
  const values = [id];
  const objectId = getObjectId(id);
  if (objectId) values.push(objectId);
  return values.filter(Boolean);
};

const matchesVendor = (product, vendorId) =>
  normalizeId(product?.vendorId) === normalizeId(vendorId);

const getVendorOrderQuery = (vendorId, extraProductMatch = {}, extraOrderMatch = {}) => ({
  ...extraOrderMatch,
  products: {
    $elemMatch: {
      vendorId: { $in: getVendorIdValues(vendorId) },
      ...extraProductMatch,
    },
  },
});

const dateOnly = (date) => {
  const value = date instanceof Date ? new Date(date) : new Date(date || Date.now());
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = dateOnly(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getWeekCycle = (now = new Date()) => {
  const today = dateOnly(now);
  const day = today.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const cycleStart = new Date(today);
  cycleStart.setDate(today.getDate() - daysSinceMonday);
  const cycleEnd = endOfDay(cycleStart);
  cycleEnd.setDate(cycleStart.getDate() + 6);
  return { cycleStart, cycleEnd };
};

const getPayoutSchedule = (now = new Date()) => {
  const today = dateOnly(now);
  const day = today.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  const nextPayoutDate = new Date(today);
  nextPayoutDate.setDate(today.getDate() + daysUntilMonday);
  const cutoffDate = endOfDay(nextPayoutDate);
  cutoffDate.setDate(nextPayoutDate.getDate() - 1);

  return {
    cadence: "Weekly",
    nextPayoutDate: nextPayoutDate.toISOString(),
    cutoffDate: cutoffDate.toISOString(),
    minimumPayoutThreshold: MINIMUM_PAYOUT,
    releaseRule: "Delivered orders are released after return deductions and pending payout holds.",
  };
};

const getMonthRange = (month) => {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const normalized = /^\d{4}-\d{2}$/.test(month || "") ? month : fallback;
  const [year, monthIndex] = normalized.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);
  return { label: normalized, start, end };
};

const getDateMatch = ({ start, end } = {}) => {
  if (!start && !end) return {};
  const createdAt = {};
  if (start) createdAt.$gte = new Date(start);
  if (end) createdAt.$lte = new Date(end);
  return { createdAt };
};

const getVendorDeliveryBreakdown = (order, vendorId, vendorSubtotal) => {
  const vendorIdString = normalizeId(vendorId);
  const deliveryBreakdown = Array.isArray(order.deliveryBreakdown) ? order.deliveryBreakdown : [];
  const matched = deliveryBreakdown.find((item) =>
    normalizeId(item.vendorId || "platform") === vendorIdString,
  );

  if (matched) {
    const shippingFeeCredit = matched.deliveryMethod === "vendor_delivery"
      ? Number(matched.deliveryFee || 0)
      : Number(matched.shippingFeeCredit || 0);
    const shippingFeeDebit = Number(matched.shippingFeeDebit || 0) +
      (matched.freeDeliveryApplied ? Number(matched.baseFee || 0) : 0);

    return {
      deliveryMethod: matched.deliveryMethod || "platform_delivery",
      deliveryFee: round2(matched.deliveryFee || 0),
      shippingFeeCredit: round2(shippingFeeCredit),
      shippingFeeDebit: round2(shippingFeeDebit),
      zoneLabel: matched.zoneLabel || "",
      freeDeliveryApplied: Boolean(matched.freeDeliveryApplied),
    };
  }

  const subtotal = Number(order.subtotal || 0);
  const allocatedFee = subtotal > 0
    ? (Number(order.deliveryCharge || 0) * Number(vendorSubtotal || 0)) / subtotal
    : 0;

  return {
    deliveryMethod: "platform_delivery",
    deliveryFee: round2(allocatedFee),
    shippingFeeCredit: 0,
    shippingFeeDebit: 0,
    zoneLabel: "",
    freeDeliveryApplied: false,
  };
};

const groupReturnsByOrder = (returns = []) => {
  return returns.reduce((map, item) => {
    const orderId = normalizeId(item.orderId);
    if (!orderId) return map;
    if (!map.has(orderId)) map.set(orderId, []);
    map.get(orderId).push(item);
    return map;
  }, new Map());
};

const getOrderSettlementStatus = (vendorProducts = []) => {
  const statuses = vendorProducts.map((item) => item.itemStatus || "pending");
  if (statuses.length === 0) return "pending_clearance";
  if (statuses.every((status) => status === "cancelled")) return "void";
  if (statuses.some((status) => status === "returned")) return "refund_deducted";
  if (statuses.every((status) => status === "delivered")) return "released";
  if (statuses.some((status) => ["shipped", "ready_to_ship", "pickup_ready"].includes(status))) return "shipping";
  return "pending_clearance";
};

const buildLedgerRows = ({ orders = [], returns = [], vendorId }) => {
  const returnsByOrder = groupReturnsByOrder(returns);

  return orders.map((order) => {
    const vendorProducts = (order.products || []).filter((product) => matchesVendor(product, vendorId));
    const saleAmount = vendorProducts.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.quantity || 0),
      0,
    );
    const platformCommissionAmount = vendorProducts.reduce(
      (sum, product) => sum + Number(product.adminCommissionAmount || 0),
      0,
    );
    const vendorEarning = vendorProducts.reduce(
      (sum, product) => {
        const fallback = Number(product.price || 0) * Number(product.quantity || 0) -
          Number(product.adminCommissionAmount || 0);
        return sum + Number(product.vendorEarningAmount ?? fallback);
      },
      0,
    );
    const platformCommissionRate = saleAmount > 0
      ? round2((platformCommissionAmount / saleAmount) * 100)
      : 0;
    const vendorReturns = returnsByOrder.get(normalizeId(order._id)) || [];
    const refundDeducted = vendorReturns.reduce(
      (sum, item) => sum + Number(item.vendorDeduction || 0),
      0,
    );
    const delivery = getVendorDeliveryBreakdown(order, vendorId, saleAmount);
    const settlementStatus = getOrderSettlementStatus(vendorProducts);
    const isVoid = settlementStatus === "void";
    const netPayout = isVoid
      ? 0
      : vendorEarning + delivery.shippingFeeCredit - delivery.shippingFeeDebit - refundDeducted;

    return {
      orderId: order._id,
      orderNumber: normalizeId(order._id).slice(-8).toUpperCase(),
      orderDate: order.createdAt || order.updatedAt || null,
      paymentMethod: order.paymentMethod || "",
      paymentStatus: order.paymentStatus || "",
      itemStatus: settlementStatus,
      productsSummary: vendorProducts.map((product) => product.title || product.name || "Product").join(", "),
      itemCount: vendorProducts.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
      saleAmount: round2(saleAmount),
      platformCommissionRate,
      platformCommissionAmount: round2(platformCommissionAmount),
      shippingFeeCredited: delivery.shippingFeeCredit,
      shippingFeeDebited: delivery.shippingFeeDebit,
      deliveryFee: delivery.deliveryFee,
      deliveryMethod: delivery.deliveryMethod,
      refundDeducted: round2(refundDeducted),
      netPayout: round2(netPayout),
      vendorEarning: round2(vendorEarning),
      returns: vendorReturns.map((item) => ({
        returnId: item._id,
        status: item.status,
        productTitle: item.productTitle || item.productName || "",
        deduction: round2(item.vendorDeduction || 0),
        approvedAt: item.approvedAt || item.updatedAt || null,
      })),
      items: vendorProducts.map((product) => {
        const itemSaleAmount = Number(product.price || 0) * Number(product.quantity || 0);
        const itemCommission = Number(product.adminCommissionAmount || 0);
        const fallbackEarning = itemSaleAmount - itemCommission;
        return {
          productId: product.productId || product._id || null,
          sku: product.sku || product.variantSku || "",
          productName: product.title || product.name || product.productName || "Product",
          quantity: Number(product.quantity || 0),
          unitPrice: round2(product.price || 0),
          saleAmount: round2(itemSaleAmount),
          commissionRate: round2(product.commissionRateSnapshot || 0),
          commissionAmount: round2(itemCommission),
          vendorEarning: round2(product.vendorEarningAmount ?? fallbackEarning),
          itemStatus: product.itemStatus || "pending",
        };
      }),
    };
  });
};

const summarizeLedger = ({ ledgerRows = [], payouts = [], returnDeductions = {}, cycleStart, cycleEnd }) => {
  const releasedRows = ledgerRows.filter((row) => row.itemStatus === "released");
  const pendingRows = ledgerRows.filter((row) =>
    ["pending_clearance", "shipping"].includes(row.itemStatus),
  );
  const paidBalance = payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const pendingPayouts = payouts
    .filter((payout) => ["pending", "approved"].includes(payout.status))
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const withheldForReturns = Number(returnDeductions.totalDeduction || 0);
  const deliveredNet = releasedRows.reduce((sum, row) => sum + Number(row.netPayout || 0), 0);
  const currentCycleBalance = releasedRows
    .filter((row) => {
      const orderDate = row.orderDate ? new Date(row.orderDate) : null;
      return orderDate && orderDate >= cycleStart && orderDate <= cycleEnd;
    })
    .reduce((sum, row) => sum + Number(row.netPayout || 0), 0);
  const pendingBalance = Math.max(0, deliveredNet - paidBalance - pendingPayouts);

  return {
    grossSales: round2(ledgerRows.reduce((sum, row) => sum + Number(row.saleAmount || 0), 0)),
    totalCommission: round2(ledgerRows.reduce((sum, row) => sum + Number(row.platformCommissionAmount || 0), 0)),
    netEarnings: round2(ledgerRows.reduce((sum, row) => sum + Number(row.vendorEarning || 0), 0)),
    pendingBalance: round2(pendingBalance),
    paidBalance: round2(paidBalance),
    pendingPayouts: round2(pendingPayouts),
    returnDeductions: round2(withheldForReturns),
    deliveredCount: releasedRows.length,
    totalOrders: ledgerRows.length,
    totalItems: ledgerRows.reduce((sum, row) => sum + Number(row.itemCount || 0), 0),
    deliveredGrossSales: round2(releasedRows.reduce((sum, row) => sum + Number(row.saleAmount || 0), 0)),
    deliveredNetEarnings: round2(deliveredNet),
    inProgressGrossSales: round2(pendingRows.reduce((sum, row) => sum + Number(row.saleAmount || 0), 0)),
    cancelledGrossSales: round2(
      ledgerRows
        .filter((row) => row.itemStatus === "void")
        .reduce((sum, row) => sum + Number(row.saleAmount || 0), 0),
    ),
    payoutEligible: pendingBalance >= MINIMUM_PAYOUT,
    minimumPayout: MINIMUM_PAYOUT,
    earningsSummary: {
      currentCycleBalance: round2(currentCycleBalance),
      pendingClearance: round2(pendingRows.reduce((sum, row) => sum + Number(row.netPayout || 0), 0)),
      releasedAmount: round2(paidBalance),
      withheldForReturns: round2(withheldForReturns),
    },
    refundImpact: {
      totalDeducted: round2(withheldForReturns),
      returnsCount: Number(returnDeductions.returnsCount || 0),
      recentReturns: returnDeductions.returns || [],
    },
    payoutSchedule: getPayoutSchedule(),
    currentCycle: {
      start: cycleStart.toISOString(),
      end: cycleEnd.toISOString(),
    },
  };
};

const loadVendorFinanceData = async (req, { range = null, status = null, limit = 1000, page = 1 } = {}) => {
  const vendorId = req.user.vendorId;
  const { Order, VendorPayout, Return } = req.app.locals.models;
  const orderMatch = getDateMatch(range || {});
  const productMatch = status && status !== "all" ? { itemStatus: status } : {};
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.max(1, Math.min(parseInt(limit, 10) || 20, 1000));
  const skip = (pageNumber - 1) * limitNumber;
  const query = getVendorOrderQuery(vendorId, productMatch, orderMatch);

  const ordersCursor = Order.collection
    .find(query)
    .sort({ createdAt: -1 });

  const [orders, totalOrders, payouts, returnDeductions] = await Promise.all([
    ordersCursor.skip(skip).limit(limitNumber).toArray(),
    Order.collection.countDocuments(query),
    VendorPayout.collection
      .find({ vendorId: getObjectId(vendorId), status: { $in: ["paid", "pending", "approved"] } })
      .sort({ createdAt: -1 })
      .toArray(),
    Return.getVendorDeductions(vendorId, range?.start || null, range?.end || null),
  ]);

  const ledgerRows = buildLedgerRows({
    orders,
    returns: returnDeductions.returns || [],
    vendorId,
  });

  return {
    ledgerRows,
    totalOrders,
    page: pageNumber,
    pages: Math.ceil(totalOrders / limitNumber),
    payouts,
    returnDeductions,
  };
};

const requireVendor = (req, res) => {
  if (!req.user.vendorId) {
    res.status(403).json({ success: false, error: "Not a vendor" });
    return false;
  }
  return true;
};

const escapeCsv = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const streamStatementPdf = ({ res, title, month, vendor, summary, transactions, invoiceMode = false }) => {
  const doc = new PDFDocument({ margin: 44, size: "A4" });
  const filename = `${invoiceMode ? "tax-invoice" : "statement"}-${month}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: "left" });
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor("#555").text(`${PLATFORM_NAME} Seller Finance`);
  doc.text(`Period: ${month}`);
  doc.text(`Vendor: ${vendor?.shopName || vendor?.businessName || "Seller"}`);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown();

  const rows = invoiceMode
    ? [
        ["Platform commission", summary.totalCommission],
        ["Shipping fees debited", summary.shippingFeeDebited],
        ["Return deductions", summary.refundDeducted],
        ["Total platform charges", summary.platformCharges],
      ]
    : [
        ["Gross sales", summary.grossSales],
        ["Platform commission", summary.totalCommission],
        ["Shipping credited", summary.shippingFeeCredited],
        ["Shipping debited", summary.shippingFeeDebited],
        ["Refund deducted", summary.refundDeducted],
        ["Net payout", summary.netPayout],
      ];

  doc.fillColor("#111").fontSize(12).text("Summary");
  doc.moveDown(0.4);
  rows.forEach(([label, amount]) => {
    doc.fontSize(10).fillColor("#555").text(label, { continued: true });
    doc.fillColor("#111").text(` BDT ${round2(amount).toLocaleString("en-US")}`, { align: "right" });
  });

  doc.moveDown();
  doc.fontSize(12).fillColor("#111").text("Order Breakdown");
  doc.moveDown(0.4);
  doc.fontSize(8).fillColor("#444");
  transactions.slice(0, 32).forEach((row) => {
    doc.text(
      `${row.orderNumber} | ${new Date(row.orderDate || Date.now()).toISOString().slice(0, 10)} | ` +
        `Sale ${round2(row.saleAmount)} | Commission ${round2(row.platformCommissionAmount)} | Net ${round2(row.netPayout)}`,
    );
  });
  if (transactions.length > 32) {
    doc.moveDown(0.25).text(`Plus ${transactions.length - 32} more rows in the CSV statement.`);
  }

  doc.moveDown();
  doc.fontSize(8).fillColor("#666").text(
    invoiceMode
      ? "This platform-issued invoice summarizes marketplace service charges recorded for the selected period."
      : "This statement is generated from settled seller-center records.",
  );

  doc.end();
};

const getStatementSummary = (transactions = []) => ({
  grossSales: round2(transactions.reduce((sum, row) => sum + Number(row.saleAmount || 0), 0)),
  totalCommission: round2(transactions.reduce((sum, row) => sum + Number(row.platformCommissionAmount || 0), 0)),
  shippingFeeCredited: round2(transactions.reduce((sum, row) => sum + Number(row.shippingFeeCredited || 0), 0)),
  shippingFeeDebited: round2(transactions.reduce((sum, row) => sum + Number(row.shippingFeeDebited || 0), 0)),
  refundDeducted: round2(transactions.reduce((sum, row) => sum + Number(row.refundDeducted || 0), 0)),
  netPayout: round2(transactions.reduce((sum, row) => sum + Number(row.netPayout || 0), 0)),
  platformCharges: round2(
    transactions.reduce(
      (sum, row) =>
        sum +
        Number(row.platformCommissionAmount || 0) +
        Number(row.shippingFeeDebited || 0) +
        Number(row.refundDeducted || 0),
      0,
    ),
  ),
});

exports.getFinanceSummary = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const { cycleStart, cycleEnd } = getWeekCycle();
    const financeData = await loadVendorFinanceData(req, { limit: 1000 });
    const summary = summarizeLedger({
      ledgerRows: financeData.ledgerRows,
      payouts: financeData.payouts,
      returnDeductions: financeData.returnDeductions,
      cycleStart,
      cycleEnd,
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error fetching vendor finance summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const { page = 1, limit = 20, status, month } = req.query;
    const range = month ? getMonthRange(month) : null;
    const financeData = await loadVendorFinanceData(req, { page, limit, status, range });

    res.json({
      success: true,
      data: financeData.ledgerRows,
      total: financeData.totalOrders,
      page: financeData.page,
      pages: financeData.pages,
    });
  } catch (error) {
    console.error("Error fetching vendor transactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCommissionRates = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const { Category, Vendor } = req.app.locals.models;
    const vendor = Vendor?.findById ? await Vendor.findById(req.user.vendorId) : null;
    const allowedIds = new Set((vendor?.allowedCategoryIds || []).map(normalizeId).filter(Boolean));
    const categories = Category?.getCategoriesWithCommission
      ? await Category.getCategoriesWithCommission()
      : await Category.collection.find({ isActive: true }).sort({ name: 1 }).toArray();
    const data = categories
      .filter((category) => allowedIds.size === 0 || allowedIds.has(normalizeId(category._id)))
      .map((category) => ({
        categoryId: category._id,
        name: category.name,
        slug: category.slug || "",
        parentId: category.parentId || null,
        commissionRate: round2(category.commissionRate || 0),
        minimumCommissionRate: round2(category.minimumCommissionRate || 0),
        effectiveCommissionRate: round2(category.effectiveCommissionRate ?? category.commissionRate ?? 0),
      }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching commission rates:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.downloadStatement = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const { format = "csv" } = req.params;
    const monthRange = getMonthRange(req.query.month);
    const financeData = await loadVendorFinanceData(req, { range: monthRange, limit: 1000 });
    const transactions = financeData.ledgerRows;
    const summary = getStatementSummary(transactions);

    if (format === "pdf") {
      const Vendor = req.app.locals.models.Vendor;
      const vendor = Vendor?.findById ? await Vendor.findById(req.user.vendorId) : null;
      streamStatementPdf({
        res,
        title: "Monthly Seller Statement",
        month: monthRange.label,
        vendor,
        summary,
        transactions,
      });
      return;
    }

    if (format !== "csv") {
      return res.status(400).json({ success: false, error: "Unsupported statement format" });
    }

    const headers = [
      "Order ID",
      "Date",
      "Products",
      "Sale Amount",
      "Commission Rate",
      "Commission Amount",
      "Shipping Fee Credited",
      "Shipping Fee Debited",
      "Refund Deducted",
      "Net Payout",
      "Settlement Status",
    ];
    const rows = transactions.map((row) => [
      normalizeId(row.orderId),
      row.orderDate ? new Date(row.orderDate).toISOString().slice(0, 10) : "",
      row.productsSummary,
      row.saleAmount,
      row.platformCommissionRate,
      row.platformCommissionAmount,
      row.shippingFeeCredited,
      row.shippingFeeDebited,
      row.refundDeducted,
      row.netPayout,
      row.itemStatus,
    ]);
    const csv = [headers, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="statement-${monthRange.label}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("Error downloading vendor statement:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.downloadTaxInvoice = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const monthRange = getMonthRange(req.query.month);
    const Vendor = req.app.locals.models.Vendor;
    const vendor = Vendor?.findById ? await Vendor.findById(req.user.vendorId) : null;
    const financeData = await loadVendorFinanceData(req, { range: monthRange, limit: 1000 });
    const transactions = financeData.ledgerRows;
    const summary = getStatementSummary(transactions);

    streamStatementPdf({
      res,
      title: "Platform Tax Invoice",
      month: monthRange.label,
      vendor,
      summary,
      transactions,
      invoiceMode: true,
    });
  } catch (error) {
    console.error("Error downloading vendor tax invoice:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPayouts = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payouts = await VendorPayout.collection
      .find({ vendorId: getObjectId(req.user.vendorId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: payouts });
  } catch (error) {
    console.error("Error fetching vendor payouts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const vendorId = req.user.vendorId;
    const { amount, note, payoutMethod } = req.body;
    const requestedAmount = Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid payout amount" });
    }

    const { VendorPayout, Vendor } = req.app.locals.models;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    const { cycleStart, cycleEnd } = getWeekCycle();
    const financeData = await loadVendorFinanceData(req, { limit: 1000 });
    const summary = summarizeLedger({
      ledgerRows: financeData.ledgerRows,
      payouts: financeData.payouts,
      returnDeductions: financeData.returnDeductions,
      cycleStart,
      cycleEnd,
    });

    if (requestedAmount > summary.pendingBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: BDT ${summary.pendingBalance.toFixed(2)}`,
        availableBalance: summary.pendingBalance,
      });
    }

    if (requestedAmount < MINIMUM_PAYOUT) {
      return res.status(400).json({
        success: false,
        error: `Minimum payout amount is BDT ${MINIMUM_PAYOUT}`,
      });
    }

    const pendingRequests = await VendorPayout.getVendorPendingRequests(vendorId);
    if (pendingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending payout request",
      });
    }

    const payout = await VendorPayout.create({
      vendorId,
      amount: round2(requestedAmount),
      note: note || "Vendor requested payout",
      type: "vendor_requested",
      status: "pending",
      payoutMethod: payoutMethod || vendor.payoutMethod || "bank",
      vendorName: vendor.shopName,
      vendorPhone: vendor.phone,
      vendorEmail: vendor.email,
      bankName: vendor.bankName,
      bankAccountNumber: vendor.bankAccountNumber,
      bankAccountName: vendor.bankAccountName,
      bankBranch: vendor.bankBranch,
      mobileBankingProvider: vendor.mobileBankingProvider,
      mobileBankingNumber: vendor.mobileBankingNumber,
    });

    res.json({
      success: true,
      message: "Payout request submitted successfully. Admin will review it shortly.",
      data: payout,
    });
  } catch (error) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPayoutRequests = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const VendorPayout = req.app.locals.models.VendorPayout;
    const requests = await VendorPayout.collection
      .find({ vendorId: getObjectId(req.user.vendorId), type: "vendor_requested" })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cancelPayoutRequest = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const { id } = req.params;
    const VendorPayout = req.app.locals.models.VendorPayout;
    const payout = await VendorPayout.findById(id);

    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout request not found" });
    }

    if (normalizeId(payout.vendorId) !== normalizeId(req.user.vendorId)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    if (payout.status !== "pending") {
      return res.status(400).json({ success: false, error: "Can only cancel pending requests" });
    }

    await VendorPayout.cancelRequest(id);
    res.json({ success: true, message: "Payout request cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling payout request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAvailableBalance = async (req, res) => {
  try {
    if (!requireVendor(req, res)) return;

    const { cycleStart, cycleEnd } = getWeekCycle();
    const VendorPayout = req.app.locals.models.VendorPayout;
    const financeData = await loadVendorFinanceData(req, { limit: 1000 });
    const summary = summarizeLedger({
      ledgerRows: financeData.ledgerRows,
      payouts: financeData.payouts,
      returnDeductions: financeData.returnDeductions,
      cycleStart,
      cycleEnd,
    });
    const pendingRequests = await VendorPayout.getVendorPendingRequests(req.user.vendorId);

    res.json({
      success: true,
      data: {
        deliveredEarnings: summary.deliveredNetEarnings,
        paidAmount: summary.paidBalance,
        pendingAmount: summary.pendingPayouts,
        returnDeductions: summary.returnDeductions,
        returnsCount: summary.refundImpact.returnsCount,
        availableBalance: summary.pendingBalance,
        deliveredItemsCount: summary.deliveredCount,
        minimumPayout: MINIMUM_PAYOUT,
        canRequestPayout: summary.pendingBalance >= MINIMUM_PAYOUT && pendingRequests.length === 0,
        hasPendingRequest: pendingRequests.length > 0,
        pendingRequest: pendingRequests[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching available balance:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
