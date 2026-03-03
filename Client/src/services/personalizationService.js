import { auth } from "../firebase/firebase.config";

class PersonalizationService {
  constructor() {
    this.userId = null;
    this.userPreferences = {};
    this.behaviorData = {};
    this.sessionData = {
      viewedProducts: [],
      searchQueries: [],
      categoryInterests: {},
      timeSpent: {},
      clickPatterns: [],
    };

    // Initialize user tracking
    this.initializeTracking();
  }

  // Initialize user tracking
  initializeTracking() {
    // Track user authentication state
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        this.loadUserPreferences();
        this.loadBehaviorData();
      } else {
        this.userId = null;
        this.userPreferences = {};
        this.behaviorData = {};
      }
    });

    // Track page visibility for time spent calculation
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.saveSessionData();
      }
    });

    // Save data before page unload
    window.addEventListener("beforeunload", () => {
      this.saveSessionData();
    });
  }

  // Load user preferences from localStorage/API
  async loadUserPreferences() {
    try {
      // Try to load from API first
      const response = await fetch(`/api/user/preferences`, {
        headers: {
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
      });

      if (response.ok) {
        this.userPreferences = await response.json();
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem(`userPreferences_${this.userId}`);
        this.userPreferences = saved
          ? JSON.parse(saved)
          : this.getDefaultPreferences();
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      this.userPreferences = this.getDefaultPreferences();
    }
  }

  // Load behavior data
  async loadBehaviorData() {
    try {
      const saved = localStorage.getItem(`behaviorData_${this.userId}`);
      this.behaviorData = saved
        ? JSON.parse(saved)
        : this.getDefaultBehaviorData();
    } catch (error) {
      console.error("Failed to load behavior data:", error);
      this.behaviorData = this.getDefaultBehaviorData();
    }
  }

  // Get default preferences
  getDefaultPreferences() {
    return {
      categories: [],
      priceRange: { min: 0, max: 1000 },
      brands: [],
      colors: [],
      sizes: [],
      sortPreference: "relevance",
      viewMode: "grid",
      itemsPerPage: 20,
      language: "en",
      currency: "USD",
      notifications: {
        priceDrops: true,
        backInStock: true,
        newArrivals: true,
        recommendations: true,
      },
    };
  }

  // Get default behavior data
  getDefaultBehaviorData() {
    return {
      viewHistory: [],
      searchHistory: [],
      purchaseHistory: [],
      categoryInteractions: {},
      timeSpentOnProducts: {},
      clickPatterns: [],
      abandonedCarts: [],
      wishlistItems: [],
      reviewsGiven: [],
      lastActive: new Date().toISOString(),
    };
  }

  // Track product view
  trackProductView(productId, productData) {
    const viewData = {
      productId,
      timestamp: new Date().toISOString(),
      category: productData.category,
      price: productData.price,
      brand: productData.brand,
      sessionId: this.getSessionId(),
    };

    // Add to session data
    this.sessionData.viewedProducts.push(viewData);

    // Add to behavior data
    this.behaviorData.viewHistory = this.behaviorData.viewHistory || [];
    this.behaviorData.viewHistory.unshift(viewData);

    // Keep only last 100 views
    this.behaviorData.viewHistory = this.behaviorData.viewHistory.slice(0, 100);

    // Update category interests
    this.updateCategoryInterest(productData.category);

    // Save behavior data
    this.saveBehaviorData();
  }

  // Track search query
  trackSearch(query, results = []) {
    const searchData = {
      query: query.toLowerCase(),
      timestamp: new Date().toISOString(),
      resultsCount: results.length,
      sessionId: this.getSessionId(),
    };

    this.sessionData.searchQueries.push(searchData);

    this.behaviorData.searchHistory = this.behaviorData.searchHistory || [];
    this.behaviorData.searchHistory.unshift(searchData);
    this.behaviorData.searchHistory = this.behaviorData.searchHistory.slice(
      0,
      50,
    );

    this.saveBehaviorData();
  }

  // Track purchase
  trackPurchase(orderData) {
    const purchaseData = {
      orderId: orderData.id,
      items: orderData.items,
      total: orderData.total,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };

    this.behaviorData.purchaseHistory = this.behaviorData.purchaseHistory || [];
    this.behaviorData.purchaseHistory.unshift(purchaseData);

    // Update preferences based on purchase
    this.updatePreferencesFromPurchase(orderData);

    this.saveBehaviorData();
  }

  // Track time spent on product
  trackTimeSpent(productId, timeSpent) {
    this.sessionData.timeSpent[productId] =
      (this.sessionData.timeSpent[productId] || 0) + timeSpent;

    this.behaviorData.timeSpentOnProducts =
      this.behaviorData.timeSpentOnProducts || {};
    this.behaviorData.timeSpentOnProducts[productId] =
      (this.behaviorData.timeSpentOnProducts[productId] || 0) + timeSpent;

    this.saveBehaviorData();
  }

  // Track click patterns
  trackClick(element, context) {
    const clickData = {
      element,
      context,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };

    this.sessionData.clickPatterns.push(clickData);

    this.behaviorData.clickPatterns = this.behaviorData.clickPatterns || [];
    this.behaviorData.clickPatterns.unshift(clickData);
    this.behaviorData.clickPatterns = this.behaviorData.clickPatterns.slice(
      0,
      200,
    );

    this.saveBehaviorData();
  }

  // Update category interest
  updateCategoryInterest(category) {
    this.sessionData.categoryInterests[category] =
      (this.sessionData.categoryInterests[category] || 0) + 1;

    this.behaviorData.categoryInteractions =
      this.behaviorData.categoryInteractions || {};
    this.behaviorData.categoryInteractions[category] =
      (this.behaviorData.categoryInteractions[category] || 0) + 1;
  }

  // Update preferences from purchase
  updatePreferencesFromPurchase(orderData) {
    orderData.items.forEach((item) => {
      // Update preferred categories
      if (
        item.category &&
        !this.userPreferences.categories.includes(item.category)
      ) {
        this.userPreferences.categories.push(item.category);
      }

      // Update preferred brands
      if (item.brand && !this.userPreferences.brands.includes(item.brand)) {
        this.userPreferences.brands.push(item.brand);
      }

      // Update price range
      if (item.price > this.userPreferences.priceRange.max) {
        this.userPreferences.priceRange.max = Math.ceil(item.price * 1.2);
      }
    });

    this.saveUserPreferences();
  }

  // Get personalized recommendations
  getPersonalizedRecommendations(products, limit = 10) {
    if (!products || products.length === 0) return [];

    const scoredProducts = products.map((product) => ({
      ...product,
      personalizedScore: this.calculatePersonalizationScore(product),
    }));

    return scoredProducts
      .sort((a, b) => b.personalizedScore - a.personalizedScore)
      .slice(0, limit);
  }

  // Calculate personalization score for a product
  calculatePersonalizationScore(product) {
    let score = 0;

    // Category preference (30% weight)
    const categoryInteractions = this.behaviorData.categoryInteractions || {};
    const categoryScore = categoryInteractions[product.category] || 0;
    score += categoryScore * 0.3;

    // Price preference (20% weight)
    const priceRange = this.userPreferences.priceRange;
    if (product.price >= priceRange.min && product.price <= priceRange.max) {
      score += 20;
    } else {
      const priceDiff = Math.min(
        Math.abs(product.price - priceRange.min),
        Math.abs(product.price - priceRange.max),
      );
      score += Math.max(0, 20 - (priceDiff / priceRange.max) * 20);
    }

    // Brand preference (15% weight)
    if (this.userPreferences.brands.includes(product.brand)) {
      score += 15;
    }

    // Recent view similarity (20% weight)
    const recentViews = this.behaviorData.viewHistory?.slice(0, 10) || [];
    const similarityScore = this.calculateSimilarityScore(product, recentViews);
    score += similarityScore * 0.2;

    // Purchase history similarity (15% weight)
    const purchaseHistory = this.behaviorData.purchaseHistory || [];
    const purchaseSimilarity = this.calculatePurchaseSimilarity(
      product,
      purchaseHistory,
    );
    score += purchaseSimilarity * 0.15;

    return score;
  }

  // Calculate similarity score based on recent views
  calculateSimilarityScore(product, recentViews) {
    if (recentViews.length === 0) return 0;

    let similarityScore = 0;

    recentViews.forEach((view) => {
      if (view.category === product.category) similarityScore += 5;
      if (view.brand === product.brand) similarityScore += 3;

      const priceDiff = Math.abs(view.price - product.price);
      if (priceDiff < view.price * 0.2) similarityScore += 2;
    });

    return Math.min(similarityScore, 20);
  }

  // Calculate purchase similarity
  calculatePurchaseSimilarity(product, purchaseHistory) {
    if (purchaseHistory.length === 0) return 0;

    let similarity = 0;

    purchaseHistory.forEach((purchase) => {
      purchase.items.forEach((item) => {
        if (item.category === product.category) similarity += 3;
        if (item.brand === product.brand) similarity += 2;
      });
    });

    return Math.min(similarity, 15);
  }

  // Get personalized homepage content
  getPersonalizedHomepage() {
    const preferences = this.userPreferences;
    const behavior = this.behaviorData;

    return {
      featuredCategories: this.getTopCategories(),
      recommendedProducts: [], // Will be populated by API
      personalizedBanners: this.getPersonalizedBanners(),
      recentlyViewed: behavior.viewHistory?.slice(0, 8) || [],
      suggestedSearches: this.getSuggestedSearches(),
      preferredSortOrder: preferences.sortPreference || "relevance",
    };
  }

  // Get top categories based on user behavior
  getTopCategories() {
    const categoryInteractions = this.behaviorData.categoryInteractions || {};
    const preferredCategories = this.userPreferences.categories || [];

    // Combine preferred and interacted categories
    const allCategories = [
      ...new Set([
        ...preferredCategories,
        ...Object.keys(categoryInteractions),
      ]),
    ];

    return allCategories
      .map((category) => ({
        category,
        score:
          (categoryInteractions[category] || 0) +
          (preferredCategories.includes(category) ? 10 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.category);
  }

  // Get personalized banners
  getPersonalizedBanners() {
    const topCategories = this.getTopCategories();
    const priceRange = this.userPreferences.priceRange;

    return {
      categories: topCategories.slice(0, 3),
      priceRange: priceRange,
      showFlashSales: true,
      showNewArrivals: topCategories.length > 0,
    };
  }

  // Get suggested searches
  getSuggestedSearches() {
    const searchHistory = this.behaviorData.searchHistory || [];
    const topCategories = this.getTopCategories();

    const recentSearches = searchHistory.slice(0, 3).map((s) => s.query);
    const categorySearches = topCategories.slice(0, 2);

    return [...new Set([...recentSearches, ...categorySearches])].slice(0, 5);
  }

  // Save user preferences
  async saveUserPreferences() {
    if (!this.userId) return;

    try {
      // Save to API
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
        body: JSON.stringify(this.userPreferences),
      });
    } catch (error) {
      console.error("Failed to save preferences to API:", error);
    }

    // Always save to localStorage as backup
    localStorage.setItem(
      `userPreferences_${this.userId}`,
      JSON.stringify(this.userPreferences),
    );
  }

  // Save behavior data
  saveBehaviorData() {
    if (!this.userId) return;

    this.behaviorData.lastActive = new Date().toISOString();
    localStorage.setItem(
      `behaviorData_${this.userId}`,
      JSON.stringify(this.behaviorData),
    );
  }

  // Save session data
  saveSessionData() {
    if (!this.userId) return;

    localStorage.setItem(
      `sessionData_${this.userId}`,
      JSON.stringify(this.sessionData),
    );
  }

  // Get session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  }

  // Update user preferences
  updatePreferences(newPreferences) {
    this.userPreferences = { ...this.userPreferences, ...newPreferences };
    this.saveUserPreferences();
  }

  // Get user preferences
  getPreferences() {
    return this.userPreferences;
  }

  // Get behavior insights
  getBehaviorInsights() {
    return {
      topCategories: this.getTopCategories(),
      averageOrderValue: this.calculateAverageOrderValue(),
      shoppingFrequency: this.calculateShoppingFrequency(),
      preferredPriceRange: this.userPreferences.priceRange,
      mostViewedBrands: this.getMostViewedBrands(),
      searchPatterns: this.getSearchPatterns(),
    };
  }

  // Calculate average order value
  calculateAverageOrderValue() {
    const purchases = this.behaviorData.purchaseHistory || [];
    if (purchases.length === 0) return 0;

    const total = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    return total / purchases.length;
  }

  // Calculate shopping frequency
  calculateShoppingFrequency() {
    const purchases = this.behaviorData.purchaseHistory || [];
    if (purchases.length < 2) return 0;

    const firstPurchase = new Date(purchases[purchases.length - 1].timestamp);
    const lastPurchase = new Date(purchases[0].timestamp);
    const daysDiff = (lastPurchase - firstPurchase) / (1000 * 60 * 60 * 24);

    return purchases.length / Math.max(daysDiff, 1);
  }

  // Get most viewed brands
  getMostViewedBrands() {
    const viewHistory = this.behaviorData.viewHistory || [];
    const brandCounts = {};

    viewHistory.forEach((view) => {
      if (view.brand) {
        brandCounts[view.brand] = (brandCounts[view.brand] || 0) + 1;
      }
    });

    return Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([brand]) => brand);
  }

  // Get search patterns
  getSearchPatterns() {
    const searchHistory = this.behaviorData.searchHistory || [];
    const patterns = {
      mostSearched: [],
      searchTimes: {},
      searchLength: 0,
    };

    if (searchHistory.length === 0) return patterns;

    // Most searched terms
    const termCounts = {};
    searchHistory.forEach((search) => {
      termCounts[search.query] = (termCounts[search.query] || 0) + 1;
    });

    patterns.mostSearched = Object.entries(termCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([term]) => term);

    // Search times
    searchHistory.forEach((search) => {
      const hour = new Date(search.timestamp).getHours();
      patterns.searchTimes[hour] = (patterns.searchTimes[hour] || 0) + 1;
    });

    // Average search length
    patterns.searchLength =
      searchHistory.reduce((sum, search) => sum + search.query.length, 0) /
      searchHistory.length;

    return patterns;
  }
}

export default new PersonalizationService();
