const { ObjectId } = require("mongodb");

class OrderEvent {
  constructor(db) {
    this.collection = db.collection("order_events");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ orderId: 1, createdAt: 1 });
      await this.collection.createIndex({ vendorId: 1, createdAt: -1 });
      await this.collection.createIndex({ status: 1 });
    } catch (error) {
      console.error("Error creating OrderEvent indexes:", error);
    }
  }

  async append(event) {
    const record = {
      ...event,
      orderObjectId: ObjectId.isValid(event.orderId) ? new ObjectId(event.orderId) : null,
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
    };
    const result = await this.collection.insertOne(record);
    return { ...record, _id: result.insertedId };
  }

  async findByOrderId(orderId) {
    return this.collection
      .find({ orderId: orderId.toString() })
      .sort({ createdAt: 1 })
      .toArray();
  }
}

module.exports = OrderEvent;
