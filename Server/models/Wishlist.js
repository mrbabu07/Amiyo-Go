const { ObjectId } = require("mongodb");
const crypto = require("crypto");

const DEFAULT_COLLECTION_ID = "default";

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));

const toObjectId = (value) => {
  if (value instanceof ObjectId) return value;
  const id = normalizeId(value);
  return ObjectId.isValid(id) ? new ObjectId(id) : value;
};

const uniqueIds = (ids = []) => {
  const seen = new Set();
  return ids.filter((id) => {
    const key = normalizeId(id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sanitizeName = (value, fallback = "Wishlist") =>
  String(value || fallback).trim().replace(/\s+/g, " ").slice(0, 80) || fallback;

const buildCollectionId = () => `wl_${crypto.randomBytes(5).toString("hex")}`;

const normalizeAlert = (productId, alert = {}) => {
  const targetPrice = Number(alert.priceDrop?.targetPrice ?? alert.targetPrice);
  return {
    productId: toObjectId(productId),
    collectionId: alert.collectionId || DEFAULT_COLLECTION_ID,
    priceDrop: {
      enabled: Boolean(alert.priceDrop?.enabled),
      targetPrice: Number.isFinite(targetPrice) && targetPrice > 0 ? targetPrice : null,
    },
    backInStock: {
      enabled: Boolean(alert.backInStock?.enabled),
    },
    flashSale: {
      enabled: Boolean(alert.flashSale?.enabled),
    },
    channels: {
      email: alert.channels?.email !== false,
      push: alert.channels?.push !== false,
    },
    updatedAt: new Date(),
  };
};

class Wishlist {
  constructor(db) {
    this.db = db;
    this.collection = db.collection("wishlists");
    this.products = db.collection("products");
    this.users = db.collection("users");
  }

  generateShareId() {
    return crypto.randomBytes(12).toString("hex");
  }

  async findByUserId(userId) {
    return await this.collection.findOne({ userId });
  }

  async ensureWishlist(userId) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const wishlist = {
      userId,
      products: [],
      collections: [],
      productAlerts: [],
      isPublic: false,
      shareId: this.generateShareId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(wishlist);
    return { ...wishlist, _id: result.insertedId };
  }

  async addProduct(userId, productId, collectionId = DEFAULT_COLLECTION_ID) {
    const wishlist = await this.ensureWishlist(userId);
    const normalizedProductId = toObjectId(productId);

    if (collectionId === DEFAULT_COLLECTION_ID) {
      if ((wishlist.products || []).some((p) => normalizeId(p) === normalizeId(productId))) {
        return { success: false, message: "Product already in wishlist" };
      }

      await this.collection.updateOne(
        { userId },
        {
          $addToSet: { products: normalizedProductId },
          $set: { updatedAt: new Date() },
        },
      );
      return { success: true, message: "Product added to wishlist" };
    }

    const collection = (wishlist.collections || []).find((item) => item.id === collectionId);
    if (!collection) {
      return { success: false, message: "Wishlist collection not found" };
    }
    if ((collection.products || []).some((p) => normalizeId(p) === normalizeId(productId))) {
      return { success: false, message: "Product already in this collection" };
    }

    await this.collection.updateOne(
      { userId, "collections.id": collectionId },
      {
        $addToSet: { "collections.$.products": normalizedProductId },
        $set: {
          "collections.$.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );

    return { success: true, message: "Product added to collection" };
  }

  async createCollection(userId, name) {
    await this.ensureWishlist(userId);
    const collection = {
      id: buildCollectionId(),
      name: sanitizeName(name, "New Wishlist"),
      products: [],
      isPublic: false,
      shareId: this.generateShareId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.collection.updateOne(
      { userId },
      {
        $push: { collections: collection },
        $set: { updatedAt: new Date() },
      },
    );

    return collection;
  }

  async updateCollection(userId, collectionId, updates = {}) {
    const wishlist = await this.findByUserId(userId);
    const collection = (wishlist?.collections || []).find((item) => item.id === collectionId);
    if (!collection) {
      return { success: false, message: "Wishlist collection not found" };
    }

    const next = {
      ...collection,
      name: updates.name ? sanitizeName(updates.name, collection.name) : collection.name,
      isPublic:
        typeof updates.isPublic === "boolean"
          ? updates.isPublic
          : collection.isPublic,
      shareId: collection.shareId || this.generateShareId(),
      updatedAt: new Date(),
    };

    await this.collection.updateOne(
      { userId, "collections.id": collectionId },
      {
        $set: {
          "collections.$.name": next.name,
          "collections.$.isPublic": next.isPublic,
          "collections.$.shareId": next.shareId,
          "collections.$.updatedAt": next.updatedAt,
          updatedAt: new Date(),
        },
      },
    );

    return { success: true, collection: next };
  }

  async deleteCollection(userId, collectionId) {
    const result = await this.collection.updateOne(
      { userId },
      {
        $pull: {
          collections: { id: collectionId },
          productAlerts: { collectionId },
        },
        $set: { updatedAt: new Date() },
      },
    );
    return result.modifiedCount > 0;
  }

  async togglePublic(userId) {
    const wishlist = await this.findByUserId(userId);
    if (!wishlist) {
      return { success: false, message: "Wishlist not found" };
    }

    const newPublicState = !wishlist.isPublic;
    const shareId = wishlist.shareId || this.generateShareId();

    await this.collection.updateOne(
      { userId },
      {
        $set: {
          isPublic: newPublicState,
          shareId,
          updatedAt: new Date(),
        },
      },
    );

    return { success: true, isPublic: newPublicState, shareId };
  }

  async setCollectionPublic(userId, collectionId, isPublic = true) {
    return this.updateCollection(userId, collectionId, { isPublic });
  }

  async findByShareId(shareId) {
    return await this.collection.findOne({ shareId, isPublic: true });
  }

  async getProductsByIds(ids = []) {
    const productIds = uniqueIds(ids).map(toObjectId).filter((id) => id instanceof ObjectId);
    if (productIds.length === 0) return [];
    return await this.products.find({ _id: { $in: productIds } }).toArray();
  }

  getAlertForProduct(wishlist, productId, collectionId = DEFAULT_COLLECTION_ID) {
    return (wishlist.productAlerts || []).find(
      (alert) =>
        normalizeId(alert.productId) === normalizeId(productId) &&
        (alert.collectionId || DEFAULT_COLLECTION_ID) === collectionId,
    ) || null;
  }

  decorateProducts(wishlist, productIds = [], products = [], collectionId = DEFAULT_COLLECTION_ID) {
    const byId = new Map(products.map((product) => [normalizeId(product._id), product]));
    return uniqueIds(productIds)
      .map((productId) => {
        const product = byId.get(normalizeId(productId));
        if (!product) return null;
        return {
          ...product,
          wishlistAlert: this.getAlertForProduct(wishlist, productId, collectionId),
        };
      })
      .filter(Boolean);
  }

  async getWishlistWithProducts(userId) {
    const wishlist = await this.findByUserId(userId);
    if (!wishlist) {
      return {
        products: [],
        productDetails: [],
        productAlerts: [],
        collections: [
          {
            id: DEFAULT_COLLECTION_ID,
            name: "All Saved Items",
            products: [],
            productDetails: [],
            isDefault: true,
            isPublic: false,
            shareId: "",
          },
        ],
      };
    }

    const savedCollections = wishlist.collections || [];
    const allIds = uniqueIds([
      ...(wishlist.products || []),
      ...savedCollections.flatMap((collection) => collection.products || []),
    ]);
    const products = await this.getProductsByIds(allIds);
    const defaultProductDetails = this.decorateProducts(
      wishlist,
      wishlist.products || [],
      products,
      DEFAULT_COLLECTION_ID,
    );
    const collections = [
      {
        id: DEFAULT_COLLECTION_ID,
        name: "All Saved Items",
        products: wishlist.products || [],
        productDetails: defaultProductDetails,
        isDefault: true,
        isPublic: Boolean(wishlist.isPublic),
        shareId: wishlist.shareId || "",
      },
      ...savedCollections.map((collection) => ({
        ...collection,
        productDetails: this.decorateProducts(
          wishlist,
          collection.products || [],
          products,
          collection.id,
        ),
      })),
    ];

    return {
      ...wishlist,
      products: wishlist.products || [],
      productDetails: defaultProductDetails,
      productAlerts: wishlist.productAlerts || [],
      collections,
    };
  }

  async getSharedWishlistWithProducts(shareId) {
    const wishlist =
      (await this.collection.findOne({ shareId, isPublic: true })) ||
      (await this.collection.findOne({
        "collections.shareId": shareId,
        "collections.isPublic": true,
      }));

    if (!wishlist) return null;

    const sharedCollection =
      wishlist.shareId === shareId && wishlist.isPublic
        ? {
            id: DEFAULT_COLLECTION_ID,
            name: "Wishlist",
            products: wishlist.products || [],
            isDefault: true,
            isPublic: true,
            shareId,
          }
        : (wishlist.collections || []).find(
            (collection) => collection.shareId === shareId && collection.isPublic,
          );

    if (!sharedCollection) return null;

    const products = await this.getProductsByIds(sharedCollection.products || []);
    const user =
      (await this.users.findOne({ firebaseUid: wishlist.userId })) ||
      (await this.users.findOne({ _id: toObjectId(wishlist.userId) }).catch(() => null));

    return {
      _id: wishlist._id,
      shareId,
      isPublic: true,
      collection: {
        ...sharedCollection,
        productDetails: this.decorateProducts(
          wishlist,
          sharedCollection.products || [],
          products,
          sharedCollection.id || DEFAULT_COLLECTION_ID,
        ),
      },
      products: sharedCollection.products || [],
      productDetails: this.decorateProducts(
        wishlist,
        sharedCollection.products || [],
        products,
        sharedCollection.id || DEFAULT_COLLECTION_ID,
      ),
      createdAt: wishlist.createdAt,
      userDetails: user
        ? [{ name: user.name || user.profile?.displayName || user.email, email: user.email }]
        : [],
    };
  }

  async removeProduct(userId, productId, collectionId = DEFAULT_COLLECTION_ID) {
    const productObjectId = toObjectId(productId);
    const result =
      collectionId === DEFAULT_COLLECTION_ID
        ? await this.collection.updateOne(
            { userId },
            {
              $pull: {
                products: productObjectId,
                productAlerts: {
                  productId: productObjectId,
                  collectionId: DEFAULT_COLLECTION_ID,
                },
              },
              $set: { updatedAt: new Date() },
            },
          )
        : await this.collection.updateOne(
            { userId, "collections.id": collectionId },
            {
              $pull: {
                "collections.$.products": productObjectId,
                productAlerts: { productId: productObjectId, collectionId },
              },
              $set: {
                "collections.$.updatedAt": new Date(),
                updatedAt: new Date(),
              },
            },
          );

    return result.modifiedCount > 0;
  }

  async setProductAlert(userId, productId, alert = {}) {
    await this.ensureWishlist(userId);
    const normalized = normalizeAlert(productId, alert);

    await this.collection.updateOne(
      { userId },
      {
        $pull: {
          productAlerts: {
            productId: normalized.productId,
            collectionId: normalized.collectionId,
          },
        },
      },
    );

    await this.collection.updateOne(
      { userId },
      {
        $push: { productAlerts: normalized },
        $set: { updatedAt: new Date() },
      },
    );

    return normalized;
  }

  async clearWishlist(userId) {
    return await this.collection.deleteOne({ userId });
  }
}

module.exports = Wishlist;
