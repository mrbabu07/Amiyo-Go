const { ObjectId } = require("mongodb");
const {
  COIN_FEATURE_DISABLED_MESSAGE,
  areCoinRewardsEnabled,
} = require("../utils/platformFeatures");

const CHECK_IN_TIME_ZONE = "Asia/Dhaka";
const DEFAULT_CHECK_IN_POINTS = 5;
const BLOCKED_ORDER_STATUSES = new Set(["cancelled", "canceled", "failed", "refunded", "returned"]);
const BLOCKED_PRODUCT_STATUSES = new Set([
  "draft",
  "pending",
  "pending moderation",
  "pending_moderation",
  "rejected",
  "delisted",
  "disabled",
  "inactive",
  "archived",
]);

const normalizeId = (value) => {
  if (!value) return "";
  if (value.toString) return value.toString();
  return String(value);
};

const safeObjectId = (value) => {
  const id = normalizeId(value);
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const idValues = (value) => {
  const id = normalizeId(value);
  if (!id) return [];
  const objectId = safeObjectId(id);
  return objectId ? [id, objectId] : [id];
};

const unique = (values = []) => [...new Set(values.map(normalizeId).filter(Boolean))];

const normalizeTrustBadges = (value) => {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === "object" ? item?.label : item))
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 4);
};

const asDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysAgo = (now, days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const getTodayKey = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: CHECK_IN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
};

const collectionToArray = async (db, name, query = {}, options = {}) => {
  if (!db?.collection) return [];
  const cursor = db.collection(name).find(query);
  if (options.sort) cursor.sort(options.sort);
  if (options.limit) cursor.limit(options.limit);
  if (options.project) cursor.project(options.project);
  return cursor.toArray();
};

const isDateActive = (item, now = new Date()) => {
  const start = asDate(item.startDate || item.startTime || item.startsAt || item.validFrom);
  const end = asDate(item.endDate || item.endTime || item.endsAt || item.expiresAt || item.validUntil);
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
};

const isProductVisible = (product = {}) => {
  const approvalStatus = String(product.approvalStatus || "").toLowerCase();
  const moderationStatus = String(product.moderationStatus || "").toLowerCase();
  const productStatus = String(product.status || "").toLowerCase();

  if (product.isActive === false) return false;
  if (approvalStatus && approvalStatus !== "approved") return false;
  if (moderationStatus && BLOCKED_PRODUCT_STATUSES.has(moderationStatus)) return false;
  if (productStatus && BLOCKED_PRODUCT_STATUSES.has(productStatus)) return false;
  if (Number(product.stock || 0) <= 0 && !product.allowBackorder && !product.preorderEnabled) return false;

  return true;
};

const isVendorOpen = (vendor = {}) => {
  if (!vendor || Object.keys(vendor).length === 0) return true;

  const status = String(vendor.status || "").toLowerCase();
  if (["suspended", "blacklisted", "rejected"].includes(status)) return false;
  if (vendor.isShopOpen === false) return false;

  const vacation = vendor.vacationMode || {};
  if (!vacation.enabled) return true;

  const now = new Date();
  const start = asDate(vacation.startDate);
  const end = asDate(vacation.endDate);
  if (start && now < start) return true;
  if (end && now > end) return true;
  return false;
};

const getProductImage = (product = {}) => {
  if (product.image) return product.image;
  if (Array.isArray(product.images) && product.images[0]) return product.images[0];
  if (product.coverImage) return product.coverImage;
  if (product.thumbnail) return product.thumbnail;
  return "";
};

const getVendorName = (vendor = {}) =>
  vendor.shopName || vendor.businessName || vendor.name || vendor.displayName || "Marketplace seller";

const serializeProduct = (product = {}) => ({
  ...product,
  _id: normalizeId(product._id),
  categoryId: normalizeId(product.categoryId),
  vendorId: normalizeId(product.vendorId),
  image: getProductImage(product),
  views: Number(product.views || product.viewCount || 0),
  price: Number(product.price || product.salePrice || 0),
  originalPrice: Number(product.originalPrice || product.regularPrice || product.mrp || 0),
  stock: Number(product.stock || 0),
});

const attachProductContext = (products = [], categories = [], vendors = []) => {
  const categoryMap = new Map(categories.map((category) => [normalizeId(category._id), category]));
  const vendorMap = new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor]));

  return products.map((product) => {
    const category = categoryMap.get(normalizeId(product.categoryId)) || {};
    const vendor = vendorMap.get(normalizeId(product.vendorId)) || {};

    return serializeProduct({
      ...product,
      categoryName: product.categoryName || category.name || "",
      categorySlug: product.categorySlug || category.slug || "",
      vendorName: product.vendorName || getVendorName(vendor),
      vendorSlug: product.vendorSlug || vendor.slug || "",
      vendorLogo: product.vendorLogo || vendor.logo || vendor.logoUrl || "",
      _vendorStatus: vendor.status || "",
      _vendorOpen: isVendorOpen(vendor),
    });
  });
};

const buildProductMap = (products = []) =>
  new Map(products.map((product) => [normalizeId(product._id), product]));

const extractOrderItems = (order = {}) => {
  const rawItems = [
    ...(Array.isArray(order.products) ? order.products : []),
    ...(Array.isArray(order.items) ? order.items : []),
    ...(Array.isArray(order.lineItems) ? order.lineItems : []),
  ];

  return rawItems
    .map((item) => {
      const product = item.product && typeof item.product === "object" ? item.product : {};
      const quantity = Number(item.quantity || item.qty || 1);
      const unitPrice = Number(item.price || item.unitPrice || item.salePrice || product.price || 0);

      return {
        productId: normalizeId(item.productId || item.product || item._id || item.id || product._id),
        categoryId: normalizeId(item.categoryId || product.categoryId),
        vendorId: normalizeId(item.vendorId || product.vendorId),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        revenue: Number.isFinite(unitPrice) ? unitPrice * (quantity || 1) : 0,
      };
    })
    .filter((item) => item.productId);
};

const orderBelongsToUser = (order = {}, userKeys = []) => {
  if (!userKeys.length) return false;
  const orderKeys = [
    order.userId,
    order.userUid,
    order.firebaseUid,
    order.customerId,
    order.user?._id,
    order.user?.uid,
  ].map(normalizeId);

  return orderKeys.some((key) => userKeys.includes(key));
};

const buildTrendingProducts = ({ products = [], orders = [], now = new Date(), limit = 12 }) => {
  const productMap = buildProductMap(products);
  const scoreMap = new Map();

  products.forEach((product) => {
    const views = Number(product.views || product.viewCount || 0);
    scoreMap.set(normalizeId(product._id), {
      product,
      score: views * 0.05,
      unitsSold: 0,
      revenue: 0,
    });
  });

  orders
    .filter((order) => !BLOCKED_ORDER_STATUSES.has(String(order.status || "").toLowerCase()))
    .forEach((order) => {
      const createdAt = asDate(order.createdAt) || now;
      const hoursOld = Math.max(0, (now - createdAt) / (60 * 60 * 1000));
      const recencyMultiplier = hoursOld <= 6 ? 3 : hoursOld <= 24 ? 2 : hoursOld <= 72 ? 1.4 : 0.6;

      extractOrderItems(order).forEach((item) => {
        if (!productMap.has(item.productId)) return;
        const row = scoreMap.get(item.productId);
        row.unitsSold += item.quantity;
        row.revenue += item.revenue;
        row.score += item.quantity * recencyMultiplier + item.revenue / 1000;
      });
    });

  return [...scoreMap.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (asDate(b.product.createdAt)?.getTime() || 0) - (asDate(a.product.createdAt)?.getTime() || 0);
    })
    .slice(0, limit)
    .map((row) => ({
      ...row.product,
      trendingScore: Math.round(row.score * 100) / 100,
      unitsSold: row.unitsSold,
      revenueGenerated: Math.round(row.revenue * 100) / 100,
    }));
};

const buildPersonalizedFeed = ({
  products = [],
  orders = [],
  recentProductIds = [],
  userKeys = [],
  trendingProducts = [],
  limit = 12,
  now = new Date(),
}) => {
  const productMap = buildProductMap(products);
  const categoryScores = new Map();
  const vendorScores = new Map();
  const purchasedProductIds = new Set();

  const bump = (map, key, weight) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + weight);
  };

  orders
    .filter((order) => orderBelongsToUser(order, userKeys))
    .filter((order) => !BLOCKED_ORDER_STATUSES.has(String(order.status || "").toLowerCase()))
    .forEach((order) => {
      extractOrderItems(order).forEach((item) => {
        const product = productMap.get(item.productId) || {};
        purchasedProductIds.add(item.productId);
        bump(categoryScores, item.categoryId || normalizeId(product.categoryId), item.quantity * 6);
        bump(vendorScores, item.vendorId || normalizeId(product.vendorId), item.quantity * 3);
      });
    });

  unique(recentProductIds).forEach((productId) => {
    const product = productMap.get(productId);
    if (!product) return;
    bump(categoryScores, normalizeId(product.categoryId), 7);
    bump(vendorScores, normalizeId(product.vendorId), 3);
  });

  const trendingIds = new Map(
    trendingProducts.map((product, index) => [normalizeId(product._id), Math.max(1, trendingProducts.length - index)]),
  );
  const hasSignals = categoryScores.size > 0 || vendorScores.size > 0;

  return products
    .map((product) => {
      const productId = normalizeId(product._id);
      const createdAt = asDate(product.createdAt);
      const isFresh = createdAt && createdAt >= daysAgo(now, 14);
      let score = Number(product.views || 0) * 0.02 + (trendingIds.get(productId) || 0) * 0.3;

      score += categoryScores.get(normalizeId(product.categoryId)) || 0;
      score += vendorScores.get(normalizeId(product.vendorId)) || 0;
      if (purchasedProductIds.has(productId)) score -= 1.5;
      if (isFresh) score += 0.5;
      if (Number(product.stock || 0) > 0) score += 0.25;

      return {
        ...product,
        recommendationScore: Math.round(score * 100) / 100,
      };
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) return b.recommendationScore - a.recommendationScore;
      return (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0);
    })
    .slice(0, limit)
    .map((product) => ({
      ...product,
      recommendationReason: hasSignals ? "Matched to your recent browsing and orders" : "Popular across the marketplace",
    }));
};

const buildHeroBanners = ({
  homepageSlots = [],
  campaigns = [],
  flashSales = [],
  vendors = [],
  products = [],
  now = new Date(),
  limit = 6,
}) => {
  const productMap = buildProductMap(products);
  const banners = [];

  homepageSlots
    .filter((slot) => slot.status !== "inactive" && slot.slotType === "hero_banner" && isDateActive(slot, now))
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .forEach((slot) => {
      banners.push({
        id: normalizeId(slot._id),
        source: "homepage_slot",
        title: slot.title || "Featured on Amiyo Go",
        subtitle: slot.subtitle || slot.description || "",
        badge: slot.badge || "Featured",
        trustBadges: normalizeTrustBadges(slot.trustBadges),
        imageUrl: slot.imageUrl || slot.bannerImageUrl || "",
        link: slot.linkUrl || slot.targetUrl || slot.url || "/products",
        ctaText: slot.ctaText || "Shop now",
      });
    });

  campaigns
    .filter((campaign) => String(campaign.status || "").toLowerCase() === "active" && isDateActive(campaign, now))
    .filter((campaign) => campaign.bannerImageUrl || campaign.imageUrl)
    .forEach((campaign) => {
      banners.push({
        id: normalizeId(campaign._id),
        source: "campaign",
        title: campaign.name || campaign.title || "Marketplace campaign",
        subtitle: campaign.description || "Limited-time prices from selected sellers",
        badge: campaign.campaignType || "Campaign",
        imageUrl: campaign.bannerImageUrl || campaign.imageUrl,
        link: campaign.slug ? `/campaigns/${campaign.slug}` : `/campaigns/${normalizeId(campaign._id)}`,
        ctaText: "View campaign",
      });
    });

  flashSales
    .filter((deal) => isDateActive(deal, now))
    .slice(0, 2)
    .forEach((deal) => {
      const product = typeof deal.product === "object" ? deal.product : productMap.get(normalizeId(deal.product || deal.productId));
      banners.push({
        id: normalizeId(deal._id),
        source: "flash_sale",
        title: deal.title || product?.title || "Flash sale",
        subtitle: deal.description || "Fast-moving deals while stock lasts",
        badge: deal.discountPercentage ? `${Math.round(deal.discountPercentage)}% off` : "Flash sale",
        imageUrl: deal.bannerImageUrl || getProductImage(product),
        link: product?._id ? `/product/${normalizeId(product._id)}` : "/products",
        ctaText: "Grab the deal",
      });
    });

  vendors
    .filter((vendor) => ["approved", "active"].includes(String(vendor.status || "").toLowerCase()))
    .filter((vendor) => asDate(vendor.createdAt) && asDate(vendor.createdAt) >= daysAgo(now, 30))
    .slice(0, 2)
    .forEach((vendor) => {
      banners.push({
        id: normalizeId(vendor._id),
        source: "new_brand",
        title: vendor.shopName || vendor.businessName || "New seller on Amiyo Go",
        subtitle: vendor.tagline || "Fresh collections from a new marketplace seller",
        badge: "New brand",
        imageUrl: vendor.banner || vendor.bannerUrl || vendor.logo || vendor.logoUrl || "",
        link: vendor.slug ? `/shops/${vendor.slug}` : `/vendors/${normalizeId(vendor._id)}`,
        ctaText: "Visit shop",
      });
    });

  if (banners.length === 0) {
    products.slice(0, 3).forEach((product) => {
      banners.push({
        id: normalizeId(product._id),
        source: "product",
        title: product.title || "Discover marketplace picks",
        subtitle: product.categoryName || "Recommended for shoppers today",
        badge: "Just for you",
        imageUrl: getProductImage(product),
        link: `/product/${normalizeId(product._id)}`,
        ctaText: "See details",
      });
    });
  }

  return banners
    .filter((banner) => banner.title && banner.imageUrl)
    .slice(0, limit);
};

const buildHomepageAdSlots = ({ homepageSlots = [], now = new Date(), limit = 2 }) =>
  homepageSlots
    .filter((slot) => slot.status !== "inactive" && slot.slotType === "ad_slot" && isDateActive(slot, now))
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map((slot) => ({
      id: normalizeId(slot._id),
      source: "homepage_slot",
      title: slot.title || "Sponsored offer",
      subtitle: slot.subtitle || slot.description || "",
      badge: slot.badge || "Sponsored",
      imageUrl: slot.imageUrl || slot.bannerImageUrl || "",
      link: slot.linkUrl || slot.targetUrl || slot.url || "/products",
      ctaText: slot.ctaText || "Shop now",
      startsAt: slot.startsAt || null,
      endsAt: slot.endsAt || null,
    }))
    .filter((slot) => slot.title && slot.imageUrl)
    .slice(0, limit);

const buildCategoryQuickAccess = ({ categories = [], products = [], limit = 16 }) => {
  const activeCategories = categories
    .filter((category) => category.isActive !== false)
    .map((category) => ({
      ...category,
      id: normalizeId(category._id),
      parentKey: normalizeId(category.parentId),
    }));

  const byId = new Map(activeCategories.map((category) => [category.id, category]));
  const childrenByParent = activeCategories.reduce((map, category) => {
    if (!category.parentKey || !byId.has(category.parentKey)) return map;
    const children = map.get(category.parentKey) || [];
    children.push(category);
    map.set(category.parentKey, children);
    return map;
  }, new Map());

  const findRootCategory = (categoryId) => {
    let current = byId.get(normalizeId(categoryId));
    const seen = new Set();

    while (current?.parentKey && byId.has(current.parentKey) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parentKey);
    }

    return current || null;
  };

  const counts = products.reduce((map, product) => {
    const root = findRootCategory(product.categoryId);
    if (root?.id) map.set(root.id, (map.get(root.id) || 0) + 1);
    return map;
  }, new Map());

  const groupCategories = activeCategories.filter((category) => !category.parentKey);
  const categoriesForRail = groupCategories.length ? groupCategories : activeCategories;

  return categoriesForRail
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || String(a.name || "").localeCompare(String(b.name || "")))
    .slice(0, limit)
    .map((category) => ({
      _id: category.id,
      name: category.name || "Category",
      slug: category.slug || "",
      icon: category.icon || category.iconUrl || "",
      image: category.image || category.imageUrl || "",
      productCount: counts.get(category.id) || 0,
      childCount: childrenByParent.get(category.id)?.length || 0,
      parentId: "",
    }));
};

const buildFlashSaleStrip = ({ flashSales = [], products = [], now = new Date(), limit = 10 }) => {
  const productMap = buildProductMap(products);

  return flashSales
    .map((deal) => {
      const product = typeof deal.product === "object" ? deal.product : productMap.get(normalizeId(deal.product || deal.productId));
      const totalStock = Number(deal.totalStock || deal.stock || 0);
      const soldCount = Number(deal.soldCount || 0);
      const remainingStock = Math.max(0, Number(deal.remainingStock ?? totalStock - soldCount));
      const startTime = asDate(deal.startTime || deal.startDate);
      const endTime = asDate(deal.endTime || deal.endDate);
      const isActive =
        deal.isActive !== false &&
        remainingStock > 0 &&
        (!startTime || startTime <= now) &&
        (!endTime || endTime >= now) &&
        !["expired", "sold_out", "inactive"].includes(String(deal.status || "").toLowerCase());

      return {
        _id: normalizeId(deal._id),
        title: deal.title || product?.title || "Flash deal",
        productId: normalizeId(product?._id || deal.product || deal.productId),
        product: product ? serializeProduct(product) : null,
        image: deal.imageUrl || getProductImage(product),
        originalPrice: Number(deal.originalPrice || product?.originalPrice || product?.price || 0),
        flashPrice: Number(deal.flashPrice || deal.salePrice || deal.specialPrice || 0),
        discountPercentage: Number(deal.discountPercentage || 0),
        remainingStock,
        totalStock,
        maxPerUser: Number(deal.maxPerUser || deal.maxQuantityPerBuyer || 0),
        startTime,
        endTime,
        isActive,
      };
    })
    .filter((deal) => deal.isActive && deal.productId)
    .sort((a, b) => (a.endTime?.getTime() || 0) - (b.endTime?.getTime() || 0))
    .slice(0, limit);
};

const buildNewArrivals = ({ products = [], now = new Date(), categoryId = "", limit = 12 }) => {
  const threshold = daysAgo(now, 7);
  const filtered = products.filter((product) => !categoryId || normalizeId(product.categoryId) === normalizeId(categoryId));
  const fresh = filtered.filter((product) => asDate(product.createdAt) && asDate(product.createdAt) >= threshold);
  const source = fresh.length > 0 ? fresh : filtered;

  return source
    .sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0))
    .slice(0, limit);
};

const buildCuratedCollections = ({ collections = [], homepageSlots = [], products = [], now = new Date(), limit = 6 }) => {
  const productMap = buildProductMap(products);
  const rows = [];

  collections
    .filter((collection) => collection.status !== "inactive" && collection.isActive !== false && isDateActive(collection, now))
    .forEach((collection) => {
      const productIds = unique(collection.productIds || collection.products || []);
      const collectionProducts = productIds.map((id) => productMap.get(id)).filter(Boolean);
      rows.push({
        _id: normalizeId(collection._id),
        title: collection.title || collection.name || "Curated collection",
        subtitle: collection.subtitle || collection.description || "",
        imageUrl: collection.imageUrl || collection.bannerImageUrl || getProductImage(collectionProducts[0]) || "",
        link: collection.slug ? `/collections/${collection.slug}` : `/products?collection=${normalizeId(collection._id)}`,
        products: collectionProducts.slice(0, 6),
        source: "curated_collection",
      });
    });

  homepageSlots
    .filter((slot) => slot.status !== "inactive" && ["category_banner", "ad_slot"].includes(slot.slotType) && isDateActive(slot, now))
    .forEach((slot) => {
      const slotProducts = products
        .filter((product) => !slot.categoryId || normalizeId(product.categoryId) === normalizeId(slot.categoryId))
        .slice(0, 6);

      rows.push({
        _id: normalizeId(slot._id),
        title: slot.title || "Featured collection",
        subtitle: slot.subtitle || slot.description || "",
        imageUrl: slot.imageUrl || getProductImage(slotProducts[0]) || "",
        link: slot.linkUrl || (slot.categoryId ? `/products?category=${normalizeId(slot.categoryId)}` : "/products"),
        products: slotProducts,
        source: "homepage_slot",
      });
    });

  if (rows.length === 0) {
    const under500 = products.filter((product) => Number(product.price || 0) > 0 && Number(product.price || 0) <= 500).slice(0, 6);
    const fresh = buildNewArrivals({ products, now, limit: 6 });
    const top = products.slice(0, 6);

    [
      { title: "Under BDT 500", subtitle: "Budget-friendly marketplace finds", products: under500 },
      { title: "New this week", subtitle: "Fresh listings from sellers", products: fresh },
      { title: "Top picks today", subtitle: "High-intent products shoppers are viewing", products: top },
    ]
      .filter((row) => row.products.length > 0)
      .forEach((row, index) => {
        rows.push({
          _id: `fallback-${index}`,
          ...row,
          imageUrl: getProductImage(row.products[0]) || "",
          link: "/products",
          source: "generated",
        });
      });
  }

  return rows
    .filter((row) => row.products.length > 0 || row.imageUrl)
    .slice(0, limit)
    .map((row) => ({
      ...row,
      products: row.products.map(serializeProduct),
    }));
};

const buildFollowedVendorUpdates = ({ products = [], vendors = [], follows = [], user = {}, limit = 8 }) => {
  const followedVendorIds = unique([
    ...(follows || []).filter((follow) => follow.active !== false).map((follow) => follow.vendorId || follow.vendorObjectId),
    ...(user.followedVendors || []),
  ]);

  if (!followedVendorIds.length) {
    return {
      requiresLogin: !user.userId,
      vendors: [],
      updates: [],
    };
  }

  const vendorMap = new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor]));
  const updates = products
    .filter((product) => followedVendorIds.includes(normalizeId(product.vendorId)))
    .sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0))
    .slice(0, limit)
    .map((product) => {
      const vendor = vendorMap.get(normalizeId(product.vendorId)) || {};
      return {
        type: "new_product",
        label: "New product",
        vendor: {
          _id: normalizeId(vendor._id || product.vendorId),
          shopName: getVendorName(vendor) || product.vendorName,
          slug: vendor.slug || product.vendorSlug || "",
          logo: vendor.logo || vendor.logoUrl || product.vendorLogo || "",
        },
        product: serializeProduct(product),
        createdAt: product.createdAt,
      };
    });

  return {
    requiresLogin: false,
    vendors: followedVendorIds.map((vendorId) => {
      const vendor = vendorMap.get(vendorId) || {};
      return {
        _id: vendorId,
        shopName: getVendorName(vendor),
        slug: vendor.slug || "",
        logo: vendor.logo || vendor.logoUrl || "",
      };
    }),
    updates,
  };
};

const buildRecentlyViewedProducts = ({ products = [], recentProductIds = [], recentDocs = [], limit = 10 }) => {
  const productMap = buildProductMap(products);
  const ids = unique([
    ...recentProductIds,
    ...recentDocs.map((doc) => doc.productId || doc.productObjectId),
  ]);

  return ids
    .map((productId) => productMap.get(productId))
    .filter(Boolean)
    .slice(0, limit)
    .map(serializeProduct);
};

const buildDailyCheckInPrompt = ({ checkIn = null, loyalty = null, now = new Date(), points = DEFAULT_CHECK_IN_POINTS }) => {
  const claimedToday = Boolean(checkIn);
  const streak = Number(checkIn?.streak || loyalty?.dailyCheckInStreak || 0);
  const nextStreak = claimedToday ? streak + 1 : Math.max(streak + 1, 1);
  const nextBonus = nextStreak > 0 && nextStreak % 7 === 0 ? 20 : nextStreak >= 3 ? 5 : 0;
  const rewardPoints = claimedToday ? Number(checkIn?.points || points) : Number(points || DEFAULT_CHECK_IN_POINTS) + nextBonus;
  return {
    enabled: true,
    dateKey: getTodayKey(now),
    canClaim: !claimedToday,
    claimedToday,
    points: rewardPoints,
    basePoints: Number(checkIn?.basePoints || DEFAULT_CHECK_IN_POINTS),
    bonusPoints: Number(checkIn?.bonusPoints || 0),
    streak,
    nextBonus,
    label: claimedToday ? "Daily reward collected" : `Check in today for ${rewardPoints} coins`,
    totalPoints: Number(loyalty?.points || 0),
    lastClaim: checkIn || null,
  };
};

const buildDisabledDailyCheckInPrompt = (now = new Date()) => ({
  enabled: false,
  dateKey: getTodayKey(now),
  canClaim: false,
  claimedToday: false,
  points: 0,
  basePoints: 0,
  bonusPoints: 0,
  streak: 0,
  nextBonus: 0,
  label: "Daily coin rewards are turned off",
  totalPoints: 0,
  lastClaim: null,
  disabledReason: COIN_FEATURE_DISABLED_MESSAGE,
});

const buildPromotionStrip = (coupons = [], now = new Date()) =>
  coupons
    .filter((coupon) => coupon.isActive !== false)
    .filter((coupon) => !coupon.expiresAt || asDate(coupon.expiresAt) > now)
    .filter((coupon) => !coupon.usageLimit || Number(coupon.usedCount || 0) < Number(coupon.usageLimit || 0))
    .slice(0, 5)
    .map((coupon) => ({
      _id: normalizeId(coupon._id),
      code: coupon.code,
      title: coupon.title || coupon.name || "Marketplace voucher",
      discountType: coupon.discountType || "fixed",
      discountValue: Number(coupon.discountValue || 0),
      minOrderAmount: Number(coupon.minOrderAmount || 0),
      expiresAt: coupon.expiresAt,
    }));

const resolveUserContext = (req) => {
  const userId = normalizeId(req.user?.uid);
  const userObjectId = normalizeId(req.user?._id || req.dbUser?._id);
  return {
    userId,
    userObjectId,
    userKeys: unique([userId, userObjectId]),
  };
};

const loadHomepageSource = async (req) => {
  const db = req.app.locals.db;
  const { userId, userObjectId, userKeys } = resolveUserContext(req);
  const userQueryIds = userKeys.flatMap(idValues);
  const hasUser = userKeys.length > 0;

  const now = new Date();
  const [
    products,
    orders,
    categories,
    vendors,
    homepageSlots,
    campaigns,
    flashSales,
    curatedCollections,
    homepageCollections,
    coupons,
    recentDocs,
    follows,
    user,
    checkIn,
    loyalty,
  ] = await Promise.all([
    collectionToArray(db, "products", { isActive: { $ne: false } }, { sort: { createdAt: -1 }, limit: 300 }),
    collectionToArray(db, "orders", {}, { sort: { createdAt: -1 }, limit: 500 }),
    collectionToArray(db, "categories", { isActive: { $ne: false } }, { sort: { displayOrder: 1, name: 1 } }),
    collectionToArray(db, "vendors", {}, { sort: { createdAt: -1 }, limit: 120 }),
    collectionToArray(db, "homepage_slots", {}, { sort: { position: 1, createdAt: -1 }, limit: 50 }),
    collectionToArray(db, "campaigns", {}, { sort: { startDate: -1, createdAt: -1 }, limit: 50 }),
    collectionToArray(db, "flashsales", {}, { sort: { endTime: 1, createdAt: -1 }, limit: 50 }),
    collectionToArray(db, "curated_collections", {}, { sort: { position: 1, createdAt: -1 }, limit: 30 }),
    collectionToArray(db, "homepage_collections", {}, { sort: { position: 1, createdAt: -1 }, limit: 30 }),
    collectionToArray(db, "coupons", {}, { sort: { createdAt: -1 }, limit: 20 }),
    hasUser
      ? collectionToArray(db, "recentlyViewedProducts", { userId: { $in: userKeys } }, { sort: { viewedAt: -1 }, limit: 20 })
      : [],
    hasUser
      ? collectionToArray(db, "vendorFollows", { userId: { $in: userKeys }, active: true }, { sort: { followedAt: -1 }, limit: 50 })
      : [],
    hasUser && req.app.locals.models?.User?.findById && userObjectId
      ? req.app.locals.models.User.findById(userObjectId).catch(() => null)
      : hasUser && db?.collection
        ? db.collection("users").findOne({ _id: { $in: userQueryIds } }).catch(() => null)
        : null,
    hasUser
      ? db.collection("dailyCheckins").findOne({ userId, dateKey: getTodayKey(now) }).catch(() => null)
      : null,
    hasUser
      ? db.collection("loyalties").findOne({ userId }).catch(() => null)
      : null,
  ]);

  return {
    now,
    products,
    orders,
    categories,
    vendors,
    homepageSlots,
    campaigns,
    flashSales,
    collections: [...curatedCollections, ...homepageCollections],
    coupons,
    recentDocs,
    follows,
    user,
    checkIn,
    loyalty,
    userId,
    userObjectId,
    userKeys,
  };
};

const getHomepageDiscovery = async (req, res) => {
  try {
    const source = await loadHomepageSource(req);
    const dailyCheckInEnabled = await areCoinRewardsEnabled(req.app.locals.db, "dailyCheckInRewards");
    const localRecentIds = unique(String(req.query.recentProductIds || "").split(","));
    const categoryId = normalizeId(req.query.categoryId);
    const catalogProducts = attachProductContext(source.products, source.categories, source.vendors)
      .filter((product) => product._vendorOpen !== false);
    const products = catalogProducts.filter(isProductVisible);

    const trendingNow = buildTrendingProducts({
      products,
      orders: source.orders,
      now: source.now,
      limit: 12,
    });
    const recentlyViewed = buildRecentlyViewedProducts({
      products,
      recentProductIds: localRecentIds,
      recentDocs: source.recentDocs,
    });
    const justForYou = buildPersonalizedFeed({
      products,
      orders: source.orders,
      recentProductIds: recentlyViewed.map((product) => product._id),
      userKeys: source.userKeys,
      trendingProducts: trendingNow,
      now: source.now,
      limit: 12,
    });

    res.json({
      success: true,
      data: {
        generatedAt: source.now,
        heroBanners: buildHeroBanners({
          homepageSlots: source.homepageSlots,
          campaigns: source.campaigns,
          flashSales: source.flashSales,
          vendors: source.vendors,
          products: catalogProducts,
          now: source.now,
        }),
        adSlots: buildHomepageAdSlots({
          homepageSlots: source.homepageSlots,
          now: source.now,
        }),
        categories: buildCategoryQuickAccess({ categories: source.categories, products }),
        promotionStrip: buildPromotionStrip(source.coupons, source.now),
        flashSales: buildFlashSaleStrip({ flashSales: source.flashSales, products: catalogProducts, now: source.now }),
        justForYou,
        trendingNow,
        newArrivals: buildNewArrivals({ products, now: source.now, categoryId }),
        curatedCollections: buildCuratedCollections({
          collections: source.collections,
          homepageSlots: source.homepageSlots,
          products,
          now: source.now,
        }),
        followedVendorUpdates: buildFollowedVendorUpdates({
          products,
          vendors: source.vendors,
          follows: source.follows,
          user: { ...(source.user || {}), userId: source.userId },
        }),
        recentlyViewed,
        dailyCheckIn: dailyCheckInEnabled
          ? source.userId
            ? buildDailyCheckInPrompt({ checkIn: source.checkIn, loyalty: source.loyalty, now: source.now })
            : { enabled: true, requiresLogin: true, canClaim: false, points: DEFAULT_CHECK_IN_POINTS }
          : buildDisabledDailyCheckInPrompt(source.now),
        meta: {
          personalized: Boolean(source.userId || recentlyViewed.length > 0),
          recentProductIds: recentlyViewed.map((product) => product._id),
          categoryFilter: categoryId || "all",
        },
      },
    });
  } catch (error) {
    console.error("Homepage discovery error:", error);
    res.status(500).json({ success: false, error: "Failed to load homepage discovery" });
  }
};

const getDailyCheckInStatus = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    if (!(await areCoinRewardsEnabled(db, "dailyCheckInRewards"))) {
      return res.json({
        success: true,
        data: buildDisabledDailyCheckInPrompt(now),
      });
    }

    const userId = normalizeId(req.user?.uid);
    const [checkIn, loyalty] = await Promise.all([
      db.collection("dailyCheckins").findOne({ userId, dateKey: getTodayKey(now) }),
      db.collection("loyalties").findOne({ userId }),
    ]);

    res.json({
      success: true,
      data: buildDailyCheckInPrompt({ checkIn, loyalty, now }),
    });
  } catch (error) {
    console.error("Daily check-in status error:", error);
    res.status(500).json({ success: false, error: "Failed to load daily check-in status" });
  }
};

const claimDailyCheckInReward = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const now = new Date();
    if (!(await areCoinRewardsEnabled(db, "dailyCheckInRewards"))) {
      return res.status(403).json({
        success: false,
        error: COIN_FEATURE_DISABLED_MESSAGE,
        data: buildDisabledDailyCheckInPrompt(now),
      });
    }

    const userId = normalizeId(req.user?.uid);
    const userObjectId = req.user?._id || req.dbUser?._id || null;
    const dateKey = getTodayKey(now);
    const yesterdayKey = getTodayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const checkins = db.collection("dailyCheckins");

    await checkins.createIndex({ userId: 1, dateKey: 1 }, { unique: true });

    const existing = await checkins.findOne({ userId, dateKey });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Daily check-in already claimed.",
        data: buildDailyCheckInPrompt({ checkIn: existing, now }),
      });
    }

    const previous = await checkins.findOne({ userId, dateKey: yesterdayKey });
    const streak = previous ? Number(previous.streak || 1) + 1 : 1;
    const bonusPoints = streak > 0 && streak % 7 === 0 ? 20 : streak >= 3 ? 5 : 0;
    const points = DEFAULT_CHECK_IN_POINTS + bonusPoints;
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const checkIn = {
      userId,
      userObjectId,
      dateKey,
      points,
      basePoints: DEFAULT_CHECK_IN_POINTS,
      bonusPoints,
      streak,
      source: "homepage_daily_checkin",
      createdAt: now,
      updatedAt: now,
    };

    await checkins.insertOne(checkIn);
    await db.collection("loyalties").updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          email: req.user?.email || req.dbUser?.email || "",
          tier: "bronze",
          totalRedeemed: 0,
          referralCode: userId ? `REF${userId.substring(0, 8).toUpperCase()}` : undefined,
          createdAt: now,
        },
        $inc: { points, totalEarned: points },
        $push: {
          transactions: {
            type: "earned",
            points,
            reason: "Daily homepage check-in",
            source: "daily_check_in",
            expiresAt,
            metadata: {
              streak,
              bonusPoints,
            },
            date: now,
          },
        },
        $set: { updatedAt: now, dailyCheckInStreak: streak, lastDailyCheckInDate: dateKey },
      },
      { upsert: true },
    );

    const loyalty = await db.collection("loyalties").findOne({ userId });

    res.json({
      success: true,
      data: buildDailyCheckInPrompt({ checkIn, loyalty, now, points }),
      message: `You earned ${points} coins.`,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "Daily check-in already claimed." });
    }
    console.error("Daily check-in claim error:", error);
    res.status(500).json({ success: false, error: "Failed to claim daily reward" });
  }
};

const recordRecentlyViewed = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const productId = normalizeId(req.body.productId);
    if (!productId) return res.status(400).json({ success: false, error: "Product ID is required" });

    const product = await db.collection("products").findOne({ _id: { $in: idValues(productId) } });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });

    const now = new Date();
    const userId = normalizeId(req.user?.uid);
    const userObjectId = req.user?._id || req.dbUser?._id || null;
    const collection = db.collection("recentlyViewedProducts");
    await collection.createIndex({ userId: 1, productId: 1 }, { unique: true });

    await collection.updateOne(
      { userId, productId },
      {
        $setOnInsert: {
          userId,
          userObjectId,
          productId,
          productObjectId: safeObjectId(productId) || productId,
          createdAt: now,
        },
        $set: {
          viewedAt: now,
          updatedAt: now,
          productSnapshot: {
            title: product.title || product.name || "",
            image: getProductImage(product),
            price: Number(product.price || 0),
          },
        },
      },
      { upsert: true },
    );

    res.json({
      success: true,
      data: {
        productId,
        viewedAt: now,
      },
    });
  } catch (error) {
    console.error("Recently viewed record error:", error);
    res.status(500).json({ success: false, error: "Failed to record recently viewed product" });
  }
};

module.exports = {
  getHomepageDiscovery,
  getDailyCheckInStatus,
  claimDailyCheckInReward,
  recordRecentlyViewed,
  _discoveryTestUtils: {
    attachProductContext,
    buildCategoryQuickAccess,
    buildCuratedCollections,
    buildDisabledDailyCheckInPrompt,
    buildDailyCheckInPrompt,
    buildFlashSaleStrip,
    buildFollowedVendorUpdates,
    buildHomepageAdSlots,
    buildHeroBanners,
    buildNewArrivals,
    buildPersonalizedFeed,
    buildPromotionStrip,
    buildRecentlyViewedProducts,
    buildTrendingProducts,
    extractOrderItems,
    getTodayKey,
    isProductVisible,
    normalizeId,
  },
};
