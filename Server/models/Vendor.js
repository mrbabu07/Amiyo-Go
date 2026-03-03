const { ObjectId } = require("mongodb");

class Vendor {
  constructor(db) {
    this.collection = db.collection("vendors");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ ownerUserId: 1 }, { unique: true });
      await this.collection.createIndex({ slug: 1 }, { unique: true });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating Vendor indexes:", error);
    }
  }

  async findByUserId(userId) {
    return await this.collection.findOne({ 
      ownerUserId: new ObjectId(userId) 
    });
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug) {
    return await this.collection.findOne({ slug });
  }

  async create(vendorData) {
    const vendor = {
      ...vendorData,
      ownerUserId: new ObjectId(vendorData.ownerUserId),
      allowedCategoryIds: vendorData.allowedCategoryIds.map(id => new ObjectId(id)),
      status: "pending",
      verificationLevel: "basic",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(vendor);
    return { ...vendor, _id: result.insertedId };
  }

  async update(id, updateData) {
    const { _id, createdAt, ...safeData } = updateData;
    
    if (safeData.allowedCategoryIds) {
      safeData.allowedCategoryIds = safeData.allowedCategoryIds.map(id => 
        typeof id === 'string' ? new ObjectId(id) : id
      );
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...safeData, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async updateStatus(id, status) {
    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async findAll(filter = {}) {
    const query = {};
    
    if (filter.status) {
      query.status = filter.status;
    }

    const { page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const vendors = await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);

    return {
      vendors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const total = await this.collection.countDocuments();
    const pending = await this.collection.countDocuments({ status: "pending" });
    const approved = await this.collection.countDocuments({ status: "approved" });
    const suspended = await this.collection.countDocuments({ status: "suspended" });

    return {
      total,
      pending,
      approved,
      suspended,
    };
  }
}

module.exports = Vendor;
