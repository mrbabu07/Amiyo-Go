const { ObjectId } = require("mongodb");

const getTransactions = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorId = req.user.vendorId;
    const { from, to, status, page = 1, limit = 10 } = req.query;

    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build match object for vendorOrders
    const match = { vendorId: vendorId.toString() };

    if (status && status !== 'all') {
      match.status = status;
    }

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    // Aggregation pipeline to flatten products
    const pipeline = [
      { $match: match },
      { $unwind: "$products" },
      // Important: We only want standard orders, or we can just filter by vendorId which we already did
      { 
        $match: {
          "products.vendorId": vendorId.toString()
        } 
      },
      { $sort: { createdAt: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          createdAt: 1,
          productName: "$products.title",
          qty: "$products.quantity",
          subtotal: { $multiply: ["$products.price", "$products.quantity"] },
          commissionRateSnapshot: "$products.commissionRateSnapshot",
          adminCommissionAmount: "$products.adminCommissionAmount",
          vendorEarningAmount: "$products.vendorEarningAmount",
          orderStatus: "$status"
        }
      }
    ];

    const transactions = await db.collection("vendorOrders").aggregate(pipeline).toArray();
    
    // Count total flattened products for pagination
    const countPipeline = [
      { $match: match },
      { $unwind: "$products" },
      { $match: { "products.vendorId": vendorId.toString() } },
      { $count: "total" }
    ];
    
    const countResult = await db.collection("vendorOrders").aggregate(countPipeline).toArray();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error("Error in getTransactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStatements = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorId = req.user.vendorId;
    const { month } = req.query; // format YYYY-MM

    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    let dateMatch = {};
    if (month) {
      const [year, m] = month.split('-');
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59);
      dateMatch = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    const pipeline = [
      { $match: { vendorId: vendorId.toString(), ...dateMatch, status: { $ne: "cancelled" } } },
      { $unwind: "$products" },
      { $match: { "products.vendorId": vendorId.toString() } },
      {
        $group: {
          _id: null,
          grossSales: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
          totalCommission: { $sum: "$products.adminCommissionAmount" },
          netEarnings: { $sum: "$products.vendorEarningAmount" },
          ordersList: { $addToSet: "$_id" }
        }
      },
      {
        $project: {
          _id: 0,
          grossSales: 1,
          totalCommission: 1,
          netEarnings: 1,
          ordersCount: { $size: "$ordersList" }
        }
      }
    ];

    const result = await db.collection("vendorOrders").aggregate(pipeline).toArray();
    
    const summary = result.length > 0 ? result[0] : {
      grossSales: 0,
      totalCommission: 0,
      netEarnings: 0,
      ordersCount: 0
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error in getStatements:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    // Payouts collection logic
    const payouts = await db.collection("vendorPayouts")
      .find({ vendorId: vendorId.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: payouts });
  } catch (error) {
    console.error("Error in getPayments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getTransactions,
  getStatements,
  getPayments
};
