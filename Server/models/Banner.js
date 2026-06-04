const { ObjectId } = require("mongodb");

class Banner {
  constructor(db) {
    this.collection = db.collection("banners");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ placement: 1, status: 1, position: 1 });
      await this.collection.createIndex({ activeFrom: 1, activeTo: 1 });
      await this.collection.createIndex({ createdAt: -1 });
    } catch (error) {
      console.error("Error creating Banner indexes:", error);
    }
  }

  async findPublicByPlacement(placement) {
    const now = new Date();
    return this.collection
      .find({
        placement,
        status: "active",
        $and: [
          { $or: [{ activeFrom: null }, { activeFrom: { $lte: now } }, { activeFrom: { $exists: false } }] },
          { $or: [{ activeTo: null }, { activeTo: { $gte: now } }, { activeTo: { $exists: false } }] },
        ],
      })
      .sort({ position: 1, createdAt: -1 })
      .toArray();
  }

  async findAll(filter = {}) {
    return this.collection.find(filter).sort({ placement: 1, position: 1, createdAt: -1 }).toArray();
  }

  async findById(id) {
    return ObjectId.isValid(id) ? this.collection.findOne({ _id: new ObjectId(id) }) : null;
  }
}

module.exports = Banner;
