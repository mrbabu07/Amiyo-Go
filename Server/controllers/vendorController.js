const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { uploadFile } = require("../services/storageService");

const normalizeShopSlug = (slug) =>
  String(slug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mergeVendorShopProfile = (vendor, vendorShop) => {
  if (!vendorShop) return vendor;
  return {
    ...vendor,
    shopName: vendorShop.shopName ?? vendor.shopName,
    slug: vendorShop.slug ?? vendor.slug,
    tagline: vendorShop.tagline ?? vendor.tagline,
    description: vendorShop.description ?? vendor.description,
    phone: vendorShop.phone ?? vendor.phone,
    whatsapp: vendorShop.whatsapp ?? vendor.whatsapp,
    email: vendorShop.email ?? vendor.email,
    address: vendorShop.address ?? vendor.address,
    returnPolicy: vendorShop.returnPolicy ?? vendor.returnPolicy,
    processingTime: vendorShop.processingTime ?? vendor.processingTime,
    shippingNotes: vendorShop.shippingNotes ?? vendor.shippingNotes,
    logo: vendorShop.logo ?? vendor.logo,
    banner: vendorShop.banner ?? vendor.banner,
    shopDecoration: vendorShop.shopDecoration ?? vendor.shopDecoration,
    vendorShopId: vendorShop._id,
  };
};

const toTrimmedString = (value) => (value === undefined || value === null ? "" : String(value).trim());

const createSettingsId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

const normalizePayoutAccounts = (accounts = []) => {
  const normalized = accounts
    .filter(Boolean)
    .map((account) => {
      const type = toTrimmedString(account.type || account.provider || "bank").toLowerCase();
      const isMobileProvider = ["bkash", "nagad", "rocket", "upay", "mfs", "mobile"].includes(type);

      return {
        id: toTrimmedString(account.id || account._id) || createSettingsId("pay"),
        type,
        label:
          toTrimmedString(account.label) ||
          (type === "bank" ? toTrimmedString(account.bankName) || "Bank account" : type.toUpperCase()),
        accountName: toTrimmedString(account.accountName || account.bankAccountName || account.name),
        accountNumber: toTrimmedString(
          account.accountNumber || account.bankAccountNumber || account.mobileBankingNumber || account.number,
        ),
        bankName: toTrimmedString(account.bankName),
        branchName: toTrimmedString(account.branchName || account.bankBranch),
        routingNumber: toTrimmedString(account.routingNumber),
        provider: isMobileProvider ? type : toTrimmedString(account.provider),
        status: toTrimmedString(account.status) || "active",
        isDefault: Boolean(account.isDefault || account.default),
      };
    })
    .filter((account) => account.accountNumber || account.accountName || account.bankName);

  const defaultIndex = normalized.findIndex((account) => account.isDefault);
  return normalized.map((account, index) => ({
    ...account,
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
};

const normalizeVendorAddress = (address = {}, prefix = "addr") => {
  if (!address || typeof address !== "object") return {};

  return {
    id: toTrimmedString(address.id || address._id) || createSettingsId(prefix),
    label: toTrimmedString(address.label),
    contactName: toTrimmedString(address.contactName || address.name),
    phone: toTrimmedString(address.phone),
    street: toTrimmedString(address.street || address.addressLine1),
    area: toTrimmedString(address.area || address.upazila),
    city: toTrimmedString(address.city),
    district: toTrimmedString(address.district || address.state),
    division: toTrimmedString(address.division),
    postalCode: toTrimmedString(address.postalCode || address.zipCode),
    country: toTrimmedString(address.country) || "Bangladesh",
    notes: toTrimmedString(address.notes || address.instructions),
    isDefault: Boolean(address.isDefault || address.default),
  };
};

const normalizePickupAddresses = (addresses = []) => {
  const normalized = addresses
    .filter(Boolean)
    .map((address) => normalizeVendorAddress(address, "pickup"))
    .filter((address) => address.street || address.city || address.district || address.phone);

  const defaultIndex = normalized.findIndex((address) => address.isDefault);
  return normalized.map((address, index) => ({
    ...address,
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
};

const normalizeDeliverySettings = (settings = {}, current = {}) => {
  const numericFields = [
    "sameUnionFee",
    "sameUpazilaFee",
    "sameDistrictFee",
    "outsideDistrictFee",
    "freeDeliveryThreshold",
    "perishableFee",
    "handlingFee",
    "orderCutoffHour",
  ];
  const normalized = { ...(current || {}) };

  numericFields.forEach((field) => {
    if (settings[field] === undefined || settings[field] === "") return;
    const value = Number(settings[field]);
    if (Number.isFinite(value)) normalized[field] = value;
  });

  ["selfDeliveryEnabled", "pickupEnabled"].forEach((field) => {
    if (settings[field] !== undefined) normalized[field] = Boolean(settings[field]);
  });

  if (settings.preparationTime !== undefined) {
    normalized.preparationTime = toTrimmedString(settings.preparationTime);
  }
  if (settings.defaultCourier !== undefined) {
    normalized.defaultCourier = toTrimmedString(settings.defaultCourier);
  }

  return normalized;
};

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Alphabet[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (secret) => {
  const cleanSecret = String(secret || "")
    .replace(/=+$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of cleanSecret) {
    const index = base32Alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotpCode = (secret, timestamp = Date.now()) => {
  const key = base32Decode(secret);
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary =
    ((hmac[offset] & 127) << 24) |
    ((hmac[offset + 1] & 255) << 16) |
    ((hmac[offset + 2] & 255) << 8) |
    (hmac[offset + 3] & 255);

  return String(binary % 1000000).padStart(6, "0");
};

const safeCodeMatches = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyTotpCode = (secret, code, window = 1) => {
  const sanitizedCode = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(sanitizedCode) || !secret) return false;

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotpCode(secret, Date.now() + offset * 30 * 1000);
    if (safeCodeMatches(sanitizedCode, expected)) return true;
  }

  return false;
};

const buildOtpAuthUrl = (vendor, secret) => {
  const issuer = "Amiyo Go";
  const accountName = vendor.shopName || vendor.email || `Vendor ${vendor._id}`;
  const label = `${issuer}:${accountName}`;

  return {
    issuer,
    accountName,
    otpauthUrl: `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(
      issuer,
    )}&digits=6&period=30`,
  };
};

const findVendorForRequest = async (req) => {
  const Vendor = req.app.locals.models.Vendor;
  if (req.user?.vendorId && Vendor.findById) {
    const vendor = await Vendor.findById(req.user.vendorId);
    if (vendor) return vendor;
  }

  if (req.user?._id && Vendor.findByUserId) {
    return Vendor.findByUserId(req.user._id);
  }

  return req.vendor || null;
};

// Public: Get vendor public information (for product pages)
exports.getVendorPublicInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;
    const Product = req.app.locals.models.Product;
    const VendorShop = req.app.locals.models.VendorShop;

    // Validate ObjectId
    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid vendor ID format" 
      });
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        error: "Vendor not found" 
      });
    }

    // Only return public information for approved vendors
    if (vendor.status !== "approved") {
      return res.status(404).json({ 
        success: false, 
        error: "Vendor not available" 
      });
    }

    const vendorShop = VendorShop ? await VendorShop.findByVendorId(vendor._id) : null;
    const publicVendor = mergeVendorShopProfile(vendor, vendorShop);

    // Get vendor's product count
    const totalProducts = await Product.collection.countDocuments({
      vendorId: new ObjectId(id),
      isActive: true,
      approvalStatus: "approved"
    });

    // Calculate vendor rating from reviews
    const Review = req.app.locals.models.Review;
    const vendorProducts = await Product.collection
      .find({ vendorId: new ObjectId(id) })
      .project({ _id: 1 })
      .toArray();
    
    const productIds = vendorProducts.map(p => p._id);
    
    let averageRating = 0;
    let totalReviews = 0;
    
    if (productIds.length > 0) {
      const ratingStats = await Review.collection.aggregate([
        { $match: { productId: { $in: productIds } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      if (ratingStats.length > 0) {
        averageRating = Math.round(ratingStats[0].avgRating * 10) / 10;
        totalReviews = ratingStats[0].count;
      }
    }

    // Get total sales from vendor orders
    const VendorOrder = req.app.locals.models.VendorOrder;
    const salesStats = await VendorOrder.collection.aggregate([
      { 
        $match: { 
          vendorId: id,
          status: { $in: ["delivered", "completed"] }
        } 
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 }
        }
      }
    ]).toArray();

    const totalSales = salesStats.length > 0 ? salesStats[0].totalSales : 0;

    // Return public vendor information
    const publicInfo = {
      _id: vendor._id,
      shopName: publicVendor.shopName,
      slug: publicVendor.slug,
      tagline: publicVendor.tagline || null,
      logo: publicVendor.logo || null,
      banner: publicVendor.banner || null,
      description: publicVendor.description || null,
      phone: publicVendor.phone || null,
      email: publicVendor.email || null,
      address: publicVendor.address || null,
      returnPolicy: publicVendor.returnPolicy || null,
      processingTime: publicVendor.processingTime || null,
      shippingNotes: publicVendor.shippingNotes || null,
      shopDecoration: publicVendor.shopDecoration || {},
      status: vendor.status,
      rating: averageRating,
      totalReviews,
      totalProducts,
      totalSales,
      followerCount: vendor.followerCount || 0,
      responseRate: publicVendor.responseRate || vendor.responseRate || 95, // Default if not calculated
      responseTime: publicVendor.responseTime || vendor.responseTime || "within hours", // Default
      joinedDate: vendor.createdAt
    };

    res.json({ 
      success: true, 
      data: publicInfo 
    });
  } catch (error) {
    console.error("Error fetching vendor public info:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch vendor information" 
    });
  }
};

exports.getVendorPublicInfoBySlug = async (req, res) => {
  try {
    const slug = normalizeShopSlug(req.params.slug);
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "Invalid shop slug",
      });
    }

    const Vendor = req.app.locals.models.Vendor;
    const vendor = await Vendor.findBySlug(slug);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    req.params.id = vendor._id.toString();
    return exports.getVendorPublicInfo(req, res);
  } catch (error) {
    console.error("Error fetching vendor public info by slug:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vendor information",
    });
  }
};

// Get follow status
exports.getFollowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;

    const user = await User.findById(req.user._id);
    const follow = await req.app.locals.db.collection("vendorFollows").findOne({
      userId: req.user.uid,
      vendorId: id,
      active: true,
    });
    const isFollowing = Boolean(follow) || Boolean(user?.followedVendors?.includes(id));

    res.json({ success: true, isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ success: false, error: "Failed to check follow status" });
  }
};

// Follow vendor
exports.followVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;

    // Check if vendor exists
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    const now = new Date();
    const follows = req.app.locals.db.collection("vendorFollows");
    await follows.createIndex({ userId: 1, vendorId: 1 }, { unique: true });
    const user = await User.findById(req.user._id);
    const wasFollowingInProfile = Boolean(user?.followedVendors?.includes(id));
    const existingFollow = await follows.findOne({
      userId: req.user.uid,
      vendorId: id,
      active: true,
    });

    // Add vendor to user's followed list
    await User.collection.updateOne(
      { _id: req.user._id },
      { 
        $addToSet: { followedVendors: id },
        $set: { updatedAt: now }
      }
    );

    await follows.updateOne(
      { userId: req.user.uid, vendorId: id },
      {
        $setOnInsert: {
          userObjectId: req.user._id,
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

    // Increment vendor's follower count
    if (!existingFollow && !wasFollowingInProfile) {
      await Vendor.collection.updateOne(
        { _id: vendor._id },
        {
          $inc: { followerCount: 1 },
          $set: { updatedAt: now },
        },
      );
    }

    res.json({ 
      success: true, 
      message: "Successfully followed vendor",
      isFollowing: true
    });
  } catch (error) {
    console.error("Error following vendor:", error);
    res.status(500).json({ success: false, error: "Failed to follow vendor" });
  }
};

// Unfollow vendor
exports.unfollowVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;
    const user = await User.findById(req.user._id);
    const wasFollowingInProfile = Boolean(user?.followedVendors?.includes(id));
    const existingFollow = await req.app.locals.db.collection("vendorFollows").findOne({
      userId: req.user.uid,
      vendorId: id,
      active: true,
    });

    // Remove vendor from user's followed list
    await User.collection.updateOne(
      { _id: req.user._id },
      { 
        $pull: { followedVendors: id },
        $set: { updatedAt: new Date() }
      }
    );

    await req.app.locals.db.collection("vendorFollows").updateOne(
      { userId: req.user.uid, vendorId: id },
      {
        $set: {
          active: false,
          unfollowedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (existingFollow || wasFollowingInProfile) {
      // Decrement vendor's follower count
      await Vendor.collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { followerCount: -1 },
          $set: { updatedAt: new Date() },
        },
      );
      await Vendor.collection.updateOne(
        { _id: new ObjectId(id), followerCount: { $lt: 0 } },
        { $set: { followerCount: 0 } },
      );
    }

    res.json({ 
      success: true, 
      message: "Successfully unfollowed vendor",
      isFollowing: false
    });
  } catch (error) {
    console.error("Error unfollowing vendor:", error);
    res.status(500).json({ success: false, error: "Failed to unfollow vendor" });
  }
};

exports.getFollowedVendorFeed = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const User = req.app.locals.models.User;
    const Product = req.app.locals.models.Product;
    const Vendor = req.app.locals.models.Vendor;
    const limit = Math.min(parseInt(req.query.limit, 10) || 24, 60);

    await db.collection("vendorFollows").createIndex({ userId: 1, active: 1, followedAt: -1 });

    const [followRows, user] = await Promise.all([
      db.collection("vendorFollows").find({ userId: req.user.uid, active: true }).sort({ followedAt: -1 }).toArray(),
      User.findById(req.user._id),
    ]);

    const followedVendorIds = [
      ...followRows.map((follow) => follow.vendorId),
      ...(user?.followedVendors || []),
    ]
      .filter(Boolean)
      .map((vendorId) => vendorId.toString());

    const uniqueVendorIds = [...new Set(followedVendorIds)];
    if (uniqueVendorIds.length === 0) {
      return res.json({ success: true, data: [], followedVendorIds: [], unreadCount: 0 });
    }

    const objectIds = uniqueVendorIds.filter(ObjectId.isValid).map((vendorId) => new ObjectId(vendorId));
    const products = await Product.collection
      .find({
        $and: [
          { isActive: { $ne: false } },
          {
            $or: [
              { approvalStatus: "approved" },
              { approvalStatus: { $exists: false } },
              { approvalStatus: null },
            ],
          },
          {
            $or: [
              { vendorId: { $in: uniqueVendorIds } },
              { vendorId: { $in: objectIds } },
            ],
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const vendors = objectIds.length
      ? await Vendor.collection
          .find({ _id: { $in: objectIds } })
          .project({ shopName: 1, slug: 1, logo: 1, status: 1 })
          .toArray()
      : [];
    const vendorMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));
    const Notification = req.app.locals.models.Notification;
    const unreadCount = Notification
      ? await Notification.collection.countDocuments({
          userId: req.user.uid,
          type: "vendor_new_product",
          isRead: false,
        })
      : 0;

    res.json({
      success: true,
      followedVendorIds: uniqueVendorIds,
      unreadCount,
      data: products.map((product) => {
        const vendorId = product.vendorId?.toString?.() || product.vendorId;
        return {
          ...product,
          vendor: vendorMap.get(vendorId) || null,
        };
      }),
    });
  } catch (error) {
    console.error("Error loading followed vendor feed:", error);
    res.status(500).json({ success: false, error: "Failed to load followed vendor feed" });
  }
};

// Vendor Registration
exports.registerVendor = async (req, res) => {
  try {
    const { shopName, phone, address, allowedCategoryIds, payoutMethod } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;
    const User = req.app.locals.models.User;

    // Minimal validation: require basic identity + at least one category.
    if (!shopName || !phone || !Array.isArray(allowedCategoryIds) || allowedCategoryIds.length === 0) {
      return res.status(400).json({ 
        error: "Shop name, phone, and at least one category are required" 
      });
    }

    const normalizedAllowedCategoryIds = [
      ...new Set(allowedCategoryIds.map(toTrimmedString).filter(Boolean)),
    ];

    if (normalizedAllowedCategoryIds.length === 0) {
      return res.status(400).json({
        error: "Select at least one valid category before submitting.",
      });
    }

    const hasInvalidCategoryId = normalizedAllowedCategoryIds.some((categoryId) => !ObjectId.isValid(categoryId));
    if (hasInvalidCategoryId) {
      return res.status(400).json({
        error: "Select valid categories before submitting.",
      });
    }

    const selectedCategories = await Category.findByIds(normalizedAllowedCategoryIds);
    const activeCategoryIds = new Set(
      selectedCategories
        .filter((category) => category?.isActive !== false)
        .map((category) => category._id.toString()),
    );

    if (activeCategoryIds.size !== normalizedAllowedCategoryIds.length) {
      return res.status(400).json({
        error: "One or more selected categories are unavailable. Refresh categories and try again.",
      });
    }

    // Check if user already has a vendor account
    const existingVendor = await Vendor.findByUserId(req.user._id);
    if (existingVendor) {
      return res.status(400).json({ 
        error: "You already have a vendor account. Each user can only have one vendor account." 
      });
    }

    // Check if user's email is already used by another vendor
    // This prevents creating multiple vendor accounts with the same email
    const user = await User.findById(req.user._id);
    const vendorWithSameEmail = await Vendor.collection.findOne({
      "ownerUserId": { $ne: req.user._id }
    });
    
    // Additional check: prevent if user already has vendor role
    if (user.role === "vendor") {
      return res.status(400).json({
        error: "Your account is already registered as a vendor. Contact admin if you need assistance."
      });
    }

    // Generate unique slug
    const baseSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    
    while (await Vendor.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create vendor
    const vendorData = {
      ownerUserId: req.user._id,
      shopName,
      slug,
      phone,
      address,
      allowedCategoryIds: normalizedAllowedCategoryIds,
      payoutMethod: payoutMethod || null,
    };

    const vendor = await Vendor.create(vendorData);
    if (req.app.locals.models.VendorShop) {
      await req.app.locals.models.VendorShop.upsertForVendor(vendor, vendorData);
    }

    res.status(201).json({
      message: "Vendor registration submitted successfully. Pending admin approval.",
      vendor,
    });
  } catch (error) {
    console.error("Error registering vendor:", error);
    res.status(500).json({ error: "Failed to register vendor" });
  }
};

// Get current vendor profile
exports.getMyVendorProfile = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const VendorShop = req.app.locals.models.VendorShop;
    const vendor = req.vendor || await Vendor.findByUserId(req.user._id);

    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found" });
    }

    const vendorShop = VendorShop ? await VendorShop.findByVendorId(vendor._id) : null;
    const mergedVendor = mergeVendorShopProfile(vendor, vendorShop);

    res.json({ vendor: mergedVendor });
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    res.status(500).json({ error: "Failed to fetch vendor profile" });
  }
};

// Update vendor profile
exports.updateVendorProfile = async (req, res) => {
  try {
    const { 
      shopName, 
      phone,
      email,
      tagline,
      description,
      address, 
      slug,
      whatsapp,
      returnPolicy,
      processingTime,
      shippingNotes,
      shopDecoration,
      logo,
      banner,
      payoutMethod,
      // Bank transfer fields
      bankName,
      bankAccountName,
      bankAccountNumber,
      bankBranch,
      // Mobile banking fields
      mobileBankingProvider,
      mobileBankingNumber,
      payoutAccounts,
      pickupAddresses,
      returnAddress,
      deliverySettings,
      notificationPreferences,
    } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const VendorShop = req.app.locals.models.VendorShop;

    const vendor = await Vendor.findByUserId(req.user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found" });
    }

    // Vendors cannot change their allowed categories after registration
    const updateData = {};
    if (shopName) updateData.shopName = shopName;
    if (slug !== undefined) {
      const safeSlug = normalizeShopSlug(slug);

      if (!safeSlug) {
        return res.status(400).json({ error: "Shop slug cannot be empty" });
      }

      const existing = await Vendor.findBySlug(safeSlug);
      if (existing && existing._id.toString() !== vendor._id.toString()) {
        return res.status(409).json({ error: "Shop slug is already in use" });
      }
      if (VendorShop?.collection) {
        const existingShop = await VendorShop.collection.findOne({ slug: safeSlug });
        if (existingShop && existingShop.vendorId?.toString?.() !== vendor._id.toString()) {
          return res.status(409).json({ error: "Shop slug is already in use" });
        }
      }

      updateData.slug = safeSlug;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (tagline !== undefined) updateData.tagline = tagline;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (returnPolicy !== undefined) updateData.returnPolicy = returnPolicy;
    if (processingTime !== undefined) updateData.processingTime = processingTime;
    if (shippingNotes !== undefined) updateData.shippingNotes = shippingNotes;
    if (shopDecoration !== undefined) updateData.shopDecoration = shopDecoration;
    if (logo !== undefined) updateData.logo = logo;
    if (banner !== undefined) updateData.banner = banner;
    if (payoutMethod) updateData.payoutMethod = payoutMethod;
    
    // Bank transfer fields
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber;
    if (bankBranch !== undefined) updateData.bankBranch = bankBranch;
    
    // Mobile banking fields
    if (mobileBankingProvider !== undefined) updateData.mobileBankingProvider = mobileBankingProvider;
    if (mobileBankingNumber !== undefined) updateData.mobileBankingNumber = mobileBankingNumber;

    if (Array.isArray(payoutAccounts)) {
      const normalizedAccounts = normalizePayoutAccounts(payoutAccounts);
      updateData.payoutAccounts = normalizedAccounts;

      const defaultAccount = normalizedAccounts.find((account) => account.isDefault) || normalizedAccounts[0];
      if (defaultAccount) {
        updateData.payoutMethod = defaultAccount.type === "bank" ? "bank_transfer" : "mobile_banking";

        if (defaultAccount.type === "bank") {
          updateData.bankName = defaultAccount.bankName;
          updateData.bankAccountName = defaultAccount.accountName;
          updateData.bankAccountNumber = defaultAccount.accountNumber;
          updateData.bankBranch = defaultAccount.branchName;
        } else {
          updateData.mobileBankingProvider = defaultAccount.provider || defaultAccount.type;
          updateData.mobileBankingNumber = defaultAccount.accountNumber;
        }
      }
    }

    if (Array.isArray(pickupAddresses)) {
      updateData.pickupAddresses = normalizePickupAddresses(pickupAddresses);
    }

    if (returnAddress !== undefined) {
      updateData.returnAddress = normalizeVendorAddress(returnAddress, "return");
    }

    if (deliverySettings !== undefined && typeof deliverySettings === "object") {
      updateData.deliverySettings = normalizeDeliverySettings(deliverySettings, vendor.deliverySettings);
    }

    if (notificationPreferences !== undefined && typeof notificationPreferences === "object") {
      updateData.notificationPreferences = notificationPreferences;
    }

    await Vendor.update(vendor._id, updateData);

    const updatedVendor = await Vendor.findById(vendor._id);
    if (VendorShop) {
      await VendorShop.upsertForVendor(updatedVendor, updateData);
    }

    res.json({ 
      message: "Vendor profile updated successfully",
      vendor: updatedVendor 
    });
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    res.status(500).json({ error: "Failed to update vendor profile" });
  }
};

exports.setupVendorTwoFactor = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await findVendorForRequest(req);

    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor profile not found" });
    }

    const secret = base32Encode(crypto.randomBytes(20));
    const otpDetails = buildOtpAuthUrl(vendor, secret);

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendor._id) },
      {
        $set: {
          "security.twoFactor.pendingSecret": secret,
          "security.twoFactor.pendingAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      data: {
        secret,
        manualEntryKey: secret,
        ...otpDetails,
      },
    });
  } catch (error) {
    console.error("Error setting up vendor 2FA:", error);
    res.status(500).json({ success: false, error: "Failed to set up two-factor authentication" });
  }
};

exports.verifyVendorTwoFactor = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await findVendorForRequest(req);
    const code = req.body?.code;

    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor profile not found" });
    }

    const pendingSecret = vendor.security?.twoFactor?.pendingSecret;
    const existingSecret = vendor.security?.twoFactor?.secret;
    const secret = pendingSecret || existingSecret;

    if (!secret || !verifyTotpCode(secret, code)) {
      return res.status(400).json({ success: false, error: "Invalid authenticator code" });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendor._id) },
      {
        $set: {
          "security.twoFactor.enabled": true,
          "security.twoFactor.secret": secret,
          "security.twoFactor.enabledAt": vendor.security?.twoFactor?.enabledAt || new Date(),
          "security.twoFactor.lastVerifiedAt": new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          "security.twoFactor.pendingSecret": "",
          "security.twoFactor.pendingAt": "",
        },
      },
    );

    res.json({
      success: true,
      message: "Two-factor authentication enabled",
      data: { enabled: true },
    });
  } catch (error) {
    console.error("Error verifying vendor 2FA:", error);
    res.status(500).json({ success: false, error: "Failed to verify two-factor authentication" });
  }
};

exports.disableVendorTwoFactor = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await findVendorForRequest(req);
    const code = req.body?.code || req.query?.code;

    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor profile not found" });
    }

    const twoFactor = vendor.security?.twoFactor || {};
    if (twoFactor.enabled && twoFactor.secret && !verifyTotpCode(twoFactor.secret, code)) {
      return res.status(400).json({ success: false, error: "Valid authenticator code is required" });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendor._id) },
      {
        $set: {
          "security.twoFactor.enabled": false,
          "security.twoFactor.disabledAt": new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          "security.twoFactor.secret": "",
          "security.twoFactor.pendingSecret": "",
          "security.twoFactor.pendingAt": "",
        },
      },
    );

    res.json({
      success: true,
      message: "Two-factor authentication disabled",
      data: { enabled: false },
    });
  } catch (error) {
    console.error("Error disabling vendor 2FA:", error);
    res.status(500).json({ success: false, error: "Failed to disable two-factor authentication" });
  }
};

// Admin: Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const Vendor = req.app.locals.models.Vendor;

    const filter = {};
    if (status) filter.status = status;
    if (page) filter.page = parseInt(page);
    if (limit) filter.limit = parseInt(limit);

    const result = await Vendor.findAll(filter);
    res.json(result);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

// Admin: Get vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json({ vendor });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

// Admin: Approve vendor
exports.approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Update vendor status to approved
    await Vendor.updateStatus(id, "approved");

    // Update user role to "vendor"
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role === "customer") {
      await User.updateRole(user.firebaseUid, "vendor", req.user.uid);
      console.log(`✅ User ${user.email} role updated to vendor`);
    }

    res.json({ 
      message: "Vendor approved successfully. User role updated to vendor.",
      vendor: await Vendor.findById(id)
    });
  } catch (error) {
    console.error("Error approving vendor:", error);
    res.status(500).json({ error: "Failed to approve vendor" });
  }
};

// Admin: Suspend vendor
exports.suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Update vendor status to suspended
    await Vendor.updateStatus(id, "suspended");

    // Update user role back to "customer"
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role === "vendor") {
      await User.updateRole(user.firebaseUid, "customer", req.user.uid);
      console.log(`✅ User ${user.email} role reverted to customer`);
    }

    res.json({ 
      message: "Vendor suspended successfully. User role reverted to customer.",
      vendor: await Vendor.findById(id)
    });
  } catch (error) {
    console.error("Error suspending vendor:", error);
    res.status(500).json({ error: "Failed to suspend vendor" });
  }
};

// Admin: Get vendor stats
exports.getVendorStats = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const stats = await Vendor.getStats();
    res.json({ stats });
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    res.status(500).json({ error: "Failed to fetch vendor stats" });
  }
};

// Admin: Reject vendor
exports.rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await Vendor.updateStatus(id, "rejected");
    if (reason) {
      await Vendor.update(id, { rejectionReason: reason });
    }

    // Revert user role back to customer if they were approved previously
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role === "vendor") {
      await User.updateRole(user.firebaseUid, "customer", req.user.uid);
    }

    res.json({
      message: "Vendor rejected.",
      vendor: await Vendor.findById(id),
    });
  } catch (error) {
    console.error("Error rejecting vendor:", error);
    res.status(500).json({ error: "Failed to reject vendor" });
  }
};

// Admin: Reactivate vendor (approved → approved, rejected/suspended → approved)
exports.reactivateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const Vendor = req.app.locals.models.Vendor;
    const User = req.app.locals.models.User;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await Vendor.updateStatus(id, "approved");

    // Restore user role to vendor
    const user = await User.findById(vendor.ownerUserId);
    if (user && user.role !== "vendor") {
      await User.updateRole(user.firebaseUid, "vendor", req.user.uid);
    }

    res.json({
      message: "Vendor reactivated and approved.",
      vendor: await Vendor.findById(id),
    });
  } catch (error) {
    console.error("Error reactivating vendor:", error);
    res.status(500).json({ error: "Failed to reactivate vendor" });
  }
};

// Admin: Update vendor (including categories)
exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedCategoryIds } = req.body;
    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // If updating categories, just ensure there is at least one ID.
    if (allowedCategoryIds && allowedCategoryIds.length === 0) {
      return res.status(400).json({
        error: "At least one category is required",
      });
    }

    await Vendor.update(id, req.body);

    res.json({ 
      message: "Vendor updated successfully",
      vendor: await Vendor.findById(id)
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
};

// Admin: Get vendor finance summary
exports.getVendorFinanceSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const Order = req.app.locals.models.Order;

    // Get all orders containing this vendor's products
    const orders = await Order.collection
      .find({ "products.vendorId": new ObjectId(id) })
      .toArray();

    let grossSales = 0;
    let totalCommission = 0;
    let netEarnings = 0;
    let ordersCount = 0;

    orders.forEach((order) => {
      const vendorProducts = order.products.filter(
        (p) => p.vendorId && p.vendorId.toString() === id
      );

      if (vendorProducts.length > 0) {
        ordersCount++;
        vendorProducts.forEach((product) => {
          const itemTotal = product.price * product.quantity;
          grossSales += itemTotal;
          totalCommission += product.adminCommissionAmount || 0;
          netEarnings += product.vendorEarningAmount || 0;
        });
      }
    });

    res.json({
      success: true,
      data: {
        grossSales: Math.round(grossSales * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        ordersCount,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor finance summary:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch finance summary" 
    });
  }
};

// Admin: Get vendor finance transactions
exports.getVendorFinanceTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const Order = req.app.locals.models.Order;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders with vendor's products
    const orders = await Order.collection
      .find({ "products.vendorId": new ObjectId(id) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Extract vendor's products as transactions
    const transactions = [];
    orders.forEach((order) => {
      const vendorProducts = order.products.filter(
        (p) => p.vendorId && p.vendorId.toString() === id
      );

      vendorProducts.forEach((product) => {
        transactions.push({
          orderId: order._id,
          date: order.createdAt,
          product: product.name || product.title,
          qty: product.quantity,
          subtotal: product.price * product.quantity,
          commissionRateSnapshot: product.commissionRateSnapshot || 0,
          adminCommissionAmount: product.adminCommissionAmount || 0,
          vendorEarningAmount: product.vendorEarningAmount || 0,
          itemStatus: product.itemStatus || "pending",
        });
      });
    });

    const total = await Order.collection.countDocuments({
      "products.vendorId": new ObjectId(id),
    });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching vendor transactions:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch transactions" 
    });
  }
};

// Get vendor's allowed categories
exports.getVendorAllowedCategories = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const Vendor = req.app.locals.models.Vendor;
    const Category = req.app.locals.models.Category;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    // Get all categories that vendor has access to
    const allowedCategoryIds = vendor.allowedCategoryIds || [];
    
    if (allowedCategoryIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No categories assigned yet. Please request category access.",
      });
    }

    const categories = await Category.collection
      .find({ 
        _id: { $in: allowedCategoryIds.map(id => new ObjectId(id)) } 
      })
      .toArray();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching vendor allowed categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch allowed categories",
    });
  }
};

exports.submitVendorKyc = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await Vendor.findByUserId(req.user._id);

    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor profile not found" });
    }

    const documentFields = ["nidFront", "nidBack", "tradeLicense"];
    const documents = {};

    for (const field of documentFields) {
      const file = req.files?.[field]?.[0];
      if (!file) continue;

      documents[field] = await uploadFile({
        req,
        file,
        folder: `kyc/${vendor._id}/${field}`,
      });
    }

    if (Object.keys(documents).length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one KYC document is required",
      });
    }

    const existingDocuments = vendor.kyc?.documents || {};
    const now = new Date();
    const kyc = {
      ...(vendor.kyc || {}),
      status: "pending",
      submittedAt: now,
      submittedBy: req.user.uid,
      notes: req.body.notes || vendor.kyc?.notes || "",
      documents: {
        ...existingDocuments,
        ...documents,
      },
    };

    await Vendor.collection.updateOne(
      { _id: vendor._id },
      {
        $set: {
          kyc,
          verificationLevel: "kyc_pending",
          updatedAt: now,
        },
      },
    );

    res.json({
      success: true,
      message: "KYC documents submitted for review",
      data: kyc,
    });
  } catch (error) {
    console.error("Error submitting vendor KYC:", error);
    res.status(500).json({ success: false, error: "Failed to submit KYC documents" });
  }
};

exports.getMyKyc = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await Vendor.findByUserId(req.user._id);

    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor profile not found" });
    }

    res.json({ success: true, data: vendor.kyc || { status: "not_submitted", documents: {} } });
  } catch (error) {
    console.error("Error fetching vendor KYC:", error);
    res.status(500).json({ success: false, error: "Failed to fetch KYC status" });
  }
};

exports.getKycQueue = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const { status = "pending", page = 1, limit = 25 } = req.query;
    const query = {};

    if (status !== "all") {
      query["kyc.status"] = status;
    } else {
      query["kyc.status"] = { $exists: true };
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);

    const [vendors, total] = await Promise.all([
      Vendor.collection
        .find(query)
        .sort({ "kyc.submittedAt": -1, updatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      Vendor.collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: vendors.map((vendor) => ({
        vendorId: vendor._id,
        shopName: vendor.shopName,
        slug: vendor.slug,
        status: vendor.status,
        phone: vendor.phone,
        email: vendor.email,
        kyc: vendor.kyc,
        submittedAt: vendor.kyc?.submittedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching KYC queue:", error);
    res.status(500).json({ success: false, error: "Failed to fetch KYC queue" });
  }
};

exports.reviewVendorKyc = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status, reason = "" } = req.body;
    const Vendor = req.app.locals.models.Vendor;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "status must be approved or rejected",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    const now = new Date();
    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      {
        $set: {
          "kyc.status": status,
          "kyc.reviewedAt": now,
          "kyc.reviewedBy": req.user?.uid || "admin",
          "kyc.reviewReason": reason,
          verificationLevel: status === "approved" ? "verified" : "basic",
          updatedAt: now,
        },
      },
    );

    res.json({
      success: true,
      message: `KYC ${status}`,
      vendor: await Vendor.findById(vendorId),
    });
  } catch (error) {
    console.error("Error reviewing vendor KYC:", error);
    res.status(500).json({ success: false, error: "Failed to review vendor KYC" });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    let vendorId = req.user.vendorId;

    if (!vendorId) {
      const vendor = await Vendor.findByUserId(req.user._id);
      vendorId = vendor?._id;
    }

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    let { url } = req.body;
    if (req.file) {
      const upload = await uploadFile({
        req,
        file: req.file,
        folder: `shops/${vendorId}/logo`,
      });
      url = upload.url;
    }
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Image URL is required",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { $set: { logo: url, updatedAt: new Date() } }
    );
    if (req.app.locals.models.VendorShop) {
      const vendor = await Vendor.findById(vendorId);
      await req.app.locals.models.VendorShop.upsertForVendor(vendor, { logo: url });
    }

    res.json({
      success: true,
      url,
      message: "Logo uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload logo",
    });
  }
};

exports.uploadBanner = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    let vendorId = req.user.vendorId;

    if (!vendorId) {
      const vendor = await Vendor.findByUserId(req.user._id);
      vendorId = vendor?._id;
    }

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    let { url } = req.body;
    if (req.file) {
      const upload = await uploadFile({
        req,
        file: req.file,
        folder: `shops/${vendorId}/banner`,
      });
      url = upload.url;
    }
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Image URL is required",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { $set: { banner: url, updatedAt: new Date() } }
    );
    if (req.app.locals.models.VendorShop) {
      const vendor = await Vendor.findById(vendorId);
      await req.app.locals.models.VendorShop.upsertForVendor(vendor, { banner: url });
    }

    res.json({
      success: true,
      url,
      message: "Banner uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading banner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload banner",
    });
  }
};

/**
 * Toggle shop status (open/closed)
 * When closed, vendor's products won't show on homepage
 */
exports.toggleShopStatus = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const { isShopOpen } = req.body;

    if (typeof isShopOpen !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "isShopOpen must be a boolean value",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { 
        $set: { 
          isShopOpen,
          shopClosedAt: isShopOpen ? null : new Date(),
          shopOpenedAt: isShopOpen ? new Date() : null,
          updatedAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: isShopOpen ? "Shop opened successfully" : "Shop closed successfully",
      isShopOpen,
    });
  } catch (error) {
    console.error("Error toggling shop status:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to toggle shop status" 
    });
  }
};

/**
 * Set vacation mode with start and end dates
 * Automatically closes shop during vacation period
 */
exports.setVacationMode = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const { vacationStart, vacationEnd, vacationReason, buyerMessage, vacationMessage } = req.body;

    if (!vacationStart || !vacationEnd) {
      return res.status(400).json({
        success: false,
        error: "Vacation start and end dates are required",
      });
    }

    const startDate = new Date(vacationStart);
    const endDate = new Date(vacationEnd);
    const now = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: "End date must be after start date",
      });
    }

    if (endDate < now) {
      return res.status(400).json({
        success: false,
        error: "End date cannot be in the past",
      });
    }

    // Check if currently in vacation period
    const isCurrentlyOnVacation = startDate <= now && endDate >= now;
    const reason = vacationReason || "Vendor is on vacation";
    const message = buyerMessage || vacationMessage || reason;

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { 
        $set: { 
          vacationMode: {
            enabled: true,
            startDate,
            endDate,
            reason,
            buyerMessage: message,
            message,
            setAt: new Date(),
          },
          isShopOpen: !isCurrentlyOnVacation, // Close shop if vacation is active now
          updatedAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: "Vacation mode set successfully",
      vacationMode: {
        enabled: true,
        startDate,
        endDate,
        reason,
        buyerMessage: message,
        message,
        isCurrentlyActive: isCurrentlyOnVacation,
      },
    });
  } catch (error) {
    console.error("Error setting vacation mode:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to set vacation mode" 
    });
  }
};

/**
 * Cancel vacation mode
 */
exports.cancelVacationMode = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    await Vendor.collection.updateOne(
      { _id: new ObjectId(vendorId) },
      { 
        $set: { 
          "vacationMode.enabled": false,
          "vacationMode.cancelledAt": new Date(),
          isShopOpen: true, // Reopen shop when cancelling vacation
          updatedAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: "Vacation mode cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling vacation mode:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to cancel vacation mode" 
    });
  }
};

/**
 * Get shop status and vacation info
 */
exports.getShopStatus = async (req, res) => {
  try {
    const Vendor = req.app.locals.models.Vendor;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found",
      });
    }

    const now = new Date();
    let isCurrentlyOnVacation = false;
    
    if (vendor.vacationMode?.enabled) {
      const start = new Date(vendor.vacationMode.startDate);
      const end = new Date(vendor.vacationMode.endDate);
      isCurrentlyOnVacation = start <= now && end >= now;
      
      // Auto-disable vacation if period has ended
      if (now > end) {
        await Vendor.collection.updateOne(
          { _id: new ObjectId(vendorId) },
          { 
            $set: { 
              "vacationMode.enabled": false,
              "vacationMode.autoDisabledAt": new Date(),
              isShopOpen: true,
              updatedAt: new Date() 
            } 
          }
        );
        vendor.vacationMode.enabled = false;
        vendor.isShopOpen = true;
        isCurrentlyOnVacation = false;
      }
    }

    res.json({
      success: true,
      data: {
        isShopOpen: vendor.isShopOpen !== false, // Default to true if not set
        vacationMode: vendor.vacationMode || { enabled: false },
        isCurrentlyOnVacation,
        shopClosedAt: vendor.shopClosedAt,
        shopOpenedAt: vendor.shopOpenedAt,
      },
    });
  } catch (error) {
    console.error("Error getting shop status:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to get shop status" 
    });
  }
};
