const { _discoveryTestUtils } = require("../../controllers/discoveryController");

const {
  attachProductContext,
  buildCategoryQuickAccess,
  buildCuratedCollections,
  buildDailyCheckInPrompt,
  buildFlashSaleStrip,
  buildHeroBanners,
  buildNewArrivals,
  buildPersonalizedFeed,
  buildRecentlyViewedProducts,
  buildTrendingProducts,
  getTodayKey,
} = _discoveryTestUtils;

const now = new Date("2026-05-17T06:00:00.000Z");

const categories = [
  { _id: "cat-tech", name: "Electronics", slug: "electronics", isActive: true, displayOrder: 1 },
  { _id: "cat-fashion", name: "Fashion", slug: "fashion", isActive: true, displayOrder: 2 },
  { _id: "cat-home", name: "Home", slug: "home", isActive: true, displayOrder: 3 },
];

const vendors = [
  { _id: "vendor-1", shopName: "Tech Corner", status: "approved", slug: "tech-corner", createdAt: "2026-05-10T00:00:00.000Z" },
  { _id: "vendor-2", shopName: "Style House", status: "approved", slug: "style-house", createdAt: "2026-04-01T00:00:00.000Z" },
];

const products = attachProductContext(
  [
    {
      _id: "prod-phone",
      title: "Smart Phone",
      categoryId: "cat-tech",
      vendorId: "vendor-1",
      price: 12000,
      stock: 8,
      views: 40,
      image: "phone.jpg",
      createdAt: "2026-05-16T00:00:00.000Z",
    },
    {
      _id: "prod-shirt",
      title: "Cotton Shirt",
      categoryId: "cat-fashion",
      vendorId: "vendor-2",
      price: 450,
      stock: 25,
      views: 20,
      image: "shirt.jpg",
      createdAt: "2026-05-15T00:00:00.000Z",
    },
    {
      _id: "prod-pan",
      title: "Cooking Pan",
      categoryId: "cat-home",
      vendorId: "vendor-1",
      price: 900,
      stock: 10,
      views: 5,
      image: "pan.jpg",
      createdAt: "2026-04-20T00:00:00.000Z",
    },
  ],
  categories,
  vendors,
);

const orders = [
  {
    _id: "order-1",
    userId: "user-1",
    status: "delivered",
    createdAt: "2026-05-16T08:00:00.000Z",
    products: [{ productId: "prod-phone", categoryId: "cat-tech", vendorId: "vendor-1", quantity: 1, price: 12000 }],
  },
  {
    _id: "order-2",
    userId: "user-2",
    status: "processing",
    createdAt: "2026-05-17T04:00:00.000Z",
    products: [{ productId: "prod-shirt", categoryId: "cat-fashion", vendorId: "vendor-2", quantity: 4, price: 450 }],
  },
  {
    _id: "order-3",
    userId: "user-2",
    status: "cancelled",
    createdAt: "2026-05-17T05:00:00.000Z",
    products: [{ productId: "prod-pan", categoryId: "cat-home", vendorId: "vendor-1", quantity: 99, price: 900 }],
  },
];

describe("discoveryController homepage builders", () => {
  test("builds trending products from recent non-cancelled orders and view count", () => {
    const trending = buildTrendingProducts({ products, orders, now });

    expect(trending[0]).toEqual(expect.objectContaining({
      _id: "prod-phone",
      unitsSold: 1,
      revenueGenerated: 12000,
    }));
    expect(trending.find((product) => product._id === "prod-pan").unitsSold).toBe(0);
  });

  test("builds personalized feed from user orders and recently viewed products", () => {
    const trending = buildTrendingProducts({ products, orders, now });
    const feed = buildPersonalizedFeed({
      products,
      orders,
      recentProductIds: ["prod-shirt"],
      userKeys: ["user-1"],
      trendingProducts: trending,
      now,
    });

    expect(feed.map((product) => product._id).slice(0, 2)).toEqual(["prod-shirt", "prod-phone"]);
    expect(feed[0].recommendationReason).toContain("recent browsing");
  });

  test("builds active campaign hero banners, category access, flash sales, and new arrivals", () => {
    const heroes = buildHeroBanners({
      homepageSlots: [{ _id: "slot-1", slotType: "hero_banner", status: "active", title: "Eid Sale", imageUrl: "eid.jpg", linkUrl: "/campaigns/eid" }],
      campaigns: [{ _id: "camp-1", status: "Active", name: "11.11", bannerImageUrl: "1111.jpg", startDate: "2026-05-01", endDate: "2026-05-30" }],
      flashSales: [],
      vendors,
      products,
      now,
    });
    const quickAccess = buildCategoryQuickAccess({ categories, products });
    const flashSales = buildFlashSaleStrip({
      flashSales: [
        { _id: "flash-1", product: "prod-shirt", flashPrice: 399, originalPrice: 450, totalStock: 20, soldCount: 3, startTime: "2026-05-17T01:00:00.000Z", endTime: "2026-05-17T08:00:00.000Z", isActive: true },
        { _id: "flash-2", product: "prod-pan", flashPrice: 700, totalStock: 2, soldCount: 2, startTime: "2026-05-17T01:00:00.000Z", endTime: "2026-05-17T08:00:00.000Z", isActive: true },
      ],
      products,
      now,
    });
    const arrivals = buildNewArrivals({ products, now, categoryId: "cat-fashion" });

    expect(heroes.map((banner) => banner.source)).toEqual(expect.arrayContaining(["homepage_slot", "campaign"]));
    expect(quickAccess.find((category) => category._id === "cat-tech").productCount).toBe(1);
    expect(flashSales).toHaveLength(1);
    expect(flashSales[0]).toEqual(expect.objectContaining({ productId: "prod-shirt", remainingStock: 17 }));
    expect(arrivals.map((product) => product._id)).toEqual(["prod-shirt"]);
  });

  test("builds category quick access from top-level groups, not leaf categories", () => {
    const groupedCategories = [
      { _id: "cat-phones", name: "Phones", slug: "phones", parentId: "cat-tech", isActive: true, displayOrder: 1 },
      { _id: "cat-tech", name: "Electronics", slug: "electronics", isActive: true, displayOrder: 2 },
      { _id: "cat-fashion", name: "Fashion", slug: "fashion", isActive: true, displayOrder: 3 },
      { _id: "cat-shirts", name: "Shirts", slug: "shirts", parentId: "cat-fashion", isActive: true, displayOrder: 4 },
    ];
    const groupedProducts = [
      { _id: "prod-phone", categoryId: "cat-phones" },
      { _id: "prod-laptop", categoryId: "cat-tech" },
      { _id: "prod-shirt", categoryId: "cat-shirts" },
    ];

    const quickAccess = buildCategoryQuickAccess({ categories: groupedCategories, products: groupedProducts });

    expect(quickAccess.map((category) => category._id)).toEqual(["cat-tech", "cat-fashion"]);
    expect(quickAccess.find((category) => category._id === "cat-phones")).toBeUndefined();
    expect(quickAccess[0]).toEqual(expect.objectContaining({
      name: "Electronics",
      productCount: 2,
      childCount: 1,
      parentId: "",
    }));
    expect(quickAccess[1]).toEqual(expect.objectContaining({
      name: "Fashion",
      productCount: 1,
      childCount: 1,
    }));
  });

  test("does not promote orphaned child categories into homepage groups", () => {
    const partialCategories = [
      { _id: "cat-root", name: "Root Group", slug: "root-group", isActive: true, displayOrder: 1 },
      { _id: "cat-orphan-child", name: "Orphan Child", slug: "orphan-child", parentId: "missing-parent", isActive: true, displayOrder: 1 },
    ];

    const quickAccess = buildCategoryQuickAccess({ categories: partialCategories, products: [] });

    expect(quickAccess.map((category) => category._id)).toEqual(["cat-root"]);
  });

  test("builds curated collections, recently viewed products, followed vendor feed, and check-in prompt", () => {
    const collections = buildCuratedCollections({
      collections: [{ _id: "collection-1", title: "Under BDT 500", productIds: ["prod-shirt"], imageUrl: "collection.jpg", status: "active" }],
      homepageSlots: [],
      products,
      now,
    });
    const recentlyViewed = buildRecentlyViewedProducts({
      products,
      recentProductIds: ["prod-pan", "prod-shirt"],
      recentDocs: [],
    });
    const followed = _discoveryTestUtils.buildFollowedVendorUpdates({
      products,
      vendors,
      follows: [{ vendorId: "vendor-1", active: true }],
      user: { userId: "user-1" },
    });
    const prompt = buildDailyCheckInPrompt({ checkIn: null, loyalty: { points: 25 }, now, points: 5 });

    expect(collections[0].products.map((product) => product._id)).toEqual(["prod-shirt"]);
    expect(recentlyViewed.map((product) => product._id)).toEqual(["prod-pan", "prod-shirt"]);
    expect(followed.updates.map((update) => update.product._id)).toEqual(["prod-phone", "prod-pan"]);
    expect(prompt).toEqual(expect.objectContaining({ canClaim: true, points: 5, totalPoints: 25 }));
    expect(getTodayKey(now)).toMatch(/2026-05-17/);
  });

  test("daily check-in prompt includes streak bonus context", () => {
    const prompt = buildDailyCheckInPrompt({
      checkIn: null,
      loyalty: { points: 75, dailyCheckInStreak: 2 },
      now,
    });

    expect(prompt).toEqual(expect.objectContaining({
      canClaim: true,
      points: 10,
      nextBonus: 5,
      streak: 2,
    }));
  });
});
