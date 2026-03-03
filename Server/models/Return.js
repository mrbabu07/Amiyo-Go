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
      status: "pending", // pending, approved, rejected, processing, completed
      images: returnData.images || [], // Support for multiple images
      refundMethod: returnData.refundMethod || null, // bkash, nagad, rocket, upay
      refundAccountNumber: returnData.refundAccountNumber || null, // Mobile banking account number
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
    } else if (status === "completed") {
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
}

module.exports = Return;
