const mongoose = require("mongoose");

// Define schemas
const productSchema = new mongoose.Schema({}, { strict: false });
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

class RecommendationService {
  // Get personalized recommendations for a user
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const recommendations = [];

      // 1. Based on user's order history
      const orderHistory =
        await this.getRecommendationsFromOrderHistory(userId);
      recommendations.push(...orderHistory);

      // 2. Based on browsing history (from recently viewed)
      const browsingHistory = await this.getRecommendationsFromBrowsing(userId);
      recommendations.push(...browsingHistory);

      // 3. Trending products
      const trending = await this.getTrendingProducts();
      recommendations.push(...trending);

      // Remove duplicates and sort by score
      const uniqueRecommendations = this.deduplicateAndScore(recommendations);

      return uniqueRecommendations.slice(0, limit);
    } catch (error) {
      console.error("Error getting personalized recommendations:", error);
      return [];
    }
  }

  // Get "Frequently Bought Together" recommendations
  async getFrequentlyBoughtTogether(productId, limit = 4) {
    try {
      // Find orders containing this product
      const orders = await Order.find({
        "items.product": productId,
      }).limit(100);

      // Count co-occurrences
      const coOccurrences = {};

      orders.forEach((order) => {
        order.items.forEach((item) => {
          const itemId = item.product.toString();
          if (itemId !== productId.toString()) {
            coOccurrences[itemId] = (coOccurrences[itemId] || 0) + 1;
          }
        });
      });

      // Sort by frequency
      const sortedProducts = Object.entries(coOccurrences)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([productId]) => productId);

      // Fetch product details
      const products = await Product.find({
        _id: { $in: sortedProducts },
      });

      return products.map((product) => ({
        ...product.toObject(),
        reason: "bought_together",
      }));
    } catch (error) {
      console.error("Error getting frequently bought together:", error);
      return [];
    }
  }

  // Get "Customers Also Viewed" recommendations
  async getCustomersAlsoViewed(productId, limit = 6) {
    try {
      const product = await Product.findById(productId);
      if (!product) return [];

      // Find similar products by category (using categoryId field)
      const categoryField = product.categoryId || product.category;
      if (!categoryField) return [];

      const similarProducts = await Product.find({
        _id: { $ne: productId },
        $or: [{ categoryId: categoryField }, { category: categoryField }],
        stock: { $gt: 0 },
      })
        .sort({ views: -1, rating: -1 })
        .limit(limit);

      return similarProducts.map((p) => ({
        ...p.toObject(),
        reason: "similar_category",
      }));
    } catch (error) {
      console.error("Error getting customers also viewed:", error);
      return [];
    }
  }

  // Get similar products
  async getSimilarProducts(productId, limit = 6) {
    try {
      const product = await Product.findById(productId);
      if (!product) return [];

      // Find products in same category with similar price range
      const priceRange = product.price * 0.3; // 30% price range
      const categoryField = product.categoryId || product.category;

      if (!categoryField) {
        // If no category, just find products with similar price
        const similarProducts = await Product.find({
          _id: { $ne: productId },
          price: {
            $gte: product.price - priceRange,
            $lte: product.price + priceRange,
          },
          stock: { $gt: 0 },
        })
          .sort({ rating: -1, sales: -1 })
          .limit(limit);

        return similarProducts.map((p) => ({
          ...p.toObject(),
          reason: "similar_price",
        }));
      }

      const similarProducts = await Product.find({
        _id: { $ne: productId },
        $or: [{ categoryId: categoryField }, { category: categoryField }],
        price: {
          $gte: product.price - priceRange,
          $lte: product.price + priceRange,
        },
        stock: { $gt: 0 },
      })
        .sort({ rating: -1, sales: -1 })
        .limit(limit);

      // If no products found with price range, try without price filter
      if (similarProducts.length === 0) {
        const fallbackProducts = await Product.find({
          _id: { $ne: productId },
          $or: [{ categoryId: categoryField }, { category: categoryField }],
          stock: { $gt: 0 },
        })
          .sort({ rating: -1, sales: -1 })
          .limit(limit);

        return fallbackProducts.map((p) => ({
          ...p.toObject(),
          reason: "similar_category",
        }));
      }

      return similarProducts.map((p) => ({
        ...p.toObject(),
        reason: "similar_category",
      }));
    } catch (error) {
      console.error("Error getting similar products:", error);
      return [];
    }
  }

  // Get trending products
  async getTrendingProducts(limit = 10) {
    try {
      // Get products with high recent sales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trendingOrders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            count: { $sum: "$items.quantity" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      const productIds = trendingOrders.map((item) => item._id);

      if (productIds.length === 0) {
        // Fallback: Get products with highest rating or most recent
        const fallbackProducts = await Product.find({
          stock: { $gt: 0 },
        })
          .sort({ rating: -1, createdAt: -1 })
          .limit(limit);

        return fallbackProducts.map((p) => ({
          ...p.toObject(),
          reason: "popular",
        }));
      }

      const products = await Product.find({
        _id: { $in: productIds },
        stock: { $gt: 0 },
      });

      return products.map((p) => ({
        ...p.toObject(),
        reason: "trending",
      }));
    } catch (error) {
      console.error("Error getting trending products:", error);

      // Final fallback: Get any products
      try {
        const fallbackProducts = await Product.find({
          stock: { $gt: 0 },
        })
          .sort({ createdAt: -1 })
          .limit(limit);

        return fallbackProducts.map((p) => ({
          ...p.toObject(),
          reason: "recent",
        }));
      } catch (fallbackError) {
        console.error("Fallback trending products failed:", fallbackError);
        return [];
      }
    }
  }

  // Helper: Get recommendations from order history
  async getRecommendationsFromOrderHistory(userId) {
    try {
      const orders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      const purchasedCategories = new Set();
      orders.forEach((order) => {
        order.items.forEach((item) => {
          if (item.category) purchasedCategories.add(item.category);
        });
      });

      if (purchasedCategories.size === 0) return [];

      const recommendations = await Product.find({
        category: { $in: Array.from(purchasedCategories) },
        stock: { $gt: 0 },
      })
        .sort({ rating: -1, sales: -1 })
        .limit(10);

      return recommendations.map((p) => ({
        productId: p._id,
        score: 8,
        reason: "personalized",
      }));
    } catch (error) {
      console.error("Error getting recommendations from order history:", error);
      return [];
    }
  }

  // Helper: Get recommendations from browsing history
  async getRecommendationsFromBrowsing(userId) {
    try {
      // This would use a ViewHistory model if implemented
      // For now, return empty array
      return [];
    } catch (error) {
      return [];
    }
  }

  // Helper: Deduplicate and score recommendations
  deduplicateAndScore(recommendations) {
    const productMap = new Map();

    recommendations.forEach((rec) => {
      const id = rec.productId?.toString() || rec._id?.toString();
      if (!id) return;

      if (productMap.has(id)) {
        const existing = productMap.get(id);
        existing.score += rec.score || 1;
      } else {
        productMap.set(id, {
          productId: id,
          score: rec.score || 1,
          reason: rec.reason || "personalized",
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => b.score - a.score);
  }
}

module.exports = new RecommendationService();
