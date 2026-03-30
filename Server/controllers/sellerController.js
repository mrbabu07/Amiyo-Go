const SellerProfile = require("../models/SellerProfile");
const User = require("../models/User");
const crypto = require("crypto");

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

/**
 * Register as seller
 */
exports.registerSeller = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      sellerType,
      displayName,
      phone,
      avatar,
      bio,
      division,
      district,
      upazila,
      area,
      coordinates,
      homemadeInfo,
    } = req.body;

    // Check if already a seller
    const existingSeller = await SellerProfile.findOne({ userId });
    if (existingSeller) {
      return res.status(400).json({
        success: false,
        error: "আপনি ইতিমধ্যে একজন বিক্রেতা হিসেবে নিবন্ধিত",
      });
    }

    // Validate phone format
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: "সঠিক ফোন নম্বর দিন (01XXXXXXXXX)",
      });
    }

    // Create seller profile
    const sellerData = {
      userId,
      sellerType,
      displayName,
      phone,
      avatar,
      bio,
      division,
      district,
      upazila,
      area,
    };

    if (coordinates && coordinates.length === 2) {
      sellerData.coordinates = {
        type: "Point",
        coordinates: [coordinates[0], coordinates[1]],
      };
    }

    if (sellerType === "homemade" && homemadeInfo) {
      sellerData.homemadeInfo = homemadeInfo;
    }

    const seller = await SellerProfile.create(sellerData);

    res.status(201).json({
      success: true,
      message: "বিক্রেতা হিসেবে নিবন্ধন সফল হয়েছে",
      data: seller,
    });
  } catch (error) {
    console.error("Seller registration error:", error);
    res.status(500).json({
      success: false,
      error: "নিবন্ধন ব্যর্থ হয়েছে",
    });
  }
};

/**
 * Send OTP to phone
 */
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user._id;

    // Validate phone
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: "সঠিক ফোন নম্বর দিন",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP (expires in 5 minutes)
    otpStore.set(phone, {
      otp,
      userId: userId.toString(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // TODO: Send SMS via SSL Wireless or Twilio
    // For now, return OTP in development
    if (process.env.NODE_ENV !== "production") {
      console.log(`OTP for ${phone}: ${otp}`);
    }

    res.json({
      success: true,
      message: "OTP পাঠানো হয়েছে",
      ...(process.env.NODE_ENV !== "production" && { otp }), // Only in dev
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      error: "OTP পাঠাতে ব্যর্থ",
    });
  }
};

/**
 * Verify phone OTP
 */
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const userId = req.user._id;

    const storedData = otpStore.get(phone);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: "OTP মেয়াদ শেষ হয়ে গেছে",
      });
    }

    if (storedData.expiresAt < Date.now()) {
      otpStore.delete(phone);
      return res.status(400).json({
        success: false,
        error: "OTP মেয়াদ শেষ হয়ে গেছে",
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        error: "ভুল OTP",
      });
    }

    if (storedData.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "অনুমতি নেই",
      });
    }

    // Update seller profile
    await SellerProfile.findOneAndUpdate(
      { userId },
      { isPhoneVerified: true }
    );

    // Clear OTP
    otpStore.delete(phone);

    res.json({
      success: true,
      message: "ফোন যাচাই সফল হয়েছে",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      error: "যাচাই ব্যর্থ হয়েছে",
    });
  }
};

/**
 * Get own seller profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const seller = await SellerProfile.findOne({ userId });

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: "বিক্রেতা প্রোফাইল পাওয়া যায়নি",
      });
    }

    res.json({
      success: true,
      data: seller,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "প্রোফাইল লোড করতে ব্যর্থ",
    });
  }
};

/**
 * Update seller profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Don't allow changing userId, sellerType, or verification status
    delete updates.userId;
    delete updates.sellerType;
    delete updates.isPhoneVerified;
    delete updates.isNIDVerified;
    delete updates.verificationStatus;

    const seller = await SellerProfile.findOneAndUpdate(
      { userId },
      { ...updates, lastActiveAt: new Date() },
      { new: true }
    );

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: "বিক্রেতা প্রোফাইল পাওয়া যায়নি",
      });
    }

    res.json({
      success: true,
      message: "প্রোফাইল আপডেট হয়েছে",
      data: seller,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "আপডেট ব্যর্থ হয়েছে",
    });
  }
};

/**
 * Get public seller profile
 */
exports.getSellerProfile = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const seller = await SellerProfile.findById(sellerId)
      .select("-nidNumber"); // Don't expose NID

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: "বিক্রেতা পাওয়া যায়নি",
      });
    }

    if (!seller.isActive || seller.isSuspended) {
      return res.status(404).json({
        success: false,
        error: "বিক্রেতা বর্তমানে সক্রিয় নেই",
      });
    }

    res.json({
      success: true,
      data: seller,
    });
  } catch (error) {
    console.error("Get seller profile error:", error);
    res.status(500).json({
      success: false,
      error: "প্রোফাইল লোড করতে ব্যর্থ",
    });
  }
};

/**
 * Get seller dashboard stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const seller = await SellerProfile.findOne({ userId });

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: "বিক্রেতা প্রোফাইল পাওয়া যায়নি",
      });
    }

    const Listing = require("../models/Listing");

    // Get listing stats
    const [activeListings, soldListings, expiredListings, totalViews] = await Promise.all([
      Listing.countDocuments({ sellerId: seller._id, status: "active" }),
      Listing.countDocuments({ sellerId: seller._id, status: "sold" }),
      Listing.countDocuments({ sellerId: seller._id, status: "expired" }),
      Listing.aggregate([
        { $match: { sellerId: seller._id } },
        { $group: { _id: null, total: { $sum: "$viewCount" } } },
      ]),
    ]);

    // Get pending offers count
    const pendingOffers = await Listing.aggregate([
      { $match: { sellerId: seller._id } },
      { $unwind: "$offers" },
      { $match: { "offers.status": "pending" } },
      { $count: "total" },
    ]);

    const stats = {
      totalListings: seller.totalListings,
      activeListings,
      soldListings,
      expiredListings,
      totalSold: seller.totalSold,
      totalViews: totalViews[0]?.total || 0,
      averageRating: seller.averageRating,
      totalReviews: seller.totalReviews,
      responseRate: seller.responseRate,
      badge: seller.badge,
      isTopSeller: seller.isTopSeller,
      isTrustedSeller: seller.isTrustedSeller,
      pendingOffers: pendingOffers[0]?.total || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      error: "পরিসংখ্যান লোড করতে ব্যর্থ",
    });
  }
};
