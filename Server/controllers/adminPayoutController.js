const { ObjectId } = require("mongodb");

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// GET /api/admin/payouts
exports.getPayouts = async (req, res) => {
  try {
    const VendorPayout = req.app.locals.models.VendorPayout;
    const { status, vendorId, page, limit } = req.query;
    const result = await VendorPayout.findAll({ status, vendorId, page, limit });

    // Enrich with vendor shopName
    const db = req.app.locals.db;
    const vendorIds = [...new Set(
      result.payouts.map(p => p.vendorId?.toString()).filter(Boolean)
    )];
    const vendors = vendorIds.length
      ? await db.collection("vendors").find({
          _id: { $in: vendorIds.map(id => new ObjectId(id)) }
        }).toArray()
      : [];
    const vendorMap = Object.fromEntries(vendors.map(v => [v._id.toString(), v.shopName]));

    result.payouts = result.payouts.map(p => ({
      ...p,
      vendorShopName: p.vendorId ? vendorMap[p.vendorId.toString()] || null : null,
    }));

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error in getPayouts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/admin/payouts/generate
// Aggregates net vendor earnings from delivered orders not already captured in a payout,
// and creates one pending payout record per vendor.
exports.generatePayouts = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const VendorPayout = req.app.locals.models.VendorPayout;

    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: "periodStart and periodEnd (ISO date strings) are required",
      });
    }

    const start = new Date(periodStart);
    const end   = new Date(periodEnd);
    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({ success: false, error: "Invalid period dates" });
    }

    // Find existing payouts for this period to avoid duplicates
    const existingPayouts = await db.collection("vendor_payouts").find({
      periodStart: { $lte: end },
      periodEnd:   { $gte: start },
    }).toArray();
    const alreadyPaidVendors = new Set(
      existingPayouts.map(p => p.vendorId?.toString())
    );

    // Aggregate vendor earnings from delivered orders in the period
    const earningsAgg = await db.collection("orders").aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.vendorId",
          netEarnings: { $sum: "$products.vendorEarningAmount" },
          orderCount:  { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
    ]).toArray();

    const created = [];
    const skipped = [];

    for (const entry of earningsAgg) {
      const vendorIdStr = entry._id?.toString();
      if (!vendorIdStr || alreadyPaidVendors.has(vendorIdStr)) {
        skipped.push(vendorIdStr);
        continue;
      }

      const payout = await VendorPayout.create({
        vendorId:    vendorIdStr,
        amount:      round2(entry.netEarnings),
        orderCount:  entry.orderCount,
        periodStart: start,
        periodEnd:   end,
      });
      created.push(payout);
    }

    res.status(201).json({
      success: true,
      message: `Generated ${created.length} payout(s). ${skipped.length} vendor(s) skipped (already have a payout for this period).`,
      created,
      skippedCount: skipped.length,
    });
  } catch (error) {
    console.error("Error in generatePayouts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/admin/payouts/:id/pay
exports.markPayoutPaid = async (req, res) => {
  try {
    const VendorPayout = req.app.locals.models.VendorPayout;
    const { id } = req.params;

    const payout = await VendorPayout.findById(id);
    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout not found" });
    }
    if (payout.status === "paid") {
      return res.status(400).json({ success: false, error: "Payout already marked as paid" });
    }

    await VendorPayout.markPaid(id);
    const updated = await VendorPayout.findById(id);
    res.json({ success: true, message: "Payout marked as paid.", data: updated });
  } catch (error) {
    console.error("Error in markPayoutPaid:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
