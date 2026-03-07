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


/**
 * Request a payout (vendor initiates)
 */
exports.requestPayout = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const { amount, note, payoutMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid payout amount",
      });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;
    const Vendor = req.app.locals.models.Vendor;
    const Order = req.app.locals.models.Order;
    const Return = req.app.locals.models.Return;

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    // Calculate available balance
    const orders = await Order.collection
      .find({
        "products.vendorId": new ObjectId(vendorId),
        "products.itemStatus": "delivered",
      })
      .toArray();

    let deliveredEarnings = 0;
    orders.forEach((order) => {
      const deliveredProducts = order.products.filter(
        (p) =>
          p.vendorId &&
          p.vendorId.toString() === vendorId.toString() &&
          p.itemStatus === "delivered"
      );

      deliveredProducts.forEach((product) => {
        deliveredEarnings += product.vendorEarningAmount || 0;
      });
    });

    // Get already paid/pending amount
    const existingPayouts = await VendorPayout.collection
      .find({
        vendorId: new ObjectId(vendorId),
        status: { $in: ["paid", "pending", "approved"] },
      })
      .toArray();

    const alreadyPaidOrPending = existingPayouts.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    // Get return deductions
    const returnDeductions = await Return.getVendorDeductions(vendorId);
    const totalReturnDeductions = returnDeductions.totalDeduction || 0;

    // Calculate available balance
    const availableBalance = Math.max(
      0,
      deliveredEarnings - alreadyPaidOrPending - totalReturnDeductions
    );

    // Check if requested amount is available
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ৳${availableBalance.toFixed(2)}`,
        availableBalance: Math.round(availableBalance * 100) / 100,
      });
    }

    // Check minimum payout threshold (e.g., $100 or ৳1000)
    const minimumPayout = 1000; // ৳1000
    if (amount < minimumPayout) {
      return res.status(400).json({
        success: false,
        error: `Minimum payout amount is ৳${minimumPayout}`,
      });
    }

    // Check if there's already a pending request
    const pendingRequests = await VendorPayout.getVendorPendingRequests(vendorId);
    if (pendingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending payout request",
      });
    }

    // Create payout request
    const payout = await VendorPayout.create({
      vendorId,
      amount: Math.round(amount * 100) / 100,
      note: note || "Vendor requested payout",
      type: "vendor_requested",
      status: "pending",
      payoutMethod: payoutMethod || vendor.payoutMethod || "bank",
      vendorName: vendor.shopName,
      vendorPhone: vendor.phone,
      vendorEmail: vendor.email,
      // Bank details
      bankName: vendor.bankName,
      bankAccountNumber: vendor.bankAccountNumber,
      bankAccountName: vendor.bankAccountName,
      bankBranch: vendor.bankBranch,
      // Mobile banking details
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

/**
 * Get vendor's payout requests
 */
exports.getPayoutRequests = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const VendorPayout = req.app.locals.models.VendorPayout;

    const requests = await VendorPayout.collection
      .find({
        vendorId: new ObjectId(vendorId),
        type: "vendor_requested",
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching payout requests:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Cancel a pending payout request
 */
exports.cancelPayoutRequest = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const { id } = req.params;
    const VendorPayout = req.app.locals.models.VendorPayout;

    const payout = await VendorPayout.findById(id);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: "Payout request not found",
      });
    }

    // Verify ownership
    if (payout.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
      });
    }

    // Can only cancel pending requests
    if (payout.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Can only cancel pending requests",
      });
    }

    await VendorPayout.cancelRequest(id);

    res.json({
      success: true,
      message: "Payout request cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling payout request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get available balance for payout request
 */
exports.getAvailableBalance = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, error: "Not a vendor" });
    }

    const Order = req.app.locals.models.Order;
    const VendorPayout = req.app.locals.models.VendorPayout;
    const Return = req.app.locals.models.Return;

    // Get delivered earnings
    const orders = await Order.collection
      .find({
        "products.vendorId": new ObjectId(vendorId),
        "products.itemStatus": "delivered",
      })
      .toArray();

    let deliveredEarnings = 0;
    let deliveredItemsCount = 0;

    orders.forEach((order) => {
      const deliveredProducts = order.products.filter(
        (p) =>
          p.vendorId &&
          p.vendorId.toString() === vendorId.toString() &&
          p.itemStatus === "delivered"
      );

      deliveredProducts.forEach((product) => {
        deliveredEarnings += product.vendorEarningAmount || 0;
        deliveredItemsCount++;
      });
    });

    // Get already paid/pending amount
    const existingPayouts = await VendorPayout.collection
      .find({
        vendorId: new ObjectId(vendorId),
        status: { $in: ["paid", "pending", "approved"] },
      })
      .toArray();

    const paidAmount = existingPayouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingAmount = existingPayouts
      .filter((p) => p.status === "pending" || p.status === "approved")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get return deductions
    const returnDeductions = await Return.getVendorDeductions(vendorId);
    const totalReturnDeductions = returnDeductions.totalDeduction || 0;

    // Calculate available balance
    const availableBalance = Math.max(
      0,
      deliveredEarnings - paidAmount - pendingAmount - totalReturnDeductions
    );

    // Check if there's a pending request
    const pendingRequests = await VendorPayout.getVendorPendingRequests(vendorId);

    res.json({
      success: true,
      data: {
        deliveredEarnings: Math.round(deliveredEarnings * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        returnDeductions: Math.round(totalReturnDeductions * 100) / 100,
        returnsCount: returnDeductions.returnsCount,
        availableBalance: Math.round(availableBalance * 100) / 100,
        deliveredItemsCount,
        minimumPayout: 1000,
        canRequestPayout: availableBalance >= 1000 && pendingRequests.length === 0,
        hasPendingRequest: pendingRequests.length > 0,
        pendingRequest: pendingRequests[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching available balance:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
