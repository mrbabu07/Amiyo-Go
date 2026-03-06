const { ObjectId } = require("mongodb");

class CategoryRequest {
  constructor(db) {
    this.collection = db.collection("category_requests");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating CategoryRequest indexes:", error);
    }
  }

  async create(requestData) {
    const request = {
      ...requestData,
      vendorId: new ObjectId(requestData.vendorId),
      status: "pending", // pending, approved, rejected
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collection.insertOne(request);
    return { ...request, _id: result.insertedId };
  }

  async findAll(filter = {}) {
    const query = {};
    if (filter.status) query.status = filter.status;
    if (filter.vendorId) query.vendorId = new ObjectId(filter.vendorId);

    const page = parseInt(filter.page || 1);
    const limit = parseInt(filter.limit || 20);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return {
      requests,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByVendorId(vendorId, filter = {}) {
    const query = { vendorId: new ObjectId(vendorId) };
    if (filter.status) query.status = filter.status;

    return await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async updateStatus(id, status, adminNote = "", createdCategoryId = null) {
    const update = {
      status,
      adminNote,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };

    if (createdCategoryId) {
      update.createdCategoryId = new ObjectId(createdCategoryId);
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
  }

  async delete(id) {
    return await this.collection.deleteOne({ _id: new ObjectId(id) });
  }
}

module.exports = CategoryRequest;
