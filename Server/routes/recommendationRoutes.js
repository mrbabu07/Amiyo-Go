const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  getPersonalizedRecommendations,
  getFrequentlyBoughtTogether,
  getCustomersAlsoViewed,
  getSimilarProducts,
  getTrendingProducts,
  getYouMayAlsoLike,
} = require("../controllers/recommendationController");

// Public routes
router.get("/trending", getTrendingProducts);
router.get("/similar/:productId", getSimilarProducts);
router.get("/also-viewed/:productId", getCustomersAlsoViewed);
router.get("/bought-together/:productId", getFrequentlyBoughtTogether);

// Protected routes
router.get("/personalized", verifyToken, getPersonalizedRecommendations);
router.get("/you-may-also-like", verifyToken, getYouMayAlsoLike);

module.exports = router;
