const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    showAsPopup: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    targetProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    buttonText: {
      type: String,
      default: "Shop Now",
    },
    buttonLink: {
      type: String,
      default: "/products",
    },
  },
  {
    timestamps: true,
  },
);

// Method to check if offer is currently valid
offerSchema.methods.isValid = function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

// Static method to get active popup offers
offerSchema.statics.getActivePopupOffers = async function () {
  const now = new Date();
  return this.find({
    isActive: true,
    showAsPopup: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(1);
};

module.exports = mongoose.model("Offer", offerSchema);
