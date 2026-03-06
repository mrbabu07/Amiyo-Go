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
exports.getVendorFinanceSummary = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = req.params;
    const { from, to } = req.query;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    const match = {
      vendorId: vendorId.toString(),
      status: { $ne: "cancelled" },
    };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$products" },
      { $match: { "products.vendorId": vendorId.toString() } },
      {
        $group: {
          _id: null,
          grossSales:      { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
          totalCommission: { $sum: "$products.adminCommissionAmount" },
          netEarnings:     { $sum: "$products.vendorEarningAmount" },
          ordersList:      { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          _id: 0,
          grossSales: 1,
          totalCommission: 1,
          netEarnings: 1,
          ordersCount: { $size: "$ordersList" },
        },
      },
    ];

    const result = await db.collection("vendorOrders").aggregate(pipeline).toArray();
    const summary = result[0] || { grossSales: 0, totalCommission: 0, netEarnings: 0, ordersCount: 0 };

    res.json({
      success: true,
      data: {
        grossSales:      round2(summary.grossSales),
        totalCommission: round2(summary.totalCommission),
        netEarnings:     round2(summary.netEarnings),
        ordersCount:     summary.ordersCount,
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

    const match = { vendorId: vendorId.toString() };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$products" },
      { $match: { "products.vendorId": vendorId.toString() } },
      { $sort: { createdAt: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          date: "$createdAt",
          product: "$products.title",
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
      { $match: { "products.vendorId": vendorId.toString() } },
      { $count: "total" },
    ];

    const [transactions, countResult] = await Promise.all([
      db.collection("vendorOrders").aggregate(pipeline).toArray(),
      db.collection("vendorOrders").aggregate(countPipeline).toArray(),
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

