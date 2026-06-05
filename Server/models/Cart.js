const { mergeCartState, sanitizeCartState } = require("../utils/cartMerge");

class Cart {
  constructor(db) {
    this.collection = db.collection("carts");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ userId: 1 }, { unique: true });
      await this.collection.createIndex({ updatedAt: -1 });
    } catch (error) {
      console.error("Error creating Cart indexes:", error);
    }
  }

  async findByUserId(userId) {
    return this.collection.findOne({ userId: String(userId) });
  }

  async replace(userId, cart = {}) {
    const now = new Date();
    const state = sanitizeCartState(cart);
    await this.collection.updateOne(
      { userId: String(userId) },
      {
        $set: {
          ...state,
          updatedAt: now,
        },
        $setOnInsert: {
          userId: String(userId),
          createdAt: now,
        },
      },
      { upsert: true },
    );
    return this.findByUserId(userId);
  }

  async merge(userId, incomingCart = {}) {
    const existing = await this.findByUserId(userId);
    return this.replace(userId, mergeCartState(existing || {}, incomingCart));
  }

  async clear(userId) {
    return this.replace(userId, { items: [], savedForLater: [] });
  }
}

module.exports = Cart;
