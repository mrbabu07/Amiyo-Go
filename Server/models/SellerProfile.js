const mongoose = require("mongoose");

const sellerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  sellerType: {
    type: String,
    enum: ["individual", "homemade", "small_business", "vendor"],
    required: true,
  },
  
  // Basic Info
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    match: /^01[3-9]\d{8}$/,
  },
  avatar: String,
  bio: {
    type: String,
    maxlength: 500,
  },
  
  // Location
  division: String,
  district: String,
  upazila: String,
  area: String,
  coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [90.4125, 23.8103], // Dhaka default
    },
  },
  
  // Verification
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  isNIDVerified: {
    type: Boolean,
    default: false,
  },
  nidNumber: String, // Encrypted
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  
  // Seller Stats
  totalListings: {
    type: Number,
    default: 0,
  },
  totalSold: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  responseTime: {
    type: String,
    default: "সাধারণত কয়েক ঘন্টায়",
  },
  
  // Seller Badge
  badge: {
    type: String,
    enum: ["new", "bronze", "silver", "gold", "platinum"],
    default: "new",
  },
  isTopSeller: {
    type: Boolean,
    default: false,
  },
  isTrustedSeller: {
    type: Boolean,
    default: false,
  },
  
  // For homemade sellers
  homemadeInfo: {
    speciality: [String], // ['food', 'handicraft', 'boutique', etc]
    tags: [String], // ['হাতের_কাজ', 'নানির_রেসিপি']
    workspacePhotos: [String],
    story: String,
    acceptsCustomOrders: {
      type: Boolean,
      default: false,
    },
    foodSafetyAware: {
      type: Boolean,
      default: false,
    },
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  suspendReason: String,
  
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
sellerProfileSchema.index({ userId: 1 });
sellerProfileSchema.index({ coordinates: "2dsphere" });
sellerProfileSchema.index({ sellerType: 1 });
sellerProfileSchema.index({ badge: 1 });
sellerProfileSchema.index({ isActive: 1, isSuspended: 1 });

// Methods
sellerProfileSchema.methods.updateBadge = function() {
  const { totalSold, averageRating, totalReviews } = this;
  
  if (totalSold >= 100 && averageRating >= 4.8 && totalReviews >= 50) {
    this.badge = "platinum";
  } else if (totalSold >= 50 && averageRating >= 4.5 && totalReviews >= 25) {
    this.badge = "gold";
  } else if (totalSold >= 20 && averageRating >= 4.0 && totalReviews >= 10) {
    this.badge = "silver";
  } else if (totalSold >= 5 && averageRating >= 3.5) {
    this.badge = "bronze";
  } else {
    this.badge = "new";
  }
  
  // Top seller criteria
  this.isTopSeller = totalSold >= 50 && averageRating >= 4.7;
  
  // Trusted seller criteria
  this.isTrustedSeller = this.isNIDVerified && averageRating >= 4.5 && totalReviews >= 10;
};

module.exports = mongoose.model("SellerProfile", sellerProfileSchema);
