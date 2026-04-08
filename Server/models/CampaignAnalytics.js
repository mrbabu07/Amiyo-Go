const mongoose = require("mongoose");

const campaignAnalyticsSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    analyticsDate: {
      type: Date,
      required: true,
    },
    totalViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageOrderValue: {
      type: Number,
    },
    conversionRate: {
      type: Number,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

// Compound unique index on campaign and date
campaignAnalyticsSchema.index({ campaign: 1, analyticsDate: 1 }, { unique: true });

// Index for date queries
campaignAnalyticsSchema.index({ analyticsDate: 1 });

module.exports = mongoose.model("CampaignAnalytics", campaignAnalyticsSchema);
