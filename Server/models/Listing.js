const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  listingId: {
    type: String,
    unique: true,
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SellerProfile",
    required: true,
  },
  
  // Product Info
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  isNegotiable: {
    type: Boolean,
    default: true,
  },
  condition: {
    type: String,
    enum: ["new", "like_new", "good", "fair", "for_parts"],
  },
  
  // Listing Type
  listingType: {
    type: String,
    enum: ["physical", "homemade", "food", "service", "digital"],
    default: "physical",
  },
  
  // Images
  images: [{
    url: String,
    isPrimary: {
      type: Boolean,
      default: false,
    },
  }],
  
  // Category
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  subCategory: String,
  tags: [String],
  
  // Location
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  area: String,
  district: String,
  division: String,
  deliveryAvailable: {
    type: Boolean,
    default: false,
  },
  deliveryCharge: Number,
  pickupAvailable: {
    type: Boolean,
    default: true,
  },
  
  // Food-specific fields
  foodDetails: {
    ingredients: [String],
    isHalal: Boolean,
    isVegan: Boolean,
    allergyInfo: String,
    preparationTime: String,
    minimumOrder: Number,
    dailyCapacity: Number,
    acceptsPreOrder: Boolean,
    preOrderHoursInAdvance: Number,
  },
  
  // Custom order (handicraft/boutique)
  customOrderDetails: {
    acceptsCustomOrder: Boolean,
    customOrderNote: String,
    estimatedDays: Number,
  },
  
  // Engagement
  viewCount: {
    type: Number,
    default: 0,
  },
  interestedCount: {
    type: Number,
    default: 0,
  },
  savedCount: {
    type: Number,
    default: 0,
  },
  
  // Offer system
  offers: [{
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    offerPrice: Number,
    message: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "countered"],
      default: "pending",
    },
    counterPrice: Number,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Status
  status: {
    type: String,
    enum: ["active", "sold", "reserved", "expired", "removed"],
    default: "active",
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isBoosted: {
    type: Boolean,
    default: false,
  },
  boostExpiresAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    },
  },
  soldAt: Date,
}, {
  timestamps: true,
});

// Indexes
listingSchema.index({ listingId: 1 });
listingSchema.index({ sellerId: 1 });
listingSchema.index({ location: "2dsphere" });
listingSchema.index({ status: 1 });
listingSchema.index({ listingType: 1 });
listingSchema.index({ categoryId: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ price: 1 });
listingSchema.index({ expiresAt: 1 });

// Generate listing ID
listingSchema.pre("save", async function(next) {
  if (!this.listingId) {
    const count = await mongoose.model("Listing").countDocuments();
    this.listingId = `AMY-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

// Auto-expire listings
listingSchema.methods.checkExpiry = function() {
  if (this.expiresAt < new Date() && this.status === "active") {
    this.status = "expired";
    return true;
  }
  return false;
};

// Renew listing
listingSchema.methods.renew = function() {
  this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.status = "active";
};

module.exports = mongoose.model("Listing", listingSchema);
