const mongoose = require("mongoose");

const campaignAuditLogSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "PUBLISH", "END", "ARCHIVE", "DELETE_PRODUCT"],
      required: true,
    },
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fieldName: {
      type: String,
    },
    oldValue: {
      type: String,
    },
    newValue: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

// Index for campaign queries
campaignAuditLogSchema.index({ campaign: 1 });

// Index for timestamp queries
campaignAuditLogSchema.index({ timestamp: 1 });

// Index for action queries
campaignAuditLogSchema.index({ action: 1 });

module.exports = mongoose.model("CampaignAuditLog", campaignAuditLogSchema);
