class OfflineService {
  constructor() {
    this.dbName = "HnilaBazarOfflineDB";
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncOfflineData();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Products store
        if (!db.objectStoreNames.contains("products")) {
          const productsStore = db.createObjectStore("products", {
            keyPath: "_id",
          });
          productsStore.createIndex("category", "category", { unique: false });
          productsStore.createIndex("title", "title", { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "_id" });
        }

        // Offline cart store
        if (!db.objectStoreNames.contains("offlineCart")) {
          db.createObjectStore("offlineCart", { keyPath: "productId" });
        }

        // Offline wishlist store
        if (!db.objectStoreNames.contains("offlineWishlist")) {
          db.createObjectStore("offlineWishlist", { keyPath: "productId" });
        }

        // Pending actions store
        if (!db.objectStoreNames.contains("pendingActions")) {
          const actionsStore = db.createObjectStore("pendingActions", {
            keyPath: "id",
            autoIncrement: true,
          });
          actionsStore.createIndex("type", "type", { unique: false });
          actionsStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // User data store
        if (!db.objectStoreNames.contains("userData")) {
          db.createObjectStore("userData", { keyPath: "key" });
        }
      };
    });
  }

  // Cache products for offline access
  async cacheProducts(products) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["products"], "readwrite");
    const store = transaction.objectStore("products");

    for (const product of products) {
      await store.put(product);
    }

    return transaction.complete;
  }

  // Cache categories for offline access
  async cacheCategories(categories) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["categories"], "readwrite");
    const store = transaction.objectStore("categories");

    for (const category of categories) {
      await store.put(category);
    }

    return transaction.complete;
  }

  // Get cached products
  async getCachedProducts(filters = {}) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["products"], "readonly");
    const store = transaction.objectStore("products");

    let products = await this.getAllFromStore(store);

    // Apply filters
    if (filters.category) {
      products = products.filter((p) => p.category === filters.category);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm) ||
          p.description.toLowerCase().includes(searchTerm),
      );
    }

    return products;
  }

  // Get cached categories
  async getCachedCategories() {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["categories"], "readonly");
    const store = transaction.objectStore("categories");

    return this.getAllFromStore(store);
  }

  // Add to offline cart
  async addToOfflineCart(
    productId,
    quantity = 1,
    selectedSize = null,
    selectedColor = null,
  ) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["offlineCart"], "readwrite");
    const store = transaction.objectStore("offlineCart");

    const existingItem = await store.get(productId);

    if (existingItem) {
      existingItem.quantity += quantity;
      await store.put(existingItem);
    } else {
      await store.put({
        productId,
        quantity,
        selectedSize,
        selectedColor,
        addedAt: new Date().toISOString(),
      });
    }

    // Add to pending actions for sync
    await this.addPendingAction("ADD_TO_CART", {
      productId,
      quantity,
      selectedSize,
      selectedColor,
    });

    return transaction.complete;
  }

  // Get offline cart
  async getOfflineCart() {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(
      ["offlineCart", "products"],
      "readonly",
    );
    const cartStore = transaction.objectStore("offlineCart");
    const productsStore = transaction.objectStore("products");

    const cartItems = await this.getAllFromStore(cartStore);

    // Enrich with product details
    const enrichedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await productsStore.get(item.productId);
        return {
          ...item,
          product,
        };
      }),
    );

    return enrichedItems.filter((item) => item.product); // Filter out items without product data
  }

  // Remove from offline cart
  async removeFromOfflineCart(productId) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["offlineCart"], "readwrite");
    const store = transaction.objectStore("offlineCart");

    await store.delete(productId);

    // Add to pending actions for sync
    await this.addPendingAction("REMOVE_FROM_CART", { productId });

    return transaction.complete;
  }

  // Add to offline wishlist
  async addToOfflineWishlist(productId) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["offlineWishlist"], "readwrite");
    const store = transaction.objectStore("offlineWishlist");

    await store.put({
      productId,
      addedAt: new Date().toISOString(),
    });

    // Add to pending actions for sync
    await this.addPendingAction("ADD_TO_WISHLIST", { productId });

    return transaction.complete;
  }

  // Get offline wishlist
  async getOfflineWishlist() {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(
      ["offlineWishlist", "products"],
      "readonly",
    );
    const wishlistStore = transaction.objectStore("offlineWishlist");
    const productsStore = transaction.objectStore("products");

    const wishlistItems = await this.getAllFromStore(wishlistStore);

    // Enrich with product details
    const enrichedItems = await Promise.all(
      wishlistItems.map(async (item) => {
        const product = await productsStore.get(item.productId);
        return {
          ...item,
          product,
        };
      }),
    );

    return enrichedItems.filter((item) => item.product);
  }

  // Add pending action for sync
  async addPendingAction(type, data) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["pendingActions"], "readwrite");
    const store = transaction.objectStore("pendingActions");

    await store.add({
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    return transaction.complete;
  }

  // Get pending actions
  async getPendingActions() {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["pendingActions"], "readonly");
    const store = transaction.objectStore("pendingActions");

    return this.getAllFromStore(store);
  }

  // Clear pending actions
  async clearPendingActions() {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["pendingActions"], "readwrite");
    const store = transaction.objectStore("pendingActions");

    await store.clear();

    return transaction.complete;
  }

  // Sync offline data when back online
  async syncOfflineData() {
    if (!this.isOnline) return;

    try {
      const pendingActions = await this.getPendingActions();

      for (const action of pendingActions) {
        try {
          await this.processPendingAction(action);
        } catch (error) {
          console.error("Failed to sync action:", action, error);
        }
      }

      // Clear processed actions
      await this.clearPendingActions();

      console.log("Offline data synced successfully");
    } catch (error) {
      console.error("Failed to sync offline data:", error);
    }
  }

  // Process individual pending action
  async processPendingAction(action) {
    const { type, data } = action;

    switch (type) {
      case "ADD_TO_CART":
        // Implement API call to add to cart
        break;
      case "REMOVE_FROM_CART":
        // Implement API call to remove from cart
        break;
      case "ADD_TO_WISHLIST":
        // Implement API call to add to wishlist
        break;
      case "REMOVE_FROM_WISHLIST":
        // Implement API call to remove from wishlist
        break;
      default:
        console.warn("Unknown action type:", type);
    }
  }

  // Store user data
  async storeUserData(key, data) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["userData"], "readwrite");
    const store = transaction.objectStore("userData");

    await store.put({ key, data, timestamp: new Date().toISOString() });

    return transaction.complete;
  }

  // Get user data
  async getUserData(key) {
    if (!this.db) await this.initDB();

    const transaction = this.db.transaction(["userData"], "readonly");
    const store = transaction.objectStore("userData");

    const result = await store.get(key);
    return result ? result.data : null;
  }

  // Utility function to get all items from a store
  getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Check if offline
  isOffline() {
    return !this.isOnline;
  }

  // Get offline status
  getStatus() {
    return {
      isOnline: this.isOnline,
      dbInitialized: !!this.db,
    };
  }
}

export default new OfflineService();
