const MAX_CART_ITEMS = 200;
const MAX_SAVED_ITEMS = 100;

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const normalizeColor = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  return String(value.name || value.label || value.value || value.hex || "").trim().toLowerCase();
};

const cartItemKey = (item = {}) => [
  normalizeId(item.productId || item._id || item.id),
  String(item.selectedSize || item.size || "").trim().toLowerCase(),
  normalizeColor(item.selectedColor || item.color),
  String(item.variantId || item.sku || item.variantSku || "").trim().toLowerCase(),
].join("|");

const clampQuantity = (value) => {
  const quantity = Math.floor(Number(value || 1));
  return Math.min(99, Math.max(1, Number.isFinite(quantity) ? quantity : 1));
};

const sanitizeCartItem = (item = {}) => {
  const productId = normalizeId(item.productId || item._id || item.id);
  if (!productId) return null;

  return {
    ...item,
    _id: normalizeId(item._id || productId),
    productId,
    title: String(item.title || item.name || item.productName || "Product").slice(0, 240),
    quantity: clampQuantity(item.quantity),
    price: Number(item.price || item.salePrice || item.unitPrice || 0),
    selectedSize: item.selectedSize || item.size || null,
    selectedColor: item.selectedColor || item.color || null,
    selectedImage: item.selectedImage || item.image || item.thumbnail || null,
    vendorId: item.vendorId ? normalizeId(item.vendorId) : null,
    addedAt: Number(item.addedAt || Date.now()),
    updatedAt: new Date().toISOString(),
  };
};

const normalizeItems = (items = [], max = MAX_CART_ITEMS) => {
  if (!Array.isArray(items)) return [];

  const byKey = new Map();
  for (const rawItem of items) {
    const item = sanitizeCartItem(rawItem);
    if (!item) continue;
    const key = cartItemKey(item);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        ...item,
        quantity: clampQuantity(Number(existing.quantity || 0) + Number(item.quantity || 1)),
        addedAt: Math.min(Number(existing.addedAt || Date.now()), Number(item.addedAt || Date.now())),
      });
    } else {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()]
    .sort((left, right) => Number(right.addedAt || 0) - Number(left.addedAt || 0))
    .slice(0, max);
};

const mergeCartState = (serverCart = {}, incomingCart = {}) => ({
  items: normalizeItems([...(serverCart.items || []), ...(incomingCart.items || [])], MAX_CART_ITEMS),
  savedForLater: normalizeItems(
    [...(serverCart.savedForLater || []), ...(incomingCart.savedForLater || [])],
    MAX_SAVED_ITEMS,
  ),
});

const sanitizeCartState = (cart = {}) => ({
  items: normalizeItems(cart.items || [], MAX_CART_ITEMS),
  savedForLater: normalizeItems(cart.savedForLater || [], MAX_SAVED_ITEMS),
});

module.exports = {
  cartItemKey,
  mergeCartState,
  normalizeItems,
  sanitizeCartState,
};
