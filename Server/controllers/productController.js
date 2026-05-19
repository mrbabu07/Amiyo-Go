const { ObjectId } = require("mongodb");

const toArrayParam = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return String(value).split(",").filter(Boolean);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const stringifyId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    if (
      value instanceof ObjectId ||
      value._bsontype === "ObjectId" ||
      value.constructor?.name === "ObjectId"
    ) {
      return value.toString();
    }
    if (value.$oid) return value.$oid;
    if (value._id && value._id !== value) return stringifyId(value._id);
  }
  return value.toString();
};

const safeObjectId = (value) => {
  const id = stringifyId(value);
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const idVariants = (value) => {
  const ids = Array.isArray(value) ? value : [value];
  const stringIds = [...new Set(ids.map(stringifyId).filter(Boolean))];
  return [
    ...stringIds,
    ...stringIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)),
  ];
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const normalizeForJson = (value, seen = new WeakSet(), depth = 0) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (
    value instanceof ObjectId ||
    value._bsontype === "ObjectId" ||
    value.constructor?.name === "ObjectId"
  ) {
    return value.toString();
  }
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (depth > 12) return undefined;

  if (seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJson(item, seen, depth + 1));
  }

  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "function") continue;
    const cleanEntry = normalizeForJson(entry, seen, depth + 1);
    if (cleanEntry !== undefined) normalized[key] = cleanEntry;
  }
  return normalized;
};

const uniqueStrings = (items) => [
  ...new Set(
    items
      .map((item) => {
        if (!item) return "";
        if (typeof item === "object") return item.name || item.label || item.value || "";
        return String(item);
      })
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

const normalizeColor = (color) => {
  if (!color) return null;
  if (typeof color === "object") {
    const name = color.name || color.label || color.color || color.value;
    if (!name) return null;
    return {
      name: String(name),
      value: color.value || color.hex || color.colorHex || color.swatch || getColorHex(name),
      image: color.image || color.imageUrl || null,
    };
  }
  return {
    name: String(color),
    value: getColorHex(color),
    image: null,
  };
};

const getColorHex = (colorName) => {
  const colorMap = {
    black: "#111827",
    white: "#FFFFFF",
    red: "#EF4444",
    blue: "#3B82F6",
    green: "#10B981",
    yellow: "#F59E0B",
    purple: "#8B5CF6",
    pink: "#EC4899",
    orange: "#F97316",
    gray: "#6B7280",
    grey: "#6B7280",
    brown: "#92400E",
    navy: "#1E3A8A",
    beige: "#D4C5B9",
    maroon: "#7F1D1D",
    gold: "#D97706",
    silver: "#9CA3AF",
  };
  return colorMap[String(colorName || "").toLowerCase()] || "#9CA3AF";
};

const getVariantSize = (variant) => {
  const size = variant?.size || variant?.sizeName || variant?.attributes?.size;
  return typeof size === "object" ? size.name || size.label || size.value : size;
};

const getVariantColor = (variant) => {
  const color = variant?.color || variant?.colorName || variant?.attributes?.color;
  return typeof color === "object" ? color.name || color.label || color.value : color;
};

const getVariantImages = (variant) =>
  uniqueStrings([
    ...asArray(variant?.images),
    variant?.image,
    variant?.imageUrl,
    variant?.coverImage,
  ]);

const buildProductMedia = (product = {}) => {
  const variants = asArray(product.variants);
  const imageSet = new Set();
  const addImage = (image) => {
    if (typeof image === "string" && image.trim()) imageSet.add(image.trim());
  };

  variants.forEach((variant) => getVariantImages(variant).forEach(addImage));
  asArray(product.images).forEach(addImage);
  addImage(product.image);
  addImage(product.coverImage);

  const rawVideos = [
    ...asArray(product.videos),
    product.video,
    product.videoUrl,
    product.demoVideo,
  ]
    .filter(Boolean);
  const videos = rawVideos
    .map((video, index) => {
      if (!video) return null;
      if (typeof video === "string") {
        return { url: video, title: index === 0 ? "Product demo" : `Video ${index + 1}` };
      }
      return {
        url: video.url || video.src || video.videoUrl,
        title: video.title || video.name || `Video ${index + 1}`,
        thumbnail: video.thumbnail || video.poster || null,
      };
    })
    .filter((video) => video?.url);

  return {
    images: [...imageSet],
    videos,
    variantImages: variants.map((variant) => ({
      variantId: stringifyId(variant._id || variant.id || variant.sku),
      sku: variant.sku || "",
      size: getVariantSize(variant) || "",
      color: getVariantColor(variant) || "",
      images: getVariantImages(variant),
    })),
  };
};

const buildVariantMatrix = (product = {}) => {
  const variants = asArray(product.variants);
  const sizes = uniqueStrings([
    ...asArray(product.sizes),
    ...variants.map(getVariantSize),
  ]);
  const colors = uniqueStrings([
    ...asArray(product.colors).map((color) => normalizeColor(color)?.name),
    ...variants.map(getVariantColor),
  ]);
  const normalizedColors = colors.map((name) => {
    const configured = asArray(product.colors)
      .map(normalizeColor)
      .find((color) => color?.name === name);
    return configured || normalizeColor(name);
  });

  const variantRows = variants.map((variant) => {
    const size = getVariantSize(variant) || "";
    const color = getVariantColor(variant) || "";
    const stock = toNumber(variant.stock, 0);
    return {
      id: stringifyId(variant._id || variant.id || variant.sku),
      sku: variant.sku || "",
      size,
      color,
      price: toNumber(variant.price, toNumber(product.price, 0)),
      originalPrice: toNumber(variant.originalPrice, toNumber(product.originalPrice, 0)) || null,
      stock,
      available: stock > 0 || Boolean(product.allowBackorder || product.preorderEnabled),
      images: getVariantImages(variant),
      image: getVariantImages(variant)[0] || "",
    };
  });

  const cellSizes = sizes.length ? sizes : [""];
  const cellColors = colors.length ? colors : [""];
  const cells = cellSizes.flatMap((size) =>
    cellColors.map((color) => {
      const variant = variantRows.find((row) => {
        const sizeMatch = !size || row.size === size;
        const colorMatch = !color || row.color === color;
        return sizeMatch && colorMatch;
      });

      return {
        size,
        color,
        exists: Boolean(variant),
        variantId: variant?.id || "",
        sku: variant?.sku || "",
        price: variant?.price ?? toNumber(product.price, 0),
        stock: variant?.stock ?? 0,
        available: Boolean(variant?.available),
        crossedOut: !variant?.available,
        image: variant?.image || "",
        images: variant?.images || [],
      };
    }),
  );

  return {
    sizes,
    colors: normalizedColors,
    variants: variantRows,
    cells,
  };
};

const buildStockSummary = (product = {}) => {
  const variantStock = asArray(product.variants).reduce(
    (sum, variant) => sum + Math.max(toNumber(variant.stock, 0), 0),
    0,
  );
  const stock = asArray(product.variants).length ? variantStock : toNumber(product.stock, 0);
  const threshold = Math.max(toNumber(product.lowStockThreshold, 5), 1);
  const canBackorder = Boolean(product.allowBackorder || product.preorderEnabled);

  if (stock <= 0 && canBackorder) {
    return {
      stock,
      threshold,
      available: true,
      allowNotify: false,
      status: product.preorderEnabled ? "preorder" : "backorder",
      label: product.preorderEnabled ? "Pre-order available" : "Backorder available",
      urgency: "info",
    };
  }

  if (stock <= 0) {
    return {
      stock,
      threshold,
      available: false,
      allowNotify: true,
      status: "out_of_stock",
      label: "Out of Stock - Get notified",
      urgency: "critical",
    };
  }

  if (stock <= Math.min(3, threshold)) {
    return {
      stock,
      threshold,
      available: true,
      allowNotify: false,
      status: "only_left",
      label: `Only ${stock} left!`,
      urgency: "high",
    };
  }

  if (stock <= threshold) {
    return {
      stock,
      threshold,
      available: true,
      allowNotify: false,
      status: "low_stock",
      label: "Low Stock",
      urgency: "medium",
    };
  }

  return {
    stock,
    threshold,
    available: true,
    allowNotify: false,
    status: "in_stock",
    label: "In Stock",
    urgency: "normal",
  };
};

const parseProcessingHours = (value, fallback = 48) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").toLowerCase();
  const amount = parseFloat(text);
  if (!Number.isFinite(amount)) return fallback;
  if (text.includes("hour") || text.includes("hr")) return amount;
  if (text.includes("day")) return amount * 24;
  return amount;
};

const formatDuration = (ms) => {
  const totalMinutes = Math.max(Math.round(ms / 60000), 0);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDeliveryDate = (date) => {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const buildDeliveryEstimate = (product = {}, vendor = {}, now = new Date()) => {
  const processingHours = parseProcessingHours(
    product.shipWithinHours ||
      product.processingHours ||
      vendor.shipWithinHours ||
      vendor.processingHours ||
      vendor.processingTime,
    48,
  );
  const courierMinDays = Math.max(toNumber(product.courierMinDays || vendor.courierMinDays, 1), 1);
  const courierMaxDays = Math.max(toNumber(product.courierMaxDays || vendor.courierMaxDays, 3), courierMinDays);
  const cutoffHour = Math.min(Math.max(toNumber(product.orderCutoffHour || vendor.orderCutoffHour, 18), 0), 23);
  const orderBy = new Date(now);
  orderBy.setHours(cutoffHour, 0, 0, 0);
  if (orderBy <= now) orderBy.setDate(orderBy.getDate() + 1);

  const shipBy = new Date(orderBy.getTime() + processingHours * 60 * 60 * 1000);
  const earliestDate = new Date(shipBy.getTime() + courierMinDays * DAY_MS);
  const latestDate = new Date(shipBy.getTime() + courierMaxDays * DAY_MS);
  const orderWithin = formatDuration(orderBy.getTime() - now.getTime());

  return {
    orderBy: orderBy.toISOString(),
    orderWithin,
    shipBy: shipBy.toISOString(),
    earliestDate: earliestDate.toISOString(),
    latestDate: latestDate.toISOString(),
    courierZone: product.deliveryZone || vendor.deliveryZone || "Bangladesh",
    processingHours,
    label: `Order within ${orderWithin} -> Get it by ${formatDeliveryDate(earliestDate)}`,
    rangeLabel:
      earliestDate.toDateString() === latestDate.toDateString()
        ? formatDeliveryDate(earliestDate)
        : `${formatDeliveryDate(earliestDate)} - ${formatDeliveryDate(latestDate)}`,
  };
};

const buildBuyerProtection = (product = {}, vendor = {}) => {
  const returnWindow = toNumber(product.returnWindowDays || vendor.returnWindowDays, 7);
  return [
    {
      key: "returns",
      label: `${returnWindow}-Day Return`,
      description: "Marketplace-backed return support",
    },
    {
      key: "secure_payment",
      label: "Secure Payment",
      description: "Checkout and payout are protected",
    },
    {
      key: "authentic",
      label: product.authenticityLabel || "Authentic Product",
      description: "Report counterfeit or wrong-item issues anytime",
    },
  ];
};

const buildPriceHistory = (product = {}, rows = [], now = new Date()) => {
  const explicitRows = rows.length ? rows : asArray(product.priceHistory);
  const normalized = explicitRows
    .map((row) => ({
      date: new Date(row.date || row.createdAt || row.recordedAt),
      price: toNumber(row.price || row.salePrice || row.value, NaN),
    }))
    .filter((row) => !Number.isNaN(row.date.getTime()) && Number.isFinite(row.price))
    .sort((a, b) => a.date - b.date)
    .slice(-30);

  if (normalized.length > 0) {
    return normalized.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      price: row.price,
    }));
  }

  const currentPrice = toNumber(product.price, 0);
  const anchorPrice = toNumber(product.originalPrice, currentPrice || 1);
  return Array.from({ length: 30 }, (_, index) => {
    const daysAgo = 29 - index;
    const date = new Date(now.getTime() - daysAgo * DAY_MS);
    const drift = daysAgo / 29;
    const price = Math.round((currentPrice + (anchorPrice - currentPrice) * drift) * 100) / 100;
    return {
      date: date.toISOString().slice(0, 10),
      price,
    };
  });
};

const buildSellerStrip = (vendor = {}, product = {}) => {
  const vendorId = stringifyId(product.vendorId || vendor._id);
  if (!vendorId && !product.vendorName && !product.vendorShopName) return null;
  return {
    vendorId,
    shopName: vendor.shopName || product.vendorShopName || product.vendorName || "Marketplace Seller",
    slug: vendor.slug || product.vendorSlug || null,
    logo: vendor.logo || product.vendorLogo || null,
    rating: toNumber(vendor.rating || product.vendorRating, 0),
    followerCount: toNumber(vendor.followerCount || product.vendorFollowerCount, 0),
    responseRate: toNumber(vendor.responseRate || product.vendorResponseRate, 95),
    responseTime: vendor.responseTime || product.vendorResponseTime || "within hours",
    verified: vendor.status === "approved" || Boolean(vendor.verified || product.vendorVerified),
  };
};

const publicProductCard = (product = {}, reason = "") => ({
  _id: product._id,
  title: product.title || product.name || "Product",
  image: product.image || asArray(product.images)[0] || "",
  images: asArray(product.images),
  price: toNumber(product.price, 0),
  originalPrice: toNumber(product.originalPrice, 0) || null,
  rating: toNumber(product.rating || product.averageRating, 0),
  reviewCount: toNumber(product.reviewCount || product.totalReviews, 0),
  stock: toNumber(product.stock, 0),
  brand: product.brand || product.attributes?.brand || "",
  categoryId: product.categoryId || product.category || null,
  vendorId: product.vendorId || null,
  vendorName: product.vendorShopName || product.vendorName || "",
  vendorSlug: product.vendorSlug || product.vendor?.slug || "",
  vendorLogo: product.vendorLogo || product.vendor?.logo || "",
  reason,
});

const fetchProductCardsByIds = async (db, productIds, limit = 4, reason = "") => {
  if (!db || productIds.length === 0) return [];
  const query = {
    _id: { $in: idVariants(productIds) },
    isActive: { $ne: false },
    $or: [
      { approvalStatus: { $exists: false } },
      { approvalStatus: null },
      { approvalStatus: "approved" },
    ],
  };
  const cursor = db.collection("products").find(query);
  const rows = await cursor.limit(limit).toArray();
  const sortIndex = new Map(productIds.map((id, index) => [stringifyId(id), index]));
  return rows
    .sort((a, b) => (sortIndex.get(stringifyId(a._id)) ?? 99) - (sortIndex.get(stringifyId(b._id)) ?? 99))
    .map((product) => publicProductCard(product, reason));
};

const getFrequentlyBoughtTogether = async (db, product, limit = 3) => {
  if (!db) return [];
  try {
    const productId = stringifyId(product._id);
    const variants = idVariants(productId);
    const cursor = db.collection("orders").find({
      $or: [
        { "products.productId": { $in: variants } },
        { "products._id": { $in: variants } },
        { "items.product": { $in: variants } },
        { "items.productId": { $in: variants } },
      ],
    });
    const orders = await cursor.limit(100).toArray();
    const counts = new Map();

    orders.forEach((order) => {
      [...asArray(order.products), ...asArray(order.items)].forEach((item) => {
        const itemId = stringifyId(item.productId || item.product || item._id);
        if (!itemId || itemId === productId) return;
        counts.set(itemId, (counts.get(itemId) || 0) + toNumber(item.quantity, 1));
      });
    });

    const ids = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (ids.length > 0) {
      return fetchProductCardsByIds(db, ids, limit, "bought_together");
    }
  } catch (error) {
    console.error("Error building frequently bought together:", error);
  }
  return [];
};

const getSimilarProducts = async (db, product, limit = 8) => {
  if (!db) return [];
  try {
    const productId = stringifyId(product._id);
    const categoryValues = idVariants(product.categoryId || product.category);
    const productPrice = toNumber(product.price, 0);
    const priceRange = productPrice ? productPrice * 0.45 : 0;
    const publicFilter = {
      _id: { $nin: idVariants(productId) },
      isActive: { $ne: false },
      stock: { $gt: 0 },
      $and: [
        {
          $or: [
            { approvalStatus: { $exists: false } },
            { approvalStatus: null },
            { approvalStatus: "approved" },
          ],
        },
      ],
    };

    const similarityBranches = [];
    if (categoryValues.length) similarityBranches.push({ categoryId: { $in: categoryValues } });
    if (product.category) similarityBranches.push({ category: product.category });
    if (product.brand || product.attributes?.brand) {
      const brand = product.brand || product.attributes.brand;
      similarityBranches.push({ brand }, { "attributes.brand": brand });
    }
    if (similarityBranches.length) publicFilter.$and.push({ $or: similarityBranches });
    if (priceRange > 0) {
      publicFilter.price = {
        $gte: Math.max(productPrice - priceRange, 0),
        $lte: productPrice + priceRange,
      };
    }

    const rows = await db
      .collection("products")
      .find(publicFilter)
      .sort({ rating: -1, sales: -1, views: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    if (rows.length > 0) return rows.map((item) => publicProductCard(item, "similar"));

    delete publicFilter.price;
    const fallbackRows = await db
      .collection("products")
      .find(publicFilter)
      .sort({ rating: -1, views: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return fallbackRows.map((item) => publicProductCard(item, "similar"));
  } catch (error) {
    console.error("Error building similar products:", error);
    return [];
  }
};

const getReviewSummary = async (db, product) => {
  const fallbackTotal = toNumber(product.reviewCount || product.totalReviews, 0);
  const fallbackRating = toNumber(product.rating || product.averageRating, 0);
  const summary = {
    averageRating: fallbackRating,
    totalReviews: fallbackTotal,
    verifiedCount: 0,
    mediaCount: 0,
    starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  if (!db) return summary;

  try {
    const rows = await db
      .collection("reviews")
      .find({ productId: { $in: idVariants(product._id) } })
      .project({ rating: 1, verified: 1, images: 1, videos: 1, media: 1 })
      .limit(500)
      .toArray();

    if (!rows.length) return summary;

    const totalRating = rows.reduce((sum, review) => {
      const rating = Math.min(Math.max(Math.round(toNumber(review.rating, 0)), 1), 5);
      summary.starBreakdown[rating] += 1;
      if (review.verified) summary.verifiedCount += 1;
      if (asArray(review.images).length || asArray(review.videos).length || asArray(review.media).length) {
        summary.mediaCount += 1;
      }
      return sum + toNumber(review.rating, 0);
    }, 0);

    summary.totalReviews = rows.length;
    summary.averageRating = Math.round((totalRating / rows.length) * 10) / 10;
  } catch (error) {
    console.error("Error building review summary:", error);
  }

  return summary;
};

const extractOrderProductItems = (order = {}) => [
  ...asArray(order.products),
  ...asArray(order.items),
  ...asArray(order.lineItems),
].map((item) => {
  const nestedProduct = item.product && typeof item.product === "object" ? item.product : {};
  return {
    productId: stringifyId(item.productId || item.product || item._id || item.id || nestedProduct._id),
    quantity: Math.max(toNumber(item.quantity || item.qty, 1), 1),
  };
});

const getProductSocialProof = async (db, product, now = new Date()) => {
  const productId = stringifyId(product._id);
  const productIds = idVariants(productId);
  const since24h = new Date(now.getTime() - DAY_MS);
  const blockedStatuses = ["cancelled", "canceled", "failed", "refunded", "returned"];
  const fallbackSales = Math.max(toNumber(product.sales || product.soldCount || product.totalSold, 0), 0);
  let soldLast24h = 0;
  let ordersLast24h = 0;

  if (db && productId) {
    try {
      const rows = await db.collection("orders").find({
        createdAt: { $gte: since24h },
        status: { $nin: blockedStatuses },
        $or: [
          { "products.productId": { $in: productIds } },
          { "products.product": { $in: productIds } },
          { "products._id": { $in: productIds } },
          { "items.productId": { $in: productIds } },
          { "items.product": { $in: productIds } },
          { "lineItems.productId": { $in: productIds } },
        ],
      }).limit(200).toArray();

      rows
        .filter((order) => !blockedStatuses.includes(String(order.status || "").toLowerCase()))
        .forEach((order) => {
        const matchingQuantity = extractOrderProductItems(order)
          .filter((item) => item.productId === productId)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (matchingQuantity > 0) {
          ordersLast24h += 1;
          soldLast24h += matchingQuantity;
        }
      });
    } catch (error) {
      console.error("Error building product social proof:", error);
    }
  }

  const views = toNumber(product.views || product.viewCount, 0);
  const reviews = toNumber(product.reviewCount || product.totalReviews, 0);
  const demandSeed = views + reviews * 3 + Math.max(soldLast24h, fallbackSales) * 5;
  const viewingNow = Math.max(3, Math.min(96, (demandSeed % 41) + 6));

  return {
    viewingNow,
    soldLast24h,
    ordersLast24h,
    soldLast7d: Math.max(fallbackSales, soldLast24h),
    platformGuarantee: {
      label: "Amiyo-Go Guarantee",
      promises: ["Authentic product support", "Secure checkout", "Easy returns"],
    },
    secureCheckout: ["SSL protected checkout", "bKash", "Nagad", "COD", "Visa/Mastercard"],
    labels: {
      viewing: `${viewingNow} people are viewing this now`,
      sold24h: `${soldLast24h} sold in last 24h`,
    },
  };
};

const getPriceHistoryRows = async (db, product) => {
  if (!db) return [];
  const productIds = idVariants(product._id);
  const collectionNames = ["product_price_history", "productPriceHistory"];
  for (const collectionName of collectionNames) {
    try {
      const rows = await db
        .collection(collectionName)
        .find({ productId: { $in: productIds } })
        .sort({ date: 1, createdAt: 1 })
        .limit(60)
        .toArray();
      if (rows.length) return rows;
    } catch (error) {
      console.error(`Error reading ${collectionName}:`, error.message);
    }
  }
  return [];
};

const buildProductDetailPayload = async (req, product) => {
  const db = req.app.locals.db || req.app.locals.models.Product?.collection?.db;
  const Vendor = req.app.locals.models.Vendor;
  const vendorId = stringifyId(product.vendorId);
  let vendor = null;

  if (vendorId && Vendor?.findById) {
    try {
      vendor = await Vendor.findById(vendorId);
    } catch (error) {
      console.error("Error loading product vendor strip:", error);
    }
  }

  const [reviewSummary, priceHistoryRows, frequentlyBoughtTogether, similarProducts, socialProof] =
    await Promise.all([
      getReviewSummary(db, product),
      getPriceHistoryRows(db, product),
      getFrequentlyBoughtTogether(db, product, 3),
      getSimilarProducts(db, product, 8),
      getProductSocialProof(db, product),
    ]);

  return {
    media: buildProductMedia(product),
    variantMatrix: buildVariantMatrix(product),
    stock: buildStockSummary(product),
    deliveryEstimate: buildDeliveryEstimate(product, vendor || {}),
    buyerProtection: buildBuyerProtection(product, vendor || {}),
    seller: buildSellerStrip(vendor || {}, product),
    reviewSummary,
    priceHistory: buildPriceHistory(product, priceHistoryRows),
    frequentlyBoughtTogether,
    similarProducts,
    socialProof,
  };
};

const getAllProducts = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const {
      category,
      minPrice,
      maxPrice,
      minRating,
      sizes,
      brands,
      colors,
      inStock,
      search,
      sortBy,
      sortOrder,
      page = 1,
      limit = 20,
      vendorId, // Add vendorId filter
    } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Prepare filters
    const filters = {
      category,
      minPrice,
      maxPrice,
      minRating,
      sizes: toArrayParam(sizes || req.query["sizes[]"]),
      brands: toArrayParam(brands || req.query["brands[]"]),
      colors: toArrayParam(colors || req.query["colors[]"]),
      inStock: inStock === "true",
      search,
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      skip,
      vendorId, // Pass vendorId to filters
    };

    // Remove undefined values
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined || filters[key] === "") {
        delete filters[key];
      }
    });

    const countQuery = {};
    if (category) {
      const categoryObjectId = new ObjectId(category);
      countQuery.categoryId = categoryObjectId;

      try {
        const Category = req.app.locals.models.Category;
        const descendants = await Category.getDescendantIds(category);
        if (descendants.length > 0) {
          filters.category = [categoryObjectId, ...descendants];
          countQuery.categoryId = { $in: filters.category };
        }
      } catch (error) {
        console.error("Failed to resolve category descendants:", error);
      }
    }

    if (vendorId) countQuery.vendorId = new ObjectId(vendorId);

    const products = await Product.findWithFilters(filters);

    // Debug logging
    if (vendorId && products.length > 0) {
      console.log('📦 Sample product from API:', {
        title: products[0].title,
        categoryId: products[0].categoryId,
        categoryName: products[0].categoryName,
        hasCategoryName: !!products[0].categoryName
      });
    }

    // Get total count for pagination
    const totalProducts = await Product.collection.countDocuments(countQuery);
    const totalCount = totalProducts;
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const options = await Product.getFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { threshold = 10 } = req.query;
    const products = await Product.getLowStockProducts(parseInt(threshold));
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getOutOfStockProducts = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const products = await Product.getOutOfStockProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching out of stock products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateStockBulk = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: "Updates array is required",
      });
    }

    const result = await Product.updateStockBulk(updates);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
      message: "Stock updated successfully",
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { id } = req.params;

    // Log the request for debugging
    console.log(`🔍 Product request: ${id}`);

    // Validate ObjectId format
    if (!id || typeof id !== "string" || id.length !== 24) {
      console.log(`❌ Invalid ID format: ${id}`);
      return res
        .status(400)
        .json({ success: false, error: "Invalid product ID format" });
    }

    const product = await Product.findById(id);

    if (!product) {
      console.log(`❌ Product not found: ${id}`);
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    // Increment view count (don't wait for it to complete)
    Product.incrementViews(id).catch((error) => {
      console.error("Failed to increment views:", error);
    });

    console.log(`✅ Product found: ${product.title}`);
    const detail = await buildProductDetailPayload(req, product);
    res.json({ success: true, data: normalizeForJson({ ...product, detail }) });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { title, price, image, categoryId, stock, description } = req.body;

    if (!title || !price || !categoryId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const productId = await Product.create({
      title,
      price: parseFloat(price),
      image,
      categoryId,
      stock: parseInt(stock) || 0,
      description,
    });

    res.status(201).json({ success: true, data: { id: productId } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { id } = req.params;

    // Enhanced logging for debugging
    console.log("🔄 Product Update Request:");
    console.log("- Product ID:", id);
    console.log("- Request Body:", JSON.stringify(req.body, null, 2));

    // Validate ObjectId format
    if (!id || typeof id !== "string" || id.length !== 24) {
      console.log("❌ Invalid ID format:", id);
      return res.status(400).json({
        success: false,
        error: "Invalid product ID format",
      });
    }

    // Validate required fields
    const { title, price, categoryId } = req.body;
    if (!title || !price || !categoryId) {
      console.log("❌ Missing required fields:", {
        title: !!title,
        price: !!price,
        categoryId: !!categoryId,
      });
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title, price, categoryId",
      });
    }

    // Sanitize and validate data - exclude _id and other immutable fields
    const {
      _id,
      __v,
      createdAt,
      vendorShopName,
      vendorName,
      vendorEmail,
      vendorPhone,
      ...bodyData
    } = req.body;
    const updateData = {
      ...bodyData,
      price: parseFloat(req.body.price),
      stock: parseInt(req.body.stock) || 0,
      updatedAt: new Date(),
    };

    // Ensure arrays are properly formatted
    if (req.body.images && Array.isArray(req.body.images)) {
      updateData.images = req.body.images;
    }
    if (req.body.sizes && Array.isArray(req.body.sizes)) {
      updateData.sizes = req.body.sizes;
    }
    if (req.body.colors && Array.isArray(req.body.colors)) {
      updateData.colors = req.body.colors;
    }

    console.log(
      "📝 Sanitized Update Data:",
      JSON.stringify(updateData, null, 2),
    );

    const result = await Product.update(id, updateData);

    console.log("📊 Update Result:", result);

    if (result.matchedCount === 0) {
      console.log("❌ Product not found for ID:", id);
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    console.log("✅ Product updated successfully");
    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("💥 Product Update Error:", error);
    console.error("Error Stack:", error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const result = await Product.delete(req.params.id);

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const searchProducts = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Use findWithFilters so approvalStatus filter is automatically applied
    const products = await Product.findWithFilters({
      search: q.trim(),
      limit: 50,
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const incrementProductView = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || typeof id !== "string" || id.length !== 24) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid product ID format" });
    }

    const result = await Product.incrementViews(id);

    if (!result || result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, message: "View count incremented" });
  } catch (error) {
    console.error("Error incrementing product view:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const reportProduct = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const db = req.app.locals.db || Product?.collection?.db;
    const { id } = req.params;
    const { reason, details, reporterEmail } = req.body || {};
    const allowedReasons = new Set([
      "counterfeit",
      "wrong_item",
      "prohibited_content",
      "misleading_price",
      "unsafe_product",
      "other",
    ]);

    if (!id || typeof id !== "string" || id.length !== 24 || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Report storage is not configured",
      });
    }

    const normalizedReason = allowedReasons.has(reason) ? reason : "other";
    const now = new Date();
    const report = {
      productId: new ObjectId(id),
      productTitle: product.title || product.name || "",
      vendorId: product.vendorId || null,
      reason: normalizedReason,
      details: String(details || "").trim().slice(0, 2000),
      reporterUserId: req.user?.uid || req.user?._id || null,
      reporterEmail: reporterEmail || req.user?.email || null,
      status: "pending",
      source: "product_page",
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("product_reports").insertOne(report);

    res.status(201).json({
      success: true,
      message: "Report submitted for review",
      data: {
        reportId: result.insertedId,
        status: report.status,
        reason: normalizedReason,
      },
    });
  } catch (error) {
    console.error("Error reporting product:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateProductVariants = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { id } = req.params;
    const { variants } = req.body;

    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID format",
      });
    }

    if (!variants || !Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        error: "Variants array is required",
      });
    }

    // Validate and sanitize variants
    const sanitizedVariants = variants.map((variant, index) => ({
      _id: variant._id || `variant_${Date.now()}_${index}`,
      size: variant.size || "",
      color: variant.color || "",
      price: parseFloat(variant.price) || 0,
      stock: parseInt(variant.stock) || 0,
      sku: variant.sku || "",
      image: variant.image || "",
    }));

    const result = await Product.updateVariants(id, sanitizedVariants);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product variants updated successfully",
      data: { variants: sanitizedVariants },
    });
  } catch (error) {
    console.error("Error updating product variants:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getProductVariants = async (req, res) => {
  try {
    const Product = req.app.locals.models.Product;
    const { id } = req.params;

    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product.variants || [],
    });
  } catch (error) {
    console.error("Error fetching product variants:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFilterOptions,
  getLowStockProducts,
  getOutOfStockProducts,
  updateStockBulk,
  incrementProductView,
  reportProduct,
  updateProductVariants,
  getProductVariants,
  _productDetailTestUtils: {
    buildProductMedia,
    buildVariantMatrix,
    buildStockSummary,
    buildDeliveryEstimate,
    buildBuyerProtection,
    buildPriceHistory,
    buildSellerStrip,
    getProductSocialProof,
    extractOrderProductItems,
    normalizeForJson,
    publicProductCard,
    stringifyId,
  },
};
