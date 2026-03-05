const { ObjectId } = require("mongodb");

class VendorPayout {
  constructor(db) {
    this.collection = db.collection("vendor_payouts");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ periodStart: 1, periodEnd: 1 });
    } catch (error) {
      console.error("Error creating VendorPayout indexes:", error);
    }
  }

  async create(payoutData) {
    const payout = {
      ...payoutData,
      vendorId: typeof payoutData.vendorId === "string"
        ? new ObjectId(payoutData.vendorId)
        : payoutData.vendorId,
      status: "pending",
      createdAt: new Date(),
      paidAt: null,
    };
    const result = await this.collection.insertOne(payout);
    return { ...payout, _id: result.insertedId };
  }

  async findAll(filter = {}) {
    const query = {};
    if (filter.status)   query.status   = filter.status;
    if (filter.vendorId) {
      try { query.vendorId = new ObjectId(filter.vendorId); } catch (_) {}
    }

    const page  = parseInt(filter.page  || 1);
    const limit = parseInt(filter.limit || 20);
    const skip  = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);

    return { payouts, total, page, pages: Math.ceil(total / limit) };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async markPaid(id) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "paid", paidAt: new Date() } }
    );
  }
}

module.exports = VendorPayout;
