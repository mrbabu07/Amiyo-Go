const { ObjectId } = require("mongodb");

/**
 * Calculate eligible payout for a vendor
 * Shows delivered items that haven't been paid yet
 */
exports.calculateEligiblePayout = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const Order = req.app.locals.models.Order;
    const VendorPayout = req.app.locals.models.VendorPayout;

    // Get all orders with delivered items for this vendor
    const orders = await Order.collection
      .find({
        "products.vendorId": new ObjectId(vendorId),
        "products.itemStatus": "delivered",
      })
      .toArray();

    let eligibleAmount = 0;
    let totalItems = 0;
    const eligibleOrders = [];

    orders.forEach((order) => {
      const deliveredProducts = order.products.filter(
        (p) =>
          p.vendorId &&
          p.vendorId.toString() === vendorId &&
          p.itemStatus === "delivered"
      );

      if (deliveredProducts.length > 0) {
        let orderEarnings = 0;
        deliveredProducts.forEach((product) => {
          eligibleAmount += product.vendorEarningAmount || 0;
          orderEarnings += product.vendorEarningAmount || 0;
          totalItems++;
        });

        eligibleOrders.push({
          orderId: order._id,
          orderDate: order.createdAt,
          itemsCount: deliveredProducts.length,
          earnings: orderEarnings,
        });
      }
    });

    // Get already paid amount
    const paidPayouts = await VendorPayout.collection
      .find({ vendorId: new ObjectId(vendorId), status: "paid" })
      .toArray();
    const alreadyPaid = paidPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get pending payouts
    const pendingPayouts = await VendorPayout.collection
      .find({ vendorId: new ObjectId(vendorId), status: "pending" })
      .toArray();
    const pendingAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate final eligible amount
    const finalEligibleAmount = Math.max(0, eligibleAmount - alreadyPaid - pendingAmount);

    res.json({
      success: true,
      data: {
        totalDeliveredEarnings: Math.round(eligibleAmount * 100) / 100,
        alreadyPaid: Math.round(alreadyPaid * 100) / 100,
        pendingPayouts: Math.round(pendingAmount * 100) / 100,
        eligibleAmount: Math.round(finalEligibleAmount * 100) / 100,
        totalItems,
        eligibleOrdersCount: eligibleOrders.length,
        eligibleOrders: eligibleOrders.slice(0, 10), // Show first 10
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

    // Create payout record
    const payout = await VendorPayout.create({
      vendorId,
      amount: Math.round(amount * 100) / 100,
      note: note || "",
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      createdBy: req.user._id,
      vendorName: vendor.shopName,
      vendorPhone: vendor.phone,
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

    res.json({
      success: true,
      payouts: payoutsWithVendor,
      total: result.total,
      page: result.page,
      pages: result.pages,
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
