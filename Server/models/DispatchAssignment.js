const { ObjectId } = require("mongodb");

class DispatchAssignment {
  constructor(db) {
    this.collection = db.collection("dispatch_assignments");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ orderId: 1 });
      await this.collection.createIndex({ vendorOrderId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ pickupDate: 1 });
      await this.collection.createIndex({ trackingNumber: 1 });
    } catch (error) {
      console.error("Error creating DispatchAssignment indexes:", error);
    }
  }

  async create(data) {
    const assignment = {
      ...data,
      orderId: data.orderId?.toString(),
      vendorOrderId: data.vendorOrderId ? data.vendorOrderId.toString() : null,
      vendorId: data.vendorId ? data.vendorId.toString() : null,
      status: data.status || "assigned",
      codCollectionStatus: data.codCollectionStatus || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collection.insertOne(assignment);
    return { ...assignment, _id: result.insertedId };
  }

  async findAll(filter = {}) {
    const query = {};
    if (filter.status && filter.status !== "all") query.status = filter.status;
    if (filter.courierName) query.courierName = filter.courierName;
    if (filter.pickupDate) {
      const start = new Date(filter.pickupDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.pickupDate = { $gte: start, $lt: end };
    }

    return this.collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  async findById(id) {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async update(id, data) {
    return this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
    );
  }
}

module.exports = DispatchAssignment;
