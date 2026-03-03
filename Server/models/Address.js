const { ObjectId } = require("mongodb");

class Address {
  constructor(db) {
    this.collection = db.collection("addresses");
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async create(addressData) {
    // If this is set as default, unset other default addresses for this user
    if (addressData.isDefault) {
      await this.collection.updateMany(
        { userId: addressData.userId },
        { $set: { isDefault: false } },
      );
    }

    const address = {
      ...addressData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(address);
    return result.insertedId;
  }

  async update(id, addressData) {
    const address = await this.findById(id);
    if (!address) {
      throw new Error("Address not found");
    }

    // If this is set as default, unset other default addresses for this user
    if (addressData.isDefault) {
      await this.collection.updateMany(
        { userId: address.userId, _id: { $ne: new ObjectId(id) } },
        { $set: { isDefault: false } },
      );
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...addressData,
          updatedAt: new Date(),
        },
      },
    );
  }

  async delete(id) {
    return await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  async setDefault(id, userId) {
    // First, unset all default addresses for this user
    await this.collection.updateMany(
      { userId },
      { $set: { isDefault: false } },
    );

    // Then set this address as default
    return await this.collection.updateOne(
      { _id: new ObjectId(id), userId },
      {
        $set: {
          isDefault: true,
          updatedAt: new Date(),
        },
      },
    );
  }

  async getDefaultAddress(userId) {
    return await this.collection.findOne({
      userId,
      isDefault: true,
    });
  }

  async validateAddress(addressData) {
    const required = ["name", "phone", "address", "city", "area"];
    const missing = required.filter((field) => !addressData[field]);

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      };
    }

    // Validate phone number (Bangladesh format)
    const phoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
    if (!phoneRegex.test(addressData.phone.replace(/\s+/g, ""))) {
      return {
        valid: false,
        error: "Invalid phone number format",
      };
    }

    return { valid: true };
  }
}

module.exports = Address;
