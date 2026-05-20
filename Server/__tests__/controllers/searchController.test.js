const {
  _searchTestUtils: {
    buildCategoryTree,
    buildDictionary,
    buildFacets,
    buildSuggestions,
    correctQueryTokens,
    enrichProducts,
    runSearch,
  },
} = require("../../controllers/searchController");

const categories = [
  {
    _id: "cat-electronics",
    name: "Electronics",
    slug: "electronics",
    description: "Phones, audio, and devices",
    displayOrder: 1,
  },
  {
    _id: "cat-phones",
    name: "Phones",
    slug: "phones",
    parentId: "cat-electronics",
    displayOrder: 1,
  },
  {
    _id: "cat-audio",
    name: "Audio",
    slug: "audio",
    parentId: "cat-electronics",
    displayOrder: 2,
  },
  {
    _id: "cat-fashion",
    name: "Fashion",
    slug: "fashion",
    displayOrder: 2,
  },
];

const rawProducts = [
  {
    _id: "product-samsung-phone",
    title: "Samsung Galaxy Phone",
    description: "Android smartphone with fast charging",
    categoryId: "cat-phones",
    brand: "Samsung",
    price: 25000,
    originalPrice: 30000,
    stock: 12,
    averageRating: 4.7,
    reviewCount: 18,
    views: 220,
    tags: ["phone", "android"],
    deliverySpeed: "24h",
    location: "Dhaka",
    createdAt: "2026-05-10T00:00:00.000Z",
  },
  {
    _id: "product-sony-headphones",
    title: "Sony Noise Cancelling Headphones",
    description: "Wireless headphones for music and calls",
    categoryId: "cat-audio",
    brand: "Sony",
    price: 2500,
    originalPrice: 3200,
    stock: 5,
    averageRating: 4.9,
    reviewCount: 44,
    views: 180,
    tags: "headphones audio",
    deliverySpeed: "24h",
    location: "Dhaka",
    createdAt: "2026-05-12T00:00:00.000Z",
  },
  {
    _id: "product-basic-shirt",
    title: "Cotton Shirt",
    description: "Everyday wear",
    categoryId: "cat-fashion",
    brand: "LocalWear",
    price: 900,
    originalPrice: 900,
    stock: 0,
    averageRating: 3.8,
    reviewCount: 7,
    views: 60,
    tags: ["shirt"],
    deliverySpeed: "standard",
    location: {
      division: "Chattogram",
      divisionId: "1",
      district: "Chattogram",
      districtId: "8",
      upazila: "Chattogram Sadar",
      upazilaId: "11",
      union: "Pahartali",
      unionId: "880",
    },
    createdAt: "2026-05-08T00:00:00.000Z",
  },
];

const products = enrichProducts({ products: rawProducts, categories });

describe("search controller white-box utilities", () => {
  test("correctQueryTokens fixes marketplace spelling mistakes", () => {
    const dictionary = buildDictionary({ products, categories });

    const correction = correctQueryTokens("samsng phon", dictionary);

    expect(correction.corrected).toBe(true);
    expect(correction.correctedQuery).toBe("samsung phone");
  });

  test("runSearch finds fuzzy product matches and exposes did-you-mean text", () => {
    const result = runSearch({
      products,
      categories,
      query: "samsng phon",
      sort: "best_match",
    });

    expect(result.didYouMean).toBe("samsung phone");
    expect(result.totalCount).toBe(1);
    expect(result.products[0]._id).toBe("product-samsung-phone");
  });

  test("runSearch applies advanced filters, chips, and top-rated sorting", () => {
    const result = runSearch({
      products,
      categories,
      query: "headphones",
      filters: {
        brands: ["Sony"],
        maxPrice: 3000,
        minRating: 4,
        discountMin: 10,
        inStock: true,
        deliverySpeed: "24h",
        location: "Dhaka",
      },
      sort: "top_rated",
    });

    expect(result.totalCount).toBe(1);
    expect(result.products[0]._id).toBe("product-sony-headphones");
    expect(result.appliedFilters.map((filter) => filter.label)).toEqual(
      expect.arrayContaining([
        "Brand: Sony",
        "Under BDT 3000",
        "4+ rated",
        "10% off or more",
        "In stock",
        "Delivery: 24h",
        "Division: Dhaka",
      ]),
    );
  });

  test("runSearch matches Bangladesh division aliases", () => {
    const result = runSearch({
      products,
      categories,
      filters: {
        location: "Chattagram",
      },
      sort: "best_match",
    });

    expect(result.totalCount).toBe(1);
    expect(result.products[0]._id).toBe("product-basic-shirt");
    expect(buildFacets(products, categories).locations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "Chattogram", count: 1 }),
      ]),
    );
  });

  test("runSearch filters by district, upazila, and union", () => {
    const result = runSearch({
      products,
      categories,
      filters: {
        location: "Chattogram",
        divisionId: "1",
        district: "Chattogram",
        districtId: "8",
        upazila: "Chattogram Sadar",
        upazilaId: "11",
        union: "Pahartali",
        unionId: "880",
      },
      sort: "best_match",
    });

    expect(result.totalCount).toBe(1);
    expect(result.products[0]._id).toBe("product-basic-shirt");
    expect(result.appliedFilters.map((filter) => filter.label)).toEqual(
      expect.arrayContaining([
        "Division: Chattogram",
        "District: Chattogram",
        "Upazila: Chattogram Sadar",
        "Union: Pahartali",
      ]),
    );

    const facets = buildFacets(products, categories);
    expect(facets.locationBreakdown.districts).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "8", count: 1 })]),
    );
  });

  test("buildCategoryTree creates a nested mega-menu source with brands and banners", () => {
    const tree = buildCategoryTree(categories, products, [
      {
        categoryId: "cat-electronics",
        title: "Tech Week",
        subtitle: "Fresh deals",
        imageUrl: "https://example.com/banner.jpg",
        linkUrl: "/campaigns/tech-week",
        status: "active",
      },
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({
      _id: "cat-electronics",
      productCount: 2,
      banner: {
        title: "Tech Week",
        imageUrl: "https://example.com/banner.jpg",
        link: "/campaigns/tech-week",
      },
    });
    expect(tree[0].children.map((child) => child.name)).toEqual(["Phones", "Audio"]);
    expect(tree[0].featuredBrands.map((brand) => brand.name)).toEqual(
      expect.arrayContaining(["Samsung", "Sony"]),
    );
  });

  test("no-result suggestions and category facets keep empty states useful", () => {
    const result = runSearch({
      products,
      categories,
      query: "zzzzzz",
      sort: "best_match",
    });
    const facets = buildFacets(products, categories);
    const suggestions = buildSuggestions({
      query: "zzzzzz",
      categories,
      products,
    });

    expect(result.totalCount).toBe(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(facets.categories.find((category) => category._id === "cat-electronics")).toMatchObject({
      productCount: 2,
    });
  });
});
