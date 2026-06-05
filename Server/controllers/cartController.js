const serializeCart = (cart = null) => ({
  items: cart?.items || [],
  savedForLater: cart?.savedForLater || [],
  updatedAt: cart?.updatedAt || null,
});

const getActorUserId = (req) =>
  req.user?.uid || req.user?._id || req.dbUser?.firebaseUid || req.dbUser?._id;

const getCartModel = (req) => req.app.locals.models.Cart;

exports.getCart = async (req, res) => {
  try {
    const Cart = getCartModel(req);
    const cart = await Cart.findByUserId(getActorUserId(req));
    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Failed to load cart:", error);
    res.status(500).json({ success: false, error: "Failed to load cart" });
  }
};

exports.replaceCart = async (req, res) => {
  try {
    const Cart = getCartModel(req);
    const cart = await Cart.replace(getActorUserId(req), {
      items: req.body.items || [],
      savedForLater: req.body.savedForLater || [],
    });
    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Failed to save cart:", error);
    res.status(500).json({ success: false, error: "Failed to save cart" });
  }
};

exports.mergeCart = async (req, res) => {
  try {
    const Cart = getCartModel(req);
    const cart = await Cart.merge(getActorUserId(req), {
      items: req.body.items || [],
      savedForLater: req.body.savedForLater || [],
    });
    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Failed to merge cart:", error);
    res.status(500).json({ success: false, error: "Failed to merge cart" });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const Cart = getCartModel(req);
    const cart = await Cart.clear(getActorUserId(req));
    res.json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Failed to clear cart:", error);
    res.status(500).json({ success: false, error: "Failed to clear cart" });
  }
};
