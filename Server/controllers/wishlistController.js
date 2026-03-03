const addToWishlist = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const { productId } = req.body;

    // Check if user is authenticated
    if (!req.user || !req.user.uid) {
      console.error("❌ No user found in request");
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userId = req.user.uid;

    if (!productId) {
      console.error("❌ No productId in request body");
      return res.status(400).json({
        success: false,
        error: "Product ID is required",
      });
    }

    console.log(
      `✅ Adding product ${productId} to wishlist for user ${userId}`,
    );
    const result = await Wishlist.addProduct(userId, productId);

    if (!result.success) {
      console.error(`❌ Failed to add to wishlist: ${result.message}`);
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    console.log(`✅ Successfully added to wishlist`);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("❌ Error adding to wishlist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const { productId } = req.params;
    const userId = req.user.uid;

    const success = await Wishlist.removeProduct(userId, productId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Product not found in wishlist",
      });
    }

    res.json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;

    const wishlist = await Wishlist.getWishlistWithProducts(userId);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const clearWishlist = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;

    await Wishlist.clearWishlist(userId);

    res.json({
      success: true,
      message: "Wishlist cleared",
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const toggleWishlistPublic = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;

    const result = await Wishlist.togglePublic(userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message,
      });
    }

    res.json({
      success: true,
      isPublic: result.isPublic,
      shareId: result.shareId,
      message: `Wishlist is now ${result.isPublic ? "public" : "private"}`,
    });
  } catch (error) {
    console.error("Error toggling wishlist public:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSharedWishlist = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const { shareId } = req.params;

    const wishlist = await Wishlist.getSharedWishlistWithProducts(shareId);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist not found or not public",
      });
    }

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    console.error("Error fetching shared wishlist:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
  toggleWishlistPublic,
  getSharedWishlist,
};
