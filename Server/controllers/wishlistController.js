const addToWishlist = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const { productId, collectionId } = req.body;

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
    const result = await Wishlist.addProduct(userId, productId, collectionId);

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

const createWishlistCollection = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const collection = await Wishlist.createCollection(userId, req.body?.name);

    res.status(201).json({
      success: true,
      data: collection,
      message: "Wishlist collection created",
    });
  } catch (error) {
    console.error("Error creating wishlist collection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateWishlistCollection = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const result = await Wishlist.updateCollection(userId, req.params.collectionId, req.body || {});

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.message });
    }

    res.json({
      success: true,
      data: result.collection,
      message: "Wishlist collection updated",
    });
  } catch (error) {
    console.error("Error updating wishlist collection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteWishlistCollection = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const success = await Wishlist.deleteCollection(userId, req.params.collectionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Wishlist collection not found",
      });
    }

    res.json({ success: true, message: "Wishlist collection deleted" });
  } catch (error) {
    console.error("Error deleting wishlist collection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const addWishlistCollectionItem = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: "Product ID is required" });
    }

    const result = await Wishlist.addProduct(userId, productId, req.params.collectionId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error adding item to wishlist collection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const removeWishlistCollectionItem = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const success = await Wishlist.removeProduct(
      userId,
      req.params.productId,
      req.params.collectionId,
    );

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Product not found in wishlist collection",
      });
    }

    res.json({ success: true, message: "Product removed from collection" });
  } catch (error) {
    console.error("Error removing item from wishlist collection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const shareWishlistCollection = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const isPublic = req.body?.isPublic !== false;
    const result = await Wishlist.setCollectionPublic(userId, req.params.collectionId, isPublic);

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.message });
    }

    res.json({
      success: true,
      data: result.collection,
      isPublic: result.collection.isPublic,
      shareId: result.collection.shareId,
      message: `Wishlist collection is now ${result.collection.isPublic ? "public" : "private"}`,
    });
  } catch (error) {
    console.error("Error sharing wishlist collection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateWishlistAlert = async (req, res) => {
  try {
    const Wishlist = req.app.locals.models.Wishlist;
    const userId = req.user.uid;
    const alert = await Wishlist.setProductAlert(userId, req.params.productId, req.body || {});

    res.json({
      success: true,
      data: alert,
      message: "Wishlist alert updated",
    });
  } catch (error) {
    console.error("Error updating wishlist alert:", error);
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
  createWishlistCollection,
  updateWishlistCollection,
  deleteWishlistCollection,
  addWishlistCollectionItem,
  removeWishlistCollectionItem,
  shareWishlistCollection,
  updateWishlistAlert,
};
