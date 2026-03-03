const recommendationService = require("../services/recommendationService");
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({}, { strict: false });
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

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
