const { ObjectId } = require("mongodb");
const { uploadFile } = require("../services/storageService");
const { geocodeAddress, reverseGeocode } = require("../utils/geocoding");

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return normalizeId(value._id);
  if (typeof value === "object" && value.$oid) return value.$oid;
  return value.toString();
};

const safeObjectId = (value) => {
  const id = normalizeId(value);
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const idVariants = (value) => {
  const id = normalizeId(value);
  const objectId = safeObjectId(id);
  return objectId ? [id, objectId] : [id].filter(Boolean);
};

const normalizeShopSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toTrimmedString = (value) => (value === undefined || value === null ? "" : String(value).trim());

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAddress = (address = {}) => {
  if (typeof address === "string") {
    return {
      line1: address,
      area: "",
      city: "",
      district: "",
      country: "Bangladesh",
    };
  }

  return {
    line1: toTrimmedString(address.line1 || address.street || address.addressLine1 || address.details),
    area: toTrimmedString(address.area || address.upazila || address.neighborhood),
    city: toTrimmedString(address.city),
    district: toTrimmedString(address.district || address.state),
    country: toTrimmedString(address.country) || "Bangladesh",
  };
};

const addressText = (address, location = {}) => {
  if (location?.formattedAddress) return location.formattedAddress;
  if (typeof address === "string") return address;
  const normalized = normalizeAddress(address);
  return [normalized.line1, normalized.area, normalized.city, normalized.district, normalized.country]
    .filter(Boolean)
    .join(", ");
};

const normalizeCategories = (vendor = {}, categoryMap = new Map()) => {
  const values = [];
  if (Array.isArray(vendor.categories)) values.push(...vendor.categories);
  if (Array.isArray(vendor.allowedCategoryIds)) {
    vendor.allowedCategoryIds.forEach((categoryId) => {
      const name = categoryMap.get(normalizeId(categoryId));
      if (name) values.push(name);
    });
  }
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
};

const publicProductQuery = (vendor) => ({
  $and: [
    { isActive: { $ne: false } },
    {
      $or: [
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
        { approvalStatus: "approved" },
      ],
    },
    { vendorId: { $in: idVariants(vendor._id) } },
  ],
});

const findShopBySlug = async (req, slug) => {
  const safeSlug = normalizeShopSlug(slug);
  if (!safeSlug) return null;
  const Vendor = req.app.locals.models.Vendor;
  const directMatch = await Vendor.collection.findOne({
    slug: safeSlug,
    status: "approved",
    isShopOpen: { $ne: false },
  });
  if (directMatch) return directMatch;

  const candidates = await Vendor.collection
    .find({
      status: "approved",
      isShopOpen: { $ne: false },
      $or: [
        { slug: { $exists: false } },
        { slug: "" },
        { slug: null },
      ],
    })
    .project({ bankInfo: 0, kycDocuments: 0, internalNotes: 0 })
    .limit(500)
    .toArray();
  const fallbackMatch = candidates.find((vendor) =>
    normalizeShopSlug(vendor.shopName || vendor.displayName || vendor.businessName) === safeSlug,
  );
  if (fallbackMatch) {
    Vendor.collection
      .updateOne({ _id: fallbackMatch._id, $or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }] }, {
        $set: { slug: safeSlug, updatedAt: new Date() },
      })
      .catch((error) => console.error("Failed to backfill shop slug:", error));
  }
  return fallbackMatch || null;
};

const loadCategoryMap = async (req, vendors = []) => {
  const categoryIds = [
    ...new Set(
      vendors
        .flatMap((vendor) => vendor.allowedCategoryIds || [])
        .map(normalizeId)
        .filter(ObjectId.isValid),
    ),
  ].map((id) => new ObjectId(id));

  if (!categoryIds.length) return new Map();
  const categories = await req.app.locals.models.Category.collection
    .find({ _id: { $in: categoryIds } })
    .project({ name: 1 })
    .toArray();
  return new Map(categories.map((category) => [category._id.toString(), category.name]));
};

const buildVendorStats = async (req, vendors = []) => {
  const Product = req.app.locals.models.Product;
  const Review = req.app.locals.models.Review;
  const vendorIds = vendors.map((vendor) => normalizeId(vendor._id)).filter(Boolean);
  const vendorObjectIds = vendorIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const vendorKeys = [...vendorIds, ...vendorObjectIds];

  if (!vendorKeys.length) return new Map();

  const productRows = await Product.collection
    .aggregate([
      { $match: { vendorId: { $in: vendorKeys }, isActive: { $ne: false } } },
      {
        $match: {
          $or: [
            { approvalStatus: { $exists: false } },
            { approvalStatus: null },
            { approvalStatus: "approved" },
          ],
        },
      },
      { $project: { _id: 1, vendorId: 1 } },
    ])
    .toArray();

  const stats = new Map(vendorIds.map((vendorId) => [vendorId, { productCount: 0, productIds: [] }]));
  productRows.forEach((product) => {
    const vendorId = normalizeId(product.vendorId);
    if (!stats.has(vendorId)) stats.set(vendorId, { productCount: 0, productIds: [] });
    const row = stats.get(vendorId);
    row.productCount += 1;
    row.productIds.push(product._id);
  });

  const productIds = productRows.map((product) => product._id);
  if (productIds.length) {
    const reviewRows = await Review.collection
      .aggregate([
        { $match: { productId: { $in: productIds }, status: { $ne: "removed" } } },
        { $group: { _id: "$productId", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
      ])
      .toArray();
    const reviewByProduct = new Map(reviewRows.map((row) => [normalizeId(row._id), row]));

    stats.forEach((row) => {
      const reviews = row.productIds
        .map((productId) => reviewByProduct.get(normalizeId(productId)))
        .filter(Boolean);
      const reviewCount = reviews.reduce((sum, item) => sum + number(item.reviewCount), 0);
      const weightedRating = reviews.reduce(
        (sum, item) => sum + number(item.averageRating) * number(item.reviewCount),
        0,
      );
      row.reviewCount = reviewCount;
      row.rating = reviewCount ? Math.round((weightedRating / reviewCount) * 10) / 10 : 0;
      delete row.productIds;
    });
  }

  return stats;
};

const serializeShopCard = (vendor = {}, stats = {}, categoryMap = new Map()) => {
  const location = vendor.location || {};
  const categories = normalizeCategories(vendor, categoryMap);
  const productCount = number(vendor.productCount, stats.productCount || 0);
  const reviewCount = number(vendor.reviewCount, stats.reviewCount || 0);
  const rating = number(vendor.rating, stats.rating || 0);

  return {
    _id: normalizeId(vendor._id),
    slug: vendor.slug || normalizeShopSlug(vendor.shopName),
    displayName: vendor.displayName || vendor.shopName || vendor.businessName || "Shop",
    shopName: vendor.shopName || vendor.displayName || vendor.businessName || "Shop",
    tagline: vendor.tagline || "",
    logo: vendor.logo || "",
    banner: vendor.banner || "",
    rating,
    reviewCount,
    followerCount: number(vendor.followerCount, 0),
    productCount,
    categories,
    location: {
      lat: location.lat ?? null,
      lng: location.lng ?? null,
      formattedAddress: addressText(vendor.address, location),
    },
    isVerified: vendor.isVerified === true || vendor.status === "approved",
    isOfficialStore: vendor.isOfficialStore === true,
    joinedAt: vendor.joinedAt || vendor.createdAt || null,
  };
};

const sanitizeShopProfile = (vendor = {}, stats = {}, categoryMap = new Map()) => {
  const card = serializeShopCard(vendor, stats, categoryMap);
  const address = normalizeAddress(vendor.address);

  return {
    ...card,
    description: vendor.description || "",
    address,
    returnPolicy: vendor.returnPolicy || "",
    shippingPolicy: vendor.shippingPolicy || vendor.shippingNotes || "",
    workingHours: vendor.workingHours || "",
    phone: vendor.phone || "",
    email: vendor.email || "",
    website: vendor.website || "",
    socialLinks: {
      facebook: vendor.socialLinks?.facebook || "",
      instagram: vendor.socialLinks?.instagram || "",
      youtube: vendor.socialLinks?.youtube || "",
    },
    responseRate: vendor.responseRate || 95,
    responseTime: vendor.responseTime || "within hours",
    shopDecoration: vendor.shopDecoration || {},
    shopViewCount: number(vendor.shopViewCount, 0),
  };
};

const buildShopProduct = (product = {}, vendor = {}) => ({
  ...product,
  vendorId: normalizeId(vendor._id),
  vendorName: vendor.shopName || vendor.displayName || "",
  vendorSlug: vendor.slug || "",
  vendorLogo: vendor.logo || "",
  vendorVerified: vendor.isVerified === true || vendor.status === "approved",
  officialStore: vendor.isOfficialStore === true,
});

exports.listShops = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const search = toTrimmedString(req.query.search);
    const area = toTrimmedString(req.query.area);
    const categoryFilters = String(req.query.category || "")
      .split(",")
      .map(toTrimmedString)
      .filter(Boolean)
      .map((item) => item.toLowerCase());
    const minRating = req.query.rating !== undefined ? number(req.query.rating, 0) : 0;
    const sort = String(req.query.sort || "popular").toLowerCase();

    const query = {
      status: "approved",
      isShopOpen: { $ne: false },
    };

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { shopName: regex },
        { displayName: regex },
        { tagline: regex },
        { description: regex },
        { "address.area": regex },
        { "address.city": regex },
        { "address.district": regex },
        { "location.formattedAddress": regex },
        { categories: regex },
      ];
    }

    if (area) {
      const regex = new RegExp(escapeRegex(area), "i");
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { "address.area": regex },
            { "address.city": regex },
            { "address.district": regex },
            { "location.formattedAddress": regex },
            { address: regex },
          ],
        },
      ];
    }

    const vendors = await Vendor.collection.find(query).limit(1000).toArray();
    const categoryMap = await loadCategoryMap(req, vendors);
    const stats = await buildVendorStats(req, vendors);
    let shops = vendors.map((vendor) => serializeShopCard(vendor, stats.get(normalizeId(vendor._id)), categoryMap));

    if (categoryFilters.length) {
      shops = shops.filter((shop) =>
        shop.categories.some((item) => {
          const normalized = item.toLowerCase();
          return categoryFilters.some((category) => normalized.includes(category));
        }),
      );
    }

    if (minRating > 0) {
      shops = shops.filter((shop) => number(shop.rating, 0) >= minRating);
    }

    shops.sort((a, b) => {
      if (sort === "newest") return new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0);
      if (sort === "top-rated" || sort === "top_rated") {
        return number(b.rating) - number(a.rating) || number(b.reviewCount) - number(a.reviewCount);
      }
      return number(b.followerCount) - number(a.followerCount) || number(b.productCount) - number(a.productCount);
    });

    if (req.user?.uid) {
      const activeFollows = await req.app.locals.db.collection("vendorFollows")
        .find({
          userId: req.user.uid,
          active: true,
          vendorId: { $in: shops.map((shop) => shop._id) },
        })
        .project({ vendorId: 1 })
        .toArray();
      const followedVendorIds = new Set(activeFollows.map((follow) => normalizeId(follow.vendorId)));
      shops = shops.map((shop) => ({ ...shop, following: followedVendorIds.has(normalizeId(shop._id)) }));
    }

    const totalCount = shops.length;
    const data = shops.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error listing shops:", error);
    res.status(500).json({ success: false, error: "Failed to load shops" });
  }
};

exports.getShopBySlug = async (req, res) => {
  try {
    const vendor = await findShopBySlug(req, req.params.slug);
    if (!vendor) return res.status(404).json({ success: false, error: "Shop not found" });

    req.app.locals.models.Vendor.collection
      .updateOne({ _id: vendor._id }, { $inc: { shopViewCount: 1 }, $set: { updatedAt: new Date() } })
      .catch((error) => console.error("Failed to increment shop views:", error));

    const categoryMap = await loadCategoryMap(req, [vendor]);
    const stats = await buildVendorStats(req, [vendor]);
    res.json({
      success: true,
      data: sanitizeShopProfile(vendor, stats.get(normalizeId(vendor._id)), categoryMap),
    });
  } catch (error) {
    console.error("Error loading shop:", error);
    res.status(500).json({ success: false, error: "Failed to load shop" });
  }
};

exports.getShopProducts = async (req, res) => {
  try {
    const vendor = await findShopBySlug(req, req.params.slug);
    if (!vendor) return res.status(404).json({ success: false, error: "Shop not found" });

    const Product = req.app.locals.models.Product;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const query = publicProductQuery(vendor);
    const and = [...query.$and];

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), "i");
      and.push({
        $or: [
          { title: regex },
          { name: regex },
          { description: regex },
          { brand: regex },
          { "attributes.brand": regex },
        ],
      });
    }

    if (req.query.category) {
      const categoryId = safeObjectId(req.query.category);
      if (categoryId) {
        and.push({ categoryId });
      } else {
        const categoryRegex = new RegExp(escapeRegex(req.query.category), "i");
        const categoryRows = await req.app.locals.models.Category.collection
          .find({ name: categoryRegex })
          .project({ _id: 1 })
          .limit(50)
          .toArray();
        and.push({
          $or: [
            { categoryId: { $in: categoryRows.map((category) => category._id) } },
            { categoryName: categoryRegex },
            { category: categoryRegex },
          ],
        });
      }
    }

    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      const price = {};
      if (req.query.minPrice !== undefined) price.$gte = number(req.query.minPrice);
      if (req.query.maxPrice !== undefined) price.$lte = number(req.query.maxPrice);
      and.push({ price });
    }

    const match = { $and: and };
    const sort = String(req.query.sort || "newest").toLowerCase();
    const sortMap = {
      newest: { createdAt: -1 },
      popular: { views: -1, createdAt: -1 },
      "price-low": { price: 1 },
      price_asc: { price: 1 },
      "price-high": { price: -1 },
      price_desc: { price: -1 },
      "top-rated": { averageRating: -1, reviewCount: -1 },
      top_rated: { averageRating: -1, reviewCount: -1 },
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "productId",
          as: "reviewRows",
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: [{ $gt: [{ $size: "$reviewRows" }, 0] }, { $avg: "$reviewRows.rating" }, { $ifNull: ["$averageRating", 0] }],
          },
          reviewCount: {
            $cond: [{ $gt: [{ $size: "$reviewRows" }, 0] }, { $size: "$reviewRows" }, { $ifNull: ["$reviewCount", 0] }],
          },
        },
      },
    ];

    if (req.query.rating !== undefined) {
      pipeline.push({ $match: { averageRating: { $gte: number(req.query.rating) } } });
    }

    pipeline.push({ $project: { reviewRows: 0 } });

    const countRows = await Product.collection.aggregate([...pipeline, { $count: "total" }]).toArray();
    const totalCount = countRows[0]?.total || 0;
    const products = await Product.collection
      .aggregate([
        ...pipeline,
        { $sort: sortMap[sort] || sortMap.newest },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ])
      .toArray();

    res.json({
      success: true,
      data: products.map((product) => buildShopProduct(product, vendor)),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error loading shop products:", error);
    res.status(500).json({ success: false, error: "Failed to load shop products" });
  }
};

exports.getShopReviews = async (req, res) => {
  try {
    const vendor = await findShopBySlug(req, req.params.slug);
    if (!vendor) return res.status(404).json({ success: false, error: "Shop not found" });

    const Product = req.app.locals.models.Product;
    const Review = req.app.locals.models.Review;
    const User = req.app.locals.models.User;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(40, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const products = await Product.collection
      .find(publicProductQuery(vendor))
      .project({ _id: 1, title: 1, name: 1 })
      .toArray();
    const productIds = products.map((product) => product._id);
    const productMap = new Map(products.map((product) => [normalizeId(product._id), product]));

    if (!productIds.length) {
      return res.json({
        success: true,
        data: {
          averageRating: 0,
          reviewCount: 0,
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          reviews: [],
        },
        pagination: { currentPage: page, totalPages: 1, totalCount: 0, hasNext: false, hasPrev: false },
      });
    }

    const reviewQuery = { productId: { $in: productIds }, status: { $ne: "removed" } };
    const [reviews, totalCount, ratingRows] = await Promise.all([
      Review.collection
        .find(reviewQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      Review.collection.countDocuments(reviewQuery),
      Review.collection
        .aggregate([
          { $match: reviewQuery },
          { $group: { _id: "$rating", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const userIds = reviews.map((review) => safeObjectId(review.userId)).filter(Boolean);
    const users = userIds.length
      ? await User.collection.find({ _id: { $in: userIds } }).project({ email: 1, profile: 1, displayName: 1 }).toArray()
      : [];
    const userMap = new Map(users.map((user) => [normalizeId(user._id), user]));
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingRows.forEach((row) => {
      ratingBreakdown[row._id] = row.count;
    });
    const weighted = Object.entries(ratingBreakdown).reduce((sum, [rating, count]) => sum + Number(rating) * count, 0);

    res.json({
      success: true,
      data: {
        averageRating: totalCount ? Math.round((weighted / totalCount) * 10) / 10 : 0,
        reviewCount: totalCount,
        ratingBreakdown,
        reviews: reviews.map((review) => {
          const user = userMap.get(normalizeId(review.userId));
          const product = productMap.get(normalizeId(review.productId));
          return {
            _id: normalizeId(review._id),
            rating: number(review.rating),
            comment: review.comment || review.review || "",
            createdAt: review.createdAt,
            verified: review.verified === true,
            images: review.images || [],
            reviewerName:
              user?.displayName ||
              [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ") ||
              user?.email?.split("@")[0] ||
              "Customer",
            product: product ? { _id: normalizeId(product._id), title: product.title || product.name || "Product" } : null,
          };
        }),
      },
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error loading shop reviews:", error);
    res.status(500).json({ success: false, error: "Failed to load shop reviews" });
  }
};

exports.followShop = async (req, res) => {
  try {
    if (req.user?.role !== "customer" && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, error: "Customer access required" });
    }

    const vendor = await findShopBySlug(req, req.params.slug);
    if (!vendor) return res.status(404).json({ success: false, error: "Shop not found" });

    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const now = new Date();
    const userObjectId = req.user._id;
    const userId = normalizeId(userObjectId || req.user.uid);
    const vendorId = normalizeId(vendor._id);
    const follows = req.app.locals.db.collection("vendorFollows");
    await follows.createIndex({ userId: 1, vendorId: 1 }, { unique: true });

    const alreadyFollowing = await Vendor.collection.findOne({
      _id: vendor._id,
      "shopFollowers.userId": userObjectId,
    });

    await Vendor.collection.updateOne(
      { _id: vendor._id, "shopFollowers.userId": { $ne: userObjectId } },
      {
        $push: { shopFollowers: { userId: userObjectId, followedAt: now } },
        $inc: { followerCount: 1 },
        $set: { updatedAt: now },
      },
    );

    await follows.updateOne(
      { userId: req.user.uid, vendorId },
      {
        $setOnInsert: {
          userObjectId,
          vendorObjectId: vendor._id,
          createdAt: now,
        },
        $set: {
          active: true,
          followedAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    if (User?.collection && userObjectId) {
      await User.collection.updateOne(
        { _id: userObjectId },
        { $addToSet: { followedVendors: vendorId }, $set: { updatedAt: now } },
      );
    }

    const updated = await Vendor.findById(vendor._id);
    const followerCount = Math.max(number(updated?.followerCount, vendor.followerCount || 0), 0);
    res.json({ success: true, data: { following: true, followerCount } });
  } catch (error) {
    console.error("Error following shop:", error);
    res.status(500).json({ success: false, error: "Failed to follow shop" });
  }
};

exports.unfollowShop = async (req, res) => {
  try {
    const vendor = await findShopBySlug(req, req.params.slug);
    if (!vendor) return res.status(404).json({ success: false, error: "Shop not found" });

    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;
    const userObjectId = req.user._id;
    const vendorId = normalizeId(vendor._id);
    const wasFollowing = await Vendor.collection.findOne({
      _id: vendor._id,
      "shopFollowers.userId": userObjectId,
    });

    await Vendor.collection.updateOne(
      { _id: vendor._id },
      {
        $pull: { shopFollowers: { userId: userObjectId } },
        ...(wasFollowing ? { $inc: { followerCount: -1 } } : {}),
        $set: { updatedAt: new Date() },
      },
    );
    await Vendor.collection.updateOne({ _id: vendor._id, followerCount: { $lt: 0 } }, { $set: { followerCount: 0 } });

    await req.app.locals.db.collection("vendorFollows").updateOne(
      { userId: req.user.uid, vendorId },
      { $set: { active: false, unfollowedAt: new Date(), updatedAt: new Date() } },
    );

    if (User?.collection && userObjectId) {
      await User.collection.updateOne(
        { _id: userObjectId },
        { $pull: { followedVendors: vendorId }, $set: { updatedAt: new Date() } },
      );
    }

    const updated = await Vendor.findById(vendor._id);
    res.json({ success: true, data: { following: false, followerCount: Math.max(number(updated?.followerCount), 0) } });
  } catch (error) {
    console.error("Error unfollowing shop:", error);
    res.status(500).json({ success: false, error: "Failed to unfollow shop" });
  }
};

exports.getShopFollowStatus = async (req, res) => {
  try {
    const vendor = await findShopBySlug(req, req.params.slug);
    if (!vendor) return res.status(404).json({ success: false, error: "Shop not found" });
    const vendorId = normalizeId(vendor._id);
    const userObjectId = req.user._id;
    const follow = await req.app.locals.db.collection("vendorFollows").findOne({
      userId: req.user.uid,
      vendorId,
      active: true,
    });
    const embedded = (vendor.shopFollowers || []).some((row) => normalizeId(row.userId) === normalizeId(userObjectId));
    res.json({ success: true, data: { following: Boolean(follow || embedded) } });
  } catch (error) {
    console.error("Error checking shop follow status:", error);
    res.status(500).json({ success: false, error: "Failed to check follow status" });
  }
};

const findVendorForRequest = async (req) => {
  if (req.vendor) return req.vendor;
  const Vendor = req.app.locals.models.Vendor;
  if (req.user?.vendorId) return Vendor.findById(req.user.vendorId);
  if (req.user?._id) return Vendor.findByUserId(req.user._id);
  return null;
};

exports.getOwnShop = async (req, res) => {
  try {
    const vendor = await findVendorForRequest(req);
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor profile not found" });
    const categoryMap = await loadCategoryMap(req, [vendor]);
    const stats = await buildVendorStats(req, [vendor]);
    res.json({
      success: true,
      data: sanitizeShopProfile(vendor, stats.get(normalizeId(vendor._id)), categoryMap),
    });
  } catch (error) {
    console.error("Error loading own shop:", error);
    res.status(500).json({ success: false, error: "Failed to load shop profile" });
  }
};

exports.updateOwnShop = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const VendorShop = req.app.locals.models.VendorShop;
    const vendor = await findVendorForRequest(req);
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor profile not found" });

    const shopName = toTrimmedString(req.body.shopName || req.body.displayName || vendor.shopName);
    if (!shopName) return res.status(400).json({ success: false, error: "Shop name is required" });

    let slug = req.body.slug !== undefined ? normalizeShopSlug(req.body.slug) : vendor.slug;
    if (!slug) slug = await Vendor.generateUniqueSlug(shopName, vendor._id);
    if (!slug) return res.status(400).json({ success: false, error: "Shop slug is required" });

    const existing = await Vendor.findBySlug(slug);
    if (existing && existing._id.toString() !== vendor._id.toString()) {
      return res.status(409).json({ success: false, error: "Shop slug is already in use" });
    }

    const updateData = {
      shopName,
      displayName: shopName,
      slug,
      tagline: toTrimmedString(req.body.tagline),
      description: toTrimmedString(req.body.description),
      returnPolicy: toTrimmedString(req.body.returnPolicy),
      shippingPolicy: toTrimmedString(req.body.shippingPolicy),
      workingHours: toTrimmedString(req.body.workingHours),
      phone: toTrimmedString(req.body.phone),
      email: toTrimmedString(req.body.email),
      website: toTrimmedString(req.body.website),
      categories: Array.isArray(req.body.categories)
        ? req.body.categories.map(toTrimmedString).filter(Boolean)
        : String(req.body.categories || "").split(",").map(toTrimmedString).filter(Boolean),
      socialLinks: {
        facebook: toTrimmedString(req.body.socialLinks?.facebook),
        instagram: toTrimmedString(req.body.socialLinks?.instagram),
        youtube: toTrimmedString(req.body.socialLinks?.youtube),
      },
    };

    await Vendor.update(vendor._id, updateData);
    const updated = await Vendor.findById(vendor._id);
    if (VendorShop) await VendorShop.upsertForVendor(updated, updateData);
    const categoryMap = await loadCategoryMap(req, [updated]);
    res.json({ success: true, data: sanitizeShopProfile(updated, {}, categoryMap), message: "Shop profile saved" });
  } catch (error) {
    console.error("Error updating own shop:", error);
    res.status(500).json({ success: false, error: "Failed to save shop profile" });
  }
};

exports.updateOwnShopLocation = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const VendorShop = req.app.locals.models.VendorShop;
    const vendor = await findVendorForRequest(req);
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor profile not found" });

    let address = normalizeAddress(req.body.address || {});
    let location = null;

    if (req.body.addressString) {
      location = await geocodeAddress(req.body.addressString);
      if (![address.line1, address.area, address.city, address.district].some(Boolean)) {
        address = normalizeAddress({
          line1: req.body.addressString,
          country: "Bangladesh",
        });
      }
    } else if (req.body.lat !== undefined && req.body.lng !== undefined) {
      const lat = number(req.body.lat, NaN);
      const lng = number(req.body.lng, NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ success: false, error: "Valid latitude and longitude are required" });
      }
      const reverse = await reverseGeocode(lat, lng);
      location = {
        lat,
        lng,
        formattedAddress: reverse?.formattedAddress || addressText(address, vendor.location),
      };
    }

    if (!location) {
      return res.status(400).json({ success: false, error: "Could not resolve shop location" });
    }

    const updateData = { address, location };
    await Vendor.update(vendor._id, updateData);
    const updated = await Vendor.findById(vendor._id);
    if (VendorShop) await VendorShop.upsertForVendor(updated, updateData);
    res.json({ success: true, data: { address, location }, message: "Shop location saved" });
  } catch (error) {
    console.error("Error updating shop location:", error);
    res.status(500).json({ success: false, error: "Failed to save shop location" });
  }
};

exports.updateOwnShopMedia = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const VendorShop = req.app.locals.models.VendorShop;
    const vendor = await findVendorForRequest(req);
    if (!vendor) return res.status(404).json({ success: false, error: "Vendor profile not found" });

    const updateData = {};
    if (req.files?.logo?.[0]) {
      const upload = await uploadFile({
        req,
        file: req.files.logo[0],
        folder: `shops/${vendor._id}/logo`,
        options: { maxWidth: 800, quality: 85 },
      });
      updateData.logo = upload.url;
    }

    if (req.files?.banner?.[0]) {
      const upload = await uploadFile({
        req,
        file: req.files.banner[0],
        folder: `shops/${vendor._id}/banner`,
        options: { maxWidth: 1920, quality: 85 },
      });
      updateData.banner = upload.url;
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ success: false, error: "Logo or banner file is required" });
    }

    await Vendor.update(vendor._id, updateData);
    const updated = await Vendor.findById(vendor._id);
    if (VendorShop) await VendorShop.upsertForVendor(updated, updateData);
    res.json({
      success: true,
      data: {
        logo: updated.logo || "",
        banner: updated.banner || "",
      },
      message: "Shop media saved",
    });
  } catch (error) {
    console.error("Error updating shop media:", error);
    res.status(500).json({ success: false, error: "Failed to upload shop media" });
  }
};

exports._shopControllerTestUtils = {
  addressText,
  normalizeAddress,
  normalizeShopSlug,
  serializeShopCard,
  sanitizeShopProfile,
};
