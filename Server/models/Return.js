const { ObjectId } = require("mongodb");

class Return {
  constructor(db) {
    this.collection = db.collection("returns");
  }

  async findAll() {
    return await this.collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
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
      disputeReason: null, // Why vendor disputes the return
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
      // When approved, calculate deductions
      const returnDoc = await this.findById(id);
      if (returnDoc) {
        // Vendor loses their earning amount
        updateData.vendorDeduction = returnDoc.vendorEarningAmount || 0;
        // Admin refunds full amount to customer (including commission)
        updateData.adminRefund = returnDoc.refundAmount || 0;
      }
    } else if (status === "completed" || status === "refunded") {
      updateData.completedAt = new Date();
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
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
    const orderProduct = order.products.find((p) => p.productId === productId);
    if (!orderProduct) {
      return { canReturn: false, error: "Product not found in order" };
    }

    // Check if return already requested for this product
    const existingReturn = await this.collection.findOne({
      orderId,
      productId,
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
    return await this.collection.updateOne(
      { _id: new ObjectId(returnId) },
      {
        $set: {
          refundAmount,
          refundMethod,
          refundProcessedAt: new Date(),
          status: "completed",
          updatedAt: new Date(),
        },
      },
    );
  }

  /**
   * Get returns by vendor ID
   */
  async findByVendorId(vendorId, filter = {}) {
    const query = { vendorId: new ObjectId(vendorId) };
    
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
      returns,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get vendor return statistics
   */
  async getVendorReturnStats(vendorId) {
    const pipeline = [
      { $match: { vendorId: new ObjectId(vendorId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalDeduction: { $sum: "$vendorDeduction" },
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
      refunded: 0,
      totalReturns: 0,
      totalDeductions: 0,
      approvedDeductions: 0,
    };

    stats.forEach((stat) => {
      result[stat._id] = stat.count;
      result.totalReturns += stat.count;
      result.totalDeductions += stat.totalDeduction || 0;
      
      if (stat._id === "approved" || stat._id === "completed" || stat._id === "refunded") {
        result.approvedDeductions += stat.totalDeduction || 0;
      }
    });

    return result;
  }

  /**
   * Get total vendor deductions for payout calculation
   * Returns sum of approved/completed returns that should be deducted from vendor earnings
   */
  async getVendorDeductions(vendorId, periodStart = null, periodEnd = null) {
    const query = {
      vendorId: new ObjectId(vendorId),
      status: { $in: ["approved", "completed", "refunded"] },
    };

    if (periodStart || periodEnd) {
      query.approvedAt = {};
      if (periodStart) query.approvedAt.$gte = new Date(periodStart);
      if (periodEnd) query.approvedAt.$lte = new Date(periodEnd);
    }

    const returns = await this.collection.find(query).toArray();

    const totalDeduction = returns.reduce(
      (sum, ret) => sum + (ret.vendorDeduction || 0),
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
        approvedAt: r.approvedAt,
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
    const { action, notes, evidenceImages = [], disputeReason = null } = response;

    if (!['approved', 'disputed'].includes(action)) {
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
      updatedAt: new Date(),
    };

    // If vendor approves, auto-approve the return
    if (action === 'approved') {
      updateData.status = 'approved';
      updateData.approvedAt = new Date();
      updateData.vendorDeduction = returnDoc.vendorEarningAmount || 0;
      updateData.adminRefund = returnDoc.refundAmount || 0;
    }

    // If vendor disputes, add dispute reason and keep status pending for admin review
    if (action === 'disputed') {
      updateData.disputeReason = disputeReason;
      updateData.status = 'pending'; // Admin needs to arbitrate
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(returnId) },
      { $set: updateData }
    );
  }

  /**
   * Get returns pending vendor response
   */
  async getPendingVendorResponse(vendorId) {
    return await this.collection
      .find({
        vendorId: new ObjectId(vendorId),
        status: 'pending',
        vendorResponse: null,
      })
      .sort({ createdAt: -1 })
      .toArray();
  }
}

module.exports = Return;
