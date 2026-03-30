const Listing = require("../models/Listing");
const SellerProfile = require("../models/SellerProfile");

/**
 * Create new listing
 */
exports.createListing = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get seller profile
    const seller = await SellerProfile.findOne({ userId });

    if (!seller) {
      return res.status(403).json({
        success: false,
        error: "আপনাকে প্রথমে বিক্রেতা হিসেবে নিবন্ধন করতে হবে",
      });
    }

    if (!seller.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        error: "প্রথমে ফোন নম্বর যাচাই করুন",
      });
    }

    // Check listing limits for individual sellers
    if (seller.sellerType === "individual" && seller.totalListings >= 10) {
      return res.status(403).json({
        success: false,
        error: "Individual বিক্রেতারা সর্বোচ্চ ১০টি লিস্টিং করতে পারবেন",
      });
    }

    const listingData = {
      ...req.body,
      sellerId: seller._id,
    };

    // Ensure location is set
    if (!listingData.location || !listingData.location.coordinates) {
      listingData.location = {
        type: "Point",
        coordinates: seller.coordinates.coordinates,
      };
      listingData.area = seller.area;
      listingData.district = seller.district;
      listingData.division = seller.division;
    }

    const listing = await Listing.create(listingData);

    // Update seller stats
    seller.totalListings += 1;
    seller.lastActiveAt = new Date();
    await seller.save();

    res.status(201).json({
      success: true,
      message: "লিস্টিং তৈরি হয়েছে",
      data: listing,
    });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({
      success: false,
      error: "লিস্টিং তৈরি করতে ব্যর্থ",
    });
  }
};

/**
 * Get all listings with filters
 */
exports.getListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      listingType,
      minPrice,
      maxPrice,
      condition,
      deliveryAvailable,
      search,
      sort = "-createdAt",
    } = req.query;

    const query = { status: "active" };

    // Filters
    if (category) query.categoryId = category;
    if (listingType) query.listingType = listingType;
    if (condition) query.condition = condition;
    if (deliveryAvailable) query.deliveryAvailable = deliveryAvailable === "true";

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate("sellerId", "displayName avatar badge averageRating responseRate")
        .populate("categoryId", "name icon")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Listing.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({
      success: false,
      error: "লিস্টিং লোড করতে ব্যর্থ",
    });
  }
};

/**
 * Get nearby listings
 */
exports.getNearbyListings = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 50, ...filters } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: "অবস্থান প্রয়োজন",
      });
    }

    const query = {
      status: "active",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: Number(maxDistance) * 1000, // Convert km to meters
        },
      },
    };

    // Apply other filters
    if (filters.category) query.categoryId = filters.category;
    if (filters.listingType) query.listingType = filters.listingType;
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    const listings = await Listing.find(query)
      .populate("sellerId", "displayName avatar badge averageRating")
      .populate("categoryId", "name icon")
      .limit(50)
      .lean();

    // Calculate distance for each listing
    const listingsWithDistance = listings.map(listing => {
      const distance = calculateDistance(
        Number(latitude),
        Number(longitude),
        listing.location.coordinates[1],
        listing.location.coordinates[0]
      );

      return {
        ...listing,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    });

    res.json({
      success: true,
      data: listingsWithDistance,
      count: listingsWithDistance.length,
    });
  } catch (error) {
    console.error("Get nearby listings error:", error);
    res.status(500).json({
      success: false,
      error: "কাছাকাছি লিস্টিং খুঁজতে ব্যর্থ",
    });
  }
};

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get single listing
 */
exports.getListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findOne({ listingId })
      .populate("sellerId")
      .populate("categoryId", "name icon");

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "লিস্টিং পাওয়া যায়নি",
      });
    }

    // Increment view count
    listing.viewCount += 1;
    await listing.save();

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error("Get listing error:", error);
    res.status(500).json({
      success: false,
      error: "লিস্টিং লোড করতে ব্যর্থ",
    });
  }
};

/**
 * Update listing
 */
exports.updateListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.user._id;

    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "লিস্টিং পাওয়া যায়নি",
      });
    }

    if (listing.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "আপনি এই লিস্টিং সম্পাদনা করতে পারবেন না",
      });
    }

    // Don't allow changing certain fields
    delete req.body.sellerId;
    delete req.body.listingId;
    delete req.body.viewCount;
    delete req.body.offers;

    Object.assign(listing, req.body);
    await listing.save();

    res.json({
      success: true,
      message: "লিস্টিং আপডেট হয়েছে",
      data: listing,
    });
  } catch (error) {
    console.error("Update listing error:", error);
    res.status(500).json({
      success: false,
      error: "আপডেট করতে ব্যর্থ",
    });
  }
};

/**
 * Delete listing
 */
exports.deleteListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.user._id;

    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "লিস্টিং পাওয়া যায়নি",
      });
    }

    if (listing.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "আপনি এই লিস্টিং মুছতে পারবেন না",
      });
    }

    listing.status = "removed";
    await listing.save();

    // Update seller stats
    seller.totalListings = Math.max(0, seller.totalListings - 1);
    await seller.save();

    res.json({
      success: true,
      message: "লিস্টিং মুছে ফেলা হয়েছে",
    });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({
      success: false,
      error: "মুছতে ব্যর্থ",
    });
  }
};

/**
 * Mark listing as sold
 */
exports.markAsSold = async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.user._id;

    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "লিস্টিং পাওয়া যায়নি",
      });
    }

    if (listing.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    listing.status = "sold";
    listing.soldAt = new Date();
    await listing.save();

    // Update seller stats
    seller.totalSold += 1;
    seller.updateBadge();
    await seller.save();

    res.json({
      success: true,
      message: "বিক্রি হয়েছে হিসেবে চিহ্নিত করা হয়েছে",
      data: listing,
    });
  } catch (error) {
    console.error("Mark as sold error:", error);
    res.status(500).json({
      success: false,
      error: "আপডেট করতে ব্যর্থ",
    });
  }
};

/**
 * Renew expired listing
 */
exports.renewListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.user._id;

    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "লিস্টিং পাওয়া যায়নি",
      });
    }

    if (listing.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    listing.renew();
    await listing.save();

    res.json({
      success: true,
      message: "লিস্টিং নবায়ন করা হয়েছে",
      data: listing,
    });
  } catch (error) {
    console.error("Renew listing error:", error);
    res.status(500).json({
      success: false,
      error: "নবায়ন করতে ব্যর্থ",
    });
  }
};

/**
 * Get my listings
 */
exports.getMyListings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      return res.status(403).json({
        success: false,
        error: "বিক্রেতা প্রোফাইল পাওয়া যায়নি",
      });
    }

    const query = { sellerId: seller._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate("categoryId", "name icon")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Listing.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get my listings error:", error);
    res.status(500).json({
      success: false,
      error: "লিস্টিং লোড করতে ব্যর্থ",
    });
  }
};
