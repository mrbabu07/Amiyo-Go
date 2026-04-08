const mongoose = require("mongoose");

const campaignOrderSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    totalRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    orderStatus: {
      type: String,
    },
  },
  {
    timestamps: false,
  },
);

// Compound unique index on campaign and order
campaignOrderSchema.index({ campaign: 1, order: 1 }, { unique: true });

// Index for date range queries
campaignOrderSchema.index({ campaign: 1, orderDate: 1 });

module.exports = mongoose.model("CampaignOrder", campaignOrderSchema);
