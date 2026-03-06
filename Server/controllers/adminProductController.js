const { ObjectId } = require("mongodb");

// GET /api/admin/products — paginated list, filterable by approvalStatus / vendorId
exports.getAllAdminProducts = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { approvalStatus, vendorId, page = 1, limit = 20, search } = req.query;

    const query = {};
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (vendorId) {
      try { query.vendorId = new ObjectId(vendorId); } catch (_) {}
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const col = db.collection("products");
    const [products, total] = await Promise.all([
      col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(query),
    ]);

    // Enrich with vendor shopName
    const vendorIds = [...new Set(
      products.map(p => p.vendorId?.toString()).filter(Boolean)
    )];
    const vendors = vendorIds.length
      ? await db.collection("vendors").find({
          _id: { $in: vendorIds.map(id => new ObjectId(id)) }
        }).toArray()
      : [];
    const vendorMap = Object.fromEntries(vendors.map(v => [v._id.toString(), v.shopName]));

    const enriched = products.map(p => ({
      ...p,
      vendorShopName: p.vendorId ? vendorMap[p.vendorId.toString()] || null : null,
    }));

    res.json({
      success: true,
      data: enriched,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error in getAllAdminProducts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/admin/products/pending — shortcut for approvalStatus=pending
exports.getPendingProducts = async (req, res) => {
  req.query.approvalStatus = "pending";
  return exports.getAllAdminProducts(req, res);
};

// PATCH /api/admin/products/:id/approve
exports.approveProduct = async (req, res) => {
  try {
    const db  = req.app.locals.db;
    const col = db.collection("products");
    const { id } = req.params;
    const now = new Date();

    const result = await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          approvalStatus: "approved",
          approvedBy: req.user?.uid || null,
          approvedAt: now,
          lastModeratedAt: now,
          rejectionReason: null,
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const product = await col.findOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: "Product approved.", data: product });
  } catch (error) {
    console.error("Error in approveProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/admin/products/:id/reject
exports.rejectProduct = async (req, res) => {
  try {
    const db  = req.app.locals.db;
    const col = db.collection("products");
    const { id } = req.params;
    const { reason } = req.body;
    const now = new Date();

    const result = await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          approvalStatus: "rejected",
          rejectionReason: reason || null,
          lastModeratedAt: now,
          approvedAt: null,
          approvedBy: null,
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const product = await col.findOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: "Product rejected.", data: product });
  } catch (error) {
    console.error("Error in rejectProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/admin/products/:id/disable — force-hide (policy violation)
exports.disableProduct = async (req, res) => {
  try {
    const db  = req.app.locals.db;
    const col = db.collection("products");
    const { id } = req.params;
    const now = new Date();

    const result = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, lastModeratedAt: now, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const product = await col.findOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: "Product disabled.", data: product });
  } catch (error) {
    console.error("Error in disableProduct:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/admin/vendors/:vendorId/products — vendor's products from admin panel
exports.getVendorProductsAdmin = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { vendorId } = req.params;
    const { status, page = 1, limit = 20, search } = req.query;

    let vendorObjectId;
    try {
      vendorObjectId = new ObjectId(vendorId);
    } catch (_) {
      return res.status(400).json({ success: false, error: "Invalid vendorId" });
    }

    const query = { vendorId: vendorObjectId };
    if (status && status !== "all") query.approvalStatus = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;
    const col = db.collection("products");

    const [products, total] = await Promise.all([
      col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error in getVendorProductsAdmin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
