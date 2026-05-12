const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

const router = express.Router();

const safeCount = async (collection, query) => {
  try {
    return await collection.countDocuments(query);
  } catch {
    return 0;
  }
};

router.get("/summary", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orders = db.collection("orders");
    const products = db.collection("products");
    const vendors = db.collection("vendors");
    const returns = db.collection("returns");
    const payouts = db.collection("vendor_payouts");
    const supportTickets = db.collection("supportTickets");
    const adminVendorChats = db.collection("adminVendorChats");
    const categoryRequests = db.collection("category_requests");

    const [
      newOrders,
      pendingOrders,
      processingOrders,
      pendingProducts,
      pendingVendors,
      pendingReturns,
      pendingPayouts,
      payoutRequests,
      openSupport,
      unreadVendorChats,
      pendingCategoryRequests,
    ] = await Promise.all([
      safeCount(orders, { createdAt: { $gte: since } }),
      safeCount(orders, { status: "pending" }),
      safeCount(orders, { status: "processing" }),
      safeCount(products, { approvalStatus: "pending" }),
      safeCount(vendors, { status: "pending" }),
      safeCount(returns, { status: { $in: ["pending", "requested"] } }),
      safeCount(payouts, { status: "pending" }),
      safeCount(payouts, { type: "vendor_requested", status: "pending" }),
      safeCount(supportTickets, { status: { $in: ["open", "in_progress"] } }),
      safeCount(adminVendorChats, { hasUnreadAdmin: true }),
      safeCount(categoryRequests, { status: "pending" }),
    ]);

    const sectionCounts = {
      dashboard: newOrders + pendingOrders + pendingProducts + pendingVendors,
      vendorActivity: newOrders + unreadVendorChats,
      vendors: pendingVendors,
      vendorChats: unreadVendorChats,
      products: pendingProducts,
      orders: pendingOrders + processingOrders,
      returns: pendingReturns,
      payouts: pendingPayouts,
      payoutRequests,
      categories: pendingCategoryRequests,
      support: openSupport,
      users: openSupport,
    };

    res.json({
      success: true,
      data: {
        updatedAt: new Date(),
        since,
        counts: {
          newOrders,
          pendingOrders,
          processingOrders,
          pendingProducts,
          pendingVendors,
          pendingReturns,
          pendingPayouts,
          payoutRequests,
          openSupport,
          unreadVendorChats,
          pendingCategoryRequests,
        },
        sectionCounts,
        total: Object.values(sectionCounts).reduce((sum, count) => sum + count, 0),
      },
    });
  } catch (error) {
    console.error("Error loading admin alert summary:", error);
    res.status(500).json({ success: false, error: "Failed to load admin alerts" });
  }
});

module.exports = router;
