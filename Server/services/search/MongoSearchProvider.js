class MongoSearchProvider {
  constructor(dependencies = {}) {
    this.name = "mongo";
    this.loadSource = dependencies.loadSource;
    this.runSearch = dependencies.runSearch;
    this.buildFacets = dependencies.buildFacets;
    this.buildCategoryTree = dependencies.buildCategoryTree;
    this.flattenCategories = dependencies.flattenCategories;
    this.getTrendingSearches = dependencies.getTrendingSearches;
    this.getRecentSearches = dependencies.getRecentSearches;
    this.buildDictionary = dependencies.buildDictionary;
    this.correctQueryTokens = dependencies.correctQueryTokens;
    this.scoreProduct = dependencies.scoreProduct;
    this.sortProducts = dependencies.sortProducts;
    this.tokenize = dependencies.tokenize;
    this.bestTokenMatch = dependencies.bestTokenMatch;
  }

  parseFilters(query = {}) {
    const parseArrayParam = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.flatMap(parseArrayParam);
      return String(value).split(",").map((item) => item.trim()).filter(Boolean);
    };

    const filters = {
      category: query.category || "",
      minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
      brands: parseArrayParam(query.brands || query["brands[]"]),
      minRating: query.minRating !== undefined ? Number(query.minRating) : undefined,
      deliverySpeed: query.deliverySpeed || "",
      discountMin: query.discountMin !== undefined ? Number(query.discountMin) : undefined,
      inStock: query.inStock === "true",
      location: query.location || "",
    };

    Object.keys(filters).forEach((key) => {
      if (filters[key] === "" || filters[key] === undefined || (Array.isArray(filters[key]) && !filters[key].length)) {
        delete filters[key];
      }
    });

    return filters;
  }

  async search(req) {
    const source = await this.loadSource(req);
    const result = this.runSearch({
      products: source.products,
      categories: source.categories,
      query: String(req.query.q || req.query.search || "").trim(),
      filters: this.parseFilters(req.query),
      sort: req.query.sort || req.query.sortBy || "best_match",
      page: req.query.page || 1,
      limit: req.query.limit || 24,
    });

    return {
      source,
      result,
      facets: this.buildFacets(source.products, source.categories),
    };
  }

  async autocomplete(req) {
    const query = String(req.query.q || "").trim();
    const source = await this.loadSource(req);
    const tree = this.buildCategoryTree(source.categories, source.products, source.homepageSlots);
    const flatCategories = this.flattenCategories(tree);
    const recentSearches = await this.getRecentSearches(req);
    const trendingSearches = await this.getTrendingSearches(source.db, source.products);
    const dictionary = this.buildDictionary({ products: source.products, categories: source.categories });
    const queryInfo = this.correctQueryTokens(query, dictionary);
    const hasQuery = queryInfo.originalTokens.length > 0;

    const matchingCategories = flatCategories
      .map((category) => ({
        ...category,
        score: hasQuery
          ? queryInfo.correctedTokens.reduce(
            (sum, token) => sum + this.bestTokenMatch(token, this.tokenize(`${category.name} ${category.description}`)),
            0,
          )
          : 1,
      }))
      .filter((category) => !hasQuery || category.score > 0.55)
      .sort((a, b) => b.score - a.score || b.productCount - a.productCount)
      .slice(0, 6);

    const products = hasQuery
      ? this.sortProducts(
        source.products
          .map((product) => ({ ...product, searchScore: this.scoreProduct(product, queryInfo) }))
          .filter((product) => product.searchScore >= 2),
        "best_match",
      ).slice(0, 6)
      : [];

    return {
      query,
      correctedQuery: queryInfo.corrected ? queryInfo.correctedQuery : "",
      recentSearches,
      trendingSearches,
      matchingCategories,
      products,
    };
  }

  async navigation(req) {
    const source = await this.loadSource(req);
    const categories = this.buildCategoryTree(source.categories, source.products, source.homepageSlots);
    const trendingSearches = await this.getTrendingSearches(source.db, source.products);

    return {
      categories,
      trendingSearches,
      featuredCategories: this.flattenCategories(categories)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 12),
    };
  }
}

module.exports = MongoSearchProvider;
