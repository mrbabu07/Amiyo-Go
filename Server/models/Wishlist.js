const { ObjectId } = require("mongodb");

class Wishlist {
  constructor(db) {
    this.collection = db.collection("wishlists");
  }

  async findByUserId(userId) {
    return await this.collection.findOne({ userId });
  }

  async addProduct(userId, productId) {
    const existingWishlist = await this.findByUserId(userId);

    if (existingWishlist) {
      // Check if product already in wishlist
      if (existingWishlist.products.some((p) => p.toString() === productId)) {
        return { success: false, message: "Product already in wishlist" };
      }

      // Add product to existing wishlist
      await this.collection.updateOne(
        { userId },
        {
          $push: { products: new ObjectId(productId) },
          $set: { updatedAt: new Date() },
        },
      );
    } else {
      // Create new wishlist
      await this.collection.insertOne({
        userId,
        products: [new ObjectId(productId)],
        isPublic: false,
        shareId: this.generateShareId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true, message: "Product added to wishlist" };
  }

  generateShareId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async togglePublic(userId) {
    const wishlist = await this.findByUserId(userId);
    if (!wishlist) {
      return { success: false, message: "Wishlist not found" };
    }

    const newPublicState = !wishlist.isPublic;

    // Ensure shareId exists
    let shareId = wishlist.shareId;
    if (!shareId) {
      shareId = this.generateShareId();
    }

    await this.collection.updateOne(
      { userId },
      {
        $set: {
          isPublic: newPublicState,
          shareId: shareId,
          updatedAt: new Date(),
        },
      },
    );

    return { success: true, isPublic: newPublicState, shareId };
  }

  async findByShareId(shareId) {
    return await this.collection.findOne({ shareId, isPublic: true });
  }

  async getSharedWishlistWithProducts(shareId) {
    const pipeline = [
      { $match: { shareId, isPublic: true } },
      {
        $lookup: {
          from: "products",
          localField: "products",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $project: {
          products: 1,
          productDetails: 1,
          createdAt: 1,
          "userDetails.name": 1,
          "userDetails.email": 1,
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || null;
  }

  async removeProduct(userId, productId) {
    const result = await this.collection.updateOne(
      { userId },
      {
        $pull: { products: new ObjectId(productId) },
        $set: { updatedAt: new Date() },
      },
    );

    return result.modifiedCount > 0;
  }

  async getWishlistWithProducts(userId) {
    const pipeline = [
      { $match: { userId } },
      {
        $lookup: {
          from: "products",
          localField: "products",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || { products: [], productDetails: [] };
  }

  async clearWishlist(userId) {
    return await this.collection.deleteOne({ userId });
  }
}

module.exports = Wishlist;
