const { ObjectId } = require("mongodb");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectIds = (ids = []) =>
  [...new Set(ids.map(normalizeId).filter(Boolean))]
    .filter(ObjectId.isValid)
    .map((id) => new ObjectId(id));

const serialize = (doc = {}, reason = "", score = 0) => ({
  ...doc,
  _id: normalizeId(doc._id),
  productId: normalizeId(doc._id || doc.productId),
  recommendationReason: reason,
  score,
});

class GrowthRecommendationService {
  static async recentlyViewed(db, userId, limit = 10) {
    if (!db?.collection || !userId) return [];
    const events = await db
      .collection("growth_events")
      .find({ userId: normalizeId(userId), eventName: "product.viewed", productId: { $ne: null } })
      .sort({ timestamp: -1 })
      .limit(limit * 2)
      .toArray();
    const productIds = [...new Set(events.map((event) => normalizeId(event.productId)))].slice(0, limit);
    if (productIds.length === 0) return [];
    const products = await db.collection("products").find({ _id: { $in: toObjectIds(productIds) } }).toArray();
    const map = new Map(products.map((product) => [normalizeId(product._id), product]));
    return productIds.map((id, index) => map.get(id) ? serialize(map.get(id), "recently_viewed", limit - index) : null).filter(Boolean);
  }

  static async buyAgain(db, userId, limit = 10) {
    if (!db?.collection || !userId) return [];
    const orders = await db
      .collection("orders")
      .find({ userId: normalizeId(userId), status: { $in: ["delivered", "completed"] } })
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();
    const counts = new Map();
    orders.forEach((order) => {
      (order.products || order.items || []).forEach((item) => {
        const productId = normalizeId(item.productId || item.product || item._id);
        if (!productId) return;
        counts.set(productId, (counts.get(productId) || 0) + Number(item.quantity || 1));
      });
    });
    const productIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
    if (productIds.length === 0) return [];
    const products = await db.collection("products").find({ _id: { $in: toObjectIds(productIds) } }).toArray();
    const map = new Map(products.map((product) => [normalizeId(product._id), product]));
    return productIds.map((id) => map.get(id) ? serialize(map.get(id), "buy_again", counts.get(id)) : null).filter(Boolean);
  }

  static async followedVendorFeed(db, userId, limit = 12) {
    if (!db?.collection || !userId) return [];
    const follows = await db.collection("vendor_follows").find({ userId: normalizeId(userId) }).toArray();
    const vendorIds = follows.map((follow) => normalizeId(follow.vendorId)).filter(Boolean);
    if (vendorIds.length === 0) return [];
    const products = await db
      .collection("products")
      .find({ vendorId: { $in: vendorIds }, isActive: { $ne: false }, stock: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return products.map((product, index) => serialize(product, "followed_vendor", limit - index));
  }

  static async trendingNow(db, limit = 12) {
    if (!db?.collection) return [];
    const rows = await db
      .collection("growth_events")
      .find({ eventName: { $in: ["product.viewed", "cart.added", "order.placed"] }, productId: { $ne: null } })
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();
    const scores = new Map();
    rows.forEach((event) => {
      const id = normalizeId(event.productId);
      const weight = event.eventName === "order.placed" ? 5 : event.eventName === "cart.added" ? 3 : 1;
      scores.set(id, (scores.get(id) || 0) + weight);
    });
    const productIds = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
    const query = productIds.length
      ? { _id: { $in: toObjectIds(productIds) } }
      : { isActive: { $ne: false }, stock: { $gt: 0 } };
    const products = await db.collection("products").find(query).sort({ rating: -1, sales: -1, createdAt: -1 }).limit(limit).toArray();
    return products.map((product) => serialize(product, "trending_now", scores.get(normalizeId(product._id)) || 1));
  }

  static async forPlacement(db, { placement = "homepage", userId = null, limit = 12 } = {}) {
    if (placement === "recently_viewed") return GrowthRecommendationService.recentlyViewed(db, userId, limit);
    if (placement === "buy_again") return GrowthRecommendationService.buyAgain(db, userId, limit);
    if (placement === "followed_vendors") return GrowthRecommendationService.followedVendorFeed(db, userId, limit);
    if (placement === "homepage" && userId) {
      const [recent, buyAgain, followed] = await Promise.all([
        GrowthRecommendationService.recentlyViewed(db, userId, Math.ceil(limit / 3)),
        GrowthRecommendationService.buyAgain(db, userId, Math.ceil(limit / 3)),
        GrowthRecommendationService.followedVendorFeed(db, userId, Math.ceil(limit / 3)),
      ]);
      const merged = [...recent, ...buyAgain, ...followed];
      const seen = new Set();
      return merged.filter((item) => {
        if (seen.has(item.productId)) return false;
        seen.add(item.productId);
        return true;
      }).slice(0, limit);
    }
    return GrowthRecommendationService.trendingNow(db, limit);
  }
}

module.exports = GrowthRecommendationService;
