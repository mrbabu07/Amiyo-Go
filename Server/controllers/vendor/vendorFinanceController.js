const { ObjectId } = require("mongodb");

/**
 * Get vendor finance summary
 */
exports.getFinanceSummary = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const Order = req.app.locals.models.Order;
    const VendorPayout = req.app.locals.models.VendorPayout;

    // Get all orders with vendor's products
    const orders = await Order.collection
      .find({ "products.vendorId": new ObjectId(vendorId) })
      .toArray();

    let grossSales = 0;
    let totalCommission = 0;
    let netEarnings = 0;
    let pendingBalance = 0;

    orders.forEach((order) => {
      const vendorProducts = order.products.filter(
        (p) => p.vendorId && p.vendorId.toString() === vendorId.toString()
      );

      vendorProducts.forEach((product) => {
        const itemTotal = product.price * product.quantity;
        grossSales += itemTotal;
        totalCommission += product.adminCommissionAmount || 0;
        netEarnings += product.vendorEarningAmount || 0;

        // Only count delivered items as pending if not yet paid
        if (product.itemStatus === "delivered") {
          pendingBalance += product.vendorEarningAmount || 0;
        }
      });
    });

    // Get paid amount from payouts
    const payouts = await VendorPayout.collection
      .find({ vendorId: new ObjectId(vendorId), status: "paid" })
      .toArray();

    const paidBalance = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Adjust pending balance
    pendingBalance = Math.max(0, pendingBalance - paidBalance);

    res.json({
      success: true,
      data: {
        grossSales: Math.round(grossSales * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        pendingBalance: Math.round(pendingBalance * 100) / 100,
        paidBalance: Math.round(paidBalance * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor finance summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get vendor transactions (order items)
 */
exports.getTransactions = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const { page = 1, limit = 20, status } = req.query;
    const Order = req.app.locals.models.Order;

    const query = { "products.vendorId": new ObjectId(vendorId) };
    if (status && status !== "all") {
      query["products.itemStatus"] = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Extract vendor's products as transactions
    const transactions = [];
    orders.forEach((order) => {
      const vendorProducts = order.products.filter(
        (p) => p.vendorId && p.vendorId.toString() === vendorId.toString()
      );

      vendorProducts.forEach((product) => {
        transactions.push({
          orderId: order._id,
          orderDate: order.createdAt,
          productName: product.name,
          quantity: product.quantity,
          price: product.price,
          itemTotal: product.price * product.quantity,
          commissionRate: product.commissionRateSnapshot || 0,
          commissionAmount: product.adminCommissionAmount || 0,
          vendorEarning: product.vendorEarningAmount || 0,
          itemStatus: product.itemStatus || "pending",
          trackingNumber: product.trackingNumber,
        });
      });
    });

    const total = await Order.collection.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching vendor transactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get vendor payout history
 */
exports.getPayouts = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;

    const payouts = await VendorPayout.collection
      .find({ vendorId: new ObjectId(vendorId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: payouts,
    });
  } catch (error) {
    console.error("Error fetching vendor payouts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
