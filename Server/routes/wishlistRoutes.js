const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
  toggleWishlistPublic,
  getSharedWishlist,
  createWishlistCollection,
  updateWishlistCollection,
  deleteWishlistCollection,
  addWishlistCollectionItem,
  removeWishlistCollectionItem,
  shareWishlistCollection,
  updateWishlistAlert,
} = require("../controllers/wishlistController");

// Public route - Get shared wishlist
router.get("/shared/:shareId", getSharedWishlist);

// All other wishlist routes require authentication
router.use(verifyToken);

// GET /api/wishlist - Get user's wishlist
router.get("/", getWishlist);

// POST /api/wishlist - Add product to wishlist
router.post("/", addToWishlist);

// POST /api/wishlist/toggle-public - Toggle wishlist public/private
router.post("/toggle-public", toggleWishlistPublic);

// Collection organization
router.post("/collections", createWishlistCollection);
router.patch("/collections/:collectionId", updateWishlistCollection);
router.delete("/collections/:collectionId", deleteWishlistCollection);
router.post("/collections/:collectionId/items", addWishlistCollectionItem);
router.delete("/collections/:collectionId/items/:productId", removeWishlistCollectionItem);
router.post("/collections/:collectionId/share", shareWishlistCollection);

// Alert preferences per wishlist item
router.patch("/alerts/:productId", updateWishlistAlert);

// DELETE /api/wishlist/:productId - Remove product from wishlist
router.delete("/:productId", removeFromWishlist);

// DELETE /api/wishlist - Clear entire wishlist
router.delete("/", clearWishlist);

module.exports = router;
