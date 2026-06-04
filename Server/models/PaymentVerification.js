const { ObjectId } = require("mongodb");

class PaymentVerification {
  constructor(db) {
    this.collection = db.collection("payment_verifications");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ orderId: 1 }, { unique: true });
      await this.collection.createIndex({ status: 1, createdAt: -1 });
      await this.collection.createIndex({ transactionId: 1 });
    } catch (error) {
      console.error("Error creating PaymentVerification indexes:", error);
    }
  }

  async upsertFromOrder(order, patch = {}) {
    const now = new Date();
    const orderId = order?._id?.toString?.() || String(order?.orderId || "");
    if (!orderId) return null;

    await this.collection.updateOne(
      { orderId },
      {
        $set: {
          userId: order.userId || null,
          amount: Number(order.total || order.totalAmount || order.finalTotal || 0),
          paymentMethod: order.paymentMethod || "",
          transactionId: order.transactionId || null,
          status: order.manualPaymentVerification?.status || order.paymentStatus || "pending",
          orderCreatedAt: order.createdAt || null,
          updatedAt: now,
          ...patch,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return this.collection.findOne({ orderId });
  }

  async findByOrderId(orderId) {
    return this.collection.findOne({ orderId: String(orderId) });
  }
}

module.exports = PaymentVerification;
