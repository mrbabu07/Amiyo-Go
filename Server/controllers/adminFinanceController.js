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
