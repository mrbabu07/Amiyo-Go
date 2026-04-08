const mongoose = require("mongoose");

const campaignViewSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    ipAddress: {
      type: String,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

// Index for campaign queries
campaignViewSchema.index({ campaign: 1 });

// Index for date range queries
campaignViewSchema.index({ campaign: 1, viewedAt: 1 });

// Index for session queries
campaignViewSchema.index({ sessionId: 1 });

module.exports = mongoose.model("CampaignView", campaignViewSchema);
