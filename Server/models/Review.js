const { ObjectId } = require("mongodb");

class Review {
  constructor(db) {
    this.collection = db.collection("reviews");
  }

  async create(reviewData) {
    const review = {
      ...reviewData,
      productId: new ObjectId(reviewData.productId),
      userId: reviewData.userId,
      rating: parseInt(reviewData.rating),
      images: reviewData.images || [], // Array of image URLs from ImgBB
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: 0,
      verified: false, // Will be set to true if user purchased the product
      adminReply: null, // Admin response to the review
      adminRepliedAt: null,
      adminRepliedBy: null,
    };

    const result = await this.collection.insertOne(review);
    return result.insertedId;
  }

  async addAdminReply(reviewId, adminReply, adminId, adminName) {
    return await this.collection.updateOne(
      { _id: new ObjectId(reviewId) },
      {
        $set: {
          adminReply,
          adminRepliedAt: new Date(),
          adminRepliedBy: adminName || adminId,
          updatedAt: new Date(),
        },
      },
    );
  }

  async getAllReviews(limit = 50, skip = 0) {
    return await this.collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async getReviewById(reviewId) {
    return await this.collection.findOne({ _id: new ObjectId(reviewId) });
  }

  async getUnrepliedReviews() {
    return await this.collection
      .find({ adminReply: null })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findByProductId(productId, limit = 10, skip = 0) {
    return await this.collection
      .find({ productId: new ObjectId(productId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getProductRatingStats(productId) {
    const pipeline = [
      { $match: { productId: new ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();

    if (result.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const stats = result[0];
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    stats.ratingDistribution.forEach((rating) => {
      distribution[rating]++;
    });

    return {
      averageRating: Math.round(stats.averageRating * 10) / 10,
      totalReviews: stats.totalReviews,
      ratingDistribution: distribution,
    };
  }

  async update(reviewId, updateData) {
    // Exclude immutable fields
    const { _id, __v, createdAt, ...safeData } = updateData;
    return await this.collection.updateOne(
      { _id: new ObjectId(reviewId) },
      {
        $set: {
          ...safeData,
          updatedAt: new Date(),
        },
      },
    );
  }

  async delete(reviewId) {
    return await this.collection.deleteOne({ _id: new ObjectId(reviewId) });
  }

  async markHelpful(reviewId) {
    return await this.collection.updateOne(
      { _id: new ObjectId(reviewId) },
      { $inc: { helpful: 1 } },
    );
  }

  async findUserReviewForProduct(userId, productId) {
    return await this.collection.findOne({
      userId,
      productId: new ObjectId(productId),
    });
  }

  async findUserReviewsForProduct(userId, productId) {
    return await this.collection
      .find({
        userId,
        productId: new ObjectId(productId),
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async verifyPurchase(userId, productId) {
    // Check if user has purchased this product
    const db = this.collection.db;

    console.log("🔍 Verifying purchase for:", { userId, productId });

    // First, let's see what orders exist for this user
    const allUserOrders = await db
      .collection("orders")
      .find({ userId })
      .toArray();
    console.log("📦 Found", allUserOrders.length, "orders for user:", userId);

    if (allUserOrders.length > 0) {
      console.log("📦 Sample order structure:", {
        id: allUserOrders[0]._id,
        status: allUserOrders[0].status,
        hasProducts: !!allUserOrders[0].products,
        hasItems: !!allUserOrders[0].items,
        productsCount: allUserOrders[0].products?.length || 0,
        itemsCount: allUserOrders[0].items?.length || 0,
      });
    }

    // Try multiple query variations to handle different data formats
    const productIdString = productId.toString();
    const productIdObjectId = new ObjectId(productId);

    const orders = await db
      .collection("orders")
      .find({
        userId,
        $or: [
          // Try with ObjectId format
          { "products.productId": productIdObjectId },
          { "items.productId": productIdObjectId },
          // Try with string format
          { "products.productId": productIdString },
          { "items.productId": productIdString },
          // Try with _id field (some orders might use _id instead of productId)
          { "products._id": productIdObjectId },
          { "items._id": productIdObjectId },
          { "products._id": productIdString },
          { "items._id": productIdString },
        ],
        status: { $in: ["delivered", "completed"] },
      })
      .toArray();

    console.log("📦 Found orders with matching product:", orders.length);

    if (orders.length > 0) {
      console.log("✅ Purchase verified for user:", userId);
      console.log("📋 Matching order details:", {
        orderId: orders[0]._id,
        status: orders[0].status,
        products:
          orders[0].products?.map((p) => ({
            productId: p.productId || p._id,
            title: p.title || p.name,
          })) || [],
        items:
          orders[0].items?.map((i) => ({
            productId: i.productId || i._id,
            title: i.title || i.name,
          })) || [],
      });
      return true;
    }

    console.log("❌ No qualifying purchase found for user:", userId);

    // Additional debugging: check if there are any orders with this product but different status
    const anyStatusOrders = await db
      .collection("orders")
      .find({
        userId,
        $or: [
          { "products.productId": productIdObjectId },
          { "items.productId": productIdObjectId },
          { "products.productId": productIdString },
          { "items.productId": productIdString },
          { "products._id": productIdObjectId },
          { "items._id": productIdObjectId },
          { "products._id": productIdString },
          { "items._id": productIdString },
        ],
      })
      .toArray();

    if (anyStatusOrders.length > 0) {
      console.log(
        "⚠️ Found orders with this product but different status:",
        anyStatusOrders.map((o) => ({ id: o._id, status: o.status })),
      );
    }

    return false;
  }
}

module.exports = Review;
