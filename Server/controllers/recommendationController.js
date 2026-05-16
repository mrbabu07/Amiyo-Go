const recommendationService = require("../services/recommendationService");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

const productSchema = new mongoose.Schema({}, { strict: false });
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

const idVariants = (ids) => {
  const stringIds = [...new Set(ids.filter(Boolean).map((id) => id.toString()))];
  return [
    ...stringIds,
    ...stringIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)),
  ];
};

// Get personalized recommendations for logged-in user
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const recommendations =
      await recommendationService.getPersonalizedRecommendations(userId, limit);

    // Fetch full product details
    const productIds = recommendations.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const productsWithReason = products.map((product) => {
      const rec = recommendations.find(
        (r) => r.productId.toString() === product._id.toString(),
      );
      return {
        ...product.toObject(),
        recommendationReason: rec?.reason || "personalized",
      };
    });

    res.json({
      success: true,
      data: productsWithReason,
    });
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    res
      .status(500)
      .json({
        message: "Error fetching recommendations",
        error: error.message,
      });
  }
};

// Get "Frequently Bought Together"
exports.getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    const recommendations =
      await recommendationService.getFrequentlyBoughtTogether(productId, limit);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Error getting frequently bought together:", error);
    res
      .status(500)
      .json({
        message: "Error fetching recommendations",
        error: error.message,
      });
  }
};

// Get "Customers Also Viewed"
exports.getCustomersAlsoViewed = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    const recommendations = await recommendationService.getCustomersAlsoViewed(
      productId,
      limit,
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Error getting customers also viewed:", error);
    res
      .status(500)
      .json({
        message: "Error fetching recommendations",
        error: error.message,
      });
  }
};

// Get similar products
exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    const recommendations = await recommendationService.getSimilarProducts(
      productId,
      limit,
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Error getting similar products:", error);
    res
      .status(500)
      .json({
        message: "Error fetching recommendations",
        error: error.message,
      });
  }
};

// Get trending products
exports.getTrendingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recommendations =
      await recommendationService.getTrendingProducts(limit);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Error getting trending products:", error);
    res
      .status(500)
      .json({
        message: "Error fetching recommendations",
        error: error.message,
      });
  }
};

exports.getYouMayAlsoLike = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 40);

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const db = req.app.locals.db;
    const orders = await db
      .collection("orders")
      .find({ userId })
      .project({ products: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const purchasedProductIds = [];
    const categoryAffinity = new Map();
    orders.forEach((order) => {
      (order.products || []).forEach((item) => {
        const productId = item.productId || item._id || item.product;
        if (productId) purchasedProductIds.push(productId.toString());

        const categoryId = item.categoryId || item.category;
        if (categoryId) {
          const key = categoryId.toString();
          categoryAffinity.set(key, (categoryAffinity.get(key) || 0) + Number(item.quantity || 1));
        }
      });
    });

    const purchasedVariants = idVariants(purchasedProductIds);
    const candidateScores = new Map();

    if (purchasedProductIds.length > 0) {
      const collaborativeRows = await db
        .collection("orders")
        .aggregate([
          {
            $match: {
              userId: { $ne: userId },
              "products.productId": { $in: purchasedVariants },
            },
          },
          { $unwind: "$products" },
          {
            $match: {
              "products.productId": { $nin: purchasedVariants },
            },
          },
          {
            $group: {
              _id: "$products.productId",
              score: { $sum: { $ifNull: ["$products.quantity", 1] } },
              categoryId: { $first: "$products.categoryId" },
            },
          },
          { $sort: { score: -1 } },
          { $limit: limit * 2 },
        ])
        .toArray();

      collaborativeRows.forEach((row) => {
        const key = row._id?.toString?.() || row._id;
        if (!key) return;
        candidateScores.set(key, {
          productId: key,
          score: Number(row.score || 0) * 4,
          reason: "customers_with_similar_orders",
        });
      });
    }

    const categoryIds = [...categoryAffinity.keys()];
    if (categoryIds.length > 0) {
      const categoryVariants = idVariants(categoryIds);
      const categoryProducts = await db
        .collection("products")
        .find({
          $and: [
            { _id: { $nin: idVariants(purchasedProductIds) } },
            {
              $or: [
                { categoryId: { $in: categoryVariants } },
                { category: { $in: categoryVariants } },
              ],
            },
            { stock: { $gt: 0 } },
            { isActive: { $ne: false } },
          ],
        })
        .sort({ rating: -1, sales: -1, createdAt: -1 })
        .limit(limit * 3)
        .toArray();

      categoryProducts.forEach((product) => {
        const key = product._id.toString();
        const categoryKey = (product.categoryId || product.category || "").toString();
        const affinityScore = categoryAffinity.get(categoryKey) || 1;
        const existing = candidateScores.get(key);
        candidateScores.set(key, {
          productId: key,
          score: (existing?.score || 0) + affinityScore * 2,
          reason: existing ? "similar_orders_and_category_affinity" : "category_affinity",
        });
      });
    }

    let ranked = Array.from(candidateScores.values()).sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      const fallback = await recommendationService.getTrendingProducts(limit);
      return res.json({
        success: true,
        algorithm: "trending_fallback",
        data: fallback,
      });
    }

    ranked = ranked.slice(0, limit);
    const productIds = ranked.map((rec) => rec.productId);
    const products = await db
      .collection("products")
      .find({ _id: { $in: productIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } })
      .toArray();
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    res.json({
      success: true,
      algorithm: "category_affinity_collaborative_filtering",
      categoryAffinity: Object.fromEntries(categoryAffinity),
      data: ranked
        .map((rec) => {
          const product = productMap.get(rec.productId);
          if (!product) return null;
          return {
            ...product,
            score: rec.score,
            recommendationReason: rec.reason,
          };
        })
        .filter(Boolean),
    });
  } catch (error) {
    console.error("Error getting you-may-also-like recommendations:", error);
    res.status(500).json({
      message: "Error fetching recommendations",
      error: error.message,
    });
  }
};
