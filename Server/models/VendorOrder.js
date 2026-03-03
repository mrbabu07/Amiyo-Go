const { ObjectId } = require("mongodb");

class VendorOrder {
  constructor(db) {
    this.collection = db.collection("vendorOrders");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1 });
      await this.collection.createIndex({ parentOrderId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating VendorOrder indexes:", error);
    }
  }

  async create(orderData) {
    const order = {
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(order);
    return { ...order, _id: result.insertedId };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByVendorId(vendorId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    
    const query = { vendorId: vendorId.toString() };
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByParentOrderId(parentOrderId) {
    return await this.collection
      .find({ parentOrderId: parentOrderId.toString() })
      .toArray();
  }

  async updateStatus(id, status) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );
  }

  async update(id, updateData) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
  }

  async getVendorStats(vendorId) {
    const stats = await this.collection
      .aggregate([
        { $match: { vendorId: vendorId.toString() } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
      ])
      .toArray();

    return stats;
  }
}

module.exports = VendorOrder;
