const { ObjectId } = require("mongodb");

const vendorIdValues = (vendorId) => {
  const value = vendorId?.toString?.() || String(vendorId || "");
  const values = [value];
  if (ObjectId.isValid(value)) values.push(new ObjectId(value));
  return values;
};

const DEDUCTIBLE_STATUSES = new Set(["approved", "completed", "refunded"]);

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getLineRefundAmount = (returnDoc = {}) => {
  const safeReturn = returnDoc || {};
  const quantity = Number(safeReturn.quantity || 1);
  const productPrice = Number(safeReturn.productPrice || safeReturn.price || safeReturn.unitPrice || 0);
  const fallbackAmount = productPrice * quantity;
  return round2(
    safeReturn.refundAmount ??
      safeReturn.adminRefund ??
      safeReturn.totalAmount ??
      safeReturn.amount ??
      fallbackAmount,
  );
};

const calculateVendorDeduction = (returnDoc = {}, refundOverride = null) => {
  const safeReturn = returnDoc || {};
  if (!safeReturn.vendorId) return 0;

  const storedDeduction = Number(safeReturn.vendorDeduction || 0);
  if (storedDeduction > 0) return round2(storedDeduction);

  const vendorEarning = Number(safeReturn.vendorEarningAmount || 0);
  if (vendorEarning > 0) return round2(vendorEarning);

  const refundAmount = refundOverride === null || refundOverride === undefined
    ? getLineRefundAmount(safeReturn)
    : round2(refundOverride);
  const commission = Number(safeReturn.adminCommissionAmount || 0);

  return round2(Math.max(0, refundAmount - commission));
};

const getAdminRefundAmount = (returnDoc = {}, refundOverride = null) => {
  const amount = refundOverride === null || refundOverride === undefined
    ? getLineRefundAmount(returnDoc || {})
    : round2(refundOverride);
  return round2(amount);
};

const normalizeReturnFinancials = (returnDoc = {}) => {
  if (!returnDoc) return returnDoc;
  const status = String(returnDoc.status || "").toLowerCase();
  if (!DEDUCTIBLE_STATUSES.has(status)) return returnDoc;

  const adminRefund = getAdminRefundAmount(returnDoc);
  return {
    ...returnDoc,
    adminRefund: returnDoc.adminRefund || adminRefund,
    vendorDeduction: calculateVendorDeduction(returnDoc, adminRefund),
  };
};

const buildDateFilter = (periodStart = null, periodEnd = null) => {
  if (!periodStart && !periodEnd) return null;

  const bounds = {};
  if (periodStart) bounds.$gte = new Date(periodStart);
  if (periodEnd) bounds.$lte = new Date(periodEnd);

  return [
    { approvedAt: bounds },
    { refundProcessedAt: bounds },
    { completedAt: bounds },
    { refundedAt: bounds },
    { updatedAt: bounds },
  ];
};

class Return {
  constructor(db) {
    this.collection = db.collection("returns");
  }

  async findAll() {
    const returns = await this.collection.find({}).sort({ createdAt: -1 }).toArray();
    return returns.map(normalizeReturnFinancials);
  }

  async findById(id) {
    const returnDoc = await this.collection.findOne({ _id: new ObjectId(id) });
    return normalizeReturnFinancials(returnDoc);
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findByOrderId(orderId) {
    return await this.collection
      .find({ orderId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async create(returnData) {
    const returnRequest = {
      ...returnData,
      status: "pending", // pending, approved, rejected, processing, completed, refunded
      images: returnData.images || [], // Support for multiple images
      refundMethod: returnData.refundMethod || null, // bkash, nagad, rocket, upay, bank_transfer
      refundAccountNumber: returnData.refundAccountNumber || null, // Mobile banking account number
      // Financial tracking
      vendorId: returnData.vendorId || null,
      vendorEarningAmount: returnData.vendorEarningAmount || 0, // Amount vendor earned from this item
      adminCommissionAmount: returnData.adminCommissionAmount || 0, // Commission admin earned
      commissionRateSnapshot: returnData.commissionRateSnapshot || 0, // Commission rate at time of sale
      // Deduction tracking
      vendorDeduction: 0, // Amount to deduct from vendor payout (set when approved)
      adminRefund: 0, // Amount admin refunds to customer (set when approved)
      isDeductedFromVendor: false, // Whether deduction has been applied to vendor
      deductedAt: null,
      // Vendor response fields
      vendorResponse: null, // 'approved' | 'disputed' | null
      vendorResponseDate: null,
      vendorResponseNotes: null,
      vendorEvidenceImages: [], // Photos/documents uploaded by vendor
      vendorEvidenceFiles: [],
      disputeReason: null, // Why vendor disputes the return
      timeline: [
        {
          status: "submitted",
          label: "Return submitted",
          at: new Date(),
          actorRole: "user",
          note: returnData.reason || "",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(returnRequest);
    return result.insertedId;
  }

  async updateStatus(id, status, adminNotes = null) {
    const updateData = {
      status,
      updatedAt: new Date(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === "approved") {
      updateData.approvedAt = new Date();
      // When approved, calculate deductions from stored earning data or sale/refund fallback.
      const returnDoc = await this.findById(id);
      if (returnDoc) {
        updateData.vendorDeduction = calculateVendorDeduction(returnDoc);
        updateData.adminRefund = getAdminRefundAmount(returnDoc);
      }
    } else if (status === "completed" || status === "refunded") {
      updateData.completedAt = new Date();
      const returnDoc = await this.findById(id);
      if (returnDoc) {
        const adminRefund = getAdminRefundAmount(returnDoc);
        updateData.vendorDeduction = calculateVendorDeduction(returnDoc, adminRefund);
        updateData.adminRefund = adminRefund;
      }
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updateData,
        $push: {
          timeline: {
            status,
            label: `Return ${status}`,
            at: new Date(),
            actorRole: "admin",
            note: adminNotes || "",
          },
        },
      },
    );
  }

  async canReturnProduct(orderId, productId, userId) {
    // Check if order exists and belongs to user
    const db = this.collection.db;
    const order = await db.collection("orders").findOne({
      _id: new ObjectId(orderId),
      userId,
    });

    if (!order) {
      return { canReturn: false, error: "Order not found" };
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return {
        canReturn: false,
        error: "Order must be delivered to request return",
      };
    }

    // Check if return window is still open (e.g., 7 days)
    const deliveredDate = order.deliveredAt || order.updatedAt;
    const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const now = new Date();

    if (now - new Date(deliveredDate) > returnWindow) {
      return { canReturn: false, error: "Return window has expired (7 days)" };
    }

    // Check if product exists in order
    const orderProduct = order.products.find(
      (p) => p.productId && p.productId.toString() === productId.toString(),
    );
    if (!orderProduct) {
      return { canReturn: false, error: "Product not found in order" };
    }

    // Check if return already requested for this product
    const existingReturn = await this.collection.findOne({
      orderId,
      productId: { $in: ObjectId.isValid(productId) ? [productId, new ObjectId(productId)] : [productId] },
      status: { $in: ["pending", "approved", "processing"] },
    });

    if (existingReturn) {
      return {
        canReturn: false,
        error: "Return already requested for this product",
      };
    }

    return { canReturn: true, orderProduct };
  }

  async getReturnStats() {
    const pipeline = [
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$refundAmount" },
        },
      },
    ];

    const stats = await this.collection.aggregate(pipeline).toArray();

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      completed: 0,
      totalRefunded: 0,
    };

    stats.forEach((stat) => {
      result[stat._id] = stat.count;
      if (stat._id === "completed") {
        result.totalRefunded = stat.totalAmount || 0;
      }
    });

    return result;
  }

  async processRefund(returnId, refundAmount, refundMethod = "original") {
    const returnDoc = await this.findById(returnId);
    const adminRefund = getAdminRefundAmount(returnDoc, refundAmount);
    const vendorDeduction = calculateVendorDeduction(returnDoc, adminRefund);

    return await this.collection.updateOne(
      { _id: new ObjectId(returnId) },
      {
        $set: {
          refundAmount: adminRefund,
          refundMethod,
          adminRefund,
          vendorDeduction,
          refundProcessedAt: new Date(),
          completedAt: new Date(),
          status: "completed",
          updatedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "resolved",
            label: "Refund processed",
            at: new Date(),
            actorRole: "admin",
            note: refundMethod,
          },
        },
      },
    );
  }

  /**
   * Get returns by vendor ID
   */
  async findByVendorId(vendorId, filter = {}) {
    const query = { vendorId: { $in: vendorIdValues(vendorId) } };
    
    if (filter.status) {
      query.status = filter.status;
    }

    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const [returns, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return {
      returns: returns.map(normalizeReturnFinancials),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get vendor return statistics
   */
  async getVendorReturnStats(vendorId) {
    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      completed: 0,
      refunded: 0,
      totalReturns: 0,
      totalDeductions: 0,
      approvedDeductions: 0,
    };

    const returns = await this.collection.find({ vendorId: { $in: vendorIdValues(vendorId) } }).toArray();
    returns.map(normalizeReturnFinancials).forEach((returnDoc) => {
      const status = String(returnDoc.status || "pending").toLowerCase();
      if (result[status] !== undefined) result[status] += 1;
      result.totalReturns += 1;
      result.totalDeductions += Number(returnDoc.vendorDeduction || 0);

      if (DEDUCTIBLE_STATUSES.has(status)) {
        result.approvedDeductions += Number(returnDoc.vendorDeduction || 0);
      }
    });

    result.totalDeductions = round2(result.totalDeductions);
    result.approvedDeductions = round2(result.approvedDeductions);

    return result;
  }

  /**
   * Get total vendor deductions for payout calculation
   * Returns sum of approved/completed returns that should be deducted from vendor earnings
   */
  async getVendorDeductions(vendorId, periodStart = null, periodEnd = null) {
    const query = {
      vendorId: { $in: vendorIdValues(vendorId) },
      status: { $in: ["approved", "completed", "refunded"] },
    };

    const dateFilter = buildDateFilter(periodStart, periodEnd);
    if (dateFilter) query.$or = dateFilter;

    const returns = (await this.collection.find(query).toArray()).map(normalizeReturnFinancials);

    const totalDeduction = returns.reduce(
      (sum, ret) => sum + Number(ret.vendorDeduction || 0),
      0
    );

    return {
      totalDeduction: Math.round(totalDeduction * 100) / 100,
      returnsCount: returns.length,
      returns: returns.map((r) => ({
        returnId: r._id,
        orderId: r.orderId,
        productTitle: r.productTitle,
        deduction: r.vendorDeduction,
        vendorDeduction: r.vendorDeduction,
        refundAmount: r.refundAmount,
        approvedAt: r.approvedAt,
        completedAt: r.completedAt || r.refundProcessedAt || null,
        status: r.status,
      })),
    };
  }

  /**
   * Mark vendor deduction as applied
   */
  async markDeductionApplied(returnId) {
    return await this.collection.updateOne(
      { _id: new ObjectId(returnId) },
      {
        $set: {
          isDeductedFromVendor: true,
          deductedAt: new Date(),
        },
      }
    );
  }

  /**
   * Vendor responds to return request (approve or dispute)
   */
  async vendorRespond(returnId, vendorId, response) {
    const { action, notes, evidenceImages = [], evidenceFiles = [], disputeReason = null } = response;

    if (!['approved', 'disputed', 'rejected'].includes(action)) {
      throw new Error('Invalid vendor response action');
    }

    // Verify return belongs to this vendor
    const returnDoc = await this.findById(returnId);
    if (!returnDoc) {
      throw new Error('Return not found');
    }

    if (returnDoc.vendorId.toString() !== vendorId.toString()) {
      throw new Error('This return does not belong to your products');
    }

    if (returnDoc.status !== 'pending') {
      throw new Error('Can only respond to pending returns');
    }

    if (returnDoc.vendorResponse) {
      throw new Error('You have already responded to this return');
    }

    const updateData = {
      vendorResponse: action,
      vendorResponseDate: new Date(),
      vendorResponseNotes: notes || null,
      vendorEvidenceImages: evidenceImages,
      vendorEvidenceFiles: evidenceFiles.length ? evidenceFiles : evidenceImages,
      updatedAt: new Date(),
    };

    // If vendor approves, auto-approve the return
    if (action === 'approved') {
      updateData.status = 'approved';
      updateData.approvedAt = new Date();
      updateData.vendorDeduction = calculateVendorDeduction(returnDoc);
      updateData.adminRefund = getAdminRefundAmount(returnDoc);
    }

    // If vendor disputes, add dispute reason and keep status pending for admin review
    if (action === 'disputed') {
      updateData.disputeReason = disputeReason;
      updateData.status = 'pending'; // Admin needs to arbitrate
    }

    if (action === 'rejected') {
      updateData.disputeReason = disputeReason;
      updateData.status = 'rejected';
      updateData.rejectedAt = new Date();
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(returnId) },
      {
        $set: updateData,
        $push: {
          timeline: {
            status: action === "disputed" ? "under_review" : action,
            label: action === "disputed"
              ? "Vendor disputed return"
              : action === "rejected"
                ? "Vendor rejected return"
                : "Vendor approved return",
            at: new Date(),
            actorRole: "vendor",
            note: notes || disputeReason || "",
          },
        },
      }
    );
  }

  /**
   * Get returns pending vendor response
   */
  async getPendingVendorResponse(vendorId) {
    return await this.collection
      .find({
        vendorId: { $in: vendorIdValues(vendorId) },
        status: 'pending',
        vendorResponse: null,
      })
      .sort({ createdAt: -1 })
      .toArray();
  }
}

module.exports = Return;
