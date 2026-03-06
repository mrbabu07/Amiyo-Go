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

  async updateStatus(id, status, extra = {}) {
    const setFields = {
      status,
      updatedAt: new Date(),
      ...extra,
    };
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: setFields }
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

  /**
   * Aggregated earnings stats for a vendor
   */
  async getVendorOrderStats(vendorId) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [statusCounts, today, month, earningsData] = await Promise.all([
      this.collection.aggregate([
        { $match: { vendorId: vendorId.toString() } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
      this.collection.countDocuments({ vendorId: vendorId.toString(), createdAt: { $gte: todayStart } }),
      this.collection.countDocuments({ vendorId: vendorId.toString(), createdAt: { $gte: thisMonthStart } }),
      this.collection.aggregate([
        { $match: { vendorId: vendorId.toString(), status: { $nin: ['cancelled'] } } },
        { $unwind: '$products' },
        { $match: { 'products.vendorId': vendorId.toString() } },
        {
          $group: {
            _id: null,
            grossSales: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
            totalCommission: { $sum: '$products.adminCommissionAmount' },
            netEarnings: { $sum: '$products.vendorEarningAmount' },
          },
        },
      ]).toArray(),
    ]);

    const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    statusCounts.forEach(s => { if (s._id) counts[s._id] = s.count; });

    const earnings = earningsData[0] || { grossSales: 0, totalCommission: 0, netEarnings: 0 };
    return { ...counts, ...earnings, todayCount: today, monthCount: month };
  }
}

module.exports = VendorOrder;
