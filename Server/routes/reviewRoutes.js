const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const {
  createReview,
  getProductReviews,
  getProductRatingStats,
  getUserReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getAllReviews,
  getUnrepliedReviews,
  addAdminReply,
  deleteReviewAdmin,
  canUserReviewProduct,
} = require("../controllers/reviewController");

// GET /api/reviews/product/:productId/stats - Get rating stats for a product (public)
router.get("/product/:productId/stats", getProductRatingStats);

// GET /api/reviews/product/:productId - Get reviews for a product (public)
router.get("/product/:productId", getProductReviews);

// POST /api/reviews/:reviewId/helpful - Mark review as helpful (public)
router.post("/:reviewId/helpful", markReviewHelpful);

// All routes below require authentication
router.use(verifyToken);

// GET /api/reviews/can-review/:productId - Check if user can review a product
router.get("/can-review/:productId", canUserReviewProduct);

// POST /api/reviews - Create a new review
router.post("/", createReview);

// GET /api/reviews/my-reviews - Get user's reviews
router.get("/my-reviews", getUserReviews);

// PUT /api/reviews/:reviewId - Update a review
router.put("/:reviewId", updateReview);

// DELETE /api/reviews/:reviewId - Delete a review
router.delete("/:reviewId", deleteReview);

// Admin routes
router.get("/admin/all", verifyAdmin, getAllReviews);
router.get("/admin/unreplied", verifyAdmin, getUnrepliedReviews);
router.post("/:reviewId/admin-reply", verifyAdmin, addAdminReply);
router.delete("/:reviewId/admin", verifyAdmin, deleteReviewAdmin);

module.exports = router;
