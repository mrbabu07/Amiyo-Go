const mongoose = require("mongoose");

const campaignProductSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index on campaign and product
campaignProductSchema.index({ campaign: 1, product: 1 }, { unique: true });

// Index for vendor queries
campaignProductSchema.index({ campaign: 1, vendor: 1 });

// Index for product queries
campaignProductSchema.index({ product: 1 });

module.exports = mongoose.model("CampaignProduct", campaignProductSchema);
