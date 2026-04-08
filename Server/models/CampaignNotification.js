const mongoose = require("mongoose");

const campaignNotificationSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["MILESTONE", "ALERT", "PERFORMANCE", "ENDING_SOON"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for recipient queries
campaignNotificationSchema.index({ recipient: 1 });

// Index for campaign queries
campaignNotificationSchema.index({ campaign: 1 });

module.exports = mongoose.model("CampaignNotification", campaignNotificationSchema);
