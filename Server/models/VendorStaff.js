const { ObjectId } = require("mongodb");

class VendorStaff {
  constructor(db) {
    this.collection = db.collection("vendor_staff");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ vendorId: 1, email: 1 }, { unique: true });
      await this.collection.createIndex({ userId: 1 });
      await this.collection.createIndex({ status: 1 });
    } catch (error) {
      console.error("Error creating VendorStaff indexes:", error);
    }
  }

  async create(data) {
    const staff = {
      vendorId: data.vendorId.toString(),
      userId: data.userId ? data.userId.toString() : null,
      email: String(data.email || "").toLowerCase(),
      name: data.name || "",
      permissions: data.permissions || ["orders:view"],
      status: data.status || "active",
      invitedBy: data.invitedBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collection.insertOne(staff);
    return { ...staff, _id: result.insertedId };
  }

  async findByVendorId(vendorId) {
    return this.collection.find({ vendorId: vendorId.toString() }).sort({ createdAt: -1 }).toArray();
  }

  async findById(id) {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findActiveForUser(user) {
    const userId = user?._id?.toString();
    const email = String(user?.email || "").toLowerCase();
    const clauses = [
      ...(userId ? [{ userId }] : []),
      ...(email ? [{ email }] : []),
    ];
    if (clauses.length === 0) return null;
    return this.collection.findOne({
      status: "active",
      $or: clauses,
    });
  }

  async update(id, data) {
    return this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
    );
  }

  async remove(id, vendorId) {
    return this.collection.updateOne(
      { _id: new ObjectId(id), vendorId: vendorId.toString() },
      { $set: { status: "removed", removedAt: new Date(), updatedAt: new Date() } },
    );
  }
}

module.exports = VendorStaff;
