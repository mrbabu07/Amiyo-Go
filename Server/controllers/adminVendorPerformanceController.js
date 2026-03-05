const { ObjectId } = require("mongodb");

/**
 * GET /api/admin/vendors/:id/performance
 *
 * Aggregates from the `orders` collection on products.vendorId.
 * Returns order count, revenue, cancellation rate, avg order value,
 * and top 5 products.
 */
exports.getVendorPerformance = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    let vendorObjectId;
    try {
      vendorObjectId = new ObjectId(id);
    } catch (_) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    // Verify vendor exists
    const vendor = await db.collection("vendors").findOne({ _id: vendorObjectId });
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    const ordersCol = db.collection("orders");

    // All orders that contain at least one product from this vendor
    const [stats, cancelledCount, topProductsAgg] = await Promise.all([
      // 1. Total orders + revenue (non-cancelled)
      ordersCol.aggregate([
        { $match: { "products.vendorId": vendorObjectId, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
          },
        },
      ]).toArray(),

      // 2. Cancelled count
      ordersCol.countDocuments({
        "products.vendorId": vendorObjectId,
        status: "cancelled",
      }),

      // 3. Top 5 products by quantity sold
      ordersCol.aggregate([
        { $match: { "products.vendorId": vendorObjectId, status: { $ne: "cancelled" } } },
        { $unwind: "$products" },
        { $match: { "products.vendorId": vendorObjectId } },
        {
          $group: {
            _id: "$products.productId",
            title: { $first: "$products.title" },
            quantitySold: { $sum: "$products.quantity" },
            revenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
          },
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 5 },
      ]).toArray(),
    ]);

    const totalOrders  = stats[0]?.totalOrders  || 0;
    const totalRevenue = stats[0]?.totalRevenue  || 0;
    const totalAll     = totalOrders + cancelledCount;
    const cancellationRate =
      totalAll > 0 ? Math.round((cancelledCount / totalAll) * 10000) / 100 : 0;
    const averageOrderValue =
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0;

    // Average rating from reviews
    const reviewsAgg = await db.collection("reviews").aggregate([
      {
        $match: {
          vendorId: vendorObjectId,   // if reviews store vendorId
        },
      },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]).toArray();
    const averageRating = reviewsAgg[0]?.avg
      ? Math.round(reviewsAgg[0].avg * 10) / 10
      : null;

    res.json({
      success: true,
      data: {
        vendorId: id,
        shopName: vendor.shopName,
        totalOrders,
        cancelledOrders: cancelledCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        cancellationRate,
        averageOrderValue,
        averageRating,
        topProducts: topProductsAgg.map(p => ({
          productId: p._id,
          title: p.title,
          quantitySold: p.quantitySold,
          revenue: Math.round(p.revenue * 100) / 100,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getVendorPerformance:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
